import { useState } from 'react';
import { PrintExporter } from '../canvas/PrintExporter'; // Import sibling
import { Printer, X, Download, Loader2 } from 'lucide-react';

interface PrintModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export const PrintModal = ({ isOpen, onClose }: PrintModalProps) => {
    const [range, setRange] = useState<'all' | 'current' | 'custom'>('current');
    const [customRange, setCustomRange] = useState('');
    const [step, setStep] = useState<'config' | 'generating' | 'done'>('config');
    const [progress, setProgress] = useState({ current: 0, total: 0 });

    if (!isOpen) return null;

    const handlePrintStart = () => {
        setStep('generating');
    };

    const handleComplete = () => {
        setStep('done');
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden flex flex-col">
                <div className="p-6 border-b border-gray-100 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-indigo-50 rounded-lg text-indigo-600">
                            <Printer className="h-6 w-6" />
                        </div>
                        <h2 className="text-xl font-bold text-gray-900">Print Planner</h2>
                    </div>
                    {step !== 'generating' && (
                        <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full text-gray-400 transition-colors">
                            <X className="h-5 w-5" />
                        </button>
                    )}
                </div>

                <div className="p-6">
                    {step === 'config' && (
                        <div className="space-y-6">
                            <div className="space-y-3">
                                <label className="text-sm font-medium text-gray-700">Print Range</label>
                                <div className="grid grid-cols-1 gap-3">
                                    <label className={`flex items-center p-3 rounded-xl border ${range === 'current' ? 'border-indigo-600 bg-indigo-50/50' : 'border-gray-200 hover:bg-gray-50'} cursor-pointer transition-all`}>
                                        <input type="radio" name="range" value="current" checked={range === 'current'} onChange={() => setRange('current')} className="w-4 h-4 text-indigo-600" />
                                        <span className="ml-3 font-medium text-gray-700">Current Page Only</span>
                                    </label>
                                    <label className={`flex items-center p-3 rounded-xl border ${range === 'all' ? 'border-indigo-600 bg-indigo-50/50' : 'border-gray-200 hover:bg-gray-50'} cursor-pointer transition-all`}>
                                        <input type="radio" name="range" value="all" checked={range === 'all'} onChange={() => setRange('all')} className="w-4 h-4 text-indigo-600" />
                                        <span className="ml-3 font-medium text-gray-700">All Pages in Planner</span>
                                    </label>
                                    <label className={`flex items-center p-3 rounded-xl border ${range === 'custom' ? 'border-indigo-600 bg-indigo-50/50' : 'border-gray-200 hover:bg-gray-50'} cursor-pointer transition-all`}>
                                        <input type="radio" name="range" value="custom" checked={range === 'custom'} onChange={() => setRange('custom')} className="w-4 h-4 text-indigo-600" />
                                        <span className="ml-3 font-medium text-gray-700">Custom Range</span>
                                    </label>
                                </div>
                            </div>

                            {range === 'custom' && (
                                <div className="animation-in slide-in-from-top-2">
                                    <label className="text-xs text-gray-500 mb-1 block">Page Numbers (e.g., "1-5, 8, 10")</label>
                                    <input
                                        type="text"
                                        value={customRange}
                                        onChange={(e) => setCustomRange(e.target.value)}
                                        placeholder="1-5, 8"
                                        className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none transition-all"
                                    />
                                </div>
                            )}

                            <div className="pt-4 border-t border-gray-100">
                                <button
                                    onClick={handlePrintStart}
                                    disabled={range === 'custom' && !customRange}
                                    className="w-full py-3.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold shadow-lg shadow-indigo-200 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2"
                                >
                                    <Download className="h-5 w-5" />
                                    Generate PDF
                                </button>
                            </div>
                        </div>
                    )}

                    {step === 'generating' && (
                        <div className="flex flex-col items-center justify-center py-8">
                            <div className="relative mb-6">
                                <div className="absolute inset-0 bg-indigo-100 rounded-full animate-ping opacity-25"></div>
                                <div className="bg-white p-4 rounded-full shadow-lg border border-indigo-100 relative z-10">
                                    <Loader2 className="h-8 w-8 text-indigo-600 animate-spin" />
                                </div>
                            </div>
                            <h3 className="text-lg font-bold text-gray-900 mb-2">Generating PDF...</h3>
                            <p className="text-gray-500 mb-6">Rendered {progress.current} of {progress.total} pages</p>

                            <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                                <div
                                    className="h-full bg-indigo-600 transition-all duration-300 ease-out"
                                    style={{ width: `${(progress.current / Math.max(progress.total, 1)) * 100}%` }}
                                />
                            </div>

                            <PrintExporter
                                range={range}
                                customRange={customRange}
                                onClose={onClose}
                                onProgress={(c, t) => setProgress({ current: c, total: t })}
                                onComplete={handleComplete}
                            />
                        </div>
                    )}

                    {step === 'done' && (
                        <div className="text-center py-6">
                            <div className="w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-4">
                                <Download className="h-8 w-8" />
                            </div>
                            <h3 className="text-xl font-bold text-gray-900 mb-2">PDF Ready!</h3>
                            <p className="text-gray-500 mb-6">Your planner has been successfully exported.</p>
                            <button
                                onClick={onClose}
                                className="w-full py-3 bg-gray-900 hover:bg-gray-800 text-white rounded-xl font-bold transition-all"
                            >
                                Close
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
