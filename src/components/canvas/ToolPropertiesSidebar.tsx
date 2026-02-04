import { ChevronRight, Blend, Maximize2 } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { BrushPanel } from './BrushPanel'
import { EraserPanel } from './EraserPanel'
import { HighlighterPanel } from './HighlighterPanel'
import { ShapePanel } from './ShapePanel'
import { AssetEditorPanel } from './AssetEditorPanel'
import { BackgroundPanel } from './BackgroundPanel'
import { TextToolbar } from './TextToolbar'
import { BrushType, EraserType, ShapeType } from '@/types'

interface ToolPropertiesSidebarProps {
    isOpen: boolean
    activeTool: 'select' | 'pen' | 'highlighter' | 'eraser' | 'shape' | 'text' | 'sticker' | 'image' | 'background'
    onClose: () => void

    // Brush Props
    brushType: BrushType
    penColor: string
    penWidth: number
    penOpacity: number
    onBrushTypeChange: (t: BrushType) => void
    onPenColorChange: (c: string) => void
    onPenWidthChange: (w: number) => void
    onPenOpacityChange: (o: number) => void

    // Highlighter Props
    highlighterColor: string
    highlighterWidth: number
    highlighterOpacity: number
    onHighlighterColorChange: (c: string) => void
    onHighlighterWidthChange: (w: number) => void
    onHighlighterOpacityChange: (o: number) => void

    // Eraser Props
    eraserType: EraserType
    eraserSize: number
    onEraserTypeChange: (t: EraserType) => void
    onEraserSizeChange: (s: number) => void

    // Shape Props
    shapeType: ShapeType
    shapeStrokeColor: string
    shapeFillColor: string
    shapeStrokeWidth: number
    shapeFilled: boolean
    onShapeTypeChange: (t: ShapeType) => void
    onShapeStrokeColorChange: (c: string) => void
    onShapeFillColorChange: (c: string) => void
    onShapeStrokeWidthChange: (w: number) => void
    onShapeFilledChange: (f: boolean) => void

    // Asset Editing Props
    editingAsset: { id: string, src: string, type: 'image' | 'sticker' } | null
    onAssetSave: (blob: Blob, mode: 'save' | 'saveAs') => void
    onAssetCancel: () => void

    // Background Props
    backgroundColor?: string
    onBackgroundColorChange?: (color: string) => void
    onApplyToAll?: (color: string) => void

    // Text Props
    textFontSize?: number
    textFontFamily?: string
    textFill?: string
    textAlign?: 'left' | 'center' | 'right'
    textIsBold?: boolean
    textIsItalic?: boolean
    textBackgroundColor?: string
    textBorderColor?: string
    textBorderWidth?: number
    textWidth?: number
    textHeight?: number
    textVerticalAlign?: 'top' | 'middle' | 'bottom'
    textBorderDash?: number[]
    textBorderStyle?: 'solid' | 'dashed' | 'double'
    onTextFontSizeChange?: (size: number) => void
    onTextFontFamilyChange?: (font: string) => void
    onTextFillChange?: (color: string) => void
    onTextAlignChange?: (align: 'left' | 'center' | 'right') => void
    onTextBoldChange?: (bold: boolean) => void
    onTextItalicChange?: (italic: boolean) => void
    onTextBackgroundColorChange?: (color: string) => void
    onTextBorderColorChange?: (color: string) => void
    onTextBorderWidthChange?: (width: number) => void
    onTextWidthChange?: (width: number) => void
    onTextHeightChange?: (height: number) => void
    onTextVerticalAlignChange?: (align: 'top' | 'middle' | 'bottom') => void
    onTextBorderDashChange?: (dash: number[]) => void
    onTextBorderStyleChange?: (style: 'solid' | 'dashed' | 'double') => void
    onTextToggleBullets?: (type: 'bullet' | 'number' | 'square' | 'none') => void
    onTextToggleCheckboxes?: () => void

    // Selected Element Props (for Image/Sticker)
    selectedElement?: any
    onUpdateElement?: (id: string, attrs: any) => void
    onDeleteElement?: (id: string) => void
    onMoveToFront?: (id: string) => void
    onMoveToBack?: (id: string) => void
}

export function ToolPropertiesSidebar({
    isOpen,
    activeTool,
    onClose,
    // Brush
    brushType, penColor, penWidth, penOpacity,
    onBrushTypeChange, onPenColorChange, onPenWidthChange, onPenOpacityChange,
    // Highlighter
    highlighterColor, highlighterWidth, highlighterOpacity,
    onHighlighterColorChange, onHighlighterWidthChange, onHighlighterOpacityChange,
    // Eraser
    eraserType, eraserSize,
    onEraserTypeChange, onEraserSizeChange,
    // Shape
    shapeType, shapeStrokeColor, shapeFillColor, shapeStrokeWidth, shapeFilled,
    onShapeTypeChange, onShapeStrokeColorChange, onShapeFillColorChange, onShapeStrokeWidthChange, onShapeFilledChange,
    // Asset Editing
    editingAsset,
    onAssetSave,
    onAssetCancel,
    // Background
    backgroundColor,
    onBackgroundColorChange,
    onApplyToAll,
    // Text
    textFontSize,
    textFontFamily,
    textFill,
    textAlign,
    textIsBold,
    textIsItalic,
    textBackgroundColor,
    textBorderColor,
    textBorderWidth,
    textWidth,
    textHeight,
    textVerticalAlign,
    textBorderDash,
    textBorderStyle,
    onTextFontSizeChange,
    onTextFontFamilyChange,
    onTextFillChange,
    onTextAlignChange,
    onTextBoldChange,
    onTextItalicChange,
    onTextBackgroundColorChange,
    onTextBorderColorChange,
    onTextBorderWidthChange,
    onTextWidthChange,
    onTextHeightChange,
    onTextVerticalAlignChange,
    onTextBorderDashChange,
    onTextBorderStyleChange,
    onTextToggleBullets,
    onTextToggleCheckboxes,
    // Selected Element
    selectedElement,
    onUpdateElement,
    onMoveToFront,
    onMoveToBack,
}: ToolPropertiesSidebarProps) {

    // Helper to determine if we should show content
    // Also show if editingAsset is present (tool might still be 'select' or 'image')
    const shouldShow = ['pen', 'highlighter', 'eraser', 'shape', 'background', 'text'].includes(activeTool) || !!editingAsset || (activeTool === 'select' && !!selectedElement)

    return (
        <AnimatePresence>
            {(isOpen && shouldShow) && (
                <motion.div
                    initial={{ x: '100%' }}
                    animate={{
                        x: 0,
                        width: editingAsset ? 'min(420px, 92vw)' : '320px'
                    }}
                    exit={{ x: '100%' }}
                    transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                    className="fixed right-0 top-[64px] bottom-0 bg-white border-l border-gray-200 shadow-2xl z-30 flex flex-col"
                >
                    {!editingAsset && (
                        <div className="flex items-center justify-between p-4 border-b border-gray-100 bg-gray-50/50">
                            <span className="text-sm font-bold text-gray-900 uppercase tracking-wider">
                                {editingAsset ? 'Edit Asset' : `${activeTool} Properties`}
                            </span>
                            <button
                                onClick={onClose}
                                className="p-1 hover:bg-gray-200 rounded-lg transition-colors"
                            >
                                <ChevronRight className="w-5 h-5 text-gray-500" />
                            </button>
                        </div>
                    )}

                    <div className="flex-1 overflow-y-auto p-4">
                        {activeTool === 'pen' && (
                            <div className="scale-95 origin-top-left -ml-2">
                                <BrushPanel
                                    type={brushType}
                                    color={penColor}
                                    size={penWidth}
                                    opacity={penOpacity}
                                    onTypeChange={onBrushTypeChange}
                                    onColorChange={onPenColorChange}
                                    onSizeChange={onPenWidthChange}
                                    onOpacityChange={onPenOpacityChange}
                                />
                            </div>
                        )}

                        {activeTool === 'highlighter' && (
                            <div className="scale-95 origin-top-left -ml-2">
                                <HighlighterPanel
                                    color={highlighterColor}
                                    size={highlighterWidth}
                                    opacity={highlighterOpacity}
                                    onColorChange={onHighlighterColorChange}
                                    onSizeChange={onHighlighterWidthChange}
                                    onOpacityChange={onHighlighterOpacityChange}
                                />
                            </div>
                        )}

                        {activeTool === 'eraser' && (
                            <div className="scale-95 origin-top-left -ml-2">
                                <EraserPanel
                                    type={eraserType}
                                    size={eraserSize}
                                    onTypeChange={onEraserTypeChange}
                                    onSizeChange={onEraserSizeChange}
                                />
                            </div>
                        )}

                        {activeTool === 'shape' && (
                            <div className="scale-95 origin-top-left -ml-2">
                                <ShapePanel
                                    selectedShape={shapeType}
                                    strokeColor={shapeStrokeColor}
                                    fillColor={shapeFillColor}
                                    strokeWidth={shapeStrokeWidth}
                                    filled={shapeFilled}
                                    onShapeChange={onShapeTypeChange}
                                    onStrokeColorChange={onShapeStrokeColorChange}
                                    onFillColorChange={onShapeFillColorChange}
                                    onStrokeWidthChange={onShapeStrokeWidthChange}
                                    onFilledChange={onShapeFilledChange}
                                />
                            </div>
                        )}

                        {activeTool === 'background' && (
                            <div className="scale-95 origin-top-left -ml-2">
                                <BackgroundPanel
                                    backgroundColor={backgroundColor || '#FFFFFF'}
                                    onBackgroundColorChange={onBackgroundColorChange!}
                                    onApplyToAll={onApplyToAll}
                                />
                            </div>
                        )}

                        {activeTool === 'text' && (
                            <div className="scale-95 origin-top-left -ml-2">
                                <TextToolbar
                                    fontSize={textFontSize || 16}
                                    fontFamily={textFontFamily || 'Inter'}
                                    fill={textFill || '#000000'}
                                    align={textAlign || 'left'}
                                    isBold={textIsBold || false}
                                    isItalic={textIsItalic || false}
                                    backgroundColor={textBackgroundColor}
                                    borderColor={textBorderColor}
                                    borderWidth={textBorderWidth || 0}
                                    width={textWidth || 200}
                                    height={textHeight || 100}
                                    verticalAlign={textVerticalAlign || 'top'}
                                    onFontSizeChange={onTextFontSizeChange || (() => { })}
                                    onFontFamilyChange={onTextFontFamilyChange || (() => { })}
                                    onFillChange={onTextFillChange || (() => { })}
                                    onAlignChange={onTextAlignChange || (() => { })}
                                    onBoldChange={onTextBoldChange || (() => { })}
                                    onItalicChange={onTextItalicChange || (() => { })}
                                    onBackgroundColorChange={onTextBackgroundColorChange || (() => { })}
                                    onBorderColorChange={onTextBorderColorChange || (() => { })}
                                    onBorderWidthChange={onTextBorderWidthChange || (() => { })}
                                    onWidthChange={onTextWidthChange || (() => { })}
                                    onHeightChange={onTextHeightChange || (() => { })}
                                    onVerticalAlignChange={onTextVerticalAlignChange || (() => { })}
                                    borderDash={textBorderDash || []}
                                    borderStyle={textBorderStyle || 'solid'}
                                    onBorderDashChange={onTextBorderDashChange || (() => { })}
                                    onBorderStyleChange={onTextBorderStyleChange || (() => { })}
                                    onToggleBullets={onTextToggleBullets}
                                    onToggleCheckboxes={onTextToggleCheckboxes}
                                />
                            </div>
                        )}

                        {editingAsset && (
                            <div className="h-full -m-4">
                                <AssetEditorPanel
                                    id={editingAsset.id}
                                    imageUrl={editingAsset.src}
                                    onSave={onAssetSave}
                                    onCancel={onAssetCancel}
                                    onMoveToFront={onMoveToFront}
                                    onMoveToBack={onMoveToBack}
                                />
                            </div>
                        )}

                        {activeTool === 'select' && selectedElement && (selectedElement.type === 'image' || selectedElement.type === 'sticker') && (
                            <div className="space-y-6">
                                {/* Delete at the very top */}
                                {/* Delete button removed per user request */}

                                <div className="space-y-4">
                                    <label className="text-xs font-bold text-gray-500 uppercase tracking-widest flex items-center gap-2">
                                        <Blend className="w-3 h-3" /> Opacity
                                    </label>
                                    <input
                                        type="range"
                                        min="0"
                                        max="1"
                                        step="0.1"
                                        value={selectedElement.opacity ?? 1}
                                        onChange={(e) => onUpdateElement?.(selectedElement.id, { opacity: parseFloat(e.target.value) })}
                                        className="w-full h-1.5 bg-gray-100 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                                    />
                                </div>



                                <div className="space-y-4">
                                    <label className="text-xs font-bold text-gray-500 uppercase tracking-widest">Settings</label>
                                    <button
                                        onClick={() => onUpdateElement?.(selectedElement.id, { isLocked: !selectedElement.isLocked })}
                                        className={`w-full py-3 rounded-xl text-xs font-bold flex items-center justify-center gap-2 border transition-all ${selectedElement.isLocked
                                            ? 'bg-orange-50 border-orange-200 text-orange-600'
                                            : 'bg-white border-gray-200 text-gray-600 hover:border-orange-200'
                                            }`}
                                    >
                                        <Maximize2 className="w-4 h-4" /> {selectedElement.isLocked ? 'Unlock Placement' : 'Lock Placement'}
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
    )
}
