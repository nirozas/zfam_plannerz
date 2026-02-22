import React from 'react';
import { useTaskStore } from '../../store/taskStore';
import {
    Layers,
    CalendarCheck,
    Plus,
    X,
    Pencil,
    Trash2,
    Check,
} from 'lucide-react';

const TasksSidebar: React.FC = () => {
    const {
        categories, selectedCategories, toggleSelectedCategory, setSelectedCategories,
        addCategory, updateCategory, deleteCategory,
        filterType, setFilterType
    } = useTaskStore();

    const [isAddingCategory, setIsAddingCategory] = React.useState(false);
    const [newCategoryName, setNewCategoryName] = React.useState('');
    const [newCategoryColor, setNewCategoryColor] = React.useState('#6366f1');
    const [editingId, setEditingId] = React.useState<string | null>(null);
    const [editName, setEditName] = React.useState('');
    const [editColor, setEditColor] = React.useState('');

    const handleAddCategory = () => {
        if (newCategoryName.trim()) {
            addCategory({ name: newCategoryName.trim(), color: newCategoryColor });
            setNewCategoryName('');
            setNewCategoryColor('#6366f1');
            setIsAddingCategory(false);
        }
    };

    const startEdit = (id: string, name: string, color: string) => {
        setEditingId(id);
        setEditName(name);
        setEditColor(color);
    };

    const saveEdit = () => {
        if (editingId && editName.trim()) {
            updateCategory(editingId, { name: editName.trim(), color: editColor });
        }
        setEditingId(null);
    };

    const allSelected = selectedCategories.length === 0;

    // Background tint hex to rgba helper
    const hexToRgba = (hex: string, alpha: number) => {
        const r = parseInt(hex.slice(1, 3), 16);
        const g = parseInt(hex.slice(3, 5), 16);
        const b = parseInt(hex.slice(5, 7), 16);
        return `rgba(${r},${g},${b},${alpha})`;
    };

    return (
        <aside className="w-64 bg-white border-r border-gray-200 flex flex-col h-full hidden md:flex">
            {/* Views */}
            <div className="p-4">
                <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Views</h3>
                <nav className="space-y-1 text-sm">
                    <button
                        onClick={() => { setSelectedCategories([]); setFilterType('all'); }}
                        className={`w-full flex items-center gap-3 px-3 py-2 font-medium rounded-md transition-colors ${filterType === 'all' && allSelected ? 'bg-indigo-50 text-indigo-700' : 'text-gray-700 hover:bg-gray-50'}`}
                    >
                        <Layers size={18} className={filterType === 'all' && allSelected ? 'text-indigo-500' : 'text-gray-400'} />
                        All Tasks
                    </button>
                    <button
                        onClick={() => { setSelectedCategories([]); setFilterType('today'); }}
                        className={`w-full flex items-center gap-3 px-3 py-2 font-medium rounded-md transition-colors ${filterType === 'today' ? 'bg-indigo-50 text-indigo-700' : 'text-gray-700 hover:bg-gray-50'}`}
                    >
                        <CalendarCheck size={18} className={filterType === 'today' ? 'text-indigo-500' : 'text-gray-400'} />
                        Today
                    </button>
                </nav>
            </div>

            {/* Categories */}
            <div className="p-4 border-t border-gray-100 flex-1 overflow-y-auto">
                <div className="flex items-center justify-between mb-3">
                    <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Categories</h3>
                    <button
                        onClick={() => setIsAddingCategory(true)}
                        className="text-gray-400 hover:text-indigo-600 transition-colors"
                        title="Add Category"
                    >
                        <Plus size={16} />
                    </button>
                </div>

                {/* All Categories option */}
                <button
                    onClick={() => setSelectedCategories([])}
                    className={`w-full flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-md transition-colors mb-1 ${allSelected ? 'bg-gray-100 text-gray-800' : 'text-gray-500 hover:bg-gray-50'}`}
                >
                    <span className="w-2.5 h-2.5 rounded-full bg-gray-400 flex-shrink-0"></span>
                    All Categories
                    {allSelected && <Check size={14} className="ml-auto text-indigo-500" />}
                </button>

                {isAddingCategory && (
                    <div className="mb-3 space-y-2 p-2 bg-gray-50 rounded-lg border border-gray-200">
                        <input
                            type="text"
                            className="w-full text-sm border border-gray-200 rounded px-2 py-1.5 focus:outline-none focus:border-indigo-400"
                            placeholder="Category name"
                            autoFocus
                            value={newCategoryName}
                            onChange={(e) => setNewCategoryName(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleAddCategory()}
                        />
                        <div className="flex items-center gap-2">
                            <label className="text-xs text-gray-500">Color:</label>
                            <input
                                type="color"
                                value={newCategoryColor}
                                onChange={(e) => setNewCategoryColor(e.target.value)}
                                className="w-8 h-8 rounded cursor-pointer border-0 p-0"
                            />
                            <div className="flex gap-1 ml-auto">
                                <button onClick={handleAddCategory} className="text-xs bg-indigo-600 text-white px-2 py-1 rounded hover:bg-indigo-700">Add</button>
                                <button onClick={() => setIsAddingCategory(false)} className="text-xs text-gray-500 px-2 py-1 rounded hover:bg-gray-200"><X size={12} /></button>
                            </div>
                        </div>
                    </div>
                )}

                <nav className="space-y-1">
                    {categories.map(category => {
                        const isSelected = selectedCategories.includes(category.id);
                        const isEditing = editingId === category.id;

                        return (
                            <div
                                key={category.id}
                                className="group rounded-md overflow-hidden"
                                style={isSelected ? { backgroundColor: hexToRgba(category.color, 0.1) } : {}}
                            >
                                {isEditing ? (
                                    <div className="p-2 space-y-2 bg-gray-50 border border-gray-200 rounded-md">
                                        <input
                                            type="text"
                                            value={editName}
                                            onChange={(e) => setEditName(e.target.value)}
                                            className="w-full text-sm border border-gray-200 rounded px-2 py-1 focus:outline-none focus:border-indigo-400"
                                            autoFocus
                                            onKeyDown={(e) => e.key === 'Enter' && saveEdit()}
                                        />
                                        <div className="flex items-center gap-2">
                                            <input
                                                type="color"
                                                value={editColor}
                                                onChange={(e) => setEditColor(e.target.value)}
                                                className="w-8 h-8 rounded cursor-pointer border-0 p-0"
                                            />
                                            <button onClick={saveEdit} className="ml-auto text-xs bg-indigo-600 text-white px-2 py-1 rounded">Save</button>
                                            <button onClick={() => setEditingId(null)} className="text-xs text-gray-500 px-2 py-1 rounded hover:bg-gray-200">Cancel</button>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="flex items-center">
                                        <button
                                            onClick={() => toggleSelectedCategory(category.id)}
                                            className="flex-1 flex items-center gap-3 px-3 py-2 text-sm font-medium transition-colors text-gray-700 hover:bg-opacity-50"
                                        >
                                            <span
                                                className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                                                style={{ backgroundColor: category.color }}
                                            ></span>
                                            <span className="truncate">{category.name}</span>
                                            {isSelected && <Check size={14} className="ml-auto flex-shrink-0" style={{ color: category.color }} />}
                                        </button>
                                        <div className="flex items-center gap-0.5 pr-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <button
                                                onClick={() => startEdit(category.id, category.name, category.color)}
                                                className="p-1 text-gray-400 hover:text-indigo-500 rounded"
                                            >
                                                <Pencil size={12} />
                                            </button>
                                            <button
                                                onClick={() => { if (confirm('Delete category?')) deleteCategory(category.id); }}
                                                className="p-1 text-gray-400 hover:text-red-500 rounded"
                                            >
                                                <Trash2 size={12} />
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </nav>
            </div>
        </aside>
    );
};

export default TasksSidebar;
