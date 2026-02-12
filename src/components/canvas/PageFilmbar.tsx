import React, { useRef, useEffect, useState } from 'react';
import { Plus, ChevronLeft, ChevronRight, Trash2, Copy, GripVertical } from 'lucide-react';
import { Reorder, useDragControls } from 'framer-motion';
import { cn } from '@/lib/utils';
import './PageFilmbar.css';

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
    const scrollContainerRef = useRef<HTMLDivElement>(null);

    // Auto-scroll to active page
    useEffect(() => {
        if (scrollContainerRef.current) {
            const activeItem = scrollContainerRef.current.querySelector('[data-active="true"]');
            if (activeItem) {
                activeItem.scrollIntoView({
                    behavior: 'smooth',
                    block: 'nearest',
                    inline: 'center'
                });
            }
        }
    }, [currentPage]);

    return (
        <div className="bg-white border-t border-gray-200 h-28 lg:h-36 flex items-center px-3 lg:px-6 gap-3 lg:gap-6 shadow-up sticky bottom-0 z-30 overflow-hidden">
            <button
                onClick={onPrev}
                className={cn(
                    "p-1.5 hover:bg-gray-100 rounded-lg text-gray-400 transition-colors shadow-sm",
                    currentPage <= 1 && "opacity-20 cursor-not-allowed"
                )}
                disabled={currentPage <= 1}
            >
                <ChevronLeft className="h-5 w-5 md:h-6 md:w-6" />
            </button>

            <div
                ref={scrollContainerRef}
                className="flex-1 overflow-x-auto page-filmbar-container h-full flex items-center py-2"
            >
                <Reorder.Group
                    axis="x"
                    values={pages}
                    onReorder={onPageReorder}
                    className="flex items-center gap-4 px-4 h-full"
                >
                    {pages.map((page, index) => (
                        <PageThumb
                            key={page.id}
                            page={page}
                            isActive={currentPage === page.number}
                            onClick={() => onPageSelect(page.number)}
                            onDuplicate={() => onDuplicatePage(index)}
                            onDelete={() => onDeletePage(index)}
                        />
                    ))}

                    <button
                        onClick={onAddPage}
                        className="flex-shrink-0 w-16 lg:w-20 aspect-[3/4] rounded-lg border-2 border-dashed border-gray-200 flex flex-col items-center justify-center gap-1 hover:border-indigo-300 hover:bg-indigo-50/30 transition-all text-gray-400 hover:text-indigo-600 mb-2"
                    >
                        <Plus className="h-6 w-6" />
                        <span className="text-[8px] font-bold uppercase">Add</span>
                    </button>
                </Reorder.Group>
            </div>

            <div className="flex items-center gap-2 lg:gap-4 shrink-0">
                <button
                    onClick={onNext}
                    className={cn(
                        "p-1.5 hover:bg-gray-100 rounded-lg text-gray-400 transition-colors shadow-sm",
                        currentPage >= totalPages && "opacity-20 cursor-not-allowed"
                    )}
                    disabled={currentPage >= totalPages}
                >
                    <ChevronRight className="h-5 w-5 md:h-6 md:w-6" />
                </button>
                <div className="hidden md:block border-l border-gray-100 h-10 mx-2" />
                <div className="text-right min-w-[80px] lg:min-w-[100px]">
                    <div className="flex items-center justify-end gap-1 mb-1">
                        <span className="text-[9px] lg:text-[10px] font-black text-gray-400 uppercase leading-none">Page</span>
                        <input
                            type="number"
                            min={1}
                            max={totalPages}
                            value={currentPage}
                            onChange={(e) => {
                                const val = parseInt(e.target.value);
                                if (!isNaN(val) && val >= 1 && val <= totalPages) {
                                    onPageSelect(val);
                                }
                            }}
                            className="w-8 md:w-10 bg-indigo-50 border-none focus:ring-2 ring-indigo-500 rounded text-[10px] md:text-[11px] font-black text-indigo-600 text-center p-0 h-5"
                        />
                        <span className="text-[10px] lg:text-[11px] font-black text-gray-400">/ {totalPages}</span>
                    </div>
                    <div className="w-full bg-gray-100 h-1.5 rounded-full overflow-hidden">
                        <div
                            className="bg-indigo-500 h-full transition-all duration-300"
                            style={{ width: `${(currentPage / totalPages) * 100}%` }}
                        />
                    </div>
                </div>
            </div>
        </div>
    );
}

function PageThumb({ page, isActive, onClick, onDuplicate, onDelete }: any) {
    const dragControls = useDragControls();
    const [isReordering, setIsReordering] = useState(false);
    const longPressTimer = useRef<any>(null);

    const startReorder = (e: any) => {
        setIsReordering(true);
        dragControls.start(e);
    };

    const handlePointerDown = (e: React.PointerEvent) => {
        // Long press detection
        longPressTimer.current = setTimeout(() => {
            startReorder(e);
        }, 500);
    };

    const handlePointerUp = () => {
        if (longPressTimer.current) {
            clearTimeout(longPressTimer.current);
            longPressTimer.current = null;
        }
    };

    return (
        <Reorder.Item
            value={page}
            dragControls={dragControls}
            dragListener={false}
            data-active={isActive}
            onPointerUp={() => {
                handlePointerUp();
                setIsReordering(false);
            }}
            onPointerCancel={() => {
                handlePointerUp();
                setIsReordering(false);
            }}
            onDragEnd={() => setIsReordering(false)}
            className={cn(
                "relative flex-shrink-0 group mb-2 select-none",
                "w-14 lg:w-16 aspect-[3/4] rounded-lg border-2 transition-all p-1",
                isActive
                    ? "border-indigo-600 ring-4 ring-indigo-50 shadow-lg scale-105 z-10"
                    : "border-gray-200 hover:border-indigo-300 bg-white shadow-sm",
                isReordering ? "reorder-item-dragging cursor-grabbing" : "cursor-pointer"
            )}
        >
            <div
                className="w-full h-full bg-gray-50/50 rounded flex flex-col items-center justify-center gap-1 overflow-hidden relative"
                onClick={onClick}
                onDoubleClick={(e) => startReorder(e)}
                onPointerDown={handlePointerDown}
            >
                {page.thumbnail ? (
                    <img
                        src={page.thumbnail}
                        alt={`P${page.number}`}
                        className="w-full h-full object-cover rounded shadow-inner"
                    />
                ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center opacity-20">
                        <div className="w-8 h-px bg-gray-400 mb-1" />
                        <div className="w-8 h-px bg-gray-400 mb-1" />
                        <div className="w-8 h-px bg-gray-400" />
                    </div>
                )}

                <span className={cn(
                    "absolute bottom-0.5 right-0.5 text-[8px] font-black px-1 rounded-sm",
                    page.thumbnail ? "bg-white/90 text-indigo-600 shadow-sm" : "text-gray-400"
                )}>
                    {page.number}
                </span>

                {/* Drag Hint */}
                <div className="absolute top-0.5 left-0.5 opacity-0 group-hover:opacity-40 transition-opacity">
                    <GripVertical size={10} className="text-gray-400" />
                </div>
            </div>

            {/* Actions */}
            <div className="absolute -top-2 -right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity z-20">
                <button
                    onClick={(e) => {
                        e.stopPropagation();
                        onDuplicate();
                    }}
                    className="bg-indigo-500 text-white rounded-full p-1 hover:bg-indigo-600 shadow-md transition-all active:scale-90"
                    title="Duplicate"
                >
                    <Copy className="h-3 w-3" />
                </button>
                <button
                    onClick={(e) => {
                        e.stopPropagation();
                        onDelete();
                    }}
                    className="bg-red-500 text-white rounded-full p-1 hover:bg-red-600 shadow-md transition-all active:scale-90"
                    title="Delete"
                >
                    <Trash2 className="h-3 w-3" />
                </button>
            </div>

            <div className="absolute top-full left-0 right-0 mt-1 px-1">
                <p className={cn(
                    "text-[8px] font-bold truncate text-center leading-none transition-colors",
                    isActive ? "text-indigo-600" : "text-gray-400"
                )}>
                    {page.name || `Pg ${page.number}`}
                </p>
            </div>
        </Reorder.Item>
    );
}
