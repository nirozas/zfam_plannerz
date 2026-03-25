import React, { useState, useMemo, useEffect, useRef } from 'react';
import { useFinanceStore } from '@/store/financeStore';
import { Search, Plus, Check, ChevronDown, CheckCircle2, X, Edit3, Trash2, AlertCircle } from 'lucide-react';
import { getIconByName, COMMON_FINANCE_ICONS } from './financeIcons';

import { motion, AnimatePresence } from 'framer-motion';

interface Props {
    selectedId: string | null;
    onSelect: (id: string | null) => void;
}

export const CategorySelector: React.FC<Props> = ({ selectedId, onSelect }) => {
    const { categories, addCategory, fetchCategories, updateCategory, deleteCategory } = useFinanceStore();
    const [search, setSearch] = useState('');
    const [isOpen, setIsOpen] = useState(false);
    const [isCreating, setIsCreating] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [editingCategoryId, setEditingCategoryId] = useState<string | null>(null);
    const [newCategoryName, setNewCategoryName] = useState('');
    const [selectedParentId, setSelectedParentId] = useState<string | null>(null);
    const [selectedIcon, setSelectedIcon] = useState('Tag');
    const [deleteError, setDeleteError] = useState<string | null>(null);

    const dropdownRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        fetchCategories();
    }, [fetchCategories]);

    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
                setIsOpen(false);
                setIsCreating(false);
                setIsEditing(false);
                setDeleteError(null);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const filteredCategories = useMemo(() => {
        return categories.filter(c => 
            c.name.toLowerCase().includes(search.toLowerCase())
        );
    }, [categories, search]);

    const groupedCategories = useMemo(() => {
        const parents = filteredCategories.filter(c => !c.parent_id);
        return parents.map(parent => ({
            ...parent,
            children: filteredCategories.filter(c => c.parent_id === parent.id)
        }));
    }, [filteredCategories]);

    const selectedCategory = useMemo(() => 
        categories.find(c => c.id === selectedId),
    [categories, selectedId]);

    const SelectedIconComp = getIconByName(selectedCategory?.icon || 'Tag');

    const handleCreateCategory = async () => {
        if (!newCategoryName.trim()) return;
        const id = await addCategory({
            name: newCategoryName,
            parent_id: selectedParentId,
            icon: selectedIcon
        });
        if (id) {
            onSelect(id);
            setNewCategoryName('');
            setIsCreating(false);
            setIsOpen(false);
        }
    };

    const handleUpdateCategory = async () => {
        if (!editingCategoryId || !newCategoryName.trim()) return;
        await updateCategory(editingCategoryId, {
            name: newCategoryName,
            parent_id: selectedParentId,
            icon: selectedIcon
        });
        setIsEditing(false);
        setEditingCategoryId(null);
        setNewCategoryName('');
    };

    const handleDeleteCategory = async (id: string) => {
        const result = await deleteCategory(id);
        if (!result.success) {
            setDeleteError(result.error || 'Failed to delete');
            setTimeout(() => setDeleteError(null), 3000);
        } else {
            if (id === selectedId) onSelect(null);
            setIsEditing(false);
            setEditingCategoryId(null);
        }
    };

    const startEditing = (category: any, e: React.MouseEvent) => {
        e.stopPropagation();
        setEditingCategoryId(category.id);
        setNewCategoryName(category.name);
        setSelectedParentId(category.parent_id);
        setSelectedIcon(category.icon);
        setIsEditing(true);
        setIsCreating(false);
    };

    return (
        <div className="relative w-full" ref={dropdownRef}>
            <button
                type="button"
                onClick={() => setIsOpen(!isOpen)}
                className="w-full h-14 bg-gray-50 dark:bg-slate-800 rounded-2xl px-5 flex items-center justify-between border-2 border-transparent hover:border-indigo-500/30 transition-all duration-200 group"
            >
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-indigo-100 dark:bg-indigo-900/40 flex items-center justify-center text-indigo-600 dark:text-indigo-400 group-hover:scale-110 transition-transform">
                        <SelectedIconComp size={20} />
                    </div>
                    <div className="flex flex-col items-start translate-y-[-1px]">
                        <span className="text-[10px] font-black text-gray-400 dark:text-slate-500 uppercase tracking-wider">Category</span>
                        <span className="text-sm font-bold text-gray-800 dark:text-slate-200">
                            {selectedCategory ? selectedCategory.name : 'Select Category'}
                        </span>
                    </div>
                </div>
                <ChevronDown size={20} className={`text-gray-400 dark:text-slate-500 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
            </button>

            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0, y: 10, scale: 0.95 }}
                        animate={{ opacity: 1, y: 5, scale: 1 }}
                        exit={{ opacity: 0, y: 10, scale: 0.95 }}
                        className="absolute z-50 top-full left-0 right-0 bg-white dark:bg-slate-900 rounded-2xl shadow-2xl shadow-indigo-500/10 border border-gray-100 dark:border-slate-800 overflow-hidden flex flex-col max-h-[550px]"
                    >
                        {deleteError && (
                            <div className="bg-rose-500 text-white p-3 text-[10px] font-black uppercase tracking-widest flex items-center gap-2 animate-pulse">
                                <AlertCircle size={14} />
                                {deleteError}
                            </div>
                        )}
                        {!isCreating && !isEditing ? (
                            <>
                                <div className="p-4 border-b border-gray-50 dark:border-slate-800">
                                    <div className="relative">
                                        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                                        <input
                                            autoFocus
                                            type="text"
                                            placeholder="Search categories..."
                                            value={search}
                                            onChange={(e) => setSearch(e.target.value)}
                                            className="w-full pl-10 pr-4 py-2 bg-gray-50 dark:bg-slate-800/50 rounded-xl text-sm font-medium focus:ring-2 focus:ring-indigo-500 outline-none dark:text-slate-200"
                                        />
                                    </div>
                                </div>

                                <div className="overflow-y-auto flex-1 p-2 custom-scrollbar">
                                    {groupedCategories.map((parent) => {
                                        const ParentIcon = getIconByName(parent.icon);
                                        return (
                                            <div key={parent.id} className="mb-2">
                                                <button
                                                    onClick={() => { onSelect(parent.id); setIsOpen(false); }}
                                                    className={`w-full text-left p-3 rounded-xl flex items-center justify-between transition-colors ${selectedId === parent.id ? 'bg-indigo-50 dark:bg-indigo-900/30' : 'hover:bg-gray-50 dark:hover:bg-slate-800'}`}
                                                >
                                                    <div className="flex items-center gap-3 font-bold text-sm dark:text-slate-200">
                                                        <ParentIcon size={18} className="text-gray-500" />
                                                        {parent.name}
                                                    </div>
                                                    <div className="flex items-center gap-1">
                                                        {parent.user_id && (
                                                            <button 
                                                                onClick={(e) => startEditing(parent, e)}
                                                                className="p-1.5 text-gray-400 hover:text-indigo-600 hover:bg-white dark:hover:bg-slate-700 rounded-lg transition-colors"
                                                            >
                                                                <Edit3 size={14} />
                                                            </button>
                                                        )}
                                                        {selectedId === parent.id && <CheckCircle2 size={16} className="text-indigo-600" />}
                                                    </div>
                                                </button>

                                                {parent.children.map(child => {
                                                    const ChildIcon = getIconByName(child.icon);
                                                    return (
                                                        <button
                                                            key={child.id}
                                                            onClick={() => { onSelect(child.id); setIsOpen(false); }}
                                                            className={`w-full text-left p-2 pl-12 rounded-xl flex items-center justify-between transition-colors ${selectedId === child.id ? 'bg-indigo-50 dark:bg-indigo-900/30 font-bold' : 'hover:bg-gray-50 dark:hover:bg-slate-800 text-gray-500'}`}
                                                        >
                                                            <div className="flex items-center gap-2 text-sm">
                                                                <ChildIcon size={16} />
                                                                {child.name}
                                                            </div>
                                                            <div className="flex items-center gap-1">
                                                                {child.user_id && (
                                                                    <button 
                                                                        onClick={(e) => startEditing(child, e)}
                                                                        className="p-1.5 text-gray-400 hover:text-indigo-600 hover:bg-white dark:hover:bg-slate-700 rounded-lg transition-colors"
                                                                    >
                                                                        <Edit3 size={14} />
                                                                    </button>
                                                                )}
                                                                {selectedId === child.id && <CheckCircle2 size={16} className="text-indigo-600" />}
                                                            </div>
                                                        </button>
                                                    );
                                                })}
                                            </div>
                                        );
                                    })}
                                </div>

                                <button
                                    onClick={() => { setIsCreating(true); setSelectedIcon('Tag'); }}
                                    className="p-4 bg-gray-50/80 dark:bg-slate-800/50 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 transition-colors flex items-center gap-3 text-indigo-600 dark:text-indigo-400 font-bold text-sm"
                                >
                                    <div className="w-8 h-8 rounded-lg bg-indigo-100 dark:bg-indigo-900/40 flex items-center justify-center">
                                        <Plus size={18} />
                                    </div>
                                    Create New Category
                                </button>
                            </>
                        ) : (
                            <motion.div 
                                initial={{ x: 50, opacity: 0 }}
                                animate={{ x: 0, opacity: 1 }}
                                className="p-5 flex flex-col gap-4 overflow-y-auto custom-scrollbar"
                            >
                                <div className="flex items-center justify-between mb-2">
                                    <h3 className="font-black text-xs uppercase tracking-widest text-gray-400">
                                        {isEditing ? 'Edit Category' : 'New Category'}
                                    </h3>
                                    <div className="flex items-center gap-2">
                                        {isEditing && (
                                            <button 
                                                onClick={() => handleDeleteCategory(editingCategoryId!)}
                                                className="text-rose-400 hover:text-rose-600 transition-colors p-2 rounded-xl hover:bg-rose-50"
                                            >
                                                <Trash2 size={18} />
                                            </button>
                                        )}
                                        <button onClick={() => { setIsCreating(false); setIsEditing(false); }} className="text-gray-400 hover:text-rose-500 transition-colors">
                                            <X size={20} />
                                        </button>
                                    </div>
                                </div>

                                <div className="space-y-4">
                                    <div>
                                        <label className="text-[10px] font-black uppercase text-gray-400 ml-1 mb-1 block">Category Name</label>
                                        <input
                                            autoFocus
                                            type="text"
                                            value={newCategoryName}
                                            onChange={(e) => setNewCategoryName(e.target.value)}
                                            placeholder="e.g. Subscriptions"
                                            className="w-full h-12 bg-gray-50 dark:bg-slate-800 rounded-xl px-4 text-sm font-bold focus:ring-2 focus:ring-indigo-500 outline-none dark:text-slate-200"
                                        />
                                    </div>

                                    <div>
                                        <label className="text-[10px] font-black uppercase text-gray-400 ml-1 mb-1 block">Parent Category (Optional)</label>
                                        <select 
                                            value={selectedParentId || ''}
                                            onChange={(e) => setSelectedParentId(e.target.value || null)}
                                            className="w-full h-12 bg-gray-50 dark:bg-slate-800 rounded-xl px-4 text-sm font-bold focus:ring-2 focus:ring-indigo-500 outline-none dark:text-slate-200 appearance-none"
                                        >
                                            <option value="">None (Top Level)</option>
                                            {categories.filter(c => !c.parent_id).map(c => (
                                                <option key={c.id} value={c.id}>{c.name}</option>
                                            ))}
                                        </select>
                                    </div>

                                    <div>
                                        <label className="text-[10px] font-black uppercase text-gray-400 ml-1 mb-1 block">Pick Icon</label>
                                        <div className="flex flex-wrap gap-2 max-h-[120px] overflow-y-auto p-2 bg-gray-50 dark:bg-slate-800 rounded-xl custom-scrollbar">
                                            {COMMON_FINANCE_ICONS.map(iconName => {
                                                const Icon = getIconByName(iconName);
                                                return (
                                                    <button
                                                        key={iconName}
                                                        onClick={() => setSelectedIcon(iconName)}
                                                        className={`p-2 rounded-lg transition-all ${selectedIcon === iconName ? 'bg-indigo-600 text-white scale-110 shadow-lg shadow-indigo-500/40' : 'bg-white dark:bg-slate-700 text-gray-500 hover:bg-indigo-50'}`}
                                                    >
                                                        <Icon size={18} />
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    </div>

                                    <button
                                        onClick={isEditing ? handleUpdateCategory : handleCreateCategory}
                                        className="w-full h-14 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl font-black text-sm uppercase tracking-widest transition-all active:scale-95 flex items-center justify-center gap-2"
                                    >
                                        <Check size={20} />
                                        {isEditing ? 'Save Changes' : 'Save Category'}
                                    </button>
                                </div>
                            </motion.div>
                        )}
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};
