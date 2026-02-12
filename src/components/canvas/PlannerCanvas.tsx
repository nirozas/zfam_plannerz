import { Stage, Layer, Group, Rect, Circle, Transformer, Text as KonvaText, Line } from 'react-konva'
import { useState, useRef, useEffect, forwardRef, useImperativeHandle, useCallback } from 'react'
import useImage from 'use-image'
import { AIFeature, BrushType, EraserType, ShapeType } from '@/types'
import { VoicePlayer } from './VoicePlayer'
import { usePlannerStore, normalizeElement } from '@/store/plannerStore'
import { ContextMenu } from './ContextMenu'
import { PlannerElementRenderer } from './PlannerElementRenderer'

import { LinkTargetModal } from '../modals/LinkTargetModal'
import { SmartActionBar } from './SmartActionBar'
import { performOCR } from '@/utils/ocr'
import { prepareInkImage, generateArtFromInk } from '@/utils/imageGen'
import { GenArtModal } from '../modals/GenArtModal'
import { Sparkles } from 'lucide-react'


interface CanvasProps {
    pageNumber: number
    externalTool: Tool
    onSavingChange?: (saving: boolean) => void
    onSelectionChange?: (element: any | null) => void
    onEditAsset?: (asset: { id: string, src: string, type: 'image' | 'sticker' }) => void

    // Tool Props
    brushType: BrushType
    penColor: string
    penWidth: number
    penOpacity: number

    highlighterColor: string
    highlighterWidth: number
    highlighterOpacity: number

    eraserType: EraserType
    eraserSize: number

    shapeType: ShapeType
    shapeStrokeColor: string
    shapeFillColor: string
    shapeStrokeWidth: number
    shapeFilled: boolean
}

type Tool = 'select' | 'pen' | 'highlighter' | 'eraser' | 'text' | 'sticker' | 'shape' | 'link' | 'lasso'
interface PlannerCanvasHandle {
    addImage: (url: string) => void;
    addVoice: (url: string, duration: number) => void;
    save: () => Promise<void>;
    updateImage: (id: string, url: string) => void;
    handleClear: () => void;
    clearAll: () => void;
    updateElement: (id: string, props: any) => void;
    setZoom: (newScale: number) => void;
    undo: () => void;
    redo: () => void;
    updateBackground: (color: string) => void;
    moveToFront: () => void;
    moveToBack: () => void;
    handleConvertToText: () => Promise<string | void>;
    handleMakeArt: () => Promise<string | void>;
}

// Background Component to handle image loading logic
const CanvasBackground = ({ elements, width, height, onSelect }: { elements: any[], width: number, height: number, onSelect: () => void }) => {
    const bg = elements.find(el => el.type === 'background');
    const bgFill = bg?.fill || "white";
    const isImage = bgFill.startsWith('data:image/') || bgFill.startsWith('http');
    const [image] = useImage(isImage ? bgFill : '', 'anonymous');

    if (isImage && image) {
        const isTexture = bgFill.startsWith('data:image/');
        return (
            <Rect
                width={width}
                height={height}
                fillPatternImage={image}
                fillPatternRepeat={isTexture ? "repeat" : "no-repeat"}
                fillPatternScaleX={isTexture ? 1 : width / image.width}
                fillPatternScaleY={isTexture ? 1 : height / image.height}
                name="canvas-bg"
                onClick={onSelect}
                onTap={onSelect}
            />
        );
    }

    return (
        <Rect
            width={width}
            height={height}
            fill={bgFill}
            name="canvas-bg"
            onClick={onSelect}
            onTap={onSelect}
        />
    );
};

export const PlannerCanvas = forwardRef<PlannerCanvasHandle, CanvasProps>(({
    pageNumber,
    externalTool,
    onSavingChange,
    onSelectionChange,
    onEditAsset,
    // Brush
    brushType, penColor, penWidth, penOpacity,
    // Highlighter
    highlighterColor, highlighterWidth, highlighterOpacity,
    // Eraser
    eraserType, eraserSize,
    // Shape
    shapeType, shapeStrokeColor, shapeFillColor, shapeStrokeWidth, shapeFilled
}, ref) => {
    // Selection & Editing state
    const [selectedId, setSelectedId] = useState<string | null>(null)
    const [editingTextId, setEditingTextId] = useState<string | null>(null)
    const [activeVoiceId, setActiveVoiceId] = useState<string | null>(null)
    const [isDrawing, setIsDrawing] = useState(false)
    const [newShapeId, setNewShapeId] = useState<string | null>(null)
    const [saving, setSaving] = useState(false)
    const [clipboard, setClipboard] = useState<any | null>(null)
    const [contextMenu, setContextMenu] = useState<{ x: number, y: number, visible: boolean }>({ x: 0, y: 0, visible: false })
    // Use ref for cursor to avoid re-renders on mousemove
    const brushCursorRef = useRef<any>(null);
    const inkGroupRef = useRef<any>(null);
    const ocrWorkerRef = useRef<Worker | null>(null);

    // Container ref for resizing
    const containerRef = useRef<HTMLDivElement>(null);
    const [containerSize, setContainerSize] = useState({ width: 800, height: 1000 });

    // Link Tool State
    const [showLinkModal, setShowLinkModal] = useState(false)
    const [showGenArtModal, setShowGenArtModal] = useState(false)
    const [isGeneratingArt, setIsGeneratingArt] = useState(false)
    const [pendingLink, setPendingLink] = useState<any>(null)
    const [tempLinkRect, setTempLinkRect] = useState<{ x: number, y: number, width: number, height: number } | null>(null)
    const [lassoPoints, setLassoPoints] = useState<number[]>([])
    const [selectionRect, setSelectionRect] = useState<{ x: number, y: number, width: number, height: number } | null>(null)

    // Store state with individual selectors for high-performance reactivity
    const activePlanner = usePlannerStore(state => state.activePlanner);
    const zoomScale = usePlannerStore(state => state.zoomScale);
    const panPosition = usePlannerStore(state => state.panPosition);
    const canvasRotation = usePlannerStore(state => state.canvasRotation);
    const editMode = usePlannerStore(state => state.editMode);
    const selection = usePlannerStore(state => state.selection);

    // Get current elements from active page
    const currentPage = activePlanner?.pages?.[pageNumber - 1]
    const elements = currentPage?.elements || []
    const canvasWidth = currentPage?.dimensions?.width || 800
    const canvasHeight = currentPage?.dimensions?.height || 1000

    // Update selectionRect whenever selection or elements change
    useEffect(() => {
        const targetIds = selectedId ? [selectedId] : selection;
        if (targetIds.length === 0) {
            setSelectionRect(null);
            return;
        }

        let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
        let found = false;

        elements.forEach((el: any) => {
            if (targetIds.includes(el.id)) {
                found = true;
                if (el.type === 'path' && el.points) {
                    for (let i = 0; i < el.points.length; i += 2) {
                        minX = Math.min(minX, el.points[i]);
                        minY = Math.min(minY, el.points[i + 1]);
                        maxX = Math.max(maxX, el.points[i]);
                        maxY = Math.max(maxY, el.points[i + 1]);
                    }
                } else {
                    minX = Math.min(minX, el.x);
                    minY = Math.min(minY, el.y);
                    maxX = Math.max(maxX, el.x + (el.width || 0));
                    maxY = Math.max(maxY, el.y + (el.height || 0));
                }
            }
        });

        if (found) {
            setSelectionRect({
                x: minX,
                y: minY,
                width: maxX - minX,
                height: maxY - minY
            });
        } else {
            setSelectionRect(null);
        }
    }, [selection, selectedId, elements]);

    // Point-in-Polygon (Ray Casting) algorithm
    const isPointInPolygon = (point: { x: number, y: number }, polygon: number[]) => {
        const x = point.x, y = point.y;
        let inside = false;
        for (let i = 0, j = polygon.length / 2 - 1; i < polygon.length / 2; j = i++) {
            const xi = polygon[i * 2], yi = polygon[i * 2 + 1];
            const xj = polygon[j * 2], yj = polygon[j * 2 + 1];
            const intersect = ((yi > y) !== (yj > y)) &&
                (x < (xj - xi) * (y - yi) / (yj - yi) + xi);
            if (intersect) inside = !inside;
        }
        return inside;
    };

    const handleConvertToText = async () => {
        const targetIds = selectedId ? [selectedId] : selection;
        if (targetIds.length === 0 || !viewportRef.current || !selectionRect) return;

        try {
            // 1. ISOLATION: Distill only handwriting elements (Strict Exclusion)
            const inkElements = elements.filter(el => targetIds.includes(el.id) && el.type === 'path') as any[];

            if (inkElements.length === 0) {
                alert("Please select handwriting to convert. (Stickers and typed text are ignored)");
                return;
            }

            usePlannerStore.setState({ saveStatus: 'saving' });
            const captureRect = { ...selectionRect };

            // 2. OCR EXECUTION (Using isolated Ink-Only data)
            // Passing the raw path data to the utility for high-contrast rendering
            const text = await performOCR(inkElements);

            if (text && text.trim().length > 0) {
                const { addElement, deleteElement, saveHistory } = usePlannerStore.getState();
                saveHistory();

                // 3. REPLACEMENT LOGIC
                // Calculate center point of original selection
                const centerX = captureRect.x + captureRect.width / 2;
                const centerY = captureRect.y + captureRect.height / 2;
                const textWidth = Math.max(captureRect.width, 150);
                const textHeight = Math.max(captureRect.height, 44);

                // Delete original ink elements only after successful detection
                targetIds.forEach(id => deleteElement(id));

                // 4. PRECISE PLACEMENT (Centered) & STYLING
                const firstEl = inkElements[0];
                const newText: any = {
                    id: `text-${Date.now()}`,
                    type: 'text',
                    text: text.trim(),
                    x: centerX - textWidth / 2,
                    y: centerY - textHeight / 2,
                    fontSize: 22,
                    fontFamily: 'Inter',
                    fill: firstEl?.stroke || '#1e293b',
                    width: textWidth,
                    height: textHeight,
                    align: 'center',
                    verticalAlign: 'middle',
                    rotation: 0,
                    scaleX: 1,
                    scaleY: 1,
                    zIndex: elements.length
                };

                addElement(newText);

                usePlannerStore.setState({
                    selection: [newText.id],
                    saveStatus: 'saved'
                });

                setTimeout(() => usePlannerStore.setState({ saveStatus: 'idle' }), 2000);
                return text.trim();
            } else {
                // Retry/Failure Handling
                alert("Could not read handwriting. High-sensitivity scan failed to find text.");
                usePlannerStore.setState({ saveStatus: 'idle' });
            }
        } catch (err) {
            console.error("AI Transcription Workflow Error:", err);
            usePlannerStore.setState({ saveStatus: 'error' });
        }
    };

    const handleMakeArt = async () => {
        const targetIds = selectedId ? [selectedId] : selection;
        if (targetIds.length === 0 || !selectionRect) return;

        // Open the specialized modal instead of a simple prompt
        setShowGenArtModal(true);
    };

    const handleGenerateArt = async (data: { prompt: string, style: string, replaceInk: boolean }) => {
        setShowGenArtModal(false);
        const targetIds = selectedId ? [selectedId] : selection;
        if (targetIds.length === 0 || !selectionRect) return;

        try {
            setIsGeneratingArt(true);
            usePlannerStore.setState({ saveStatus: 'saving' });

            // 1. ISOLATION: Distill only strokes for the GenArt engine
            const inkElements = elements.filter(el => targetIds.includes(el.id) && el.type === 'path') as any[];

            // Prepare clean black/white image (Clean Sketch)
            const cleanSketch = await prepareInkImage(inkElements);

            // 2. GENERATION: Hit the Image-to-Image API (Simulated)
            const artUrl = await generateArtFromInk(cleanSketch, data.prompt, data.style);

            const { addElement, deleteElement, saveHistory, updateElement } = usePlannerStore.getState();
            saveHistory();

            // 3. INTEGRATION: Overlay the artwork
            const artId = `art-${Date.now()}`;
            const captureRect = { ...selectionRect };

            // Cleanup Option: Replace ink if requested
            if (data.replaceInk) {
                targetIds.forEach(id => deleteElement(id));
            }

            addElement({
                id: artId,
                type: 'sticker' as any,
                src: artUrl,
                x: captureRect.x,
                y: captureRect.y,
                width: captureRect.width,
                height: captureRect.height,
                rotation: 0,
                scaleX: 1,
                scaleY: 1,
                opacity: 0,
                zIndex: elements.length
            } as any);

            // 4. ANIMATION: Fade-in the new masterpiece
            let op = 0;
            const interval = setInterval(() => {
                op += 0.05;
                updateElement(artId, { opacity: op });
                if (op >= 1) clearInterval(interval);
            }, 30);

            usePlannerStore.setState({ selection: [artId] });
            setSelectedId(null);
            usePlannerStore.setState({ saveStatus: 'saved' });
            setIsGeneratingArt(false);

        } catch (err) {
            console.error("Art Generation Failed:", err);
            setIsGeneratingArt(false);
            usePlannerStore.setState({ saveStatus: 'error' });
        }
    };

    useEffect(() => {
        if (!containerRef.current) return;
        const resizeObserver = new ResizeObserver((entries) => {
            for (let entry of entries) {
                const { width, height } = entry.contentRect;
                setContainerSize({ width, height });
            }
        });
        resizeObserver.observe(containerRef.current);
        return () => resizeObserver.disconnect();
    }, []);

    // Refs
    const stageRef = useRef<any>(null)
    const trRef = useRef<any>(null)
    const viewportRef = useRef<any>(null);
    const textareaRef = useRef<HTMLTextAreaElement>(null)
    const touchStartPos = useRef<{ x: number, y: number } | null>(null);

    // Store state with individual selectors for high-performance reactivity
    const links = activePlanner?.pages?.[pageNumber - 1]?.links || [];

    // Actions
    const {
        setZoomScale,
        setPanPosition,
        setCanvasRotation,
        nextPage,
        prevPage
    } = usePlannerStore();

    const stageScale = zoomScale
    const stagePos = panPosition


    useEffect(() => {
        onSavingChange?.(saving)
    }, [saving, onSavingChange])

    // AI/OCR Worker Initialization
    useEffect(() => {
        // Create worker
        try {
            ocrWorkerRef.current = new Worker(
                new URL('../../workers/ocr.worker.ts', import.meta.url),
                { type: 'module' }
            );

            ocrWorkerRef.current.onmessage = (e) => {
                const { success, text, pageId } = e.data;
                if (success && text) {
                    usePlannerStore.getState().updatePageTranscription(pageId, text);
                }
            };
        } catch (err) {
            console.error("[PlannerCanvas] Worker Init Fail:", err);
        }

        return () => {
            ocrWorkerRef.current?.terminate();
        };
    }, []);

    // Watcher: Monitor Ink Paths for Debounced OCR
    useEffect(() => {
        const inkElements = elements.filter(el => el.type === 'path');
        if (inkElements.length === 0) return;

        const timer = setTimeout(async () => {
            if (!inkGroupRef.current || !ocrWorkerRef.current || !currentPage) return;

            // Trigger "Syncing..." status
            usePlannerStore.setState({ saveStatus: 'saving' });

            try {
                // Capture JUST the ink group
                const dataUrl = inkGroupRef.current.toDataURL({
                    pixelRatio: 2, // Higher res for better OCR
                    mimeType: 'image/png'
                });

                // Convert to blob for worker efficiency
                const response = await fetch(dataUrl);
                const blob = await response.blob();

                ocrWorkerRef.current.postMessage({
                    blob,
                    pageId: currentPage.id
                });
            } catch (err) {
                console.error("[OCR] Capture failed:", err);
                usePlannerStore.setState({ saveStatus: 'error' });
            }
        }, 3000); // 3 second debounce

        return () => clearTimeout(timer);
    }, [elements.filter(el => el.type === 'path').length, currentPage?.id]);

    // --- AUTO THUMBNAIL LOGIC ---
    const captureThumbnail = useCallback(async () => {
        if (!stageRef.current || !activePlanner) return;
        const stage = stageRef.current.getStage();

        // Hide UI elements that shouldn't be in thumbnail
        const tr = trRef.current;
        const nodes = tr?.nodes() || [];
        if (tr) tr.nodes([]);

        const brushVisible = brushCursorRef.current?.visible();
        if (brushCursorRef.current) brushCursorRef.current.visible(false);

        try {
            // Low res thumbnail for filmbar performance
            const thumbnail = stage.toDataURL({
                pixelRatio: 0.1,
                mimeType: 'image/jpeg',
                quality: 0.5
            });

            const { updatePages } = usePlannerStore.getState();
            const currentPages = usePlannerStore.getState().activePlanner?.pages;
            if (currentPages) {
                const newPages = [...currentPages];
                if (newPages[pageNumber - 1]) {
                    // Only update if it actually changed to prevent infinite re-renders
                    if (newPages[pageNumber - 1].thumbnail !== thumbnail) {
                        newPages[pageNumber - 1] = { ...newPages[pageNumber - 1], thumbnail };
                        updatePages(newPages);
                    }
                }
            }
        } catch (err) {
            console.warn("[PlannerCanvas] Auto-thumb fail:", err);
        } finally {
            // Restore UI
            if (tr) tr.nodes(nodes);
            if (brushCursorRef.current && brushVisible) brushCursorRef.current.visible(true);
        }
    }, [activePlanner?.id, pageNumber]); // Dependency on planner ID and page number

    // Debounced thumbnail capture on element or ink changes
    useEffect(() => {
        const timer = setTimeout(() => {
            captureThumbnail();
        }, 2000); // Wait for 2 seconds of inactivity
        return () => clearTimeout(timer);
    }, [elements, currentPage?.inkPaths, captureThumbnail]);

    // Helpers for multi-touch (Ref-based to avoid closure stale state)
    const interactionRef = useRef({
        isZooming: false,
        lastDist: 0,
        lastAngle: 0,
        lastCenter: { x: 0, y: 0 }
    });

    const getDistance = (p1: { x: number, y: number }, p2: { x: number, y: number }) => {
        return Math.sqrt(Math.pow(p2.x - p1.x, 2) + Math.pow(p2.y - p1.y, 2));
    };

    const getCenter = (p1: { x: number, y: number }, p2: { x: number, y: number }) => {
        return {
            x: (p1.x + p2.x) / 2,
            y: (p1.y + p2.y) / 2,
        };
    };

    const getAngle = (p1: { x: number, y: number }, p2: { x: number, y: number }) => {
        return (Math.atan2(p2.y - p1.y, p2.x - p1.x) * 180) / Math.PI;
    };

    // Rendering abstraction to handle both layers - MOVED TO PlannerElementRenderer.tsx


    // Touch handler for ZOOM/PAN/ROTATE + SWIPE
    const handleTouchStart = (e: any) => {
        // Record start position for swipe detection
        if (e.evt.touches.length === 1) {
            touchStartPos.current = { x: e.evt.touches[0].clientX, y: e.evt.touches[0].clientY };
        }

        const touch1 = e.evt.touches[0];
        const touch2 = e.evt.touches[1];

        // STRICT MODE: Only allow Zoom/Pan/Tilt if the Select tool (arrow) is active
        if (touch1 && touch2 && externalTool === 'select') {
            // Stop any active Konva drag (from 1st finger) to prevent conflict
            if (stageRef.current) {
                stageRef.current.getStage().stopDrag();
            }

            interactionRef.current.isZooming = true;
            setIsDrawing(false);

            const p1 = { x: touch1.clientX, y: touch1.clientY };
            const p2 = { x: touch2.clientX, y: touch2.clientY };

            interactionRef.current.lastDist = getDistance(p1, p2);
            interactionRef.current.lastAngle = getAngle(p1, p2);
            interactionRef.current.lastCenter = getCenter(p1, p2);
        } else {
            interactionRef.current.isZooming = false;
        }
    };

    const rAfRef = useRef<number | null>(null);


    const handleTouchMove = (e: any) => {
        const touch1 = e.evt.touches[0];
        const touch2 = e.evt.touches[1];

        if (touch1 && touch2 && interactionRef.current.isZooming && externalTool === 'select') {
            e.evt.preventDefault(); // Prevent browser zooming

            if (rAfRef.current) return; // Throttle to frame rate

            rAfRef.current = requestAnimationFrame(() => {
                const p1 = { x: touch1.clientX, y: touch1.clientY };
                const p2 = { x: touch2.clientX, y: touch2.clientY };

                const dist = getDistance(p1, p2);
                const angle = getAngle(p1, p2);
                const center = getCenter(p1, p2);

                const { zoomScale: currentScale, canvasRotation: currentRotation, panPosition: currentPan } = usePlannerStore.getState();

                if (!interactionRef.current.lastDist) interactionRef.current.lastDist = dist;

                const scaleBy = dist / interactionRef.current.lastDist;
                const newScale = Math.min(Math.max(0.1, currentScale * scaleBy), 5);
                const rotationDiff = angle - interactionRef.current.lastAngle;

                setZoomScale(newScale);
                setCanvasRotation((currentRotation + rotationDiff) % 360);

                const dx = center.x - interactionRef.current.lastCenter.x;
                const dy = center.y - interactionRef.current.lastCenter.y;

                setPanPosition({
                    x: currentPan.x + dx,
                    y: currentPan.y + dy
                });

                interactionRef.current.lastDist = dist;
                interactionRef.current.lastAngle = angle;
                interactionRef.current.lastCenter = center;

                rAfRef.current = null;
            });
        }
    };

    const handleAddImage = (url: string, x?: number, y?: number) => {
        const { addElement } = usePlannerStore.getState()
        const id = `sticker-${Date.now()}`

        // Calculate default position relative to current view
        const defaultX = ((-stagePos.x + 100) / (stageScale || 1)) + 100
        const defaultY = ((-stagePos.y + 100) / (stageScale || 1)) + 100

        const newImage = {
            id,
            type: 'sticker',
            x: x ?? defaultX,
            y: y ?? defaultY,
            width: 200,
            height: 200,
            src: url,
            rotation: 0,
            zIndex: elements.length
        }
        addElement(newImage as any)
        setSelectedId(id)
    }

    // Update cursor based on tool
    useEffect(() => {
        if (stageRef.current) {
            const container = stageRef.current.container()
            if (externalTool === 'text') {
                container.style.cursor = 'text'
            } else if (externalTool === 'pen' || externalTool === 'eraser') {
                container.style.cursor = 'crosshair'
            } else if (externalTool === 'select') {
                container.style.cursor = 'default'
            }
        }
    }, [externalTool])

    // Deletion, Copy & Paste Handler
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            // Deletion
            if ((e.key === 'Delete' || e.key === 'Backspace') && selectedId && !editingTextId) {
                const { deleteElement } = usePlannerStore.getState()
                deleteElement(selectedId)
                setSelectedId(null)
                setActiveVoiceId(null)
            }

            // Copy (Ctrl+C)
            if ((e.ctrlKey || e.metaKey) && e.key === 'c' && selectedId && !editingTextId) {
                const element = elements.find(el => el.id === selectedId)
                if (element) {
                    setClipboard(JSON.parse(JSON.stringify(element)))
                    console.log("Copied element to clipboard:", element)
                }
            }

            // Paste (Ctrl+V)
            if ((e.ctrlKey || e.metaKey) && e.key === 'v' && clipboard && !editingTextId) {
                const { addElement } = usePlannerStore.getState()
                const id = `${clipboard.type}-${Date.now()}`
                const newElement = {
                    ...clipboard,
                    id,
                    x: (clipboard.x || 0) + 20,
                    y: (clipboard.y || 0) + 20,
                    zIndex: elements.length
                }
                addElement(newElement as any)
                setSelectedId(id)
                console.log("Pasted element:", newElement)
            }
        }

        window.addEventListener('keydown', handleKeyDown)
        return () => window.removeEventListener('keydown', handleKeyDown)
    }, [selectedId, editingTextId, elements, clipboard])

    // Context Menu Handler
    const handleContextMenu = (e: any) => {
        e.evt.preventDefault()
        const stage = e.target.getStage()
        const mousePos = stage.getPointerPosition()

        setContextMenu({
            x: mousePos.x,
            y: mousePos.y,
            visible: true
        })
    }

    // Expose methods to parent
    useImperativeHandle(ref, () => ({
        addImage: (url: string) => {
            handleAddImage(url)
        },
        addVoice: (url: string, duration: number) => {
            const { addElement } = usePlannerStore.getState()
            const id = `voice-${Date.now()}`
            addElement({
                id,
                type: 'voice',
                x: 150 / stageScale,
                y: 150 / stageScale,
                url,
                duration,
                rotation: 0,
                scaleX: 1,
                scaleY: 1,
                zIndex: elements.length
            } as any)
            setSaving(true)
        },
        save: async () => {
            setSaving(true)
            try {
                // Capture thumbnail
                if (stageRef.current) {
                    const stage = stageRef.current.getStage();
                    // Temporarily hide UI elements before capture
                    const tr = trRef.current;
                    const nodes = tr?.nodes() || [];
                    if (tr) tr.nodes([]);
                    const brushVisible = brushCursorRef.current?.visible();
                    if (brushCursorRef.current) brushCursorRef.current.visible(false);

                    try {
                        // Use lower resolution for faster thumbnail
                        const thumbnail = stage.toDataURL({ pixelRatio: 0.2 });

                        // Update local page metadata with thumbnail
                        const { activePlanner, currentPageIndex, updatePages } = usePlannerStore.getState();
                        if (activePlanner) {
                            const newPages = [...activePlanner.pages];
                            newPages[currentPageIndex] = { ...newPages[currentPageIndex], thumbnail };
                            updatePages(newPages);
                        }
                    } catch (err) {
                        console.warn("Failed to capture thumbnail:", err);
                    } finally {
                        // Restore UI elements
                        if (tr) tr.nodes(nodes);
                        if (brushCursorRef.current && brushVisible) brushCursorRef.current.visible(true);
                    }
                }

                const { savePlanner } = usePlannerStore.getState()
                await savePlanner()
            } catch (error) {
                console.error("Save error:", error);
            } finally {
                setSaving(false)
            }
        },
        updateImage: (id: string, url: string) => {
            updateElement(id, { src: url })
        },
        handleClear: () => {
            const { saveHistory, updatePages, activePlanner, currentPageIndex } = usePlannerStore.getState()
            if (!activePlanner) return
            saveHistory()
            const newPages = [...activePlanner.pages]
            newPages[currentPageIndex].elements = []
            updatePages(newPages)
            setSelectedId(null)
            setSaving(true)
        },
        clearAll: () => {
            const { saveHistory, updatePages, activePlanner, currentPageIndex } = usePlannerStore.getState()
            if (!activePlanner) return
            saveHistory()
            const newPages = [...activePlanner.pages]
            newPages[currentPageIndex].elements = []
            updatePages(newPages)
            setSelectedId(null)
            setSaving(true)
        },
        toggleTextFormatting: (type: 'bullet' | 'number' | 'square' | 'checkbox' | 'none') => {
            const targetId = editingTextId || selectedId;
            if (!targetId) return; // Fix: Ensure targetId is present

            const element = elements.find(el => el.id === targetId);
            if (!element || element.type !== 'text') return;

            const textarea = textareaRef.current;
            const text = element.text || '';

            if (editingTextId && textarea) {
                const start = textarea.selectionStart;
                const lineStartIndex = text.lastIndexOf('\n', start - 1) + 1;
                const lineEndIndex = text.indexOf('\n', start);
                const actualLineEndIndex = lineEndIndex === -1 ? text.length : lineEndIndex;

                const lineText = text.substring(lineStartIndex, actualLineEndIndex);

                // Basic prefix clean up
                let clean = lineText.trimStart().replace(/^([•▪○*-]|\d+\.)\s+/, '').replace(/^\[[ x-]\]\s+/, '');

                let transformedLine = '';
                if (type === 'bullet') transformedLine = `• ${clean} `;
                else if (type === 'number') {
                    // Context-aware numbering for single line
                    const prevText = text.substring(0, lineStartIndex);
                    const prevLines = prevText.split('\n');
                    let num = 1;
                    if (prevLines.length > 1 || (prevLines.length === 1 && prevLines[0] !== "")) {
                        const lastLine = prevLines[prevLines.length - 1] === "" ? (prevLines[prevLines.length - 2] || "") : prevLines[prevLines.length - 1];
                        const match = lastLine.match(/^(\d+)\./);
                        if (match) num = parseInt(match[1]) + 1;
                    }
                    transformedLine = `${num}. ${clean} `;
                }
                else if (type === 'square') transformedLine = `▪ ${clean} `;
                else if (type === 'checkbox') transformedLine = `[ ] ${clean} `;
                else transformedLine = clean;

                const newText = text.substring(0, lineStartIndex) + transformedLine + text.substring(actualLineEndIndex);
                updateElement(targetId, { text: newText });

                setTimeout(() => {
                    if (textareaRef.current) {
                        textareaRef.current.focus();
                        const newPos = lineStartIndex + transformedLine.length;
                        textareaRef.current.setSelectionRange(newPos, newPos);
                    }
                }, 10);
            } else {
                const lines = text.split('\n');
                const newLines = lines.map((line, i) => {
                    let clean = line.trimStart().replace(/^([•▪○*-]|\d+\.)\s+/, '').replace(/^\[[ x-]\]\s+/, '');
                    if (type === 'bullet') return `• ${clean} `;
                    if (type === 'number') return `${i + 1}. ${clean} `;
                    if (type === 'square') return `▪ ${clean} `;
                    if (type === 'checkbox') return `[ ] ${clean} `;
                    return clean;
                });
                const combinedText = newLines.join('\n');
                updateElement(targetId, { text: combinedText });

                // Enter edit mode after toggling if not already in it
                setEditingTextId(targetId);
                setTimeout(() => {
                    if (textareaRef.current) {
                        textareaRef.current.value = combinedText;
                        textareaRef.current.focus();
                        textareaRef.current.setSelectionRange(combinedText.length, combinedText.length);
                    }
                }, 50);
            }
        },
        updateElement: (id: string, props: any) => {
            updateElement(id, props)
        },
        setZoom: (newScale: number) => {
            setZoomScale(newScale)
        },
        undo: handleUndo,
        redo: handleRedo,
        updateBackground: (color: string) => {
            const { saveHistory, updatePages, activePlanner, currentPageIndex } = usePlannerStore.getState()
            if (!activePlanner) return
            saveHistory()
            const newPages = [...activePlanner.pages]
            const page = newPages[currentPageIndex]
            const existingIdx = page.elements.findIndex(el => el.type === 'background')
            if (existingIdx !== -1) {
                page.elements[existingIdx] = { ...page.elements[existingIdx], fill: color }
            } else {
                page.elements = [{
                    id: `bg-${Date.now()}`,
                    type: 'background',
                    fill: color,
                    x: 0, y: 0, rotation: 0, scaleX: 1, scaleY: 1,
                    zIndex: -1
                }, ...page.elements]
            }
            updatePages(newPages)
        },
        applyAIResult: handleApplyAIResult,
        deleteSelected: () => {
            if (selectedId) {
                const { deleteElement } = usePlannerStore.getState()
                deleteElement(selectedId as string)
                setSelectedId(null)
            }
        },
        moveToFront: () => {
            if (selectedId) {
                const { activePlanner, currentPageIndex, updatePages, saveHistory } = usePlannerStore.getState()
                if (!activePlanner) return
                saveHistory()
                const newPages = [...activePlanner.pages]
                const els = [...newPages[currentPageIndex].elements]
                const item = els.find(el => el.id === selectedId)
                if (!item) return
                const rest = els.filter(el => el.id !== selectedId)
                newPages[currentPageIndex].elements = [...rest, item]
                updatePages(newPages)
            }
        },
        moveToBack: () => {
            if (selectedId) {
                const { activePlanner, currentPageIndex, updatePages, saveHistory } = usePlannerStore.getState()
                if (!activePlanner) return
                saveHistory()
                const newPages = [...activePlanner.pages]
                const els = [...newPages[currentPageIndex].elements]
                const item = els.find(el => el.id === selectedId)
                if (!item) return
                const rest = els.filter(el => el.id !== selectedId)
                newPages[currentPageIndex].elements = [item, ...rest]
                updatePages(newPages)
            }
        },
        handleConvertToText: async () => {
            return await handleConvertToText();
        },
        handleMakeArt: async () => {
            return await handleMakeArt();
        }
    }))

    // Transformer Logic

    useEffect(() => {
        if (trRef.current && stageRef.current) {
            // Detach nodes
            trRef.current.nodes([])

            const targetIds = selectedId ? [selectedId] : selection;

            if (targetIds.length > 0 && !editingTextId) {
                const nodes: any[] = [];

                targetIds.forEach(id => {
                    // In Konva, we search for nodes by name or id
                    // Note: PlannerElementRenderer should set name/id on the group or node
                    const node = stageRef.current.findOne('#' + id);
                    if (node) {
                        nodes.push(node);
                    }
                });

                if (nodes.length > 0) {
                    trRef.current.nodes(nodes);
                    trRef.current.getLayer().batchDraw();
                }
            }
        }
    }, [selectedId, selection, elements, editingTextId])

    // Notify parent of selection changes
    useEffect(() => {
        if (selectedId) {
            const el = elements.find(e => e.id === selectedId)
            onSelectionChange?.(el || null)
        } else {
            onSelectionChange?.(null)
        }
    }, [selectedId, elements, onSelectionChange])

    const handleMouseDown = (e: any) => {
        if (contextMenu.visible) setContextMenu({ ...contextMenu, visible: false })

        // Check for Middle Mouse Button Panning or Select tool clicking background
        const isBackTick = e.evt.button === 1 || (externalTool === 'select' && (e.target === stageRef.current.getStage() || e.target.attrs.name === 'canvas-bg'));

        if (isBackTick) {
            stageRef.current.getStage().startDrag();
            return;
        }

        const stage = e.target.getStage()
        // Use relative pointer position from the viewport group to get canvas coordinates
        const pos = viewportRef.current ? viewportRef.current.getRelativePointerPosition() : stage.getPointerPosition();
        if (!pos) return;

        // Update cursor position for preview
        // Update cursor position directly (bypass React render)
        if (brushCursorRef.current) {
            const shouldShow = externalTool === 'pen' || externalTool === 'highlighter' || externalTool === 'eraser';
            if (shouldShow) {
                brushCursorRef.current.position(pos);
                brushCursorRef.current.visible(true);
                brushCursorRef.current.getLayer()?.batchDraw();
            } else {
                brushCursorRef.current.visible(false);
            }
        }

        const target = e.target

        // Determine if we clicked an existing text element
        const clickedText = target.findAncestor && target.findAncestor((n: any) => n.attrs.id && n.attrs.id.startsWith('text-'))
        const isBackground = target === stage || (target.attrs && target.attrs.name === 'canvas-bg')

        if (isBackground && (externalTool === 'select' || externalTool === 'lasso')) {
            setSelectedId(null)
            usePlannerStore.setState({ selection: [] })
        }

        // Add text tool - start editing immediately
        if (externalTool === 'text' && !clickedText) {
            const { addElement } = usePlannerStore.getState()
            const id = `text-${Date.now()}`
            const newText = {
                id,
                type: 'text',
                text: '', // Start empty to show "Typing..." placeholder feel
                x: pos.x,
                y: pos.y,
                fontSize: 24,
                fontFamily: 'Inter',
                fontStyle: 'normal',
                align: 'left',
                fill: penColor,
                backgroundColor: 'transparent',
                borderColor: 'transparent',
                borderWidth: 0,
                borderDash: [],
                borderStyle: 'solid',
                width: 200,
                height: 100,
                rotation: 0,
                scaleX: 1,
                scaleY: 1,
                verticalAlign: 'top',
                zIndex: elements.length
            }
            addElement(newText as any)
            setSelectedId(id)
            setEditingTextId(id)

            setTimeout(() => {
                if (textareaRef.current) {
                    textareaRef.current.value = ""
                    textareaRef.current.focus()
                }
            }, 50)
            return
        }

        if (externalTool === 'pen' || externalTool === 'highlighter' || (externalTool === 'eraser' && eraserType === 'pixel')) {
            setIsDrawing(true)
            const { saveHistory, updatePages, activePlanner, currentPageIndex } = usePlannerStore.getState()
            if (!activePlanner) return
            saveHistory()
            const id = `path-${Date.now()}`
            const newElement = {
                id,
                type: 'path' as any,
                x: pos.x,
                y: pos.y,
                rotation: 0,
                scaleX: 1,
                scaleY: 1,
                tool: externalTool,
                brushType: externalTool === 'highlighter' ? 'marker' : brushType,
                points: [pos.x, pos.y],
                stroke: externalTool === 'eraser' ? '#FFFFFF' : externalTool === 'highlighter' ? highlighterColor : penColor,
                strokeWidth: externalTool === 'eraser' ? eraserSize : externalTool === 'highlighter' ? highlighterWidth : penWidth,
                opacity: externalTool === 'highlighter' ? highlighterOpacity : penOpacity,
                zIndex: elements.length
            }
            const newPages = [...activePlanner.pages]
            newPages[currentPageIndex].elements = [...newPages[currentPageIndex].elements, normalizeElement(newElement)]
            updatePages(newPages)
            return
        }

        if (externalTool === 'eraser' && (eraserType === 'stroke' || eraserType === 'object')) {
            setIsDrawing(true)
            return
        }

        if (externalTool === 'shape') {
            const { addElement } = usePlannerStore.getState()
            setIsDrawing(true)
            const id = `shape-${Date.now()}`
            const shape = {
                id,
                type: 'shape',
                shapeType: shapeType,
                x: pos.x,
                y: pos.y,
                width: 1,
                height: 1,
                rotation: 0,
                scaleX: 1,
                scaleY: 1,
                stroke: shapeStrokeColor,
                strokeWidth: shapeStrokeWidth,
                fill: shapeFillColor,
                filled: shapeFilled,
                zIndex: elements.length
            }
            addElement(shape as any)
            setNewShapeId(id)
            return
        }

        if (externalTool === 'link') {
            setIsDrawing(true)
            setTempLinkRect({
                x: pos.x,
                y: pos.y,
                width: 0,
                height: 0
            })
            return
        }

        if (externalTool === 'lasso') {
            setIsDrawing(true)
            setLassoPoints([pos.x, pos.y])
            return
        }
    }

    const handleMouseMove = (e: any) => {
        const stage = e.target.getStage()
        const pos = viewportRef.current ? viewportRef.current.getRelativePointerPosition() : stage.getPointerPosition();
        if (!pos) return;

        if (!pos) return;

        // Update cursor position directly (bypass React render)
        if (brushCursorRef.current) {
            brushCursorRef.current.position(pos);
            brushCursorRef.current.visible(
                externalTool === 'pen' || externalTool === 'highlighter' || externalTool === 'eraser'
            );
            // Verify layer existence before drawing
            const layer = brushCursorRef.current.getLayer();
            if (layer) layer.batchDraw();
        }

        if (!isDrawing) return

        if (externalTool === 'link' && tempLinkRect) {
            setTempLinkRect({
                ...tempLinkRect,
                width: pos.x - tempLinkRect.x,
                height: pos.y - tempLinkRect.y
            })
            return
        }

        if (externalTool === 'eraser' && (eraserType === 'stroke' || eraserType === 'object')) {
            const eraserRadius = eraserSize / 2
            const { saveHistory, updatePages, activePlanner, currentPageIndex } = usePlannerStore.getState()
            if (!activePlanner) return
            saveHistory()

            const newPages = [...activePlanner.pages]
            const pgEls = [...newPages[currentPageIndex].elements]

            if (eraserType === 'stroke') {
                newPages[currentPageIndex].elements = pgEls.filter(el => {
                    if (el.isLocked) return true
                    const isPath = el.type === 'path' || (el as any).type === 'path'
                    if (!isPath) return true
                    const points = (el as any).points || []
                    for (let i = 0; i < points.length; i += 2) {
                        const dist = Math.sqrt(Math.pow(points[i] - pos.x, 2) + Math.pow(points[i + 1] - pos.y, 2))
                        if (dist < eraserRadius) return false
                    }
                    return true
                })
            }

            if (eraserType === 'object') {
                newPages[currentPageIndex].elements = pgEls.filter(el => {
                    if (el.isLocked) return true
                    const isPath = el.type === 'path' || (el as any).type === 'path'
                    if (isPath) return true
                    // Check bounding box/distance for texts and shapes
                    const dist = Math.sqrt(Math.pow(el.x - pos.x, 2) + Math.pow(el.y - pos.y, 2))
                    return dist > eraserRadius * 2
                })
            }
            updatePages(newPages)
            return
        }

        if (externalTool === 'pen' || externalTool === 'highlighter' || (externalTool === 'eraser' && eraserType === 'pixel')) {
            const { updatePages, activePlanner, currentPageIndex } = usePlannerStore.getState()
            if (!activePlanner) return
            const newPages = [...activePlanner.pages]
            const pgEls = [...newPages[currentPageIndex].elements]
            const lastPathIdx = pgEls.length - 1
            const lastPath = { ...pgEls[lastPathIdx] } as any
            if (lastPath && (lastPath.type === 'path' || (lastPath as any).type === 'path')) {
                lastPath.points = (lastPath.points || []).concat([pos.x, pos.y])
                pgEls[lastPathIdx] = lastPath
                newPages[currentPageIndex].elements = pgEls
                updatePages(newPages)
            }
        } else if (externalTool === 'shape' && newShapeId) {
            const { updateElement: upEl } = usePlannerStore.getState()
            const shape = elements.find(el => el.id === newShapeId)
            if (shape) {
                upEl(newShapeId, { width: pos.x - shape.x, height: pos.y - shape.y })
            }
        } else if (externalTool === 'lasso') {
            setLassoPoints(prev => [...prev, pos.x, pos.y])
        }
    }


    const handleMouseUp = () => {
        // Save history when drawing ends (ink path completed)
        if (isDrawing && (externalTool === 'pen' || externalTool === 'highlighter' || externalTool === 'eraser')) {
            const { saveHistory } = usePlannerStore.getState();
            saveHistory();
        }

        if (isDrawing && externalTool === 'link' && tempLinkRect) {
            // ... (existing link logic)
            const normalized = {
                x: tempLinkRect.width < 0 ? tempLinkRect.x + tempLinkRect.width : tempLinkRect.x,
                y: tempLinkRect.height < 0 ? tempLinkRect.y + tempLinkRect.height : tempLinkRect.y,
                width: Math.abs(tempLinkRect.width),
                height: Math.abs(tempLinkRect.height)
            }
            if (normalized.width > 10 && normalized.height > 10) {
                setPendingLink(normalized)
                setShowLinkModal(true)
            }
            setTempLinkRect(null)
        }

        if (isDrawing && externalTool === 'lasso' && lassoPoints.length > 4) {
            // Selection Logic
            const selectedIds: string[] = [];

            elements.forEach((el: any) => {
                if (el.type === 'background' || el.isLocked) return;

                let isSelected = false;

                if (el.type === 'path' && el.points) {
                    // For paths (ink/lines), check sample points + centroid
                    let sumX = 0, sumY = 0;
                    const pointCount = el.points.length / 2;

                    for (let i = 0; i < el.points.length; i += 2) {
                        const px = el.points[i];
                        const py = el.points[i + 1];
                        sumX += px;
                        sumY += py;

                        // Sample every ~5th point (i is index, so +=2 means i%10 is every 5th point)
                        if (i % 10 === 0) {
                            if (isPointInPolygon({ x: px, y: py }, lassoPoints)) {
                                isSelected = true;
                                break;
                            }
                        }
                    }

                    // Fallback to centroid if no points matched samples
                    if (!isSelected && pointCount > 0) {
                        const centerX = sumX / pointCount;
                        const centerY = sumY / pointCount;
                        if (isPointInPolygon({ x: centerX, y: centerY }, lassoPoints)) {
                            isSelected = true;
                        }
                    }
                } else {
                    // For boxes/images/shapes, use middle point
                    const centerX = el.x + (el.width || 0) / 2;
                    const centerY = el.y + (el.height || 0) / 2;
                    if (isPointInPolygon({ x: centerX, y: centerY }, lassoPoints)) {
                        isSelected = true;
                    }
                }

                if (isSelected) {
                    selectedIds.push(el.id);
                }
            });

            if (selectedIds.length > 0) {
                usePlannerStore.setState({ selection: selectedIds });
                // If only one, update selectedId for backward compatibility
                if (selectedIds.length === 1) setSelectedId(selectedIds[0]);
                else setSelectedId(null);
            } else {
                usePlannerStore.setState({ selection: [] });
                setSelectedId(null);
            }

            setLassoPoints([]);
        }

        setIsDrawing(false)
        setNewShapeId(null)
    }

    const handleMouseLeave = () => {
        if (brushCursorRef.current) {
            brushCursorRef.current.visible(false);
        }
    }

    const handleTextDblClick = (id: string) => {
        const textEl = elements.find(el => el.id === id)
        if (textEl) {
            setEditingTextId(id)
            setSelectedId(id)
            setTimeout(() => {
                if (textareaRef.current) {
                    textareaRef.current.value = textEl.text || ""
                    textareaRef.current.focus()
                    // Remove auto-select for a more natural single-click experience
                }
            }, 50)
        }
    }

    const updateElement = (id: string, newAttrs: any) => {
        const { updateElement: upEl } = usePlannerStore.getState()
        upEl(id, newAttrs)
    }

    const handleApplyAIResult = (result: string, _type: AIFeature) => {
        const { addElement } = usePlannerStore.getState()
        const id = `text-ai-${Date.now()}`
        const newText = {
            id,
            type: 'text',
            text: result,
            x: 100,
            y: 100,
            fontSize: 24,
            rotation: 0,
            scaleX: 1,
            scaleY: 1,
            fontFamily: 'Inter',
            fontStyle: 'normal',
            align: 'left',
            fill: penColor,
            zIndex: elements.length
        }
        addElement(newText as any)
        setSelectedId(id)
    }

    const handleUndo = () => {
        const { undo } = usePlannerStore.getState()
        undo()
    }

    const handleRedo = () => {
        const { redo } = usePlannerStore.getState()
        redo()
    }



    const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault()
        const stage = stageRef.current?.getStage()
        if (!stage) return
        // Use relative pointer position from the viewport group to get canvas coordinates
        const pointerPos = viewportRef.current ? viewportRef.current.getRelativePointerPosition() : stage.getPointerPosition();
        if (!pointerPos) return
        const { x, y } = pointerPos

        if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
            Array.from(e.dataTransfer.files).forEach(file => {
                if (file.type.startsWith('image/')) {
                    const reader = new FileReader()
                    reader.onload = (event) => {
                        if (event.target?.result) {
                            handleAddImage(event.target.result as string, x, y)
                        }
                    }
                    reader.readAsDataURL(file)
                }
            })
        }

        const uri = e.dataTransfer.getData('text/uri-list')
        if (uri) handleAddImage(uri, x, y)

        const jsonData = e.dataTransfer.getData('application/json')
        if (jsonData) {
            try {
                const data = JSON.parse(jsonData)
                if (data.url) handleAddImage(data.url, x, y)
            } catch (err) {
                console.error("Failed to parse drop data", err)
            }
        }
    }

    const handleWheel = (e: any) => {
        e.evt.preventDefault();
        const stage = stageRef.current.getStage();
        const pointer = stage.getPointerPosition();
        if (!pointer) return;

        // Get latest state
        const currentState = usePlannerStore.getState();
        const oldScale = currentState.zoomScale;
        const currentPan = currentState.panPosition;

        const scaleBy = 1.1;
        const newScale = e.evt.deltaY < 0 ? oldScale * scaleBy : oldScale / scaleBy;
        const clampedScale = Math.min(Math.max(0.1, newScale), 5);

        // Zoom to pointer math relative - since Group centers the page, 
        // we adjust panPosition to keep pointer stationary
        const mousePointTo = {
            x: (pointer.x - currentPan.x) / oldScale,
            y: (pointer.y - currentPan.y) / oldScale,
        };

        setZoomScale(clampedScale);
        setPanPosition({
            x: pointer.x - mousePointTo.x * clampedScale,
            y: pointer.y - mousePointTo.y * clampedScale,
        });
    };




    return (
        <div
            ref={containerRef}
            className="flex-1 flex flex-col items-center justify-center relative bg-[#FDFCFB] h-full overflow-hidden w-full"
            style={{ touchAction: 'none' }}
        >
            <div
                className="w-full h-full relative"
                onDrop={handleDrop}
                onDragOver={(e) => e.preventDefault()}
                style={{ touchAction: 'none' }}
            >
                <Stage
                    width={containerSize.width}
                    height={containerSize.height}
                    style={{ touchAction: 'none' }}
                    onMouseDown={handleMouseDown}
                    onMouseMove={handleMouseMove}
                    onMouseUp={handleMouseUp}
                    onMouseLeave={handleMouseLeave}
                    onTouchStart={(e) => {
                        handleTouchStart(e);

                        // STRICT MODE:
                        // 1. If Select Tool: Wait for default loop (handleTouchStart handles Zoom). 
                        //    Only mouse down if 1 finger AND NOT Zooming.

                        // 2. If Drawing Tool (Pen/Highlighter): DRAW IMMEDIATELY.
                        //    Ignore Zoom check (handleTouchStart won't engage zoom anyway due to externalTool check).

                        if (externalTool !== 'select') {
                            // Drawing Mode: Instant Start
                            handleMouseDown(e);
                        } else {
                            // Select Mode: Standard Zoom/Pan checks
                            if (e.evt.touches.length === 1 && !interactionRef.current.isZooming) {
                                handleMouseDown(e);
                            }
                        }
                    }}
                    onTouchMove={(e) => {
                        handleTouchMove(e);

                        if (externalTool !== 'select') {
                            // Drawing Mode: Always move
                            handleMouseMove(e);
                        } else {
                            // Select Mode: Only move if single finger and not zooming
                            if (e.evt.touches.length === 1 && !interactionRef.current.isZooming) {
                                handleMouseMove(e);
                            }
                        }
                    }}
                    onTouchEnd={(e) => {
                        if (e.evt.touches.length < 2) {
                            interactionRef.current.isZooming = false;
                        }

                        // SWIPE DETECTION: Only if not zoomed in and not selecting
                        if (zoomScale < 1.05 && touchStartPos.current && e.evt.changedTouches.length === 1 && !selectedId) {
                            const dx = e.evt.changedTouches[0].clientX - touchStartPos.current.x;
                            const dy = e.evt.changedTouches[0].clientY - touchStartPos.current.y;

                            const absDx = Math.abs(dx);
                            const absDy = Math.abs(dy);

                            if (absDx > 120 && absDy < absDx / 2) { // Increased threshold to 120
                                if (dx > 0) prevPage();
                                else nextPage();
                                touchStartPos.current = null;
                                return;
                            }
                        }
                        touchStartPos.current = null;
                        handleMouseUp();
                    }}
                    onWheel={handleWheel}
                    x={stagePos.x}
                    y={stagePos.y}
                    draggable={externalTool === 'select'}
                    onDragEnd={(e) => {
                        if (e.target === stageRef.current.getStage()) {
                            setPanPosition({ x: e.target.x(), y: e.target.y() });
                        }
                    }}
                    ref={stageRef}
                    onContextMenu={handleContextMenu}
                    className={`bg - white shadow - sm transition - all duration - 75 ${externalTool === 'select' ? 'cursor-grab active:cursor-grabbing' : 'cursor-crosshair'} `}
                >
                    {/* Layer 1: Persistent Template Background - Immune to destination-out eraser */}
                    <Layer>
                        <Group
                            x={containerSize.width / 2}
                            y={containerSize.height / 2}
                            scaleX={stageScale}
                            scaleY={stageScale}
                            rotation={canvasRotation}
                            offset={{ x: canvasWidth / 2, y: canvasHeight / 2 }}
                        >
                            <Rect
                                x={0}
                                y={0}
                                width={canvasWidth}
                                height={canvasHeight}
                                fill="#ffffff"
                                shadowBlur={10}
                                shadowOpacity={0.1}
                            />
                            <CanvasBackground
                                elements={elements}
                                width={canvasWidth}
                                height={canvasHeight}
                                onSelect={() => externalTool === 'select' && setSelectedId(null)}
                            />
                            {/* Render ONLY locked elements here */}
                            {elements.map((el) => {
                                if (el.type === 'background' || !el.isLocked) return null;
                                return (
                                    <PlannerElementRenderer
                                        key={el.id}
                                        element={el}
                                        isSelected={selectedId === el.id}
                                        onSelect={setSelectedId}
                                        externalTool={externalTool as any}
                                        onEditAsset={onEditAsset}
                                        onTextDblClick={handleTextDblClick}
                                        editingTextId={editingTextId}
                                    />
                                );
                            })}
                        </Group>
                    </Layer>

                    {/* Layer 2: Interactive User Content - Targeted by eraser */}
                    <Layer hitGraphEnabled={true}>
                        <Group
                            ref={viewportRef}
                            x={containerSize.width / 2}
                            y={containerSize.height / 2}
                            scaleX={stageScale}
                            scaleY={stageScale}
                            rotation={canvasRotation}
                            offset={{ x: canvasWidth / 2, y: canvasHeight / 2 }}
                        >

                            {/* Temp Link Rect while drawing */}
                            {tempLinkRect && (
                                <Rect
                                    x={tempLinkRect.x}
                                    y={tempLinkRect.y}
                                    width={tempLinkRect.width}
                                    height={tempLinkRect.height}
                                    fill="rgba(0, 150, 255, 0.2)"
                                    stroke="rgba(0, 150, 255, 0.8)"
                                    strokeWidth={1}
                                    dash={[5, 5]}
                                />
                            )}

                            {/* Render ONLY unlocked elements here - excluding paths in separate group */}
                            {elements.map((el) => {
                                if (el.type === 'background' || el.isLocked || el.type === 'ocr_metadata' || el.type === 'path') return null;
                                return (
                                    <PlannerElementRenderer
                                        key={el.id}
                                        element={el}
                                        isSelected={selectedId === el.id}
                                        onSelect={setSelectedId}
                                        externalTool={externalTool as any}
                                        onEditAsset={onEditAsset}
                                        onTextDblClick={handleTextDblClick}
                                        editingTextId={editingTextId}
                                        onVoicePlay={setActiveVoiceId}
                                    />
                                );
                            })}

                            {/* Group for Ink Paths (Targeted for OCR) */}
                            <Group ref={inkGroupRef}>
                                {elements.map((el) => {
                                    if (el.type !== 'path' || el.isLocked) return null;
                                    return (
                                        <PlannerElementRenderer
                                            key={el.id}
                                            element={el}
                                            isSelected={selectedId === el.id}
                                            onSelect={setSelectedId}
                                            externalTool={externalTool as any}
                                            onEditAsset={onEditAsset}
                                            onTextDblClick={handleTextDblClick}
                                            editingTextId={editingTextId}
                                            onVoicePlay={setActiveVoiceId}
                                        />
                                    );
                                })}
                            </Group>

                            {/* Links Layer - Always on top for clickability */}
                            {links.map((link) => (
                                <Group key={link.id}>
                                    <Rect
                                        x={link.x}
                                        y={link.y}
                                        width={link.width}
                                        height={link.height}
                                        fill={editMode === 'write' ? 'rgba(0, 150, 255, 0.02)' : 'transparent'}
                                        stroke={editMode === 'write' ? 'rgba(0, 150, 255, 0.1)' : undefined}
                                        strokeWidth={0.5}
                                        dash={editMode === 'write' ? [3, 3] : undefined}
                                        onMouseEnter={(e) => {
                                            if (externalTool === 'select' || externalTool === 'link') {
                                                const container = e.target.getStage()?.container();
                                                if (container) container.style.cursor = 'pointer';
                                            }
                                        }}
                                        onMouseLeave={(e) => {
                                            const container = e.target.getStage()?.container();
                                            if (container) container.style.cursor = externalTool === 'select' ? 'default' : 'crosshair';
                                        }}
                                        onDblClick={() => {
                                            if (externalTool === 'select' || externalTool === 'link') {
                                                if (link.targetPageIndex !== undefined) {
                                                    usePlannerStore.getState().goToPage(link.targetPageIndex);
                                                } else if (link.url) {
                                                    window.open(link.url, '_blank');
                                                }
                                            }
                                        }}
                                        onDblTap={() => {
                                            if (externalTool === 'select' || externalTool === 'link') {
                                                if (link.targetPageIndex !== undefined) {
                                                    usePlannerStore.getState().goToPage(link.targetPageIndex);
                                                } else if (link.url) {
                                                    window.open(link.url, '_blank');
                                                }
                                            }
                                        }}
                                        onClick={() => {
                                            if (externalTool === 'select' || externalTool === 'link') {
                                                if (link.targetPageIndex !== undefined) {
                                                    usePlannerStore.getState().goToPage(link.targetPageIndex);
                                                } else if (link.url) {
                                                    window.open(link.url, '_blank');
                                                }
                                            }
                                        }}
                                        onTap={() => {
                                            if (externalTool === 'select' || externalTool === 'link') {
                                                if (link.targetPageIndex !== undefined) {
                                                    usePlannerStore.getState().goToPage(link.targetPageIndex);
                                                } else if (link.url) {
                                                    window.open(link.url, '_blank');
                                                }
                                            }
                                        }}
                                    />
                                    {link.note && (
                                        <KonvaText
                                            x={link.x}
                                            y={link.y + link.height + 2}
                                            text={link.note}
                                            fontSize={12}
                                            fill="#4B5563"
                                            fontStyle="italic"
                                            listening={false}
                                        />
                                    )}
                                    {link.note && editMode === 'write' && (
                                        <KonvaText
                                            x={link.x + 2}
                                            y={link.y + 2}
                                            text={link.note}
                                            fontSize={10}
                                            fontStyle="bold"
                                            fill="#4F46E5"
                                            listening={false}
                                        />
                                    )}
                                </Group>
                            ))}

                            {/* Sub-Selection indicator logic */}
                            {(selection.length > 0 || selectedId) && (
                                <Transformer
                                    ref={trRef}
                                    flipEnabled={false}
                                    boundBoxFunc={(oldBox, newBox) => {
                                        if (Math.abs(newBox.width) < 5 || Math.abs(newBox.height) < 5) return oldBox;
                                        return newBox;
                                    }}
                                />
                            )}

                            {/* Lasso Selection Line */}
                            {lassoPoints.length > 0 && (
                                <Line
                                    points={lassoPoints}
                                    stroke="#4F46E5"
                                    strokeWidth={1}
                                    dash={[10, 5]}
                                    closed={true}
                                />
                            )}

                            {/* Brush Cursor Preview - Always rendered but toggled/moved via Ref */}
                            {(externalTool === 'pen' || externalTool === 'highlighter' || externalTool === 'eraser') && (
                                <Circle
                                    ref={brushCursorRef}
                                    x={0} // Controlled by ref
                                    y={0} // Controlled by ref
                                    visible={false} // Initially hidden
                                    radius={
                                        externalTool === 'eraser' ? eraserSize / 2 :
                                            externalTool === 'highlighter' ? highlighterWidth / 2 :
                                                penWidth / 2
                                    }
                                    stroke={
                                        externalTool === 'eraser' ? '#000000' :
                                            externalTool === 'highlighter' ? highlighterColor :
                                                penColor
                                    }
                                    strokeWidth={1}
                                    fill={
                                        externalTool === 'eraser' ? 'rgba(255, 255, 255, 0.8)' :
                                            externalTool === 'highlighter' ? highlighterColor :
                                                penColor
                                    }
                                    opacity={externalTool === 'eraser' ? 0.8 : (externalTool === 'highlighter' ? 0.4 : 0.6)}
                                    listening={false}
                                    perfectDrawEnabled={false}
                                    shadowBlur={externalTool === 'eraser' ? 5 : 0}
                                    shadowColor="rgba(0,0,0,0.2)"
                                />
                            )}
                        </Group>
                    </Layer>
                </Stage>



                {/* Smart Action Bar for AI & Selections */}
                {selectionRect && (
                    <SmartActionBar
                        isVisible={true}
                        position={{
                            x: stagePos.x + (containerSize.width / 2) + (selectionRect.x + selectionRect.width / 2 - canvasWidth / 2) * stageScale,
                            y: stagePos.y + (containerSize.height / 2) + (selectionRect.y - canvasHeight / 2) * stageScale
                        }}
                        showAI={externalTool === 'lasso'}
                        onConvertToText={handleConvertToText}
                        onMakeArt={handleMakeArt}
                        onDelete={() => {
                            const { deleteElement } = usePlannerStore.getState();
                            const targetIds = selectedId ? [selectedId] : selection;
                            targetIds.forEach(id => deleteElement(id));
                            usePlannerStore.setState({ selection: [] });
                            setSelectedId(null);
                        }}
                        onDuplicate={() => {
                            const { addElement } = usePlannerStore.getState();
                            const targetIds = selectedId ? [selectedId] : selection;
                            targetIds.forEach(id => {
                                const el = elements.find(e => e.id === id);
                                if (el) {
                                    addElement({
                                        ...el,
                                        id: `${el.id}-copy-${Date.now()}`,
                                        x: el.x + 20,
                                        y: el.y + 20,
                                        zIndex: elements.length
                                    });
                                }
                            });
                        }}
                    />
                )}

                {editingTextId && (() => {
                    const text = elements.find(el => el.id === editingTextId)
                    if (!text) return null
                    return (
                        <textarea
                            ref={textareaRef}
                            className="absolute pointer-events-auto rounded p-[8px] outline-none shadow-xl scrollbar-hide"
                            style={{
                                left: stagePos.x + (containerSize.width / 2) + (text.x - canvasWidth / 2) * stageScale,
                                top: stagePos.y + (containerSize.height / 2) + (text.y - canvasHeight / 2) * stageScale,
                                width: (text.width || 200) * stageScale,
                                height: (text.height || 100) * stageScale,
                                fontSize: `${(text.fontSize || 16) * stageScale}px`,
                                fontFamily: text.fontFamily,
                                color: text.fill,
                                backgroundColor: text.backgroundColor || 'white',
                                borderColor: text.borderColor || '#4F46E5',
                                borderWidth: text.borderWidth ? `${text.borderWidth * stageScale}px` : `${2 * stageScale}px`, // Scale border
                                borderStyle: 'solid',
                                fontWeight: text.fontStyle?.includes('bold') ? 'bold' : 'normal',
                                fontStyle: text.fontStyle?.includes('italic') ? 'italic' : 'normal',
                                textAlign: text.align || 'left',
                                // Vertical alignment emulation for textarea
                                paddingTop: text.verticalAlign === 'middle' ? `${Math.max(8, ((text.height || 100) - (text.fontSize || 16)) / 2) * stageScale}px` : text.verticalAlign === 'bottom' ? `${Math.max(8, (text.height || 100) - (text.fontSize || 16) - 16) * stageScale}px` : `${8 * stageScale}px`,
                                overflow: 'hidden',
                                resize: 'none',
                                lineHeight: '1.2'
                            }}
                            onBlur={() => setEditingTextId(null)}
                            onChange={(e) => updateElement(text.id, { text: e.target.value })}
                        />
                    )
                })()}

                {/* Voice Player Overlay */}
                {activeVoiceId && (() => {
                    const voice = elements.find(el => el.id === activeVoiceId)
                    if (!voice) return null
                    return (
                        <VoicePlayer
                            src={voice.url || (voice as any).src || ''}
                            duration={voice.duration || 0}
                            x={voice.x || 0}
                            y={voice.y || 0}
                            onClose={() => setActiveVoiceId(null)}
                        />
                    )
                })()}

                <LinkTargetModal
                    isOpen={showLinkModal}
                    onClose={() => {
                        setShowLinkModal(false)
                        setPendingLink(null)
                    }}
                    pages={activePlanner?.pages.map((p, i) => ({ id: p.id, name: p.name || undefined, index: i })) || []}
                    onSave={(target) => {
                        if (pendingLink) {
                            const { addLink } = usePlannerStore.getState();
                            addLink({
                                id: `link-${Date.now()}`,
                                ...pendingLink,
                                type: 'hotspot',
                                ...target
                            });
                        }
                        setShowLinkModal(false)
                        setPendingLink(null)
                    }}
                />

                <GenArtModal
                    isOpen={showGenArtModal}
                    onClose={() => setShowGenArtModal(false)}
                    onGenerate={handleGenerateArt}
                />

                {/* Magic Dust Generation Loader */}
                {isGeneratingArt && selectionRect && (
                    <div
                        className="absolute pointer-events-none z-[80] overflow-hidden rounded-2xl border-2 border-indigo-400/50 bg-indigo-500/10 backdrop-blur-[2px] flex flex-col items-center justify-center gap-3 animate-pulse"
                        style={{
                            left: stagePos.x + (containerSize.width / 2) + (selectionRect.x - canvasWidth / 2) * stageScale,
                            top: stagePos.y + (containerSize.height / 2) + (selectionRect.y - canvasHeight / 2) * stageScale,
                            width: selectionRect.width * stageScale,
                            height: selectionRect.height * stageScale,
                        }}
                    >
                        <div className="absolute inset-0 overflow-hidden">
                            {[...Array(12)].map((_, i) => (
                                <div
                                    key={i}
                                    className="absolute w-1 h-1 bg-white rounded-full animate-magic-dust"
                                    style={{
                                        left: `${Math.random() * 100}% `,
                                        top: `${Math.random() * 100}% `,
                                        animationDelay: `${Math.random() * 2} s`
                                    }}
                                />
                            ))}
                        </div>
                        <Sparkles className="w-8 h-8 text-white animate-spin-slow" />
                        <span className="text-[10px] font-bold text-white uppercase tracking-[0.2em] drop-shadow-md">Manifesting...</span>
                    </div>
                )}

                <style>{`
                    @keyframes magic-dust {
                        0% { transform: translateY(0) scale(0); opacity: 0; }
                        50% { opacity: 1; }
                        100% { transform: translateY(-40px) scale(1.5); opacity: 0; }
                    }
                    .animate-magic-dust {
                        animation: magic-dust 2s infinite ease-out;
                    }
                    .animate-spin-slow {
                        animation: spin 3s linear infinite;
                    }
                `}</style>
            </div >
            {/* Context Menu */}
            {
                contextMenu.visible && (
                    <ContextMenu
                        x={contextMenu.x * stageScale + stagePos.x}
                        y={contextMenu.y * stageScale + stagePos.y}
                        hasSelection={!!selectedId}
                        hasClipboard={!!clipboard}
                        onClose={() => setContextMenu({ ...contextMenu, visible: false })}
                        onCopy={() => {
                            const element = elements.find(el => el.id === selectedId)
                            if (element) setClipboard(JSON.parse(JSON.stringify(element)))
                        }}
                        onPaste={() => {
                            if (clipboard) {
                                const { addElement } = usePlannerStore.getState()
                                const id = `${clipboard.type}-${Date.now()}`
                                const newElement = {
                                    ...clipboard,
                                    id,
                                    x: contextMenu.x,
                                    y: contextMenu.y,
                                    zIndex: elements.length
                                }
                                addElement(newElement as any)
                                setSelectedId(id)
                                setSaving(true)
                            }
                        }}
                        onDelete={() => {
                            if (selectedId) {
                                const { deleteElement } = usePlannerStore.getState()
                                deleteElement(selectedId)
                                setSelectedId(null)
                            }
                        }}
                        onBringToFront={() => {
                            if (selectedId) {
                                const { activePlanner, currentPageIndex, updatePages, saveHistory } = usePlannerStore.getState()
                                if (!activePlanner) return
                                saveHistory()
                                const newPages = [...activePlanner.pages]
                                const els = [...newPages[currentPageIndex].elements]
                                const item = els.find(el => el.id === selectedId)
                                if (!item) return
                                const rest = els.filter(el => el.id !== selectedId)
                                newPages[currentPageIndex].elements = [...rest, item]
                                updatePages(newPages)
                            }
                        }}
                        onSendToBack={() => {
                            if (selectedId) {
                                const { activePlanner, currentPageIndex, updatePages, saveHistory } = usePlannerStore.getState()
                                if (!activePlanner) return
                                saveHistory()
                                const newPages = [...activePlanner.pages]
                                const els = [...newPages[currentPageIndex].elements]
                                const item = els.find(el => el.id === selectedId)
                                if (!item) return
                                const rest = els.filter(el => el.id !== selectedId)
                                newPages[currentPageIndex].elements = [item, ...rest]
                                updatePages(newPages)
                            }
                        }}
                    />
                )
            }
        </div >
    )
})
