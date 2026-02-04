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
    Plus,
    Tags,
    Scissors
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { usePlannerStore } from '@/store/plannerStore';
import { PlannerSettingsModal } from '../modals/PlannerSettingsModal';

interface TopToolbarProps {
    plannerName: string;
    currentPage: number;
    totalPages: number;
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
    onPrint?: () => void;
    onUndo?: () => void;
    onRedo?: () => void;
    canUndo?: boolean;
    canRedo?: boolean;
    onSearch?: () => void;
}

export function TopToolbar({
    plannerName,
    currentPage,
    totalPages,
    onBack,
    activeTool,
    onToolSelect,
    onClear,
    onDelete,
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
    onSearch
}: TopToolbarProps) {
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
        fetchLibraryAssets,
        updatePageMetadata,
        currentPageIndex
    } = usePlannerStore();

    React.useEffect(() => {
        if (libraryCategories.length === 0) {
            fetchLibraryAssets('template');
        }
    }, [libraryCategories, fetchLibraryAssets]);
    const [activeFilter, setActiveFilter] = React.useState<'year' | 'month' | 'section' | 'category' | null>(null);

    return (
        <div className="top-toolbar bg-white border-b border-gray-200 flex flex-col z-30 shadow-sm px-4 md:px-6 py-2">
            {/* Top Row: Info & Actions */}
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 mb-3">
                <div className="flex items-center gap-3 lg:gap-6 overflow-hidden">
                    <button onClick={onBack} className="p-1 hover:bg-gray-100 rounded-lg transition-colors" title="Back">
                        <ArrowLeft className="h-5 w-5 text-gray-500" />
                    </button>

                    {/* Editable Planner Name */}
                    <div>
                        <input
                            type="text"
                            value={plannerName}
                            onChange={(e) => onRenamePlanner?.(e.target.value)}
                            className="text-sm font-bold text-gray-900 leading-tight bg-transparent border-b border-transparent hover:border-gray-300 focus:border-indigo-500 outline-none transition-all w-40 truncate"
                            title="Rename Planner"
                        />
                        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-1">
                            <p className="text-[10px] text-gray-400 font-medium whitespace-nowrap shrink-0">Page {currentPage} of {totalPages}</p>
                            <span className="text-[10px] text-gray-300">|</span>
                            {/* Editable Page Title */}
                            <input
                                type="text"
                                value={pageTitle || ''}
                                onChange={(e) => onRenamePage?.(e.target.value)}
                                placeholder="Untitled Page"
                                className="text-[10px] text-gray-500 font-medium bg-transparent border-b border-transparent hover:border-gray-300 focus:border-indigo-500 outline-none transition-all w-24 truncate"
                                title="Rename Page"
                            />
                            <span className="text-[10px] text-gray-300">|</span>

                            {/* Page Metadata Editors (Scrollable on mobile) */}
                            <div className="flex items-center gap-1.5 shrink-0 pr-4">
                                {/* Year Editor */}
                                <input
                                    type="number"
                                    value={activePlanner?.pages?.[currentPageIndex]?.year || ''}
                                    onChange={(e) => {
                                        const val = e.target.value ? parseInt(e.target.value) : null;
                                        updatePageMetadata(activePlanner?.pages?.[currentPageIndex]?.id || '', { year: val });
                                    }}
                                    placeholder="Year"
                                    className="text-[10px] text-gray-400 bg-transparent border-b border-transparent hover:border-gray-200 focus:border-indigo-400 outline-none w-10 text-center"
                                    title="Edit Page Year"
                                />

                                {/* Month Editor Dropdown */}
                                <select
                                    value={activePlanner?.pages?.[currentPageIndex]?.month || ''}
                                    onChange={(e) => {
                                        const val = e.target.value || null;
                                        updatePageMetadata(activePlanner?.pages?.[currentPageIndex]?.id || '', { month: val });
                                    }}
                                    className="text-[10px] text-gray-400 bg-transparent border-none focus:ring-0 cursor-pointer hover:text-indigo-600 transition-colors uppercase font-bold"
                                    title="Edit Page Month"
                                >
                                    <option value="">Month</option>
                                    {['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'].map(m => (
                                        <option key={m} value={m}>{m}</option>
                                    ))}
                                </select>

                                {/* Section Editor (Text + Search-like) */}
                                <input
                                    type="text"
                                    value={activePlanner?.pages?.[currentPageIndex]?.section || ''}
                                    onChange={(e) => {
                                        const val = e.target.value || null;
                                        updatePageMetadata(activePlanner?.pages?.[currentPageIndex]?.id || '', { section: val });
                                    }}
                                    placeholder="Section"
                                    className="text-[10px] text-gray-400 bg-transparent border-b border-transparent hover:border-gray-200 focus:border-indigo-400 outline-none w-16 px-1"
                                    title="Edit Page Section"
                                />

                                {/* Category Editor Dropdown */}
                                <div className="flex items-center gap-0.5">
                                    <Tags className="h-3 w-3 text-gray-300" />
                                    <select
                                        value={activePlanner?.pages?.[currentPageIndex]?.category || ''}
                                        onChange={(e) => {
                                            const val = e.target.value || null;
                                            updatePageMetadata(activePlanner?.pages?.[currentPageIndex]?.id || '', { category: val });
                                        }}
                                        className="text-[10px] text-gray-400 bg-transparent border-none focus:ring-0 cursor-pointer hover:text-indigo-600 transition-colors uppercase font-bold max-w-[80px]"
                                        title="Edit Page Category"
                                    >
                                        <option value="">Category</option>
                                        {Array.from(new Set([...libraryCategories, ...(activePlanner?.pages?.map(p => p.category).filter(Boolean) as string[] || [])])).map(c => (
                                            <option key={c} value={c}>{c}</option>
                                        ))}
                                    </select>
                                    <button
                                        onClick={() => {
                                            const newCat = prompt("Enter new category name:");
                                            if (newCat) {
                                                updatePageMetadata(activePlanner?.pages?.[currentPageIndex]?.id || '', { category: newCat.toUpperCase() });
                                            }
                                        }}
                                        className="p-1 hover:bg-gray-100 rounded text-gray-400 hover:text-indigo-600 transition-all"
                                        title="Add New Category"
                                    >
                                        <Plus className="h-3 w-3" />
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="flex items-center gap-2 lg:gap-4 ml-auto lg:ml-0 flex-wrap md:flex-nowrap py-1">
                    {/* Sidebar Search Toggle */}
                    <button
                        onClick={onSearch}
                        className="p-2 hover:bg-indigo-50 rounded-xl transition-all text-gray-500 hover:text-indigo-600"
                        title="Search In Planner"
                    >
                        <Search className="h-5 w-5" />
                    </button>

                    <div className="flex items-center gap-2">
                        <div className="flex items-center gap-2 text-[11px] font-bold text-gray-400">
                            {saving ? (
                                <div className="flex items-center gap-2 text-indigo-500">
                                    <div className="h-3 w-3 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
                                    <span>Saving...</span>
                                </div>
                            ) : (
                                <div className="flex items-center gap-1.5 grayscale opacity-50">
                                    <Cloud className="h-4 w-4" />
                                    <span>Saved</span>
                                </div>
                            )}
                        </div>
                        {onSave && (
                            <button
                                onClick={onSave}
                                disabled={saving}
                                className={cn(
                                    "p-2 rounded-xl transition-all",
                                    saving
                                        ? "opacity-50 cursor-not-allowed text-gray-400"
                                        : "hover:bg-indigo-50 text-gray-500 hover:text-indigo-600"
                                )}
                                title="Save Now"
                            >
                                <Save className="h-5 w-5" />
                            </button>
                        )}
                    </div>
                    <button onClick={onAI} className="p-2 hover:bg-indigo-50 rounded-xl transition-all text-gray-500 hover:text-indigo-600">
                        <Sparkles className="h-5 w-5" />
                    </button>
                    <button
                        onClick={onPrint}
                        className="p-2 hover:bg-gray-100 rounded-xl transition-all text-gray-500"
                        title="Print Planner"
                    >
                        <Printer className="h-5 w-5" />
                    </button>
                    <button
                        onClick={() => {
                            // Quick Share: Copy URL
                            navigator.clipboard.writeText(window.location.href);
                            alert("Planner Link copied to clipboard!");
                        }}
                        className="p-2 hover:bg-gray-100 rounded-xl transition-all text-gray-500"
                        title="Share Link"
                    >
                        <Share2 className="h-5 w-5" />
                    </button>

                    <div className="relative">
                        <button
                            onClick={() => setShowMenu(!showMenu)}
                            className="p-2 hover:bg-gray-100 rounded-xl transition-all text-gray-500"
                        >
                            <MoreHorizontal className="h-5 w-5" />
                        </button>

                        {showMenu && (
                            <div className="absolute right-0 top-full mt-2 w-56 bg-white rounded-xl shadow-xl border border-gray-100 p-2 z-50 animate-in fade-in zoom-in-95 duration-200">

                                <button onClick={() => {
                                    setShowMenu(false);
                                    if (confirm('Duplicate this planner?')) {
                                        usePlannerStore.getState().duplicatePlanner(usePlannerStore.getState().activePlanner?.id || '');
                                    }
                                }} className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 rounded-lg flex items-center gap-2">
                                    Duplicate Planner
                                </button>
                                <button onClick={() => {
                                    setShowMenu(false);
                                    setShowPlannerSettings(true);
                                }} className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 rounded-lg flex items-center gap-2">
                                    Planner Settings
                                </button>
                                <button onClick={() => {
                                    usePlannerStore.getState().archivePlanner(usePlannerStore.getState().activePlanner?.id || '');
                                    setShowMenu(false);
                                    alert("Planner Archived!");
                                }} className="w-full text-left px-3 py-2 text-sm text-red-600 hover:bg-red-50 rounded-lg flex items-center gap-2">
                                    Archive Planner
                                </button>
                            </div>
                        )}
                        <PlannerSettingsModal
                            isOpen={showPlannerSettings}
                            onClose={() => setShowPlannerSettings(false)}
                        />
                    </div>
                </div>
            </div>

            {/* Main Bar: Tools */}
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-2">
                <div className="flex items-center gap-1 bg-gray-50/80 p-1 rounded-2xl border border-gray-100 flex-wrap lg:flex-nowrap max-w-full">
                    <ToolButton
                        icon={<MousePointer className="h-4 w-4" />}
                        active={activeTool === 'select'}
                        onClick={() => onToolSelect('select')}
                    />
                    <ToolButton
                        icon={<Scissors className="h-4 w-4" />}
                        active={activeTool === 'lasso'}
                        onClick={() => onToolSelect('lasso')}
                    />
                    <ToolButton
                        icon={<div className="relative">
                            <Pen className="h-5 w-5" />
                            <div className="absolute -bottom-0.5 -right-0.5 w-2 h-2 rounded-full border border-white bg-orange-500" />
                        </div>}
                        active={activeTool === 'pen'}
                        onClick={() => onToolSelect('pen')}
                    />
                    <ToolButton
                        icon={<div className="relative">
                            <Highlighter className="h-5 w-5" />
                            <div className="absolute -bottom-0.5 -right-0.5 w-2 h-2 rounded-full border border-white bg-yellow-400" />
                        </div>}
                        active={activeTool === 'highlighter'}
                        onClick={() => onToolSelect('highlighter')}
                    />
                    <ToolButton
                        icon={<Eraser className="h-5 w-5" />}
                        active={activeTool === 'eraser'}
                        onClick={() => onToolSelect('eraser')}
                    />
                    <ToolButton
                        icon={<div className="flex flex-col items-center">
                            <Square className="h-5 w-5" />
                            <div className="w-1.5 h-1.5 rounded-full bg-blue-500 mt-0.5" />
                        </div>}
                        active={activeTool === 'shape'}
                        onClick={() => onToolSelect('shape')}
                    />
                    <div className="w-px h-8 bg-gray-200 mx-1" />
                    <ToolButton icon={<Type className="h-5 w-5" />} active={activeTool === 'text'} onClick={() => onToolSelect('text')} />
                    <ToolButton
                        icon={<Sticker className="h-5 w-5" />}
                        active={activeTool === 'sticker'}
                        onClick={() => {
                            onToolSelect('sticker');
                            onAssetHub('sticker');
                        }}
                    />
                    <ToolButton
                        icon={<Link className="h-5 w-5" />}
                        active={activeTool === 'link'}
                        onClick={() => onToolSelect('link')}
                    />
                    <ToolButton
                        icon={<ImageIcon className="h-5 w-5" />}
                        active={activeTool === 'image'}
                        onClick={() => {
                            onToolSelect('image');
                            onAssetHub('image');
                        }}
                    />
                    <div className="w-px h-8 bg-gray-200 mx-1" />
                    <ToolButton
                        icon={<Layout className="h-5 w-5" />}
                        active={activeTool === 'templates'}
                        onClick={() => {
                            onToolSelect('templates');
                            onTemplates();
                        }}
                    />
                    <ToolButton
                        icon={<Mic className="h-5 w-5" />}
                        active={activeTool === 'voice'}
                        onClick={() => {
                            onToolSelect('voice');
                            onVoice();
                        }}
                    />

                    <div className="w-px h-8 bg-gray-200 mx-1" />

                    <div className="flex items-center gap-1 bg-white p-1 rounded-xl shadow-sm border border-gray-100 shrink-0">
                        {/* Year Filter */}
                        <div className="relative">
                            <button
                                onClick={() => setActiveFilter(activeFilter === 'year' ? null : 'year')}
                                className={cn(
                                    "p-2 rounded-lg transition-all flex items-center gap-1.5",
                                    currentYear ? "bg-indigo-50 text-indigo-600" : "hover:bg-gray-50 text-gray-500"
                                )}
                                title="Filter by Year"
                            >
                                <Calendar className="h-4 w-4" />
                                <span className="text-[10px] font-bold uppercase">{currentYear || 'Year'}</span>
                            </button>
                            {activeFilter === 'year' && (
                                <div className="absolute top-full left-0 mt-2 w-32 bg-white rounded-xl shadow-xl border border-gray-100 p-1 z-50 animate-in fade-in slide-in-from-top-1">
                                    <button onClick={() => { setYearFilter(null); setActiveFilter(null); }} className="w-full text-left px-3 py-1.5 text-[10px] font-medium text-gray-400 hover:bg-gray-50 rounded-lg">Clear Filter</button>
                                    {Array.from(new Set(activePlanner?.pages?.map(p => p.year).filter(Boolean) || [])).sort().map(year => (
                                        <button
                                            key={year as number}
                                            onClick={() => { setYearFilter(year as number); setActiveFilter(null); }}
                                            className={cn("w-full text-left px-3 py-1.5 text-[10px] font-bold rounded-lg transition-colors", currentYear === year ? "bg-indigo-50 text-indigo-600" : "text-gray-600 hover:bg-gray-50")}
                                        >
                                            {year as number}
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Month Filter (Adaptive) */}
                        <div className="relative">
                            <button
                                onClick={() => setActiveFilter(activeFilter === 'month' ? null : 'month')}
                                className={cn(
                                    "p-2 rounded-lg transition-all flex items-center gap-1.5",
                                    currentMonth ? "bg-indigo-50 text-indigo-600" : "hover:bg-gray-50 text-gray-500"
                                )}
                                title="Filter by Month"
                            >
                                <CalendarDays className="h-4 w-4" />
                                <span className="text-[10px] font-bold uppercase">{currentMonth || 'Month'}</span>
                            </button>
                            {activeFilter === 'month' && (
                                <div className="absolute top-full left-0 mt-2 w-32 bg-white rounded-xl shadow-xl border border-gray-100 p-1 z-50 animate-in fade-in slide-in-from-top-1">
                                    <button onClick={() => { setMonthFilter(null); setActiveFilter(null); }} className="w-full text-left px-3 py-1.5 text-[10px] font-medium text-gray-400 hover:bg-gray-50 rounded-lg">Clear Filter</button>
                                    {Array.from(new Set(
                                        (activePlanner?.pages || [])
                                            .filter(p => !currentYear || p.year === currentYear)
                                            .map(p => p.month)
                                            .filter(Boolean)
                                    )).sort().map(month => (
                                        <button
                                            key={month as string}
                                            onClick={() => { setMonthFilter(month as string); setActiveFilter(null); }}
                                            className={cn("w-full text-left px-3 py-1.5 text-[10px] font-bold rounded-lg transition-colors", currentMonth === month ? "bg-indigo-50 text-indigo-600" : "text-gray-600 hover:bg-gray-50")}
                                        >
                                            {month as string}
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Section Filter */}
                        <div className="relative">
                            <button
                                onClick={() => setActiveFilter(activeFilter === 'section' ? null : 'section')}
                                className={cn(
                                    "p-2 rounded-lg transition-all flex items-center gap-1.5",
                                    currentSection ? "bg-indigo-50 text-indigo-600" : "hover:bg-gray-50 text-gray-500"
                                )}
                                title="Filter by Section"
                            >
                                <Layout className="h-4 w-4" />
                                <span className="text-[10px] font-bold uppercase">{currentSection || 'Section'}</span>
                            </button>
                            {activeFilter === 'section' && (
                                <div className="absolute top-full left-0 mt-2 w-40 bg-white rounded-xl shadow-xl border border-gray-100 p-1 z-50 animate-in fade-in slide-in-from-top-1">
                                    <button onClick={() => { setSectionFilter(null); setActiveFilter(null); }} className="w-full text-left px-3 py-1.5 text-[10px] font-medium text-gray-400 hover:bg-gray-50 rounded-lg">Clear Filter</button>
                                    {Array.from(new Set(
                                        (activePlanner?.pages || [])
                                            .filter(p => (!currentYear || p.year == currentYear) && (!currentMonth || p.month === currentMonth))
                                            .map(p => p.section)
                                            .filter(Boolean)
                                    )).sort().map(sec => (
                                        <button
                                            key={sec as string}
                                            onClick={() => { setSectionFilter(sec as string); setActiveFilter(null); }}
                                            className={cn("w-full text-left px-3 py-2 text-[10px] font-bold rounded-lg transition-colors", currentSection === sec ? "bg-indigo-50 text-indigo-600" : "text-gray-600 hover:bg-gray-50")}
                                        >
                                            {sec as string}
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Category Filter */}
                        <div className="relative">
                            <button
                                onClick={() => setActiveFilter(activeFilter === 'category' ? null : 'category')}
                                className={cn(
                                    "p-2 rounded-lg transition-all flex items-center gap-1.5",
                                    currentCategory ? "bg-indigo-50 text-indigo-600" : "hover:bg-gray-50 text-gray-500"
                                )}
                                title="Filter by Category"
                            >
                                <Filter className="h-4 w-4" />
                                <span className="text-[10px] font-bold uppercase">{currentCategory || 'Category'}</span>
                            </button>
                            {activeFilter === 'category' && (
                                <div className="absolute top-full left-0 mt-2 w-40 bg-white rounded-xl shadow-xl border border-gray-100 p-1 z-50 animate-in fade-in slide-in-from-top-1">
                                    <button onClick={() => { setCategoryFilter(null); setActiveFilter(null); }} className="w-full text-left px-3 py-1.5 text-[10px] font-medium text-gray-400 hover:bg-gray-50 rounded-lg">Clear Filter</button>
                                    {Array.from(new Set(
                                        (activePlanner?.pages || [])
                                            .filter(p => (!currentYear || p.year == currentYear) && (!currentMonth || p.month === currentMonth) && (!currentSection || p.section === currentSection))
                                            .map(p => p.category)
                                            .filter(Boolean)
                                    )).sort().map(cat => (
                                        <button
                                            key={cat as string}
                                            onClick={() => { setCategoryFilter(cat as string); setActiveFilter(null); }}
                                            className={cn("w-full text-left px-3 py-2 text-[10px] font-bold rounded-lg transition-colors", currentCategory === cat ? "bg-indigo-50 text-indigo-600" : "text-gray-600 hover:bg-gray-50")}
                                        >
                                            {cat as string}
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>

                        {(currentYear || currentMonth || currentSection || currentCategory) && (
                            <button
                                onClick={() => { setYearFilter(null); setMonthFilter(null); setSectionFilter(null); setCategoryFilter(null); }}
                                className="p-2 text-gray-300 hover:text-red-500 transition-colors"
                                title="Clear All Filters"
                            >
                                <XCircle className="h-4 w-4" />
                            </button>
                        )}
                    </div>
                </div>

                <div className="flex items-center gap-3 lg:gap-6 overflow-x-auto no-scrollbar py-1">
                    <div className="flex items-center gap-2 lg:gap-4 border-r border-gray-200 pr-3 lg:pr-6 lg:mr-1 shrink-0">
                        <button
                            onClick={onDelete}
                            className="text-[10px] lg:text-[11px] font-bold text-red-500 hover:text-red-600 transition-colors"
                        >
                            DELETE
                        </button>
                        <button
                            onClick={onClear}
                            className="text-[10px] lg:text-[11px] font-bold text-gray-400 hover:text-gray-600 transition-colors"
                        >
                            CLEAR
                        </button>
                        <div className="w-px h-6 bg-gray-200 mx-1 lg:mx-2" />

                        {/* Undo/Redo Buttons */}
                        <div className="flex items-center gap-1">
                            <button
                                onClick={onUndo}
                                disabled={!canUndo}
                                className={cn(
                                    "p-1.5 lg:p-2 rounded-xl transition-all",
                                    canUndo
                                        ? "hover:bg-gray-100 text-gray-600"
                                        : "text-gray-300 cursor-not-allowed"
                                )}
                                title="Undo (Ctrl+Z)"
                            >
                                <Undo2 className="h-4 w-4" />
                            </button>
                            <button
                                onClick={onRedo}
                                disabled={!canRedo}
                                className={cn(
                                    "p-1.5 lg:p-2 rounded-xl transition-all",
                                    canRedo
                                        ? "hover:bg-gray-100 text-gray-600"
                                        : "text-gray-300 cursor-not-allowed"
                                )}
                                title="Redo (Ctrl+Y)"
                            >
                                <Redo2 className="h-4 w-4" />
                            </button>
                        </div>
                        <div className="w-px h-6 bg-gray-200 mx-1 lg:mx-2" />

                        <button
                            onClick={() => onToolSelect('background')}
                            className={cn(
                                "p-2 rounded-xl transition-all",
                                activeTool === 'background' ? "bg-indigo-100 text-indigo-600" : "hover:bg-gray-100 text-gray-500"
                            )}
                            title="Background"
                        >
                            <Palette className="h-5 w-5" />
                        </button>
                    </div>

                    <div className="flex items-center gap-2 lg:gap-3 shrink-0">
                        <button onClick={onZoomOut} className="p-1 lg:p-1.5 hover:bg-gray-100 rounded-lg text-gray-500 transition-all active:scale-90" title="Zoom Out">
                            <ZoomOut className="h-4 w-4" />
                        </button>
                        <button onClick={onZoomReset} className="text-[10px] lg:text-[11px] font-bold text-gray-600 min-w-[30px] lg:min-w-[40px] text-center hover:text-indigo-600 transition-colors" title="Reset Zoom">
                            {Math.round(zoomScale * 100)}%
                        </button>
                        <button onClick={onZoomIn} className="p-1 lg:p-1.5 hover:bg-gray-100 rounded-lg text-gray-500 transition-all active:scale-90" title="Zoom In">
                            <ZoomIn className="h-4 w-4" />
                        </button>
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                        <button onClick={onZoomReset} className="p-2 hover:bg-gray-100 rounded-lg text-gray-500 transition-all active:scale-90" title="Reset Camera">
                            <RotateCcw className="h-4 w-4" />
                        </button>
                        <button className="p-2 hover:bg-gray-100 rounded-lg text-gray-500 transition-all active:scale-90">
                            <Maximize className="h-4 w-4" />
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}

function ToolButton({ icon, active, onClick, className }: { icon: React.ReactNode, active: boolean, onClick: () => void, className?: string }) {
    return (
        <button
            onClick={onClick}
            className={cn(
                "p-1.5 lg:p-2.5 rounded-xl transition-all flex items-center justify-center shrink-0",
                active
                    ? "bg-white shadow-sm ring-1 ring-gray-100 text-orange-500"
                    : "text-gray-500 hover:bg-white hover:text-gray-900"
                , className)}
        >
            {icon}
        </button>
    );
}
