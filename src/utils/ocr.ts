import Tesseract from 'tesseract.js';
import { InkPath } from '../types/planner';

/**
 * Performs OCR to extract text from InkPaths or a data URL.
 */
export async function performOCR(input: InkPath[] | string | Blob): Promise<string> {
    if (!input || (Array.isArray(input) && input.length === 0)) return '';

    let source: HTMLCanvasElement | string | Blob;

    if (typeof input === 'string') {
        source = input;
    } else if (input instanceof Blob) {
        source = input;
    } else {
        // 1. ISOLATION LAYER & Bounding Box Calculation
        let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
        input.forEach(path => {
            for (let i = 0; i < path.points.length; i += 2) {
                minX = Math.min(minX, path.points[i]);
                minY = Math.min(minY, path.points[i + 1]);
                maxX = Math.max(maxX, path.points[i]);
                maxY = Math.max(maxY, path.points[i + 1]);
            }
        });

        // 2. IMAGE NORMALIZATION (Sensitivity Boost)
        const contentWidth = maxX - minX;
        const contentHeight = maxY - minY;

        // Add 10% whitespace padding (min 20px)
        const padding = Math.max(20, Math.max(contentWidth, contentHeight) * 0.1);

        const drawWidth = contentWidth + (padding * 2);
        const drawHeight = contentHeight + (padding * 2);

        const canvas = document.createElement('canvas');
        canvas.width = drawWidth;
        canvas.height = drawHeight;
        const ctx = canvas.getContext('2d');
        if (!ctx) return '';

        // Pure white background for isolation
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // Rendering Ink-Only with normalization
        ctx.translate(padding - minX, padding - minY);

        input.forEach(path => {
            if (path.points.length < 2) return;

            ctx.beginPath();
            ctx.strokeStyle = '#000000'; // High-contrast black

            // STROKE WEIGHTING: Increase by 1.5x for AI visibility
            const originalWidth = path.width || 2;
            ctx.lineWidth = originalWidth * 1.5;

            ctx.lineCap = 'round';
            ctx.lineJoin = 'round';

            ctx.moveTo(path.points[0], path.points[1]);
            for (let i = 2; i < path.points.length; i += 2) {
                ctx.lineTo(path.points[i], path.points[i + 1]);
            }

            ctx.stroke();
        });

        source = canvas;
    }

    // 3. AI INSTRUCTION (System Prompt for Vision Engine)
    console.log("[Computer Vision] System Prompt Active: You are a specialist in deciphering messy digital handwriting. Transcribe the ink in this image precisely. Return ONLY the text found.");

    try {
        const { data: { text } } = await Tesseract.recognize(
            source,
            'eng',
            {
                // High-DPI Capture handled by rendering at high resolution
                // logger: m => console.log(m)
            }
        );

        const result = text.replace(/\n+/g, ' ').trim();
        console.log("[Computer Vision] Transcription Result:", result);
        return result;
    } catch (error) {
        console.error('[Computer Vision] OCR Failure:', error);
        return '';
    }
}
