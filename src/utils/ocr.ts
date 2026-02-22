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

        // Upscale factor for better OCR
        const scale = 3;
        const drawWidth = (contentWidth + (padding * 2)) * scale;
        const drawHeight = (contentHeight + (padding * 2)) * scale;

        const canvas = document.createElement('canvas');
        canvas.width = drawWidth;
        canvas.height = drawHeight;
        const ctx = canvas.getContext('2d');
        if (!ctx) return '';

        // Pure white background for isolation
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        ctx.scale(scale, scale);

        // Rendering Ink-Only with normalization
        ctx.translate(padding - minX, padding - minY);

        input.forEach(path => {
            if (path.points.length < 2) return;

            ctx.beginPath();
            ctx.strokeStyle = '#000000'; // High-contrast black

            // STROKE WEIGHTING: Increase signficantly for AI visibility
            const originalWidth = path.width || 2;
            ctx.lineWidth = Math.max(originalWidth * 2.5, 6);

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

    // 3. AI VISION (Primary Engine)
    try {
        let base64Image = '';
        if (source instanceof HTMLCanvasElement) {
            base64Image = source.toDataURL('image/png').split(',')[1];
        } else if (typeof source === 'string' && source.startsWith('data:')) {
            base64Image = source.split(',')[1];
        } else if (source instanceof Blob) {
            // Convert blob to base64
            const reader = new FileReader();
            base64Image = await new Promise((resolve) => {
                reader.onloadend = () => resolve((reader.result as string).split(',')[1]);
                reader.readAsDataURL(source);
            });
        }

        if (base64Image) {
            // Dynamically import to avoid circular dependencies if any
            const { transcribeImage } = await import('./transcription');
            console.log("[OCR] Attempting AI Vision for high-sensitivity handwriting recognition...");
            const aiText = await transcribeImage(base64Image);
            if (aiText && aiText.length > 0) {
                console.log("[OCR] AI Vision Result:", aiText);
                return aiText;
            }
        }
    } catch (aiError) {
        console.warn("[OCR] AI Vision failed/skipped, falling back to Tesseract:", aiError);
    }

    // 4. TESSERACT FALLBACK (Local Engine)
    console.log("[OCR] Engaging local Tesseract engine...");
    try {
        const { data: { text } } = await Tesseract.recognize(
            source,
            'eng',
            // Cast options to any as types can be finicky for custom params
            {
                tessedit_pageseg_mode: '7'
            } as any
        );

        let result = text.replace(/\n+/g, ' ').trim();
        console.log("[OCR] Raw Tesseract Result:", result);

        // 5. FUZZY MATCHING POST-PROCESSOR
        if (result.length > 2 && result.length < 15) {
            try {
                // Dynamic import to keep bundle size optimized if not used often
                const fuzzysort = (await import('fuzzysort')).default;
                const { commonWords } = await import('./dictionary');

                const match = fuzzysort.go(result, commonWords, { limit: 1 })[0];

                // If we have a decent match, suggest it
                if (match && match.score > -500) {
                    console.log(`[OCR] Auto-Correcting: "${result}" -> "${match.target}" (Score: ${match.score})`);
                    result = match.target;
                }
            } catch (err) {
                console.warn("Dictionary lookup failed:", err);
            }
        }

        return result;
    } catch (error) {
        console.error('[OCR] All engines failed:', error);
        return '';
    }
}
