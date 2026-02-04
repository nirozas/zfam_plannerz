/**
 * Utility to manage User's Custom OpenAI API Key.
 * Checks LocalStorage first (User's Key), then falls back to Environment Variable (System Key).
 */

const STORAGE_KEY = 'zoabi_user_openai_key';

export const getOpenAIKey = (): string | undefined => {
    // 1. Check for User's "Bring Your Own Key" (Stored locally)
    const userKey = localStorage.getItem(STORAGE_KEY);
    if (userKey && userKey.startsWith('sk-')) {
        return userKey;
    }

    // 2. Fallback to System/Dev Key
    return import.meta.env.VITE_OPENAI_API_KEY;
};

export const setOpenAIKey = (key: string) => {
    if (!key) {
        localStorage.removeItem(STORAGE_KEY);
    } else {
        localStorage.setItem(STORAGE_KEY, key.trim());
    }
};

export const hasUserKey = (): boolean => {
    return !!localStorage.getItem(STORAGE_KEY);
};

export const clearOpenAIKey = () => {
    localStorage.removeItem(STORAGE_KEY);
};
