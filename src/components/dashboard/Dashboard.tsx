import React, { useState, useEffect, useRef } from 'react';
import { AnimatePresence } from 'framer-motion';
import { usePlannerStore, slugify } from '../../store/plannerStore';
import { Plus, LogOut, Settings, Book, Archive, Heart, Search, Image as ImageIcon, SortAsc, LayoutGrid, RefreshCcw, FileText } from 'lucide-react';
import PlannerCover from './PlannerCover';
import CreationWizard from './CreationWizard';
import { CoverEditorModal } from './CoverEditorModal'; // New Import
import { PDFImportModal } from './PDFImportModal';
import './Dashboard.css';
import { supabase } from '../../supabase/client';
import { useNavigate, NavLink, useLocation } from 'react-router-dom';

const Dashboard: React.FC = () => {
    const { user, openPlanner, availablePlanners, fetchPlanners, archivePlanner, deletePlanner, toggleFavorite, updatePlannerCover, isFetchingPlanners, globalSearch, searchResults } = usePlannerStore();
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [showPDFModal, setShowPDFModal] = useState(false);
    const [editingPlannerId, setEditingPlannerId] = useState<string | null>(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [sortBy, setSortBy] = useState<'date' | 'name'>('date');
    const [heroImage, setHeroImage] = useState<string>('https://images.unsplash.com/photo-1517842645767-c639042777db?auto=format&fit=crop&q=80&w=2070');

    const navigate = useNavigate();
    const location = useLocation();
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Debounce Search
    useEffect(() => {
        const delayDebounceFn = setTimeout(() => {
            if (searchTerm) {
                globalSearch(searchTerm);
            }
        }, 500);

        return () => clearTimeout(delayDebounceFn);
    }, [searchTerm, globalSearch]);

    useEffect(() => {
        if (!user) {
            navigate('/auth');
            return;
        }
        fetchPlanners();
    }, [user, fetchPlanners, navigate]);

    const activePlanners = availablePlanners.filter(p => !p.isArchived);
    const favoritePlanners = activePlanners.filter(p => p.isFavorite);

    // Advanced Filtering & Sorting
    const filteredPlanners = activePlanners
        .filter(p => {
            const searchLower = searchTerm.toLowerCase();
            const matchesName = p.name.toLowerCase().includes(searchLower);
            const matchesCategory = (p.category || '').toLowerCase().includes(searchLower);

            // Content Match: Check if this planner ID is in the global search results
            const matchesContent = searchResults.some(r => r.plannerId === p.id);

            return matchesName || matchesCategory || matchesContent;
        })
        .sort((a, b) => {
            if (sortBy === 'date') {
                return new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime();
            } else {
                return a.name.localeCompare(b.name);
            }
        });

    const handleArchive = async (id: string, e: React.MouseEvent) => {
        e.stopPropagation();
        if (confirm('Are you sure you want to archive this planner?')) {
            await archivePlanner(id);
        }
    };

    const handleDelete = async (id: string, e: React.MouseEvent) => {
        e.stopPropagation();
        if (confirm('Permanently delete this planner? This cannot be undone.')) {
            await deletePlanner(id);
        }
    };

    const handleFavorite = async (id: string, e: React.MouseEvent) => {
        e.stopPropagation();
        await toggleFavorite(id);
    };

    const handleOpenPlanner = (id: string, name: string) => {
        openPlanner(id);
        navigate(`/planner/${slugify(name)}`);
    };

    const handleHeroImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = () => {
                setHeroImage(reader.result as string);
            };
            reader.readAsDataURL(file);
        }
    };

    const handleSaveCover = async (blob: Blob) => {
        if (!editingPlannerId) return;
        try {
            await updatePlannerCover(editingPlannerId, blob);
            setEditingPlannerId(null);
        } catch (error) {
            console.error("Failed to update cover", error);
            alert("Failed to update cover. Please try again.");
        }
    };

    return (
        <div className="dashboard-layout">
            <input
                type="file"
                ref={fileInputRef}
                style={{ display: 'none' }}
                accept="image/*"
                onChange={handleHeroImageUpload}
            />

            {/* Sidebar Navigation */}
            <aside className="dashboard-sidebar">
                <div className="brand-logo">ZOABI</div>

                <nav className="nav-menu">
                    <NavLink to="/homepage" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
                        <LayoutGrid size={20} /> <span>Home</span>
                    </NavLink>
                    <NavLink to="/favorites" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
                        <Heart size={20} /> <span>Favorites</span>
                    </NavLink>
                    <NavLink to="/archive" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
                        <Archive size={20} /> <span>Archive</span>
                    </NavLink>
                    <NavLink to="/library" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
                        <Book size={20} /> <span>Library</span>
                    </NavLink>
                </nav>

                <div className="sidebar-footer">
                    <div className="user-mini-profile">
                        <div className="avatar-circle">M</div>
                        <div className="user-info">
                            <span className="user-name">My Planner</span>
                            <span className="user-role">Premium</span>
                        </div>
                    </div>
                </div>
            </aside>

            {/* Main Content Area */}
            <main className="dashboard-main">
                {/* Top Header */}
                <header className="dashboard-header">
                    <div className="header-left">
                        <div className="search-bar">
                            <div className="search-wrapper">
                                <Search size={18} className="search-icon" />
                                <input
                                    type="text"
                                    placeholder="Search your planners or pages..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                />
                                {searchResults.length > 0 && searchTerm && (
                                    <div className="search-results-dropdown shadow-2xl border border-gray-200 rounded-lg absolute top-full left-0 w-full bg-white z-[1000] mt-2 max-h-[400px] overflow-y-auto p-2">
                                        {/* Planners Section */}
                                        {searchResults.some(r => r.type === 'planner') && (
                                            <div className="search-section">
                                                <div className="text-[11px] font-bold text-gray-400 uppercase tracking-wider px-3 py-1 mt-2">Planners</div>
                                                {searchResults.filter(r => r.type === 'planner').map(result => (
                                                    <div
                                                        key={result.id}
                                                        className="flex items-center gap-3 p-3 hover:bg-indigo-50 rounded-md cursor-pointer transition-colors"
                                                        onClick={() => handleOpenPlanner(result.id, result.name)}
                                                    >
                                                        <Book size={16} className="text-indigo-500" />
                                                        <div className="text-sm font-semibold text-gray-700">{result.name}</div>
                                                    </div>
                                                ))}
                                            </div>
                                        )}

                                        {/* Pages Section */}
                                        {searchResults.some(r => r.type === 'page') && (
                                            <div className="search-section">
                                                <div className="text-[11px] font-bold text-gray-400 uppercase tracking-wider px-3 py-1 mt-2 border-t border-gray-100">Inside Pages</div>
                                                {searchResults.filter(r => r.type === 'page').map(result => (
                                                    <div
                                                        key={result.id}
                                                        className="flex flex-col gap-1 p-3 hover:bg-indigo-50 rounded-md cursor-pointer transition-colors"
                                                        onClick={() => {
                                                            const planner = availablePlanners.find(p => p.id === result.plannerId);
                                                            if (planner) {
                                                                openPlanner(result.plannerId);
                                                                navigate(`/planner/${slugify(planner.name)}?page=${result.pageIndex}`);
                                                            }
                                                        }}
                                                    >
                                                        <div className="flex items-center gap-2">
                                                            <FileText size={14} className="text-gray-400" />
                                                            <div className="text-sm font-semibold text-indigo-600">{result.name || `Page ${result.pageIndex + 1}`}</div>
                                                        </div>
                                                        <div
                                                            className="text-xs text-gray-500 line-clamp-2 pl-6 fts-snippet"
                                                            dangerouslySetInnerHTML={{ __html: result.snippet }}
                                                        />
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                            <button
                                className="filter-btn"
                                onClick={() => setSortBy(sortBy === 'date' ? 'name' : 'date')}
                                title={`Sorting by ${sortBy}`}
                            >
                                <SortAsc size={18} />
                                {sortBy === 'date' ? 'Newest' : 'A-Z'}
                            </button>
                        </div>
                    </div>

                    <div className="header-actions">
                        <button className="icon-btn" title="Refresh Planners" onClick={() => fetchPlanners()}>
                            <RefreshCcw size={20} />
                        </button>
                        <button className="icon-btn" title="Settings" onClick={() => navigate('/settings')}>
                            <Settings size={20} />
                        </button>
                        <button className="icon-btn" title="Sign Out" onClick={async () => {
                            await supabase.auth.signOut();
                            navigate('/auth');
                        }}>
                            <LogOut size={20} />
                        </button>
                    </div>
                </header>

                {/* Hero / Greeting Section */}
                <section className="dashboard-hero">
                    {heroImage && <img src={heroImage} alt="Hero Background" className="hero-background-image" />}

                    <div className="hero-content-center">
                        <h1 className="hero-title">Ready to Organize?</h1>
                        <p className="hero-subtitle">Focus on what matters most with your digital workspace.</p>
                    </div>

                    <button className="edit-hero-btn" onClick={() => fileInputRef.current?.click()}>
                        <ImageIcon size={16} /> Change Cover
                    </button>
                </section>

                {/* Content Grid */}
                <div className="content-scroll-area">
                    {/* Favorites Section */}
                    {favoritePlanners.length > 0 && !searchTerm && location.pathname === '/homepage' && (
                        <section className="planner-section">
                            <h2 className="section-heading"><Heart size={20} fill="#ec4899" color="#ec4899" /> Favorites</h2>
                            <div className="planner-grid">
                                {favoritePlanners.map(planner => (
                                    <PlannerCover
                                        key={planner.id}
                                        color={planner.coverColor || '#6366f1'}
                                        title={planner.name}
                                        category={planner.category}
                                        coverUrl={planner.cover_url}
                                        isFavorite={true}
                                        onClick={() => handleOpenPlanner(planner.id, planner.name)}
                                        onArchive={(e) => handleArchive(planner.id, e)}
                                        onDelete={(e) => handleDelete(planner.id, e)}
                                        onFavorite={(e) => handleFavorite(planner.id, e)}
                                        onEdit={() => setEditingPlannerId(planner.id)}
                                    />
                                ))}
                            </div>
                        </section>
                    )}

                    {/* All Planners */}
                    <section className="planner-section">
                        <h2 className="section-heading">
                            <LayoutGrid size={20} />
                            {searchTerm ? 'Search Results' : 'All Notebooks'}
                        </h2>

                        <div className="planner-grid">
                            {/* Create New Card */}
                            <div className="planner-book-container create-new-book" onClick={() => setShowCreateModal(true)}>
                                <div className="create-book-inner">
                                    <Plus size={40} />
                                    <span>Create New</span>
                                </div>
                            </div>

                            {/* Import PDF Card */}
                            <div className="planner-book-container create-new-book" style={{ borderStyle: 'dashed', borderColor: '#818cf8', backgroundColor: '#eef2ff' }} onClick={() => setShowPDFModal(true)}>
                                <div className="create-book-inner" style={{ color: '#4f46e5' }}>
                                    <FileText size={40} />
                                    <span>Import PDF</span>
                                </div>
                            </div>

                            {isFetchingPlanners ? (
                                <div className="loading-grid-placeholder">
                                    <RefreshCcw className="animate-spin" size={32} />
                                    <span>Loading Notebooks...</span>
                                </div>
                            ) : (
                                filteredPlanners.map(planner => (
                                    <PlannerCover
                                        key={planner.id}
                                        color={planner.coverColor || '#6366f1'}
                                        title={planner.name}
                                        category={planner.category}
                                        isFavorite={planner.isFavorite}
                                        coverUrl={planner.cover_url}
                                        onClick={() => handleOpenPlanner(planner.id, planner.name)}
                                        onArchive={(e) => handleArchive(planner.id, e)}
                                        onDelete={(e) => handleDelete(planner.id, e)}
                                        onFavorite={(e) => handleFavorite(planner.id, e)}
                                        onEdit={() => setEditingPlannerId(planner.id)}
                                        onRename={(newName) => usePlannerStore.getState().renamePlanner(planner.id, newName)}
                                    />
                                ))
                            )}
                        </div>
                        {!isFetchingPlanners && filteredPlanners.length === 0 && searchTerm && (
                            <div className="empty-search">
                                <p>No planners found matching "{searchTerm}"</p>
                            </div>
                        )}
                    </section>
                </div>
            </main>

            {/* Modals */}
            <AnimatePresence>
                {showCreateModal && (
                    <CreationWizard onClose={() => setShowCreateModal(false)} />
                )}
            </AnimatePresence>

            <CoverEditorModal
                isOpen={!!editingPlannerId}
                onClose={() => setEditingPlannerId(null)}
                initialCoverUrl={activePlanners.find(p => p.id === editingPlannerId)?.cover_url || undefined}
                onSave={handleSaveCover}
            />

            <PDFImportModal
                isOpen={showPDFModal}
                onClose={() => setShowPDFModal(false)}
            />
        </div>
    );
};

export default Dashboard;

