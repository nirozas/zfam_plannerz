import React from 'react';
import { NavLink } from 'react-router-dom';
import { LayoutGrid, Star, BookOpen, Archive } from 'lucide-react';

export const PlannerTabs: React.FC = () => {
    return (
        <div className="nav-pill-tabs">
            <NavLink
                to="/planners"
                className={({ isActive }) => `flex items-center gap-2 px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${isActive ? 'bg-white shadow-sm text-indigo-600' : 'text-gray-500 hover:text-gray-700'}`}
            >
                <LayoutGrid size={14} /> My Planners
            </NavLink>
            <NavLink
                to="/favorites"
                className={({ isActive }) => `flex items-center gap-2 px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${isActive ? 'bg-white shadow-sm text-indigo-600' : 'text-gray-500 hover:text-gray-700'}`}
            >
                <Star size={14} /> Favorites
            </NavLink>
            <NavLink
                to="/library"
                className={({ isActive }) => `flex items-center gap-2 px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${isActive ? 'bg-white shadow-sm text-indigo-600' : 'text-gray-500 hover:text-gray-700'}`}
            >
                <BookOpen size={14} /> Library
            </NavLink>
            <NavLink
                to="/archive"
                className={({ isActive }) => `flex items-center gap-2 px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${isActive ? 'bg-white shadow-sm text-indigo-600' : 'text-gray-500 hover:text-gray-700'}`}
            >
                <Archive size={14} /> Archive
            </NavLink>
        </div>
    );
};
