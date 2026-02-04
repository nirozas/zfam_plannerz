import {
    Square,
    Circle,
    Minus,
    Triangle,
    Star,
    ArrowRight,
    Hexagon,
    Diamond,
    Pentagon,
    Octagon
} from 'lucide-react';
import { Slider } from '@/components/ui/Slider';
import { ColorPicker } from './ColorPicker';
import { cn } from '@/lib/utils';

const shapeColors = [
    '#1a1a1a', '#3B82F6', '#EF4444', '#22C55E', '#A855F7', '#EC4899', '#F97316', '#6366F1'
];

const shapes = [
    { id: 'line', icon: Minus, label: 'Line' },
    { id: 'arrow', icon: ArrowRight, label: 'Arrow' },
    { id: 'rectangle', icon: Square, label: 'Rectangle' },
    { id: 'circle', icon: Circle, label: 'Circle' },
    { id: 'triangle', icon: Triangle, label: 'Triangle' },
    { id: 'diamond', icon: Diamond, label: 'Diamond' },
    { id: 'pentagon', icon: Pentagon, label: 'Pentagon' },
    { id: 'hexagon', icon: Hexagon, label: 'Hexagon' },
    { id: 'octagon', icon: Octagon, label: 'Octagon' },
    { id: 'star', icon: Star, label: 'Star' },
] as const;

export type ShapeType = typeof shapes[number]['id'];

interface ShapePanelProps {
    selectedShape: ShapeType;
    strokeColor: string;
    fillColor: string;
    strokeWidth: number;
    filled: boolean;
    onShapeChange: (shape: ShapeType) => void;
    onStrokeColorChange: (color: string) => void;
    onFillColorChange: (color: string) => void;
    onStrokeWidthChange: (width: number) => void;
    onFilledChange: (filled: boolean) => void;
}

export function ShapePanel({
    selectedShape,
    strokeColor,
    fillColor,
    strokeWidth,
    filled,
    onShapeChange,
    onStrokeColorChange,
    onFillColorChange,
    onStrokeWidthChange,
    onFilledChange,
}: ShapePanelProps) {
    return (
        <div className="p-4 bg-white border border-gray-200 rounded-xl shadow-sm space-y-4 w-64 animate-in fade-in slide-in-from-top-2 overflow-y-auto max-h-[80vh]">
            {/* Shape Selection */}
            <div>
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2 block">
                    Shape
                </label>
                <div className="grid grid-cols-3 gap-2">
                    {shapes.map(({ id, icon: Icon, label }) => (
                        <button
                            key={id}
                            onClick={() => onShapeChange(id)}
                            className={cn(
                                "p-2 rounded-lg border transition-all duration-200",
                                "flex flex-col items-center gap-1",
                                selectedShape === id
                                    ? "border-indigo-500 bg-indigo-50 text-indigo-600"
                                    : "border-transparent hover:bg-gray-50 text-gray-400 hover:text-gray-600"
                            )}
                            title={label}
                        >
                            <Icon className="h-4 w-4" />
                            <span className="text-[8px] font-bold">{label}</span>
                        </button>
                    ))}
                </div>
            </div>

            {/* Stroke Color */}
            <div className="pt-2 border-t border-gray-100">
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2 block">
                    Stroke Color
                </label>
                <ColorPicker
                    colors={shapeColors}
                    selectedColor={strokeColor}
                    onColorChange={onStrokeColorChange}
                />
            </div>

            {/* Fill Toggle & Color */}
            <div className="pt-2 border-t border-gray-100">
                <div className="flex items-center justify-between mb-2">
                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                        Fill
                    </label>
                    <button
                        onClick={() => onFilledChange(!filled)}
                        className={cn(
                            "px-3 py-1 rounded-full text-[9px] font-bold transition-all",
                            filled
                                ? "bg-indigo-600 text-white"
                                : "bg-gray-100 text-gray-400 hover:bg-gray-200"
                        )}
                    >
                        {filled ? 'ENABLED' : 'DISABLED'}
                    </button>
                </div>
                {filled && (
                    <ColorPicker
                        colors={shapeColors}
                        selectedColor={fillColor}
                        onColorChange={onFillColorChange}
                    />
                )}
            </div>

            {/* Stroke Width */}
            <div className="pt-2 border-t border-gray-100">
                <div className="flex items-center justify-between mb-2">
                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                        Stroke Width
                    </label>
                    <span className="text-[10px] font-mono bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">
                        {strokeWidth}px
                    </span>
                </div>
                <Slider
                    value={[strokeWidth]}
                    onValueChange={([w]) => onStrokeWidthChange(w)}
                    min={1}
                    max={20}
                    step={1}
                />
            </div>
        </div>
    );
}
