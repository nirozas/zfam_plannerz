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
  Hexagon,
  Bold,
  Palette,
  Layers,
  ArrowUp,
  ArrowDown
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
  const isText = element.type === 'text';
  const isImage = element.type === 'image';

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
      className="absolute z-[6000] flex items-center gap-1 bg-white/80 backdrop-blur-xl border border-white/50 shadow-[0_20px_50px_rgba(0,0,0,0.15)] rounded-[20px] p-2 animate-in fade-in zoom-in-95 duration-200"
      style={{
        left: `${element.x}px`,
        top: `${element.y - 70}px`,
        transform: `scale(${1/zoom})`,
        transformOrigin: 'bottom left'
      }}
    >
      {/* Contextual Section */}
      <div className="flex items-center gap-1 border-r border-slate-200/50 pr-2 mr-1">
        {isShape && SHAPES.map(s => (
          <button
            key={s.id}
            onClick={() => onUpdate({ shapeType: s.id })}
            className={`w-9 h-9 flex items-center justify-center rounded-xl transition-all ${element.shapeType === s.id ? 'bg-slate-900 text-white shadow-lg scale-110' : 'hover:bg-slate-100 text-slate-400'}`}
          >
            {s.icon}
          </button>
        ))}

        {isText && (
          <>
            <button 
              onClick={() => {
                const s = element.fontStyle || '';
                onUpdate({ fontStyle: s.includes('bold') ? s.replace('bold', '').trim() : (s + ' bold').trim() });
              }}
              className={`w-9 h-9 flex items-center justify-center rounded-xl transition-all ${element.fontStyle?.includes('bold') ? 'bg-slate-900 text-white' : 'hover:bg-slate-100 text-slate-500'}`}
            >
              <Bold size={16} />
            </button>
            <div className="relative">
              <div className="w-9 h-9 flex items-center justify-center rounded-xl hover:bg-slate-100 transition-all">
                 <input 
                  type="color" 
                  value={element.fill || '#000000'} 
                  onChange={(e) => onUpdate({ fill: e.target.value })}
                  className="w-5 h-5 p-0 border-none bg-transparent cursor-pointer rounded-full overflow-hidden"
                />
              </div>
            </div>
          </>
        )}

        {isImage && (
          <button 
            onClick={() => onUpdate({ filter: element.filter === 'grayscale' ? 'none' : 'grayscale' })}
            className={`w-9 h-9 flex items-center justify-center rounded-xl transition-all ${element.filter === 'grayscale' ? 'bg-slate-900 text-white' : 'hover:bg-slate-100 text-slate-500'}`}
          >
            <Palette size={16} />
          </button>
        )}
      </div>

      {/* Layering & Actions */}
      <div className="flex items-center gap-1">
        <button onClick={onMoveUp} className="w-9 h-9 flex items-center justify-center hover:bg-slate-100 text-slate-500 rounded-xl transition-all" title="Bring Forward"><ArrowUp size={16} /></button>
        <button onClick={onMoveDown} className="w-9 h-9 flex items-center justify-center hover:bg-slate-100 text-slate-500 rounded-xl transition-all" title="Send Backward"><ArrowDown size={16} /></button>
        <div className="w-px h-6 bg-slate-200/50 mx-1" />
        <button onClick={onDuplicate} className="w-9 h-9 flex items-center justify-center hover:bg-slate-100 text-slate-500 rounded-xl transition-all" title="Duplicate"><Copy size={16} /></button>
        <button onClick={onDelete} className="w-9 h-9 flex items-center justify-center hover:bg-red-50 text-red-500 rounded-xl transition-all" title="Delete"><Trash2 size={16} /></button>
      </div>
    </div>
  );
};
