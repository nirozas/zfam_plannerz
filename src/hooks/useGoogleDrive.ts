/**
 * useGoogleDrive — React hook for Google Drive storage operations.
 */

import { useState, useEffect, useCallback } from 'react';
import {
    signIn,
    signOut,
    uploadFileToDrive,
    setFilePublic,
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
    makePublic: (fileId: string) => Promise<void>;
}

export function useGoogleDrive(): UseGoogleDriveReturn {
    const [signedIn, setSignedIn] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Initialize on mount
    useEffect(() => {
        let cancelled = false;
        const init = async () => {
            try {
                await initGoogleAuth();
                const token = loadToken();
                if (!cancelled) setSignedIn(token !== null);
            } catch (e) {
                console.warn('Google Auth initialization deferred');
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

    const makePublic = useCallback(async (fileId: string) => {
        await setFilePublic(fileId);
    }, []);

    return {
        signedIn,
        loading,
        error,
        connect,
        disconnect,
        upload,
        makePublic,
    };
}
