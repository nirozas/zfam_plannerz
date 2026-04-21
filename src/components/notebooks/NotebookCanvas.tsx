import { useState, useRef, useEffect, forwardRef, useImperativeHandle } from 'react';
import { Stage, Layer, Text as KonvaText, Line, Image as KonvaImage, Transformer, Group, Rect, Circle, RegularPolygon, Star, Arrow } from 'react-konva';
import useImage from 'use-image';
import Konva from 'konva';
import { NotebookElement, PageTemplate, PageOrientation } from '../../types/notebook';
import { loadToken } from '../../lib/googleDrive';

interface NotebookCanvasProps {
  pageId: string;
  elements: NotebookElement[];
  template: PageTemplate;
  orientation: PageOrientation;
  onUpdateElements: (elements: NotebookElement[]) => void;
  onSelectElement: (id: string | null) => void;
  activeTool: string;
  setActiveTool: (tool: any) => void;
  brushSettings: { color: string; width: number; opacity: number; penType?: string };
  textSettings: { 
    fontFamily: string; 
    fontSize: number; 
    fill: string; 
    fontStyle?: string; 
    align?: string; 
    dir?: string;
    backgroundColor?: string;
    outlineStyle?: string;
    outlineColor?: string;
  };
  selectedId: string | null;
}

// Improved Background Removal Filter
const CustomBackgroundRemoval = function (this: any, imageData: any) {
  const data = imageData.data;
  const threshold = this.getAttr('bgThreshold') || 240;
  
  for (let i = 0; i < data.length; i += 4) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    
    if (r >= threshold && g >= threshold && b >= threshold) {
      data[i + 3] = 0;
    }
  }
};

export const NotebookCanvas = forwardRef<any, NotebookCanvasProps>(({
  elements,
  template,
  orientation,
  onUpdateElements,
  onSelectElement,
  activeTool,
  setActiveTool,
  brushSettings,
  textSettings,
  selectedId
}, ref) => {
  const stageRef = useRef<any>(null);
  const transformerRef = useRef<any>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [editingTextId, setEditingTextId] = useState<string | null>(null);
  const [editingValue, setEditingValue] = useState('');

  // Expose getDataURL so parent can snapshot the live stage for export
  useImperativeHandle(ref, () => ({
    getDataURL: (pixelRatio = 2) => stageRef.current?.toDataURL({ pixelRatio }) ?? null,
    getStageSize: () => ({ width, height }),
  }));
  
  const width = orientation === 'portrait' ? 794 : 1123;
  const height = orientation === 'portrait' ? 1123 : 794;

  useEffect(() => {
    if (transformerRef.current && selectedId) {
      const stage = stageRef.current;
      const selectedNode = stage.findOne('#group-' + selectedId);
      if (selectedNode) {
        transformerRef.current.nodes([selectedNode]);
        transformerRef.current.getLayer().batchDraw();
      }
    } else if (transformerRef.current) {
      transformerRef.current.nodes([]);
    }
  }, [selectedId, elements]);

  useEffect(() => {
    const elToFit = elements.find(el => (el as any)._fitToContent);
    if (elToFit && stageRef.current) {
      const textNode = stageRef.current.findOne('#' + elToFit.id);
      if (textNode) {
        // Temporarily set dimensions to auto to measure natural size
        const oldWidth = textNode.width();
        const oldHeight = textNode.height();
        textNode.width('auto');
        textNode.height('auto');
        const naturalWidth = textNode.width();
        const naturalHeight = textNode.height();
        textNode.width(oldWidth);
        textNode.height(oldHeight);
        
        onUpdateElements(elements.map(el => 
          el.id === elToFit.id ? { 
            ...el, 
            width: Math.ceil(naturalWidth), 
            height: Math.ceil(naturalHeight),
            _fitToContent: undefined 
          } as any : el
        ));
      }
    }
  }, [elements, onUpdateElements]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.key === 'Delete' || e.key === 'Backspace') && selectedId && !editingTextId) {
        onUpdateElements(elements.filter(el => el.id !== selectedId));
        onSelectElement(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedId, elements, editingTextId]);

  const handleMouseDown = (e: any) => {
    if (editingTextId && e.target.id() !== editingTextId) {
      handleTextBlur();
    }

    const stage = e.target.getStage();
    const pos = stage.getPointerPosition();
    if (e.target.getParent()?.className === 'Transformer') return;
    const clickedOnEmpty = e.target === stage;

    if (activeTool === 'select') {
      if (clickedOnEmpty) {
        onSelectElement(null);
      } else {
        let node = e.target;
        while (node && node !== stage) {
          const id = node.id();
          if (id && id.startsWith('group-')) {
            onSelectElement(id.replace('group-', ''));
            return;
          }
          node = node.parent;
        }
      }
      return;
    }

    if (activeTool === 'pen' || activeTool === 'highlighter' || activeTool === 'eraser') {
      setIsDrawing(true);
      const newPath: NotebookElement = {
        id: `path-${Date.now()}`,
        type: 'path',
        x: 0,
        y: 0,
        points: [pos.x, pos.y],
        stroke: activeTool === 'eraser' ? '#ffffff' : brushSettings.color,
        strokeWidth: activeTool === 'eraser' ? 30 : brushSettings.width,
        opacity: activeTool === 'highlighter' ? brushSettings.opacity : 1,
        isHighlighter: activeTool === 'highlighter',
        isEraser: activeTool === 'eraser',
        penType: activeTool === 'pen' ? brushSettings.penType : undefined,
        zIndex: elements.length,
      };
      onUpdateElements([...elements, newPath]);
    }

    if (activeTool === 'text') {
      const newText: NotebookElement = {
        id: `text-${Date.now()}`,
        type: 'text',
        x: pos.x,
        y: pos.y,
        width: 250,
        height: 100,
        text: 'Type something...',
        fontSize: textSettings.fontSize,
        fontFamily: textSettings.fontFamily,
        fontStyle: textSettings.fontStyle || 'normal',
        align: textSettings.align || 'left',
        dir: textSettings.dir || 'ltr',
        fill: textSettings.fill,
        backgroundColor: textSettings.backgroundColor || 'transparent',
        outlineStyle: (textSettings.outlineStyle as 'none' | 'solid' | 'dashed' | 'double') || 'none',
        outlineColor: textSettings.outlineColor || '#cbd5e1',
        zIndex: elements.length,
      };
      onUpdateElements([...elements, newText]);
      onSelectElement(newText.id);
      setEditingTextId(newText.id);
      setEditingValue('Type something...');
    }

    if (activeTool.startsWith('shape:')) {
      const shapeType = activeTool.split(':')[1] as any;
      const newShape: NotebookElement = {
        id: `shape-${Date.now()}`,
        type: 'shape',
        shapeType: shapeType,
        x: pos.x,
        y: pos.y,
        width: shapeType === 'line' ? 100 : 100,
        height: shapeType === 'line' ? 2 : 100,
        fill: brushSettings.color,
        stroke: brushSettings.color,
        strokeWidth: 2,
        zIndex: elements.length,
      };
      onUpdateElements([...elements, newShape]);
      onSelectElement(newShape.id);
      setActiveTool('select');
    }
  };

  const handleMouseMove = (e: any) => {
    if (!isDrawing) return;
    const stage = e.target.getStage();
    const pos = stage.getPointerPosition();
    const lastPath = elements[elements.length - 1];
    if (lastPath && lastPath.type === 'path') {
      const newPoints = [...(lastPath.points || []), pos.x, pos.y];
      const newElements = [...elements];
      newElements[newElements.length - 1] = { ...lastPath, points: newPoints };
      onUpdateElements(newElements);
    }
  };

  const handleMouseUp = () => setIsDrawing(false);

  const handleTextBlur = () => {
    if (editingTextId) {
      const newElements = elements.map(el => 
        el.id === editingTextId ? { ...el, text: editingValue } : el
      );
      onUpdateElements(newElements);
      setEditingTextId(null);
    }
  };

  return (
    <div className={`a4-page ${orientation} template-${template}`} style={{ position: 'relative' }}>
      <Stage
        width={width}
        height={height}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        ref={stageRef}
      >
        <Layer>
          {[...elements]
            .filter(el => el.type !== 'path')
            .sort((a, b) => (a.zIndex || 0) - (b.zIndex || 0))
            .map((el) => {
            if (el.type === 'text') {
              const isEditing = editingTextId === el.id;
              return (
                <Group
                  key={el.id}
                  id={'group-' + el.id}
                  x={el.x}
                  y={el.y}
                  width={el.width || 100}
                  height={el.height || 50}
                  rotation={el.rotation || 0}
                  draggable={activeTool === 'select' && !isEditing}
                  onDragEnd={(e) => {
                    onUpdateElements(elements.map(item => 
                      item.id === el.id ? { ...item, x: e.target.x(), y: e.target.y() } : item
                    ));
                  }}
                  onTransformEnd={(e) => {
                    const node = e.target;
                    const scaleX = node.scaleX();
                    const scaleY = node.scaleY();
                    node.scaleX(1);
                    node.scaleY(1);
                    onUpdateElements(elements.map(item => 
                      item.id === el.id ? { 
                        ...item, 
                        x: node.x(), 
                        y: node.y(), 
                        width: Math.max(20, (el.width || 100) * scaleX),
                        height: Math.max(20, (el.height || 50) * scaleY),
                        rotation: node.rotation()
                      } : item
                    ));
                  }}
                >
                  <Rect
                    width={el.width || 100}
                    height={el.height || 50}
                    fill={el.backgroundColor || 'transparent'}
                    stroke={el.outlineStyle && el.outlineStyle !== 'none' ? (el.outlineColor || '#cbd5e1') : 'transparent'}
                    strokeWidth={el.outlineStyle === 'double' ? 1 : (el.outlineStyle === 'none' ? 0 : 2)}
                    dash={el.outlineStyle === 'dashed' ? [10, 5] : undefined}
                    cornerRadius={4}
                  />
                  <KonvaText
                    id={el.id}
                    text={isEditing ? '' : el.text}
                    fontSize={el.fontSize}
                    fontFamily={el.fontFamily}
                    fontStyle={el.fontStyle || 'normal'}
                    align={el.align || 'left'}
                    fill={el.fill}
                    width={el.width || 100}
                    height={el.height || 50}
                    padding={4}
                    onDblClick={() => {
                      setEditingTextId(el.id);
                      setEditingValue(el.text || '');
                      onSelectElement(el.id);
                    }}
                    onDblTap={() => {
                      setEditingTextId(el.id);
                      setEditingValue(el.text || '');
                      onSelectElement(el.id);
                    }}
                    onClick={(e) => {
                      if (activeTool !== 'select') return;
                      const node = e.target;
                      const stage = node.getStage();
                      if (!stage) return;
                      const pos = stage.getPointerPosition();
                      if (!pos) return;
                      const localPos = node.getAbsoluteTransform().copy().invert().point(pos);
                      
                      // Check if clicked in the left margin area (where checkboxes are)
                      if (localPos.x < 40) {
                        const text = el.text || '';
                        const lines = text.split('\n');
                        const fontSize = el.fontSize || 20;
                        const lineHeight = fontSize * 1.2;
                        const lineIdx = Math.floor((localPos.y - 12) / lineHeight);
                        
                        if (lineIdx >= 0 && lineIdx < lines.length) {
                          let line = lines[lineIdx];
                          if (line.includes('☐')) {
                            lines[lineIdx] = line.replace('☐', '☑');
                            onUpdateElements(elements.map(item => item.id === el.id ? { ...item, text: lines.join('\n') } : item));
                            e.cancelBubble = true;
                          } else if (line.includes('☑')) {
                            lines[lineIdx] = line.replace('☑', '☐');
                            onUpdateElements(elements.map(item => item.id === el.id ? { ...item, text: lines.join('\n') } : item));
                            e.cancelBubble = true;
                          }
                        }
                      }
                    }}
                  />
                </Group>
              );
            }
            if (el.type === 'image') {
              return (
                <NotebookImage 
                  key={el.id} 
                  el={el} 
                  activeTool={activeTool} 
                  onSelect={() => onSelectElement(el.id)} 
                  onUpdate={(updates: any) => {
                    const newElements = elements.map(item => item.id === el.id ? { ...item, ...updates } : item);
                    onUpdateElements(newElements);
                  }}
                />
              );
            }
            if (el.type === 'shape') {
              const commonProps = {
                id: el.id,
                x: 0,
                y: 0,
                width: el.width || 100,
                height: el.height || 100,
                fill: el.fill || '#4f46e5',
                stroke: el.stroke || '#4f46e5',
                strokeWidth: el.strokeWidth || 2,
              };

              const renderShape = () => {
                if (el.shapeType === 'rect') return <Rect {...commonProps} />;
                if (el.shapeType === 'circle') return <Circle {...commonProps} radius={(el.width || 100) / 2} offsetX={-(el.width || 100) / 2} offsetY={-(el.height || 100) / 2} />;
                if (el.shapeType === 'triangle') return <RegularPolygon {...commonProps} sides={3} radius={(el.width || 100) / 2} offsetX={-(el.width || 100) / 2} offsetY={-(el.height || 100) / 2} />;
                if (el.shapeType === 'star') return <Star {...commonProps} numPoints={5} innerRadius={(el.width || 100) / 4} outerRadius={(el.width || 100) / 2} offsetX={-(el.width || 100) / 2} offsetY={-(el.height || 100) / 2} />;
                if (el.shapeType === 'diamond') return <RegularPolygon {...commonProps} sides={4} radius={(el.width || 100) / 2} offsetX={-(el.width || 100) / 2} offsetY={-(el.height || 100) / 2} />;
                if (el.shapeType === 'line') return <Line {...commonProps} points={[0, 0, el.width || 100, 0]} />;
                if (el.shapeType === 'arrow') return <Arrow {...commonProps} points={[0, 0, el.width || 100, 0]} pointerLength={10} pointerWidth={10} />;
                return <Rect {...commonProps} />;
              };

              return (
                <Group
                  key={el.id}
                  id={'group-' + el.id}
                  x={el.x}
                  y={el.y}
                  rotation={el.rotation || 0}
                  draggable={activeTool === 'select'}
                  onDragEnd={(e) => {
                    onUpdateElements(elements.map(item => 
                      item.id === el.id ? { ...item, x: e.target.x(), y: e.target.y() } : item
                    ));
                  }}
                  onTransformEnd={(e) => {
                    const node = e.target;
                    const scaleX = node.scaleX();
                    const scaleY = node.scaleY();
                    node.scaleX(1);
                    node.scaleY(1);
                    onUpdateElements(elements.map(item => 
                      item.id === el.id ? { 
                        ...item, 
                        x: node.x(), 
                        y: node.y(), 
                        width: Math.max(5, (el.width || 100) * scaleX),
                        height: Math.max(5, (el.height || 100) * scaleY),
                        rotation: node.rotation()
                      } : item
                    ));
                  }}
                  onClick={() => onSelectElement(el.id)}
                  onTap={() => onSelectElement(el.id)}
                >
                  {renderShape()}
                </Group>
              );
            }
            return null;
          })}
        </Layer>
        <Layer>
          {elements.filter(el => el.type === 'path').map((el) => (
            <Group
              key={el.id}
              id={'group-' + el.id}
              x={el.x || 0}
              y={el.y || 0}
              rotation={el.rotation || 0}
              draggable={activeTool === 'select' && !el.isEraser}
              onDragEnd={(e) => {
                onUpdateElements(elements.map(item => 
                  item.id === el.id ? { ...item, x: e.target.x(), y: e.target.y() } : item
                ));
              }}
              onTransformEnd={(e) => {
                const node = e.target;
                const scaleX = node.scaleX();
                const scaleY = node.scaleY();
                node.scaleX(1);
                node.scaleY(1);
                onUpdateElements(elements.map(item => 
                  item.id === el.id ? { 
                    ...item, 
                    x: node.x(), 
                    y: node.y(), 
                    width: Math.max(5, (el.width || 100) * scaleX),
                    height: Math.max(5, (el.height || 100) * scaleY),
                    rotation: node.rotation()
                  } : item
                ));
              }}
              onClick={() => onSelectElement(el.id)}
              onTap={() => onSelectElement(el.id)}
            >
              <Line
                points={el.points}
                stroke={el.stroke}
                strokeWidth={el.strokeWidth}
                tension={el.penType === 'fountain' ? 0.2 : (el.penType === 'pincel' ? 0.3 : 0.5)}
                lineCap={el.penType === 'fountain' ? 'butt' : 'round'}
                lineJoin={el.penType === 'fountain' ? 'miter' : 'round'}
                opacity={el.penType === 'brush' ? (el.opacity || 1) * 0.4 : el.opacity}
                globalCompositeOperation={el.isEraser ? 'destination-out' : (el.isHighlighter ? 'multiply' : 'source-over')}
                hitStrokeWidth={Math.max(20, el.strokeWidth || 0)} // Make thin lines easier to click
              />
            </Group>
          ))}
        </Layer>
        <Layer>
          {selectedId && activeTool === 'select' && (
            <Transformer
              ref={transformerRef}
              padding={5}
              rotateEnabled={true}
              enabledAnchors={['top-left', 'top-right', 'bottom-left', 'bottom-right', 'middle-left', 'middle-right', 'top-center', 'bottom-center']}
              boundBoxFunc={(oldBox, newBox) => {
                if (newBox.width < 20 || newBox.height < 20) return oldBox;
                return newBox;
              }}
            />
          )}
        </Layer>
      </Stage>

      {/* HTML Overlay for Text Editing */}
      {editingTextId && elements.find(el => el.id === editingTextId) && (() => {
        const el = elements.find(el => el.id === editingTextId)!;
        return (
          <textarea
            value={editingValue}
            onChange={(e) => setEditingValue(e.target.value)}
            onBlur={handleTextBlur}
            autoFocus
            style={{
              position: 'absolute',
              top: el.y + 'px',
              left: el.x + 'px',
              width: (el.width || 100) + 'px',
              height: Math.max(el.height || 50, 50) + 'px',
              fontSize: el.fontSize + 'px',
              fontFamily: el.fontFamily,
              fontStyle: el.fontStyle || 'normal',
              textAlign: (el.align as any) || 'left',
              color: el.fill,
              backgroundColor: el.backgroundColor || 'rgba(255, 255, 255, 0.9)',
              border: '2px dashed #4f46e5',
              padding: '12px',
              outline: 'none',
              resize: 'both',
              zIndex: 1000,
              lineHeight: 1.2,
              boxSizing: 'border-box',
              transform: `rotate(${el.rotation || 0}deg)`,
              transformOrigin: 'top left',
            }}
            onKeyDown={(e) => {
              if (e.key === 'Escape') {
                handleTextBlur();
              }
              
              if (e.key === 'Tab') {
                e.preventDefault();
                const textarea = e.currentTarget;
                const start = textarea.selectionStart;
                const textBefore = editingValue.substring(0, start);
                const lines = textBefore.split('\n');
                const lastLineIdx = lines.length - 1;
                const lastLine = lines[lastLineIdx];
                
                if (e.shiftKey) {
                  // Un-indent
                  if (lastLine.startsWith('  ')) {
                    lines[lastLineIdx] = lastLine.substring(2);
                    const newText = lines.join('\n') + editingValue.substring(start);
                    setEditingValue(newText);
                    setTimeout(() => {
                      textarea.selectionStart = textarea.selectionEnd = start - 2;
                    }, 0);
                  }
                } else {
                  // Indent
                  lines[lastLineIdx] = '  ' + lastLine;
                  const newText = lines.join('\n') + editingValue.substring(start);
                  setEditingValue(newText);
                  setTimeout(() => {
                    textarea.selectionStart = textarea.selectionEnd = start + 2;
                  }, 0);
                }
                return;
              }

              if (e.key === 'Enter') {
                const textarea = e.currentTarget;
                const start = textarea.selectionStart;
                const textBefore = editingValue.substring(0, start);
                const lines = textBefore.split('\n');
                const lastLine = lines[lines.length - 1];
                
                // Check if last line starts with a bullet, checkbox or numbering
                const listMatch = lastLine.match(/^(\s*)([•○■❖➢✓☐☑]|[0-9]+\.|[A-Z]\.|[a-z]\.|[0-9]+\)|[a-z]\))\s*/);
                
                if (listMatch) {
                  e.preventDefault();
                  const indent = listMatch[1];
                  const symbol = listMatch[2];
                  let nextSymbol = symbol;

                  if (symbol === '☑') nextSymbol = '☐';
                  else if (/^\d+\.$/.test(symbol)) {
                    nextSymbol = `${parseInt(symbol) + 1}.`;
                  } else if (/^\d+\)$/.test(symbol)) {
                    nextSymbol = `${parseInt(symbol) + 1})`;
                  } else if (/^[A-Z]\.$/.test(symbol)) {
                    nextSymbol = `${String.fromCharCode(symbol.charCodeAt(0) + 1)}.`;
                  } else if (/^[a-z]\.$/.test(symbol)) {
                    nextSymbol = `${String.fromCharCode(symbol.charCodeAt(0) + 1)}.`;
                  } else if (/^[a-z]\)$/.test(symbol)) {
                    nextSymbol = `${String.fromCharCode(symbol.charCodeAt(0) + 1)})`;
                  }

                  const newText = editingValue.substring(0, start) + '\n' + indent + nextSymbol + ' ' + editingValue.substring(start);
                  setEditingValue(newText);
                  
                  // Set cursor position after the new symbol
                  setTimeout(() => {
                    textarea.selectionStart = textarea.selectionEnd = start + 1 + indent.length + nextSymbol.length + 1;
                  }, 0);
                  return;
                }
              }
              // Prevent parent keydown from deleting element
              e.stopPropagation();
            }}
          />
        );
      })()}
    </div>
  );
});

const NotebookImage = ({ el, activeTool, onSelect, onUpdate }: any) => {
  const [proxyUrl, setProxyUrl] = useState<string | null>(null);
  
  useEffect(() => {
    let currentUrl = el.src;
    if (currentUrl.includes('drive.google.com')) {
      const token = loadToken();
      if (token) {
        // Extract File ID from the URL
        const fileId = currentUrl.split('id=')[1]?.split('&')[0];
        if (fileId) {
          // Use the direct media endpoint which supports CORS with Authorization
          fetch(`https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`, {
            headers: { Authorization: `Bearer ${token.access_token}` }
          })
          .then(res => {
            if (!res.ok) throw new Error('Proxy fetch failed');
            return res.blob();
          })
          .then(blob => {
            const url = URL.createObjectURL(blob);
            setProxyUrl(url);
          })
          .catch(err => {
            console.error('Failed to proxy drive image:', err);
            // Fallback to original but it likely has CORS issues
            setProxyUrl(currentUrl);
          });
        } else {
          setProxyUrl(currentUrl);
        }
      }
    } else {
      setProxyUrl(currentUrl);
    }

    return () => {
      if (proxyUrl && proxyUrl.startsWith('blob:')) {
        URL.revokeObjectURL(proxyUrl);
      }
    };
  }, [el.src]);

  const [img, status] = useImage(proxyUrl || '', 'anonymous');
  const imageRef = useRef<any>(null);

  useEffect(() => {
    if (imageRef.current && img) {
      imageRef.current.clearCache();
      imageRef.current.cache();
      imageRef.current.getLayer()?.batchDraw();
    }
  }, [img, el.hue, el.brightness, el.removeBg, el.filter, el.opacity, el.bgThreshold, el.width, el.height]);

  const filters = [Konva.Filters.HSV, Konva.Filters.Brighten];
  if (el.removeBg) filters.push(CustomBackgroundRemoval);
  if (el.filter === 'grayscale') filters.push(Konva.Filters.Grayscale);
  if (el.filter === 'sepia') filters.push(Konva.Filters.Sepia);
  if (el.filter === 'invert') filters.push(Konva.Filters.Invert);

  return (
    <Group
      id={'group-' + el.id}
      x={el.x}
      y={el.y}
      width={el.width || 200}
      height={el.height || 200}
      rotation={el.rotation || 0}
      draggable={activeTool === 'select'}
      onDragEnd={(e) => onUpdate({ x: e.target.x(), y: e.target.y() })}
      onTransformEnd={(e) => {
        const node = e.target;
        const scaleX = node.scaleX();
        const scaleY = node.scaleY();
        node.scaleX(1);
        node.scaleY(1);
        onUpdate({
          x: node.x(),
          y: node.y(),
          width: Math.max(20, (el.width || 200) * scaleX),
          height: Math.max(20, (el.height || 200) * scaleY),
          rotation: node.rotation(),
        });
      }}
    >
      {status === 'loading' && (
        <Rect
          width={el.width || 200}
          height={el.height || 200}
          fill="#f8fafc"
          stroke="#e2e8f0"
          strokeWidth={1}
          cornerRadius={8}
        />
      )}
      
      {status === 'failed' && (
        <Group onClick={onSelect} onTap={onSelect}>
          <Rect
            width={el.width || 200}
            height={el.height || 200}
            fill="#fff1f2"
            stroke="#fda4af"
            strokeWidth={2}
            dash={[5, 5]}
            cornerRadius={8}
          />
          <KonvaText
            text="Image Not Found"
            fontSize={12}
            fontFamily="Inter"
            fontStyle="bold"
            fill="#e11d48"
            width={el.width || 200}
            height={el.height || 200}
            align="center"
            verticalAlign="middle"
            padding={20}
          />
        </Group>
      )}

      {img && status === 'loaded' && (
        <KonvaImage
          id={el.id}
          image={img}
          ref={imageRef}
          width={el.width || 200}
          height={el.height || 200}
          scaleX={el.flipX ? -1 : 1}
          offsetX={el.flipX ? (el.width || 200) : 0}
          opacity={el.opacity || 1}
          filters={filters}
          hue={el.hue || 0}
          brightness={el.brightness || 0}
          bgThreshold={el.bgThreshold || 240}
          onClick={onSelect}
          onTap={onSelect}
        />
      )}
    </Group>
  );
};
