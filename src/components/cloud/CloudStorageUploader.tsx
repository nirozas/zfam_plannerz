/**
 * CloudStorageUploader
 * ============================================================
 * A drop-in replacement for all <input type="file"> or
 * supabase.storage.upload() calls.
 *
 * Props:
 *   onResult(result) — called with the CloudStorageResult after upload/pick
 *   accept           — optional MIME type filter (e.g. "image/*")
 *   label            — button label
 *   compact          — if true, shows just an icon button
 *   className        — extra classes on the trigger button
 *
 * Modes:
 *   1. "Upload from device" → user selects local file → uploads to Drive
 *   2. "Pick from Drive"    → opens Google Picker
 *   Both require the user to be signed into Google Drive first.
 * ============================================================
 */

import React, { useRef, useState } from 'react';
import { Upload, HardDrive, Cloud, X, Loader2, Link } from 'lucide-react';
import { useGoogleDrive } from '../../hooks/useGoogleDrive';
import type { CloudStorageResult } from '../../lib/googleDrive';

interface CloudStorageUploaderProps {
    onResult: (result: CloudStorageResult) => void;
    accept?: string;
    label?: string;
    compact?: boolean;
    makePublic?: boolean;
    className?: string;
    allowUrl?: boolean; // allow pasting an external URL directly
}

export const CloudStorageUploader: React.FC<CloudStorageUploaderProps> = ({
    onResult,
    accept,
    label = 'Add File',
    compact = false,
    makePublic = false,
    className = '',
    allowUrl = false,
}) => {
    const { signedIn, loading, error, connect, upload, pick } = useGoogleDrive();
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [showMenu, setShowMenu] = useState(false);
    const [urlMode, setUrlMode] = useState(false);
    const [urlInput, setUrlInput] = useState('');
    const [localError, setLocalError] = useState<string | null>(null);

    const mimeTypes = accept
        ? accept.split(',').map(s => s.trim())
        : undefined;

    const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        setShowMenu(false);
        setLocalError(null);
        try {
            const result = await upload(file, file.name, makePublic);
            onResult(result);
        } catch (err: any) {
            setLocalError(err.message || 'Upload failed');
        }
        e.target.value = '';
    };

    const handlePickFromDrive = async () => {
        setShowMenu(false);
        setLocalError(null);
        try {
            const results = await pick({ mimeTypes, title: label });
            if (results.length > 0) onResult(results[0]);
        } catch (err: any) {
            setLocalError(err.message || 'Picker failed');
        }
    };

    const handleUrlSubmit = () => {
        if (!urlInput.trim()) return;
        const result: CloudStorageResult = {
            externalId: urlInput,
            url: urlInput,
            thumbnailUrl: urlInput,
            name: urlInput.split('/').pop() || 'External File',
            mimeType: urlInput.match(/\.(jpg|jpeg|png|gif|webp|svg)$/i) ? 'image/jpeg' : 'application/octet-stream',
            source: 'google_drive',
        };
        onResult(result);
        setUrlInput('');
        setUrlMode(false);
    };

    if (!signedIn) {
        return (
            <div className="flex flex-col items-center gap-2">
                <button
                    onClick={connect}
                    disabled={loading}
                    className={`flex items-center gap-2 px-4 py-2 bg-white border-2 border-blue-200 text-blue-700 rounded-xl hover:bg-blue-50 hover:border-blue-400 font-semibold text-sm transition-all shadow-sm ${className}`}
                >
                    {loading ? (
                        <Loader2 size={16} className="animate-spin" />
                    ) : (
                        <svg className="w-4 h-4" viewBox="0 0 24 24">
                            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                        </svg>
                    )}
                    Connect Google Drive
                </button>
                <p className="text-[10px] text-slate-400 text-center max-w-[200px]">
                    Required to upload and store files
                </p>
            </div>
        );
    }

    if (urlMode) {
        return (
            <div className="flex items-center gap-2 p-2 bg-slate-50 rounded-xl border border-slate-200">
                <input
                    type="url"
                    value={urlInput}
                    onChange={e => setUrlInput(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handleUrlSubmit()}
                    placeholder="Paste image or file URL..."
                    className="flex-1 bg-transparent text-sm outline-none px-2 py-1"
                    autoFocus
                />
                <button onClick={handleUrlSubmit} className="px-3 py-1.5 bg-indigo-600 text-white rounded-lg text-xs font-bold hover:bg-indigo-700">
                    Add
                </button>
                <button onClick={() => setUrlMode(false)} className="p-1 text-slate-400 hover:text-slate-600">
                    <X size={14} />
                </button>
            </div>
        );
    }

    return (
        <div className="relative">
            <input
                ref={fileInputRef}
                type="file"
                accept={accept}
                className="hidden"
                onChange={handleFileSelect}
            />

            {compact ? (
                <button
                    onClick={() => setShowMenu(!showMenu)}
                    disabled={loading}
                    className={`p-2 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all ${className}`}
                    title={label}
                >
                    {loading ? <Loader2 size={16} className="animate-spin" /> : <Cloud size={16} />}
                </button>
            ) : (
                <button
                    onClick={() => setShowMenu(!showMenu)}
                    disabled={loading}
                    className={`flex items-center gap-2 px-4 py-2.5 bg-white border border-slate-200 text-slate-700 rounded-xl hover:border-indigo-300 hover:bg-indigo-50 font-medium text-sm transition-all shadow-sm ${className}`}
                >
                    {loading ? <Loader2 size={16} className="animate-spin" /> : <Cloud size={16} className="text-indigo-500" />}
                    {loading ? 'Uploading...' : label}
                </button>
            )}

            {/* Dropdown menu */}
            {showMenu && !loading && (
                <div className="absolute top-full left-0 mt-1 w-52 bg-white rounded-xl shadow-xl border border-slate-100 py-1 z-50 animate-in fade-in zoom-in-95 duration-150">
                    <button
                        onClick={() => { setShowMenu(false); fileInputRef.current?.click(); }}
                        className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50 text-left"
                    >
                        <Upload size={15} className="text-slate-400" />
                        Upload from device
                        <span className="ml-auto text-[10px] text-slate-400">→ Drive</span>
                    </button>
                    <button
                        onClick={handlePickFromDrive}
                        className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50 text-left"
                    >
                        <HardDrive size={15} className="text-blue-400" />
                        Pick from Google Drive
                    </button>
                    {allowUrl && (
                        <button
                            onClick={() => { setShowMenu(false); setUrlMode(true); }}
                            className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50 text-left"
                        >
                            <Link size={15} className="text-slate-400" />
                            Paste URL
                        </button>
                    )}
                    <div className="h-px bg-slate-100 my-1" />
                    <div className="px-4 py-1.5 flex items-center gap-2 text-[10px] text-slate-400">
                        <div className="w-2 h-2 rounded-full bg-green-400" />
                        Connected to Google Drive
                    </div>
                </div>
            )}

            {/* Click-outside close */}
            {showMenu && (
                <div className="fixed inset-0 z-40" onClick={() => setShowMenu(false)} />
            )}

            {(error || localError) && (
                <p className="mt-1 text-xs text-red-500">{error || localError}</p>
            )}
        </div>
    );
};
