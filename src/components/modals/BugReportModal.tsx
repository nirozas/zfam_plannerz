import React, { useState } from 'react';
import { Bug, Send, X, Loader2, CheckCircle2 } from 'lucide-react';
import { supabase } from '../../supabase/client';
import { usePlannerStore } from '../../store/plannerStore';
import { sendEmail } from '../../utils/mailer';



const BugReportModal: React.FC = () => {
    const { user, userProfile, isBugModalOpen, setBugModalOpen } = usePlannerStore();
    const [description, setDescription] = useState('');
    const [loading, setLoading] = useState(false);
    const [submitted, setSubmitted] = useState(false);
    const [error, setError] = useState<string | null>(null);

    if (!isBugModalOpen) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!description.trim() || !user) return;

        setLoading(true);
        setError(null);

        try {
            const { error: submitError } = await supabase
                .from('bug_reports')
                .insert({
                    user_id: user.id,
                    description: description.trim(),
                    status: 'pending'
                });

            if (submitError) {
                console.error('Supabase Bug Report Error:', submitError);
                throw submitError;
            }

            // Optional: Send email notification to admin
            const displayName = userProfile?.full_name || user.email;
            sendEmail({
                to: 'asnir@zoabi.com', // Replace with your admin email
                subject: `NEW BUG REPORT from ${displayName}`,
                html: `
                    <div style="font-family: sans-serif;">
                        <h2 style="color: #e11d48;">New Bug Reported</h2>
                        <p><strong>From:</strong> ${displayName} (${user.email})</p>
                        <p><strong>Description:</strong></p>
                        <div style="background: #f1f5f9; padding: 15px; border-radius: 8px;">
                            ${description.trim()}
                        </div>
                    </div>
                `
            }).catch(err => console.error('Silent bug email error:', err));

            setSubmitted(true);
            setDescription('');
            setTimeout(() => {
                setSubmitted(false);
                setBugModalOpen(false);
            }, 2000);
        } catch (err: any) {
            console.error('Error reporting bug:', err);
            setError(err.message || 'Failed to submit bug report. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[10000] flex items-start sm:items-center justify-center p-4 overflow-y-auto bg-slate-900/40 backdrop-blur-sm pt-12 sm:pt-4">
            <div
                className="fixed inset-0 transition-opacity"
                onClick={() => setBugModalOpen(false)}
            />

            <div className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl border border-slate-100 overflow-hidden animate-in zoom-in-95 duration-200 max-h-[calc(100dvh-2rem)] flex flex-col">
                {/* Header */}
                <div className="bg-gradient-to-br from-red-500 to-rose-600 px-6 py-4 sm:py-6 text-white relative">
                    <button
                        onClick={() => setBugModalOpen(false)}
                        className="absolute top-4 right-4 p-1 hover:bg-white/20 rounded-lg transition-colors"
                    >
                        <X size={20} />
                    </button>

                    <div className="flex items-center gap-3 mb-2">
                        <div className="p-2 bg-white/20 rounded-xl backdrop-blur-md">
                            <Bug size={24} />
                        </div>
                        <h2 className="text-xl font-black uppercase tracking-tight">Report a Bug</h2>
                    </div>
                    <p className="text-rose-100 text-sm font-medium">Something not working? Let us know and we'll squash it.</p>
                </div>

                <div className="p-6 overflow-y-auto">
                    {submitted ? (
                        <div className="flex flex-col items-center justify-center py-8 text-center animate-in fade-in zoom-in-95 duration-300">
                            <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mb-4">
                                <CheckCircle2 size={32} />
                            </div>
                            <h3 className="text-lg font-bold text-slate-900">Report Received!</h3>
                            <p className="text-slate-500 text-sm mt-1">Our team has been notified. Thank you for your feedback!</p>
                        </div>
                    ) : (
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div className="space-y-2">
                                <label className="text-xs font-black text-slate-400 uppercase tracking-widest">Description</label>
                                <textarea
                                    autoFocus
                                    required
                                    value={description}
                                    onChange={(e) => setDescription(e.target.value)}
                                    placeholder="What happened? Steps to reproduce would be great..."
                                    className="w-full h-32 px-4 py-3 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-2 focus:ring-rose-500 outline-none transition-all resize-none text-sm text-slate-700"
                                />
                            </div>

                            {error && (
                                <div className="p-3 bg-red-50 border border-red-100 text-red-600 rounded-xl text-xs font-bold leading-tight flex items-center gap-2">
                                    <X size={14} className="flex-shrink-0" />
                                    {error}
                                </div>
                            )}

                            <button
                                type="submit"
                                disabled={loading || !description.trim()}
                                className="w-full py-3.5 bg-slate-900 hover:bg-slate-800 text-white rounded-2xl font-black text-sm uppercase tracking-widest flex items-center justify-center gap-2 transition-all shadow-lg shadow-slate-200 disabled:opacity-50 disabled:cursor-not-allowed group"
                            >
                                {loading ? (
                                    <Loader2 className="animate-spin" size={18} />
                                ) : (
                                    <>
                                        <Send size={18} className="group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />
                                        Submit Report
                                    </>
                                )}
                            </button>
                        </form>
                    )}
                </div>
            </div>
        </div>
    );
};

export default BugReportModal;
