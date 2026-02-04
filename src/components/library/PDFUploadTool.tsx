import { useState, useRef } from 'react';
import { X, Upload, FileText, Check, Loader2, Plus } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import * as pdfjs from 'pdfjs-dist';
import { generateUUID, usePlannerStore } from '@/store/plannerStore';
import { supabase } from '@/lib/supabase';

// Point to the worker
pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

interface PDFPage {
    id: string;
    pageNumber: number;
    preview: string;
    width: number;
    height: number;
    category: string;
    hashtags: string[];
    links?: any[];
}

interface PDFUploadToolProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess?: () => void;
}

export function PDFUploadTool({ isOpen, onClose, onSuccess }: PDFUploadToolProps) {
    const { user } = usePlannerStore();
    const [pdfPages, setPdfPages] = useState<PDFPage[]>([]);
    const [selectedPageIds, setSelectedPageIds] = useState<Set<string>>(new Set());
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [isUploading, setIsUploading] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file || file.type !== 'application/pdf') return;

        setIsAnalyzing(true);
        setPdfPages([]);
        setSelectedPageIds(new Set());

        try {
            const arrayBuffer = await file.arrayBuffer();
            const pdf = await pdfjs.getDocument({ data: arrayBuffer }).promise;
            const pages: PDFPage[] = [];

            for (let i = 1; i <= pdf.numPages; i++) {
                const page = await pdf.getPage(i);
                const viewport = page.getViewport({ scale: 1.0 });

                const canvas = document.createElement('canvas');
                const context = canvas.getContext('2d');
                if (!context) continue;

                const previewViewport = page.getViewport({ scale: 0.5 });
                canvas.width = previewViewport.width;
                canvas.height = previewViewport.height;

                await page.render({ canvasContext: context, viewport: previewViewport }).promise;

                // --- Link Extraction Logic ---
                const annotations = await page.getAnnotations();
                const extractedLinks = [];
                for (const annot of annotations) {
                    if (annot.subtype === 'Link') {
                        // Map PDF [x1, y1, x2, y2] to Viewport [x, y, w, h]
                        // Viewport matches the rendered image dimensions at scale 1.0 (the base size)
                        const rect = viewport.convertToViewportRectangle(annot.rect);
                        const [x1, y1, x2, y2] = rect;

                        let linkData: any = {
                            id: generateUUID(),
                            x: x1,
                            y: y1,
                            width: x2 - x1,
                            height: y2 - y1,
                            type: 'hotspot' as const
                        };

                        if (annot.url) {
                            linkData.url = annot.url;
                        } else if (annot.dest) {
                            // Resolve internal destination (e.g. #45 R)
                            const dest = annot.dest;
                            let pageRef = Array.isArray(dest) ? dest[0] : null;

                            // Resolve named destinations
                            if (typeof dest === 'string') {
                                const namedDest = await pdf.getDestination(dest);
                                if (namedDest) pageRef = namedDest[0];
                            }

                            if (pageRef) {
                                try {
                                    // Convert PDF Ref to zero-based page index
                                    const pageIndex = await pdf.getPageIndex(pageRef);
                                    linkData.targetPageIndex = pageIndex;
                                } catch (e) {
                                    console.warn("[PDF Import] Failed to resolve page index:", e);
                                }
                            }
                        }

                        if (linkData.url || linkData.targetPageIndex !== undefined) {
                            extractedLinks.push(linkData);
                        }
                    }
                }

                pages.push({
                    id: generateUUID(),
                    pageNumber: i,
                    preview: canvas.toDataURL('image/png'),
                    width: viewport.width,
                    height: viewport.height,
                    category: 'Notes',
                    hashtags: [],
                    links: extractedLinks
                });
            }

            setPdfPages(pages);
            setSelectedPageIds(new Set(pages.map(p => p.id)));
        } catch (err) {
            console.error('Error analyzing PDF:', err);
        } finally {
            setIsAnalyzing(false);
        }
    };

    const togglePageSelection = (id: string) => {
        const newSelection = new Set(selectedPageIds);
        if (newSelection.has(id)) newSelection.delete(id);
        else newSelection.add(id);
        setSelectedPageIds(newSelection);
    };

    const updatePageData = (id: string, updates: Partial<PDFPage>) => {
        setPdfPages(prev => prev.map(p => p.id === id ? { ...p, ...updates } : p));
    };

    const handleSaveTemplates = async () => {
        if (selectedPageIds.size === 0) return;

        setIsUploading(true);
        try {
            const selectedPages = pdfPages.filter(p => selectedPageIds.has(p.id));

            for (const page of selectedPages) {
                const blob = await (await fetch(page.preview)).blob();
                const fileName = `pdf-template-${generateUUID()}.png`;

                const { error: uploadError } = await supabase.storage
                    .from('templates')
                    .upload(fileName, blob);

                if (uploadError) throw uploadError;

                const { data: { publicUrl } } = supabase.storage
                    .from('templates')
                    .getPublicUrl(fileName);

                console.log("Attempting to insert template:", {
                    user_id: user?.id,
                    title: `PDF Template Page ${page.pageNumber}`,
                    category: page.category
                });

                if (!user?.id) {
                    console.error("User ID is missing! cannot upload.");
                    alert("User not logged in. Cannot save template.");
                    throw new Error("User ID missing");
                }

                const payload = {
                    user_id: user?.id,
                    title: `PDF Template Page ${page.pageNumber}`,
                    type: 'template',
                    category: page.category,
                    hashtags: page.hashtags,
                    url: publicUrl
                };
                console.log("Payload:", payload);

                await supabase.from('assets').insert(payload);
            }

            if (onSuccess) onSuccess();
            onClose();
        } catch (err) {
            console.error('Error saving templates:', err);
        } finally {
            setIsUploading(false);
        }
    };

    const handleAddToPlanner = async () => {
        if (selectedPageIds.size === 0 || !user) return;

        setIsUploading(true);
        try {
            const selectedPages = pdfPages.filter(p => selectedPageIds.has(p.id));
            const formattedPages = [];

            for (const page of selectedPages) {
                // Convert base64 to blob
                const blob = await (await fetch(page.preview)).blob();
                const fileName = `${user.id}/${Date.now()}_page_${generateUUID()}.png`;

                // Upload to storage
                const { error: uploadError } = await supabase.storage
                    .from('planner-uploads')
                    .upload(fileName, blob);

                if (uploadError) throw uploadError;

                const { data: { publicUrl } } = supabase.storage
                    .from('planner-uploads')
                    .getPublicUrl(fileName);

                formattedPages.push({
                    dataUrl: publicUrl,
                    width: page.width,
                    height: page.height,
                    links: page.links
                });
            }

            usePlannerStore.getState().addPagesFromPdf(formattedPages);
            await usePlannerStore.getState().savePlanner(); // Save immediately

            if (onSuccess) onSuccess();
            onClose();
        } catch (err) {
            console.error('Error adding pages to planner:', err);
            alert('Failed to add pages. Check console.');
        } finally {
            setIsUploading(false);
        }
    }

    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    <motion.div
                        key="pdf-overlay"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100]"
                    />
                    <motion.div
                        key="pdf-panel"
                        initial={{ opacity: 0, scale: 0.95, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: 20 }}
                        className="fixed inset-4 md:inset-10 bg-white rounded-3xl shadow-2xl z-[101] flex flex-col overflow-hidden border border-gray-100"
                    >
                        {/* Header */}
                        <div className="px-8 py-6 border-b border-gray-100 flex items-center justify-between bg-white">
                            <div>
                                <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-3">
                                    <div className="p-2 bg-indigo-100 rounded-xl">
                                        <FileText className="w-6 h-6 text-indigo-600" />
                                    </div>
                                    PDF Import Tool
                                </h2>
                                <p className="text-sm text-gray-500 mt-1 font-medium">Analyze PDF pages and convert them into reusable templates/pages</p>
                            </div>
                            <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full transition-colors group">
                                <X className="w-6 h-6 text-gray-400 group-hover:text-gray-600" />
                            </button>
                        </div>

                        {pdfPages.length === 0 ? (
                            <div className="flex-1 flex flex-col items-center justify-center p-12 bg-gray-50/50">
                                <div
                                    onClick={() => fileInputRef.current?.click()}
                                    className="w-full max-w-xl aspect-[16/9] border-4 border-dashed border-gray-200 rounded-3xl flex flex-col items-center justify-center hover:border-indigo-400 hover:bg-white transition-all cursor-pointer group"
                                >
                                    {isAnalyzing ? (
                                        <div className="text-center">
                                            <Loader2 className="w-16 h-16 animate-spin text-indigo-500 mx-auto mb-6" />
                                            <p className="text-lg font-bold text-gray-900">Analyzing PDF...</p>
                                        </div>
                                    ) : (
                                        <div className="text-center px-10">
                                            <div className="w-20 h-20 bg-indigo-50 rounded-2xl flex items-center justify-center mx-auto mb-6">
                                                <Upload className="w-10 h-10 text-indigo-600" />
                                            </div>
                                            <p className="text-xl font-bold text-gray-900 mb-2">Upload a PDF File</p>
                                            <div className="mt-8 px-6 py-2 bg-indigo-600 text-white rounded-full text-sm font-bold shadow-lg shadow-indigo-200">Select PDF</div>
                                        </div>
                                    )}
                                </div>
                                <input type="file" ref={fileInputRef} onChange={handleFileSelect} accept=".pdf" className="hidden" />
                            </div>
                        ) : (
                            <>
                                <div className="flex-1 overflow-y-auto bg-gray-50/30 p-8">
                                    <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
                                        {pdfPages.map(page => (
                                            <div
                                                key={page.id}
                                                className={`bg-white rounded-3xl border-2 transition-all p-6 flex gap-6 ${selectedPageIds.has(page.id) ? 'border-indigo-500 shadow-xl' : 'border-gray-100'
                                                    }`}
                                            >
                                                <div onClick={() => togglePageSelection(page.id)} className="relative w-40 aspect-[3/4] bg-gray-50 rounded-xl overflow-hidden cursor-pointer">
                                                    <img src={page.preview} alt={`Page ${page.pageNumber}`} className="w-full h-full object-cover" />
                                                    {selectedPageIds.has(page.id) && (
                                                        <div className="absolute inset-0 bg-indigo-600/20 flex items-center justify-center">
                                                            <div className="w-10 h-10 bg-indigo-600 rounded-full flex items-center justify-center shadow-lg border-2 border-white">
                                                                <Check className="w-6 h-6 text-white" />
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>

                                                <div className="flex-1 flex flex-col gap-4">
                                                    <div>
                                                        <label className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2 flex items-center gap-2">Category</label>
                                                        <div className="flex flex-wrap gap-2 mt-2">
                                                            {['Daily', 'Weekly', 'Monthly', 'Notes'].map(cat => (
                                                                <button
                                                                    key={cat}
                                                                    onClick={() => updatePageData(page.id, { category: cat })}
                                                                    className={`px-4 py-1.5 rounded-xl text-xs font-bold ${page.category === cat ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-600'}`}
                                                                >
                                                                    {cat}
                                                                </button>
                                                            ))}
                                                        </div>
                                                    </div>

                                                    <div>
                                                        <label className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2 flex items-center gap-2">Hashtags</label>
                                                        <div className="mt-2 flex flex-wrap gap-2">
                                                            {page.hashtags.map((tag, idx) => (
                                                                <span key={idx} className="px-3 py-1 bg-gray-100 text-gray-700 rounded-lg text-[11px] font-bold flex items-center gap-2">
                                                                    #{tag}
                                                                    <X className="w-3 h-3 cursor-pointer" onClick={() => updatePageData(page.id, { hashtags: page.hashtags.filter((_, i) => i !== idx) })} />
                                                                </span>
                                                            ))}
                                                            <button onClick={() => {
                                                                const tag = prompt('Enter hashtag:');
                                                                if (tag) updatePageData(page.id, { hashtags: [...page.hashtags, tag.replace('#', '')] });
                                                            }} className="px-3 py-1 border-2 border-dashed border-gray-200 text-gray-400 rounded-lg text-[11px] font-bold">Add Tag</button>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                                <div className="px-8 py-6 border-t border-gray-100 bg-white flex items-center justify-between shadow-2xl">
                                    <div className="flex items-center gap-4">
                                        <div className="px-4 py-2 bg-gray-100 rounded-2xl">
                                            <span className="text-sm font-bold text-gray-900">{selectedPageIds.size}</span>
                                            <span className="text-sm text-gray-500 font-medium ml-1.5">pages selected</span>
                                        </div>
                                    </div>
                                    <div className="flex gap-4">
                                        <button onClick={() => setPdfPages([])} className="px-6 py-3 bg-white border-2 border-gray-200 text-gray-700 rounded-2xl text-sm font-bold">Clear All</button>

                                        {/* Add to Planner Button */}
                                        <button
                                            disabled={selectedPageIds.size === 0 || isUploading}
                                            onClick={handleAddToPlanner}
                                            className={`px-6 py-3 rounded-2xl text-sm font-bold flex items-center gap-2 transition-all ${selectedPageIds.size === 0 || isUploading ? 'bg-indigo-200 text-white' : 'bg-indigo-600 text-white shadow-lg shadow-indigo-200 hover:scale-105'}`}
                                        >
                                            <FileText className="w-5 h-5" />
                                            Import to Planner
                                        </button>

                                        {/* Save as Templates Button */}
                                        <button
                                            disabled={selectedPageIds.size === 0 || isUploading}
                                            onClick={handleSaveTemplates}
                                            className={`px-6 py-3 rounded-2xl text-sm font-bold flex items-center gap-2 transition-all ${selectedPageIds.size === 0 || isUploading ? 'bg-gray-200 text-gray-400' : 'bg-gray-900 text-white shadow-lg hover:scale-105'}`}
                                        >
                                            <Plus className="w-5 h-5" />
                                            Save as Templates
                                        </button>
                                    </div>
                                </div>
                            </>
                        )}
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
}

