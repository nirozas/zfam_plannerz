import { useState } from 'react';
import { Slider } from '@/components/ui/Slider';
import { ColorPicker } from './ColorPicker';

const highlighterColors = [
    '#FEF08A', '#BBF7D0', '#BAE6FD', '#FBCFE8',
    '#FED7AA', '#DDD6FE', '#FECACA', '#E0E7FF'
];

interface HighlighterPanelProps {
    color: string;
    size: number;
    opacity: number;
    onColorChange: (color: string) => void;
    onSizeChange: (size: number) => void;
    onOpacityChange: (opacity: number) => void;
}

export function HighlighterPanel({
    color,
    size,
    opacity,
    onColorChange,
    onSizeChange,
    onOpacityChange
}: HighlighterPanelProps) {
    const [customColors, setCustomColors] = useState<string[]>([])

    return (
        <div className="p-4 bg-white border border-gray-200 rounded-xl shadow-sm space-y-4 w-64 animate-in fade-in slide-in-from-top-2">

            {/* Color Selection */}
            <div>
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-3 block">
                    Highlighter Color
                </label>
                <ColorPicker
                    colors={[...highlighterColors, ...customColors]}
                    selectedColor={color}
                    onColorChange={(c) => {
                        if (!highlighterColors.includes(c) && !customColors.includes(c)) {
                            setCustomColors([...customColors, c]);
                        }
                        onColorChange(c);
                    }}
                />
            </div>

            {/* Size */}
            <div>
                <div className="flex items-center justify-between mb-2">
                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                        Width
                    </label>
                    <span className="text-[10px] font-mono bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">
                        {size}px
                    </span>
                </div>
                <Slider
                    value={[size]}
                    onValueChange={([s]) => onSizeChange(s)}
                    min={10}
                    max={60}
                    step={2}
                />
            </div>

            {/* Opacity Slider */}
            <div className="space-y-3">
                <div className="flex items-center justify-between">
                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Opacity</label>
                    <span className="text-[10px] font-bold text-gray-900 bg-gray-100 px-2 py-0.5 rounded-full">{Math.round(opacity * 100)}%</span>
                </div>
                <div className="relative h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div
                        className="absolute top-0 left-0 h-full bg-yellow-400 rounded-full"
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
            <div className="pt-2 border-t border-gray-100">
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2 block">
                    Preview
                </label>
                <div className="h-10 bg-gray-50 rounded-lg flex items-center px-4 overflow-hidden relative">
                    <div className="absolute inset-x-4 h-[1px] bg-gray-200 top-1/2 -translate-y-2 opacity-30"></div>
                    <div className="absolute inset-x-4 h-[1px] bg-gray-200 top-1/2 translate-y-2 opacity-30"></div>
                    <div
                        className="h-4 w-full rounded-sm relative z-10"
                        style={{
                            backgroundColor: color,
                            opacity: opacity
                        }}
                    />
                </div>
            </div>
        </div>
    );
}
