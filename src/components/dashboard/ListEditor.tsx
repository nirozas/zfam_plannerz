import React, { useState, useRef, useEffect } from 'react';
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';
import { useCardStore } from '../../store/cardStore';
import { Card } from '../../types/cards';
import {
    FileText,
    Circle as CircleIcon,
    MoveRight,
    Square,
    Trash,
    Edit2,
    Eye,
    Save,
    ChevronLeft,
    Globe,
    Palette,
    Share2,
    Info,
    Smile,
    Frown,
    Minus,
    Check,
    Star,
    MessageSquare
} from 'lucide-react';
import { Stage, Layer, Rect, Circle, Arrow, Transformer } from 'react-konva';

import { ShareModal, MetadataModal } from './CardModals';
import { BackgroundSettings } from './BackgroundSettings';

interface ListEditorProps {
    card: Card;
    onBack: () => void;
}

interface Shape {
    id: string;
    type: 'rect' | 'circle' | 'arrow';
    x: number;
    y: number;
    width: number;
    height: number;
    rotation: number;
    color: string;
}

const StageResponsive: React.FC<{
    shapes: Shape[];
    isEditing: boolean;
    activeTool: 'text' | 'shape';
    selectedId: string | null;
    selectShape: (id: string | null) => void;
    handleShapeChange: (id: string, newAttrs: any) => void;
    trRef: React.RefObject<any>;
    handleStageMouseDown: (e: any) => void;
}> = ({ shapes, isEditing, activeTool, selectedId, selectShape, handleShapeChange, trRef, handleStageMouseDown }) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const [size, setSize] = useState({ width: 0, height: 1000 });

    useEffect(() => {
        if (!containerRef.current) return;
        const updateSize = () => {
            if (containerRef.current) {
                setSize({
                    width: containerRef.current.offsetWidth,
                    height: Math.max(1000, containerRef.current.offsetHeight)
                });
            }
        };
        updateSize();
        window.addEventListener('resize', updateSize);
        return () => window.removeEventListener('resize', updateSize);
    }, []);

    return (
        <div ref={containerRef} className="w-full h-full">
            <Stage
                width={size.width}
                height={size.height}
                onMouseDown={handleStageMouseDown}
                scaleX={size.width < 800 ? size.width / 800 : 1}
                scaleY={size.width < 800 ? size.width / 800 : 1}
            >
                <Layer>
                    {shapes.map((shape) => (
                        <React.Fragment key={shape.id}>
                            {shape.type === 'rect' && (
                                <Rect
                                    id={shape.id} x={shape.x} y={shape.y} width={shape.width} height={shape.height}
                                    stroke={shape.color} strokeWidth={3} draggable={isEditing && activeTool === 'shape'}
                                    cornerRadius={4} onClick={() => selectShape(shape.id)}
                                    onDragEnd={(e) => handleShapeChange(shape.id, { x: e.target.x(), y: e.target.y() })}
                                    onTransformEnd={(e) => {
                                        const node = e.target;
                                        handleShapeChange(shape.id, {
                                            x: node.x(),
                                            y: node.y(),
                                            width: Math.max(5, node.width() * node.scaleX()),
                                            height: Math.max(5, node.height() * node.scaleY()),
                                            rotation: node.rotation()
                                        });
                                        node.scaleX(1);
                                        node.scaleY(1);
                                    }}
                                />
                            )}
                            {shape.type === 'circle' && (
                                <Circle
                                    id={shape.id} x={shape.x} y={shape.y} radius={shape.width / 2}
                                    stroke={shape.color} strokeWidth={3} draggable={isEditing && activeTool === 'shape'}
                                    onClick={() => selectShape(shape.id)}
                                    onDragEnd={(e) => handleShapeChange(shape.id, { x: e.target.x(), y: e.target.y() })}
                                    onTransformEnd={(e) => {
                                        const node = e.target;
                                        handleShapeChange(shape.id, {
                                            x: node.x(),
                                            y: node.y(),
                                            width: Math.max(5, node.width() * node.scaleX()),
                                            height: Math.max(5, node.height() * node.scaleY()),
                                            rotation: node.rotation()
                                        });
                                        node.scaleX(1);
                                        node.scaleY(1);
                                    }}
                                />
                            )}
                            {shape.type === 'arrow' && (
                                <Arrow
                                    id={shape.id} points={[0, 0, shape.width, shape.height]}
                                    x={shape.x} y={shape.y}
                                    stroke={shape.color} fill={shape.color} strokeWidth={3} draggable={isEditing && activeTool === 'shape'}
                                    onClick={() => selectShape(shape.id)}
                                    onDragEnd={(e) => handleShapeChange(shape.id, { x: e.target.x(), y: e.target.y() })}
                                    onTransformEnd={(e) => {
                                        const node = e.target;
                                        handleShapeChange(shape.id, {
                                            x: node.x(),
                                            y: node.y(),
                                            width: node.width() * node.scaleX(),
                                            height: node.height() * node.scaleY(),
                                            rotation: node.rotation()
                                        });
                                        node.scaleX(1);
                                        node.scaleY(1);
                                    }}
                                />
                            )}
                        </React.Fragment>
                    ))}
                    {selectedId && isEditing && activeTool === 'shape' && (
                        <Transformer
                            ref={trRef}
                            boundBoxFunc={(oldBox, newBox) => {
                                if (newBox.width < 5 || newBox.height < 5) return oldBox;
                                return newBox;
                            }}
                        />
                    )}
                </Layer>
            </Stage>
        </div>
    );
};

export const ListEditor: React.FC<ListEditorProps> = ({ card, onBack }) => {

    const { updateCard } = useCardStore();
    const [editorValue, setEditorValue] = useState(card.content || '');
    const [shapes, setShapes] = useState<Shape[]>(card.canvasData || []);
    const [notes, setNotes] = useState<{ id: string, text: string, createdAt: string, sentiment?: 'positive' | 'negative' | 'neutral' }[]>(card.notes || []);
    const [newNote, setNewNote] = useState('');
    const [newNoteSentiment, setNewNoteSentiment] = useState<'positive' | 'negative' | 'neutral'>('neutral');
    const [activeTool, setActiveTool] = useState<'text' | 'shape'>('text');
    const [selectedId, selectShape] = useState<string | null>(null);
    const [isEditingMetadata, setIsEditingMetadata] = useState(false);

    // Modal states
    const [isBackgroundSettingsOpen, setIsBackgroundSettingsOpen] = useState(false);
    const [showMetadata, setShowMetadata] = useState(false);
    const [showShare, setShowShare] = useState(false);

    // Meta-states for inline editing
    const [title, setTitle] = useState(card.title);
    const [description, setDescription] = useState(card.description || '');
    const [url, setUrl] = useState(card.url || '');
    const [hasBody, setHasBody] = useState(card.hasBody ?? true);
    const [rating, setRating] = useState(card.rating || 0);
    const [backgroundUrl, setBackgroundUrl] = useState(card.backgroundUrl || '');
    const [backgroundType, setBackgroundType] = useState<'color' | 'image'>(card.backgroundType || 'color');
    const [isEditing, setIsEditing] = useState(false);

    const trRef = useRef<any>(null);
    const editorRef = useRef<any>(null);

    const backgroundStyle = React.useMemo(() => {
        const bg = backgroundUrl;
        if (!bg) return {};
        const opacity = card.backgroundOpacity ?? 100;

        if (backgroundType === 'image') {
            return {
                backgroundImage: `linear-gradient(rgba(255, 255, 255, ${1 - opacity / 100}), rgba(255, 255, 255, ${1 - opacity / 100})), url(${bg})`,
                backgroundSize: 'cover',
                backgroundPosition: 'center',
                backgroundAttachment: 'fixed'
            };
        }

        const hexOpacity = Math.round((opacity / 100) * 255).toString(16).padStart(2, '0');
        const colorWithAlpha = bg.startsWith('#') ? `${bg}${hexOpacity}` : bg;
        return { backgroundColor: colorWithAlpha };
    }, [backgroundUrl, backgroundType, card.backgroundOpacity]);

    const handleSave = () => {
        updateCard(card.id, {
            title,
            description,
            url,
            hasBody,
            content: editorValue,
            notes,
            canvasData: shapes,
            rating,
            backgroundUrl,
            backgroundType,
            lastViewedAt: new Date().toISOString()
        });
        setIsEditingMetadata(false);
        setIsEditing(false);
    };

    const handleBackgroundSave = (type: 'color' | 'image', value: string, opacity: number) => {
        setBackgroundType(type);
        setBackgroundUrl(value);
        updateCard(card.id, { backgroundType: type, backgroundUrl: value, backgroundOpacity: opacity });
        setIsBackgroundSettingsOpen(false);
    };

    const addShape = (type: 'rect' | 'circle' | 'arrow') => {
        const newShape: Shape = {
            id: crypto.randomUUID(),
            type,
            x: 150,
            y: 150,
            width: 100,
            height: 100,
            rotation: 0,
            color: '#6366f1'
        };
        setShapes([...shapes, newShape]);
        selectShape(newShape.id);
        setActiveTool('shape');
    };

    const deleteSelectedShape = () => {
        if (selectedId) {
            setShapes(shapes.filter(s => s.id !== selectedId));
            selectShape(null);
        }
    };

    const handleShapeChange = (id: string, newAttrs: any) => {
        setShapes(shapes.map(s => s.id === id ? { ...s, ...newAttrs } : s));
    };

    const addNote = () => {
        if (!newNote.trim()) return;
        const note = {
            id: crypto.randomUUID(),
            text: newNote,
            sentiment: newNoteSentiment,
            createdAt: new Date().toISOString()
        };
        const updatedNotes = [...notes, note];
        setNotes(updatedNotes);
        setNewNote('');
        setNewNoteSentiment('neutral');

        // Auto-save notes
        updateCard(card.id, { notes: updatedNotes });
    };

    const deleteNote = (id: string) => {
        const updatedNotes = notes.filter(n => n.id !== id);
        setNotes(updatedNotes);
        updateCard(card.id, { notes: updatedNotes });
    };

    const modules = {
        toolbar: [
            [{ 'header': [1, 2, 3, false] }],
            ['bold', 'italic', 'underline', 'strike'],
            [{ 'list': 'ordered' }, { 'list': 'bullet' }],
            ['link', 'image'],
            ['clean']
        ],
    };

    const handleStageMouseDown = (e: any) => {
        if (e.target === e.target.getStage()) {
            selectShape(null);
            return;
        }
    };

    return (
        <div className="flex flex-col h-full overflow-hidden transition-all duration-500" style={backgroundStyle}>
            {/* Toolbar / Header */}
            <div className={`flex flex-col border-b border-slate-200 z-30 transition-all ${backgroundStyle.backgroundImage ? 'bg-white/80 backdrop-blur-md' : 'bg-white'}`}>
                <div className="flex items-center justify-between px-4 md:px-6 py-2 md:py-3">
                    <div className="flex items-center gap-2 md:gap-4">
                        <button
                            onClick={() => {
                                if (isEditing) handleSave();
                                onBack();
                            }}
                            className="p-1.5 md:p-2 hover:bg-slate-100 rounded-full transition-colors text-slate-500"
                        >
                            <ChevronLeft size={20} className="md:size-6" />
                        </button>
                        <div className="flex flex-col min-w-0">
                            {isEditingMetadata ? (
                                <input
                                    type="text"
                                    value={title}
                                    onChange={(e) => setTitle(e.target.value)}
                                    className="text-xs md:text-sm font-bold text-slate-800 leading-tight border-b border-indigo-500 outline-none bg-transparent max-w-[120px] md:max-w-none"
                                    autoFocus
                                />
                            ) : (
                                <h1 className="text-xs md:text-sm font-bold text-slate-800 leading-tight truncate max-w-[150px] md:max-w-none">{title}</h1>
                            )}
                            <div className="flex items-center gap-2 md:gap-3">
                                <p className="hidden md:block text-[9px] text-slate-400 font-bold uppercase tracking-widest whitespace-nowrap">Workspace</p>
                                {url && (
                                    <a href={url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-[9px] md:text-[10px] text-indigo-500 hover:underline font-bold whitespace-nowrap">
                                        <Globe size={10} /> <span className="hidden xs:inline">Visit Link</span>
                                    </a>
                                )}
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center gap-1.5 md:gap-3">
                        <div className="hidden sm:flex items-center gap-1">
                            <button
                                onClick={() => setIsBackgroundSettingsOpen(true)}
                                className="p-1.5 md:p-2 text-slate-500 hover:text-indigo-600 hover:bg-white rounded-xl transition-all"
                                title="Page Background"
                            >
                                <Palette size={18} className="md:size-5" />
                            </button>
                            <button
                                onClick={() => setShowShare(true)}
                                className="p-1.5 md:p-2 text-slate-500 hover:text-indigo-600 hover:bg-white rounded-xl transition-all"
                                title="Share Entry"
                            >
                                <Share2 size={18} className="md:size-5" />
                            </button>
                            <button
                                onClick={() => setShowMetadata(true)}
                                className="p-1.5 md:p-2 text-slate-500 hover:text-indigo-600 hover:bg-white rounded-xl transition-all"
                                title="Entry Metadata"
                            >
                                <Info size={18} className="md:size-5" />
                            </button>
                        </div>

                        <div className="hidden sm:block h-6 w-px bg-slate-200 mx-1" />

                        <button
                            onClick={() => {
                                if (isEditing) handleSave();
                                setIsEditing(!isEditing);
                            }}
                            className={`flex items-center gap-2 px-2.5 md:px-4 py-1.5 md:py-2 rounded-xl border-2 transition-all ${isEditing ? 'bg-indigo-50 border-indigo-200 text-indigo-700' : 'bg-white border-slate-100 text-slate-500 hover:border-slate-300'}`}
                        >
                            {isEditing ? <Eye size={16} className="md:size-[18px]" /> : <Edit2 size={16} className="md:size-[18px]" />}
                            <span className="hidden md:inline text-[10px] md:text-xs font-bold uppercase tracking-wider">{isEditing ? 'View Mode' : 'Edit Mode'}</span>
                        </button>

                        <button
                            onClick={handleSave}
                            className="flex items-center gap-2 bg-indigo-600 text-white px-3 md:px-5 py-1.5 md:py-2 rounded-xl hover:bg-indigo-700 transition-all font-bold text-xs md:text-sm shadow-lg shadow-indigo-100"
                        >
                            <Save size={16} className="md:size-[18px]" />
                            <span className="hidden md:inline">Save</span>
                        </button>
                    </div>
                </div>
            </div>

            {/* Layout Wrapper: Responsive Columns */}
            <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
                {/* Main Content (Scrollable) */}
                <main className="flex-1 lg:flex-[3] overflow-y-auto p-4 md:p-8 space-y-6 md:space-y-8 scrollbar-thin scrollbar-thumb-slate-200">
                    {/* Header Card */}
                    <div className="max-w-full mx-auto w-full bg-white/70 backdrop-blur-md rounded-2xl md:rounded-3xl p-5 md:p-8 shadow-xl shadow-slate-200/50 border border-white/50 space-y-4 md:space-y-6">
                        <div className="flex items-start justify-between">
                            <div className="space-y-4 flex-1">
                                <div className="flex items-center gap-3 md:gap-4">
                                    <div className="p-2 md:p-3 bg-emerald-50 text-emerald-600 rounded-xl md:rounded-2xl">
                                        <FileText size={20} className="md:size-7" />
                                    </div>
                                    <div className="flex flex-col">
                                        <h2 className="text-xl md:text-3xl font-black text-slate-800 tracking-tight leading-tight">{title}</h2>
                                        <div className="flex items-center gap-1 mt-1.5 md:mt-2">
                                            {[1, 2, 3, 4, 5].map((s) => (
                                                <button
                                                    key={s}
                                                    onClick={() => isEditing && setRating(s)}
                                                    className={`transition-all ${rating >= s ? 'text-amber-500' : 'text-slate-200'} ${isEditing ? 'cursor-pointer hover:scale-110' : 'cursor-default'}`}
                                                >
                                                    <Star size={16} className="md:size-5" fill={rating >= s ? 'currentColor' : 'none'} />
                                                </button>
                                            ))}
                                            {rating > 0 && <span className="text-[10px] md:text-xs font-bold text-amber-600 ml-2 py-0.5 px-2 bg-amber-50 rounded-full">{rating}/5.0</span>}
                                        </div>
                                    </div>
                                </div>

                                {isEditingMetadata ? (
                                    <textarea
                                        value={description}
                                        onChange={(e) => setDescription(e.target.value)}
                                        placeholder="Add a detailed description..."
                                        className="w-full p-3 md:p-4 bg-slate-50 rounded-xl md:rounded-2xl border border-slate-100 text-sm focus:ring-2 focus:ring-indigo-500 outline-none resize-none font-medium h-24"
                                    />
                                ) : (
                                    description && <p className="text-slate-600 leading-relaxed font-medium text-base md:text-lg px-2 border-l-4 border-indigo-200">{description}</p>
                                )}

                                <div className="flex flex-col sm:flex-row items-stretch sm:items-end gap-4 md:gap-6 pt-4 border-t border-slate-100">
                                    <div className="flex-1 space-y-1">
                                        <label className="text-[9px] font-black uppercase text-slate-400 px-1">Source Link</label>
                                        <div className="relative">
                                            <Globe size={12} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                                            <input
                                                type="text"
                                                value={url}
                                                onChange={(e) => setUrl(e.target.value)}
                                                placeholder="https://..."
                                                className="w-full pl-8 pr-3 py-2 bg-white rounded-xl border border-slate-100 text-[10px] font-bold focus:ring-2 focus:ring-indigo-500 outline-none"
                                            />
                                        </div>
                                    </div>

                                    <button
                                        onClick={() => setHasBody(!hasBody)}
                                        className={`flex items-center justify-between sm:justify-start gap-3 px-4 py-2 rounded-xl border transition-all h-[34px] ${hasBody ? 'bg-indigo-50 border-indigo-100 text-indigo-700' : 'bg-white border-slate-100 text-slate-400'}`}
                                    >
                                        <span className="text-[10px] font-black uppercase">Enable Writing Mode</span>
                                        <div className={`w-8 h-4 rounded-full relative transition-colors ${hasBody ? 'bg-indigo-500' : 'bg-slate-200'}`}>
                                            <div className={`absolute top-1 w-2 h-2 bg-white rounded-full transition-all ${hasBody ? 'left-5' : 'left-1'}`} />
                                        </div>
                                    </button>
                                </div>
                            </div>

                            <button
                                onClick={() => setIsEditingMetadata(!isEditingMetadata)}
                                className={`p-2 md:p-3 rounded-xl md:rounded-2xl transition-all shadow-sm ${isEditingMetadata ? 'bg-indigo-600 text-white' : 'bg-white border border-slate-100 text-slate-400 hover:text-indigo-600'} ml-2`}
                            >
                                <Edit2 size={18} className="md:size-5" />
                            </button>
                        </div>
                    </div>

                    {/* Editor Content Area */}
                    {hasBody && (isEditing || editorValue) && (
                        <div className="max-w-full mx-auto w-full relative">
                            {isEditing && activeTool === 'shape' && (
                                <div className="absolute -left-4 md:-left-16 top-0 flex lg:flex-col gap-2 bg-white p-2 rounded-xl md:rounded-2xl shadow-xl border border-slate-100 z-40">
                                    <button onClick={() => addShape('rect')} className="p-2 md:p-3 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg md:rounded-xl transition-all"><Square size={18} className="md:size-5" /></button>
                                    <button onClick={() => addShape('circle')} className="p-2 md:p-3 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg md:rounded-xl transition-all"><CircleIcon size={18} className="md:size-5" /></button>
                                    <button onClick={() => addShape('arrow')} className="p-2 md:p-3 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg md:rounded-xl transition-all"><MoveRight size={18} className="md:size-5" /></button>
                                    {selectedId && (
                                        <button onClick={deleteSelectedShape} className="p-2 md:p-3 text-red-500 hover:bg-red-50 rounded-lg md:rounded-xl transition-all"><Trash size={18} className="md:size-5" /></button>
                                    )}
                                </div>
                            )}

                            <div className={`bg-white min-h-[500px] md:min-h-[600px] shadow-2xl shadow-slate-200/50 rounded-[24px] md:rounded-[32px] p-6 md:p-14 relative border ${isEditing ? 'border-indigo-400 ring-4 md:ring-8 ring-indigo-50' : 'border-slate-100'} overflow-hidden`}>
                                <div className={`absolute inset-0 z-20 ${activeTool === 'text' || !isEditing ? 'pointer-events-none' : 'pointer-events-auto'}`}>
                                    <StageResponsive shapes={shapes} isEditing={isEditing} activeTool={activeTool} selectedId={selectedId} selectShape={selectShape} handleShapeChange={handleShapeChange} trRef={trRef} handleStageMouseDown={handleStageMouseDown} />
                                </div>

                                <div className={`${!isEditing ? 'read-only-quill' : ''}`}>
                                    <ReactQuill
                                        theme="snow"
                                        value={editorValue}
                                        onChange={setEditorValue}
                                        modules={modules}
                                        className="custom-quill"
                                        ref={editorRef}
                                        readOnly={!isEditing}
                                        placeholder={isEditing ? "Begin documenting your thoughts..." : ""}
                                    />
                                </div>
                            </div>
                        </div>
                    )}
                </main>

                {/* Right Column: Sidebar (Collapsible on mobile) */}
                <aside className="lg:flex-1 lg:max-w-xs xl:max-w-sm border-t lg:border-t-0 lg:border-l border-slate-200 bg-white/40 backdrop-blur-xl flex flex-col z-20 pb-20 lg:pb-0 overflow-y-auto">
                    <div className="p-4 md:p-6 space-y-6 md:space-y-8 scrollbar-thin">
                        {/* Professional Notes Section */}
                        <div className="space-y-4">
                            <div className="flex items-center justify-between mb-2 px-1">
                                <div className="flex items-center gap-2">
                                    <MessageSquare size={14} className="text-indigo-500 md:size-4" />
                                    <h3 className="text-[9px] md:text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Activity Log</h3>
                                </div>
                                <span className="text-[8px] md:text-[9px] font-black px-1.5 md:px-2 py-0.5 bg-indigo-50 text-indigo-600 rounded-full">{notes.length}</span>
                            </div>

                            {/* Add Note Card */}
                            <div className={`relative rounded-2xl md:rounded-3xl overflow-hidden shadow-xl border-l-[3px] md:border-l-[6px] transition-all duration-500 ${newNoteSentiment === 'positive' ? 'bg-emerald-50/50 border-emerald-500 shadow-emerald-100' :
                                newNoteSentiment === 'negative' ? 'bg-rose-50/50 border-rose-500 shadow-rose-100' :
                                    'bg-indigo-50/50 border-indigo-500 shadow-indigo-100'
                                }`}>
                                <div className="flex">
                                    {/* Vertical Sentiment Selector */}
                                    <div className="w-10 md:w-14 shrink-0 flex flex-col items-center justify-center gap-2 md:gap-4 py-3 md:py-4 bg-white/40 backdrop-blur-sm border-r border-white/40">
                                        <button
                                            onClick={() => setNewNoteSentiment('positive')}
                                            className={`p-1 md:p-2 rounded-full transition-all duration-300 ${newNoteSentiment === 'positive' ? 'bg-emerald-500 text-white scale-110 md:scale-125 shadow-lg' : 'text-slate-300 hover:text-emerald-400'}`}
                                        >
                                            <Smile size={16} className="md:size-5" strokeWidth={2.5} />
                                        </button>
                                        <button
                                            onClick={() => setNewNoteSentiment('neutral')}
                                            className={`p-1 md:p-2 rounded-full transition-all duration-300 ${newNoteSentiment === 'neutral' ? 'bg-indigo-500 text-white scale-110 md:scale-125 shadow-lg' : 'text-slate-300 hover:text-indigo-400'}`}
                                        >
                                            <Minus size={16} className="md:size-5" strokeWidth={2.5} />
                                        </button>
                                        <button
                                            onClick={() => setNewNoteSentiment('negative')}
                                            className={`p-1 md:p-2 rounded-full transition-all duration-300 ${newNoteSentiment === 'negative' ? 'bg-rose-500 text-white scale-110 md:scale-125 shadow-lg' : 'text-slate-300 hover:text-rose-400'}`}
                                        >
                                            <Frown size={16} className="md:size-5" strokeWidth={2.5} />
                                        </button>
                                    </div>

                                    {/* Text Area */}
                                    <div className="flex-1 p-3 md:p-5 space-y-2 md:space-y-4">
                                        <textarea
                                            value={newNote}
                                            onChange={(e) => setNewNote(e.target.value)}
                                            placeholder={
                                                newNoteSentiment === 'positive' ? "What went well?" :
                                                    newNoteSentiment === 'negative' ? "What needs attention?" :
                                                        "Add an update..."
                                            }
                                            className="w-full bg-transparent text-[11px] md:text-sm font-bold outline-none resize-none placeholder:text-slate-400 min-h-[50px] md:min-h-[80px]"
                                        />
                                        <div className="flex items-center justify-end">
                                            <button
                                                onClick={addNote}
                                                disabled={!newNote.trim()}
                                                className={`flex items-center gap-2 py-1.5 md:py-2 px-3 md:px-5 rounded-lg md:rounded-2xl font-black text-[8px] md:text-[10px] uppercase tracking-widest transition-all shadow-lg active:scale-95 disabled:opacity-30 ${newNoteSentiment === 'positive' ? 'bg-emerald-500 text-white shadow-emerald-200' :
                                                    newNoteSentiment === 'negative' ? 'bg-rose-500 text-white shadow-rose-200' :
                                                        'bg-indigo-600 text-white shadow-indigo-200'
                                                    }`}
                                            >
                                                Log
                                                <Check size={10} className="md:size-3.5" strokeWidth={3} />
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-3">
                                {notes.map((note) => (
                                    <div key={note.id} className="relative group transition-all duration-300 active:scale-[0.98]">
                                        <div className={`overflow-hidden rounded-xl md:rounded-3xl border border-slate-100 bg-white shadow-sm hover:shadow-md transition-all duration-300 flex ${note.sentiment === 'positive' ? 'hover:border-emerald-200' :
                                            note.sentiment === 'negative' ? 'hover:border-rose-200' :
                                                'hover:border-indigo-200'
                                            }`}>
                                            <div className={`w-1 shrink-0 ${note.sentiment === 'positive' ? 'bg-emerald-500' :
                                                note.sentiment === 'negative' ? 'bg-rose-500' :
                                                    'bg-indigo-500'
                                                }`} />

                                            <div className="flex-1 p-3 md:p-4 flex gap-2 md:gap-4">
                                                <div className={`shrink-0 w-7 h-7 md:w-10 md:h-10 rounded-lg md:rounded-2xl flex items-center justify-center ${note.sentiment === 'positive' ? 'bg-emerald-50 text-emerald-600' :
                                                    note.sentiment === 'negative' ? 'bg-rose-50 text-rose-600' :
                                                        'bg-indigo-50 text-indigo-600'
                                                    }`}>
                                                    {note.sentiment === 'positive' ? <Smile size={16} className="md:size-5" strokeWidth={2.5} /> :
                                                        note.sentiment === 'negative' ? <Frown size={16} className="md:size-5" strokeWidth={2.5} /> :
                                                            <Minus size={16} className="md:size-5" strokeWidth={2.5} />}
                                                </div>

                                                <div className="flex-1 min-w-0 space-y-1 md:space-y-2">
                                                    <p className="text-[10px] md:text-sm text-slate-700 font-bold leading-relaxed break-words">{note.text}</p>
                                                    <div className="flex items-center justify-between border-t border-slate-50 pt-1.5 md:pt-2">
                                                        <span className="text-[8px] md:text-[9px] text-slate-400 font-black uppercase tracking-widest">{new Date(note.createdAt).toLocaleDateString()}</span>
                                                        <button
                                                            onClick={() => deleteNote(note.id)}
                                                            className="p-1 md:p-1.5 bg-rose-50 text-rose-400 hover:text-rose-600 hover:bg-rose-100 rounded-lg transition-all"
                                                        >
                                                            <Trash size={10} className="md:size-3" strokeWidth={2.5} />
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Sidebar Footer Details (Hidden on mobile) */}
                        <div className="hidden lg:block pt-6 border-t border-slate-200 space-y-4">
                            <div className="flex items-center justify-between text-[10px] font-black uppercase tracking-widest text-slate-400 px-1">
                                <span>Settings & Metadata</span>
                                <Info size={12} />
                            </div>
                            <div className="space-y-3">
                                <div className="flex items-center justify-between p-3 bg-white rounded-xl border border-slate-100 shadow-sm">
                                    <span className="text-[10px] font-bold text-slate-400">Created</span>
                                    <span className="text-[10px] font-black text-slate-700 tracking-tight">{new Date(card.createdAt).toLocaleDateString()}</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </aside>
            </div>


            {isBackgroundSettingsOpen && (
                <BackgroundSettings
                    currentUrl={backgroundUrl}
                    currentType={backgroundType}
                    currentOpacity={card.backgroundOpacity ?? 100}
                    onSave={handleBackgroundSave}
                    onReset={() => handleBackgroundSave('color', '#f8fafc', 100)}
                    onClose={() => setIsBackgroundSettingsOpen(false)}
                />
            )}

            {showMetadata && (
                <MetadataModal
                    card={card}
                    onClose={() => setShowMetadata(false)}
                />
            )}

            {showShare && (
                <ShareModal
                    card={card}
                    onClose={() => setShowShare(false)}
                    onShare={(email) => {
                        alert(`Sharing invitation sent to: ${email}`);
                        setShowShare(false);
                    }}
                />
            )}

            <style>{`
                .custom-quill .ql-toolbar.ql-snow {
                    border: none;
                    border-bottom: 1px solid #f1f5f9;
                    padding: 8px 0;
                    margin-bottom: 16px;
                }
                .custom-quill .ql-container.ql-snow {
                    border: none;
                }
                .custom-quill .ql-editor {
                    padding: 0;
                    font-size: 1.1rem;
                    line-height: 1.7;
                    color: #334155;
                    min-height: 500px;
                }
                .custom-quill .ql-editor.ql-blank::before {
                    left: 0;
                }
                .read-only-quill .ql-toolbar {
                    display: none;
                }
            `}</style>
        </div>
    );
};
