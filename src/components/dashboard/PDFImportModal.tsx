import { useState, useRef, useEffect } from 'react';
import { usePlannerStore, generateUUID } from '../../store/plannerStore';
import { PAGE_PRESETS } from '../../types/planner';
// supabase is no longer needed here (uploads go to Google Drive via plannerStore)
import { X, Upload, FileText, Loader2, CheckCircle, ChevronDown } from 'lucide-react';
import * as pdfjsLib from 'pdfjs-dist';

// Configure PDF.js worker
pdfjsLib.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.mjs`;

interface PDFImportModalProps {
    isOpen: boolean;
    onClose: () => void;
    sourceUrl?: string; // New: optional URL to load PDF from
}

interface AnalyzedPage {
    pageNumber: number;
    width: number;
    height: number;
    isSelected: boolean;
    blob: Blob;
    previewUrl: string; // Blob URL for preview
    links?: any[];
}

export function PDFImportModal({ isOpen, onClose, sourceUrl }: PDFImportModalProps) {
    const [step, setStep] = useState<'upload' | 'preview' | 'creating'>('upload');
    const [plannerName, setPlannerName] = useState('');
    const [pages, setPages] = useState<AnalyzedPage[]>([]);
    const [progress, setProgress] = useState(0);
    const [statusMessage, setStatusMessage] = useState('');
    const [pageSize, setPageSize] = useState('Original');

    const fileInputRef = useRef<HTMLInputElement>(null);
    const createPlannerFromPDF = usePlannerStore((state) => state.createPlannerFromPDF);
    const user = usePlannerStore((state) => state.user);

    // Cleanup object URLs
    useEffect(() => {
        return () => {
            pages.forEach(p => URL.revokeObjectURL(p.previewUrl));
        };
    }, [pages]);

    // Load from sourceUrl if provided
    useEffect(() => {
        if (isOpen && sourceUrl) {
            const fileName = sourceUrl.split('/').pop() || 'imported_planner.pdf';
            setPlannerName(fileName.split('?')[0].replace('.pdf', ''));
            loadPDFFromUrl(sourceUrl);
        }
    }, [isOpen, sourceUrl]);

    if (!isOpen) return null;

    const loadPDFFromUrl = async (url: string) => {
        setStep('preview');
        setStatusMessage('Downloading PDF...');
        try {
            const response = await fetch(url);
            const blob = await response.blob();
            const file = new File([blob], "asset.pdf", { type: 'application/pdf' });
            analyzePDF(file);
        } catch (error) {
            console.error('Error loading PDF from URL:', error);
            alert('Failed to load PDF from source.');
            setStep('upload');
        }
    };

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const selectedFile = e.target.files?.[0];
        if (!selectedFile) return;

        if (selectedFile.type !== 'application/pdf') {
            alert('Please select a valid PDF file');
            return;
        }

        setPlannerName(selectedFile.name.replace('.pdf', ''));
        analyzePDF(selectedFile);
    };

    const analyzePDF = async (file: File) => {
        setStep('preview');
        setStatusMessage('Analyzing PDF...');

        try {
            const arrayBuffer = await file.arrayBuffer();
            const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;

            const analyzedPages: AnalyzedPage[] = [];

            for (let i = 1; i <= pdf.numPages; i++) {
                const page = await pdf.getPage(i);
                const viewport = page.getViewport({ scale: 1.5 }); // Good quality preview

                const canvas = document.createElement('canvas');
                const context = canvas.getContext('2d');
                canvas.height = viewport.height;
                canvas.width = viewport.width;

                if (context) {
                    await page.render({ canvasContext: context, viewport }).promise;

                    // --- Link Extraction ---
                    // IMPORTANT: Extract coordinates at scale 1.0 to match actual page dimensions
                    const baseViewport = page.getViewport({ scale: 1.0 });
                    const annotations = await page.getAnnotations();
                    const extractedLinks = [];

                    for (const annot of annotations) {
                        if (annot.subtype === 'Link') {
                            // Convert PDF coordinates to viewport coordinates at scale 1.0
                            const rect = baseViewport.convertToViewportRectangle(annot.rect);
                            const [x1, y1, x2, y2] = rect;

                            const linkData: any = {
                                id: generateUUID(),
                                x: x1,
                                y: y1,
                                width: x2 - x1,
                                height: y2 - y1,
                                type: 'hotspot'
                            };

                            if (annot.url) {
                                linkData.url = annot.url;
                            } else if (annot.dest) {
                                let pageRef = Array.isArray(annot.dest) ? annot.dest[0] : null;
                                if (typeof annot.dest === 'string') {
                                    const namedDest = await pdf.getDestination(annot.dest);
                                    if (namedDest) pageRef = namedDest[0];
                                }

                                if (pageRef) {
                                    try {
                                        const pageIndex = await pdf.getPageIndex(pageRef);
                                        linkData.targetPageIndex = pageIndex;
                                    } catch (e) {
                                        console.warn("Failed to resolve PDF page index", e);
                                    }
                                }
                            }

                            if (linkData.url || linkData.targetPageIndex !== undefined) {
                                extractedLinks.push(linkData);
                            }
                        }
                    }

                    const blob = await new Promise<Blob | null>(resolve => canvas.toBlob(resolve, 'image/png'));

                    if (blob) {
                        analyzedPages.push({
                            pageNumber: i,
                            width: baseViewport.width,  // Use scale 1.0 to match link coordinates
                            height: baseViewport.height,  // Use scale 1.0 to match link coordinates
                            isSelected: true,
                            blob: blob,
                            previewUrl: URL.createObjectURL(blob),
                            links: extractedLinks
                        });
                    }
                }
                setProgress((i / pdf.numPages) * 100);
            }

            setPages(analyzedPages);
            setStatusMessage('');
            setProgress(0); // Reset progress after analysis
        } catch (error) {
            console.error('Error analyzing PDF:', error);
            alert('Failed to analyze PDF.');
            setStep('upload');
        }
    };

    const handleCreate = async () => {
        if (!user) return;
        setStep('creating');

        try {
            const { uploadFileToDrive, signIn, checkIsSignedIn } = await import('../../lib/googleDrive');
            if (!checkIsSignedIn()) await signIn();

            const selectedPages = pages.filter(p => p.isSelected);
            const uploadedPages: { url: string, width: number, height: number, links?: any[] }[] = [];

            setStatusMessage(`Uploading ${selectedPages.length} pages...`);

            for (let i = 0; i < selectedPages.length; i++) {
                const page = selectedPages[i];

                // Upload page image to Google Drive
                const driveResult = await uploadFileToDrive(
                    page.blob,
                    `planner-${plannerName}-p${page.pageNumber}-${generateUUID()}.png`,
                    'image/png',
                    false,
                    undefined,
                    'Planner Pages'
                );

                uploadedPages.push({
                    url: driveResult.url,
                    width: page.width,
                    height: page.height,
                    links: page.links
                });

                setProgress(((i + 1) / selectedPages.length) * 100);
            }

            setStatusMessage('Creating Planner...');
            await createPlannerFromPDF(plannerName, uploadedPages, { presetName: pageSize });

            onClose();
        } catch (error) {
            console.error('Creation failed:', error);
            alert('Failed to create planner. Check console.');
            setStep('preview');
        }
    };

    return (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden">
                {/* Header */}
                <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
                    <h2 className="text-xl font-black text-gray-900 tracking-tight">Import PDF as Planner</h2>
                    <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
                        <X className="w-5 h-5 text-gray-400" />
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-6 relative">
                    {/* Analysis/Loading Overlay */}
                    {statusMessage && step === 'preview' && pages.length === 0 && (
                        <div className="absolute inset-0 z-10 bg-white/80 backdrop-blur-sm flex flex-col items-center justify-center space-y-4">
                            <div className="relative">
                                <Loader2 className="w-12 h-12 text-indigo-600 animate-spin" />
                                <div className="absolute inset-0 flex items-center justify-center text-[10px] font-black text-indigo-600">
                                    {Math.round(progress)}%
                                </div>
                            </div>
                            <div className="text-center">
                                <h4 className="text-lg font-bold text-gray-900">{statusMessage}</h4>
                                <p className="text-xs text-gray-500 font-medium">Please wait while we prepare your pages...</p>
                            </div>
                            {/* Progress bar */}
                            <div className="w-64 h-2 bg-gray-100 rounded-full overflow-hidden">
                                <div
                                    className="h-full bg-indigo-600 transition-all duration-300 ease-out"
                                    style={{ width: `${progress}%` }}
                                />
                            </div>
                        </div>
                    )}

                    {step === 'upload' && (
                        <div className="h-full flex flex-col items-center justify-center space-y-6 py-12">
                            <div className="w-20 h-20 bg-indigo-50 rounded-3xl flex items-center justify-center rotate-3">
                                <FileText className="w-10 h-10 text-indigo-600" />
                            </div>
                            <div className="text-center space-y-2">
                                <h3 className="text-lg font-bold text-gray-900">Upload your PDF</h3>
                                <p className="text-gray-500 text-sm max-w-xs mx-auto">
                                    Each page will become a separate page in your new digital planner.
                                </p>
                            </div>
                            <button
                                onClick={() => fileInputRef.current?.click()}
                                className="px-8 py-3 bg-indigo-600 text-white rounded-xl font-bold shadow-lg shadow-indigo-200 hover:bg-indigo-700 hover:scale-105 transition-all flex items-center gap-2"
                            >
                                <Upload className="w-5 h-5" /> Select PDF File
                            </button>
                            <input
                                ref={fileInputRef}
                                type="file"
                                accept="application/pdf"
                                className="hidden"
                                onChange={handleFileChange}
                            />
                        </div>
                    )}

                    {(step === 'preview' || step === 'creating') && (
                        <div className="space-y-6">
                            <div className="flex items-center gap-4">
                                <div className="flex-1">
                                    <label className="text-xs font-bold text-gray-500 uppercase tracking-widest block mb-1">Planner Name</label>
                                    <input
                                        type="text"
                                        value={plannerName}
                                        onChange={(e) => setPlannerName(e.target.value)}
                                        className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg font-bold text-gray-900 focus:ring-2 focus:ring-indigo-500 outline-none"
                                    />
                                </div>
                                <div className="w-56 relative">
                                    <label className="text-xs font-bold text-gray-500 uppercase tracking-widest block mb-1">Page Size</label>
                                    <div className="relative">
                                        <select
                                            value={pageSize}
                                            onChange={(e) => setPageSize(e.target.value)}
                                            className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg font-bold text-gray-900 focus:ring-2 focus:ring-indigo-500 outline-none cursor-pointer appearance-none pr-10"
                                        >
                                            <option value="Original">Original (PDF Size)</option>
                                            {PAGE_PRESETS.filter(p => p.name !== 'Custom').map(preset => (
                                                <option key={preset.name} value={preset.name}>
                                                    {preset.name} ({preset.width}x{preset.height})
                                                </option>
                                            ))}
                                        </select>
                                        <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                                    </div>
                                </div>
                            </div>

                            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-4">
                                {pages.map((page) => (
                                    <div
                                        key={page.pageNumber}
                                        onClick={() => {
                                            if (step === 'creating') return;
                                            const newPages = [...pages];
                                            const idx = newPages.findIndex(p => p.pageNumber === page.pageNumber);
                                            newPages[idx].isSelected = !newPages[idx].isSelected;
                                            setPages(newPages);
                                        }}
                                        className={`relative group cursor-pointer rounded-lg overflow-hidden border-2 transition-all ${page.isSelected ? 'border-indigo-500 ring-2 ring-indigo-100' : 'border-gray-200 opacity-60'}`}
                                    >
                                        <div className="aspect-[1/1.4] bg-gray-100">
                                            <img src={page.previewUrl} alt={`Page ${page.pageNumber}`} className="w-full h-full object-contain" />
                                        </div>
                                        <div className="absolute top-2 right-2">
                                            {page.isSelected && <CheckCircle className="w-5 h-5 text-indigo-600 bg-white rounded-full" />}
                                        </div>
                                        <div className="absolute bottom-0 inset-x-0 bg-black/50 text-white text-[10px] font-bold py-1 text-center">
                                            Page {page.pageNumber}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="px-6 py-4 border-t border-gray-100 bg-gray-50/50 flex justify-between items-center">
                    {step === 'upload' ? (
                        <span className="text-xs text-gray-400 font-medium">Supports PDF files only</span>
                    ) : (
                        <>
                            <div className="flex items-center gap-3">
                                {(step === 'creating' || (statusMessage && pages.length === 0)) && <Loader2 className="w-5 h-5 text-indigo-600 animate-spin" />}
                                <span className="text-sm font-bold text-gray-600">
                                    {step === 'creating' ? `${statusMessage} ${Math.round(progress)}%` :
                                        (statusMessage && pages.length === 0) ? `${statusMessage} ${Math.round(progress)}%` :
                                            `${pages.filter(p => p.isSelected).length} pages selected`}
                                </span>
                            </div>
                            <div className="flex gap-3">
                                <button
                                    onClick={() => setStep('upload')}
                                    disabled={step === 'creating'}
                                    className="px-4 py-2 text-gray-500 font-bold hover:bg-gray-200 rounded-lg transition-colors disabled:opacity-50"
                                >
                                    Back
                                </button>
                                <button
                                    onClick={handleCreate}
                                    disabled={step === 'creating' || pages.filter(p => p.isSelected).length === 0 || !plannerName}
                                    className="px-6 py-2 bg-indigo-600 text-white rounded-lg font-bold shadow-lg shadow-indigo-200 hover:bg-indigo-700 transition-all disabled:opacity-50 flex items-center gap-2"
                                >
                                    {step === 'creating' ? 'Creating...' : 'Create Planner'}
                                </button>
                            </div>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}

