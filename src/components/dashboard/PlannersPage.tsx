import React, { useState, useEffect } from 'react';
import { AnimatePresence } from 'framer-motion';
import { usePlannerStore, slugify } from '../../store/plannerStore';
import { Plus, Search, SortAsc, RefreshCcw, Archive as ArchiveIcon, Star, BookOpen, LayoutGrid } from 'lucide-react';
import PlannerCover from './PlannerCover';
import CreationWizard from './CreationWizard';
import { CoverEditorModal } from './CoverEditorModal';
import { PDFImportModal } from './PDFImportModal';
import './Dashboard.css';
import { useNavigate } from 'react-router-dom';
import PageHero from '../ui/PageHero';

const PlannersPage: React.FC = () => {
    const {
        openPlanner, availablePlanners, fetchPlanners, archivePlanner, unarchivePlanner,
        deletePlanner, toggleFavorite, updatePlannerCover, isFetchingPlanners,
        libraryAssets, fetchLibraryAssets
    } = usePlannerStore();

    const [showCreateModal, setShowCreateModal] = useState(false);
    const [showPDFModal, setShowPDFModal] = useState(false);
    const [pdfUrl, setPdfUrl] = useState<string | undefined>(undefined);
    const [editingPlannerId, setEditingPlannerId] = useState<string | null>(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [sortBy, setSortBy] = useState<'date' | 'name'>('date');
    const [activeTab, setActiveTab] = useState<'all' | 'favorites' | 'archive' | 'library'>('all');

    const navigate = useNavigate();

    useEffect(() => {
        fetchPlanners();
        fetchLibraryAssets('planner');
    }, [fetchPlanners, fetchLibraryAssets]);

    const handleOpenPlanner = (id: string, name: string) => {
        openPlanner(id);
        navigate(`/planner/${slugify(name)}`);
    };

    const handleArchive = async (id: string, e: React.MouseEvent) => {
        e.stopPropagation();
        const planner = availablePlanners.find(p => p.id === id);
        if (planner?.isArchived) {
            await unarchivePlanner(id);
        } else {
            if (confirm('Archive this planner?')) {
                await archivePlanner(id);
            }
        }
    };

    const handleDelete = async (id: string, e: React.MouseEvent) => {
        e.stopPropagation();
        if (confirm('Permanently delete this planner? This cannot be undone.')) {
            await deletePlanner(id);
        }
    };

    const handleFavorite = (id: string, e: React.MouseEvent) => {
        e.stopPropagation();
        toggleFavorite(id);
    };

    const handleUpdateCover = (id: string, e: React.MouseEvent) => {
        e.stopPropagation();
        setEditingPlannerId(id);
    };

    const filteredPlanners = (activeTab === 'library' ? (
        libraryAssets
            .filter(a => a.type === 'planner')
            .map(a => ({
                id: a.id,
                name: a.title,
                cover_url: a.thumbnail_url || a.url,
                coverColor: '#6366f1',
                isFavorite: false,
                isArchived: false,
                category: a.category,
                isLibraryAsset: true,
                url: a.url
            }))
    ) : (
        availablePlanners
            .filter(p => {
                if (activeTab === 'favorites') return p.isFavorite && !p.isArchived;
                if (activeTab === 'archive') return p.isArchived;
                return !p.isArchived;
            })
    )).filter(p => {
        const matchesSearch = p.name.toLowerCase().includes(searchTerm.toLowerCase());
        return matchesSearch;
    }).sort((a: any, b: any) => {
        if (sortBy === 'date') return new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime();
        return a.name.localeCompare(b.name);
    });

    return (
        <div className="flex flex-col h-full w-full overflow-hidden bg-white">
            <PageHero
                pageKey="planners"
                title="My Planners"
                subtitle="Your collection of digital notebooks and journals."
                compact={true}
            />

            {/* Controls Bar */}
            <div className="px-4 md:px-8 py-3 md:py-4 bg-white border-b border-gray-100 flex flex-col items-stretch sticky top-0 z-10 shadow-sm gap-4">
                <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
                    <div className="flex items-center gap-3 md:gap-4 flex-1 max-w-2xl">
                        <div className="relative flex-1">
                            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                            <input
                                type="text"
                                placeholder="Search planners..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 transition-all text-sm outline-none"
                            />
                        </div>
                        <button
                            className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 md:px-5 py-2 rounded-xl flex items-center gap-2 text-sm font-bold transition-all shadow-lg shadow-indigo-100 whitespace-nowrap"
                            onClick={() => setShowCreateModal(true)}
                        >
                            <Plus size={18} /> <span className="hidden sm:inline">Create</span>
                        </button>
                    </div>

                    <div className="flex items-center gap-3 justify-end">
                        <button
                            className={`flex items-center gap-2 px-3 md:px-4 py-2 rounded-xl border transition-all text-xs md:text-sm font-medium ${sortBy === 'date' ? 'bg-indigo-50 border-indigo-200 text-indigo-600' : 'bg-white border-gray-200 text-gray-600 hover:border-gray-300'}`}
                            onClick={() => setSortBy(sortBy === 'date' ? 'name' : 'date')}
                        >
                            <SortAsc size={16} />
                            <span className="hidden sm:inline">{sortBy === 'date' ? 'By Date' : 'A-Z'}</span>
                        </button>
                        <button
                            className="p-2 text-gray-400 hover:text-indigo-600 transition-colors"
                            onClick={() => fetchPlanners()}
                            title="Refresh"
                        >
                            <RefreshCcw size={18} className={isFetchingPlanners ? 'animate-spin' : ''} />
                        </button>
                    </div>
                </div>

                {/* Sub-Tabs */}
                <div className="flex items-center justify-between border-t border-gray-50 pt-2 md:pt-0 md:border-t-0">
                    <div className="nav-pill-tabs">
                        <button
                            className={`flex items-center gap-2 px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${activeTab === 'all' ? 'bg-white shadow-sm text-indigo-600' : 'text-gray-500 hover:text-gray-700'}`}
                            onClick={() => setActiveTab('all')}
                        >
                            <LayoutGrid size={14} /> My Planners
                        </button>
                        <button
                            className={`flex items-center gap-2 px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${activeTab === 'favorites' ? 'bg-white shadow-sm text-indigo-600' : 'text-gray-500 hover:text-gray-700'}`}
                            onClick={() => setActiveTab('favorites')}
                        >
                            <Star size={14} /> Favorites
                        </button>
                        <button
                            className={`flex items-center gap-2 px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${activeTab === 'library' ? 'bg-white shadow-sm text-indigo-600' : 'text-gray-500 hover:text-gray-700'}`}
                            onClick={() => setActiveTab('library')}
                        >
                            <BookOpen size={14} /> Library
                        </button>
                        <button
                            className={`flex items-center gap-2 px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${activeTab === 'archive' ? 'bg-white shadow-sm text-indigo-600' : 'text-gray-500 hover:text-gray-700'}`}
                            onClick={() => setActiveTab('archive')}
                        >
                            <ArchiveIcon size={14} /> Archive
                        </button>
                    </div>

                    <button
                        className="bg-white border border-gray-200 text-gray-600 px-4 md:px-5 py-2 rounded-xl flex items-center gap-2 text-sm font-bold hover:bg-gray-50 transition-all whitespace-nowrap hidden md:flex"
                        onClick={() => setShowPDFModal(true)}
                    >
                        Import PDF
                    </button>
                </div>
            </div>

            <main className="flex-1 overflow-y-auto p-4 md:p-8 bg-gray-50/30">
                {filteredPlanners.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-64 text-gray-400 gap-4">
                        <div className="p-8 bg-white rounded-3xl shadow-sm">
                            <ArchiveIcon size={64} className="text-gray-100" />
                        </div>
                        <p className="font-medium text-gray-500">No planners found matching your search.</p>
                        <button
                            className="text-sm text-indigo-600 font-bold hover:underline"
                            onClick={() => setSearchTerm('')}
                        >
                            Clear search
                        </button>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-4 md:gap-8">
                        {filteredPlanners.map(planner => (
                            <PlannerCover
                                key={planner.id}
                                color={planner.coverColor || '#6366f1'}
                                title={planner.name}
                                category={planner.category}
                                coverUrl={planner.cover_url}
                                isFavorite={planner.isFavorite}
                                isArchived={planner.isArchived}
                                onClick={() => {
                                    if ((planner as any).isLibraryAsset) {
                                        setPdfUrl((planner as any).url);
                                        setShowPDFModal(true);
                                    } else {
                                        handleOpenPlanner(planner.id, planner.name);
                                    }
                                }}
                                onArchive={(planner as any).isLibraryAsset ? undefined : (e) => handleArchive(planner.id, e)}
                                onDelete={(planner as any).isLibraryAsset ? undefined : (e) => handleDelete(planner.id, e)}
                                onFavorite={(planner as any).isLibraryAsset ? undefined : (e) => handleFavorite(planner.id, e)}
                                onEdit={(planner as any).isLibraryAsset ? undefined : (e) => handleUpdateCover(planner.id, e)}
                            />
                        ))}
                    </div>
                )}
            </main>

            <AnimatePresence>
                {showCreateModal && (
                    <CreationWizard
                        onClose={() => setShowCreateModal(false)}
                    />
                )}
            </AnimatePresence>

            <PDFImportModal
                isOpen={showPDFModal}
                onClose={() => {
                    setShowPDFModal(false);
                    setPdfUrl(undefined);
                }}
                sourceUrl={pdfUrl}
            />

            {editingPlannerId && (
                <CoverEditorModal
                    isOpen={!!editingPlannerId}
                    onClose={() => setEditingPlannerId(null)}
                    initialCoverUrl={availablePlanners.find(p => p.id === editingPlannerId)?.cover_url || ''}
                    onSave={async (blob) => {
                        await updatePlannerCover(editingPlannerId, blob);
                        setEditingPlannerId(null);
                    }}
                />
            )}
        </div>
    );
};

export default PlannersPage;
