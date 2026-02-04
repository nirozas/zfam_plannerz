import { useState, useEffect } from 'react';
import { Search, ChevronRight, Hash } from 'lucide-react';
import { usePlannerStore } from '@/store/plannerStore';
import { cn } from '@/lib/utils';

export function WorkspaceSearch() {
    const { activePlanner, setHighlightedElementId } = usePlannerStore();
    const [query, setQuery] = useState('');
    const [results, setResults] = useState<{ pageIndex: number; elementId: string; text: string; type: 'text' | 'ink' }[]>([]);

    useEffect(() => {
        if (!query || query.length < 2 || !activePlanner) {
            setResults([]);
            return;
        }

        const lowerQuery = query.toLowerCase();
        const matches: any[] = [];

        activePlanner.pages.forEach((page, pageIndex) => {
            // Search in Text Elements
            page.elements.forEach(el => {
                if (el.type === 'text' && el.text?.toLowerCase().includes(lowerQuery)) {
                    matches.push({
                        pageIndex,
                        elementId: el.id,
                        text: el.text,
                        type: 'text'
                    });
                }
                if (el.type === 'ocr_metadata' && el.text?.toLowerCase().includes(lowerQuery)) {
                    matches.push({
                        pageIndex,
                        elementId: el.id,
                        text: el.text,
                        type: 'ink'
                    });
                }
            });
        });

        setResults(matches);
    }, [query, activePlanner]);

    const handleResultClick = (result: any) => {
        // 1. Jump to page
        usePlannerStore.setState({ currentPageIndex: result.pageIndex });

        // 2. Highlight element
        setHighlightedElementId(result.elementId);
    };

    return (
        <div className="flex flex-col h-full bg-white border-l border-gray-200 w-80 shadow-xl overflow-hidden animate-in slide-in-from-right duration-300">
            <div className="p-4 border-b border-gray-100 bg-gray-50/50">
                <h3 className="text-sm font-bold text-gray-800 flex items-center gap-2 mb-3">
                    <Search size={16} className="text-indigo-600" />
                    In-Planner Search
                </h3>
                <div className="relative">
                    <input
                        type="text"
                        className="w-full pl-9 pr-4 py-2 bg-white border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all"
                        placeholder="Find text or handwriting..."
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        autoFocus
                    />
                    <Search className="absolute left-3 top-2.5 text-gray-400" size={16} />
                </div>
            </div>

            <div className="flex-1 overflow-y-auto custom-scrollbar p-2">
                {query.length >= 2 && results.length === 0 && (
                    <div className="text-center py-10">
                        <div className="bg-gray-50 w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-3">
                            <Search size={20} className="text-gray-300" />
                        </div>
                        <p className="text-sm text-gray-500 font-medium">No matches found</p>
                        <p className="text-xs text-gray-400 mt-1">Try a different keyword</p>
                    </div>
                )}

                {query.length < 2 && (
                    <div className="text-center py-10 px-6">
                        <Hash size={24} className="text-gray-200 mx-auto mb-3" />
                        <p className="text-xs text-gray-400 italic">Search scans all text boxes and AI-transcribed handwriting in this planner.</p>
                    </div>
                )}

                <div className="space-y-1">
                    {results.map((result, idx) => (
                        <button
                            key={`${result.elementId}-${idx}`}
                            onClick={() => handleResultClick(result)}
                            className="w-full text-left p-3 rounded-xl hover:bg-indigo-50 group transition-all border border-transparent hover:border-indigo-100"
                        >
                            <div className="flex items-center justify-between mb-1">
                                <span className="text-[10px] font-bold text-indigo-500 uppercase tracking-wider">
                                    Page {result.pageIndex + 1}
                                </span>
                                <span className={cn(
                                    "text-[9px] px-1.5 py-0.5 rounded-full font-bold uppercase",
                                    result.type === 'text' ? "bg-blue-100 text-blue-600" : "bg-purple-100 text-purple-600"
                                )}>
                                    {result.type}
                                </span>
                            </div>
                            <p className="text-xs text-gray-600 line-clamp-2 font-medium leading-relaxed">
                                {result.text}
                            </p>
                            <div className="mt-2 flex items-center text-[10px] text-gray-400 font-bold opacity-0 group-hover:opacity-100 transition-opacity">
                                JUMP TO PAGE <ChevronRight size={10} />
                            </div>
                        </button>
                    ))}
                </div>
            </div>
        </div>
    );
}
