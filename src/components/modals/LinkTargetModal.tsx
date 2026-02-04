import { useState } from 'react';
import { X, Link as LinkIcon, ExternalLink, FileText } from 'lucide-react';

interface LinkTargetModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (target: { targetPageIndex?: number, url?: string, note?: string }) => void;
    pages: { id: string, name?: string, index: number }[];
    initialUrl?: string;
    initialPageIndex?: number;
    initialNote?: string;
}

export const LinkTargetModal = ({ isOpen, onClose, onSave, pages, initialUrl, initialPageIndex, initialNote }: LinkTargetModalProps) => {
    const [targetPageIndex, setTargetPageIndex] = useState<number | undefined>(initialPageIndex);
    const [url, setUrl] = useState<string>(initialUrl || '');
    const [note, setNote] = useState<string>(initialNote || '');
    const [mode, setMode] = useState<'page' | 'url'>((initialUrl && !initialPageIndex) ? 'url' : 'page');

    if (!isOpen) return null;

    const handleSave = () => {
        if (mode === 'page') {
            if (targetPageIndex !== undefined) onSave({ targetPageIndex, note });
        } else {
            if (url) {
                let submitUrl = url;
                if (!url.startsWith('http')) submitUrl = 'https://' + submitUrl;
                onSave({ url: submitUrl, note });
            }
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden flex flex-col max-h-[90vh]">
                <div className="p-6 border-b border-gray-100 flex items-center justify-between text-gray-900">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-indigo-50 rounded-lg text-indigo-600">
                            <LinkIcon className="h-6 w-6" />
                        </div>
                        <h2 className="text-xl font-bold">Link Target</h2>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full text-gray-400 transition-colors">
                        <X className="h-5 w-5" />
                    </button>
                </div>

                <div className="p-6 space-y-6 overflow-y-auto">
                    {/* Tabs */}
                    <div className="flex p-1 bg-gray-100 rounded-xl">
                        <button
                            onClick={() => setMode('page')}
                            className={`flex-1 flex items-center justify-center gap-2 py-2.5 text-sm font-bold rounded-lg transition-all ${mode === 'page' ? 'bg-white text-indigo-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'
                                }`}
                        >
                            <FileText className="h-4 w-4" />
                            To Page
                        </button>
                        <button
                            onClick={() => setMode('url')}
                            className={`flex-1 flex items-center justify-center gap-2 py-2.5 text-sm font-bold rounded-lg transition-all ${mode === 'url' ? 'bg-white text-indigo-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'
                                }`}
                        >
                            <ExternalLink className="h-4 w-4" />
                            To Website
                        </button>
                    </div>

                    {mode === 'page' ? (
                        <div className="space-y-3">
                            <label className="text-sm font-medium text-gray-700">Select Destination Page</label>
                            <div className="max-h-60 overflow-y-auto border border-gray-200 rounded-xl bg-gray-50/30">
                                {pages.map(p => (
                                    <button
                                        key={p.id}
                                        onClick={() => setTargetPageIndex(p.index)}
                                        className={`w-full flex items-center gap-3 p-3 text-left hover:bg-gray-50 transition-colors border-b last:border-0 border-gray-100 ${targetPageIndex === p.index ? 'bg-indigo-50/50' : ''}`}
                                    >
                                        <span className="w-8 h-8 flex items-center justify-center bg-white border border-gray-200 rounded-lg text-xs font-bold text-gray-600 shadow-sm">
                                            {p.index + 1}
                                        </span>
                                        <div>
                                            <p className={`text-sm font-bold ${targetPageIndex === p.index ? 'text-indigo-600' : 'text-gray-900'}`}>
                                                {p.name || `Page ${p.index + 1}`}
                                            </p>
                                        </div>
                                        {targetPageIndex === p.index && <div className="ml-auto w-2 h-2 bg-indigo-600 rounded-full" />}
                                    </button>
                                ))}
                            </div>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            <label className="text-sm font-medium text-gray-700">Website URL</label>
                            <input
                                type="text"
                                value={url}
                                onChange={(e) => setUrl(e.target.value)}
                                placeholder="google.com"
                                className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none transition-all text-gray-900"
                                autoFocus
                            />
                            <p className="text-xs text-gray-500">Links will open in a new tab.</p>
                        </div>
                    )}

                    <div className="space-y-2">
                        <label className="text-sm font-medium text-gray-700">Display Note (Optional)</label>
                        <input
                            type="text"
                            value={note}
                            onChange={(e) => setNote(e.target.value)}
                            placeholder="e.g. Go to Budgeting"
                            className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none transition-all text-gray-900 text-sm"
                        />
                    </div>

                    <div className="pt-4 border-t border-gray-100 flex gap-3">
                        <button
                            onClick={onClose}
                            className="flex-1 py-3 text-gray-600 font-bold hover:bg-gray-100 rounded-xl transition-all"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={handleSave}
                            disabled={mode === 'page' ? targetPageIndex === undefined : !url}
                            className="flex-1 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold shadow-lg shadow-indigo-200 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                        >
                            Create Link
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};
