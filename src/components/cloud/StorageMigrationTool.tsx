/**
 * StorageMigrationTool
 * ─────────────────────────────────────────────────────────────
 * Admin/user tool to re-link existing Supabase Storage assets
 * to Google Drive. Run once to migrate all legacy assets.
 *
 * Usage: Render in Settings > Storage or Admin panel.
 * ─────────────────────────────────────────────────────────────
 */

import React, { useState } from 'react';
import { RefreshCw, CheckCircle, XCircle, AlertTriangle, HardDrive, Loader2 } from 'lucide-react';
import { supabase } from '../../supabase/client';
import { useGoogleDrive } from '../../hooks/useGoogleDrive';
import { isSupabaseStorageUrl } from '../../lib/googleDrive';

interface MigrationStat {
    total: number;
    migrated: number;
    failed: number;
    skipped: number;
}

interface MigrationLog {
    id: string;
    name: string;
    status: 'ok' | 'error' | 'skipped';
    message?: string;
}

export const StorageMigrationTool: React.FC = () => {
    const { signedIn, connect, migrate, loading: driveLoading } = useGoogleDrive();
    const [running, setRunning] = useState(false);
    const [stats, setStats] = useState<MigrationStat | null>(null);
    const [logs, setLogs] = useState<MigrationLog[]>([]);

    const addLog = (log: MigrationLog) => {
        setLogs(prev => [log, ...prev].slice(0, 200));
    };

    const runMigration = async () => {
        if (!signedIn) {
            await connect();
        }

        setRunning(true);
        setLogs([]);
        const stat: MigrationStat = { total: 0, migrated: 0, failed: 0, skipped: 0 };

        try {
            // 1. Fetch all assets with Supabase Storage URLs
            const { data: assets, error } = await supabase
                .from('assets')
                .select('*')
                .order('created_at', { ascending: true });

            if (error) throw error;

            stat.total = assets?.length || 0;
            setStats({ ...stat });

            for (const asset of assets || []) {
                // Skip assets already on Google Drive or non-Supabase URLs
                if (asset.source === 'google_drive' || !isSupabaseStorageUrl(asset.url || '')) {
                    stat.skipped++;
                    setStats({ ...stat });
                    addLog({ id: asset.id, name: asset.title, status: 'skipped', message: 'Already migrated or external URL' });
                    continue;
                }

                try {
                    const isPublic = asset.user_id === null; // Public assets → make publicly accessible on Drive
                    const result = await migrate(asset.url, asset.title, isPublic);

                    // Update Supabase record with new Drive info
                    const { error: updateError } = await supabase
                        .from('assets')
                        .update({
                            url: result.url,
                            thumbnail_url: result.thumbnailUrl || null,
                            source: 'google_drive',
                            external_id: result.externalId,
                        })
                        .eq('id', asset.id);

                    if (updateError) throw updateError;

                    // Also migrate thumbnail if separate
                    if (asset.thumbnail_url && isSupabaseStorageUrl(asset.thumbnail_url)) {
                        try {
                            const thumbResult = await migrate(asset.thumbnail_url, `thumb-${asset.title}`, isPublic);
                            await supabase.from('assets').update({ thumbnail_url: thumbResult.thumbnailUrl }).eq('id', asset.id);
                        } catch {
                            // Non-fatal, continue
                        }
                    }

                    stat.migrated++;
                    setStats({ ...stat });
                    addLog({ id: asset.id, name: asset.title, status: 'ok', message: `→ ${result.externalId}` });
                } catch (err: any) {
                    stat.failed++;
                    setStats({ ...stat });
                    addLog({ id: asset.id, name: asset.title, status: 'error', message: err.message });
                }

                // Small delay to avoid rate limiting
                await new Promise(res => setTimeout(res, 300));
            }

            // 2. Migrate profile avatars from the profiles table
            const { data: profiles } = await supabase
                .from('profiles')
                .select('id, avatar_url')
                .not('avatar_url', 'is', null);

            for (const profile of profiles || []) {
                if (!isSupabaseStorageUrl(profile.avatar_url || '')) continue;
                try {
                    const result = await migrate(profile.avatar_url, `avatar-${profile.id}`, false);
                    await supabase.from('profiles').update({ avatar_url: result.url }).eq('id', profile.id);
                    stat.migrated++;
                    setStats({ ...stat });
                    addLog({ id: profile.id, name: 'Avatar', status: 'ok', message: `Profile ${profile.id}` });
                } catch (err: any) {
                    stat.failed++;
                    setStats({ ...stat });
                    addLog({ id: profile.id, name: 'Avatar', status: 'error', message: err.message });
                }
                await new Promise(res => setTimeout(res, 300));
            }

            // 3. Migrate planner covers
            const { data: planners } = await supabase
                .from('planners')
                .select('id, name, cover_url')
                .not('cover_url', 'is', null);

            for (const planner of planners || []) {
                if (!isSupabaseStorageUrl(planner.cover_url || '')) continue;
                try {
                    const result = await migrate(planner.cover_url, `cover-${planner.name}`, false);
                    await supabase.from('planners').update({ cover_url: result.url }).eq('id', planner.id);
                    stat.migrated++;
                    setStats({ ...stat });
                    addLog({ id: planner.id, name: `Cover: ${planner.name}`, status: 'ok' });
                } catch (err: any) {
                    stat.failed++;
                    setStats({ ...stat });
                    addLog({ id: planner.id, name: `Cover: ${planner.name}`, status: 'error', message: err.message });
                }
                await new Promise(res => setTimeout(res, 300));
            }

        } catch (err: any) {
            addLog({ id: 'global', name: 'Migration', status: 'error', message: err.message });
        } finally {
            setRunning(false);
        }
    };

    return (
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-gradient-to-r from-blue-50 to-indigo-50">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-blue-100 rounded-xl">
                        <HardDrive size={18} className="text-blue-600" />
                    </div>
                    <div>
                        <h3 className="text-sm font-bold text-slate-800">Storage Migration Tool</h3>
                        <p className="text-xs text-slate-500">Move all Supabase Storage files to Google Drive</p>
                    </div>
                </div>
                <button
                    onClick={runMigration}
                    disabled={running || driveLoading}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-xl text-sm font-semibold hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-sm"
                >
                    {running ? (
                        <Loader2 size={15} className="animate-spin" />
                    ) : (
                        <RefreshCw size={15} />
                    )}
                    {running ? 'Migrating...' : 'Start Migration'}
                </button>
            </div>

            {/* Warning */}
            {!stats && (
                <div className="px-6 py-4 flex items-start gap-3">
                    <AlertTriangle size={16} className="text-amber-500 mt-0.5 shrink-0" />
                    <div className="text-xs text-slate-600 leading-relaxed">
                        This will download all files from Supabase Storage and re-upload them to your Google Drive.
                        The process runs in the background and can take a few minutes depending on how many assets you have.
                        <strong className="block mt-1 text-amber-700">You must be signed into Google Drive to proceed.</strong>
                    </div>
                </div>
            )}

            {/* Stats */}
            {stats && (
                <div className="grid grid-cols-4 gap-px bg-slate-100 border-b border-slate-100">
                    {[
                        { label: 'Total', value: stats.total, color: 'text-slate-700' },
                        { label: 'Migrated', value: stats.migrated, color: 'text-green-600' },
                        { label: 'Failed', value: stats.failed, color: 'text-red-500' },
                        { label: 'Skipped', value: stats.skipped, color: 'text-slate-400' },
                    ].map(s => (
                        <div key={s.label} className="bg-white px-4 py-3 text-center">
                            <div className={`text-2xl font-bold ${s.color}`}>{s.value}</div>
                            <div className="text-[10px] text-slate-400 uppercase tracking-wide">{s.label}</div>
                        </div>
                    ))}
                </div>
            )}

            {/* Log */}
            {logs.length > 0 && (
                <div className="max-h-64 overflow-y-auto px-4 py-3 space-y-1">
                    {logs.map((log, i) => (
                        <div key={i} className="flex items-center gap-2 text-xs py-0.5">
                            {log.status === 'ok' && <CheckCircle size={12} className="text-green-500 shrink-0" />}
                            {log.status === 'error' && <XCircle size={12} className="text-red-500 shrink-0" />}
                            {log.status === 'skipped' && <div className="w-3 h-3 rounded-full border border-slate-300 shrink-0" />}
                            <span className={`font-medium ${log.status === 'error' ? 'text-red-600' : 'text-slate-700'}`}>
                                {log.name}
                            </span>
                            {log.message && (
                                <span className="text-slate-400 truncate">{log.message}</span>
                            )}
                        </div>
                    ))}
                    {running && (
                        <div className="flex items-center gap-2 text-xs text-slate-400 py-1">
                            <Loader2 size={11} className="animate-spin" />
                            Processing...
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};
