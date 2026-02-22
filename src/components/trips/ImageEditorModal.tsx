import React, { useState, useRef, useEffect } from 'react';
import { Stage, Layer, Image as KonvaImage, Rect, Line, Text as KonvaText, Transformer, Group, Arrow, Circle } from 'react-konva';
import useImage from 'use-image';
import { X, Check, Undo, Type, MousePointer2, Eraser, Scissors, Palette, MapPin, ArrowUpRight } from 'lucide-react';

interface ImageEditorModalProps {
    isOpen: boolean;
    onClose: () => void;
    imageUrl: string;
    onSave: (editedImageUrl: string) => void;
}

const ImageEditorModal: React.FC<ImageEditorModalProps> = ({ isOpen, onClose, imageUrl, onSave }) => {
    const [image] = useImage(imageUrl, 'anonymous');
    const stageRef = useRef<any>(null);
    const [tool, setTool] = useState<'select' | 'pen' | 'text' | 'crop' | 'icon'>('select');
    const [color, setColor] = useState('#6366f1');
    const [thickness, setThickness] = useState(5);
    const [elements, setElements] = useState<any[]>([]);
    const [undoStack, setUndoStack] = useState<any[][]>([]);
    const [selectedId, setSelectedId] = useState<string | null>(null);
    const [isDrawing, setIsDrawing] = useState(false);
    const [fontFamily, setFontFamily] = useState('Inter, sans-serif');
    const [iconType, setIconType] = useState<'pin' | 'arrow'>('pin');

    // For Crop
    const [cropRect, setCropRect] = useState({ x: 50, y: 50, width: 200, height: 200 });
    const transformerRef = useRef<any>(null);
    const cropRectRef = useRef<any>(null);
    const elementTransformerRef = useRef<any>(null);

    // Stage dimensions
    const [stageSize, setStageSize] = useState({ width: 800, height: 600 });

    useEffect(() => {
        if (image) {
            const ratio = image.width / image.height;
            let width = 800;
            let height = 800 / ratio;
            if (height > 500) {
                height = 500;
                width = 500 * ratio;
            }
            setStageSize({ width, height });
            setCropRect({ x: 20, y: 20, width: width - 40, height: height - 40 });
        }
    }, [image]);

    useEffect(() => {
        if (tool === 'crop' && transformerRef.current && cropRectRef.current) {
            transformerRef.current.nodes([cropRectRef.current]);
            transformerRef.current.getLayer().batchDraw();
        }
    }, [tool]);

    useEffect(() => {
        if (selectedId && elementTransformerRef.current) {
            const selectedNode = stageRef.current.findOne('#' + selectedId);
            if (selectedNode) {
                elementTransformerRef.current.nodes([selectedNode]);
                elementTransformerRef.current.getLayer().batchDraw();
            }
        }
    }, [selectedId]);

    if (!isOpen) return null;

    const handleMouseDown = (e: any) => {
        if (tool === 'select') {
            const clickedOnEmpty = e.target === e.target.getStage();
            if (clickedOnEmpty) {
                setSelectedId(null);
            }
            return;
        }

        const pos = e.target.getStage().getPointerPosition();

        if (tool === 'pen') {
            setIsDrawing(true);
            setUndoStack(prev => [...prev, [...elements]]);
            setElements([...elements, {
                id: 'el-' + Date.now().toString(),
                type: 'line',
                points: [pos.x, pos.y],
                stroke: color,
                strokeWidth: thickness
            }]);
        } else if (tool === 'text') {
            const text = prompt('Enter text:');
            if (text) {
                setUndoStack(prev => [...prev, [...elements]]);
                setElements([...elements, {
                    id: 'el-' + Date.now().toString(),
                    type: 'text',
                    text,
                    x: pos.x,
                    y: pos.y,
                    fill: color,
                    fontSize: thickness * 4,
                    fontFamily: fontFamily
                }]);
            }
            setTool('select');
        } else if (tool === 'icon') {
            setUndoStack(prev => [...prev, [...elements]]);
            setElements([...elements, {
                id: 'el-' + Date.now().toString(),
                type: 'icon',
                iconType: iconType,
                x: pos.x,
                y: pos.y,
                fill: color,
                size: thickness * 5
            }]);
            setTool('select');
        }
    };

    const handleMouseMove = (e: any) => {
        if (!isDrawing || tool !== 'pen') return;

        const pos = e.target.getStage().getPointerPosition();
        const nextElements = [...elements];
        const lastLine = nextElements[nextElements.length - 1];
        lastLine.points = lastLine.points.concat([pos.x, pos.y]);
        setElements(nextElements);
    };

    const handleMouseUp = () => {
        setIsDrawing(false);
    };

    const handleUndo = () => {
        if (undoStack.length > 0) {
            const previous = undoStack[undoStack.length - 1];
            setElements(previous);
            setUndoStack(undoStack.slice(0, -1));
        }
    };

    const handleCropDrag = (idx: number, e: any) => {
        const stage = e.target.getStage();
        if (!stage) return;
        const pos = stage.getPointerPosition();
        if (!pos) return;

        const { x, y, width, height } = cropRect;
        const newRect = { ...cropRect };

        // 16 points: 0-3 Top, 4-7 Right, 8-11 Bottom, 12-15 Left
        if (idx < 4) { // Top
            newRect.y = pos.y;
            newRect.height = height + (y - pos.y);
            if (idx === 0) { newRect.x = pos.x; newRect.width = width + (x - pos.x); }
        } else if (idx < 8) { // Right
            newRect.width = pos.x - x;
            if (idx === 4) { newRect.y = pos.y; newRect.height = height + (y - pos.y); }
        } else if (idx < 12) { // Bottom
            newRect.height = pos.y - y;
            if (idx === 8) { newRect.width = pos.x - x; }
        } else { // Left
            newRect.x = pos.x;
            newRect.width = width + (x - pos.x);
            if (idx === 12) { newRect.height = pos.y - y; }
        }

        if (newRect.width > 20 && newRect.height > 20) {
            setCropRect(newRect);
        }
    };

    const handleSave = () => {
        if (tool === 'crop') {
            const uri = stageRef.current.toDataURL({
                x: cropRect.x,
                y: cropRect.y,
                width: cropRect.width,
                height: cropRect.height,
                pixelRatio: 2
            });
            onSave(uri);
        } else {
            const uri = stageRef.current.toDataURL({ pixelRatio: 2 });
            onSave(uri);
        }
        onClose();
    };

    const renderCropHandles = () => {
        if (tool !== 'crop') return null;

        const handles = [];
        const { x, y, width: w, height: h } = cropRect;

        // Generate 16 points around the perimeter
        for (let i = 0; i < 4; i++) handles.push({ x: x + (w * i / 4), y: y }); // Top
        for (let i = 0; i < 4; i++) handles.push({ x: x + w, y: y + (h * i / 4) }); // Right
        for (let i = 0; i < 4; i++) handles.push({ x: x + w - (w * i / 4), y: y + h }); // Bottom
        for (let i = 0; i < 4; i++) handles.push({ x: x, y: y + h - (h * i / 4) }); // Left

        return handles.map((pos, idx) => (
            <Circle
                key={`handle-${idx}`}
                x={pos.x}
                y={pos.y}
                radius={6}
                fill="#6366f1"
                stroke="white"
                strokeWidth={2}
                draggable
                onDragMove={(e) => handleCropDrag(idx, e)}
                onMouseEnter={(e) => {
                    const stg = e.target.getStage();
                    if (!stg) return;
                    const container = stg.container();
                    if (idx % 4 === 0) {
                        container.style.cursor = idx === 0 || idx === 8 ? 'nwse-resize' : 'nesw-resize';
                    } else if (idx < 4 || (idx >= 8 && idx < 12)) {
                        container.style.cursor = 'ns-resize';
                    } else {
                        container.style.cursor = 'ew-resize';
                    }
                }}
                onMouseLeave={(e) => {
                    const stg = e.target.getStage();
                    if (stg) stg.container().style.cursor = 'default';
                }}
            />
        ));
    };

    return (
        <div className="fixed inset-0 z-[300] flex items-center justify-center bg-black/80 backdrop-blur-md p-4 overflow-auto">
            <div className="bg-slate-900 rounded-3xl shadow-2xl w-full max-w-6xl flex flex-col h-[95vh]">
                {/* Header */}
                <div className="flex items-center justify-between px-8 py-5 border-b border-white/5">
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-indigo-500/10 rounded-2xl">
                            <Palette size={24} className="text-indigo-400" />
                        </div>
                        <div>
                            <h3 className="text-xl font-black text-white">Advanced Image Studio</h3>
                            <p className="text-[10px] font-bold text-indigo-400 uppercase tracking-widest">Enhance your adventure visuals</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-3">
                        <button onClick={handleUndo} className="p-2.5 text-slate-400 hover:text-white hover:bg-white/5 rounded-xl transition-all" title="Undo (Ctrl+Z)">
                            <Undo size={20} />
                        </button>
                        <button onClick={onClose} className="p-2.5 text-slate-400 hover:text-white hover:bg-white/5 rounded-xl transition-all">
                            <X size={20} />
                        </button>
                    </div>
                </div>

                <div className="flex-1 flex overflow-hidden">
                    {/* Toolbar */}
                    <div className="w-24 border-r border-white/5 p-4 flex flex-col items-center gap-4 overflow-y-auto bg-slate-900/50">
                        <ToolButton active={tool === 'select'} icon={<MousePointer2 size={20} />} label="Select" onClick={() => setTool('select')} />
                        <ToolButton active={tool === 'pen'} icon={<Eraser size={20} className={tool === 'pen' ? '' : 'rotate-180'} />} label="Draw" onClick={() => setTool('pen')} />
                        <ToolButton active={tool === 'text'} icon={<Type size={20} />} label="Text" onClick={() => setTool('text')} />
                        <ToolButton active={tool === 'icon'} icon={<MapPin size={20} />} label="Icon" onClick={() => setTool('icon')} />
                        <ToolButton active={tool === 'crop'} icon={<Scissors size={20} />} label="Crop" onClick={() => setTool('crop')} />

                        <div className="w-full border-t border-white/10 pt-4 flex flex-col items-center gap-4">
                            <label className="text-[8px] font-black text-slate-500 uppercase">Color</label>
                            <input
                                type="color"
                                value={color}
                                onChange={(e) => setColor(e.target.value)}
                                className="w-12 h-12 rounded-xl bg-slate-800 border-none cursor-pointer p-1"
                            />

                            <label className="text-[8px] font-black text-slate-500 uppercase mt-2">Size</label>
                            <div className="h-32 flex flex-col items-center gap-2">
                                <input
                                    type="range"
                                    min="1"
                                    max="50"
                                    value={thickness}
                                    onChange={(e) => setThickness(parseInt(e.target.value))}
                                    className="h-full vertical-range accent-indigo-500"
                                    style={{ writingMode: 'bt-lr' as any }}
                                />
                                <span className="text-[9px] font-bold text-slate-400">{thickness}px</span>
                            </div>

                            {tool === 'text' && (
                                <div className="w-full border-t border-white/10 pt-4 flex flex-col items-center gap-2">
                                    <label className="text-[8px] font-black text-slate-500 uppercase text-center">Font</label>
                                    <select
                                        value={fontFamily}
                                        onChange={(e) => setFontFamily(e.target.value)}
                                        className="w-full bg-slate-800 border-none text-[10px] text-white rounded-lg p-1.5 outline-none font-bold"
                                    >
                                        <option value="Inter, sans-serif">Modern</option>
                                        <option value="'Playfair Display', serif">Elegant</option>
                                        <option value="'JetBrains Mono', monospace">Coding</option>
                                        <option value="cursive">Handwritten</option>
                                    </select>
                                </div>
                            )}

                            {tool === 'icon' && (
                                <div className="w-full border-t border-white/10 pt-4 flex flex-col items-center gap-2">
                                    <label className="text-[8px] font-black text-slate-500 uppercase">Style</label>
                                    <div className="grid grid-cols-2 gap-2">
                                        <button
                                            onClick={() => setIconType('pin')}
                                            className={`p-2 rounded-lg ${iconType === 'pin' ? 'bg-indigo-600' : 'bg-slate-800'} text-white transition-all`}
                                        >
                                            <MapPin size={14} />
                                        </button>
                                        <button
                                            onClick={() => setIconType('arrow')}
                                            className={`p-2 rounded-lg ${iconType === 'arrow' ? 'bg-indigo-600' : 'bg-slate-800'} text-white transition-all`}
                                        >
                                            <ArrowUpRight size={14} />
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Canvas Area */}
                    <div className="flex-1 bg-slate-800 flex items-center justify-center p-8 overflow-auto pattern-grid">
                        <div className="shadow-2xl bg-white rounded-lg overflow-hidden relative" style={{ minWidth: stageSize.width, minHeight: stageSize.height }}>
                            <Stage
                                width={stageSize.width}
                                height={stageSize.height}
                                onMouseDown={handleMouseDown}
                                onMouseMove={handleMouseMove}
                                onMouseUp={handleMouseUp}
                                ref={stageRef}
                            >
                                <Layer>
                                    {image && <KonvaImage image={image} width={stageSize.width} height={stageSize.height} />}

                                    {elements.map((el) => {
                                        if (el.type === 'line') return <Line key={el.id} id={el.id} points={el.points} stroke={el.stroke} strokeWidth={el.strokeWidth} tension={0.5} lineCap="round" lineJoin="round" draggable={tool === 'select'} onClick={() => setSelectedId(el.id)} />;
                                        if (el.type === 'text') return <KonvaText key={el.id} id={el.id} x={el.x} y={el.y} text={el.text} fill={el.fill} fontSize={el.fontSize} fontFamily={el.fontFamily} fontWeight="900" draggable={tool === 'select'} onClick={() => setSelectedId(el.id)} />;
                                        if (el.type === 'icon') return (
                                            <Group key={el.id} id={el.id} x={el.x} y={el.y} draggable={tool === 'select'} onClick={() => setSelectedId(el.id)}>
                                                {el.iconType === 'pin' ? (
                                                    <>
                                                        <Rect width={el.size} height={el.size} fill={el.fill} rotation={45} offsetX={el.size / 2} offsetY={el.size / 2} />
                                                        <KonvaText text="📍" fontSize={el.size} offsetX={el.size / 2.5} offsetY={el.size / 2.5} />
                                                    </>
                                                ) : (
                                                    <Arrow
                                                        points={[0, 0, el.size, -el.size]}
                                                        pointerLength={10}
                                                        pointerWidth={10}
                                                        fill={el.fill}
                                                        stroke={el.fill}
                                                        strokeWidth={el.size / 4}
                                                    />
                                                )}
                                            </Group>
                                        );
                                        return null;
                                    })}

                                    {selectedId && tool === 'select' && (
                                        <Transformer
                                            ref={elementTransformerRef}
                                            rotateAnchorOffset={30}
                                            anchorFill="#6366f1"
                                            anchorStroke="white"
                                            anchorSize={10}
                                            anchorCornerRadius={3}
                                            borderStroke="#6366f1"
                                            borderDash={[4, 4]}
                                            boundBoxFunc={(oldBox, newBox) => {
                                                if (newBox.width < 5 || newBox.height < 5) return oldBox;
                                                return newBox;
                                            }}
                                        />
                                    )}

                                    {tool === 'crop' && (
                                        <>
                                            <Rect x={0} y={0} width={stageSize.width} height={stageSize.height} fill="rgba(0,0,0,0.5)" />
                                            <Rect
                                                ref={cropRectRef}
                                                x={cropRect.x}
                                                y={cropRect.y}
                                                width={cropRect.width}
                                                height={cropRect.height}
                                                stroke="#6366f1"
                                                strokeWidth={3}
                                                fill="transparent"
                                                draggable
                                                onDragEnd={(e) => setCropRect({ ...cropRect, x: e.target.x(), y: e.target.y() })}
                                                onTransformEnd={() => {
                                                    const node = cropRectRef.current;
                                                    setCropRect({
                                                        x: node.x(),
                                                        y: node.y(),
                                                        width: Math.max(5, node.width() * node.scaleX()),
                                                        height: Math.max(5, node.height() * node.scaleY()),
                                                    });
                                                    node.scaleX(1);
                                                    node.scaleY(1);
                                                }}
                                            />
                                            {/* Masking the rest of image during crop */}
                                            <Transformer
                                                ref={transformerRef}
                                                enabledAnchors={[
                                                    'top-left', 'top-center', 'top-right',
                                                    'middle-right', 'bottom-right', 'bottom-center',
                                                    'bottom-left', 'middle-left'
                                                ]}
                                                rotateEnabled={false}
                                                anchorFill="#6366f1"
                                                anchorStroke="white"
                                                anchorSize={12}
                                                borderStroke="#6366f1"
                                                boundBoxFunc={(oldBox, newBox) => {
                                                    if (newBox.width < 5 || newBox.height < 5) return oldBox;
                                                    return newBox;
                                                }}
                                            />
                                            {renderCropHandles()}
                                        </>
                                    )}
                                </Layer>
                            </Stage>
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <div className="px-8 py-5 border-t border-white/5 flex items-center justify-between">
                    <div className="flex gap-6 items-center">
                        <div className="flex items-center gap-2">
                            <div className="w-5 h-5 rounded-lg shadow-inner" style={{ background: color }}></div>
                            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">{color}</span>
                        </div>
                        <div className="h-4 w-px bg-white/10" />
                        <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest flex items-center gap-2">
                            Dimension: <span className="text-white">{Math.round(stageSize.width)} x {Math.round(stageSize.height)}</span>
                        </div>
                    </div>
                    <div className="flex gap-3">
                        <button
                            onClick={onClose}
                            className="px-6 py-2.5 text-sm font-bold text-slate-400 hover:text-white transition-all uppercase tracking-widest text-[10px]"
                        >
                            Discard
                        </button>
                        <button
                            onClick={handleSave}
                            className="px-8 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl text-xs font-black shadow-xl shadow-indigo-500/20 flex items-center gap-2 transition-all active:scale-95 uppercase tracking-widest"
                        >
                            <Check size={18} />
                            Save Masterpiece
                        </button>
                    </div>
                </div>
            </div>

            <style dangerouslySetInnerHTML={{
                __html: `
                .vertical-range {
                    -webkit-appearance: slider-vertical;
                    width: 8px;
                    height: 100%;
                }
                .pattern-grid {
                    background-image: radial-gradient(#ffffff05 1px, transparent 1px);
                    background-size: 20px 20px;
                }
                .no-scrollbar::-webkit-scrollbar {
                    display: none;
                }
            `}} />
        </div>
    );
};

const ToolButton: React.FC<{ active: boolean, icon: any, label: string, onClick: () => void }> = ({ active, icon, label, onClick }) => (
    <button
        onClick={onClick}
        className={`group relative flex flex-col items-center gap-1.5 p-3 rounded-2xl transition-all w-full ${active ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/20' : 'text-slate-500 hover:text-slate-300 hover:bg-white/5'}`}
    >
        {icon}
        <span className="text-[8px] font-black uppercase tracking-tighter">{label}</span>
        {active && <div className="absolute -right-1 top-1/2 -translate-y-1/2 w-1 h-4 bg-indigo-400 rounded-full" />}
    </button>
);

export default ImageEditorModal;
