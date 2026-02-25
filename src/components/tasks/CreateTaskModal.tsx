import React, { useState, useRef } from 'react';
import { useTaskStore, RecurrenceType, NotificationRule } from '../../store/taskStore';
import { X, Activity, Image as ImageIcon, Trash2, Loader2, Link as LinkIcon, Check, Bell } from 'lucide-react';
import TaskRichEditor from './TaskRichEditor';

import { usePlannerStore } from '../../store/plannerStore';

interface CreateTaskModalProps {
    isOpen: boolean;
    onClose: () => void;
}

const CreateTaskModal: React.FC<CreateTaskModalProps> = ({ isOpen, onClose }) => {
    const { addTask, categories } = useTaskStore();
    const { connections } = usePlannerStore();

    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [categoryId, setCategoryId] = useState(categories[0]?.id || '');
    const [isRecurring, setIsRecurring] = useState(false);
    const [recurrenceType, setRecurrenceType] = useState<RecurrenceType>('daily');
    const [dueDate, setDueDate] = useState('');
    const [dueTime, setDueTime] = useState('');
    const [notifications, setNotifications] = useState<NotificationRule[]>([]);
    const [priority, setPriority] = useState<'low' | 'medium' | 'high'>('medium');
    const [assignedTo, setAssignedTo] = useState<string>('');
    const [recurrenceStartDate, setRecurrenceStartDate] = useState('');
    const [recurrenceEndDate, setRecurrenceEndDate] = useState('');

    // Store as File objects — uploaded to Supabase Storage by the store action
    const [attachmentFiles, setAttachmentFiles] = useState<File[]>([]);
    // Store as direct URL strings
    const [attachmentUrls, setAttachmentUrls] = useState<string[]>([]);
    // Keep preview URLs for display only (revoked on close)
    const [previews, setPreviews] = useState<string[]>([]);
    const [urlInput, setUrlInput] = useState('');
    const [showUrlInput, setShowUrlInput] = useState(false);
    const [isSaving, setIsSaving] = useState(false);

    const fileInputRef = useRef<HTMLInputElement>(null);

    if (!isOpen) return null;

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!e.target.files) return;
        const newFiles = Array.from(e.target.files);
        setAttachmentFiles(prev => [...prev, ...newFiles]);
        const newPreviews = newFiles.map(f => URL.createObjectURL(f));
        setPreviews(prev => [...prev, ...newPreviews]);
    };

    const handleAddUrl = () => {
        if (!urlInput.trim()) return;
        setAttachmentUrls(prev => [...prev, urlInput.trim()]);
        setUrlInput('');
        setShowUrlInput(false);
    };

    const removeAttachment = (index: number) => {
        URL.revokeObjectURL(previews[index]);
        setAttachmentFiles(prev => prev.filter((_, i) => i !== index));
        setPreviews(prev => prev.filter((_, i) => i !== index));
    };

    const removeUrl = (index: number) => {
        setAttachmentUrls(prev => prev.filter((_, i) => i !== index));
    };

    const resetForm = () => {
        previews.forEach(p => URL.revokeObjectURL(p));
        setTitle('');
        setDescription('');
        setAttachmentFiles([]);
        setAttachmentUrls([]);
        setPreviews([]);
        setUrlInput('');
        setShowUrlInput(false);
        setDueDate('');
        setDueTime('');
        setNotifications([]);
        setIsRecurring(false);
        setRecurrenceStartDate('');
        setRecurrenceEndDate('');
        setPriority('medium');
        setAssignedTo('');
        setCategoryId(categories[0]?.id || '');
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSaving(true);
        try {
            await addTask({
                title,
                description,
                categoryId,
                isRecurring,
                priority,
                attachmentFiles,
                attachments: attachmentUrls, // Pass direct URLs too
                assigned_to: assignedTo || undefined,
                dueTime: dueTime || undefined,
                notifications,
                recurrence: isRecurring ? {
                    type: recurrenceType,
                    startDate: recurrenceStartDate || undefined,
                    endDate: recurrenceEndDate || undefined,
                } : undefined,
                dueDate: !isRecurring ? (dueDate ? `${dueDate}T12:00:00Z` : null) : undefined,
            } as any);
            resetForm();
            onClose();
        } catch (err) {
            console.error('[CreateTaskModal] submit error:', err);
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto p-8 relative animate-in fade-in zoom-in duration-300">
                <button onClick={onClose} className="absolute top-6 right-6 text-gray-400 hover:text-gray-600 transition-colors">
                    <X size={24} />
                </button>

                <h2 className="text-3xl font-black mb-8 text-gray-800 tracking-tight">New Mission</h2>

                <form onSubmit={handleSubmit} className="space-y-6">
                    {/* Title */}
                    <div>
                        <input
                            type="text"
                            required
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            className="w-full text-2xl font-black border-none focus:ring-0 px-0 py-2 border-b border-gray-100 placeholder-gray-200"
                            placeholder="What's the goal?"
                            autoFocus
                        />
                    </div>

                    {/* Description */}
                    <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase tracking-widest text-gray-400">Mission Description</label>
                        <div className="border border-gray-100 rounded-xl overflow-hidden bg-gray-50/30">
                            <TaskRichEditor
                                value={description}
                                onChange={setDescription}
                                placeholder="Add secret mission details..."
                            />
                        </div>
                    </div>

                    {/* Image Attachments */}
                    <div className="space-y-4">
                        <div className="flex items-center justify-between">
                            <span className="text-[10px] font-black uppercase tracking-widest text-gray-400">Tactical Imagery</span>
                            <div className="flex gap-2">
                                <button
                                    type="button"
                                    onClick={() => fileInputRef.current?.click()}
                                    className="text-[10px] font-bold bg-indigo-50 text-indigo-600 px-3 py-1.5 rounded-lg flex items-center gap-1.5 hover:bg-indigo-100 transition-all"
                                >
                                    <ImageIcon size={12} /> Upload
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setShowUrlInput(!showUrlInput)}
                                    className="text-[10px] font-bold bg-slate-100 text-slate-600 px-3 py-1.5 rounded-lg flex items-center gap-1.5 hover:bg-slate-200 transition-all"
                                >
                                    <LinkIcon size={12} /> URL
                                </button>
                            </div>
                            <input
                                type="file"
                                ref={fileInputRef}
                                onChange={handleFileChange}
                                className="hidden"
                                accept="image/*"
                                multiple
                            />
                        </div>

                        {showUrlInput && (
                            <div className="flex gap-2 animate-in slide-in-from-top-2 duration-200">
                                <input
                                    type="text"
                                    value={urlInput}
                                    onChange={(e) => setUrlInput(e.target.value)}
                                    className="flex-1 bg-gray-50 border-none rounded-xl px-3 py-2 text-xs font-bold focus:ring-2 focus:ring-indigo-100"
                                    placeholder="Paste image URL here..."
                                    onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddUrl())}
                                />
                                <button
                                    type="button"
                                    onClick={handleAddUrl}
                                    className="bg-indigo-600 text-white px-3 py-2 rounded-xl text-xs font-bold hover:bg-indigo-700 transition-all"
                                >
                                    Add
                                </button>
                            </div>
                        )}

                        {(previews.length > 0 || attachmentUrls.length > 0) && (
                            <div className="flex flex-wrap gap-3">
                                {attachmentUrls.map((url, idx) => (
                                    <div key={`url-${idx}`} className="relative w-16 h-16 rounded-xl overflow-hidden group border border-slate-200 shadow-sm">
                                        <img src={url} alt="attachment" referrerPolicy="no-referrer" className="w-full h-full object-cover" />
                                        <button
                                            type="button"
                                            onClick={() => removeUrl(idx)}
                                            className="absolute inset-0 bg-red-500/80 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                                        >
                                            <X size={14} className="text-white" />
                                        </button>
                                    </div>
                                ))}
                                {previews.map((src, idx) => (
                                    <div key={`file-${idx}`} className="relative w-16 h-16 rounded-xl overflow-hidden group border border-indigo-200 shadow-sm">
                                        <img src={src} alt="attachment" referrerPolicy="no-referrer" className="w-full h-full object-cover" />
                                        <button
                                            type="button"
                                            onClick={() => removeAttachment(idx)}
                                            className="absolute inset-0 bg-red-500/80 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                                        >
                                            <Trash2 size={14} className="text-white" />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Metadata Grid */}
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                        <div>
                            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1">Category</label>
                            <select
                                value={categoryId}
                                onChange={(e) => setCategoryId(e.target.value)}
                                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-gray-50 focus:bg-white transition-colors"
                            >
                                {categories.map(cat => (
                                    <option key={cat.id} value={cat.id}>{cat.name}</option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1">Priority</label>
                            <select
                                value={priority}
                                onChange={(e) => setPriority(e.target.value as any)}
                                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-gray-50 focus:bg-white transition-colors"
                            >
                                <option value="low">Low</option>
                                <option value="medium">Medium</option>
                                <option value="high">High</option>
                            </select>
                        </div>
                        {connections.length > 0 && (
                            <div className="col-span-2 md:col-span-1">
                                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1">Assign To</label>
                                <select
                                    value={assignedTo}
                                    onChange={(e) => setAssignedTo(e.target.value)}
                                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-gray-50 focus:bg-white transition-colors"
                                >
                                    <option value="">Myself (Unassigned)</option>
                                    {connections.filter(c => c.status === 'accepted').map(conn => (
                                        <option key={conn.id} value={conn.peer_id}>
                                            {conn.peer_name || conn.peer_email || 'User'}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        )}
                    </div>

                    {/* Recurrence / Dates */}
                    <div className="border-t border-gray-100 pt-4">
                        <div className="flex items-center justify-between mb-4">
                            <label className="flex items-center gap-2 cursor-pointer select-none">
                                <div className={`w-5 h-5 flex items-center justify-center rounded border ${isRecurring ? 'bg-indigo-600 border-indigo-600' : 'border-gray-300'}`}>
                                    {isRecurring && <Activity size={12} className="text-white" />}
                                </div>
                                <input
                                    type="checkbox"
                                    checked={isRecurring}
                                    onChange={(e) => setIsRecurring(e.target.checked)}
                                    className="hidden"
                                />
                                <span className="text-sm font-medium text-gray-700">Recurring Routine</span>
                            </label>
                        </div>

                        {isRecurring ? (
                            <div className="space-y-3 bg-gray-50/50 p-4 rounded-xl border border-indigo-100/50 border-l-4 border-l-indigo-500 animate-in slide-in-from-top-2 duration-300">
                                <div>
                                    <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5">Mission Frequency</label>
                                    <select
                                        value={recurrenceType}
                                        onChange={(e) => setRecurrenceType(e.target.value as any)}
                                        className="w-full border-none rounded-lg px-3 py-2 text-sm font-bold bg-white shadow-sm focus:ring-2 focus:ring-indigo-100"
                                    >
                                        <option value="daily">Daily</option>
                                        <option value="weekly">Weekly</option>
                                        <option value="monthly">Monthly</option>
                                        <option value="yearly">Yearly</option>
                                    </select>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5">Commencement</label>
                                        <input
                                            type="date"
                                            value={recurrenceStartDate}
                                            onChange={(e) => setRecurrenceStartDate(e.target.value)}
                                            className="w-full border-none rounded-lg px-3 py-2 text-sm font-bold bg-white shadow-sm focus:ring-2 focus:ring-indigo-100"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5">Termination (Opt)</label>
                                        <input
                                            type="date"
                                            value={recurrenceEndDate}
                                            onChange={(e) => setRecurrenceEndDate(e.target.value)}
                                            className="w-full border-none rounded-lg px-3 py-2 text-sm font-bold bg-white shadow-sm focus:ring-2 focus:ring-indigo-100"
                                        />
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1">Due Date</label>
                                    <input
                                        type="date"
                                        value={dueDate}
                                        onChange={(e) => setDueDate(e.target.value)}
                                        className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1">Due Time</label>
                                    <input
                                        type="time"
                                        value={dueTime}
                                        onChange={(e) => setDueTime(e.target.value)}
                                        className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm"
                                    />
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Notifications */}
                    <div className="border-t border-gray-100 pt-4">
                        <label className="flex items-center gap-2 text-xs font-bold text-gray-500 uppercase tracking-wide mb-2"><Bell size={14} /> Reminders</label>
                        <div className="flex flex-wrap gap-2">
                            {notifications.map((n, i) => (
                                <div key={i} className="flex items-center gap-1 bg-indigo-50 text-indigo-700 text-xs font-bold px-3 py-1.5 rounded-lg border border-indigo-100">
                                    {n.value} {n.type.replace('_before', ' before')}
                                    <button type="button" onClick={() => setNotifications(prev => prev.filter((_, idx) => idx !== i))} className="ml-1 text-indigo-400 hover:text-indigo-600">
                                        <X size={12} />
                                    </button>
                                </div>
                            ))}
                            <select
                                className="bg-gray-50 border border-gray-200 rounded-lg px-2 py-1.5 text-xs text-gray-600 focus:bg-white"
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

                    {/* Footer Actions */}
                    <div className="flex justify-end pt-2 gap-3">
                        <button
                            type="button"
                            onClick={() => { resetForm(); onClose(); }}
                            className="px-5 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={isSaving}
                            className="px-5 py-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-md hover:shadow-lg transition-all transform hover:-translate-y-0.5 disabled:opacity-60 disabled:cursor-not-allowed flex items-center gap-2"
                        >
                            {isSaving ? <Loader2 size={16} className="animate-spin text-white" /> : <Check size={16} />}
                            {isSaving ? 'Deploying...' : 'Create Mission'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default CreateTaskModal;
