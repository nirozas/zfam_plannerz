import React, { useState, useRef, useEffect } from 'react';
import { useTaskStore, Task, Subtask, RecurrenceType, NotificationRule } from '../../store/taskStore';
import { X, Trash2, Loader2, Clock, Plus, Link as LinkIcon, Check, Pencil, ArrowLeft, Copy, Share2 } from 'lucide-react';
import TaskRichEditor from './TaskRichEditor';
import SubtaskList from './SubtaskList';
import DayOfWeekPicker from './DayOfWeekPicker';
import { toDateStr } from '../../utils/recurringUtils';

interface EditTaskModalProps {
    task: Task;
    onClose: () => void;
}

const EditTaskModal: React.FC<EditTaskModalProps> = ({ task, onClose }) => {
    const { categories, updateTask, deleteTask, duplicateTask, setEditingTaskId, toggleTaskCompletion, toggleTaskFailure, viewMode, activeDayDate } = useTaskStore();
    const fileInputRef = useRef<HTMLInputElement>(null);

    const [isEditing, setIsEditing] = useState(false);
    const [title, setTitle] = useState(task.title);
    const [description, setDescription] = useState(task.description || '');
    const [categoryId, setCategoryId] = useState(task.categoryId);
    const [priority, setPriority] = useState(task.priority);
    const [isRecurring, setIsRecurring] = useState(task.isRecurring);
    const [recurrenceType, setRecurrenceType] = useState<RecurrenceType>(task.recurrence?.type || 'daily');
    const [recurrenceStartDate, setRecurrenceStartDate] = useState(task.recurrence?.startDate || '');
    const [recurrenceEndDate, setRecurrenceEndDate] = useState(task.recurrence?.endDate || '');
    const [daysOfWeek, setDaysOfWeek] = useState<number[]>(task.recurrence?.daysOfWeek || []);
    const [dueDate, setDueDate] = useState(task.dueDate ? task.dueDate.split('T')[0] : '');
    const [dueTime, setDueTime] = useState(task.dueTime || '');
    const [notifications, setNotifications] = useState<NotificationRule[]>(task.notifications || []);

    // Sync task name to URL
    useEffect(() => {
        const originalUrl = window.location.href;
        if (!task.title) return;
        const slug = task.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '');
        const newUrl = new URL(window.location.href);
        newUrl.searchParams.set('task', slug);
        window.history.replaceState(null, '', newUrl.toString());
        return () => { window.history.replaceState(null, '', originalUrl); };
    }, [task.title]);

    const [subtasks, setSubtasks] = useState<Subtask[]>(task.subtasks || []);
    const [savedUrls, setSavedUrls] = useState<string[]>(task.attachments ?? []);
    const [newFiles, setNewFiles] = useState<File[]>([]);
    const [newPreviews, setNewPreviews] = useState<string[]>([]);
    const [isSaving, setIsSaving] = useState(false);
    const [isDuplicating, setIsDuplicating] = useState(false);
    const [urlInput, setUrlInput] = useState('');
    const [showUrlInput, setShowUrlInput] = useState(false);
    const [copied, setCopied] = useState(false);

    const baseDate = viewMode === 'day' ? activeDayDate : toDateStr(new Date());
    const dateStr = baseDate;
    const isCompleted = task.isRecurring ? task.completedDates.includes(dateStr) : task.isCompleted;
    const isFailed = task.isRecurring ? task.failedDates?.includes(dateStr) : task.isFailed;

    const handleShare = (e: React.MouseEvent) => {
        e.stopPropagation();
        const text = `Task: ${task.title}\n${task.description ? `Description: ${task.description}\n` : ''}${task.dueDate ? `Due: ${new Date(task.dueDate.includes('T') ? task.dueDate : task.dueDate + 'T12:00:00Z').toLocaleDateString()}\n` : ''}`;
        if (navigator.share) navigator.share({ title: task.title, text }).catch(() => navigator.clipboard.writeText(text));
        else navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const handleCheck = (e: React.MouseEvent) => {
        e.stopPropagation();
        toggleTaskCompletion(task.id, dateStr);
    };

    const handleFail = (e: React.MouseEvent) => {
        e.stopPropagation();
        toggleTaskFailure(task.id, dateStr);
    };

    const handleAddUrl = () => {
        if (!urlInput.trim()) return;
        setSavedUrls(prev => [...prev, urlInput.trim()]);
        setUrlInput('');
        setShowUrlInput(false);
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!e.target.files) return;
        const files = Array.from(e.target.files);
        setNewFiles(prev => [...prev, ...files]);
        setNewPreviews(prev => [...prev, ...files.map(f => URL.createObjectURL(f))]);
    };

    const removeNewFile = (i: number) => {
        URL.revokeObjectURL(newPreviews[i]);
        setNewFiles(prev => prev.filter((_, j) => j !== i));
        setNewPreviews(prev => prev.filter((_, j) => j !== i));
    };

    const handleSave = async (e?: React.FormEvent) => {
        if (e) e.preventDefault();
        setIsSaving(true);
        try {
            await updateTask(task.id, {
                title,
                description,
                categoryId,
                priority,
                isRecurring,
                recurrence: isRecurring ? {
                    type: recurrenceType,
                    daysOfWeek: recurrenceType === 'weekly' && daysOfWeek.length > 0 ? daysOfWeek : undefined,
                    startDate: recurrenceStartDate || undefined,
                    endDate: recurrenceEndDate || undefined,
                } : undefined,
                dueDate: !isRecurring ? (dueDate ? `${dueDate}T12:00:00Z` : null) : undefined,
                dueTime: dueTime ? dueTime : null,
                notifications,
                attachments: savedUrls,
                attachmentFiles: newFiles,
                subtasks,
            } as any);
            newPreviews.forEach(p => URL.revokeObjectURL(p));
            if (isEditing) setIsEditing(false);
            else onClose();
        } catch (err) {
            console.error('[EditTaskModal] save error:', err);
        } finally {
            setIsSaving(false);
        }
    };

    const handleSubtaskChangeInView = async (newSubtasks: Subtask[]) => {
        setSubtasks(newSubtasks);
        await updateTask(task.id, { subtasks: newSubtasks } as any);
    };

    const handleDelete = async () => {
        if (!confirm('Delete this task permanently?')) return;
        await deleteTask(task.id);
        onClose();
    };

    const handleDuplicate = async () => {
        setIsDuplicating(true);
        try {
            const newId = await duplicateTask(task.id);
            if (newId) {
                onClose();
                // Open the duplicate in edit mode immediately
                setTimeout(() => { setEditingTaskId(newId); }, 50);
            }
        } finally {
            setIsDuplicating(false);
        }
    };

    const category = categories.find(c => c.id === categoryId);

    return (
        <div className="fixed inset-0 z-[1100] bg-white flex flex-col animate-in fade-in slide-in-from-bottom-6 duration-500" onClick={onClose}>
            <div className="flex-1 flex flex-col bg-white overflow-hidden" onClick={e => e.stopPropagation()}>

                {/* Header accent strip */}
                <div className="h-2 w-full flex-shrink-0" style={{ backgroundColor: category?.color || '#6366f1' }}></div>

                {/* Top navigation bar */}
                <div className="flex items-center justify-between px-8 py-5 border-b border-gray-100 bg-white sticky top-0 z-20">
                    <div className="flex items-center gap-4">
                        <button onClick={onClose} className="flex items-center gap-2 px-3 py-2 hover:bg-indigo-50 rounded-xl text-gray-400 hover:text-indigo-600 transition-all group">
                            <ArrowLeft size={20} className="group-hover:-translate-x-1 transition-transform" />
                            <span className="text-[10px] font-black uppercase tracking-widest">Back to Tasks</span>
                        </button>
                        <div className="h-6 w-px bg-gray-100 mx-1"></div>
                        <div className="flex items-center gap-2">
                            {!isEditing ? (
                                <button onClick={() => setIsEditing(true)} className="flex items-center gap-2 text-xs font-black uppercase tracking-widest text-indigo-600 hover:bg-indigo-50 px-4 py-2 rounded-xl transition-all">
                                    <Pencil size={14} /> Open Editor
                                </button>
                            ) : (
                                <button onClick={() => setIsEditing(false)} className="flex items-center gap-2 text-xs font-black uppercase tracking-widest text-gray-500 hover:bg-gray-100 px-4 py-2 rounded-xl transition-all">
                                    View Protocol
                                </button>
                            )}
                        </div>
                    </div>
                    <div className="flex items-center gap-2 md:gap-3">
                        <button onClick={handleShare} className={`p-1.5 rounded-lg transition-all ${copied ? 'text-green-500' : 'text-gray-400 hover:text-indigo-600 hover:bg-indigo-50'}`} title="Share">
                            <Share2 size={16} />
                        </button>
                        <button onClick={handleFail} className={`p-1.5 rounded-lg transition-all ${isFailed ? 'text-red-500 bg-red-50' : 'text-gray-400 hover:text-red-500 hover:bg-red-50'}`} title="Mark failed">
                            <X size={16} strokeWidth={3} />
                        </button>
                        <button onClick={handleCheck} className={`p-1.5 rounded-lg transition-all ${isCompleted ? 'text-green-500 bg-green-50' : 'text-gray-400 hover:text-green-500 hover:bg-green-50'}`} title="Mark complete">
                            <Check size={16} strokeWidth={3} />
                        </button>
                        <button onClick={handleDelete} className="p-1.5 rounded-lg transition-all text-gray-400 hover:text-red-600 hover:bg-red-50" title="Delete Task">
                            <Trash2 size={16} />
                        </button>

                        <div className="w-px h-6 bg-gray-200 mx-1 hidden sm:block"></div>

                        <button
                            onClick={handleDuplicate}
                            disabled={isDuplicating}
                            title="Duplicate this task"
                            className="flex items-center gap-2 text-xs font-black uppercase tracking-widest text-gray-500 hover:text-indigo-600 hover:bg-indigo-50 px-3 py-2 rounded-xl transition-all disabled:opacity-50"
                        >
                            {isDuplicating ? <Loader2 size={14} className="animate-spin" /> : <Copy size={14} />}
                            <span className="hidden sm:inline">{isDuplicating ? 'Duplicating...' : 'Duplicate'}</span>
                        </button>
                        {isEditing && (
                            <button onClick={handleSave} disabled={isSaving}
                                className="bg-indigo-600 text-white px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest shadow-lg shadow-indigo-100 hover:bg-indigo-700 disabled:opacity-50 flex items-center gap-2 transition-all active:scale-95">
                                {isSaving ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />}
                                {isSaving ? 'Synchronizing...' : 'Save Intel'}
                            </button>
                        )}
                    </div>
                </div>

                {/* Scrollable body – full width */}
                <div className="overflow-y-auto flex-1 custom-scrollbar bg-gray-50/30">
                    <div className="w-full p-6 md:p-10 space-y-10">

                        {/* Title */}
                        <div className="space-y-2">
                            {isEditing ? (
                                <input type="text" required value={title} onChange={e => setTitle(e.target.value)}
                                    className="w-full text-3xl font-black border-none focus:ring-0 placeholder-gray-200 bg-transparent text-gray-800"
                                    placeholder="Task title..." autoFocus />
                            ) : (
                                <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                                    <h2 className="text-3xl font-black text-gray-800 leading-tight">{title}</h2>
                                    {activeDayDate && (
                                        <div className="text-indigo-600 bg-indigo-50 px-4 py-1.5 rounded-2xl text-[11px] font-black uppercase tracking-widest shadow-sm border border-indigo-100/30 flex items-center gap-2 w-fit">
                                            <div className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-pulse"></div>
                                            Viewing: {(() => {
                                                const [y, m, d] = activeDayDate.split('-').map(Number);
                                                return new Date(y, m - 1, d).toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' });
                                            })()}
                                        </div>
                                    )}
                                </div>
                            )}

                            {!isEditing && (
                                <div className="flex flex-wrap gap-x-4 gap-y-1 text-[10px] font-black uppercase tracking-widest text-gray-400">
                                    {task.dateAdded && (
                                        <div className="flex items-center gap-2">
                                            <div className="w-1.5 h-1.5 rounded-full bg-indigo-400"></div> Added: {new Date(task.dateAdded).toLocaleString()}
                                        </div>
                                    )}
                                    {task.dueDate && (
                                        <div className="flex items-center gap-2">
                                            <div className="w-1.5 h-1.5 rounded-full bg-orange-400"></div> Due: {new Date(task.dueDate.includes('T') ? task.dueDate : `${task.dueDate}T12:00:00Z`).toLocaleString()}
                                        </div>
                                    )}
                                    {isCompleted && (task.completedAt || (task.isRecurring && task.completedDateTimes?.[activeDayDate || ''])) && (
                                        <div className="flex items-center gap-2 text-green-600">
                                            <div className="w-1.5 h-1.5 rounded-full bg-green-500"></div> Done: {new Date(task.completedAt || task.completedDateTimes?.[activeDayDate || ''] || '').toLocaleString()}
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>

                        {/* ── 2-col: Description + Meta sidebar ── */}
                        {/* ── 2-col: Subtasks (Main) + Sidebar (Right) ── */}
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">

                            {/* Main Area (left, 2/3 width) */}
                            <div className="lg:col-span-2 space-y-10 order-2 lg:order-1">
                                <div className="space-y-4">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 flex items-center justify-between gap-2">
                                        <div className="flex items-center gap-2">
                                            <div className="w-1.5 h-1.5 rounded-full bg-indigo-400"></div> Subtasks List
                                        </div>
                                        {subtasks.length > 0 && (
                                            <div className="flex items-center gap-2">
                                                <div className="bg-green-50 text-green-600 px-3 py-1 rounded-xl text-[9px] font-black border border-green-100 shadow-sm">
                                                    {subtasks.filter(s => task.isRecurring && activeDayDate ? (s.completedDates || []).includes(activeDayDate) : s.isCompleted).length} / {subtasks.length} Completed
                                                </div>
                                                <div className="bg-red-50 text-red-600 px-3 py-1 rounded-xl text-[9px] font-black border border-red-100 shadow-sm">
                                                    {subtasks.filter(s => task.isRecurring && activeDayDate ? (s.failedDates || []).includes(activeDayDate) : s.isFailed).length} / {subtasks.length} Failed
                                                </div>
                                            </div>
                                        )}
                                    </label>
                                    <div className="bg-white rounded-2xl p-5 border border-indigo-100/30 shadow-sm">
                                        <SubtaskList
                                            subtasks={subtasks}
                                            onChange={isEditing ? setSubtasks : handleSubtaskChangeInView}
                                            readOnly={!isEditing}
                                            dateContext={dateStr}
                                            isRecurring={task.isRecurring}
                                        />
                                    </div>
                                </div>

                                {/* Gallery (view mode) */}
                                {!isEditing && savedUrls.length > 0 && (
                                    <div className="space-y-4">
                                        <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 flex items-center gap-2">
                                            <div className="w-1.5 h-1.5 rounded-full bg-indigo-400"></div> Gallery
                                        </label>
                                        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                                            {savedUrls.map((url, i) => (
                                                <div key={i} className="aspect-video rounded-xl overflow-hidden shadow-sm border border-gray-100 group">
                                                    <img src={url} alt="" referrerPolicy="no-referrer"
                                                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" />
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>

                            <div className="lg:col-span-1 space-y-6 order-1 lg:order-2 flex flex-col">
                                <div className="bg-slate-100/80 border border-slate-200 p-8 rounded-[40px] space-y-8 h-fit lg:sticky lg:top-24 shadow-inner">
                                    {/* Task Performance (Sticky Stats) */}
                                    {isRecurring && !isEditing && (
                                        <div className="grid grid-cols-1 gap-4">
                                            {/* Weekly Stats */}
                                            <div className="bg-white/80 p-5 rounded-[28px] border border-slate-200/50 space-y-3 shadow-sm">
                                                <div className="text-[10px] font-black uppercase tracking-widest text-slate-400 flex items-center gap-2">
                                                    <div className="w-1 h-1 rounded-full bg-indigo-300"></div> Weekly Performance
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <div className="flex-1 bg-green-50 text-green-600 text-[11px] font-black px-3 py-2 rounded-xl text-center border border-green-100/50">
                                                        {(() => {
                                                            const [Ay, Am, Ad] = (activeDayDate || toDateStr(new Date())).split('-').map(Number);
                                                            const activeDate = new Date(Ay, Am - 1, Ad);
                                                            const startOfWeek = new Date(activeDate);
                                                            startOfWeek.setDate(activeDate.getDate() - activeDate.getDay());
                                                            startOfWeek.setHours(0,0,0,0);
                                                            const endOfWeek = new Date(startOfWeek);
                                                            endOfWeek.setDate(startOfWeek.getDate() + 6);
                                                            endOfWeek.setHours(23,59,59,999);
                                                            
                                                            return task.completedDates.filter(d => {
                                                                const [y, m, d_] = d.split('-').map(Number);
                                                                const date = new Date(y, m - 1, d_);
                                                                return date >= startOfWeek && date <= endOfWeek;
                                                            }).length;
                                                        })()} Done
                                                    </div>
                                                    <div className="flex-1 bg-red-50 text-red-600 text-[11px] font-black px-3 py-2 rounded-xl text-center border border-red-100/50">
                                                            {(() => {
                                                            const [Ay, Am, Ad] = (activeDayDate || toDateStr(new Date())).split('-').map(Number);
                                                            const activeDate = new Date(Ay, Am - 1, Ad);
                                                            const startOfWeek = new Date(activeDate);
                                                            startOfWeek.setDate(activeDate.getDate() - activeDate.getDay());
                                                            startOfWeek.setHours(0,0,0,0);
                                                            const endOfWeek = new Date(startOfWeek);
                                                            endOfWeek.setDate(startOfWeek.getDate() + 6);
                                                            endOfWeek.setHours(23,59,59,999);
                                                            
                                                            return (task.failedDates || []).filter(d => {
                                                                const [y, m, d_] = d.split('-').map(Number);
                                                                const date = new Date(y, m - 1, d_);
                                                                return date >= startOfWeek && date <= endOfWeek;
                                                            }).length;
                                                        })()} Fail
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Monthly Stats */}
                                            <div className="bg-white/80 p-5 rounded-[28px] border border-slate-200/50 space-y-3 shadow-sm">
                                                <div className="text-[10px] font-black uppercase tracking-widest text-slate-400 flex items-center gap-2">
                                                    <div className="w-1 h-1 rounded-full bg-indigo-300"></div> Monthly Performance
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <div className="flex-1 bg-green-50 text-green-600 text-[11px] font-black px-3 py-2 rounded-xl text-center border border-green-100/50">
                                                        {(() => {
                                                            const [Ay, Am] = (activeDayDate || toDateStr(new Date())).split('-').map(Number);
                                                            const month = Am - 1;
                                                            const year = Ay;
                                                            return task.completedDates.filter(d => {
                                                                const [y, m] = d.split('-').map(Number);
                                                                return (m - 1) === month && y === year;
                                                            }).length;
                                                        })()} Done
                                                    </div>
                                                    <div className="flex-1 bg-red-50 text-red-600 text-[11px] font-black px-3 py-2 rounded-xl text-center border border-red-100/50">
                                                        {(() => {
                                                            const [Ay, Am] = (activeDayDate || toDateStr(new Date())).split('-').map(Number);
                                                            const month = Am - 1;
                                                            const year = Ay;
                                                            return (task.failedDates || []).filter(d => {
                                                                const [y, m] = d.split('-').map(Number);
                                                                return (m - 1) === month && y === year;
                                                            }).length;
                                                        })()} Fail
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    {/* Category */}
                                    <div className="space-y-4">
                                        <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 flex items-center gap-2">
                                            <div className="w-1.5 h-1.5 rounded-full bg-slate-300"></div> Category Identity
                                        </label>
                                        {isEditing ? (
                                            <select value={categoryId} onChange={e => setCategoryId(e.target.value)}
                                                className="w-full bg-white border-slate-200 rounded-2xl text-sm font-bold text-slate-700 focus:ring-4 focus:ring-indigo-50 transition-all">
                                                {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                                            </select>
                                        ) : (
                                            <div className="flex items-center gap-3 text-[13px] font-black text-slate-700 bg-white px-5 py-4 rounded-[22px] border border-slate-200/50 w-full shadow-sm group hover:border-indigo-200 transition-all">
                                                <div className="w-3 h-3 rounded-full shadow-sm" style={{ backgroundColor: category?.color }}></div>
                                                <span className="uppercase tracking-widest">{category?.name}</span>
                                            </div>
                                        )}
                                    </div>

                                    {/* Description */}
                                    <div className="space-y-4">
                                        <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 flex items-center gap-2">
                                            <div className="w-1.5 h-1.5 rounded-full bg-slate-300"></div> Core Description
                                        </label>
                                        <div className={`${isEditing ? 'border-2 border-indigo-100 rounded-[28px] bg-white shadow-xl' : 'bg-white/40 backdrop-blur-sm rounded-[28px] border border-white/60 p-1'} transition-all min-h-[120px] overflow-hidden`}>
                                            <TaskRichEditor value={description} onChange={setDescription}
                                                placeholder="Clarify the mission details..." readOnly={!isEditing} />
                                        </div>
                                    </div>

                                    {/* Meta info */}
                                    <div className="grid grid-cols-1 gap-6 pt-4 border-t border-gray-200">
                                        {/* Priority */}
                                        <div>
                                            <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 block mb-2">Priority Level</label>
                                            {isEditing ? (
                                                <select value={priority} onChange={e => setPriority(e.target.value as any)}
                                                    className="w-full bg-white border-gray-200 rounded-xl text-sm font-bold text-gray-700 focus:ring-2 focus:ring-indigo-100">
                                                    <option value="low">Low</option>
                                                    <option value="medium">Medium</option>
                                                    <option value="high">High</option>
                                                </select>
                                            ) : (
                                                <div className={`text-[10px] font-black uppercase tracking-tighter px-3 py-1.5 rounded-full w-fit shadow-sm
                                                    ${priority === 'high' ? 'bg-red-500 text-white' : priority === 'medium' ? 'bg-orange-500 text-white' : 'bg-blue-500 text-white'}`}>
                                                    {priority} priority
                                                </div>
                                            )}
                                        </div>

                                        {/* Timing */}
                                        <div>
                                            <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 block mb-2">Operation Timing</label>
                                            {!isEditing ? (
                                                <div className="space-y-4">
                                                    <div className="text-xs font-bold text-gray-600 flex items-center gap-2 bg-white/50 p-3 rounded-xl border border-gray-100">
                                                        <Clock size={16} className="text-indigo-400" />
                                                        {isRecurring
                                                            ? `${recurrenceType} recurrence${recurrenceType === 'weekly' && daysOfWeek.length > 0 ? ' · ' + daysOfWeek.map(d => ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'][d]).join('/') : ''}`
                                                            : dueDate
                                                                ? `${new Date(dueDate.includes('T') ? dueDate : `${dueDate}T12:00:00Z`).toLocaleDateString()} ${task.dueTime || ''}`
                                                                : 'No schedule'}
                                                    </div>
                                                </div>
                                            ) : (
                                                <div className="space-y-4 bg-white/50 p-3 rounded-2xl border border-gray-200">
                                                    <label className="flex items-center gap-2 cursor-pointer group">
                                                        <input type="checkbox" checked={isRecurring} onChange={e => setIsRecurring(e.target.checked)}
                                                            className="w-4 h-4 rounded-md text-indigo-600 focus:ring-offset-0 focus:ring-indigo-200 border-gray-300 bg-white" />
                                                        <span className="text-xs font-bold text-gray-500 group-hover:text-gray-700 transition-colors">Recurring Operation</span>
                                                    </label>
                                                    {isRecurring ? (
                                                        <div className="space-y-3 pl-4 border-l-2 border-indigo-200">
                                                            <select value={recurrenceType} onChange={e => setRecurrenceType(e.target.value as RecurrenceType)}
                                                                className="w-full bg-white border-gray-100 rounded-lg text-xs font-bold focus:ring-2 focus:ring-indigo-100 py-1.5 px-3">
                                                                <option value="daily">Daily</option>
                                                                <option value="weekly">Weekly</option>
                                                                <option value="monthly">Monthly</option>
                                                                <option value="yearly">Yearly</option>
                                                            </select>
                                                            {recurrenceType === 'weekly' && <DayOfWeekPicker selected={daysOfWeek} onChange={setDaysOfWeek} />}
                                                            <div className="space-y-2">
                                                                <input type="date" value={recurrenceStartDate} onChange={e => setRecurrenceStartDate(e.target.value)}
                                                                    className="w-full bg-white border-gray-100 rounded-lg text-[10px] font-bold py-1.5 px-3" />
                                                                <input type="date" value={recurrenceEndDate} placeholder="End date" onChange={e => setRecurrenceEndDate(e.target.value)}
                                                                    className="w-full bg-white border-gray-100 rounded-lg text-[10px] font-bold py-1.5 px-3" title="End Date" />
                                                            </div>
                                                        </div>
                                                    ) : (
                                                        <div className="space-y-3">
                                                            <div className="grid grid-cols-1 gap-2">
                                                                <input type="date" value={dueDate} onChange={e => setDueDate(e.target.value)}
                                                                    className="w-full bg-white border-gray-100 rounded-lg text-xs font-bold px-3 py-2" />
                                                                <input type="time" value={dueTime} onChange={e => setDueTime(e.target.value)}
                                                                    className="w-full bg-white border-gray-100 rounded-lg text-xs font-bold px-3 py-2" />
                                                            </div>
                                                            <div className="flex flex-col gap-2">
                                                                {notifications.map((n, i) => (
                                                                    <div key={i} className="flex items-center justify-between bg-white text-indigo-700 text-[10px] font-black px-3 py-2 rounded-lg border border-indigo-100 shadow-sm">
                                                                        <span>{n.value} {n.type.replace('_before', ' before')}</span>
                                                                        <button type="button" onClick={() => setNotifications(prev => prev.filter((_, idx) => idx !== i))} className="text-red-400 hover:text-red-600">
                                                                            <X size={12} />
                                                                        </button>
                                                                    </div>
                                                                ))}
                                                                <select className="w-full bg-white border border-gray-100 rounded-lg px-2 py-2 text-[10px] font-black text-gray-500 uppercase tracking-widest"
                                                                    value=""
                                                                    onChange={(e) => {
                                                                        if (!e.target.value) return;
                                                                        const [valStr, type] = e.target.value.split('-');
                                                                        setNotifications([...notifications, { id: crypto.randomUUID(), type: type as any, value: parseInt(valStr) }]);
                                                                    }}>
                                                                    <option value="">+ Notification</option>
                                                                    <option value="15-minutes_before">15m</option>
                                                                    <option value="30-minutes_before">30m</option>
                                                                    <option value="1-hours_before">1h</option>
                                                                    <option value="1-days_before">1d</option>
                                                                </select>
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    {/* Attachments */}
                                    {isEditing && (
                                        <div className="pt-6 border-t border-gray-200">
                                            <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 block mb-3">Attachments</label>
                                            <div className="space-y-4">
                                                <div className="grid grid-cols-2 gap-2">
                                                    <button type="button" onClick={() => fileInputRef.current?.click()}
                                                        className="flex items-center justify-center gap-2 border border-gray-300 rounded-xl py-2.5 text-[10px] font-black uppercase bg-white hover:bg-gray-50 transition-colors">
                                                        <Plus size={12} /> Files
                                                    </button>
                                                    <button type="button" onClick={() => setShowUrlInput(!showUrlInput)}
                                                        className="flex items-center justify-center gap-2 border border-gray-300 rounded-xl py-2.5 text-[10px] font-black uppercase bg-white hover:bg-gray-50 transition-colors">
                                                        <LinkIcon size={12} /> Link
                                                    </button>
                                                </div>
                                                {showUrlInput && (
                                                    <div className="flex gap-2">
                                                        <input type="text" value={urlInput} onChange={(e) => setUrlInput(e.target.value)}
                                                            className="flex-1 bg-white border-gray-200 rounded-xl px-3 py-2 text-xs font-bold"
                                                            placeholder="URL..."
                                                            onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddUrl())} />
                                                        <button type="button" onClick={handleAddUrl} className="bg-indigo-600 text-white px-4 py-2 rounded-xl text-xs font-bold">Add</button>
                                                    </div>
                                                )}
                                                <input type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden" accept="image/*" multiple />
                                                <div className="flex flex-wrap gap-2">
                                                    {[...savedUrls, ...newPreviews].map((url, i) => (
                                                        <div key={i} className="relative w-10 h-10 rounded-lg overflow-hidden border border-gray-200 group">
                                                            <img src={url} alt="" className="w-full h-full object-cover" />
                                                            <button type="button" onClick={() => i < savedUrls.length ? setSavedUrls(p => p.filter((_, j) => j !== i)) : removeNewFile(i - savedUrls.length)}
                                                                className="absolute inset-0 bg-red-500/80 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                                                <X size={12} className="text-white" />
                                                            </button>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>



                    </div>{/* end w-full wrapper */}
                </div>{/* end overflow-y-auto */}
            </div>{/* end flex-col body */}
        </div>
    );
};

export default EditTaskModal;
