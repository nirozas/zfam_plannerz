import React, { useEffect, useState } from 'react';
import { usePlannerStore, slugify } from '../../store/plannerStore';
import { Heart, Search, SortAsc, RefreshCcw } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import PlannerCover from '../dashboard/PlannerCover';
import PageHero from '../ui/PageHero';
import { PlannerTabs } from '../dashboard/PlannerTabs';

const FavoritesPage: React.FC = () => {
    const { availablePlanners, fetchPlanners, toggleFavorite, openPlanner, archivePlanner, deletePlanner, isFetchingPlanners } = usePlannerStore();
    const navigate = useNavigate();
    const [searchTerm, setSearchTerm] = useState('');
    const [sortBy, setSortBy] = useState<'date' | 'name'>('date');

    useEffect(() => {
        fetchPlanners();
    }, [fetchPlanners]);

    const favoritePlanners = availablePlanners
        .filter(p => p.isFavorite && !p.isArchived)
        .filter(p => p.name.toLowerCase().includes(searchTerm.toLowerCase()))
        .sort((a, b) => {
            if (sortBy === 'date') return new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime();
            return a.name.localeCompare(b.name);
        });

    const handleOpenPlanner = (id: string, name: string) => {
        openPlanner(id);
        navigate(`/planner/${slugify(name)}`);
    };

    const handleArchive = async (id: string, e: React.MouseEvent) => {
        e.stopPropagation();
        if (confirm('Archive this planner?')) {
            await archivePlanner(id);
        }
    };

    const handleDelete = async (id: string, e: React.MouseEvent) => {
        e.stopPropagation();
        if (confirm('Delete this planner?')) {
            await deletePlanner(id);
        }
    };

    const handleUnfavorite = async (id: string, e: React.MouseEvent) => {
        e.stopPropagation();
        await toggleFavorite(id);
    };

    return (
        <div className="flex flex-col h-full w-full overflow-hidden bg-white">
            <PageHero
                pageKey="favorites"
                title="Your Favorites"
                subtitle="A collection of your most loved notebooks and trackers."
            />

            {/* Controls Bar */}
            <div className="px-4 md:px-8 py-3 md:py-4 bg-white border-b border-gray-100 flex flex-col items-stretch sticky top-0 z-10 shadow-sm gap-4">
                <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
                    <div className="flex items-center gap-3 md:gap-4 flex-1 max-w-2xl">
                        <div className="relative flex-1">
                            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                            <input
                                type="text"
                                placeholder="Search favorites..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 transition-all text-sm outline-none"
                            />
                        </div>
                    </div>

                    <div className="flex items-center gap-3 justify-end">
                        <button
                            className={`flex items-center gap-2 px-3 md:px-4 py-2 rounded-xl border transition-all text-xs md:text-sm font-medium ${sortBy === 'date' ? 'bg-indigo-50 border-indigo-200 text-indigo-600' : 'bg-white border-gray-200 text-gray-600 hover:border-gray-300'}`}
                            onClick={() => setSortBy(sortBy === 'date' ? 'name' : 'date')}
                        >
                            <SortAsc size={16} />
                            <span className="hidden sm:inline">{sortBy === 'date' ? 'By Date Added' : 'A-Z'}</span>
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
                    <PlannerTabs />
                </div>
            </div>

            <div className="flex-1 overflow-y-auto p-8 bg-gray-50/30">
                {favoritePlanners.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-64 text-gray-400 gap-4">
                        <div className="p-6 bg-white rounded-full shadow-sm">
                            <Heart size={48} className="text-pink-100" fill="currentColor" />
                        </div>
                        <p className="font-medium text-gray-500">No favorite planners found.</p>
                        <button
                            onClick={() => navigate('/planners')}
                            className="text-sm text-indigo-600 font-bold hover:underline"
                        >
                            Back to My Planners
                        </button>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-8">
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
                                onFavorite={(e) => handleUnfavorite(planner.id, e)}
                            />
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

export default FavoritesPage;
