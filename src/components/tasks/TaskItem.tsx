import React, { useState } from 'react';
import { useTaskStore, Task, Subtask } from '../../store/taskStore';
import { Check, Trash2, Share2, X } from 'lucide-react';
import { Resizable } from 're-resizable';

interface TaskItemProps {
    task: Task;
    dateContext?: string; // YYYY-MM-DD — which day we're viewing (for recurring completion)
}

const TaskItem: React.FC<TaskItemProps> = ({ task, dateContext }) => {
    const { toggleTaskCompletion, toggleTaskFailure, categories, deleteTask, updateTask, setEditingTaskId, setActiveDayDate } = useTaskStore();
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [isQuickAdding, setIsQuickAdding] = useState(false);
    const [quickTitle, setQuickTitle] = useState('');

    const category = categories.find(c => c.id === task.categoryId);
    const dateStr = dateContext || (task.dueDate ? task.dueDate.split('T')[0] : new Date().toISOString().split('T')[0]);
    const isCompleted = task.isRecurring
        ? task.completedDates.includes(dateStr)
        : task.isCompleted;

    const isFailed = task.isRecurring
        ? task.failedDates?.includes(dateStr)
        : task.isFailed;

    const handleCheck = (e: React.MouseEvent) => {
        e.stopPropagation();
        toggleTaskCompletion(task.id, dateStr);
    };

    const handleFail = (e: React.MouseEvent) => {
        e.stopPropagation();
        toggleTaskFailure(task.id, dateStr);
    };

    const handleDeleteClick = (e: React.MouseEvent) => {
        e.stopPropagation();
        if (task.isRecurring) {
            setShowDeleteModal(true);
        } else {
            if (confirm('Delete task?')) deleteTask(task.id);
        }
    };

    const handleDeleteAll = () => {
        deleteTask(task.id);
        setShowDeleteModal(false);
    };

    const handleDeleteInstance = () => {
        const currentDeleted = task.deletedDates || [];
        updateTask(task.id, { deletedDates: [...currentDeleted, dateStr] });
        setShowDeleteModal(false);
    };

    const handleDeleteFuture = () => {
        const current = new Date(dateStr);
        current.setDate(current.getDate() - 1);
        const yStr = current.toISOString().split('T')[0];
        updateTask(task.id, {
            recurrence: {
                ...task.recurrence!,
                endDate: yStr
            }
        });
        setShowDeleteModal(false);
    };

    const handleShare = (e: React.MouseEvent) => {
        e.stopPropagation();
        const text = `Task: ${task.title}\n${task.description ? `Description: ${task.description}\n` : ''}${task.dueDate ? `Due: ${formatDate(task.dueDate)}\n` : ''}`;

        if (navigator.share) {
            navigator.share({
                title: task.title,
                text: text,
            }).catch(() => {
                navigator.clipboard.writeText(text);
            });
        } else {
            navigator.clipboard.writeText(text);
        }
    };

    const handleQuickAdd = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!quickTitle.trim()) return;
        const newSubtask: Subtask = {
            id: crypto.randomUUID(),
            title: quickTitle.trim(),
            isCompleted: false,
            imageUrls: [],
            createdAt: new Date().toISOString()
        };
        await updateTask(task.id, { subtasks: [...(task.subtasks || []), newSubtask] });
        setQuickTitle('');
        setIsQuickAdding(false);
    };

    const formatDate = (ds?: string) => {
        if (!ds) return '';
        const dateStr = ds.includes('T') ? ds : `${ds}T12:00:00Z`;
        return new Date(dateStr).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
    };

    // Category color tint
    const catColor = category?.color || '#6366f1';
    const isMobile = typeof window !== 'undefined' && window.innerWidth < 640;

    /** Convert stored spans to pixels — copy logic from TaskMasonry */
    const spanToPixels = (span: number | undefined, unit: number) => {
        if (!span || span <= 0) return unit;
        if (span > 20) return span; // raw px
        return unit * span;
    };

    const W = isMobile ? '100% ' as any : spanToPixels(task.colSpan, 280);
    const H = isMobile ? 'auto' as any : spanToPixels(task.rowSpan, 180);

    const cardContent = (
        <div
            className={`group h-full w-full flex flex-col rounded-2xl shadow-sm hover:shadow-lg border overflow-hidden transition-all duration-200 cursor-pointer relative ${isCompleted ? 'bg-green-100' : isFailed ? 'bg-red-100' : 'bg-white'}`}
            style={{
                outline: isCompleted || isFailed ? 'none' : `1px solid ${catColor}30`,
            }}
            onClick={() => {
                setActiveDayDate(dateStr);
                setEditingTaskId(task.id);
            }}
        >
            {/* Left strip indicator */}
            <div className="absolute left-0 top-0 bottom-0 w-1" style={{ backgroundColor: catColor }}></div>

            <div className={`flex flex-col h-full ${isCompleted || isFailed ? 'opacity-90' : ''}`}>
                {/* Cover Image (from first attachment) */}
                {task.attachments && task.attachments.length > 0 && (
                    <div className={`${isMobile ? 'h-24' : 'h-32'} w-full flex-shrink-0 relative bg-gray-200 border-b border-gray-50`}>
                        <img 
                            src={task.attachments[0]} 
                            alt="cover" 
                            referrerPolicy="no-referrer" 
                            loading="lazy" 
                            className="w-full h-full object-cover" 
                        />
                    </div>
                )}

                <div className="p-4 flex flex-col flex-1 min-h-0">
                    <div className="flex items-start justify-between gap-2">
                        <h3 className={`font-bold leading-tight text-sm md:text-base flex-1 min-w-0 ${isCompleted ? 'line-through text-green-800' : isFailed ? 'line-through text-red-800' : 'text-gray-800'}`}>
                            {task.title}
                        </h3>
                        {/* Status Checkbox (Corner) */}
                        <div onClick={e => e.stopPropagation()}>
                            <button
                                onClick={handleCheck}
                                className={`flex-shrink-0 w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${isCompleted ? 'text-white' : 'border-gray-200 text-transparent'}`}
                                style={isCompleted ? { backgroundColor: catColor, borderColor: catColor } : {}}
                            >
                                <Check size={12} strokeWidth={4} />
                            </button>
                        </div>
                    </div>

                    {/* Description snippet */}
                    {task.description && (
                        <div 
                            className="text-[11px] text-gray-400 mt-2 line-clamp-2"
                            dangerouslySetInnerHTML={{ __html: task.description.replace(/<[^>]*>?/gm, ' ') }} 
                        />
                    )}

                    {/* Subtasks preview */}
                    {task.subtasks && task.subtasks.length > 0 && (
                        <div className="mt-3 space-y-1">
                            {task.subtasks.slice(0, isMobile ? 3 : Math.max(3, Math.floor((H - 130) / 20))).map(st => {
                                const isStCompleted = task.isRecurring ? (st.completedDates || []).includes(dateStr) : st.isCompleted;
                                return (
                                    <div key={st.id} className="flex items-center gap-2 text-[10px] text-gray-500">
                                        <div className={`w-2 h-2 rounded-full border ${isStCompleted ? 'bg-indigo-400 border-indigo-400' : 'border-gray-300'}`}></div>
                                        <span className={`truncate ${isStCompleted ? 'line-through opacity-70' : ''}`}>{st.title}</span>
                                    </div>
                                );
                            })}
                            {task.subtasks.length > (isMobile ? 3 : Math.max(3, Math.floor((H - 130) / 20))) && (
                                <div className="text-[9px] text-gray-400 pl-4">+{task.subtasks.length - (isMobile ? 3 : Math.max(3, Math.floor((H - 130) / 20)))} more</div>
                            )}
                        </div>
                    )}

                    {/* Quick Add Subtask Input */}
                    {isQuickAdding ? (
                        <form onSubmit={handleQuickAdd} className="mt-3" onClick={e => e.stopPropagation()}>
                            <input
                                type="text"
                                autoFocus
                                placeholder="Subtask title..."
                                value={quickTitle}
                                onChange={e => setQuickTitle(e.target.value)}
                                onBlur={() => !quickTitle && setIsQuickAdding(false)}
                                className="w-full text-[11px] px-2 py-1.5 bg-indigo-50/50 border border-indigo-100 rounded-lg outline-none focus:ring-1 focus:ring-indigo-300 font-medium"
                            />
                        </form>
                    ) : (
                        <button
                            onClick={e => { e.stopPropagation(); setIsQuickAdding(true); }}
                            className="mt-3 text-[10px] font-black uppercase tracking-widest text-indigo-400 hover:text-indigo-600 transition-colors flex items-center gap-1 w-fit"
                        >
                            + Subtask
                        </button>
                    )}

                    <div className="flex-1 min-h-[12px]"></div>

                    {/* Footer */}
                    <div className="flex flex-col gap-2 mt-auto pt-3 border-t border-gray-50/50">
                        <div className="flex flex-wrap gap-2 text-[10px] items-center">
                            {category && <span className="font-bold uppercase tracking-wider" style={{ color: catColor }}>{category.name}</span>}
                            {task.priority === 'high' && (
                                <span className="px-1.5 py-0.5 rounded text-red-600 bg-red-50 text-[9px] font-black uppercase">HIGH</span>
                            )}
                        </div>
                        <div className="flex items-center justify-between">
                            <div className="flex flex-wrap gap-x-3 gap-y-1 text-[9px] font-bold text-gray-400 opacity-60 uppercase tracking-tighter">
                                {task.dateAdded && <span>Added: {new Date(task.dateAdded).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</span>}
                                {task.dueDate && <span>Due: {formatDate(task.dueDate)}</span>}
                                {isCompleted && (task.completedAt || (task.isRecurring && task.completedDateTimes?.[dateStr])) && (
                                    <span className="text-green-600">Done: {new Date(task.completedAt || task.completedDateTimes?.[dateStr] || '').toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</span>
                                )}
                                {task.isRecurring && <span className="text-orange-500">{task.recurrence?.type}</span>}
                            </div>
                            
                            {/* Action Buttons (Small) */}
                            <div className="flex items-center gap-0.5" onClick={e => e.stopPropagation()}>
                                <button onClick={handleShare} className="p-1 text-gray-300 hover:text-indigo-500 rounded"><Share2 size={12} /></button>
                                <button onClick={handleFail} className={`p-1 rounded ${isFailed ? 'text-red-500 bg-red-50' : 'text-gray-300 hover:text-red-500'}`}><X size={13} strokeWidth={3} /></button>
                                <button onClick={handleDeleteClick} className="p-1 text-gray-300 hover:text-red-500 rounded"><Trash2 size={12} /></button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );

    if (isMobile) {
        return <div className="w-full">{cardContent}</div>;
    }

    return (
        <Resizable
            size={{ width: W, height: H }}
            minWidth={240}
            minHeight={140}
            onResizeStop={(_e, _direction, ref) => {
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
            className="group/resizer"
        >
            {cardContent}

            {/* Recurring Task Delete Modal */}
            {showDeleteModal && (
                <div 
                    className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
                    onClick={(e) => { e.stopPropagation(); setShowDeleteModal(false); }}
                >
                    <div className="bg-white rounded-xl shadow-xl p-5 max-w-sm w-full mx-4 cursor-default" onClick={(e) => e.stopPropagation()}>
                        <h3 className="text-lg font-semibold text-gray-900 mb-2">Delete Recurring Task</h3>
                        <p className="text-sm text-gray-500 mb-4">How would you like to delete this recurring task?</p>
                        
                        <div className="space-y-2">
                            <button
                                onClick={(e) => { e.stopPropagation(); handleDeleteInstance(); }}
                                className="w-full text-left px-4 py-2.5 rounded-lg text-sm text-gray-700 hover:bg-gray-50 transition-colors border border-gray-100"
                            >
                                <span className="font-medium text-gray-900 block">This event only</span>
                                <span className="text-xs text-gray-500">Other instances will remain untouched</span>
                            </button>
                            
                            <button
                                onClick={(e) => { e.stopPropagation(); handleDeleteFuture(); }}
                                className="w-full text-left px-4 py-2.5 rounded-lg text-sm text-gray-700 hover:bg-gray-50 transition-colors border border-gray-100"
                            >
                                <span className="font-medium text-gray-900 block">This and following events</span>
                                <span className="text-xs text-gray-500">Past instances will be preserved</span>
                            </button>
                            
                            <button
                                onClick={(e) => { e.stopPropagation(); handleDeleteAll(); }}
                                className="w-full text-left px-4 py-2.5 rounded-lg text-sm text-red-600 hover:bg-red-50 transition-colors border border-red-100"
                            >
                                <span className="font-medium block">All events</span>
                                <span className="text-xs opacity-80">Completely remove this task</span>
                            </button>
                        </div>
                        
                        <div className="mt-4 pt-4 border-t flex justify-end">
                            <button 
                                onClick={(e) => { e.stopPropagation(); setShowDeleteModal(false); }}
                                className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-900 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                            >
                                Cancel
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </Resizable>
    );
};

export default TaskItem;
