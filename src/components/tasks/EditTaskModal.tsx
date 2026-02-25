import React, { useState, useRef, useEffect } from 'react';
import { useTaskStore, Task, Subtask, RecurrenceType, NotificationRule } from '../../store/taskStore';
import { X, Trash2, Loader2, Clock, Plus, Link as LinkIcon, Check, Pencil, ArrowLeft, Bell } from 'lucide-react';
import TaskRichEditor from './TaskRichEditor';
import SubtaskList from './SubtaskList';

interface EditTaskModalProps {
    task: Task;
    onClose: () => void;
}

const EditTaskModal: React.FC<EditTaskModalProps> = ({ task, onClose }) => {
    const { categories, updateTask, deleteTask } = useTaskStore();
    const fileInputRef = useRef<HTMLInputElement>(null);

    const [isEditing, setIsEditing] = useState(false); // Task View is default
    const [title, setTitle] = useState(task.title);
    const [description, setDescription] = useState(task.description || '');
    const [categoryId, setCategoryId] = useState(task.categoryId);
    const [priority, setPriority] = useState(task.priority);
    const [isRecurring, setIsRecurring] = useState(task.isRecurring);
    const [recurrenceType, setRecurrenceType] = useState<RecurrenceType>(task.recurrence?.type || 'daily');
    const [recurrenceStartDate, setRecurrenceStartDate] = useState(task.recurrence?.startDate || '');
    const [recurrenceEndDate, setRecurrenceEndDate] = useState(task.recurrence?.endDate || '');
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

        return () => {
            window.history.replaceState(null, '', originalUrl);
        };
    }, [task.title]);

    // New Features state
    const [subtasks, setSubtasks] = useState(task.subtasks || []);

    // Existing saved URLs (Storage public URLs)
    const [savedUrls, setSavedUrls] = useState<string[]>(task.attachments ?? []);
    // New files chosen by user (uploaded on save)
    const [newFiles, setNewFiles] = useState<File[]>([]);
    const [newPreviews, setNewPreviews] = useState<string[]>([]);

    const [isSaving, setIsSaving] = useState(false);
    const [urlInput, setUrlInput] = useState('');
    const [showUrlInput, setShowUrlInput] = useState(false);

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
            if (isEditing) setIsEditing(false); // Switch back to view mode after save
            else onClose(); // If saving from view (e.g. subtask toggle), we might just stay or close
        } catch (err) {
            console.error('[EditTaskModal] save error:', err);
        } finally {
            setIsSaving(false);
        }
    };

    // Auto-save subtask changes in view mode if items are toggled
    const handleSubtaskChangeInView = async (newSubtasks: Subtask[]) => {
        setSubtasks(newSubtasks);
        // We don't necessarily need to perform a full save on every toggle if we want to avoid DB noise,
        // but for immediate feedback across devices, we can.
    };

    const handleDelete = async () => {
        if (!confirm('Delete this task permanently?')) return;
        await deleteTask(task.id);
        onClose();
    };

    const category = categories.find(c => c.id === categoryId);

    return (
        <div className="fixed inset-0 z-[100] bg-white flex flex-col animate-in fade-in slide-in-from-bottom-6 duration-500" onClick={onClose}>
            <div className="flex-1 flex flex-col bg-white overflow-hidden" onClick={e => e.stopPropagation()}>

                {/* Header with Background Accent */}
                <div className="h-2 w-full flex-shrink-0" style={{ backgroundColor: category?.color || '#6366f1' }}></div>

                <div className="flex items-center justify-between px-8 py-5 border-b border-gray-100 bg-white sticky top-0 z-20">
                    <div className="flex items-center gap-4">
                        <button
                            onClick={onClose}
                            className="flex items-center gap-2 px-3 py-2 hover:bg-indigo-50 rounded-xl text-gray-400 hover:text-indigo-600 transition-all group"
                        >
                            <ArrowLeft size={20} className="group-hover:-translate-x-1 transition-transform" />
                            <span className="text-[10px] font-black uppercase tracking-widest">Back to Tasks</span>
                        </button>
                        <div className="h-6 w-px bg-gray-100 mx-1"></div>
                        <div className="flex items-center gap-2">
                            {!isEditing ? (
                                <button
                                    onClick={() => setIsEditing(true)}
                                    className="flex items-center gap-2 text-xs font-black uppercase tracking-widest text-indigo-600 hover:bg-indigo-50 px-4 py-2 rounded-xl transition-all"
                                >
                                    <Pencil size={14} /> Open Editor
                                </button>
                            ) : (
                                <button
                                    onClick={() => setIsEditing(false)}
                                    className="flex items-center gap-2 text-xs font-black uppercase tracking-widest text-gray-500 hover:bg-gray-100 px-4 py-2 rounded-xl transition-all"
                                >
                                    View Protocol
                                </button>
                            )}
                        </div>
                    </div>
                    <div className="flex items-center gap-3">
                        {isEditing && (
                            <button onClick={handleSave} disabled={isSaving} className="bg-indigo-600 text-white px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest shadow-lg shadow-indigo-100 hover:bg-indigo-700 disabled:opacity-50 flex items-center gap-2 transition-all active:scale-95">
                                {isSaving ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />}
                                {isSaving ? 'Synchronizing...' : 'Save Intel'}
                            </button>
                        )}
                    </div>
                </div>

                <div className="overflow-y-auto flex-1 custom-scrollbar bg-gray-50/30">
                    <div className="max-w-5xl mx-auto w-full p-10 space-y-12">

                        {/* Title Section */}
                        {isEditing ? (
                            <input
                                type="text" required value={title} onChange={e => setTitle(e.target.value)}
                                className="w-full text-3xl font-black border-none focus:ring-0 placeholder-gray-200 bg-transparent text-gray-800"
                                placeholder="Task title..."
                                autoFocus
                            />
                        ) : (
                            <h2 className="text-3xl font-black text-gray-800 leading-tight">
                                {title}
                            </h2>
                        )}

                        {/* Content Grid */}
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

                            {/* Main Content Area */}
                            <div className="lg:col-span-2 space-y-8">

                                {/* Description Section */}
                                <div className="space-y-3">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 flex items-center gap-2">
                                        <div className="w-1.5 h-1.5 rounded-full bg-indigo-400"></div> Description
                                    </label>
                                    <div className={`${isEditing ? 'border border-gray-100 rounded-xl bg-white shadow-sm' : ''} transition-all`}>
                                        <TaskRichEditor
                                            value={description}
                                            onChange={setDescription}
                                            placeholder="No description provided."
                                            readOnly={!isEditing}
                                        />
                                    </div>
                                </div>

                                {/* Subtasks Section */}
                                <div className="space-y-4">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 flex items-center gap-2">
                                        <div className="w-1.5 h-1.5 rounded-full bg-indigo-400"></div> Subtasks
                                    </label>
                                    <div className="bg-gray-50/50 rounded-2xl p-5 border border-gray-100/50">
                                        <SubtaskList
                                            subtasks={subtasks}
                                            onChange={isEditing ? setSubtasks : handleSubtaskChangeInView}
                                            readOnly={!isEditing}
                                        />
                                    </div>
                                </div>

                                {/* Large Attachments View */}
                                {!isEditing && savedUrls.length > 0 && (
                                    <div className="space-y-4">
                                        <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 flex items-center gap-2">
                                            <div className="w-1.5 h-1.5 rounded-full bg-indigo-400"></div> Gallery
                                        </label>
                                        <div className="grid grid-cols-2 gap-4">
                                            {savedUrls.map((url, i) => (
                                                <div key={i} className="aspect-video rounded-xl overflow-hidden shadow-sm border border-gray-100 group">
                                                    <img src={url} alt="" referrerPolicy="no-referrer" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" />
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Sidebar/Meta Area */}
                            <div className="space-y-8 flex flex-col">

                                {/* Metadata Section */}
                                <div className="bg-white border border-gray-100 p-5 rounded-2xl space-y-6">
                                    <div>
                                        <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 block mb-2">Category</label>
                                        {isEditing ? (
                                            <select value={categoryId} onChange={e => setCategoryId(e.target.value)} className="w-full bg-gray-50 border-none rounded-xl text-sm font-bold text-gray-700 focus:ring-2 focus:ring-indigo-100">
                                                {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                                            </select>
                                        ) : (
                                            <div className="flex items-center gap-2 text-sm font-bold text-gray-700 bg-gray-50 px-3 py-2 rounded-xl border border-gray-100 w-fit">
                                                <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: category?.color }}></div>
                                                {category?.name}
                                            </div>
                                        )}
                                    </div>

                                    <div>
                                        <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 block mb-2">Priority</label>
                                        {isEditing ? (
                                            <select value={priority} onChange={e => setPriority(e.target.value as any)} className="w-full bg-gray-50 border-none rounded-xl text-sm font-bold text-gray-700 focus:ring-2 focus:ring-indigo-100">
                                                <option value="low">Low</option>
                                                <option value="medium">Medium</option>
                                                <option value="high">High</option>
                                            </select>
                                        ) : (
                                            <div className={`text-[10px] font-black uppercase tracking-tighter px-2.5 py-1 rounded-full w-fit ${priority === 'high' ? 'bg-red-50 text-red-500' :
                                                priority === 'medium' ? 'bg-orange-50 text-orange-500' : 'bg-blue-50 text-blue-500'
                                                }`}>
                                                {priority} priority
                                            </div>
                                        )}
                                    </div>

                                    <div>
                                        <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 block mb-2">Timing</label>
                                        {!isEditing ? (
                                            <div className="text-sm font-bold text-gray-600 flex items-center gap-2">
                                                <Clock size={16} className="text-gray-400" />
                                                {isRecurring ? `${recurrenceType} recurrence` : (dueDate ? `${new Date(dueDate.includes('T') ? dueDate : `${dueDate}T12:00:00Z`).toLocaleDateString()} ${task.dueTime || ''}` : 'No date set')}
                                            </div>
                                        ) : (
                                            <div className="space-y-3">
                                                <label className="flex items-center gap-2 cursor-pointer group">
                                                    <input type="checkbox" checked={isRecurring} onChange={e => setIsRecurring(e.target.checked)} className="w-4 h-4 rounded-md text-indigo-600 focus:ring-offset-0 focus:ring-indigo-200 border-gray-200 bg-gray-50" />
                                                    <span className="text-xs font-bold text-gray-500 group-hover:text-gray-700 transition-colors">Repeat this task</span>
                                                </label>
                                                {isRecurring ? (
                                                    <div className="space-y-3 pl-6 border-l-2 border-indigo-100">
                                                        <div>
                                                            <label className="text-[9px] font-bold text-gray-400 uppercase mb-1 block">Frequency</label>
                                                            <select value={recurrenceType} onChange={e => setRecurrenceType(e.target.value as RecurrenceType)} className="w-full bg-gray-50 border-none rounded-lg text-xs font-bold focus:ring-2 focus:ring-indigo-100 py-1.5 px-3">
                                                                <option value="daily">Daily</option>
                                                                <option value="weekly">Weekly</option>
                                                                <option value="monthly">Monthly</option>
                                                                <option value="yearly">Yearly</option>
                                                            </select>
                                                        </div>
                                                        <div className="grid grid-cols-2 gap-2">
                                                            <div>
                                                                <label className="text-[9px] font-bold text-gray-400 uppercase mb-1 block">Start Date</label>
                                                                <input type="date" value={recurrenceStartDate} onChange={e => setRecurrenceStartDate(e.target.value)} className="w-full bg-gray-50 border-none rounded-lg text-xs font-bold focus:ring-2 focus:ring-indigo-100 py-1.5 px-3" />
                                                            </div>
                                                            <div>
                                                                <label className="text-[9px] font-bold text-gray-400 uppercase mb-1 block">End Date (Opt)</label>
                                                                <input type="date" value={recurrenceEndDate} onChange={e => setRecurrenceEndDate(e.target.value)} className="w-full bg-gray-50 border-none rounded-lg text-xs font-bold focus:ring-2 focus:ring-indigo-100 py-1.5 px-3" />
                                                            </div>
                                                        </div>
                                                    </div>
                                                ) : (
                                                    <div className="pl-2 space-y-3">
                                                        <div className="grid grid-cols-2 gap-2">
                                                            <div>
                                                                <label className="text-[9px] font-bold text-gray-400 uppercase mb-1 block">Deadline Date</label>
                                                                <input type="date" value={dueDate} onChange={e => setDueDate(e.target.value)} className="w-full bg-gray-50 border-none rounded-lg text-xs font-bold focus:ring-2 focus:ring-indigo-100 px-3 py-2" />
                                                            </div>
                                                            <div>
                                                                <label className="text-[9px] font-bold text-gray-400 uppercase mb-1 block">Time</label>
                                                                <input type="time" value={dueTime} onChange={e => setDueTime(e.target.value)} className="w-full bg-gray-50 border-none rounded-lg text-xs font-bold focus:ring-2 focus:ring-indigo-100 px-3 py-2" />
                                                            </div>
                                                        </div>

                                                        {/* Notifications */}
                                                        <div>
                                                            <label className="flex items-center gap-1.5 text-[9px] font-bold text-gray-400 uppercase mb-2"><Bell size={12} /> Reminders</label>
                                                            <div className="flex flex-col gap-2">
                                                                {notifications.map((n, i) => (
                                                                    <div key={i} className="flex items-center justify-between bg-indigo-50 text-indigo-700 text-xs font-bold px-3 py-1.5 rounded-lg border border-indigo-100">
                                                                        <span>{n.value} {n.type.replace('_before', ' before')}</span>
                                                                        <button type="button" onClick={() => setNotifications(prev => prev.filter((_, idx) => idx !== i))} className="text-indigo-400 hover:text-indigo-600">
                                                                            <X size={12} />
                                                                        </button>
                                                                    </div>
                                                                ))}
                                                                <select
                                                                    className="w-full bg-gray-50 border border-gray-100 rounded-lg px-2 py-2 text-xs font-bold text-gray-600 focus:bg-white"
                                                                    value=""
                                                                    onChange={(e) => {
                                                                        if (!e.target.value) return;
                                                                        const val = parseInt(e.target.value.split('-')[0]);
                                                                        const type = e.target.value.split('-')[1] as any;
                                                                        setNotifications([...notifications, { id: crypto.randomUUID(), type, value: val }]);
                                                                    }}
                                                                >
                                                                    <option value="">+ Add reminder...</option>
                                                                    <option value="15-minutes_before">15 minutes before</option>
                                                                    <option value="30-minutes_before">30 minutes before</option>
                                                                    <option value="1-hours_before">1 hour before</option>
                                                                    <option value="1-days_before">1 day before</option>
                                                                </select>
                                                            </div>
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </div>


                                </div>

                                <div className="flex-1"></div>

                                {isEditing && (
                                    <div className="pt-2">
                                        <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 block mb-2">Attachments</label>
                                        <div className="space-y-4">
                                            <div className="flex gap-2">
                                                <button
                                                    type="button"
                                                    onClick={() => fileInputRef.current?.click()}
                                                    className="flex-1 flex items-center justify-center gap-2 border-2 border-dashed border-gray-100 rounded-xl py-3 text-xs font-bold text-gray-400 hover:border-indigo-200 hover:text-indigo-500 transition-all bg-gray-50/30"
                                                >
                                                    <Plus size={14} /> Images
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => setShowUrlInput(!showUrlInput)}
                                                    className="flex-1 flex items-center justify-center gap-2 border-2 border-dashed border-gray-100 rounded-xl py-3 text-xs font-bold text-gray-400 hover:border-slate-200 hover:text-slate-500 transition-all bg-gray-50/30"
                                                >
                                                    <LinkIcon size={14} /> URL
                                                </button>
                                            </div>

                                            {showUrlInput && (
                                                <div className="flex gap-2 animate-in slide-in-from-top-2 duration-200">
                                                    <input
                                                        type="text"
                                                        value={urlInput}
                                                        onChange={(e) => setUrlInput(e.target.value)}
                                                        className="flex-1 bg-gray-50 border-none rounded-xl px-3 py-2 text-xs font-bold focus:ring-2 focus:ring-indigo-100"
                                                        placeholder="Paste image URL..."
                                                        onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddUrl())}
                                                    />
                                                    <button
                                                        type="button"
                                                        onClick={handleAddUrl}
                                                        className="bg-indigo-600 text-white px-3 py-2 rounded-xl text-xs font-bold hover:bg-indigo-700"
                                                    >
                                                        Add
                                                    </button>
                                                </div>
                                            )}

                                            <input type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden" accept="image/*" multiple />

                                            <div className="flex flex-wrap gap-2">
                                                {savedUrls.map((url, i) => (
                                                    <div key={`saved-${i}`} className="relative w-12 h-12 rounded-lg overflow-hidden border border-gray-100 group">
                                                        <img src={url} alt="" referrerPolicy="no-referrer" className="w-full h-full object-cover" />
                                                        <button type="button" onClick={() => setSavedUrls(p => p.filter((_, j) => j !== i))}
                                                            className="absolute inset-0 bg-red-500/80 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                                            <X size={12} className="text-white" />
                                                        </button>
                                                    </div>
                                                ))}
                                                {newPreviews.map((src, i) => (
                                                    <div key={`new-${i}`} className="relative w-12 h-12 rounded-lg overflow-hidden border border-indigo-200 group">
                                                        <img src={src} alt="" referrerPolicy="no-referrer" className="w-full h-full object-cover" />
                                                        <button type="button" onClick={() => removeNewFile(i)}
                                                            className="absolute inset-0 bg-red-500/80 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                                            <X size={12} className="text-white" />
                                                        </button>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {isEditing && (
                                    <button onClick={handleDelete} className="w-full py-3 text-red-500 font-bold text-xs uppercase tracking-widest hover:bg-red-50 rounded-2xl transition-all border border-transparent hover:border-red-100 flex items-center justify-center gap-2">
                                        <Trash2 size={14} /> Delete Permanently
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>

                </div>
            </div>
        </div>
    );
};

export default EditTaskModal;
