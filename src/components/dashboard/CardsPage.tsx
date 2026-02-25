import React, { useState, useMemo, useEffect } from 'react';
import { useCardStore } from '../../store/cardStore';
import { useParams, useNavigate } from 'react-router-dom';
import {
    Plus, ChevronRight, Home, MoreVertical, Folder, FileText,
    Share2, Edit, Trash2, Info, Image as ImageIcon,
    Link as LinkIcon, Star, MessageSquare, Palette
} from 'lucide-react';
import { Card as CardType } from '../../types/cards';
import { CardEntryModal } from './CardEntryModal';
import { ListEditor } from './ListEditor';
import { MetadataModal, ShareModal } from './CardModals';
import { BackgroundSettings } from './BackgroundSettings';
import { Resizable } from 're-resizable';

const CardsPage: React.FC = () => {
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
        isFetching
    } = useCardStore();
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
    const [sortBy, setSortBy] = useState<'name' | 'recent' | 'group'>('recent');

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

    return (
        <div className="flex flex-col h-full overflow-hidden transition-all duration-500" style={backgroundStyle}>
            {/* Header / Breadcrumbs */}
            <header className={`flex items-center justify-between px-6 py-4 border-b border-slate-200 sticky top-0 z-40 transition-all ${backgroundStyle.backgroundImage ? 'bg-white/80 backdrop-blur-md' : 'bg-white'}`}>
                <nav className="flex items-center space-x-2 text-sm font-medium">
                    {breadcrumbs.map((crumb, index) => (
                        <React.Fragment key={crumb.id || 'home'}>
                            {index > 0 && <ChevronRight size={14} className="text-slate-400" />}
                            <button
                                onClick={() => navigateToFolder(crumb.id)}
                                className={`hover:text-indigo-600 transition-colors ${index === breadcrumbs.length - 1 ? 'text-slate-900 font-bold' : 'text-slate-500'
                                    }`}
                            >
                                {index === 0 ? <Home size={18} /> : crumb.title}
                            </button>
                        </React.Fragment>
                    ))}
                </nav>

                <div className="flex items-center gap-3">
                    <button
                        onClick={() => setIsBackgroundSettingsOpen(true)}
                        className="p-2 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-all"
                        title="Page Background"
                    >
                        <Palette size={20} />
                    </button>
                    {currentFolder && (
                        <button
                            onClick={() => setActiveShareCard(currentFolder)}
                            className="p-2 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-all"
                            title="Share Folder"
                        >
                            <Share2 size={20} />
                        </button>
                    )}
                    <div className="w-px h-6 bg-slate-200 mx-1" />
                    <button
                        onClick={() => setIsModalOpen(true)}
                        className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-xl hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-100 font-bold text-sm"
                    >
                        <Plus size={20} />
                        <span>Add Item</span>
                    </button>
                </div>
            </header>

            {/* Filter & Sort Bar */}
            <div className={`px-6 py-3 border-b border-slate-100 flex items-center justify-between z-30 transition-all ${backgroundStyle.backgroundImage ? 'bg-white/40 backdrop-blur-md' : 'bg-slate-50/50'}`}>
                <div className="flex items-center gap-2 overflow-x-auto scrollbar-none no-scrollbar">
                    <button
                        onClick={() => setActiveCategory(null)}
                        className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest transition-all ${!activeCategory ? 'bg-indigo-600 text-white shadow-lg' : 'bg-white text-slate-400 border border-slate-100'}`}
                    >
                        All Items
                    </button>
                    {allCategories.map(cat => (
                        <button
                            key={cat}
                            onClick={() => setActiveCategory(cat)}
                            className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest whitespace-nowrap transition-all ${activeCategory === cat ? 'bg-indigo-600 text-white shadow-lg' : 'bg-white text-slate-400 border border-slate-100'}`}
                        >
                            {cat}
                        </button>
                    ))}
                </div>

                <div className="flex items-center gap-4 shrink-0 pl-4 border-l border-slate-200">
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
                        </select>
                    </div>
                </div>
            </div>

            {/* Main Content - Resizable Grid */}
            <main className="flex-1 overflow-y-auto p-6">
                {currentCards.length === 0 ? (
                    <div className={`flex flex-col items-center justify-center h-full rounded-3xl ${backgroundStyle.backgroundImage ? 'bg-white/40 backdrop-blur-sm' : 'text-slate-400'}`}>
                        <div className="w-24 h-24 bg-white/80 rounded-full flex items-center justify-center mb-4 shadow-sm">
                            <Plus size={40} className="text-slate-300" />
                        </div>
                        <p className="text-lg font-bold text-slate-600">No items in this space</p>
                        <p className="text-sm text-slate-500">Click the "Add Item" button to organize your thoughts</p>
                    </div>
                ) : (
                    <div className="flex flex-wrap gap-6 items-start">
                        {displayedCards.map((card) => (
                            <CardItem
                                key={card.id}
                                card={card}
                                onClick={() => handleCardClick(card)}
                                onDelete={() => handleDelete(card)}
                                onEdit={() => {
                                    setEditingCard(card);
                                    setIsModalOpen(true);
                                }}
                                onMetadata={() => setActiveMetadataCard(card)}
                                onShare={() => setActiveShareCard(card)}
                                onResize={(w, h) => updateCard(card.id, { width: w, height: h })}
                            />
                        ))}
                    </div>
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
                    onShare={(email) => {
                        console.log('Sharing with:', email);
                        // Future: trigger Supabase RPC to add user by email
                        alert(`Sharing invitation sent to: ${email}`);
                    }}
                />
            )}
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
}> = ({ card, onClick, onDelete, onEdit, onMetadata, onShare, onResize }) => {
    const [showMenu, setShowMenu] = useState(false);

    return (
        <Resizable
            defaultSize={{
                width: card.width || 300,
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
                bottomRight: 'w-4 h-4 bg-indigo-500/20 rounded-full cursor-nwse-resize hover:bg-indigo-500 transition-colors absolute bottom-1 right-1'
            }}
            className="group"
        >
            <div
                className="h-full w-full relative rounded-xl bg-white border border-slate-200 shadow-sm hover:shadow-md transition-shadow cursor-default flex flex-col"
            >
                {/* Clickable Overlay - Sits above content but below handles and menu */}
                <div
                    className="absolute inset-0 z-10 cursor-pointer"
                    onClick={(e) => {
                        // Prevent navigation if we're clicking the action menu or a link
                        if (
                            (e.target as HTMLElement).closest('.action-menu-btn') ||
                            (e.target as HTMLElement).closest('.card-link')
                        ) {
                            return;
                        }
                        onClick();
                    }}
                />

                {/* Representative Image Area - Now flexible to fill height */}
                <div className="w-full flex-1 bg-slate-50 relative flex items-center justify-center rounded-t-xl overflow-hidden min-h-0">
                    {card.coverImage ? (
                        <div className="w-full h-full">
                            <img src={card.coverImage} alt="" className="w-full h-full object-cover" />
                        </div>
                    ) : (
                        <div className={`w-full h-full flex items-center justify-center ${card.type === 'folder' ? 'bg-indigo-50/50 text-indigo-100' : card.type === 'list' ? 'bg-emerald-50/50 text-emerald-100' : 'bg-amber-50/50 text-amber-100'}`}>
                            {card.type === 'folder' ? <Folder size={48} strokeWidth={1.5} /> : card.type === 'list' ? <FileText size={48} strokeWidth={1.5} /> : <ImageIcon size={48} strokeWidth={1.5} />}
                        </div>
                    )}
                </div>

                {/* Content Area - Now constant height */}
                <div className="p-4 flex flex-col relative bg-white shrink-0">
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
                                        {card.url.replace(/^https?:\/\//, '')}
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

                    {card.description && <p className="text-[11px] text-slate-500 line-clamp-2 mb-2 leading-relaxed">{card.description}</p>}

                    <div className="mt-auto pt-2 border-t border-slate-50 flex items-center justify-between text-[9px] text-slate-400 font-bold uppercase tracking-tight">
                        <div className="flex items-center gap-3">
                            <span>{new Date(card.createdAt).toLocaleDateString()}</span>
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
        </Resizable>
    );
};

export default CardsPage;
