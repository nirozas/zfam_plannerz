/**
 * useGoogleDrive — React hook for Google Drive storage operations.
 *
 * Provides:
 *   - signedIn state + sign-in / sign-out
 *   - upload(file) → CloudStorageResult
 *   - pick() → CloudStorageResult[]
 *   - setPublic / setPrivate for admin sharing
 *   - migrate(url) for relinking legacy Supabase Storage URLs
 */

import { useState, useEffect, useCallback } from 'react';
import {
    signIn,
    signOut,
    uploadFileToDrive,
    openGooglePicker,
    setFilePublic,
    setFilePrivate,
    migrateSupabaseFileToDrive,
    initGapi,
    initGoogleAuth,
    loadToken,
    type CloudStorageResult,
} from '../lib/googleDrive';

interface UseGoogleDriveReturn {
    signedIn: boolean;
    loading: boolean;
    error: string | null;
    connect: () => Promise<void>;
    disconnect: () => Promise<void>;
    upload: (file: File | Blob, name?: string, makePublic?: boolean) => Promise<CloudStorageResult>;
    pick: (options?: { mimeTypes?: string[]; title?: string; multiSelect?: boolean }) => Promise<CloudStorageResult[]>;
    makePublic: (fileId: string) => Promise<void>;
    makePrivate: (fileId: string) => Promise<void>;
    migrate: (url: string, name: string, makePublic?: boolean) => Promise<CloudStorageResult>;
}

export function useGoogleDrive(): UseGoogleDriveReturn {
    const [signedIn, setSignedIn] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Initialize on mount — load scripts and restore session
    useEffect(() => {
        let cancelled = false;
        const init = async () => {
            try {
                await initGapi();
                await initGoogleAuth();
                const token = loadToken();
                if (!cancelled) setSignedIn(token !== null);
            } catch (e) {
                if (!cancelled) setError('Failed to initialize Google Drive');
            }
        };
        init();
        return () => { cancelled = true; };
    }, []);

    const connect = useCallback(async () => {
        try {
            setLoading(true);
            setError(null);
            await signIn();
            setSignedIn(true);
        } catch (e: any) {
            setError(e?.message || 'Google sign-in failed');
            throw e;
        } finally {
            setLoading(false);
        }
    }, []);

    const disconnect = useCallback(async () => {
        await signOut();
        setSignedIn(false);
    }, []);

    const upload = useCallback(async (
        file: File | Blob,
        name?: string,
        makePublic = false
    ): Promise<CloudStorageResult> => {
        if (!signedIn) await connect();
        setLoading(true);
        setError(null);
        try {
            const fileName = name || (file instanceof File ? file.name : `file-${Date.now()}`);
            const mimeType = file instanceof File ? file.type : 'application/octet-stream';
            return await uploadFileToDrive(file, fileName, mimeType, makePublic);
        } catch (e: any) {
            setError(e?.message || 'Upload failed');
            throw e;
        } finally {
            setLoading(false);
        }
    }, [signedIn, connect]);

    const pick = useCallback(async (
        options: { mimeTypes?: string[]; title?: string; multiSelect?: boolean } = {}
    ): Promise<CloudStorageResult[]> => {
        if (!signedIn) await connect();
        setLoading(true);
        setError(null);
        try {
            return await openGooglePicker(options);
        } catch (e: any) {
            setError(e?.message || 'Picker failed');
            throw e;
        } finally {
            setLoading(false);
        }
    }, [signedIn, connect]);

    const makePublic = useCallback(async (fileId: string) => {
        await setFilePublic(fileId);
    }, []);

    const makePrivate = useCallback(async (fileId: string) => {
        await setFilePrivate(fileId);
    }, []);

    const migrate = useCallback(async (
        url: string,
        name: string,
        makePublic = false
    ): Promise<CloudStorageResult> => {
        if (!signedIn) await connect();
        setLoading(true);
        setError(null);
        try {
            return await migrateSupabaseFileToDrive(url, name, makePublic);
        } catch (e: any) {
            setError(e?.message || 'Migration failed');
            throw e;
        } finally {
            setLoading(false);
        }
    }, [signedIn, connect]);

    return {
        signedIn,
        loading,
        error,
        connect,
        disconnect,
        upload,
        pick,
        makePublic,
        makePrivate,
        migrate,
    };
}
