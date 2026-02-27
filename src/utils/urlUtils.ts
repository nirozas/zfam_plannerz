/**
 * URL Utilities for handling Google Drive and other external assets as stable proxies.
 */

export const repairDriveUrl = (asset: any) => {
    // If the asset itself is just a string (common for task attachments)
    if (typeof asset === 'string') {
        const url = asset;

        // If it's already a high-quality Google Content link, don't break it
        if (url.includes('googleusercontent.com')) return url;

        // If it's a Drive URL but not proxy, and we can extract the ID
        if (url.includes('drive.google.com')) {
            let id = '';
            if (url.includes('?id=')) id = url.split('?id=')[1].split('&')[0];
            else if (url.includes('/d/')) id = url.split('/d/')[1].split('/')[0];

            if (id) {
                // Return the stable high-res proxy (standard size)
                return `https://drive.google.com/thumbnail?id=${id}&sz=w400`;
            }
        }
        return url;
    }

    // If it's an asset object
    const fixUrl = (u?: string | null, isThumbnail = false, type?: string) => {
        if (!u) return u;

        // If it's a data URL, return it immediately
        if (typeof u === 'string' && u.startsWith('data:')) return u;

        // If it's already a high-quality Google Content link, don't break it
        if (typeof u === 'string' && u.includes('googleusercontent.com')) return u;

        // If it's a Drive asset and we have an ID, we can force the stable format
        const id = asset.external_id || asset.externalId;
        const isDriveSource = asset.source === 'google_drive' || u.includes('drive.google.com');

        if (id && isDriveSource) {
            // Use high-res thumbnail proxy for all views - much more reliable than uc?id
            const size = isThumbnail ? 'sz=w400' : 'sz=s2000';
            return `https://drive.google.com/thumbnail?id=${id}&${size}`;
        }

        return u;
    };

    const result: any = { ...asset };
    // Always attempt to fix/compute these based on external_id
    result.url = fixUrl(asset.url, false, asset.type);
    result.thumbnail_url = fixUrl(asset.thumbnail_url, true, asset.type);
    if (asset.cover_url !== undefined) result.cover_url = fixUrl(asset.cover_url, false, 'cover');

    // Support for task attachments array if passed directly
    if (Array.isArray(asset.attachments)) {
        result.attachments = asset.attachments.map((u: string) => repairDriveUrl(u));
    }

    return result;
};

