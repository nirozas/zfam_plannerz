import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, ChevronLeft, ChevronRight } from 'lucide-react'
import { PlannerCanvas } from './PlannerCanvas'
import { TemplateLibrary } from '../library/TemplateLibrary'
import { Button } from '../ui/Button'
import { TopToolbar } from './TopToolbar'
import { PageFilmbar } from './PageFilmbar'
import { AIFeaturesPanel } from './AIFeaturesPanel'
import { AssetHub } from './AssetHub'
import { VoiceRecorder } from './VoiceRecorder'
import { usePlannerStore, slugify } from '@/store/plannerStore'
import { ToolPropertiesSidebar } from './ToolPropertiesSidebar'
import { BrushType, EraserType, ShapeType } from '@/types'
import { WorkspaceSearch } from './WorkspaceSearch'
import { PrintModal } from '../modals/PrintModal'

export function CanvasWorkspace() {
    const { plannerName } = useParams<{ plannerName: string }>()
    const navigate = useNavigate()

    // Tool States
    const [activeTool, setActiveTool] = useState<any>('select')
    const [selectedElement, setSelectedElement] = useState<any>(null)
    const [showAIPanel, setShowAIPanel] = useState(false)
    const [isCanvasUpdating, setIsCanvasUpdating] = useState(false)
    const canvasRef = useRef<any>(null)

    const [showTemplateLibrary, setShowTemplateLibrary] = useState(false)
    const [showAssetHub, setShowAssetHub] = useState(false)
    const [showVoiceRecorder, setShowVoiceRecorder] = useState(false)
    const [showPropertiesSidebar, setShowPropertiesSidebar] = useState(false)
    const [assetHubTab, setAssetHubTab] = useState<'sticker' | 'image'>('sticker')
    const [editingSticker, setEditingSticker] = useState<{ id: string, src: string, type: 'image' } | null>(null)
    const [showPrintModal, setShowPrintModal] = useState(false)
    const [showSearchPanel, setShowSearchPanel] = useState(false)

    const {
        activePlanner,
        currentPageIndex,
        openPlanner,
        addPage,
        deletePage,
        zoomScale,
        setZoomScale,
        resetView,
        isFetchingPlanners,
        saveStatus,
        savePlanner,
        updatePages,
        goToPage,
        nextPage,
        prevPage,
        applyBulkTemplate,
        applyBackgroundToAll,
        undo,
        redo,
        past,
        future,
        currentYear,
        currentMonth,
        currentSection,
        currentCategory,
        user
    } = usePlannerStore()

    // Redirect or show loader if logic
    useEffect(() => {
        if (!plannerName || !user) return;

        if (!isFetchingPlanners) {
            const currentSlug = activePlanner ? slugify(activePlanner.name) : null;
            const currentId = activePlanner?.id;

            // Re-open if:
            // 1. No planner is active
            // 2. The active planner is NEITHER the one matching the slug NOR the ID in the URL
            if (!activePlanner || (currentSlug !== plannerName && currentId !== plannerName)) {
                console.log(`[CanvasWorkspace] Ready to open planner: ${plannerName}`);
                openPlanner(plannerName);
            }
        }
    }, [plannerName, user?.id, activePlanner?.id, activePlanner?.name, openPlanner, isFetchingPlanners])

    // Handle Deep-linking to specific page from Search
    useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        const pageIdx = params.get('page');
        if (pageIdx !== null && activePlanner && !isFetchingPlanners) {
            const index = parseInt(pageIdx);
            if (!isNaN(index) && index >= 0 && index < activePlanner.pages.length) {
                if (currentPageIndex !== index) {
                    // Small delay to ensure planner state is settled
                    setTimeout(() => {
                        usePlannerStore.setState({ currentPageIndex: index });
                    }, 50);
                }
            }
        }
    }, [activePlanner, isFetchingPlanners, currentPageIndex]);

    const totalPages = activePlanner?.pages?.length || 0
    const currentPage = currentPageIndex + 1

    // Tool States (Lifted from PlannerCanvas)
    // Brush
    const [brushType, setBrushType] = useState<BrushType>('pen')
    const [penColor, setPenColor] = useState('#1a1a1a')
    const [penWidth, setPenWidth] = useState(3)
    const [penOpacity, setPenOpacity] = useState(1)

    // Highlighter
    const [highlighterColor, setHighlighterColor] = useState('#FEF08A')
    const [highlighterWidth, setHighlighterWidth] = useState(20)
    const [highlighterOpacity, setHighlighterOpacity] = useState(0.5)

    // Eraser
    const [eraserType, setEraserType] = useState<EraserType>('pixel')
    const [eraserSize, setEraserSize] = useState(24)

    // Shape
    const [shapeType, setShapeType] = useState<ShapeType>('rectangle')
    const [shapeStrokeColor, setShapeStrokeColor] = useState('#1a1a1a')
    const [shapeFillColor, setShapeFillColor] = useState('#3B82F6')
    const [shapeStrokeWidth, setShapeStrokeWidth] = useState(2)
    const [shapeFilled, setShapeFilled] = useState(false)

    // Text
    const [textFontSize, setTextFontSize] = useState(24)
    const [textFontFamily, setTextFontFamily] = useState('Inter')
    const [textFill, setTextFill] = useState('#000000')
    const [textAlign, setTextAlign] = useState<'left' | 'center' | 'right'>('left')
    const [textIsBold, setTextIsBold] = useState(false)
    const [textIsItalic, setTextIsItalic] = useState(false)
    const [textBackgroundColor, setTextBackgroundColor] = useState('transparent')
    const [textBorderColor, setTextBorderColor] = useState('transparent')
    const [textBorderWidth, setTextBorderWidth] = useState(0)
    const [textWidth, setTextWidth] = useState(200)
    const [textHeight, setTextHeight] = useState(100)
    const [textVerticalAlign, setTextVerticalAlign] = useState<'top' | 'middle' | 'bottom'>('top')
    const [textBorderDash, setTextBorderDash] = useState<number[]>([])
    const [textBorderStyle, setTextBorderStyle] = useState<'solid' | 'dashed' | 'double'>('solid')

    // Auto-open sidebar when tool changes or when text/shape is selected
    useEffect(() => {
        if (['pen', 'highlighter', 'eraser', 'shape', 'text', 'background'].includes(activeTool)) {
            setShowPropertiesSidebar(true)
        } else if (selectedElement?.type === 'text' || selectedElement?.type === 'shape') {
            setShowPropertiesSidebar(true)
        } else {
            setShowPropertiesSidebar(false)
        }
    }, [activeTool, selectedElement])

    // Keyboard shortcuts for Undo/Redo
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            // Check if Ctrl (Windows/Linux) or Cmd (Mac) is pressed
            const isCtrlOrCmd = e.ctrlKey || e.metaKey;

            if (isCtrlOrCmd && e.key === 'z' && !e.shiftKey) {
                e.preventDefault();
                undo();
            } else if (isCtrlOrCmd && (e.key === 'y' || (e.key === 'z' && e.shiftKey))) {
                e.preventDefault();
                redo();
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [undo, redo])

    // Auto-save effect
    useEffect(() => {
        if (!activePlanner) return;

        const timer = setTimeout(() => {
            if (saveStatus === 'idle' || saveStatus === 'saved') {
                savePlanner();
            }
        }, 5000); // 5 second debounce for auto-save

        return () => clearTimeout(timer);
    }, [activePlanner, savePlanner, saveStatus])

    // Window beforeunload handling
    useEffect(() => {
        const handleBeforeUnload = (e: BeforeUnloadEvent) => {
            if (saveStatus === 'saving') {
                e.preventDefault();
                e.returnValue = '';
            }
        };
        window.addEventListener('beforeunload', handleBeforeUnload);
        return () => window.removeEventListener('beforeunload', handleBeforeUnload);
    }, [saveStatus])

    // Tool States moved up to solve scope issues
    const isStoreSaving = saveStatus === 'saving'

    useEffect(() => {
        if (!user && !isFetchingPlanners) {
            navigate('/auth')
        }
    }, [user, navigate, isFetchingPlanners])


    // Handlers
    const handlePrint = () => {
        if (!activePlanner) return;
        setShowPrintModal(true)
    }

    const handleAssetHub = (tab: 'sticker' | 'image') => {
        setAssetHubTab(tab)
        setShowAssetHub(true)
    }

    const handleTemplates = () => setShowTemplateLibrary(true)
    const handleVoice = () => setShowVoiceRecorder(true)

    const handleAddPage = () => {
        addPage(currentPageIndex)
        // Optionally save immediately
        savePlanner()
    }

    const handleDeletePage = (index: number) => {
        if (totalPages <= 1) return;
        if (confirm('Delete this page? This cannot be undone.')) {
            deletePage(index)
            savePlanner()
        }
    }

    const handlePageReorder = (reorderedPages: any) => {
        if (!activePlanner) return;
        const newOrderIds = reorderedPages.map((p: any) => p.id)
        const newPages = newOrderIds.map((id: string) => activePlanner.pages.find(p => p.id === id)!).filter(Boolean)

        if (newPages.length === activePlanner.pages.length) {
            updatePages(newPages)
            savePlanner()
        }
    }

    // Filtered Pages logic
    const filteredPages = (activePlanner?.pages || []).filter(page => {
        if (currentYear && page.year != currentYear) return false;
        if (currentMonth && page.month !== currentMonth) return false;
        if (currentSection && page.section !== currentSection) return false;
        if (currentCategory && page.category !== currentCategory) return false;
        return true;
    });

    // Auto-jump to first matching page if current page is filtered out
    useEffect(() => {
        if (!activePlanner?.pages) return;

        if (filteredPages.length > 0) {
            const currentPageId = activePlanner.pages[currentPageIndex]?.id;
            const isCurrentPageInFilter = filteredPages.some(p => p.id === currentPageId);

            if (!isCurrentPageInFilter) {
                const firstMatchingPageIndex = activePlanner.pages.indexOf(filteredPages[0]);
                if (firstMatchingPageIndex !== -1) {
                    goToPage(firstMatchingPageIndex);
                }
            }
        }
    }, [currentYear, currentMonth, currentSection, currentCategory, activePlanner?.id, filteredPages.length]);

    const displayPages = filteredPages.map((p) => ({
        id: p.id,
        number: (activePlanner?.pages || []).indexOf(p) + 1,
        thumbnail: p.thumbnail,
        name: p.name
    }));

    // Calculate relative index for display (e.g. "Page 1 of 5" instead of absolute)
    const filteredCurrentPageIndex = (activePlanner?.pages && activePlanner.pages[currentPageIndex])
        ? filteredPages.findIndex(p => p.id === activePlanner.pages![currentPageIndex].id)
        : -1;
    const displayCurrentPage = filteredCurrentPageIndex !== -1 ? filteredCurrentPageIndex + 1 : 1;
    const displayTotalPages = filteredPages.length;

    if (isFetchingPlanners && !activePlanner) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
                    <p className="text-gray-600 font-medium">Opening your workspace...</p>
                    <p className="text-xs text-gray-400 mt-2">Loading: {plannerName}</p>
                </div>
            </div>
        )
    }

    if (!activePlanner) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-100">
                <div className="text-center">
                    <h2 className="text-2xl font-bold text-gray-900 mb-4">Planner not found</h2>
                    <Button onClick={() => navigate('/homepage')}>
                        <ArrowLeft className="w-4 h-4 mr-2" />
                        Back to Dashboard
                    </Button>
                </div>
            </div>
        )
    }

    return (
        <div className="h-screen flex flex-col bg-[#F8F9FA]">
            <TopToolbar
                plannerName={activePlanner.name}
                currentPage={displayCurrentPage}
                totalPages={displayTotalPages}
                onBack={() => navigate('/homepage')}
                activeTool={activeTool}
                onToolSelect={setActiveTool}
                onClear={() => usePlannerStore.getState().clearPage()}
                onDelete={() => selectedElement && usePlannerStore.getState().deleteElement(selectedElement)}
                onAI={() => setShowAIPanel(!showAIPanel)}
                onAssetHub={handleAssetHub}
                onTemplates={handleTemplates}
                onVoice={handleVoice}
                onSave={() => canvasRef.current?.save?.()}
                saving={isCanvasUpdating || isStoreSaving}
                zoomScale={zoomScale}
                onZoomIn={() => setZoomScale(Math.min(zoomScale * 1.2, 5))}
                onZoomOut={() => setZoomScale(Math.max(zoomScale / 1.2, 0.1))}
                onZoomReset={() => resetView()}
                onRenamePlanner={(name) => usePlannerStore.getState().renamePlanner(activePlanner.id, name)}
                pageTitle={activePlanner?.pages?.[currentPageIndex]?.name || ''}
                onRenamePage={(name) => {
                    const pageId = activePlanner?.pages?.[currentPageIndex]?.id;
                    if (pageId) usePlannerStore.getState().renamePage(pageId, name);
                }}
                onPrint={handlePrint}
                onUndo={undo}
                onRedo={redo}
                canUndo={past.length > 0}
                canRedo={future.length > 0}
                onSearch={() => setShowSearchPanel(!showSearchPanel)}
            />

            <div className="flex-1 flex overflow-hidden relative">
                <main className="flex-1 overflow-hidden relative flex flex-col items-center justify-center">
                    <div className="flex-1 w-full h-full">
                        <PlannerCanvas
                            ref={canvasRef}
                            pageNumber={currentPage}
                            externalTool={activeTool}

                            // Tool Props
                            brushType={brushType}
                            penColor={penColor}
                            penWidth={penWidth}
                            penOpacity={penOpacity}

                            highlighterColor={highlighterColor}
                            highlighterWidth={highlighterWidth}
                            highlighterOpacity={highlighterOpacity}

                            eraserType={eraserType}
                            eraserSize={eraserSize}

                            shapeType={shapeType}
                            shapeStrokeColor={shapeStrokeColor}
                            shapeFillColor={shapeFillColor}
                            shapeStrokeWidth={shapeStrokeWidth}
                            shapeFilled={shapeFilled}


                            onEditAsset={(asset) => {
                                setEditingSticker({ id: asset.id, src: asset.src, type: 'image' }) // Normalized to image for editor
                                setShowPropertiesSidebar(true)
                            }}

                            onSelectionChange={(el) => {
                                setSelectedElement(el)
                                if (el && el.type === 'shape') {
                                    setShapeType(el.shapeType)
                                    setShapeStrokeColor(el.stroke)
                                    setShapeFillColor(el.fill || '#000000') // Fallback if transparent/undefined
                                    setShapeStrokeWidth(el.strokeWidth)
                                    setShapeFilled(el.filled)
                                    setShowPropertiesSidebar(true)
                                }
                            }}

                            onSavingChange={setIsCanvasUpdating}

                        />
                    </div>

                    {/* On-Canvas Navigation Arrows */}
                    {!selectedElement && activeTool === 'select' && (
                        <>
                            <button
                                onClick={prevPage}
                                className="absolute left-6 top-1/2 -translate-y-1/2 p-3 bg-white/80 hover:bg-white rounded-full shadow-lg transition-all hover:scale-110 active:scale-95 group z-20 border border-gray-100"
                                title="Previous Page"
                            >
                                <ChevronLeft className="w-6 h-6 text-gray-600 group-hover:text-indigo-600" />
                            </button>
                            <button
                                onClick={nextPage}
                                className="absolute right-6 top-1/2 -translate-y-1/2 p-3 bg-white/80 hover:bg-white rounded-full shadow-lg transition-all hover:scale-110 active:scale-95 group z-20 border border-gray-100"
                                title="Next Page"
                            >
                                <ChevronRight className="w-6 h-6 text-gray-600 group-hover:text-indigo-600" />
                            </button>
                        </>
                    )}
                </main>

                {/* AI Panel Right Sidebar Overlay */}
                {showAIPanel && (
                    <div className="fixed right-0 top-0 h-full z-[60]">
                        <AIFeaturesPanel
                            onClose={() => setShowAIPanel(false)}
                            onStartSelection={() => setActiveTool('lasso')}
                            onRunAI={async (type) => {
                                if (!canvasRef.current) return;
                                if (type === 'ink-to-text') {
                                    return await canvasRef.current.handleConvertToText();
                                } else if (type === 'ink-to-artwork') {
                                    return await canvasRef.current.handleMakeArt();
                                }
                            }}
                            onApplyResult={(res, type) => {
                                // Already handled in handleConvertToText for ink-to-text
                                // For other future features, we can apply result here
                                console.log('Apply AI result:', res, type)
                            }}
                            selectedElement={selectedElement}
                        />
                    </div>
                )}
            </div>

            <ToolPropertiesSidebar
                isOpen={showPropertiesSidebar}
                onClose={() => {
                    setShowPropertiesSidebar(false)
                    setEditingSticker(null)
                }}
                activeTool={
                    selectedElement?.type === 'shape' ? 'shape' :
                        selectedElement?.type === 'text' ? 'text' :
                            activeTool
                }

                // Asset Editing
                editingAsset={editingSticker}
                onAssetSave={(blob: Blob, mode: 'save' | 'saveAs') => {
                    // Create URL from blob
                    const url = URL.createObjectURL(blob);

                    if (mode === 'save' && editingSticker) {
                        // Update existing
                        canvasRef.current?.updateImage?.(editingSticker.id, url);
                        // Also update local state to reflect change if needed, but canvas update should be enough
                    } else {
                        // Save as new
                        canvasRef.current?.addImage?.(url);
                    }
                    setEditingSticker(null);
                    // Don't close sidebar necessarily, or maybe switch back to properties
                }}
                onAssetCancel={() => setEditingSticker(null)}

                // Brush
                brushType={brushType}
                penColor={penColor}
                penWidth={penWidth}
                penOpacity={penOpacity}
                onBrushTypeChange={setBrushType}
                onPenColorChange={setPenColor}
                onPenWidthChange={setPenWidth}
                onPenOpacityChange={setPenOpacity}

                // Highlighter
                highlighterColor={highlighterColor}
                highlighterWidth={highlighterWidth}
                highlighterOpacity={highlighterOpacity}
                onHighlighterColorChange={setHighlighterColor}
                onHighlighterWidthChange={setHighlighterWidth}
                onHighlighterOpacityChange={setHighlighterOpacity}

                // Eraser
                eraserType={eraserType}
                eraserSize={eraserSize}
                onEraserTypeChange={setEraserType}
                onEraserSizeChange={setEraserSize}

                // Shape
                shapeType={shapeType}
                shapeStrokeColor={shapeStrokeColor}
                shapeFillColor={shapeFillColor}
                shapeStrokeWidth={shapeStrokeWidth}
                shapeFilled={shapeFilled}
                onShapeTypeChange={setShapeType}
                onShapeStrokeColorChange={(c) => {
                    setShapeStrokeColor(c)
                    if (selectedElement?.type === 'shape' && canvasRef.current) {
                        canvasRef.current.updateElement(selectedElement.id, { stroke: c })
                    }
                }}
                onShapeFillColorChange={(c) => {
                    setShapeFillColor(c)
                    if (selectedElement?.type === 'shape' && canvasRef.current) {
                        canvasRef.current.updateElement(selectedElement.id, { fill: c })
                    }
                }}
                onShapeStrokeWidthChange={(w) => {
                    setShapeStrokeWidth(w)
                    if (selectedElement?.type === 'shape' && canvasRef.current) {
                        canvasRef.current.updateElement(selectedElement.id, { strokeWidth: w })
                    }
                }}
                onShapeFilledChange={(f) => {
                    setShapeFilled(f)
                    if (selectedElement?.type === 'shape' && canvasRef.current) {
                        canvasRef.current.updateElement(selectedElement.id, { filled: f, fill: f ? shapeFillColor : undefined })
                    }
                }}

                // Background
                backgroundColor={selectedElement?.type === 'background' ? selectedElement.fill : '#FFFFFF'}
                onBackgroundColorChange={(color) => {
                    if (canvasRef.current) {
                        canvasRef.current.updateBackground(color)
                    }
                }}
                onApplyToAll={(color) => {
                    if (activePlanner) {
                        applyBackgroundToAll(activePlanner.id, color)
                    }
                }}


                // Text
                textFontSize={selectedElement?.type === 'text' ? selectedElement.fontSize : textFontSize}
                textFontFamily={selectedElement?.type === 'text' ? selectedElement.fontFamily : textFontFamily}
                textFill={selectedElement?.type === 'text' ? selectedElement.fill : textFill}
                textAlign={selectedElement?.type === 'text' ? selectedElement.align : textAlign}
                textIsBold={selectedElement?.type === 'text' ? selectedElement.fontStyle?.includes('bold') : textIsBold}
                textIsItalic={selectedElement?.type === 'text' ? selectedElement.fontStyle?.includes('italic') : textIsItalic}
                textBackgroundColor={selectedElement?.type === 'text' ? selectedElement.backgroundColor : textBackgroundColor}
                textBorderColor={selectedElement?.type === 'text' ? selectedElement.borderColor : textBorderColor}
                textBorderWidth={selectedElement?.type === 'text' ? selectedElement.borderWidth : textBorderWidth}
                textWidth={textWidth}
                textHeight={textHeight}
                textVerticalAlign={textVerticalAlign}
                onTextFontSizeChange={(size) => {
                    setTextFontSize(size)
                    if (selectedElement?.type === 'text' && canvasRef.current) {
                        canvasRef.current.updateElement(selectedElement.id, { fontSize: size })
                    }
                }}
                onTextFontFamilyChange={(font) => {
                    setTextFontFamily(font)
                    if (selectedElement?.type === 'text' && canvasRef.current) {
                        canvasRef.current.updateElement(selectedElement.id, { fontFamily: font })
                    }
                }}
                onTextFillChange={(color) => {
                    setTextFill(color)
                    if (selectedElement?.type === 'text' && canvasRef.current) {
                        canvasRef.current.updateElement(selectedElement.id, { fill: color })
                    }
                }}
                onTextAlignChange={(align) => {
                    setTextAlign(align)
                    if (selectedElement?.type === 'text' && canvasRef.current) {
                        canvasRef.current.updateElement(selectedElement.id, { align })
                    }
                }}
                onTextBoldChange={(bold) => {
                    setTextIsBold(bold)
                    if (selectedElement?.type === 'text' && canvasRef.current) {
                        const italic = selectedElement.fontStyle?.includes('italic')
                        canvasRef.current.updateElement(selectedElement.id, { fontStyle: `${bold ? 'bold' : ''} ${italic ? 'italic' : ''}`.trim() || 'normal' })
                    }
                }}
                onTextItalicChange={(italic) => {
                    setTextIsItalic(italic)
                    if (selectedElement?.type === 'text' && canvasRef.current) {
                        const bold = selectedElement.fontStyle?.includes('bold')
                        canvasRef.current.updateElement(selectedElement.id, { fontStyle: `${bold ? 'bold' : ''} ${italic ? 'italic' : ''}`.trim() || 'normal' })
                    }
                }}
                onTextBackgroundColorChange={(color) => {
                    setTextBackgroundColor(color)
                    if (selectedElement?.type === 'text' && canvasRef.current) {
                        canvasRef.current.updateElement(selectedElement.id, { backgroundColor: color })
                    }
                }}
                onTextBorderColorChange={(color) => {
                    setTextBorderColor(color)
                    if (selectedElement?.type === 'text' && canvasRef.current) {
                        canvasRef.current.updateElement(selectedElement.id, { borderColor: color })
                    }
                }}
                onTextBorderWidthChange={(width) => {
                    setTextBorderWidth(width)
                    if (selectedElement?.type === 'text' && canvasRef.current) {
                        canvasRef.current.updateElement(selectedElement.id, { borderWidth: width })
                    }
                }}
                onTextWidthChange={(width) => {
                    setTextWidth(width)
                    if (selectedElement?.type === 'text' && canvasRef.current) {
                        canvasRef.current.updateElement(selectedElement.id, { width })
                    }
                }}
                onTextHeightChange={(height) => {
                    setTextHeight(height)
                    if (selectedElement?.type === 'text' && canvasRef.current) {
                        canvasRef.current.updateElement(selectedElement.id, { height })
                    }
                }}
                onTextVerticalAlignChange={(align) => {
                    setTextVerticalAlign(align)
                    if (selectedElement?.type === 'text' && canvasRef.current) {
                        canvasRef.current.updateElement(selectedElement.id, { verticalAlign: align })
                    }
                }}
                textBorderDash={textBorderDash}
                textBorderStyle={textBorderStyle}
                onTextBorderDashChange={(dash) => {
                    setTextBorderDash(dash)
                    if (selectedElement?.type === 'text' && canvasRef.current) {
                        canvasRef.current.updateElement(selectedElement.id, { borderDash: dash })
                    }
                }}
                onTextBorderStyleChange={(style) => {
                    setTextBorderStyle(style)
                    if (selectedElement?.type === 'text' && canvasRef.current) {
                        canvasRef.current.updateElement(selectedElement.id, { borderStyle: style })
                    }
                }}
                onTextToggleBullets={(type) => {
                    if (selectedElement?.type === 'text' && canvasRef.current) {
                        (canvasRef.current as any).toggleTextFormatting(type)
                    }
                }}
                onTextToggleCheckboxes={() => {
                    if (selectedElement?.type === 'text' && canvasRef.current) {
                        (canvasRef.current as any).toggleTextFormatting('checkbox')
                    }
                }}
                selectedElement={selectedElement}
                onUpdateElement={(id, attrs) => {
                    if (canvasRef.current) {
                        canvasRef.current.updateElement(id, attrs)
                    }
                }}
                onDeleteElement={() => {
                    if (canvasRef.current) {
                        canvasRef.current.deleteSelected()
                    }
                }}
                onMoveToFront={() => {
                    if (canvasRef.current) {
                        canvasRef.current.moveToFront()
                    }
                }}
                onMoveToBack={() => {
                    if (canvasRef.current) {
                        canvasRef.current.moveToBack()
                    }
                }}
            />

            <PageFilmbar
                pages={displayPages}
                currentPage={displayCurrentPage}
                onPageSelect={(num) => {
                    const targetPage = displayPages.find(p => p.number === num);
                    if (targetPage) {
                        const index = activePlanner.pages.findIndex(p => p.id === targetPage.id);
                        if (index !== -1) goToPage(index);
                    }
                }}
                onPageReorder={handlePageReorder}
                onAddPage={handleAddPage}
                onDuplicatePage={(index) => usePlannerStore.getState().duplicatePage(index)}
                onDeletePage={handleDeletePage}
                totalPages={displayTotalPages}
                onPrev={prevPage}
                onNext={nextPage}
            />

            {/* Template Library */}
            <TemplateLibrary
                isOpen={showTemplateLibrary}
                onClose={() => setShowTemplateLibrary(false)}
                onSelectTemplate={(templateId, bulkOptions) => {
                    if (bulkOptions) {
                        applyBulkTemplate(activePlanner!.id, templateId, bulkOptions)
                    } else {
                        // Single template -> Add as 1 new page
                        // Using ApplyBulk with count=1 is the easiest reuse of logic
                        applyBulkTemplate(activePlanner!.id, templateId, {
                            count: 1,
                            frequency: 'daily',
                            startDate: new Date().toISOString()
                        })
                    }
                    setShowTemplateLibrary(false)
                }}
            />

            <AssetHub
                isOpen={showAssetHub}
                onClose={() => setShowAssetHub(false)}
                initialTab={assetHubTab}
                onSelectAsset={(asset) => {
                    if (canvasRef.current) {
                        canvasRef.current.addImage(asset.url)
                    }
                    setShowAssetHub(false)
                }}
            />

            <VoiceRecorder
                isOpen={showVoiceRecorder}
                onClose={() => setShowVoiceRecorder(false)}
                onAddVoice={(url: string, duration: number) => {
                    if (canvasRef.current) {
                        canvasRef.current.addVoice(url, duration)
                    }
                    setShowVoiceRecorder(false)
                }}
            />

            {showSearchPanel && (
                <div className="fixed right-0 top-0 h-full z-[100] flex shadow-2xl">
                    <div className="bg-black/20 backdrop-blur-[2px] fixed inset-0" onClick={() => setShowSearchPanel(false)}></div>
                    <div className="relative z-10 h-full">
                        <WorkspaceSearch />
                        <button
                            onClick={() => setShowSearchPanel(false)}
                            className="absolute left-[-40px] top-4 w-10 h-10 bg-white border border-gray-200 rounded-l-xl flex items-center justify-center text-gray-500 hover:text-red-500 shadow-lg"
                        >
                            <ChevronRight size={24} />
                        </button>
                    </div>
                </div>
            )}

            {/* Asset Editor moved to Sidebar */}
            <PrintModal
                isOpen={showPrintModal}
                onClose={() => setShowPrintModal(false)}
            />
        </div>
    )
}
