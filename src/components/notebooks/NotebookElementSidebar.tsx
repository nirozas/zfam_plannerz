import React from 'react';
import { 
  RotateCw, 
  FlipHorizontal, 
  MinusCircle, 
  PlusCircle, 
  Copy, 
  ChevronUp, 
  ChevronDown, 
  RefreshCcw,
  Trash2,
  X,
  Square,
  Circle,
  Triangle,
  Star
} from 'lucide-react';

interface ImageSidebarProps {
  selectedElement: any;
  onUpdateElement: (id: string, updates: any) => void;
  onDuplicateElement: (id: string) => void;
  activePage: any;
  onDeleteElement: (id: string) => void;
  onClose?: () => void;
}

export const NotebookElementSidebar: React.FC<ImageSidebarProps> = ({
  selectedElement,
  onUpdateElement,
  onDuplicateElement,
  activePage,
  onDeleteElement,
  onClose
}) => {
  if (!selectedElement || (selectedElement.type !== 'image' && selectedElement.type !== 'shape' && selectedElement.type !== 'path')) return null;

  const isShape = selectedElement.type === 'shape';
  const isImage = selectedElement.type === 'image';
  const isPath = selectedElement.type === 'path';

  return (
    <div className="fixed right-8 top-1/2 -translate-y-1/2 w-[220px] bg-white/95 backdrop-blur-md border border-slate-200 shadow-[0_20px_50px_rgba(0,0,0,0.1)] z-[9999] rounded-[2rem] flex flex-col p-5 animate-in fade-in slide-in-from-right-12 duration-500 ease-out">
      {/* Mini Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 bg-indigo-600 rounded-full animate-pulse" />
          <h3 className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-900">
            {isImage ? 'Image Editor' : isShape ? 'Shape Editor' : 'Drawing Editor'}
          </h3>
        </div>
        <button 
          onClick={onClose}
          className="p-1 hover:bg-slate-100 rounded-full transition-colors text-slate-400 hover:text-slate-900"
        >
          <X size={14} />
        </button>
      </div>

      <div className="flex flex-col gap-8 overflow-y-auto no-scrollbar max-h-[70vh]">
        {/* Arrangement */}
        <section className="space-y-3">
          <label className="text-[8px] font-black uppercase text-slate-400 tracking-widest">Stacking</label>
          <div className="grid grid-cols-3 gap-2">
            <ToolIconButton 
              icon={<ChevronUp size={14} />} 
              onClick={() => {
                const maxZ = Math.max(...activePage.elements.map((e: any) => e.zIndex || 0));
                onUpdateElement(selectedElement.id, { zIndex: maxZ + 1 });
              }}
            />
            <ToolIconButton 
              icon={<ChevronDown size={14} />} 
              onClick={() => {
                const minZ = Math.min(...activePage.elements.map((e: any) => e.zIndex || 0));
                onUpdateElement(selectedElement.id, { zIndex: minZ - 1 });
              }}
            />
            <ToolIconButton 
              icon={<Copy size={14} />} 
              onClick={() => onDuplicateElement(selectedElement.id)}
            />
          </div>
        </section>

        <section className="space-y-4">
          <label className="text-[8px] font-black uppercase text-slate-400 tracking-widest">Transform</label>
          
          <div className="space-y-4">
            <MinimalSlider 
              label="Tilt / Rotation" 
              value={Math.round(selectedElement.rotation || 0)} 
              min={0} 
              max={360} 
              onChange={(v: number) => onUpdateElement(selectedElement.id, { rotation: v })} 
            />
            
            <div className="flex items-center gap-2">
              <button 
                onClick={() => onUpdateElement(selectedElement.id, { rotation: (selectedElement.rotation || 0) + 90 })}
                className="flex-1 flex items-center justify-center gap-2 py-2 bg-slate-50 hover:bg-slate-100 rounded-xl transition-all"
              >
                <RotateCw size={12} className="text-slate-600" />
                <span className="text-[8px] font-black uppercase">+90°</span>
              </button>
              <button 
                onClick={() => onUpdateElement(selectedElement.id, { flipX: !selectedElement.flipX })}
                className="flex-1 flex items-center justify-center gap-2 py-2 bg-slate-50 hover:bg-slate-100 rounded-xl transition-all"
              >
                <FlipHorizontal size={12} className="text-slate-600" />
                <span className="text-[8px] font-black uppercase">Flip</span>
              </button>
            </div>
          </div>

          <div className="bg-slate-50 p-3 rounded-2xl flex items-center justify-between border border-slate-100">
            <span className="text-[8px] font-black uppercase text-slate-400">Scale</span>
            <div className="flex items-center gap-3">
              <button onClick={() => onUpdateElement(selectedElement.id, { width: (selectedElement.width || 100) * 0.9, height: (selectedElement.height || 100) * 0.9 })} className="text-slate-400 hover:text-indigo-600"><MinusCircle size={16} /></button>
              <span className="text-[10px] font-black w-8 text-center">{Math.round(((selectedElement.width || 100) / 100) * 100)}%</span>
              <button onClick={() => onUpdateElement(selectedElement.id, { width: (selectedElement.width || 100) * 1.1, height: (selectedElement.height || 100) * 1.1 })} className="text-slate-400 hover:text-indigo-600"><PlusCircle size={16} /></button>
            </div>
          </div>
        </section>

        {isShape && (
          <section className="space-y-6">
            <label className="text-[8px] font-black uppercase text-slate-400 tracking-widest">Appearance</label>
            
            <div className="space-y-4">
              <div>
                <span className="text-[8px] font-black uppercase text-slate-400 block mb-2">Fill Color</span>
                <div className="flex flex-wrap gap-2">
                  {['#4f46e5', '#ef4444', '#10b981', '#f59e0b', '#06b6d4', '#ec4899', '#1e293b', '#ffffff'].map(c => (
                    <button 
                      key={c}
                      onClick={() => onUpdateElement(selectedElement.id, { fill: c })}
                      className={`w-6 h-6 rounded-lg border-2 transition-all ${selectedElement.fill === c ? 'border-indigo-600 scale-110 shadow-lg' : 'border-slate-100'}`}
                      style={{ backgroundColor: c }}
                    />
                  ))}
                  <input 
                    type="color" 
                    value={selectedElement.fill || '#4f46e5'} 
                    onChange={(e) => onUpdateElement(selectedElement.id, { fill: e.target.value })}
                    className="w-6 h-6 rounded-lg overflow-hidden border-2 border-slate-100 cursor-pointer"
                  />
                </div>
              </div>

              <div>
                <span className="text-[8px] font-black uppercase text-slate-400 block mb-2">Stroke Color</span>
                <div className="flex flex-wrap gap-2">
                  {['#4f46e5', '#ef4444', '#10b981', '#f59e0b', '#06b6d4', '#ec4899', '#1e293b', '#000000'].map(c => (
                    <button 
                      key={c}
                      onClick={() => onUpdateElement(selectedElement.id, { stroke: c })}
                      className={`w-6 h-6 rounded-lg border-2 transition-all ${selectedElement.stroke === c ? 'border-indigo-600 scale-110 shadow-lg' : 'border-slate-100'}`}
                      style={{ backgroundColor: c }}
                    />
                  ))}
                </div>
              </div>

              <MinimalSlider 
                label="Stroke Width" 
                value={selectedElement.strokeWidth || 2} 
                min={0} 
                max={20} 
                onChange={(v: number) => onUpdateElement(selectedElement.id, { strokeWidth: v })} 
              />

              <MinimalSlider 
                label="Opacity" 
                value={Math.round((selectedElement.opacity || 1) * 100)} 
                min={10} 
                max={100} 
                onChange={(v: number) => onUpdateElement(selectedElement.id, { opacity: v / 100 })} 
              />
            </div>

            <div>
              <span className="text-[8px] font-black uppercase text-slate-400 block mb-2">Change Shape</span>
              <div className="grid grid-cols-4 gap-2">
                {[
                  { id: 'rect', icon: <Square size={10} /> },
                  { id: 'circle', icon: <Circle size={10} /> },
                  { id: 'triangle', icon: <Triangle size={10} /> },
                  { id: 'star', icon: <Star size={10} /> },
                  { id: 'diamond', icon: <RotateCw size={10} /> },
                  { id: 'line', icon: <RotateCw size={10} /> },
                  { id: 'arrow', icon: <RotateCw size={10} /> }
                ].map(s => (
                  <button 
                    key={s.id}
                    onClick={() => onUpdateElement(selectedElement.id, { shapeType: s.id })}
                    className={`aspect-square flex items-center justify-center rounded-lg border-2 transition-all ${selectedElement.shapeType === s.id ? 'border-indigo-600 bg-indigo-50 text-indigo-600' : 'border-slate-100 text-slate-400'}`}
                  >
                    <span className="text-[8px] font-black uppercase">{s.id.substring(0, 3)}</span>
                  </button>
                ))}
              </div>
            </div>
          </section>
        )}

        {isPath && (
          <section className="space-y-6">
            <label className="text-[8px] font-black uppercase text-slate-400 tracking-widest">Stroke Properties</label>
            
            <div className="space-y-4">
              {/* Pen Type Selection */}
              <div>
                <span className="text-[8px] font-black uppercase text-slate-400 block mb-2">Pen Type</span>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { id: 'round', label: 'Round Point' },
                    { id: 'pincel', label: 'Pincel' },
                    { id: 'fountain', label: 'Fountain Pen' },
                    { id: 'brush', label: 'Art Brush' }
                  ].map(t => (
                    <button 
                      key={t.id}
                      onClick={() => onUpdateElement(selectedElement.id, { penType: t.id })}
                      className={`py-2 px-1 rounded-xl border-2 text-[8px] font-black uppercase transition-all ${selectedElement.penType === t.id || (!selectedElement.penType && t.id === 'round') ? 'border-indigo-600 bg-indigo-50 text-indigo-600' : 'border-slate-50 text-slate-400 hover:bg-slate-100'}`}
                    >
                      {t.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <span className="text-[8px] font-black uppercase text-slate-400 block mb-2">Stroke Color</span>
                <div className="flex flex-wrap gap-2">
                  {['#1e293b', '#4f46e5', '#ef4444', '#10b981', '#f59e0b', '#06b6d4', '#ec4899', '#ffffff'].map(c => (
                    <button 
                      key={c}
                      onClick={() => onUpdateElement(selectedElement.id, { stroke: c })}
                      className={`w-6 h-6 rounded-lg border-2 transition-all ${selectedElement.stroke === c ? 'border-indigo-600 scale-110 shadow-lg' : 'border-slate-100'}`}
                      style={{ backgroundColor: c }}
                    />
                  ))}
                  <input 
                    type="color" 
                    value={selectedElement.stroke || '#1e293b'} 
                    onChange={(e) => onUpdateElement(selectedElement.id, { stroke: e.target.value })}
                    className="w-6 h-6 rounded-lg overflow-hidden border-2 border-slate-100 cursor-pointer"
                  />
                </div>
              </div>

              <MinimalSlider 
                label="Stroke Width" 
                value={selectedElement.strokeWidth || 5} 
                min={1} 
                max={50} 
                onChange={(v: number) => onUpdateElement(selectedElement.id, { strokeWidth: v })} 
              />

              <MinimalSlider 
                label="Opacity" 
                value={Math.round((selectedElement.opacity || 1) * 100)} 
                min={10} 
                max={100} 
                onChange={(v: number) => onUpdateElement(selectedElement.id, { opacity: v / 100 })} 
              />
            </div>
          </section>
        )}

        {/* Visual FX (Images Only) */}
        {isImage && (
          <section className="space-y-5">
          <label className="text-[8px] font-black uppercase text-slate-400 tracking-widest">Visual FX</label>
          
          <div className="flex items-center justify-between bg-slate-50 p-2 rounded-xl">
            <span className="text-[8px] font-black uppercase text-slate-900">Erase White</span>
            <button 
              onClick={() => onUpdateElement(selectedElement.id, { removeBg: !selectedElement.removeBg })}
              className={`w-8 h-4 rounded-full transition-all relative ${selectedElement.removeBg ? 'bg-indigo-600' : 'bg-slate-300'}`}
            >
              <div className={`absolute top-0.5 w-3 h-3 bg-white rounded-full transition-all ${selectedElement.removeBg ? 'left-4.5' : 'left-0.5'}`} />
            </button>
          </div>

          {selectedElement.removeBg && (
            <div className="px-1 animate-in fade-in slide-in-from-top-2 duration-300">
              <MinimalSlider 
                label="Removal Precision" 
                value={selectedElement.bgThreshold || 240} 
                min={100} 
                max={255} 
                onChange={(v: number) => onUpdateElement(selectedElement.id, { bgThreshold: v })} 
              />
              <p className="text-[7px] text-slate-400 mt-1 uppercase font-bold">Slide left to remove more light colors</p>
            </div>
          )}

          <div className="space-y-4">
            <MinimalSlider 
              label="Hue" value={selectedElement.hue || 0} max={360} 
              onChange={(v: number) => onUpdateElement(selectedElement.id, { hue: v })} 
            />
            <MinimalSlider 
              label="Light" value={Math.round((selectedElement.brightness || 0) * 100)} min={-50} max={50} 
              onChange={(v: number) => onUpdateElement(selectedElement.id, { brightness: v / 100 })} 
            />
            <MinimalSlider 
              label="Opacity" value={Math.round((selectedElement.opacity || 1) * 100)} min={10} max={100} 
              onChange={(v: number) => onUpdateElement(selectedElement.id, { opacity: v / 100 })} 
            />
          </div>

          <select 
            className="w-full bg-slate-50 border border-slate-100 rounded-xl p-3 text-[9px] font-black outline-none uppercase cursor-pointer hover:bg-slate-100 transition-colors"
            value={selectedElement.filter || 'none'}
            onChange={(e) => onUpdateElement(selectedElement.id, { filter: e.target.value })}
          >
            <option value="none">Original</option>
            <option value="grayscale">Noir</option>
            <option value="sepia">Vintage</option>
            <option value="invert">Invert</option>
          </select>
        </section>
        )}
      </div>

      {/* Footer */}
      <div className="mt-8 pt-6 border-t border-slate-100 flex flex-col gap-2">
        <button 
          onClick={() => onUpdateElement(selectedElement.id, { 
            hue: 0, brightness: 0, opacity: 1, filter: 'none', removeBg: false,
            rotation: 0, flipX: false,
            fill: '#4f46e5', stroke: '#4f46e5', strokeWidth: 2
          })}
          className="w-full py-3 bg-slate-900 text-white rounded-2xl text-[8px] font-black uppercase tracking-widest hover:bg-indigo-600 transition-all active:scale-95"
        >
          <RefreshCcw size={10} className="inline mr-2" /> Reset
        </button>
        <button 
          onClick={() => onDeleteElement(selectedElement.id)}
          className="w-full py-3 bg-red-50 text-red-500 rounded-2xl text-[8px] font-black uppercase tracking-widest hover:bg-red-100 transition-all"
        >
          <Trash2 size={10} className="inline mr-2" /> Delete
        </button>
      </div>
    </div>
  );
};

const ToolIconButton = ({ icon, onClick }: any) => (
  <button 
    onClick={onClick}
    className="aspect-square flex items-center justify-center rounded-xl bg-slate-50 hover:bg-indigo-600 hover:text-white transition-all border border-slate-100 active:scale-90"
  >
    {icon}
  </button>
);

const MinimalSlider = ({ label, value, min = 0, max, onChange }: any) => (
  <div className="space-y-1.5">
    <div className="flex justify-between items-center px-0.5">
      <span className="text-[8px] font-black text-slate-400 uppercase">{label}</span>
      <span className="text-[8px] font-bold text-slate-900">{value}</span>
    </div>
    <input 
      type="range" min={min} max={max} 
      value={value}
      onChange={(e) => onChange(parseInt(e.target.value))}
      className="w-full h-1 bg-slate-100 rounded-full appearance-none cursor-pointer accent-indigo-600"
    />
  </div>
);
