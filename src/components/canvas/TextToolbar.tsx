import { Bold, Italic, AlignLeft, AlignCenter, AlignRight, Square, ChevronDown, List, ListOrdered, CheckSquare } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Slider } from '@/components/ui/Slider';
import { useState } from 'react';

interface TextToolbarProps {
    fontSize: number;
    fontFamily: string;
    fill: string;
    align: 'left' | 'center' | 'right';
    isBold: boolean;
    isItalic: boolean;
    onFontSizeChange: (size: number) => void;
    onFontFamilyChange: (font: string) => void;
    onFillChange: (color: string) => void;
    onAlignChange: (align: 'left' | 'center' | 'right') => void;
    onBoldChange: (bold: boolean) => void;
    onItalicChange: (italic: boolean) => void;
    borderDash?: number[];
    borderStyle?: 'solid' | 'dashed' | 'double';
    backgroundColor?: string;
    borderColor?: string;
    borderWidth?: number;
    width?: number;
    height?: number;
    verticalAlign?: 'top' | 'middle' | 'bottom';
    onBorderDashChange: (dash: number[]) => void;
    onBorderStyleChange: (style: 'solid' | 'dashed' | 'double') => void;
    onBackgroundColorChange: (color: string) => void;
    onBorderColorChange: (color: string) => void;
    onBorderWidthChange: (width: number) => void;
    onWidthChange: (width: number) => void;
    onHeightChange: (height: number) => void;
    onVerticalAlignChange: (align: 'top' | 'middle' | 'bottom') => void;
    onToggleBullets?: (type: 'bullet' | 'number' | 'square' | 'none') => void;
    onToggleCheckboxes?: () => void;
}

const fontFamilies = [
    { value: 'Inter', label: 'Inter' },
    { value: 'Arial', label: 'Arial' },
    { value: 'Roboto', label: 'Roboto' },
    { value: 'Open Sans', label: 'Open Sans' },
    { value: 'Lato', label: 'Lato' },
    { value: 'Montserrat', label: 'Montserrat' },
    { value: 'Caveat', label: 'Caveat (Hand)' },
    { value: 'Dancing Script', label: 'Dancing Script (Hand)' },
    { value: 'Indie Flower', label: 'Indie Flower (Hand)' },
    { value: 'Shadows Into Light', label: 'Shadows (Hand)' },
    { value: 'Playfair Display', label: 'Playfair Display' },
    { value: 'Merriweather', label: 'Merriweather' },
    { value: 'Times New Roman', label: 'Times' },
    { value: 'Courier New', label: 'Courier' },
    { value: 'Georgia', label: 'Georgia' },
    { value: 'Verdana', label: 'Verdana' },
    { value: 'Comic Sans MS', label: 'Comic Sans' },
];

const textColors = [
    '#1a1a1a', '#EF4444', '#3B82F6', '#10B981', '#F59E0B', '#8B5CF6'
];

export function TextToolbar({
    fontSize,
    fontFamily,
    fill,
    align,
    isBold,
    isItalic,
    onFontSizeChange,
    onFontFamilyChange,
    onFillChange,
    onAlignChange,
    onBoldChange,
    onItalicChange,
    backgroundColor = 'transparent',
    borderColor = 'transparent',
    borderWidth = 0,
    borderDash = [],
    borderStyle = 'solid',
    width = 200,
    height = 100,
    verticalAlign = 'top',
    onBackgroundColorChange,
    onBorderColorChange,
    onBorderWidthChange,
    onBorderDashChange,
    onBorderStyleChange,
    onWidthChange,
    onHeightChange,
    onVerticalAlignChange,
    onToggleBullets,
    onToggleCheckboxes
}: TextToolbarProps) {
    const [showBoxParams, setShowBoxParams] = useState(false);

    return (
        <div className="flex flex-col gap-2 p-2">
            {/* Font & Size Row */}
            <div className="flex gap-2 items-end">
                <div className="flex-1">
                    <label className="text-[9px] font-bold text-gray-400 uppercase tracking-widest mb-0.5 block">Font</label>
                    <select
                        value={fontFamily}
                        onChange={(e) => onFontFamilyChange(e.target.value)}
                        className="w-full text-xs border border-gray-200 rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    >
                        {fontFamilies.map(f => (
                            <option key={f.value} value={f.value}>{f.label}</option>
                        ))}
                    </select>
                </div>
                <div className="w-20">
                    <label className="text-[9px] font-bold text-gray-400 uppercase tracking-widest mb-0.5 block">Size: {fontSize}</label>
                    <input
                        type="number"
                        value={fontSize}
                        onChange={(e) => onFontSizeChange(parseInt(e.target.value))}
                        className="w-full text-xs border border-gray-200 rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    />
                </div>
            </div>

            {/* Color & Style Row */}
            <div className="flex gap-2 items-center justify-between">
                <div>
                    <label className="text-[9px] font-bold text-gray-400 uppercase tracking-widest mb-1 block">Text Color</label>
                    <div className="flex gap-1">
                        {textColors.slice(0, 4).map(c => (
                            <button
                                key={c}
                                onClick={() => onFillChange(c)}
                                className={cn(
                                    "w-5 h-5 rounded border transition-all",
                                    fill === c ? "ring-2 ring-indigo-400 scale-110" : "border-gray-200"
                                )}
                                style={{ backgroundColor: c }}
                            />
                        ))}
                        <input
                            type="color"
                            value={fill}
                            onChange={(e) => onFillChange(e.target.value)}
                            className="w-5 h-5 rounded border-0 p-0 cursor-pointer overflow-hidden"
                        />
                    </div>
                </div>

                <div className="flex gap-1">
                    <button
                        onClick={() => onBoldChange(!isBold)}
                        className={cn(
                            "p-1.5 rounded transition-all",
                            isBold ? "bg-indigo-500 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                        )}
                        title="Bold"
                    >
                        <Bold className="w-3.5 h-3.5" />
                    </button>
                    <button
                        onClick={() => onItalicChange(!isItalic)}
                        className={cn(
                            "p-1.5 rounded transition-all",
                            isItalic ? "bg-indigo-500 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                        )}
                        title="Italic"
                    >
                        <Italic className="w-3.5 h-3.5" />
                    </button>
                </div>
            </div>

            {/* Alignment Row */}
            <div className="flex gap-1">
                {['left', 'center', 'right'].map((a) => (
                    <button
                        key={a}
                        onClick={() => onAlignChange(a as any)}
                        className={cn(
                            "flex-1 py-1 rounded transition-all",
                            align === a ? "bg-indigo-500 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                        )}
                    >
                        {a === 'left' && <AlignLeft className="w-3.5 h-3.5 mx-auto" />}
                        {a === 'center' && <AlignCenter className="w-3.5 h-3.5 mx-auto" />}
                        {a === 'right' && <AlignRight className="w-3.5 h-3.5 mx-auto" />}
                    </button>
                ))}
            </div>

            {/* List & Checkbox Row */}
            <div className="flex gap-2">
                <div className="flex-1">
                    <label className="text-[9px] font-bold text-gray-400 uppercase tracking-widest mb-1 block">Lists</label>
                    <div className="flex gap-1">
                        <button
                            onClick={() => onToggleBullets?.('bullet')}
                            className="flex-1 py-1.5 bg-gray-100 text-gray-600 hover:bg-gray-200 rounded transition-all"
                            title="Bullet List"
                        >
                            <List className="w-3.5 h-3.5 mx-auto" />
                        </button>
                        <button
                            onClick={() => onToggleBullets?.('number')}
                            className="flex-1 py-1.5 bg-gray-100 text-gray-600 hover:bg-gray-200 rounded transition-all"
                            title="Numbered List"
                        >
                            <ListOrdered className="w-3.5 h-3.5 mx-auto" />
                        </button>
                        <button
                            onClick={() => onToggleBullets?.('square')}
                            className="flex-1 py-1.5 bg-gray-100 text-gray-600 hover:bg-gray-200 rounded transition-all"
                            title="Square Bullets"
                        >
                            <div className="w-2.5 h-2.5 bg-gray-600 mx-auto rounded-sm" />
                        </button>
                    </div>
                </div>
                <div className="w-1/3">
                    <label className="text-[9px] font-bold text-gray-400 uppercase tracking-widest mb-1 block">Tasks</label>
                    <button
                        onClick={() => onToggleCheckboxes?.()}
                        className="w-full py-1.5 bg-gray-100 text-gray-600 hover:bg-gray-200 rounded transition-all flex items-center justify-center"
                        title="Toggle Checkboxes"
                    >
                        <CheckSquare className="w-3.5 h-3.5" />
                    </button>
                </div>
            </div>

            {/* Box Settings Toggle */}
            <button
                onClick={() => setShowBoxParams(!showBoxParams)}
                className={cn(
                    "flex items-center justify-between px-2 py-1 rounded text-[11px] font-bold transition-colors border",
                    showBoxParams ? "bg-indigo-50 text-indigo-700 border-indigo-200" : "text-gray-500 hover:bg-gray-50 border-gray-100"
                )}
            >
                <div className="flex items-center gap-1.5">
                    <Square className="w-3 h-3" />
                    <span className="uppercase tracking-wider">Box Properties</span>
                </div>
                <ChevronDown className={cn("w-3 h-3 transition-transform", showBoxParams && "rotate-180")} />
            </button>

            {
                showBoxParams && (
                    <div className="space-y-2 mt-1 p-2 bg-gray-50/50 rounded-lg border border-gray-100">
                        {/* Size Row */}
                        <div className="grid grid-cols-2 gap-2">
                            <div>
                                <label className="text-[9px] font-bold text-gray-400 uppercase tracking-widest mb-0.5 block">Width</label>
                                <input
                                    type="number"
                                    value={width}
                                    onChange={(e) => onWidthChange(parseInt(e.target.value))}
                                    className="w-full text-[10px] border border-gray-200 rounded px-1.5 py-0.5"
                                />
                            </div>
                            <div>
                                <label className="text-[9px] font-bold text-gray-400 uppercase tracking-widest mb-0.5 block">Height</label>
                                <input
                                    type="number"
                                    value={height}
                                    onChange={(e) => onHeightChange(parseInt(e.target.value))}
                                    className="w-full text-[10px] border border-gray-200 rounded px-1.5 py-0.5"
                                />
                            </div>
                        </div>

                        {/* Background & Border Color */}
                        <div className="flex gap-4">
                            <div className="flex-1">
                                <label className="text-[9px] font-bold text-gray-400 uppercase tracking-widest mb-1 block">Bg Color</label>
                                <div className="flex gap-1 items-center">
                                    <button
                                        onClick={() => onBackgroundColorChange('transparent')}
                                        className={cn(
                                            "w-5 h-5 rounded border flex items-center justify-center text-[8px] font-bold",
                                            backgroundColor === 'transparent' ? "ring-1 ring-indigo-500" : "border-gray-200"
                                        )}
                                    >
                                        /
                                    </button>
                                    <input
                                        type="color"
                                        value={backgroundColor === 'transparent' ? '#ffffff' : backgroundColor}
                                        onChange={(e) => onBackgroundColorChange(e.target.value)}
                                        className="w-6 h-6 rounded border-0 p-0 cursor-pointer overflow-hidden"
                                    />
                                </div>
                            </div>
                            <div className="flex-1">
                                <label className="text-[9px] font-bold text-gray-400 uppercase tracking-widest mb-1 block">Border Color</label>
                                <div className="flex gap-1 items-center">
                                    <button
                                        onClick={() => onBorderColorChange('transparent')}
                                        className={cn(
                                            "w-5 h-5 rounded border flex items-center justify-center text-[8px] font-bold",
                                            borderColor === 'transparent' ? "ring-1 ring-indigo-500" : "border-gray-200"
                                        )}
                                    >
                                        /
                                    </button>
                                    <input
                                        type="color"
                                        value={borderColor === 'transparent' ? '#000000' : borderColor}
                                        onChange={(e) => onBorderColorChange(e.target.value)}
                                        className="w-6 h-6 rounded border-0 p-0 cursor-pointer overflow-hidden"
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Border Width & Style */}
                        <div className="space-y-2 pt-1 border-t border-gray-100">
                            <div className="flex items-center justify-between">
                                <label className="text-[9px] font-bold text-gray-400 uppercase tracking-widest block">Border Style</label>
                                <div className="flex gap-1">
                                    {['solid', 'dashed', 'double'].map((s) => (
                                        <button
                                            key={s}
                                            onClick={() => onBorderStyleChange(s as any)}
                                            className={cn(
                                                "px-1.5 py-0.5 rounded text-[8px] font-bold uppercase transition-all border",
                                                borderStyle === s ? "bg-indigo-500 text-white border-indigo-500" : "bg-white text-gray-600 border-gray-200"
                                            )}
                                        >
                                            {s}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div>
                                <div className="flex justify-between mb-0.5">
                                    <label className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">Width: {borderWidth}px</label>
                                </div>
                                <Slider
                                    value={[borderWidth]}
                                    onValueChange={([val]) => onBorderWidthChange(val)}
                                    min={0}
                                    max={10}
                                    step={1}
                                    className="w-full"
                                />
                            </div>

                            {borderStyle === 'dashed' && (
                                <div>
                                    <label className="text-[9px] font-bold text-gray-400 uppercase tracking-widest block mb-0.5">Dash Pattern</label>
                                    <Slider
                                        value={[borderDash[0] || 5]}
                                        onValueChange={([val]) => onBorderDashChange([val, val / 2])}
                                        min={1}
                                        max={20}
                                        step={1}
                                        className="w-full"
                                    />
                                </div>
                            )}
                        </div>

                        {/* Vertical Align */}
                        <div className="pt-1 border-t border-gray-100">
                            <label className="text-[9px] font-bold text-gray-400 uppercase tracking-widest mb-1 block">V-Align</label>
                            <div className="flex gap-1">
                                {['top', 'middle', 'bottom'].map((va) => (
                                    <button
                                        key={va}
                                        onClick={() => onVerticalAlignChange(va as any)}
                                        className={cn(
                                            "flex-1 py-1 rounded text-[9px] font-bold uppercase transition-all border",
                                            verticalAlign === va ? "bg-indigo-500 text-white border-indigo-500" : "bg-white text-gray-600 border-gray-200"
                                        )}
                                    >
                                        {va}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>
                )
            }
        </div >
    );
}
