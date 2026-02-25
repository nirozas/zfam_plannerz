/**
 * Google Drive Storage Service
 * ============================================================
 * Pure functional module (no React).
 * Use the `useGoogleDrive` hook for React components.
 * ============================================================
 */

// ─── Types ─────────────────────────────────────────────────────────────────

export interface CloudStorageResult {
    externalId: string;
    url: string;
    thumbnailUrl?: string;
    name: string;
    mimeType: string;
    size?: number;
    source: 'google_drive';
}

// ─── Constants ─────────────────────────────────────────────────────────────

const CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID as string;
const API_KEY = import.meta.env.VITE_GOOGLE_API_KEY as string;
const SCOPES = 'https://www.googleapis.com/auth/drive.file https://www.googleapis.com/auth/drive.readonly';
const FOLDER_NAME = 'Zoabi Nexus Vault Website';
const DISCOVERY_DOCS = ['https://www.googleapis.com/discovery/v1/apis/drive/v3/rest'];

// ─── State ─────────────────────────────────────────────────────────────────

let gapiLoaded = false;
let gisLoaded = false;
let tokenClient: any = null;
let appFolderId: string | null = null;

// ─── Script Loaders ────────────────────────────────────────────────────────

export function loadGapiScript(): Promise<void> {
    return new Promise((resolve) => {
        if (gapiLoaded) { resolve(); return; }
        if (document.querySelector('script[src*="apis.google.com/js/api.js"]')) {
            const check = setInterval(() => {
                if (typeof (window as any).gapi !== 'undefined') {
                    clearInterval(check); gapiLoaded = true; resolve();
                }
            }, 100);
            return;
        }
        const script = document.createElement('script');
        script.src = 'https://apis.google.com/js/api.js';
        script.onload = () => { gapiLoaded = true; resolve(); };
        document.head.appendChild(script);
    });
}

export function loadGisScript(): Promise<void> {
    return new Promise((resolve) => {
        if (gisLoaded) { resolve(); return; }
        if (document.querySelector('script[src*="accounts.google.com/gsi/client"]')) {
            const check = setInterval(() => {
                if (typeof (window as any).google?.accounts !== 'undefined') {
                    clearInterval(check); gisLoaded = true; resolve();
                }
            }, 100);
            return;
        }
        const script = document.createElement('script');
        script.src = 'https://accounts.google.com/gsi/client';
        script.onload = () => { gisLoaded = true; resolve(); };
        document.head.appendChild(script);
    });
}

export function loadPickerScript(): Promise<void> {
    return new Promise((resolve, reject) => {
        if ((window as any).google?.picker) { resolve(); return; }
        if (!(window as any).gapi) { reject(new Error('gapi not loaded')); return; }
        (window as any).gapi.load('picker', { callback: resolve, onerror: reject });
    });
}

// ─── Initialization ────────────────────────────────────────────────────────

export async function initGapi(): Promise<void> {
    await loadGapiScript();
    await new Promise<void>((resolve) => { (window as any).gapi.load('client', resolve); });
    await (window as any).gapi.client.init({ apiKey: API_KEY, discoveryDocs: DISCOVERY_DOCS });
}

export async function initGoogleAuth(): Promise<void> {
    await loadGisScript();
    if (tokenClient) return;
    tokenClient = (window as any).google.accounts.oauth2.initTokenClient({
        client_id: CLIENT_ID,
        scope: SCOPES,
        callback: '',
    });
}

// ─── Token Management ──────────────────────────────────────────────────────

const TOKEN_KEY = 'google_drive_token';
const TOKEN_EXPIRY_KEY = 'google_drive_token_expiry';

export function saveToken(token: any): void {
    const expiry = Date.now() + (token.expires_in - 60) * 1000;
    sessionStorage.setItem(TOKEN_KEY, JSON.stringify(token));
    sessionStorage.setItem(TOKEN_EXPIRY_KEY, String(expiry));
    (window as any).gapi?.client?.setToken(token);
}

export function loadToken(): any | null {
    const expiry = Number(sessionStorage.getItem(TOKEN_EXPIRY_KEY) || 0);
    if (Date.now() > expiry) {
        sessionStorage.removeItem(TOKEN_KEY);
        sessionStorage.removeItem(TOKEN_EXPIRY_KEY);
        return null;
    }
    const raw = sessionStorage.getItem(TOKEN_KEY);
    const token = raw ? JSON.parse(raw) : null;
    if (token) (window as any).gapi?.client?.setToken(token);
    return token;
}

export function clearToken(): void {
    const token = loadToken();
    if (token) (window as any).google?.accounts?.oauth2?.revoke(token.access_token, () => { });
    sessionStorage.removeItem(TOKEN_KEY);
    sessionStorage.removeItem(TOKEN_EXPIRY_KEY);
    appFolderId = null;
}

export function checkIsSignedIn(): boolean {
    return loadToken() !== null;
}

// ─── Sign In / Out ─────────────────────────────────────────────────────────

export async function signIn(): Promise<void> {
    await initGapi();
    await initGoogleAuth();
    if (loadToken()) return;

    return new Promise((resolve, reject) => {
        tokenClient.callback = (response: any) => {
            if (response.error) { reject(response); return; }
            saveToken(response);
            resolve();
        };
        tokenClient.requestAccessToken({ prompt: 'consent' });
    });
}

export async function signOut(): Promise<void> {
    clearToken();
}

// ─── App Folder Management ─────────────────────────────────────────────────

export async function getOrCreateAppFolder(): Promise<string> {
    if (appFolderId) {
        // Double check if valid
        try {
            const check = await (window as any).gapi.client.drive.files.get({ fileId: appFolderId, fields: 'id, trashed' });
            if (!check.result.trashed) return appFolderId;
        } catch (e) {
            appFolderId = null;
        }
    }

    const gapi = (window as any).gapi;
    const response = await gapi.client.drive.files.list({
        q: `name='${FOLDER_NAME}' and mimeType='application/vnd.google-apps.folder' and trashed=false`,
        fields: 'files(id, name)',
        spaces: 'drive',
    });

    if (response.result.files?.length > 0) {
        appFolderId = response.result.files[0].id;
        return appFolderId!;
    }

    const createResponse = await gapi.client.drive.files.create({
        resource: { name: FOLDER_NAME, mimeType: 'application/vnd.google-apps.folder' },
        fields: 'id',
    });

    appFolderId = createResponse.result.id;
    return appFolderId!;
}

export async function getOrCreateSubfolder(parentFolderId: string, folderName: string): Promise<string> {
    const gapi = (window as any).gapi;
    const response = await gapi.client.drive.files.list({
        q: `name='${folderName}' and '${parentFolderId}' in parents and mimeType='application/vnd.google-apps.folder' and trashed=false`,
        fields: 'files(id, name)',
        spaces: 'drive',
    });

    if (response.result.files?.length > 0) {
        return response.result.files[0].id;
    }

    const createResponse = await gapi.client.drive.files.create({
        resource: { name: folderName, mimeType: 'application/vnd.google-apps.folder', parents: [parentFolderId] },
        fields: 'id',
    });

    return createResponse.result.id;
}

export async function listFilesInAppFolder(): Promise<CloudStorageResult[]> {
    if (!checkIsSignedIn()) await signIn();
    const folderId = await getOrCreateAppFolder();

    const gapi = (window as any).gapi;
    const response = await gapi.client.drive.files.list({
        q: `'${folderId}' in parents and trashed=false`,
        fields: 'files(id, name, mimeType, webViewLink, webContentLink, size)',
        spaces: 'drive',
    });

    const files = response.result.files || [];
    return files.map((file: any) => {
        const isImage = file.mimeType.startsWith('image/');
        // Use stable proxy URL that doesn't expire
        const thumbUrl = getStableThumbnailUrl(file.id);
        const directUrl = isImage ? getDirectImageUrl(file.id) : (file.webViewLink || `https://drive.google.com/file/d/${file.id}/view`);
        return {
            externalId: file.id,
            url: directUrl,
            thumbnailUrl: thumbUrl,
            name: file.name,
            mimeType: file.mimeType,
            size: file.size ? parseInt(file.size) : undefined,
            source: 'google_drive' as const
        };
    });
}

// ─── File Upload ───────────────────────────────────────────────────────────

export async function uploadFileToDrive(
    file: File | Blob,
    name: string,
    mimeType: string,
    makePublic = false,
    onProgress?: (progress: number) => void,
    subfolderName?: string
): Promise<CloudStorageResult> {
    if (!checkIsSignedIn()) await signIn();

    const token = loadToken();
    let folderId = await getOrCreateAppFolder();

    if (subfolderName) {
        folderId = await getOrCreateSubfolder(folderId, subfolderName);
    }

    const metadata = { name, mimeType, parents: [folderId] };
    const form = new FormData();
    form.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }));
    form.append('file', file instanceof File ? file : new File([file], name, { type: mimeType }));

    return new Promise((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.open('POST', 'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name,mimeType,webViewLink,webContentLink,size');
        xhr.setRequestHeader('Authorization', `Bearer ${token.access_token}`);

        if (onProgress) {
            xhr.upload.onprogress = (event) => {
                if (event.lengthComputable) {
                    const percentComplete = Math.round((event.loaded / event.total) * 100);
                    onProgress(percentComplete);
                }
            };
        }

        xhr.onload = async () => {
            if (xhr.status >= 200 && xhr.status < 300) {
                try {
                    const driveFile = JSON.parse(xhr.responseText);
                    if (makePublic) await setFilePublic(driveFile.id, token.access_token);

                    const isImage = driveFile.mimeType.startsWith('image/');
                    const directUrl = isImage ? getDirectImageUrl(driveFile.id) : (driveFile.webViewLink || `https://drive.google.com/file/d/${driveFile.id}/view`);
                    const thumbUrl = getStableThumbnailUrl(driveFile.id);

                    resolve({
                        externalId: driveFile.id,
                        url: directUrl,
                        thumbnailUrl: thumbUrl,
                        name: driveFile.name,
                        mimeType: driveFile.mimeType,
                        source: 'google_drive'
                    });
                } catch (e) {
                    reject(new Error('Failed to parse upload response'));
                }
            } else {
                try {
                    const err = JSON.parse(xhr.responseText);
                    reject(new Error(`Drive upload failed: ${err.error?.message}`));
                } catch (e) {
                    reject(new Error(`Drive upload failed with status ${xhr.status}`));
                }
            }
        };

        xhr.onerror = () => reject(new Error('Network error during upload'));
        xhr.send(form);
    });
}

// ─── Permissions ───────────────────────────────────────────────────────────

export async function setFilePublic(fileId: string, accessToken?: string): Promise<void> {
    const token = accessToken || loadToken()?.access_token;
    if (!token) throw new Error('No access token');

    await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}/permissions`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ role: 'reader', type: 'anyone' }),
    });
}

export async function setFilePrivate(fileId: string): Promise<void> {
    const token = loadToken()?.access_token;
    if (!token) throw new Error('No access token');

    const res = await fetch(
        `https://www.googleapis.com/drive/v3/files/${fileId}/permissions`,
        { headers: { Authorization: `Bearer ${token}` } }
    );
    const data = await res.json();
    const anyonePerm = data.permissions?.find((p: any) => p.type === 'anyone');
    if (anyonePerm) {
        await fetch(
            `https://www.googleapis.com/drive/v3/files/${fileId}/permissions/${anyonePerm.id}`,
            { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } }
        );
    }
}

export async function deleteFileFromDrive(fileId: string): Promise<void> {
    const token = loadToken()?.access_token;
    if (!token) throw new Error('No access token');

    const res = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
    });

    // Ignore 404s since it means the file is already deleted or we lack permissions
    if (!res.ok && res.status !== 404) {
        throw new Error(`Failed to delete file from drive: ${res.statusText}`);
    }
}

// ─── File Picker ───────────────────────────────────────────────────────────

export async function openGooglePicker(
    options: { mimeTypes?: string[]; title?: string; multiSelect?: boolean } = {}
): Promise<CloudStorageResult[]> {
    if (!checkIsSignedIn()) await signIn();
    await loadPickerScript();

    const token = loadToken();
    const google = (window as any).google;

    return new Promise((resolve) => {
        const view = new google.picker.DocsView()
            .setIncludeFolders(false)
            .setSelectFolderEnabled(false);

        if (options.mimeTypes?.length) {
            view.setMimeTypes(options.mimeTypes.join(','));
        }

        const builder = new google.picker.PickerBuilder()
            .addView(view)
            .addView(new google.picker.DocsUploadView())
            .setOAuthToken(token.access_token)
            .setDeveloperKey(API_KEY)
            .setTitle(options.title || 'Select Files from Google Drive')
            .setCallback((data: any) => {
                if (data.action === google.picker.Action.PICKED) {
                    const results: CloudStorageResult[] = data.docs.map((doc: any) => {
                        const isImage = doc.mimeType?.startsWith('image/');
                        return {
                            externalId: doc.id,
                            url: isImage ? getDirectImageUrl(doc.id) : (doc.url || `https://drive.google.com/file/d/${doc.id}/view`),
                            thumbnailUrl: getStableThumbnailUrl(doc.id),
                            name: doc.name,
                            mimeType: doc.mimeType,
                            source: 'google_drive' as const,
                        };
                    });
                    resolve(results);
                } else if (data.action === google.picker.Action.CANCEL) {
                    resolve([]);
                }
            });

        if (options.multiSelect) {
            builder.enableFeature(google.picker.Feature.MULTISELECT_ENABLED);
        }

        builder.build().setVisible(true);
    });
}

// ─── URL Helpers ───────────────────────────────────────────────────────────

export function getDirectImageUrl(fileId: string): string {
    // The uc endpoint is the most universal way to proxy Drive images into <img> tags
    return `https://drive.google.com/uc?id=${fileId}&export=view`;
}

export function getStableThumbnailUrl(fileId: string): string {
    // Stable thumbnail proxy that works for both images and PDFs
    // sz=w400 is the standard size for library cards
    return `https://drive.google.com/thumbnail?id=${fileId}&sz=w400`;
}

export function getHighResThumbnailUrl(fileId: string): string {
    // sz=s1000 ensures high resolution for cover previews or full screen
    return `https://drive.google.com/thumbnail?id=${fileId}&sz=s1000`;
}


export function getEmbedUrl(fileId: string): string {
    return `https://drive.google.com/file/d/${fileId}/preview`;
}

export function isSupabaseStorageUrl(url: string): boolean {
    return url.includes('supabase.co/storage/v1/object/public/');
}

export function parseSupabaseStorageUrl(url: string): { bucket: string; path: string } | null {
    const match = url.match(/\/storage\/v1\/object\/public\/([^/]+)\/(.+)/);
    if (!match) return null;
    return { bucket: match[1], path: match[2] };
}

export async function migrateSupabaseFileToDrive(
    url: string,
    name: string,
    makePublic = false
): Promise<CloudStorageResult> {
    const response = await fetch(url);
    if (!response.ok) throw new Error(`Failed to download ${url}`);
    const blob = await response.blob();
    const mimeType = response.headers.get('Content-Type') || 'application/octet-stream';
    return uploadFileToDrive(blob, name, mimeType, makePublic);
}
