const OPENAI_STORAGE_KEY = 'zoabi_user_openai_key';
const GEMINI_STORAGE_KEY = 'zoabi_user_gemini_key';

export const getOpenAIKey = (): string | undefined => {
    // 1. Check for User's "Bring Your Own Key" (Stored locally)
    const userKey = localStorage.getItem(OPENAI_STORAGE_KEY);
    if (userKey && userKey.startsWith('sk-')) {
        console.log("[API Key] Using custom OpenAI key from localStorage");
        return userKey;
    }

    // 2. Fallback to System/Dev Key
    if (import.meta.env.VITE_OPENAI_API_KEY) {
        console.log("[API Key] Using fallback OpenAI key from environment");
    }
    return import.meta.env.VITE_OPENAI_API_KEY;
};

export const getGeminiKey = (): string | undefined => {
    const userKey = localStorage.getItem(GEMINI_STORAGE_KEY);
    if (userKey) {
        console.log("[API Key] Using custom Gemini key from localStorage (Ends in: " + userKey.slice(-4) + ")");
        return userKey;
    }
    const envKey = import.meta.env.VITE_GEMINI_API_KEY;
    if (envKey) {
        console.log("[API Key] Using fallback Gemini key from environment (Ends in: " + envKey.slice(-4) + ")");
    }
    return envKey;
};

export const setOpenAIKey = (key: string) => {
    if (!key) localStorage.removeItem(OPENAI_STORAGE_KEY);
    else localStorage.setItem(OPENAI_STORAGE_KEY, key.trim());
};

export const setGeminiKey = (key: string) => {
    if (!key) localStorage.removeItem(GEMINI_STORAGE_KEY);
    else localStorage.setItem(GEMINI_STORAGE_KEY, key.trim());
};

export const hasUserOpenAIKey = (): boolean => !!localStorage.getItem(OPENAI_STORAGE_KEY);
export const hasUserGeminiKey = (): boolean => !!localStorage.getItem(GEMINI_STORAGE_KEY);

export const clearAIKeys = () => {
    localStorage.removeItem(OPENAI_STORAGE_KEY);
    localStorage.removeItem(GEMINI_STORAGE_KEY);
};

// Kept for backward compatibility if needed by older imports
export const hasUserKey = hasUserOpenAIKey;
