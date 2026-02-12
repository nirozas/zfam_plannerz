import { Line, Rect, Circle, RegularPolygon, Star, Arrow, Text as KonvaText, Group } from 'react-konva';
import { usePlannerStore } from '@/store/plannerStore';
import { ResizableImage } from './ResizableImage';
import { SmartCheckbox, CheckboxState } from './SmartCheckbox';

// Define Tool type locally if not available globally, or use string
type Tool = 'select' | 'pen' | 'highlighter' | 'eraser' | 'text' | 'sticker' | 'shape';

interface PlannerElementRendererProps {
    element: any; // Using any to match existing loose typing, but ideally should be PlannerElement
    isSelected: boolean;
    onSelect: (id: string) => void;
    externalTool: Tool;
    onEditAsset?: (asset: { id: string, src: string, type: 'image' | 'sticker' }) => void;
    onTextDblClick?: (id: string) => void;
    readOnly?: boolean;
    editingTextId?: string | null;
    onVoicePlay?: (id: string) => void;
}

export const PlannerElementRenderer = ({
    element: el,
    isSelected,
    onSelect,
    externalTool,
    onEditAsset,
    onTextDblClick,
    readOnly = false,
    editingTextId = null,
    onVoicePlay
}: PlannerElementRendererProps) => {

    // Helper to handle updates directly if not readOnly
    const handleUpdate = (id: string, newAttrs: any) => {
        if (readOnly) return;
        usePlannerStore.getState().updateElement(id, newAttrs);
    };

    const highlightedElementId = usePlannerStore(state => state.highlightedElementId);
    const isHighlighted = highlightedElementId === el.id;

    const renderHighlight = (width: number, height: number, x: number = 0, y: number = 0) => {
        if (!isHighlighted) return null;
        return (
            <Rect
                x={x - 4}
                y={y - 4}
                width={width + 8}
                height={height + 8}
                fill="#fef08a"
                opacity={0.6}
                stroke="#facc15"
                strokeWidth={2}
                cornerRadius={4}
                listening={false}
            // Pulse animation would be nice, but simple highlight is required
            />
        );
    };

    if (el.type === 'path' || (el as any).type === 'path') {
        const getLineProps = () => {
            const baseProps = {
                points: (el as any).points,
                stroke: el.stroke,
                strokeWidth: el.strokeWidth || 1,
                lineCap: 'round' as const,
                lineJoin: 'round' as const,
                opacity: el.opacity || 1,
                tension: 0.5,
                globalCompositeOperation: (el as any).tool === 'eraser' ? 'destination-out' as const : 'source-over' as const,
                shadowColor: isSelected ? '#4F46E5' : undefined,
                shadowBlur: isSelected ? 8 : 0,
                shadowOpacity: isSelected ? 0.6 : 0
            };
            switch ((el as any).brushType) {
                case 'pencil':
                    return { ...baseProps, tension: 0.1, shadowBlur: 1, shadowColor: el.stroke, opacity: (el.opacity || 1) * 0.7 };
                case 'marker':
                    return { ...baseProps, lineCap: 'square' as const, globalCompositeOperation: 'multiply' as const, opacity: 0.4 };
                case 'fountain':
                    return { ...baseProps, tension: 0.8, strokeWidth: (el.strokeWidth || 1) * 0.9 };
                case 'calligraphy':
                    return { ...baseProps, lineCap: 'butt' as const, strokeWidth: (el.strokeWidth || 1) * 1.3 };
                case 'art':
                    return { ...baseProps, shadowBlur: 8, shadowColor: el.stroke, opacity: (el.opacity || 1) * 0.8 };
                default:
                    return baseProps;
            }
        };
        return (
            <Group
                key={el.id}
                id={el.id}
                listening={!readOnly && !el.isLocked}
                onClick={() => !readOnly && externalTool === 'select' && !el.isLocked && onSelect(el.id)}
                onTap={() => !readOnly && externalTool === 'select' && !el.isLocked && onSelect(el.id)}
            >
                {/* For paths, we estimate bounding box or just use highligh if we had dims, 
                    but paths in this app often don't have width/height props. 
                    If it's an ink search result, we show it nearby.
                */}
                {el.width && el.height && renderHighlight(el.width, el.height, el.x, el.y)}
                <Line
                    {...getLineProps()}
                />
            </Group>
        );
    }

    if (el.type === 'shape') {
        const commonProps = {
            key: el.id,
            id: el.id,
            x: el.x || 0,
            y: el.y || 0,
            width: el.width || 0,
            height: el.height || 0,
            stroke: el.stroke || '#000000',
            strokeWidth: el.strokeWidth || 1,
            fill: (el.filled || (el as any).filled) ? (el.fill || '#3B82F6') : 'transparent',
            draggable: !readOnly && externalTool === 'select' && !el.isLocked,
            onClick: () => !readOnly && externalTool === 'select' && !el.isLocked && onSelect(el.id),
            onTap: () => !readOnly && externalTool === 'select' && !el.isLocked && onSelect(el.id),
            onDragEnd: (e: any) => handleUpdate(el.id, { x: e.target.x(), y: e.target.y() }),
            shadowBlur: isSelected ? 10 : 0,
            shadowColor: "rgba(0,0,0,0.2)",
            onTransformEnd: (e: any) => {
                if (readOnly) return;
                const node = e.target;
                const scaleX = node.scaleX();
                const scaleY = node.scaleY();
                node.scaleX(1);
                node.scaleY(1);
                handleUpdate(el.id, {
                    x: node.x(),
                    y: node.y(),
                    width: Math.max(5, (node.width() || 0) * scaleX),
                    height: Math.max(5, (node.height() || 0) * scaleY),
                    rotation: node.rotation()
                });
            }
        };
        let shapeContent = null;
        switch (el.shapeType) {
            case 'line': shapeContent = <Line {...commonProps} points={[0, 0, (el.width || 0), (el.height || 0)]} />; break;
            case 'rectangle': shapeContent = <Rect {...commonProps} />; break;
            case 'circle': shapeContent = <Circle {...commonProps} radius={Math.max(Math.abs(el.width || 0), Math.abs(el.height || 0)) / 2} />; break;
            case 'triangle': shapeContent = <RegularPolygon {...commonProps} sides={3} radius={Math.max(Math.abs(el.width || 0), Math.abs(el.height || 0))} />; break;
            case 'diamond': shapeContent = <RegularPolygon {...commonProps} sides={4} radius={Math.max(Math.abs(el.width || 0), Math.abs(el.height || 0)) / 2} rotation={45} />; break;
            case 'pentagon': shapeContent = <RegularPolygon {...commonProps} sides={5} radius={Math.max(Math.abs(el.width || 0), Math.abs(el.height || 0)) / 2} />; break;
            case 'hexagon': shapeContent = <RegularPolygon {...commonProps} sides={6} radius={Math.max(Math.abs(el.width || 0), Math.abs(el.height || 0)) / 2} />; break;
            case 'octagon': shapeContent = <RegularPolygon {...commonProps} sides={8} radius={Math.max(Math.abs(el.width || 0), Math.abs(el.height || 0)) / 2} />; break;
            case 'star': shapeContent = <Star {...commonProps} innerRadius={20} outerRadius={40} numPoints={5} />; break;
            case 'arrow': shapeContent = <Arrow {...commonProps} points={[0, 0, el.width || 100, el.height || 100]} />; break;
        }
        return (
            <Group key={el.id}>
                {renderHighlight(el.width || 0, el.height || 0, el.x || 0, el.y || 0)}
                {shapeContent}
            </Group>
        );
    }

    if (el.type === 'image' || el.type === 'sticker') {
        if (readOnly) {
            // Specialized read-only Image renderer can store logic to just render the image without handlers
            // For now, ResizableImage might need a readOnly prop or we just pass simplified props
            // Checking ResizableImage... it likely uses Transformer, which we want to avoid showing if readOnly
            // reusing ResizableImage but controlling isSelected to be false always if readOnly
            return (
                <ResizableImage
                    key={el.id}
                    shapeProps={el}
                    isSelected={false} // Never selected in readOnly
                    onSelect={() => { }}
                    onDblClick={() => { }}
                    onChange={() => { }}
                />
            );
        }

        return (
            <ResizableImage
                key={el.id}
                shapeProps={el}
                isSelected={isSelected}
                onSelect={() => onSelect(el.id)}
                onDblClick={() => onEditAsset?.({ id: el.id, src: (el as any).url || el.src || '', type: el.type as 'image' | 'sticker' })}
                onChange={(newAttrs) => handleUpdate(el.id, newAttrs)}
            />
        );
    }

    if (el.type === 'voice') {
        // Voice notes might render differently (or not at all?) in print.
        // For now, render them as they are, but maybe printing voice notes is weird. 
        // User said "Export to Print", usually you don't print voice notes.
        // But staying true to "Virtual Canvas" which renders everything.
        // We'll keep it.
        return (
            <Group
                key={el.id}
                id={el.id}
                x={el.x}
                y={el.y}
                draggable={!readOnly && externalTool === 'select' && !el.isLocked}
                onClick={() => {
                    if (!readOnly && !el.isLocked) {
                        if (externalTool === 'select') {
                            onSelect(el.id);
                            onVoicePlay?.(el.id);
                        }
                    }
                }}
                onDragEnd={(e: any) => handleUpdate(el.id, { x: e.target.x(), y: e.target.y() })}
            >
                {renderHighlight(40, 40, -20, -20)}
                <Circle radius={20} fill="#4F46E5" shadowBlur={isSelected ? 10 : 5} shadowColor={isSelected ? "rgba(79, 70, 229, 0.4)" : "rgba(0,0,0,0.2)"} />
                <Circle radius={8} fill="white" listening={false} />
                <KonvaText y={25} text="Voice Note" fontSize={10} fontStyle="bold" fill="#4F46E5" align="center" width={40} offsetX={20} listening={false} />
            </Group>
        );
    }

    if (el.type === 'text') {
        const textWidth = el.width || 200;
        const textHeight = el.height || 100;
        const fontSize = el.fontSize || 16;
        const lineHeight = fontSize * 1.2;
        const padding = 8;

        const lines = (el.text || '').split('\n');

        const handleTextClick = (e: any) => {
            if (readOnly || (externalTool !== 'select' && externalTool !== 'text') || el.isLocked) return;

            const stage = e.target.getStage();
            const mousePos = stage.getPointerPosition();
            const transform = e.currentTarget.getAbsoluteTransform().copy().invert();
            const localPos = transform.point(mousePos);

            const relativeY = localPos.y - padding;
            const lineIndex = Math.floor(relativeY / lineHeight);

            if (lineIndex >= 0 && lineIndex < lines.length) {
                const line = lines[lineIndex];
                const trimmed = line.trimStart();
                if (trimmed.startsWith('[ ]') || trimmed.startsWith('[x]') || trimmed.startsWith('[-]')) {
                    // Checkbox click is handled by SmartCheckbox component
                    // But we still want to select the element if in select mode
                }
            }

            onSelect(el.id);
        };

        const handleCheckboxChange = (lineIndex: number, newState: CheckboxState) => {
            if (readOnly || el.isLocked) return;
            const newLines = [...lines];
            const line = newLines[lineIndex];

            // Map states back to text representation
            const stateMap: Record<CheckboxState, string> = {
                'empty': '[ ]',
                'completed': '[x]',
                'failed': '[-]'
            };

            const prefix = line.match(/^\s*/)?.[0] || '';
            const content = line.trimStart().replace(/^\[[ x-]\]/, '');
            newLines[lineIndex] = `${prefix}${stateMap[newState]}${content}`;

            handleUpdate(el.id, { text: newLines.join('\n') });
        };

        return (
            <Group
                key={el.id}
                id={el.id}
                x={el.x}
                y={el.y}
                draggable={!readOnly && (externalTool === 'select' || externalTool === 'text') && !el.isLocked}
                onClick={handleTextClick}
                onTap={handleTextClick}
                onDblClick={() => {
                    if (!readOnly && (externalTool === 'select' || externalTool === 'text') && !el.isLocked) {
                        onTextDblClick?.(el.id);
                    }
                }}
                onDragEnd={(e: any) => handleUpdate(el.id, { x: e.target.x(), y: e.target.y() })}
                onTransformEnd={(e: any) => {
                    if (readOnly) return;
                    const node = e.target;
                    const scaleX = node.scaleX();
                    const scaleY = node.scaleY();
                    node.scaleX(1);
                    node.scaleY(1);
                    handleUpdate(el.id, {
                        x: node.x(),
                        y: node.y(),
                        width: Math.max(50, (el.width || 200) * scaleX),
                        height: Math.max(20, (el.height || 100) * scaleY),
                        rotation: node.rotation()
                    });
                }}
            >
                {renderHighlight(textWidth, textHeight)}
                {el.backgroundColor && el.backgroundColor !== 'transparent' && <Rect width={textWidth} height={textHeight} fill={el.backgroundColor} cornerRadius={4} />}
                {el.borderColor && el.borderColor !== 'transparent' && (el.borderWidth || 0) > 0 && <Rect width={textWidth} height={textHeight} stroke={el.borderColor} strokeWidth={el.borderWidth} cornerRadius={4} dash={el.borderStyle === 'dashed' ? [5, 5] : []} />}

                <Group visible={editingTextId !== el.id}>
                    {lines.map((line: string, i: number) => {
                        const trimmed = line.trimStart();
                        const indent = line.length - trimmed.length;
                        const charWidth = fontSize * 0.6; // Approximation for Inter
                        const xOffset = padding + (indent * charWidth / 2);

                        let checkboxState: CheckboxState | null = null;
                        let textContent = line;

                        if (trimmed.startsWith('[ ]')) {
                            checkboxState = 'empty';
                            textContent = line.replace('[ ]', '    '); // Replace with spaces to preserve layout
                        } else if (trimmed.startsWith('[x]')) {
                            checkboxState = 'completed';
                            textContent = line.replace('[x]', '    ');
                        } else if (trimmed.startsWith('[-]')) {
                            checkboxState = 'failed';
                            textContent = line.replace('[-]', '    ');
                        }

                        const isCompleted = checkboxState === 'completed';
                        const isFailed = checkboxState === 'failed';

                        return (
                            <Group key={i} y={i * lineHeight}>
                                <KonvaText
                                    x={0}
                                    y={0}
                                    text={textContent}
                                    fontSize={fontSize}
                                    fontFamily={el.fontFamily || 'Inter'}
                                    fill={el.fill || '#000000'}
                                    fontStyle={el.fontStyle || 'normal'}
                                    align={el.align || 'left'}
                                    verticalAlign="top"
                                    width={textWidth}
                                    padding={padding}
                                    wrap="none" // Line by line rendering
                                    opacity={isFailed ? 0.5 : 1}
                                />
                                {checkboxState && (
                                    <SmartCheckbox
                                        state={checkboxState}
                                        x={padding + (indent * 8)}
                                        y={(lineHeight - 18) / 2 + 2}
                                        size={18}
                                        onChange={(s) => handleCheckboxChange(i, s)}
                                    />
                                )}
                                {(isCompleted || isFailed) && (
                                    <Line
                                        points={[
                                            xOffset + (checkboxState ? 24 : 0),
                                            padding + lineHeight / 2,
                                            textWidth - padding,
                                            padding + lineHeight / 2
                                        ]}
                                        stroke={el.fill || '#000000'}
                                        strokeWidth={1}
                                        opacity={isFailed ? 0.4 : 0.6}
                                        listening={false}
                                    />
                                )}
                            </Group>
                        );
                    })}
                </Group>

                {!readOnly && isSelected && !editingTextId && <Rect width={textWidth} height={textHeight} stroke="#4F46E5" strokeWidth={1} dash={[4, 2]} listening={false} />}
            </Group>
        );
    }
    return null;
};
