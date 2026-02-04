import { useState, useEffect, useMemo } from 'react';
import { usePlannerStore } from '@/store/plannerStore';
import { PlannerPage, PAGE_PRESETS } from '@/types/planner';
import { X, Lock, Unlock, Search, Check, ChevronDown, ChevronUp, RotateCcw, Plus } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface PlannerSettingsModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export function PlannerSettingsModal({ isOpen, onClose }: PlannerSettingsModalProps) {
    const { activePlanner, updatePages, savePlanner } = usePlannerStore();
    const [pages, setPages] = useState<PlannerPage[]>([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [isSaving, setIsSaving] = useState(false);
    const [expandedPageId, setExpandedPageId] = useState<string | null>(null);

    useEffect(() => {
        if (activePlanner) {
            // Check if pages are deeply equal before setting to avoid unnecessary re-renders or state resets if we were to act on updates
            // But here we want to re-initialize on open
            if (isOpen) {
                setPages(JSON.parse(JSON.stringify(activePlanner.pages)));
            }
        }
    }, [activePlanner, isOpen]);

    if (!activePlanner) return null;

    const handleReset = () => {
        if (activePlanner && confirm('Reset all pending changes to pages?')) {
            setPages(JSON.parse(JSON.stringify(activePlanner.pages)));
        }
    };

    const handleSave = async () => {
        setIsSaving(true);
        updatePages(pages);
        usePlannerStore.setState({
            activePlanner: {
                ...activePlanner,
                pages: pages
            }
        });
        await savePlanner();
        setIsSaving(false);
        onClose();
    };

    const handleUpdatePage = (id: string, updates: Partial<PlannerPage>) => {
        setPages(prev => prev.map(p => p.id === id ? { ...p, ...updates } : p));
    };

    const handleDimensionChange = (id: string, width: number, height: number, layout?: string) => {
        setPages(prev => prev.map(p => {
            if (p.id === id) {
                return {
                    ...p,
                    dimensions: { width, height },
                    layout: (layout as any) || 'custom'
                };
            }
            return p;
        }));
    };

    const handlePresetChange = (id: string, presetName: string) => {
        const preset = PAGE_PRESETS.find(p => p.name === presetName);
        if (preset && preset.name !== 'Custom') {
            handleDimensionChange(id, preset.width, preset.height, preset.layout);
        }
    };

    const filteredPages = useMemo(() => {
        return pages.filter(p =>
            (p.name?.toLowerCase().includes(searchTerm.toLowerCase())) ||
            (p.section?.toLowerCase().includes(searchTerm.toLowerCase())) ||
            (`Page ${p.page_number}`.toLowerCase().includes(searchTerm.toLowerCase()))
        );
    }, [pages, searchTerm]);

    const getPresetName = (page: PlannerPage) => {
        const w = page.dimensions?.width || 794;
        const h = page.dimensions?.height || 1123;
        const match = PAGE_PRESETS.find(p => p.width === w && p.height === h && p.name !== 'Custom');
        return match ? match.name : 'Custom';
    };

    const [showBatchInput, setShowBatchInput] = useState(false);
    const [batchInputValue, setBatchInputValue] = useState('');

    // Reset batch state when changing page
    useEffect(() => {
        setShowBatchInput(false);
        setBatchInputValue('');
    }, [expandedPageId]);

    const applyDimensionsToPages = (sourcePage: PlannerPage, targetMode: 'all' | 'custom', customRangeStr?: string) => {
        const { width, height } = sourcePage.dimensions || { width: 794, height: 1123 };
        const layout = sourcePage.layout || 'custom';

        let targetIndices: Set<number> = new Set();

        if (targetMode === 'all') {
            // Add all indices
            pages.forEach((_, i) => targetIndices.add(i));
        } else if (targetMode === 'custom' && customRangeStr) {
            // Parse range "1, 3-5"
            const parts = customRangeStr.split(',');
            parts.forEach(part => {
                const trimmed = part.trim();
                if (trimmed.includes('-')) {
                    const [start, end] = trimmed.split('-').map(Number);
                    if (!isNaN(start) && !isNaN(end)) {
                        // Ensure valid range (start <= end)
                        const min = Math.min(start, end);
                        const max = Math.max(start, end);
                        for (let i = min; i <= max; i++) targetIndices.add(i - 1);
                    }
                } else {
                    const num = parseInt(trimmed);
                    if (!isNaN(num)) targetIndices.add(num - 1);
                }
            });
        }

        setPages(prev => prev.map((p, i) => {
            if (targetIndices.has(i)) {
                return { ...p, dimensions: { width, height }, layout: layout as any };
            }
            return p;
        }));

        setShowBatchInput(false);
        setBatchInputValue('');

        // Optional: nice toast or alert, but let's keep it clean
        if (targetIndices.size > 0) {
            // We could show a temporary success state, but UI update is immediate
        }
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[60]"
                    />
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: 20 }}
                        className="fixed inset-4 md:inset-8 lg:inset-y-12 lg:inset-x-[2%] xl:inset-y-16 xl:inset-x-[10%] bg-white rounded-2xl shadow-2xl z-[61] flex flex-col overflow-hidden max-w-[1440px] min-w-[320px] mx-auto left-0 right-0"
                    >
                        {/* Header */}
                        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-white shrink-0">
                            <div>
                                <h2 className="text-xl font-bold text-gray-900">Planner Settings</h2>
                                <p className="text-sm text-gray-500">Manage {activePlanner.pages.length} pages</p>
                            </div>
                            <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
                                <X className="w-6 h-6 text-gray-400" />
                            </button>
                        </div>

                        {/* Toolbar */}
                        <div className="px-6 py-3 bg-gray-50 border-b border-gray-100 flex items-center justify-between shrink-0 gap-4">
                            <div className="relative flex-1 max-w-sm">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                <input
                                    type="text"
                                    placeholder="Search pages..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="w-full pl-9 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                                />
                            </div>

                            <div className="flex items-center gap-3">
                                <button
                                    onClick={onClose}
                                    className="px-5 py-2.5 text-sm font-bold text-gray-500 hover:bg-gray-200 rounded-xl transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleReset}
                                    className="flex items-center gap-2 px-4 py-2.5 text-sm font-bold text-gray-600 hover:bg-gray-200 rounded-xl transition-colors border border-gray-200"
                                    title="Reset all changes"
                                >
                                    <RotateCcw className="w-4 h-4" />
                                    Reset
                                </button>
                                <div className="w-px h-6 bg-gray-200 mx-1" />
                                <button
                                    onClick={handleSave}
                                    disabled={isSaving}
                                    className="px-8 py-2.5 text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-lg shadow-indigo-200 transition-all flex items-center gap-2"
                                >
                                    {isSaving ? <Search className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                                    {isSaving ? 'Saving...' : 'Save Changes'}
                                </button>
                            </div>
                        </div>

                        {/* Grid Content */}
                        <div className="flex-1 overflow-y-auto p-6 bg-gray-50/50">
                            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                                {filteredPages.map((page, index) => {
                                    const isExpanded = expandedPageId === page.id;
                                    const presetName = getPresetName(page);

                                    return (
                                        <motion.div
                                            key={page.id}
                                            layout
                                            initial={{ opacity: 0, scale: 0.9 }}
                                            animate={{
                                                opacity: 1,
                                                scale: 1,
                                                gridColumn: isExpanded ? "1 / -1" : "auto",
                                                zIndex: isExpanded ? 10 : 1
                                            }}
                                            transition={{ duration: 0.2 }}
                                            className={`bg-white rounded-xl border transition-all ${isExpanded
                                                ? 'border-indigo-500 shadow-xl ring-4 ring-indigo-50/50'
                                                : 'border-gray-200 hover:border-indigo-300 hover:shadow-md cursor-pointer'
                                                }`}
                                            onClick={() => !isExpanded && setExpandedPageId(page.id)}
                                        >
                                            {/* Collapsed View */}
                                            {!isExpanded && (
                                                <div className="p-4 flex flex-col items-center text-center gap-3">
                                                    <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center font-bold text-gray-400 text-lg">
                                                        {index + 1}
                                                    </div>
                                                    <div>
                                                        <h3 className="font-semibold text-gray-900 truncate w-full max-w-[150px] text-sm">
                                                            {page.name || 'Untitled Page'}
                                                        </h3>
                                                        <p className="text-xs text-gray-500 mt-1">
                                                            {page.section || 'General'}
                                                        </p>
                                                    </div>
                                                </div>
                                            )}

                                            {/* Expanded View */}
                                            {isExpanded && (
                                                <div className="p-6 cursor-auto">
                                                    <div className="flex items-start justify-between mb-6">
                                                        <div className="flex items-center gap-3">
                                                            <div className="w-10 h-10 bg-indigo-100 text-indigo-600 rounded-lg flex items-center justify-center font-bold text-lg">
                                                                {index + 1}
                                                            </div>
                                                            <div>
                                                                <h3 className="font-bold text-gray-900">Edit Page Details</h3>
                                                                <p className="text-xs text-gray-500">ID: {page.id.slice(0, 8)}...</p>
                                                            </div>
                                                        </div>
                                                        <button
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                setExpandedPageId(null);
                                                            }}
                                                            className="p-2 hover:bg-gray-100 rounded-lg text-gray-400 hover:text-gray-600"
                                                        >
                                                            <ChevronUp className="w-5 h-5" />
                                                        </button>
                                                    </div>

                                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                                                        {/* General Info */}
                                                        <div className="space-y-4">
                                                            <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider">General</h4>
                                                            <div className="space-y-3">
                                                                <div>
                                                                    <label className="block text-xs font-medium text-gray-700 mb-1">Page Title</label>
                                                                    <input
                                                                        type="text"
                                                                        value={page.name || ''}
                                                                        onChange={(e) => handleUpdatePage(page.id, { name: e.target.value })}
                                                                        className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                                                                        placeholder="Untitled Page"
                                                                    />
                                                                </div>

                                                                {/* Date & Section Controls */}
                                                                <div className="grid grid-cols-2 gap-3">
                                                                    <div>
                                                                        <label className="block text-xs font-medium text-gray-700 mb-1">Year</label>
                                                                        <div className="relative">
                                                                            <select
                                                                                value={page.year || ''}
                                                                                onChange={(e) => handleUpdatePage(page.id, { year: parseInt(e.target.value) || undefined })}
                                                                                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm appearance-none bg-white focus:ring-2 focus:ring-indigo-500 outline-none cursor-pointer"
                                                                            >
                                                                                <option value="">None</option>
                                                                                {[2024, 2025, 2026, 2027, 2028, 2029, 2030].map(y => (
                                                                                    <option key={y} value={y}>{y}</option>
                                                                                ))}
                                                                            </select>
                                                                            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                                                                        </div>
                                                                    </div>
                                                                    <div>
                                                                        <label className="block text-xs font-medium text-gray-700 mb-1">Month</label>
                                                                        <div className="relative">
                                                                            <select
                                                                                value={page.month || ''}
                                                                                onChange={(e) => handleUpdatePage(page.id, { month: e.target.value })}
                                                                                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm appearance-none bg-white focus:ring-2 focus:ring-indigo-500 outline-none cursor-pointer uppercase font-bold text-gray-600"
                                                                            >
                                                                                <option value="">None</option>
                                                                                {['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'].map(m => (
                                                                                    <option key={m} value={m}>{m}</option>
                                                                                ))}
                                                                            </select>
                                                                            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                                                                        </div>
                                                                    </div>
                                                                </div>

                                                                <div className="grid grid-cols-2 gap-3">
                                                                    <div>
                                                                        <label className="block text-xs font-medium text-gray-700 mb-1">Section</label>
                                                                        <div className="relative">
                                                                            <input
                                                                                type="text"
                                                                                list={`sections-${page.id}`}
                                                                                value={page.section || ''}
                                                                                onChange={(e) => handleUpdatePage(page.id, { section: e.target.value })}
                                                                                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                                                                                placeholder="Section..."
                                                                            />
                                                                            <datalist id={`sections-${page.id}`}>
                                                                                <option value="General" />
                                                                                <option value="Daily" />
                                                                                <option value="Weekly" />
                                                                                <option value="Monthly" />
                                                                                <option value="Notes" />
                                                                            </datalist>
                                                                        </div>
                                                                    </div>
                                                                    <div>
                                                                        <label className="block text-xs font-medium text-gray-700 mb-1">Category</label>
                                                                        <div className="flex gap-2">
                                                                            <div className="relative flex-1">
                                                                                <input
                                                                                    type="text"
                                                                                    list={`categories-${page.id}`}
                                                                                    value={page.category || ''}
                                                                                    onChange={(e) => handleUpdatePage(page.id, { category: e.target.value.toUpperCase() })}
                                                                                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                                                                                    placeholder="Category..."
                                                                                />
                                                                                <datalist id={`categories-${page.id}`}>
                                                                                    <option value="PERSONAL" />
                                                                                    <option value="WORK" />
                                                                                    <option value="HEALTH" />
                                                                                    <option value="FINANCE" />
                                                                                    <option value="TRAVEL" />
                                                                                </datalist>
                                                                            </div>
                                                                            <button
                                                                                onClick={() => {
                                                                                    const val = prompt('Enter new category:');
                                                                                    if (val) handleUpdatePage(page.id, { category: val.toUpperCase() });
                                                                                }}
                                                                                className="p-2 border border-gray-200 rounded-lg hover:bg-gray-50 text-gray-400 hover:text-indigo-600 transition-colors"
                                                                                title="Add New Category"
                                                                            >
                                                                                <Plus className="w-4 h-4" />
                                                                            </button>
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        </div>

                                                        {/* Dimensions & Layout */}
                                                        <div className="space-y-4">
                                                            <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider">Dimensions</h4>
                                                            <div className="space-y-3">
                                                                <div>
                                                                    <label className="block text-xs font-medium text-gray-700 mb-1">Preset Size</label>
                                                                    <div className="relative">
                                                                        <select
                                                                            value={presetName}
                                                                            onChange={(e) => handlePresetChange(page.id, e.target.value)}
                                                                            className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm appearance-none bg-white focus:ring-2 focus:ring-indigo-500 outline-none cursor-pointer"
                                                                        >
                                                                            {PAGE_PRESETS.map(p => (
                                                                                <option key={p.name} value={p.name}>{p.name}</option>
                                                                            ))}
                                                                        </select>
                                                                        <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                                                                    </div>
                                                                </div>
                                                                <div className="grid grid-cols-2 gap-3">
                                                                    <div>
                                                                        <label className="block text-xs font-medium text-gray-700 mb-1">Width (px)</label>
                                                                        <input
                                                                            type="number"
                                                                            value={page.dimensions?.width}
                                                                            onChange={(e) => handleDimensionChange(page.id, parseInt(e.target.value) || 0, page.dimensions?.height || 0)}
                                                                            className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                                                                        />
                                                                    </div>
                                                                    <div>
                                                                        <label className="block text-xs font-medium text-gray-700 mb-1">Height (px)</label>
                                                                        <input
                                                                            type="number"
                                                                            value={page.dimensions?.height}
                                                                            onChange={(e) => handleDimensionChange(page.id, page.dimensions?.width || 0, parseInt(e.target.value) || 0)}
                                                                            className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                                                                        />
                                                                    </div>
                                                                </div>

                                                                {/* Batch Apply UI */}
                                                                <div className="pt-3 border-t border-gray-100 mt-1">
                                                                    <label className="block text-[10px] font-bold text-gray-400 uppercase mb-2">Apply Size To...</label>
                                                                    <div className="flex gap-2">
                                                                        <button
                                                                            onClick={() => {
                                                                                if (confirm('Apply these dimensions to ALL pages?')) {
                                                                                    applyDimensionsToPages(page, 'all');
                                                                                }
                                                                            }}
                                                                            className="flex-1 px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-xs font-medium rounded-lg text-gray-700 transition-colors"
                                                                        >
                                                                            All Pages
                                                                        </button>
                                                                        <button
                                                                            onClick={() => setShowBatchInput(!showBatchInput)}
                                                                            className={`flex-1 px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${showBatchInput ? 'bg-indigo-100 text-indigo-700' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
                                                                        >
                                                                            Select...
                                                                        </button>
                                                                    </div>
                                                                    {showBatchInput && (
                                                                        <div className="mt-2 flex gap-2 animate-in fade-in slide-in-from-top-1 duration-200">
                                                                            <input
                                                                                type="text"
                                                                                value={batchInputValue}
                                                                                onChange={e => setBatchInputValue(e.target.value)}
                                                                                placeholder="1-5, 8, 10"
                                                                                className="flex-1 px-2 py-1.5 text-xs border border-indigo-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                                                                                autoFocus
                                                                            />
                                                                            <button
                                                                                onClick={() => applyDimensionsToPages(page, 'custom', batchInputValue)}
                                                                                className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-lg transition-colors"
                                                                            >
                                                                                Apply
                                                                            </button>
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        </div>

                                                        {/* Settings & Details */}
                                                        <div className="space-y-4">
                                                            <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider">Settings & Details</h4>
                                                            <div className="space-y-3">
                                                                <button
                                                                    onClick={() => handleUpdatePage(page.id, { isLocked: !page.isLocked })}
                                                                    className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm font-medium border transition-all ${page.isLocked
                                                                        ? 'bg-red-50 text-red-600 border-red-200'
                                                                        : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300'
                                                                        }`}
                                                                >
                                                                    <div className="flex items-center gap-2">
                                                                        {page.isLocked ? <Lock className="w-4 h-4" /> : <Unlock className="w-4 h-4" />}
                                                                        <span>{page.isLocked ? 'Locked' : 'Unlocked'}</span>
                                                                    </div>
                                                                    {page.isLocked && <span className="text-xs bg-red-100 px-2 py-0.5 rounded text-red-700">Read Only</span>}
                                                                </button>

                                                                <div className="bg-gray-50 rounded-lg p-3 space-y-2">
                                                                    <div className="flex justify-between text-xs">
                                                                        <span className="text-gray-500">Elements</span>
                                                                        <span className="font-medium text-gray-900">{page.elements?.length || 0}</span>
                                                                    </div>
                                                                    <div className="flex justify-between text-xs">
                                                                        <span className="text-gray-500">Ink Paths</span>
                                                                        <span className="font-medium text-gray-900">{page.inkPaths?.length || 0}</span>
                                                                    </div>
                                                                    <div className="flex justify-between text-xs">
                                                                        <span className="text-gray-500">Links</span>
                                                                        <span className="font-medium text-gray-900">{page.links?.length || 0}</span>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            )}
                                        </motion.div>
                                    );
                                })}
                            </div>
                        </div>

                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
}
