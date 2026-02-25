import React, { useState, useEffect } from 'react';
import { Book, Sticker, FileImage, LayoutTemplate, Search, LayoutGrid, Hash, ChevronRight, Edit, Trash2, Palette, RefreshCcw, Plus, X, CheckSquare, Check, FileText, FileArchive, File as FileIcon, FileCode, FileJson } from 'lucide-react';

import { usePlannerStore } from '../../store/plannerStore';
import AssetEditor from './AssetEditor';
import { PDFImportModal } from '../dashboard/PDFImportModal';
import { generateUUID } from '../../store/plannerStore';
import { supabase as _supabase } from '../../supabase/client'; // kept for future use
import '../dashboard/Dashboard.css';
import PageHero from '../ui/PageHero';
import { PlannerTabs } from '../dashboard/PlannerTabs';

// Configure PDF.js worker
import * as pdfjsLib from 'pdfjs-dist';
pdfjsLib.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.mjs`;

const LibraryPage: React.FC = () => {
    const {
        libraryAssets,
        libraryCategories,
        fetchLibraryAssets,
        fetchLibraryCategories,
        isLoadingAssets,
        userProfile,
        updateAssetMetadata,
        saveEditedAsset,
        deleteAsset,
        deleteAssets,
        uploadAsset,
        addAssetByUrl,
        syncGoogleDriveAssets
    } = usePlannerStore();

    const isAdmin = userProfile?.role === 'admin';

    // Use singular types to match DB: 'sticker', 'cover', 'template', 'image'
    const [activeTab, setActiveTab] = useState<'sticker' | 'cover' | 'template' | 'image' | 'planner'>('planner');
    const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [activeHashtag, setActiveHashtag] = useState<string | null>(null);
    const [viewMode, setViewMode] = useState<'mine' | 'all'>('all');

    // Upload Modal State
    const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
    const [uploadMode, setUploadMode] = useState<'file' | 'url'>('file');
    const [inputUrl, setInputUrl] = useState('');
    const [inputTitle, setInputTitle] = useState('');
    const [inputCategory, setInputCategory] = useState('');
    const [inputHashtags, setInputHashtags] = useState('');
    const [isPublicInput, setIsPublicInput] = useState(true);
    const [previewAsset, setPreviewAsset] = useState<any>(null);
    const [isUploading, setIsUploading] = useState(false);
    const fileInputRef = React.useRef<HTMLInputElement>(null);

    // Edit Modal State
    const [editingAsset, setEditingAsset] = useState<any | null>(null);
    const [editTitle, setEditTitle] = useState('');
    const [editCategory, setEditCategory] = useState('');
    const [editHashtags, setEditHashtags] = useState('');
    const [editIsPublic, setEditIsPublic] = useState(false);
    const [isSavingEdit, setIsSavingEdit] = useState(false);

    // Bulk Selection State
    const [selectedAssetIds, setSelectedAssetIds] = useState<Set<string>>(new Set());
    const isBulkSelecting = selectedAssetIds.size > 0;

    // Painting State
    const [paintingAsset, setPaintingAsset] = useState<any | null>(null);

    // PDF Import Modal State
    const [isPDFModalOpen, setIsPDFModalOpen] = useState(false);
    const [pdfSourceUrl, setPdfSourceUrl] = useState<string | undefined>(undefined);

    // Sidebar Visibility
    const [isCategoriesExpanded, setIsCategoriesExpanded] = useState(true);

    // Initial fetch
    useEffect(() => {
        fetchLibraryCategories(activeTab, viewMode);
        fetchLibraryAssets(activeTab, undefined, undefined, viewMode);
    }, [activeTab, fetchLibraryCategories, fetchLibraryAssets, viewMode]);

    // Handle Category change
    const handleCategorySelect = (cat: string | null) => {
        setSelectedCategory(cat);
        fetchLibraryAssets(activeTab, cat || undefined, activeHashtag || undefined, viewMode);
    };

    // Handle Hashtag change
    const handleHashtagSelect = (tag: string | null) => {
        setActiveHashtag(tag);
        fetchLibraryAssets(activeTab, selectedCategory || undefined, tag || undefined, viewMode);
    };

    // Handle Bulk Selection
    const toggleAssetSelection = (id: string, e?: React.MouseEvent) => {
        if (e) e.stopPropagation();
        setSelectedAssetIds(prev => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return next;
        });
    };

    const handleSelectAll = () => {
        const filteredIds = libraryAssets
            .filter(a => a.title.toLowerCase().includes(searchTerm.toLowerCase()))
            .map(a => a.id);

        if (selectedAssetIds.size === filteredIds.length) {
            setSelectedAssetIds(new Set());
        } else {
            setSelectedAssetIds(new Set(filteredIds));
        }
    };

    const handleBulkDelete = async () => {
        if (selectedAssetIds.size === 0) return;
        if (!window.confirm(`Are you sure you want to delete ${selectedAssetIds.size} assets?`)) return;

        try {
            await deleteAssets(Array.from(selectedAssetIds));
            setSelectedAssetIds(new Set());
        } catch (error) {
            alert('Failed to delete assets');
        }
    };

    // Handle Upload
    const handleUpload = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsUploading(true);

        try {
            const hashtags = inputHashtags.split(',').map(h => h.trim()).filter(h => h.length > 0);

            if (uploadMode === 'file' && fileInputRef.current?.files) {
                const files = Array.from(fileInputRef.current.files);
                for (let i = 0; i < files.length; i++) {
                    const file = files[i];

                    let thumbnailUrl: string | undefined = undefined;

                    // If it's a planner (PDF), generate a thumbnail of page 1
                    if (activeTab === 'planner' && file.type === 'application/pdf') {
                        try {
                            const arrayBuffer = await file.arrayBuffer();
                            const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
                            const pdf = await loadingTask.promise;
                            if (pdf.numPages > 0) {
                                const page = await pdf.getPage(1);
                                const viewport = page.getViewport({ scale: 0.5 });
                                const canvas = document.createElement('canvas');
                                const context = canvas.getContext('2d');
                                canvas.height = viewport.height;
                                canvas.width = viewport.width;
                                if (context) {
                                    await page.render({ canvasContext: context, viewport }).promise;
                                    const thumbBlob = await new Promise<Blob | null>(res => canvas.toBlob(res, 'image/png'));
                                    if (thumbBlob) {
                                        try {
                                            const { uploadFileToDrive, signIn, checkIsSignedIn } = await import('../../lib/googleDrive');
                                            if (!checkIsSignedIn()) await signIn();
                                            const subfolderName = `Library ${activeTab.charAt(0).toUpperCase() + activeTab.slice(1)}s`;
                                            const thumbResult = await uploadFileToDrive(
                                                thumbBlob,
                                                `thumb-${generateUUID()}.png`,
                                                'image/png',
                                                true,
                                                undefined,
                                                subfolderName
                                            );
                                            thumbnailUrl = thumbResult.thumbnailUrl;
                                        } catch (thumbDriveErr) {
                                            console.warn('Failed to upload PDF thumbnail to Drive:', thumbDriveErr);
                                        }
                                    }
                                }
                            }
                        } catch (thumbErr) {
                            console.warn("Failed to generate PDF thumbnail:", thumbErr);
                        }
                    }

                    await uploadAsset(file, activeTab, inputCategory || 'Personal', hashtags, thumbnailUrl, isAdmin ? isPublicInput : false);
                }
            } else if (uploadMode === 'url' && inputUrl) {
                await addAssetByUrl(inputUrl, inputTitle || 'New Asset', activeTab, inputCategory || 'Personal', hashtags, isAdmin ? isPublicInput : false);
            }

            // Reset and close
            setIsUploadModalOpen(false);
            setInputUrl('');
            setInputTitle('');
            setInputCategory('');
            setInputHashtags('');
            if (fileInputRef.current) fileInputRef.current.value = '';
        } catch (error) {
            console.error('Upload failed:', error);
            alert('Upload failed. Please try again.');
        } finally {
            setIsUploading(false);
        }
    };

    const handleEditMetadata = (asset: any) => {
        setEditingAsset(asset);
        setEditTitle(asset.title);
        setEditCategory(asset.category || '');
        setEditHashtags(Array.isArray(asset.hashtags) ? asset.hashtags.join(', ') : '');
        setEditIsPublic(!asset.user_id);
    };

    const handleSaveMetadata = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!editingAsset) return;

        setIsSavingEdit(true);
        try {
            const hashtags = editHashtags.split(',').map(h => h.trim()).filter(h => h.length > 0);
            await updateAssetMetadata(editingAsset.id, {
                title: editTitle,
                category: editCategory,
                hashtags: hashtags,
                user_id: isAdmin ? (editIsPublic ? null : userProfile?.id) : editingAsset.user_id
            });
            setEditingAsset(null);
        } catch (error) {
            console.error('Failed to update asset:', error);
            alert('Update failed');
        } finally {
            setIsSavingEdit(false);
        }
    };

    const handleDeleteAsset = async (id: string) => {
        if (!isAdmin) {
            alert('Only administrators can delete assets from the central library.');
            return;
        }

        if (confirm('Are you sure you want to delete this asset? This cannot be undone.')) {
            try {
                await deleteAsset(id);
            } catch (error) {
                console.error('Delete failed:', error);
                alert('Delete failed');
            }
        }
    };

    const handleSavePainting = async (blob: Blob, mode: 'save' | 'saveAs') => {
        if (!paintingAsset) return;
        setIsSavingEdit(true);
        try {
            if (mode === 'save') {
                await saveEditedAsset(paintingAsset.id, blob);
            } else {
                // Save as New Asset
                const newTitle = `${paintingAsset.title} (Edited)`;
                const fileName = `${newTitle.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.png`;
                const file = new File([blob], fileName, { type: 'image/png' });

                await uploadAsset(
                    file,
                    paintingAsset.type,
                    paintingAsset.category || 'Edited',
                    paintingAsset.hashtags || [],
                    undefined,
                    isAdmin ? isPublicInput : false
                );
            }
            setPaintingAsset(null);
        } catch (error) {
            console.error('Failed to save painted asset:', error);
            alert('Failed to save painted asset.');
        } finally {
            setIsSavingEdit(false);
        }
    };

    return (
        <div className="flex flex-col h-full w-full overflow-hidden bg-white">
            <PageHero
                pageKey="library"
                title="Asset Library"
                subtitle="Manage your templates, stickers, and creative assets."
            />

            {/* HEADER (Controls Bar) */}
            <header className="px-4 md:px-8 py-3 md:py-4 bg-white border-b border-gray-100 sticky top-0 z-20 shadow-sm">
                <div className="flex flex-col lg:flex-row items-stretch lg:items-center gap-6">
                    {/* LEFT: Planner Navigation */}
                    <div className="flex-shrink-0 flex items-center gap-4">
                        <button
                            onClick={() => setIsCategoriesExpanded(!isCategoriesExpanded)}
                            className="p-2 text-gray-400 hover:text-indigo-600 transition-colors"
                            title="Toggle Categories"
                        >
                            <LayoutGrid size={20} />
                        </button>
                        <PlannerTabs />
                    </div>

                    {/* MIDDLE: Asset Categories (Stickers, Covers, etc) */}
                    <div className="flex-1 flex justify-center min-w-0">
                        <div className="flex bg-gray-100/80 p-1 rounded-xl overflow-x-auto scrollbar-hide">
                            <TabButton active={activeTab === 'sticker'} onClick={() => setActiveTab('sticker')} icon={<Sticker size={14} />} label="Stickers" />
                            <TabButton active={activeTab === 'cover'} onClick={() => setActiveTab('cover')} icon={<FileImage size={14} />} label="Covers" />
                            <TabButton active={activeTab === 'template'} onClick={() => setActiveTab('template')} icon={<LayoutTemplate size={14} />} label="Templates" />
                            <TabButton active={activeTab === 'image'} onClick={() => setActiveTab('image')} icon={<FileImage size={14} />} label="Images" />
                            <TabButton active={activeTab === 'planner'} onClick={() => setActiveTab('planner')} icon={<Book size={14} />} label="Planners" />
                        </div>
                    </div>

                    {/* RIGHT: Controls (Personal/Community, Search, Refresh) */}
                    <div className="flex items-center gap-4 justify-between lg:justify-end flex-shrink-0">
                        <div className="flex bg-indigo-50/50 p-1 rounded-xl border border-indigo-100/50">
                            <button
                                onClick={() => setViewMode('mine')}
                                className={`px-4 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all ${viewMode === 'mine' ? 'bg-indigo-600 text-white shadow-lg' : 'text-indigo-400 hover:text-indigo-600'}`}
                            >
                                Personal
                            </button>
                            <button
                                onClick={() => setViewMode('all')}
                                className={`px-4 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all ${viewMode === 'all' ? 'bg-indigo-600 text-white shadow-lg' : 'text-indigo-400 hover:text-indigo-600'}`}
                            >
                                Community
                            </button>
                        </div>

                        <div className="relative hidden sm:block">
                            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                            <input
                                type="text"
                                placeholder={`Search...`}
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="pl-10 pr-4 py-2 bg-gray-50 border border-gray-100 rounded-xl focus:ring-2 focus:ring-indigo-500 w-40 xl:w-48 text-xs transition-all outline-none"
                            />
                        </div>

                        <button
                            className={`p-2 hover:text-indigo-600 transition-all ${isLoadingAssets ? 'animate-spin text-indigo-500' : 'text-gray-400'}`}
                            onClick={async () => {
                                // First refresh existing categories and assets
                                await fetchLibraryCategories(activeTab, viewMode);
                                await fetchLibraryAssets(activeTab, selectedCategory || undefined, activeHashtag || undefined, viewMode);
                                // Then perform deep sync with Google Drive
                                await syncGoogleDriveAssets();
                            }}
                            title="Sync with Google Drive"
                        >
                            <RefreshCcw size={20} />
                        </button>
                    </div>
                </div>
            </header>

            <div className="flex flex-1 overflow-hidden relative">
                {/* SIDEBAR */}
                <aside className={`
                    bg-white lg:bg-gray-50/50 border-r border-gray-100 overflow-y-auto transition-all duration-300 z-30
                    ${isCategoriesExpanded ? 'w-64 translate-x-0' : 'w-0 -translate-x-full lg:translate-x-0 lg:opacity-0'}
                    lg:relative absolute inset-y-0 left-0 shadow-2xl lg:shadow-none
                `}>
                    <div className="p-6">
                        <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-4">Categories</h3>
                        <div className="flex flex-col gap-1">
                            <CategoryButton
                                active={selectedCategory === null}
                                onClick={() => handleCategorySelect(null)}
                                label={`All ${activeTab}s`}
                                showChevron={selectedCategory === null}
                            />
                            {libraryCategories.map(cat => (
                                <CategoryButton
                                    key={cat}
                                    active={selectedCategory === cat}
                                    onClick={() => handleCategorySelect(cat)}
                                    label={cat}
                                    showChevron={selectedCategory === cat}
                                />
                            ))}
                        </div>
                    </div>
                </aside>

                {/* Mobile Backdrop for Sidebar */}
                {isCategoriesExpanded && (
                    <div
                        className="lg:hidden fixed inset-0 bg-black/20 backdrop-blur-sm z-20"
                        onClick={() => setIsCategoriesExpanded(false)}
                    />
                )}

                {/* CONTENT AREA */}
                <div className="flex-1 overflow-y-auto p-4 md:p-8 bg-gray-50/20">
                    {activeHashtag && (
                        <div className="mb-6">
                            <button
                                onClick={() => handleHashtagSelect(null)}
                                className="bg-indigo-50 text-indigo-600 px-3 py-1.5 rounded-full text-xs font-bold flex items-center gap-2 border border-indigo-100 shadow-sm"
                            >
                                <Hash size={12} /> {activeHashtag} <span className="text-indigo-300">✕</span>
                            </button>
                        </div>
                    )}

                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-3 md:gap-6">
                        {/* Add Asset Button Card - Only for Admin */}
                        {isAdmin && (
                            <button
                                className="aspect-square bg-white border-2 border-dashed border-gray-200 rounded-2xl flex flex-col items-center justify-center gap-3 hover:border-indigo-400 hover:bg-indigo-50/50 transition-all group"
                                onClick={() => setIsUploadModalOpen(true)}
                            >
                                <div className="w-12 h-12 rounded-full bg-gray-50 flex items-center justify-center group-hover:bg-indigo-100 transition-colors">
                                    <Plus size={24} className="text-gray-400 group-hover:text-indigo-600" />
                                </div>
                                <span className="text-xs font-bold text-gray-500 group-hover:text-indigo-600">
                                    Add {activeTab.charAt(0).toUpperCase() + activeTab.slice(1)}
                                </span>
                            </button>
                        )}

                        {libraryAssets.filter(a => a.title.toLowerCase().includes(searchTerm.toLowerCase())).map(asset => (
                            <div key={asset.id} className="group relative bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-xl transition-all overflow-hidden flex flex-col">
                                {/* CARD ACTIONS OVERLAY */}
                                <div className="absolute top-3 right-3 flex flex-col gap-2 opacity-0 group-hover:opacity-100 transition-all z-10 translate-x-4 group-hover:translate-x-0">
                                    <button onClick={(e) => { e.stopPropagation(); handleEditMetadata(asset); }} className="p-2 bg-white/90 backdrop-blur shadow-lg rounded-xl text-gray-600 hover:text-indigo-600 hover:scale-110 transition-all">
                                        <Edit size={14} />
                                    </button>
                                    <button onClick={(e) => { e.stopPropagation(); setPaintingAsset(asset); }} className="p-2 bg-white/90 backdrop-blur shadow-lg rounded-xl text-gray-600 hover:text-pink-600 hover:scale-110 transition-all">
                                        <Palette size={14} />
                                    </button>
                                    <button onClick={(e) => { e.stopPropagation(); handleDeleteAsset(asset.id); }} className="p-2 bg-white/90 backdrop-blur shadow-lg rounded-xl text-gray-600 hover:text-red-600 hover:scale-110 transition-all">
                                        <Trash2 size={14} />
                                    </button>
                                </div>

                                {/* SELECTION CHECKBOX */}
                                <button
                                    onClick={(e) => toggleAssetSelection(asset.id, e)}
                                    className={`absolute top-4 left-4 z-20 w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-all ${selectedAssetIds.has(asset.id)
                                        ? 'bg-indigo-600 border-indigo-600 text-white shadow-lg'
                                        : 'bg-white/40 backdrop-blur-sm border-white/60 text-transparent opacity-0 group-hover:opacity-100 hover:border-white'
                                        }`}
                                >
                                    <Check size={14} strokeWidth={4} />
                                </button>

                                <div className="aspect-square relative overflow-hidden bg-gray-50 flex items-center justify-center">
                                    <AssetThumbnail
                                        asset={asset}
                                        onClick={() => {
                                            if (asset.url.toLowerCase().endsWith('.pdf')) return;
                                            setPreviewAsset(asset);
                                        }}
                                    />
                                </div>

                                <div className="p-4 flex-1 flex flex-col justify-between">
                                    <div>
                                        <div className="text-[10px] font-black text-indigo-500 uppercase tracking-widest mb-1">{asset.category || 'Uncategorized'}</div>
                                        <div className="text-sm font-bold text-gray-800 line-clamp-1" title={asset.title}>{asset.title}</div>
                                    </div>

                                    {/* ASSET METADATA */}
                                    <div className="mt-3 text-[9px] text-gray-400 font-medium space-y-1 opacity-80 group-hover:opacity-100 transition-opacity">
                                        <div className="flex justify-between"><span>Type:</span> <span className="text-gray-600 capitalize">{asset.type}</span></div>
                                        <div className="flex justify-between"><span>Added:</span> <span className="text-gray-600">{new Date(asset.created_at).toLocaleDateString()}</span></div>
                                        {asset.hashtags && asset.hashtags.length > 0 && (
                                            <div className="flex justify-between items-start gap-2">
                                                <span>Tags:</span>
                                                <span className="text-gray-600 text-right line-clamp-2">
                                                    {asset.hashtags.map((h: string) => `#${h}`).join(' ')}
                                                </span>
                                            </div>
                                        )}
                                        {asset.is_public && (
                                            <div className="flex justify-between text-indigo-500 font-bold mt-1"><span>Visibility:</span> <span>Public</span></div>
                                        )}
                                    </div>

                                    {activeTab === 'planner' && (
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                setPdfSourceUrl(asset.url);
                                                setIsPDFModalOpen(true);
                                            }}
                                            className="mt-4 w-full py-2 bg-indigo-50 text-indigo-600 rounded-lg text-xs font-bold hover:bg-indigo-600 hover:text-white transition-all"
                                        >
                                            Load as Planner
                                        </button>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>

                    {!isLoadingAssets && libraryAssets.length === 0 && (
                        <div className="flex flex-col items-center justify-center py-20 text-gray-400 gap-4">
                            <div className="p-8 bg-white rounded-3xl shadow-sm">
                                <LayoutTemplate size={64} className="text-gray-100" />
                            </div>
                            <p className="font-medium">No {activeTab}s found in this category.</p>
                        </div>
                    )}
                </div>
            </div>

            {/* BULK ACTIONS FLOATING TOOLBAR */}
            {isBulkSelecting && (
                <div className="fixed bottom-10 left-1/2 -translate-x-1/2 bg-slate-900 border border-slate-800 text-white px-8 py-5 rounded-[28px] shadow-2xl z-[90] flex items-center gap-10 animate-in slide-in-from-bottom-10 fade-in duration-500 ring-4 ring-white/10">
                    <div className="flex flex-col">
                        <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mb-1">Selected Assets</span>
                        <div className="flex items-center gap-3">
                            <span className="text-xl font-black text-white">{selectedAssetIds.size}</span>
                            <span className="text-xs font-bold text-slate-500">Items marked</span>
                        </div>
                    </div>

                    <div className="h-10 w-px bg-slate-800" />

                    <div className="flex items-center gap-3">
                        <button
                            onClick={handleSelectAll}
                            className={`flex items-center gap-2 px-5 py-2.5 rounded-2xl transition-all font-bold text-xs uppercase tracking-wider ${selectedAssetIds.size === libraryAssets.filter(a => a.title.toLowerCase().includes(searchTerm.toLowerCase())).length
                                ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/20'
                                : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                                }`}
                        >
                            <CheckSquare size={16} />
                            {selectedAssetIds.size === libraryAssets.length ? 'Deselect All' : 'Select All'}
                        </button>

                        <button
                            onClick={handleBulkDelete}
                            className="flex items-center gap-2 px-5 py-2.5 bg-red-500/10 text-red-400 hover:bg-red-500 hover:text-white rounded-2xl transition-all font-bold text-xs uppercase tracking-wider group"
                        >
                            <Trash2 size={16} className="group-hover:scale-110 transition-transform" />
                            Bulk Delete
                        </button>

                        <button
                            onClick={() => setSelectedAssetIds(new Set())}
                            className="p-2.5 text-slate-500 hover:text-white hover:bg-slate-800 rounded-2xl transition-all"
                            title="Clear Selection"
                        >
                            <X size={20} />
                        </button>
                    </div>
                </div>
            )}

            {/* Modals */}
            {isUploadModalOpen && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
                    <div className="bg-white w-full max-w-lg rounded-[32px] overflow-hidden shadow-2xl animate-in fade-in zoom-in duration-300">
                        <div className="px-8 pt-8 pb-4 flex items-center justify-between">
                            <h2 className="text-2xl font-black text-gray-900 tracking-tight">New {activeTab}</h2>
                            <button onClick={() => setIsUploadModalOpen(false)} className="p-2 hover:bg-gray-100 rounded-full transition-colors text-gray-400">
                                <X size={24} />
                            </button>
                        </div>

                        <div className="px-8 pb-8">
                            <div className="flex bg-gray-100 p-1 rounded-2xl mb-8">
                                <button onClick={() => setUploadMode('file')} className={`flex-1 py-3 rounded-xl text-sm font-bold transition-all ${uploadMode === 'file' ? 'bg-white shadow-sm text-indigo-600' : 'text-gray-500 hover:text-gray-700'}`}>Local File</button>
                                <button onClick={() => setUploadMode('url')} className={`flex-1 py-3 rounded-xl text-sm font-bold transition-all ${uploadMode === 'url' ? 'bg-white shadow-sm text-indigo-600' : 'text-gray-500 hover:text-gray-700'}`}>Online URL</button>
                            </div>

                            <form onSubmit={handleUpload} className="space-y-6">
                                {uploadMode === 'file' ? (
                                    <div className="space-y-2">
                                        <label className="text-xs font-black text-gray-400 uppercase tracking-widest ml-1">Select Files</label>
                                        <input type="file" ref={fileInputRef} accept={activeTab === 'template' || activeTab === 'planner' ? "image/*,.pdf" : "image/*"} multiple required className="w-full p-4 bg-gray-50 border-2 border-dashed border-gray-200 rounded-2xl file:hidden text-sm font-medium text-gray-600 cursor-pointer hover:border-indigo-300 transition-colors" />
                                    </div>
                                ) : (
                                    <>
                                        <div className="space-y-2">
                                            <label className="text-xs font-black text-gray-400 uppercase tracking-widest ml-1">URL</label>
                                            <input type="url" placeholder="https://..." value={inputUrl} onChange={(e) => setInputUrl(e.target.value)} required className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all" />
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-xs font-black text-gray-400 uppercase tracking-widest ml-1">Title</label>
                                            <input type="text" placeholder="Inspiration" value={inputTitle} onChange={(e) => setInputTitle(e.target.value)} required className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all" />
                                        </div>
                                    </>
                                )}
                                <div className="space-y-2">
                                    <label className="text-xs font-black text-gray-400 uppercase tracking-widest ml-1">Category</label>
                                    <input type="text" placeholder="e.g. Minimalist" value={inputCategory} onChange={(e) => setInputCategory(e.target.value)} className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all" />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-xs font-black text-gray-400 uppercase tracking-widest ml-1">Hashtags</label>
                                    <input type="text" placeholder="cute, study, planning" value={inputHashtags} onChange={(e) => setInputHashtags(e.target.value)} className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all" />
                                </div>

                                {isAdmin && (
                                    <div className="flex items-center gap-3 p-4 bg-indigo-50/50 rounded-2xl border border-indigo-100/50">
                                        <div className="flex-1">
                                            <h4 className="text-xs font-black text-indigo-900 uppercase tracking-wider">Public Asset</h4>
                                            <p className="text-[10px] text-indigo-600 font-medium">Make this visible to the entire community.</p>
                                        </div>
                                        <button
                                            type="button"
                                            onClick={() => setIsPublicInput(!isPublicInput)}
                                            className={`w-12 h-6 rounded-full p-1 transition-all duration-300 ${isPublicInput ? 'bg-indigo-600' : 'bg-gray-200'}`}
                                        >
                                            <div className={`w-4 h-4 bg-white rounded-full transition-all duration-300 transform ${isPublicInput ? 'translate-x-6' : 'translate-x-0'}`} />
                                        </button>
                                    </div>
                                )}

                                <button type="submit" disabled={isUploading} className="w-full py-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl font-black text-lg shadow-xl shadow-indigo-100 transition-all active:scale-[0.98] disabled:opacity-50">
                                    {isUploading ? 'Transferring...' : 'Complete Upload'}
                                </button>
                            </form>
                        </div>
                    </div>
                </div>
            )}

            {editingAsset && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
                    <div className="bg-white w-full max-w-sm rounded-3xl p-8 shadow-2xl">
                        <h2 className="text-xl font-black mb-6">Edit Properties</h2>
                        <form onSubmit={handleSaveMetadata} className="space-y-4">
                            <input type="text" value={editTitle} onChange={(e) => setEditTitle(e.target.value)} required className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl" placeholder="Title" />
                            <input type="text" value={editCategory} onChange={(e) => setEditCategory(e.target.value)} className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl" placeholder="Category" />
                            <input type="text" value={editHashtags} onChange={(e) => setEditHashtags(e.target.value)} className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl" placeholder="Hashtags" />

                            {isAdmin && (
                                <div className="flex items-center gap-3 p-4 bg-indigo-50/50 rounded-2xl border border-indigo-100/50">
                                    <div className="flex-1">
                                        <h4 className="text-xs font-black text-indigo-900 uppercase tracking-wider">Public Asset</h4>
                                        <p className="text-[10px] text-indigo-600 font-medium">Make this visible to the community.</p>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => setEditIsPublic(!editIsPublic)}
                                        className={`w-12 h-6 rounded-full p-1 transition-all duration-300 ${editIsPublic ? 'bg-indigo-600' : 'bg-gray-200'}`}
                                    >
                                        <div className={`w-4 h-4 bg-white rounded-full transition-all duration-300 transform ${editIsPublic ? 'translate-x-6' : 'translate-x-0'}`} />
                                    </button>
                                </div>
                            )}

                            <div className="flex gap-3 mt-8">
                                <button type="button" onClick={() => setEditingAsset(null)} className="flex-1 py-3 border border-gray-200 rounded-xl font-bold text-gray-600 hover:bg-gray-50">Discard</button>
                                <button type="submit" disabled={isSavingEdit} className="flex-1 py-3 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 shadow-lg shadow-indigo-100">
                                    {isSavingEdit ? 'Saving...' : 'Confirm'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {paintingAsset && (
                <AssetEditor imageUrl={paintingAsset.url} onSave={handleSavePainting} onClose={() => setPaintingAsset(null)} />
            )}

            {previewAsset && (
                <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[200] flex items-center justify-center p-4 cursor-zoom-out" onClick={() => setPreviewAsset(null)}>
                    <button className="absolute top-6 right-6 text-white/50 hover:text-white bg-black/50 hover:bg-black/80 rounded-full p-2 transition-all" onClick={() => setPreviewAsset(null)}>
                        <X size={24} />
                    </button>
                    <img
                        src={previewAsset.source === 'google_drive' && previewAsset.external_id
                            ? `https://drive.google.com/thumbnail?id=${previewAsset.external_id}&sz=s1000`
                            : (previewAsset.thumbnail_url?.includes('googleusercontent.com') ? previewAsset.thumbnail_url.replace(/=s\d+/, '=s2048') : previewAsset.thumbnail_url) || previewAsset.url}
                        alt={previewAsset.title}
                        referrerPolicy="no-referrer"
                        className="max-w-[90vw] max-h-[90vh] object-contain rounded-xl shadow-2xl z-[201] cursor-default"
                        onClick={(e) => e.stopPropagation()}
                    />
                </div>
            )}

            <PDFImportModal isOpen={isPDFModalOpen} onClose={() => { setIsPDFModalOpen(false); setPdfSourceUrl(undefined); }} sourceUrl={pdfSourceUrl} />
        </div >
    );
};

const TabButton: React.FC<{ active: boolean; onClick: () => void; icon: React.ReactNode; label: string }> = ({ active, onClick, icon, label }) => (
    <button
        onClick={onClick}
        className={`px-4 py-2 rounded-lg flex items-center gap-2 text-xs font-bold transition-all ${active ? 'bg-white shadow-sm text-indigo-600' : 'text-gray-500 hover:text-gray-700'}`}
    >
        {icon}
        <span className="hidden sm:inline">{label}</span>
    </button>
);

const CategoryButton: React.FC<{ active: boolean; onClick: () => void; label: string, showChevron?: boolean }> = ({ active, onClick, label, showChevron }) => (
    <button
        onClick={onClick}
        className={`flex items-center justify-between w-full px-4 py-2.5 rounded-xl transition-all text-xs font-bold ${active ? 'bg-white shadow-sm text-indigo-600 border border-gray-100' : 'text-gray-500 hover:bg-white/50 hover:text-gray-700'}`}
    >
        <span className="truncate">{label}</span>
        {active && showChevron && <ChevronRight size={14} />}
    </button>
);

const AssetThumbnail: React.FC<{ asset: any; onClick: () => void }> = ({ asset, onClick }) => {
    const [hasError, setHasError] = useState(false);

    // Fallback Icons based on MimeType / Extension
    const renderFallback = () => {
        const iconProps = { size: 64, strokeWidth: 1.5, className: "text-gray-300 group-hover:text-indigo-300 transition-colors" };
        const ext = asset.url?.split('.').pop()?.toLowerCase();
        const mime = asset.mimeType?.toLowerCase() || '';

        if (mime.includes('zip') || mime.includes('archive') || ext === 'zip' || ext === 'rar' || ext === '7z')
            return <FileArchive {...iconProps} />;
        if (mime.includes('json') || ext === 'json')
            return <FileJson {...iconProps} />;
        if (mime.includes('text') || ext === 'txt' || ext === 'md')
            return <FileText {...iconProps} />;
        if (ext === 'js' || ext === 'ts' || ext === 'tsx' || ext === 'html' || ext === 'css' || mime.includes('javascript'))
            return <FileCode {...iconProps} />;
        if (mime.includes('pdf') || ext === 'pdf')
            return <FileText {...iconProps} className="text-red-300 group-hover:text-red-400 transition-colors" />;

        return <FileIcon {...iconProps} />;
    };

    if (hasError || (!asset.thumbnail_url && !asset.url)) {
        return <div className="flex flex-col items-center gap-2">{renderFallback()}</div>;
    }

    const isDrive = asset.source === 'google_drive' || asset.url?.includes('drive.google.com');
    // For Google Drive assets, we prioritize the dynamic stable thumbnail URL
    const src = (isDrive && asset.external_id)
        ? `https://drive.google.com/thumbnail?id=${asset.external_id}&sz=w400`
        : (asset.thumbnail_url || asset.url);

    return (
        <img
            src={src}
            alt={asset.title}
            referrerPolicy="no-referrer"
            className={`w-full h-full cursor-pointer transition-all duration-500 ${isDrive ? 'object-cover' : 'object-contain p-4 group-hover:scale-110'}`}
            onClick={onClick}
            onError={() => setHasError(true)}
        />
    );
};

export default LibraryPage;
