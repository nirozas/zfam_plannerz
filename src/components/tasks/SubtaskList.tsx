import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Subtask } from '../../store/taskStore';
import {
    Plus, Circle, CheckCircle, Image as ImageIcon, 
    Clock, GripVertical, Pencil
} from 'lucide-react';
import SubtaskEditorModal from './SubtaskEditorModal';

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
    const [editingSubtask, setEditingSubtask] = useState<Subtask | null>(null);
    const [zoom, setZoom] = useState<number>(() => {
        const saved = localStorage.getItem('subtask-zoom');
        return saved ? parseFloat(saved) : 1;
    });
    const zoomRef = useRef(zoom);
    const gridWrapperRef = useRef<HTMLDivElement>(null);
    const draggedId = useRef<string | null>(null);
    const dragOverId = useRef<string | null>(null);

    // Touch pinch tracking
    const lastTouchDist = useRef<number | null>(null);

    const clampZoom = (v: number) => Math.min(2, Math.max(0.4, v));

    const applyZoom = useCallback((val: number) => {
        const clamped = clampZoom(val);
        zoomRef.current = clamped;
        setZoom(clamped);
        localStorage.setItem('subtask-zoom', clamped.toString());
    }, []);

    // Ctrl + wheel → zoom
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
        if (e.touches.length < 2) return 0;
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
        if (newDist === 0) return;
        const ratio = newDist / lastTouchDist.current;
        applyZoom(zoomRef.current * ratio);
        lastTouchDist.current = newDist;
    };

    const handleTouchEnd = () => { lastTouchDist.current = null; };

    const handleAdd = (e: React.FormEvent, position: 'top' | 'bottom' = 'bottom') => {
        e.preventDefault();
        if (!newTitle.trim()) return;
        const newSubtask: Subtask = {
            id: crypto.randomUUID(),
            title: newTitle.trim(),
            isCompleted: false,
            imageUrls: [],
            createdAt: new Date().toISOString()
        };
        if (position === 'top') {
            onChange([newSubtask, ...subtasks]);
        } else {
            onChange([...subtasks, newSubtask]);
        }
        setNewTitle('');
    };

    const handleToggle = (id: string, type: 'complete' | 'fail' = 'complete') => {
        onChange(subtasks.map(s => {
            if (s.id === id) {
                if (isRecurring && dateContext) {
                    const cd = s.completedDates || [];
                    const fd = s.failedDates || [];
                    const isCompletedOnDate = cd.includes(dateContext);
                    const isFailedOnDate = fd.includes(dateContext);
                    
                    const newCTimes = { ...(s.completedDateTimes || {}) };
                    const newFTimes = { ...(s.failedDateTimes || {}) };
                    const now = new Date().toISOString();

                    if (type === 'complete') {
                        if (isCompletedOnDate) {
                            delete newCTimes[dateContext];
                            return { ...s, completedDates: cd.filter(d => d !== dateContext), completedDateTimes: newCTimes };
                        } else {
                            newCTimes[dateContext] = now;
                            delete newFTimes[dateContext]; // Unfail if completing
                            return { 
                                ...s, 
                                completedDates: [...cd, dateContext], completedDateTimes: newCTimes, 
                                failedDates: fd.filter(d => d !== dateContext), failedDateTimes: newFTimes,
                                isFailed: false // Clear general flag
                            };
                        }
                    } else {
                        // Fail
                        if (isFailedOnDate) {
                            delete newFTimes[dateContext];
                            return { ...s, failedDates: fd.filter(d => d !== dateContext), failedDateTimes: newFTimes };
                        } else {
                            newFTimes[dateContext] = now;
                            delete newCTimes[dateContext]; // Uncomplete if failing
                            return { 
                                ...s, 
                                failedDates: [...fd, dateContext], failedDateTimes: newFTimes, 
                                completedDates: cd.filter(d => d !== dateContext), completedDateTimes: newCTimes,
                                isCompleted: false // Clear general flag
                            };
                        }
                    }
                } else {
                    // One-time
                    if (type === 'complete') {
                        const next = !s.isCompleted;
                        return { 
                            ...s, 
                            isCompleted: next, 
                            isFailed: next ? false : s.isFailed, 
                            completedAt: next ? new Date().toISOString() : undefined,
                            failedAt: next ? undefined : s.failedAt // Clear fail time if completed
                        };
                    } else {
                        const next = !s.isFailed;
                        return { 
                            ...s, 
                            isFailed: next, 
                            isCompleted: next ? false : s.isCompleted,
                            failedAt: next ? new Date().toISOString() : undefined,
                            completedAt: next ? undefined : s.completedAt // Clear completion time if failed
                        };
                    }
                }
            }
            return s;
        }));
    };

    const handleDelete = (id: string) => {
        onChange(subtasks.filter(s => s.id !== id));
    };

    const handleSubtaskUpdate = (updated: Subtask) => {
        onChange(subtasks.map(s => s.id === updated.id ? updated : s));
    };

    const handleDragStart = (id: string) => { draggedId.current = id; };
    const handleDragOver = (e: React.DragEvent, id: string) => {
        e.preventDefault();
        dragOverId.current = id;
    };
    const handleDrop = () => {
        const from = draggedId.current;
        const to = dragOverId.current;
        if (!from || !to || from === to) return;
        const fromIdx = subtasks.findIndex(s => s.id === from);
        const toIdx = subtasks.findIndex(s => s.id === to);
        if (fromIdx === -1 || toIdx === -1) return;
        const newList = [...subtasks];
        const [moved] = newList.splice(fromIdx, 1);
        newList.splice(toIdx, 0, moved);
        onChange(newList);
        draggedId.current = null;
        dragOverId.current = null;
    };

    return (
        <div className="subtask-list">
            <div className="flex flex-col gap-3 mb-6">
                <div className="flex items-center justify-between">
                     <div className="flex items-center gap-2 text-[11px] font-black uppercase tracking-widest text-indigo-500">
                         <Plus size={14} /> New Objective
                     </div>
                </div>

                <div className="flex flex-col sm:flex-row items-center gap-2">
                    <form onSubmit={(e) => handleAdd(e, 'bottom')} className="flex items-center gap-2 flex-1 bg-white/50 p-2.5 rounded-2xl border border-gray-100 shadow-sm w-full group focus-within:border-indigo-200 transition-all">
                        <Plus size={18} className="text-indigo-400 shrink-0 group-hover:rotate-90 transition-transform" />
                        <input
                            type="text"
                            value={newTitle}
                            onChange={e => setNewTitle(e.target.value)}
                            placeholder="Type new objective..."
                            className="flex-1 text-sm bg-transparent border-none focus:outline-none placeholder-gray-400 font-bold"
                        />
                        <div className="flex items-center gap-1 shrink-0">
                            <button type="button" onClick={(e) => handleAdd(e as any, 'top')} className="bg-white border border-gray-200 text-gray-600 px-3 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-widest hover:bg-gray-50 hover:text-indigo-600 transition-all active:scale-95">Top</button>
                            <button type="submit" className="bg-indigo-600 text-white px-4 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-widest hover:bg-indigo-700 transition-all shadow-md active:scale-95">Bottom</button>
                        </div>
                    </form>

                    <button
                        type="button"
                        onDoubleClick={() => applyZoom(1)}
                        title="Pinch or Ctrl+scroll to zoom · Double-click to reset"
                        className="flex-shrink-0 flex items-center gap-1.5 bg-white border border-gray-100 rounded-2xl px-4 py-2.5 shadow-sm text-[10px] font-black text-gray-400 hover:text-indigo-500 hover:border-indigo-200 transition-all select-none"
                    >
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /><line x1="11" y1="8" x2="11" y2="14" /><line x1="8" y1="11" x2="14" y2="11" /></svg>
                        {Math.round(zoom * 100)}%
                    </button>
                </div>
            </div>

            <div
                ref={gridWrapperRef}
                onTouchStart={handleTouchStart}
                onTouchMove={handleTouchMove}
                onTouchEnd={handleTouchEnd}
                style={{ touchAction: 'pan-y' }}
            >
                <div
                    className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 transition-transform duration-200"
                    style={{
                        transform: `scale(${zoom})`,
                        transformOrigin: 'top left',
                        width: `${(1 / zoom) * 100}%`,
                        marginBottom: `${(zoom - 1) * 100}%`,
                    }}
                >
                    {subtasks.map((subtask) => {
                        const isSubtaskCompleted = isRecurring && dateContext
                            ? (subtask.completedDates || []).includes(dateContext)
                            : subtask.isCompleted;
                        const isSubtaskFailed = isRecurring && dateContext
                            ? (subtask.failedDates || []).includes(dateContext)
                            : subtask.isFailed;
                        const images = getImages(subtask);

                        return (
                            <div
                                key={subtask.id}
                                draggable={true}
                                onDragStart={() => handleDragStart(subtask.id)}
                                onDragOver={(e) => handleDragOver(e, subtask.id)}
                                onDrop={handleDrop}
                                onDoubleClick={() => setEditingSubtask(subtask)}
                                className={`group flex flex-col gap-3 p-4 rounded-[28px] border border-gray-100 shadow-sm hover:shadow-xl transition-all hover:border-indigo-200 active:cursor-grabbing ${
                                    isSubtaskCompleted ? 'bg-green-50/60' : 
                                    isSubtaskFailed ? 'bg-red-50/60' : 'bg-white/90'
                                }`}
                            >
                                <div className="flex items-start gap-3">
                                    <div className="flex flex-col items-center gap-2 mt-0.5 shrink-0">
                                        <button
                                            type="button"
                                            onClick={(e) => { e.stopPropagation(); handleToggle(subtask.id, 'complete'); }}
                                            className={`flex-shrink-0 transition-all ${isSubtaskCompleted ? 'text-green-600 scale-110' : 'text-gray-200 hover:text-green-400 hover:scale-110'}`}
                                        >
                                            <CheckCircle size={22} />
                                        </button>
                                        <button
                                            type="button"
                                            onClick={(e) => { e.stopPropagation(); handleToggle(subtask.id, 'fail'); }}
                                            className={`flex-shrink-0 transition-all ${isSubtaskFailed ? 'text-red-600 scale-110' : 'text-gray-200 hover:text-red-400 hover:scale-110'}`}
                                        >
                                            <Circle size={18} className="relative flex items-center justify-center">
                                                <Plus size={12} className="rotate-45" />
                                            </Circle>
                                        </button>
                                        <div className="h-2"></div>
                                        <GripVertical size={14} className="text-gray-100 cursor-grab active:cursor-grabbing hover:text-indigo-400 transition-colors" />
                                    </div>

                                    <div 
                                        className="flex-1 min-w-0 cursor-pointer" 
                                        onClick={() => setEditingSubtask(subtask)}
                                    >
                                        <span className={`block break-words leading-tight pt-1 font-black text-sm md:text-[15px] transition-all ${
                                            isSubtaskCompleted ? 'text-green-800 line-through' : 
                                            isSubtaskFailed ? 'text-red-800 line-through opacity-70' : 'text-gray-700'
                                        } group-hover:text-indigo-600`}>
                                            {subtask.title}
                                        </span>
                                        {subtask.note && (
                                            <p className="mt-1.5 text-[11px] text-gray-400 line-clamp-2 italic font-medium leading-relaxed">{subtask.note}</p>
                                        )}
                                    </div>

                                    {subtask.priority && (
                                        <div className={`shrink-0 w-2.5 h-2.5 rounded-full mt-2.5 shadow-sm ${
                                            subtask.priority === 'high' ? 'bg-red-500 animate-pulse' : 
                                            subtask.priority === 'medium' ? 'bg-amber-500' : 'bg-blue-500'
                                        }`} />
                                    )}
                                </div>

                                <div className="mt-auto flex items-center justify-between pt-3 border-t border-gray-100/50">
                                    <div className="flex items-center gap-3">
                                        {(subtask.dueDate || subtask.dueTime) && (
                                            <div className="flex items-center gap-1.5 text-[9px] font-black text-indigo-500 uppercase tracking-[0.1em] bg-indigo-50 px-2.5 py-1 rounded-full">
                                                <Clock size={10} />
                                                {subtask.dueTime || 'All Day'}
                                            </div>
                                        )}
                                        {images.length > 0 && (
                                            <div className="flex items-center gap-1.5 text-[9px] font-black text-gray-400 uppercase tracking-[0.1em] bg-gray-50 px-2 py-1 rounded-full">
                                                <ImageIcon size={10} /> {images.length}
                                            </div>
                                        )}
                                    </div>
                                    
                                    {!readOnly && (
                                        <button 
                                            onClick={(e) => { e.stopPropagation(); setEditingSubtask(subtask); }}
                                            className="p-2 rounded-xl text-gray-300 hover:text-white hover:bg-indigo-600 opacity-0 group-hover:opacity-100 transition-all shadow-sm"
                                        >
                                            <Pencil size={12} />
                                        </button>
                                    )}
                                </div>

                                {/* Timestamps Strip */}
                                <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-[9px] font-bold text-gray-400 opacity-60">
                                    {subtask.createdAt && (
                                        <span className="flex items-center gap-1">
                                            Added: {new Date(subtask.createdAt).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                                        </span>
                                    )}
                                    {isSubtaskCompleted && subtask.completedAt && !isRecurring && (
                                        <span className="text-green-600 flex items-center gap-1">
                                            Done: {new Date(subtask.completedAt).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                                        </span>
                                    )}
                                    {isSubtaskCompleted && isRecurring && dateContext && subtask.completedDateTimes?.[dateContext] && (
                                        <span className="text-green-600 flex items-center gap-1">
                                            Done: {new Date(subtask.completedDateTimes![dateContext]).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                                        </span>
                                    )}
                                    {isSubtaskFailed && subtask.failedAt && !isRecurring && (
                                        <span className="text-red-600 flex items-center gap-1">
                                            Failed: {new Date(subtask.failedAt).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                                        </span>
                                    )}
                                    {isSubtaskFailed && isRecurring && dateContext && subtask.failedDateTimes?.[dateContext] && (
                                        <span className="text-red-600 flex items-center gap-1">
                                            Failed: {new Date(subtask.failedDateTimes![dateContext]).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                                        </span>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>

            {editingSubtask && (
                <SubtaskEditorModal
                    subtask={editingSubtask}
                    onSave={handleSubtaskUpdate}
                    onDelete={handleDelete}
                    onClose={() => setEditingSubtask(null)}
                />
            )}
        </div>
    );
};

export default SubtaskList;
