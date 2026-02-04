
import { Sparkles, Palette, Trash2, Copy } from 'lucide-react';

interface SmartActionBarProps {
    onConvertToText: () => void;
    onMakeArt: () => void;
    onDelete: () => void;
    onDuplicate: () => void;
    position: { x: number; y: number };
    isVisible: boolean;
    showAI?: boolean;
}

export const SmartActionBar = ({
    onConvertToText,
    onMakeArt,
    onDelete,
    onDuplicate,
    position,
    isVisible,
    showAI = true
}: SmartActionBarProps) => {
    if (!isVisible) return null;

    return (
        <div
            className="absolute z-50 flex items-center gap-1 bg-white/90 backdrop-blur-md p-1.5 rounded-2xl shadow-2xl border border-indigo-100 animate-in fade-in slide-in-from-bottom-2 duration-300"
            style={{
                left: position.x,
                top: position.y,
                transform: 'translate(-50%, -120%)' // Move above the selection center
            }}
        >
            {showAI && (
                <>
                    <button
                        onClick={onConvertToText}
                        className="flex items-center gap-2 px-3 py-1.5 hover:bg-indigo-50 text-indigo-600 rounded-xl transition-all group"
                        title="Convert Handwriting to Text"
                    >
                        <Sparkles className="w-4 h-4 group-hover:rotate-12 transition-transform" />
                        <span className="text-xs font-black uppercase tracking-tight">Convert to Text</span>
                    </button>

                    <div className="w-px h-6 bg-gray-100 mx-1" />

                    <button
                        onClick={onMakeArt}
                        className="flex items-center gap-2 px-3 py-1.5 hover:bg-pink-50 text-pink-600 rounded-xl transition-all group"
                        title="Turn sketch into Art"
                    >
                        <Palette className="w-4 h-4 group-hover:scale-110 transition-transform" />
                        <span className="text-xs font-black uppercase tracking-tight">Make Art</span>
                    </button>

                    <div className="w-px h-6 bg-gray-100 mx-1" />
                </>
            )}

            <button
                onClick={onDuplicate}
                className="p-1.5 hover:bg-gray-100 text-gray-400 hover:text-gray-600 rounded-xl transition-all"
                title="Duplicate"
            >
                <Copy className="w-4 h-4" />
            </button>

            <button
                onClick={onDelete}
                className="p-1.5 hover:bg-red-50 text-gray-400 hover:text-red-500 rounded-xl transition-all"
                title="Delete"
            >
                <Trash2 className="w-4 h-4" />
            </button>
        </div>
    );
};
