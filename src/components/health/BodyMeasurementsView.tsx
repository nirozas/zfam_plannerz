import React, { useState, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';
import { Tracker, HealthEntry } from '../../types/health';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip as RechartsTooltip, CartesianGrid } from 'recharts';

interface BodyMeasurementsViewProps {
  tracker: Tracker;
  entries: HealthEntry[];
  onLogEntry: (data: Record<string, number>, unit: 'cm' | 'in') => void;
}



const NODES = [
  // Front Figure (targetX approx 40.5)
  { id: 'neck', label: 'Neck', x: 10, y: 12, targetX: 40.5, targetY: 19 },
  { id: 'bust', label: 'Bust', x: 5, y: 22, targetX: 40.5, targetY: 28.5 },
  { id: 'sleeve_length', label: 'Sleeve Length', x: 16, y: 29, targetX: 38, targetY: 30 },
  { id: 'waistcoat_length', label: 'Waistcoat', x: 4, y: 36, targetX: 43, targetY: 32 },
  { id: 'belly', label: 'Belly', x: 16, y: 43, targetX: 40.5, targetY: 38 },
  { id: 'pant_waist', label: 'Pant Waist', x: 4, y: 50, targetX: 40.5, targetY: 42.5 },
  { id: 'coat_length', label: 'Coat Length', x: 16, y: 58, targetX: 39.5, targetY: 50 },
  { id: 'pant_length', label: 'Pant Length', x: 4, y: 72, targetX: 43.5, targetY: 85 },
  { id: 'bottom_opening', label: 'Bottom Opening', x: 16, y: 84, targetX: 38.5, targetY: 84.5 },

  // Back Figure (targetX approx 59.5)
  { id: 'shoulder', label: 'Shoulder', x: 92, y: 18, targetX: 59.5, targetY: 21.5 },
  { id: 'hip', label: 'Hip', x: 92, y: 38, targetX: 59.5, targetY: 45 },
  { id: 'thigh', label: 'Thigh', x: 92, y: 52, targetX: 62.5, targetY: 51 },
  { id: 'in_seam', label: 'In-seam', x: 92, y: 80, targetX: 59.5, targetY: 82 },
];

export const BodyMeasurementsView: React.FC<BodyMeasurementsViewProps> = ({ entries, onLogEntry }) => {
  const [unit, setUnit] = useState<'cm' | 'in'>('cm');
  const [activeNode, setActiveNode] = useState<string>('waist');
  const [isEditing, setIsEditing] = useState(false);
  
  const [viewingEntryId, setViewingEntryId] = useState<string | null>(null);
  
  const [showStatsModal, setShowStatsModal] = useState(false);
  const [timeRange, setTimeRange] = useState<'1m'|'1y'|'all'|'custom'>('all');
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');

  // Get entries sorted by date
  const sortedEntries = useMemo(() => {
    return [...entries].sort((a, b) => b.date.localeCompare(a.date));
  }, [entries]);

  // Current active entry being viewed
  const activeEntry = useMemo(() => {
    if (viewingEntryId) {
      return sortedEntries.find(e => e.id === viewingEntryId) || null;
    }
    return sortedEntries.length > 0 ? sortedEntries[0] : null;
  }, [sortedEntries, viewingEntryId]);

  // Parse active data
  const currentData = useMemo(() => {
    if (!activeEntry || !activeEntry.note) return {};
    try {
      const parsed = JSON.parse(activeEntry.note);
      return parsed.measurements || {};
    } catch { return {}; }
  }, [activeEntry]);

  const currentEntryUnit = useMemo(() => {
    if (!activeEntry || !activeEntry.note) return 'cm';
    try {
      return JSON.parse(activeEntry.note).unit || 'cm';
    } catch { return 'cm'; }
  }, [activeEntry]);

  // Editor State
  const [editValues, setEditValues] = useState<Record<string, string>>({});
  const [weightUnit, setWeightUnit] = useState<'kg' | 'lb'>('kg');

  const handleStartEditing = () => {
    const vals: Record<string, string> = {};
    NODES.forEach(n => {
      let val = currentData[n.id] || '';
      if (val !== '') {
        // Convert from entry unit to active unit if needed
        if (currentEntryUnit === 'cm' && unit === 'in') val = (val / 2.54).toFixed(1);
        if (currentEntryUnit === 'in' && unit === 'cm') val = (val * 2.54).toFixed(1);
      }
      vals[n.id] = val.toString();
    });
    
    // Handle weight
    let wVal = currentData['weight'] || '';
    if (wVal !== '') {
      const entryWeightUnit = currentData['weightUnit'] || 'kg';
      if (entryWeightUnit === 'kg' && weightUnit === 'lb') wVal = (wVal * 2.20462).toFixed(1);
      if (entryWeightUnit === 'lb' && weightUnit === 'kg') wVal = (wVal / 2.20462).toFixed(1);
    }
    vals['weight'] = wVal.toString();

    setEditValues(vals);
    setIsEditing(true);
  };

  const handleSave = () => {
    const measurements: Record<string, any> = {};
    let hasData = false;
    for (const [k, v] of Object.entries(editValues)) {
      if (k === 'weight') continue;
      const num = parseFloat(v);
      if (!isNaN(num)) {
        measurements[k] = num;
        hasData = true;
      }
    }
    
    // Save weight
    if (editValues['weight']) {
      const wNum = parseFloat(editValues['weight']);
      if (!isNaN(wNum)) {
        measurements['weight'] = wNum;
        measurements['weightUnit'] = weightUnit;
        hasData = true;
      }
    }

    if (hasData) {
      onLogEntry(measurements, unit);
    }
    setIsEditing(false);
  };

  const chartData = useMemo(() => {
    return entries
      .filter(e => e.note)
      .map(e => {
        try {
          const parsed = JSON.parse(e.note!);
          let val = parsed.measurements?.[activeNode];
          if (val !== undefined) {
             if (activeNode === 'weight') {
               const entryWeightUnit = parsed.measurements?.weightUnit || 'kg';
               if (entryWeightUnit === 'kg' && weightUnit === 'lb') val = val * 2.20462;
               if (entryWeightUnit === 'lb' && weightUnit === 'kg') val = val / 2.20462;
             } else {
               if (parsed.unit === 'cm' && unit === 'in') val = val / 2.54;
               if (parsed.unit === 'in' && unit === 'cm') val = val * 2.54;
             }
             return { date: e.date, timestamp: new Date(e.date).getTime(), value: Math.round(val * 10) / 10 };
          }
        } catch {}
        return null;
      })
      .filter(Boolean)
      .sort((a, b) => a!.timestamp - b!.timestamp);
  }, [entries, activeNode, unit, weightUnit]);

  const filteredChartData = useMemo(() => {
    const now = new Date();
    let minDate = new Date(2000, 0, 1);
    let maxDate = new Date(2100, 0, 1);

    if (timeRange === 'custom') {
      if (customStart) minDate = new Date(customStart);
      if (customEnd) maxDate = new Date(customEnd);
      maxDate.setHours(23, 59, 59, 999);
    } else {
      maxDate = now;
      minDate = new Date(now);
      switch (timeRange) {
        case '1m': minDate.setDate(now.getDate() - 30); break;
        case '1y': minDate.setFullYear(now.getFullYear() - 1); break;
        case 'all': minDate.setFullYear(2000); break;
      }
    }

    return chartData.filter(d => {
      if (!d) return false;
      const ts = d.timestamp;
      return ts >= minDate.getTime() && ts <= maxDate.getTime();
    });
  }, [chartData, timeRange, customStart, customEnd]);

  const activeNodeLabel = activeNode === 'weight' ? 'Weight' : NODES.find(n => n.id === activeNode)?.label;

  const displayValue = (nodeId: string) => {
    if (isEditing) return editValues[nodeId] || '';
    
    let val = currentData[nodeId];
    if (val === undefined || val === '') return '--';

    if (nodeId === 'weight') {
      const entryWeightUnit = currentData['weightUnit'] || 'kg';
      if (entryWeightUnit === 'kg' && weightUnit === 'lb') val = val * 2.20462;
      if (entryWeightUnit === 'lb' && weightUnit === 'kg') val = val / 2.20462;
      return Math.round(val * 10) / 10;
    }

    if (currentEntryUnit === 'cm' && unit === 'in') val = val / 2.54;
    if (currentEntryUnit === 'in' && unit === 'cm') val = val * 2.54;
    return Math.round(val * 10) / 10;
  };

  return (
    <div className="flex flex-col lg:flex-row gap-6 p-4 w-full">
      
      {/* Visual Body Column */}
      <div className="flex-1 relative bg-white border border-slate-200 rounded-3xl p-2 sm:p-6 shadow-sm min-h-[400px] sm:min-h-[500px] flex items-center justify-center overflow-hidden">
        
        {/* Controls Overlay */}
        <div className="absolute top-4 left-4 right-4 flex justify-between items-center z-10">
          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl">
            <button onClick={() => setUnit('cm')} className={`px-3 py-1 text-xs font-bold rounded-lg transition-all ${unit === 'cm' ? 'bg-white shadow text-slate-900' : 'text-slate-500'}`}>cm</button>
            <button onClick={() => setUnit('in')} className={`px-3 py-1 text-xs font-bold rounded-lg transition-all ${unit === 'in' ? 'bg-white shadow text-slate-900' : 'text-slate-500'}`}>inches</button>
          </div>

          {!isEditing ? (
            <button onClick={handleStartEditing} className="px-4 py-2 bg-[#D4B4E8] text-slate-900 font-bold text-sm rounded-xl hover:bg-[#C2A3D6] transition-all shadow-sm">
              Update Latest
            </button>
          ) : (
            <div className="flex gap-2">
              <button onClick={() => setIsEditing(false)} className="px-4 py-2 bg-slate-100 text-slate-600 font-bold text-sm rounded-xl hover:bg-slate-200 transition-all">
                Cancel
              </button>
              <button onClick={handleSave} className="px-4 py-2 bg-emerald-300 text-slate-900 font-bold text-sm rounded-xl hover:bg-emerald-400 transition-all shadow-md">
                Save Latest
              </button>
            </div>
          )}
        </div>

        {/* Body Image */}
        <div className="absolute inset-y-0 inset-x-0 mx-auto w-full max-w-[600px] pointer-events-none opacity-90 mix-blend-multiply flex items-center justify-center">
          <img src="/body-mannequin-clean.jpg" alt="Mannequin" className="w-full h-full object-contain" />
        </div>

        {/* Lines and Targets Overlay */}
        <svg className="absolute inset-0 w-full h-full pointer-events-none" style={{ zIndex: 5 }}>

          {NODES.map(node => (
            <g key={`line-${node.id}`}>
              <line 
                x1={`${node.x}%`} y1={`${node.y}%`} 
                x2={`${node.targetX}%`} y2={`${node.targetY}%`} 
                stroke={activeNode === node.id ? '#94a3b8' : '#cbd5e1'} 
                strokeWidth="1.5"
                strokeDasharray="3 3"
              />
              <circle 
                cx={`${node.targetX}%`} cy={`${node.targetY}%`} 
                r={activeNode === node.id ? "5" : "3"} 
                fill={activeNode === node.id ? '#D4B4E8' : '#94a3b8'} 
                stroke="white" strokeWidth="1.5"
              />
            </g>
          ))}
        </svg>

        {/* Nodes Overlay */}
        {NODES.map(node => (
          <div 
            key={node.id} 
            className="absolute -translate-x-1/2 -translate-y-1/2 flex flex-col items-center"
            style={{ left: `${node.x}%`, top: `${node.y}%`, zIndex: activeNode === node.id ? 20 : 10 }}
          >
            <div 
              className={`text-[10px] font-bold uppercase tracking-wider mb-1 px-2 py-0.5 rounded shadow-sm backdrop-blur-md cursor-pointer transition-all ${
                activeNode === node.id ? 'bg-[#D4B4E8] text-slate-900 scale-110' : 'bg-white/80 text-slate-500 hover:bg-slate-100'
              }`}
              onClick={() => setActiveNode(node.id)}
            >
              {node.label}
            </div>
            
            {isEditing ? (
              <input
                type="number"
                step="0.1"
                value={editValues[node.id] || ''}
                onChange={e => setEditValues({ ...editValues, [node.id]: e.target.value })}
                className="w-16 h-8 text-center text-sm font-bold bg-white border-2 border-[#D4B4E8] rounded-xl shadow-lg outline-none focus:ring-2 focus:ring-[#D4B4E8]"
                placeholder="0.0"
              />
            ) : (
              <div 
                className={`w-16 h-8 flex items-center justify-center text-sm font-black rounded-xl shadow-sm cursor-pointer transition-all ${
                  activeNode === node.id ? 'bg-slate-800 text-white' : 'bg-white text-slate-700 border border-slate-200'
                }`}
                onClick={() => setActiveNode(node.id)}
              >
                {displayValue(node.id)} <span className={`text-[10px] ml-0.5 ${activeNode === node.id ? 'text-slate-400' : 'text-slate-400'}`}>{displayValue(node.id) !== '--' ? unit : ''}</span>
              </div>
            )}
          </div>
        ))}
        
        {/* Weight Overlay */}
        <div className="absolute bottom-4 left-4 right-4 flex justify-between items-end z-20 pointer-events-none">
          <div className="pointer-events-auto flex items-center gap-1 bg-slate-100 p-1 rounded-xl shadow-sm">
            <button onClick={() => setWeightUnit('kg')} className={`px-3 py-1 text-xs font-bold rounded-lg transition-all ${weightUnit === 'kg' ? 'bg-white shadow text-slate-900' : 'text-slate-500'}`}>kg</button>
            <button onClick={() => setWeightUnit('lb')} className={`px-3 py-1 text-xs font-bold rounded-lg transition-all ${weightUnit === 'lb' ? 'bg-white shadow text-slate-900' : 'text-slate-500'}`}>lb</button>
          </div>
          
          <div className="pointer-events-auto flex flex-col items-center">
            <div 
              className={`text-[10px] font-bold uppercase tracking-wider mb-1 px-3 py-1 rounded-lg shadow-sm backdrop-blur-md cursor-pointer transition-all ${
                activeNode === 'weight' ? 'bg-[#D4B4E8] text-slate-900 scale-110' : 'bg-white/80 text-slate-500 hover:bg-slate-100'
              }`}
              onClick={() => setActiveNode('weight')}
            >
              Weight
            </div>
            {isEditing ? (
              <input
                type="number"
                step="0.1"
                value={editValues['weight'] || ''}
                onChange={e => setEditValues({ ...editValues, ['weight']: e.target.value })}
                className="w-20 h-10 text-center text-base font-bold bg-white border-2 border-[#D4B4E8] rounded-xl shadow-lg outline-none focus:ring-2 focus:ring-[#D4B4E8]"
                placeholder="0.0"
              />
            ) : (
              <div 
                className={`w-20 h-10 flex items-center justify-center text-base font-black rounded-xl shadow-sm cursor-pointer transition-all ${
                  activeNode === 'weight' ? 'bg-slate-800 text-white' : 'bg-white text-slate-700 border border-slate-200'
                }`}
                onClick={() => setActiveNode('weight')}
              >
                {displayValue('weight')} <span className={`text-xs ml-1 ${activeNode === 'weight' ? 'text-slate-400' : 'text-slate-400'}`}>{displayValue('weight') !== '--' ? weightUnit : ''}</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Chart Column */}
      <div className="w-full lg:w-[350px] shrink-0 flex flex-col gap-4">
        <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-sm flex-1 flex flex-col">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 bg-[#D4B4E8]/20 rounded-xl flex items-center justify-center text-xl text-[#D4B4E8]">📏</div>
            <div 
              className="cursor-pointer hover:bg-slate-50 p-2 rounded-xl transition-all -ml-2"
              onClick={() => setShowStatsModal(true)}
            >
              <h3 className="font-bold text-slate-900 flex items-center gap-1">{activeNodeLabel} <span className="text-xs text-[#D4B4E8] bg-[#D4B4E8]/10 px-1 rounded">↗ Expand</span></h3>
              <p className="text-xs text-slate-500">History in {activeNode === 'weight' ? weightUnit : unit}</p>
            </div>
          </div>

          <div className="w-full h-[200px]">
            {chartData.length > 0 ? (
              <ResponsiveContainer width="100%" height={200}>
                <AreaChart data={chartData} margin={{ top: 10, right: 0, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorBody" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#D4B4E8" stopOpacity={0.4}/>
                      <stop offset="95%" stopColor="#D4B4E8" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(0,0,0,0.05)" />
                  <XAxis dataKey="timestamp" type="number" scale="time" domain={['dataMin', 'dataMax']} 
                    tickFormatter={tick => new Date(tick).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} 
                    tick={{ fontSize: 10, fill: '#94a3b8' }} tickLine={false} axisLine={false} />
                  <YAxis domain={['auto', 'auto']} tick={{ fontSize: 10, fill: '#94a3b8' }} tickLine={false} axisLine={false} />
                  <RechartsTooltip 
                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }}
                    formatter={(val: any) => [`${val} ${activeNode === 'weight' ? weightUnit : unit}`, activeNodeLabel]}
                    labelFormatter={(label) => new Date(label).toLocaleDateString()}
                  />
                  <Area type="monotone" dataKey="value" stroke="#D4B4E8" strokeWidth={3} fill="url(#colorBody)" />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="w-full h-full flex flex-col items-center justify-center text-slate-400">
                <div className="text-3xl mb-2">📉</div>
                <p className="text-sm font-medium">No history yet</p>
              </div>
            )}
          </div>
        </div>

        {/* Date Info */}
        <div className="bg-slate-100 rounded-3xl p-5 text-center">
          <div className="flex items-center justify-center gap-2 mb-2">
            <p className="text-xs text-slate-500 font-bold uppercase tracking-wider">Viewing Entry</p>
            {activeEntry?.id === sortedEntries[0]?.id && (
              <span className="text-[10px] bg-[#D4B4E8] text-slate-900 font-black px-2 py-0.5 rounded-full shadow-sm">LATEST 🌟</span>
            )}
          </div>
          <select 
            value={activeEntry?.id || ''}
            onChange={(e) => setViewingEntryId(e.target.value)}
            className="w-full bg-white border border-slate-200 text-slate-900 font-bold rounded-xl px-4 py-2 text-sm outline-none focus:ring-2 focus:ring-[#D4B4E8]"
          >
            {sortedEntries.length > 0 ? (
              sortedEntries.map((entry, idx) => (
                <option key={entry.id} value={entry.id}>
                  {idx === 0 ? '🌟 Latest - ' : ''}
                  {new Date(entry.date).toLocaleDateString('en-US', { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' })}
                </option>
              ))
            ) : (
              <option value="">No entries yet</option>
            )}
          </select>
        </div>
      </div>

      {/* Stats Modal */}
      {createPortal(
        <AnimatePresence>
          {showStatsModal && (
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setShowStatsModal(false)} />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="relative bg-white rounded-3xl w-full max-w-4xl p-6 shadow-2xl flex flex-col h-[80vh]"
            >
              <button 
                onClick={() => setShowStatsModal(false)} 
                className="absolute top-4 right-4 p-2 bg-slate-100 hover:bg-slate-200 rounded-full transition-all text-slate-500"
              >
                <X size={20} />
              </button>
              
              <div className="flex items-center gap-3 mb-6">
                <div className="w-12 h-12 bg-[#D4B4E8]/20 rounded-xl flex items-center justify-center text-2xl text-[#D4B4E8]">📈</div>
                <div>
                  <h2 className="text-2xl font-black text-slate-900">{activeNodeLabel} History</h2>
                  <p className="text-sm text-slate-500">View measurements over time in {activeNode === 'weight' ? weightUnit : unit}</p>
                </div>
              </div>

              {/* Range Selectors */}
              <div className="flex flex-wrap gap-2 mb-6 bg-slate-50 p-2 rounded-2xl w-max border border-slate-100">
                {['1m', '1y', 'all', 'custom'].map(r => (
                  <button 
                    key={r}
                    onClick={() => setTimeRange(r as any)}
                    className={`px-4 py-2 rounded-xl text-sm font-bold capitalize transition-all ${timeRange === r ? 'bg-[#D4B4E8] text-slate-900 shadow-sm' : 'text-slate-500 hover:bg-slate-200'}`}
                  >
                    {r === '1m' ? '1 Month' : r === '1y' ? '1 Year' : r}
                  </button>
                ))}
              </div>

              {timeRange === 'custom' && (
                <div className="flex gap-4 mb-6">
                  <div>
                    <label className="block text-xs font-bold text-slate-500 mb-1">Start Date</label>
                    <input type="date" value={customStart} onChange={e => setCustomStart(e.target.value)} className="bg-slate-100 rounded-xl px-4 py-2 text-sm outline-none font-bold text-slate-700" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 mb-1">End Date</label>
                    <input type="date" value={customEnd} onChange={e => setCustomEnd(e.target.value)} className="bg-slate-100 rounded-xl px-4 py-2 text-sm outline-none font-bold text-slate-700" />
                  </div>
                </div>
              )}

              <div className="w-full mt-2 h-[300px]">
                {filteredChartData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={300}>
                    <AreaChart data={filteredChartData} margin={{ top: 20, right: 20, left: -20, bottom: 0 }}>
                      <defs>
                        <linearGradient id="colorBodyModal" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#D4B4E8" stopOpacity={0.6}/>
                          <stop offset="95%" stopColor="#D4B4E8" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(0,0,0,0.05)" />
                      <XAxis dataKey="timestamp" type="number" scale="time" domain={['dataMin', 'dataMax']} 
                        tickFormatter={tick => new Date(tick).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} 
                        tick={{ fontSize: 12, fill: '#64748b' }} tickLine={false} axisLine={false} dy={10} />
                      <YAxis domain={['auto', 'auto']} tick={{ fontSize: 12, fill: '#64748b' }} tickLine={false} axisLine={false} dx={-10} />
                      <RechartsTooltip 
                        contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)' }}
                        formatter={(val: any) => [`${val} ${activeNode === 'weight' ? weightUnit : unit}`, activeNodeLabel]}
                        labelFormatter={(label) => new Date(label).toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                      />
                      <Area type="monotone" dataKey="value" stroke="#D4B4E8" strokeWidth={4} fill="url(#colorBodyModal)" activeDot={{ r: 6, fill: '#D4B4E8', stroke: 'white', strokeWidth: 2 }} />
                    </AreaChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center text-slate-400 bg-slate-50 rounded-3xl border border-slate-100">
                    <div className="text-5xl mb-4">📉</div>
                    <p className="text-lg font-bold text-slate-500">No data for this period</p>
                  </div>
                )}
              </div>
            </motion.div>
            </div>
          )}
        </AnimatePresence>,
        document.body
      )}

    </div>
  );
};
