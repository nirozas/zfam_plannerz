import React, { useState, useEffect } from 'react';
import { useCardStore } from '../../store/cardStore';
import { X, Folder, FileText, Link as LinkIcon, Type, Star, Tag } from 'lucide-react';
import { Card } from '../../types/cards';

interface CardEntryModalProps {
    isOpen: boolean;
    onClose: () => void;
    parentId: string | null;
    editingCard?: Card | null;
}

export const CardEntryModal: React.FC<CardEntryModalProps> = ({ isOpen, onClose, parentId, editingCard }) => {
    const { addCard, updateCard, cards } = useCardStore();
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [selectedType, setSelectedType] = useState<'folder' | 'list'>('folder');
    const [imageUrl, setImageUrl] = useState('');
    const [url, setUrl] = useState('');
    const [hasBody, setHasBody] = useState(true);
    const [category, setCategory] = useState('');
    const [rating, setRating] = useState(0);
    const [showCategoryDropdown, setShowCategoryDropdown] = useState(false);

    // Get unique existing categories
    const existingCategories = Array.from(new Set(cards.map(c => c.category).filter(Boolean))) as string[];
    const filteredCategories = existingCategories.filter(cat =>
        cat.toLowerCase().includes(category.toLowerCase()) && cat !== category
    );

    const sanitizeUrl = (link: string) => {
        if (!link) return link;
        const trimmed = link.trim();
        if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) return trimmed;
        return `https://${trimmed}`;
    };

    useEffect(() => {
        if (editingCard) {
            setTitle(editingCard.title);
            setDescription(editingCard.description || '');
            setImageUrl(editingCard.coverImage || '');
            setSelectedType(editingCard.type as any);
            setUrl(editingCard.url || '');
            setHasBody(editingCard.hasBody ?? true);
            setCategory(editingCard.category || '');
            setRating(editingCard.rating || 0);
        } else {
            setTitle('');
            setDescription('');
            setImageUrl('');
            setSelectedType('folder');
            setUrl('');
            setHasBody(true);
            setCategory('');
            setRating(0);
        }
    }, [editingCard, isOpen]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!title.trim()) return;

        const sanitizedUrl = sanitizeUrl(url);

        if (editingCard) {
            updateCard(editingCard.id, {
                title,
                description,
                coverImage: imageUrl || undefined,
                url: sanitizedUrl || undefined,
                hasBody: (selectedType === 'list') ? hasBody : undefined,
                category: category || undefined,
                rating: (selectedType === 'list') ? rating : undefined,
            });
        } else {
            const actualParentId = selectedType === 'folder' && !parentId ? null : parentId;
            addCard(
                selectedType,
                title,
                actualParentId,
                category || undefined,
                rating || undefined,
                imageUrl || undefined,
                description || undefined,
                sanitizedUrl || undefined,
                (selectedType === 'list') ? hasBody : undefined
            );
        }

        onClose();
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
                <button
                    onClick={onClose}
                    className="absolute right-4 top-4 p-2 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-100 transition-colors"
                >
                    <X size={20} />
                </button>

                <div className="p-4 md:p-8">
                    <h2 className="text-xl md:text-2xl font-bold text-slate-800 mb-4 md:mb-6">
                        {editingCard ? 'Edit Item' : 'Create New Item'}
                    </h2>

                    <form onSubmit={handleSubmit} className="space-y-4">
                        {!editingCard && (
                            <div>
                                <label className="block text-sm font-semibold text-slate-700 mb-2">Item Type</label>
                                <div className="grid grid-cols-2 gap-2">
                                    {[
                                        { id: 'folder', label: 'Folder', icon: Folder, color: 'text-blue-600 bg-blue-50 border-blue-200' },
                                        { id: 'list', label: 'List', icon: FileText, color: 'text-emerald-600 bg-emerald-50 border-emerald-200' }
                                    ].map((type) => (
                                        <button
                                            key={type.id}
                                            type="button"
                                            onClick={() => setSelectedType(type.id as any)}
                                            className={`flex flex-col items-center justify-center p-2 rounded-xl border-2 transition-all ${selectedType === type.id
                                                ? `${type.color} ring-2 ring-offset-2 ring-indigo-500`
                                                : 'border-slate-100 text-slate-400 hover:border-slate-300'
                                                }`}
                                        >
                                            <type.icon size={18} className="mb-0.5" />
                                            <span className="text-[9px] font-bold">{type.label}</span>
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}

                        <div>
                            <label className="block text-sm font-semibold text-slate-700 mb-1">Title</label>
                            <input
                                autoFocus
                                type="text"
                                value={title}
                                onChange={(e) => setTitle(e.target.value)}
                                placeholder="Enter title..."
                                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all font-medium text-sm"
                                required
                            />
                        </div>

                        {(selectedType === 'list') && (
                            <div className="grid grid-cols-1 gap-4">
                                <div>
                                    <label className="block text-sm font-semibold text-slate-700 mb-1">
                                        <div className="flex items-center gap-2">
                                            <LinkIcon size={14} className="text-slate-400" />
                                            Reference Link (URL)
                                        </div>
                                    </label>
                                    <input
                                        type="text"
                                        value={url}
                                        onChange={(e) => setUrl(e.target.value)}
                                        placeholder="www.google.com"
                                        className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all text-sm"
                                    />
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl border border-slate-100">
                                        <input
                                            type="checkbox"
                                            id="hasBody"
                                            checked={hasBody}
                                            onChange={(e) => setHasBody(e.target.checked)}
                                            className="w-4 h-4 text-indigo-600 rounded focus:ring-indigo-500"
                                        />
                                        <label htmlFor="hasBody" className="text-xs font-semibold text-slate-700 cursor-pointer flex items-center gap-2">
                                            <Type size={14} />
                                            Rich Body
                                        </label>
                                    </div>

                                    <div className="flex flex-col">
                                        <label className="text-[10px] font-bold text-slate-400 uppercase mb-1">Rating</label>
                                        <div className="flex items-center gap-0.5">
                                            {[1, 2, 3, 4, 5].map((star) => (
                                                <button
                                                    key={star}
                                                    type="button"
                                                    onClick={() => setRating(star)}
                                                    className={`transition-all ${rating >= star ? 'text-amber-500' : 'text-slate-200 hover:text-slate-300'}`}
                                                >
                                                    <Star size={18} fill={rating >= star ? 'currentColor' : 'none'} />
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        <div className="relative">
                            <label className="block text-sm font-semibold text-slate-700 mb-2">
                                <div className="flex items-center gap-2">
                                    <Tag size={14} className="text-slate-400" />
                                    Categorize as Group
                                </div>
                            </label>

                            <div className="relative">
                                <input
                                    type="text"
                                    value={category}
                                    onChange={(e) => {
                                        setCategory(e.target.value);
                                        setShowCategoryDropdown(true);
                                    }}
                                    onFocus={() => setShowCategoryDropdown(true)}
                                    onBlur={() => setTimeout(() => setShowCategoryDropdown(false), 200)}
                                    placeholder="Search or create group..."
                                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all text-sm font-medium"
                                />

                                {showCategoryDropdown && filteredCategories.length > 0 && (
                                    <div className="absolute z-50 w-full mt-1 bg-white border border-slate-100 rounded-xl shadow-xl max-h-40 overflow-y-auto py-1 animate-in fade-in slide-in-from-top-1 duration-200">
                                        {filteredCategories.map((cat) => (
                                            <button
                                                key={cat}
                                                type="button"
                                                onClick={() => {
                                                    setCategory(cat);
                                                    setShowCategoryDropdown(false);
                                                }}
                                                className="w-full px-4 py-2 text-left text-sm hover:bg-slate-50 transition-colors flex items-center justify-between group"
                                            >
                                                <span className="font-medium text-slate-700">{cat}</span>
                                                <span className="text-[10px] font-bold text-slate-300 group-hover:text-indigo-400 uppercase">Existing</span>
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-semibold text-slate-700 mb-1">Description</label>
                            <textarea
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                                placeholder="Short description..."
                                className="w-full px-4 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all font-medium text-[13px] min-h-[60px] resize-none"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-semibold text-slate-700 mb-1">Cover Image URL</label>
                            <input
                                type="url"
                                value={imageUrl}
                                onChange={(e) => setImageUrl(e.target.value)}
                                placeholder="https://image-source.com/..."
                                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all text-sm"
                            />
                        </div>

                        <div className="pt-2 flex gap-3">
                            <button
                                type="button"
                                onClick={onClose}
                                className="flex-1 px-4 py-3 rounded-xl border border-slate-200 text-slate-600 font-bold hover:bg-slate-50 transition-colors text-sm"
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                className="flex-[2] px-4 py-3 rounded-xl bg-indigo-600 text-white font-bold hover:bg-indigo-700 shadow-lg shadow-indigo-100 transition-all text-sm"
                            >
                                {editingCard ? 'Save Changes' : `Create ${selectedType.charAt(0).toUpperCase() + selectedType.slice(1)}`}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
};
