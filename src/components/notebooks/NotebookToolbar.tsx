import React from 'react';
import { 
  Type, 
  Pencil, 
  Highlighter, 
  Eraser, 
  ImageIcon, 
  Minus,
  Plus,
  MousePointer2,
  Columns,
  Rows,
  FlipHorizontal,
  Sun,
  Calendar,
  Maximize2,
  Bold,
  Italic,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Languages,
  RotateCw,
  PlusCircle,
  MinusCircle,
  Zap,
  Copy,
  Layers,
  ChevronUp,
  ChevronDown,
  Trash2,
  RefreshCcw
} from 'lucide-react';

interface ToolbarProps {
  activeTool: string;
  setActiveTool: (tool: any) => void;
  brushSettings: any;
  setBrushSettings: (s: any) => void;
  textSettings: any;
  setTextSettings: (s: any) => void;
  pageSettings: any;
  setPageSettings: (s: any) => void;
  handleAddImage: () => void;
  selectedElement?: any;
  onUpdateElement?: (id: string, updates: any) => void;
  activePage?: any;
  onUpdatePage?: (updates: any) => void;
  onDuplicateElement?: (id: string) => void;
  onAddImageFromUrl?: () => void;
  onOpenExport?: () => void;
}

const FONTS = [
  'Inter', 'Roboto', 'Open Sans', 'Lato', 'Montserrat', 
  'Poppins', 'Raleway', 'Playfair Display', 'Merriweather', 
  'Ubuntu', 'Oswald', 'Nunito', 'Pacifico', 'Dancing Script', 
  'Shadows Into Light', 'Caveat', 'Indie Flower',
  // Arabic Fonts
  'Cairo', 'Tajawal', 'Amiri', 'Changa', 'Almarai'
];

export const NotebookToolbar: React.FC<ToolbarProps> = ({
  activeTool,
  setActiveTool,
  brushSettings,
  setBrushSettings,
  textSettings,
  setTextSettings,
  pageSettings,
  setPageSettings,
  handleAddImage,
  selectedElement,
  onUpdateElement,
  activePage,
  onUpdatePage,
  onAddImageFromUrl
}) => {
  return (
    <div className="notebook-toolbar-stable">
      {/* Left 30%: Page Metadata */}
      <div className="toolbar-metadata">
        <input 
          type="text" 
          value={activePage?.title || ''} 
          onChange={(e) => onUpdatePage?.({ title: e.target.value })}
          placeholder="Untitled Page"
          className="metadata-title-input"
        />
        <div className="metadata-info">
          <span className="flex items-center gap-1 opacity-60">
            <Calendar size={10} /> {activePage ? new Date(activePage.createdAt).toLocaleDateString() : ''}
          </span>
          <div className="flex items-center gap-2">
            <span className="opacity-40">Due:</span>
            <input 
              type="date" 
              value={activePage?.dueDate || ''}
              onChange={(e) => onUpdatePage?.({ dueDate: e.target.value })}
              className="metadata-date-input"
            />
          </div>
        </div>
      </div>

      <div className="toolbar-divider" />

      {/* Right 70%: Tools */}
      <div className="toolbar-tools">
        {/* Basic Tools */}
        <div className="toolbar-group">
          <ToolButton 
            icon={<MousePointer2 size={16} />} 
            active={activeTool === 'select'} 
            onClick={() => setActiveTool('select')} 
            title="Select"
          />
          <ToolButton 
            icon={<Type size={16} />} 
            active={activeTool === 'text'} 
            onClick={() => setActiveTool('text')} 
            title="Text"
          />
          <ToolButton 
            icon={<Pencil size={16} />} 
            active={activeTool === 'pen'} 
            onClick={() => setActiveTool('pen')} 
            title="Pen"
          />
          <ToolButton 
            icon={<Highlighter size={16} />} 
            active={activeTool === 'highlighter'} 
            onClick={() => setActiveTool('highlighter')} 
            title="Highlighter"
          />
          <ToolButton 
            icon={<Eraser size={16} />} 
            active={activeTool === 'eraser'} 
            onClick={() => setActiveTool('eraser')} 
            title="Eraser"
          />
          <div className="relative group">
            <ToolButton 
              icon={<ImageIcon size={16} />} 
              active={activeTool === 'image'} 
              onClick={() => setActiveTool(activeTool === 'image_menu' ? 'select' : 'image_menu')} 
              title="Add Image"
            />
            {activeTool === 'image_menu' && (
              <div className="absolute top-full left-0 mt-2 w-48 bg-white rounded-xl shadow-xl border border-slate-100 p-2 z-[5001] animate-in fade-in slide-in-from-top-2 duration-200">
                <button 
                  className="w-full flex items-center gap-3 px-3 py-2 hover:bg-slate-50 rounded-lg text-left text-xs font-bold text-slate-600 transition-colors"
                  onClick={() => {
                    handleAddImage();
                    setActiveTool('select');
                  }}
                >
                  <PlusCircle size={14} className="text-indigo-500" />
                  Upload from Device
                </button>
                <button 
                  className="w-full flex items-center gap-3 px-3 py-2 hover:bg-slate-50 rounded-lg text-left text-xs font-bold text-slate-600 transition-colors mt-1"
                  onClick={() => {
                    onAddImageFromUrl?.();
                    setActiveTool('select');
                  }}
                >
                  <Languages size={14} className="text-indigo-500" />
                  Add from URL / Web
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Properties (Contextual) */}
        {(activeTool === 'pen' || activeTool === 'highlighter' || activeTool === 'text' || (selectedElement && (selectedElement.type === 'image' || selectedElement.type === 'text'))) && (
          <div className="toolbar-group">
            <div className="flex items-center gap-1.5 px-2">
              {activeTool === 'pen' && (
                <div className="flex items-center gap-1">
                  {['#000000', '#2563eb', '#dc2626', '#22c55e'].map(color => (
                    <button 
                      key={color} 
                      className={`w-4 h-4 rounded-full border border-slate-200 transition-all hover:scale-125 ${brushSettings.color === color ? 'ring-2 ring-indigo-500 ring-offset-1' : ''}`}
                      style={{ backgroundColor: color }}
                      onClick={() => setBrushSettings({ ...brushSettings, color })}
                    />
                  ))}
                </div>
              )}

              {activeTool === 'highlighter' && (
                <div className="flex items-center gap-1">
                  {['#fef08a', '#fbcfe8', '#bfdbfe', '#bbf7d0', '#e9d5ff', '#fed7aa', '#ccfbf1'].map(color => (
                    <button 
                      key={color} 
                      className={`w-4 h-4 rounded-full border border-slate-200 transition-all hover:scale-125 ${brushSettings.color === color ? 'ring-2 ring-indigo-500 ring-offset-1' : ''}`}
                      style={{ backgroundColor: color }}
                      onClick={() => setBrushSettings({ ...brushSettings, color })}
                    />
                  ))}
                </div>
              )}

              <input 
                type="color" 
                value={(activeTool === 'text' || selectedElement?.type === 'text') ? (selectedElement?.fill || textSettings.fill) : brushSettings.color}
                onChange={(e) => {
                  const color = e.target.value;
                  if (activeTool === 'text' || selectedElement?.type === 'text') {
                    setTextSettings({ ...textSettings, fill: color });
                    if (selectedElement?.id.includes('text')) onUpdateElement?.(selectedElement.id, { fill: color });
                  } else {
                    setBrushSettings({ ...brushSettings, color });
                  }
                }}
                className="w-6 h-6 p-0 border-none bg-transparent cursor-pointer rounded-full"
              />
            </div>
            
            <div className="flex items-center gap-1 ml-2">
              <button 
                className="p-1 hover:bg-slate-100 rounded"
                onClick={() => {
                  const val = (activeTool === 'text' || selectedElement?.type === 'text') ? (selectedElement?.fontSize || textSettings.fontSize) : brushSettings.width;
                  const newVal = Math.max(1, val - 1);
                  if (activeTool === 'text' || selectedElement?.type === 'text') {
                    setTextSettings({ ...textSettings, fontSize: newVal });
                    if (selectedElement?.id.includes('text')) onUpdateElement?.(selectedElement.id, { fontSize: newVal });
                  } else {
                    setBrushSettings({ ...brushSettings, width: newVal });
                  }
                }}
              >
                <Minus size={14} />
              </button>
              <span className="text-[10px] font-black w-6 text-center">
                {(activeTool === 'text' || selectedElement?.type === 'text') ? (selectedElement?.fontSize || textSettings.fontSize) : brushSettings.width}
              </span>
              <button 
                className="p-1 hover:bg-slate-100 rounded"
                onClick={() => {
                  const val = (activeTool === 'text' || selectedElement?.type === 'text') ? (selectedElement?.fontSize || textSettings.fontSize) : brushSettings.width;
                  const newVal = Math.max(1, val + 1);
                  if (activeTool === 'text' || selectedElement?.type === 'text') {
                    setTextSettings({ ...textSettings, fontSize: newVal });
                    if (selectedElement?.id.includes('text')) onUpdateElement?.(selectedElement.id, { fontSize: newVal });
                  } else {
                    setBrushSettings({ ...brushSettings, width: newVal });
                  }
                }}
              >
                <Plus size={14} />
              </button>
            </div>

            {activeTool === 'highlighter' && (
              <div className="flex items-center gap-1 ml-4 border-l border-slate-200 pl-4">
                <span className="text-[10px] font-black uppercase text-slate-400">Opacity</span>
                <button 
                  className="p-1 hover:bg-slate-100 rounded"
                  onClick={() => setBrushSettings({ ...brushSettings, opacity: Math.max(0.1, brushSettings.opacity - 0.1) })}
                >
                  <Minus size={14} />
                </button>
                <span className="text-[10px] font-black w-8 text-center">
                  {Math.round(brushSettings.opacity * 100)}%
                </span>
                <button 
                  className="p-1 hover:bg-slate-100 rounded"
                  onClick={() => setBrushSettings({ ...brushSettings, opacity: Math.min(1, brushSettings.opacity + 0.1) })}
                >
                  <Plus size={14} />
                </button>
              </div>
            )}

            {(activeTool === 'text' || selectedElement?.type === 'text') && (
              <select 
                className="bg-transparent border-none text-[10px] font-bold outline-none px-2 uppercase"
                value={selectedElement?.fontFamily || textSettings.fontFamily}
                onChange={(e) => {
                  const font = e.target.value;
                  setTextSettings({ ...textSettings, fontFamily: font });
                  if (selectedElement?.id.includes('text')) onUpdateElement?.(selectedElement.id, { fontFamily: font });
                }}
              >
                {FONTS.map(font => <option key={font} value={font}>{font}</option>)}
              </select>
            )}

            {(activeTool === 'text' || selectedElement?.type === 'text') && (
              <div className="flex items-center gap-1 border-l border-slate-200 pl-2">
                <ToolButton 
                  icon={<Bold size={14} />} 
                  active={selectedElement?.fontStyle?.includes('bold') || (!selectedElement && textSettings.fontStyle?.includes('bold'))} 
                  onClick={() => {
                    const current = selectedElement?.fontStyle || textSettings.fontStyle || '';
                    const next = current.includes('bold') ? current.replace('bold', '').trim() : (current + ' bold').trim();
                    setTextSettings({ ...textSettings, fontStyle: next });
                    if (selectedElement?.id.includes('text')) onUpdateElement?.(selectedElement.id, { fontStyle: next });
                  }} 
                  title="Bold"
                />
                <ToolButton 
                  icon={<Italic size={14} />} 
                  active={selectedElement?.fontStyle?.includes('italic') || (!selectedElement && textSettings.fontStyle?.includes('italic'))} 
                  onClick={() => {
                    const current = selectedElement?.fontStyle || textSettings.fontStyle || '';
                    const next = current.includes('italic') ? current.replace('italic', '').trim() : (current + ' italic').trim();
                    setTextSettings({ ...textSettings, fontStyle: next });
                    if (selectedElement?.id.includes('text')) onUpdateElement?.(selectedElement.id, { fontStyle: next });
                  }} 
                  title="Italic"
                />
              </div>
            )}

            {(activeTool === 'text' || selectedElement?.type === 'text') && (
              <div className="flex items-center gap-1 border-l border-slate-200 pl-2">
                <ToolButton 
                  icon={<AlignLeft size={14} />} 
                  active={(selectedElement?.align || textSettings.align || 'left') === 'left'} 
                  onClick={() => {
                    setTextSettings({ ...textSettings, align: 'left' });
                    if (selectedElement?.id.includes('text')) onUpdateElement?.(selectedElement.id, { align: 'left' });
                  }} 
                />
                <ToolButton 
                  icon={<AlignCenter size={14} />} 
                  active={selectedElement?.align === 'center'} 
                  onClick={() => {
                    setTextSettings({ ...textSettings, align: 'center' });
                    if (selectedElement?.id.includes('text')) onUpdateElement?.(selectedElement.id, { align: 'center' });
                  }} 
                />
                <ToolButton 
                  icon={<AlignRight size={14} />} 
                  active={selectedElement?.align === 'right'} 
                  onClick={() => {
                    setTextSettings({ ...textSettings, align: 'right' });
                    if (selectedElement?.id.includes('text')) onUpdateElement?.(selectedElement.id, { align: 'right' });
                  }} 
                />
              </div>
            )}

            {(activeTool === 'text' || selectedElement?.type === 'text') && (
              <div className="flex items-center gap-1 border-l border-slate-200 pl-2">
                <ToolButton 
                  icon={<Languages size={14} />} 
                  active={(selectedElement?.dir || textSettings.dir || 'ltr') === 'rtl'} 
                  onClick={() => {
                    const next = (selectedElement?.dir || textSettings.dir || 'ltr') === 'ltr' ? 'rtl' : 'ltr';
                    setTextSettings({ ...textSettings, dir: next, align: next === 'rtl' ? 'right' : 'left' });
                    if (selectedElement?.id.includes('text')) onUpdateElement?.(selectedElement.id, { dir: next, align: next === 'rtl' ? 'right' : 'left' });
                  }} 
                  title="Toggle RTL/LTR"
                />
              </div>
            )}

            {(activeTool === 'text' || selectedElement?.type === 'text') && selectedElement && (
              <ToolButton 
                icon={<Maximize2 size={16} />} 
                onClick={() => onUpdateElement?.(selectedElement.id, { _fitToContent: true })} 
                title="Fit to Content"
              />
            )}

          </div>
        )}

        {/* Text Box Styling */}
        {(activeTool === 'text' || selectedElement?.type === 'text') && (
          <div className="toolbar-group">
            <div className="flex flex-col items-center gap-0.5">
              <span className="text-[7px] font-black uppercase text-slate-400">BG</span>
              <div className="flex items-center gap-1">
                <input 
                  type="color" 
                  value={selectedElement?.backgroundColor && selectedElement.backgroundColor !== 'transparent' ? selectedElement.backgroundColor : '#ffffff'}
                  onChange={(e) => {
                    const color = e.target.value;
                    setTextSettings({ ...textSettings, backgroundColor: color });
                    if (selectedElement?.id.includes('text')) onUpdateElement?.(selectedElement.id, { backgroundColor: color });
                  }}
                  className="w-5 h-5 p-0 border-none bg-transparent cursor-pointer"
                />
                <button 
                  className={`w-5 h-5 rounded border border-slate-200 flex items-center justify-center ${selectedElement?.backgroundColor === 'transparent' ? 'bg-indigo-600 text-white' : 'bg-white text-slate-400'}`}
                  onClick={() => {
                    setTextSettings({ ...textSettings, backgroundColor: 'transparent' });
                    if (selectedElement?.id.includes('text')) onUpdateElement?.(selectedElement.id, { backgroundColor: 'transparent' });
                  }}
                  title="Transparent"
                >
                  <Sun size={10} className={selectedElement?.backgroundColor === 'transparent' ? 'text-white' : 'text-slate-300'} />
                </button>
              </div>
            </div>
            <div className="flex flex-col items-center gap-0.5">
              <span className="text-[7px] font-black uppercase text-slate-400">Border</span>
              <input 
                type="color" 
                value={selectedElement?.outlineColor || textSettings.outlineColor || '#cbd5e1'}
                onChange={(e) => {
                  const color = e.target.value;
                  setTextSettings({ ...textSettings, outlineColor: color });
                  if (selectedElement?.id.includes('text')) onUpdateElement?.(selectedElement.id, { outlineColor: color });
                }}
                className="w-5 h-5 p-0 border-none bg-transparent cursor-pointer"
              />
            </div>
            <select 
              className="bg-transparent border-none text-[9px] font-black outline-none uppercase"
              value={selectedElement?.outlineStyle || textSettings.outlineStyle || 'none'}
              onChange={(e) => {
                const style = e.target.value;
                setTextSettings({ ...textSettings, outlineStyle: style as any });
                if (selectedElement?.id.includes('text')) onUpdateElement?.(selectedElement.id, { outlineStyle: style });
              }}
            >
              <option value="none">None</option>
              <option value="solid">Line</option>
              <option value="dashed">Dashed</option>
              <option value="double">Double</option>
            </select>
          </div>
        )}

        {/* Page Layout */}
        <div className="toolbar-group">
          <ToolButton 
            icon={<Rows size={16} />} 
            active={pageSettings.orientation === 'portrait'} 
            onClick={() => setPageSettings({ ...pageSettings, orientation: 'portrait' })} 
            title="Portrait"
          />
          <ToolButton 
            icon={<Columns size={16} />} 
            active={pageSettings.orientation === 'landscape'} 
            onClick={() => setPageSettings({ ...pageSettings, orientation: 'landscape' })} 
            title="Landscape"
          />
          <select 
            className="bg-transparent border-none text-[10px] font-black outline-none cursor-pointer uppercase"
            value={pageSettings.template}
            onChange={(e) => setPageSettings({ ...pageSettings, template: e.target.value })}
          >
            <option value="blank">Blank</option>
            <option value="lined">Lined</option>
            <option value="grid">Grid</option>
            <option value="dotted">Dotted</option>
          </select>
        </div>
      </div>
    </div>
  );
};

const ToolButton = ({ icon, active, onClick, title }: any) => (
  <button 
    className={`p-2 rounded-lg transition-all flex items-center justify-center ${
      active ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-500 hover:bg-slate-100'
    }`} 
    onClick={onClick}
    title={title}
  >
    {icon}
  </button>
);
