import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { Home, LayoutGrid, CheckSquare, LogOut, Plane, User } from 'lucide-react';
import { usePlannerStore } from '../../store/plannerStore';
import { supabase } from '../../supabase/client';
import './AppSidebar.css';

export const AppSidebar: React.FC = () => {
    const { user, userProfile } = usePlannerStore();
    const navigate = useNavigate();

    // Determine display name
    const displayName = userProfile?.full_name
        || user?.user_metadata?.full_name
        || user?.email?.split('@')[0]
        || 'My Planner';

    // Determine initial
    const initial = displayName.charAt(0).toUpperCase();

    const handleSignOut = async () => {
        await supabase.auth.signOut();
        window.location.href = '/auth'; // Hard reload to clear states
    };

    return (
        <aside className="app-sidebar">
            <div className="brand-logo">ZOABI</div>

            <nav className="nav-menu">
                <NavLink
                    to="/"
                    className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
                    title="Home"
                >
                    <Home size={22} />
                </NavLink>

                <NavLink
                    to="/planners"
                    className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
                    title="Planners"
                >
                    <LayoutGrid size={22} />
                </NavLink>

                <NavLink
                    to="/tasks"
                    className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
                    title="Tasks & Rituals"
                >
                    <CheckSquare size={22} />
                </NavLink>

                <NavLink
                    to="/trips"
                    className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
                    title="Adventure Trips"
                >
                    <Plane size={22} />
                </NavLink>

                <div className="mt-auto flex flex-col md:flex-row gap-2 md:gap-0">
                    <NavLink
                        to="/settings"
                        className={({ isActive }) => `nav-item md:hidden ${isActive ? 'active' : ''}`}
                        title="Workspace Settings"
                    >
                        <User size={22} />
                    </NavLink>
                    <button
                        onClick={handleSignOut}
                        className="nav-item logout text-gray-400 hidden md:flex"
                        title="Sign Out"
                    >
                        <LogOut size={22} />
                    </button>
                </div>
            </nav>

            <div className="sidebar-footer">
                <div className="user-mini-profile" title={user?.email || 'User'}>
                    <div
                        className="avatar-circle cursor-pointer"
                        onClick={() => navigate('/settings')}
                    >
                        {initial}
                    </div>
                    <div className="user-info-popover">
                        <div className="font-bold text-sm truncate">{displayName}</div>
                        <div className="text-xs text-gray-500 truncate">{user?.email}</div>
                        <button
                            onClick={handleSignOut}
                            className="text-xs text-red-500 hover:text-red-700 mt-2 flex items-center gap-1"
                        >
                            <LogOut size={12} /> Sign Out
                        </button>
                    </div>
                </div>
            </div>
        </aside>
    );
};
