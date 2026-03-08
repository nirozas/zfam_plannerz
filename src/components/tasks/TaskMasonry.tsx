import React, { useMemo, useState, useEffect, useRef } from 'react';
import { useTaskStore, Task } from '../../store/taskStore';
import { Clock, CheckCircle, Paperclip, ChevronLeft, ChevronRight, Image as ImageIcon, Share2, Trash2 } from 'lucide-react';
import { isTaskVisibleOnDate, toDateStr } from '../../utils/recurringUtils';
import { Resizable } from 're-resizable';

interface TaskMasonryProps {
    searchTerm: string;
}

const hexToRgba = (hex: string, alpha: number) => {
    try {
        const r = parseInt(hex.slice(1, 3), 16);
        const g = parseInt(hex.slice(3, 5), 16);
        const b = parseInt(hex.slice(5, 7), 16);
        return `rgba(${r},${g},${b},${alpha})`;
    } catch { return 'transparent'; }
};

/** Convert stored colSpan/rowSpan to pixel dimensions */
const spanToPixels = (span: number | undefined, unit: number, gap: number) => {
    if (!span || span <= 0) return unit;
    if (span > 20) return span; // already raw pixels
    return unit * span + gap * (span - 1);
};

const TaskMasonry: React.FC<TaskMasonryProps> = ({ searchTerm }) => {
    const {
        tasks, categories, selectedCategories, toggleTaskCompletion, deleteTask,
        activeDayDate, setActiveDayDate, sortBy, dayViewBackgrounds,
        setDayViewBackground, setEditingTaskId, updateTask, taskGap
    } = useTaskStore();

    const [isEditingBg, setIsEditingBg] = useState(false);
    const dayBg = dayViewBackgrounds[activeDayDate] || '';
    const [tempBgUrl, setTempBgUrl] = useState(dayBg);

    // Drag-and-drop ordering state (local, per day)
    const [orderedIds, setOrderedIds] = useState<string[]>([]);
    const draggedId = useRef<string | null>(null);
    const dragOverId = useRef<string | null>(null);

    useEffect(() => { setTempBgUrl(dayBg); }, [dayBg, activeDayDate]);

    const currentDate = useMemo(() => {
        const [y, m, d] = activeDayDate.split('-').map(Number);
        return new Date(y, m - 1, d);
    }, [activeDayDate]);

    const prevDay = () => { const d = new Date(currentDate); d.setDate(d.getDate() - 1); setActiveDayDate(toDateStr(d)); };
    const nextDay = () => { const d = new Date(currentDate); d.setDate(d.getDate() + 1); setActiveDayDate(toDateStr(d)); };
    const goToday = () => setActiveDayDate(toDateStr(new Date()));
    const isToday = activeDayDate === toDateStr(new Date());

    const dayLabel = currentDate.toLocaleDateString(undefined, {
        weekday: 'long', month: 'long', day: 'numeric', year: 'numeric'
    });

    const relevantTasks = useMemo(() => {
        let filtered = tasks.filter(t => {
            if (searchTerm && !t.title.toLowerCase().includes(searchTerm.toLowerCase())) return false;
            if (selectedCategories.length > 0 && !selectedCategories.includes(t.categoryId)) return false;
            return isTaskVisibleOnDate(t, currentDate);
        });
        filtered.sort((a, b) => {
            if (sortBy === 'name') return a.title.localeCompare(b.title);
            if (sortBy === 'dueDate') {
                const da = a.dueDate ? new Date(a.dueDate).getTime() : Infinity;
                const db = b.dueDate ? new Date(b.dueDate).getTime() : Infinity;
                return da - db;
            }
            if (sortBy === 'priority') {
                const pMap = { high: 0, medium: 1, low: 2 };
                return pMap[a.priority] - pMap[b.priority];
            }
            return new Date(b.dateAdded).getTime() - new Date(a.dateAdded).getTime();
        });
        return filtered;
    }, [tasks, selectedCategories, searchTerm, currentDate, sortBy]);

    // Sync ordered ids when tasks change (new/removed tasks, day change)
    useEffect(() => {
        const ids = relevantTasks.map(t => t.id);
        setOrderedIds(prev => {
            const existing = prev.filter(id => ids.includes(id));
            const added = ids.filter(id => !existing.includes(id));
            return [...existing, ...added];
        });
    }, [relevantTasks]);

    const orderedTasks = useMemo(() => {
        const map = new Map(relevantTasks.map(t => [t.id, t]));
        return orderedIds.map(id => map.get(id)).filter(Boolean) as Task[];
    }, [orderedIds, relevantTasks]);

    // ── Drag handlers ──────────────────────────────────────────────────────────
    const handleDragStart = (id: string) => { draggedId.current = id; };
    const handleDragOver = (e: React.DragEvent, id: string) => {
        e.preventDefault();
        dragOverId.current = id;
    };
    const handleDrop = () => {
        const from = draggedId.current;
        const to = dragOverId.current;
        if (!from || !to || from === to) return;
        setOrderedIds(prev => {
            const arr = [...prev];
            const fromIdx = arr.indexOf(from);
            const toIdx = arr.indexOf(to);
            arr.splice(fromIdx, 1);
            arr.splice(toIdx, 0, from);
            return arr;
        });
        draggedId.current = null;
        dragOverId.current = null;
    };

    const handleToggle = (e: React.MouseEvent, task: Task) => {
        e.stopPropagation();
        toggleTaskCompletion(task.id, activeDayDate);
    };

    const activeCategoryColors = selectedCategories.length === 1
        ? categories.find(c => c.id === selectedCategories[0])?.color : null;

    const handleSaveBg = () => {
        setDayViewBackground(activeDayDate, tempBgUrl || null);
        setIsEditingBg(false);
    };

    const isMobile = typeof window !== 'undefined' && window.innerWidth < 640;

    return (
        <div className="flex flex-col h-full relative overflow-hidden">
            {/* Background Image Layer */}
            {dayBg && (
                <img src={dayBg} alt="" referrerPolicy="no-referrer" aria-hidden="true"
                    className="absolute inset-0 z-0 w-full h-full object-cover pointer-events-none opacity-60 transition-opacity duration-700" />
            )}

            <div className="flex flex-col h-full relative z-10">
                {/* Day Navigation Header */}
                <div
                    className="flex items-center justify-between px-4 py-3 rounded-xl mb-4 border border-gray-100 shadow-sm"
                    style={activeCategoryColors ? { backgroundColor: hexToRgba(activeCategoryColors, 0.08) } : { backgroundColor: '#f9fafb' }}
                >
                    <div className="flex items-center gap-3">
                        <button onClick={prevDay} className="p-1.5 hover:bg-white hover:shadow-sm rounded-full transition-all text-gray-500">
                            <ChevronLeft size={20} />
                        </button>
                        <div>
                            <div className={`text-lg font-bold ${isToday ? 'text-indigo-700' : 'text-gray-800'}`}>{dayLabel}</div>
                            <div className="text-xs text-gray-400">{orderedTasks.length} task{orderedTasks.length !== 1 ? 's' : ''}</div>
                        </div>
                        <button onClick={nextDay} className="p-1.5 hover:bg-white hover:shadow-sm rounded-full transition-all text-gray-500">
                            <ChevronRight size={20} />
                        </button>
                    </div>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => { setTempBgUrl(dayViewBackgrounds[activeDayDate] || ''); setIsEditingBg(!isEditingBg); }}
                            className={`p-2 rounded-lg transition-all ${isEditingBg ? 'bg-indigo-600 text-white shadow-md' : 'text-gray-400 hover:bg-white hover:text-indigo-600'}`}
                            title="Set Background Image"
                        >
                            <ImageIcon size={18} />
                        </button>
                        {!isToday && (
                            <button onClick={goToday} className="text-xs font-semibold text-indigo-600 hover:bg-indigo-50 px-3 py-1.5 rounded-lg transition-colors">
                                Today
                            </button>
                        )}
                    </div>
                </div>

                {/* Background Editor Mini-Bar */}
                {isEditingBg && (
                    <div className="mx-4 mb-4 p-3 bg-white/90 backdrop-blur-md border border-indigo-100 rounded-xl shadow-xl flex items-center gap-3 animate-in slide-in-from-top-2 duration-200">
                        <div className="flex-1 relative">
                            <ImageIcon size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                            <input type="text" placeholder="Paste image URL here..." value={tempBgUrl} onChange={(e) => setTempBgUrl(e.target.value)}
                                className="w-full pl-9 pr-4 py-2 bg-gray-50 border border-gray-100 rounded-lg text-xs outline-none focus:ring-2 focus:ring-indigo-500 transition-all font-mono" />
                        </div>
                        <button onClick={handleSaveBg} className="px-4 py-2 bg-indigo-600 text-white text-xs font-bold rounded-lg hover:bg-indigo-700 transition-all shadow-md active:scale-95">Save</button>
                        <button onClick={() => setIsEditingBg(false)} className="px-3 py-2 text-gray-500 text-xs font-bold hover:bg-gray-100 rounded-lg transition-all">Cancel</button>
                    </div>
                )}

                {orderedTasks.length === 0 ? (
                    <div className="flex flex-col items-center justify-center flex-1 text-gray-300 gap-3">
                        <svg width="80" height="80" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1"><circle cx="12" cy="12" r="10" /><path d="M8 12l2 2 4-4" /></svg>
                        <p className="text-sm font-medium">No tasks for this day</p>
                    </div>
                ) : (
                    <div className="flex flex-wrap items-start px-4 pb-10 flex-1 overflow-y-auto" style={{ gap: `${taskGap}px` }}>
                        {orderedTasks.map(task => {
                            const category = categories.find(c => c.id === task.categoryId);
                            const isCompleted = task.isRecurring
                                ? task.completedDates.includes(activeDayDate)
                                : task.isCompleted;
                            const catColor = category?.color || '#6366f1';

                            // Pixel sizes — stored as raw px when > 20, else as span multipliers
                            const W = spanToPixels(task.colSpan, 280, taskGap);
                            const H = spanToPixels(task.rowSpan, 150, taskGap);

                            const cardContent = (
                                <div
                                    onClick={() => setEditingTaskId(task.id)}
                                    draggable
                                    onDragStart={(e) => { e.stopPropagation(); handleDragStart(task.id); }}
                                    onDragOver={(e) => handleDragOver(e, task.id)}
                                    onDrop={handleDrop}
                                    className="w-full h-full rounded-2xl shadow-sm hover:shadow-lg border overflow-hidden transition-all duration-200 flex flex-col cursor-grab active:cursor-grabbing bg-white relative group/card"
                                    style={{
                                        borderColor: isCompleted ? '#e5e7eb' : 'transparent',
                                        outline: isCompleted ? 'none' : `1px solid ${catColor}30`,
                                    }}
                                >
                                    {/* Left strip indicator */}
                                    <div className="absolute left-0 top-0 bottom-0 w-1" style={{ backgroundColor: catColor }}></div>

                                    <div className={`flex flex-col h-full ${isCompleted ? 'opacity-60 grayscale' : ''}`}>
                                        {/* Cover Image */}
                                        {task.attachments && task.attachments.length > 0 && (
                                            <div className={`${isMobile ? 'h-24' : 'h-32'} w-full flex-shrink-0 relative bg-gray-100 border-b border-gray-50`}>
                                                <img src={task.attachments[0]} alt="cover" referrerPolicy="no-referrer" className="w-full h-full object-cover" />
                                                {task.attachments.length > 1 && (
                                                    <div className="absolute bottom-2 right-2 bg-black/50 text-white text-[10px] px-1.5 py-0.5 rounded-full flex items-center gap-1">
                                                        <Paperclip size={10} /> +{task.attachments.length - 1}
                                                    </div>
                                                )}
                                            </div>
                                        )}

                                        <div className="p-3 md:p-4 flex flex-col flex-1 min-h-0">
                                            <div className="flex items-start justify-between gap-2">
                                                <h3 className={`font-bold text-gray-800 leading-tight text-sm md:text-base flex-1 min-w-0 ${isCompleted ? 'line-through text-gray-400' : ''}`}>
                                                    {task.title}
                                                </h3>
                                                {/* Action buttons — always visible */}
                                                <div className="flex items-center gap-0.5 flex-shrink-0 -mr-1 -mt-1" onClick={e => e.stopPropagation()}>
                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            const text = `Task: ${task.title}\n${task.description ? `Description: ${task.description}\n` : ''}`;
                                                            if (navigator.share) navigator.share({ title: task.title, text }).catch(() => navigator.clipboard.writeText(text));
                                                            else navigator.clipboard.writeText(text);
                                                        }}
                                                        className="p-1.5 text-gray-300 hover:text-indigo-500 hover:bg-indigo-50 rounded-lg transition-all"
                                                        title="Share Task"
                                                    >
                                                        <Share2 size={13} />
                                                    </button>
                                                    <button
                                                        onClick={(e) => handleToggle(e, task)}
                                                        className="p-1.5 text-gray-300 hover:text-green-500 hover:bg-green-50 rounded-lg transition-all"
                                                        title={isCompleted ? 'Mark incomplete' : 'Mark complete'}
                                                    >
                                                        <CheckCircle size={14} className={isCompleted ? 'text-green-500 fill-green-50' : ''} />
                                                    </button>
                                                    <button
                                                        onClick={(e) => { e.stopPropagation(); if (confirm('Delete this task?')) deleteTask(task.id); }}
                                                        className="p-1.5 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
                                                        title="Delete Task"
                                                    >
                                                        <Trash2 size={13} />
                                                    </button>
                                                </div>
                                            </div>

                                            {/* Description snippet */}
                                            {task.description && (
                                                <div className="text-[10px] md:text-xs text-gray-500 mt-2 line-clamp-2 md:line-clamp-3"
                                                    dangerouslySetInnerHTML={{ __html: task.description.replace(/<[^>]*>?/gm, ' ') }} />
                                            )}

                                            {/* Subtasks preview */}
                                            {task.subtasks && task.subtasks.length > 0 && (
                                                <div className="mt-2 md:mt-3 space-y-1">
                                                    {task.subtasks.slice(0, 3).map(st => (
                                                        <div key={st.id} className="flex items-center gap-2 text-[10px] md:text-xs text-gray-500">
                                                            <div className={`w-2.5 h-2.5 md:w-3 md:h-3 rounded-full border ${st.isCompleted ? 'bg-indigo-400 border-indigo-400' : 'border-gray-300'}`}></div>
                                                            <span className={`truncate ${st.isCompleted ? 'line-through opacity-70' : ''}`}>{st.title}</span>
                                                        </div>
                                                    ))}
                                                    {task.subtasks.length > 3 && (
                                                        <div className="text-[9px] md:text-[10px] text-gray-400 pl-4 md:pl-5">+{task.subtasks.length - 3} more</div>
                                                    )}
                                                </div>
                                            )}

                                            <div className="flex-1"></div>

                                            {/* Footer */}
                                            <div className="flex flex-col gap-2 mt-auto pt-3">
                                                <div className="flex flex-wrap gap-2 text-[10px] items-center opacity-80">
                                                    {category && <span className="font-bold uppercase tracking-wider" style={{ color: catColor }}>{category.name}</span>}
                                                    {task.isRecurring && (
                                                        <span className="flex items-center gap-1 text-orange-500 bg-orange-50 px-1.5 py-0.5 rounded font-bold uppercase tracking-wider">
                                                            <Clock size={10} /> {task.recurrence?.type}
                                                        </span>
                                                    )}
                                                </div>
                                                <div className="flex flex-wrap gap-x-3 gap-y-1 text-[9px] font-bold text-gray-400 opacity-60 uppercase tracking-tighter">
                                                    <span>Added: {new Date(task.dateAdded).toLocaleDateString()}</span>
                                                    {task.dueDate && !task.isRecurring && (
                                                        <span>Due: {new Date(task.dueDate.includes('T') ? task.dueDate : `${task.dueDate}T12:00:00Z`).toLocaleDateString()}</span>
                                                    )}
                                                    {isCompleted && (
                                                        <span className="text-green-600">
                                                            Done: {task.isRecurring
                                                                ? (task.completedDateTimes?.[activeDayDate] ? new Date(task.completedDateTimes[activeDayDate]).toLocaleString([], { month: 'numeric', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : activeDayDate)
                                                                : (task.completedAt ? new Date(task.completedAt).toLocaleString([], { month: 'numeric', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '')}
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            );

                            if (isMobile) {
                                return <div key={task.id} className="w-full">{cardContent}</div>;
                            }

                            return (
                                <Resizable
                                    key={task.id}
                                    size={{ width: W, height: H }}
                                    minWidth={200}
                                    minHeight={120}
                                    onResizeStop={(_e, _direction, ref) => {
                                        // Store raw pixel values so they survive refresh
                                        updateTask(task.id, {
                                            colSpan: ref.offsetWidth,
                                            rowSpan: ref.offsetHeight,
                                        });
                                    }}
                                    enable={{
                                        top: false, right: true, bottom: true, left: false,
                                        topRight: false, bottomRight: true, bottomLeft: false, topLeft: false
                                    }}
                                    handleClasses={{
                                        bottomRight: 'w-4 h-4 bg-gray-400/20 rounded-full cursor-nwse-resize hover:bg-indigo-500 transition-colors absolute bottom-1 right-1 z-20'
                                    }}
                                    className="group"
                                >
                                    {cardContent}
                                </Resizable>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
};

export default TaskMasonry;
