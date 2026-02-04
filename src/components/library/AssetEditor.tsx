import React, { useRef, useState, useEffect, useCallback } from 'react';
import { X, Save, Pen, Eraser, ZoomIn, ZoomOut, Sun, Maximize, FilePlus, Palette, Crop, Check, Pipette } from 'lucide-react';

interface Props {
    imageUrl: string;
    onSave: (blob: Blob, mode: 'save' | 'saveAs') => void;
    onClose: () => void;
}

interface Point {
    x: number;
    y: number;
}

const AssetEditor: React.FC<Props> = ({ imageUrl, onSave, onClose }) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [color, setColor] = useState('#000000');
    const [brushSize, setBrushSize] = useState(5);
    const [isEraser, setIsEraser] = useState(false);
    const [isDrawing, setIsDrawing] = useState(false);
    const [isSaving, setIsSaving] = useState(false);

    // States
    const [saturation, setSaturation] = useState(100);
    const [zoom, setZoom] = useState(1.0);
    const [showSaveOptions, setShowSaveOptions] = useState(false);

    // Mode States
    const [isCropMode, setIsCropMode] = useState(false);
    const [isPickerMode, setIsPickerMode] = useState(false);

    // Cropping States
    const [cropPoints, setCropPoints] = useState<Point[]>([]);
    const [dragState, setDragState] = useState<{
        type: 'move' | 'resize';
        pointIndex?: number;
        startX: number;
        startY: number;
        startPoints: Point[];
    } | null>(null);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.src = imageUrl;
        img.onload = () => {
            const maxWidth = 800;
            const maxHeight = 800;
            let width = img.width;
            let height = img.height;

            if (width > maxWidth) {
                height = (maxWidth / width) * height;
                width = maxWidth;
            }
            if (height > maxHeight) {
                width = (maxHeight / height) * width;
                height = maxHeight;
            }

            canvas.width = width;
            canvas.height = height;
            ctx.drawImage(img, 0, 0, width, height);

            // Initialize 16 points along the edges
            const points: Point[] = [
                { x: 0, y: 0 },          // NW
                { x: width * 0.25, y: 0 }, // N1
                { x: width * 0.5, y: 0 },  // N2
                { x: width * 0.75, y: 0 }, // N3
                { x: width, y: 0 },       // NE
                { x: width, y: height * 0.25 }, // E1
                { x: width, y: height * 0.5 },  // E2
                { x: width, y: height * 0.75 }, // E3
                { x: width, y: height },        // SE
                { x: width * 0.75, y: height }, // S1
                { x: width * 0.5, y: height },  // S2
                { x: width * 0.25, y: height }, // S3
                { x: 0, y: height },          // SW
                { x: 0, y: height * 0.75 },   // W1
                { x: 0, y: height * 0.5 },    // W2
                { x: 0, y: height * 0.25 }    // W3
            ];
            setCropPoints(points);
        };
    }, [imageUrl]);

    const getCanvasPos = useCallback((e: React.MouseEvent | React.TouchEvent | MouseEvent | TouchEvent) => {
        const canvas = canvasRef.current;
        if (!canvas) return { x: 0, y: 0 };
        const rect = canvas.getBoundingClientRect();

        let clientX, clientY;
        if ('touches' in e) {
            clientX = (e as TouchEvent).touches[0].clientX;
            clientY = (e as TouchEvent).touches[0].clientY;
        } else {
            clientX = (e as MouseEvent).clientX;
            clientY = (e as MouseEvent).clientY;
        }

        return {
            x: (clientX - rect.left) / zoom,
            y: (clientY - rect.top) / zoom
        };
    }, [zoom]);

    const pickColor = (e: React.MouseEvent | React.TouchEvent) => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d', { willReadFrequently: true });
        if (!ctx) return;

        const pos = getCanvasPos(e);
        const x = Math.max(0, Math.min(canvas.width - 1, pos.x));
        const y = Math.max(0, Math.min(canvas.height - 1, pos.y));

        try {
            const pixel = ctx.getImageData(x, y, 1, 1).data;
            const hex = "#" + ("000000" + ((pixel[0] << 16) | (pixel[1] << 8) | pixel[2]).toString(16)).slice(-6);
            setColor(hex);
            setIsPickerMode(false);
            setIsEraser(false);
        } catch (err) {
            console.error("Error picking color:", err);
        }
    };

    const startDrawing = (e: React.MouseEvent | React.TouchEvent) => {
        if (isCropMode) return;
        if (isPickerMode) {
            pickColor(e);
            return;
        }

        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d', { willReadFrequently: true });
        if (!ctx) return;

        setIsDrawing(true);
        const pos = getCanvasPos(e);
        ctx.beginPath();
        ctx.moveTo(pos.x, pos.y);
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.strokeStyle = color;
        ctx.lineWidth = brushSize;
        ctx.globalCompositeOperation = isEraser ? 'destination-out' : 'source-over';
    };

    const draw = (e: React.MouseEvent | React.TouchEvent) => {
        if (!isDrawing || isCropMode || isPickerMode) return;
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const pos = getCanvasPos(e);
        ctx.lineTo(pos.x, pos.y);
        ctx.stroke();
    };

    const stopDrawing = () => {
        setIsDrawing(false);
    };

    const handleCropMouseDown = (e: React.MouseEvent, type: 'move' | 'resize', index?: number) => {
        if (cropPoints.length === 0) return;
        e.stopPropagation();
        const pos = getCanvasPos(e);
        setDragState({
            type,
            pointIndex: index,
            startX: pos.x,
            startY: pos.y,
            startPoints: [...cropPoints].map(p => ({ ...p }))
        });
    };

    const handleMouseMove = useCallback((e: MouseEvent) => {
        if (!dragState || cropPoints.length === 0 || !canvasRef.current) return;

        const pos = getCanvasPos(e);
        const dx = pos.x - dragState.startX;
        const dy = pos.y - dragState.startY;

        const canvas = canvasRef.current;
        const newPoints = [...dragState.startPoints].map(p => ({ ...p }));

        if (dragState.type === 'move') {
            newPoints.forEach(p => {
                p.x = Math.max(0, Math.min(canvas.width, p.x + dx));
                p.y = Math.max(0, Math.min(canvas.height, p.y + dy));
            });
        } else if (dragState.type === 'resize' && dragState.pointIndex !== undefined) {
            const idx = dragState.pointIndex;
            newPoints[idx].x = Math.max(0, Math.min(canvas.width, dragState.startPoints[idx].x + dx));
            newPoints[idx].y = Math.max(0, Math.min(canvas.height, dragState.startPoints[idx].y + dy));
        }
        setCropPoints(newPoints);
    }, [dragState, cropPoints, getCanvasPos]);

    const handleMouseUp = useCallback(() => {
        setDragState(null);
    }, []);

    useEffect(() => {
        if (dragState) {
            window.addEventListener('mousemove', handleMouseMove);
            window.addEventListener('mouseup', handleMouseUp);
        }
        return () => {
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('mouseup', handleMouseUp);
        };
    }, [dragState, handleMouseMove, handleMouseUp]);

    const applyCrop = () => {
        if (cropPoints.length === 0 || !canvasRef.current) return;
        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        // Find bounding box
        const minX = Math.min(...cropPoints.map(p => p.x));
        const minY = Math.min(...cropPoints.map(p => p.y));
        const maxX = Math.max(...cropPoints.map(p => p.x));
        const maxY = Math.max(...cropPoints.map(p => p.y));
        const width = maxX - minX;
        const height = maxY - minY;

        if (width <= 0 || height <= 0) return;

        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = width;
        tempCanvas.height = height;
        const tempCtx = tempCanvas.getContext('2d');
        if (!tempCtx) return;

        // Draw clipped image
        tempCtx.beginPath();
        tempCtx.moveTo(cropPoints[0].x - minX, cropPoints[0].y - minY);
        for (let i = 1; i < cropPoints.length; i++) {
            tempCtx.lineTo(cropPoints[i].x - minX, cropPoints[i].y - minY);
        }
        tempCtx.closePath();
        tempCtx.clip();

        tempCtx.drawImage(
            canvas,
            minX, minY, width, height,
            0, 0, width, height
        );

        canvas.width = width;
        canvas.height = height;
        ctx.drawImage(tempCanvas, 0, 0);

        // Reset points to new full canvas
        const newPoints: Point[] = [
            { x: 0, y: 0 }, { x: width * 0.25, y: 0 }, { x: width * 0.5, y: 0 }, { x: width * 0.75, y: 0 }, { x: width, y: 0 },
            { x: width, y: height * 0.25 }, { x: width, y: height * 0.5 }, { x: width, y: height * 0.75 }, { x: width, y: height },
            { x: width * 0.75, y: height }, { x: width * 0.5, y: height }, { x: width * 0.25, y: height }, { x: 0, y: height },
            { x: 0, y: height * 0.75 }, { x: 0, y: height * 0.5 }, { x: 0, y: height * 0.25 }
        ];
        setCropPoints(newPoints);
        setIsCropMode(false);
    };

    const handleSave = (mode: 'save' | 'saveAs' = 'save') => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        setIsSaving(true);
        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = canvas.width;
        tempCanvas.height = canvas.height;
        const tempCtx = tempCanvas.getContext('2d');

        if (tempCtx) {
            tempCtx.filter = `saturate(${saturation}%)`;
            tempCtx.drawImage(canvas, 0, 0);
            tempCanvas.toBlob((blob) => {
                if (blob) onSave(blob, mode);
                setIsSaving(false);
                setShowSaveOptions(false);
            }, 'image/png');
        } else {
            canvas.toBlob((blob) => {
                if (blob) onSave(blob, mode);
                setIsSaving(false);
                setShowSaveOptions(false);
            }, 'image/png');
        }
    };

    // 16 Handle Points: 4 corners + 4 centers + 8 intermediate (25/75%)
    const getPolygonPoints = () => {
        return cropPoints.map(p => `${p.x},${p.y}`).join(' ');
    };

    return (
        <div style={{
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
            background: 'rgba(15, 23, 42, 0.9)', backdropFilter: 'blur(8px)',
            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
            zIndex: 2000, padding: '1rem'
        }}>
            <div className="glass-panel" style={{
                background: 'white', borderRadius: '24px', padding: '1.25rem',
                display: 'flex', flexDirection: 'column', gap: '1rem', width: '95vw', maxWidth: '1000px', height: '90vh'
            }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        <div style={{ background: 'linear-gradient(135deg, #6366f1, #a855f7)', padding: '8px', borderRadius: '12px', color: 'white' }}>
                            <Palette size={20} />
                        </div>
                        <h2 style={{ margin: 0, fontSize: '1.25rem', fontWeight: '800' }}>Asset Paint Editor</h2>
                    </div>
                    <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b' }}>
                        <X size={24} />
                    </button>
                </div>

                <div style={{
                    display: 'flex', flexWrap: 'wrap', gap: '1rem', background: '#f8fafc',
                    padding: '0.75rem', borderRadius: '16px', border: '1px solid #e2e8f0', alignItems: 'center'
                }}>
                    {!isCropMode ? (
                        <>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                <span title="Brush Color"><Pen size={14} color="#64748b" /></span>
                                <input type="color" value={color} onChange={(e) => { setColor(e.target.value); setIsEraser(false); }}
                                    style={{ border: 'none', width: '30px', height: '30px', cursor: 'pointer', borderRadius: '4px' }} />
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                <label title="Brush Size" style={{ fontSize: '0.75rem', fontWeight: '600' }}>Size</label>
                                <input type="range" min="1" max="50" value={brushSize} onChange={(e) => setBrushSize(parseInt(e.target.value))}
                                    style={{ width: '80px' }} />
                            </div>
                            <div style={{ width: '1px', background: '#e2e8f0', height: '24px' }} />
                            <div style={{ display: 'flex', gap: '0.25rem' }}>
                                <button
                                    onClick={() => { setIsEraser(false); setIsPickerMode(false); }}
                                    title="Pen Tool"
                                    style={{
                                        padding: '0.5rem', borderRadius: '8px', border: 'none',
                                        background: (!isEraser && !isPickerMode) ? '#6366f1' : 'transparent',
                                        color: (!isEraser && !isPickerMode) ? 'white' : '#64748b', cursor: 'pointer'
                                    }}
                                ><Pen size={18} /></button>
                                <button
                                    onClick={() => { setIsEraser(true); setIsPickerMode(false); }}
                                    title="Eraser Tool"
                                    style={{
                                        padding: '0.5rem', borderRadius: '8px', border: 'none',
                                        background: (isEraser && !isPickerMode) ? '#6366f1' : 'transparent',
                                        color: (isEraser && !isPickerMode) ? 'white' : '#64748b', cursor: 'pointer'
                                    }}
                                ><Eraser size={18} /></button>
                                <button
                                    onClick={() => { setIsPickerMode(!isPickerMode); setIsEraser(false); }}
                                    title="Color Picker (Eyedropper)"
                                    style={{
                                        padding: '0.5rem', borderRadius: '8px', border: 'none',
                                        background: isPickerMode ? '#6366f1' : 'transparent',
                                        color: isPickerMode ? 'white' : '#64748b', cursor: 'pointer'
                                    }}
                                ><Pipette size={18} /></button>
                            </div>
                        </>
                    ) : (
                        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                            <span style={{ fontSize: '0.85rem', fontWeight: '700', color: '#6366f1' }}>PRECISION CROP MODE (16 Handles)</span>
                            <button onClick={applyCrop} style={{
                                display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.4rem 1rem', background: '#6366f1', color: 'white',
                                borderRadius: '8px', border: 'none', cursor: 'pointer', fontWeight: '600'
                            }}><Check size={16} /> Apply Crop</button>
                            <button onClick={() => setIsCropMode(false)} style={{
                                padding: '0.4rem 1rem', background: 'transparent', color: '#64748b', borderRadius: '8px', border: '1px solid #e2e8f0',
                                cursor: 'pointer', fontWeight: '600'
                            }}>Cancel</button>
                        </div>
                    )}

                    <div style={{ width: '1px', background: '#e2e8f0', height: '24px' }} />

                    {!isCropMode && (
                        <button
                            onClick={() => { setIsCropMode(true); setIsPickerMode(false); }}
                            title="Crop Tool"
                            style={{ padding: '0.5rem', borderRadius: '8px', border: 'none', background: 'transparent', color: '#64748b', cursor: 'pointer' }}
                            onMouseOver={(e) => e.currentTarget.style.background = '#f1f5f9'}
                            onMouseOut={(e) => e.currentTarget.style.background = 'transparent'}
                        ><Crop size={18} /></button>
                    )}

                    {!isCropMode && <div style={{ width: '1px', background: '#e2e8f0', height: '24px' }} />}

                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <span title="Saturation"><Sun size={18} color="#64748b" /></span>
                        <input type="range" min="0" max="200" value={saturation} onChange={(e) => setSaturation(parseInt(e.target.value))} style={{ width: '100px' }} />
                        <span style={{ fontSize: '0.7rem', color: '#64748b', minWidth: '30px' }}>{saturation}%</span>
                    </div>

                    <div style={{ width: '1px', background: '#e2e8f0', height: '24px' }} />

                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                        <button onClick={() => setZoom(Math.max(0.5, zoom - 0.2))} style={{ padding: '0.4rem', background: 'transparent', border: '1px solid #e2e8f0', borderRadius: '6px', cursor: 'pointer' }}><ZoomOut size={16} /></button>
                        <span style={{ fontSize: '0.75rem', fontWeight: '700', color: '#64748b', minWidth: '40px', textAlign: 'center' }}>{Math.round(zoom * 100)}%</span>
                        <button onClick={() => setZoom(Math.min(5, zoom + 0.2))} style={{ padding: '0.4rem', background: 'transparent', border: '1px solid #e2e8f0', borderRadius: '6px', cursor: 'pointer' }}><ZoomIn size={16} /></button>
                        <button onClick={() => setZoom(1.0)} title="Reset Zoom" style={{ padding: '0.4rem', background: 'transparent', border: 'none', color: '#64748b', cursor: 'pointer' }}><Maximize size={16} /></button>
                    </div>
                </div>

                <div style={{
                    flex: 1, border: '2px solid #f1f5f9', borderRadius: '12px', overflow: 'auto', background: '#f8fafc',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: isPickerMode ? 'copy' : 'crosshair', position: 'relative'
                }}>
                    <div style={{
                        transform: `scale(${zoom})`, transition: dragState ? 'none' : 'transform 0.1s ease-out',
                        transformOrigin: 'center', filter: `saturate(${saturation}%)`, position: 'relative'
                    }}>
                        <canvas
                            ref={canvasRef}
                            onMouseDown={startDrawing}
                            onMouseMove={draw}
                            onMouseUp={stopDrawing}
                            onMouseLeave={stopDrawing}
                            onTouchStart={startDrawing}
                            onTouchMove={draw}
                            onTouchEnd={stopDrawing}
                            style={{ display: 'block', maxWidth: 'none', maxHeight: 'none' }}
                        />

                        {isCropMode && cropPoints.length > 0 && (
                            <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', pointerEvents: 'none' }}>
                                <svg style={{ width: '100%', height: '100%', position: 'absolute' }}>
                                    <defs>
                                        <mask id="cropMask">
                                            <rect width="100%" height="100%" fill="white" />
                                            <polygon points={getPolygonPoints()} fill="black" />
                                        </mask>
                                    </defs>
                                    <rect width="100%" height="100%" fill="rgba(0,0,0,0.5)" mask="url(#cropMask)" />
                                    <polygon
                                        points={getPolygonPoints()}
                                        fill="rgba(99, 102, 241, 0.05)"
                                        stroke="#6366f1"
                                        strokeWidth="2"
                                        strokeDasharray="4 2"
                                        style={{ cursor: 'move', pointerEvents: 'auto' }}
                                        onMouseDown={(e) => handleCropMouseDown(e as any, 'move')}
                                    />
                                </svg>
                                {cropPoints.map((p, idx) => (
                                    <div
                                        key={idx}
                                        onMouseDown={(e) => handleCropMouseDown(e, 'resize', idx)}
                                        style={{
                                            position: 'absolute',
                                            width: '10px', height: '10px',
                                            background: '#6366f1',
                                            border: '1px solid white',
                                            borderRadius: '50%',
                                            pointerEvents: 'auto',
                                            cursor: 'crosshair',
                                            top: p.y,
                                            left: p.x,
                                            transform: 'translate(-50%, -50%)',
                                            zIndex: 10
                                        }}
                                    />
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem', position: 'relative' }}>
                    <button onClick={onClose} style={{ padding: '0.75rem 1.5rem', borderRadius: '12px', border: '1px solid #e2e8f0', background: 'white', fontWeight: '600', cursor: 'pointer' }}>Cancel</button>
                    <div style={{ position: 'relative' }}>
                        <button onClick={() => setShowSaveOptions(!showSaveOptions)} disabled={isSaving || isCropMode} style={{
                            padding: '0.75rem 1.5rem', borderRadius: '12px', border: 'none', background: 'linear-gradient(to right, #6366f1, #a855f7)', color: 'white',
                            fontWeight: '700', cursor: (isSaving || isCropMode) ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem',
                            boxShadow: '0 4px 12px rgba(99, 102, 241, 0.3)', opacity: (isSaving || isCropMode) ? 0.7 : 1
                        }}>
                            <Save size={18} /> {isSaving ? 'Processing...' : 'Save Options'}
                        </button>

                        {showSaveOptions && (
                            <div className="glass-panel" style={{
                                position: 'absolute', bottom: '100%', right: 0, marginBottom: '0.75rem', background: 'white', border: '1px solid #e2e8f0', borderRadius: '16px',
                                padding: '0.5rem', minWidth: '180px', display: 'flex', flexDirection: 'column', gap: '0.25rem', zIndex: 10, boxShadow: '0 10px 25px rgba(0,0,0,0.1)'
                            }}>
                                <button onClick={() => handleSave('save')} className="menu-item" style={{
                                    display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.75rem 1rem', background: 'transparent', border: 'none',
                                    cursor: 'pointer', borderRadius: '10px', textAlign: 'left', width: '100%', fontWeight: '600', color: '#1e293b'
                                }} onMouseOver={(e) => e.currentTarget.style.background = '#f1f5f9'} onMouseOut={(e) => e.currentTarget.style.background = 'transparent'}>
                                    <Save size={16} color="#6366f1" /> Overwrite Existing
                                </button>
                                <button onClick={() => handleSave('saveAs')} className="menu-item" style={{
                                    display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.75rem 1rem', background: 'transparent', border: 'none',
                                    cursor: 'pointer', borderRadius: '10px', textAlign: 'left', width: '100%', fontWeight: '600', color: '#1e293b'
                                }} onMouseOver={(e) => e.currentTarget.style.background = '#f1f5f9'} onMouseOut={(e) => e.currentTarget.style.background = 'transparent'}>
                                    <FilePlus size={16} color="#a855f7" /> Save as New Asset
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AssetEditor;
