import React, { useEffect, useState } from 'react';
import { usePlannerStore } from '../../store/plannerStore';
import { Trash2, RotateCcw, Search, SortAsc, RefreshCcw } from 'lucide-react';
import PlannerCover from '../dashboard/PlannerCover';
import PageHero from '../ui/PageHero';
import { PlannerTabs } from '../dashboard/PlannerTabs';
import './ArchivePage.css';

const ArchivePage: React.FC = () => {
    const { availablePlanners, fetchPlanners, unarchivePlanner, deletePlanner } = usePlannerStore();
    const [searchTerm, setSearchTerm] = useState('');
    const [sortBy, setSortBy] = useState<'date' | 'name'>('date');

    useEffect(() => {
        fetchPlanners();
    }, [fetchPlanners]);

    const archivedPlanners = availablePlanners
        .filter(p => p.isArchived)
        .filter(p => p.name.toLowerCase().includes(searchTerm.toLowerCase()))
        .sort((a, b) => {
            if (sortBy === 'date') return new Date(b.archivedAt || 0).getTime() - new Date(a.archivedAt || 0).getTime();
            return a.name.localeCompare(b.name);
        });

    const handleRestore = async (id: string, e: React.MouseEvent) => {
        e.stopPropagation();
        await unarchivePlanner(id);
    };

    const handleDelete = async (id: string, e: React.MouseEvent) => {
        e.stopPropagation();
        if (confirm('Permanently delete this planner? This cannot be undone.')) {
            await deletePlanner(id);
        }
    };

    return (
        <div className="flex flex-col h-full overflow-hidden w-full bg-white">
            <PageHero
                pageKey="archive"
                title="Archived Workspace"
                subtitle="Restore your previous work or clear old projects."
            />

            {/* Controls Bar */}
            <div className="px-4 md:px-8 py-3 md:py-4 bg-white border-b border-gray-100 flex flex-col items-stretch sticky top-0 z-10 shadow-sm gap-4">
                <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
                    <div className="flex items-center gap-3 md:gap-4 flex-1 max-w-2xl">
                        <div className="relative flex-1">
                            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                            <input
                                type="text"
                                placeholder="Search archived planners..."
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
                            <span className="hidden sm:inline">{sortBy === 'date' ? 'By Date' : 'A-Z'}</span>
                        </button>
                        <button
                            className="p-2 text-gray-400 hover:text-indigo-600 transition-colors"
                            onClick={() => fetchPlanners()}
                            title="Refresh"
                        >
                            <RefreshCcw size={18} />
                        </button>
                    </div>
                </div>

                {/* Sub-Tabs */}
                <div className="flex items-center justify-between border-t border-gray-50 pt-2 md:pt-0 md:border-t-0">
                    <PlannerTabs />
                </div>
            </div>

            <main className="flex-1 overflow-y-auto p-8 bg-gray-50/30">
                {archivedPlanners.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-64 text-gray-400 gap-4">
                        <div className="p-6 bg-white rounded-full shadow-sm">
                            <Trash2 size={48} className="text-gray-200" />
                        </div>
                        <p className="font-medium text-gray-500">Your archive is empty.</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-8">
                        {archivedPlanners.map(planner => (
                            <div key={planner.id} className="group relative">
                                <PlannerCover
                                    color={planner.coverColor || '#94a3b8'}
                                    title={planner.name}
                                    category={planner.category}
                                    coverUrl={planner.cover_url}
                                    onClick={() => { }}
                                    onArchive={(e) => handleRestore(planner.id, e)}
                                    onDelete={(e) => handleDelete(planner.id, e)}
                                />
                                <div className="mt-2 flex items-center justify-center gap-2 text-xs font-bold text-gray-400 group-hover:text-indigo-500 transition-colors uppercase tracking-widest">
                                    <RotateCcw size={12} /> Click Archive Icon to Restore
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </main>
        </div>
    );
};

export default ArchivePage;
