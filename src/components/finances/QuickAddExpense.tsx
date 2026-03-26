import React, { useState, useEffect } from 'react';
import { FinanceEntry, useFinanceStore } from '@/store/financeStore';
import { useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Check, Store, DollarSign, Calendar as CalendarIcon, FileText, Sparkles, Plus, Wallet, ArrowDown, ArrowUp, Tag, Calculator, Settings, Edit2, Trash2 } from 'lucide-react';
import { CategorySelector } from './CategorySelector';
import { AutocompleteSearch } from './AutocompleteSearch';

interface Props {
    isOpen: boolean;
    onClose: () => void;
    editEntry?: FinanceEntry;
}



const ManagePaymentMethods = ({ onClose }: { onClose: () => void }) => {
    const { paymentMethods, addPaymentMethod, updatePaymentMethodString, deletePaymentMethod } = useFinanceStore();
    const [newName, setNewName] = useState('');
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editName, setEditName] = useState('');

    const handleAdd = () => {
        if(newName.trim()) {
            addPaymentMethod(newName.trim());
            setNewName('');
        }
    };

    const handleSaveEdit = (method: any) => {
        if(editName.trim() && editName !== method.name) {
            updatePaymentMethodString(method.name, editName.trim());
        }
        setEditingId(null);
    };

    return (
        <div className="fixed inset-0 z-[2000] bg-black/40 backdrop-blur-sm flex items-center justify-center">
            <motion.div initial={{opacity:0, scale:0.95}} animate={{opacity:1, scale:1}} className="bg-white dark:bg-slate-900 rounded-[35px] w-full max-w-sm p-6 shadow-2xl border border-gray-100 dark:border-slate-800">
                <div className="flex justify-between items-center mb-6">
                    <h3 className="font-black text-slate-800 dark:text-slate-100 uppercase tracking-widest text-xs">Manage Wallets</h3>
                    <button type="button" onClick={onClose} className="p-2 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-xl transition-colors"><X size={16} /></button>
                </div>

                <div className="flex gap-2 mb-6">
                    <input autoFocus value={newName} onChange={e=>setNewName(e.target.value)} placeholder="New Payment Method..." className="flex-1 h-12 px-4 rounded-xl bg-gray-50 dark:bg-slate-800 text-sm font-bold outline-none focus:ring-2 focus:ring-indigo-100 dark:text-slate-200" onKeyDown={e => e.key === 'Enter' && handleAdd()} />
                    <button type="button" onClick={handleAdd} className="w-12 h-12 flex items-center justify-center bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition-colors shadow-lg shadow-indigo-200 dark:shadow-none"><Plus size={20} /></button>
                </div>

                <div className="flex flex-col gap-2 max-h-[300px] overflow-y-auto pr-2">
                    {paymentMethods.map(pm => (
                        <div key={pm.id} className="flex items-center justify-between p-3 rounded-xl bg-gray-50 dark:bg-slate-800/50 group border border-transparent hover:border-gray-200 dark:hover:border-slate-700 transition-colors">
                            {editingId === pm.id ? (
                                <input autoFocus value={editName} onChange={e=>setEditName(e.target.value)} onBlur={() => handleSaveEdit(pm)} onKeyDown={e => e.key==='Enter' && handleSaveEdit(pm)} className="flex-1 bg-white dark:bg-slate-900 px-3 py-1 rounded-lg text-sm font-bold outline-none text-indigo-600 dark:text-indigo-400" />
                            ) : (
                                <span className="text-sm font-bold text-slate-700 dark:text-slate-200">{pm.name}</span>
                            )}
                            
                            {editingId !== pm.id && (
                                <div className="flex gap-1 opacity-100 md:opacity-0 group-hover:opacity-100 transition-opacity">
                                    <button type="button" onClick={() => { setEditingId(pm.id); setEditName(pm.name); }} className="p-2 text-slate-400 hover:text-indigo-600 transition-colors"><Edit2 size={14} /></button>
                                    <button type="button" onClick={() => deletePaymentMethod(pm.id)} className="p-2 text-slate-400 hover:text-rose-600 transition-colors"><Trash2 size={14} /></button>
                                </div>
                            )}
                        </div>
                    ))}
                    {paymentMethods.length === 0 && <div className="text-center text-[10px] font-black text-slate-400 py-6 uppercase tracking-widest">No Saved Wallets</div>}
                </div>
            </motion.div>
        </div>
    );
};

export const QuickAddExpense: React.FC<Props> = ({ isOpen, onClose, editEntry }) => {
    const { addEntry, updateEntry } = useFinanceStore();
    const [loading, setLoading] = useState(false);
    const [showCalc, setShowCalc] = useState(false);
    const [calcInput, setCalcInput] = useState('');
    
    // Derived options from existing entries
    const { entries, paymentMethods: savedPaymentMethods } = useFinanceStore();
    const storeOptions = useMemo(() => Array.from(new Set(entries.map(e => e.store_name).filter(Boolean))), [entries]);
    
    // Combine saved and historical payment methods
    const paymentOptions = useMemo(() => {
        const historical = entries.map(e => e.payment_method).filter(Boolean);
        const mappedSaved = savedPaymentMethods.map(p => p.name);
        return Array.from(new Set([...historical, ...mappedSaved]));
    }, [entries, savedPaymentMethods]);
    
    const [showManageWallets, setShowManageWallets] = useState(false);
    
    // Form state
    const [title, setTitle] = useState('');
    const [storeName, setStoreName] = useState('');
    const [amount, setAmount] = useState('');
    const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
    const [categoryId, setCategoryId] = useState<string | null>(null);
    const [notes, setNotes] = useState('');
    const [paymentMethod, setPaymentMethod] = useState('Cash');
    const [isIncome, setIsIncome] = useState(false);

    useEffect(() => {
        if (editEntry) {
            setTitle(editEntry.title || '');
            setStoreName(editEntry.store_name || '');
            setAmount(editEntry.amount?.toString() || '');
            setDate(editEntry.date || new Date().toISOString().split('T')[0]);
            setCategoryId(editEntry.category_id || null);
            setNotes(editEntry.notes || '');
            setPaymentMethod(editEntry.payment_method || 'Cash');
            setIsIncome(editEntry.is_income || false);
        } else {
            setTitle('');
            setStoreName('');
            setAmount('');
            setDate(new Date().toISOString().split('T')[0]);
            setCategoryId(null);
            setNotes('');
            setPaymentMethod('Cash');
            setIsIncome(false);
        }
    }, [editEntry, isOpen]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!storeName || !amount) return;

        setLoading(true);
        try {
            const entryData = {
                title: title || null,
                store_name: storeName,
                amount: parseFloat(amount),
                date,
                category_id: categoryId,
                notes,
                payment_method: paymentMethod,
                is_income: isIncome
            };

            if (editEntry) {
                console.log('Updating entry:', editEntry.id, entryData);
                await updateEntry(editEntry.id, entryData);
            } else {
                console.log('Adding entry:', entryData);
                await addEntry(entryData as any);
            }
            onClose();
        } catch (error: any) {
            console.error('Submission Error:', error);
            // Alert user so they know if the DB columns are missing
            window.alert(`Save failed: ${error.message || 'Check if you have run the latest SQL script in Supabase.'}`);
        } finally {
            setLoading(false);
        }
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-black/40 backdrop-blur-md z-[999]"
                        onClick={onClose}
                    />

                    <motion.div
                        initial={{ x: '100%' }}
                        animate={{ x: 0 }}
                        exit={{ x: '100%' }}
                        transition={{ type: 'spring', damping: 30, stiffness: 300 }}
                        className="fixed inset-y-0 right-0 w-full md:w-[500px] bg-white dark:bg-slate-900 z-[1000] border-l border-indigo-50 dark:border-slate-800 p-10 shadow-2xl flex flex-col overflow-y-auto custom-scrollbar"
                    >
                        <div className="flex items-center justify-between mb-10">
                            <div className="flex items-center gap-4">
                                <div className="w-14 h-14 rounded-3xl bg-gradient-to-br from-[#A0C4FF] to-[#BDB2FF] flex items-center justify-center text-white shadow-xl shadow-indigo-100/50">
                                    <Sparkles size={28} />
                                </div>
                                <div className="flex flex-col">
                                    <h2 className="text-2xl font-black text-indigo-950 dark:text-slate-100 uppercase tracking-tighter">
                                        {editEntry ? 'Modify Record' : 'Vault Entry'}
                                    </h2>
                                    <span className="text-[10px] font-black text-[#A0C4FF] uppercase tracking-[0.2em] leading-none">Zoabi Nexus Finance</span>
                                </div>
                            </div>
                            <button onClick={onClose} className="p-3 bg-gray-50 dark:bg-slate-800 rounded-2xl hover:bg-gray-100 transition-colors">
                                <X size={20} className="text-slate-400" />
                            </button>
                        </div>

                        {/* Type Toggle */}
                        <div className="grid grid-cols-2 gap-4 mb-8 p-1.5 bg-gray-50 dark:bg-slate-800 rounded-[28px] border border-gray-100">
                            <button 
                                type="button"
                                onClick={() => setIsIncome(false)}
                                className={`flex items-center justify-center gap-2 h-14 rounded-[22px] text-xs font-black uppercase tracking-widest transition-all ${!isIncome ? 'bg-white text-rose-500 shadow-lg shadow-rose-100' : 'text-slate-400'}`}
                            >
                                <ArrowUp size={16} />
                                Expense
                            </button>
                            <button 
                                type="button"
                                onClick={() => setIsIncome(true)}
                                className={`flex items-center justify-center gap-2 h-14 rounded-[22px] text-xs font-black uppercase tracking-widest transition-all ${isIncome ? 'bg-white text-emerald-500 shadow-lg shadow-emerald-100' : 'text-slate-400'}`}
                            >
                                <ArrowDown size={16} />
                                Saving
                            </button>
                        </div>

                        <form onSubmit={handleSubmit} className="flex flex-col gap-8">
                            {/* Item Title */}
                            <div className="group">
                                <label className="text-[10px] font-black uppercase text-slate-400 ml-2 mb-2 block group-focus-within:text-indigo-600 transition-colors">Item / Service Title</label>
                                <div className="relative">
                                    <Tag size={20} className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-indigo-600 transition-colors" />
                                    <input
                                        autoFocus
                                        type="text"
                                        placeholder="What did you buy? (e.g. Headphones, Dinner)"
                                        value={title}
                                        onChange={(e) => setTitle(e.target.value)}
                                        className="w-full h-16 pl-14 pr-6 bg-gray-50 dark:bg-slate-800/80 rounded-[28px] text-sm font-bold focus:ring-4 focus:ring-indigo-100/50 outline-none border-2 border-transparent focus:border-indigo-100 transition-all dark:text-slate-200"
                                    />
                                </div>
                            </div>

                            {/* Merchant / Source */}
                            <div className="group">
                                <label className="text-[10px] font-black uppercase text-slate-400 ml-2 mb-2 block group-focus-within:text-indigo-600 transition-colors">Merchant / Source</label>
                                <div className="relative">
                                    <AutocompleteSearch
                                        value={storeName}
                                        onChange={setStoreName}
                                        options={storeOptions}
                                        placeholder="Where did it go/come from?"
                                        icon={Store}
                                        inputClassName="w-full h-16 pl-14 pr-12 bg-gray-50 dark:bg-slate-800/80 rounded-[28px] text-sm font-bold focus:ring-4 focus:ring-indigo-100/50 outline-none border-2 border-transparent focus:border-indigo-100 transition-all dark:text-slate-200"
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-6">
                                <div className="group relative">
                                    <label className="text-[10px] font-black uppercase text-slate-400 ml-2 mb-2 block group-focus-within:text-indigo-600 transition-colors">Amount</label>
                                    <div className="relative flex items-center gap-2">
                                        <div className="relative flex-1">
                                            <DollarSign size={20} className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-indigo-600 transition-colors" />
                                            <input
                                                type="number"
                                                step="0.01"
                                                placeholder="0.00"
                                                value={amount}
                                                onChange={(e) => setAmount(e.target.value)}
                                                className="w-full h-16 pl-14 pr-6 bg-gray-50 dark:bg-slate-800/80 rounded-[28px] text-sm font-bold focus:ring-4 focus:ring-indigo-100/50 outline-none border-2 border-transparent focus:border-indigo-100 transition-all dark:text-slate-200"
                                            />
                                        </div>
                                        <button
                                            type="button"
                                            onClick={() => setShowCalc(!showCalc)}
                                            className="w-16 h-16 flex items-center justify-center bg-gray-50 dark:bg-slate-800/80 rounded-[28px] hover:bg-indigo-50 dark:hover:bg-indigo-900/50 hover:text-indigo-600 transition-colors shrink-0 border-2 border-transparent focus:border-indigo-100 dark:text-slate-400"
                                        >
                                            <Calculator size={24} className="group-hover:text-indigo-500 hover:text-indigo-600 transition-colors" />
                                        </button>

                                        {/* Calculator Modal */}
                                        <AnimatePresence>
                                            {showCalc && (
                                                <>
                                                    <motion.div
                                                        initial={{ opacity: 0 }}
                                                        animate={{ opacity: 1 }}
                                                        exit={{ opacity: 0 }}
                                                        className="fixed inset-0 bg-black/20 backdrop-blur-sm z-[1010]"
                                                        onClick={() => setShowCalc(false)}
                                                    />
                                                    <motion.div
                                                        initial={{ opacity: 0, y: 20, scale: 0.95 }}
                                                        animate={{ opacity: 1, y: 0, scale: 1 }}
                                                        exit={{ opacity: 0, y: 20, scale: 0.95 }}
                                                        className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-[1011] p-6 bg-white dark:bg-slate-800 border border-gray-100 dark:border-slate-700 rounded-[35px] shadow-2xl w-[300px]"
                                                    >
                                                        <div className="flex flex-col gap-3">
                                                            <div className="flex items-center justify-between px-2 mb-2">
                                                                <span className="text-[10px] font-black uppercase text-indigo-400 tracking-widest">Calculator</span>
                                                                <button onClick={() => setShowCalc(false)} className="text-slate-400 hover:text-slate-600"><X size={14} /></button>
                                                            </div>
                                                            <input 
                                                                type="text" 
                                                                value={calcInput} 
                                                                readOnly 
                                                                placeholder="0"
                                                                className="w-full h-14 px-5 bg-gray-50 dark:bg-slate-900 rounded-[20px] text-right font-mono font-bold text-2xl outline-none text-slate-700 dark:text-slate-200 mb-2 shadow-inner"
                                                            />
                                                            <div className="grid grid-cols-4 gap-2">
                                                                {['7','8','9','/','4','5','6','*','1','2','3','-','C','0','.','+'].map(btn => (
                                                                    <button
                                                                        key={btn}
                                                                        type="button"
                                                                        onClick={() => {
                                                                            if (btn === 'C') setCalcInput('');
                                                                            else setCalcInput(prev => prev + btn);
                                                                        }}
                                                                        className={`h-12 rounded-[16px] font-bold text-lg flex items-center justify-center transition-all ${
                                                                            ['/','*','-','+'].includes(btn) 
                                                                                ? 'bg-indigo-50 dark:bg-indigo-900/50 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-100 dark:hover:bg-indigo-900 active:scale-95' 
                                                                                : btn === 'C'
                                                                                    ? 'bg-rose-50 dark:bg-rose-900/50 text-rose-600 dark:text-rose-400 hover:bg-rose-100 dark:hover:bg-rose-900 active:scale-95'
                                                                                    : 'bg-gray-50 border border-gray-100 dark:bg-slate-700/50 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-gray-100 dark:hover:bg-slate-700 hover:border-gray-200 active:scale-95'
                                                                        }`}
                                                                    >
                                                                        {btn}
                                                                    </button>
                                                                ))}
                                                            </div>
                                                            <div className="flex gap-2 mt-2">
                                                                <button 
                                                                    type="button" 
                                                                    onClick={() => {
                                                                        try {
                                                                            // eslint-disable-next-line
                                                                            const result = Function('"use strict";return (' + calcInput + ')')();
                                                                            if (isNaN(result) || !isFinite(result)) throw new Error('Invalid');
                                                                            setCalcInput(String(Number(result).toFixed(2)));
                                                                        } catch {
                                                                            const old = calcInput;
                                                                            setCalcInput('Error');
                                                                            setTimeout(() => setCalcInput(old), 1000);
                                                                        }
                                                                    }}
                                                                    className="flex-1 h-12 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-[16px] font-black text-lg hover:bg-indigo-200 dark:hover:bg-indigo-900 transition-all active:scale-95"
                                                                >
                                                                    =
                                                                </button>
                                                                <button 
                                                                    type="button" 
                                                                    onClick={() => {
                                                                        try {
                                                                            // eslint-disable-next-line
                                                                            let resStr = calcInput;
                                                                            // eslint-disable-next-line
                                                                            const result = Function('"use strict";return (' + calcInput + ')')();
                                                                            if (!isNaN(result) && isFinite(result)) {
                                                                                resStr = Number(result).toFixed(2);
                                                                            }
                                                                            setAmount(resStr);
                                                                            setCalcInput('');
                                                                            setShowCalc(false);
                                                                        } catch {
                                                                            setAmount(calcInput);
                                                                            setCalcInput('');
                                                                            setShowCalc(false);
                                                                        }
                                                                    }}
                                                                    className="flex-[2] h-12 bg-indigo-600 text-white rounded-[16px] font-black text-[11px] uppercase tracking-[0.2em] shadow-lg shadow-indigo-600/30 hover:bg-indigo-700 transition-all active:scale-95"
                                                                >
                                                                    Apply
                                                                </button>
                                                            </div>
                                                        </div>
                                                    </motion.div>
                                                </>
                                            )}
                                        </AnimatePresence>
                                    </div>
                                </div>

                                <div className="group">
                                    <div className="flex items-center justify-between mb-2">
                                        <label className="text-[10px] font-black uppercase text-slate-400 ml-2 group-focus-within:text-indigo-600 transition-colors">Asset / Wallet</label>
                                        <button type="button" onClick={() => setShowManageWallets(true)} className="text-[10px] font-black uppercase tracking-widest text-indigo-500 hover:text-indigo-600 flex items-center gap-1 transition-colors bg-indigo-50 dark:bg-indigo-900/40 px-2 py-1 rounded-md">
                                            <Settings size={12} /> Manage
                                        </button>
                                    </div>
                                    <div className="relative">
                                        <AutocompleteSearch
                                            value={paymentMethod}
                                            onChange={setPaymentMethod}
                                            options={Array.from(new Set([...paymentOptions, 'Cash', 'Credit Card', 'Debit Card']))}
                                            placeholder="Method (e.g. Card, Cash)"
                                            icon={Wallet}
                                            inputClassName="w-full h-16 pl-14 pr-12 bg-gray-50 dark:bg-slate-800/80 rounded-[28px] text-sm font-bold focus:ring-4 focus:ring-indigo-100/50 outline-none border-2 border-transparent focus:border-indigo-100 transition-all dark:text-slate-200"
                                        />
                                    </div>
                                </div>
                            </div>

                            <CategorySelector selectedId={categoryId} onSelect={setCategoryId} />

                            <div className="grid grid-cols-2 gap-6">
                                <div className="group">
                                    <label className="text-[10px] font-black uppercase text-slate-400 ml-2 mb-2 block group-focus-within:text-indigo-600 transition-colors">Date</label>
                                    <div className="relative">
                                        <CalendarIcon size={20} className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-indigo-600 transition-colors" />
                                        <input
                                            type="date"
                                            value={date}
                                            onChange={(e) => setDate(e.target.value)}
                                            className="w-full h-16 pl-14 pr-6 bg-gray-50 dark:bg-slate-800/80 rounded-[28px] text-sm font-bold focus:ring-4 focus:ring-indigo-100/50 outline-none border-2 border-transparent focus:border-indigo-100 transition-all dark:text-slate-200 font-mono text-[10px] tracking-widest uppercase"
                                        />
                                    </div>
                                </div>
                                <div className="group">
                                    <label className="text-[10px] font-black uppercase text-slate-400 ml-2 mb-2 block group-focus-within:text-indigo-600 transition-colors">Memo</label>
                                    <div className="relative h-16">
                                        <FileText size={20} className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-indigo-600 transition-colors" />
                                        <input
                                            placeholder="Quick note..."
                                            value={notes}
                                            onChange={(e) => setNotes(e.target.value)}
                                            className="w-full h-full pl-14 pr-6 bg-gray-50 dark:bg-slate-800/80 rounded-[28px] text-sm font-bold focus:ring-4 focus:ring-indigo-100/50 outline-none border-2 border-transparent focus:border-indigo-100 transition-all dark:text-slate-200"
                                        />
                                    </div>
                                </div>
                            </div>

                            <button
                                disabled={loading}
                                type="submit"
                                className={`w-full h-20 rounded-[35px] font-black text-sm uppercase tracking-[0.3em] transition-all active:scale-95 flex items-center justify-center gap-4 shadow-2xl mt-6 disabled:opacity-50 ${isIncome ? 'bg-emerald-500 shadow-emerald-200 text-white' : 'bg-indigo-950 shadow-indigo-200 text-white'}`}
                            >
                                {loading ? (
                                    <div className="w-6 h-6 border-4 border-white/40 border-t-white rounded-full animate-spin" />
                                ) : (
                                    <>
                                        {editEntry ? <Check size={24} /> : <Plus size={24} />}
                                        {editEntry ? 'Save Changes' : `Secure ${isIncome ? 'Saving' : 'Expense'}`}
                                    </>
                                )}
                            </button>
                        </form>
                    </motion.div>
                    
                    <AnimatePresence>
                        {showManageWallets && <ManagePaymentMethods onClose={() => setShowManageWallets(false)} />}
                    </AnimatePresence>
                </>
            )}
        </AnimatePresence>
    );
};
