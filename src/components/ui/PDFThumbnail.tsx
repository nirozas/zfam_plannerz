import React, { useState, useEffect } from 'react';
import { Book } from 'lucide-react';
import * as pdfjsLib from 'pdfjs-dist';

// Configure PDF.js worker - although it's usually set globally in the app, 
// we ensure it here if it's not already.
pdfjsLib.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.mjs`;

interface PDFThumbnailProps {
    url: string;
    className?: string;
    scale?: number;
}

export const PDFThumbnail: React.FC<PDFThumbnailProps> = ({ url, className, scale = 0.4 }) => {
    const [thumbnail, setThumbnail] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        let isMounted = true;

        const generateThumbnail = async () => {
            if (!url) {
                setLoading(false);
                return;
            }

            try {
                // Ensure URL is a full URL and handles CORS if necessary
                const loadingTask = pdfjsLib.getDocument({
                    url,
                    withCredentials: false
                });

                const pdf = await loadingTask.promise;
                const page = await pdf.getPage(1);
                const viewport = page.getViewport({ scale });

                const canvas = document.createElement('canvas');
                const context = canvas.getContext('2d');

                if (context) {
                    canvas.height = viewport.height;
                    canvas.width = viewport.width;

                    await page.render({ canvasContext: context, viewport }).promise;

                    if (isMounted) {
                        setThumbnail(canvas.toDataURL());
                    }
                }
            } catch (err) {
                console.warn("Error generating PDF preview client-side:", err, url);
            } finally {
                if (isMounted) {
                    setLoading(false);
                }
            }
        };

        generateThumbnail();

        return () => {
            isMounted = false;
        };
    }, [url, scale]);

    if (loading) {
        return (
            <div className={`w-full h-full flex flex-col items-center justify-center bg-gray-50 ${className}`}>
                <div className="w-8 h-8 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin" />
                <span className="text-[10px] text-gray-400 mt-2 font-bold uppercase">Generating...</span>
            </div>
        );
    }

    if (!thumbnail) {
        return (
            <div className={`w-full h-full flex flex-col items-center justify-center bg-gray-50 gap-2 ${className}`}>
                <Book size={48} className="text-indigo-100" />
                <span className="text-[10px] text-gray-400 font-bold uppercase">PDF</span>
            </div>
        );
    }

    return (
        <img
            src={thumbnail}
            alt="PDF Preview"
            className={`w-full h-full object-cover animate-in fade-in duration-500 ${className}`}
        />
    );
};
