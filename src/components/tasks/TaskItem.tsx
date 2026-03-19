import React, { useState } from 'react';
import { useTaskStore, Task } from '../../store/taskStore';
import { Check, Calendar, RotateCcw, Tag, Trash2, Share2, X } from 'lucide-react';

interface TaskItemProps {
    task: Task;
    dateContext?: string; // YYYY-MM-DD — which day we're viewing (for recurring completion)
}

const TaskItem: React.FC<TaskItemProps> = ({ task, dateContext }) => {
    const { toggleTaskCompletion, toggleTaskFailure, categories, deleteTask, updateTask, setEditingTaskId } = useTaskStore();
    const [isHovered, setIsHovered] = useState(false);
    const [copied, setCopied] = useState(false);
    const [showDeleteModal, setShowDeleteModal] = useState(false);

    const category = categories.find(c => c.id === task.categoryId);
    const dateStr = dateContext || new Date().toISOString().split('T')[0];
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

        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const formatDate = (ds?: string) => {
        if (!ds) return '';
        const dateStr = ds.includes('T') ? ds : `${ds}T12:00:00Z`;
        return new Date(dateStr).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
    };

    // Category color tint for left border
    const borderColor = category?.color || 'transparent';

    return (
        <div
            className={`group flex items-start gap-3 p-3 rounded-lg border-l-4 hover:shadow-sm transition-all cursor-pointer ${isCompleted ? 'bg-green-100 opacity-90' : isFailed ? 'bg-red-100 opacity-90' : 'hover:bg-white'}`}
            style={{ borderLeftColor: borderColor, backgroundColor: (!isCompleted && !isFailed && isHovered) ? '#fff' : undefined }}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
            onClick={() => setEditingTaskId(task.id)}
        >
            {/* Checkbox - Increased hit area for mobile */}
            <div className="relative z-10 p-1 -m-1" onClick={e => e.stopPropagation()}>
                <button
                    onClick={handleCheck}
                    className={`mt-0.5 flex-shrink-0 w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${isCompleted
                        ? 'text-white'
                        : 'border-gray-300 hover:border-indigo-400 text-transparent'
                        }`}
                    style={isCompleted ? { backgroundColor: borderColor, borderColor: borderColor } : {}}
                >
                    <Check size={14} strokeWidth={3} />
                </button>
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0">
                <div className={`text-sm font-medium ${isCompleted ? 'text-green-800 line-through' : isFailed ? 'text-red-800 line-through' : 'text-gray-800'}`}>
                    {task.title}
                </div>

                {task.description && (
                    <div className="text-xs text-gray-500 mt-0.5 line-clamp-2">{task.description}</div>
                )}

                <div className="flex items-center flex-wrap gap-2 mt-1.5 text-xs">
                    {task.dueDate && (
                        <span className="flex items-center gap-1 text-gray-400">
                            <Calendar size={11} /> {formatDate(task.dueDate)}
                        </span>
                    )}
                    {task.isRecurring && (
                        <span className="flex items-center gap-1 text-orange-500">
                            <RotateCcw size={11} /> {task.recurrence?.type}
                        </span>
                    )}
                    {category && (
                        <span className="flex items-center gap-1 px-1.5 py-0.5 rounded-full text-white text-[10px] font-medium" style={{ backgroundColor: category.color }}>
                            <Tag size={9} /> {category.name}
                        </span>
                    )}
                    {task.priority === 'high' && (
                        <span className="px-1.5 py-0.5 rounded text-red-600 bg-red-50 text-[10px] font-semibold">HIGH</span>
                    )}
                    {isCompleted && (
                        <span className="text-green-600 font-medium">
                            Done: {task.isRecurring
                                ? (task.completedDateTimes?.[new Date().toISOString().split('T')[0]] ? new Date(task.completedDateTimes[new Date().toISOString().split('T')[0]]).toLocaleString([], { month: 'numeric', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '')
                                : (task.completedAt ? new Date(task.completedAt).toLocaleString([], { month: 'numeric', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '')}
                        </span>
                    )}
                </div>
            </div>

            {/* Actions – always visible */}
            <div className="flex items-center gap-1 flex-shrink-0">
                <button
                    onClick={handleShare}
                    className={`p-1 rounded transition-colors ${copied ? 'text-green-500' : 'text-gray-400 hover:text-indigo-500 hover:bg-indigo-50'}`}
                    title={copied ? 'Copied!' : 'Share Task'}
                >
                    <Share2 size={13} />
                </button>
                <button
                    onClick={handleFail}
                    className={`p-1 rounded transition-colors ${isFailed ? 'text-red-600 bg-red-100' : 'text-gray-400 hover:text-red-500 hover:bg-red-50'}`}
                    title={isFailed ? 'Unmark failed' : 'Mark as failed'}
                >
                    <X size={13} strokeWidth={3} />
                </button>
                <button
                    onClick={handleCheck}
                    className={`p-1 rounded transition-colors ${isCompleted ? 'text-green-600 bg-green-100' : 'text-gray-400 hover:text-green-500 hover:bg-green-50'}`}
                    title={isCompleted ? 'Unmark complete' : 'Mark complete'}
                >
                    <Check size={13} strokeWidth={3} />
                </button>
                <button
                    onClick={handleDeleteClick}
                    className="p-1 text-gray-300 hover:text-red-500 hover:bg-rose-50 rounded transition-colors"
                    title="Delete"
                >
                    <Trash2 size={13} />
                </button>
            </div>

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
        </div>
    );
};

export default TaskItem;
