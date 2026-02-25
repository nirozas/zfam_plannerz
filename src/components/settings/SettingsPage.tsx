import React, { useState, useEffect } from 'react';
import { Save, User, Loader2, Camera, ShieldCheck, Mail, Database, FileText, Image as ImageIcon, RefreshCcw, CheckSquare, Plane, LogOut, Users, Link as LinkIcon, Check, X, Home, Briefcase, Cloud } from 'lucide-react';

import { usePlannerStore } from '../../store/plannerStore';
import { supabase } from '../../supabase/client';
import './SettingsPage.css';
import PageHero from '../ui/PageHero';
import { GoogleDriveStatus } from '../cloud/GoogleDriveStatus';
import { StorageMigrationTool } from '../cloud/StorageMigrationTool';
import AdminBugReports from './AdminBugReports';

const SettingsPage: React.FC = () => {
    const { user, userProfile, userStats, updateProfile, uploadAvatar, fetchUserStats, fetchUserProfile, connections, fetchConnections, requestConnection, acceptConnection, removeConnection } = usePlannerStore();

    const [loading, setLoading] = useState(false);
    const [connectLoading, setConnectLoading] = useState(false);
    const [connectEmail, setConnectEmail] = useState('');
    const [connectType, setConnectType] = useState<'family' | 'work'>('work');
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

            <main className="flex-1 overflow-y-auto p-4 md:p-8 md:px-12 lg:px-20 z-10 relative">
                <div className="w-full max-w-[1920px] mx-auto">
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12">
                        {/* LEFT COLUMN: Main Profile, Connections, Vault */}
                        <div className="lg:col-span-6 space-y-8">
                            {/* Profile Card */}
                            <div className="bg-white/70 backdrop-blur-xl rounded-3xl p-5 md:p-8 border border-white shadow-xl shadow-slate-200/50 flex flex-col sm:flex-row items-center justify-between gap-4 transition-all">
                                <div className="flex flex-col sm:flex-row items-center gap-4 md:gap-6 text-center sm:text-left">
                                    <div className="relative group">
                                        <div className="w-20 h-20 md:w-24 md:h-24 rounded-full overflow-hidden border-4 border-indigo-50 shadow-inner">
                                            {userProfile?.avatar_url ? (
                                                <img src={userProfile.avatar_url} alt="Avatar" className="w-full h-full object-cover" />
                                            ) : (
                                                <div className="w-full h-full bg-gradient-to-tr from-indigo-600 to-fuchsia-500 flex items-center justify-center text-3xl font-black text-white shadow-inner">
                                                    {formData.full_name?.charAt(0) || user?.email?.charAt(0) || '?'}
                                                </div>
                                            )}
                                        </div>
                                        <button
                                            className="absolute bottom-0 right-0 p-2 bg-indigo-600 text-white rounded-full shadow-lg border-2 border-white hover:bg-indigo-700 transition-all font-bold"
                                            onClick={() => fileInputRef.current?.click()}
                                            disabled={uploadingAvatar}
                                        >
                                            {uploadingAvatar ? <Loader2 size={12} className="animate-spin" /> : <Camera size={12} />}
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
                                        <h2 className="text-xl md:text-2xl font-black text-gray-900 leading-tight">{formData.full_name || 'Your Name'}</h2>
                                        <p className="text-gray-500 font-medium flex flex-wrap justify-center sm:justify-start items-center gap-2 mt-1">
                                            {userProfile?.role === 'admin' ?
                                                <span className="flex items-center gap-1 text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-lg text-[10px] font-black uppercase tracking-wider"><ShieldCheck size={10} /> Administrator</span> :
                                                <span className="text-xs">Premium User</span>}
                                            <span className="text-gray-300">•</span>
                                            <span className="text-xs truncate max-w-[150px]">{user?.email}</span>
                                        </p>
                                    </div>
                                </div>
                            </div>

                            {/* Main Form */}
                            <div className="bg-white/70 backdrop-blur-xl rounded-3xl p-5 md:p-8 border border-white shadow-xl shadow-slate-200/50">
                                <h3 className="text-xs font-black text-slate-400 uppercase tracking-[0.2em] mb-6">Personal Information</h3>
                                <form onSubmit={handleUpdateProfile} className="space-y-6">
                                    <div className="space-y-2">
                                        <label className="text-xs font-bold text-gray-700 flex items-center gap-2"><Mail size={14} /> Email Address</label>
                                        <input type="text" value={user?.email || ''} disabled className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl text-gray-400 cursor-not-allowed text-sm" />
                                        <p className="text-[10px] text-gray-400 font-medium">Email is managed via authentication.</p>
                                    </div>

                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 md:gap-6">
                                        <div className="space-y-2">
                                            <label className="text-xs font-bold text-gray-700 flex items-center gap-2"><User size={14} /> Display Name</label>
                                            <input
                                                type="text"
                                                placeholder="Enter your full name"
                                                value={formData.full_name}
                                                onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                                                className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all text-sm font-medium"
                                            />
                                        </div>

                                        <div className="space-y-2">
                                            <label className="text-xs font-bold text-gray-700">Username</label>
                                            <div className="relative">
                                                <span className="absolute left-4 top-1/2 -translate-y-1/2 font-bold text-gray-400 text-sm">@</span>
                                                <input
                                                    type="text"
                                                    placeholder="unique_username"
                                                    value={formData.username}
                                                    onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                                                    className="w-full pl-8 pr-4 py-3 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all text-sm font-medium"
                                                />
                                            </div>
                                        </div>
                                    </div>

                                    {message && (
                                        <div className={`p-4 rounded-xl text-xs font-bold flex items-center gap-2 animate-in fade-in slide-in-from-top-2 ${message.type === 'success' ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' : 'bg-red-50 text-red-600 border border-red-100'}`}>
                                            <ShieldCheck size={14} />
                                            {message.text}
                                        </div>
                                    )}

                                    <div className="pt-4">
                                        <button type="submit" className="w-full sm:w-auto px-8 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold flex items-center justify-center gap-2 transition-all shadow-lg shadow-indigo-100 disabled:opacity-50" disabled={loading}>
                                            {loading ? <Loader2 className="animate-spin" size={18} /> : <><Save size={18} /> Sync Changes</>}
                                        </button>
                                    </div>
                                </form>
                            </div>

                            {/* Connections Section */}
                            <div className="bg-white/70 backdrop-blur-xl rounded-3xl p-5 md:p-8 border border-white shadow-xl shadow-slate-200/50">
                                <div className="flex items-center gap-3 mb-6">
                                    <div className="p-2.5 bg-gradient-to-br from-indigo-500 to-fuchsia-500 text-white rounded-xl shadow-lg shadow-indigo-200">
                                        <Users size={18} />
                                    </div>
                                    <div>
                                        <h3 className="text-xs font-black text-slate-900 uppercase tracking-widest">Workspace Connections</h3>
                                    </div>
                                </div>

                                <div className="space-y-6">
                                    {/* Connect Form */}
                                    <form onSubmit={handleConnect} className="space-y-3">
                                        <div className="flex flex-col sm:flex-row gap-2">
                                            <button
                                                type="button"
                                                onClick={() => setConnectType('family')}
                                                className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl border-2 font-bold text-[10px] uppercase tracking-wider transition-all ${connectType === 'family'
                                                    ? 'border-fuchsia-400 bg-fuchsia-50 text-fuchsia-700'
                                                    : 'border-gray-200 bg-white text-gray-500 hover:border-fuchsia-200'
                                                    }`}
                                            >
                                                <Home size={12} /> Family
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => setConnectType('work')}
                                                className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl border-2 font-bold text-[10px] uppercase tracking-wider transition-all ${connectType === 'work'
                                                    ? 'border-indigo-400 bg-indigo-50 text-indigo-700'
                                                    : 'border-gray-200 bg-white text-gray-500 hover:border-indigo-200'
                                                    }`}
                                            >
                                                <Briefcase size={12} /> Work
                                            </button>
                                        </div>

                                        <div className="flex gap-2">
                                            <input
                                                type="email"
                                                placeholder="colleague@example.com"
                                                value={connectEmail}
                                                onChange={(e) => setConnectEmail(e.target.value)}
                                                className="flex-1 px-4 py-2.5 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all text-sm"
                                                required
                                            />
                                            <button
                                                type="submit"
                                                disabled={connectLoading || !connectEmail}
                                                className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold transition-all disabled:opacity-50 flex items-center gap-2 text-xs"
                                            >
                                                {connectLoading ? <Loader2 size={16} className="animate-spin" /> : <><LinkIcon size={14} /> Send</>}
                                            </button>
                                        </div>
                                    </form>

                                    {/* Connections List Area */}
                                    <div className="space-y-4">
                                        {/* Received */}
                                        {connections.filter(c => c.status === 'pending' && c.receiver_id === user?.id).length > 0 && (
                                            <div className="space-y-2">
                                                <h4 className="text-[10px] font-black text-fuchsia-500 uppercase tracking-[0.2em] border-b border-fuchsia-100 pb-1.5">Pending Incoming</h4>
                                                {connections.filter(c => c.status === 'pending' && c.receiver_id === user?.id).map(conn => (
                                                    <div key={conn.id} className="flex items-center justify-between p-3 bg-fuchsia-50/30 rounded-xl border border-fuchsia-100/50">
                                                        <div className="flex items-center gap-3">
                                                            <div className="w-8 h-8 rounded-full bg-fuchsia-100 text-fuchsia-600 flex items-center justify-center font-bold text-xs">
                                                                {conn.peer_avatar ? <img src={conn.peer_avatar} alt="peer" className="w-full h-full object-cover rounded-full" /> : (conn.peer_name || conn.peer_email)?.charAt(0)}
                                                            </div>
                                                            <div className="text-xs font-bold truncate max-w-[120px]">{conn.peer_name || conn.peer_email}</div>
                                                        </div>
                                                        <div className="flex gap-1.5">
                                                            <button onClick={() => acceptConnection(conn.id)} className="p-1.5 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 transition-colors"><Check size={14} /></button>
                                                            <button onClick={() => removeConnection(conn.id)} className="p-1.5 bg-white border border-gray-200 text-gray-400 rounded-lg hover:text-red-500 hover:border-red-100 transition-colors"><X size={14} /></button>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        )}

                                        {/* Active */}
                                        <div className="space-y-2">
                                            <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] border-b border-slate-100 pb-1.5">Active Connections</h4>
                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                                {connections.filter(c => c.status === 'accepted').map(conn => (
                                                    <div key={conn.id} className="p-3 bg-white border border-slate-100 rounded-2xl shadow-sm group relative">
                                                        <div className="flex items-center gap-3">
                                                            <div className="w-9 h-9 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold text-xs ring-2 ring-white">
                                                                {conn.peer_avatar ? <img src={conn.peer_avatar} alt="peer" className="w-full h-full object-cover rounded-full" /> : (conn.peer_name || conn.peer_email)?.charAt(0)}
                                                            </div>
                                                            <div className="min-w-0 flex-1">
                                                                <div className="text-xs font-bold text-slate-900 truncate">{conn.peer_name || 'User'}</div>
                                                                <TypeBadge type={conn.connection_type} />
                                                            </div>
                                                        </div>
                                                        <button
                                                            onClick={() => removeConnection(conn.id)}
                                                            className="absolute -top-1 -right-1 p-1.5 bg-red-50 text-red-500 rounded-full opacity-0 group-hover:opacity-100 transition-all hover:bg-red-500 hover:text-white border border-red-100 shadow-sm"
                                                        >
                                                            <X size={10} />
                                                        </button>
                                                    </div>
                                                ))}
                                                {connections.filter(c => c.status === 'accepted').length === 0 && (
                                                    <div className="col-span-full py-4 px-4 bg-slate-50/50 rounded-2xl border border-dotted border-slate-200 text-[10px] font-bold text-slate-400 text-center">No active team members</div>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Vault / Cloud Storage - Moved from right column */}
                            <div className="bg-white/70 backdrop-blur-xl rounded-3xl p-5 md:p-8 border border-white shadow-xl shadow-slate-200/50">
                                <div className="flex items-center justify-between mb-6">
                                    <div className="flex items-center gap-2">
                                        <div className="p-2 bg-blue-500/10 text-blue-600 rounded-lg">
                                            <Cloud size={16} />
                                        </div>
                                        <h3 className="text-xs font-black text-slate-900 uppercase tracking-widest">Vault Storage</h3>
                                    </div>
                                    <GoogleDriveStatus />
                                </div>
                                <StorageMigrationTool />
                            </div>
                        </div>

                        {/* RIGHT COLUMN: Stats, Admin */}
                        <div className="lg:col-span-6 space-y-8">
                            {/* Stats */}
                            <div className="bg-white/70 backdrop-blur-xl rounded-3xl p-5 md:p-8 border border-white shadow-xl shadow-slate-200/50">
                                <h3 className="text-xs font-black text-slate-400 uppercase tracking-[0.2em] mb-6">Workspace Insights</h3>
                                <div className="grid grid-cols-2 lg:grid-cols-1 gap-6">
                                    <StatItem icon={<Database size={18} />} label="Notebooks" value={userStats?.totalSize ? Math.round(userStats.totalSize / (1024 * 1024)) : 0} color="blue" unit="MB" />
                                    <StatItem icon={<CheckSquare size={18} />} label="Active Tasks" value={userStats?.totalTasks || 0} color="emerald" />
                                    <StatItem icon={<Plane size={18} />} label="Trips" value={userStats?.totalTrips || 0} color="indigo" />
                                    <StatItem icon={<ImageIcon size={18} />} label="Shared Assets" value={userStats?.totalAssets || 0} color="pink" />
                                </div>

                                <div className="mt-8 pt-6 border-t border-slate-100/50 space-y-2">
                                    <button
                                        className="w-full py-2.5 bg-slate-50 hover:bg-slate-100 text-slate-600 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all flex items-center justify-center gap-2"
                                        onClick={() => fetchUserStats()}
                                    >
                                        <RefreshCcw size={12} /> Sync Insights
                                    </button>
                                    <button
                                        className="w-full py-2.5 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all flex items-center justify-center gap-2"
                                        onClick={handleSignOut}
                                    >
                                        <LogOut size={12} /> Sign Out Workspace
                                    </button>
                                </div>
                            </div>


                            {/* Admin Reports */}
                            {userProfile?.role === 'admin' && (
                                <div className="bg-slate-900 text-white rounded-3xl p-5 md:p-8 border border-slate-800 shadow-2xl">
                                    <div className="flex items-center gap-2 mb-6">
                                        <div className="p-2 bg-indigo-500/20 text-indigo-400 rounded-lg">
                                            <ShieldCheck size={16} />
                                        </div>
                                        <h3 className="text-xs font-black uppercase tracking-widest">Admin Control</h3>
                                    </div>
                                    <AdminBugReports />
                                </div>
                            )}
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

const StatItem: React.FC<{ icon: React.ReactNode; label: string; value: number; color: string; unit?: string }> = ({ icon, label, value, color, unit }) => {
    const colors: Record<string, string> = {
        blue: 'bg-blue-50 text-blue-600',
        emerald: 'bg-emerald-50 text-emerald-600',
        indigo: 'bg-indigo-50 text-indigo-600',
        purple: 'bg-purple-50 text-purple-600',
        pink: 'bg-pink-50 text-pink-600'
    };

    return (
        <div className="flex items-center gap-4">
            <div className={`w-10 h-10 md:w-12 md:h-12 rounded-xl md:rounded-2xl flex items-center justify-center ${colors[color] || 'bg-gray-50 text-gray-600'}`}>
                {icon}
            </div>
            <div className="min-w-0">
                <div className="text-lg md:text-2xl font-black text-gray-900 leading-tight flex items-baseline gap-1">
                    {value}
                    {unit && <span className="text-[10px] text-gray-400 font-bold uppercase">{unit}</span>}
                </div>
                <div className="text-[9px] md:text-[10px] font-black text-gray-400 uppercase tracking-widest truncate">{label}</div>
            </div>
        </div>
    );
};

export default SettingsPage;
