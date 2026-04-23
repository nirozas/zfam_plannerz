import React from 'react';
import { 
  Pencil, 
  Highlighter, 
  Eraser, 
  ImageIcon, 
  Minus,
  Plus,
  MousePointer2,
  Columns,
  Rows,
  Bold,
  Italic,
  AlignLeft,
  List,
  Square,
  ChevronDown,
  FileDown,
  Layout,
  Maximize2,
  CheckSquare,
  Undo2,
  Redo2,
  Search,
  Type as TypeIcon,
  Edit3,
  Calendar as CalendarIcon,
  Clock,
  Copy
} from 'lucide-react';



interface SideToolbarProps {
  activeTool: string;
  setActiveTool: (tool: any) => void;
  handleAddImage: () => void;
  onAddImageFromUrl?: () => void;
}

const SHAPES = [
  // Basic
  { id: 'rect', label: 'Rectangle', icon: <Square size={16} /> },
  { id: 'circle', label: 'Circle', icon: <div className="w-3.5 h-3.5 rounded-full border-2 border-current" /> },
  { id: 'triangle', label: 'Triangle', icon: <div className="w-0 h-0 border-l-[7px] border-l-transparent border-r-[7px] border-r-transparent border-b-[12px] border-b-current" /> },
  { id: 'diamond', label: 'Diamond', icon: <div className="w-3 h-3 border-2 border-current rotate-45" /> },
  { id: 'star', label: 'Star', icon: <span className="text-xs leading-none">★</span> },
  { id: 'heart', label: 'Heart', icon: <span className="text-xs leading-none">♥</span> },
  // Lines & Arrows
  { id: 'line', label: 'Line', icon: <div className="w-4 h-0.5 bg-current" /> },
  { id: 'arrow', label: 'Arrow →', icon: <span className="text-xs leading-none">→</span> },
  { id: 'arrow-left', label: 'Arrow ←', icon: <span className="text-xs leading-none">←</span> },
  { id: 'arrow-both', label: 'Arrow ↔', icon: <span className="text-xs leading-none">↔</span> },
  { id: 'arrow-up', label: 'Arrow ↑', icon: <span className="text-xs leading-none">↑</span> },
  { id: 'arrow-down', label: 'Arrow ↓', icon: <span className="text-xs leading-none">↓</span> },
  // Chart Axes
  { id: 'axis-xy', label: 'XY Axes', icon: <span className="text-[10px] leading-none font-bold">xy</span> },
  { id: 'axis-x', label: 'X Axis', icon: <span className="text-[10px] leading-none font-bold">x—</span> },
  // Speech Bubbles
  { id: 'bubble-speech', label: 'Speech Bubble', icon: <span className="text-xs leading-none">💬</span> },
  { id: 'bubble-thought', label: 'Thought Bubble', icon: <span className="text-xs leading-none">💭</span> },
  // Brackets & Frames
  { id: 'bracket', label: 'Bracket', icon: <span className="text-sm leading-none font-bold">[  ]</span> },
  { id: 'curly', label: 'Curly Brace', icon: <span className="text-sm leading-none">{ }</span> },
];

const EMOJIS = [
  '😀','😂','😍','🥳','🤔','😎','🥺','😭','🔥','⭐',
  '✅','❌','⚠️','💡','📌','📎','🗂️','📝','📖','📚',
  '🎯','🚀','💎','🏆','🎉','🎨','🎵','📊','📈','🔍',
  '🌟','💪','👍','👎','🤝','👏','💬','💭','❓','❗',
  '⬆️','⬇️','⬅️','➡️','🔄','↩️','↪️','🔁','🔂','🔃',
];



export const NotebookSideToolbar: React.FC<SideToolbarProps> = ({
  activeTool,
  setActiveTool,
  handleAddImage,
  onAddImageFromUrl
}) => {
  const [showShapeMenu, setShowShapeMenu] = React.useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = React.useState(false);

  // Close menus when clicking away
  React.useEffect(() => {
    const close = () => { setShowShapeMenu(false); setShowEmojiPicker(false); };
    document.addEventListener('click', close);
    return () => document.removeEventListener('click', close);
  }, []);

  return (
    <div className="notebook-side-toolbar">
      <SideToolBtn icon={<MousePointer2 size={20} />} active={activeTool === 'select'} onClick={() => setActiveTool('select')} label="Select (V)" />
      <SideToolBtn icon={<TypeIcon size={20} />} active={activeTool === 'text'} onClick={() => setActiveTool('text')} label="Text (T)" />

      <div className="w-8 h-px bg-slate-200 my-1" />

      <SideToolBtn icon={<Pencil size={20} />} active={activeTool === 'pen'} onClick={() => setActiveTool('pen')} label="Pen (P)" />
      <SideToolBtn icon={<Highlighter size={20} />} active={activeTool === 'highlighter'} onClick={() => setActiveTool('highlighter')} label="Highlighter (H)" />
      <SideToolBtn icon={<Eraser size={20} />} active={activeTool === 'eraser'} onClick={() => setActiveTool('eraser')} label="Eraser (E)" />

      <div className="w-8 h-px bg-slate-200 my-1" />

      {/* Shapes — direct button with flyout grid */}
      <div className="relative" onClick={e => e.stopPropagation()}>
        <SideToolBtn
          icon={<Square size={20} />}
          active={showShapeMenu || activeTool.startsWith('shape:')}
          onClick={() => setShowShapeMenu(v => !v)}
          label="Shapes"
        />
        {showShapeMenu && (
          <div className="absolute left-full top-0 ml-3 w-52 bg-white/95 backdrop-blur-xl rounded-2xl shadow-2xl border border-slate-100 p-3 z-[2000] animate-in fade-in slide-in-from-left-2">
            <p className="text-[8px] font-black uppercase text-slate-400 tracking-widest mb-2">Shapes</p>
            <div className="grid grid-cols-4 gap-1.5">
              {SHAPES.map(s => (
                <button
                  key={s.id}
                  onClick={() => { setActiveTool('shape:' + s.id); setShowShapeMenu(false); }}
                  title={s.label}
                  className={`aspect-square flex items-center justify-center rounded-lg text-slate-600 transition-all hover:bg-indigo-600 hover:text-white text-sm ${ activeTool === 'shape:' + s.id ? 'bg-indigo-600 text-white' : 'bg-slate-50'}`}
                >
                  {s.icon}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Image upload */}
      <SideToolBtn icon={<ImageIcon size={20} />} active={false} onClick={handleAddImage} label="Upload Image" />
      <SideToolBtn icon={<Search size={18} />} active={false} onClick={() => onAddImageFromUrl?.()} label="Image from URL" />

      <div className="w-8 h-px bg-slate-200 my-1" />

      {/* Emoji picker */}
      <div className="relative" onClick={e => e.stopPropagation()}>
        <SideToolBtn
          icon={<span className="text-xl leading-none">😊</span>}
          active={showEmojiPicker}
          onClick={() => setShowEmojiPicker(v => !v)}
          label="Emoji & Icons"
        />
        {showEmojiPicker && (
          <div className="absolute left-full top-0 ml-3 w-64 bg-white/95 backdrop-blur-xl rounded-2xl shadow-2xl border border-slate-100 p-3 z-[2000] animate-in fade-in slide-in-from-left-2">
            <p className="text-[8px] font-black uppercase text-slate-400 tracking-widest mb-2">Emoji &amp; Icons</p>
            <div className="grid grid-cols-8 gap-1">
              {EMOJIS.map(em => (
                <button
                  key={em}
                  title={em}
                  onClick={() => {
                    // Insert as a text element by dispatching a custom event
                    window.dispatchEvent(new CustomEvent('insert-emoji', { detail: em }));
                    setShowEmojiPicker(false);
                  }}
                  className="aspect-square flex items-center justify-center rounded-lg hover:bg-indigo-50 text-lg transition-all hover:scale-125"
                >
                  {em}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};


interface PropertyBarProps {
  activeTool: string;
  brushSettings: any;
  setBrushSettings: (s: any) => void;
  textSettings: any;
  setTextSettings: (s: any) => void;
  pageSettings: any;
  setPageSettings: (s: any) => void;
  selectedElement?: any;
  onUpdateElement?: (id: string, updates: any) => void;
  activePage?: any;
  onOpenExport?: () => void;
  onUndo?: () => void;
  onRedo?: () => void;
  canUndo?: boolean;
  canRedo?: boolean;
  onAddImageFromUrl?: () => void;
  viewMode?: 'editor' | 'calendar';
  setViewMode?: (mode: 'editor' | 'calendar') => void;
  onDuplicatePage?: () => void;
  onUpdatePageMetadata?: (updates: { title?: string, dueDate?: string }) => void;
}

const FONTS = [
  { name: 'Inter', label: 'Inter', style: {} },
  { name: 'Outfit', label: 'Outfit', style: { fontFamily: 'Outfit' } },
  { name: 'Roboto', label: 'Roboto', style: { fontFamily: 'Roboto' } },
  { name: 'Montserrat', label: 'Montserrat', style: { fontFamily: 'Montserrat', fontWeight: 700 } },
  { name: 'Playfair Display', label: 'Playfair', style: { fontFamily: 'Playfair Display', fontStyle: 'italic' } },
  { name: 'Caveat', label: 'Caveat', style: { fontFamily: 'Caveat' } },
  { name: 'Dancing Script', label: 'Dancing', style: { fontFamily: 'Dancing Script' } },
  { name: 'Pacifico', label: 'Pacifico', style: { fontFamily: 'Pacifico' } },
  { name: 'Raleway', label: 'Raleway', style: { fontFamily: 'Raleway' } },
  { name: 'Nunito', label: 'Nunito', style: { fontFamily: 'Nunito' } },
  { name: 'Lato', label: 'Lato', style: { fontFamily: 'Lato' } },
  { name: 'Cairo', label: 'Cairo', style: { fontFamily: 'Cairo' } },
  { name: 'Amiri', label: 'أميري', style: { fontFamily: 'Amiri' } },
  { name: 'Rubik', label: 'Rubik', style: { fontFamily: 'Rubik' } },
  { name: 'Source Code Pro', label: 'Code', style: { fontFamily: 'Source Code Pro', fontSize: '11px' } },
];


const BULLETS = [
  { id: 'none', label: 'None', char: '' },
  { id: 'dot', label: '• Dot', char: '•' },
  { id: 'circle', label: '○ Circle', char: '○' },
  { id: 'square', label: '■ Square', char: '■' },
  { id: 'diamond', label: '❖ Diamond', char: '❖' },
  { id: 'arrow', label: '➢ Arrow', char: '➢' },
  { id: 'check', label: '✓ Check', char: '✓' },
  { id: 'todo', label: '☐ Task', char: '☐' },
  { id: 'num', label: '1. Number', char: '1.' },
  { id: 'alpha', label: 'a. Letter', char: 'a.' },
  { id: 'ALPHA', label: 'A. Letter', char: 'A.' }
];


export const NotebookPropertyBar: React.FC<PropertyBarProps> = ({
  activeTool,
  brushSettings,
  setBrushSettings,
  textSettings,
  setTextSettings,
  pageSettings,
  setPageSettings,
  selectedElement,
  onUpdateElement,
  activePage,
  onOpenExport,
  onUndo,
  onRedo,
  canUndo,
  canRedo,
  viewMode = 'editor',
  setViewMode,
  onDuplicatePage,
  onUpdatePageMetadata
}) => {
  const [showBulletMenu, setShowBulletMenu] = React.useState(false);
  const [showPageMenu, setShowPageMenu] = React.useState(false);


  const lastTextElementRef = React.useRef<typeof selectedElement>(null);
  React.useEffect(() => {
    if (selectedElement && selectedElement.type === 'text') {
      lastTextElementRef.current = selectedElement;
    }
  }, [selectedElement]);

  const applyBullet = (bullet: typeof BULLETS[0]) => {
    window.dispatchEvent(new CustomEvent('format-text-list', { detail: { type: 'bullet', bullet } }));
    setShowBulletMenu(false);
  };

  return (
    <div className="notebook-property-bar-container">
      {/* 1. TOP PANEL BAR */}
      <div className="property-bar-top-panel">
        {/* Left: View Toggle */}
        <div className="flex items-center gap-1 bg-white p-1 rounded-xl border border-slate-200 flex-shrink-0">
          <button 
            onClick={() => setViewMode?.('editor')}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${viewMode === 'editor' ? 'bg-slate-900 text-white shadow-lg' : 'text-slate-400 hover:text-slate-600 hover:bg-slate-50'}`}
          >
            <Edit3 size={14} /> Editor
          </button>
          <button 
            onClick={() => setViewMode?.('calendar')}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${viewMode === 'calendar' ? 'bg-slate-900 text-white shadow-lg' : 'text-slate-400 hover:text-slate-600 hover:bg-slate-50'}`}
          >
            <CalendarIcon size={14} /> Calendar
          </button>
        </div>


        {/* Middle: Page Metadata — inline single row */}
        <div className="flex-1 flex items-center justify-center gap-3 px-4 min-w-0 overflow-hidden">
          <input 
            type="text"
            value={activePage?.title || ''}
            onChange={(e) => onUpdatePageMetadata?.({ title: e.target.value })}
            className="bg-transparent border-none text-sm font-black text-slate-900 focus:ring-0 p-0 max-w-[180px] uppercase tracking-tighter italic placeholder:text-slate-300 truncate"
            placeholder="Untitled Page"
          />
          <div className="w-px h-4 bg-slate-300 flex-shrink-0" />
          <div className="flex items-center gap-1.5 text-[9px] font-bold text-slate-400 uppercase tracking-widest flex-shrink-0">
            <Clock size={10} /> {activePage ? new Date(activePage.createdAt).toLocaleDateString() : 'No Date'}
          </div>
          <div className="w-px h-4 bg-slate-300 flex-shrink-0" />
          <div className="flex items-center gap-1.5 flex-shrink-0">
            <span className="text-[9px] font-black text-red-500 uppercase tracking-widest">Due</span>
            <input 
              type="date"
              value={activePage?.dueDate || ''}
              onChange={(e) => onUpdatePageMetadata?.({ dueDate: e.target.value })}
              className="bg-white border border-red-200 rounded-md px-1.5 py-0.5 text-[9px] font-black text-red-600 outline-none focus:border-red-400 transition-colors"
            />
          </div>
        </div>

        {/* Right: Actions — compact, non-shrinking */}
        <div className="flex items-center gap-2 flex-shrink-0">
          <button 
            onClick={onDuplicatePage}
            className="flex items-center gap-1.5 px-2.5 py-1.5 bg-white border border-slate-200 text-slate-600 rounded-xl hover:bg-slate-50 transition-all active:scale-95 font-black text-[10px] uppercase tracking-widest whitespace-nowrap"
          >
            <Copy size={13} /> Dup
          </button>
          <button 
            onClick={onOpenExport}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition-all active:scale-95 shadow-lg shadow-indigo-100 font-black text-[10px] uppercase tracking-widest whitespace-nowrap"
          >
            <FileDown size={13} /> Export
          </button>
        </div>
      </div>


      {/* 2. CONTEXTUAL TOOLS BAR */}
      <div className="property-bar-tools">
        {/* Undo / Redo */}
        <div className="flex items-center gap-1 bg-slate-100/50 p-1 rounded-xl border border-slate-200">
          <button 
            onClick={onUndo}
            disabled={!canUndo}
            className={`p-2 rounded-lg transition-all ${canUndo ? 'text-slate-600 hover:text-slate-900 hover:bg-white' : 'text-slate-300 cursor-not-allowed'}`} 
            title="Undo (Ctrl+Z)"
          >
            <Undo2 size={16} />
          </button>
          <button 
            onClick={onRedo}
            disabled={!canRedo}
            className={`p-2 rounded-lg transition-all ${canRedo ? 'text-slate-600 hover:text-slate-900 hover:bg-white' : 'text-slate-300 cursor-not-allowed'}`} 
            title="Redo (Ctrl+Y)"
          >
            <Redo2 size={16} />
          </button>
        </div>

        <div className="w-px h-8 bg-slate-200" />

        {/* Dynamic Context Area */}
        <div className="flex-1 flex items-center gap-6">
          {/* Pen / Highlighter Settings */}
          {['pen', 'highlighter', 'eraser'].includes(activeTool) && (
            <div className="flex items-center gap-6 animate-in fade-in slide-in-from-top-1">
              {activeTool !== 'eraser' && (
                <div className="property-group">
                  <div className="flex items-center gap-1.5 px-2">
                    {(activeTool === 'highlighter' 
                      ? ['#fef08a', '#bbf7d0', '#bae6fd', '#fecdd3', '#e9d5ff'] // Pastel Brights
                      : ['#0f172a', '#2563eb', '#dc2626', '#16a34a', '#d97706'] // Standard Pen
                    ).map(color => (
                      <button 
                        key={color} 
                        className={`w-5 h-5 rounded-full border-2 border-white transition-all hover:scale-125 ${brushSettings.color === color ? 'ring-2 ring-indigo-500 ring-offset-2 scale-110' : ''}`}
                        style={{ backgroundColor: color }}
                        onClick={() => setBrushSettings({ ...brushSettings, color })}
                      />
                    ))}

                    <div className="w-px h-4 bg-slate-200 mx-1" />
                    <input 
                      type="color" 
                      value={brushSettings.color} 
                      onChange={(e) => setBrushSettings({ ...brushSettings, color: e.target.value })}
                      className="w-6 h-6 p-0 border-none bg-transparent cursor-pointer rounded-full"
                    />
                  </div>
                </div>
              )}

              <div className="property-group px-3 py-1.5">
                <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest mr-2">Size</span>
                <input 
                  type="range" min="1" max="100" 
                  value={brushSettings.width} 
                  onChange={(e) => setBrushSettings({ ...brushSettings, width: parseInt(e.target.value) })}
                  className="w-32 h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                />
                <span className="text-[10px] font-black text-slate-700 w-8 text-right">{brushSettings.width}px</span>
              </div>

              {activeTool === 'highlighter' && (
                <div className="property-group px-3 py-1.5">
                  <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest mr-2">Flow</span>
                  <input 
                    type="range" min="0.1" max="1" step="0.1" 
                    value={brushSettings.opacity} 
                    onChange={(e) => setBrushSettings({ ...brushSettings, opacity: parseFloat(e.target.value) })}
                    className="w-24 h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                  />
                  <span className="text-[10px] font-black text-slate-700 w-8 text-right">{Math.round(brushSettings.opacity * 100)}%</span>
                </div>
              )}
            </div>
          )}

          {/* Text Settings */}
          {(activeTool === 'text' || selectedElement?.type === 'text') && (
            <div className="flex items-center gap-3 animate-in fade-in slide-in-from-top-1 flex-wrap">

              {/* Font family picker with preview */}
              <div className="property-group px-2">
                <select 
                  className="bg-transparent border-none text-[11px] font-bold outline-none text-slate-700 w-36 py-1 cursor-pointer"
                  value={selectedElement?.fontFamily || textSettings.fontFamily}
                  onChange={(e) => {
                    const font = e.target.value;
                    setTextSettings({ ...textSettings, fontFamily: font });
                    if (selectedElement) onUpdateElement?.(selectedElement.id, { fontFamily: font });
                  }}
                >
                  {FONTS.map(f => <option key={f.name} value={f.name} style={f.style}>{f.label}</option>)}
                </select>
                <div className="w-px h-4 bg-slate-200 mx-1" />
                <button onClick={() => {
                  const s = Math.max(8, (selectedElement?.fontSize || textSettings.fontSize) - 2);
                  setTextSettings({...textSettings, fontSize: s});
                  if(selectedElement) onUpdateElement?.(selectedElement.id, {fontSize: s});
                }} className="p-1 hover:bg-white rounded"><Minus size={14}/></button>
                <span className="text-[11px] font-black w-6 text-center">{selectedElement?.fontSize || textSettings.fontSize}</span>
                <button onClick={() => {
                  const s = (selectedElement?.fontSize || textSettings.fontSize) + 2;
                  setTextSettings({...textSettings, fontSize: s});
                  if(selectedElement) onUpdateElement?.(selectedElement.id, {fontSize: s});
                }} className="p-1 hover:bg-white rounded"><Plus size={14}/></button>
              </div>

              {/* Color + Style */}
              <div className="property-group">
                <input 
                  type="color" 
                  value={selectedElement?.fill || textSettings.fill} 
                  onChange={(e) => {
                    const c = e.target.value;
                    setTextSettings({...textSettings, fill: c});
                    if(selectedElement) onUpdateElement?.(selectedElement.id, {fill: c});
                  }}
                  className="w-6 h-6 p-0 border-none bg-transparent cursor-pointer rounded-full ml-1"
                  title="Text Color"
                />
                <div className="w-px h-4 bg-slate-200 mx-1" />
                <ToolBtnSmall 
                  icon={<Bold size={14} />} 
                  active={selectedElement ? selectedElement.fontStyle?.includes('bold') : textSettings.fontStyle?.includes('bold')} 
                  onMouseDown={(e: React.MouseEvent) => e.preventDefault()}
                  onClick={() => {
                    let current = (selectedElement ? selectedElement.fontStyle : textSettings.fontStyle) || '';
                    current = current.replace('normal', '').trim();
                    const next = current.includes('bold') ? current.replace('bold', '').trim() : (current + ' bold').trim();
                    
                    if (selectedElement) {
                      onUpdateElement?.(selectedElement.id, { fontStyle: next || 'normal' });
                    } else {
                      setTextSettings({ ...textSettings, fontStyle: next || 'normal' });
                    }
                  }}
                />
                <ToolBtnSmall 
                  icon={<Italic size={14} />} 
                  active={selectedElement ? selectedElement.fontStyle?.includes('italic') : textSettings.fontStyle?.includes('italic')} 
                  onMouseDown={(e: React.MouseEvent) => e.preventDefault()}
                  onClick={() => {
                    let current = (selectedElement ? selectedElement.fontStyle : textSettings.fontStyle) || '';
                    current = current.replace('normal', '').trim();
                    const next = current.includes('italic') ? current.replace('italic', '').trim() : (current + ' italic').trim();
                    
                    if (selectedElement) {
                      onUpdateElement?.(selectedElement.id, { fontStyle: next || 'normal' });
                    } else {
                      setTextSettings({ ...textSettings, fontStyle: next || 'normal' });
                    }
                  }}
                />
              </div>

              {/* Alignment */}
              <div className="property-group">
                {(['left', 'center', 'right', 'justify'] as const).map(a => (
                  <ToolBtnSmall
                    key={a}
                    onMouseDown={(e: React.MouseEvent) => e.preventDefault()}
                    icon={
                      a === 'left' ? <AlignLeft size={14} /> :
                      a === 'center' ? <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="3" y1="6" x2="21" y2="6"/><line x1="6" y1="12" x2="18" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/></svg> :
                      a === 'right' ? <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="3" y1="6" x2="21" y2="6"/><line x1="9" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/></svg> :
                      <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/></svg>
                    }
                    active={(selectedElement?.align || 'left') === a}
                    onClick={() => {
                      if (!selectedElement) return;
                      onUpdateElement?.(selectedElement.id, { align: a });
                    }}
                  />
                ))}
              </div>

              {/* Direction */}
              <div className="property-group">
                <button
                  title="LTR – Left to Right"
                  onMouseDown={e => e.preventDefault()}
                  onClick={() => {
                    if (!selectedElement) return;
                    onUpdateElement?.(selectedElement.id, { dir: 'ltr' });
                  }}
                  className={`px-2 py-1 rounded-lg text-[10px] font-black uppercase transition-all ${ (selectedElement?.dir || 'ltr') === 'ltr' ? 'bg-slate-900 text-white' : 'text-slate-500 hover:bg-white'}`}
                >LTR</button>
                <button
                  title="RTL – Right to Left (Arabic, Hebrew)"
                  onMouseDown={e => e.preventDefault()}
                  onClick={() => {
                    if (!selectedElement) return;
                    onUpdateElement?.(selectedElement.id, { dir: 'rtl' });
                  }}
                  className={`px-2 py-1 rounded-lg text-[10px] font-black uppercase transition-all ${ (selectedElement?.dir || 'ltr') === 'rtl' ? 'bg-slate-900 text-white' : 'text-slate-500 hover:bg-white'}`}
                >RTL</button>
              </div>

              {/* Bullet / Checkbox */}
              <div className="property-group">
                <div className="relative z-50">
                  <button 
                    onMouseDown={e => e.preventDefault()}
                    onClick={() => setShowBulletMenu(v => !v)}
                    className={`flex items-center gap-1 px-2 py-1.5 rounded-lg transition-all ${ showBulletMenu ? 'bg-slate-900 text-white' : 'text-slate-500 hover:bg-white'}`}
                    title="List Style"
                  >
                    <List size={14} />
                    <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><polyline points="6 9 12 15 18 9"/></svg>
                  </button>
                  {showBulletMenu && (
                    <div 
                      className="absolute top-full left-0 mt-2 w-52 bg-white rounded-2xl shadow-2xl border border-slate-100 p-2 z-[2000]"
                      onMouseDown={e => e.preventDefault()}
                      onClick={e => e.stopPropagation()}
                    >
                      <p className="text-[8px] font-black uppercase text-slate-400 tracking-widest px-2 mb-1">List Style</p>
                      {BULLETS.map(b => (
                        <button
                          key={b.id}
                          onMouseDown={e => e.preventDefault()}
                          onClick={() => applyBullet(b)}
                          className="w-full flex items-center gap-3 px-2 py-1.5 hover:bg-indigo-50 rounded-xl transition-colors"
                        >
                          <span className="w-7 h-7 flex items-center justify-center bg-slate-100 rounded-lg text-sm font-bold shrink-0">{b.char || '∅'}</span>
                          <span className="text-xs font-bold text-slate-600">{b.label}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                <ToolBtnSmall
                  icon={<CheckSquare size={14} />}
                  title="Task Checkboxes"
                  onMouseDown={(e: React.MouseEvent) => e.preventDefault()}
                  onClick={() => {
                    window.dispatchEvent(new CustomEvent('format-text-list', { detail: { type: 'checkbox' } }));
                  }}
                />
              </div>

              {/* Fit to Content */}
              <div className="property-group">
                <ToolBtnSmall
                  icon={<Maximize2 size={14} />}
                  title="Fit box to text content"
                  onMouseDown={(e: React.MouseEvent) => e.preventDefault()}
                  onClick={() => {
                    if (!selectedElement) return;
                    onUpdateElement?.(selectedElement.id, { _fitToContent: true });
                  }}
                />
              </div>

            </div>
          )}


          {/* Page Settings */}
          {!selectedElement && activeTool === 'select' && (
            <div className="flex items-center gap-4 animate-in fade-in slide-in-from-top-1">
              <div className="property-group px-3 py-1.5 cursor-pointer hover:bg-slate-100 transition-colors" onClick={() => setShowPageMenu(!showPageMenu)}>
                <Layout size={16} className="text-slate-400" />
                <span className="text-[11px] font-black uppercase tracking-widest text-slate-700 ml-2">Page Layout</span>
                <ChevronDown size={14} className="text-slate-400 ml-2" />
              </div>

              {showPageMenu && (
                <div className="absolute top-full left-[50%] -translate-x-1/2 mt-2 w-72 bg-white/95 backdrop-blur-xl rounded-2xl shadow-2xl border border-slate-200 p-4 z-[2000] animate-in fade-in zoom-in-95">
                  <div className="grid grid-cols-2 gap-2 mb-4">
                    <button 
                      onClick={() => setPageSettings({ ...pageSettings, orientation: 'portrait' })}
                      className={`flex flex-col items-center gap-2 p-3 rounded-xl border-2 transition-all ${pageSettings.orientation === 'portrait' ? 'border-indigo-600 bg-indigo-50 text-indigo-600' : 'border-slate-100 text-slate-400'}`}
                    >
                      <Rows size={20} /> <span className="text-[9px] font-black uppercase">Portrait</span>
                    </button>
                    <button 
                      onClick={() => setPageSettings({ ...pageSettings, orientation: 'landscape' })}
                      className={`flex flex-col items-center gap-2 p-3 rounded-xl border-2 transition-all ${pageSettings.orientation === 'landscape' ? 'border-indigo-600 bg-indigo-50 text-indigo-600' : 'border-slate-100 text-slate-400'}`}
                    >
                      <Columns size={20} /> <span className="text-[9px] font-black uppercase">Landscape</span>
                    </button>
                  </div>
                  <h3 className="text-[9px] font-black uppercase text-slate-400 mb-2 tracking-widest">Template</h3>
                  <div className="grid grid-cols-2 gap-2">
                    {['blank', 'lined', 'grid', 'dotted'].map(t => (
                      <button 
                        key={t}
                        onClick={() => setPageSettings({ ...pageSettings, template: t })}
                        className={`p-2 rounded-lg border text-[10px] font-bold uppercase transition-all ${pageSettings.template === t ? 'bg-slate-900 text-white' : 'hover:bg-slate-50 text-slate-600'}`}
                      >
                        {t}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

const SideToolBtn = ({ icon, active, onClick, label }: any) => (
  <button 
    className={`side-tool-btn group ${active ? 'active' : ''}`} 
    onClick={onClick}
  >
    {icon}
    <div className="absolute left-full ml-3 px-2 py-1 bg-slate-900 text-white text-[9px] font-black uppercase tracking-widest rounded opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity whitespace-nowrap z-[3000]">
      {label}
    </div>
  </button>
);

const ToolBtnSmall = ({ icon, active, onClick, title, onMouseDown }: any) => (
  <button 
    className={`p-2 rounded-lg transition-all ${active ? 'bg-slate-900 text-white shadow-sm' : 'text-slate-500 hover:bg-white hover:text-slate-900'}`} 
    onClick={onClick}
    onMouseDown={onMouseDown}
    title={title}
  >
    {icon}
  </button>
);

