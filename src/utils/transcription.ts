import { getOpenAIKey } from './apiKey';

/**
 * Utilities for AI Voice Transcription using OpenAI Whisper API.
 */

export async function transcribeAudio(audioBlob: Blob): Promise<string> {
    const apiKey = getOpenAIKey();

    if (!apiKey) {
        console.warn("Missing OpenAI API Key. Using mock response for development integration testing.");
        // Fallback for when no key is present (to prevent app crash during demo if user hasn't set it)
        await new Promise(resolve => setTimeout(resolve, 2000));
        return `[MOCK TRANSCRIPTION - NO API KEY FOUND] 
        This is a simulated response because VITE_OPENAI_API_KEY was not found in your .env file. 
        To enable real AI, please add your OpenAI API key.
        
        "The meeting minutes regarding the Q4 expansion plan were approved unanimously."`;
    }

    const formData = new FormData();
    // Whisper requires a filename with an extension. webm is standard for MediaRecorder in browsers.
    formData.append('file', audioBlob, 'recording.webm');
    formData.append('model', 'whisper-1');
    formData.append('temperature', '0'); // User requested 0 for max accuracy
    // "System prompt" equivalent for Whisper is the 'prompt' field which guides style/context
    formData.append('prompt', 'You are an expert transcriber. Transcribe the audio exactly as spoken, capturing every word with high precision. Do not paraphrase. Maintain the original meaning and nuance of the speech.');

    try {
        const response = await fetch('https://api.openai.com/v1/audio/transcriptions', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${apiKey}`
            },
            body: formData
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error?.message || 'Transcription failed');
        }

        const data = await response.json();
        return data.text;
    } catch (error) {
        console.error("Transcription Error:", error);
        throw error;
    }
}
