import { useState, useRef, useEffect, forwardRef, useImperativeHandle } from 'react';
import { Stage, Layer, Text as KonvaText, Line, Image as KonvaImage, Transformer, Group, Rect, Circle, RegularPolygon, Star, Arrow, Path } from 'react-konva';

import useImage from 'use-image';
import Konva from 'konva';
import { NotebookElement, PageTemplate, PageOrientation } from '../../types/notebook';
import { loadToken } from '../../lib/googleDrive';

interface NotebookCanvasProps {
  pageId: string;
  elements: NotebookElement[];
  template: PageTemplate;
  orientation: PageOrientation;
  pageBackgroundColor?: string;
  templateSpacing?: number;
  templateColor?: string;
  backgroundImage?: string;
  backgroundOpacity?: number;
  titleSlot?: 'none' | 'left' | 'right';
  titleFontFamily?: string;
  titleFontSize?: number;
  titleColor?: string;
  titleText?: string;
  onUpdateTitleText?: (text: string) => void;
  pageTitle?: string;
  onUpdateElements: (elements: NotebookElement[]) => void;
  onSelectElement: (id: string | null) => void;
  onDoubleClickElement?: (id: string) => void;
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

export const NotebookCanvas = forwardRef((props: NotebookCanvasProps, ref: any) => {
  const {
    elements,
    template,
    orientation,
    pageBackgroundColor,
    templateSpacing,
    templateColor,
    backgroundImage,
    backgroundOpacity,
    titleSlot,
    titleFontFamily,
    titleFontSize,
    titleColor,
    titleText,
    onUpdateTitleText,
    pageTitle,
    onUpdateElements,
    onSelectElement,
    onDoubleClickElement,
    activeTool,
    setActiveTool,
    brushSettings,
    textSettings,
    selectedId
  } = props;

  const stageRef = useRef<any>(null);
  const transformerRef = useRef<any>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [tempPoints, setTempPoints] = useState<number[]>([]);
  const [tempType, setTempType] = useState<string>('pen');
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
    const elToFit = elements.find(el => (el as any)._fitToContent === true);
    if (!elToFit) return; // Only run when flag is set
    if (stageRef.current) {
      const textNode = stageRef.current.findOne('#' + elToFit.id);
      if (textNode) {
        // Save current dimensions, temporarily auto-size to measure natural size
        textNode.width('auto');
        textNode.height('auto');
        const naturalWidth = Math.max(60, textNode.width() + 8);
        const naturalHeight = Math.max(24, textNode.height() + 8);
        // Restore so the upcoming update takes effect
        textNode.width(elToFit.width || 250);
        textNode.height(elToFit.height || 80);

        onUpdateElements(elements.map(el =>
          el.id === elToFit.id ? {
            ...el,
            width: naturalWidth,
            height: naturalHeight,
            _fitToContent: undefined
          } as any : el
        ));
      }
    }
  }, [elements]);


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
    if (activeTool === 'pen' || activeTool === 'highlighter' || activeTool === 'eraser') {
      if (e.evt && typeof e.evt.preventDefault === 'function') {
        e.evt.preventDefault();
      }
    }
    if (editingTextId && e.target.id() !== editingTextId) {
      handleTextBlur();
      return;
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
      setTempPoints([pos.x, pos.y]);
      setTempType(activeTool);
    }


    if (activeTool === 'text') {
      // Check if clicking on an existing text element
      if (!clickedOnEmpty) {
        let node = e.target;
        while (node && node !== stage) {
          const id = node.id();
          // The KonvaText has the raw id, the Group has 'group-' + id
          const targetId = id?.startsWith('group-') ? id.replace('group-', '') : id;
          const existingEl = elements.find(el => el.id === targetId);
          
          if (existingEl && existingEl.type === 'text') {
            setEditingTextId(existingEl.id);
            setEditingValue(existingEl.text || '');
            onSelectElement(existingEl.id);
            return; // Exit early, don't create new
          }
          node = node.parent;
        }
      }

      const newText: NotebookElement = {
        id: `text-${Date.now()}`,
        type: 'text',
        x: pos.x,
        y: pos.y,
        width: 250,
        height: 120,
        text: '',
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
      setEditingValue('');
    }



    if (activeTool.startsWith('shape:')) {
      const shapeType = activeTool.split(':')[1] as any;
      const newShape: NotebookElement = {
        id: `shape-${Date.now()}`,
        type: 'shape',
        shapeType: shapeType,
        x: pos.x - 50,
        y: pos.y - 50,
        width: 100,
        height: 100,
        fill: '#4f46e5', // Default to Indigo instead of slate/black
        stroke: '#4f46e5',
        strokeWidth: 2,
        zIndex: elements.length,
      };
      onUpdateElements([...elements, newShape]);
      onSelectElement(newShape.id);
      setActiveTool('select');
    }
  };

  // Listen for emoji insertion events
  useEffect(() => {
    const handleEmoji = (e: any) => {
      const emoji = e.detail;
      const pos = { x: 100, y: 100 }; // Default position
      if (stageRef.current) {
        const stage = stageRef.current;
        // Always place in center of current view when inserted from toolbar
        pos.x = -stage.x() / stage.scaleX() + (stage.width() || window.innerWidth) / 2 / stage.scaleX();
        pos.y = -stage.y() / stage.scaleY() + (stage.height() || window.innerHeight) / 2 / stage.scaleY();
      }

      const newEmoji: NotebookElement = {
        id: `emoji-${Date.now()}`,
        type: 'text',
        text: emoji,
        x: pos.x,
        y: pos.y,
        fontSize: 48,
        fontFamily: 'Inter',
        fill: '#000',
        zIndex: elements.length,
      };
      onUpdateElements([...elements, newEmoji]);
      onSelectElement(newEmoji.id);
    };

    window.addEventListener('insert-emoji', handleEmoji);
    return () => window.removeEventListener('insert-emoji', handleEmoji);
  }, [elements, onUpdateElements, onSelectElement]);

  // Listen for shape insertion events
  useEffect(() => {
    const handleShape = (e: any) => {
      const shapeType = e.detail;
      const pos = { x: 100, y: 100 }; // Default position
      if (stageRef.current) {
        const stage = stageRef.current;
        // Always place in center of current view when inserted from toolbar
        pos.x = -stage.x() / stage.scaleX() + (stage.width() || window.innerWidth) / 2 / stage.scaleX();
        pos.y = -stage.y() / stage.scaleY() + (stage.height() || window.innerHeight) / 2 / stage.scaleY();
      }

      const newShape: NotebookElement = {
        id: `shape-${Date.now()}`,
        type: 'shape',
        shapeType: shapeType,
        x: pos.x - 50,
        y: pos.y - 50,
        width: 100,
        height: 100,
        fill: '#4f46e5', // Default to Indigo
        stroke: '#4f46e5',
        strokeWidth: 2,
        zIndex: elements.length,
      };

      if (shapeType.startsWith('callout-')) {
        // Initialize with one control point for the tail
        // Positioned outside the bottom-left of the bounding box
        newShape.controlPoints = [{ x: 20, y: 120 }];
      }

      onUpdateElements([...elements, newShape]);
      onSelectElement(newShape.id);
      setActiveTool('select');
    };

    window.addEventListener('insert-shape', handleShape);
    return () => window.removeEventListener('insert-shape', handleShape);
  }, [elements, onUpdateElements, onSelectElement, setActiveTool]);

  // Listen for text formatting events (bullets/checkboxes) from toolbar
  useEffect(() => {
    const handleFormatList = (e: any) => {
      const { type, bullet } = e.detail;
      const targetId = editingTextId || selectedId;
      if (!targetId) return;

      const currentText = editingTextId ? editingValue : elements.find(el => el.id === targetId)?.text || '';
      const lines = currentText.split('\n');

      let newLines;
      if (type === 'bullet') {
        newLines = lines.map((line: string, index: number) => {
          let cleaned = line.trimStart().replace(/^[•○■❖➢✓☐☑]\s*/, '').replace(/^([0-9A-Za-z.]+\.|\d+\)|[a-z]\))\s*/, '');
          if (bullet.id === 'none') return cleaned;
          if (bullet.id === 'num') return `${index + 1}. ${cleaned}`;
          if (bullet.id === 'alpha') return `${String.fromCharCode(97 + index)}. ${cleaned}`;
          if (bullet.id === 'ALPHA') return `${String.fromCharCode(65 + index)}. ${cleaned}`;
          return `${bullet.char} ${cleaned}`;
        });
      } else if (type === 'checkbox') {
        const hasCheck = lines.some((l: string) => l.trim().startsWith('☐') || l.trim().startsWith('☑'));
        newLines = lines.map((line: string) => {
          const cleaned = line.trimStart().replace(/^[☐☑]\s*/, '');
          return hasCheck ? cleaned : `☐ ${cleaned}`;
        });
      }

      const newText = newLines?.join('\n') || '';

      if (editingTextId) {
        setEditingValue(newText);
      } else {
        onUpdateElements(elements.map(el => el.id === targetId ? { ...el, text: newText } : el));
      }
    };

    window.addEventListener('format-text-list', handleFormatList);
    return () => window.removeEventListener('format-text-list', handleFormatList);
  }, [elements, editingTextId, editingValue, selectedId, onUpdateElements]);



  const handleMouseMove = (e: any) => {
    if (activeTool === 'pen' || activeTool === 'highlighter' || activeTool === 'eraser') {
      if (e.evt && typeof e.evt.preventDefault === 'function') {
        e.evt.preventDefault();
      }
    }
    if (!isDrawing) return;
    const stage = e.target.getStage();
    const pos = stage.getPointerPosition();
    setTempPoints(prev => [...prev, pos.x, pos.y]);
  };

  const handleMouseUp = (e: any) => {
    if (activeTool === 'pen' || activeTool === 'highlighter' || activeTool === 'eraser') {
      if (e?.evt && typeof e.evt.preventDefault === 'function') {
        e.evt.preventDefault();
      }
    }
    if (isDrawing && tempPoints.length > 2) {
      const newPath: NotebookElement = {
        id: `path-${Date.now()}`,
        type: 'path',
        x: 0,
        y: 0,
        points: tempPoints,
        stroke: tempType === 'eraser' ? '#ffffff' : brushSettings.color,
        strokeWidth: tempType === 'eraser' ? 30 : brushSettings.width,
        opacity: tempType === 'highlighter' ? brushSettings.opacity : 1,
        isHighlighter: tempType === 'highlighter',
        isEraser: tempType === 'eraser',
        penType: tempType === 'pen' ? brushSettings.penType : undefined,
        zIndex: elements.length,
      };
      onUpdateElements([...elements, newPath]);
    }
    setIsDrawing(false);
    setTempPoints([]);
  };


  const handleTextBlur = () => {
    if (editingTextId) {
      const newElements = elements.map(el => 
        el.id === editingTextId ? { ...el, text: editingValue } : el
      );
      onUpdateElements(newElements);
      setEditingTextId(null);
    }
  };

  const getBackgroundStyle = () => {
    const spacing = templateSpacing || 30;
    const color = templateColor || '#cbd5e1';
    const bgColor = pageBackgroundColor || 'white';
    
    let bgStyle: any = { backgroundColor: bgColor };
    
    if (template === 'lined') {
      bgStyle.backgroundImage = `linear-gradient(${color} 1.5px, transparent 1.5px)`;
      bgStyle.backgroundSize = `100% ${spacing}px`;
    } else if (template === 'grid') {
      bgStyle.backgroundImage = `linear-gradient(${color} 1.5px, transparent 1.5px), linear-gradient(90deg, ${color} 1.5px, transparent 1.5px)`;
      bgStyle.backgroundSize = `${spacing}px ${spacing}px`;
    } else if (template === 'dotted') {
      bgStyle.backgroundImage = `radial-gradient(${color} 2px, transparent 2px)`;
      bgStyle.backgroundSize = `${spacing}px ${spacing}px`;
    } else if (template === 'cornell') {
      // Top horizontal line at 80px, vertical cue line at 30%
      bgStyle.backgroundImage = `
        linear-gradient(${color} 2px, transparent 2px),
        linear-gradient(90deg, transparent calc(30% - 2px), ${color} 2px, transparent 30%),
        linear-gradient(${color} 1px, transparent 1px)
      `;
      bgStyle.backgroundSize = `100% 100%, 100% 100%, 100% ${spacing}px`;
      bgStyle.backgroundPosition = `0 80px, 0 0, 0 80px`;
      bgStyle.backgroundRepeat = 'no-repeat, no-repeat, repeat';
    } else if (template === 'music') {
      const h = spacing * 2;
      const ls = spacing / 4;
      const svg = `<svg width="100" height="${h}" xmlns="http://www.w3.org/2000/svg">
        <line x1="0" y1="1" x2="100" y2="1" stroke="${color}" stroke-width="1"/>
        <line x1="0" y1="${ls}" x2="100" y2="${ls}" stroke="${color}" stroke-width="1"/>
        <line x1="0" y1="${ls*2}" x2="100" y2="${ls*2}" stroke="${color}" stroke-width="1"/>
        <line x1="0" y1="${ls*3}" x2="100" y2="${ls*3}" stroke="${color}" stroke-width="1"/>
        <line x1="0" y1="${ls*4}" x2="100" y2="${ls*4}" stroke="${color}" stroke-width="1"/>
      </svg>`;
      bgStyle.backgroundImage = `url("data:image/svg+xml,${encodeURIComponent(svg)}")`;
      bgStyle.backgroundSize = `100% ${h}px`;
    } else if (template === 'handwriting') {
      const svg = `<svg width="40" height="${spacing}" xmlns="http://www.w3.org/2000/svg">
        <line x1="0" y1="${spacing * 0.2}" x2="40" y2="${spacing * 0.2}" stroke="${color}" stroke-width="1"/>
        <line x1="0" y1="${spacing * 0.5}" x2="40" y2="${spacing * 0.5}" stroke="${color}" stroke-width="1" stroke-dasharray="8 8"/>
        <line x1="0" y1="${spacing * 0.8}" x2="40" y2="${spacing * 0.8}" stroke="${color}" stroke-width="1"/>
      </svg>`;
      bgStyle.backgroundImage = `url("data:image/svg+xml,${encodeURIComponent(svg)}")`;
      bgStyle.backgroundSize = `40px ${spacing}px`;
    }
    return bgStyle;
  };

  return (
    <div 
      className={`a4-page ${orientation}`} 
      style={{ 
        position: 'relative',
        touchAction: (activeTool === 'pen' || activeTool === 'highlighter' || activeTool === 'eraser') ? 'none' : 'pan-x pan-y',
        ...getBackgroundStyle()
      }}
    >
      {backgroundImage && (
        <img 
          src={backgroundImage} 
          alt="Page Background"
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            opacity: backgroundOpacity ?? 0.3,
            pointerEvents: 'none',
            zIndex: 0,
            borderRadius: 'inherit'
          }}
        />
      )}

      {titleSlot && titleSlot !== 'none' && (
        <textarea
          ref={(el) => {
            if (el) {
              el.style.height = 'auto';
              el.style.height = el.scrollHeight + 'px';
            }
          }}
          value={titleText ?? pageTitle ?? ''}
          onChange={(e) => {
            e.target.style.height = 'auto';
            e.target.style.height = e.target.scrollHeight + 'px';
            onUpdateTitleText?.(e.target.value);
          }}
          placeholder="Page Title"
          dir={titleSlot === 'right' ? 'rtl' : 'ltr'}
          onMouseDown={(e) => e.stopPropagation()} // Prevent canvas from interpreting the click
          rows={1}
          style={{
            position: 'absolute',
            top: '40px',
            [titleSlot === 'left' ? 'left' : 'right']: '40px',
            width: '30%',
            minWidth: '200px',
            border: 'none',
            borderBottom: `2px solid ${templateColor || '#cbd5e1'}`,
            background: 'transparent',
            outline: 'none',
            fontSize: `${titleFontSize || 28}px`,
            fontFamily: titleFontFamily || 'inherit',
            color: titleColor || '#0f172a',
            fontWeight: 900,
            pointerEvents: 'auto',
            zIndex: 10,
            resize: 'none',
            overflow: 'hidden',
            lineHeight: 1.2
          }}
        />
      )}

      <Stage
        width={width}
        height={height}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onTouchStart={handleMouseDown}
        onTouchMove={handleMouseMove}
        onTouchEnd={handleMouseUp}
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
                    align={el.dir === 'rtl' ? 'right' : (el.align || 'left')}
                    fill={el.fill}
                    width={el.width || 100}
                    height={el.height || 50}
                    padding={4}
                    wrap="word"
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
                  onDoubleClick={() => onDoubleClickElement?.(el.id)}
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
                stroke: el.stroke || el.fill || '#4f46e5',
                strokeWidth: el.strokeWidth ?? 2,
                opacity: el.opacity !== undefined ? el.opacity : 1,
              };

              const renderShape = () => {
                const w = el.width || 100;
                const h = el.height || 100;

                const PATHS: Record<string, string> = {
                  'rect-snip': 'M0,20 L20,0 L100,0 L100,100 L0,100 Z',
                  'triangle-right': 'M0,100 L100,100 L0,0 Z',
                  'parallelogram': 'M20,0 L100,0 L80,100 L0,100 Z',
                  'trapezoid': 'M20,0 L80,0 L100,100 L0,100 Z',
                  'pie': 'M50,50 L100,50 A50,50 0 1,0 50,0 Z',
                  'chord': 'M15,15 A50,50 0 1,0 85,85 L15,15 Z',
                  'teardrop': 'M50,0 C50,0 0,50 0,75 A50,25 0 0,0 100,75 C100,50 50,0 50,0 Z',
                  'frame': 'M0,0 L100,0 L100,100 L0,100 Z M20,20 L20,80 L80,80 L80,20 Z',
                  'half-frame': 'M0,0 L100,0 L100,20 L20,20 L20,100 L0,100 Z',
                  'l-shape': 'M0,0 L20,0 L20,80 L100,80 L100,100 L0,100 Z',
                  'cross': 'M30,0 L70,0 L70,30 L100,30 L100,70 L70,70 L70,100 L30,100 L30,70 L0,70 L0,30 L30,30 Z',
                  'cylinder': 'M0,20 C0,0 100,0 100,20 L100,80 C100,100 0,100 0,80 Z M0,20 C0,40 100,40 100,20',
                  'cube': 'M0,30 L50,0 L100,30 L100,100 L50,70 L0,100 Z M50,0 L50,70 M0,30 L50,70 M100,30 L50,70',
                  'donut': 'M0,50 A50,50 0 1,0 100,50 A50,50 0 1,0 0,50 M25,50 A25,25 0 1,1 75,50 A25,25 0 1,1 25,50',
                  'no-symbol': 'M0,50 A50,50 0 1,0 100,50 A50,50 0 1,0 0,50 M15,15 L85,85',
                  'smiley': 'M0,50 A50,50 0 1,0 100,50 A50,50 0 1,0 0,50 M30,35 A10,10 0 1,0 30,36 M70,35 A10,10 0 1,0 70,36 M30,65 C30,85 70,85 70,65',
                  'heart': 'M50,88 C50,88 5,55 5,30 C5,15 15,5 30,5 C40,5 45,10 50,15 C55,10 60,5 70,5 C85,5 95,15 95,30 C95,55 50,88 50,88 Z',
                  'lightning': 'M50,0 L0,60 L40,60 L30,100 L90,40 L50,40 Z',
                  'sun': 'M50,20 A30,30 0 1,0 50,80 A30,30 0 1,0 50,20 M50,0 L50,10 M50,90 L50,100 M0,50 L10,50 M90,50 L100,50 M15,15 L22,22 M78,78 L85,85 M15,85 L22,78 M78,15 L85,22',
                  'moon': 'M60,0 C20,0 0,40 30,80 C10,50 40,20 80,40 C80,20 70,10 60,0 Z',
                  'cloud': 'M25 60 A20 20 0 0 1 25 20 A20 20 0 0 1 45 30 A20 20 0 0 1 75 20 A20 20 0 0 1 95 40 A20 20 0 0 1 75 60 Z',
                  'curve': 'M0,50 Q25,0 50,50 T100,50',
                  
                  'block-arrow-right': 'M0,30 L60,30 L60,10 L100,50 L60,90 L60,70 L0,70 Z',
                  'block-arrow-left': 'M100,30 L40,30 L40,10 L0,50 L40,90 L40,70 L100,70 Z',
                  'block-arrow-up': 'M30,100 L30,40 L10,40 L50,0 L90,40 L70,40 L70,100 Z',
                  'block-arrow-down': 'M30,0 L30,60 L10,60 L50,100 L90,60 L70,60 L70,0 Z',
                  'block-arrow-left-right': 'M20,50 L40,30 L40,40 L60,40 L60,30 L80,50 L60,70 L60,60 L40,60 L40,70 Z',
                  'block-arrow-up-down': 'M50,20 L30,40 L40,40 L40,60 L30,60 L50,80 L70,60 L60,60 L60,40 L70,40 Z',
                  'block-arrow-quad': 'M40,40 L40,20 L30,20 L50,0 L70,20 L60,20 L60,40 L80,40 L80,30 L100,50 L80,70 L80,60 L60,60 L60,80 L70,80 L50,100 L30,80 L40,80 L40,60 L20,60 L20,70 L0,50 L20,30 L20,40 Z',
                  'block-arrow-u-turn': 'M0,30 L30,30 C60,30 60,70 30,70 L30,50 L0,80 L30,110 L30,90 C80,90 80,10 30,10 L0,10 Z',

                  'eq-plus': 'M30,30 L30,0 L70,0 L70,30 L100,30 L100,70 L70,70 L70,100 L30,100 L30,70 L0,70 L0,30 Z',
                  'eq-minus': 'M0,30 L100,30 L100,70 L0,70 Z',
                  'eq-multiply': 'M20,0 L50,30 L80,0 L100,20 L70,50 L100,80 L80,100 L50,70 L20,100 L0,80 L30,50 L0,20 Z',
                  'eq-divide': 'M30,15 A15,15 0 1,0 70,15 A15,15 0 1,0 30,15 M0,40 L100,40 L100,60 L0,60 Z M30,85 A15,15 0 1,0 70,85 A15,15 0 1,0 30,85',
                  'eq-equal': 'M0,15 L100,15 L100,40 L0,40 Z M0,60 L100,60 L100,85 L0,85 Z',
                  'eq-not-equal': 'M0,15 L100,15 L100,40 L0,40 Z M0,60 L100,60 L100,85 L0,85 Z M70,0 L85,0 L30,100 L15,100 Z',

                  'flow-process': 'M0,0 L100,0 L100,100 L0,100 Z',
                  'flow-decision': 'M50,0 L100,50 L50,100 L0,50 Z',
                  'flow-data': 'M20,0 L100,0 L80,100 L0,100 Z',
                  'flow-document': 'M0,0 L100,0 L100,75 C75,100 25,50 0,75 Z',
                  'flow-multidocument': 'M10,10 L100,10 L100,80 C75,105 35,55 10,80 Z M0,0 L90,0 L90,70 C65,95 25,45 0,70 Z',
                  'flow-terminator': 'M25,0 L75,0 A25,25 0 0,1 100,50 A25,25 0 0,1 75,100 L25,100 A25,25 0 0,1 0,50 A25,25 0 0,1 25,0 Z',
                  'flow-database': 'M0,20 C0,0 100,0 100,20 L100,80 C100,100 0,100 0,80 Z M0,20 C0,40 100,40 100,20 M0,40 C0,60 100,60 100,40 M0,60 C0,80 100,80 100,60',
                  'flow-manual-input': 'M0,30 L100,0 L100,100 L0,100 Z',

                  'ribbon-up': 'M20,0 L80,0 L80,80 L100,100 L50,80 L0,100 L20,80 Z',
                  'ribbon-down': 'M20,100 L80,100 L80,20 L100,0 L50,20 L0,0 L20,20 Z',
                };

                if (el.shapeType && PATHS[el.shapeType]) {
                  return <Path {...commonProps} data={PATHS[el.shapeType]} scaleX={w/100} scaleY={h/100} />;
                }

                if (el.shapeType?.startsWith('callout-')) {
                  const cp = el.controlPoints?.[0] || { x: w * 0.2, y: h + 20 };
                  
                  if (el.shapeType === 'callout-thought') {
                    const CLOUD_BODY = 'M25 60 A20 20 0 0 1 25 20 A20 20 0 0 1 45 30 A20 20 0 0 1 75 20 A20 20 0 0 1 95 40 A20 20 0 0 1 75 60 Z';
                    const dx = cp.x - w/2;
                    const dy = cp.y - h*0.8;
                    return (
                      <Group>
                        <Path {...commonProps} data={CLOUD_BODY} scaleX={w/100} scaleY={h/100} />
                        <Circle fill={commonProps.fill} stroke={commonProps.stroke} strokeWidth={commonProps.strokeWidth} x={w/2 + dx*0.3} y={h*0.8 + dy*0.3} radius={w*0.06} />
                        <Circle fill={commonProps.fill} stroke={commonProps.stroke} strokeWidth={commonProps.strokeWidth} x={w/2 + dx*0.65} y={h*0.8 + dy*0.65} radius={w*0.04} />
                        <Circle fill={commonProps.fill} stroke={commonProps.stroke} strokeWidth={commonProps.strokeWidth} x={cp.x} y={cp.y} radius={w*0.02} />
                      </Group>
                    );
                  }

                  let pathData = '';
                  const tailBaseL = w * 0.4;
                  const tailBaseR = w * 0.6;
                  
                  if (el.shapeType === 'callout-rect') {
                    pathData = `M0,0 L${w},0 L${w},${h} L${tailBaseR},${h} L${cp.x},${cp.y} L${tailBaseL},${h} L0,${h} Z`;
                  } else if (el.shapeType === 'callout-rounded') {
                    const r = Math.min(20, w/4, h/4);
                    pathData = `M${r},0 L${w-r},0 Q${w},0 ${w},${r} L${w},${h-r} Q${w},${h} ${w-r},${h} L${tailBaseR},${h} L${cp.x},${cp.y} L${tailBaseL},${h} L${r},${h} Q0,${h} 0,${h-r} L0,${r} Q0,0 ${r},0 Z`;
                  } else if (el.shapeType === 'callout-oval') {
                    pathData = `M0,${h/2} Q0,0 ${w/2},0 Q${w},0 ${w},${h/2} Q${w},${h} ${w/2},${h} L${tailBaseR},${h} L${cp.x},${cp.y} L${tailBaseL},${h} Q0,${h} 0,${h/2} Z`;
                  } else if (el.shapeType === 'callout-cloud') {
                    pathData = `M0,${h/2} A${w/4},${h/4} 0 0,1 ${w/4},${h/4} A${w/3},${h/3} 0 0,1 ${w*0.75},${h/4} A${w/4},${h/4} 0 0,1 ${w},${h/2} A${w/4},${h/4} 0 0,1 ${w*0.75},${h} L${tailBaseR},${h} L${cp.x},${cp.y} L${tailBaseL},${h} A${w/4},${h/4} 0 0,1 0,${h/2} Z`;
                  }
                  
                  return <Path {...commonProps} data={pathData} />;
                }

                if (el.shapeType === 'rect') return <Rect {...commonProps} />;
                if (el.shapeType === 'rect-rounded') return <Rect {...commonProps} cornerRadius={10} />;
                if (el.shapeType === 'circle') return <Circle {...commonProps} radius={w / 2} offsetX={-w / 2} offsetY={-h / 2} />;
                if (el.shapeType === 'triangle') return <RegularPolygon {...commonProps} sides={3} radius={w / 2} offsetX={-w / 2} offsetY={-h / 2} />;
                if (el.shapeType === 'diamond') return <RegularPolygon {...commonProps} sides={4} radius={w / 2} offsetX={-w / 2} offsetY={-h / 2} />;
                if (el.shapeType === 'pentagon') return <RegularPolygon {...commonProps} sides={5} radius={w / 2} offsetX={-w / 2} offsetY={-h / 2} />;
                if (el.shapeType === 'hexagon') return <RegularPolygon {...commonProps} sides={6} radius={w / 2} offsetX={-w / 2} offsetY={-h / 2} />;
                if (el.shapeType === 'heptagon') return <RegularPolygon {...commonProps} sides={7} radius={w / 2} offsetX={-w / 2} offsetY={-h / 2} />;
                if (el.shapeType === 'octagon') return <RegularPolygon {...commonProps} sides={8} radius={w / 2} offsetX={-w / 2} offsetY={-h / 2} />;
                if (el.shapeType === 'decagon') return <RegularPolygon {...commonProps} sides={10} radius={w / 2} offsetX={-w / 2} offsetY={-h / 2} />;
                if (el.shapeType === 'dodecagon') return <RegularPolygon {...commonProps} sides={12} radius={w / 2} offsetX={-w / 2} offsetY={-h / 2} />;

                if (el.shapeType && el.shapeType.startsWith('star')) {
                  const points = parseInt(el.shapeType.split('-')[1]) || 5;
                  const inner = points > 10 ? w/3 : w/4;
                  return <Star {...commonProps} numPoints={points} innerRadius={inner} outerRadius={w / 2} offsetX={-w / 2} offsetY={-h / 2} />;
                }

                if (el.shapeType === 'checkmark') return (
                  <Path {...commonProps} data="M10,50 L40,80 L90,20" fill="transparent" scaleX={w/100} scaleY={h/100} strokeWidth={el.strokeWidth || 8} />
                );

                // Lines & Arrows
                if (el.shapeType === 'line') return <Line {...commonProps} points={[0, h/2, w, h/2]} />;
                if (el.shapeType === 'arrow') return <Arrow {...commonProps} points={[0, h/2, w, h/2]} pointerLength={15} pointerWidth={15} />;
                if (el.shapeType === 'arrow-left') return <Arrow {...commonProps} points={[w, h/2, 0, h/2]} pointerLength={15} pointerWidth={15} />;
                if (el.shapeType === 'arrow-both') return <Arrow {...commonProps} points={[15, h/2, w-15, h/2]} pointerLength={15} pointerWidth={15} pointerAtBeginning={true} />;
                if (el.shapeType === 'arrow-up') return <Arrow {...commonProps} points={[w/2, h, w/2, 0]} pointerLength={15} pointerWidth={15} />;
                if (el.shapeType === 'arrow-down') return <Arrow {...commonProps} points={[w/2, 0, w/2, h]} pointerLength={15} pointerWidth={15} />;

                // Chart Axes
                if (el.shapeType === 'axis-xy') return (
                  <Group>
                    <Arrow {...commonProps} points={[0, h, w, h]} pointerLength={10} pointerWidth={10} />
                    <Arrow {...commonProps} points={[0, h, 0, 0]} pointerLength={10} pointerWidth={10} />
                  </Group>
                );
                if (el.shapeType === 'axis-x') return <Arrow {...commonProps} points={[0, h/2, w, h/2]} pointerLength={10} pointerWidth={10} />;

                if (el.shapeType === 'bracket') return (
                  <Group>
                    <Line {...commonProps} points={[w/4, 0, 0, 0, 0, h, w/4, h]} strokeWidth={4} fill="transparent" />
                    <Line {...commonProps} points={[3*w/4, 0, w, 0, w, h, 3*w/4, h]} strokeWidth={4} fill="transparent" />
                  </Group>
                );
                if (el.shapeType === 'curly') return (
                  <Group>
                    <KonvaText {...commonProps} text={'{'} fontSize={h} width={w/2} align="left" />
                    <KonvaText {...commonProps} x={w/2} text={'}'} fontSize={h} width={w/2} align="right" />
                  </Group>
                );

                return <Rect {...commonProps} />;
              };


              return (
                <Group
                  key={el.id}
                  id={'group-' + el.id}
                  x={el.x}
                  y={el.y}
                  rotation={el.rotation || 0}
                  opacity={el.opacity !== undefined ? el.opacity : 1}
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
                  onDblClick={() => onDoubleClickElement?.(el.id)}
                  onDblTap={() => onDoubleClickElement?.(el.id)}
                >
                  {renderShape()}
                  {selectedId === el.id && el.controlPoints && el.controlPoints.map((cp, idx) => (
                    <Circle
                      key={`cp-${idx}`}
                      x={cp.x}
                      y={cp.y}
                      radius={6}
                      fill="#FACC15"
                      stroke="#000000"
                      strokeWidth={2}
                      draggable
                      onDragStart={(e) => {
                        e.cancelBubble = true;
                      }}
                      onDragMove={(e) => {
                        e.cancelBubble = true;
                        const newCp = { x: e.target.x(), y: e.target.y() };
                        onUpdateElements(elements.map(item => {
                          if (item.id === el.id) {
                            const newControlPoints = [...(item.controlPoints || [])];
                            newControlPoints[idx] = newCp;
                            return { ...item, controlPoints: newControlPoints };
                          }
                          return item;
                        }));
                      }}
                      onDragEnd={(e) => {
                        e.cancelBubble = true;
                      }}
                      onMouseEnter={(e) => {
                        const container = e.target.getStage()?.container();
                        if (container) container.style.cursor = 'grab';
                      }}
                      onMouseLeave={(e) => {
                        const container = e.target.getStage()?.container();
                        if (container) container.style.cursor = 'default';
                      }}
                    />
                  ))}
                </Group>
              );
            }
            return null;
          })}
        </Layer>
        <Layer>
          {/* Temporary Drawing Layer for performance */}
          {isDrawing && tempPoints.length > 0 && (
            <Line
              points={tempPoints}
              stroke={tempType === 'eraser' ? '#ffffff' : brushSettings.color}
              strokeWidth={tempType === 'eraser' ? 30 : brushSettings.width}
              tension={0.5}
              lineCap="round"
              lineJoin="round"
              opacity={tempType === 'highlighter' ? brushSettings.opacity : 1}
              globalCompositeOperation={tempType === 'eraser' ? 'destination-out' : (tempType === 'highlighter' ? 'multiply' : 'source-over')}
            />
          )}

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
              onDblClick={() => onDoubleClickElement?.(el.id)}
              onDblTap={() => onDoubleClickElement?.(el.id)}
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
          {(selectedId && (activeTool === 'select' || activeTool === 'text')) && (
            <Transformer
              ref={transformerRef}
              padding={5}
              rotateEnabled={true}
              anchorFill="#4f46e5"
              anchorStroke="#fff"
              anchorCornerRadius={10}
              anchorSize={10}
              borderStroke="#4f46e5"
              borderStrokeWidth={1.5}
              borderDash={activeTool === 'text' ? [4, 4] : undefined}
              enabledAnchors={['top-left', 'top-right', 'bottom-left', 'bottom-right', 'middle-left', 'middle-right', 'top-center', 'bottom-center']}
              boundBoxFunc={(oldBox, newBox) => {
                if (newBox.width < 40 || newBox.height < 20) return oldBox;
                return newBox;
              }}
            />
          )}

        </Layer>

      </Stage>

      {/* HTML Overlay for Text Editing */}
      {editingTextId && elements.find(el => el.id === editingTextId) && (() => {
        const el = elements.find(el => el.id === editingTextId)!;
        const minW = Math.max(el.width || 250, 120);
        const minH = Math.max(el.height || 120, 60);
        return (
          <textarea
            value={editingValue}
            onChange={(e) => {
              setEditingValue(e.target.value);
              const ta = e.target as HTMLTextAreaElement;
              ta.style.height = 'auto';
              ta.style.height = Math.max(minH, ta.scrollHeight + 4) + 'px';
            }}
            onBlur={handleTextBlur}
            placeholder="Start typing..."
            dir={el.dir || 'ltr'}
            style={{
              position: 'absolute',
              top: el.y + 'px',
              left: el.x + 'px',
              width: minW + 'px',
              minHeight: minH + 'px',
              fontSize: (el.fontSize || 18) + 'px',
              fontFamily: el.fontFamily || 'Inter',
              fontStyle: el.fontStyle?.includes('italic') ? 'italic' : 'normal',
              fontWeight: el.fontStyle?.includes('bold') ? 'bold' : 'normal',
              textAlign: (el.align as any) || 'left',
              direction: (el.dir as any) || 'ltr',
              color: el.fill || '#0f172a',
              backgroundColor: (el.backgroundColor && el.backgroundColor !== 'transparent')
                ? el.backgroundColor
                : 'rgba(255,255,255,0.95)',
              border: '2px dashed #4f46e5',
              borderRadius: '4px',
              padding: '8px 10px',
              outline: 'none',
              resize: 'both',
              zIndex: 1000,
              lineHeight: 1.4,
              boxSizing: 'border-box',
              transform: `rotate(${el.rotation || 0}deg)`,
              transformOrigin: 'top left',
              overflow: 'hidden',
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

const NotebookImage = ({ el, activeTool, onSelect, onDoubleClick, onUpdate }: any) => {
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
          onDblClick={onDoubleClick}
          onDblTap={onDoubleClick}
        />
      )}
    </Group>
  );
};
