import React, { useState } from 'react';
import { Subtask } from '../../store/taskStore';
import { Plus, X, Circle, CheckCircle, Image as ImageIcon, Link as LinkIcon, CalendarDays, Clock } from 'lucide-react';
import { Resizable } from 're-resizable';

interface SubtaskListProps {
    subtasks: Subtask[];
    onChange: (subtasks: Subtask[]) => void;
    readOnly?: boolean;
}

const SubtaskList: React.FC<SubtaskListProps> = ({ subtasks, onChange, readOnly = false }) => {
    const [newTitle, setNewTitle] = useState('');
    const [editingImageUrlId, setEditingImageUrlId] = useState<string | null>(null);
    const [editingTimingId, setEditingTimingId] = useState<string | null>(null);
    const [urlInput, setUrlInput] = useState('');

    const handleAdd = (e: React.FormEvent) => {
        e.preventDefault();
        if (!newTitle.trim()) return;
        const newSubtask: Subtask = {
            id: crypto.randomUUID(),
            title: newTitle.trim(),
            isCompleted: false
        };
        onChange([...subtasks, newSubtask]);
        setNewTitle('');
    };

    const handleToggle = (id: string) => {
        onChange(subtasks.map(s => s.id === id ? { ...s, isCompleted: !s.isCompleted } : s));
    };

    const handleDelete = (id: string) => {
        if (readOnly) return;
        onChange(subtasks.filter(s => s.id !== id));
    };

    const handleImageUrlSubmit = (id: string) => {
        if (!urlInput.trim()) return;
        onChange(subtasks.map(s => s.id === id ? { ...s, imageUrl: urlInput.trim() } : s));
        setEditingImageUrlId(null);
        setUrlInput('');
    };

    const handleImageUpload = (id: string, file: File) => {
        const reader = new FileReader();
        reader.onloadend = () => {
            onChange(subtasks.map(s => s.id === id ? { ...s, imageUrl: reader.result as string } : s));
        };
        reader.readAsDataURL(file);
    };

    const handleResize = (id: string, width: string | number, height: string | number) => {
        onChange(subtasks.map(s => s.id === id ? {
            ...s,
            imageWidth: parseInt(width as string),
            imageHeight: parseInt(height as string)
        } : s));
    };

    return (
        <div className="subtask-list">
            {/* Header / Add Form */}
            {!readOnly && (
                <form onSubmit={handleAdd} className="flex items-center gap-2 mb-4 bg-white/50 p-2 rounded-xl border border-gray-100 shadow-sm">
                    <Plus size={16} className="text-indigo-500" />
                    <input
                        type="text"
                        value={newTitle}
                        onChange={e => setNewTitle(e.target.value)}
                        placeholder="Add a tactical subtask..."
                        className="flex-1 text-sm bg-transparent border-none focus:outline-none placeholder-gray-400 font-bold"
                    />
                </form>
            )}

            {/* List */}
            <div className="space-y-4">
                {subtasks.map(subtask => (
                    <div key={subtask.id} className="group flex flex-col gap-2 text-sm bg-white/30 p-2 rounded-xl transition-all hover:bg-white/60">
                        <div className="flex items-start gap-3">
                            <button
                                type="button"
                                onClick={() => handleToggle(subtask.id)}
                                className={`flex-shrink-0 transition-all mt-0.5 ${subtask.isCompleted ? 'text-indigo-600 scale-110' : 'text-gray-300 hover:text-indigo-400 hover:scale-110'}`}
                            >
                                {subtask.isCompleted ? <CheckCircle size={20} /> : <Circle size={20} />}
                            </button>
                            <span className={`flex-1 break-words leading-tight pt-0.5 font-semibold transition-all ${subtask.isCompleted ? 'text-gray-400 line-through opacity-50' : 'text-gray-700'}`}>
                                {subtask.title}
                            </span>

                            {!readOnly && (
                                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <label className="cursor-pointer text-gray-400 hover:text-indigo-500 p-1.5 rounded-lg hover:bg-indigo-50 transition-all" title="Upload Image">
                                        <ImageIcon size={14} />
                                        <input type="file" className="hidden" accept="image/*" onChange={(e) => {
                                            if (e.target.files?.[0]) handleImageUpload(subtask.id, e.target.files[0]);
                                        }} />
                                    </label>
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setEditingTimingId(editingTimingId === subtask.id ? null : subtask.id);
                                            setEditingImageUrlId(null);
                                        }}
                                        className={`p-1.5 rounded-lg transition-all ${editingTimingId === subtask.id ? 'text-indigo-600 bg-indigo-50' : 'text-gray-400 hover:text-indigo-500 hover:bg-indigo-50'}`}
                                        title="Due Date & Time"
                                    >
                                        <CalendarDays size={14} />
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setEditingImageUrlId(editingImageUrlId === subtask.id ? null : subtask.id);
                                            setEditingTimingId(null);
                                            setUrlInput(subtask.imageUrl || '');
                                        }}
                                        className={`p-1.5 rounded-lg transition-all ${editingImageUrlId === subtask.id ? 'text-indigo-600 bg-indigo-50' : 'text-gray-400 hover:text-slate-600 hover:bg-slate-50'}`}
                                        title="Image URL"
                                    >
                                        <LinkIcon size={14} />
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => handleDelete(subtask.id)}
                                        className="text-gray-400 hover:text-red-500 p-1.5 rounded-lg hover:bg-red-50 transition-all"
                                        title="Delete"
                                    >
                                        <X size={14} />
                                    </button>
                                </div>
                            )}
                        </div>

                        {/* URL Editor */}
                        {editingImageUrlId === subtask.id && (
                            <div className="ml-8 flex gap-2 animate-in slide-in-from-top-2 duration-200 p-2 bg-slate-50 rounded-lg border border-slate-100">
                                <input
                                    type="text"
                                    value={urlInput}
                                    onChange={(e) => setUrlInput(e.target.value)}
                                    placeholder="Paste image URL..."
                                    className="flex-1 bg-white border-none rounded-md px-2 py-1 text-xs font-bold focus:ring-1 focus:ring-indigo-200"
                                    autoFocus
                                    onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleImageUrlSubmit(subtask.id))}
                                />
                                <button
                                    onClick={() => handleImageUrlSubmit(subtask.id)}
                                    className="bg-indigo-600 text-white px-3 rounded-md text-[10px] font-black uppercase tracking-widest"
                                >
                                    Apply
                                </button>
                                <button
                                    onClick={() => setEditingImageUrlId(null)}
                                    className="text-gray-400 hover:text-gray-600 px-1"
                                >
                                    <X size={12} />
                                </button>
                            </div>
                        )}

                        {/* Timing Editor */}
                        {editingTimingId === subtask.id && (
                            <div className="ml-8 animate-in slide-in-from-top-2 duration-200 p-3 bg-indigo-50/50 rounded-xl border border-indigo-100 flex gap-3 flex-wrap">
                                <div>
                                    <label className="text-[9px] font-black uppercase text-indigo-400 mb-1 block flex items-center gap-1"><CalendarDays size={10} /> Deadline</label>
                                    <input
                                        type="date"
                                        value={subtask.dueDate || ''}
                                        onChange={(e) => onChange(subtasks.map(s => s.id === subtask.id ? { ...s, dueDate: e.target.value } : s))}
                                        className="bg-white border-none rounded-md px-2 py-1 text-xs font-bold focus:ring-1 focus:ring-indigo-300 text-indigo-900 shadow-sm"
                                    />
                                </div>
                                <div>
                                    <label className="text-[9px] font-black uppercase text-indigo-400 mb-1 block flex items-center gap-1"><Clock size={10} /> Time</label>
                                    <input
                                        type="time"
                                        value={subtask.dueTime || ''}
                                        onChange={(e) => onChange(subtasks.map(s => s.id === subtask.id ? { ...s, dueTime: e.target.value } : s))}
                                        className="bg-white border-none rounded-md px-2 py-1 text-xs font-bold focus:ring-1 focus:ring-indigo-300 text-indigo-900 shadow-sm"
                                    />
                                </div>
                                <button
                                    onClick={() => setEditingTimingId(null)}
                                    className="mt-4 bg-indigo-600 text-white px-3 py-1.5 rounded-md text-[10px] font-black uppercase shadow-sm"
                                >
                                    Done
                                </button>
                            </div>
                        )}

                        {/* Timing Display (readOnly or when not editing) */}
                        {editingTimingId !== subtask.id && (subtask.dueDate || subtask.dueTime) && (
                            <div className="ml-8 flex items-center gap-2 text-[10px] font-bold text-indigo-400">
                                {subtask.dueDate && <span className="flex items-center gap-1"><CalendarDays size={10} /> {new Date(`${subtask.dueDate}T12:00:00Z`).toLocaleDateString()}</span>}
                                {subtask.dueTime && <span className="flex items-center gap-1"><Clock size={10} /> {subtask.dueTime}</span>}
                            </div>
                        )}

                        {/* Subtask Image */}
                        {subtask.imageUrl && (
                            <div className="ml-8 mt-1 relative group/img">
                                <Resizable
                                    size={{
                                        width: subtask.imageWidth || 200,
                                        height: subtask.imageHeight || 'auto',
                                    }}
                                    onResizeStop={(_e, _direction, ref, d) => {
                                        handleResize(
                                            subtask.id,
                                            (subtask.imageWidth || 200) + d.width,
                                            (subtask.imageHeight || ref.offsetHeight) + d.height
                                        );
                                    }}
                                    enable={!readOnly ? undefined : {
                                        top: false, right: false, bottom: false, left: false,
                                        topRight: false, bottomRight: false, bottomLeft: false, topLeft: false
                                    }}
                                    className="border border-gray-100 rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-shadow"
                                    lockAspectRatio
                                >
                                    <img
                                        src={subtask.imageUrl}
                                        alt="attachment"
                                        className="w-full h-full object-cover block"
                                    />
                                    {!readOnly && (
                                        <button
                                            onClick={() => onChange(subtasks.map(s => s.id === subtask.id ? { ...s, imageUrl: undefined } : s))}
                                            className="absolute top-2 right-2 bg-black/50 hover:bg-red-500 text-white rounded-full p-1 opacity-0 group-hover/img:opacity-100 transition-all shadow-lg"
                                        >
                                            <X size={12} />
                                        </button>
                                    )}
                                </Resizable>
                            </div>
                        )}
                    </div>
                ))}
            </div>
            {subtasks.length > 0 && (
                <div className="mt-4 text-[10px] font-black uppercase tracking-widest text-gray-400 ml-8 border-t border-gray-100 pt-3">
                    {subtasks.filter(s => s.isCompleted).length} / {subtasks.length} Objectives Secured
                </div>
            )}
        </div>
    );
};

export default SubtaskList;
