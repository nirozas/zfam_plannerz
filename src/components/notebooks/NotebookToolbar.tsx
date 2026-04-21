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
  Calendar,
  Bold,
  Italic,
  AlignLeft,
  Languages,
  PlusCircle,
  List,
  Square,
  ListOrdered,
  Indent,
  ChevronDown,
  FileDown,
  Palette,
  Layout,
  Maximize2
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

const BULLETS = [
  { id: 'none', label: 'None', char: '' },
  { id: 'dot', label: '•', char: '•' },
  { id: 'circle', label: '○', char: '○' },
  { id: 'square', label: '■', char: '■' },
  { id: 'diamond', label: '❖', char: '❖' },
  { id: 'arrow', label: '➢', char: '➢' },
  { id: 'check', label: '✓', char: '✓' },
  { id: 'todo', label: '☐', char: '☐' }
];

const NUMBERING = [
  { id: 'decimal', label: '1.', format: (i: number) => `${i + 1}.` },
  { id: 'roman', label: 'I.', format: (i: number) => {
    const roman = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X'];
    return `${roman[i] || i + 1}.`;
  }},
  { id: 'alpha', label: 'A.', format: (i: number) => `${String.fromCharCode(65 + i)}.` },
  { id: 'alpha-small', label: 'a)', format: (i: number) => `${String.fromCharCode(97 + i)})` },
  { id: 'decimal-paren', label: '1)', format: (i: number) => `${i + 1})` }
];

const SHAPES = [
  { id: 'rect', label: 'Rectangle', icon: <Square size={16} /> },
  { id: 'circle', label: 'Circle', icon: <div className="w-4 h-4 rounded-full border-2 border-current" /> },
  { id: 'triangle', label: 'Triangle', icon: <div className="w-0 h-0 border-l-[8px] border-l-transparent border-r-[8px] border-r-transparent border-b-[14px] border-b-current" /> },
  { id: 'arrow', label: 'Arrow', icon: <div className="w-4 h-4 flex items-center justify-center">→</div> },
  { id: 'star', label: 'Star', icon: <div className="text-sm">★</div> },
  { id: 'diamond', label: 'Diamond', icon: <div className="w-3 h-3 rotate-45 border-2 border-current" /> },
  { id: 'line', label: 'Line', icon: <div className="w-4 h-0.5 bg-current rotate-45" /> }
];

const PEN_TYPES = [
  { id: 'round', label: 'Round Point', icon: <div className="w-2 h-2 rounded-full bg-current" /> },
  { id: 'pincel', label: 'Pincel', icon: <div className="w-1.5 h-3 bg-current rotate-[25deg] rounded-t-full" /> },
  { id: 'fountain', label: 'Fountain Pen', icon: <div className="w-2 h-3 bg-current skew-x-[-15deg] rounded-sm" /> },
  { id: 'brush', label: 'Art Brush', icon: <div className="w-4 h-2 bg-current opacity-40 rounded-full" /> }
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
  onAddImageFromUrl,
  onOpenExport
}) => {
  const [showBulletMenu, setShowBulletMenu] = React.useState(false);
  const [showDrawMenu, setShowDrawMenu] = React.useState(false);
  const [showInsertMenu, setShowInsertMenu] = React.useState(false);
  const [showPageMenu, setShowPageMenu] = React.useState(false);
  const [showPenTypeMenu, setShowPenTypeMenu] = React.useState(false);
  const [showTextDecorationMenu, setShowTextDecorationMenu] = React.useState(false);
  const [showNumberingMenu, setShowNumberingMenu] = React.useState(false);

  const applyNumbering = (type: typeof NUMBERING[0]) => {
    if (!selectedElement || selectedElement.type !== 'text') return;
    
    const currentText = selectedElement.text || '';
    const lines = currentText.split('\n');
    const newLines = lines.map((line: string, i: number) => {
      let cleaned = line.trimStart();
      // Remove bullets
      BULLETS.forEach(b => { if (b.char && cleaned.startsWith(b.char)) cleaned = cleaned.substring(b.char.length).trimStart(); });
      // Remove numbering (matches like 1., A., I., 1), a))
      cleaned = cleaned.replace(/^([0-9A-Za-z]+\.|\d+\)|[a-z]\))\s*/, '');
      
      return `${type.format(i)} ${cleaned}`;
    });

    onUpdateElement?.(selectedElement.id, { text: newLines.join('\n') });
    setShowNumberingMenu(false);
  };

  const applyMultilevel = (style: string) => {
    if (!selectedElement || selectedElement.type !== 'text') return;
    const currentText = selectedElement.text || '';
    const lines = currentText.split('\n');
    
    const newLines = lines.map((line: string, i: number) => {
      let cleaned = line.trimStart();
      cleaned = cleaned.replace(/^([0-9A-Za-z.]+\.|\d+\)|[a-z]\)|[•○■❖➢✓☐☑])\s*/, '');
      
      if (style === 'legal') {
        return `1.${i + 1} ${cleaned}`;
      } else if (style === 'nested') {
        return `  ${i + 1}. ${cleaned}`;
      }
      return line;
    });

    onUpdateElement?.(selectedElement.id, { text: newLines.join('\n') });
    setShowNumberingMenu(false);
  };

  const applyBullet = (bullet: typeof BULLETS[0]) => {
    if (!selectedElement || selectedElement.type !== 'text') return;
    
    const currentText = selectedElement.text || '';
    const lines = currentText.split('\n');
    const newLines = lines.map((line: string) => {
      let cleaned = line.trimStart();
      BULLETS.forEach(b => {
        if (b.char && cleaned.startsWith(b.char)) {
          cleaned = cleaned.substring(b.char.length).trimStart();
        }
      });
      if (cleaned.startsWith('☑')) {
        cleaned = cleaned.substring(1).trimStart();
      }
      // Remove numbering (matches like 1., A., I., 1), a))
      cleaned = cleaned.replace(/^([0-9A-Za-z.]+\.|\d+\)|[a-z]\))\s*/, '');
      
      if (bullet.id === 'none') return cleaned;
      return `${bullet.char} ${cleaned}`;
    });

    onUpdateElement?.(selectedElement.id, { text: newLines.join('\n') });
    setShowBulletMenu(false);
  };

  return (
    <div className="notebook-toolbar-stable">
      {/* Left: Metadata */}
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
        </div>
      </div>

      <div className="toolbar-divider" />

      {/* Main Tools Container - No Overflow */}
      <div className="toolbar-tools-compact">
        
        {/* Navigation & Basic Edit */}
        <div className="toolbar-group-v2">
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
            title="Add Text"
          />
          {/* Drawing Tools Toggle */}
          <div className="relative">
            <ToolButton 
              icon={activeTool === 'eraser' ? <Eraser size={16} /> : activeTool === 'highlighter' ? <Highlighter size={16} /> : <Pencil size={16} />}
              active={['pen', 'highlighter', 'eraser'].includes(activeTool)}
              onClick={() => setShowDrawMenu(!showDrawMenu)}
              title="Drawing Tools"
            />
            {showDrawMenu && (
              <div className="absolute top-full left-0 mt-2 w-48 bg-white rounded-xl shadow-2xl border border-slate-100 p-2 z-[7000] animate-in fade-in slide-in-from-top-2">
                <div className="text-[9px] font-black uppercase text-slate-400 mb-2 px-2">Drawing Modes</div>
                <button onClick={() => { setActiveTool('pen'); setShowDrawMenu(false); }} className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-bold transition-colors ${activeTool === 'pen' ? 'bg-indigo-50 text-indigo-600' : 'hover:bg-slate-50 text-slate-600'}`}>
                  <Pencil size={14} /> Pen
                </button>
                <button onClick={() => { setActiveTool('highlighter'); setShowDrawMenu(false); }} className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-bold transition-colors ${activeTool === 'highlighter' ? 'bg-indigo-50 text-indigo-600' : 'hover:bg-slate-50 text-slate-600'}`}>
                  <Highlighter size={14} /> Highlighter
                </button>
                <button onClick={() => { setActiveTool('eraser'); setShowDrawMenu(false); }} className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-bold transition-colors ${activeTool === 'eraser' ? 'bg-indigo-50 text-indigo-600' : 'hover:bg-slate-50 text-slate-600'}`}>
                  <Eraser size={14} /> Eraser
                </button>
              </div>
            )}
          </div>
          {/* Insert Toggle */}
          <div className="relative">
            <ToolButton 
              icon={<PlusCircle size={16} />}
              active={activeTool.startsWith('shape:') || activeTool === 'image_menu'}
              onClick={() => setShowInsertMenu(!showInsertMenu)}
              title="Insert"
            />
            {showInsertMenu && (
              <div className="absolute top-full left-0 mt-2 w-64 bg-white rounded-xl shadow-2xl border border-slate-100 p-3 z-[7000] animate-in fade-in slide-in-from-top-2">
                <div className="text-[9px] font-black uppercase text-slate-400 mb-2">Shapes</div>
                <div className="grid grid-cols-4 gap-2 mb-4">
                  {SHAPES.map(shape => (
                    <button 
                      key={shape.id}
                      onClick={() => { setActiveTool('shape:' + shape.id); setShowInsertMenu(false); }}
                      className="aspect-square flex items-center justify-center rounded-lg bg-slate-50 text-slate-600 hover:bg-indigo-600 hover:text-white transition-all"
                    >
                      {shape.icon}
                    </button>
                  ))}
                </div>
                <div className="text-[9px] font-black uppercase text-slate-400 mb-2">Media</div>
                <button onClick={() => { handleAddImage(); setShowInsertMenu(false); }} className="w-full flex items-center gap-3 px-3 py-2 hover:bg-slate-50 rounded-lg text-xs font-bold text-slate-600">
                  <ImageIcon size={14} /> Upload Image
                </button>
                <button onClick={() => { onAddImageFromUrl?.(); setShowInsertMenu(false); }} className="w-full flex items-center gap-3 px-3 py-2 hover:bg-slate-50 rounded-lg text-xs font-bold text-slate-600">
                  <Languages size={14} /> From URL
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Dynamic Tool Properties Section */}
        <div className="flex-1 flex items-center gap-4 px-2 overflow-visible">
          
          {/* Pen / Highlighter / Eraser Properties */}
          {['pen', 'highlighter', 'eraser'].includes(activeTool) && (
            <div className="flex items-center gap-4 animate-in fade-in slide-in-from-bottom-1 duration-200">
              {/* Color Swatches (Hide for Eraser) */}
              {activeTool !== 'eraser' && (
                <div className="flex items-center gap-1.5 p-1 bg-slate-50 rounded-lg border border-slate-200">
                  {(activeTool === 'pen' ? ['#000000', '#2563eb', '#dc2626', '#22c55e'] : ['#fef08a', '#fbcfe8', '#bfdbfe', '#bbf7d0']).map(color => (
                    <button 
                      key={color} 
                      className={`w-4 h-4 rounded-full border border-white transition-all hover:scale-125 ${brushSettings.color === color ? 'ring-2 ring-indigo-500 ring-offset-1' : ''}`}
                      style={{ backgroundColor: color }}
                      onClick={() => setBrushSettings({ ...brushSettings, color })}
                    />
                  ))}
                  <input 
                    type="color" 
                    value={brushSettings.color} 
                    onChange={(e) => setBrushSettings({ ...brushSettings, color: e.target.value })}
                    className="w-5 h-5 p-0 border-none bg-transparent cursor-pointer rounded-full ml-1"
                  />
                </div>
              )}

              {/* Pen Type Selection */}
              {activeTool === 'pen' && (
                <div className="relative">
                  <button 
                    onClick={() => setShowPenTypeMenu(!showPenTypeMenu)}
                    className="flex items-center gap-2 px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-[10px] font-black uppercase text-slate-600 transition-all hover:bg-slate-50"
                  >
                    {PEN_TYPES.find(p => p.id === brushSettings.penType)?.icon}
                    <span className="hidden sm:inline">{PEN_TYPES.find(p => p.id === brushSettings.penType)?.label}</span>
                    <ChevronDown size={10} />
                  </button>
                  {showPenTypeMenu && (
                    <div className="absolute top-full left-0 mt-2 w-44 bg-white rounded-xl shadow-2xl border border-slate-100 p-2 z-[7000] animate-in fade-in slide-in-from-top-2">
                      {PEN_TYPES.map(type => (
                        <button 
                          key={type.id}
                          onClick={() => { setBrushSettings({ ...brushSettings, penType: type.id }); setShowPenTypeMenu(false); }}
                          className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-bold transition-colors ${brushSettings.penType === type.id ? 'bg-indigo-50 text-indigo-600' : 'hover:bg-slate-50 text-slate-600'}`}
                        >
                          <span className="opacity-60">{type.icon}</span>
                          {type.label}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Width & Opacity */}
              <div className="flex items-center gap-3 bg-slate-50 rounded-lg border border-slate-200 px-2 py-1">
                <div className="flex items-center gap-1.5">
                  <span className="text-[9px] font-black text-slate-400 uppercase">Width</span>
                  <button onClick={() => setBrushSettings({...brushSettings, width: Math.max(1, brushSettings.width - 2)})} className="p-1 hover:bg-white rounded transition-colors"><Minus size={12}/></button>
                  <span className="text-[10px] font-black w-4 text-center">{brushSettings.width}</span>
                  <button onClick={() => setBrushSettings({...brushSettings, width: Math.min(100, brushSettings.width + 2)})} className="p-1 hover:bg-white rounded transition-colors"><Plus size={12}/></button>
                </div>
                {activeTool === 'highlighter' && (
                  <>
                    <div className="w-px h-4 bg-slate-200" />
                    <div className="flex items-center gap-1.5">
                      <span className="text-[9px] font-black text-slate-400 uppercase">Opacity</span>
                      <button onClick={() => setBrushSettings({...brushSettings, opacity: Math.max(0.1, brushSettings.opacity - 0.1)})} className="p-1 hover:bg-white rounded transition-colors"><Minus size={12}/></button>
                      <span className="text-[10px] font-black w-7 text-center">{Math.round(brushSettings.opacity * 100)}%</span>
                      <button onClick={() => setBrushSettings({...brushSettings, opacity: Math.min(1, brushSettings.opacity + 0.1)})} className="p-1 hover:bg-white rounded transition-colors"><Plus size={12}/></button>
                    </div>
                  </>
                )}
              </div>
            </div>
          )}

          {/* Text Properties */}
          {(activeTool === 'text' || selectedElement?.type === 'text') && (
            <div className="flex items-center gap-3 animate-in fade-in slide-in-from-bottom-1 duration-200 overflow-visible">
              {/* Font Selector */}
              <div className="bg-white border border-slate-200 rounded-lg flex items-center px-2 py-1">
                <select 
                  className="bg-transparent border-none text-[10px] font-black outline-none uppercase max-w-[90px]"
                  value={selectedElement?.fontFamily || textSettings.fontFamily}
                  onChange={(e) => {
                    const font = e.target.value;
                    setTextSettings({ ...textSettings, fontFamily: font });
                    if (selectedElement?.type === 'text') onUpdateElement?.(selectedElement.id, { fontFamily: font });
                  }}
                >
                  {FONTS.map(font => <option key={font} value={font}>{font}</option>)}
                </select>
                <div className="w-px h-4 bg-slate-200 mx-2" />
                <button onClick={() => {
                  const val = (selectedElement?.fontSize || textSettings.fontSize);
                  const newVal = Math.max(8, val - 2);
                  setTextSettings({ ...textSettings, fontSize: newVal });
                  if (selectedElement?.type === 'text') onUpdateElement?.(selectedElement.id, { fontSize: newVal });
                }} className="p-1 hover:bg-slate-100 rounded transition-colors"><Minus size={12}/></button>
                <span className="text-[10px] font-black w-5 text-center">{(selectedElement?.fontSize || textSettings.fontSize)}</span>
                <button onClick={() => {
                  const val = (selectedElement?.fontSize || textSettings.fontSize);
                  const newVal = Math.min(300, val + 2);
                  setTextSettings({ ...textSettings, fontSize: newVal });
                  if (selectedElement?.type === 'text') onUpdateElement?.(selectedElement.id, { fontSize: newVal });
                }} className="p-1 hover:bg-slate-100 rounded transition-colors"><Plus size={12}/></button>
              </div>

              {/* Text Style Controls */}
              <div className="flex items-center gap-1.5 p-1 bg-slate-50 rounded-lg border border-slate-200">
                <input 
                  type="color" 
                  value={selectedElement?.fill || textSettings.fill} 
                  onChange={(e) => {
                    const color = e.target.value;
                    setTextSettings({ ...textSettings, fill: color });
                    if (selectedElement) onUpdateElement?.(selectedElement.id, { fill: color });
                  }}
                  className="w-5 h-5 p-0 border-none bg-transparent cursor-pointer rounded-full"
                  title="Text Color"
                />
                <div className="w-px h-4 bg-slate-200 mx-1" />
                <ToolButton 
                  icon={<Bold size={14} />} 
                  active={selectedElement?.fontStyle?.includes('bold') || (!selectedElement && textSettings.fontStyle?.includes('bold'))} 
                  onClick={() => {
                    const current = selectedElement?.fontStyle || textSettings.fontStyle || '';
                    const next = current.includes('bold') ? current.replace('bold', '').trim() : (current + ' bold').trim();
                    setTextSettings({ ...textSettings, fontStyle: next });
                    if (selectedElement) onUpdateElement?.(selectedElement.id, { fontStyle: next });
                  }} 
                />
                <ToolButton 
                  icon={<Italic size={14} />} 
                  active={selectedElement?.fontStyle?.includes('italic') || (!selectedElement && textSettings.fontStyle?.includes('italic'))} 
                  onClick={() => {
                    const current = selectedElement?.fontStyle || textSettings.fontStyle || '';
                    const next = current.includes('italic') ? current.replace('italic', '').trim() : (current + ' italic').trim();
                    setTextSettings({ ...textSettings, fontStyle: next });
                    if (selectedElement) onUpdateElement?.(selectedElement.id, { fontStyle: next });
                  }} 
                />
              </div>

              {/* Box Styling Dropdown (BG, Border, Outline) - RESTORED & UPGRADED */}
              <div className="relative">
                <button 
                  onClick={() => setShowTextDecorationMenu(!showTextDecorationMenu)}
                  className={`p-2 rounded-lg border transition-all ${showTextDecorationMenu ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50'}`}
                  title="Box Styling"
                >
                  <Palette size={14} />
                </button>
                {showTextDecorationMenu && (
                  <div className="absolute top-full left-0 mt-2 w-64 bg-white rounded-xl shadow-2xl border border-slate-100 p-4 z-[7000] animate-in fade-in slide-in-from-top-2">
                    <div className="space-y-4">
                      {/* Background Color */}
                      <div>
                        <div className="text-[9px] font-black uppercase text-slate-400 mb-2">Background Color</div>
                        <div className="flex items-center gap-2">
                          <input 
                            type="color" 
                            value={selectedElement?.backgroundColor && selectedElement.backgroundColor !== 'transparent' ? selectedElement.backgroundColor : '#ffffff'}
                            onChange={(e) => {
                              const color = e.target.value;
                              setTextSettings({ ...textSettings, backgroundColor: color });
                              if (selectedElement) onUpdateElement?.(selectedElement.id, { backgroundColor: color });
                            }}
                            className="w-8 h-8 p-0 border-none bg-transparent cursor-pointer rounded"
                          />
                          <button 
                            className={`flex-1 py-1.5 rounded-lg border text-[10px] font-black uppercase transition-all ${selectedElement?.backgroundColor === 'transparent' ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-slate-50 border-slate-200 text-slate-400 hover:bg-slate-100'}`}
                            onClick={() => {
                              setTextSettings({ ...textSettings, backgroundColor: 'transparent' });
                              if (selectedElement) onUpdateElement?.(selectedElement.id, { backgroundColor: 'transparent' });
                            }}
                          >
                            Transparent
                          </button>
                        </div>
                      </div>

                      {/* Border / Outline Style */}
                      <div>
                        <div className="text-[9px] font-black uppercase text-slate-400 mb-2">Border & Outline</div>
                        <div className="flex gap-2">
                          <select 
                            className="flex-1 bg-slate-50 border border-slate-200 rounded-lg p-2 text-[10px] font-bold outline-none"
                            value={selectedElement?.outlineStyle || textSettings.outlineStyle || 'none'}
                            onChange={(e) => {
                              const style = e.target.value;
                              setTextSettings({ ...textSettings, outlineStyle: style as any });
                              if (selectedElement) onUpdateElement?.(selectedElement.id, { outlineStyle: style });
                            }}
                          >
                            <option value="none">No Border</option>
                            <option value="solid">Solid Line</option>
                            <option value="dashed">Dashed</option>
                            <option value="double">Double</option>
                          </select>
                          <input 
                            type="color" 
                            value={selectedElement?.outlineColor || textSettings.outlineColor || '#cbd5e1'}
                            onChange={(e) => {
                              const color = e.target.value;
                              setTextSettings({ ...textSettings, outlineColor: color });
                              if (selectedElement) onUpdateElement?.(selectedElement.id, { outlineColor: color });
                            }}
                            className="w-10 h-9 p-0 border-none bg-transparent cursor-pointer rounded"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Lists & Alignment Controls */}
              <div className="flex items-center gap-1.5 bg-slate-50 rounded-lg border border-slate-200 p-1">
                <ToolButton icon={<AlignLeft size={14} />} active={(selectedElement?.align || textSettings.align) === 'left'} onClick={() => { setTextSettings({...textSettings, align: 'left'}); if(selectedElement) onUpdateElement?.(selectedElement.id, {align: 'left'}); }} />
                <div className="relative">
                   <ToolButton icon={<List size={14} />} active={showBulletMenu} onClick={() => setShowBulletMenu(!showBulletMenu)} />
                   {showBulletMenu && (
                     <div className="absolute top-full right-0 mt-2 w-48 bg-white rounded-xl shadow-2xl border border-slate-100 p-2 z-[7000] animate-in fade-in slide-in-from-top-2">
                        {BULLETS.map(b => (
                          <button key={b.id} onClick={() => applyBullet(b)} className="w-full flex items-center gap-3 px-3 py-2 hover:bg-slate-50 rounded-lg text-xs font-bold text-slate-600">
                            <span className="w-4 h-4 flex items-center justify-center bg-slate-100 rounded text-[10px]">{b.char || '∅'}</span>
                            {b.label}
                          </button>
                        ))}
                     </div>
                   )}
                </div>
                <div className="relative">
                   <ToolButton icon={<ListOrdered size={14} />} active={showNumberingMenu} onClick={() => setShowNumberingMenu(!showNumberingMenu)} />
                   {showNumberingMenu && (
                     <div className="absolute top-full right-0 mt-2 w-48 bg-white rounded-xl shadow-2xl border border-slate-100 p-2 z-[7000] animate-in fade-in slide-in-from-top-2">
                        {NUMBERING.map(n => (
                          <button key={n.id} onClick={() => applyNumbering(n)} className="w-full flex items-center gap-3 px-3 py-2 hover:bg-slate-50 rounded-lg text-xs font-bold text-slate-600">
                            <span className="w-4 h-4 flex items-center justify-center bg-slate-100 rounded text-[10px]">{n.label}</span>
                            {n.id === 'decimal' ? '1. 2. 3.' : 'I. II. III.'}
                          </button>
                        ))}
                        <div className="h-px bg-slate-100 my-1 mx-2" />
                        <button onClick={() => applyMultilevel('nested')} className="w-full flex items-center gap-3 px-3 py-2 hover:bg-slate-50 rounded-lg text-xs font-bold text-slate-600">
                          <Indent size={12} className="text-slate-400" /> Nested List
                        </button>
                        <button onClick={() => applyMultilevel('legal')} className="w-full flex items-center gap-3 px-3 py-2 hover:bg-slate-50 rounded-lg text-xs font-bold text-slate-600">
                          <Indent size={12} className="text-slate-400" /> Legal List
                        </button>
                     </div>
                   )}
                </div>
                <ToolButton icon={<Maximize2 size={14} />} onClick={() => onUpdateElement?.(selectedElement.id, { _fitToContent: true })} title="Fit to Content" />
              </div>
            </div>
          )}

          {/* Shape Selection Properties */}
          {selectedElement && selectedElement.type === 'shape' && (
            <div className="flex items-center gap-3 animate-in fade-in slide-in-from-bottom-1 duration-200">
               <div className="text-[9px] font-black uppercase text-slate-400">Shape Styling</div>
               <div className="flex items-center gap-1.5 p-1 bg-slate-50 rounded-lg border border-slate-200">
                  <input 
                    type="color" 
                    value={selectedElement.fill || '#cbd5e1'} 
                    onChange={(e) => onUpdateElement?.(selectedElement.id, { fill: e.target.value })}
                    className="w-5 h-5 p-0 border-none bg-transparent cursor-pointer rounded-full"
                    title="Fill Color"
                  />
                  <div className="w-px h-4 bg-slate-200 mx-1" />
                  <input 
                    type="color" 
                    value={selectedElement.stroke || '#000000'} 
                    onChange={(e) => onUpdateElement?.(selectedElement.id, { stroke: e.target.value })}
                    className="w-5 h-5 p-0 border-none bg-transparent cursor-pointer rounded-full"
                    title="Stroke Color"
                  />
               </div>
               <div className="flex items-center gap-1.5 bg-slate-50 rounded-lg border border-slate-200 px-2 py-1">
                  <span className="text-[9px] font-black text-slate-400 uppercase">Weight</span>
                  <button onClick={() => onUpdateElement?.(selectedElement.id, { strokeWidth: Math.max(0, (selectedElement.strokeWidth || 1) - 1) })} className="p-1 hover:bg-white rounded transition-colors"><Minus size={12}/></button>
                  <span className="text-[10px] font-black w-4 text-center">{selectedElement.strokeWidth || 1}</span>
                  <button onClick={() => onUpdateElement?.(selectedElement.id, { strokeWidth: (selectedElement.strokeWidth || 1) + 1 })} className="p-1 hover:bg-white rounded transition-colors"><Plus size={12}/></button>
               </div>
            </div>
          )}

          {/* Empty State */}
          {!['pen', 'highlighter', 'text'].includes(activeTool) && (!selectedElement || selectedElement.type === 'image') && (
            <div className="text-[10px] font-black uppercase text-slate-300 tracking-[0.2em] animate-in fade-in duration-500">
              Select an element or tool to edit properties
            </div>
          )}

        </div>

        <div className="toolbar-divider" />

        {/* Group 5: Page & Export (Dropdown) */}
        <div className="relative">
          <button 
            onClick={() => setShowPageMenu(!showPageMenu)}
            className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-900 text-white shadow-lg shadow-slate-200 transition-all hover:bg-indigo-600"
          >
            <Layout size={16} />
            <span className="text-[10px] font-black uppercase tracking-wider">Page</span>
            <ChevronDown size={10} />
          </button>
          
          {showPageMenu && (
            <div className="absolute top-full right-0 mt-2 w-56 bg-white rounded-xl shadow-2xl border border-slate-100 p-3 z-[6000] animate-in fade-in slide-in-from-top-2">
              <div className="text-[9px] font-black uppercase text-slate-400 mb-2">Layout</div>
              <div className="flex gap-2 mb-4">
                <button 
                  onClick={() => setPageSettings({ ...pageSettings, orientation: 'portrait' })}
                  className={`flex-1 flex flex-col items-center gap-1 p-2 rounded-lg border-2 transition-all ${pageSettings.orientation === 'portrait' ? 'border-indigo-600 bg-indigo-50 text-indigo-600' : 'border-slate-50 text-slate-400'}`}
                >
                  <Rows size={16} /> <span className="text-[8px] font-black">PORTRAIT</span>
                </button>
                <button 
                  onClick={() => setPageSettings({ ...pageSettings, orientation: 'landscape' })}
                  className={`flex-1 flex flex-col items-center gap-1 p-2 rounded-lg border-2 transition-all ${pageSettings.orientation === 'landscape' ? 'border-indigo-600 bg-indigo-50 text-indigo-600' : 'border-slate-50 text-slate-400'}`}
                >
                  <Columns size={16} /> <span className="text-[8px] font-black">LANDSCAPE</span>
                </button>
              </div>
              
              <div className="text-[9px] font-black uppercase text-slate-400 mb-2">Template</div>
              <select 
                className="w-full bg-slate-50 border-none rounded-lg p-2 text-[10px] font-bold outline-none mb-4"
                value={pageSettings.template}
                onChange={(e) => setPageSettings({ ...pageSettings, template: e.target.value })}
              >
                <option value="blank">Blank Page</option>
                <option value="lined">Lined Paper</option>
                <option value="grid">Grid Layout</option>
                <option value="dotted">Dotted Grid</option>
              </select>

              <div className="h-px bg-slate-100 my-2" />
              <button 
                onClick={() => { onOpenExport?.(); setShowPageMenu(false); }}
                className="w-full flex items-center justify-between gap-3 px-3 py-3 bg-indigo-600 text-white rounded-xl text-xs font-black uppercase tracking-widest transition-all hover:bg-indigo-700 active:scale-95 shadow-lg shadow-indigo-200"
              >
                <div className="flex items-center gap-2">
                  <FileDown size={14} /> Export
                </div>
                <ChevronDown size={10} className="-rotate-90" />
              </button>
            </div>
          )}
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
