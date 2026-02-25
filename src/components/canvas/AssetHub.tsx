import React, { useState, useEffect, useRef } from 'react';
import {
    X,
    Sticker,
    Image as ImageIcon,
    Library,
    Link,
    Upload,
    Search,
    Loader2,
    Plus,
    ListChecks,
    Trash2,
    Book
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { usePlannerStore } from '@/store/plannerStore';
import { cn } from '@/lib/utils';
import { PDFThumbnail } from '../ui/PDFThumbnail';

interface AssetHubProps {
    isOpen: boolean;
    onClose: () => void;
    onSelectAsset: (asset: { url: string; type: string }) => void;
    initialTab?: Tab;
}

type Tab = 'sticker' | 'image' | 'planner';
type Source = 'library' | 'url' | 'upload';

export function AssetHub({ isOpen, onClose, onSelectAsset, initialTab }: AssetHubProps) {
    const {
        libraryAssets,
        libraryCategories,
        fetchLibraryAssets,
        fetchLibraryCategories,
        isLoadingAssets,
        uploadAsset,
        uploadProgress,
        addAssetByUrl,
        deleteAsset: deleteAssetFromStore
    } = usePlannerStore();

    const [activeTab, setActiveTab] = useState<Tab>(initialTab || 'sticker');
    const [activeSource, setActiveSource] = useState<Source>('library');
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
    const [inputUrl, setInputUrl] = useState('');
    const [isUploading, setIsUploading] = useState(false);

    // Selection Mode State
    const [isSelectionMode, setIsSelectionMode] = useState(false);
    const [selectedAssetIds, setSelectedAssetIds] = useState<Set<string>>(new Set());

    const fileInputRef = useRef<HTMLInputElement>(null);

    // Sync with initialTab prop when it changes or when hub opens
    useEffect(() => {
        if (isOpen && initialTab) {
            setActiveTab(initialTab);
        }
    }, [isOpen, initialTab]);

    // Fetch assets on tab change
    useEffect(() => {
        if (isOpen) {
            fetchLibraryCategories(activeTab);
            fetchLibraryAssets(activeTab, selectedCategory || undefined);
        }
    }, [isOpen, activeTab, selectedCategory, fetchLibraryAssets, fetchLibraryCategories]);

    const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files;
        if (!files || files.length === 0) return;

        setIsUploading(true);
        try {
            for (let i = 0; i < files.length; i++) {
                const finalCategory = isNewCategory ? newCategoryName : uploadCategory;
                const hashtagsArray = uploadHashtags.split(',').map(tag => tag.trim()).filter(Boolean);
                await uploadAsset(files[i], activeTab, finalCategory || 'Personal', hashtagsArray);
            }
            setActiveSource('library');
        } catch (error: any) {
            console.error('Upload failed:', error);
            alert(`Failed: ${error?.message || 'Unknown error occurred during upload.'}`);
        } finally {
            setIsUploading(false);
        }
    };

    const handleAddByUrl = async () => {
        if (!inputUrl) return;
        setIsUploading(true);
        try {
            const finalCategory = isNewCategory ? newCategoryName : uploadCategory;
            const hashtagsArray = uploadHashtags.split(',').map(tag => tag.trim()).filter(Boolean);
            await addAssetByUrl(inputUrl, 'New Asset', activeTab, finalCategory || 'External', hashtagsArray);
            setInputUrl('');
            setActiveSource('library');
        } catch (error) {
            console.error('Failed to add asset by URL:', error);
            alert('Failed to add asset by URL.');
        } finally {
            setIsUploading(false);
        }
    };

    const handleDragStart = (e: React.DragEvent, asset: any) => {
        e.dataTransfer.setData('text/uri-list', asset.url);
        e.dataTransfer.setData('application/json', JSON.stringify({
            url: asset.url,
            type: activeTab,
            title: asset.title
        }));
    };

    // New State for Metadata
    const [uploadCategory, setUploadCategory] = useState<string>('Personal');
    const [isNewCategory, setIsNewCategory] = useState(false);
    const [newCategoryName, setNewCategoryName] = useState('');
    const [uploadHashtags, setUploadHashtags] = useState('');

    const MetadataInputs = () => (
        <div className="space-y-4 mb-6">
            <div className="space-y-2">
                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Category</label>
                <div className="flex gap-2">
                    {!isNewCategory ? (
                        <select
                            value={uploadCategory}
                            onChange={(e) => {
                                if (e.target.value === 'NEW_CATEGORY_OPTION') {
                                    setIsNewCategory(true);
                                    setNewCategoryName('');
                                } else {
                                    setUploadCategory(e.target.value);
                                }
                            }}
                            className="flex-1 px-4 py-2 bg-gray-50 border border-gray-100 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                        >
                            {libraryCategories.map(cat => (
                                <option key={cat} value={cat}>{cat}</option>
                            ))}
                            <option value="Personal">Personal</option>
                            <option value="NEW_CATEGORY_OPTION">+ Create New Category</option>
                        </select>
                    ) : (
                        <div className="flex-1 flex gap-2">
                            <input
                                type="text"
                                placeholder="New Category Name"
                                value={newCategoryName}
                                onChange={(e) => setNewCategoryName(e.target.value)}
                                className="flex-1 px-4 py-2 bg-gray-50 border border-gray-100 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                            />
                            <button
                                onClick={() => setIsNewCategory(false)}
                                className="p-2 text-gray-400 hover:text-gray-600"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        </div>
                    )}
                </div>
            </div>

            <div className="space-y-2">
                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Hashtags</label>
                <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">#</span>
                    <input
                        type="text"
                        placeholder="planning, cute, work (comma separated)"
                        value={uploadHashtags}
                        onChange={(e) => setUploadHashtags(e.target.value)}
                        className="w-full pl-8 pr-4 py-2 bg-gray-50 border border-gray-100 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                    />
                </div>
            </div>
        </div>
    );

    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    {/* Backdrop */}
                    <motion.div
                        key="hub-overlay"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="fixed inset-0 bg-black/20 backdrop-blur-[2px] z-[50]"
                    />

                    {/* Panel */}
                    <motion.div
                        key="hub-panel"
                        initial={{ x: '100%' }}
                        animate={{ x: 0 }}
                        exit={{ x: '100%' }}
                        transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                        className="fixed right-0 top-0 h-full w-[400px] bg-white shadow-[-8px_0_24px_rgba(0,0,0,0.05)] z-[60] flex flex-col"
                    >
                        {/* Header */}
                        <div className="px-6 py-5 border-b border-gray-100">
                            <div className="flex items-center justify-between mb-6">
                                <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                                    <Library className="w-5 h-5 text-indigo-500" />
                                    Asset Hub
                                </h2>
                                <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg text-gray-400 hover:text-gray-600 transition-colors">
                                    <X className="w-5 h-5" />
                                </button>
                            </div>

                            {/* Main Tabs */}
                            <div className="flex p-1 bg-gray-50 rounded-xl mb-4">
                                <button
                                    onClick={() => { setActiveTab('sticker'); setSelectedCategory(null); }}
                                    className={cn(
                                        "flex-1 flex items-center justify-center gap-2 py-2 text-sm font-bold rounded-lg transition-all",
                                        activeTab === 'sticker' ? "bg-white shadow-sm text-indigo-600 ring-1 ring-black/5" : "text-gray-500 hover:text-gray-700"
                                    )}
                                >
                                    <Sticker className="w-4 h-4" /> Stickers
                                </button>
                                <button
                                    onClick={() => { setActiveTab('image'); setSelectedCategory(null); }}
                                    className={cn(
                                        "flex-1 flex items-center justify-center gap-2 py-2 text-sm font-bold rounded-lg transition-all",
                                        activeTab === 'image' ? "bg-white shadow-sm text-indigo-600 ring-1 ring-black/5" : "text-gray-500 hover:text-gray-700"
                                    )}
                                >
                                    <ImageIcon className="w-4 h-4" /> Images
                                </button>
                                <button
                                    onClick={() => { setActiveTab('planner'); setSelectedCategory(null); }}
                                    className={cn(
                                        "flex-1 flex items-center justify-center gap-2 py-2 text-sm font-bold rounded-lg transition-all",
                                        activeTab === 'planner' ? "bg-white shadow-sm text-indigo-600 ring-1 ring-black/5" : "text-gray-500 hover:text-gray-700"
                                    )}
                                >
                                    <Book size={16} className="w-4 h-4" /> Planners
                                </button>
                            </div>

                            {/* Source Tabs */}
                            <div className="flex gap-4">
                                <SourceTab
                                    icon={<Library className="w-4 h-4" />}
                                    label="Library"
                                    active={activeSource === 'library'}
                                    onClick={() => setActiveSource('library')}
                                />
                                <SourceTab
                                    icon={<Link className="w-4 h-4" />}
                                    label="Add URL"
                                    active={activeSource === 'url'}
                                    onClick={() => setActiveSource('url')}
                                />
                                <SourceTab
                                    icon={<Upload className="w-4 h-4" />}
                                    label="Upload"
                                    active={activeSource === 'upload'}
                                    onClick={() => setActiveSource('upload')}
                                />
                            </div>
                        </div>

                        {/* Content Area */}
                        <div className="flex-1 overflow-hidden flex flex-col">
                            {activeSource === 'library' && (
                                <>
                                    {/* Search & Categories */}
                                    <div className="px-6 py-4 space-y-4">
                                        <div className="relative flex gap-2">
                                            <div className="relative flex-1">
                                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                                <input
                                                    type="text"
                                                    placeholder={`Search ${activeTab}s...`}
                                                    value={searchTerm}
                                                    onChange={(e) => setSearchTerm(e.target.value)}
                                                    className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-100 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                                                />
                                            </div>

                                            {/* Selection Toggle */}
                                            <button
                                                onClick={() => {
                                                    setIsSelectionMode(!isSelectionMode);
                                                    setSelectedAssetIds(new Set());
                                                }}
                                                className={cn(
                                                    "p-2 rounded-xl transition-all border",
                                                    isSelectionMode
                                                        ? "bg-indigo-50 border-indigo-200 text-indigo-600"
                                                        : "bg-white border-gray-100 text-gray-400 hover:text-gray-600"
                                                )}
                                                title="Select to Delete"
                                            >
                                                <ListChecks className="w-4 h-4" />
                                            </button>

                                            {/* Delete Action */}
                                            {isSelectionMode && selectedAssetIds.size > 0 && (
                                                <button
                                                    onClick={async () => {
                                                        if (confirm(`Delete ${selectedAssetIds.size} assets?`)) {
                                                            setIsUploading(true); // Re-use loading state
                                                            try {
                                                                for (const id of selectedAssetIds) {
                                                                    await deleteAssetFromStore(id);
                                                                }
                                                                setIsSelectionMode(false);
                                                                setSelectedAssetIds(new Set());
                                                            } finally {
                                                                setIsUploading(false);
                                                            }
                                                        }
                                                    }}
                                                    className="p-2 bg-red-50 border border-red-100 rounded-xl text-red-500 hover:bg-red-100 transition-all"
                                                    title="Delete Selected"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            )}
                                        </div>

                                        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1">
                                            <CategoryPill
                                                label="All"
                                                active={selectedCategory === null}
                                                onClick={() => setSelectedCategory(null)}
                                            />
                                            {libraryCategories.map(cat => (
                                                <CategoryPill
                                                    key={cat}
                                                    label={cat}
                                                    active={selectedCategory === cat}
                                                    onClick={() => setSelectedCategory(cat)}
                                                />
                                            ))}
                                        </div>
                                    </div>

                                    {/* Grid */}
                                    <div className="flex-1 overflow-y-auto px-6 pb-6">
                                        {isLoadingAssets ? (
                                            <div className="h-full flex flex-col items-center justify-center text-gray-400 gap-3">
                                                <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
                                                <span className="text-sm font-medium">Loading your assets...</span>
                                            </div>
                                        ) : (
                                            <div className="grid grid-cols-2 gap-4">
                                                {libraryAssets
                                                    .filter(a => a.type === activeTab && a.title.toLowerCase().includes(searchTerm.toLowerCase()))
                                                    .map(asset => (
                                                        <div
                                                            key={asset.id}
                                                            draggable={!isSelectionMode}
                                                            onDragStart={(e) => !isSelectionMode && handleDragStart(e, asset)}
                                                            onClick={() => {
                                                                if (isSelectionMode) {
                                                                    const newSet = new Set(selectedAssetIds);
                                                                    if (newSet.has(asset.id)) newSet.delete(asset.id);
                                                                    else newSet.add(asset.id);
                                                                    setSelectedAssetIds(newSet);
                                                                } else {
                                                                    onSelectAsset({ url: asset.url, type: activeTab });
                                                                }
                                                            }}
                                                            className={cn(
                                                                "group relative aspect-square bg-gray-50 rounded-2xl border transition-all cursor-pointer overflow-hidden flex items-center justify-center p-4",
                                                                isSelectionMode && selectedAssetIds.has(asset.id)
                                                                    ? "border-indigo-500 ring-2 ring-indigo-500/20 bg-indigo-50/10"
                                                                    : "border-gray-100 hover:border-indigo-500 hover:shadow-lg hover:shadow-indigo-500/10"
                                                            )}
                                                        >
                                                            {asset.url.toLowerCase().endsWith('.pdf') ? (
                                                                <PDFThumbnail url={asset.url} />
                                                            ) : (
                                                                <img
                                                                    src={asset.url}
                                                                    alt={asset.title}
                                                                    className="max-w-full max-h-full object-contain transition-transform group-hover:scale-110"
                                                                />
                                                            )}

                                                            {/* Checkbox indicator for selection mode */}
                                                            {isSelectionMode && (
                                                                <div className={cn(
                                                                    "absolute top-2 right-2 w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all z-10",
                                                                    selectedAssetIds.has(asset.id)
                                                                        ? "bg-indigo-500 border-indigo-500"
                                                                        : "border-gray-300 bg-white/80"
                                                                )}>
                                                                    {selectedAssetIds.has(asset.id) && <div className="w-2 h-2 bg-white rounded-full" />}
                                                                </div>
                                                            )}

                                                            {/* Actions Overlay (Only when NOT in selection mode) */}
                                                            {!isSelectionMode && (
                                                                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                                                                    <button
                                                                        onClick={(e) => { e.stopPropagation(); onSelectAsset({ url: asset.url, type: activeTab }); }}
                                                                        className="p-2 bg-white rounded-lg text-indigo-600 hover:scale-110 transition-transform"
                                                                    >
                                                                        <Plus className="w-4 h-4" />
                                                                    </button>
                                                                </div>
                                                            )}


                                                            <div className="absolute bottom-2 left-2 right-2 bg-white/90 backdrop-blur-sm rounded-lg px-2 py-1 opacity-0 group-hover:opacity-100 transition-opacity shadow-sm">
                                                                <p className="text-[10px] font-bold text-gray-700 truncate">{asset.title}</p>
                                                            </div>
                                                        </div>
                                                    ))
                                                }
                                                {libraryAssets.length === 0 && (
                                                    <div className="col-span-2 py-10 text-center text-gray-400">
                                                        <Library className="w-12 h-12 mx-auto mb-3 opacity-20" />
                                                        <p className="text-sm font-medium">No assets found</p>
                                                        <button
                                                            onClick={() => setActiveSource('upload')}
                                                            className="mt-4 text-xs font-bold text-indigo-600 hover:underline"
                                                        >
                                                            Upload something!
                                                        </button>
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                </>
                            )}

                            {activeSource === 'url' && (
                                <div className="p-6 space-y-6">
                                    <div className="space-y-2">
                                        <h3 className="text-sm font-bold text-gray-900">Add via Internet URL</h3>
                                        <p className="text-xs text-gray-500">Paste any image link from the web to add it to your collection.</p>
                                    </div>

                                    <MetadataInputs />

                                    <div className="space-y-4">
                                        <input
                                            type="url"
                                            placeholder="https://example.com/sticker.png"
                                            value={inputUrl}
                                            onChange={(e) => setInputUrl(e.target.value)}
                                            className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                                        />

                                        {inputUrl && (
                                            <div className="aspect-video bg-gray-50 rounded-2xl border border-dashed border-gray-200 flex items-center justify-center overflow-hidden p-4">
                                                <img
                                                    src={inputUrl}
                                                    alt="Preview"
                                                    className="max-w-full max-h-full object-contain"
                                                    onError={(e) => {
                                                        (e.target as HTMLImageElement).src = 'https://placehold.co/400x200/f8fafc/94a3b8?text=Invalid+URL';
                                                    }}
                                                />
                                            </div>
                                        )}

                                        <button
                                            disabled={!inputUrl || isUploading}
                                            onClick={handleAddByUrl}
                                            className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-xl font-bold transition-all flex items-center justify-center gap-2"
                                        >
                                            {isUploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                                            Add to Library
                                        </button>
                                    </div>
                                </div>
                            )}

                            {activeSource === 'upload' && (
                                <div className="p-6 h-full flex flex-col">
                                    <MetadataInputs />
                                    <input
                                        type="file"
                                        className="hidden"
                                        ref={fileInputRef}
                                        multiple
                                        accept={activeTab === 'planner' ? "image/*,.pdf" : "image/*"}
                                        onChange={handleUpload}
                                    />

                                    <div
                                        onClick={() => fileInputRef.current?.click()}
                                        className="flex-1 border-2 border-dashed border-gray-200 rounded-3xl flex flex-col items-center justify-center gap-4 hover:border-indigo-400 hover:bg-indigo-50/30 transition-all cursor-pointer group"
                                    >
                                        <div className="w-16 h-16 bg-indigo-50 rounded-2xl flex items-center justify-center text-indigo-500 group-hover:scale-110 transition-transform">
                                            {isUploading ? <Loader2 className="w-8 h-8 animate-spin" /> : <Upload className="w-8 h-8" />}
                                        </div>
                                        <div className="text-center">
                                            <p className="text-sm font-bold text-gray-900">Upload {activeTab}s</p>
                                            <p className="text-xs text-gray-500 mt-1">Drag and drop or click to browse</p>
                                        </div>

                                        {isUploading && uploadProgress !== null && (
                                            <div className="w-48 space-y-2">
                                                <div className="h-1.5 w-full bg-indigo-100 rounded-full overflow-hidden">
                                                    <motion.div
                                                        initial={{ width: 0 }}
                                                        animate={{ width: `${uploadProgress}%` }}
                                                        className="h-full bg-indigo-500"
                                                    />
                                                </div>
                                                <p className="text-[10px] font-black text-indigo-600 text-center uppercase tracking-widest">
                                                    Uploading... {uploadProgress}%
                                                </p>
                                            </div>
                                        )}

                                        <div className="flex gap-2 text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                                            <span>PNG</span>
                                            <span>JPG</span>
                                            <span>GIF</span>
                                            {activeTab === 'planner' && <span>PDF</span>}
                                        </div>
                                    </div>

                                    <div className="mt-6 p-4 bg-orange-50 rounded-2xl border border-orange-100 flex gap-3">
                                        <div className="p-2 bg-white rounded-lg text-orange-500">
                                            <ImageIcon className="w-4 h-4" />
                                        </div>
                                        <div className="flex-1">
                                            <p className="text-xs font-bold text-orange-900">Tip</p>
                                            <p className="text-[10px] text-orange-700 leading-normal">Use transparent PNGs for the best experience with stickers in your planner.</p>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Footer */}
                        <div className="px-6 py-4 bg-gray-50 border-t border-gray-100">
                            <p className="text-[10px] font-medium text-gray-400 text-center uppercase tracking-widest leading-loose">
                                Tip: You can drag and drop assets directly onto your canvas to position them perfectly.
                            </p>
                        </div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
}

function SourceTab({ icon, label, active, onClick }: { icon: any, label: string, active: boolean, onClick: () => void }) {
    return (
        <button
            onClick={onClick}
            className={cn(
                "flex flex-col items-center gap-1.5 flex-1 py-1 transition-all group",
                active ? "text-indigo-600" : "text-gray-400 hover:text-gray-600"
            )}
        >
            <div className={cn(
                "p-2 rounded-lg transition-all",
                active ? "bg-indigo-50" : "bg-transparent group-hover:bg-gray-100"
            )}>
                {icon}
            </div>
            <span className="text-[10px] font-bold uppercase tracking-wider">{label}</span>
            {active && <motion.div layoutId="source-indicator" className="h-0.5 w-4 bg-indigo-600 rounded-full mt-auto" />}
        </button>
    );
}

function CategoryPill({ label, active, onClick }: { label: string, active: boolean, onClick: () => void }) {
    return (
        <button
            onClick={onClick}
            className={cn(
                "px-4 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-all border",
                active
                    ? "bg-indigo-600 border-indigo-600 text-white shadow-md shadow-indigo-200"
                    : "bg-white border-gray-100 text-gray-500 hover:border-gray-300 hover:text-gray-700"
            )}
        >
            {label}
        </button>
    );
}
