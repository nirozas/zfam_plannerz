import React, { useState, useMemo, useEffect } from 'react';
import { useCardStore } from '../../store/cardStore';
import { useParams, useNavigate } from 'react-router-dom';
import {
    Plus, ChevronRight, Home, MoreVertical, Folder, FileText,
    Share2, Edit, Trash2, Info, Image as ImageIcon,
    Link as LinkIcon, Star, MessageSquare, Palette, Search, FolderOpen, X as XIcon
} from 'lucide-react';
import { Card as CardType } from '../../types/cards';
import { CardEntryModal } from './CardEntryModal';
import { ListEditor } from './ListEditor';
import { MetadataModal, ShareModal } from './CardModals';
import { BackgroundSettings } from './BackgroundSettings';
import { Resizable } from 're-resizable';
import { motion } from 'framer-motion';
import {
    DndContext,
    closestCenter,
    KeyboardSensor,
    PointerSensor,
    useSensor,
    useSensors,
    DragOverlay,
    defaultDropAnimationSideEffects
} from '@dnd-kit/core';
import {
    arrayMove,
    SortableContext,
    sortableKeyboardCoordinates,
    rectSortingStrategy,
    useSortable
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

const CardsPage: React.FC = () => {
    const [layoutMode, setLayoutMode] = useState<'grid' | 'free'>(() => (localStorage.getItem('card_layout_mode') as any) || 'grid');
    const {
        currentFolderId,
        setCurrentFolderId,
        getCardsByParent,
        getBreadcrumbs,
        deleteCard,
        updateCard,
        cards,
        rootBackground,
        rootBackgroundType,
        rootBackgroundOpacity,
        setRootBackground,
        gridGap,
        setGridGap,
        isFetching,
        reorderCards
    } = useCardStore();

    const sensors = useSensors(
        useSensor(PointerSensor, {
            activationConstraint: {
                distance: 8,
            },
        }),
        useSensor(KeyboardSensor, {
            coordinateGetter: sortableKeyboardCoordinates,
        })
    );

    const [activeDragId, setActiveDragId] = useState<string | null>(null);
    const { folderId } = useParams();
    const navigate = useNavigate();

    // Sync folderId from URL to store
    useEffect(() => {
        if (!folderId) {
            setCurrentFolderId(null);
            setEditingList(null);
            return;
        }

        const found = cards.find(c =>
            c.id === folderId ||
            c.title.toLowerCase().replace(/\s+/g, '-') === folderId
        );

        if (found) {
            if (found.type === 'folder') {
                setCurrentFolderId(found.id);
                setEditingList(null);
            } else if (found.type === 'list') {
                setEditingList(found);
                setCurrentFolderId(found.parentId);
            }
        } else if (cards.length > 0 && !isFetching) {
            // Only reset if we have cards loaded, stopped fetching, and STILL don't find it
            setCurrentFolderId(null);
            setEditingList(null);
            navigate('/cards');
        }
    }, [folderId, cards, setCurrentFolderId, navigate, isFetching]);

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingCard, setEditingCard] = useState<CardType | null>(null);
    const [editingList, setEditingList] = useState<CardType | null>(null);

    // UI states for new modals
    const [activeMetadataCard, setActiveMetadataCard] = useState<CardType | null>(null);
    const [activeShareCard, setActiveShareCard] = useState<CardType | null>(null);
    const [isBackgroundSettingsOpen, setIsBackgroundSettingsOpen] = useState(false);
    const [activeCategory, setActiveCategory] = useState<string | null>(null);
    const [sortBy, setSortBy] = useState<'name' | 'recent' | 'group' | 'manual'>('recent');

    const toggleLayoutMode = () => {
        const next = layoutMode === 'grid' ? 'free' : 'grid';
        setLayoutMode(next);
        localStorage.setItem('card_layout_mode', next);
    };

    const currentCards = getCardsByParent(currentFolderId);
    const breadcrumbs = getBreadcrumbs(currentFolderId);

    // Get unified categories for filtering
    const allCategories = useMemo(() => {
        const cats = new Set(currentCards.map(c => c.category || 'Uncategorized'));
        return Array.from(cats);
    }, [currentCards]);

    // Processed cards for display (Filtered & Sorted)
    const displayedCards = useMemo(() => {
        let items = [...currentCards];

        // 1. Filtering
        if (activeCategory) {
            items = items.filter(c => (c.category || 'Uncategorized') === activeCategory);
        }

        // 2. Sorting
        items.sort((a, b) => {
            if (sortBy === 'manual') return (a.sortOrder || 0) - (b.sortOrder || 0);
            if (sortBy === 'name') return a.title.localeCompare(b.title);
            if (sortBy === 'recent') return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
            if (sortBy === 'group') return (a.category || '').localeCompare(b.category || '');
            return 0;
        });

        return items;
    }, [currentCards, activeCategory, sortBy]);

    // Determine current background
    const currentFolder = useMemo(() => cards.find(c => c.id === currentFolderId), [cards, currentFolderId]);
    const backgroundStyle = useMemo(() => {
        const bg = currentFolder?.backgroundUrl || rootBackground;
        if (!bg) return {};

        const type = currentFolder?.backgroundUrl ? currentFolder.backgroundType : rootBackgroundType;
        const opacity = (currentFolder?.backgroundUrl ? currentFolder.backgroundOpacity : rootBackgroundOpacity) ?? 100;

        if (type === 'image') {
            return {
                backgroundImage: `linear-gradient(rgba(255, 255, 255, ${1 - opacity / 100}), rgba(255, 255, 255, ${1 - opacity / 100})), url(${bg})`,
                backgroundSize: 'cover',
                backgroundPosition: 'center',
                backgroundAttachment: 'fixed'
            };
        }

        // For solid color - handle hex colors by adding alpha
        const hexOpacity = Math.round((opacity / 100) * 255).toString(16).padStart(2, '0');
        const colorWithAlpha = bg.startsWith('#') ? `${bg}${hexOpacity}` : bg;

        return { backgroundColor: colorWithAlpha };
    }, [currentFolder, currentFolderId, rootBackground, rootBackgroundType, rootBackgroundOpacity]);

    const handleCardClick = (card: CardType) => {
        const slug = card.title.toLowerCase().replace(/\s+/g, '-');
        navigate(`/cards/${slug}`);
    };

    const navigateToFolder = (id: string | null) => {
        if (!id) {
            navigate('/cards');
        } else {
            const folder = cards.find(c => c.id === id);
            const slug = folder ? folder.title.toLowerCase().replace(/\s+/g, '-') : id;
            navigate(`/cards/${slug}`);
        }
    };

    const handleDelete = async (card: CardType) => {
        const isFolder = card.type === 'folder';
        const message = isFolder
            ? `Are you sure you want to delete the folder "${card.title}" and ALL its contents? This cannot be undone.`
            : `Are you sure you want to delete "${card.title}"?`;

        if (window.confirm(message)) {
            await deleteCard(card.id);
        }
    };

    const handleBackgroundSave = (type: 'color' | 'image', value: string, opacity: number) => {
        if (currentFolderId) {
            updateCard(currentFolderId, { backgroundType: type, backgroundUrl: value, backgroundOpacity: opacity });
        } else {
            setRootBackground(type, value, opacity);
        }
        setIsBackgroundSettingsOpen(false);
    };

    const handleBackgroundReset = () => {
        if (currentFolderId) {
            updateCard(currentFolderId, { backgroundType: 'color', backgroundUrl: undefined });
        } else {
            setRootBackground('color', null);
        }
        setIsBackgroundSettingsOpen(false);
    };

    if (editingList) {
        return <ListEditor key={editingList.id} card={editingList} onBack={() => navigateToFolder(editingList.parentId)} />;
    }

    const activeCard = activeDragId ? cards.find(c => c.id === activeDragId) : null;

    const handleDragStart = (event: any) => {
        setActiveDragId(event.active.id as string);
    };

    const handleDragEnd = (event: any) => {
        setActiveDragId(null);
        const { active, over } = event;
        if (!over || active.id === over.id) return;

        const oldIndex = displayedCards.findIndex(c => c.id === active.id);
        const newIndex = displayedCards.findIndex(c => c.id === over.id);

        if (oldIndex !== -1 && newIndex !== -1) {
            const newOrderIds = arrayMove(displayedCards, oldIndex, newIndex).map(c => c.id);
            reorderCards(newOrderIds.filter(Boolean) as string[]);
        }
    };

    return (
        <div className="flex flex-col h-full overflow-hidden transition-all duration-500" style={backgroundStyle}>
            {/* Header / Breadcrumbs */}
            <header className={`flex items-center justify-between px-4 md:px-6 py-3 md:py-4 border-b border-slate-200 sticky top-0 z-40 transition-all ${backgroundStyle.backgroundImage ? 'bg-white/80 backdrop-blur-md' : 'bg-white'}`}>
                <nav className="flex items-center space-x-1 md:space-x-2 text-[10px] md:text-sm font-medium overflow-x-auto no-scrollbar py-1 min-w-0 flex-1 mr-2 md:mr-4">
                    {breadcrumbs.map((crumb, index) => (
                        <React.Fragment key={crumb.id || 'home'}>
                            {index > 0 && <ChevronRight size={12} className="text-slate-400 shrink-0" />}
                            <button
                                onClick={() => navigateToFolder(crumb.id)}
                                className={`hover:text-indigo-600 transition-colors whitespace-nowrap px-1 py-1.5 rounded-lg ${index === breadcrumbs.length - 1 ? 'text-slate-900 font-bold' : 'text-slate-500'
                                    }`}
                            >
                                {index === 0 ? <Home size={18} className="size-[18px]" /> : crumb.title}
                            </button>
                        </React.Fragment>
                    ))}
                </nav>

                <div className="flex items-center gap-1.5 md:gap-3 shrink-0">
                    <button
                        onClick={() => setIsBackgroundSettingsOpen(true)}
                        className="p-2.5 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-all"
                        title="Page Background"
                    >
                        <Palette size={20} className="size-5" />
                    </button>
                    <button
                        onClick={toggleLayoutMode}
                        className={`p-2.5 rounded-xl transition-all ${layoutMode === 'free' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-500 hover:text-indigo-600 hover:bg-indigo-50'}`}
                        title={layoutMode === 'grid' ? "Switch to Freeboard" : "Switch to Grid"}
                    >
                        {layoutMode === 'grid' ? <Plus size={20} className="size-5" /> : <Home size={20} className="size-5" />}
                    </button>
                    {currentFolder && (
                        <button
                            onClick={() => setActiveShareCard(currentFolder)}
                            className="p-2.5 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-all"
                            title="Share Folder"
                        >
                            <Share2 size={20} className="size-5" />
                        </button>
                    )}
                    <div className="w-px h-6 bg-slate-200 mx-1 hidden sm:block" />
                    <button
                        onClick={() => setIsModalOpen(true)}
                        className="flex items-center gap-2 bg-indigo-600 text-white px-3 md:px-4 py-1.5 md:py-2 rounded-xl hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-100 font-bold text-[11px] md:text-sm whitespace-nowrap"
                    >
                        <Plus size={18} className="size-5" />
                        <span className="hidden sm:inline">Add Item</span>
                    </button>
                </div>
            </header>

            {/* Filter & Sort Bar */}
            <div className={`px-4 md:px-6 py-3 border-b border-slate-100 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 z-30 transition-all ${backgroundStyle.backgroundImage ? 'bg-white/40 backdrop-blur-md' : 'bg-slate-50/50'}`}>
                <div className="flex items-center gap-2 overflow-x-auto w-full sm:w-auto scrollbar-none no-scrollbar pb-1 sm:pb-0">
                    <button
                        onClick={() => setActiveCategory(null)}
                        className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest transition-all shrink-0 ${!activeCategory ? 'bg-indigo-600 text-white shadow-lg' : 'bg-white text-slate-400 border border-slate-100'}`}
                    >
                        All
                    </button>
                    {allCategories.map(cat => (
                        <button
                            key={cat}
                            onClick={() => setActiveCategory(cat)}
                            className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest whitespace-nowrap transition-all shrink-0 ${activeCategory === cat ? 'bg-indigo-600 text-white shadow-lg' : 'bg-white text-slate-400 border border-slate-100'}`}
                        >
                            {cat}
                        </button>
                    ))}
                </div>

                <div className="flex items-center gap-4 shrink-0 w-full sm:w-auto justify-between sm:justify-end sm:pl-4 sm:border-l border-slate-200">
                    {/* Dynamic Spacing Control */}
                    <div className="flex items-center gap-2 group/gap">
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none">Spacing:</span>
                        <div className="flex items-center gap-1.5 px-2 py-1 bg-white/50 rounded-lg border border-slate-100 hover:border-slate-200 transition-all">
                            <input
                                type="range"
                                min="0"
                                max="40"
                                step="2"
                                value={gridGap}
                                onChange={(e) => setGridGap(parseInt(e.target.value))}
                                className="w-16 h-1 accent-indigo-500 cursor-pointer opacity-70 hover:opacity-100 transition-opacity"
                            />
                            <span className="text-[9px] font-black text-slate-500 w-4 text-center">{gridGap}</span>
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none">Sort:</span>
                        <select
                            value={sortBy}
                            onChange={(e) => setSortBy(e.target.value as any)}
                            className="bg-transparent text-[11px] font-black text-indigo-600 uppercase tracking-widest outline-none cursor-pointer"
                        >
                            <option value="recent">Recent</option>
                            <option value="name">Name</option>
                            <option value="group">Group</option>
                            <option value="manual">Manual</option>
                        </select>
                    </div>
                </div>
            </div>

            <main className={`flex-1 overflow-auto p-4 md:p-6 relative ${layoutMode === 'free' ? 'overflow-both' : ''}`} style={{ minHeight: 'calc(100vh - 120px)' }}>
                {currentCards.length === 0 ? (
                    <div className={`flex flex-col items-center justify-center h-full rounded-2xl md:rounded-3xl ${backgroundStyle.backgroundImage ? 'bg-white/40 backdrop-blur-sm' : 'text-slate-400'}`}>
                        <div className="w-16 h-16 md:w-24 md:h-24 bg-white/80 rounded-full flex items-center justify-center mb-4 shadow-sm">
                            <Plus size={32} className="text-slate-300 md:size-40" />
                        </div>
                        <p className="text-base md:text-lg font-bold text-slate-600 text-center">No items in this space</p>
                        <p className="text-xs md:text-sm text-slate-500 text-center px-4">Click the "Add Item" button to organize your thoughts</p>
                    </div>
                ) : (
                    <DndContext
                        sensors={sensors}
                        collisionDetection={closestCenter}
                        onDragStart={handleDragStart}
                        onDragEnd={handleDragEnd}
                        modifiers={layoutMode === 'grid' ? [] : []}
                    >
                        <SortableContext
                            items={displayedCards.map(c => c.id)}
                            strategy={layoutMode === 'grid' ? rectSortingStrategy : undefined}
                        >
                            <div
                                className={layoutMode === 'grid' ? "flex flex-wrap items-start" : "relative w-full h-full min-h-[500px]"}
                                style={{ gap: layoutMode === 'grid' ? `${gridGap}px` : '0' }}
                            >
                                {displayedCards.map((card) => (
                                    <SortableCard
                                        key={card.id}
                                        card={card}
                                        layoutMode={layoutMode}
                                        gridGap={gridGap}
                                        onCardClick={() => handleCardClick(card)}
                                        onDelete={() => handleDelete(card)}
                                        onEdit={() => {
                                            setEditingCard(card);
                                            setIsModalOpen(true);
                                        }}
                                        onMetadata={() => setActiveMetadataCard(card)}
                                        onShare={() => setActiveShareCard(card)}
                                        onResize={(w: number, h: number) => updateCard(card.id, { width: w, height: h })}
                                        onMove={(pid: string) => updateCard(card.id, { parentId: pid })}
                                        allFolders={cards.filter(c => c.type === 'folder' && c.id !== card.id).map(f => ({ id: f.id, title: f.title }))}
                                        updateCard={updateCard}
                                    />
                                ))}
                            </div>
                        </SortableContext>

                        <DragOverlay adjustScale={true} dropAnimation={{
                            duration: 250,
                            easing: 'cubic-bezier(0.18, 0.67, 0.6, 1.22)',
                            sideEffects: defaultDropAnimationSideEffects({
                                styles: {
                                    active: {
                                        opacity: '0.5',
                                    },
                                },
                            }),
                        }}>
                            {activeDragId && activeCard ? (
                                <div style={{ width: activeCard.width || 280, opacity: 0.8 }}>
                                    <CardItem
                                        card={activeCard}
                                        onClick={() => { }}
                                        onDelete={() => { }}
                                        onEdit={() => { }}
                                        onMetadata={() => { }}
                                        onShare={() => { }}
                                        onResize={() => { }}
                                        onMove={() => { }}
                                        allFolders={[]}
                                    />
                                </div>
                            ) : null}
                        </DragOverlay>
                    </DndContext>
                )}
            </main>


            {isModalOpen && (
                <CardEntryModal
                    isOpen={isModalOpen}
                    onClose={() => {
                        setIsModalOpen(false);
                        setEditingCard(null);
                    }}
                    parentId={currentFolderId}
                    editingCard={editingCard}
                />
            )}

            {isBackgroundSettingsOpen && (
                <BackgroundSettings
                    currentUrl={currentFolderId ? currentFolder?.backgroundUrl : rootBackground || undefined}
                    currentType={currentFolderId ? (currentFolder?.backgroundType || 'color') : rootBackgroundType}
                    currentOpacity={currentFolderId ? (currentFolder?.backgroundOpacity ?? 100) : rootBackgroundOpacity}
                    onSave={handleBackgroundSave}
                    onReset={handleBackgroundReset}
                    onClose={() => setIsBackgroundSettingsOpen(false)}
                />
            )}

            {activeMetadataCard && (
                <MetadataModal
                    card={activeMetadataCard}
                    onClose={() => setActiveMetadataCard(null)}
                />
            )}

            {activeShareCard && (
                <ShareModal
                    card={activeShareCard}
                    onClose={() => setActiveShareCard(null)}
                    onShare={async (email) => {
                        try {
                            await useCardStore.getState().shareCard(activeShareCard.id, email);
                            alert(`Entry shared successfully with ${email}`);
                            setActiveShareCard(null);
                        } catch (err: any) {
                            alert(err.message || "Failed to share entry");
                        }
                    }}
                />
            )}
        </div>
    );
};

const SortableCard = ({ card, layoutMode, gridGap, updateCard, onCardClick, ...props }: any) => {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging
    } = useSortable({ id: card.id });

    if (layoutMode === 'free') {
        return (
            <motion.div
                key={card.id}
                layout
                drag
                dragMomentum={false}
                dragElastic={0.1}
                whileDrag={{
                    scale: 1.05,
                    zIndex: 50,
                    boxShadow: "0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)"
                }}
                onDragEnd={(_, info) => {
                    updateCard(card.id, { x: (card.x || 0) + info.offset.x, y: (card.y || 0) + info.offset.y });
                }}
                style={{
                    position: 'absolute',
                    left: card.x || 0,
                    top: card.y || 0,
                }}
            >
                <div data-folder-id={card.type === 'folder' ? card.id : undefined} className="h-full">
                    <CardItem card={card} onClick={onCardClick} {...props} />
                </div>
            </motion.div>
        );
    }

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.3 : 1,
        // we add touchAction: 'none' to allow mouse dragging on touch devices if needed
        touchAction: 'none'
    };

    return (
        <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
            <div data-folder-id={card.type === 'folder' ? card.id : undefined} className="h-full">
                <CardItem card={card} onClick={onCardClick} {...props} />
            </div>
        </div>
    );
};

// ─────────────────────────────────────────────
// Move-to-Folder Modal
// ─────────────────────────────────────────────
const MoveFolderModal: React.FC<{
    card: CardType;
    allFolders: { id: string; title: string }[];
    onMove: (parentId: string | null) => void;
    onClose: () => void;
}> = ({ card, allFolders, onMove, onClose }) => {
    const [search, setSearch] = useState('');
    const filtered = useMemo(() => {
        const q = search.toLowerCase();
        return allFolders.filter(f => f.id !== card.id && f.title.toLowerCase().includes(q));
    }, [search, allFolders, card.id]);

    return (
        <div
            className="fixed inset-0 z-[9999] flex items-center justify-center p-4"
            style={{ background: 'rgba(15,23,42,0.45)', backdropFilter: 'blur(4px)' }}
            onClick={onClose}
        >
            <div
                className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden animate-in zoom-in-95 duration-200"
                onClick={e => e.stopPropagation()}
            >
                {/* Header */}
                <div className="flex items-center justify-between px-5 pt-5 pb-3 border-b border-slate-100">
                    <div className="flex items-center gap-2">
                        <div className="p-1.5 bg-indigo-50 text-indigo-600 rounded-lg">
                            <FolderOpen size={16} />
                        </div>
                        <div>
                            <h3 className="text-sm font-black text-slate-800">Move to Folder</h3>
                            <p className="text-[10px] text-slate-400 font-bold truncate max-w-[180px]">Moving: {card.title}</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors">
                        <XIcon size={16} />
                    </button>
                </div>

                {/* Search */}
                <div className="px-4 pt-3 pb-2">
                    <div className="relative">
                        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input
                            autoFocus
                            type="text"
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                            placeholder="Search folders..."
                            className="w-full pl-8 pr-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-400 focus:border-transparent font-medium"
                        />
                    </div>
                </div>

                {/* Folder List */}
                <div className="max-h-60 overflow-y-auto px-2 pb-3">
                    {/* Root */}
                    <button
                        className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-bold text-indigo-600 hover:bg-indigo-50 transition-colors"
                        onClick={() => { onMove(null); onClose(); }}
                    >
                        <div className="p-1 bg-indigo-50 rounded-lg"><Home size={14} /></div>
                        Root Home
                    </button>
                    {filtered.length === 0 && search && (
                        <p className="text-center text-xs text-slate-400 font-bold py-4">No folders found</p>
                    )}
                    {filtered.map(f => (
                        <button
                            key={f.id}
                            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-slate-700 hover:bg-slate-50 transition-colors text-left font-medium"
                            onClick={() => { onMove(f.id); onClose(); }}
                        >
                            <div className="p-1 bg-slate-100 text-slate-500 rounded-lg shrink-0"><Folder size={14} /></div>
                            <span className="truncate">{f.title}</span>
                        </button>
                    ))}
                </div>
            </div>
        </div>
    );
};

const CardItem: React.FC<{
    card: CardType;
    onClick: () => void;
    onDelete: () => void;
    onEdit: () => void;
    onMetadata: () => void;
    onShare: () => void;
    onResize: (width: number, height: number) => void;
    onMove: (newParentId: string | null) => void;
    allFolders: { id: string; title: string }[];
}> = ({ card, onClick, onDelete, onEdit, onMetadata, onShare, onResize, onMove, allFolders }) => {
    const [showMenu, setShowMenu] = useState(false);
    const [showMoveModal, setShowMoveModal] = useState(false);
    const isMobile = window.innerWidth < 640;

    const cardContent = (
        <div
            className="h-full w-full relative rounded-xl bg-white border border-slate-200 shadow-sm hover:shadow-md transition-shadow cursor-default flex flex-col"
        >
            {/* Clickable Overlay - Sits above content but below handles and menu */}
            <div
                className="absolute inset-0 z-10 cursor-pointer"
                onClick={(e) => {
                    if (
                        (e.target as HTMLElement).closest('.action-menu-btn') ||
                        (e.target as HTMLElement).closest('.card-link')
                    ) {
                        return;
                    }
                    onClick();
                }}
            />

            {/* Representative Image Area */}
            <div className={`w-full ${isMobile ? 'h-32' : 'flex-1'} bg-slate-50 relative flex items-center justify-center rounded-t-xl overflow-hidden min-h-0`}>
                {card.coverImage ? (
                    <div className="w-full h-full">
                        <img src={card.coverImage} alt="" referrerPolicy="no-referrer" className="w-full h-full object-cover" />
                    </div>
                ) : (
                    <div className={`w-full h-full flex items-center justify-center ${card.type === 'folder' ? 'bg-indigo-50/50 text-indigo-100' : card.type === 'list' ? 'bg-emerald-50/50 text-emerald-100' : 'bg-amber-50/50 text-amber-100'}`}>
                        {card.type === 'folder' ? <Folder size={isMobile ? 32 : 48} strokeWidth={1.5} /> : card.type === 'list' ? <FileText size={isMobile ? 32 : 48} strokeWidth={1.5} /> : <ImageIcon size={isMobile ? 32 : 48} strokeWidth={1.5} />}
                    </div>
                )}
            </div>

            {/* Content Area */}
            <div className="p-3 md:p-4 flex flex-col relative bg-white shrink-0">
                <div className="flex items-start justify-between mb-1">
                    <div className="flex flex-col overflow-hidden flex-1">
                        <div className="flex items-center gap-2 mb-1">
                            <div className={`p-1.5 rounded-lg shrink-0 ${card.type === 'folder' ? 'bg-indigo-50 text-indigo-600' : card.type === 'list' ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-600'}`}>
                                {card.type === 'folder' ? <Folder size={12} /> : card.type === 'list' ? <FileText size={12} /> : <ImageIcon size={12} />}
                            </div>
                            <h3 className="text-sm font-bold text-slate-800 truncate">{card.title}</h3>
                        </div>

                        {card.url && (
                            <a
                                href={card.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="card-link relative z-20 text-[10px] text-indigo-500 hover:text-indigo-700 underline truncate block max-w-full mb-1"
                                onClick={(e) => e.stopPropagation()}
                            >
                                <div className="flex items-center gap-1">
                                    <LinkIcon size={10} />
                                    {card.url.replace(/^https?:\/\//, '').split('/')[0]}
                                </div>
                            </a>
                        )}
                    </div>

                    <div className="relative z-20">
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                setShowMenu(!showMenu);
                            }}
                            className="action-menu-btn p-1 text-slate-400 hover:text-slate-600 rounded-md hover:bg-slate-100 transition-colors"
                        >
                            <MoreVertical size={16} />
                        </button>

                        {showMenu && (
                            <div className="absolute right-0 top-full mt-1 w-48 bg-white rounded-lg shadow-xl border border-slate-100 py-1 z-30 animate-in fade-in zoom-in duration-200">
                                <button
                                    className="w-full flex items-center gap-3 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 text-left"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        setShowMenu(false);
                                        onEdit();
                                    }}
                                >
                                    <Edit size={16} /> Edit Content
                                </button>
                                <button
                                    className="w-full flex items-center gap-3 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 text-left"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        setShowMenu(false);
                                        onShare();
                                    }}
                                >
                                    <Share2 size={16} /> Share Access
                                </button>
                                <button
                                    className="w-full flex items-center gap-3 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 text-left"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        setShowMenu(false);
                                        onMetadata();
                                    }}
                                >
                                    <Info size={16} /> Entry Metadata
                                </button>
                                <div className="h-px bg-slate-100 my-1" />
                                <button
                                    className="w-full flex items-center gap-3 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 text-left"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        setShowMenu(false);
                                        setShowMoveModal(true);
                                    }}
                                >
                                    <FolderOpen size={16} /> Move to...
                                </button>
                                <div className="h-px bg-slate-100 my-1" />
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        setShowMenu(false);
                                        onDelete();
                                    }}
                                    className="w-full flex items-center gap-3 px-4 py-2 text-sm text-red-600 hover:bg-red-50 text-left font-bold"
                                >
                                    <Trash2 size={16} /> Delete
                                </button>
                            </div>
                        )}
                    </div>
                </div>

                {/* Move-to Modal */}
                {showMoveModal && (
                    <MoveFolderModal
                        card={card}
                        allFolders={allFolders}
                        onMove={onMove}
                        onClose={() => setShowMoveModal(false)}
                    />
                )}

                {card.description && <p className="text-[11px] text-slate-500 line-clamp-2 mb-2 leading-relaxed">{card.description}</p>}

                <div className="mt-auto pt-2 border-t border-slate-50 flex items-center justify-between text-[9px] text-slate-400 font-bold uppercase tracking-tight">
                    <div className="flex items-center gap-2 md:gap-3">
                        <span className="shrink-0">{new Date(card.createdAt).toLocaleDateString()}</span>
                        {card.type !== 'folder' && card.rating && (
                            <div className="flex items-center text-amber-500 gap-0.5">
                                <span>{card.rating}</span>
                                <Star size={10} fill="currentColor" />
                            </div>
                        )}
                        {card.type === 'list' && card.notes && card.notes.length > 0 && (
                            <div className="flex items-center gap-1">
                                <MessageSquare size={10} />
                                <span>{card.notes.length}</span>
                            </div>
                        )}
                    </div>
                    {(card.sharedWith && card.sharedWith.length > 0) && (
                        <div className="w-5 h-5 rounded-full bg-indigo-500 border-2 border-white flex items-center justify-center text-white shadow-sm" title="Shared">
                            <Share2 size={10} />
                        </div>
                    )}
                </div>
            </div>
        </div>
    );

    if (isMobile) {
        return <div className="w-full group">{cardContent}</div>;
    }

    return (
        <Resizable
            defaultSize={{
                width: card.width || 280,
                height: card.height || 'auto'
            }}
            minWidth={200}
            minHeight={150}
            onResizeStop={(_e, _direction, ref, _d) => {
                onResize(ref.offsetWidth, ref.offsetHeight);
            }}
            enable={{
                top: false, right: true, bottom: true, left: false,
                topRight: false, bottomRight: true, bottomLeft: false, topLeft: false
            }}
            handleClasses={{
                bottomRight: 'w-3 h-3 bg-indigo-500/20 rounded-full cursor-nwse-resize hover:bg-indigo-500 transition-colors absolute bottom-1 right-1'
            }}
            className="group"
        >
            {cardContent}
        </Resizable>
    );
};


export default CardsPage;
