import Tesseract from 'tesseract.js';

self.onmessage = async (e: MessageEvent) => {
    const { blob, pageId } = e.data;

    if (!blob) return;

    try {
        // Tesseract.recognize can take a Blob, File, or base64 string
        const { data: { text } } = await Tesseract.recognize(blob, 'eng', {
            // Offline mode: Tesseract.js handles caching language data in IndexedDB by default
            // but we can be explicit if needed. Version 5+ uses a more robust cache.
        });

        self.postMessage({
            success: true,
            text: text.replace(/\n+/g, ' ').trim(),
            pageId
        });
    } catch (err) {
        console.error('[OCR Worker] Error:', err);
        self.postMessage({
            success: false,
            error: err instanceof Error ? err.message : 'OCR Failed',
            pageId
        });
    }
};
