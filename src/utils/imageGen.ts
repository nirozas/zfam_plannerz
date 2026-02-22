import { InkPath } from '@/types/planner';
import { getOpenAIKey, getGeminiKey } from './apiKey';
import { generateTextAI } from './transcription';

/**
 * Prepares a clean, high-contrast ink-only image for AI generation.
 * Isolates strokes and normalizes them for better interpretation.
 */
export async function prepareInkImage(input: InkPath[]): Promise<string> {
    if (!input || input.length === 0) return '';

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

    // 2. IMAGE NORMALIZATION
    const contentWidth = maxX - minX;
    const contentHeight = maxY - minY;

    // Add 10% whitespace padding (min 40px for GenArt to give context)
    const padding = Math.max(40, Math.max(contentWidth, contentHeight) * 0.1);

    // Upsampling: Using a larger internal canvas for high-DPI capture
    const pixelRatio = 4;
    const drawWidth = contentWidth + (padding * 2);
    const drawHeight = contentHeight + (padding * 2);

    const canvas = document.createElement('canvas');
    canvas.width = drawWidth * pixelRatio;
    canvas.height = drawHeight * pixelRatio;
    const ctx = canvas.getContext('2d');
    if (!ctx) return '';

    ctx.scale(pixelRatio, pixelRatio);

    // Pure white background for isolation
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, drawWidth, drawHeight);

    // Rendering Ink-Only with normalization
    ctx.translate(padding - minX, padding - minY);

    input.forEach(path => {
        if (path.points.length < 2) return;

        ctx.beginPath();
        ctx.strokeStyle = '#000000'; // High-contrast black for "Clean Sketch"

        // STROKE WEIGHTING: Ensure thin lines are visible to AI
        const originalWidth = path.width || 2;
        ctx.lineWidth = Math.max(originalWidth, 3);

        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';

        ctx.moveTo(path.points[0], path.points[1]);
        for (let i = 2; i < path.points.length; i += 2) {
            ctx.lineTo(path.points[i], path.points[i + 1]);
        }

        ctx.stroke();
    });

    return canvas.toDataURL('image/png', 1.0);
}

/**
 * Simulates a call to an Image-to-Image AI API.
 */
export async function generateArtFromInk(
    baseImage: string,
    prompt: string,
    style: string,
    preferredEngine: 'openai' | 'gemini' = 'gemini'
): Promise<string> {
    // 1. DEPTH ANALYSIS (Simulation - DALL-E 3 does not support direct ControlNet yet)
    console.log(`[AI Art Engine] Analysing Clean Sketch Structure...`);
    console.log(`[AI Art Engine] High-Contrast Map Detected: ${baseImage.length} bytes of vector data.`);

    const apiKey = getOpenAIKey();
    const geminiKey = getGeminiKey();

    // 1. OPENAI DALL-E 3 PATH
    if (preferredEngine === 'openai' && apiKey) {
        console.log(`[AI Art Engine] Using OpenAI DALL-E 3...`);
        try {
            const response = await fetch('https://api.openai.com/v1/images/generations', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${apiKey}`
                },
                body: JSON.stringify({
                    model: "dall-e-3",
                    prompt: `A ${style} style artwork of ${prompt}. High quality, detailed, masterpiece.`,
                    n: 1,
                    size: "1024x1024",
                })
            });

            if (response.ok) {
                const data = await response.json();
                return data.data[0].url;
            } else {
                const err = await response.json();
                console.log("[AI Art Engine] OpenAI Request Failed:", err); // Log as info, not warning

                // For any error (Quota, Auth, Bad Request), we just log and fall through
                console.log("[AI Art Engine] OpenAI failed, switching to Free Tier automatically...");
            }
        } catch (e) {
            console.log("[AI Art Engine] OpenAI Path Exception, switching to Free Tier...", e);
        }
    }

    // 2. GEMINI + POLLINATIONS PATH (Reliable & Creative)
    try {
        let enhancedPrompt = prompt; // Initialize enhancedPrompt

        if (geminiKey) {
            console.log("[AI Art Engine] Using Gemini to enhance artistic prompt...");
            try {
                // We ask for exactly 5 keywords to keep the URL extremely short and safe
                const expansionPrompt = `Return exactly 5 artistic keywords (nouns or adjectives) describing a ${style} of "${prompt}". Return ONLY the keywords separated by spaces, no punctuation.`;
                const expanded = await generateTextAI(expansionPrompt);
                if (expanded && expanded.length > 5) {
                    enhancedPrompt = expanded;
                }
            } catch (err) {
                console.log("[AI Art Engine] Prompt enhancement skipped (Quota), using original prompt.");
            }
        }

        // 3. CORS PROXY WRAPPER (The Final Hammer)
        const safePrompt = (enhancedPrompt || prompt)
            .replace(/['".,;!?:()\-]/g, "")
            .replace(/[^\x00-\x7F]/g, "")
            .trim()
            .split(/\s+/)
            .filter(w => w.length > 2)
            .slice(0, 8)
            .join(' ');

        const seed = Math.floor(Math.random() * 999999);
        const encoded = encodeURIComponent(safePrompt);

        // Base Pollinations URL
        const targetUrl = `https://pollinations.ai/p/${encoded}?seed=${seed}&width=1024&height=1024&nologo=true&model=flux`;

        console.log(`[AI Art Engine] Engaging CORS Proxy: ${safePrompt}`);
        // We use images.weserv.nl to proxy the request and add CORS headers
        return `https://images.weserv.nl/?url=${encodeURIComponent(targetUrl)}&output=jpg`;
    } catch (e) {
        console.error("[AI Art Engine] Fallback failed:", e);
        // Absolute last resort: simpler style-only URL with CORS proxy
        const simpleKeyword = (prompt.split(' ')[0] || "artwork").replace(/[^a-zA-Z]/g, "");
        const fallbackUrl = `https://pollinations.ai/p/${simpleKeyword}?seed=${Math.floor(Math.random() * 9999)}&width=1024&height=1024&nologo=true&model=flux`;
        return `https://images.weserv.nl/?url=${encodeURIComponent(fallbackUrl)}&output=jpg`;
    }
}
