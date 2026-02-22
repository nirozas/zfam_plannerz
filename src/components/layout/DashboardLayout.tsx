import React, { useEffect, useState } from 'react';
import { Outlet, Navigate, useNavigate } from 'react-router-dom';
import { usePlannerStore } from '../../store/plannerStore';
import { AppSidebar } from './AppSidebar';
import { Loader2, Users, X } from 'lucide-react';
import { supabase } from '../../supabase/client';

const DashboardLayout: React.FC = () => {
    const { user, isAuthInitialized, fetchConnections, connections } = usePlannerStore();
    const [dismissedRequests, setDismissedRequests] = useState<string[]>([]);
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

    if (!isAuthInitialized) {
        return (
            <div className="flex items-center justify-center h-screen w-screen bg-gray-50">
                <Loader2 className="animate-spin text-indigo-500" size={48} />
            </div>
        );
    }

    if (!user) {
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

            {/* On desktop the sidebar sits in the normal flow (left).
                On mobile the CSS makes it fixed to the bottom. */}
            <AppSidebar />
            <main className="flex-1 overflow-hidden relative flex flex-col pb-[65px] md:pb-0">
                <Outlet />
            </main>
        </div>
    );
};

export default DashboardLayout;
