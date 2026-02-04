import { Plus, ChevronLeft, ChevronRight, Trash2, Copy } from 'lucide-react';
import { Reorder } from 'framer-motion';
import { cn } from '@/lib/utils';

interface PageFilmbarProps {
    pages: { id: string, number: number, thumbnail?: string, name?: string | null }[];
    currentPage: number;
    onPageSelect: (pageNumber: number) => void;
    onPageReorder: (newPages: any[]) => void;
    onAddPage: () => void;
    onDuplicatePage: (index: number) => void;
    onDeletePage: (index: number) => void;
    totalPages: number;
    onPrev?: () => void;
    onNext?: () => void;
}

export function PageFilmbar({
    pages,
    currentPage,
    onPageSelect,
    onPageReorder,
    onAddPage,
    onDuplicatePage,
    onDeletePage,
    totalPages,
    onPrev,
    onNext
}: PageFilmbarProps) {
    return (
        <div className="bg-white border-t border-gray-200 h-28 lg:h-36 flex items-center px-3 lg:px-6 gap-3 lg:gap-6 shadow-up sticky bottom-0 z-30 overflow-hidden">
            <button
                onClick={onPrev}
                className={cn(
                    "p-1 hover:bg-gray-100 rounded-lg text-gray-400 transition-colors",
                    currentPage <= 1 && "opacity-20 cursor-not-allowed"
                )}
                disabled={currentPage <= 1}
            >
                <ChevronLeft className="h-5 w-5" />
            </button>

            <div className="flex-1 overflow-x-auto no-scrollbar h-full flex items-center">
                <Reorder.Group
                    axis="x"
                    values={pages}
                    onReorder={onPageReorder}
                    className="flex items-center gap-4 py-2"
                >
                    {pages.map((page) => (
                        <Reorder.Item
                            key={page.id}
                            value={page}
                            className={cn(
                                "relative flex-shrink-0 cursor-grab active:cursor-grabbing group mb-4",
                                "w-14 lg:w-16 aspect-[3/4] rounded-lg border-2 transition-all p-1",
                                currentPage === page.number
                                    ? "border-orange-500 ring-2 ring-orange-50 shadow-md"
                                    : "border-gray-200 hover:border-gray-400 bg-white"
                            )}
                            onClick={() => onPageSelect(page.number)}
                        >
                            <div className="w-full h-full bg-gray-50/50 rounded flex flex-col items-center justify-center gap-1 overflow-hidden relative">
                                {page.thumbnail ? (
                                    <img
                                        src={page.thumbnail}
                                        alt={`Page ${page.number}`}
                                        className="w-full h-full object-cover rounded shadow-inner"
                                    />
                                ) : (
                                    <>
                                        <div className="w-full h-px bg-gray-100 mt-2" />
                                        <div className="w-full h-px bg-gray-100" />
                                        <div className="w-full h-px bg-gray-100" />
                                    </>
                                )}
                                <span className={cn(
                                    "absolute bottom-1 right-1 text-[7px] lg:text-[8px] font-bold px-1 rounded-sm",
                                    page.thumbnail ? "bg-white/80 text-gray-900 shadow-sm" : "text-gray-400"
                                )}>
                                    {page.number}
                                </span>
                            </div>

                            {/* Actions - Visible on hover */}
                            <div className="absolute -top-2 -right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity z-10">
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        onDuplicatePage(pages.indexOf(page));
                                    }}
                                    className="bg-blue-500 text-white rounded-full p-1 hover:bg-blue-600 shadow-sm"
                                    title="Duplicate Page"
                                >
                                    <Copy className="h-3 w-3" />
                                </button>
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        onDeletePage(pages.indexOf(page));
                                    }}
                                    className="bg-red-500 text-white rounded-full p-1 hover:bg-red-600 shadow-sm"
                                    title="Delete Page"
                                >
                                    <Trash2 className="h-3 w-3" />
                                </button>
                            </div>

                            {/* Page Name - Underneath */}
                            <div className="absolute top-full left-0 right-0 mt-1 px-1">
                                <p className="text-[9px] font-medium text-gray-500 truncate text-center leading-none">
                                    {page.name || `Page ${page.number}`}
                                </p>
                            </div>
                        </Reorder.Item>
                    ))}

                    <button
                        onClick={onAddPage}
                        className="flex-shrink-0 w-16 aspect-[3/4] rounded-lg border-2 border-dashed border-gray-200 flex flex-col items-center justify-center gap-1 hover:border-orange-200 hover:bg-orange-50/30 transition-all text-gray-400 hover:text-orange-500"
                    >
                        <Plus className="h-5 w-5" />
                    </button>
                </Reorder.Group>
            </div>

            <div className="flex items-center gap-2 lg:gap-4 shrink-0">
                <button
                    onClick={onNext}
                    className={cn(
                        "p-1 hover:bg-gray-100 rounded-lg text-gray-400 transition-colors",
                        currentPage >= totalPages && "opacity-20 cursor-not-allowed"
                    )}
                    disabled={currentPage >= totalPages}
                >
                    <ChevronRight className="h-5 w-5" />
                </button>
                <div className="hidden lg:block border-l border-gray-100 h-10 mx-1 lg:mx-2" />
                <div className="text-right min-w-[60px] lg:min-w-[80px]">
                    <p className="text-[10px] lg:text-[11px] font-black text-gray-900 uppercase">Page {currentPage} of {totalPages}</p>
                    <div className="w-full bg-gray-100 h-1 rounded-full mt-1 overflow-hidden">
                        <div
                            className="bg-orange-500 h-full transition-all duration-300"
                            style={{ width: `${(currentPage / totalPages) * 100}%` }}
                        />
                    </div>
                </div>
            </div>
        </div>
    );
}
