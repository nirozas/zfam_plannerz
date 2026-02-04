import { useRef, useState, useEffect } from 'react';
import {
    Crop, Sun, Contrast, RotateCcw, FlipHorizontal, FlipVertical,
    Wand2, Check, X, Save, FilePlus, Image as ImageIcon, Palette,
    ArrowUp, ArrowDown, Sparkles, Blend
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface AssetEditorPanelProps {
    id: string;
    imageUrl: string;
    onSave: (blob: Blob, mode: 'save' | 'saveAs') => void;
    onCancel: () => void;
    onMoveToFront?: (id: string) => void;
    onMoveToBack?: (id: string) => void;
}

interface Point {
    x: number;
    y: number;
}

export function AssetEditorPanel({ id, imageUrl, onSave, onCancel, onMoveToFront, onMoveToBack }: AssetEditorPanelProps) {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const overlayRef = useRef<HTMLDivElement>(null);

    // Basic filters
    const [brightness, setBrightness] = useState(100);
    const [contrast, setContrast] = useState(100);
    const [hueShift, setHueShift] = useState(0); // Hue shift in degrees
    const [opacity, setOpacity] = useState(100); // Opacity 0-100
    const [flipH, setFlipH] = useState(false);
    const [flipV, setFlipV] = useState(false);
    const [rotation, setRotation] = useState(0);
    const [removeBg, setRemoveBg] = useState(false);
    const [showOriginal, setShowOriginal] = useState(false);
    const [showPresets, setShowPresets] = useState(false);

    // Preset filters logic
    const applyPreset = (preset: string) => {
        switch (preset) {
            case 'vivid': setBrightness(110); setContrast(120); break;
            case 'mono': setBrightness(100); setContrast(100); break; // grayscale handled in CSS or baked?
            case 'sepia': setBrightness(90); setContrast(110); break;
        }
    };

    // Crop states - 8 points for polygon crop
    const [isCropMode, setIsCropMode] = useState(false);
    const [cropPoints, setCropPoints] = useState<Point[]>([]);
    const [isDragging, setIsDragging] = useState(false);
    const [dragPointIndex, setDragPointIndex] = useState<number | null>(null);

    // Track original image
    const [originalImage, setOriginalImage] = useState<HTMLImageElement | null>(null);

    useEffect(() => {
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.src = imageUrl;
        img.onload = () => {
            setOriginalImage(img);
        };
        img.onerror = (e) => {
            console.error("Failed to load image for editing", e);
        };
    }, [imageUrl]);

    useEffect(() => {
        applyFilters();
    }, [brightness, contrast, hueShift, opacity, flipH, flipV, rotation, removeBg, originalImage]);

    // Initialize 8-point crop polygon
    useEffect(() => {
        if (isCropMode && canvasRef.current && cropPoints.length === 0) {
            const canvas = canvasRef.current;
            const w = canvas.width;
            const h = canvas.height;
            const margin = Math.min(w, h) * 0.1;

            setCropPoints([
                { x: margin, y: margin },
                { x: w / 2, y: margin },
                { x: w - margin, y: margin },
                { x: w - margin, y: h / 2 },
                { x: w - margin, y: h - margin },
                { x: w / 2, y: h - margin },
                { x: margin, y: h - margin },
                { x: margin, y: h / 2 }
            ]);
        }
    }, [isCropMode, cropPoints.length]);

    const applyFilters = () => {
        const canvas = canvasRef.current;
        if (!canvas || !originalImage) return;

        const ctx = canvas.getContext('2d', { willReadFrequently: true });
        if (!ctx) return;

        const maxWidth = 800;
        const maxHeight = 800;
        let width = originalImage.width;
        let height = originalImage.height;

        if (width > maxWidth || height > maxHeight) {
            const ratio = Math.min(maxWidth / width, maxHeight / height);
            width = width * ratio;
            height = height * ratio;
        }

        // Standardize canvas size based on content
        if (canvas.width !== Math.floor(width) || canvas.height !== Math.floor(height)) {
            canvas.width = Math.floor(width);
            canvas.height = Math.floor(height);
        }

        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.save();

        // Apply CSS filters directly to the context
        ctx.filter = `brightness(${brightness}%) contrast(${contrast}%) hue-rotate(${hueShift}deg)`;

        // Apply transformations (Rotate/Flip)
        if (rotation !== 0 || flipH || flipV) {
            ctx.translate(canvas.width / 2, canvas.height / 2);
            if (rotation !== 0) ctx.rotate((rotation * Math.PI) / 180);
            if (flipH || flipV) ctx.scale(flipH ? -1 : 1, flipV ? -1 : 1);
            ctx.translate(-canvas.width / 2, -canvas.height / 2);
        }

        // Apply Opacity
        ctx.globalAlpha = opacity / 100;

        // Draw image with all filters and transforms
        ctx.drawImage(originalImage, 0, 0, canvas.width, canvas.height);

        // Reset globalAlpha for subsequent operations (like bg removal which works on pixel data)
        ctx.globalAlpha = 1.0;

        // Optional BG Removal (processed pixel-by-pixel after initial draw)
        if (removeBg) {
            const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
            const data = imageData.data;
            for (let i = 0; i < data.length; i += 4) {
                // simple white-ish bg removal
                if (data[i] > 240 && data[i + 1] > 240 && data[i + 2] > 240) {
                    data[i + 3] = 0;
                }
            }
            ctx.putImageData(imageData, 0, 0);
        }

        ctx.restore();
    };

    const applyCrop = () => {
        if (cropPoints.length !== 8 || !canvasRef.current) return;
        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const xs = cropPoints.map(p => p.x);
        const ys = cropPoints.map(p => p.y);
        const minX = Math.min(...xs);
        const minY = Math.min(...ys);
        const maxX = Math.max(...xs);
        const maxY = Math.max(...ys);
        const width = maxX - minX;
        const height = maxY - minY;

        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = canvas.width;
        tempCanvas.height = canvas.height;
        const tempCtx = tempCanvas.getContext('2d');
        if (!tempCtx) return;
        tempCtx.drawImage(canvas, 0, 0);

        canvas.width = width;
        canvas.height = height;
        ctx.clearRect(0, 0, width, height);

        ctx.save();
        ctx.beginPath();
        ctx.moveTo(cropPoints[0].x - minX, cropPoints[0].y - minY);
        for (let i = 1; i < cropPoints.length; i++) {
            ctx.lineTo(cropPoints[i].x - minX, cropPoints[i].y - minY);
        }
        ctx.closePath();
        ctx.clip();
        ctx.drawImage(tempCanvas, -minX, -minY);
        ctx.restore();

        const croppedImage = new Image();
        croppedImage.src = canvas.toDataURL();
        croppedImage.onload = () => {
            setOriginalImage(croppedImage);
            setIsCropMode(false);
            setCropPoints([]);
        };
    };

    const handleMouseDown = (e: React.MouseEvent) => {
        if (!isCropMode || !overlayRef.current) return;
        const rect = overlayRef.current.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        for (let i = 0; i < cropPoints.length; i++) {
            const p = cropPoints[i];
            if (Math.sqrt((x - p.x) ** 2 + (y - p.y) ** 2) < 15) {
                setIsDragging(true);
                setDragPointIndex(i);
                return;
            }
        }
    };

    const handleMouseMove = (e: React.MouseEvent) => {
        if (!isDragging || dragPointIndex === null || !overlayRef.current) return;
        const rect = overlayRef.current.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        const newPoints = [...cropPoints];
        newPoints[dragPointIndex] = { x, y };
        setCropPoints(newPoints);
    };

    const handleSave = (mode: 'save' | 'saveAs') => {
        canvasRef.current?.toBlob(blob => blob && onSave(blob, mode), 'image/png');
    };

    const resetFilters = () => {
        setBrightness(100); setContrast(100); setHueShift(0); setOpacity(100);
        setFlipH(false); setFlipV(false); setRotation(0); setRemoveBg(false);
    };

    return (
        <div className="flex flex-col h-full bg-white overflow-hidden font-sans border-l border-gray-100 shadow-2xl">
            {/* Header - Scaled Down */}
            <div className="px-5 py-2.5 border-b border-gray-100 flex items-center justify-between shrink-0 bg-white z-20">
                <h3 className="text-sm font-black text-gray-900 tracking-tight uppercase">Edit Asset</h3>
                <button onClick={onCancel} className="p-1.5 hover:bg-gray-100 rounded-full transition-colors text-gray-400">
                    <X className="w-5 h-5" />
                </button>
            </div>

            <div className="flex-1 overflow-y-auto custom-scrollbar bg-white">
                <div className="p-4 space-y-4">
                    {/* Live Preview / Interactive Area - Scaled Down */}
                    <div className="space-y-2">
                        <div className="flex justify-between items-center">
                            <label className="text-[9px] font-black uppercase tracking-widest text-gray-400 flex items-center gap-1.5">
                                <ImageIcon className="w-3 h-3" />
                                {showOriginal ? 'Original Image' : 'Live Preview'}
                            </label>
                            <button
                                onMouseDown={() => setShowOriginal(true)}
                                onMouseUp={() => setShowOriginal(false)}
                                onMouseLeave={() => setShowOriginal(false)}
                                className="text-[9px] font-black uppercase bg-gray-100 hover:bg-gray-200 px-2 py-0.5 rounded-full transition-colors text-gray-600 active:bg-indigo-600 active:text-white"
                            >
                                Compare
                            </button>
                        </div>

                        <div className="relative aspect-square w-full rounded-xl bg-gray-50 border border-gray-100 shadow-inner overflow-hidden flex items-center justify-center p-2"
                            ref={overlayRef}
                            onMouseDown={handleMouseDown}
                            onMouseMove={handleMouseMove}
                            onMouseUp={() => { setIsDragging(false); setDragPointIndex(null); }}
                            onMouseLeave={() => { setIsDragging(false); setDragPointIndex(null); }}
                        >
                            <canvas
                                ref={canvasRef}
                                className={`max - w - full max - h - full block transition - opacity duration - 200 ${showOriginal ? 'opacity-0' : 'opacity-100'} `}
                            />

                            {showOriginal && (
                                <img
                                    src={imageUrl}
                                    alt="Original"
                                    className="absolute inset-0 w-full h-full object-contain p-2 bg-gray-50"
                                />
                            )}

                            {/* Crop Overlay - Scaled Down UI */}
                            <AnimatePresence>
                                {isCropMode && !showOriginal && (
                                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 pointer-events-none">
                                        <svg className="w-full h-full" viewBox={`0 0 ${canvasRef.current?.width || 0} ${canvasRef.current?.height || 0} `}>
                                            <defs><mask id="m"><rect width="100%" height="100%" fill="white" /><polygon points={cropPoints.map(p => `${p.x},${p.y} `).join(' ')} fill="black" /></mask></defs>
                                            <rect width="100%" height="100%" fill="black" opacity="0.6" mask="url(#m)" />
                                            <polygon points={cropPoints.map(p => `${p.x},${p.y} `).join(' ')} fill="none" stroke="white" strokeWidth="1.5" strokeDasharray="4,4" />
                                            {cropPoints.map((p, i) => (
                                                <circle key={i} cx={p.x} cy={p.y} r="8" fill="white" stroke="#4F46E5" strokeWidth="3" className="pointer-events-auto cursor-move active:scale-125 transition-transform shadow-lg" />
                                            ))}
                                        </svg>
                                        <div className="absolute top-2 right-2 flex gap-1.5 pointer-events-auto">
                                            <button onClick={applyCrop} className="p-2 bg-green-500 text-white rounded-full shadow-lg hover:bg-green-600 transition-all active:scale-90 flex items-center gap-1.5 px-3 font-black uppercase text-[9px]">
                                                <Check className="w-3.5 h-3.5" /> Apply
                                            </button>
                                            <button onClick={() => { setIsCropMode(false); setCropPoints([]); }} className="p-2 bg-red-500 text-white rounded-full shadow-lg hover:bg-red-600 transition-all active:scale-90">
                                                <X className="w-3.5 h-3.5" />
                                            </button>
                                        </div>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>
                    </div>

                    <div className="h-px bg-gray-100" />

                    {/* Ultra-Compact Control Grid */}
                    <div className="grid grid-cols-4 gap-1.5">
                        <button
                            onClick={() => setIsCropMode(!isCropMode)}
                            title="Crop"
                            className={`flex flex-col items-center justify-center p-2 rounded-lg border transition-all gap-1 ${isCropMode ? 'bg-indigo-600 border-indigo-600 text-white shadow-md' : 'bg-white border-gray-100 text-gray-700 hover:border-indigo-200'
                                }`}
                        >
                            <Crop className="w-3.5 h-3.5" />
                            <span className="text-[7px] font-black uppercase">Crop</span>
                        </button>
                        <button
                            onClick={() => setRemoveBg(!removeBg)}
                            title="Remove Background"
                            className={`flex flex-col items-center justify-center p-2 rounded-lg border transition-all gap-1 ${removeBg ? 'bg-purple-600 border-purple-600 text-white shadow-md' : 'bg-white border-gray-100 text-gray-700 hover:border-purple-200'
                                }`}
                        >
                            <Wand2 className="w-3.5 h-3.5" />
                            <span className="text-[7px] font-black uppercase">Eraser</span>
                        </button>
                        <button
                            onClick={() => onMoveToFront?.(id)}
                            title="Bring to Front"
                            className="flex flex-col items-center justify-center p-2 rounded-lg border border-gray-100 bg-white text-gray-700 hover:border-indigo-200 transition-all gap-1"
                        >
                            <ArrowUp className="w-3.5 h-3.5" />
                            <span className="text-[7px] font-black uppercase">Front</span>
                        </button>
                        <button
                            onClick={() => onMoveToBack?.(id)}
                            title="Send to Back"
                            className="flex flex-col items-center justify-center p-2 rounded-lg border border-gray-100 bg-white text-gray-700 hover:border-indigo-200 transition-all gap-1"
                        >
                            <ArrowDown className="w-3.5 h-3.5" />
                            <span className="text-[7px] font-black uppercase">Back</span>
                        </button>
                        <button onClick={() => setFlipH(!flipH)} className={`p-2 rounded-lg border transition-all flex flex-col items-center gap-1 ${flipH ? 'bg-indigo-50 border-indigo-200 text-indigo-700' : 'bg-white border-gray-100 text-gray-600'}`}>
                            <FlipHorizontal className="w-3.5 h-3.5" />
                            <span className="text-[7px] font-black uppercase">Flip H</span>
                        </button>
                        <button onClick={() => setFlipV(!flipV)} className={`p-2 rounded-lg border transition-all flex flex-col items-center gap-1 ${flipV ? 'bg-indigo-50 border-indigo-200 text-indigo-700' : 'bg-white border-gray-100 text-gray-600'}`}>
                            <FlipVertical className="w-3.5 h-3.5" />
                            <span className="text-[7px] font-black uppercase">Flip V</span>
                        </button>
                        <button onClick={() => setRotation((rotation + 90) % 360)} className="p-2 bg-white border border-gray-100 hover:border-indigo-100 rounded-lg transition-all flex flex-col items-center gap-1 text-gray-600">
                            <RotateCcw className="w-3.5 h-3.5" />
                            <span className="text-[7px] font-black uppercase">Rotate</span>
                        </button>
                        <button
                            onClick={() => setShowPresets(!showPresets)}
                            className={`p-2 rounded-lg border transition-all flex flex-col items-center gap-1 ${showPresets ? 'bg-amber-50 border-amber-200 text-amber-700' : 'bg-white border-gray-100 text-gray-600'}`}>
                            <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                            <span className="text-[7px] font-black uppercase">Filter</span>
                        </button>
                    </div>

                    <AnimatePresence>
                        {showPresets && (
                            <motion.div
                                initial={{ height: 0, opacity: 0 }}
                                animate={{ height: 'auto', opacity: 1 }}
                                exit={{ height: 0, opacity: 0 }}
                                className="overflow-hidden"
                            >
                                <div className="flex gap-1 overflow-x-auto pb-1 custom-scrollbar">
                                    {[
                                        { id: 'vivid', name: 'Vivid', color: 'bg-orange-100' },
                                        { id: 'mono', name: 'Mono', color: 'bg-gray-200' },
                                        { id: 'sepia', name: 'Sepia', color: 'bg-yellow-100' },
                                        { id: 'cool', name: 'Cool', color: 'bg-blue-100' },
                                    ].map(p => (
                                        <button
                                            key={p.id}
                                            onClick={() => applyPreset(p.id)}
                                            className="flex-shrink-0 px-2 py-1 rounded-md border border-gray-100 bg-white hover:border-indigo-200 transition-all flex items-center gap-1"
                                        >
                                            <div className={`w-2 h-2 rounded-full ${p.color}`} />
                                            <span className="text-[7px] font-bold uppercase">{p.name}</span>
                                        </button>
                                    ))}
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>

                    <div className="h-px bg-gray-50" />

                    {/* Sliders Area - 2 Column Layout */}
                    <div className="grid grid-cols-2 gap-x-4 gap-y-3">
                        {[
                            { label: 'Bright', val: brightness, set: setBrightness, icon: <Sun className="w-3 h-3 text-amber-500" />, min: 0, max: 200 },
                            { label: 'Contrast', val: contrast, set: setContrast, icon: <Contrast className="w-3 h-3 text-indigo-500" />, min: 0, max: 200 },
                            { label: 'Hue', val: hueShift, set: setHueShift, icon: <Palette className="w-3 h-3 text-pink-500" />, min: 0, max: 360, unit: '°' },
                            { label: 'Opacity', val: opacity, set: setOpacity, icon: <Blend className="w-3 h-3 text-cyan-500" />, min: 0, max: 100, unit: '%' },
                        ].map(s => (
                            <div key={s.label} className="space-y-1">
                                <div className="flex justify-between items-center text-[8px] font-bold uppercase tracking-wider text-gray-400">
                                    <span className="flex items-center gap-1">{s.icon}{s.label}</span>
                                    <span className="text-gray-900 font-mono">{s.val}{s.unit || '%'}</span>
                                </div>
                                <input
                                    type="range"
                                    min={s.min}
                                    max={s.max}
                                    value={s.val}
                                    onChange={e => s.set(parseInt(e.target.value))}
                                    className="w-full h-1 bg-gray-100 rounded-full appearance-none accent-indigo-600 cursor-pointer"
                                />
                            </div>
                        ))}
                    </div>

                    <div className="h-px bg-gray-100" />

                    <div className="h-px bg-gray-100" />

                    {/* Bottom Actions Area - High Density */}
                    <div className="space-y-2">
                        <div className="grid grid-cols-2 gap-2">
                            <button onClick={resetFilters} className="p-2.5 bg-gray-50 text-gray-600 rounded-lg flex items-center justify-center gap-1.5 hover:bg-gray-100 transition-all font-black uppercase text-[8px] border border-gray-100">
                                <RotateCcw className="w-3 h-3" />
                                Reset
                            </button>
                            <button onClick={() => handleSave('saveAs')} className="p-2.5 bg-white text-gray-700 border border-gray-100 rounded-lg flex items-center justify-center gap-1.5 hover:bg-gray-50 transition-all font-black uppercase text-[8px]">
                                <FilePlus className="w-3 h-3 text-indigo-500" />
                                Duplicate
                            </button>
                        </div>

                        <button onClick={() => handleSave('save')} className="w-full p-2.5 bg-indigo-600 text-white rounded-lg flex items-center justify-center gap-2 hover:bg-indigo-700 transition-all font-black uppercase text-[8px] shadow-sm shadow-indigo-100">
                            <Save className="w-3.5 h-3.5" />
                            Apply Changes
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
