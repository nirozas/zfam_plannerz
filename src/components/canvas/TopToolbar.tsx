import React from 'react';
import {
    ArrowLeft,
    MousePointer,
    Pen,
    Highlighter,
    Eraser,
    Square,
    Type,
    Link,
    Image as ImageIcon,
    Sticker,
    ZoomIn,
    ZoomOut,
    RotateCcw,
    Maximize,
    Share2,
    MoreHorizontal,
    Cloud,
    Layout,
    Mic,
    Sparkles,
    Palette,
    Save,
    Search,
    Printer,
    Undo2,
    Redo2,
    Calendar,
    CalendarDays,
    Filter,
    XCircle,
    Scissors,
    Settings,
    Archive
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { usePlannerStore } from '@/store/plannerStore';
import { PlannerSettingsModal } from '../modals/PlannerSettingsModal';

const MONTHS = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];

const CATEGORY_MAP: Record<string, string[]> = {
    'Productivity': ['Daily Schedule', 'Weekly Schedule', 'Monthly Schedule', 'Daily To-Do List', 'Weekly To-Do List', 'Monthly To-Do List', 'Daily Routine', 'Weekly Routine', 'Monthly Routine', 'events'],
    'Wellness': ['Habits tracking', 'Mood tracking', 'Health tracking'],
    'Finance': ['Budgets', 'Expenses', 'Savings', 'Purchases'],
    'Academic': ['Schedules', 'Grades', 'projects', 'Study logs'],
    'Lifestyle': ['Travel', 'Reading', 'Hobbies', 'Home Organization', 'meal planning', 'Ideas'],
    'General': ['Blank', 'Lined', 'dotted', 'diagrams', 'notes']
};

interface TopToolbarProps {
    plannerName: string;
    onBack: () => void;
    activeTool: string;
    onToolSelect: (tool: any) => void;
    onClear: () => void;
    onDelete: () => void;
    onAI: () => void;
    onAssetHub: (tab: 'sticker' | 'image') => void;
    onTemplates: () => void;
    onVoice: () => void;
    onSave?: () => void;
    saving?: boolean;
    zoomScale: number;
    onZoomIn: () => void;
    onZoomOut: () => void;
    onZoomReset: () => void;
    onRenamePlanner?: (name: string) => void;
    pageTitle?: string;
    onRenamePage?: (name: string) => void;
    pageYear?: number | null;
    pageMonth?: string | null;
    pageCategory?: string | null;
    pageSection?: string | null;
    onUpdateMetadata?: (data: { year?: number | null, month?: string | null, category?: string | null, section?: string | null }) => void;
    onPrint?: () => void;
    onUndo?: () => void;
    onRedo?: () => void;
    canUndo?: boolean;
    canRedo?: boolean;
    onSearch?: () => void;
}

export function TopToolbar({
    plannerName,
    onBack,
    activeTool,
    onToolSelect,
    onAI,
    onAssetHub,
    onTemplates,
    onVoice,
    onSave,
    saving,
    zoomScale,
    onZoomIn,
    onZoomOut,
    onZoomReset,
    onRenamePlanner,
    pageTitle,
    onRenamePage,
    onPrint,
    onUndo,
    onRedo,
    canUndo,
    canRedo,
    onSearch,
    pageYear,
    pageMonth,
    pageCategory,
    pageSection,
    onUpdateMetadata
}: TopToolbarProps) {
    const navigate = useNavigate();
    const [showMenu, setShowMenu] = React.useState(false);
    const [showPlannerSettings, setShowPlannerSettings] = React.useState(false);
    const {
        activePlanner,
        currentYear,
        currentMonth,
        currentSection,
        currentCategory,
        setYearFilter,
        setMonthFilter,
        setSectionFilter,
        setCategoryFilter,
        libraryCategories,
        fetchLibraryAssets
    } = usePlannerStore();

    React.useEffect(() => {
        if (libraryCategories.length === 0) {
            fetchLibraryAssets('template');
        }
    }, [libraryCategories, fetchLibraryAssets]);

    const [activeFilter, setActiveFilter] = React.useState<'year' | 'month' | 'section' | 'category' | null>(null);

    return (
        <div className="top-toolbar bg-white border-b border-gray-200 flex flex-col z-30 shadow-sm px-2 md:px-4 py-1.5 md:py-2">
            {/* Row 1: Info & Global Actions */}
            <div className="flex items-center justify-between gap-2 mb-1.5 md:mb-2">
                <div className="flex items-center gap-1.5 md:gap-3 flex-1 overflow-hidden">
                    <button onClick={onBack} className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors shrink-0" title="Back">
                        <ArrowLeft className="h-4 w-4 md:h-5 md:w-5 text-gray-500" />
                    </button>

                    <div className="hidden sm:block w-px h-6 bg-gray-200 mx-0.5" />

                    {/* Editable Titles & Metadata */}
                    <div className="flex-1 min-w-0 max-w-[500px]">
                        <div className="flex items-center gap-2 mb-0.5">
                            <input
                                type="text"
                                value={plannerName}
                                onChange={(e) => onRenamePlanner?.(e.target.value)}
                                className="text-[11px] md:text-[13px] font-bold text-gray-900 leading-tight bg-transparent border-none focus:ring-0 p-0 w-auto min-w-[50px] max-w-[150px] truncate"
                                title="Rename Planner"
                            />
                            <div className="flex items-center gap-1 shrink-0 border-l border-gray-100 pl-2">
                                <span className="text-[9px] font-bold text-gray-300">YR</span>
                                <input
                                    type="text"
                                    value={pageYear || ''}
                                    onChange={(e) => onUpdateMetadata?.({ year: parseInt(e.target.value) || null })}
                                    className="text-[10px] md:text-[11px] font-black text-indigo-600 bg-transparent border-none focus:ring-0 p-0 w-[40px]"
                                    placeholder="2025"
                                />
                            </div>
                        </div>
                        <div className="flex items-center gap-2 whitespace-nowrap">
                            <input
                                type="text"
                                value={pageTitle || ''}
                                onChange={(e) => onRenamePage?.(e.target.value)}
                                placeholder="Untitled Page"
                                className="text-[9px] md:text-[10px] text-gray-400 font-medium bg-transparent border-none focus:ring-0 p-0 w-auto min-w-[60px] max-w-[120px] truncate"
                                title="Rename Page"
                            />

                            <div className="flex items-center gap-1.5 border-l border-gray-100 pl-2">
                                <select
                                    value={pageMonth || ''}
                                    onChange={(e) => onUpdateMetadata?.({ month: e.target.value || null })}
                                    className="text-[9px] md:text-[10px] font-bold text-indigo-500 bg-transparent border-none p-0 focus:ring-0 cursor-pointer uppercase"
                                >
                                    <option value="">Month</option>
                                    {MONTHS.map(m => <option key={m} value={m}>{m}</option>)}
                                </select>

                                <div className="flex items-center gap-0.5 ml-1">
                                    <select
                                        value={pageCategory || ''}
                                        onChange={(e) => {
                                            const newCat = e.target.value || null;
                                            onUpdateMetadata?.({
                                                category: newCat,
                                                section: (newCat && CATEGORY_MAP[newCat]?.includes(pageSection || '')) ? pageSection : null
                                            });
                                        }}
                                        className="text-[9px] md:text-[10px] font-bold text-gray-500 bg-transparent border-none p-0 focus:ring-0 cursor-pointer"
                                    >
                                        <option value="">Category</option>
                                        {Object.keys(CATEGORY_MAP).map(cat => <option key={cat} value={cat}>{cat}</option>)}
                                    </select>
                                    <span className="text-gray-300 font-bold">:</span>
                                    <select
                                        value={pageSection || ''}
                                        onChange={(e) => onUpdateMetadata?.({ section: e.target.value || null })}
                                        className="text-[9px] md:text-[10px] font-medium text-gray-400 bg-transparent border-none p-0 focus:ring-0 cursor-pointer"
                                        disabled={!pageCategory}
                                    >
                                        <option value="">Section</option>
                                        {pageCategory && CATEGORY_MAP[pageCategory]?.map(s => <option key={s} value={s}>{s}</option>)}
                                    </select>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Right Side Actions */}
                <div className="flex items-center gap-0.5 md:gap-1 shrink-0">
                    <button onClick={onSearch} className="p-1.5 md:p-2 hover:bg-indigo-50 rounded-lg text-gray-500 hover:text-indigo-600 transition-all" title="Search">
                        <Search className="h-4 w-4 md:h-5 md:w-5" />
                    </button>
                    <button onClick={onAI} className="p-1.5 md:p-2 hover:bg-indigo-50 rounded-lg text-gray-500 hover:text-indigo-600 transition-all" title="AI Assistant">
                        <Sparkles className="h-4 w-4 md:h-5 md:w-5" />
                    </button>

                    <div className="hidden md:flex items-center gap-2 border-l border-gray-100 pl-2 ml-1">
                        {saving ? (
                            <div className="flex items-center gap-1.5 text-indigo-500">
                                <div className="h-2 w-2 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
                                <span className="text-[9px] font-bold">SAVING</span>
                            </div>
                        ) : (
                            <div className="flex items-center gap-1 opacity-50">
                                <Cloud className="h-3.5 w-3.5 text-gray-400" />
                                <span className="text-[9px] font-bold text-gray-400">SAVED</span>
                            </div>
                        )}
                        {onSave && (
                            <button onClick={onSave} disabled={saving} className="p-1.5 hover:bg-indigo-50 rounded-lg text-gray-500 hover:text-indigo-600" title="Save">
                                <Save className="h-4 w-4" />
                            </button>
                        )}
                    </div>

                    <button onClick={onPrint} className="p-1.5 md:p-2 hover:bg-gray-100 rounded-lg text-gray-500" title="Print">
                        <Printer className="h-4 w-4 md:h-5 md:w-5" />
                    </button>

                    <button onClick={() => {
                        navigator.clipboard.writeText(window.location.href);
                        alert("Link copied!");
                    }} className="p-1.5 md:p-2 hover:bg-gray-100 rounded-lg text-gray-500" title="Share">
                        <Share2 className="h-4 w-4 md:h-5 md:w-5" />
                    </button>

                    <div className="relative">
                        <button onClick={() => setShowMenu(!showMenu)} className="p-1.5 md:p-2 hover:bg-gray-100 rounded-lg text-gray-500">
                            <MoreHorizontal className="h-4 w-4 md:h-5 md:w-5" />
                        </button>
                        {showMenu && (
                            <div className="absolute right-0 top-full mt-1 w-48 bg-white rounded-xl shadow-xl border border-gray-100 p-1.5 z-[100]">
                                <button onClick={() => { setShowMenu(false); if (confirm('Duplicate?')) usePlannerStore.getState().duplicatePlanner(activePlanner?.id || ''); }} className="w-full text-left px-3 py-2 text-xs text-gray-700 hover:bg-gray-50 rounded-lg flex items-center gap-2">
                                    <Layout size={14} className="text-gray-400" /> Duplicate Planner
                                </button>
                                <button onClick={() => { setShowMenu(false); setShowPlannerSettings(true); }} className="w-full text-left px-3 py-2 text-xs text-gray-700 hover:bg-gray-50 rounded-lg flex items-center gap-2">
                                    <Layout size={14} className="text-gray-400" /> Planner Settings
                                </button>
                                <button onClick={() => { setShowMenu(false); navigate('/settings'); }} className="w-full text-left px-3 py-2 text-xs text-indigo-600 hover:bg-indigo-50 rounded-lg flex items-center gap-2">
                                    <Settings size={14} /> Workspace Settings
                                </button>
                                <button onClick={() => { usePlannerStore.getState().archivePlanner(activePlanner?.id || ''); setShowMenu(false); }} className="w-full text-left px-3 py-2 text-xs text-red-600 hover:bg-red-50 rounded-lg flex items-center gap-2">
                                    <Archive size={14} /> Archive
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Row 2: Tools, Filters & Zoom */}
            <div className="flex items-center justify-between gap-2 overflow-x-auto no-scrollbar scroll-smooth">
                <div className="flex items-center gap-0.5 md:gap-1 shrink-0">
                    <div className="flex items-center gap-0.5 bg-gray-50 p-0.5 rounded-lg border border-gray-100">
                        <ToolButton icon={<MousePointer size={16} />} active={activeTool === 'select'} onClick={() => onToolSelect('select')} />
                        <ToolButton icon={<Scissors size={16} />} active={activeTool === 'lasso'} onClick={() => onToolSelect('lasso')} />
                        <ToolButton icon={<Pen size={16} />} active={activeTool === 'pen'} onClick={() => onToolSelect('pen')} />
                        <ToolButton icon={<Highlighter size={16} />} active={activeTool === 'highlighter'} onClick={() => onToolSelect('highlighter')} />
                        <ToolButton icon={<Eraser size={16} />} active={activeTool === 'eraser'} onClick={() => onToolSelect('eraser')} />
                        <ToolButton icon={<Square size={16} />} active={activeTool === 'shape'} onClick={() => onToolSelect('shape')} />
                        <div className="w-px h-4 bg-gray-200 mx-0.5" />
                        <ToolButton icon={<Type size={16} />} active={activeTool === 'text'} onClick={() => onToolSelect('text')} />
                        <ToolButton icon={<Sticker size={16} />} active={activeTool === 'sticker'} onClick={() => { onToolSelect('sticker'); onAssetHub('sticker'); }} />
                        <ToolButton icon={<Link size={16} />} active={activeTool === 'link'} onClick={() => onToolSelect('link')} />
                        <ToolButton icon={<ImageIcon size={16} />} active={activeTool === 'image'} onClick={() => { onToolSelect('image'); onAssetHub('image'); }} />
                        <ToolButton icon={<Layout size={16} />} active={activeTool === 'templates'} onClick={() => { onToolSelect('templates'); onTemplates(); }} />
                        <ToolButton icon={<Mic size={16} />} active={activeTool === 'voice'} onClick={() => { onToolSelect('voice'); onVoice(); }} />
                    </div>

                    <div className="w-px h-6 bg-gray-200 mx-1" />

                    {/* Quick Undo/Redo & Background */}
                    <div className="flex items-center gap-0.5">
                        <button onClick={onUndo} disabled={!canUndo} className={cn("p-1.5 rounded-lg transition-all", canUndo ? "hover:bg-gray-100 text-gray-600" : "text-gray-200 opacity-50")}>
                            <Undo2 size={14} />
                        </button>
                        <button onClick={onRedo} disabled={!canRedo} className={cn("p-1.5 rounded-lg transition-all", canRedo ? "hover:bg-gray-100 text-gray-600" : "text-gray-200 opacity-50")}>
                            <Redo2 size={14} />
                        </button>
                        <button onClick={() => onToolSelect('background')} className={cn("p-1.5 rounded-lg transition-all", activeTool === 'background' ? "bg-indigo-50 text-indigo-600" : "hover:bg-gray-100 text-gray-500")}>
                            <Palette size={16} />
                        </button>
                    </div>

                    <div className="w-px h-6 bg-gray-200 mx-1" />

                    {/* Filters - Compact */}
                    <div className="flex items-center gap-1 bg-white p-0.5 rounded-lg shadow-sm border border-gray-100">
                        <FilterSelector label={currentYear?.toString() || 'YEAR'} active={activeFilter === 'year'} onClick={() => setActiveFilter(activeFilter === 'year' ? null : 'year')} icon={<Calendar size={12} />} />
                        <FilterSelector label={currentMonth || 'MONTH'} active={activeFilter === 'month'} onClick={() => setActiveFilter(activeFilter === 'month' ? null : 'month')} icon={<CalendarDays size={12} />} />
                        <FilterSelector label={currentSection || 'SECTION'} active={activeFilter === 'section'} onClick={() => setActiveFilter(activeFilter === 'section' ? null : 'section')} icon={<Layout size={12} />} />
                        <FilterSelector label={currentCategory || 'CATEGORY'} active={activeFilter === 'category'} onClick={() => setActiveFilter(activeFilter === 'category' ? null : 'category')} icon={<Filter size={12} />} />

                        {(currentYear || currentMonth || currentSection || currentCategory) && (
                            <button onClick={() => { setYearFilter(null); setMonthFilter(null); setSectionFilter(null); setCategoryFilter(null); }} className="p-1 text-gray-300 hover:text-red-500">
                                <XCircle size={14} />
                            </button>
                        )}
                    </div>
                </div>

                {/* Zoom Controls */}
                <div className="flex items-center gap-1.5 bg-gray-50/50 p-1 rounded-lg border border-gray-100 shrink-0">
                    <div className="flex items-center gap-0.5">
                        <button onClick={onZoomOut} className="p-1 hover:bg-white rounded-md text-gray-400"><ZoomOut size={14} /></button>
                        <span className="text-[10px] font-black text-indigo-600 min-w-[30px] text-center">{Math.round(zoomScale * 100)}%</span>
                        <button onClick={onZoomIn} className="p-1 hover:bg-white rounded-md text-gray-400"><ZoomIn size={14} /></button>
                    </div>
                    <div className="w-px h-4 bg-gray-200" />
                    <button onClick={onZoomReset} className="p-1 hover:bg-white rounded-md text-gray-400"><RotateCcw size={14} /></button>
                    <button className="p-1 hover:bg-white rounded-md text-gray-400"><Maximize size={14} /></button>
                </div>
            </div>

            {/* Filter Dropdowns Positioning */}
            {activeFilter && (
                <div className="relative">
                    {activeFilter === 'year' && <FilterDropdown onClose={() => setActiveFilter(null)} options={Array.from(new Set(activePlanner?.pages?.map(p => p.year).filter(Boolean) || [])).sort() as number[]} onSelect={setYearFilter} selected={currentYear} />}
                    {activeFilter === 'month' && <FilterDropdown onClose={() => setActiveFilter(null)} options={['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC']} onSelect={(val) => setMonthFilter(val as any)} selected={currentMonth} />}
                    {activeFilter === 'section' && <FilterDropdown onClose={() => setActiveFilter(null)} options={Array.from(new Set(activePlanner?.pages?.map(p => p.section).filter(Boolean) || [])).sort() as string[]} onSelect={(val) => setSectionFilter(val as any)} selected={currentSection} />}
                    {activeFilter === 'category' && <FilterDropdown onClose={() => setActiveFilter(null)} options={Array.from(new Set([...libraryCategories, ...(activePlanner?.pages?.map(p => p.category).filter(Boolean) as string[] || [])])).sort() as string[]} onSelect={(val) => setCategoryFilter(val as any)} selected={currentCategory} />}
                </div>
            )}

            <PlannerSettingsModal isOpen={showPlannerSettings} onClose={() => setShowPlannerSettings(false)} />
        </div>
    );
}

function ToolButton({ icon, active, onClick }: { icon: React.ReactNode, active: boolean, onClick: () => void }) {
    return (
        <button
            onClick={onClick}
            className={cn(
                "p-1.5 md:p-2 rounded-md transition-all flex items-center justify-center shrink-0",
                active ? "bg-white shadow-sm ring-1 ring-gray-100 text-indigo-600" : "text-gray-500 hover:bg-white hover:text-gray-900"
            )}
        >
            {icon}
        </button>
    );
}

function FilterSelector({ label, active, onClick, icon }: { label: string, active: boolean, onClick: () => void, icon: React.ReactNode }) {
    return (
        <button
            onClick={onClick}
            className={cn(
                "flex items-center gap-1 px-1.5 py-1 rounded-md transition-all",
                active ? "bg-indigo-50 text-indigo-600" : "hover:bg-gray-50 text-gray-400"
            )}
        >
            {icon}
            <span className="text-[9px] font-bold uppercase truncate max-w-[50px]">{label}</span>
        </button>
    );
}

function FilterDropdown({ options, onSelect, selected, onClose }: { options: (string | number)[], onSelect: (val: any) => void, selected: any, onClose: () => void }) {
    return (
        <div className="fixed inset-0 z-[200]" onClick={onClose}>
            <div
                className="absolute bg-white rounded-xl shadow-2xl border border-gray-100 p-1.5 w-40 max-h-60 overflow-y-auto animate-in fade-in zoom-in-95"
                style={{ top: '80px', left: '10%' }}
                onClick={e => e.stopPropagation()}
            >
                {options.map(opt => (
                    <button
                        key={opt}
                        onClick={() => { onSelect(opt); onClose(); }}
                        className={cn(
                            "w-full text-left px-3 py-2 text-[11px] font-bold rounded-lg transition-colors",
                            selected === opt ? "bg-indigo-50 text-indigo-600" : "text-gray-600 hover:bg-gray-50"
                        )}
                    >
                        {opt}
                    </button>
                ))}
            </div>
        </div>
    );
}
