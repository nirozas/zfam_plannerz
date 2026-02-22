import React, { useState, useEffect } from 'react';
import { Save, User, Loader2, Camera, ShieldCheck, Mail, Database, FileText, Image as ImageIcon, RefreshCcw, CheckSquare, Plane, LogOut, Users, Link as LinkIcon, Check, X, UserPlus, Pencil, Home, Briefcase } from 'lucide-react';

import { usePlannerStore } from '../../store/plannerStore';
import { supabase } from '../../supabase/client';
import './SettingsPage.css';
import PageHero from '../ui/PageHero';

const SettingsPage: React.FC = () => {
    const { user, userProfile, userStats, updateProfile, uploadAvatar, fetchUserStats, fetchUserProfile, connections, fetchConnections, requestConnection, acceptConnection, removeConnection, updateConnectionType } = usePlannerStore();

    const [loading, setLoading] = useState(false);
    const [connectLoading, setConnectLoading] = useState(false);
    const [connectEmail, setConnectEmail] = useState('');
    const [connectType, setConnectType] = useState<'family' | 'work'>('work');
    const [editingTypeId, setEditingTypeId] = useState<string | null>(null);
    const [uploadingAvatar, setUploadingAvatar] = useState(false);
    const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);
    const [formData, setFormData] = useState({
        username: '',
        full_name: '',
    });

    const handleSignOut = async () => {
        await supabase.auth.signOut();
        window.location.href = '/auth'; // Hard reload to clear states
    };

    const fileInputRef = React.useRef<HTMLInputElement>(null);

    useEffect(() => {
        const init = async () => {
            if (user) {
                await fetchUserProfile();
                await fetchUserStats();
                await fetchConnections();
            }
        };
        init();
    }, [user, fetchUserProfile, fetchUserStats, fetchConnections]);

    useEffect(() => {
        if (userProfile) {
            setFormData({
                username: userProfile.username || '',
                full_name: userProfile.full_name || '',
            });
        }
    }, [userProfile]);

    const handleUpdateProfile = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setMessage(null);

        try {
            await updateProfile(formData);
            setMessage({ type: 'success', text: 'Profile updated successfully!' });
        } catch (error: any) {
            setMessage({ type: 'error', text: error.message || 'Failed to update profile' });
        } finally {
            setLoading(false);
        }
    };

    const handleConnect = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!connectEmail) return;
        setConnectLoading(true);
        try {
            await requestConnection(connectEmail, connectType);
            setMessage({ type: 'success', text: `Connection request sent to ${connectEmail}` });
            setConnectEmail('');
            setConnectType('work');
        } catch (error: any) {
            setMessage({ type: 'error', text: error.message || 'Failed to send connection request' });
        } finally {
            setConnectLoading(false);
        }
    };

    const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setUploadingAvatar(true);
        try {
            await uploadAvatar(file);
            setMessage({ type: 'success', text: 'Avatar updated successfully!' });
        } catch (error: any) {
            setMessage({ type: 'error', text: error.message || 'Avatar upload failed' });
        } finally {
            setUploadingAvatar(false);
        }
    };

    return (
        <div className="flex flex-col h-full w-full overflow-hidden bg-slate-50 relative">
            {/* Ambient background meshes */}
            <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] bg-indigo-300/30 rounded-full blur-[120px] pointer-events-none mix-blend-multiply" />
            <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-fuchsia-300/20 rounded-full blur-[120px] pointer-events-none mix-blend-multiply" />
            <div className="absolute top-[20%] right-[10%] w-[30%] h-[30%] bg-blue-300/20 rounded-full blur-[100px] pointer-events-none" />

            <div className="relative z-10">
                <PageHero
                    pageKey="settings"
                    title="Workspace Settings"
                    subtitle="Manage your profile, preferences, and account security."
                />
            </div>

            <main className="flex-1 overflow-y-auto p-4 md:p-8 z-10 relative">
                <div className="max-w-5xl mx-auto">
                    {/* Profile Header Card */}
                    <div className="bg-white/70 backdrop-blur-xl rounded-3xl p-5 md:p-8 border border-white shadow-xl shadow-slate-200/50 mb-6 md:mb-8 flex flex-col sm:flex-row items-center justify-between gap-4 transition-all">
                        <div className="flex flex-col sm:flex-row items-center gap-4 md:gap-6 text-center sm:text-left">
                            <div className="relative group">
                                <div className="w-24 h-24 rounded-full overflow-hidden border-4 border-indigo-50 shadow-inner">
                                    {userProfile?.avatar_url ? (
                                        <img src={userProfile.avatar_url} alt="Avatar" className="w-full h-full object-cover" />
                                    ) : (
                                        <div className="w-full h-full bg-gradient-to-tr from-indigo-600 to-fuchsia-500 flex items-center justify-center text-3xl font-black text-white shadow-inner">
                                            {formData.full_name?.charAt(0) || user?.email?.charAt(0) || '?'}
                                        </div>
                                    )}
                                </div>
                                <button
                                    className="absolute bottom-0 right-0 p-2 bg-indigo-600 text-white rounded-full shadow-lg border-2 border-white hover:bg-indigo-700 transition-all"
                                    onClick={() => fileInputRef.current?.click()}
                                    disabled={uploadingAvatar}
                                >
                                    {uploadingAvatar ? <Loader2 size={14} className="animate-spin" /> : <Camera size={14} />}
                                </button>
                                <input
                                    type="file"
                                    ref={fileInputRef}
                                    style={{ display: 'none' }}
                                    onChange={handleAvatarUpload}
                                    accept="image/*"
                                />
                            </div>
                            <div className="profile-identity">
                                <h2 className="text-xl md:text-2xl font-black text-gray-900">{formData.full_name || 'Your Name'}</h2>
                                <p className="text-gray-500 font-medium flex flex-wrap justify-center sm:justify-start items-center gap-2 mt-1">
                                    {userProfile?.role === 'admin' ?
                                        <span className="flex items-center gap-1 text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-lg text-xs font-black uppercase tracking-wider"><ShieldCheck size={12} /> Administrator</span> :
                                        'Premium User'}
                                    <span className="text-gray-300">•</span>
                                    {user?.email}
                                </p>
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 md:gap-8">
                        {/* Main Form */}
                        <div className="lg:col-span-2 bg-white/70 backdrop-blur-xl rounded-3xl p-5 md:p-8 border border-white shadow-xl shadow-slate-200/50">
                            <h3 className="text-sm font-black text-slate-400 uppercase tracking-widest mb-6">Personal Information</h3>
                            <form onSubmit={handleUpdateProfile} className="space-y-6">
                                <div className="space-y-2">
                                    <label className="text-xs font-bold text-gray-700 flex items-center gap-2"><Mail size={14} /> Email Address</label>
                                    <input type="text" value={user?.email || ''} disabled className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl text-gray-400 cursor-not-allowed" />
                                    <p className="text-[10px] text-gray-400 font-medium">Email is managed via authentication and cannot be changed here.</p>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div className="space-y-2">
                                        <label className="text-xs font-bold text-gray-700 flex items-center gap-2"><User size={14} /> Display Name</label>
                                        <input
                                            type="text"
                                            placeholder="Enter your full name"
                                            value={formData.full_name}
                                            onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                                            className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                                        />
                                    </div>

                                    <div className="space-y-2">
                                        <label className="text-xs font-bold text-gray-700">Username</label>
                                        <div className="relative">
                                            <span className="absolute left-4 top-1/2 -translate-y-1/2 font-bold text-gray-400">@</span>
                                            <input
                                                type="text"
                                                placeholder="unique_username"
                                                value={formData.username}
                                                onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                                                className="w-full pl-8 pr-4 py-3 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                                            />
                                        </div>
                                    </div>
                                </div>

                                {message && (
                                    <div className={`p-4 rounded-xl text-xs font-bold flex items-center gap-2 ${message.type === 'success' ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' : 'bg-red-50 text-red-600 border border-red-100'}`}>
                                        <ShieldCheck size={14} />
                                        {message.text}
                                    </div>
                                )}

                                <div className="pt-4">
                                    <button type="submit" className="px-8 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold flex items-center gap-2 transition-all shadow-lg shadow-indigo-100 disabled:opacity-50" disabled={loading}>
                                        {loading ? <Loader2 className="animate-spin" size={18} /> : <><Save size={18} /> Sync Changes</>}
                                    </button>
                                </div>
                            </form>
                        </div>

                        {/* Stats Dashboard */}
                        <div className="bg-white/70 backdrop-blur-xl rounded-3xl p-5 md:p-8 border border-white shadow-xl shadow-slate-200/50">
                            <h3 className="text-sm font-black text-slate-400 uppercase tracking-widest mb-6">Your Statistics</h3>
                            <div className="space-y-4 md:space-y-6">
                                <StatItem icon={<Database size={20} />} label="Notebooks" value={userStats?.totalPlanners || 0} color="blue" />
                                <StatItem icon={<CheckSquare size={20} />} label="Active Tasks" value={userStats?.totalTasks || 0} color="emerald" />
                                <StatItem icon={<Plane size={20} />} label="Mapped Journeys" value={userStats?.totalTrips || 0} color="indigo" />
                                <StatItem icon={<FileText size={20} />} label="Total Pages" value={userStats?.totalPages || 0} color="purple" />
                                <StatItem icon={<ImageIcon size={20} />} label="Stock Assets" value={userStats?.totalAssets || 0} color="pink" />
                            </div>

                            <div className="mt-10 pt-8 border-t border-gray-50">
                                <p className="text-[10px] font-black text-gray-300 uppercase tracking-widest mb-4">Realtime Infrastructure</p>
                                <button
                                    className="w-full py-3 bg-gray-50 hover:bg-gray-100 text-gray-600 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2"
                                    onClick={() => fetchUserStats()}
                                >
                                    <RefreshCcw size={14} /> Refresh Cloud Stats
                                </button>
                                <button
                                    className="w-full mt-3 py-3 bg-red-50 hover:bg-red-100 text-red-600 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2"
                                    onClick={handleSignOut}
                                >
                                    <LogOut size={14} /> Sign Out of Workspace
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Connections Section */}
                    <div className="bg-white/70 backdrop-blur-xl rounded-3xl p-5 md:p-8 border border-white shadow-xl shadow-slate-200/50 mt-6 md:mt-8">
                        <div className="flex items-center gap-3 mb-6">
                            <div className="p-3 bg-gradient-to-br from-indigo-500 to-fuchsia-500 text-white rounded-2xl shadow-lg shadow-indigo-200">
                                <Users size={20} />
                            </div>
                            <div>
                                <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest">Workspace Connections</h3>
                                <p className="text-xs font-medium text-slate-500">Connect with family or co-workers to assign tasks and collaborate.</p>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            {/* Connect Form */}
                            <div>
                                <form onSubmit={handleConnect} className="space-y-3">
                                    <label className="text-xs font-bold text-gray-700 flex items-center gap-2"><UserPlus size={14} /> Add Connection</label>

                                    {/* Type selector */}
                                    <div className="flex gap-2">
                                        <button
                                            type="button"
                                            onClick={() => setConnectType('family')}
                                            className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl border-2 font-bold text-xs transition-all ${connectType === 'family'
                                                    ? 'border-fuchsia-400 bg-fuchsia-50 text-fuchsia-700'
                                                    : 'border-gray-200 bg-white text-gray-500 hover:border-fuchsia-200'
                                                }`}
                                        >
                                            <Home size={14} /> Family
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setConnectType('work')}
                                            className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl border-2 font-bold text-xs transition-all ${connectType === 'work'
                                                    ? 'border-indigo-400 bg-indigo-50 text-indigo-700'
                                                    : 'border-gray-200 bg-white text-gray-500 hover:border-indigo-200'
                                                }`}
                                        >
                                            <Briefcase size={14} /> Work
                                        </button>
                                    </div>

                                    <div className="flex gap-2">
                                        <input
                                            type="email"
                                            placeholder="colleague@example.com"
                                            value={connectEmail}
                                            onChange={(e) => setConnectEmail(e.target.value)}
                                            className="flex-1 px-4 py-3 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all text-sm"
                                            required
                                        />
                                        <button
                                            type="submit"
                                            disabled={connectLoading || !connectEmail}
                                            className="px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold transition-all disabled:opacity-50 flex items-center gap-2 text-sm"
                                        >
                                            {connectLoading ? <Loader2 size={18} className="animate-spin" /> : <><LinkIcon size={16} /> Send</>}
                                        </button>
                                    </div>
                                </form>
                            </div>

                            {/* Connections List */}
                            <div className="space-y-6">
                                {/* Received Requests */}
                                {connections.filter(c => c.status === 'pending' && c.receiver_id === user?.id).length > 0 && (
                                    <div className="space-y-3">
                                        <h4 className="text-xs font-black text-fuchsia-500 uppercase tracking-widest border-b border-fuchsia-100 pb-2">Received Requests</h4>
                                        {connections.filter(c => c.status === 'pending' && c.receiver_id === user?.id).map(conn => (
                                            <div key={conn.id} className="flex items-center justify-between p-4 bg-fuchsia-50/50 rounded-xl border border-fuchsia-100">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-10 h-10 rounded-full bg-fuchsia-100 text-fuchsia-600 flex items-center justify-center font-bold text-sm overflow-hidden border-2 border-white shadow-sm">
                                                        {conn.peer_avatar ? <img src={conn.peer_avatar} alt="peer" className="w-full h-full object-cover" /> : conn.peer_name?.charAt(0) || conn.peer_email?.charAt(0)}
                                                    </div>
                                                    <div>
                                                        <div className="flex items-center gap-2">
                                                            <div className="text-sm font-bold text-slate-900">{conn.peer_name || 'Anonymous User'}</div>
                                                            <TypeBadge type={conn.connection_type} />
                                                        </div>
                                                        <div className="text-[10px] font-medium text-slate-500">{conn.peer_email}</div>
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <button onClick={() => acceptConnection(conn.id)} className="p-2 bg-emerald-50 text-emerald-600 hover:bg-emerald-100 rounded-lg transition-colors flex items-center gap-1 text-[10px] font-black uppercase tracking-wider">
                                                        <Check size={14} /> Accept
                                                    </button>
                                                    <button onClick={() => removeConnection(conn.id)} className="p-2 bg-red-50 text-red-600 hover:bg-red-100 rounded-lg transition-colors" title="Reject">
                                                        <X size={14} />
                                                    </button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}

                                {/* Sent Requests */}
                                {connections.filter(c => c.status === 'pending' && c.requester_id === user?.id).length > 0 && (
                                    <div className="space-y-3">
                                        <h4 className="text-xs font-black text-amber-500 uppercase tracking-widest border-b border-amber-100 pb-2">Sent Requests</h4>
                                        {connections.filter(c => c.status === 'pending' && c.requester_id === user?.id).map(conn => (
                                            <div key={conn.id} className="flex items-center justify-between p-4 bg-amber-50/30 rounded-xl border border-amber-100">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-10 h-10 rounded-full bg-amber-100 text-amber-600 flex items-center justify-center font-bold text-sm overflow-hidden border-2 border-white shadow-sm">
                                                        {conn.peer_avatar ? <img src={conn.peer_avatar} alt="peer" className="w-full h-full object-cover" /> : conn.peer_name?.charAt(0) || conn.peer_email?.charAt(0)}
                                                    </div>
                                                    <div>
                                                        <div className="flex items-center gap-2">
                                                            <div className="text-sm font-bold text-slate-900">{conn.peer_name || 'Anonymous User'}</div>
                                                            <TypeBadge type={conn.connection_type} />
                                                        </div>
                                                        <div className="text-[10px] font-medium text-slate-500">{conn.peer_email}</div>
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <span className="text-[10px] font-black text-amber-500 uppercase tracking-widest bg-white px-2 py-1 rounded-md shadow-sm border border-amber-100">Pending</span>
                                                    <button onClick={() => removeConnection(conn.id)} className="p-2 bg-red-50 text-red-600 hover:bg-red-100 rounded-lg transition-colors" title="Cancel Request">
                                                        <X size={14} />
                                                    </button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}

                                {/* Active Connections */}
                                <div className="space-y-3">
                                    <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest border-b border-slate-100 pb-2">Active Connections</h4>
                                    {connections.filter(c => c.status === 'accepted').length === 0 ? (
                                        <div className="text-sm text-slate-400 font-medium bg-slate-50/50 p-4 rounded-xl text-center border border-slate-100 border-dashed">No active connections. Add someone to start collaborating!</div>
                                    ) : (
                                        connections.filter(c => c.status === 'accepted').map(conn => (
                                            <div key={conn.id} className="p-4 bg-white rounded-xl border border-slate-100 shadow-sm space-y-3">
                                                <div className="flex items-center justify-between">
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-10 h-10 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center font-bold text-sm overflow-hidden border-2 border-white shadow-sm">
                                                            {conn.peer_avatar ? <img src={conn.peer_avatar} alt="peer" className="w-full h-full object-cover" /> : conn.peer_name?.charAt(0) || conn.peer_email?.charAt(0)}
                                                        </div>
                                                        <div>
                                                            <div className="flex items-center gap-2">
                                                                <div className="text-sm font-bold text-slate-900">{conn.peer_name || 'Anonymous User'}</div>
                                                                <TypeBadge type={conn.connection_type} />
                                                            </div>
                                                            <div className="text-[10px] font-medium text-slate-500">{conn.peer_email}</div>
                                                        </div>
                                                    </div>
                                                    <div className="flex items-center gap-2">
                                                        <button
                                                            onClick={() => setEditingTypeId(editingTypeId === conn.id ? null : conn.id)}
                                                            className={`p-2 rounded-lg transition-colors text-xs flex items-center gap-1 font-bold ${editingTypeId === conn.id
                                                                    ? 'bg-indigo-100 text-indigo-600'
                                                                    : 'bg-slate-50 text-slate-500 hover:bg-slate-100'
                                                                }`}
                                                            title="Change type"
                                                        >
                                                            <Pencil size={12} />
                                                        </button>
                                                        <button onClick={() => removeConnection(conn.id)} className="p-2 bg-red-50 text-red-600 hover:bg-red-100 rounded-lg transition-colors" title="Remove Connection">
                                                            <X size={14} />
                                                        </button>
                                                    </div>
                                                </div>

                                                {/* Inline type editor */}
                                                {editingTypeId === conn.id && (
                                                    <div className="flex gap-2 pt-1 animate-in slide-in-from-top-2 duration-200">
                                                        <button
                                                            type="button"
                                                            onClick={async () => { await updateConnectionType(conn.id, 'family'); setEditingTypeId(null); }}
                                                            className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl border-2 font-bold text-xs transition-all ${conn.connection_type === 'family'
                                                                    ? 'border-fuchsia-400 bg-fuchsia-50 text-fuchsia-700'
                                                                    : 'border-gray-200 bg-white text-gray-500 hover:border-fuchsia-200'
                                                                }`}
                                                        >
                                                            <Home size={12} /> Family
                                                        </button>
                                                        <button
                                                            type="button"
                                                            onClick={async () => { await updateConnectionType(conn.id, 'work'); setEditingTypeId(null); }}
                                                            className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl border-2 font-bold text-xs transition-all ${conn.connection_type === 'work'
                                                                    ? 'border-indigo-400 bg-indigo-50 text-indigo-700'
                                                                    : 'border-gray-200 bg-white text-gray-500 hover:border-indigo-200'
                                                                }`}
                                                        >
                                                            <Briefcase size={12} /> Work
                                                        </button>
                                                    </div>
                                                )}
                                            </div>
                                        ))
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
};

const TypeBadge: React.FC<{ type: 'family' | 'work' }> = ({ type }) => (
    <span className={`inline-flex items-center gap-1 text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md ${type === 'family'
            ? 'bg-fuchsia-100 text-fuchsia-600'
            : 'bg-indigo-100 text-indigo-600'
        }`}>
        {type === 'family' ? <Home size={9} /> : <Briefcase size={9} />}
        {type}
    </span>
);

const StatItem: React.FC<{ icon: React.ReactNode; label: string; value: number; color: string }> = ({ icon, label, value, color }) => {
    const colors: Record<string, string> = {
        blue: 'bg-blue-50 text-blue-600',
        emerald: 'bg-emerald-50 text-emerald-600',
        indigo: 'bg-indigo-50 text-indigo-600',
        purple: 'bg-purple-50 text-purple-600',
        pink: 'bg-pink-50 text-pink-600'
    };

    return (
        <div className="flex items-center gap-4">
            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${colors[color] || 'bg-gray-50 text-gray-600'}`}>
                {icon}
            </div>
            <div>
                <div className="text-2xl font-black text-gray-900 leading-tight">{value}</div>
                <div className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{label}</div>
            </div>
        </div>
    );
};

export default SettingsPage;
