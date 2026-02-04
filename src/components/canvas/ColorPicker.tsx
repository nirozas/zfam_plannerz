import { cn } from '@/lib/utils';
import { useRef } from 'react';

interface ColorPickerProps {
    colors: string[];
    selectedColor: string;
    onColorChange: (color: string) => void;
    className?: string;
}

export function ColorPicker({
    colors,
    selectedColor,
    onColorChange,
    className,
}: ColorPickerProps) {
    const inputRef = useRef<HTMLInputElement>(null);

    return (
        <div className={cn("grid grid-cols-4 gap-2", className)}>
            {colors.map((color) => (
                <button
                    key={color}
                    onClick={() => onColorChange(color)}
                    className={cn(
                        "h-8 w-full rounded-lg border-2 transition-all duration-200 hover:scale-105",
                        selectedColor === color
                            ? "border-indigo-500 ring-2 ring-indigo-200 scale-105"
                            : "border-transparent hover:border-indigo-200"
                    )}
                    style={{ backgroundColor: color }}
                />
            ))}

            {/* Custom Color Button */}
            <div className="relative">
                <button
                    onClick={() => inputRef.current?.click()}
                    className="h-8 w-full rounded-lg border-2 border-dashed border-gray-300 flex items-center justify-center text-gray-400 hover:border-indigo-500 hover:text-indigo-500 transition-colors"
                >
                    <div className="flex items-center gap-1">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M5 12h14" />
                            <path d="M12 5v14" />
                        </svg>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <circle cx="13.5" cy="6.5" r=".5" fill="currentColor" />
                            <circle cx="17.5" cy="10.5" r=".5" fill="currentColor" />
                            <circle cx="8.5" cy="7.5" r=".5" fill="currentColor" />
                            <circle cx="6.5" cy="12.5" r=".5" fill="currentColor" />
                            <path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c.926 0 1.648-.746 1.648-1.688 0-.437-.18-.835-.437-1.125-.29-.289-.438-.652-.438-1.125a1.64 1.64 0 0 1 1.668-1.668h1.996c3.051 0 5.555-2.503 5.555-5.554C21.965 6.012 17.461 2 12 2z" />
                        </svg>
                    </div>
                </button>
                <input
                    ref={inputRef}
                    type="color"
                    className="absolute opacity-0 pointer-events-none"
                    onChange={(e) => onColorChange(e.target.value)}
                />
            </div>
        </div>
    );
}
