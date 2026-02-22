import React, { useState } from 'react';
import { useTaskStore, Task } from '../../store/taskStore';
import { Check, Calendar, RotateCcw, Tag, Trash2, Share2 } from 'lucide-react';

interface TaskItemProps {
    task: Task;
    dateContext?: string; // YYYY-MM-DD — which day we're viewing (for recurring completion)
}

const TaskItem: React.FC<TaskItemProps> = ({ task, dateContext }) => {
    const { toggleTaskCompletion, categories, deleteTask, setEditingTaskId } = useTaskStore();
    const [isHovered, setIsHovered] = useState(false);
    const [copied, setCopied] = useState(false);

    const category = categories.find(c => c.id === task.categoryId);
    const dateStr = dateContext || new Date().toISOString().split('T')[0];
    const isCompleted = task.isRecurring
        ? task.completedDates.includes(dateStr)
        : task.isCompleted;

    const handleCheck = (e: React.MouseEvent) => {
        e.stopPropagation();
        toggleTaskCompletion(task.id, dateStr);
    };

    const handleShare = (e: React.MouseEvent) => {
        e.stopPropagation();
        const text = `Task: ${task.title}\n${task.description ? `Description: ${task.description}\n` : ''}${task.dueDate ? `Due: ${new Date(task.dueDate).toLocaleDateString()}\n` : ''}`;

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
        return new Date(ds).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
    };

    // Category color tint for left border
    const borderColor = category?.color || 'transparent';

    return (
        <div
            className={`group flex items-start gap-3 p-3 rounded-lg border-l-4 hover:bg-white hover:shadow-sm transition-all cursor-pointer ${isCompleted ? 'opacity-60' : ''}`}
            style={{ borderLeftColor: borderColor, backgroundColor: isHovered ? '#fff' : 'transparent' }}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
            onClick={() => setEditingTaskId(task.id)}
        >
            {/* Checkbox */}
            <button
                onClick={handleCheck}
                className={`mt-0.5 flex-shrink-0 w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${isCompleted
                    ? 'text-white'
                    : 'border-gray-300 hover:border-indigo-400 text-transparent'
                    }`}
                style={isCompleted ? { backgroundColor: borderColor, borderColor: borderColor } : {}}
            >
                <Check size={11} strokeWidth={3} />
            </button>

            {/* Content */}
            <div className="flex-1 min-w-0">
                <div className={`text-sm font-medium ${isCompleted ? 'text-gray-400 line-through' : 'text-gray-800'}`}>
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
                </div>
            </div>

            {/* Actions */}
            <div className={`flex items-center gap-1 ${isHovered ? 'opacity-100' : 'opacity-0'} transition-opacity flex-shrink-0`}>
                <button
                    onClick={handleShare}
                    className={`p-1 rounded transition-colors ${copied ? 'text-green-500' : 'text-gray-400 hover:text-indigo-500 hover:bg-indigo-50'}`}
                    title={copied ? 'Copied!' : 'Share Task'}
                >
                    <Share2 size={13} />
                </button>
                <button
                    onClick={(e) => { e.stopPropagation(); if (confirm('Delete task?')) deleteTask(task.id); }}
                    className="p-1 text-gray-400 hover:text-red-500 hover:bg-rose-50 rounded transition-colors"
                    title="Delete"
                >
                    <Trash2 size={13} />
                </button>
            </div>
        </div>
    );
};

export default TaskItem;
