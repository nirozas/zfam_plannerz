import React, { useState } from 'react';
import { X, Palette, Image as ImageIcon, Check, Trash2 } from 'lucide-react';

interface BackgroundSettingsProps {
    currentUrl?: string;
    currentType?: 'color' | 'image';
    currentOpacity?: number;
    onSave: (type: 'color' | 'image', value: string, opacity: number) => void;
    onClose: () => void;
    onReset: () => void;
}

export const BackgroundSettings: React.FC<BackgroundSettingsProps> = ({ currentUrl, currentType, currentOpacity = 100, onSave, onClose, onReset }) => {
    const [type, setType] = useState<'color' | 'image'>(currentType || 'color');
    const [value, setValue] = useState(currentUrl || (type === 'color' ? '#f8fafc' : ''));
    const [opacity, setOpacity] = useState(currentOpacity);

    const colors = [
        '#f8fafc', '#f1f5f9', '#e2e8f0', // Slates
        '#fff1f2', '#fef2f2', '#fff7ed', // Soft warm
        '#f0fdf4', '#ecfdf5', '#f0f9ff', // Soft cool
        '#eef2ff', '#faf5ff', '#fff1f2', // Pastels
        '#1e293b', '#0f172a', '#000000'  // Dark
    ];

    const presets = [
        'https://images.unsplash.com/photo-1519681393784-d120267933ba?auto=format&fit=crop&w=1000&q=80',
        'https://images.unsplash.com/photo-1501785888041-af3ef285b470?auto=format&fit=crop&w=1000&q=80',
        'https://images.unsplash.com/photo-1470770841072-f978cf4d019e?auto=format&fit=crop&w=1000&q=80',
        'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&w=1000&q=80'
    ];

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
                <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
                    <div className="flex items-center gap-2 text-slate-800">
                        <Palette size={18} className="text-indigo-600" />
                        <h3 className="font-bold">Background Settings</h3>
                    </div>
                    <button onClick={onClose} className="p-1 hover:bg-slate-100 rounded-lg transition-colors text-slate-400">
                        <X size={20} />
                    </button>
                </div>

                <div className="p-8 space-y-8">
                    {/* Type Selector */}
                    <div className="flex p-1 bg-slate-100 rounded-xl">
                        <button
                            onClick={() => setType('color')}
                            className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-bold transition-all ${type === 'color' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                        >
                            <Palette size={16} /> Solid Color
                        </button>
                        <button
                            onClick={() => setType('image')}
                            className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-bold transition-all ${type === 'image' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                        >
                            <ImageIcon size={16} /> Image URL
                        </button>
                    </div>

                    {/* Content */}
                    <div className="space-y-6">
                        {type === 'color' ? (
                            <div className="grid grid-cols-6 gap-3">
                                {colors.map((c) => (
                                    <button
                                        key={c}
                                        onClick={() => setValue(c)}
                                        className={`w-full aspect-square rounded-full border-2 transition-all ${value === c ? 'border-indigo-600 ring-2 ring-indigo-200 ring-offset-1' : 'border-transparent hover:scale-110'}`}
                                        style={{ backgroundColor: c }}
                                    />
                                ))}
                            </div>
                        ) : (
                            <div className="space-y-4">
                                <div className="space-y-2">
                                    <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">Image URL</label>
                                    <div className="flex gap-2">
                                        <input
                                            type="text"
                                            value={value}
                                            onChange={(e) => setValue(e.target.value)}
                                            placeholder="https://images.unsplash.com/..."
                                            className="flex-1 px-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none text-sm"
                                        />
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">Presets</label>
                                    <div className="grid grid-cols-4 gap-2">
                                        {presets.map((p) => (
                                            <button
                                                key={p}
                                                onClick={() => setValue(p)}
                                                className={`aspect-video rounded-lg overflow-hidden border-2 transition-all ${value === p ? 'border-indigo-600 scale-95' : 'border-transparent hover:scale-105'}`}
                                            >
                                                <img src={p} alt="" className="w-full h-full object-cover" />
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Opacity Slider */}
                        <div className="space-y-2">
                            <div className="flex justify-between items-center">
                                <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">Background Opacity</label>
                                <span className="text-sm font-bold text-indigo-600">{opacity}%</span>
                            </div>
                            <input
                                type="range"
                                min="0"
                                max="100"
                                value={opacity}
                                onChange={(e) => setOpacity(parseInt(e.target.value))}
                                className="w-full h-2 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                            />
                        </div>
                    </div>

                    {/* Actions */}
                    <div className="flex gap-3 pt-4">
                        <button
                            onClick={onReset}
                            className="flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl border border-slate-200 text-slate-600 font-bold hover:bg-slate-50 transition-colors"
                        >
                            <Trash2 size={18} /> Default
                        </button>
                        <button
                            onClick={() => onSave(type, value, opacity)}
                            className="flex-[2] flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-indigo-600 text-white font-bold hover:bg-indigo-700 shadow-lg shadow-indigo-100 transition-all"
                        >
                            <Check size={18} /> Apply Background
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};
