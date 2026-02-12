import React, { useState, useEffect } from 'react';
import { Book, Sticker, FileImage, LayoutTemplate, Search, LayoutGrid, Heart, Archive, Hash, ChevronRight, Edit, Trash2, Palette, RefreshCcw } from 'lucide-react';
import { NavLink } from 'react-router-dom';
import { usePlannerStore } from '../../store/plannerStore';
import AssetEditor from './AssetEditor';
import { PDFImportModal } from '../dashboard/PDFImportModal';
import { PDFThumbnail } from '../ui/PDFThumbnail';
import * as pdfjsLib from 'pdfjs-dist';
import { generateUUID } from '../../store/plannerStore';
import { supabase } from '../../supabase/client';
import '../dashboard/Dashboard.css';

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
        fetchLibraryCategories(activeTab);
        fetchLibraryAssets(activeTab);
    }, [activeTab, fetchLibraryCategories, fetchLibraryAssets]);

    // Handle Category change
    const handleCategorySelect = (cat: string | null) => {
        setSelectedCategory(cat);
        fetchLibraryAssets(activeTab, cat || undefined, activeHashtag || undefined);
    };

    // Handle Hashtag change
    const handleHashtagSelect = (tag: string | null) => {
        setActiveHashtag(tag);
        fetchLibraryAssets(activeTab, selectedCategory || undefined, tag || undefined);
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
        <div className="dashboard-layout">
            {/* 1. PRIMARY SIDEBAR (Fixed Narrow 70px) */}
            <aside className="dashboard-sidebar">
                <div className="brand-logo">ZOABI</div>
                <nav className="nav-menu">
                    <NavLink to="/homepage" className="nav-item" title="Home">
                        <LayoutGrid size={22} />
                    </NavLink>
                    <NavLink to="/favorites" className="nav-item" title="Favorites">
                        <Heart size={22} />
                    </NavLink>
                    <NavLink to="/archive" className="nav-item" title="Archive">
                        <Archive size={22} />
                    </NavLink>
                    <div className="nav-item active" title="Library">
                        <Book size={22} />
                    </div>
                </nav>
                <div className="sidebar-footer">
                    <div className="avatar-circle">M</div>
                </div>
            </aside>

            {/* THE STAGE */}
            <main className="dashboard-main">
                {/* 5. HEADER (Compact Single Row Row) */}
                <header className="dashboard-header">
                    <div className="header-left-group">
                        <button
                            onClick={() => setIsCategoriesExpanded(!isCategoriesExpanded)}
                            style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', padding: 0, display: 'flex' }}
                            title="Toggle Categories"
                        >
                            <LayoutGrid size={20} />
                        </button>
                        <h2 className="library-title-compact">Library</h2>

                        <div className="nav-pill-tabs">
                            <TabButton active={activeTab === 'sticker'} onClick={() => setActiveTab('sticker')} icon={<Sticker size={14} />} label="Stickers" />
                            <TabButton active={activeTab === 'cover'} onClick={() => setActiveTab('cover')} icon={<FileImage size={14} />} label="Covers" />
                            <TabButton active={activeTab === 'template'} onClick={() => setActiveTab('template')} icon={<LayoutTemplate size={14} />} label="Templates" />
                            <TabButton active={activeTab === 'image'} onClick={() => setActiveTab('image')} icon={<FileImage size={14} />} label="Images" />
                            <TabButton active={activeTab === 'planner'} onClick={() => setActiveTab('planner')} icon={<Book size={14} />} label="Planners" />
                        </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        <div className="search-bar">
                            <div className="search-wrapper">
                                <Search size={14} className="search-icon" />
                                <input
                                    type="text"
                                    placeholder="Search..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    style={{ border: 'none', background: 'transparent', outline: 'none', width: '100%', paddingLeft: '32px' }}
                                />
                            </div>
                        </div>
                        <button
                            className="btn-refresh"
                            style={{ padding: '0.4rem 0.8rem', fontSize: '0.75rem', borderRadius: '8px' }}
                            onClick={() => {
                                fetchLibraryCategories(activeTab);
                                fetchLibraryAssets(activeTab, selectedCategory || undefined, activeHashtag || undefined);
                            }}
                            title="Refresh"
                        >
                            <RefreshCcw size={14} />
                        </button>
                    </div>
                </header>

                <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
                    {/* 2. SECONDARY SIDEBAR (Fluid-Fixed fit-content) */}
                    <aside className={`library-secondary-sidebar ${isCategoriesExpanded ? 'expanded' : 'collapsed'}`}>
                        <h3 className="sidebar-section-title">Categories</h3>
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
                    </aside>

                    {/* 3. CONTENT AREA (Flex-Grow Stage) */}
                    <div className="content-scroll-area">
                        {activeHashtag && (
                            <div style={{ marginBottom: '1.25rem' }}>
                                <span
                                    onClick={() => handleHashtagSelect(null)}
                                    style={{ background: '#e0e7ff', color: '#4338ca', padding: '0.2rem 0.6rem', borderRadius: '100px', fontSize: '0.75rem', fontWeight: '600', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.3rem', width: 'fit-content' }}
                                >
                                    <Hash size={12} /> {activeHashtag} ✕
                                </span>
                            </div>
                        )}

                        {isLoadingAssets ? (
                            <div style={{ display: 'flex', justifyContent: 'center', padding: '4rem', color: '#64748b' }}>
                                <RefreshCcw size={24} className="animate-spin" />
                            </div>
                        ) : (
                            <div className="library-asset-grid">
                                {/* Add Asset Button Card */}
                                <div
                                    className="asset-card"
                                    onClick={() => setIsUploadModalOpen(true)}
                                    style={{ border: '2px dashed #e2e8f0', justifyContent: 'center', alignItems: 'center', background: '#fcfdfe' }}
                                >
                                    <div style={{ fontSize: '2rem', color: '#cbd5e1' }}>+</div>
                                    <div style={{ fontSize: '0.85rem', fontWeight: '700', color: '#94a3b8' }}>
                                        Add {activeTab.charAt(0).toUpperCase() + activeTab.slice(1)}
                                    </div>
                                </div>

                                {libraryAssets.filter(a => a.title.toLowerCase().includes(searchTerm.toLowerCase())).map(asset => (
                                    <div key={asset.id} className="asset-card">
                                        {/* 4. ASSET CARD (Hover Actions + Aspects) */}
                                        <div className="asset-actions-overlay">
                                            <button onClick={(e) => { e.stopPropagation(); handleEditMetadata(asset); }} className="overlay-btn" title="Edit">
                                                <Edit size={14} />
                                            </button>
                                            <button onClick={(e) => { e.stopPropagation(); setPaintingAsset(asset); }} className="overlay-btn" title="Paint">
                                                <Palette size={14} />
                                            </button>
                                            <button onClick={(e) => { e.stopPropagation(); handleDeleteAsset(asset.id); }} className="overlay-btn" title="Delete">
                                                <Trash2 size={14} />
                                            </button>
                                        </div>

                                        <div className="asset-thumbnail-container">
                                            {asset.thumbnail_url ? (
                                                <img src={asset.thumbnail_url} alt={asset.title} />
                                            ) : asset.url.toLowerCase().endsWith('.pdf') ? (
                                                <PDFThumbnail url={asset.url} />
                                            ) : (
                                                <img
                                                    src={asset.url}
                                                    alt={asset.title}
                                                    style={{ objectFit: 'contain', padding: '10%' }}
                                                    onError={(e) => {
                                                        e.currentTarget.onerror = null;
                                                        e.currentTarget.src = 'https://placehold.co/200x300/f1f5f9/94a3b8?text=No+Image';
                                                    }}
                                                />
                                            )}
                                        </div>

                                        <div className="asset-info">
                                            <div className="asset-title-indigo">{asset.title}</div>
                                            {asset.category && (
                                                <div style={{ fontSize: '0.7rem', color: '#94a3b8' }}>{asset.category}</div>
                                            )}
                                        </div>

                                        {activeTab === 'planner' && (
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    setPdfSourceUrl(asset.url);
                                                    setIsPDFModalOpen(true);
                                                }}
                                                className="load-planner-btn-indigo"
                                            >
                                                Load as Planner
                                            </button>
                                        )}
                                    </div>
                                ))}

                                {libraryAssets.length === 0 && (
                                    <div style={{ gridColumn: '1/-1', textAlign: 'center', padding: '4rem', color: '#94a3b8' }}>
                                        No {activeTab}s found.
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            </main>

            {/* Modals */}
            {isUploadModalOpen && (
                <div style={{
                    position: 'fixed',
                    top: 0, left: 0, right: 0, bottom: 0,
                    background: 'rgba(15, 23, 42, 0.6)',
                    backdropFilter: 'blur(4px)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    zIndex: 1000,
                    padding: '1rem'
                }}>
                    <div className="glass-panel" style={{
                        width: '100%', maxWidth: '480px',
                        background: 'white', borderRadius: '24px', padding: '2rem',
                        boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)'
                    }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                            <h2 style={{ fontSize: '1.5rem', fontWeight: '800', margin: 0 }}>Add New {activeTab.charAt(0).toUpperCase() + activeTab.slice(1)}</h2>
                            <button onClick={() => setIsUploadModalOpen(false)} style={{ background: 'none', border: 'none', fontSize: '1.5rem', cursor: 'pointer', color: '#94a3b8' }}>✕</button>
                        </div>

                        <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem', background: '#f1f5f9', padding: '0.3rem', borderRadius: '12px' }}>
                            <button onClick={() => setUploadMode('file')} style={{ flex: 1, padding: '0.6rem', borderRadius: '8px', border: 'none', background: uploadMode === 'file' ? 'white' : 'transparent', color: uploadMode === 'file' ? '#6366f1' : '#64748b', fontWeight: '600', cursor: 'pointer' }}>Local File</button>
                            <button onClick={() => setUploadMode('url')} style={{ flex: 1, padding: '0.6rem', borderRadius: '8px', border: 'none', background: uploadMode === 'url' ? 'white' : 'transparent', color: uploadMode === 'url' ? '#6366f1' : '#64748b', fontWeight: '600', cursor: 'pointer' }}>Internet URL</button>
                        </div>

                        <form onSubmit={handleUpload} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                            {uploadMode === 'file' ? (
                                <div>
                                    <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '600', color: '#475569', marginBottom: '0.5rem' }}>Select Files</label>
                                    <input type="file" ref={fileInputRef} accept={activeTab === 'template' || activeTab === 'planner' ? "image/*,.pdf" : "image/*"} multiple required style={{ width: '100%', padding: '0.75rem', borderRadius: '12px', border: '1px solid #e2e8f0', background: '#f8fafc' }} />
                                </div>
                            ) : (
                                <>
                                    <div>
                                        <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '600', color: '#475569', marginBottom: '0.5rem' }}>URL</label>
                                        <input type="url" placeholder="https://example.com/asset.png" value={inputUrl} onChange={(e) => setInputUrl(e.target.value)} required style={{ width: '100%', padding: '0.75rem', borderRadius: '12px', border: '1px solid #e2e8f0' }} />
                                    </div>
                                    <div>
                                        <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '600', color: '#475569', marginBottom: '0.5rem' }}>Title</label>
                                        <input type="text" placeholder="Title" value={inputTitle} onChange={(e) => setInputTitle(e.target.value)} required style={{ width: '100%', padding: '0.75rem', borderRadius: '12px', border: '1px solid #e2e8f0' }} />
                                    </div>
                                </>
                            )}
                            <div>
                                <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '600', color: '#475569', marginBottom: '0.5rem' }}>Category</label>
                                <input type="text" placeholder="e.g. Minimalist" value={inputCategory} onChange={(e) => setInputCategory(e.target.value)} style={{ width: '100%', padding: '0.75rem', borderRadius: '12px', border: '1px solid #e2e8f0' }} />
                            </div>
                            <div>
                                <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '600', color: '#475569', marginBottom: '0.5rem' }}>Hashtags</label>
                                <input type="text" placeholder="cute, pastel" value={inputHashtags} onChange={(e) => setInputHashtags(e.target.value)} style={{ width: '100%', padding: '0.75rem', borderRadius: '12px', border: '1px solid #e2e8f0' }} />
                            </div>
                            <button type="submit" disabled={isUploading} style={{ background: 'var(--primary)', color: 'white', border: 'none', padding: '1rem', borderRadius: '12px', fontWeight: '700', cursor: isUploading ? 'not-allowed' : 'pointer' }}>
                                {isUploading ? 'Uploading...' : 'Add Asset'}
                            </button>
                        </form>
                    </div>
                </div>
            )}

            {editingAsset && (
                <div style={{
                    position: 'fixed',
                    top: 0, left: 0, right: 0, bottom: 0,
                    background: 'rgba(15, 23, 42, 0.6)',
                    backdropFilter: 'blur(4px)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    zIndex: 1000
                }}>
                    <div className="glass-panel" style={{ width: '100%', maxWidth: '400px', background: 'white', borderRadius: '24px', padding: '2rem' }}>
                        <h2 style={{ fontSize: '1.25rem', fontWeight: '800', marginBottom: '1.5rem' }}>Edit Asset</h2>
                        <form onSubmit={handleSaveMetadata} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                            <input type="text" value={editTitle} onChange={(e) => setEditTitle(e.target.value)} required style={{ width: '100%', padding: '0.75rem', borderRadius: '12px', border: '1px solid #e2e8f0' }} />
                            <input type="text" value={editCategory} onChange={(e) => setEditCategory(e.target.value)} style={{ width: '100%', padding: '0.75rem', borderRadius: '12px', border: '1px solid #e2e8f0' }} />
                            <input type="text" value={editHashtags} onChange={(e) => setEditHashtags(e.target.value)} style={{ width: '100%', padding: '0.75rem', borderRadius: '12px', border: '1px solid #e2e8f0' }} />
                            <div style={{ display: 'flex', gap: '0.75rem' }}>
                                <button type="button" onClick={() => setEditingAsset(null)} style={{ flex: 1, padding: '0.75rem', borderRadius: '12px', border: '1px solid #e2e8f0', background: 'white' }}>Cancel</button>
                                <button type="submit" disabled={isSavingEdit} style={{ flex: 1, padding: '0.75rem', borderRadius: '12px', border: 'none', background: 'var(--primary)', color: 'white' }}>
                                    {isSavingEdit ? 'Saving...' : 'Save'}
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

            <style>{`
                .tab-btn { padding: 0.5rem 1rem; border: none; background: transparent; border-radius: 8px; color: #64748b; font-size: 0.85rem; font-weight: 600; cursor: pointer; display: flex; alignItems: center; gap: 0.5rem; transition: all 0.2s; }
                .tab-btn:hover { color: #1e293b; }
                .tab-btn.active { background: white; color: #6366f1; box-shadow: 0 4px 10px rgba(0,0,0,0.05); }
                .asset-card:hover { transform: translateY(-4px); box-shadow: 0 10px 15px -3px rgba(0,0,0,0.1); border-color: #6366f133; }
            `}</style>
        </div>
    );
};

const TabButton: React.FC<{ active: boolean; onClick: () => void; icon: React.ReactNode; label: string }> = ({ active, onClick, icon, label }) => (
    <button
        onClick={onClick}
        style={{
            padding: '0.4rem 0.75rem',
            border: 'none',
            background: active ? 'white' : 'transparent',
            borderRadius: '8px',
            color: active ? '#6366f1' : '#64748b',
            fontSize: '0.8rem',
            fontWeight: '700',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '0.4rem',
            transition: 'all 0.2s',
            boxShadow: active ? '0 2px 4px rgba(0,0,0,0.05)' : 'none'
        }}
    >
        {icon}
        <span className="hidden sm:inline">{label}</span>
    </button>
);

const CategoryButton: React.FC<{ active: boolean; onClick: () => void; label: string, showChevron?: boolean }> = ({ active, onClick, label, showChevron }) => (
    <button
        onClick={onClick}
        style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            width: '100%',
            padding: '0.5rem 0.75rem',
            borderRadius: '8px',
            background: active ? '#f1f5f9' : 'transparent',
            color: active ? '#6366f1' : '#64748b',
            border: 'none',
            cursor: 'pointer',
            fontWeight: active ? '700' : '500',
            fontSize: '0.85rem',
            textAlign: 'left',
            transition: 'all 0.1s'
        }}
    >
        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{label}</span>
        {active && showChevron && <ChevronRight size={14} />}
    </button>
);

export default LibraryPage;
