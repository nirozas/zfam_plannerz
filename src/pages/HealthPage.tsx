import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Plus, Activity, Calendar as CalendarIcon, TrendingUp,
  X, ChevronLeft, ChevronRight, Trash2, List, BarChart2, Edit2,
} from 'lucide-react';
import {
  AreaChart, Area, BarChart, Bar, LineChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  ReferenceLine,
} from 'recharts';
import { useHealthStore } from '../store/healthStore';
import { Tracker, HealthEntry, QualitativeValue, PRESET_QUALITATIVE_TRACKERS, PRESET_QUANTITATIVE_TRACKERS } from '../types/health';
import { BodyMeasurementsView } from '../components/health/BodyMeasurementsView';

// ─── Helper functions ──────────────────────────────────────────
const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];



function getDaysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate();
}

// ✅ FIX: Use LOCAL date (not UTC) to avoid timezone drift
function formatDate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function parseDate(str: string): Date {
  const [y, m, d] = str.split('-').map(Number);
  return new Date(y, m - 1, d);
}


// ─── Annual Calendar Component ─────────────────────────────────
const ZOOM_LEVELS = [25, 50, 75, 100, 125, 150, 175, 200];

const AnnualCalendar: React.FC<{
  tracker: Tracker;
  entries: HealthEntry[];
  year: number;
  onDayClick: (date: string, existing?: HealthEntry) => void;
}> = ({ tracker, entries, year, onDayClick }) => {
  const [zoom, setZoom] = useState(100);

  const entryMap = useMemo(() => {
    const map: Record<string, HealthEntry> = {};
    entries.filter(e => e.date.startsWith(String(year))).forEach(e => { map[e.date] = e; });
    return map;
  }, [entries, year]);

  const getLabel = (entry?: HealthEntry) => {
    if (!entry) return null;
    return tracker.values?.find(v => v.id === entry.qualitativeValueId);
  };

  const today = formatDate(new Date());

  // Base font size for emojis based on zoom
  const emojiSize = Math.max(16, Math.round(28 * zoom / 100));
  const minCellWidth = Math.max(20, Math.round(24 * zoom / 100)); // px

  return (
    <div className="w-full flex flex-col xl:flex-row gap-6">
      {/* Main Calendar Area */}
      <div className="flex-1 min-w-0">
        {/* Zoom controls & Header */}
        <div className="flex items-center justify-between mb-4">
          <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">{year} — {Object.keys(entryMap).length} entries</span>
          <div className="flex items-center gap-1 bg-slate-100 rounded-xl p-1">
            <button
              onClick={() => setZoom(z => ZOOM_LEVELS[Math.max(0, ZOOM_LEVELS.indexOf(z) - 1)])}
              disabled={zoom === ZOOM_LEVELS[0]}
              className="px-2 py-1 text-slate-500 hover:text-slate-900 text-xs rounded-lg disabled:opacity-30 hover:bg-slate-200 transition-all"
            >−</button>
            <span className="text-xs text-slate-900 font-bold px-2 min-w-[40px] text-center">{zoom}%</span>
            <button
              onClick={() => setZoom(z => ZOOM_LEVELS[Math.min(ZOOM_LEVELS.length - 1, ZOOM_LEVELS.indexOf(z) + 1)])}
              disabled={zoom === ZOOM_LEVELS[ZOOM_LEVELS.length - 1]}
              className="px-2 py-1 text-slate-500 hover:text-slate-900 text-xs rounded-lg disabled:opacity-30 hover:bg-slate-200 transition-all"
            >+</button>
          </div>
        </div>

        {/* Grid Container */}
        <div className="overflow-x-auto pb-4">
          <div className="flex flex-col gap-1 min-w-max w-full">
            {/* Day Number Headers */}
            <div className="flex items-center gap-1 mb-1">
              {/* Spacer for month labels */}
              <div className="w-10 shrink-0" /> 
              {Array.from({ length: 31 }, (_, i) => (
                <div key={i} className="flex-1 shrink-0 text-center text-[10px] font-bold text-slate-400" style={{ minWidth: `${minCellWidth}px` }}>
                  {i + 1}
                </div>
              ))}
            </div>

            {/* Months Rows */}
            {MONTHS.map((month, mIdx) => {
              const daysInMonth = getDaysInMonth(year, mIdx);
              return (
                <div key={month} className="flex items-stretch gap-1 w-full">
                  {/* Month Label */}
                  <div className="w-10 shrink-0 flex items-center justify-end pr-2">
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">{month}</span>
                  </div>

                  {/* Days */}
                  {Array.from({ length: 31 }, (_, dIdx) => {
                    const day = dIdx + 1;
                    if (day > daysInMonth) {
                      return <div key={dIdx} className="flex-1 shrink-0" style={{ minWidth: `${minCellWidth}px` }} />;
                    }
                    const dateStr = `${year}-${String(mIdx + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                    const entry = entryMap[dateStr];
                    const label = getLabel(entry);
                    const isToday = dateStr === today;
                    const isFuture = dateStr > today;

                    return (
                      <motion.button
                        key={dIdx}
                        whileHover={!isFuture ? { scale: 1.15, zIndex: 10 } : {}}
                        whileTap={!isFuture ? { scale: 0.95 } : {}}
                        onClick={() => !isFuture && onDayClick(dateStr, entry)}
                        className={`flex-1 shrink-0 relative flex items-center justify-center rounded transition-all min-h-[${minCellWidth}px] ${
                          isFuture ? 'opacity-20 cursor-default bg-slate-50' : 'cursor-pointer hover:shadow-md'
                        } ${
                          !entry && !isFuture ? 'bg-slate-100 border border-slate-200/60 hover:bg-slate-200' : ''
                        } ${isToday ? 'ring-2 ring-indigo-500 ring-offset-1' : ''}`}
                        style={{
                          minWidth: `${minCellWidth}px`,
                          aspectRatio: '1 / 1',
                          backgroundColor: entry ? (label?.color || '#e2e8f0') : undefined,
                        }}
                        title={`${dateStr}${label ? ` — ${label.emoji || ''} ${label.label}` : ' (click to log)'}`}
                      >
                        {entry && label && (
                          <span style={{ fontSize: `${emojiSize}px`, lineHeight: 1 }} className="drop-shadow-sm">
                            {label.emoji}
                          </span>
                        )}
                      </motion.button>
                    );
                  })}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Legend on the Right */}
      <div className="xl:w-48 shrink-0 bg-white border border-slate-200 rounded-2xl p-4 shadow-sm self-start">
        <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Legend</h4>
        <div className="flex flex-col gap-3">
          {tracker.values?.map(v => {
            const count = Object.values(entryMap).filter(e => e.qualitativeValueId === v.id).length;
            return (
              <div key={v.id} className="flex items-center justify-between group">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded flex items-center justify-center shadow-sm transition-transform group-hover:scale-110" style={{ backgroundColor: v.color }}>
                    <span className="text-xs">{v.emoji}</span>
                  </div>
                  <span className="text-sm font-bold text-slate-700">{v.label}</span>
                </div>
                {count > 0 && <span className="text-xs text-slate-700 font-black bg-slate-200 px-2 py-0.5 rounded-md">{count}</span>}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};


// ─── Stats Chart Component ─────────────────────────────────────
type TimeRange = '7d' | '30d' | '90d' | '1y' | '3y' | '5y' | 'all' | 'custom';

const StatsChart: React.FC<{
  tracker: Tracker;
  entries: HealthEntry[];
}> = ({ tracker, entries }) => {
  const [range, setRange] = useState<TimeRange>('30d');
  const [customStart, setCustomStart] = useState<string>('');
  const [customEnd, setCustomEnd] = useState<string>('');
  
  const ranges: { label: string; value: TimeRange }[] = [
    { label: '7D', value: '7d' },
    { label: '1M', value: '30d' },
    { label: '3M', value: '90d' },
    { label: '1Y', value: '1y' },
    { label: '3Y', value: '3y' },
    { label: '5Y', value: '5y' },
    { label: 'All', value: 'all' },
    { label: 'Custom', value: 'custom' },
  ];

  const filteredData = useMemo(() => {
    const now = new Date();
    let minDate = new Date(2000, 0, 1);
    let maxDate = new Date(2100, 0, 1);

    if (range === 'custom') {
      if (customStart) minDate = parseDate(customStart);
      if (customEnd) maxDate = parseDate(customEnd);
      maxDate.setHours(23, 59, 59, 999);
    } else {
      maxDate = now;
      minDate = new Date(now);
      switch (range) {
        case '7d': minDate.setDate(now.getDate() - 7); break;
        case '30d': minDate.setDate(now.getDate() - 30); break;
        case '90d': minDate.setDate(now.getDate() - 90); break;
        case '1y': minDate.setFullYear(now.getFullYear() - 1); break;
        case '3y': minDate.setFullYear(now.getFullYear() - 3); break;
        case '5y': minDate.setFullYear(now.getFullYear() - 5); break;
        case 'all': minDate.setFullYear(2000); break;
      }
    }

    return entries
      .filter(e => {
        if (e.numericValue === undefined) return false;
        const d = parseDate(e.date);
        return d >= minDate && d <= maxDate;
      })
      .sort((a, b) => a.date.localeCompare(b.date))
      .map(e => ({
        date: e.date,
        value: e.numericValue!,
        timestamp: parseDate(e.date).getTime(),
      }));
  }, [entries, range, customStart, customEnd]);

  const formatXAxisTick = (tick: number) => {
    const d = new Date(tick);
    if (range === '7d') return d.toLocaleDateString('en-US', { weekday: 'short' });
    if (range === '30d' || range === '90d') return d.toLocaleDateString('en-US', { day: 'numeric', month: 'short' });
    if (range === '1y') return d.toLocaleDateString('en-US', { month: 'short' });
    if (range === 'custom') {
      if (customStart && customEnd) {
        const diff = parseDate(customEnd).getTime() - parseDate(customStart).getTime();
        if (diff <= 7 * 24 * 3600 * 1000) return d.toLocaleDateString('en-US', { weekday: 'short' });
        if (diff <= 90 * 24 * 3600 * 1000) return d.toLocaleDateString('en-US', { day: 'numeric', month: 'short' });
        if (diff <= 365 * 24 * 3600 * 1000) return d.toLocaleDateString('en-US', { month: 'short' });
      }
    }
    return d.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
  };

  const stats = useMemo(() => {
    if (!filteredData.length) return null;
    const vals = filteredData.map(d => d.value);
    const avg = vals.reduce((a, b) => a + b, 0) / vals.length;
    const min = Math.min(...vals);
    const max = Math.max(...vals);
    const latest = vals[vals.length - 1];
    const first = vals[0];
    const trend = latest - first;
    return { avg: Math.round(avg * 10) / 10, min, max, latest, trend: Math.round(trend * 10) / 10 };
  }, [filteredData]);

  const color = tracker.color || '#6366f1';
  const [localChartType, setLocalChartType] = useState<'area' | 'bar' | 'line'>(
    (tracker.chartType as 'area' | 'bar' | 'line') || 'area'
  );

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload || !payload.length) return null;
    const formattedLabel = typeof label === 'number' ? new Date(label).toLocaleDateString() : label;

    return (
      <div className="bg-white border border-slate-200 rounded-xl px-3 py-2 shadow-xl">
        <p className="text-xs text-slate-500 mb-1">{formattedLabel}</p>
        <p className="text-base font-bold" style={{ color }}>
          {payload[0].value} <span className="text-xs font-normal text-slate-500">{tracker.unit}</span>
        </p>
      </div>
    );
  };

  return (
    <div className="space-y-4">
      {/* Time Range Toggle & Chart Type */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex gap-0.5 bg-slate-100 rounded-xl p-1 overflow-x-auto">
            {ranges.map(r => (
              <button
                key={r.value}
                onClick={() => setRange(r.value)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${
                  range === r.value
                    ? 'text-slate-900 shadow-lg'
                    : 'text-slate-500 hover:text-slate-700'
                }`}
                style={range === r.value ? { backgroundColor: color } : {}}
              >
                {r.label}
              </button>
            ))}
          </div>

          <div className="flex gap-0.5 bg-slate-100 rounded-xl p-1 shrink-0">
            <button
              onClick={() => setLocalChartType('area')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${localChartType === 'area' ? 'bg-slate-200 text-slate-900 shadow' : 'text-slate-500 hover:text-slate-700'}`}
            >
              Area
            </button>
            <button
              onClick={() => setLocalChartType('line')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${localChartType === 'line' ? 'bg-slate-200 text-slate-900 shadow' : 'text-slate-500 hover:text-slate-700'}`}
            >
              Line
            </button>
            <button
              onClick={() => setLocalChartType('bar')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${localChartType === 'bar' ? 'bg-slate-200 text-slate-900 shadow' : 'text-slate-500 hover:text-slate-700'}`}
            >
              Bar
            </button>
          </div>
        </div>

        {stats && range !== 'custom' && (
          <div className="flex gap-4 text-xs whitespace-nowrap">
            <span className="text-slate-500">Avg: <span className="text-slate-900 font-bold">{stats.avg} {tracker.unit}</span></span>
            <span className="text-slate-500">Min: <span className="font-bold" style={{ color }}>{stats.min}</span></span>
            <span className="text-slate-500">Max: <span className="font-bold text-amber-400">{stats.max}</span></span>
          </div>
        )}
      </div>

      {range === 'custom' && (
        <div className="flex flex-wrap items-center gap-4 bg-slate-50 p-3 rounded-xl border border-slate-200">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-500">From:</span>
            <input 
              type="date" 
              value={customStart} 
              onChange={e => setCustomStart(e.target.value)} 
              className="bg-white border border-slate-200 text-slate-900 rounded-lg px-2 py-1 text-sm"
            />
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-500">To:</span>
            <input 
              type="date" 
              value={customEnd} 
              onChange={e => setCustomEnd(e.target.value)} 
              className="bg-white border border-slate-200 text-slate-900 rounded-lg px-2 py-1 text-sm"
            />
          </div>
          {stats && (
            <div className="flex gap-4 text-xs ml-auto">
              <span className="text-slate-500">Avg: <span className="text-slate-900 font-bold">{stats.avg} {tracker.unit}</span></span>
              <span className="text-slate-500">Min: <span className="font-bold" style={{ color }}>{stats.min}</span></span>
              <span className="text-slate-500">Max: <span className="font-bold text-amber-400">{stats.max}</span></span>
            </div>
          )}
        </div>
      )}

      {/* Chart */}
      <div className="h-[520px] mt-6">
        {filteredData.length === 0 ? (
          <div className="h-full flex items-center justify-center text-slate-600 text-sm">No data for this period</div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            {localChartType === 'area' ? (
              <AreaChart data={filteredData} margin={{ top: 10, right: 10, bottom: 10, left: 0 }}>
                <defs>
                  <linearGradient id={`grad_${tracker.id}`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={color} stopOpacity={0.4} />
                    <stop offset="95%" stopColor={color} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.05)" />
                <XAxis dataKey="timestamp" type="number" scale="time" domain={['dataMin', 'dataMax']} tickFormatter={formatXAxisTick} tick={{ fontSize: 12, fill: '#64748b', fontWeight: 'bold' }} tickLine={false} axisLine={false} />
                <YAxis domain={['auto', 'auto']} tick={{ fontSize: 12, fill: '#64748b', fontWeight: 'bold' }} tickLine={false} axisLine={false} width={45} />
                <Tooltip content={<CustomTooltip />} />
                {stats && <ReferenceLine y={stats.avg} stroke="#64748b" strokeDasharray="3 3" strokeOpacity={0.8} label={{ value: 'Avg', fontSize: 11, fill: '#64748b', fontWeight: 'bold' }} />}
                {stats && <ReferenceLine y={stats.max} stroke="#94a3b8" strokeDasharray="3 3" strokeOpacity={0.6} label={{ value: 'Max', fontSize: 10, fill: '#94a3b8' }} />}
                {stats && <ReferenceLine y={stats.min} stroke="#94a3b8" strokeDasharray="3 3" strokeOpacity={0.6} label={{ value: 'Min', fontSize: 10, fill: '#94a3b8' }} />}
                {tracker.referenceMin && <ReferenceLine y={tracker.referenceMin} stroke="#22c55e" strokeDasharray="4 4" strokeOpacity={0.5} label={{ value: 'Target Min', fontSize: 10, fill: '#22c55e' }} />}
                {tracker.referenceMax && <ReferenceLine y={tracker.referenceMax} stroke="#ef4444" strokeDasharray="4 4" strokeOpacity={0.5} label={{ value: 'Target Max', fontSize: 10, fill: '#ef4444' }} />}
                {tracker.goalValue && <ReferenceLine y={tracker.goalValue} stroke="#f59e0b" strokeDasharray="4 4" strokeOpacity={0.7} label={{ value: 'Goal', fontSize: 10, fill: '#f59e0b' }} />}
                <Area type="monotone" dataKey="value" stroke={color} strokeWidth={3} fill={`url(#grad_${tracker.id})`} dot={{ r: 4, fill: '#ffffff', stroke: color, strokeWidth: 2 }} activeDot={{ r: 6, fill: color, stroke: '#1e293b', strokeWidth: 3 }} />
              </AreaChart>
            ) : localChartType === 'bar' ? (
              <BarChart data={filteredData} margin={{ top: 10, right: 10, bottom: 10, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.05)" vertical={false} />
                <XAxis dataKey="timestamp" type="number" scale="time" domain={['dataMin', 'dataMax']} tickFormatter={formatXAxisTick} tick={{ fontSize: 12, fill: '#64748b', fontWeight: 'bold' }} tickLine={false} axisLine={false} />
                <YAxis domain={['auto', 'auto']} tick={{ fontSize: 12, fill: '#64748b', fontWeight: 'bold' }} tickLine={false} axisLine={false} width={45} />
                <Tooltip content={<CustomTooltip />} />
                {stats && <ReferenceLine y={stats.avg} stroke="#64748b" strokeDasharray="3 3" strokeOpacity={0.8} label={{ value: 'Avg', fontSize: 11, fill: '#64748b', fontWeight: 'bold' }} />}
                {stats && <ReferenceLine y={stats.max} stroke="#94a3b8" strokeDasharray="3 3" strokeOpacity={0.6} label={{ value: 'Max', fontSize: 10, fill: '#94a3b8' }} />}
                {stats && <ReferenceLine y={stats.min} stroke="#94a3b8" strokeDasharray="3 3" strokeOpacity={0.6} label={{ value: 'Min', fontSize: 10, fill: '#94a3b8' }} />}
                {tracker.goalValue && <ReferenceLine y={tracker.goalValue} stroke="#f59e0b" strokeDasharray="4 4" strokeOpacity={0.7} />}
                {tracker.referenceMin && <ReferenceLine y={tracker.referenceMin} stroke="#22c55e" strokeDasharray="4 4" strokeOpacity={0.5} />}
                {tracker.referenceMax && <ReferenceLine y={tracker.referenceMax} stroke="#ef4444" strokeDasharray="4 4" strokeOpacity={0.5} />}
                <Bar dataKey="value" fill={color} fillOpacity={0.9} radius={[4, 4, 0, 0]} maxBarSize={40} barSize={12} />
              </BarChart>
            ) : (
              <LineChart data={filteredData} margin={{ top: 10, right: 10, bottom: 10, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.05)" />
                <XAxis dataKey="timestamp" type="number" scale="time" domain={['dataMin', 'dataMax']} tickFormatter={formatXAxisTick} tick={{ fontSize: 12, fill: '#64748b', fontWeight: 'bold' }} tickLine={false} axisLine={false} />
                <YAxis domain={['auto', 'auto']} tick={{ fontSize: 12, fill: '#64748b', fontWeight: 'bold' }} tickLine={false} axisLine={false} width={45} />
                <Tooltip content={<CustomTooltip />} />
                {stats && <ReferenceLine y={stats.avg} stroke="#64748b" strokeDasharray="3 3" strokeOpacity={0.8} label={{ value: 'Avg', fontSize: 11, fill: '#64748b', fontWeight: 'bold' }} />}
                {stats && <ReferenceLine y={stats.max} stroke="#94a3b8" strokeDasharray="3 3" strokeOpacity={0.6} label={{ value: 'Max', fontSize: 10, fill: '#94a3b8' }} />}
                {stats && <ReferenceLine y={stats.min} stroke="#94a3b8" strokeDasharray="3 3" strokeOpacity={0.6} label={{ value: 'Min', fontSize: 10, fill: '#94a3b8' }} />}
                {tracker.referenceMin && <ReferenceLine y={tracker.referenceMin} stroke="#22c55e" strokeDasharray="4 4" strokeOpacity={0.5} label={{ value: 'Target Low', fontSize: 10, fill: '#22c55e' }} />}
                {tracker.referenceMax && <ReferenceLine y={tracker.referenceMax} stroke="#ef4444" strokeDasharray="4 4" strokeOpacity={0.5} label={{ value: 'Target High', fontSize: 10, fill: '#ef4444' }} />}
                {tracker.goalValue && <ReferenceLine y={tracker.goalValue} stroke="#f59e0b" strokeDasharray="4 4" strokeOpacity={0.7} label={{ value: 'Goal', fontSize: 10, fill: '#f59e0b' }} />}
                <Line type="monotone" dataKey="value" stroke={color} strokeWidth={3} dot={{ r: 4, fill: '#ffffff', stroke: color, strokeWidth: 2 }} activeDot={{ r: 6, fill: color, stroke: '#1e293b', strokeWidth: 3 }} />
              </LineChart>
            )}
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
};

// ─── Add/Edit Entry Modal ──────────────────────────────────────
const AddEntryModal: React.FC<{
  tracker: Tracker;
  existingEntry?: HealthEntry;
  defaultDate?: string;
  onSave: (entry: Omit<HealthEntry, 'id' | 'createdAt'>) => void;
  onDelete?: () => void;
  onClose: () => void;
}> = ({ tracker, existingEntry, defaultDate, onSave, onDelete, onClose }) => {
  const [date, setDate] = useState(existingEntry?.date || defaultDate || formatDate(new Date()));
  const [selectedValueId, setSelectedValueId] = useState(existingEntry?.qualitativeValueId || '');
  const [inputValue, setInputValue] = useState(() => {
    if (!existingEntry?.numericValue) return '';
    return existingEntry.numericValue.toString();
  });
  const [note, setNote] = useState(existingEntry?.note || '');
  const isWeight = tracker.unit === 'kg';
  const [weightUnit, setWeightUnit] = useState<'kg' | 'lb'>('kg');

  const handleUnitToggle = (newUnit: 'kg' | 'lb') => {
    if (newUnit === weightUnit) return;
    setWeightUnit(newUnit);
    if (!inputValue) return;
    const val = parseFloat(inputValue);
    if (isNaN(val)) return;
    if (newUnit === 'lb') setInputValue(String(Math.round(val * 2.20462 * 10) / 10));
    else setInputValue(String(Math.round(val / 2.20462 * 10) / 10));
  };

  const handleSave = () => {
    if (!date) return;
    let finalNumeric: number | undefined;
    if (tracker.type === 'quantitative' && inputValue) {
      let parsed = parseFloat(inputValue);
      if (!isNaN(parsed)) {
        if (isWeight && weightUnit === 'lb') parsed = parsed / 2.20462;
        finalNumeric = parsed;
      }
    }
    onSave({
      trackerId: tracker.id,
      date,
      qualitativeValueId: tracker.type === 'qualitative' ? selectedValueId : undefined,
      numericValue: tracker.type === 'quantitative' ? finalNumeric : undefined,
      note: note || undefined,
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <motion.div initial={{ y: 50, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="relative bg-white border border-slate-200/60 rounded-2xl w-full max-w-md shadow-2xl">
        <div className="flex items-center justify-between p-5 border-b border-slate-200">
          <h3 className="font-bold text-slate-900">{existingEntry ? 'Edit' : 'Log'} {tracker.name}</h3>
          <button onClick={onClose}><X size={18} /></button>
        </div>
        <div className="p-5 space-y-4">
           {/* Date Input */}
           <div>
             <label className="block text-xs font-bold text-slate-500 mb-1">Date</label>
             <input
               type="date"
               value={date}
               onChange={e => setDate(e.target.value)}
               min="1900-01-01"
               className="w-full bg-slate-100 border border-slate-200 text-slate-900 rounded-xl px-4 py-2.5"
             />
           </div>

           {tracker.type === 'qualitative' && tracker.values && (
            <div className="grid grid-cols-3 gap-2">
              {tracker.values.map(v => (
                <button
                  key={v.id}
                  onClick={() => setSelectedValueId(v.id)}
                  className={`p-3 rounded-xl border-2 transition-all ${selectedValueId === v.id ? 'border-indigo-500 bg-indigo-500/20' : 'bg-slate-100 border-slate-200'}`}
                >
                  <div className="text-2xl">{v.emoji}</div>
                  <div className="text-xs font-bold text-slate-900 mt-1">{v.label}</div>
                </button>
              ))}
            </div>
           )}

           {tracker.type === 'quantitative' && (
             <div>
                {isWeight && (
                  <div className="flex bg-slate-100 rounded-lg p-1 w-max mb-2">
                    <button onClick={() => handleUnitToggle('kg')} className={`px-3 py-1 rounded-md text-xs font-bold ${weightUnit === 'kg' ? 'bg-[#D4B4E8] text-slate-900' : 'text-slate-500'}`}>KG</button>
                    <button onClick={() => handleUnitToggle('lb')} className={`px-3 py-1 rounded-md text-xs font-bold ${weightUnit === 'lb' ? 'bg-[#D4B4E8] text-slate-900' : 'text-slate-500'}`}>LB</button>
                  </div>
                )}
                <input
                  type="number"
                  value={inputValue}
                  onChange={e => setInputValue(e.target.value)}
                  placeholder={`Value in ${weightUnit}`}
                  className="w-full bg-slate-100 border border-slate-200 text-slate-900 rounded-xl px-4 py-2.5"
                />
             </div>
           )}

           <div>
             <label className="block text-xs font-bold text-slate-500 mb-1">Note (Optional)</label>
             <textarea
              value={note}
              onChange={e => setNote(e.target.value)}
              placeholder="How did you feel?"
              className="w-full bg-slate-100 border border-slate-200 text-slate-900 rounded-xl px-4 py-2.5 resize-none h-24"
             />
           </div>
        </div>
        <div className="flex items-center justify-between p-5 border-t border-slate-200">
          {existingEntry && onDelete && <button onClick={() => { onDelete(); onClose(); }} className="text-red-400"><Trash2 size={16} /></button>}
          <button onClick={handleSave} className="px-5 py-2.5 bg-[#D4B4E8] hover:bg-[#C2A3D6] text-slate-900 font-bold rounded-xl">Save</button>
        </div>
      </motion.div>
    </div>
  );
};

// ─── Create Tracker Modal ──────────────────────────────────────
const CreateTrackerModal: React.FC<{
  onSave: (tracker: Omit<Tracker, 'id' | 'createdAt'>) => void;
  onClose: () => void;
}> = ({ onSave, onClose }) => {
  const [trackerType, setTrackerType] = useState<'qualitative' | 'quantitative' | 'body_measurements'>('qualitative');
  const [configPreset, setConfigPreset] = useState<Omit<Tracker, 'id' | 'userId' | 'createdAt' | 'sortOrder'> | null>(null);
  
  // Custom Quantitative State
  const [isCustomStats, setIsCustomStats] = useState(false);
  const [customName, setCustomName] = useState('');
  const [customEmoji, setCustomEmoji] = useState('📊');
  const [customUnit, setCustomUnit] = useState('kg');
  const [customChartType, setCustomChartType] = useState<'line' | 'bar' | 'area'>('line');

  // Custom 1-10 Rating State
  const [customRatingName, setCustomRatingName] = useState('1-10 Rating');
  const [customValues, setCustomValues] = useState<{label: string, emoji: string}[]>(Array(10).fill({label: '', emoji: ''}));

  const SPECTRUM = ['#B6E9F0', '#BDF0D8', '#D8F2C9', '#EDF7CB', '#FBF6E2', '#FCEBC7', '#FFE2C2', '#FFD2CF', '#D4B4E8', '#C2CEFF'];

  useEffect(() => {
    if (configPreset?.name === '1-10 Rating') {
      setCustomRatingName('1-10 Rating');
      setCustomValues(configPreset.values?.map(v => ({ label: v.label, emoji: v.emoji || '' })) || Array(10).fill({label: '', emoji: ''}));
    }
  }, [configPreset]);

  const handleSave10Rating = () => {
    if (!configPreset) return;
    const newValues = configPreset.values
      ?.map((v, i) => ({ ...v, label: customValues[i].label, emoji: customValues[i].emoji }))
      .filter(v => v.label.trim() !== '') || [];
    onSave({ ...configPreset, name: customRatingName || configPreset.name, values: newValues, sortOrder: 99 });
    onClose();
  };

  const handleSaveCustomStats = () => {
    if (!customName.trim()) return;
    onSave({
      name: customName,
      emoji: customEmoji,
      type: 'quantitative',
      unit: customUnit,
      chartType: customChartType,
      sortOrder: 99
    });
    onClose();
  };

  const renderConfig = () => {
    if (isCustomStats) {
      return (
        <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-2">
          <div className="flex gap-3">
            <div className="flex-1">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1 block">Name</label>
              <input value={customName} onChange={e => setCustomName(e.target.value)} className="w-full bg-slate-100 rounded-xl p-3 border-none outline-none focus:ring-2 focus:ring-[#D4B4E8]" placeholder="e.g. Protein Intake" autoFocus />
            </div>
            <div className="w-20">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1 block">Emoji</label>
              <input value={customEmoji} onChange={e => setCustomEmoji(e.target.value)} className="w-full bg-slate-100 rounded-xl p-3 text-center border-none outline-none focus:ring-2 focus:ring-[#D4B4E8]" />
            </div>
          </div>
          <div>
            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1 block">Unit</label>
            <input value={customUnit} onChange={e => setCustomUnit(e.target.value)} className="w-full bg-slate-100 rounded-xl p-3 border-none outline-none focus:ring-2 focus:ring-[#D4B4E8]" placeholder="e.g. g, kcal, min" />
          </div>
          <div>
            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1 block">Chart Type</label>
            <div className="flex gap-2">
              {['line', 'bar', 'area'].map(t => (
                <button key={t} onClick={() => setCustomChartType(t as any)} className={`flex-1 py-2 rounded-xl text-sm font-bold capitalize ${customChartType === t ? 'bg-[#D4B4E8] text-slate-900' : 'bg-slate-100 text-slate-600'}`}>{t}</button>
              ))}
            </div>
          </div>
          <div className="flex items-center gap-2 pt-2">
            <button onClick={() => setIsCustomStats(false)} className="flex-1 p-3 bg-slate-100 text-slate-700 font-bold rounded-xl">Back</button>
            <button onClick={handleSaveCustomStats} className="flex-1 p-3 bg-[#D4B4E8] text-slate-900 font-bold rounded-xl">Create Tracker</button>
          </div>
        </div>
      );
    }

    if (configPreset?.name === '1-10 Rating') {
      return (
        <div className="flex flex-col max-h-[60vh]">
          <div className="mb-3">
            <h4 className="font-bold text-slate-900 flex items-center gap-2">{configPreset.emoji} Configure Custom Rating</h4>
            <p className="text-xs text-slate-500 mb-2">Edit the labels and optional emojis. Leave a label blank to hide it.</p>
            <input 
              value={customRatingName} 
              onChange={e => setCustomRatingName(e.target.value)} 
              className="w-full bg-slate-100 rounded-xl p-2.5 text-sm font-bold border-none outline-none focus:ring-2 focus:ring-[#D4B4E8]" 
              placeholder="Tracker Name (e.g. Productivity)" 
            />
          </div>
          <div className="space-y-2 overflow-y-auto pr-2 pb-2">
            {customValues.map((val, i) => (
              <div key={i} className="flex items-center gap-2">
                <div className="w-8 h-8 flex-shrink-0 flex items-center justify-center rounded-lg font-bold text-xs" style={{ backgroundColor: SPECTRUM[i] }}>{i + 1}</div>
                <input
                  type="text"
                  value={val.emoji}
                  onChange={e => {
                    const newVals = [...customValues];
                    newVals[i] = { ...newVals[i], emoji: e.target.value };
                    setCustomValues(newVals);
                  }}
                  className="w-12 bg-slate-100 border-none rounded-xl p-2.5 text-sm text-center outline-none focus:ring-2 focus:ring-[#D4B4E8]"
                  placeholder="Emoji"
                />
                <input
                  type="text"
                  value={val.label}
                  onChange={e => {
                    const newVals = [...customValues];
                    newVals[i] = { ...newVals[i], label: e.target.value };
                    setCustomValues(newVals);
                  }}
                  className="flex-1 bg-slate-100 border-none rounded-xl p-2.5 text-sm outline-none focus:ring-2 focus:ring-[#D4B4E8]"
                  placeholder={`Value ${i + 1}`}
                />
              </div>
            ))}
          </div>
          <div className="flex items-center gap-2 pt-3 mt-auto bg-white border-t border-slate-100">
            <button onClick={() => setConfigPreset(null)} className="flex-1 p-3 bg-slate-100 text-slate-700 font-bold rounded-xl">Back</button>
            <button onClick={handleSave10Rating} className="flex-1 p-3 bg-[#D4B4E8] text-slate-900 font-bold rounded-xl">Save Setup</button>
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <motion.div className="relative bg-white border border-slate-200/60 rounded-2xl w-full max-w-lg p-5">
        {!configPreset && !isCustomStats && (
          <>
            <h3 className="font-bold text-slate-900 mb-4">Add New Tracker</h3>
            <div className="grid grid-cols-3 gap-3 mb-4">
              <button onClick={() => setTrackerType('qualitative')} className={`p-4 rounded-xl border ${trackerType === 'qualitative' ? 'border-[#D4B4E8] bg-[#D4B4E8]/10 text-slate-900' : 'border-slate-200 text-slate-500'}`}>Calendar</button>
              <button onClick={() => setTrackerType('quantitative')} className={`p-4 rounded-xl border ${trackerType === 'quantitative' ? 'border-[#D4B4E8] bg-[#D4B4E8]/10 text-slate-900' : 'border-slate-200 text-slate-500'}`}>Stats</button>
              <button onClick={() => setTrackerType('body_measurements')} className={`p-4 rounded-xl border ${trackerType === 'body_measurements' ? 'border-[#D4B4E8] bg-[#D4B4E8]/10 text-slate-900' : 'border-slate-200 text-slate-500'}`}>Body</button>
            </div>
            <div className="grid grid-cols-2 gap-2 max-h-[50vh] overflow-y-auto">
              {(trackerType === 'qualitative' ? PRESET_QUALITATIVE_TRACKERS : 
                trackerType === 'quantitative' ? PRESET_QUANTITATIVE_TRACKERS :
                [{ name: 'Body Measurements', emoji: '🧍', type: 'body_measurements' as any }]
               ).map((preset, i) => (
                <button 
                  key={i} 
                  onClick={() => {
                    if (preset.name === '1-10 Rating') {
                      setConfigPreset(preset);
                    } else {
                      onSave({ ...preset, sortOrder: 99 });
                      onClose();
                    }
                  }} 
                  className="p-3 bg-slate-100 rounded-xl text-left hover:bg-[#D4B4E8]/20 transition-colors"
                >
                  {preset.emoji} {preset.name}
                </button>
              ))}
              {trackerType === 'quantitative' && (
                <button 
                  onClick={() => setIsCustomStats(true)} 
                  className="p-3 bg-slate-100 rounded-xl text-left hover:bg-[#D4B4E8]/20 transition-colors col-span-2 border border-dashed border-[#D4B4E8] font-bold text-center text-slate-700"
                >
                  <Plus size={16} className="inline mr-1 -mt-0.5 text-[#C2A3D6]" /> Create Custom Stat
                </button>
              )}
            </div>
          </>
        )}
        
        {(configPreset || isCustomStats) && renderConfig()}
      </motion.div>
    </div>
  );
};

// ─── Entries List View Component ───────────────────────────────
const EntriesListView: React.FC<{
  tracker: Tracker;
  entries: HealthEntry[];
  onEdit: (entry: HealthEntry) => void;
  onDelete: (entryId: string) => void;
}> = ({ tracker, entries, onEdit, onDelete }) => {
  const sortedEntries = [...entries].sort((a, b) => b.date.localeCompare(a.date));
  return (
    <div className="p-5 space-y-2">
      {sortedEntries.map(entry => {
        const valText = tracker.type === 'qualitative' 
          ? (tracker.values?.find(v => v.id === entry.qualitativeValueId)?.emoji + " " + tracker.values?.find(v => v.id === entry.qualitativeValueId)?.label)
          : `${entry.numericValue} ${tracker.unit}`;
        
        return (
          <div key={entry.id} className="flex items-center justify-between p-3 bg-slate-100 rounded-xl border border-slate-200">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-slate-900 font-bold text-sm">{entry.date}</span>
                <span className="text-slate-800 font-bold text-sm bg-[#D4B4E8] px-2 py-0.5 rounded">{valText}</span>
              </div>
              {entry.note && <div className="text-xs text-slate-500 mt-1">{entry.note}</div>}
            </div>
            <div className="flex items-center gap-2">
              <button onClick={() => onEdit(entry)} className="p-1.5 text-slate-500 hover:text-slate-900"><Edit2 size={14} /></button>
              <button onClick={() => onDelete(entry.id)} className="p-1.5 text-slate-500 hover:text-red-400"><Trash2 size={14} /></button>
            </div>
          </div>
        );
      })}
    </div>
  );
};

// ─── Tracker Detail View Component ───────────────────────────────
const TrackerDetailView: React.FC<{
  tracker: Tracker;
  entries: HealthEntry[];
  year: number;
  onLogEntry: (tracker: Tracker, date?: string, existing?: HealthEntry) => void;
  onQuickSave: (entry: Partial<HealthEntry> & { trackerId: string; date: string }) => void;
  onDelete: () => void;
  onDeleteEntry: (entryId: string) => void;
  onBack: () => void;
}> = ({ tracker, entries, year, onLogEntry, onQuickSave, onDelete, onDeleteEntry, onBack }) => {
  const [viewMode, setViewMode] = useState<'chart' | 'list'>('chart');
  
  const todayStr = formatDate(new Date());
  const todayEntry = entries.find(e => e.date === todayStr);
  const todayValue = tracker.type === 'qualitative'
    ? tracker.values?.find(v => v.id === todayEntry?.qualitativeValueId)
    : todayEntry;

  const color = tracker.color || '#D4B4E8';

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white/80 border border-slate-200/40 rounded-2xl overflow-hidden backdrop-blur-sm"
    >
      <div className="h-1" style={{ background: color }} />
      <div className="p-5">
        {/* Title row */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <button onClick={onBack} className="p-2 text-slate-500 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-xl transition-all mr-2">
              <ChevronLeft size={20} />
            </button>
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center text-xl"
              style={{ backgroundColor: color + '22' }}
            >
              {tracker.emoji}
            </div>
            <div>
              <h3 className="font-bold text-slate-900">{tracker.name}</h3>
              <p className="text-xs text-slate-500">
                {entries.length} entries
                {tracker.type === 'quantitative' && ` · ${tracker.unit}`}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {todayValue && tracker.type === 'qualitative' && (
              <div
                className="px-2.5 py-1 rounded-full text-xs font-bold text-slate-900"
                style={{ backgroundColor: (todayValue as QualitativeValue).color }}
              >
                {(todayValue as QualitativeValue).emoji} {(todayValue as QualitativeValue).label}
              </div>
            )}
            {todayEntry && tracker.type === 'quantitative' && (
              <div className="px-2.5 py-1 rounded-full text-xs font-bold text-slate-900" style={{ backgroundColor: color }}>
                {todayEntry.numericValue} {tracker.unit}
              </div>
            )}

            {/* View Mode Toggle */}
            <div className="flex items-center bg-slate-100 rounded-xl p-0.5 mr-2">
              <button 
                onClick={() => setViewMode('chart')} 
                className={`p-1.5 rounded-lg transition-all ${viewMode === 'chart' ? 'bg-slate-200 text-slate-900' : 'text-slate-500 hover:text-slate-600'}`}
                title="Chart View"
              >
                <BarChart2 size={16} />
              </button>
              <button 
                onClick={() => setViewMode('list')} 
                className={`p-1.5 rounded-lg transition-all ${viewMode === 'list' ? 'bg-slate-200 text-slate-900' : 'text-slate-500 hover:text-slate-600'}`}
                title="List View"
              >
                <List size={16} />
              </button>
            </div>

            {tracker.type !== 'body_measurements' && (
              <motion.button
                whileHover={{ scale: 1.08 }}
                whileTap={{ scale: 0.92 }}
                onClick={() => onLogEntry(tracker, todayStr)}
                className="px-3 py-1.5 text-xs font-bold text-slate-900 rounded-xl flex items-center gap-1.5 transition-all"
                style={{ backgroundColor: color }}
              >
                <Plus size={12} />
                Add Entry
              </motion.button>
            )}

            {/* Delete tracker */}
            <button
              onClick={() => {
                if (window.confirm("Are you sure you want to delete this tracker? All data will be lost.")) {
                  if (window.confirm("Are you ABSOLUTELY sure? This action cannot be undone.")) {
                    onDelete();
                  }
                }
              }}
              className="p-1.5 text-slate-600 hover:text-red-400 hover:bg-red-500/10 rounded-xl transition-all"
              title="Delete tracker"
            >
              <Trash2 size={14} />
            </button>
          </div>
        </div>

        {/* Content Area */}
        {viewMode === 'list' ? (
          <EntriesListView 
            tracker={tracker} 
            entries={entries} 
            onEdit={(entry) => onLogEntry(tracker, entry.date, entry)}
            onDelete={onDeleteEntry}
          />
        ) : (
          tracker.type === 'qualitative' ? (
            <AnnualCalendar
              tracker={tracker}
              entries={entries}
              year={year}
              onDayClick={(date, existing) => onLogEntry(tracker, date, existing)}
            />
          ) : tracker.type === 'body_measurements' ? (
            <BodyMeasurementsView 
              tracker={tracker}
              entries={entries}
              onLogEntry={(measurements, unit) => {
                const note = JSON.stringify({ measurements, unit });
                if (todayEntry) {
                  onQuickSave({ ...todayEntry, note });
                } else {
                  onQuickSave({ trackerId: tracker.id, date: todayStr, note });
                }
              }}
            />
          ) : (
            <StatsChart
              tracker={tracker}
              entries={entries}
            />
          )
        )}
      </div>
    </motion.div>
  );
};

// ─── Tracker Mini Card Component ─────────────────────────────────
const TrackerMiniCard: React.FC<{
  tracker: Tracker;
  entries: HealthEntry[];
  onClick: () => void;
}> = ({ tracker, entries, onClick }) => {
  const color = tracker.color || '#6366f1';
  const todayStr = formatDate(new Date());
  const todayEntry = entries.find(e => e.date === todayStr);

  return (
    <motion.button
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      className="bg-white/80 border border-slate-200/40 rounded-2xl overflow-hidden backdrop-blur-sm text-left flex flex-col h-full hover:border-indigo-500/50 transition-all shadow-xl"
    >
      <div className="h-1.5 w-full" style={{ background: `linear-gradient(to right, ${color}, ${color}88)` }} />
      <div className="p-4 flex-1 flex flex-col">
        <div className="flex items-center justify-between mb-3">
          <div
            className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl shadow-inner"
            style={{ backgroundColor: color + '22' }}
          >
            {tracker.emoji}
          </div>
          <div className="text-xs font-bold text-slate-500 px-2 py-1 bg-slate-100 rounded-lg">
            {tracker.type === 'qualitative' ? '📅 Calendar' : '📈 Stats'}
          </div>
        </div>
        
        <h3 className="font-bold text-slate-900 text-lg leading-tight mb-1">{tracker.name}</h3>
        <p className="text-xs text-slate-500 mb-4">
          {entries.length} entries {tracker.type === 'quantitative' && `· ${tracker.unit}`}
        </p>

        <div className="mt-auto flex items-center justify-between">
          {todayEntry ? (
            <span className="text-xs font-bold text-green-400 flex items-center gap-1">
              <div className="w-1.5 h-1.5 rounded-full bg-green-500" /> Logged Today
            </span>
          ) : (
            <span className="text-xs font-bold text-slate-500 flex items-center gap-1">
              <div className="w-1.5 h-1.5 rounded-full bg-slate-600" /> Pending
            </span>
          )}
        </div>
      </div>
    </motion.button>
  );
};

// ─── Main Page ─────────────────────────────────────────────────
const HealthPage: React.FC = () => {
  const { trackers, entries, isFetching, fetchAll, addTracker, addEntry, updateEntry, deleteEntry, deleteTracker } = useHealthStore();
  const [year, setYear] = useState(new Date().getFullYear());
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [logModal, setLogModal] = useState<{ tracker: Tracker; date?: string; existing?: HealthEntry } | null>(null);
  const [filter, setFilter] = useState<'all' | 'qualitative' | 'quantitative' | 'body_measurements'>('all');
  const [activeTrackerId, setActiveTrackerId] = useState<string | null>(null);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const activeTracker = useMemo(() => trackers.find(t => t.id === activeTrackerId), [trackers, activeTrackerId]);

  const filteredTrackers = useMemo(() => {
    if (filter === 'all') return trackers;
    return trackers.filter(t => t.type === filter);
  }, [trackers, filter]);

  const qualCount = trackers.filter(t => t.type === 'qualitative').length;
  const quantCount = trackers.filter(t => t.type === 'quantitative').length;
  const bodyCount = trackers.filter(t => t.type === 'body_measurements').length;
  const todayStr = formatDate(new Date());
  const todayEntries = entries.filter(e => e.date === todayStr).length;
  const totalEntries = entries.length;

  return (
    <div className="h-full flex flex-col bg-slate-50 text-slate-900 overflow-hidden">
      {/* Header */}
      <header className="border-b border-slate-200 bg-slate-50/90 backdrop-blur-md sticky top-0 z-30">
        <div className="px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div>
              <h1 className="text-xl font-black text-slate-900 flex items-center gap-2">
                <Activity size={22} className="text-[#D4B4E8]" />
                Trackers
              </h1>
              <p className="text-xs text-slate-500 mt-0.5">Track what matters — visualize your patterns</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Summary chips */}
            <div className="hidden md:flex items-center gap-3 mr-2">
              <div className="flex items-center gap-1.5 bg-slate-100 rounded-xl px-3 py-1.5">
                <CalendarIcon size={13} className="text-indigo-400" />
                <span className="text-xs text-slate-600">{todayEntries} today</span>
              </div>
              <div className="flex items-center gap-1.5 bg-slate-100 rounded-xl px-3 py-1.5">
                <TrendingUp size={13} className="text-emerald-400" />
                <span className="text-xs text-slate-600">{totalEntries} total entries</span>
              </div>
            </div>

            {/* Year navigator (for calendar trackers) */}
            {(filter === 'all' || filter === 'qualitative') && (
              <div className="flex items-center gap-1 bg-slate-100 rounded-xl px-2 py-1.5">
                <button onClick={() => setYear(y => y - 1)} className="p-1 text-slate-500 hover:text-slate-900 rounded-lg">
                  <ChevronLeft size={14} />
                </button>
                <span className="text-sm font-bold text-slate-900 px-2">{year}</span>
                <button onClick={() => setYear(y => y + 1)} className="p-1 text-slate-500 hover:text-slate-900 rounded-lg" disabled={year >= new Date().getFullYear()}>
                  <ChevronRight size={14} />
                </button>
              </div>
            )}

            <motion.button
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              onClick={() => setShowCreateModal(true)}
              className="flex items-center gap-2 bg-[#D4B4E8] hover:bg-[#C2A3D6] text-slate-900 px-4 py-2 rounded-xl font-bold text-sm transition-all shadow-sm"
            >
              <Plus size={16} />
              Add Tracker
            </motion.button>
          </div>
        </div>

        {/* Filter tabs */}
        <div className="px-6 pb-3 flex items-center gap-2 overflow-x-auto no-scrollbar">
          {[
            { id: 'all', label: 'All Trackers', count: trackers.length },
            { id: 'qualitative', label: '📅 Calendar', count: qualCount },
            { id: 'quantitative', label: '📈 Stats', count: quantCount },
            { id: 'body_measurements', label: '🧍 Body', count: bodyCount },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setFilter(tab.id as any)}
              className={`px-4 py-1.5 rounded-xl text-xs font-bold transition-all ${
                filter === tab.id
                  ? 'bg-[#D4B4E8] text-slate-900'
                  : 'text-slate-500 hover:text-slate-700 hover:bg-slate-100'
              }`}
            >
              {tab.label}
              <span className={`ml-1.5 ${filter === tab.id ? 'text-slate-700' : 'text-slate-600'}`}>
                ({tab.count})
              </span>
            </button>
          ))}
        </div>
      </header>

      {/* Main content */}
      <main className="flex-1 overflow-y-auto p-6">
        {isFetching ? (
          <div className="flex items-center justify-center h-64">
            <div className="flex flex-col items-center gap-4">
              <div className="w-10 h-10 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
              <p className="text-slate-500 text-sm">Loading your health data...</p>
            </div>
          </div>
        ) : trackers.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-center">
            <div className="text-6xl mb-4">🌱</div>
            <h2 className="text-xl font-bold text-slate-900 mb-2">Your observatory is empty</h2>
            <p className="text-slate-500 text-sm max-w-sm mb-6">
              Add your first tracker to start building a picture of your health, habits, and well-being.
            </p>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setShowCreateModal(true)}
              className="flex items-center gap-2 bg-[#D4B4E8] hover:bg-[#C2A3D6] text-slate-900 px-6 py-3 rounded-xl font-bold transition-all"
            >
              <Plus size={18} /> Add Your First Tracker
            </motion.button>
          </div>
        ) : (
          <div className="w-full mx-auto">
            <AnimatePresence mode="wait">
              {activeTrackerId && activeTracker ? (
                <motion.div
                  key="detail"
                  initial={{ opacity: 0, scale: 0.98, y: 10 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.98, y: -10 }}
                  transition={{ duration: 0.2 }}
                >
                  <TrackerDetailView
                    tracker={activeTracker}
                    entries={entries.filter(e => e.trackerId === activeTracker.id)}
                    year={year}
                    onLogEntry={(t, date, existing) => setLogModal({ tracker: t, date, existing })}
                    onQuickSave={(entry) => entry.id ? updateEntry(entry.id, entry) : addEntry(entry)}
                    onDelete={() => { deleteTracker(activeTracker.id); setActiveTrackerId(null); }}
                    onDeleteEntry={deleteEntry}
                    onBack={() => setActiveTrackerId(null)}
                  />
                </motion.div>
              ) : (
                <motion.div
                  key="grid"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4"
                >
                  {filteredTrackers.map(tracker => (
                    <TrackerMiniCard
                      key={tracker.id}
                      tracker={tracker}
                      entries={entries.filter(e => e.trackerId === tracker.id)}
                      onClick={() => setActiveTrackerId(tracker.id)}
                    />
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}
      </main>

      {/* Modals */}
      <AnimatePresence>
        {showCreateModal && (
          <CreateTrackerModal
            onSave={(data) => addTracker(data)}
            onClose={() => setShowCreateModal(false)}
          />
        )}
        {logModal && (
          <AddEntryModal
            tracker={logModal.tracker}
            existingEntry={logModal.existing}
            defaultDate={logModal.date}
            onSave={(data) => logModal.existing ? updateEntry(logModal.existing.id, data) : addEntry(data)}
            onDelete={logModal.existing ? () => deleteEntry(logModal.existing!.id) : undefined}
            onClose={() => setLogModal(null)}
          />
        )}
      </AnimatePresence>
    </div>
  );
};

export default HealthPage;
