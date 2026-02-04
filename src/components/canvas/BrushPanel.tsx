import { useState } from 'react';
import { cn } from '@/lib/utils';
import { Slider } from '@/components/ui/Slider';
import { ColorPicker } from './ColorPicker';
import { BrushType } from '@/types';

const brushTypes: { id: BrushType, label: string }[] = [
    { id: 'pen', label: 'Ballpoint' },
    { id: 'pencil', label: 'Pencil' },
    { id: 'marker', label: 'Highlighter' },
    { id: 'fountain', label: 'Fountain' },
    { id: 'calligraphy', label: 'Calligraphy' },
    { id: 'art', label: 'Art Brush' },
];

const mainColors = [
    '#1a1a1a', '#334155', '#3B82F6', '#60A5FA', '#EF4444', '#F87171', '#22C55E', '#4ADE80',
    '#10B981', '#8B5CF6', '#A78BFA', '#EC4899', '#F472B6', '#F97316', '#FB923C', '#2DD4BF'
];

interface BrushPanelProps {
    type: BrushType;
    color: string;
    size: number;
    opacity: number;
    onTypeChange: (type: BrushType) => void;
    onColorChange: (color: string) => void;
    onSizeChange: (size: number) => void;
    onOpacityChange: (opacity: number) => void;
}

export function BrushPanel({
    type,
    color,
    size,
    opacity,
    onTypeChange,
    onColorChange,
    onSizeChange,
    onOpacityChange
}: BrushPanelProps) {
    const [customColors, setCustomColors] = useState<string[]>([])

    return (
        <div className="p-5 bg-white border border-gray-100 rounded-3xl shadow-2xl space-y-5 w-[280px] animate-in fade-in zoom-in-95 duration-200 origin-top-left">
            {/* Brush Type Grid */}
            <div>
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-3 block">Brush Type</label>
                <div className="grid grid-cols-3 gap-2">
                    {brushTypes.map((bt) => (
                        <button
                            key={bt.id}
                            onClick={() => onTypeChange(bt.id)}
                            className={cn(
                                "py-2 px-1 rounded-xl border text-[10px] font-bold transition-all",
                                type === bt.id
                                    ? "border-orange-500 bg-orange-50 text-orange-600 shadow-sm"
                                    : "border-gray-100 bg-white text-gray-500 hover:border-gray-200"
                            )}
                        >
                            {bt.label}
                        </button>
                    ))}
                </div>
            </div>

            {/* Color Grid */}
            <div>
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-3 block">Color</label>
                <ColorPicker
                    colors={[...mainColors, ...customColors]}
                    selectedColor={color}
                    onColorChange={(c) => {
                        if (!mainColors.includes(c) && !customColors.includes(c)) {
                            setCustomColors([...customColors, c]);
                        }
                        onColorChange(c);
                    }}
                    className="grid-cols-8"
                />
            </div>

            {/* Size Slider */}
            <div className="space-y-3">
                <div className="flex items-center justify-between">
                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Size</label>
                    <span className="text-[10px] font-bold text-gray-900 bg-gray-100 px-2 py-0.5 rounded-full">{size}px</span>
                </div>
                <Slider
                    value={[size]}
                    onValueChange={([s]) => onSizeChange(s)}
                    min={1}
                    max={50}
                    step={1}
                />
                <div className="flex justify-between gap-1 overflow-x-auto pb-1 no-scrollbar">
                    {[2, 4, 8, 16, 32].map(s => (
                        <button
                            key={s}
                            onClick={() => onSizeChange(s)}
                            className={cn(
                                "w-7 h-7 rounded-lg text-[9px] font-bold transition-all",
                                size === s ? "bg-orange-600 text-white shadow-md shadow-orange-100" : "bg-gray-50 text-gray-400 hover:bg-gray-100"
                            )}
                        >
                            {s}
                        </button>
                    ))}
                </div>
            </div>

            {/* Opacity Slider */}
            <div className="space-y-3">
                <div className="flex items-center justify-between">
                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Opacity</label>
                    <span className="text-[10px] font-bold text-gray-900 bg-gray-100 px-2 py-0.5 rounded-full">{Math.round(opacity * 100)}%</span>
                </div>
                <div className="relative h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div
                        className="absolute top-0 left-0 h-full bg-orange-500 rounded-full"
                        style={{ width: `${opacity * 100}%` }}
                    />
                    <input
                        type="range"
                        min="0"
                        max="100"
                        value={opacity * 100}
                        onChange={(e) => onOpacityChange(parseInt(e.target.value) / 100)}
                        className="absolute top-0 left-0 w-full h-full opacity-0 cursor-pointer"
                    />
                </div>
            </div>

            {/* Preview */}
            <div className="pt-2 border-t border-gray-50">
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-3 block text-center">Preview</label>
                <div className="h-16 bg-gray-50/50 rounded-2xl flex items-center justify-center p-4 border border-gray-100">
                    <div
                        className="w-full h-px rounded-full bg-current transition-all"
                        style={{
                            height: `${size}px`,
                            backgroundColor: color,
                            opacity: opacity,
                            borderRadius: type === 'calligraphy' || type === 'marker' ? '2px' : '999px',
                            transform: type === 'calligraphy' ? 'skewX(-20deg) scaleX(0.7)' : 'none',
                            boxShadow: type === 'art' ? `0 0 ${size / 2}px ${color}` : 'none',
                            filter: type === 'pencil' ? 'contrast(120%) brightness(90%)' : 'none'
                        }}
                    />
                </div>
            </div>
        </div>
    );
}
