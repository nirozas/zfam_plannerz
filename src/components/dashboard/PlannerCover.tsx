import React from 'react';
import { motion } from 'framer-motion';
import { Trash2, Archive, BookOpen, Star, Edit2, RotateCcw } from 'lucide-react';
import './PlannerCover.css';

interface PlannerCoverProps {
    color: string;
    title: string;
    coverUrl?: string; // Add coverUrl prop
    category?: string;
    isFavorite?: boolean;
    isArchived?: boolean; // New prop
    onClick?: () => void;
    onArchive?: (e: React.MouseEvent) => void;
    onDelete?: (e: React.MouseEvent) => void;
    onFavorite?: (e: React.MouseEvent) => void;
    onEdit?: (e: React.MouseEvent) => void; // Add Edit callback
    onRename?: (newName: string) => void; // Add Rename callback
}

const PlannerCover: React.FC<PlannerCoverProps> = ({
    color,
    title,
    coverUrl,
    category = 'General',
    isFavorite = false,
    isArchived = false,
    onClick,
    onArchive,
    onDelete,
    onFavorite,
    onEdit,
    onRename // New prop
}) => {
    const [isEditing, setIsEditing] = React.useState(false);
    const [editName, setEditName] = React.useState(title);

    const handleSaveName = (e: React.FormEvent) => {
        e.preventDefault();
        e.stopPropagation(); // Stop click from opening planner
        if (onRename && editName.trim() !== "") {
            onRename(editName);
        }
        setIsEditing(false);
    };

    return (
        <div className="flex flex-col items-center gap-3 w-full">
            <motion.div
                className="planner-book-container relative w-full aspect-[2/3]"
                whileHover={{ scale: 1.05, rotateY: -10 }}
                onClick={onClick}
                style={{ width: '100%' }}
            >
                <div className="planner-book w-full h-full">
                    <div className="book-cover" style={{ backgroundColor: color }}>
                        {coverUrl && (
                            <img
                                src={coverUrl}
                                alt=""
                                referrerPolicy="no-referrer"
                                loading="lazy"
                                decoding="async"
                                className="absolute inset-0 w-full h-full object-cover z-0"
                                onError={(e) => (e.currentTarget.style.display = 'none')}
                            />
                        )}
                        <div className="cover-texture" />
                        <div className="cover-content" style={{ zIndex: 10, position: 'relative' }}>
                            <div className="cover-header">
                                <span className="cover-category">{category}</span>
                                {onFavorite && (
                                    <button
                                        className={`favorite-btn ${isFavorite ? 'active' : ''}`}
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            onFavorite(e);
                                        }}
                                    >
                                        <Star size={18} fill={isFavorite ? "#fbbf24" : "none"} />
                                    </button>
                                )}
                            </div>
                            {/* Title REMOVED from here */}
                            <div className="cover-footer">
                                <div className="brand-mark">NEXUS VAULT</div>
                            </div>
                        </div>
                    </div>
                    <div className="book-spine" style={{ backgroundColor: adjustColor(color, -20) }} />
                    <div className="book-pages" />
                    <div className="book-side" />
                </div>

                <div className="book-actions">
                    {onClick && (
                        <button className="action-btn open" onClick={(e) => { e.stopPropagation(); onClick(); }} title="Open Planner">
                            <BookOpen size={18} />
                        </button>
                    )}
                    {onEdit && (
                        <button className="action-btn edit" onClick={(e) => { e.stopPropagation(); onEdit(e); }} title="Edit Cover">
                            <Edit2 size={18} />
                        </button>
                    )}
                    {onArchive && (
                        <button className="action-btn archive" onClick={(e) => { e.stopPropagation(); onArchive(e); }} title={isArchived ? "Restore" : "Archive"}>
                            {isArchived ? <RotateCcw size={18} /> : <Archive size={18} />}
                        </button>
                    )}
                    {onDelete && (
                        <button className="action-btn delete" onClick={(e) => { e.stopPropagation(); onDelete(e); }} title="Delete">
                            <Trash2 size={18} />
                        </button>
                    )}
                </div>
            </motion.div>

            {/* Title Moved Below */}
            <div className="w-full text-center relative group" onClick={(e) => e.stopPropagation()}>
                {isEditing ? (
                    <form onSubmit={handleSaveName}>
                        <input
                            type="text"
                            value={editName}
                            onChange={(e) => setEditName(e.target.value)}
                            onBlur={handleSaveName}
                            autoFocus
                            className="w-full text-center text-sm font-bold text-gray-800 border-b-2 border-indigo-500 outline-none bg-transparent pb-1"
                        />
                    </form>
                ) : (
                    <div className="flex items-center justify-center gap-2 group-hover:text-indigo-600 transition-colors">
                        <h3
                            className="text-sm font-bold text-gray-800 truncate px-2 py-1 rounded cursor-text hover:bg-gray-100 transition-colors"
                            onDoubleClick={() => setIsEditing(true)}
                            title={title}
                        >
                            {title}
                        </h3>
                        {onRename && (
                            <button
                                onClick={() => setIsEditing(true)}
                                className="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-indigo-600 transition-all p-1"
                                title="Rename Planner"
                            >
                                <Edit2 size={12} />
                            </button>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};

// Helper function to darken color for spine
function adjustColor(color: string, amount: number) {
    return '#' + color.replace(/^#/, '').replace(/../g, color => ('0' + Math.min(255, Math.max(0, parseInt(color, 16) + amount)).toString(16)).substr(-2));
}

export default PlannerCover;
