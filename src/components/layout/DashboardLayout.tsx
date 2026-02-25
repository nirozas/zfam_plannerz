import React, { useEffect, useState } from 'react';
import { Outlet, Navigate, useNavigate, useLocation } from 'react-router-dom';
import { usePlannerStore } from '../../store/plannerStore';
import { AppSidebar } from './AppSidebar';
import { supabase } from '../../supabase/client';
import { Loader2, Users, X, Bug } from 'lucide-react';
import BugReportModal from '../modals/BugReportModal';

const DashboardLayout: React.FC = () => {
    const { user, isAuthInitialized, fetchConnections, connections } = usePlannerStore();
    const location = useLocation();
    const [dismissedRequests, setDismissedRequests] = useState<string[]>([]);
    const [adminBugs, setAdminBugs] = useState<any[]>([]);
    const navigate = useNavigate();

    useEffect(() => {
        if (!user) return;

        // Initial fetch
        fetchConnections();

        // Subscribe to real-time inserts on connections table
        // This fires the moment someone sends a request to you — no polling needed
        const channel = supabase
            .channel('connection-requests')
            .on(
                'postgres_changes',
                {
                    event: '*',           // INSERT + UPDATE + DELETE
                    schema: 'public',
                    table: 'connections',
                    filter: `receiver_id=eq.${user.id}`
                },
                () => {
                    // Re-fetch whenever something changes for our user
                    fetchConnections();
                }
            )
            .on(
                'postgres_changes',
                {
                    event: 'UPDATE',
                    schema: 'public',
                    table: 'connections',
                    filter: `requester_id=eq.${user.id}`
                },
                () => {
                    fetchConnections();
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [user, fetchConnections]);

    useEffect(() => {
        if (!user || usePlannerStore.getState().userProfile?.role !== 'admin') return;

        const channel = supabase
            .channel('admin-bugs')
            .on(
                'postgres_changes',
                { event: 'INSERT', schema: 'public', table: 'bug_reports' },
                (payload) => {
                    setAdminBugs(prev => [payload.new, ...prev]);
                    // Play a subtle sound or trigger toast
                    console.log('New bug reported!', payload.new);
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [user]);

    if (!isAuthInitialized) {
        return (
            <div className="flex items-center justify-center h-screen w-screen bg-gray-50">
                <Loader2 className="animate-spin text-indigo-500" size={48} />
            </div>
        );
    }

    if (!user && location.pathname !== '/') {
        return <Navigate to="/auth" replace />;
    }

    // Use dvh (dynamic viewport height) with vh fallback so mobile browsers
    // account for the collapsing address bar. The sidebar becomes a fixed
    // bottom-bar on mobile via CSS, so we give main a bottom-padding.
    const pendingIncoming = connections.filter(c => c.status === 'pending' && c.receiver_id === user.id && !dismissedRequests.includes(c.id));

    return (
        <div
            className="flex flex-col md:flex-row w-screen overflow-hidden bg-gray-50 relative"
            style={{ height: '100dvh' }}
        >
            {/* Incoming Connection Global Notice */}
            {pendingIncoming.length > 0 && (
                <div className="absolute top-4 right-4 z-[9999] flex flex-col gap-3 max-w-sm w-full animate-in slide-in-from-right-8 duration-300">
                    {pendingIncoming.map(conn => (
                        <div key={conn.id} className="bg-white/90 backdrop-blur-xl border border-fuchsia-100 rounded-2xl shadow-2xl p-4 flex flex-col gap-3">
                            <div className="flex items-start justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 bg-fuchsia-100 text-fuchsia-600 rounded-xl">
                                        <Users size={18} />
                                    </div>
                                    <div>
                                        <h4 className="text-sm font-black text-slate-900 leading-tight">Connection Request</h4>
                                        <p className="text-xs font-medium text-slate-500">{conn.peer_name || conn.peer_email} wants to connect.</p>
                                    </div>
                                </div>
                                <button
                                    onClick={() => setDismissedRequests(prev => [...prev, conn.id])}
                                    className="text-gray-400 hover:text-gray-600 transition-colors"
                                >
                                    <X size={16} />
                                </button>
                            </div>
                            <div className="flex gap-2 w-full pt-1">
                                <button
                                    onClick={() => {
                                        navigate('/settings');
                                        setDismissedRequests(prev => [...prev, conn.id]);
                                    }}
                                    className="flex-1 bg-fuchsia-500 hover:bg-fuchsia-600 text-white text-[10px] font-black uppercase tracking-wider py-2 rounded-lg transition-all text-center"
                                >
                                    Review
                                </button>
                                <button
                                    onClick={() => setDismissedRequests(prev => [...prev, conn.id])}
                                    className="flex-1 bg-gray-100 flex-1 hover:bg-gray-200 text-gray-700 text-[10px] font-black uppercase tracking-wider py-2 rounded-lg transition-all text-center"
                                >
                                    Later
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Admin Bug Notification */}
            {adminBugs.length > 0 && (
                <div className="absolute top-20 right-4 z-[9999] flex flex-col gap-3 max-w-sm w-full animate-in fade-in duration-500">
                    {adminBugs.map(bug => (
                        <div key={bug.id} className="bg-slate-900 text-white border border-slate-700 rounded-2xl shadow-2xl p-4 flex flex-col gap-3">
                            <div className="flex items-start justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 bg-red-500/20 text-red-500 rounded-xl">
                                        <Bug size={18} />
                                    </div>
                                    <div>
                                        <h4 className="text-sm font-black text-white leading-tight">New Bug Reported</h4>
                                        <p className="text-[10px] text-slate-400 font-medium">By: {bug.user_id?.slice(0, 8)}...</p>
                                    </div>
                                </div>
                                <button
                                    onClick={() => setAdminBugs(prev => prev.filter(b => b.id !== bug.id))}
                                    className="text-slate-500 hover:text-white transition-colors"
                                >
                                    <X size={16} />
                                </button>
                            </div>
                            <p className="text-xs text-slate-300 line-clamp-3 bg-slate-800/50 p-3 rounded-xl border border-slate-700/50 italic">
                                "{bug.description}"
                            </p>
                            <button
                                onClick={() => setAdminBugs(prev => prev.filter(b => b.id !== bug.id))}
                                className="w-full bg-slate-800 hover:bg-slate-700 text-[10px] font-black uppercase tracking-wider py-2 rounded-lg transition-all"
                            >
                                Acknowledge
                            </button>
                        </div>
                    ))}
                </div>
            )}

            {/* On desktop the sidebar sits in the normal flow (left).
                On mobile the CSS makes it fixed to the bottom. */}
            <AppSidebar />
            <main className="flex-1 overflow-hidden relative flex flex-col pb-[65px] md:pb-0">
                <Outlet />
                <BugReportModal />
            </main>
        </div>
    );
};

export default DashboardLayout;
