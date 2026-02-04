import React, { useState, useRef, useEffect } from 'react';
import { Stage, Layer, Image as KonvaImage, Line } from 'react-konva';
import { X, Upload, Save, Eraser, RotateCcw, Image as ImageIcon, Book } from 'lucide-react';
import Konva from 'konva';
import { usePlannerStore } from '../../store/plannerStore';

// PDF.js for PDF to Image conversion
import * as pdfjsLib from 'pdfjs-dist';
// Use the same worker source as fixed previously
pdfjsLib.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.mjs`;

interface CoverEditorModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (blob: Blob) => Promise<void>;
    initialCoverUrl?: string; // If editing existing
}

type Tab = 'tools' | 'library';

export function CoverEditorModal({ isOpen, onClose, onSave, initialCoverUrl }: CoverEditorModalProps) {
    const { fetchLibraryAssets, libraryAssets, isLoadingAssets } = usePlannerStore();
    const [activeTab, setActiveTab] = useState<Tab>('tools');
    const [imageObj, setImageObj] = useState<HTMLImageElement | null>(null);
    const [brightness, setBrightness] = useState(0);
    const [hue, setHue] = useState(0);
    const [isEraser, setIsEraser] = useState(false);
    const [eraserLines, setEraserLines] = useState<any[]>([]);
    const [isDrawing, setIsDrawing] = useState(false);

    // For storing PDF pages if uploaded
    const [pdfPages, setPdfPages] = useState<string[]>([]);
    const [showPdfSelection, setShowPdfSelection] = useState(false);

    const stageRef = useRef<Konva.Stage>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const imageRef = useRef<Konva.Image>(null);

    // Initial load
    useEffect(() => {
        if (initialCoverUrl) {
            const img = new Image();
            img.crossOrigin = 'Anonymous';
            img.src = initialCoverUrl;
            img.onload = () => setImageObj(img);
        }
    }, [initialCoverUrl]);

    // Apply filters via caching
    useEffect(() => {
        if (imageRef.current && imageObj) {
            imageRef.current.cache();
            imageRef.current.getLayer()?.batchDraw();
        }
    }, [imageObj, brightness, hue]);

    // Fetch library assets when tab is activated
    useEffect(() => {
        if (isOpen && activeTab === 'library') {
            fetchLibraryAssets('cover');
        }
    }, [isOpen, activeTab, fetchLibraryAssets]);

    // Canvas Dimensions (A4 Ratio or customizable?) - Card is roughly 3:4 or A4
    const width = 400;
    const height = 540; // Approx A4 ratio scaled down

    const loadCoverImage = (url: string) => {
        const img = new Image();
        img.crossOrigin = 'Anonymous';
        img.src = url;
        img.onload = () => {
            setImageObj(img);
            setEraserLines([]); // Reset eraser on new image
        };
    };

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        if (file.type === 'application/pdf') {
            await processPdf(file);
        } else {
            const reader = new FileReader();
            reader.onload = (event) => {
                const result = event.target?.result as string;
                loadCoverImage(result);
            };
            reader.readAsDataURL(file);
        }
    };

    const processPdf = async (file: File) => {
        try {
            const arrayBuffer = await file.arrayBuffer();
            const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;

            const pages: string[] = [];

            // Limit to first 5 pages to avoid memory issues for now
            const pageCount = Math.min(pdf.numPages, 5);

            for (let i = 1; i <= pageCount; i++) {
                const page = await pdf.getPage(i);
                const viewport = page.getViewport({ scale: 1.0 });
                const canvas = document.createElement('canvas');
                const context = canvas.getContext('2d');
                canvas.height = viewport.height;
                canvas.width = viewport.width;

                if (context) {
                    await page.render({ canvasContext: context, viewport }).promise;
                    pages.push(canvas.toDataURL('image/png'));
                }
            }
            setPdfPages(pages);
            setShowPdfSelection(true);
        } catch (error) {
            console.error("Error processing PDF", error);
            alert("Failed to load PDF");
        }
    };

    const selectPdfPage = (url: string) => {
        loadCoverImage(url);
        setShowPdfSelection(false);
    };

    // Drawing Eraser Logic
    const handleMouseDown = (e: any) => {
        if (!isEraser) return;
        setIsDrawing(true);
        const pos = e.target.getStage().getPointerPosition();
        setEraserLines([...eraserLines, { points: [pos.x, pos.y] }]);
    };

    const handleMouseMove = (e: any) => {
        if (!isDrawing || !isEraser) return;
        const stage = e.target.getStage();
        const point = stage.getPointerPosition();
        const lastLine = eraserLines[eraserLines.length - 1];
        lastLine.points = lastLine.points.concat([point.x, point.y]);
        eraserLines.splice(eraserLines.length - 1, 1, lastLine);
        setEraserLines(eraserLines.concat());
    };

    const handleMouseUp = () => {
        setIsDrawing(false);
    };

    const handleSave = async () => {
        if (!stageRef.current) return;

        // Export stage
        const dataUrl = stageRef.current.toDataURL({ pixelRatio: 2 });
        const res = await fetch(dataUrl);
        const blob = await res.blob();

        await onSave(blob);
    };

    if (!isOpen) return null;

    if (showPdfSelection) {
        return (
            <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[100] flex items-center justify-center">
                <div className="bg-white rounded-2xl p-6 max-w-4xl w-full max-h-[90vh] overflow-y-auto">
                    <div className="flex justify-between items-center mb-6">
                        <h3 className="text-xl font-bold">Select a Page for Cover</h3>
                        <button onClick={() => setShowPdfSelection(false)}><X /></button>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                        {pdfPages.map((page, i) => (
                            <div key={i} className="cursor-pointer border-2 hover:border-indigo-500 rounded-lg p-2" onClick={() => selectPdfPage(page)}>
                                <img src={page} alt={`Page ${i + 1}`} className="w-full h-auto shadow-sm" />
                                <div className="text-center mt-2 font-medium">Page {i + 1}</div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl overflow-hidden shadow-2xl flex flex-col md:flex-row w-full max-w-6xl h-[90vh]">

                {/* Canvas Area */}
                <div className="flex-1 bg-gray-100 flex items-center justify-center relative p-8">
                    {!imageObj ? (
                        <div className="text-center">
                            <div className="flex gap-4 justify-center">
                                <button
                                    onClick={() => fileInputRef.current?.click()}
                                    className="px-6 py-3 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 flex items-center gap-2"
                                >
                                    <Upload size={20} /> Upload Image/PDF
                                </button>
                                <button
                                    onClick={() => setActiveTab('library')}
                                    className="px-6 py-3 bg-white text-indigo-600 border border-gray-200 rounded-xl font-bold hover:bg-gray-50 flex items-center gap-2"
                                >
                                    <Book size={20} /> Select from Library
                                </button>
                            </div>
                            <p className="mt-4 text-gray-400 text-sm">Supports JPG, PNG, PDF</p>
                        </div>
                    ) : (
                        <div className="relative shadow-2xl">
                            <Stage
                                width={width}
                                height={height}
                                ref={stageRef}
                                onMouseDown={handleMouseDown}
                                onMousemove={handleMouseMove}
                                onMouseup={handleMouseUp}
                                className="bg-white"
                            >
                                <Layer>
                                    {/* Background Image with Filters */}
                                    <KonvaImage
                                        ref={imageRef}
                                        image={imageObj}
                                        width={width}
                                        height={height}
                                        filters={[Konva.Filters.Brighten, Konva.Filters.HSL]}
                                        brightness={brightness}
                                        hue={hue}
                                    // fit="cover" - Custom logic needed for fit, scaling to fill for now
                                    />

                                    {/* Eraser Lines (destination-out composite) */}
                                    {eraserLines.map((line, i) => (
                                        <Line
                                            key={i}
                                            points={line.points}
                                            stroke="#000000"
                                            strokeWidth={20}
                                            tension={0.5}
                                            lineCap="round"
                                            lineJoin="round"
                                            globalCompositeOperation="destination-out"
                                        />
                                    ))}
                                </Layer>
                            </Stage>
                        </div>
                    )}

                    <input
                        type="file"
                        ref={fileInputRef}
                        onChange={handleFileChange}
                        accept="image/*,application/pdf"
                        className="hidden"
                    />
                </div>

                {/* Sidebar Controls */}
                <div className="w-full md:w-96 bg-white border-l border-gray-100 flex flex-col">
                    <div className="p-6 border-b border-gray-100 flex justify-between items-center">
                        <h2 className="text-lg font-bold flex items-center gap-2">
                            <ImageIcon className="text-indigo-600" />
                            Cover Editor
                        </h2>
                        <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full">
                            <X size={20} className="text-gray-400" />
                        </button>
                    </div>

                    {/* Tabs */}
                    <div className="flex border-b border-gray-100">
                        <button
                            className={`flex-1 py-3 text-sm font-bold ${activeTab === 'tools' ? 'text-indigo-600 border-b-2 border-indigo-600' : 'text-gray-500 hover:text-gray-700'}`}
                            onClick={() => setActiveTab('tools')}
                        >
                            Tools
                        </button>
                        <button
                            className={`flex-1 py-3 text-sm font-bold ${activeTab === 'library' ? 'text-indigo-600 border-b-2 border-indigo-600' : 'text-gray-500 hover:text-gray-700'}`}
                            onClick={() => setActiveTab('library')}
                        >
                            Library
                        </button>
                    </div>

                    <div className="p-6 flex-1 overflow-y-auto">

                        {activeTab === 'library' ? (
                            <div className="space-y-4">
                                <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest">Your Covers</h3>
                                {isLoadingAssets ? (
                                    <div className="text-center py-8 text-gray-400">Loading library...</div>
                                ) : libraryAssets.length === 0 ? (
                                    <div className="text-center py-8 text-gray-400">No cover assets found.</div>
                                ) : (
                                    <div className="grid grid-cols-2 gap-3">
                                        {libraryAssets.filter(a => a.type === 'cover').map(asset => (
                                            <div
                                                key={asset.id}
                                                className="cursor-pointer group relative aspect-[3/4] rounded-lg overflow-hidden border border-gray-100 hover:shadow-md transition-all"
                                                onClick={() => loadCoverImage(asset.url)}
                                            >
                                                <img src={asset.url} alt={asset.title} className="w-full h-full object-cover" />
                                                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors" />
                                                <div className="absolute bottom-0 left-0 right-0 p-2 bg-gradient-to-t from-black/60 to-transparent text-white text-xs opacity-0 group-hover:opacity-100 transition-opacity truncate">
                                                    {asset.title}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        ) : (
                            <div className="space-y-8">
                                {/* Tools */}
                                <div>
                                    <label className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-4 block">Tools</label>
                                    <div className="flex gap-2">
                                        <button
                                            onClick={() => fileInputRef.current?.click()}
                                            className="flex-1 py-3 px-4 bg-gray-50 border border-gray-200 rounded-xl text-sm font-bold text-gray-700 hover:bg-gray-100 hover:border-indigo-300 transition-all"
                                        >
                                            Replace Image
                                        </button>
                                        <button
                                            onClick={() => {
                                                setIsEraser(!isEraser);
                                            }}
                                            className={`flex-1 py-3 px-4 border rounded-xl text-sm font-bold transition-all flex items-center justify-center gap-2 ${isEraser
                                                ? 'bg-indigo-600 text-white border-indigo-600'
                                                : 'bg-gray-50 border-gray-200 text-gray-700 hover:bg-gray-100'}`}
                                        >
                                            <Eraser size={16} />
                                            {isEraser ? 'Erasing...' : 'Eraser'}
                                        </button>
                                    </div>
                                    {isEraser && <p className="text-xs text-gray-400 mt-2">Draw on the canvas to transparently erase parts of the image (e.g. background).</p>}
                                </div>

                                {/* Adjustments */}
                                {imageObj && (
                                    <div className="space-y-6">
                                        <label className="text-xs font-bold text-gray-400 uppercase tracking-widest block">Adjustments</label>

                                        <div>
                                            <div className="flex justify-between mb-2">
                                                <span className="text-sm font-medium text-gray-700">Brightness</span>
                                                <span className="text-xs font-bold text-gray-400">{Math.round(brightness * 100)}%</span>
                                            </div>
                                            <input
                                                type="range"
                                                min="-1"
                                                max="1"
                                                step="0.05"
                                                value={brightness}
                                                onChange={(e) => setBrightness(parseFloat(e.target.value))}
                                                className="w-full accent-indigo-600 h-2 bg-gray-100 rounded-lg appearance-none cursor-pointer"
                                            />
                                        </div>

                                        <div>
                                            <div className="flex justify-between mb-2">
                                                <span className="text-sm font-medium text-gray-700">Hue</span>
                                                <span className="text-xs font-bold text-gray-400">{Math.round(hue)}°</span>
                                            </div>
                                            <input
                                                type="range"
                                                min="0"
                                                max="360"
                                                value={hue}
                                                onChange={(e) => setHue(parseInt(e.target.value))}
                                                className="w-full accent-indigo-600 h-2 bg-gray-100 rounded-lg appearance-none cursor-pointer"
                                            />
                                        </div>

                                        <button
                                            onClick={() => { setBrightness(0); setHue(0); setEraserLines([]); }}
                                            className="text-xs font-bold text-indigo-600 flex items-center gap-1 hover:text-indigo-700"
                                        >
                                            <RotateCcw size={12} /> Reset Edits
                                        </button>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>

                    <div className="p-6 border-t border-gray-100 bg-gray-50">
                        <button
                            onClick={handleSave}
                            disabled={!imageObj}
                            className={`w-full py-4 rounded-xl font-bold flex items-center justify-center gap-2 shadow-lg transition-all ${!imageObj ? 'bg-gray-200 text-gray-400 cursor-not-allowed' : 'bg-indigo-600 text-white hover:bg-indigo-700 hover:shadow-indigo-200 hover:-translate-y-1'}`}
                        >
                            <Save size={20} />
                            Save Cover
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
