import React, { useState } from 'react';
import { X, Upload, Loader2, CheckCircle2, AlertCircle, FileText, Image as ImageIcon } from 'lucide-react';
import { useTaskStore } from '../../store/taskStore';
import { v4 as uuidv4 } from 'uuid';

interface BulkTaskUploadModalProps {
    isOpen: boolean;
    onClose: () => void;
}

const BulkTaskUploadModal: React.FC<BulkTaskUploadModalProps> = ({ isOpen, onClose }) => {
    const { bulkAddTasks, categories } = useTaskStore();
    const [inputText, setInputText] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [isSuccess, setIsSuccess] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [selectedCategoryId, setSelectedCategoryId] = useState('');

    if (!isOpen) return null;

    const parseTasks = (text: string) => {
        const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 0);
        const parsedTasks: any[] = [];
        let currentTask: any = null;
        let currentSubtask: any = null;

        lines.forEach(line => {
            const isSubtask = line.startsWith('-') || line.startsWith('*') || line.startsWith('•');
            const isImageUrl = line.match(/^https?:\/\/.*\.(jpg|jpeg|png|webp|gif|svg)/i);

            if (isImageUrl) {
                const url = line;
                if (currentSubtask) {
                    currentSubtask.imageUrl = url;
                } else if (currentTask) {
                    if (!currentTask.attachments) currentTask.attachments = [];
                    currentTask.attachments.push(url);
                }
            } else if (isSubtask) {
                const subtaskTitle = line.replace(/^[-*•]\s*/, '');
                currentSubtask = {
                    id: uuidv4(),
                    title: subtaskTitle,
                    isCompleted: false
                };
                if (currentTask) {
                    if (!currentTask.subtasks) currentTask.subtasks = [];
                    currentTask.subtasks.push(currentSubtask);
                }
            } else {
                // New Task
                currentTask = {
                    title: line,
                    categoryId: selectedCategoryId,
                    subtasks: [],
                    attachments: [],
                    priority: 'medium'
                };
                parsedTasks.push(currentTask);
                currentSubtask = null; // Reset subtask context
            }
        });

        return parsedTasks;
    };

    const handleUpload = async () => {
        if (!inputText.trim()) return;

        setIsLoading(true);
        setError(null);

        try {
            const tasks = parseTasks(inputText);
            if (tasks.length === 0) {
                throw new Error('No valid tasks found. Please check your format.');
            }

            await bulkAddTasks(tasks);
            setIsSuccess(true);
            setTimeout(() => {
                onClose();
                setIsSuccess(false);
                setInputText('');
            }, 2000);
        } catch (err: any) {
            console.error('Bulk upload error:', err);
            setError(err.message || 'Failed to upload tasks.');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
            <div className="absolute inset-0" onClick={onClose} />

            <div className="relative w-full max-w-2xl bg-white rounded-[2rem] shadow-2xl border border-slate-100 overflow-hidden animate-in zoom-in-95 duration-200">
                {/* Header */}
                <div className="bg-gradient-to-br from-indigo-600 to-violet-700 p-8 text-white">
                    <button
                        onClick={onClose}
                        className="absolute top-6 right-6 p-2 hover:bg-white/20 rounded-xl transition-colors"
                    >
                        <X size={20} />
                    </button>

                    <div className="flex items-center gap-4 mb-2">
                        <div className="p-3 bg-white/20 rounded-2xl backdrop-blur-md">
                            <Upload size={28} />
                        </div>
                        <div>
                            <h2 className="text-2xl font-black tracking-tight leading-none">Bulk Task Magic</h2>
                            <p className="text-indigo-100 text-xs font-bold uppercase tracking-widest mt-2">Sync your list in seconds</p>
                        </div>
                    </div>
                </div>

                <div className="p-8 space-y-6">
                    {isSuccess ? (
                        <div className="flex flex-col items-center justify-center py-12 text-center animate-in fade-in zoom-in-95 duration-300">
                            <div className="w-20 h-20 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mb-6 shadow-pill">
                                <CheckCircle2 size={40} />
                            </div>
                            <h3 className="text-xl font-bold text-slate-900">Tasks Imported Successfully!</h3>
                            <p className="text-slate-500 mt-2">Your workspace is now up to date.</p>
                        </div>
                    ) : (
                        <>
                            <div className="space-y-4">
                                <div className="flex flex-col sm:flex-row gap-4 items-end">
                                    <div className="flex-1 space-y-2">
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Assign to Category</label>
                                        <select
                                            value={selectedCategoryId}
                                            onChange={(e) => setSelectedCategoryId(e.target.value)}
                                            className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl text-sm font-bold text-slate-600 focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                                        >
                                            <option value="">No Category</option>
                                            {categories.map(cat => (
                                                <option key={cat.id} value={cat.id}>{cat.name}</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div className="hidden sm:flex items-center gap-2 p-3 bg-amber-50 rounded-xl border border-amber-100 text-amber-700 text-[10px] font-bold uppercase tracking-tight">
                                        <AlertCircle size={14} />
                                        <span>Title followed by subtasks starting with -</span>
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 flex justify-between items-center">
                                        Paste Your List
                                        <span className="text-slate-300 normal-case font-medium italic">Supports images via URL</span>
                                    </label>
                                    <textarea
                                        value={inputText}
                                        onChange={(e) => setInputText(e.target.value)}
                                        placeholder={`Buy Groceries\n- Milk\n- Bread\n  https://example.com/bread.jpg\n\nLaundry\n- Wash darks\n- Fold clothes`}
                                        className="w-full h-64 px-5 py-4 bg-slate-50 border border-slate-100 rounded-[1.5rem] focus:ring-2 focus:ring-indigo-500 outline-none transition-all resize-none text-sm font-medium text-slate-700"
                                    />
                                </div>
                            </div>

                            {error && (
                                <div className="p-4 bg-rose-50 border border-rose-100 text-rose-600 rounded-2xl text-xs font-bold flex items-center gap-3 animate-in fade-in slide-in-from-top-2">
                                    <AlertCircle size={18} />
                                    {error}
                                </div>
                            )}

                            <button
                                onClick={handleUpload}
                                disabled={isLoading || !inputText.trim()}
                                className="w-full py-4 bg-slate-900 hover:bg-slate-800 text-white rounded-[1.5rem] font-black text-sm uppercase tracking-[0.2em] flex items-center justify-center gap-3 transition-all shadow-xl shadow-slate-200 disabled:opacity-50 disabled:cursor-not-allowed group active:scale-[0.98]"
                            >
                                {isLoading ? (
                                    <Loader2 className="animate-spin" size={20} />
                                ) : (
                                    <>
                                        <FileText size={20} className="group-hover:rotate-12 transition-transform" />
                                        Process & Upload Tasks
                                    </>
                                )}
                            </button>
                        </>
                    )}
                </div>

                {/* Info Footer */}
                {!isSuccess && (
                    <div className="px-8 py-6 bg-slate-50 border-t border-slate-100 flex items-center gap-6">
                        <div className="flex flex-1 items-center gap-3">
                            <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center shadow-sm text-indigo-500">
                                <ImageIcon size={16} />
                            </div>
                            <div className="text-[10px] font-bold text-slate-500 leading-tight">
                                Paste an image URL directly under a subtask to attach it automatically.
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default BulkTaskUploadModal;
