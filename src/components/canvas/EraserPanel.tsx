import { Eraser, CircleDashed, Layers } from 'lucide-react';
import { Slider } from '@/components/ui/Slider';
import { cn } from '@/lib/utils';

const eraserTypes = [
    {
        id: 'pixel',
        icon: Eraser,
        label: 'Pixel Eraser',
        description: 'Erase freely'
    },
    {
        id: 'stroke',
        icon: CircleDashed,
        label: 'Stroke Eraser',
        description: 'Remove lines'
    },
    {
        id: 'object',
        icon: Layers,
        label: 'Object Eraser',
        description: 'Remove objects'
    },
] as const;

export type EraserType = typeof eraserTypes[number]['id'];

interface EraserPanelProps {
    type: EraserType;
    size: number;
    onTypeChange: (type: EraserType) => void;
    onSizeChange: (size: number) => void;
}

export function EraserPanel({
    type,
    size,
    onTypeChange,
    onSizeChange,
}: EraserPanelProps) {
    return (
        <div className="p-4 bg-white border border-gray-200 rounded-xl shadow-sm space-y-4 w-64 animate-in fade-in slide-in-from-top-2">
            {/* Eraser Type */}
            <div>
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2 block">
                    Eraser Type
                </label>
                <div className="space-y-1.5">
                    {eraserTypes.map(({ id, icon: Icon, label, description }) => (
                        <button
                            key={id}
                            onClick={() => onTypeChange(id)}
                            className={cn(
                                "w-full p-2.5 rounded-lg border transition-all duration-200",
                                "flex items-center gap-3 text-left",
                                type === id
                                    ? "border-indigo-500 bg-indigo-50/50"
                                    : "border-transparent hover:bg-gray-50 hover:border-gray-200"
                            )}
                        >
                            <div className={cn(
                                "p-1.5 rounded-md",
                                type === id ? "bg-indigo-100 text-indigo-600" : "bg-gray-100 text-gray-400"
                            )}>
                                <Icon className="h-4 w-4" />
                            </div>
                            <div>
                                <div className={cn(
                                    "text-xs font-bold",
                                    type === id ? "text-indigo-900" : "text-gray-700"
                                )}>
                                    {label}
                                </div>
                                <div className="text-[10px] text-gray-400 font-medium">
                                    {description}
                                </div>
                            </div>
                        </button>
                    ))}
                </div>
            </div>

            {/* Size (only for pixel eraser) */}
            {type === 'pixel' && (
                <div className="space-y-3 pt-2">
                    <div className="flex items-center justify-between">
                        <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                            Size
                        </label>
                        <span className="text-[10px] font-mono bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">
                            {size}px
                        </span>
                    </div>
                    <Slider
                        value={[size]}
                        onValueChange={([s]) => onSizeChange(s)}
                        min={5}
                        max={100}
                        step={5}
                    />
                    <div className="flex justify-between gap-1">
                        {[20, 40, 60, 80, 100].map(s => (
                            <button
                                key={s}
                                onClick={() => onSizeChange(s)}
                                className={cn(
                                    "flex-1 h-7 rounded-md text-[10px] font-bold transition-colors",
                                    size === s
                                        ? "bg-indigo-600 text-white"
                                        : "bg-gray-50 text-gray-500 hover:bg-gray-100"
                                )}
                            >
                                {s}
                            </button>
                        ))}
                    </div>
                </div>
            )}

            {/* Visual Preview */}
            <div className="pt-2 border-t border-gray-100">
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2 block">
                    Preview
                </label>
                <div className="h-16 bg-gray-50 rounded-lg flex items-center justify-center overflow-hidden border border-dashed border-gray-200">
                    {type === 'pixel' && (
                        <div
                            className="rounded-full border-2 border-dashed border-indigo-200 bg-white shadow-sm"
                            style={{ width: Math.min(size, 40), height: Math.min(size, 40) }}
                        />
                    )}
                    {type === 'stroke' && (
                        <div className="flex flex-col items-center gap-1 text-gray-400">
                            <CircleDashed className="h-5 w-5 opacity-50" />
                            <span className="text-[9px] font-bold uppercase tracking-tight">Tap line to delete</span>
                        </div>
                    )}
                    {type === 'object' && (
                        <div className="flex flex-col items-center gap-1 text-gray-400">
                            <Layers className="h-5 w-5 opacity-50" />
                            <span className="text-[9px] font-bold uppercase tracking-tight">Tap object to delete</span>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
