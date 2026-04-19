const CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID as string;
const SCOPES = 'https://www.googleapis.com/auth/drive.file https://www.googleapis.com/auth/drive.readonly https://www.googleapis.com/auth/drive.metadata.readonly';
const FOLDER_NAME = 'Zoabi Nexus Vault Website';

export interface GoogleToken {
    access_token: string;
    expires_at: number;
}

export interface CloudStorageResult {
    externalId: string;
    url: string;
    thumbnailUrl?: string;
    name: string;
    mimeType: string;
    source: 'google_drive' | 'google_photos' | 'supabase';
}

// ─── Token Management ────────────────────────────────────────────────────────

const TOKEN_KEY = 'zoabi_planner_g_token';

export function saveToken(token: GoogleToken) {
    localStorage.setItem(TOKEN_KEY, JSON.stringify(token));
}

export function loadToken(): GoogleToken | null {
    const raw = localStorage.getItem(TOKEN_KEY);
    if (!raw) return null;
    const token = JSON.parse(raw);
    if (Date.now() > token.expires_at) {
        localStorage.removeItem(TOKEN_KEY);
        return null;
    }
    return token;
}

export function checkIsSignedIn(): boolean {
    return !!loadToken();
}

// ─── Base Fetch ──────────────────────────────────────────────────────────────

async function driveFetch(path: string, options: RequestInit = {}) {
    const token = loadToken();
    if (!token) throw new Error('Not signed in');

    const response = await fetch(`https://www.googleapis.com/drive/v3${path}`, {
        ...options,
        headers: {
            ...options.headers,
            Authorization: `Bearer ${token.access_token}`,
        },
    });

    if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        console.error('Drive API Error:', error);
        throw new Error(error.error?.message || 'Drive API Request Failed');
    }

    if (response.status === 204) return null;
    return response.json();
}

// ─── Auth ───────────────────────────────────────────────────────────────────

export const initGoogleAuth = async (): Promise<void> => {
    return Promise.resolve();
};

export async function signIn(): Promise<void> {
    return new Promise((resolve, reject) => {
        const client = (window as any).google?.accounts.oauth2.initTokenClient({
            client_id: CLIENT_ID,
            scope: SCOPES,
            callback: (response: any) => {
                if (response.error) {
                    reject(new Error(response.error_description));
                    return;
                }
                saveToken({
                    access_token: response.access_token,
                    expires_at: Date.now() + response.expires_in * 1000,
                });
                resolve();
            },
        });
        if (!client) {
            reject(new Error('Google Identity Services not loaded'));
            return;
        }
        client.requestAccessToken();
    });
}

export async function signOut(): Promise<void> {
    localStorage.removeItem(TOKEN_KEY);
    return Promise.resolve();
}

// ─── Folder Management ───────────────────────────────────────────────────────

export async function getOrCreateAppFolder(): Promise<string> {
    const query = encodeURIComponent(`name = '${FOLDER_NAME}' and mimeType = 'application/vnd.google-apps.folder' and trashed = false`);
    const searchResponse = await driveFetch(`/files?q=${query}&spaces=drive`);

    if (searchResponse.files && searchResponse.files.length > 0) {
        return searchResponse.files[0].id;
    }

    const createResponse = await driveFetch('/files', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            name: FOLDER_NAME,
            mimeType: 'application/vnd.google-apps.folder',
        }),
    });

    return createResponse.id;
}

// ─── File Operations ───────────────────────────────────────────────────────

export async function uploadFileToDrive(
    file: File | Blob,
    name: string,
    mimeType: string,
    makePublic = false,
    existingFileId?: string
): Promise<CloudStorageResult> {
    if (!checkIsSignedIn()) await signIn();
    const folderId = await getOrCreateAppFolder();
    const token = loadToken();

    let url = 'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name,mimeType';
    let method = 'POST';

    if (existingFileId) {
        url = `https://www.googleapis.com/upload/drive/v3/files/${existingFileId}?uploadType=multipart&fields=id,name,mimeType`;
        method = 'PATCH';
    }

    const metadata = existingFileId ? { name } : { name, mimeType, parents: [folderId] };
    const form = new FormData();
    form.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }));
    form.append('file', file);

    if (!token) throw new Error('Not authenticated');

    const response = await fetch(url, {
        method,
        headers: { Authorization: `Bearer ${token.access_token}` },
        body: form,
    });

    if (!response.ok) {
        if (method === 'PATCH' && response.status === 404) {
            return uploadFileToDrive(file, name, mimeType, makePublic);
        }
        throw new Error('Failed to upload to Drive');
    }
    const driveFile = await response.json();

    if (makePublic) {
        await setFilePublic(driveFile.id);
    }

    return {
        externalId: driveFile.id,
        url: `https://drive.google.com/thumbnail?id=${driveFile.id}&sz=s2048`,
        thumbnailUrl: `https://drive.google.com/thumbnail?id=${driveFile.id}&sz=w400`,
        name: driveFile.name,
        mimeType: driveFile.mimeType,
        source: 'google_drive'
    };
}

export async function setFilePublic(fileId: string): Promise<void> {
    await driveFetch(`/files/${fileId}/permissions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role: 'reader', type: 'anyone' }),
    }).catch(() => {});
}

export async function listFilesInAppFolder(): Promise<any[]> {
    if (!checkIsSignedIn()) await signIn();
    const folderId = await getOrCreateAppFolder();
    const query = encodeURIComponent(`'${folderId}' in parents and trashed=false`);
    const response = await driveFetch(`/files?q=${query}&fields=files(id, name, mimeType, modifiedTime)&spaces=drive`);
    return response.files || [];
}

export async function findNotebookFiles(): Promise<any[]> {
    if (!checkIsSignedIn()) await signIn();
    const query = encodeURIComponent(`name contains 'nb_' and name contains '.json' and trashed=false`);
    const response = await driveFetch(`/files?q=${query}&fields=files(id, name, mimeType, modifiedTime)&spaces=drive`);
    return response.files || [];
}

export async function downloadFileFromDrive(fileId: string): Promise<string> {
    const token = loadToken();
    if (!token) throw new Error('Not signed in');
    const response = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`, {
        headers: { Authorization: `Bearer ${token.access_token}` },
    });
    if (!response.ok) throw new Error('Failed to download from Drive');
    return response.text();
}

export async function downloadFileAsBlob(fileId: string): Promise<Blob> {
    const token = loadToken();
    if (!token) throw new Error('Not signed in');
    const response = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`, {
        headers: { Authorization: `Bearer ${token.access_token}` },
    });
    if (!response.ok) throw new Error('Failed to download blob from Drive');
    return response.blob();
}

export async function deleteFileFromDrive(fileId: string): Promise<void> {
    await driveFetch(`/files/${fileId}`, { method: 'DELETE' });
}

export async function shareFile(fileId: string, email: string, role: 'reader' | 'writer'): Promise<void> {
    await driveFetch(`/files/${fileId}/permissions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            role,
            type: 'user',
            emailAddress: email
        }),
    });
}

export async function getFileMetadata(fileId: string): Promise<any> {
    return driveFetch(`/files/${fileId}?fields=id,name,size,createdTime,owners,webContentLink`);
}

export async function getFilePermissions(fileId: string): Promise<any[]> {
    const response = await driveFetch(`/files/${fileId}/permissions?fields=permissions(id,role,emailAddress,displayName,photoLink)`);
    return response.permissions || [];
}
