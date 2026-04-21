import React from 'react';
import { 
  Square, 
  Circle, 
  Triangle, 
  Star, 
  Trash2,
  Copy,
  ChevronUp,
  ChevronDown,
  ArrowRight,
  Hexagon
} from 'lucide-react';

interface FloatingToolbarProps {
  element: any;
  onUpdate: (updates: any) => void;
  onDelete: () => void;
  onDuplicate: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  zoom: number;
}

export const NotebookFloatingToolbar: React.FC<FloatingToolbarProps> = ({
  element,
  onUpdate,
  onDelete,
  onDuplicate,
  onMoveUp,
  onMoveDown,
  zoom
}) => {
  if (!element) return null;

  const isShape = element.type === 'shape';

  // Calculate position: above the element
  // We need to account for zoom and canvas offsets, but since this will be 
  // rendered inside the zoomed container or relative to it, we'll see.
  // Actually, easier to render it fixed/absolute in NotebooksPage and pass coordinates.

  const SHAPES = [
    { id: 'rect', icon: <Square size={14} /> },
    { id: 'circle', icon: <Circle size={14} /> },
    { id: 'triangle', icon: <Triangle size={14} /> },
    { id: 'star', icon: <Star size={14} /> },
    { id: 'diamond', icon: <div className="w-3 h-3 rotate-45 border-2 border-current" /> },
    { id: 'hexagon', icon: <Hexagon size={14} /> },
    { id: 'arrow', icon: <ArrowRight size={14} /> }
  ];

  return (
    <div 
      className="absolute z-[6000] flex items-center gap-1 bg-white/90 backdrop-blur-md border border-slate-200 shadow-2xl rounded-2xl p-1.5 animate-in fade-in zoom-in-95 duration-200"
      style={{
        left: `${element.x}px`,
        top: `${element.y - 70}px`, // Place it higher
        transform: `scale(${1/zoom})`,
        transformOrigin: 'bottom left'
      }}
    >
      {isShape && (
        <div className="flex items-center gap-1 border-r border-slate-100 pr-2 mr-2">
          <div className="text-[8px] font-black uppercase text-slate-400 px-2 tracking-widest">Swap</div>
          {SHAPES.map(s => (
            <button
              key={s.id}
              onClick={() => onUpdate({ shapeType: s.id })}
              className={`w-8 h-8 flex items-center justify-center rounded-lg transition-all ${element.shapeType === s.id ? 'bg-indigo-600 text-white shadow-lg' : 'hover:bg-slate-50 text-slate-400'}`}
              title={`Switch to ${s.id}`}
            >
              {s.icon}
            </button>
          ))}
        </div>
      )}

      <div className="flex items-center gap-1">
        <button onClick={onMoveUp} className="p-2 hover:bg-slate-100 text-slate-400 rounded-xl transition-all" title="Bring to Front"><ChevronUp size={14} /></button>
        <button onClick={onMoveDown} className="p-2 hover:bg-slate-100 text-slate-400 rounded-xl transition-all" title="Send to Back"><ChevronDown size={14} /></button>
        <div className="w-px h-4 bg-slate-100 mx-1" />
        <button onClick={onDuplicate} className="p-2 hover:bg-slate-100 text-slate-400 rounded-xl transition-all" title="Duplicate"><Copy size={14} /></button>
        <button onClick={onDelete} className="p-2 hover:bg-red-50 text-red-400 rounded-xl transition-all" title="Delete"><Trash2 size={14} /></button>
      </div>
    </div>
  );
};
