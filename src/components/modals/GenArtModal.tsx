import { useState } from 'react';
import {
    X,
    Palette,
    Wand2,
    Sparkles,
    Layers,
    ChevronDown,
    Check
} from 'lucide-react';
import { Button } from '../ui/Button';
import { cn } from '@/lib/utils';

interface GenArtModalProps {
    isOpen: boolean;
    onClose: () => void;
    onGenerate: (data: { prompt: string; style: string; replaceInk: boolean; engine: 'openai' | 'gemini' }) => void;
}

const styles = [
    "Oil Painting",
    "Watercolor",
    "3D Render",
    "Gold Leaf",
    "Minimalist Line Art",
    "Photorealistic"
];

export function GenArtModal({ isOpen, onClose, onGenerate }: GenArtModalProps) {
    const [prompt, setPrompt] = useState('');
    const [selectedStyle, setSelectedStyle] = useState(styles[0]);
    const [replaceInk, setReplaceInk] = useState(true);
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);
    const [engine, setEngine] = useState<'openai' | 'gemini'>('gemini');

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-300 border border-indigo-50">
                {/* Header */}
                <div className="relative h-32 bg-gradient-to-br from-indigo-600 to-purple-700 p-6 flex flex-col justify-end overflow-hidden">
                    <div className="absolute top-[-10%] right-[-10%] w-32 h-32 bg-white/10 rounded-full blur-3xl animate-pulse" />
                    <div className="absolute bottom-[-20%] left-[-10%] w-48 h-48 bg-purple-400/20 rounded-full blur-3xl" />

                    <button
                        onClick={onClose}
                        className="absolute top-4 right-4 p-2 text-white/80 hover:text-white hover:bg-white/10 rounded-full transition-all"
                    >
                        <X size={20} />
                    </button>

                    <div className="flex items-center gap-3 relative z-10">
                        <div className="p-2 bg-white/20 backdrop-blur-md rounded-xl text-white">
                            <Palette size={24} />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-white tracking-tight">AI Art Studio</h2>
                            <p className="text-white/60 text-xs font-medium uppercase tracking-widest">Ink-to-Artwork Engine</p>
                        </div>
                    </div>
                </div>

                <div className="p-6 space-y-6">
                    {/* Engine Selector */}
                    <div className="space-y-2">
                        <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest flex items-center gap-2">
                            <Layers size={12} className="text-indigo-500" />
                            Select Engine
                        </label>
                        <div className="grid grid-cols-2 gap-2 bg-gray-50 p-1 rounded-xl border border-gray-100">
                            <button
                                onClick={() => setEngine('gemini')}
                                className={cn(
                                    "py-2 text-[10px] font-bold rounded-lg transition-all",
                                    engine === 'gemini' ? "bg-white text-indigo-600 shadow-sm border border-indigo-100" : "text-gray-400 hover:text-gray-600"
                                )}
                            >
                                GOOGLE GEMINI (FREE)
                            </button>
                            <button
                                onClick={() => setEngine('openai')}
                                className={cn(
                                    "py-2 text-[10px] font-bold rounded-lg transition-all",
                                    engine === 'openai' ? "bg-white text-indigo-600 shadow-sm border border-indigo-100" : "text-gray-400 hover:text-gray-600"
                                )}
                            >
                                OPENAI DALL-E 3
                            </button>
                        </div>
                    </div>

                    {/* Style Selector */}
                    <div className="space-y-2">
                        <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest flex items-center gap-2">
                            <Sparkles size={12} className="text-indigo-500" />
                            Select Style Preset
                        </label>
                        <div className="relative">
                            <button
                                onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                                className="w-full h-12 px-4 bg-gray-50 border border-gray-100 rounded-xl flex items-center justify-between text-sm font-semibold text-gray-700 transition-all hover:bg-white hover:border-indigo-200"
                            >
                                <span className="flex items-center gap-2">
                                    <div className="w-2 h-2 rounded-full bg-indigo-500" />
                                    {selectedStyle}
                                </span>
                                <ChevronDown size={18} className={cn("text-gray-400 transition-transform", isDropdownOpen && "rotate-180")} />
                            </button>

                            {isDropdownOpen && (
                                <div className="absolute top-[110%] left-0 w-full bg-white border border-gray-100 rounded-xl shadow-xl z-50 py-2 animate-in slide-in-from-top-2">
                                    {styles.map(style => (
                                        <button
                                            key={style}
                                            onClick={() => {
                                                setSelectedStyle(style);
                                                setIsDropdownOpen(false);
                                            }}
                                            className="w-full px-4 py-2.5 text-left text-sm font-medium text-gray-600 hover:bg-indigo-50 hover:text-indigo-600 flex items-center justify-between group"
                                        >
                                            {style}
                                            {selectedStyle === style && <Check size={16} className="text-indigo-600" />}
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Subject Input */}
                    <div className="space-y-2">
                        <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest flex items-center gap-2">
                            <Wand2 size={12} className="text-purple-500" />
                            What is this?
                        </label>
                        <input
                            type="text"
                            value={prompt}
                            onChange={(e) => setPrompt(e.target.value)}
                            placeholder="e.g., A blooming rose in morning dew"
                            className="w-full h-12 px-4 bg-gray-50 border border-gray-100 rounded-xl text-sm font-medium placeholder:text-gray-400 outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 transition-all"
                        />
                    </div>

                    {/* Cleanup Toggle */}
                    <div className="flex items-center justify-between p-4 bg-gray-50 rounded-2xl border border-gray-100">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-white rounded-lg text-gray-400">
                                <Layers size={18} />
                            </div>
                            <div>
                                <h4 className="text-xs font-bold text-gray-700">Replace original ink</h4>
                                <p className="text-[10px] text-gray-400 font-medium">Keep it clean or stack both</p>
                            </div>
                        </div>
                        <button
                            onClick={() => setReplaceInk(!replaceInk)}
                            className={cn(
                                "w-12 h-6 rounded-full p-1 transition-colors",
                                replaceInk ? "bg-indigo-600" : "bg-gray-200"
                            )}
                        >
                            <div className={cn(
                                "w-4 h-4 bg-white rounded-full transition-transform",
                                replaceInk && "translate-x-6"
                            )} />
                        </button>
                    </div>

                    <Button
                        className="w-full h-14 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white rounded-2xl shadow-lg shadow-indigo-100 transition-all active:scale-[0.98] font-bold text-sm flex items-center justify-center gap-3"
                        disabled={!prompt.trim()}
                        onClick={() => onGenerate({ prompt, style: selectedStyle, replaceInk, engine })}
                    >
                        TRANSFORM SKETCH
                        <Sparkles size={18} className="animate-pulse" />
                    </Button>
                </div>
            </div>
        </div>
    );
}
