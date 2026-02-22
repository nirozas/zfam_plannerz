import React, { useState, useEffect } from 'react';
import {
    X, Search, UserPlus, Shield, User,
    Trash2, AlertCircle, Loader2
} from 'lucide-react';
import { useTripStore } from '../../store/tripStore';
import { supabase } from '../../supabase/client';

interface ShareTripModalProps {
    tripId: string;
    onClose: () => void;
}

const ShareTripModal: React.FC<ShareTripModalProps> = ({ tripId, onClose }) => {
    const {
        collaborators, fetchCollaborators, addCollaborator,
        removeCollaborator, searchUsers
    } = useTripStore();

    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState<any[]>([]);
    const [isSearching, setIsSearching] = useState(false);
    const [isAdding, setIsAdding] = useState<string | null>(null);
    const [selectedRole, setSelectedRole] = useState<'viewer' | 'editor'>('viewer');

    useEffect(() => {
        fetchCollaborators(tripId);
    }, [tripId, fetchCollaborators]);

    useEffect(() => {
        const timer = setTimeout(async () => {
            if (searchQuery.length >= 2) {
                setIsSearching(true);
                const { data: { user: currentUser } } = await supabase.auth.getUser();
                const results = await searchUsers(searchQuery);
                // Filter out already added users AND the current user
                const filtered = results.filter(u =>
                    u.id !== currentUser?.id && !collaborators.some(c => c.user_id === u.id)
                );
                setSearchResults(filtered);
                setIsSearching(false);
            } else {
                setSearchResults([]);
            }
        }, 300);

        return () => clearTimeout(timer);
    }, [searchQuery, searchUsers, collaborators]);

    const handleAdd = async (userId: string) => {
        setIsAdding(userId);
        try {
            await addCollaborator(tripId, userId, selectedRole);
            setSearchQuery('');
            setSearchResults([]);
            // Show a temporary success indicator if needed, but the list updating is usually enough
        } catch (error: any) {
            console.error('Failed to add collaborator:', error);
            alert(`Error adding collaborator: ${error.message || 'Unknown error'}`);
        } finally {
            setIsAdding(null);
        }
    };

    const handleRemove = async (collaboratorId: string) => {
        if (window.confirm('Remove this collaborator?')) {
            try {
                await removeCollaborator(collaboratorId);
            } catch (error: any) {
                console.error('Failed to remove collaborator:', error);
                alert(`Error removing collaborator: ${error.message || 'Unknown error'}`);
            }
        }
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300" onClick={onClose} />

            <div className="relative w-full max-w-md bg-white rounded-[2.5rem] shadow-2xl shadow-indigo-500/10 overflow-hidden animate-in zoom-in-95 duration-300">
                {/* Header */}
                <div className="p-8 border-b border-gray-50 bg-gradient-to-br from-indigo-50/50 to-white">
                    <div className="flex justify-between items-center">
                        <div>
                            <h3 className="text-xl font-black text-slate-900 leading-none">Share Trip</h3>
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-2">Collaborative Adventures</p>
                        </div>
                        <button
                            onClick={onClose}
                            className="p-2 hover:bg-gray-100 rounded-xl transition-colors text-slate-400 hover:text-slate-600"
                        >
                            <X size={20} />
                        </button>
                    </div>
                </div>

                <div className="p-8 space-y-6 max-h-[60vh] overflow-y-auto no-scrollbar">
                    {/* Search Input */}
                    <div className="space-y-3">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Find Explorer</label>
                        <div className="relative group">
                            <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-500 transition-colors">
                                {isSearching ? <Loader2 size={16} className="animate-spin" /> : <Search size={16} />}
                            </div>
                            <input
                                type="text"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                placeholder="Username or email..."
                                className="w-full bg-slate-50 border-2 border-transparent focus:border-indigo-500/20 focus:bg-white rounded-[1.5rem] py-4 pl-12 pr-4 text-sm font-bold text-slate-700 outline-none transition-all placeholder:text-slate-300"
                            />
                        </div>

                        {/* Search Results */}
                        {searchResults.length > 0 && (
                            <div className="mt-2 bg-white border border-gray-100 shadow-xl rounded-[1.5rem] overflow-hidden divide-y divide-gray-50 max-h-48 overflow-y-auto no-scrollbar">
                                {searchResults.map(user => (
                                    <div key={user.id} className="flex items-center justify-between p-3 hover:bg-indigo-50/30 transition-colors animate-in slide-in-from-top-2 duration-300">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-indigo-500 to-teal-500 flex items-center justify-center text-white ring-4 ring-white shadow-sm overflow-hidden">
                                                {user.avatar_url ? (
                                                    <img src={user.avatar_url} alt="" className="w-full h-full object-cover" />
                                                ) : (
                                                    <User size={20} />
                                                )}
                                            </div>
                                            <div className="min-w-0">
                                                <div className="text-sm font-black text-slate-900 truncate">{user.username}</div>
                                                <div className="text-[10px] font-bold text-slate-400 truncate">{user.full_name}</div>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <div className="relative">
                                                <select
                                                    className="appearance-none text-[10px] font-black bg-slate-100 border-none rounded-lg focus:ring-2 focus:ring-indigo-500/20 py-1.5 pl-2 pr-6 cursor-pointer"
                                                    value={selectedRole}
                                                    onChange={(e) => setSelectedRole(e.target.value as any)}
                                                >
                                                    <option value="viewer">Viewer</option>
                                                    <option value="editor">Editor</option>
                                                </select>
                                                <Shield size={10} className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                                            </div>
                                            <button
                                                onClick={() => handleAdd(user.id)}
                                                disabled={isAdding === user.id}
                                                className="p-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-all disabled:opacity-50 active:scale-90"
                                                title="Add Collaborator"
                                            >
                                                {isAdding === user.id ? <Loader2 size={14} className="animate-spin" /> : <UserPlus size={14} />}
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Collaborators List */}
                    <div className="space-y-4">
                        <div className="flex items-center justify-between px-1">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Shared With</label>
                            <span className="text-[10px] font-black text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full">{collaborators.length} People</span>
                        </div>

                        <div className="space-y-2">
                            {collaborators.length === 0 ? (
                                <div className="py-10 text-center bg-slate-50 rounded-[2rem] border-2 border-dashed border-slate-100">
                                    <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center mx-auto mb-3 shadow-sm">
                                        <Shield size={20} className="text-slate-200" />
                                    </div>
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Private Adventure</p>
                                </div>
                            ) : (
                                collaborators.map(collab => (
                                    <div key={collab.id} className="flex items-center justify-between p-4 bg-white border border-gray-100 rounded-[1.5rem] shadow-sm hover:shadow-md transition-all group">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center text-slate-400 overflow-hidden ring-2 ring-white shadow-sm transition-transform group-hover:scale-105">
                                                {collab.profile?.avatar_url ? (
                                                    <img src={collab.profile.avatar_url} alt="" className="w-full h-full object-cover" />
                                                ) : (
                                                    <User size={18} />
                                                )}
                                            </div>
                                            <div>
                                                <div className="text-sm font-black text-slate-900">{collab.profile?.username || 'Unknown User'}</div>
                                                <div className="flex items-center gap-1.5 mt-0.5">
                                                    <Shield size={10} className={collab.role === 'editor' ? 'text-teal-500' : 'text-indigo-500'} />
                                                    <span className="text-[9px] font-black uppercase tracking-wider text-slate-400">{collab.role}</span>
                                                </div>
                                            </div>
                                        </div>
                                        <button
                                            onClick={() => handleRemove(collab.id)}
                                            className="p-2 text-rose-100 hover:text-rose-500 hover:bg-rose-50 rounded-xl transition-all opacity-0 group-hover:opacity-100"
                                        >
                                            <Trash2 size={14} />
                                        </button>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                </div>

                {/* Footer with Save/Close Button */}
                <div className="p-8 bg-slate-50 border-t border-gray-100">
                    <button
                        onClick={onClose}
                        className="w-full py-4 bg-slate-900 text-white rounded-[1.5rem] text-sm font-black uppercase tracking-widest hover:bg-slate-800 transition-all shadow-xl shadow-slate-200 active:scale-[0.98]"
                    >
                        Save & Close
                    </button>
                    <p className="text-[9px] font-bold text-slate-400 flex items-center justify-center gap-2 mt-4">
                        <AlertCircle size={10} />
                        Editors can add stops, expenses and pack items.
                    </p>
                </div>
            </div>
        </div>
    );
};

export default ShareTripModal;
