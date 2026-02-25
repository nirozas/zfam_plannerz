import React, { useState, useEffect } from 'react';
import { Bug, CheckCircle2, Clock, Trash2, Loader2, AlertCircle } from 'lucide-react';
import { supabase } from '../../supabase/client';

interface BugReport {
    id: string;
    user_id: string;
    description: string;
    status: 'pending' | 'in_progress' | 'fixed';
    created_at: string;
    profiles: {
        full_name: string;
        email: string;
    } | null;
}

const AdminBugReports: React.FC = () => {
    const [reports, setReports] = useState<BugReport[]>([]);
    const [loading, setLoading] = useState(true);
    const [updatingId, setUpdatingId] = useState<string | null>(null);

    const fetchReports = async () => {
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('bug_reports')
                .select('*, profiles:user_id(full_name)')
                .order('created_at', { ascending: false });

            if (error) throw error;
            setReports(data || []);
        } catch (err) {
            console.error('Error fetching bug reports:', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchReports();
    }, []);

    const updateStatus = async (id: string, status: BugReport['status']) => {
        setUpdatingId(id);
        try {
            const { error } = await supabase
                .from('bug_reports')
                .update({ status, updated_at: new Date().toISOString() })
                .eq('id', id);

            if (error) throw error;
            setReports(reports.map(r => r.id === id ? { ...r, status } : r));
        } catch (err) {
            console.error('Error updating bug report:', err);
        } finally {
            setUpdatingId(null);
        }
    };

    const deleteReport = async (id: string) => {
        if (!confirm('Are you sure you want to delete this report?')) return;

        try {
            const { error } = await supabase
                .from('bug_reports')
                .delete()
                .eq('id', id);

            if (error) throw error;
            setReports(reports.filter(r => r.id !== id));
        } catch (err) {
            console.error('Error deleting bug report:', err);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center p-12">
                <Loader2 size={32} className="animate-spin text-indigo-500" />
            </div>
        );
    }

    if (reports.length === 0) {
        return (
            <div className="text-center py-12 bg-slate-50/50 rounded-3xl border border-slate-100 border-dashed">
                <Bug size={48} className="mx-auto text-slate-200 mb-4" />
                <h4 className="text-slate-400 font-bold uppercase tracking-widest text-sm">No bug reports yet</h4>
                <p className="text-slate-400 text-xs mt-1">Everything seems to be running smoothly!</p>
            </div>
        );
    }

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between mb-4">
                <h4 className="text-sm font-black text-slate-900 uppercase tracking-widest flex items-center gap-2">
                    <Bug size={18} className="text-rose-500" />
                    Submitted Reports ({reports.length})
                </h4>
                <button
                    onClick={fetchReports}
                    className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
                    title="Refresh"
                >
                    <Clock size={16} className="text-slate-400" />
                </button>
            </div>

            <div className="grid gap-4">
                {reports.map((report) => (
                    <div
                        key={report.id}
                        className={`bg-white rounded-2xl border p-4 shadow-sm transition-all ${report.status === 'fixed' ? 'opacity-60 grayscale' : 'border-slate-100'
                            }`}
                    >
                        <div className="flex items-start justify-between gap-4">
                            <div className="flex-1">
                                <div className="flex items-center gap-2 mb-2">
                                    <span className={`text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full ${report.status === 'fixed' ? 'bg-emerald-100 text-emerald-600' :
                                            report.status === 'in_progress' ? 'bg-amber-100 text-amber-600' :
                                                'bg-blue-100 text-blue-600'
                                        }`}>
                                        {report.status.replace('_', ' ')}
                                    </span>
                                    <span className="text-[10px] font-medium text-slate-400">
                                        {new Date(report.created_at).toLocaleString()}
                                    </span>
                                    <span className="text-[10px] font-bold text-slate-900 ml-auto">
                                        By: {report.profiles?.full_name || 'Unknown'}
                                    </span>
                                </div>
                                <p className="text-sm text-slate-700 font-medium whitespace-pre-wrap leading-relaxed">
                                    {report.description}
                                </p>
                            </div>

                            <div className="flex items-center gap-1">
                                {report.status !== 'fixed' ? (
                                    <button
                                        onClick={() => updateStatus(report.id, 'fixed')}
                                        disabled={updatingId === report.id}
                                        className="p-2 text-emerald-500 hover:bg-emerald-50 rounded-xl transition-colors"
                                        title="Mark as Fixed"
                                    >
                                        <CheckCircle2 size={18} />
                                    </button>
                                ) : (
                                    <button
                                        onClick={() => updateStatus(report.id, 'pending')}
                                        disabled={updatingId === report.id}
                                        className="p-2 text-slate-400 hover:bg-slate-50 rounded-xl transition-colors"
                                        title="Reopen"
                                    >
                                        <AlertCircle size={18} />
                                    </button>
                                )}
                                <button
                                    onClick={() => deleteReport(report.id)}
                                    className="p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-xl transition-colors"
                                    title="Delete Report"
                                >
                                    <Trash2 size={18} />
                                </button>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default AdminBugReports;
