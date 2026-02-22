import React, { useState, useEffect } from 'react';
import { Book, Sticker, FileImage, LayoutTemplate, Search, LayoutGrid, Hash, ChevronRight, Edit, Trash2, Palette, RefreshCcw, Plus, X } from 'lucide-react';

import { usePlannerStore } from '../../store/plannerStore';
import AssetEditor from './AssetEditor';
import { PDFImportModal } from '../dashboard/PDFImportModal';
import { PDFThumbnail } from '../ui/PDFThumbnail';
import * as pdfjsLib from 'pdfjs-dist';
import { generateUUID } from '../../store/plannerStore';
import { supabase } from '../../supabase/client';
import '../dashboard/Dashboard.css';
import PageHero from '../ui/PageHero';
import { PlannerTabs } from '../dashboard/PlannerTabs';

// Configure PDF.js worker
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
        uploadAsset,
        addAssetByUrl
    } = usePlannerStore();

    const isAdmin = userProfile?.role === 'admin';

    // Use singular types to match DB: 'sticker', 'cover', 'template', 'image'
    const [activeTab, setActiveTab] = useState<'sticker' | 'cover' | 'template' | 'image' | 'planner'>('sticker');
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
    const [isUploading, setIsUploading] = useState(false);
    const fileInputRef = React.useRef<HTMLInputElement>(null);

    // Edit Modal State
    const [editingAsset, setEditingAsset] = useState<any | null>(null);
    const [editTitle, setEditTitle] = useState('');
    const [editCategory, setEditCategory] = useState('');
    const [editHashtags, setEditHashtags] = useState('');
    const [isSavingEdit, setIsSavingEdit] = useState(false);

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
                                        const thumbFileName = `thumbnails/${userProfile?.id || 'anon'}/${generateUUID()}.png`;
                                        const { error: thumbUploadError } = await supabase.storage
                                            .from('planner-uploads')
                                            .upload(thumbFileName, thumbBlob);

                                        if (!thumbUploadError) {
                                            const { data: { publicUrl } } = supabase.storage
                                                .from('planner-uploads')
                                                .getPublicUrl(thumbFileName);
                                            thumbnailUrl = publicUrl;
                                        }
                                    }
                                }
                            }
                        } catch (thumbErr) {
                            console.warn("Failed to generate PDF thumbnail:", thumbErr);
                        }
                    }

                    await uploadAsset(file, activeTab, inputCategory || 'Personal', hashtags, thumbnailUrl);
                }
            } else if (uploadMode === 'url' && inputUrl) {
                await addAssetByUrl(inputUrl, inputTitle || 'New Asset', activeTab, inputCategory || 'Personal', hashtags);
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
                hashtags: hashtags
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
                    paintingAsset.hashtags || []
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
            <header className="px-4 md:px-8 py-3 md:py-4 bg-white border-b border-gray-100 flex flex-col items-stretch sticky top-0 z-10 shadow-sm gap-4">
                <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
                    <div className="flex items-center gap-6 flex-1">
                        <button
                            onClick={() => setIsCategoriesExpanded(!isCategoriesExpanded)}
                            className="p-2 text-gray-400 hover:text-indigo-600 transition-colors hidden md:block"
                            title="Toggle Categories"
                        >
                            <LayoutGrid size={20} />
                        </button>

                        <div className="flex bg-gray-100/80 p-1 rounded-xl overflow-x-auto scrollbar-hide">
                            <TabButton active={activeTab === 'sticker'} onClick={() => setActiveTab('sticker')} icon={<Sticker size={14} />} label="Stickers" />
                            <TabButton active={activeTab === 'cover'} onClick={() => setActiveTab('cover')} icon={<FileImage size={14} />} label="Covers" />
                            <TabButton active={activeTab === 'template'} onClick={() => setActiveTab('template')} icon={<LayoutTemplate size={14} />} label="Templates" />
                            <TabButton active={activeTab === 'image'} onClick={() => setActiveTab('image')} icon={<FileImage size={14} />} label="Images" />
                            <TabButton active={activeTab === 'planner'} onClick={() => setActiveTab('planner')} icon={<Book size={14} />} label="Planners" />
                        </div>
                    </div>

                    <div className="flex items-center gap-4 justify-between md:justify-end">
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
                                className="pl-10 pr-4 py-2 bg-gray-50 border border-gray-100 rounded-xl focus:ring-2 focus:ring-indigo-500 w-48 text-xs transition-all outline-none"
                            />
                        </div>

                        <button
                            className="p-2 text-gray-400 hover:text-indigo-600 transition-colors"
                            onClick={() => {
                                fetchLibraryCategories(activeTab, viewMode);
                                fetchLibraryAssets(activeTab, selectedCategory || undefined, activeHashtag || undefined, viewMode);
                            }}
                            title="Refresh"
                        >
                            <RefreshCcw size={18} className={isLoadingAssets ? 'animate-spin' : ''} />
                        </button>
                    </div>
                </div>

                {/* Sub-Tabs */}
                <div className="flex items-center justify-between border-t border-gray-50 pt-2 md:pt-0 md:border-t-0">
                    <PlannerTabs />
                </div>
            </header>

            <div className="flex flex-1 overflow-hidden">
                {/* SIDEBAR */}
                <aside className={`bg-gray-50/50 border-r border-gray-100 overflow-y-auto transition-all duration-300 ${isCategoriesExpanded ? 'w-64' : 'w-0 opacity-0'}`}>
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

                {/* CONTENT AREA */}
                <div className="flex-1 overflow-y-auto p-8 bg-gray-50/20">
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

                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-6">
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

                                <div className="aspect-square relative overflow-hidden bg-gray-50 flex items-center justify-center">
                                    {asset.thumbnail_url ? (
                                        <img src={asset.thumbnail_url} alt={asset.title} className="w-full h-full object-cover" />
                                    ) : asset.url.toLowerCase().endsWith('.pdf') ? (
                                        <div className="scale-75"><PDFThumbnail url={asset.url} /></div>
                                    ) : (
                                        <img
                                            src={asset.url}
                                            alt={asset.title}
                                            className="w-full h-full object-contain p-4 group-hover:scale-110 transition-transform duration-500"
                                            onError={(e) => {
                                                e.currentTarget.onerror = null;
                                                e.currentTarget.src = 'https://placehold.co/400x400/f1f5f9/94a3b8?text=Error';
                                            }}
                                        />
                                    )}
                                </div>

                                <div className="p-4 flex-1 flex flex-col justify-between">
                                    <div>
                                        <div className="text-[10px] font-black text-indigo-500 uppercase tracking-widest mb-1">{asset.category || 'Uncategorized'}</div>
                                        <div className="text-sm font-bold text-gray-800 line-clamp-1">{asset.title}</div>
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

export default LibraryPage;
