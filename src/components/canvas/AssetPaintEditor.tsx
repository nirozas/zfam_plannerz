import {
    Trash2,
    Maximize2,
    ArrowUp,
    ArrowDown,
    Blend
} from 'lucide-react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

interface AssetPaintEditorProps {
    element: any;
    onUpdate: (id: string, attrs: any) => void;
    onDelete: (id: string) => void;
    onMoveToFront: (id: string) => void;
    onMoveToBack: (id: string) => void;
}

export function AssetPaintEditor({
    element,
    onUpdate,
    onDelete,
    onMoveToFront,
    onMoveToBack
}: AssetPaintEditorProps) {
    if (!element || (element.type !== 'image' && element.type !== 'sticker')) return null;

    const filters = [
        { name: 'None', value: '' },
        { name: 'Grayscale', value: 'grayscale(100%)' },
        { name: 'Sepia', value: 'sepia(100%)' },
        { name: 'Invert', value: 'invert(100%)' },
        { name: 'Blur', value: 'blur(2px)' },
    ];

    return (
        <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="absolute z-50 bg-white/95 backdrop-blur-md border border-gray-100 shadow-2xl rounded-2xl p-2 flex items-center gap-1 min-w-max"
            style={{
                left: element.x,
                top: element.y - 60,
                transform: 'translate(-50%, -100%)'
            }}
        >
            {/* Opacity Control */}
            <div className="flex items-center gap-2 px-3 border-r border-gray-100">
                <Blend className="w-4 h-4 text-gray-400" />
                <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.1"
                    value={element.opacity ?? 1}
                    onChange={(e) => onUpdate(element.id, { opacity: parseFloat(e.target.value) })}
                    className="w-20 h-1 bg-gray-100 rounded-lg appearance-none cursor-pointer accent-indigo-500"
                />
            </div>

            {/* Filter Toggle */}
            <div className="flex items-center gap-1 px-2 border-r border-gray-100">
                {filters.map(f => (
                    <button
                        key={f.name}
                        onClick={() => onUpdate(element.id, { filter: f.value })}
                        title={f.name}
                        className={cn(
                            "w-8 h-8 rounded-lg text-[10px] font-bold transition-all",
                            (element.filter === f.value || (!element.filter && f.value === ''))
                                ? "bg-indigo-50 text-indigo-600"
                                : "text-gray-400 hover:bg-gray-50 hover:text-gray-600"
                        )}
                    >
                        {f.name[0]}
                    </button>
                ))}
            </div>

            {/* Transform Toggle (Lock) */}
            <button
                onClick={() => onUpdate(element.id, { isLocked: !element.isLocked })}
                className={cn(
                    "p-2 rounded-xl transition-all",
                    element.isLocked ? "bg-red-50 text-red-500" : "text-gray-400 hover:bg-gray-50 hover:text-gray-600"
                )}
            >
                <Maximize2 className="w-4 h-4" />
            </button>

            <div className="w-px h-6 bg-gray-100 mx-1" />

            {/* Layering */}
            <button
                onClick={() => onMoveToFront(element.id)}
                className="p-2 rounded-xl text-gray-400 hover:bg-gray-50 hover:text-gray-600 transition-all"
                title="Bring to Front"
            >
                <ArrowUp className="w-4 h-4" />
            </button>
            <button
                onClick={() => onMoveToBack(element.id)}
                className="p-2 rounded-xl text-gray-400 hover:bg-gray-50 hover:text-gray-600 transition-all"
                title="Send to Back"
            >
                <ArrowDown className="w-4 h-4" />
            </button>

            <div className="w-px h-6 bg-gray-100 mx-1" />

            {/* Delete */}
            <button
                onClick={() => onDelete(element.id)}
                className="p-2 rounded-xl text-red-400 hover:bg-red-50 hover:text-red-500 transition-all"
            >
                <Trash2 className="w-4 h-4" />
            </button>
        </motion.div>
    );
}
