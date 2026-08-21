import React, { useState, useEffect, useRef } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { Home, LayoutGrid, CheckSquare, LogOut, Plane, User, StickyNote, HardDrive, Bug, Settings, Wallet, Book, Activity } from 'lucide-react';
import { usePlannerStore } from '../../store/plannerStore';
import { useNotebookStore } from '../../store/notebookStore';
import { supabase } from '../../supabase/client';
import './AppSidebar.css';

export const AppSidebar: React.FC = () => {
    const { user, userProfile, setBugModalOpen } = usePlannerStore();
    const { isDriveConnected: signedIn, connectDrive: connect } = useNotebookStore();
    const disconnect = async () => {
        const { signOut: clearDrive } = await import('../../lib/googleDrive');
        await clearDrive();
        useNotebookStore.setState({ isDriveConnected: false });
    };

    const navigate = useNavigate();
    const [mobileShow, setMobileShow] = useState(false);
    const profileRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (event: Event) => {
            if (profileRef.current && !profileRef.current.contains(event.target as Node)) {
                setMobileShow(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        document.addEventListener('touchstart', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
            document.removeEventListener('touchstart', handleClickOutside);
        };
    }, []);

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

    const handleDriveClick = () => {
        if (signedIn) {
            disconnect().catch(e => alert(e.message || 'Disconnect failed'));
        } else {
            connect().catch(e => alert(e.message || 'Google Drive connection failed'));
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
                    to="/notebooks"
                    className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
                    title="Notebooks"
                >
                    <Book size={22} />
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

                <NavLink
                    to="/finances"
                    className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
                    title="Vault & Finances"
                >
                    <Wallet size={22} />
                </NavLink>

                <NavLink 
                    to="/trackers" 
                    className={({ isActive }) => `flex items-center space-x-3 p-2 rounded-lg transition-colors ${isActive ? 'bg-[#D4B4E8]/20 text-slate-900 font-medium shadow-sm' : 'text-slate-600 hover:bg-slate-50'}`}
                    title="Trackers"
                >
                    <Activity size={22} />
                </NavLink>



                {/* Bug Report Button - Moved to popover */}





                {/* Mobile-only icons - simplified or hidden to prevent overcrowding */}
            </nav >


            <div className="user-mini-profile" ref={profileRef} title={user?.email || 'Guest User'}>
                <div
                    className="avatar-circle cursor-pointer"
                    onClick={(e) => {
                        e.stopPropagation();
                        if (!user) {
                            navigate('/auth');
                        } else {
                            setMobileShow(prev => !prev);
                        }
                    }}
                >
                    {user ? initial : '?'}
                </div>
                {user ? (
                    <div className={`user-info-popover ${mobileShow ? 'mobile-show' : ''}`}>
                        <div className="font-bold text-sm truncate">{displayName}</div>
                        <div className="text-xs text-gray-500 truncate mb-2">{user?.email}</div>

                        {/* Profile supplementary links */}
                        <div className="flex flex-col border-t border-gray-100 pt-2 gap-1 px-1">
                            <button
                                onClick={() => {
                                    navigate('/settings');
                                    setMobileShow(false);
                                }}
                                className="text-xs flex items-center gap-2 py-2 font-bold text-gray-600 hover:text-indigo-600 transition-colors"
                            >
                                <Settings size={14} /> Profile Settings
                            </button>
                            <button
                                onClick={() => {
                                    setBugModalOpen(true);
                                    setMobileShow(false);
                                }}
                                className="text-xs flex items-center gap-2 py-2 font-bold text-rose-400 hover:text-rose-600 transition-colors"
                            >
                                <Bug size={14} /> Report a Bug
                            </button>
                            <button
                                onClick={() => {
                                    handleDriveClick();
                                    setMobileShow(false);
                                }}
                                className="text-xs flex items-center gap-2 py-2 font-bold"
                                style={{ color: signedIn ? '#16a34a' : '#3b82f6' }}
                            >
                                <HardDrive size={14} /> {signedIn ? 'Drive Connected' : 'Connect Drive'}
                            </button>
                        </div>

                        <button
                            onClick={() => {
                                handleSignOut();
                                setMobileShow(false);
                            }}
                            className="text-xs text-red-500 hover:text-red-700 mt-2 border-t border-gray-100 pt-2 flex items-center gap-1 font-bold"
                        >
                            <LogOut size={12} /> Sign Out Workspace
                        </button>
                    </div>
                ) : (
                    <div className={`user-info-popover ${mobileShow ? 'mobile-show' : ''}`}>
                        <div className="font-bold text-sm truncate">Hello guest!</div>
                        <div className="text-xs text-gray-500 truncate">Sign in to sync your data</div>
                        <button
                            onClick={() => {
                                navigate('/auth');
                                setMobileShow(false);
                            }}
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
