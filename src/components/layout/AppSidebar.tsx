import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { Home, LayoutGrid, CheckSquare, LogOut, Plane, User, StickyNote, HardDrive, Loader2, Bug } from 'lucide-react';
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
        // Immediate storage clear to prevent session-resume loops
        localStorage.clear();
        sessionStorage.clear();

        try {
            // Attempt clean sign out but don't wait for it if it hangs
            supabase.auth.signOut();
            // Try to clear drive tokens if possible
            import('../../lib/googleDrive').then(({ signOut: clearDrive }) => clearDrive()).catch(() => { });
        } catch (e) {
            console.error('Sign out error:', e);
        }

        // Final fallback: absolute redirect
        window.location.href = '/auth';
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
                    className="nav-item text-rose-400 hover:text-rose-600 transition-colors mt-auto mb-2"
                    title="Report a Bug"
                >
                    <Bug size={22} />
                </button>

                {/* Google Drive Connection Button (Desktop) */}
                <div className="relative group/drive hidden md:flex">
                    <button
                        onClick={handleDriveClick}
                        className="nav-item w-full relative"
                        style={{ color: signedIn ? '#16a34a' : '#3b82f6' }}
                    >
                        {driveLoading ? (
                            <Loader2 size={20} className="animate-spin" />
                        ) : (
                            <div className="relative">
                                <HardDrive size={20} />
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
                    <div className="pointer-events-none absolute left-[78px] bottom-0 z-[2001] opacity-0 group-hover/drive:opacity-100 translate-x-1 group-hover/drive:translate-x-0 transition-all duration-200">
                        <div className="bg-white rounded-xl shadow-xl border border-gray-100 px-4 py-3 whitespace-nowrap min-w-[180px]">
                            <div className="flex items-center gap-2 mb-1">
                                <HardDrive size={14} style={{ color: signedIn ? '#16a34a' : '#3b82f6' }} />
                                <span className="text-xs font-black text-gray-800">Google Drive</span>
                                <span className="ml-auto text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ background: signedIn ? '#dcfce7' : '#fef3c7', color: signedIn ? '#15803d' : '#b45309' }}>
                                    {driveLoading ? '...' : signedIn ? 'Connected' : 'Disconnected'}
                                </span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Desktop Sign Out / Sign In visibility */}
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

                {/* Mobile-only icons - simplified or hidden to prevent overcrowding */}
            </nav >


            <div className="user-mini-profile" title={user?.email || 'Guest User'}>
                <div
                    className="avatar-circle cursor-pointer"
                    onClick={(e) => {
                        e.stopPropagation();
                        if (window.innerWidth <= 768) {
                            // Toggle popover on mobile instead of direct navigation
                            const popover = e.currentTarget.nextElementSibling;
                            if (popover) {
                                popover.classList.toggle('mobile-show');
                            }
                        } else {
                            navigate(user ? '/settings' : '/auth');
                        }
                    }}
                >
                    {user ? initial : '?'}
                </div>
                {user ? (
                    <div className="user-info-popover">
                        <div className="font-bold text-sm truncate">{displayName}</div>
                        <div className="text-xs text-gray-500 truncate mb-2">{user?.email}</div>

                        {/* Mobile supplementary links */}
                        <div className="flex flex-col md:hidden border-t border-gray-100 pt-2 gap-1">
                            <button onClick={handleDriveClick} className="text-xs flex items-center gap-2 py-1.5 font-bold" style={{ color: signedIn ? '#16a34a' : '#3b82f6' }}>
                                <HardDrive size={14} /> {signedIn ? 'Drive Connected' : 'Connect Drive'}
                            </button>
                        </div>

                        <button
                            onClick={handleSignOut}
                            className="text-xs text-red-500 hover:text-red-700 mt-2 border-t border-gray-100 pt-2 flex items-center gap-1 font-bold"
                        >
                            <LogOut size={12} /> Sign Out Workspace
                        </button>
                    </div>
                ) : (
                    <div className="user-info-popover">
                        <div className="font-bold text-sm truncate">Hello guest!</div>
                        <div className="text-xs text-gray-500 truncate">Sign in to sync your data</div>
                        <button
                            onClick={() => navigate('/auth')}
                            className="text-xs text-indigo-500 hover:text-indigo-700 mt-2 flex items-center gap-1 font-bold uppercase"
                        >
                            <User size={12} /> Sign In
                        </button>
                    </div>
                )}
            </div>
        </aside>
    );
};
