import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { Home, LayoutGrid, CheckSquare, LogOut, Plane, User, StickyNote, HardDrive, Loader2, Bug, Settings } from 'lucide-react';
import { usePlannerStore } from '../../store/plannerStore';
import { useGoogleDrive } from '../../hooks/useGoogleDrive';
import { supabase } from '../../supabase/client';
import './AppSidebar.css';

export const AppSidebar: React.FC = () => {
    const { user, userProfile, setBugModalOpen } = usePlannerStore();
    const { signedIn, loading: driveLoading, connect, disconnect } = useGoogleDrive();
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

    const handleDriveClick = async () => {
        try {
            if (signedIn) await disconnect();
            else await connect();
        } catch (e: any) {
            alert(e.message || 'Google Drive connection failed');
        }
    };

    return (
        <aside className="app-sidebar">
            <div className="brand-logo-container cursor-pointer" onClick={() => navigate('/')}>
                <img src="/nexus_logo.png" alt="Logo" className="logo-img" />
            </div>

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
                    to="/cards"
                    className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
                    title="Recursive Cards"
                >
                    <StickyNote size={22} />
                </NavLink>

                <NavLink
                    to="/trips"
                    className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
                    title="Adventure Trips"
                >
                    <Plane size={22} />
                </NavLink>

                {/* Bug Report Button */}
                <button
                    onClick={() => setBugModalOpen(true)}
                    className="nav-item text-rose-400 hover:text-rose-600 transition-colors"
                    title="Report a Bug"
                >
                    <Bug size={22} />
                </button>

                {/* Google Drive Connection Button */}
                <div className="relative group/drive mt-auto">
                    <button
                        onClick={handleDriveClick}
                        className="nav-item w-full relative"
                        style={{ color: signedIn ? '#16a34a' : '#3b82f6' }}
                        title=""
                    >
                        {driveLoading ? (
                            <Loader2 size={20} className="animate-spin" />
                        ) : (
                            <div className="relative">
                                <HardDrive size={20} />
                                {/* Status dot */}
                                <span
                                    className={`absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full border-2 border-white ${!signedIn ? 'drive-dot-pending' : ''}`}
                                    style={{
                                        background: signedIn ? '#22c55e' : '#f59e0b',
                                        boxShadow: signedIn ? '0 0 6px #22c55e88' : '0 0 6px #f59e0b88'
                                    }}
                                />
                            </div>
                        )}
                    </button>
                    {/* Hover tooltip */}
                    <div className="pointer-events-none absolute left-[78px] bottom-0 z-[2001] opacity-0 group-hover/drive:opacity-100 translate-x-1 group-hover/drive:translate-x-0 transition-all duration-200">
                        <div className="bg-white rounded-xl shadow-xl border border-gray-100 px-4 py-3 whitespace-nowrap min-w-[180px]">
                            <div className="flex items-center gap-2 mb-1">
                                <HardDrive size={14} style={{ color: signedIn ? '#16a34a' : '#3b82f6' }} />
                                <span className="text-xs font-black text-gray-800">Google Drive</span>
                                <span
                                    className="ml-auto text-[10px] font-bold px-2 py-0.5 rounded-full"
                                    style={{
                                        background: signedIn ? '#dcfce7' : '#fef3c7',
                                        color: signedIn ? '#15803d' : '#b45309'
                                    }}
                                >
                                    {driveLoading ? 'Loading...' : signedIn ? 'Connected' : 'Not connected'}
                                </span>
                            </div>
                            <p className="text-[10px] text-gray-400 font-medium">
                                {signedIn ? 'Click to disconnect Drive' : 'Click to sign in with Google'}
                            </p>
                        </div>
                    </div>
                </div>

                <div className="flex flex-col md:flex-row gap-2 md:gap-0">
                    <NavLink
                        to={user ? "/settings" : "/auth"}
                        className={({ isActive }) => `nav-item md:hidden ${isActive ? 'active' : ''}`}
                        title="Workspace Settings"
                    >
                        <Settings size={22} />
                    </NavLink>
                    {user ? (
                        <button
                            onClick={handleSignOut}
                            className="nav-item logout text-gray-400 hidden md:flex"
                            title="Sign Out"
                        >
                            <LogOut size={22} />
                        </button>
                    ) : (
                        <NavLink
                            to="/auth"
                            className="nav-item text-indigo-500 hidden md:flex"
                            title="Sign In"
                        >
                            <User size={22} />
                        </NavLink>
                    )}
                </div>
            </nav>


            <div className="sidebar-footer">
                <div className="user-mini-profile" title={user?.email || 'Guest User'}>
                    <div
                        className="avatar-circle cursor-pointer"
                        onClick={() => navigate(user ? '/settings' : '/auth')}
                    >
                        {user ? initial : '?'}
                    </div>
                    {user ? (
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
                    ) : (
                        <div className="user-info-popover">
                            <div className="font-bold text-sm truncate">Hello guest!</div>
                            <div className="text-xs text-gray-500 truncate">Sign in to sync your data</div>
                            <button
                                onClick={() => navigate('/auth')}
                                className="text-xs text-indigo-500 hover:text-indigo-700 mt-2 flex items-center gap-1 font-black uppercase"
                            >
                                <User size={12} /> Sign In
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </aside>
    );
};
