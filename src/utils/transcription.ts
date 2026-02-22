import { getOpenAIKey, getGeminiKey } from './apiKey';

/**
 * Utilities for AI Voice Transcription using either Google Gemini 1.5 Flash (Preferred)
 * or OpenAI Whisper API (Fallback).
 */

async function blobToBase64(blob: Blob): Promise<string> {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => {
            const base64String = (reader.result as string).split(',')[1];
            resolve(base64String);
        };
        reader.onerror = reject;
        reader.readAsDataURL(blob);
    });
}

export async function generateTextAI(prompt: string, context?: string): Promise<string> {
    const geminiKey = getGeminiKey()?.trim();
    const openAIKey = getOpenAIKey()?.trim();

    // 1. TRY GEMINI (New models)
    if (geminiKey) {
        const models = ["models/gemini-flash-latest", "models/gemini-2.0-flash-lite"];

        for (const modelName of models) {
            try {
                console.log(`[AI Text] Attempting ${modelName}...`);
                const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/${modelName}:generateContent?key=${geminiKey}`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        contents: [{
                            role: 'user',
                            parts: [{ text: `${prompt}\n\nContext/Input: ${context || 'No input provided.'}` }]
                        }],
                        generationConfig: {
                            temperature: 0.7,
                            topP: 0.95,
                            maxOutputTokens: 2048,
                        }
                    })
                });

                if (response.ok) {
                    const data = await response.json();
                    const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
                    if (text) return text.trim();
                } else {
                    const err = await response.json();
                    console.warn(`[Gemini Text] ${modelName} failed:`, response.status, err.error?.message);
                    if (response.status === 429 || response.status === 404 || response.status === 503) continue;
                }
            } catch (error: any) {
                console.error(`[Gemini Text] Error for ${modelName}:`, error);
                continue;
            }
        }
    }

    // 2. TRY OPENAI (FALLBACK)
    if (openAIKey) {
        try {
            console.log("[AI Text] Using OpenAI GPT-4o-mini...");
            const response = await fetch('https://api.openai.com/v1/chat/completions', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${openAIKey}`
                },
                body: JSON.stringify({
                    model: "gpt-4o-mini",
                    messages: [
                        { role: "system", content: "You are a helpful assistant for a digital planner app." },
                        { role: "user", content: `${prompt}\n\nContext: ${context}` }
                    ],
                    temperature: 0.7
                })
            });

            if (response.ok) {
                const data = await response.json();
                return data.choices[0].message.content;
            } else {
                const err = await response.json();
                if (response.status === 429 || err.error?.code === 'insufficient_quota') {
                    throw new Error("OPENAI_QUOTA_EXCEEDED");
                }
            }
        } catch (error: any) {
            console.error("[OpenAI Text] Error:", error);
            if (error.message === "OPENAI_QUOTA_EXCEEDED") throw error;
        }
    }

    if (!geminiKey && !openAIKey) {
        return `[MOCK] Please add an API key in Settings to use real AI features. Result for: ${prompt.slice(0, 30)}...`;
    }

    throw new Error("AI services currently unavailable or out of quota.");
}

export async function transcribeAudio(audioBlob: Blob): Promise<string> {
    const rawGeminiKey = getGeminiKey();
    const geminiKey = rawGeminiKey?.trim();
    const openAIKey = getOpenAIKey()?.trim();

    // 1. TRY GEMINI (Multi-Model Fallback)
    if (geminiKey) {
        // Updated priority based on your discovery list
        const models = [
            "models/gemini-2.5-flash",
            "models/gemini-flash-latest",
            "models/gemini-pro-latest",
            "models/gemini-2.0-flash-lite",
            "models/gemini-2.0-flash"
        ];

        for (const modelName of models) {
            try {
                console.log(`[Transcription] Attempting ${modelName}...`);
                const base64Audio = await blobToBase64(audioBlob);
                const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/${modelName}:generateContent?key=${geminiKey}`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        contents: [{
                            role: 'user',
                            parts: [
                                { text: "Transcribe this audio exactly as spoken. Return only text." },
                                {
                                    inline_data: {
                                        mime_type: 'audio/webm',
                                        data: base64Audio
                                    }
                                }
                            ]
                        }]
                    })
                });

                if (response.ok) {
                    const data = await response.json();
                    const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
                    if (text) {
                        console.log(`[Transcription] Success with ${modelName}`);
                        return text.trim();
                    }
                } else {
                    const err = await response.json();
                    console.warn(`[Gemini Transcription] ${modelName} failed (${response.status}):`, err.error?.message);

                    // IF ANY OF THESE FAIL, JUST CONTINUE THE LOOP
                    // (429 = Quota, 404 = Model Not Enabled, 503 = Busy)
                    if (response.status === 429 || response.status === 404 || response.status === 503 || response.status === 400) {
                        continue;
                    }

                    // Throw only for unexpected 401/403 or other critical errors
                    if (response.status === 401 || response.status === 403) {
                        throw new Error(`GEMINI_API_ERROR: ${response.status} - Invalid or restricted API key.`);
                    }
                }
            } catch (error: any) {
                // Only throw critical key errors, otherwise skip and try next model
                if (error.message.includes("GEMINI_API_ERROR")) throw error;
                console.warn(`[Gemini Transcription] Skipping ${modelName} due to error:`, error.message);
                continue;
            }
        }
        console.warn("[Gemini Transcription] All models exhausted or unavailable.");
    }

    // 2. FALLBACK TO OPENAI WHISPER
    if (openAIKey) {
        try {
            console.log("[Transcription] Fallback to OpenAI Whisper...");
            const formData = new FormData();
            formData.append('file', audioBlob, 'recording.webm');
            formData.append('model', 'whisper-1');
            formData.append('temperature', '0');
            formData.append('prompt', 'Transcribe exactly as spoken, with high density and precision.');

            const response = await fetch('https://api.openai.com/v1/audio/transcriptions', {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${openAIKey}` },
                body: formData
            });

            if (response.ok) {
                const data = await response.json();
                return data.text;
            } else {
                const errorData = await response.json();
                if (response.status === 429 || errorData.error?.code === 'insufficient_quota') {
                    throw new Error("OPENAI_QUOTA_EXCEEDED");
                }
                throw new Error(errorData.error?.message || 'Transcription failed');
            }
        } catch (error: any) {
            console.error("[Whisper Transcription] Error:", error);
            if (error.message === "OPENAI_QUOTA_EXCEEDED") throw error;
        }
    }

    // 3. MOCK FALLBACK
    if (!geminiKey && !openAIKey) {
        console.warn("Missing AI API Keys. Using mock response.");
        await new Promise(resolve => setTimeout(resolve, 2000));
        return `[MOCK] To enable real transcription, please add a Gemini or OpenAI API key in Settings.`;
    }

    throw new Error("Transcription services unavailable. Please check your API keys and quotas.");
}

/**
 * Transcribes handwritten text from an image using Gemini Vision (Preferred) or OpenAI Vision.
 * @param imageBase64 Base64 string of the image (without data:image/png;base64, prefix)
 */
export async function transcribeImage(imageBase64: string): Promise<string> {
    const rawGeminiKey = getGeminiKey();
    const geminiKey = rawGeminiKey?.trim();
    const openAIKey = getOpenAIKey()?.trim();

    // 1. TRY GEMINI (Multi-Model Fallback)
    if (geminiKey) {
        // Updated priority based on vision capabilities
        const models = [
            "models/gemini-1.5-flash",
            "models/gemini-1.5-pro",
            "models/gemini-pro-vision"
        ];

        for (const modelName of models) {
            try {
                console.log(`[Vision] Attempting ${modelName}...`);
                const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/${modelName}:generateContent?key=${geminiKey}`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        contents: [{
                            parts: [
                                { text: "Transcribe the handwritten text in this image exactly as written. Return ONLY the text, no conversational filler." },
                                {
                                    inline_data: {
                                        mime_type: 'image/png',
                                        data: imageBase64
                                    }
                                }
                            ]
                        }]
                    })
                });

                if (response.ok) {
                    const data = await response.json();
                    const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
                    if (text) {
                        console.log(`[Vision] Success with ${modelName}`);
                        return text.trim();
                    }
                } else {
                    const err = await response.json();
                    console.warn(`[Gemini Vision] ${modelName} failed:`, response.status, err.error?.message);
                }
            } catch (error: any) {
                console.warn(`[Gemini Vision] Error for ${modelName}:`, error);
                continue;
            }
        }
    }

    // 2. TRY OPENAI GPT-4o (Vision)
    if (openAIKey) {
        try {
            console.log("[Vision] Fallback to OpenAI GPT-4o...");
            const response = await fetch('https://api.openai.com/v1/chat/completions', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${openAIKey}`
                },
                body: JSON.stringify({
                    model: "gpt-4o",
                    messages: [
                        {
                            role: "user",
                            content: [
                                { type: "text", text: "Transcribe the handwritten text in this image exactly as written. Return ONLY the text." },
                                {
                                    type: "image_url",
                                    image_url: {
                                        url: `data:image/png;base64,${imageBase64}`
                                    }
                                }
                            ]
                        }
                    ],
                    max_tokens: 300
                })
            });

            if (response.ok) {
                const data = await response.json();
                return data.choices[0].message.content;
            } else {
                const err = await response.json();
                if (response.status === 429 || err.error?.code === 'insufficient_quota') {
                    throw new Error("OPENAI_QUOTA_EXCEEDED");
                }
            }
        } catch (error: any) {
            console.error("[OpenAI Vision] Error:", error);
        }
    }

    throw new Error("AI_VISION_FAILED");
}
