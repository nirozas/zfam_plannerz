import React, { useState } from 'react';
import { Subtask } from '../../store/taskStore';
import { 
    X, Check, Trash2, Flag, CalendarDays, Clock, 
    MessageSquare, Image as ImageIcon 
} from 'lucide-react';

interface SubtaskEditorModalProps {
    subtask: Subtask;
    onSave: (updated: Subtask) => void;
    onDelete: (id: string) => void;
    onClose: () => void;
}

const SubtaskEditorModal: React.FC<SubtaskEditorModalProps> = ({ subtask, onSave, onDelete, onClose }) => {
    const [title, setTitle] = useState(subtask.title);
    const [note, setNote] = useState(subtask.note || '');
    const [priority, setPriority] = useState(subtask.priority);
    const [dueDate, setDueDate] = useState(subtask.dueDate || '');
    const [dueTime, setDueTime] = useState(subtask.dueTime || '');
    const [imageUrls, setImageUrls] = useState<string[]>(() => {
        const urls = subtask.imageUrls ? [...subtask.imageUrls] : [];
        if (subtask.imageUrl && !urls.includes(subtask.imageUrl)) urls.unshift(subtask.imageUrl);
        return urls;
    });
    const [urlInput, setUrlInput] = useState('');
    const [showUrlInput, setShowUrlInput] = useState(false);

    const [imageSize, setImageSize] = useState<'S' | 'M' | 'L'>(subtask.imageSize || 'S');

    const handleSave = () => {
        onSave({
            ...subtask,
            title: title.trim(),
            note: note.trim() || undefined,
            priority,
            dueDate: dueDate || undefined,
            dueTime: dueTime || undefined,
            imageUrls,
            imageSize
        });
        onClose();
    };

    const handleAddImageUrl = () => {
        if (!urlInput.trim()) return;
        setImageUrls([...imageUrls, urlInput.trim()]);
        setUrlInput('');
        setShowUrlInput(false);
    };

    const handleRemoveImage = (idx: number) => {
        const next = [...imageUrls];
        next.splice(idx, 1);
        setImageUrls(next);
    };

    const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!e.target.files) return;
        Array.from(e.target.files).forEach(file => {
            const reader = new FileReader();
            reader.onloadend = () => {
                setImageUrls(prev => [...prev, reader.result as string]);
            };
            reader.readAsDataURL(file);
        });
    };

    return (
        <div className="fixed inset-0 z-[1200] bg-black/40 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200" onClick={onClose}>
            <div className="bg-white w-full max-w-2xl rounded-[32px] overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200" onClick={e => e.stopPropagation()}>
                {/* Header */}
                <div className="bg-indigo-600 px-8 py-6 flex items-center justify-between text-white">
                    <div className="flex items-center gap-3">
                        <div className="bg-white/20 p-2 rounded-xl">
                            <Check size={20} className="text-white" />
                        </div>
                        <h3 className="text-lg font-black uppercase tracking-widest">Refine Subtask</h3>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-xl transition-colors">
                        <X size={24} />
                    </button>
                </div>

                <div className="p-8 space-y-8 overflow-y-auto max-h-[80vh] custom-scrollbar">
                    {/* Title */}
                    <div className="space-y-3">
                        <label className="text-[10px] font-black uppercase tracking-widest text-indigo-400 flex items-center gap-2">
                            <div className="w-1.5 h-1.5 rounded-full bg-indigo-500"></div> Objective Title
                        </label>
                        <textarea
                            autoFocus
                            value={title}
                            onChange={e => setTitle(e.target.value)}
                            placeholder="What needs to be done?"
                            className="w-full bg-gray-50 border-none rounded-2xl px-5 py-4 text-lg font-bold text-gray-800 focus:ring-2 focus:ring-indigo-100 placeholder-gray-300 min-h-[100px] resize-none"
                        />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        {/* Priority & Timing */}
                        <div className="space-y-6">
                            <div className="space-y-3">
                                <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 flex items-center gap-2">
                                    <Flag size={12} /> Priority Level
                                </label>
                                <div className="flex gap-2">
                                    {(['low', 'medium', 'high'] as const).map(p => (
                                        <button
                                            key={p}
                                            onClick={() => setPriority(priority === p ? undefined : p)}
                                            className={`flex-1 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all border ${
                                                priority === p 
                                                ? p === 'high' ? 'bg-red-500 border-red-500 text-white shadow-lg shadow-red-100' :
                                                  p === 'medium' ? 'bg-amber-500 border-amber-500 text-white shadow-lg shadow-amber-100' :
                                                  'bg-blue-500 border-blue-500 text-white shadow-lg shadow-blue-100'
                                                : 'bg-white border-gray-100 text-gray-400 hover:border-indigo-100 hover:text-indigo-500'
                                            }`}
                                        >
                                            {p}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div className="space-y-3">
                                <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 flex items-center gap-2">
                                    <CalendarDays size={12} /> Execution Timing
                                </label>
                                <div className="grid grid-cols-2 gap-3">
                                    <div className="relative">
                                        <CalendarDays size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                                        <input type="date" value={dueDate} onChange={e => setDueDate(e.target.value)}
                                            className="w-full bg-gray-50 border-none rounded-xl pl-10 pr-4 py-3 text-sm font-bold text-gray-700" />
                                    </div>
                                    <div className="relative">
                                        <Clock size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                                        <input type="time" value={dueTime} onChange={e => setDueTime(e.target.value)}
                                            className="w-full bg-gray-50 border-none rounded-xl pl-10 pr-4 py-3 text-sm font-bold text-gray-700" />
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Note */}
                        <div className="space-y-3">
                            <label className="text-[10px] font-black uppercase tracking-widest text-emerald-500 flex items-center gap-2">
                                <MessageSquare size={12} /> Tactical Note
                            </label>
                            <textarea
                                value={note}
                                onChange={e => setNote(e.target.value)}
                                placeholder="Add specific details or instructions..."
                                className="w-full bg-emerald-50/50 border-none rounded-2xl px-5 py-4 text-sm font-medium text-emerald-800 focus:ring-2 focus:ring-emerald-100 placeholder-emerald-200 h-[145px] resize-none"
                            />
                        </div>
                    </div>

                    {/* Images */}
                    <div className="space-y-4 pt-4 border-t border-gray-100">
                        <div className="flex items-center justify-between">
                            <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 flex items-center gap-2">
                                <ImageIcon size={12} /> Visual Attachments
                            </label>
                            <div className="flex bg-gray-50 p-1 rounded-xl border border-gray-100">
                                {(['S', 'M', 'L'] as const).map(size => (
                                    <button
                                        key={size}
                                        onClick={() => setImageSize(size)}
                                        className={`px-3 py-1 rounded-lg text-[10px] font-black transition-all ${
                                            imageSize === size 
                                            ? 'bg-white text-indigo-600 shadow-sm border border-gray-100' 
                                            : 'text-gray-400 hover:text-gray-600'
                                        }`}
                                    >
                                        {size}
                                    </button>
                                ))}
                            </div>
                            <div className="flex gap-2">
                                <button onClick={() => setShowUrlInput(!showUrlInput)} className="text-[9px] font-black uppercase tracking-widest text-indigo-500 hover:bg-indigo-50 px-3 py-1.5 rounded-lg transition-all">
                                    Add Link
                                </button>
                                <label className="cursor-pointer text-[9px] font-black uppercase tracking-widest bg-gray-100 text-gray-600 hover:bg-gray-200 px-3 py-1.5 rounded-lg transition-all">
                                    Upload
                                    <input type="file" className="hidden" accept="image/*" multiple onChange={handleImageUpload} />
                                </label>
                            </div>
                        </div>

                        {showUrlInput && (
                            <div className="flex gap-2 animate-in slide-in-from-top-2">
                                <input type="text" value={urlInput} onChange={e => setUrlInput(e.target.value)}
                                    placeholder="Paste image URL..."
                                    className="flex-1 bg-gray-50 border-none rounded-xl px-4 py-2 text-xs font-bold"
                                    onKeyDown={e => e.key === 'Enter' && handleAddImageUrl()} />
                                <button onClick={handleAddImageUrl} className="bg-indigo-600 text-white px-4 rounded-xl text-[10px] font-black uppercase">Apply</button>
                            </div>
                        )}

                        {imageUrls.length > 0 && (
                            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                                {imageUrls.map((url, i) => (
                                    <div key={i} className="relative aspect-square rounded-xl overflow-hidden border border-gray-100 bg-gray-50 group">
                                        <img src={url} alt="" className="w-full h-full object-contain" />
                                        <button onClick={() => handleRemoveImage(i)} className="absolute top-1 right-1 bg-red-500 text-white p-1 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity">
                                            <X size={12} />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                {/* Footer Actions */}
                <div className="p-8 bg-gray-50 flex flex-col gap-6">
                    {/* Footer Timestamps */}
                    <div className="flex flex-wrap gap-x-6 gap-y-2 text-[10px] font-black uppercase tracking-widest text-slate-400 border-b border-slate-100 pb-6">
                        {subtask.createdAt && (
                            <div className="flex items-center gap-2">
                                <div className="w-1.5 h-1.5 rounded-full bg-slate-200"></div> Added: {new Date(subtask.createdAt).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}
                            </div>
                        )}
                        {(subtask.completedAt || subtask.completedDateTimes) && (
                            <div className="flex items-center gap-2 text-green-600">
                                <div className="w-1.5 h-1.5 rounded-full bg-green-500"></div> Done: {new Date(subtask.completedAt || Object.values(subtask.completedDateTimes || {})[0] || '').toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}
                            </div>
                        )}
                    </div>

                    <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                        <button 
                            onClick={() => { if(confirm('Discard this subtask?')) { onDelete(subtask.id); onClose(); } }} 
                            className="w-full sm:w-auto p-3 text-red-500 hover:bg-red-50 rounded-2xl transition-all flex items-center justify-center gap-2 text-[10px] font-black uppercase tracking-widest"
                        >
                            <Trash2 size={16} /> Delete Objective
                        </button>
                        <div className="flex items-center gap-3 w-full sm:w-auto">
                            <button onClick={onClose} className="flex-1 sm:flex-none px-6 py-3 text-gray-400 hover:text-gray-600 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all">Cancel</button>
                            <button onClick={handleSave} className="flex-1 sm:flex-none bg-indigo-600 text-white px-8 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-indigo-100 hover:bg-indigo-700 transition-all active:scale-95 flex items-center justify-center gap-2">
                                <Check size={16} /> Update Objective
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default SubtaskEditorModal;
