import React, { useEffect, useState } from 'react';
import { usePlannerStore } from '../../store/plannerStore';
import { ArrowLeft, Trash2, RotateCcw } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import PlannerCover from '../dashboard/PlannerCover';
import './ArchivePage.css';

const ArchivePage: React.FC = () => {
    const { availablePlanners, fetchPlanners, unarchivePlanner, deletePlanner } = usePlannerStore();
    const navigate = useNavigate();
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
        <div className="archive-page">
            <header className="archive-header">
                <div className="archive-top">
                    <button className="back-btn" onClick={() => navigate('/homepage')}>
                        <ArrowLeft size={24} />
                    </button>
                    <h1>Archived Planners</h1>
                </div>

                {/* Search & Sort for Archive - Reusing dashboard types */}
                <div className="search-bar" style={{ width: '100%', maxWidth: '500px' }}>
                    <input
                        type="text"
                        placeholder="Search archives..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        style={{ padding: '10px 15px', borderRadius: '15px', border: '1px solid #ccc', flex: 1 }}
                    />
                    <button onClick={() => setSortBy(prev => prev === 'date' ? 'name' : 'date')} style={{ padding: '0 1rem', background: 'none', border: '1px solid #ccc', borderRadius: '15px', cursor: 'pointer' }}>
                        {sortBy === 'date' ? 'Date' : 'Name'}
                    </button>
                </div>
            </header>

            <main className="archive-content">
                {archivedPlanners.length === 0 ? (
                    <div className="empty-archive">
                        <Trash2 size={48} />
                        <p>No archived planners found.</p>
                    </div>
                ) : (
                    <div className="planner-grid">
                        {archivedPlanners.map(planner => (
                            <div key={planner.id} className="archived-item-wrapper">
                                <PlannerCover
                                    color={planner.coverColor || '#94a3b8'}
                                    title={planner.name}
                                    category={planner.category}
                                    // Overriding specific actions for archive context
                                    onClick={() => { }} // Disabled click
                                    onArchive={(e) => handleRestore(planner.id, e)} // Re-purpose for restore
                                    onDelete={(e) => handleDelete(planner.id, e)}
                                />
                                <div className="restore-hint">
                                    <RotateCcw size={14} /> Restore
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
