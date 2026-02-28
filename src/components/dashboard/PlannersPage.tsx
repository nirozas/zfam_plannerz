import React, { useState, useEffect } from 'react';
import { AnimatePresence } from 'framer-motion';
import { usePlannerStore, slugify } from '../../store/plannerStore';
import { Plus, Search, SortAsc, RefreshCcw, Archive as ArchiveIcon } from 'lucide-react';
import PlannerCover from './PlannerCover';
import CreationWizard from './CreationWizard';
import { CoverEditorModal } from './CoverEditorModal';
import { PDFImportModal } from './PDFImportModal';
import './Dashboard.css';
import { useNavigate } from 'react-router-dom';
import PageHero from '../ui/PageHero';
import { PlannerTabs } from './PlannerTabs';

const PlannersPage: React.FC = () => {
    const openPlanner = usePlannerStore(state => state.openPlanner);
    const availablePlanners = usePlannerStore(state => state.availablePlanners);
    const fetchPlanners = usePlannerStore(state => state.fetchPlanners);
    const archivePlanner = usePlannerStore(state => state.archivePlanner);
    const unarchivePlanner = usePlannerStore(state => state.unarchivePlanner);
    const deletePlanner = usePlannerStore(state => state.deletePlanner);
    const toggleFavorite = usePlannerStore(state => state.toggleFavorite);
    const updatePlannerCover = usePlannerStore(state => state.updatePlannerCover);
    const isFetchingPlanners = usePlannerStore(state => state.isFetchingPlanners);

    const [showCreateModal, setShowCreateModal] = useState(false);
    const [showPDFModal, setShowPDFModal] = useState(false);
    const [pdfUrl, setPdfUrl] = useState<string | undefined>(undefined);
    const [editingPlannerId, setEditingPlannerId] = useState<string | null>(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [sortBy, setSortBy] = useState<'date' | 'name'>('date');

    const navigate = useNavigate();

    useEffect(() => {
        fetchPlanners();
    }, [fetchPlanners]);

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

    const filteredPlanners = availablePlanners
        .filter(p => !p.isArchived)
        .filter(p => {
            const matchesSearch = p.name.toLowerCase().includes(searchTerm.toLowerCase());
            return matchesSearch;
        })
        .sort((a, b) => {
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
            <div className="px-4 md:px-8 py-3 md:py-4 bg-white border-b border-gray-100 sticky top-0 z-10 shadow-sm">
                <div className="flex flex-col lg:flex-row items-stretch lg:items-center gap-6">
                    {/* LEFT: Planner Navigation */}
                    <div className="flex-shrink-0">
                        <PlannerTabs />
                    </div>

                    {/* MIDDLE: Search */}
                    <div className="flex-1 flex justify-center min-w-0">
                        <div className="relative w-full max-w-xl">
                            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                            <input
                                type="text"
                                placeholder="Search planners..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 transition-all text-sm outline-none"
                            />
                        </div>
                    </div>

                    {/* RIGHT: Actions */}
                    <div className="flex items-center gap-3 justify-between lg:justify-end flex-shrink-0">
                        <button
                            className="bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2 rounded-xl flex items-center gap-2 text-sm font-bold transition-all shadow-lg shadow-indigo-100 whitespace-nowrap"
                            onClick={() => setShowCreateModal(true)}
                        >
                            <Plus size={18} /> <span>Create</span>
                        </button>

                        <button
                            className="bg-white border border-gray-200 text-gray-600 px-5 py-2 rounded-xl hidden md:flex items-center gap-2 text-sm font-bold hover:bg-gray-50 transition-all whitespace-nowrap"
                            onClick={() => setShowPDFModal(true)}
                        >
                            Import PDF
                        </button>

                        <div className="h-6 w-[1px] bg-gray-200 mx-1 hidden lg:block" />

                        <button
                            className={`flex items-center gap-2 px-4 py-2 rounded-xl border transition-all text-sm font-medium ${sortBy === 'date' ? 'bg-indigo-50 border-indigo-200 text-indigo-600' : 'bg-white border-gray-200 text-gray-600 hover:border-gray-300'}`}
                            onClick={() => setSortBy(sortBy === 'date' ? 'name' : 'date')}
                        >
                            <SortAsc size={16} />
                            <span className="hidden sm:inline">{sortBy === 'date' ? 'By Date' : 'A-Z'}</span>
                        </button>

                        <button
                            className="p-2 text-gray-400 hover:text-indigo-600 transition-colors"
                            onClick={() => fetchPlanners(true)}
                            title="Refresh"
                        >
                            <RefreshCcw size={18} className={isFetchingPlanners ? 'animate-spin' : ''} />
                        </button>
                    </div>
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
                                onClick={() => handleOpenPlanner(planner.id, planner.name)}
                                onArchive={(e) => handleArchive(planner.id, e)}
                                onDelete={(e) => handleDelete(planner.id, e)}
                                onFavorite={(e) => handleFavorite(planner.id, e)}
                                onEdit={(e) => handleUpdateCover(planner.id, e)}
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
