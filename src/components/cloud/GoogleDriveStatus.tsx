/**
 * GoogleDriveStatus
 * ─────────────────────────────────────────────────────────────
 * A small badge shown in the app header / settings that shows
 * whether the user is connected to Google Drive.
 *
 * Also handles the admin "Make Public" workflow for assets.
 */

import React from 'react';
import { Cloud, LogOut, Loader2, HardDrive } from 'lucide-react';
import { useGoogleDrive } from '../../hooks/useGoogleDrive';

interface GoogleDriveStatusProps {
    compact?: boolean;
    className?: string;
}

export const GoogleDriveStatus: React.FC<GoogleDriveStatusProps> = ({
    compact = false,
    className = '',
}) => {
    const { signedIn, loading, connect, disconnect } = useGoogleDrive();

    if (loading) {
        return (
            <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-100 text-slate-500 text-xs ${className}`}>
                <Loader2 size={12} className="animate-spin" />
                {!compact && 'Connecting...'}
            </div>
        );
    }

    if (signedIn) {
        return (
            <div className={`flex items-center gap-2 ${className}`}>
                <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-green-50 border border-green-200 text-green-700 text-xs font-medium">
                    <HardDrive size={12} />
                    {!compact && 'Google Drive'}
                    <div className="w-1.5 h-1.5 rounded-full bg-green-500 ml-0.5" />
                </div>
                <button
                    onClick={disconnect}
                    title="Disconnect Google Drive"
                    className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-full transition-all"
                >
                    <LogOut size={13} />
                </button>
            </div>
        );
    }

    return (
        <button
            onClick={connect}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-full bg-blue-50 border border-blue-200 text-blue-700 text-xs font-semibold hover:bg-blue-100 transition-all ${className}`}
        >
            <Cloud size={12} />
            {compact ? '' : 'Connect Drive'}
        </button>
    );
};
