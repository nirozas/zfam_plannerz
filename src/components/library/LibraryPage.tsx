import React, { useState, useEffect } from 'react';
import { Book, Sticker, FileImage, LayoutTemplate, Search, LayoutGrid, Heart, Archive, Hash, ChevronRight, Edit, Trash2, Palette } from 'lucide-react';
import { NavLink } from 'react-router-dom';
import { usePlannerStore } from '../../store/plannerStore';
import AssetEditor from './AssetEditor';
import { PDFImportModal } from '../dashboard/PDFImportModal';
import * as pdfjsLib from 'pdfjs-dist';
import { generateUUID } from '../../store/plannerStore';
import { supabase } from '../../lib/supabase';
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
                            const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
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
            {/* Sidebar Navigation */}
            <aside className="dashboard-sidebar">
                <div className="brand-logo">ZOABI</div>
                <nav className="nav-menu">
                    <NavLink to="/homepage" className="nav-item">
                        <LayoutGrid size={20} /> Home
                    </NavLink>
                    <NavLink to="/favorites" className="nav-item">
                        <Heart size={20} /> Favorites
                    </NavLink>
                    <NavLink to="/archive" className="nav-item">
                        <Archive size={20} /> Archive
                    </NavLink>
                    <div className="nav-item active">
                        <Book size={20} /> Library
                    </div>
                </nav>
            </aside>

            {/* Content Area */}
            <main className="dashboard-main" style={{ background: '#f8fafc', display: 'flex', flexDirection: 'column' }}>
                <header className="dashboard-header">
                    <div className="search-bar">
                        <div className="search-wrapper">
                            <Search size={18} className="search-icon" />
                            <input
                                type="text"
                                placeholder={`Search ${activeTab.charAt(0).toUpperCase() + activeTab.slice(1)}s...`}
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>
                    </div>
                    <button
                        className="btn-refresh"
                        style={{ marginLeft: '1rem', whiteSpace: 'nowrap' }}
                        onClick={() => {
                            fetchLibraryCategories(activeTab);
                            fetchLibraryAssets(activeTab, selectedCategory || undefined, activeHashtag || undefined);
                        }}
                    >
                        Refresh Library
                    </button>
                </header>

                <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
                    {/* Secondary Sidebar for Categories */}
                    <aside style={{
                        width: '240px',
                        background: 'white',
                        borderRight: '1px solid #e2e8f0',
                        padding: '1.5rem',
                        overflowY: 'auto',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '0.5rem'
                    }}>
                        <h3 style={{ fontSize: '0.85rem', textTransform: 'uppercase', color: '#94a3b8', letterSpacing: '0.05rem', marginBottom: '1rem' }}>Categories</h3>

                        <button
                            onClick={() => handleCategorySelect(null)}
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                width: '100%',
                                padding: '0.6rem 0.8rem',
                                borderRadius: '8px',
                                background: selectedCategory === null ? '#f1f5f9' : 'transparent',
                                color: selectedCategory === null ? '#6366f1' : '#64748b',
                                border: 'none',
                                cursor: 'pointer',
                                fontWeight: selectedCategory === null ? '600' : '400'
                            }}
                        >
                            <span>All {activeTab}s</span>
                            {selectedCategory === null && <ChevronRight size={14} />}
                        </button>

                        {libraryCategories.map(cat => (
                            <button
                                key={cat}
                                onClick={() => handleCategorySelect(cat)}
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'space-between',
                                    width: '100%',
                                    padding: '0.6rem 0.8rem',
                                    borderRadius: '8px',
                                    background: selectedCategory === cat ? '#f1f5f9' : 'transparent',
                                    color: selectedCategory === cat ? '#6366f1' : '#64748b',
                                    border: 'none',
                                    cursor: 'pointer',
                                    fontWeight: selectedCategory === cat ? '600' : '400',
                                    textAlign: 'left'
                                }}
                            >
                                <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{cat}</span>
                                {selectedCategory === cat && <ChevronRight size={14} />}
                            </button>
                        ))}
                    </aside>

                    {/* Main Grid */}
                    <div style={{ flex: 1, padding: '2rem', overflowY: 'auto' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
                            <div>
                                <h1 style={{ fontSize: '2rem', fontWeight: '800', background: 'linear-gradient(to right, #6366f1, #a855f7)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', margin: 0 }}>
                                    Asset Library
                                </h1>
                                <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem' }}>
                                    {activeHashtag && (
                                        <span
                                            onClick={() => handleHashtagSelect(null)}
                                            style={{ background: '#e0e7ff', color: '#4338ca', padding: '0.2rem 0.6rem', borderRadius: '100px', fontSize: '0.75rem', fontWeight: '600', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.3rem' }}
                                        >
                                            <Hash size={12} /> {activeHashtag} ✕
                                        </span>
                                    )}
                                </div>
                            </div>

                            {/* Main Tabs */}
                            <div className="glass-panel" style={{ padding: '0.4rem', borderRadius: '12px', display: 'flex', gap: '0.2rem' }}>
                                <button className={`tab-btn ${activeTab === 'sticker' ? 'active' : ''}`} onClick={() => setActiveTab('sticker')}>
                                    <Sticker size={16} /> Stickers
                                </button>
                                <button className={`tab-btn ${activeTab === 'cover' ? 'active' : ''}`} onClick={() => setActiveTab('cover')}>
                                    <FileImage size={16} /> Covers
                                </button>
                                <button className={`tab-btn ${activeTab === 'template' ? 'active' : ''}`} onClick={() => setActiveTab('template')}>
                                    <LayoutTemplate size={16} /> Templates
                                </button>
                                <button className={`tab-btn ${activeTab === 'image' ? 'active' : ''}`} onClick={() => setActiveTab('image')}>
                                    <FileImage size={16} /> My Images
                                </button>
                                <button className={`tab-btn ${activeTab === 'planner' ? 'active' : ''}`} onClick={() => setActiveTab('planner')}>
                                    <Book size={16} /> Planners
                                </button>
                            </div>
                        </div>

                        {isLoadingAssets ? (
                            <div style={{ display: 'flex', justifyContent: 'center', padding: '4rem', color: '#64748b' }}>Loading assets...</div>
                        ) : (
                            <div style={{
                                display: 'grid',
                                gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))',
                                gap: '1.5rem'
                            }}>
                                {/* Upload Button */}
                                <div style={{
                                    aspectRatio: '1',
                                    background: 'white',
                                    borderRadius: '16px',
                                    border: '2px dashed #e2e8f0',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    flexDirection: 'column',
                                    color: '#94a3b8',
                                    cursor: 'pointer',
                                    transition: 'all 0.2s'
                                }}
                                    onMouseEnter={(e) => e.currentTarget.style.borderColor = '#6366f1'}
                                    onMouseLeave={(e) => e.currentTarget.style.borderColor = '#e2e8f0'}
                                    onClick={() => setIsUploadModalOpen(true)}
                                >
                                    <div style={{ fontSize: '2.5rem', lineHeight: 1 }}>+</div>
                                    <span style={{ fontSize: '0.85rem', fontWeight: '500' }}>Add {activeTab.charAt(0).toUpperCase() + activeTab.slice(1)}</span>
                                </div>

                                {libraryAssets.filter(a => a.title.toLowerCase().includes(searchTerm.toLowerCase())).map(asset => (
                                    <div key={asset.id} className="asset-card" style={{
                                        background: 'white',
                                        borderRadius: '16px',
                                        padding: '1rem',
                                        boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)',
                                        display: 'flex',
                                        flexDirection: 'column',
                                        gap: '0.75rem',
                                        border: '1px solid #f1f5f9',
                                        transition: 'all 0.2s',
                                        cursor: 'pointer',
                                        position: 'relative'
                                    }}>
                                        {isAdmin && (
                                            <div style={{
                                                position: 'absolute',
                                                top: '0.5rem',
                                                right: '0.5rem',
                                                display: 'flex',
                                                gap: '0.3rem',
                                                zIndex: 10
                                            }}>
                                                <button
                                                    onClick={(e) => { e.stopPropagation(); handleEditMetadata(asset); }}
                                                    style={{ background: 'white', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '0.4rem', color: '#6366f1', display: 'flex' }}
                                                    title="Edit Metadata"
                                                >
                                                    <Edit size={14} />
                                                </button>
                                                <button
                                                    onClick={(e) => { e.stopPropagation(); setPaintingAsset(asset); }}
                                                    style={{ background: 'white', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '0.4rem', color: '#a855f7', display: 'flex' }}
                                                    title="Open in Paint"
                                                >
                                                    <Palette size={14} />
                                                </button>
                                                <button
                                                    onClick={(e) => { e.stopPropagation(); handleDeleteAsset(asset.id); }}
                                                    style={{ background: 'white', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '0.4rem', color: '#ef4444', display: 'flex' }}
                                                    title="Delete Asset"
                                                >
                                                    <Trash2 size={14} />
                                                </button>
                                            </div>
                                        )}
                                        <div style={{
                                            width: '100%',
                                            aspectRatio: '1',
                                            background: '#f8fafc',
                                            borderRadius: '10px',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            overflow: 'hidden',
                                            position: 'relative'
                                        }}>
                                            {asset.thumbnail_url ? (
                                                <img
                                                    src={asset.thumbnail_url}
                                                    alt={asset.title}
                                                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                                />
                                            ) : asset.url.toLowerCase().endsWith('.pdf') ? (
                                                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem' }}>
                                                    <Book size={48} textAnchor='middle' className="text-indigo-400" />
                                                    <span style={{ fontSize: '0.75rem', fontWeight: 'bold', color: '#64748b' }}>PDF Planner</span>
                                                </div>
                                            ) : (
                                                <img
                                                    src={asset.url}
                                                    alt={asset.title}
                                                    style={{ maxWidth: '80%', maxHeight: '80%', objectFit: 'contain' }}
                                                    onError={(e) => {
                                                        e.currentTarget.onerror = null;
                                                        e.currentTarget.src = 'https://placehold.co/200x200/f1f5f9/94a3b8?text=No+Image';
                                                    }}
                                                />
                                            )}
                                        </div>
                                        <div style={{ flex: 1 }}>
                                            <div style={{ fontSize: '0.85rem', fontWeight: '600', color: '#1e293b', marginBottom: '0.25rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                <span>{asset.title}</span>
                                                {activeTab === 'planner' && (
                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            setPdfSourceUrl(asset.url);
                                                            setIsPDFModalOpen(true);
                                                        }}
                                                        style={{
                                                            background: '#6366f1',
                                                            color: 'white',
                                                            border: 'none',
                                                            padding: '0.3rem 0.6rem',
                                                            borderRadius: '6px',
                                                            fontSize: '0.65rem',
                                                            fontWeight: '700',
                                                            cursor: 'pointer'
                                                        }}
                                                    >
                                                        LOAD AS PLANNER
                                                    </button>
                                                )}
                                            </div>
                                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.25rem' }}>
                                                {/* Ensure hashtags is an array before using slice */}
                                                {(Array.isArray(asset.hashtags) ? asset.hashtags : []).slice(0, 2).map((tag: string) => (
                                                    <span
                                                        key={tag}
                                                        onClick={(e) => { e.stopPropagation(); handleHashtagSelect(tag); }}
                                                        style={{ fontSize: '0.7rem', color: '#6366f1', background: '#f5f3ff', padding: '0.1rem 0.4rem', borderRadius: '4px' }}
                                                    >
                                                        #{tag}
                                                    </span>
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                ))}

                                {libraryAssets.length === 0 && !isLoadingAssets && (
                                    <div style={{ gridColumn: '1/-1', textAlign: 'center', padding: '4rem', color: '#94a3b8' }}>
                                        No {activeTab}s found in this category.
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            </main>

            {/* Upload Modal */}
            {
                isUploadModalOpen && (
                    <div style={{
                        position: 'fixed',
                        top: 0,
                        left: 0,
                        right: 0,
                        bottom: 0,
                        background: 'rgba(15, 23, 42, 0.6)',
                        backdropFilter: 'blur(4px)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        zIndex: 1000,
                        padding: '1rem'
                    }}>
                        <div className="glass-panel" style={{
                            width: '100%',
                            maxWidth: '480px',
                            background: 'white',
                            borderRadius: '24px',
                            padding: '2rem',
                            boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1), 0 10px 10px -5px rgba(0,0,0,0.04)'
                        }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                                <h2 style={{ fontSize: '1.5rem', fontWeight: '800', margin: 0 }}>Add New {activeTab.charAt(0).toUpperCase() + activeTab.slice(1)}</h2>
                                <button
                                    onClick={() => setIsUploadModalOpen(false)}
                                    style={{ background: 'none', border: 'none', fontSize: '1.5rem', cursor: 'pointer', color: '#94a3b8' }}
                                >✕</button>
                            </div>

                            <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem', background: '#f1f5f9', padding: '0.3rem', borderRadius: '12px' }}>
                                <button
                                    onClick={() => setUploadMode('file')}
                                    style={{
                                        flex: 1,
                                        padding: '0.6rem',
                                        borderRadius: '8px',
                                        border: 'none',
                                        background: uploadMode === 'file' ? 'white' : 'transparent',
                                        color: uploadMode === 'file' ? '#6366f1' : '#64748b',
                                        fontWeight: '600',
                                        cursor: 'pointer',
                                        boxShadow: uploadMode === 'file' ? '0 2px 4px rgba(0,0,0,0.05)' : 'none'
                                    }}
                                >Local File</button>
                                <button
                                    onClick={() => setUploadMode('url')}
                                    style={{
                                        flex: 1,
                                        padding: '0.6rem',
                                        borderRadius: '8px',
                                        border: 'none',
                                        background: uploadMode === 'url' ? 'white' : 'transparent',
                                        color: uploadMode === 'url' ? '#6366f1' : '#64748b',
                                        fontWeight: '600',
                                        cursor: 'pointer',
                                        boxShadow: uploadMode === 'url' ? '0 2px 4px rgba(0,0,0,0.05)' : 'none'
                                    }}
                                >Internet URL</button>
                            </div>

                            <form onSubmit={handleUpload} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                {uploadMode === 'file' ? (
                                    <div>
                                        <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '600', color: '#475569', marginBottom: '0.5rem' }}>Select Files</label>
                                        <input
                                            type="file"
                                            ref={fileInputRef}
                                            accept={activeTab === 'template' || activeTab === 'planner' ? "image/*,.pdf" : "image/*"}
                                            multiple
                                            required
                                            style={{
                                                width: '100%',
                                                padding: '0.75rem',
                                                borderRadius: '12px',
                                                border: '1px solid #e2e8f0',
                                                background: '#f8fafc'
                                            }}
                                        />
                                        <p style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: '0.4rem' }}>
                                            Supports multiple PNG, JPG, GIF {(activeTab === 'template' || activeTab === 'planner') && "and PDF"} files
                                        </p>
                                    </div>
                                ) : (
                                    <>
                                        <div>
                                            <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '600', color: '#475569', marginBottom: '0.5rem' }}>Image URL</label>
                                            <input
                                                type="url"
                                                placeholder="https://example.com/image.png"
                                                value={inputUrl}
                                                onChange={(e) => setInputUrl(e.target.value)}
                                                required
                                                style={{
                                                    width: '100%',
                                                    padding: '0.75rem',
                                                    borderRadius: '12px',
                                                    border: '1px solid #e2e8f0',
                                                    outline: 'none'
                                                }}
                                            />
                                        </div>
                                        <div>
                                            <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '600', color: '#475569', marginBottom: '0.5rem' }}>Title</label>
                                            <input
                                                type="text"
                                                placeholder="My Awesome Asset"
                                                value={inputTitle}
                                                onChange={(e) => setInputTitle(e.target.value)}
                                                required
                                                style={{
                                                    width: '100%',
                                                    padding: '0.75rem',
                                                    borderRadius: '12px',
                                                    border: '1px solid #e2e8f0',
                                                    outline: 'none'
                                                }}
                                            />
                                        </div>
                                    </>
                                )}

                                <div>
                                    <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '600', color: '#475569', marginBottom: '0.5rem' }}>Category</label>
                                    <input
                                        type="text"
                                        placeholder="e.g. Minimalist, Floral, Work"
                                        value={inputCategory}
                                        onChange={(e) => setInputCategory(e.target.value)}
                                        style={{
                                            width: '100%',
                                            padding: '0.75rem',
                                            borderRadius: '12px',
                                            border: '1px solid #e2e8f0',
                                            outline: 'none'
                                        }}
                                    />
                                </div>

                                <div>
                                    <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '600', color: '#475569', marginBottom: '0.5rem' }}>Hashtags (comma separated)</label>
                                    <input
                                        type="text"
                                        placeholder="cute, pastel, functional"
                                        value={inputHashtags}
                                        onChange={(e) => setInputHashtags(e.target.value)}
                                        style={{
                                            width: '100%',
                                            padding: '0.75rem',
                                            borderRadius: '12px',
                                            border: '1px solid #e2e8f0',
                                            outline: 'none'
                                        }}
                                    />
                                </div>

                                <button
                                    type="submit"
                                    disabled={isUploading}
                                    style={{
                                        marginTop: '1rem',
                                        background: 'linear-gradient(to right, #6366f1, #a855f7)',
                                        color: 'white',
                                        border: 'none',
                                        padding: '1rem',
                                        borderRadius: '12px',
                                        fontWeight: '700',
                                        cursor: isUploading ? 'not-allowed' : 'pointer',
                                        opacity: isUploading ? 0.7 : 1,
                                        transition: 'all 0.2s'
                                    }}
                                >
                                    {isUploading ? 'Uploading...' : `Add to ${activeTab.charAt(0).toUpperCase() + activeTab.slice(1)}s`}
                                </button>
                            </form>
                        </div>
                    </div>
                )
            }

            {/* Edit Metadata Modal */}
            {
                editingAsset && (
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
                            width: '100%', maxWidth: '400px',
                            background: 'white', borderRadius: '24px', padding: '2rem'
                        }}>
                            <h2 style={{ fontSize: '1.25rem', fontWeight: '800', marginBottom: '1.5rem' }}>Edit {activeTab.charAt(0).toUpperCase() + activeTab.slice(1)}</h2>

                            <form onSubmit={handleSaveMetadata} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                <div>
                                    <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '600', color: '#475569', marginBottom: '0.4rem' }}>Title</label>
                                    <input
                                        type="text"
                                        value={editTitle}
                                        onChange={(e) => setEditTitle(e.target.value)}
                                        required
                                        style={{ width: '100%', padding: '0.75rem', borderRadius: '12px', border: '1px solid #e2e8f0' }}
                                    />
                                </div>
                                <div>
                                    <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '600', color: '#475569', marginBottom: '0.4rem' }}>Category</label>
                                    <input
                                        type="text"
                                        value={editCategory}
                                        onChange={(e) => setEditCategory(e.target.value)}
                                        style={{ width: '100%', padding: '0.75rem', borderRadius: '12px', border: '1px solid #e2e8f0' }}
                                    />
                                </div>
                                <div>
                                    <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '600', color: '#475569', marginBottom: '0.4rem' }}>Hashtags (comma separated)</label>
                                    <input
                                        type="text"
                                        value={editHashtags}
                                        onChange={(e) => setEditHashtags(e.target.value)}
                                        style={{ width: '100%', padding: '0.75rem', borderRadius: '12px', border: '1px solid #e2e8f0' }}
                                    />
                                </div>

                                <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1rem' }}>
                                    <button
                                        type="button"
                                        onClick={() => setEditingAsset(null)}
                                        style={{ flex: 1, padding: '0.75rem', borderRadius: '12px', border: '1px solid #e2e8f0', background: 'white', fontWeight: '600' }}
                                    >Cancel</button>
                                    <button
                                        type="submit"
                                        disabled={isSavingEdit}
                                        style={{ flex: 1, padding: '0.75rem', borderRadius: '12px', border: 'none', background: '#6366f1', color: 'white', fontWeight: '600' }}
                                    >
                                        {isSavingEdit ? 'Saving...' : 'Save Changes'}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                )
            }

            {/* Asset Paint Editor */}
            {
                paintingAsset && (
                    <AssetEditor
                        imageUrl={paintingAsset.url}
                        onSave={handleSavePainting}
                        onClose={() => setPaintingAsset(null)}
                    />
                )
            }

            <PDFImportModal
                isOpen={isPDFModalOpen}
                onClose={() => {
                    setIsPDFModalOpen(false);
                    setPdfSourceUrl(undefined);
                }}
                sourceUrl={pdfSourceUrl}
            />

            <style>{`
                .tab-btn {
                    padding: 0.5rem 1rem;
                    border: none;
                    background: transparent;
                    border-radius: 8px;
                    color: #64748b;
                    font-size: 0.85rem;
                    font-weight: 600;
                    cursor: pointer;
                    display: flex;
                    align-items: center;
                    gap: 0.5rem;
                    transition: all 0.2s;
                }
                .tab-btn:hover {
                    color: #1e293b;
                }
                .tab-btn.active {
                    background: white;
                    color: #6366f1;
                    box-shadow: 0 4px 10px rgba(0,0,0,0.05);
                }
                .asset-card:hover {
                    transform: translateY(-4px);
                    box-shadow: 0 10px 15px -3px rgba(0,0,0,0.1);
                    border-color: #6366f133;
                }
            `}</style>
        </div>
    );
};

export default LibraryPage;
