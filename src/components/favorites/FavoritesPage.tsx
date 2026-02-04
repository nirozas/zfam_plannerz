import React, { useEffect } from 'react';
import { usePlannerStore, slugify } from '../../store/plannerStore';
import { Heart, ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import PlannerCover from '../dashboard/PlannerCover';
import '../dashboard/Dashboard.css'; // Reuse dashboard styles for grid

const FavoritesPage: React.FC = () => {
    const { availablePlanners, fetchPlanners, toggleFavorite, openPlanner, archivePlanner, deletePlanner } = usePlannerStore();
    const navigate = useNavigate();

    useEffect(() => {
        fetchPlanners();
    }, [fetchPlanners]);

    const favoritePlanners = availablePlanners.filter(p => p.isFavorite && !p.isArchived);

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
        <div className="dashboard-layout">
            <aside className="dashboard-sidebar">
                <div className="brand-logo">ZOABI</div>
                <nav className="nav-menu">
                    <div className="nav-item" onClick={() => navigate('/library')}>
                        <ArrowLeft size={20} /> Back to Library
                    </div>
                </nav>
            </aside>

            <main className="dashboard-main">
                <header className="dashboard-header">
                    <h1>Favorites</h1>
                </header>

                <div className="content-scroll-area">
                    {favoritePlanners.length === 0 ? (
                        <div className="empty-search">
                            <Heart size={48} />
                            <p>No favorite planners yet. Heart a planner in your library to see it here!</p>
                        </div>
                    ) : (
                        <div className="planner-grid">
                            {favoritePlanners.map(planner => (
                                <PlannerCover
                                    key={planner.id}
                                    color={planner.coverColor || '#6366f1'}
                                    title={planner.name}
                                    category={planner.category}
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
            </main>
        </div>
    );
};

export default FavoritesPage;
