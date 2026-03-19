import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Subtask } from '../../store/taskStore';
import {
    Plus, X, Circle, CheckCircle, Image as ImageIcon, Link as LinkIcon,
    CalendarDays, Clock, MessageSquare
} from 'lucide-react';

interface SubtaskListProps {
    subtasks: Subtask[];
    onChange: (subtasks: Subtask[]) => void;
    readOnly?: boolean;
    dateContext?: string;
    isRecurring?: boolean;
}

// Helper: merge legacy imageUrl into imageUrls array
const getImages = (s: Subtask): string[] => {
    const urls = s.imageUrls ? [...s.imageUrls] : [];
    if (s.imageUrl && !urls.includes(s.imageUrl)) urls.unshift(s.imageUrl);
    return urls;
};

const SubtaskList: React.FC<SubtaskListProps> = ({ subtasks, onChange, readOnly = false, dateContext, isRecurring = false }) => {
    const [newTitle, setNewTitle] = useState('');
    const [editingTitleId, setEditingTitleId] = useState<string | null>(null);
    const [editingTitleValue, setEditingTitleValue] = useState('');
    const [editingImageUrlId, setEditingImageUrlId] = useState<string | null>(null);
    const [editingTimingId, setEditingTimingId] = useState<string | null>(null);
    const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
    const [urlInput, setUrlInput] = useState('');
    const [zoom, setZoom] = useState<number>(() => {
        const saved = localStorage.getItem('subtask-zoom');
        return saved ? parseFloat(saved) : 1;
    });
    const zoomRef = useRef(zoom);
    const gridWrapperRef = useRef<HTMLDivElement>(null);

    // Touch pinch tracking
    const lastTouchDist = useRef<number | null>(null);

    const clampZoom = (v: number) => Math.min(2, Math.max(0.4, v));

    const applyZoom = useCallback((val: number) => {
        const clamped = clampZoom(val);
        zoomRef.current = clamped;
        setZoom(clamped);
        localStorage.setItem('subtask-zoom', clamped.toString());
    }, []);

    // Ctrl + wheel → zoom (trackpad pinch sends ctrlKey wheel events)
    useEffect(() => {
        const el = gridWrapperRef.current;
        if (!el) return;
        const onWheel = (e: WheelEvent) => {
            if (!e.ctrlKey && !e.metaKey) return;
            e.preventDefault();
            e.stopPropagation();
            const delta = e.deltaY * -0.005;
            applyZoom(zoomRef.current + delta);
        };
        el.addEventListener('wheel', onWheel, { passive: false });
        return () => el.removeEventListener('wheel', onWheel);
    }, [applyZoom]);

    // Touch pinch → zoom
    const getTouchDist = (e: React.TouchEvent) => {
        const [t1, t2] = [e.touches[0], e.touches[1]];
        const dx = t1.clientX - t2.clientX;
        const dy = t1.clientY - t2.clientY;
        return Math.hypot(dx, dy);
    };

    const handleTouchStart = (e: React.TouchEvent) => {
        if (e.touches.length === 2) {
            lastTouchDist.current = getTouchDist(e);
        }
    };

    const handleTouchMove = (e: React.TouchEvent) => {
        if (e.touches.length !== 2 || lastTouchDist.current === null) return;
        e.preventDefault();
        const newDist = getTouchDist(e);
        const ratio = newDist / lastTouchDist.current;
        applyZoom(zoomRef.current * ratio);
        lastTouchDist.current = newDist;
    };

    const handleTouchEnd = () => { lastTouchDist.current = null; };

    const handleTitleEdit = (id: string, currentTitle: string) => {
        setEditingTitleId(id);
        setEditingTitleValue(currentTitle);
        setEditingImageUrlId(null);
        setEditingTimingId(null);
        setEditingNoteId(null);
    };

    const handleTitleSave = (id: string) => {
        if (editingTitleValue.trim()) {
            onChange(subtasks.map(s => s.id === id ? { ...s, title: editingTitleValue.trim() } : s));
        }
        setEditingTitleId(null);
    };

    const handleAdd = (e: React.FormEvent) => {
        e.preventDefault();
        if (!newTitle.trim()) return;
        const newSubtask: Subtask = {
            id: crypto.randomUUID(),
            title: newTitle.trim(),
            isCompleted: false,
            imageUrls: [],
            createdAt: new Date().toISOString()
        };
        onChange([...subtasks, newSubtask]);
        setNewTitle('');
    };

    const handleToggle = (id: string) => {
        onChange(subtasks.map(s => {
            if (s.id === id) {
                if (isRecurring && dateContext) {
                    const cd = s.completedDates || [];
                    const isCompletedOnDate = cd.includes(dateContext);
                    const now = new Date().toISOString();
                    const newTimes = { ...(s.completedDateTimes || {}) };
                    if (isCompletedOnDate) {
                        delete newTimes[dateContext];
                    } else {
                        newTimes[dateContext] = now;
                    }

                    return {
                        ...s,
                        completedDates: isCompletedOnDate ? cd.filter(d => d !== dateContext) : [...cd, dateContext],
                        completedDateTimes: newTimes
                    };
                } else {
                    const isCompleted = !s.isCompleted;
                    return { ...s, isCompleted, completedAt: isCompleted ? new Date().toISOString() : undefined };
                }
            }
            return s;
        }));
    };

    const handleDelete = (id: string) => {
        if (readOnly) return;
        onChange(subtasks.filter(s => s.id !== id));
    };

    const handleImageUrlAdd = (id: string) => {
        if (!urlInput.trim()) return;
        onChange(subtasks.map(s => s.id === id ? {
            ...s,
            imageUrls: [...(s.imageUrls || []), urlInput.trim()]
        } : s));
        setEditingImageUrlId(null);
        setUrlInput('');
    };

    const handleImageUpload = (id: string, file: File) => {
        const reader = new FileReader();
        reader.onloadend = () => {
            onChange(subtasks.map(s => s.id === id ? {
                ...s,
                imageUrls: [...(s.imageUrls || []), reader.result as string]
            } : s));
        };
        reader.readAsDataURL(file);
    };

    const handleRemoveImage = (id: string, imgIndex: number) => {
        onChange(subtasks.map(s => {
            if (s.id !== id) return s;
            const imgs = getImages(s);
            imgs.splice(imgIndex, 1);
            return { ...s, imageUrls: imgs, imageUrl: undefined };
        }));
    };

    const handleNoteChange = (id: string, note: string) => {
        onChange(subtasks.map(s => s.id === id ? { ...s, note } : s));
    };

    const isMobile = typeof window !== 'undefined' && window.innerWidth < 640;

    return (
        <div className="subtask-list">
            {/* Toolbar: Add form + zoom hint badge */}
            <div className="flex items-center gap-2 mb-4">
                {!readOnly && (
                    <form onSubmit={handleAdd} className="flex items-center gap-2 flex-1 bg-white/50 p-2 rounded-xl border border-gray-100 shadow-sm">
                        <Plus size={16} className="text-indigo-500 shrink-0" />
                        <input
                            type="text"
                            value={newTitle}
                            onChange={e => setNewTitle(e.target.value)}
                            placeholder="Add a subtask..."
                            className="flex-1 text-sm bg-transparent border-none focus:outline-none placeholder-gray-400 font-bold"
                        />
                        <button type="submit" className="shrink-0 bg-indigo-600 text-white px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest hover:bg-indigo-700 transition-all">
                            Add
                        </button>
                    </form>
                )}
                {/* Zoom indicator — double-click to reset */}
                <button
                    type="button"
                    onDoubleClick={() => applyZoom(1)}
                    title="Pinch or Ctrl+scroll to zoom · Double-click to reset"
                    className="flex-shrink-0 flex items-center gap-1.5 bg-white border border-gray-100 rounded-xl px-3 py-2 shadow-sm text-[10px] font-black text-gray-400 hover:text-indigo-500 hover:border-indigo-200 transition-all select-none"
                >
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /><line x1="11" y1="8" x2="11" y2="14" /><line x1="8" y1="11" x2="14" y2="11" /></svg>
                    {Math.round(zoom * 100)}%
                </button>
            </div>

            {/* Pinch-to-zoom wrapper — handles Ctrl+wheel (trackpad) and touch pinch */}
            <div
                ref={gridWrapperRef}
                onTouchStart={handleTouchStart}
                onTouchMove={handleTouchMove}
                onTouchEnd={handleTouchEnd}
                style={{ touchAction: 'pan-y' }}
            >
                {/* Responsive auto-grid — scaled via transform for reliability */}
                <div
                    className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 transition-transform duration-200"
                    style={{
                        transform: `scale(${zoom})`,
                        transformOrigin: 'top left',
                        width: `${(1 / zoom) * 100}%`,
                        marginBottom: `${(zoom - 1) * 100}%`, // Compensate for visual scale to prevent overlap below
                    }}
                >
                    {subtasks.map(subtask => {
                        const images = getImages(subtask);
                        const isEditingNote = editingNoteId === subtask.id;
                        const isSubtaskCompleted = isRecurring && dateContext
                            ? (subtask.completedDates || []).includes(dateContext)
                            : subtask.isCompleted;

                        return (
                            <div
                                key={subtask.id}
                                className="group flex flex-col gap-2 bg-white/60 p-3 rounded-xl border border-gray-100 shadow-sm hover:shadow-md transition-all hover:border-indigo-100"
                            >
                                {/* Top row: checkbox + title + action buttons */}
                                <div className="flex items-start gap-2">
                                    <button
                                        type="button"
                                        onClick={() => handleToggle(subtask.id)}
                                        className={`flex-shrink-0 transition-all mt-0.5 ${isSubtaskCompleted ? 'text-indigo-600 scale-110' : 'text-gray-300 hover:text-indigo-400 hover:scale-110'}`}
                                    >
                                        {isSubtaskCompleted
                                            ? <CheckCircle size={isMobile ? 18 : 20} />
                                            : <Circle size={isMobile ? 18 : 20} />
                                        }
                                    </button>
                                    {/* Title — clickable to edit when not readOnly */}
                                    {!readOnly && editingTitleId === subtask.id ? (
                                        <input
                                            type="text"
                                            autoFocus
                                            value={editingTitleValue}
                                            onChange={e => setEditingTitleValue(e.target.value)}
                                            onBlur={() => handleTitleSave(subtask.id)}
                                            onKeyDown={e => {
                                                if (e.key === 'Enter') handleTitleSave(subtask.id);
                                                if (e.key === 'Escape') setEditingTitleId(null);
                                            }}
                                            className="flex-1 bg-indigo-50 border border-indigo-200 rounded-lg px-2 py-0.5 text-sm font-semibold text-gray-800 focus:outline-none focus:ring-2 focus:ring-indigo-300"
                                        />
                                    ) : (
                                        <span
                                            className={`flex-1 break-words leading-tight pt-0.5 font-semibold text-[13px] md:text-sm transition-all ${isSubtaskCompleted ? 'text-gray-400 line-through opacity-50' : 'text-gray-700'} ${!readOnly ? 'cursor-pointer hover:text-indigo-600' : ''}`}
                                            onClick={() => !readOnly && handleTitleEdit(subtask.id, subtask.title)}
                                            title={readOnly ? undefined : 'Click to edit'}
                                        >
                                            {subtask.title}
                                        </span>
                                    )}

                                    {!readOnly && (
                                        <div className={`flex items-center gap-1 transition-opacity ${isMobile ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}>
                                            {/* Upload image */}
                                            <label className="cursor-pointer text-gray-400 hover:text-indigo-500 p-1.5 rounded-lg hover:bg-indigo-50 transition-all" title="Upload Image">
                                                <ImageIcon size={13} />
                                                <input type="file" className="hidden" accept="image/*" multiple onChange={(e) => {
                                                    if (!e.target.files) return;
                                                    Array.from(e.target.files).forEach(f => handleImageUpload(subtask.id, f));
                                                }} />
                                            </label>
                                            {/* URL */}
                                            <button type="button" title="Add Image URL"
                                                onClick={() => {
                                                    setEditingImageUrlId(editingImageUrlId === subtask.id ? null : subtask.id);
                                                    setEditingTimingId(null);
                                                    setEditingNoteId(null);
                                                    setUrlInput('');
                                                }}
                                                className={`p-1.5 rounded-lg transition-all ${editingImageUrlId === subtask.id ? 'text-indigo-600 bg-indigo-50' : 'text-gray-400 hover:text-slate-600 hover:bg-slate-50'}`}
                                            ><LinkIcon size={13} /></button>
                                            {/* Note */}
                                            <button type="button" title="Add/Edit Note"
                                                onClick={() => {
                                                    setEditingNoteId(isEditingNote ? null : subtask.id);
                                                    setEditingImageUrlId(null);
                                                    setEditingTimingId(null);
                                                }}
                                                className={`p-1.5 rounded-lg transition-all ${isEditingNote ? 'text-emerald-600 bg-emerald-50' : 'text-gray-400 hover:text-emerald-500 hover:bg-emerald-50'}`}
                                            ><MessageSquare size={13} /></button>
                                            {/* Due date */}
                                            <button type="button" title="Due Date & Time"
                                                onClick={() => {
                                                    setEditingTimingId(editingTimingId === subtask.id ? null : subtask.id);
                                                    setEditingImageUrlId(null);
                                                    setEditingNoteId(null);
                                                }}
                                                className={`p-1.5 rounded-lg transition-all ${editingTimingId === subtask.id ? 'text-indigo-600 bg-indigo-50' : 'text-gray-400 hover:text-indigo-500 hover:bg-indigo-50'}`}
                                            ><CalendarDays size={13} /></button>
                                            {/* Delete */}
                                            <button type="button" title="Delete"
                                                onClick={() => handleDelete(subtask.id)}
                                                className="text-gray-400 hover:text-red-500 p-1.5 rounded-lg hover:bg-red-50 transition-all"
                                            ><X size={13} /></button>
                                        </div>
                                    )}
                                </div>

                                {/* Note display */}
                                {subtask.note && !isEditingNote && (
                                    <div
                                        className="ml-6 text-[11px] text-emerald-700 bg-emerald-50 border border-emerald-100 rounded-lg px-2.5 py-2 font-medium leading-snug cursor-pointer hover:bg-emerald-100 transition-colors"
                                        onClick={() => !readOnly && setEditingNoteId(subtask.id)}
                                        title={readOnly ? undefined : 'Click to edit note'}
                                    >
                                        {subtask.note}
                                    </div>
                                )}

                                {/* Note editor */}
                                {isEditingNote && (
                                    <div className="ml-6 animate-in slide-in-from-top-2 duration-200">
                                        <textarea
                                            autoFocus
                                            value={subtask.note || ''}
                                            onChange={e => handleNoteChange(subtask.id, e.target.value)}
                                            placeholder="Write a note for this subtask..."
                                            rows={3}
                                            className="w-full bg-emerald-50 border border-emerald-200 rounded-xl px-3 py-2 text-[11px] font-medium text-emerald-800 placeholder-emerald-300 outline-none focus:ring-2 focus:ring-emerald-300 resize-none"
                                        />
                                        <div className="flex justify-end gap-2 mt-1.5">
                                            <button
                                                type="button"
                                                onClick={() => setEditingNoteId(null)}
                                                className="bg-emerald-600 text-white px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest hover:bg-emerald-700 transition-all"
                                            >Done</button>
                                        </div>
                                    </div>
                                )}

                                {/* URL Input */}
                                {editingImageUrlId === subtask.id && (
                                    <div className="ml-6 flex gap-2 animate-in slide-in-from-top-2 duration-200 p-2 bg-slate-50 rounded-lg border border-slate-100">
                                        <input
                                            type="text"
                                            value={urlInput}
                                            onChange={e => setUrlInput(e.target.value)}
                                            placeholder="Paste image URL..."
                                            className="flex-1 bg-white border-none rounded-md px-2 py-1 text-[10px] md:text-xs font-bold focus:ring-1 focus:ring-indigo-200"
                                            autoFocus
                                            onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), handleImageUrlAdd(subtask.id))}
                                        />
                                        <button onClick={() => handleImageUrlAdd(subtask.id)} className="bg-indigo-600 text-white px-2 md:px-3 rounded-md text-[9px] md:text-[10px] font-black uppercase tracking-widest">Apply</button>
                                        <button onClick={() => setEditingImageUrlId(null)} className="text-gray-400 hover:text-gray-600 px-1"><X size={12} /></button>
                                    </div>
                                )}

                                {/* Timing editor */}
                                {editingTimingId === subtask.id && (
                                    <div className="ml-6 animate-in slide-in-from-top-2 duration-200 p-3 bg-indigo-50/50 rounded-xl border border-indigo-100 flex flex-col sm:flex-row gap-3">
                                        <div className="flex-1">
                                            <label className="text-[9px] font-black uppercase text-indigo-400 mb-1 block flex items-center gap-1"><CalendarDays size={10} /> Deadline</label>
                                            <input type="date" value={subtask.dueDate || ''}
                                                onChange={e => onChange(subtasks.map(s => s.id === subtask.id ? { ...s, dueDate: e.target.value } : s))}
                                                className="w-full bg-white border-none rounded-md px-2 py-1 text-xs font-bold focus:ring-1 focus:ring-indigo-300 text-indigo-900 shadow-sm"
                                            />
                                        </div>
                                        <div className="flex-1">
                                            <label className="text-[9px] font-black uppercase text-indigo-400 mb-1 block flex items-center gap-1"><Clock size={10} /> Time</label>
                                            <input type="time" value={subtask.dueTime || ''}
                                                onChange={e => onChange(subtasks.map(s => s.id === subtask.id ? { ...s, dueTime: e.target.value } : s))}
                                                className="w-full bg-white border-none rounded-md px-2 py-1 text-xs font-bold focus:ring-1 focus:ring-indigo-300 text-indigo-900 shadow-sm"
                                            />
                                        </div>
                                        <button onClick={() => setEditingTimingId(null)} className="sm:mt-4 bg-indigo-600 text-white px-3 py-1.5 rounded-md text-[10px] font-black uppercase shadow-sm whitespace-nowrap">Done</button>
                                    </div>
                                )}

                                {/* Timing display */}
                                {editingTimingId !== subtask.id && (subtask.dueDate || subtask.dueTime) && (
                                    <div className="ml-6 flex items-center gap-3 text-[9px] md:text-[10px] font-bold text-indigo-400">
                                        {subtask.dueDate && <span className="flex items-center gap-1"><CalendarDays size={10} /> {new Date(`${subtask.dueDate}T12:00:00Z`).toLocaleDateString()}</span>}
                                        {subtask.dueTime && <span className="flex items-center gap-1"><Clock size={10} /> {subtask.dueTime}</span>}
                                    </div>
                                )}

                                {/* Images gallery — full image, no crop */}
                                {images.length > 0 && (
                                    <div className="mt-1 flex flex-col gap-2">
                                        {images.map((imgUrl, imgIdx) => (
                                            <div key={imgIdx} className="relative group/img rounded-xl overflow-hidden border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
                                                <img src={imgUrl} alt="attachment" className="w-full h-auto max-h-[80vh] object-contain" />
                                                {!readOnly && (
                                                    <button
                                                        onClick={() => handleRemoveImage(subtask.id, imgIdx)}
                                                        className="absolute top-1 right-1 bg-black/50 hover:bg-red-500 text-white rounded-full p-1 opacity-0 group-hover/img:opacity-100 transition-all shadow"
                                                    ><X size={10} /></button>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                )}

                                {/* Timestamps */}
                                <div className="ml-6 mt-1 flex flex-wrap gap-x-4 gap-y-1 text-[9px] font-bold text-gray-400 opacity-60">
                                    {subtask.createdAt && (
                                        <span>Added: {new Date(subtask.createdAt).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
                                    )}
                                    {isSubtaskCompleted && subtask.completedAt && !isRecurring && (
                                        <span className="text-green-600">Done: {new Date(subtask.completedAt).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
                                    )}
                                    {isSubtaskCompleted && isRecurring && dateContext && subtask.completedDateTimes?.[dateContext] && (
                                        <span className="text-green-600">Done: {new Date(subtask.completedDateTimes[dateContext]).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
                {/* end scaled grid */}
            </div>
            {/* end pinch wrapper */}

            {subtasks.length > 0 && (
                <div className="mt-4 text-[10px] font-black uppercase tracking-widest text-gray-400 border-t border-gray-100 pt-3">
                    {subtasks.filter(s => isRecurring && dateContext ? (s.completedDates || []).includes(dateContext) : s.isCompleted).length} / {subtasks.length} Completed
                </div>
            )}
        </div>
    );
};

export default SubtaskList;
