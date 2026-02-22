import React, { useState, useMemo } from 'react';
import { useTripStore } from '../../store/tripStore';
import {
    Check, Plus, Trash2, Luggage, Shirt, Camera, Pill, FileText,
    Zap, ChevronDown, ChevronRight, Package, Loader2, Sparkles, X, User, Users,
    RotateCcw, Info, Calendar as CalendarIcon, MapPin
} from 'lucide-react';

const DEFAULT_CATEGORIES = [
    { id: 'clothing', name: 'Clothing', icon: <Shirt size={14} />, color: 'text-indigo-600' },
    { id: 'toiletries', name: 'Toiletries', icon: <Package size={14} />, color: 'text-rose-500' },
    { id: 'electronics', name: 'Electronics', icon: <Zap size={14} />, color: 'text-amber-500' },
    { id: 'health', name: 'Health & Meds', icon: <Pill size={14} />, color: 'text-teal-600' },
    { id: 'documents', name: 'Documents', icon: <FileText size={14} />, color: 'text-blue-600' },
    { id: 'camera', name: 'Photography', icon: <Camera size={14} />, color: 'text-purple-600' },
    { id: 'other', name: 'Other', icon: <Luggage size={14} />, color: 'text-gray-500' },
];

const CATEGORY_DEFAULTS: Record<string, string[]> = {
    clothing: ['T-shirts (x5)', 'Underwear (x5)', 'Socks (x5)', 'Jeans / pants', 'Jacket / sweater', 'Swimwear', 'Comfortable shoes', 'Dress shoes'],
    toiletries: ['Toothbrush & toothpaste', 'Shampoo & conditioner', 'Deodorant', 'Sunscreen SPF 50', 'Face wash', 'Razor & shaving cream'],
    electronics: ['Phone charger', 'Power bank', 'Travel adapter', 'Laptop & charger', 'Earbuds / headphones', 'Camera charger'],
    health: ['Prescription meds', 'Pain relievers', 'Allergy meds', 'Band-aids & antiseptic', 'Hand sanitizer', 'Vitamins'],
    documents: ['Passport', 'Visa (if required)', 'Travel insurance', 'Hotel reservations', 'Flight tickets', 'Emergency contacts'],
    camera: ['Camera body', 'Extra memory cards', 'Extra batteries', 'Lens cloth', 'Tripod / gorillpod'],
    other: ['Reusable water bottle', 'Snacks for travel', 'Neck pillow', 'Eye mask & earplugs', 'Cash & cards'],
};

interface GenerationInfo {
    age: string;
    gender: string;
    season: string;
    vibe: string;
}

const PackingList: React.FC<{ tripId: string }> = ({ tripId }) => {
    const { activeTrip, activeTripPackingItems, addPackingItem, addPackingItems, updatePackingItem, deletePackingItem, userRole } = useTripStore();
    const isViewer = userRole === 'viewer';

    const [selectedTraveler, setSelectedTraveler] = useState<string>('General');
    const [newItemText, setNewItemText] = useState<Record<string, string>>({});
    const [newCatName, setNewCatName] = useState('');
    const [showAddCat, setShowAddCat] = useState(false);
    const [collapsedDays, setCollapsedDays] = useState<Set<string>>(new Set());
    const [isGenerating, setIsGenerating] = useState(false);
    const [showGenModal, setShowGenModal] = useState(false);
    const [genInfo, setGenInfo] = useState<GenerationInfo>({ age: 'Adult (18+)', gender: 'Neutral', season: 'Summer', vibe: 'Casual / Leisure' });
    const [editingItemId, setEditingItemId] = useState<string | null>(null);
    const [editingText, setEditingText] = useState('');

    const travelers = useMemo(() => {
        return ['General', ...(activeTrip?.participants || [])];
    }, [activeTrip?.participants]);

    // Group items by category for the SELECTED traveler
    const categoriesWithItems = useMemo(() => {
        const groups: Record<string, any[]> = {};

        // Ensure all default categories exist in the groups
        DEFAULT_CATEGORIES.forEach(cat => {
            groups[cat.name] = [];
        });

        // Add items from store for specific traveler
        activeTripPackingItems
            .filter(item => (item.traveler_name || 'General') === selectedTraveler)
            .forEach(item => {
                if (!groups[item.category]) groups[item.category] = [];
                groups[item.category].push(item);
            });

        return Object.entries(groups).map(([name, items]) => {
            const def = DEFAULT_CATEGORIES.find(c => c.name === name);
            return {
                id: name.toLowerCase(),
                name,
                icon: def?.icon || <Package size={14} />,
                color: def?.color || 'text-gray-600',
                items,
                collapsed: collapsedDays.has(name)
            };
        });
    }, [activeTripPackingItems, collapsedDays, selectedTraveler]);

    const stats = useMemo(() => {
        const travelerItems = activeTripPackingItems.filter(i => (i.traveler_name || 'General') === selectedTraveler);
        return {
            total: travelerItems.length,
            checked: travelerItems.filter(i => i.is_packed).length
        };
    }, [activeTripPackingItems, selectedTraveler]);

    const progress = stats.total > 0 ? (stats.checked / stats.total) * 100 : 0;

    const toggleCollapse = (catName: string) => {
        setCollapsedDays(prev => {
            const next = new Set(prev);
            if (next.has(catName)) next.delete(catName);
            else next.add(catName);
            return next;
        });
    };

    const handleAddItem = async (catName: string) => {
        const text = newItemText[catName]?.trim();
        if (!text) return;

        try {
            await addPackingItem({
                trip_id: tripId,
                traveler_name: selectedTraveler,
                text,
                category: catName,
                is_packed: false
            });
            setNewItemText(prev => ({ ...prev, [catName]: '' }));
        } catch (err) {
            console.error('Failed to add item', err);
        }
    };

    const handleAddCategory = async () => {
        if (!newCatName.trim()) return;
        // In this UI, adding a category just means we'll have a new bucket for items.
        // We don't save "empty categories" to the DB, but we allow user to add an item to it immediately.
        const name = newCatName.trim();
        setNewItemText(prev => ({ ...prev, [name]: '' }));
        setNewCatName('');
        setShowAddCat(false);
    };

    const generateTemplate = async () => {
        setIsGenerating(true);
        try {
            const itemsToPush: { cat: string, text: string }[] = [];

            // START OF INTELLIGENT GENERATION LOGIC
            const ageGroup = genInfo.age;
            const gender = genInfo.gender;
            const isBaby = ageGroup === 'Baby (0-2)';
            const isPreTeen = ageGroup === 'Pre-Teen (3-12)';
            const isTeen = ageGroup === 'Teen (13-18)';
            const isAdult = ageGroup === 'Adult (18+)';

            Object.entries(CATEGORY_DEFAULTS).forEach(([catId, rawItems]) => {
                const catName = DEFAULT_CATEGORIES.find(c => c.id === catId)?.name || 'Other';

                rawItems.forEach(text => {
                    let finalItem = text;
                    let shouldSkip = false;

                    // Baseline filtering & adjustments
                    if (catName === 'Clothing') {
                        if (genInfo.season === 'Winter') {
                            finalItem = text.replace('Swimwear', 'Winter Coat / Heavies').replace('T-shirts', 'Long Sleeves / Sweaters').replace('Shorts', 'Pants');
                        }

                        if (gender === 'Female') {
                            if (finalItem.includes('Underwear')) finalItem = 'Underwear & Bras (x5)';
                            if (finalItem.includes('Dress shoes')) finalItem = 'Heels / Flats';
                        }
                        if (gender === 'Male') {
                            if (finalItem.includes('Swimwear')) finalItem = 'Swim Trunks';
                        }

                        // Kids formatting
                        if (isPreTeen) finalItem = `Kid's ${finalItem}`;
                        if (isBaby) {
                            if (finalItem.includes('Jeans') || finalItem.includes('shoes')) shouldSkip = true;
                            if (finalItem.includes('T-shirts')) finalItem = 'Onesies / Bodysuits (x7)';
                        }
                    }

                    if (catName === 'Toiletries') {
                        if (isBaby) {
                            if (finalItem.includes('Razor') || finalItem.includes('Deodorant') || finalItem.includes('Face wash')) shouldSkip = true;
                            if (finalItem.includes('Shampoo')) finalItem = 'Baby Wash & Shampoo';
                        }
                        if (gender === 'Female' && isAdult && finalItem.includes('Razor')) {
                            itemsToPush.push({ cat: 'Toiletries', text: 'Feminine hygiene products' });
                            itemsToPush.push({ cat: 'Toiletries', text: 'Makeup & Remover' });
                        }
                        if (isTeen && finalItem.includes('Face wash')) {
                            finalItem = 'Acne / Face Wash';
                        }
                    }

                    if (catName === 'Electronics') {
                        if (isBaby || isPreTeen) {
                            if (finalItem.includes('Laptop') || finalItem.includes('Camera')) shouldSkip = true;
                        }
                        if (isBaby && finalItem.includes('Earbuds')) shouldSkip = true;
                    }

                    if (catName === 'Health & Meds') {
                        if (isBaby) {
                            if (finalItem.includes('Pain relievers')) finalItem = 'Infant Pain Reliever (e.g. Tylenol)';
                        }
                    }

                    if (!shouldSkip) {
                        itemsToPush.push({ cat: catName, text: finalItem });
                    }
                });
            });

            // Age-specific additions
            if (isBaby) {
                itemsToPush.push({ cat: 'Health & Meds', text: 'Baby Wipes (x3 packs)' });
                itemsToPush.push({ cat: 'Health & Meds', text: 'Diaper Cream' });
                itemsToPush.push({ cat: 'Health & Meds', text: 'Diapers (x30)' });
                itemsToPush.push({ cat: 'Other', text: 'Pacifiers (x3)' });
                itemsToPush.push({ cat: 'Other', text: 'Milk Bottles / Formula' });
                itemsToPush.push({ cat: 'Other', text: 'Stroller / Baby Carrier' });
            }

            if (isPreTeen) {
                itemsToPush.push({ cat: 'Other', text: 'Toys / Coloring Books' });
                itemsToPush.push({ cat: 'Other', text: 'Favorite Stuffed Animal' });
            }

            // Vibe / Journey Type specific additions
            if (genInfo.vibe.includes('Formal')) {
                itemsToPush.push({ cat: 'Clothing', text: gender === 'Female' ? 'Evening Gown / Dress' : 'Evening Suit / Tie' });
                itemsToPush.push({ cat: 'Clothing', text: gender === 'Female' ? 'Formal Heels' : 'Formal Dress Shoes' });
            }
            if (genInfo.vibe.includes('Beach')) {
                itemsToPush.push({ cat: 'Other', text: 'Beach towel & Tote bag' });
                itemsToPush.push({ cat: 'Other', text: 'Flip flops / Sandals' });
                if (isBaby) itemsToPush.push({ cat: 'Other', text: 'Swim Diapers' });
            }
            if (genInfo.vibe.includes('Hiking')) {
                itemsToPush.push({ cat: 'Clothing', text: 'Hiking boots' });
                itemsToPush.push({ cat: 'Other', text: 'First aid kit (comprehensive)' });
                itemsToPush.push({ cat: 'Other', text: 'Bug Repellent' });
            }
            if (genInfo.vibe.includes('Business')) {
                itemsToPush.push({ cat: 'Documents', text: 'Business Cards' });
                itemsToPush.push({ cat: 'Clothing', text: 'Business Casual Attire' });
                if (isAdult) itemsToPush.push({ cat: 'Electronics', text: 'Presentation Clicker (Optional)' });
            }

            const payload = itemsToPush.map(item => ({
                trip_id: tripId,
                traveler_name: selectedTraveler,
                text: item.text,
                category: item.cat,
                is_packed: false
            }));

            await addPackingItems(payload);
            setShowGenModal(false);
        } catch (err) {
            console.error('Failed to generate template', err);
        } finally {
            setIsGenerating(false);
        }
    };

    const resetPackingList = async () => {
        if (!confirm(`Are you sure you want to clear the entire packing list for ${selectedTraveler}?`)) return;

        try {
            const travelerItems = activeTripPackingItems.filter(i => (i.traveler_name || 'General') === selectedTraveler);
            await Promise.all(travelerItems.map(i => deletePackingItem(i.id)));
        } catch (err) {
            console.error('Failed to reset packing list', err);
        }
    };

    const resetCategory = async (items: any[]) => {
        try {
            await Promise.all(items.filter(i => i.is_packed).map(i =>
                updatePackingItem(i.id, { is_packed: false })
            ));
        } catch (err) {
            console.error('Failed to reset category', err);
        }
    };

    const handleStartEdit = (item: any) => {
        setEditingItemId(item.id);
        setEditingText(item.text);
    };

    const handleSaveEdit = async () => {
        if (!editingItemId || !editingText.trim()) {
            setEditingItemId(null);
            return;
        }
        try {
            await updatePackingItem(editingItemId, { text: editingText.trim() });
            setEditingItemId(null);
        } catch (err) {
            console.error('Failed to update item text', err);
        }
    };

    return (
        <div className="h-full overflow-y-auto bg-gray-50/40">
            <div className="w-full max-w-7xl mx-auto p-8 space-y-6">
                {/* Traveler Selection Tabs */}
                <div className="flex gap-2 overflow-x-auto pb-2 no-scrollbar border-b border-gray-100 mt-2">
                    {travelers.map(name => (
                        <button
                            key={name}
                            onClick={() => setSelectedTraveler(name)}
                            className={`flex items-center gap-2 px-5 py-3 rounded-2xl text-xs font-black uppercase tracking-widest transition-all whitespace-nowrap border-2 ${selectedTraveler === name
                                ? 'bg-indigo-600 text-white border-indigo-600 shadow-xl shadow-indigo-100'
                                : 'bg-white text-gray-400 border-gray-50 hover:border-gray-200'
                                }`}
                        >
                            {name === 'General' ? <Users size={14} /> : <User size={14} />}
                            {name}
                        </button>
                    ))}
                </div>

                {/* Primary Card: Title & Stats */}
                <div className="bg-white rounded-[2.5rem] p-8 border border-gray-100 shadow-sm">
                    <div className="flex items-center justify-between mb-8">
                        <div className="flex items-center gap-4">
                            <div className="p-4 bg-indigo-50 rounded-2xl text-indigo-600 shadow-inner">
                                <Luggage size={28} />
                            </div>
                            <div>
                                <h2 className="text-2xl font-black text-gray-900">{selectedTraveler}'s List</h2>
                                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest flex items-center gap-1.5">
                                    <span className="w-1.5 h-1.5 rounded-full bg-teal-500 animate-pulse" />
                                    Synched to adventure
                                </p>
                            </div>
                        </div>
                        <div className="flex items-center gap-6">
                            {stats.total > 0 && !isViewer && (
                                <button
                                    onClick={resetPackingList}
                                    className="p-3 text-gray-300 hover:text-rose-500 hover:bg-rose-50 rounded-2xl transition-all group"
                                    title="Reset Entire List"
                                >
                                    <RotateCcw size={20} className="group-hover:rotate-[-45deg] transition-transform" />
                                </button>
                            )}
                            <div className="text-right">
                                <div className="text-4xl font-black text-teal-600 leading-none">{stats.checked}<span className="text-xl text-gray-300">/{stats.total}</span></div>
                                <div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-1">Items Prepared</div>
                            </div>
                        </div>
                    </div>

                    {/* Progress Bar Container */}
                    <div className="relative h-4 bg-gray-100 rounded-full overflow-hidden mb-2">
                        <div
                            className="absolute inset-y-0 left-0 bg-gradient-to-r from-teal-400 via-emerald-400 to-indigo-500 rounded-full transition-all duration-1000 ease-out"
                            style={{ width: `${progress}%` }}
                        />
                    </div>
                    <div className="flex justify-between text-[9px] font-black uppercase tracking-widest text-gray-300 px-1">
                        <span>Starting Out</span>
                        <span>{Math.round(progress)}% Complete</span>
                        <span>Fully Packed</span>
                    </div>

                    {stats.total === 0 && (
                        <div className="mt-10 flex flex-col items-center justify-center py-12 px-6 border-2 border-dashed border-gray-100 rounded-[2rem] bg-gray-50/50 text-center">
                            <div className="w-20 h-20 bg-white rounded-3xl flex items-center justify-center shadow-sm mb-6 transform -rotate-3 border border-gray-50">
                                <Sparkles size={36} className="text-indigo-400" />
                            </div>
                            <h3 className="text-lg font-black text-gray-900 mb-2">Ready to pack?</h3>
                            {isViewer ? (
                                <p className="text-sm font-bold text-gray-400 mb-8 max-w-[280px]">No items in this list yet.</p>
                            ) : (
                                <>
                                    <p className="text-sm font-bold text-gray-400 mb-8 max-w-[280px]">Get a head start with an AI-tailored list based on your details.</p>
                                    <button
                                        onClick={() => setShowGenModal(true)}
                                        disabled={isGenerating}
                                        className="group relative flex items-center gap-3 px-8 py-4 bg-slate-900 text-white rounded-2xl text-xs font-black uppercase tracking-widest hover:scale-105 transition-all shadow-xl shadow-slate-200 overflow-hidden"
                                    >
                                        <div className="absolute inset-0 bg-gradient-to-r from-indigo-500/20 to-teal-500/20 opacity-0 group-hover:opacity-100 transition-opacity" />
                                        <Sparkles size={18} className="text-amber-400" />
                                        {isGenerating ? 'Building your list...' : 'Generate Smart List'}
                                    </button>
                                </>
                            )}
                        </div>
                    )}
                </div>

                {/* Category Sections */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 pt-2">
                    {categoriesWithItems.map(cat => (
                        (cat.items.length > 0 || newItemText[cat.name] !== undefined) && (
                            <div key={cat.id} className="bg-white rounded-[2rem] border border-gray-100 shadow-sm overflow-hidden group/cat">
                                <div
                                    className="flex items-center justify-between px-7 py-5 cursor-pointer hover:bg-gray-50/50 transition-colors"
                                    onClick={() => toggleCollapse(cat.name)}
                                >
                                    <div className="flex items-center gap-4">
                                        <div className={`p-2.5 rounded-xl bg-gray-50 group-hover/cat:scale-110 transition-transform ${cat.color}`}>
                                            {cat.icon}
                                        </div>
                                        <div>
                                            <span className="font-black text-base text-gray-800">{cat.name}</span>
                                            {cat.items.length > 0 && (
                                                <div className="flex items-center gap-2 mt-0.5">
                                                    <div className="w-20 h-1 bg-gray-50 rounded-full overflow-hidden">
                                                        <div
                                                            className="h-full bg-teal-500 rounded-full transition-all"
                                                            style={{ width: `${(cat.items.filter(i => i.is_packed).length / cat.items.length) * 100}%` }}
                                                        />
                                                    </div>
                                                    <span className="text-[10px] font-bold text-gray-400 uppercase">
                                                        {cat.items.filter(i => i.is_packed).length}/{cat.items.length}
                                                    </span>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-4">
                                        {cat.items.some(i => i.is_packed) && !isViewer && (
                                            <button
                                                onClick={(e) => { e.stopPropagation(); resetCategory(cat.items); }}
                                                className="text-[10px] font-black text-slate-400 hover:text-rose-500 flex items-center gap-1.5"
                                            >
                                                <RotateCcw size={12} />
                                                RESET
                                            </button>
                                        )}
                                        <div className="w-8 h-8 flex items-center justify-center rounded-xl bg-gray-50 text-gray-400 group-hover/cat:text-indigo-500 transition-colors">
                                            {cat.collapsed ? <ChevronRight size={18} /> : <ChevronDown size={18} />}
                                        </div>
                                    </div>
                                </div>

                                {!cat.collapsed && (
                                    <div className="px-7 pb-6 space-y-2 border-t border-gray-50 pt-2 bg-gray-50/20">
                                        {cat.items.map(item => (
                                            <div
                                                key={item.id}
                                                className={`flex items-center gap-4 py-3 px-4 rounded-2xl group transition-all ${item.is_packed ? 'bg-teal-50/30' : 'bg-white hover:shadow-md hover:shadow-gray-100 hover:-translate-y-0.5 border border-transparent hover:border-indigo-50'}`}
                                            >
                                                <button
                                                    onClick={() => !isViewer && updatePackingItem(item.id, { is_packed: !item.is_packed })}
                                                    className={`w-6 h-6 rounded-xl border-2 flex items-center justify-center flex-shrink-0 transition-all ${item.is_packed
                                                        ? 'bg-teal-500 border-teal-500 shadow-lg shadow-teal-100'
                                                        : isViewer ? 'border-gray-200 bg-gray-50' : 'border-gray-200 hover:border-teal-400 bg-white'
                                                        }`}
                                                >
                                                    {item.is_packed && <Check size={14} strokeWidth={4} className="text-white" />}
                                                </button>

                                                {editingItemId === item.id ? (
                                                    <input
                                                        type="text"
                                                        autoFocus
                                                        value={editingText}
                                                        onChange={e => setEditingText(e.target.value)}
                                                        onBlur={handleSaveEdit}
                                                        onKeyDown={e => e.key === 'Enter' && handleSaveEdit()}
                                                        className="flex-1 bg-white border-2 border-indigo-100 rounded-xl px-4 py-1 text-sm font-bold text-gray-700 outline-none shadow-sm"
                                                    />
                                                ) : (
                                                    <span
                                                        className={`flex-1 text-sm font-bold transition-colors ${item.is_packed ? 'line-through text-gray-300' : 'text-gray-700'} ${!isViewer ? 'cursor-text' : ''}`}
                                                        onClick={() => !isViewer && handleStartEdit(item)}
                                                    >
                                                        {item.text}
                                                    </span>
                                                )}
                                                {!isViewer && (
                                                    <button
                                                        onClick={() => deletePackingItem(item.id)}
                                                        className="opacity-0 group-hover:opacity-100 p-2 text-gray-300 hover:text-rose-500 hover:bg-rose-50 rounded-xl transition-all"
                                                    >
                                                        <Trash2 size={16} />
                                                    </button>
                                                )}
                                            </div>
                                        ))}

                                        {/* Add Item Input */}
                                        {!isViewer && (
                                            <div className="flex items-center gap-3 pt-3 mt-2 border-t border-gray-100">
                                                <div className="relative flex-1 group/input">
                                                    <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300 group-focus-within/input:text-indigo-400 transition-colors">
                                                        <Plus size={16} />
                                                    </div>
                                                    <input
                                                        type="text"
                                                        placeholder={`Quick add to ${cat.name}...`}
                                                        value={newItemText[cat.name] || ''}
                                                        onChange={e => setNewItemText(prev => ({ ...prev, [cat.name]: e.target.value }))}
                                                        onKeyDown={e => e.key === 'Enter' && handleAddItem(cat.name)}
                                                        className="w-full bg-white rounded-2xl pl-11 pr-4 py-3 text-sm font-bold text-gray-700 placeholder-gray-300 border-2 border-transparent focus:border-indigo-100 focus:bg-white shadow-sm transition-all outline-none"
                                                    />
                                                </div>
                                                <button
                                                    onClick={() => handleAddItem(cat.name)}
                                                    className="p-3 bg-indigo-600 text-white rounded-2xl hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-100 active:scale-95"
                                                >
                                                    <Check size={20} />
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        )
                    ))}
                </div>

                {/* Add Custom Category */}
                {!isViewer && (
                    showAddCat ? (
                        <div className="bg-slate-900 rounded-[2rem] p-6 shadow-2xl animate-in slide-in-from-bottom border border-slate-800">
                            <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-4">New custom grouping</h4>
                            <div className="flex gap-3">
                                <input
                                    type="text"
                                    placeholder="E.g. Photography Gear..."
                                    value={newCatName}
                                    onChange={e => setNewCatName(e.target.value)}
                                    onKeyDown={e => e.key === 'Enter' && handleAddCategory()}
                                    autoFocus
                                    className="flex-1 bg-slate-800 rounded-2xl px-5 py-4 text-sm font-bold text-white placeholder-slate-600 border-none focus:ring-2 focus:ring-indigo-500/50 outline-none"
                                />
                                <button
                                    onClick={handleAddCategory}
                                    className="px-8 py-4 bg-indigo-600 text-white rounded-2xl text-xs font-black uppercase tracking-widest hover:bg-indigo-500 transition-all shadow-lg shadow-indigo-900"
                                >
                                    CREATE
                                </button>
                                <button
                                    onClick={() => setShowAddCat(false)}
                                    className="p-4 bg-slate-800 text-slate-400 rounded-2xl hover:text-white transition-all"
                                >
                                    <X size={20} />
                                </button>
                            </div>
                        </div>
                    ) : (
                        <button
                            onClick={() => setShowAddCat(true)}
                            className="group w-full py-8 border-3 border-dashed border-gray-100 rounded-[2.5rem] text-sm font-black text-gray-300 hover:border-indigo-100 hover:text-indigo-400 hover:bg-indigo-50/20 transition-all flex items-center justify-center gap-3"
                        >
                            <div className="p-2 bg-gray-50 rounded-xl group-hover:bg-indigo-100 transition-colors">
                                <Plus size={20} />
                            </div>
                            ADD CUSTOM CATEGORY
                        </button>
                    )
                )}

                {/* Info & Footer */}
                <div className="pt-10 text-center pb-20">
                    <p className="text-[10px] font-black text-gray-300 uppercase tracking-[0.2em] flex items-center justify-center gap-3">
                        <div className="h-px w-8 bg-gray-100" />
                        Adventure Ready
                        <div className="h-px w-8 bg-gray-100" />
                    </p>
                </div>
            </div>

            {/* Smart Generation Modal Overlay */}
            {showGenModal && (
                <div className="fixed inset-0 z-[300] flex items-center justify-center bg-slate-900/60 backdrop-blur-md p-4 animate-in fade-in duration-300">
                    <div className="bg-white rounded-[3rem] shadow-2xl w-full max-w-xl animate-in zoom-in slide-in-from-bottom-10 duration-500 overflow-hidden">
                        <div className="bg-slate-900 px-10 py-10 text-white relative">
                            <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl -mr-20 -mt-20" />
                            <div className="relative flex items-center justify-between mb-8">
                                <div className="flex items-center gap-4">
                                    <div className="p-4 bg-white/10 backdrop-blur-xl rounded-2xl border border-white/10 ring-1 ring-white/5">
                                        <Sparkles size={28} className="text-amber-300" />
                                    </div>
                                    <div>
                                        <h3 className="text-2xl font-black">Smart Packing</h3>
                                        <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Tailor recommendations</p>
                                    </div>
                                </div>
                                <button
                                    onClick={() => setShowGenModal(false)}
                                    className="p-3 bg-white/5 hover:bg-white/10 rounded-2xl transition-all border border-white/5"
                                >
                                    <X size={20} />
                                </button>
                            </div>

                            <div className="grid grid-cols-2 gap-6 mb-8">
                                <div className="space-y-3">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 flex items-center gap-2">
                                        <User size={10} /> Traveler Age
                                    </label>
                                    <select
                                        value={genInfo.age}
                                        onChange={e => setGenInfo({ ...genInfo, age: e.target.value })}
                                        className="w-full px-6 py-4 bg-white/5 rounded-2xl text-sm font-bold text-white border border-white/10 focus:ring-2 focus:ring-indigo-500/50 outline-none appearance-none"
                                    >
                                        <option className="bg-slate-900 text-white">Baby (0-2)</option>
                                        <option className="bg-slate-900 text-white">Pre-Teen (3-12)</option>
                                        <option className="bg-slate-900 text-white">Teen (13-18)</option>
                                        <option className="bg-slate-900 text-white">Adult (18+)</option>
                                    </select>
                                </div>
                                <div className="space-y-3">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 flex items-center gap-2">
                                        <Users size={10} /> Gender Identity
                                    </label>
                                    <select
                                        value={genInfo.gender}
                                        onChange={e => setGenInfo({ ...genInfo, gender: e.target.value })}
                                        className="w-full px-6 py-4 bg-white/5 rounded-2xl text-sm font-bold text-white border border-white/10 focus:ring-2 focus:ring-indigo-500/50 outline-none appearance-none"
                                    >
                                        <option className="bg-slate-900 text-white">Neutral</option>
                                        <option className="bg-slate-900 text-white">Male</option>
                                        <option className="bg-slate-900 text-white">Female</option>
                                    </select>
                                </div>
                            </div>
                        </div>

                        <div className="p-10 space-y-8">
                            <div className="space-y-3">
                                <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 flex items-center gap-2">
                                    <CalendarIcon size={12} /> Seasonal Climate
                                </label>
                                <div className="grid grid-cols-4 gap-3">
                                    {['Summer', 'Winter', 'Spring', 'Fall'].map(s => (
                                        <button
                                            key={s}
                                            onClick={() => setGenInfo({ ...genInfo, season: s })}
                                            className={`py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all border-2 ${genInfo.season === s
                                                ? 'bg-indigo-600 text-white border-indigo-600 shadow-lg shadow-indigo-100'
                                                : 'bg-white border-gray-50 text-gray-400 hover:border-gray-200'
                                                }`}
                                        >
                                            {s}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div className="space-y-3">
                                <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 flex items-center gap-2">
                                    <Info size={12} /> Journey Type
                                </label>
                                <div className="grid grid-cols-2 gap-3">
                                    {['Casual / Leisure', 'Business', 'Formal / Event', 'Hiking / Trekking', 'Beach / Resort'].map(v => (
                                        <button
                                            key={v}
                                            onClick={() => setGenInfo({ ...genInfo, vibe: v })}
                                            className={`px-4 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all border-2 text-left ${genInfo.vibe === v
                                                ? 'bg-indigo-50 border-indigo-200 text-indigo-600'
                                                : 'bg-gray-50 border-transparent text-gray-500 hover:bg-gray-100'
                                                }`}
                                        >
                                            {v}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {activeTrip?.location && (
                                <div className="p-5 bg-teal-50 rounded-[1.5rem] border border-teal-100 flex items-center gap-4">
                                    <div className="p-2.5 bg-white rounded-xl text-teal-500 shadow-sm">
                                        <MapPin size={20} />
                                    </div>
                                    <div>
                                        <span className="text-[10px] font-bold text-teal-400 uppercase tracking-widest block mb-1">Adventure Bound for</span>
                                        <span className="text-sm font-black text-teal-700">{activeTrip.location}</span>
                                    </div>
                                </div>
                            )}

                            <button
                                onClick={generateTemplate}
                                disabled={isGenerating}
                                className="w-full py-5 bg-slate-900 text-white rounded-[1.5rem] text-xs font-black uppercase tracking-[0.2em] hover:bg-indigo-600 transition-all shadow-xl shadow-slate-200 flex items-center justify-center gap-3 active:scale-95 disabled:opacity-50"
                            >
                                {isGenerating ? <Loader2 size={18} className="animate-spin" /> : <Sparkles size={18} className="text-amber-400" />}
                                Generate {selectedTraveler}'s Recommended List
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default PackingList;
