import React, { useState } from 'react';
import { X, Info, Share2, Mail, Copy, Check, Shield, Clock, Database, User } from 'lucide-react';
import { Card } from '../../types/cards';

interface MetadataModalProps {
    card: Card;
    onClose: () => void;
}

export const MetadataModal: React.FC<MetadataModalProps> = ({ card, onClose }) => {
    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="relative w-full max-w-sm bg-white rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
                <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/50">
                    <div className="flex items-center gap-2 text-slate-800">
                        <Info size={18} className="text-indigo-500" />
                        <h3 className="font-bold">Entry Metadata</h3>
                    </div>
                    <button onClick={onClose} className="p-1 hover:bg-slate-200 rounded-lg transition-colors text-slate-400">
                        <X size={20} />
                    </button>
                </div>

                <div className="p-6 space-y-4">
                    <div className="space-y-3">
                        <MetaRow icon={Database} label="System ID" value={card.id} isCode />
                        <MetaRow icon={Shield} label="Type" value={card.type.toUpperCase()} />
                        <MetaRow icon={Clock} label="Created" value={new Date(card.createdAt).toLocaleString()} />
                        <MetaRow icon={Clock} label="Last Viewed" value={new Date(card.lastViewedAt).toLocaleString()} />
                        <MetaRow icon={User} label="Parent ID" value={card.parentId || 'Root'} isCode />
                    </div>

                    <div className="pt-4 border-t border-slate-100">
                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest text-center">
                            Zoabi Nexus Vault Security Module
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
};

const MetaRow = ({ icon: Icon, label, value, isCode }: { icon: any, label: string, value: string, isCode?: boolean }) => (
    <div className="flex flex-col gap-1">
        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
            <Icon size={12} />
            {label}
        </label>
        <p className={`text-sm font-medium text-slate-700 truncate ${isCode ? 'font-mono bg-slate-50 px-2 py-1 rounded border border-slate-100 text-[11px]' : ''}`}>
            {value}
        </p>
    </div>
);

interface ShareModalProps {
    card: Card;
    onClose: () => void;
    onShare: (email: string) => void;
}

export const ShareModal: React.FC<ShareModalProps> = ({ card, onClose, onShare }) => {
    const [email, setEmail] = useState('');
    const [copied, setCopied] = useState(false);

    const handleCopy = () => {
        navigator.clipboard.writeText(window.location.href);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
                <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-indigo-50/30">
                    <div className="flex items-center gap-2 text-indigo-900">
                        <Share2 size={18} />
                        <h3 className="font-bold">Share Entry</h3>
                    </div>
                    <button onClick={onClose} className="p-1 hover:bg-white rounded-lg transition-colors text-slate-400">
                        <X size={20} />
                    </button>
                </div>

                <div className="p-8 space-y-6">
                    <div className="space-y-3">
                        <label className="text-sm font-bold text-slate-700">Invite by Email</label>
                        <div className="flex gap-2">
                            <div className="relative flex-1">
                                <Mail size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                                <input
                                    type="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    placeholder="Enter collaborator email..."
                                    className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none text-sm"
                                />
                            </div>
                            <button
                                onClick={() => { onShare(email); setEmail(''); }}
                                className="bg-indigo-600 text-white px-5 py-2.5 rounded-xl font-bold text-sm hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-100"
                            >
                                Invite
                            </button>
                        </div>
                    </div>

                    <div className="relative py-4">
                        <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-slate-100"></div></div>
                        <div className="relative flex justify-center text-[10px] uppercase font-bold text-slate-400 bg-white px-2">OR COPY LINK</div>
                    </div>

                    <div className="space-y-3">
                        <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-200 group">
                            <span className="text-xs text-slate-500 font-medium truncate flex-1">
                                {window.location.href}
                            </span>
                            <button
                                onClick={handleCopy}
                                className="ml-3 p-2 bg-white border border-slate-200 rounded-lg text-slate-500 hover:text-indigo-600 hover:border-indigo-200 transition-all shadow-sm"
                            >
                                {copied ? <Check size={16} className="text-emerald-500" /> : <Copy size={16} />}
                            </button>
                        </div>
                    </div>

                    {card.sharedWith.length > 0 && (
                        <div className="space-y-3">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Currently Shared With ({card.sharedWith.length})</label>
                            <div className="flex flex-wrap gap-2">
                                {card.sharedWith.map((uid) => (
                                    <div key={uid} className="px-3 py-1.5 bg-indigo-50 text-indigo-700 rounded-full text-[10px] font-bold border border-indigo-100">
                                        USER:{uid.slice(0, 8)}
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
