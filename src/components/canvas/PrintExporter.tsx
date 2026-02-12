import { useState, useEffect, useRef } from 'react';
import { Stage, Layer, Rect, Line } from 'react-konva';
import jsPDF from 'jspdf';
import { usePlannerStore } from '@/store/plannerStore';
import { PlannerElementRenderer } from './PlannerElementRenderer';
import { normalizeElement } from '@/store/plannerStore';
import { InkPath } from '@/types/planner';

// Helper component to render background with proper CORS handling
const BackgroundImage = ({ bgElement, width, height }: { bgElement: any, width: number, height: number }) => {
    const bgFill = bgElement?.fill || "white";
    const isImage = bgFill.startsWith('data:image/') || bgFill.startsWith('http') || bgFill.startsWith('blob:');
    const [image, setImage] = useState<HTMLImageElement | null>(null);

    useEffect(() => {
        if (!isImage) return;

        // For blob URLs, we need to convert to data URL first to avoid CORS issues
        if (bgFill.startsWith('blob:')) {
            fetch(bgFill)
                .then(res => res.blob())
                .then(blob => {
                    const reader = new FileReader();
                    reader.onloadend = () => {
                        const dataUrl = reader.result as string;
                        const img = new window.Image();
                        img.onload = () => setImage(img);
                        img.onerror = (e) => {
                            console.warn('[BackgroundImage] Failed to load blob as data URL:', e);
                            setImage(null);
                        };
                        img.src = dataUrl;
                    };
                    reader.readAsDataURL(blob);
                })
                .catch(e => {
                    console.warn('[BackgroundImage] Failed to fetch blob:', e);
                    setImage(null);
                });
            return;
        }

        const img = new window.Image();
        // CRITICAL: Set crossOrigin before setting src to avoid CORS issues
        img.crossOrigin = 'anonymous';

        img.onload = () => {
            setImage(img);
        };

        img.onerror = (e) => {
            console.warn('[BackgroundImage] Failed to load image:', bgFill.substring(0, 100), e);
            setImage(null);
        };

        img.src = bgFill;

        return () => {
            img.onload = null;
            img.onerror = null;
        };
    }, [bgFill, isImage]);

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
                listening={false}
            />
        );
    }

    return (
        <Rect
            width={width}
            height={height}
            fill={bgFill}
            listening={false}
        />
    );
};

interface PrintExporterProps {
    range: 'all' | 'current' | 'custom';
    customRange?: string; // "1-5, 8"
    onClose: () => void;
    onProgress: (current: number, total: number) => void;
    onComplete: () => void;
}

export const PrintExporter = ({ range, customRange, onClose, onProgress, onComplete }: PrintExporterProps) => {
    const { activePlanner, currentPageIndex } = usePlannerStore();
    const [currentIndex, setCurrentIndex] = useState(-1);
    const [pagesToPrint, setPagesToPrint] = useState<number[]>([]);
    const [isPrinting, setIsPrinting] = useState(false);

    // Virtual Stage Ref
    const stageRef = useRef<any>(null);

    // Initialize list of pages to print
    useEffect(() => {
        if (!activePlanner) return;

        let pages: number[] = [];
        const totalPages = activePlanner.pages.length;

        if (range === 'all') {
            pages = Array.from({ length: totalPages }, (_, i) => i);
        } else if (range === 'current') {
            pages = [currentPageIndex];
        } else if (range === 'custom' && customRange) {
            // Parse "1-3, 5" -> [0, 1, 2, 4] (0-indexed)
            const parts = customRange.split(',');
            parts.forEach(part => {
                const rangeMatch = part.match(/(\d+)-(\d+)/);
                if (rangeMatch) {
                    const start = parseInt(rangeMatch[1]) - 1;
                    const end = parseInt(rangeMatch[2]) - 1;
                    for (let i = Math.max(0, start); i <= Math.min(totalPages - 1, end); i++) {
                        if (!pages.includes(i)) pages.push(i);
                    }
                } else {
                    const num = parseInt(part.trim()) - 1;
                    if (!isNaN(num) && num >= 0 && num < totalPages) {
                        if (!pages.includes(num)) pages.push(num);
                    }
                }
            });
            pages.sort((a, b) => a - b);
        }

        if (pages.length === 0) {
            alert("No pages selected to print.");
            onClose();
            return;
        }

        setPagesToPrint(pages);
        startPrinting(pages);
    }, []);

    const pdfRef = useRef<jsPDF | null>(null);
    const PX_TO_MM = 25.4 / 96;

    const startPrinting = async (pages: number[]) => {
        if (!activePlanner || pages.length === 0) return;

        setIsPrinting(true);

        // Get dimensions of the first page to initialize PDF
        const firstPageData = activePlanner.pages[pages[0]];
        const wPx = firstPageData?.dimensions?.width || 800;
        const hPx = firstPageData?.dimensions?.height || 1000;

        const wMm = wPx * PX_TO_MM;
        const hMm = hPx * PX_TO_MM;

        // Initialize PDF with the first page's size
        pdfRef.current = new jsPDF({
            orientation: wMm > hMm ? 'l' : 'p',
            unit: 'mm',
            format: [wMm, hMm]
        });

        // Start processing first page
        setCurrentIndex(0);
    };

    // Trigger processing when index changes
    useEffect(() => {
        if (!isPrinting || currentIndex === -1) return;

        if (currentIndex >= pagesToPrint.length) {
            // DONE
            if (pdfRef.current) {
                // Remove the first empty page added by default constructor if we added our own pages?
                // actually jspdf starts with 1 page.
                // We will delete page 1 if we added pages, OR we just write to page 1 first.
                // Simpler: just save.
                pdfRef.current.save(`${activePlanner?.name || 'planner'} -export.pdf`);
                onComplete();
            }
            return;
        }

        const processPage = async () => {
            onProgress(currentIndex + 1, pagesToPrint.length);
            // Wait for render cycle
            // Increase timeout to ensure blob conversion, background images, stickers, and all content loads
            setTimeout(() => {
                captureAndAdvance();
            }, 3000);
        };

        processPage();

    }, [currentIndex, isPrinting, pagesToPrint]);

    const captureAndAdvance = async () => {
        if (!stageRef.current) return;

        try {
            // Use toDataURL with callback to ensure all images are loaded
            const stage = stageRef.current.getStage();

            // Check for tainted canvas by attempting toDataURL
            let dataUrl: string;
            try {
                dataUrl = stage.toDataURL({
                    pixelRatio: 2,
                    mimeType: 'image/png'
                });
            } catch (corsError) {
                console.error('[PrintExporter] CORS error on page', pagesToPrint[currentIndex], ':', corsError);
                // Skip this page and continue
                setCurrentIndex(prev => prev + 1);
                return;
            }

            if (pdfRef.current) {
                const pdf = pdfRef.current;

                // Calculate dimensions for the CURRENT page
                const wPx = pageData?.dimensions?.width || 800;
                const hPx = pageData?.dimensions?.height || 1000;
                const wMm = wPx * PX_TO_MM;
                const hMm = hPx * PX_TO_MM;

                // Add new page if not the very first page of the doc
                if (currentIndex > 0) {
                    pdf.addPage([wMm, hMm], wMm > hMm ? 'l' : 'p');
                }

                // Add image to the current page (filling it completely)
                // Using internal page size to be safe
                const pageWidth = pdf.internal.pageSize.getWidth();
                const pageHeight = pdf.internal.pageSize.getHeight();

                pdf.addImage(dataUrl, 'PNG', 0, 0, pageWidth, pageHeight, undefined, 'FAST');
            }

            setCurrentIndex(prev => prev + 1);
        } catch (e) {
            console.error("Failed to export page index", pagesToPrint[currentIndex], e);
            // Skip and continue
            setCurrentIndex(prev => prev + 1);
        }
    };

    // Get current page data to render
    const pageIndexToRender = pagesToPrint[currentIndex];
    const pageData = activePlanner?.pages[pageIndexToRender];
    const elements = pageData ? pageData.elements.map(normalizeElement) : [];
    const inkPaths = pageData ? pageData.inkPaths : [];

    // Background handling (similar to CanvasBackground but simplified)
    const bgElement = elements.find((el: any) => el.type === 'background');

    // Dimensions - Use actual page dimensions or fallback
    const width = pageData?.dimensions?.width || 800;
    const height = pageData?.dimensions?.height || 1000;

    // Debug logging
    if (currentIndex === 0) {
        console.log('[PrintExporter] First page data:', {
            hasPageData: !!pageData,
            elementsCount: elements.length,
            inkPathsCount: inkPaths.length,
            hasBgElement: !!bgElement,
            bgFill: bgElement?.fill?.substring(0, 50),
            dimensions: { width, height },
            linksCount: pageData?.links?.length || 0
        });
    }

    // Helper for ink props
    const getInkProps = (path: InkPath) => {
        const baseProps = {
            points: path.points,
            stroke: path.color,
            strokeWidth: path.width,
            lineCap: 'round' as const,
            lineJoin: 'round' as const,
            opacity: path.opacity,
            tension: 0.5,
            globalCompositeOperation: 'source-over' as const
        };
        switch (path.brushType) {
            case 'pencil':
                return { ...baseProps, tension: 0.1, shadowBlur: 1, shadowColor: path.color, opacity: path.opacity * 0.7 };
            case 'brush': // Map 'brush' to 'marker' style or keep distinct? Assuming 'marker' equivalent for now or generic fontain
                // PlannerElementRenderer uses 'marker', 'fountain' etc. 
                // InkPath type has 'brush' | 'pencil' | 'pen' | 'spray'
                // Let's trying to match standard styles
                return { ...baseProps, tension: 0.8 };
            case 'spray':
                return { ...baseProps, shadowBlur: 8, shadowColor: path.color, opacity: path.opacity * 0.8 };
            default: // pen
                return baseProps;
        }
    };

    if (!isPrinting || currentIndex === -1 || currentIndex >= pagesToPrint.length) return null;

    return (
        <div style={{ position: 'absolute', top: -10000, left: -10000, visibility: 'hidden' }}>
            <Stage
                width={width}
                height={height}
                ref={stageRef}
            >
                <Layer>
                    {/* White base */}
                    <Rect width={width} height={height} fill="#ffffff" />

                    {/* Background rendering with CORS handling */}
                    {bgElement && <BackgroundImage bgElement={bgElement} width={width} height={height} />}

                    {/* Ink Paths (Rendered on top of background) */}
                    {inkPaths.map((path, i) => (
                        <Line
                            key={`ink-${path.id || i}`}
                            {...getInkProps(path)}
                            listening={false}
                        />
                    ))}

                    {/* All elements including images and stickers */}
                    {elements.map((el: any) => (
                        <PlannerElementRenderer
                            key={el.id}
                            element={el}
                            isSelected={false}
                            onSelect={() => { }}
                            externalTool="select"
                            readOnly={true}
                        />
                    ))}

                    {/* Links - render as subtle indicators */}
                    {pageData?.links?.map((link: any) => (
                        <Rect
                            key={link.id}
                            x={link.x}
                            y={link.y}
                            width={link.width}
                            height={link.height}
                            stroke="rgba(0, 150, 255, 0.15)"
                            strokeWidth={0.5}
                            dash={[2, 2]}
                            listening={false}
                        />
                    ))}
                </Layer>
            </Stage>
        </div>
    );
};
