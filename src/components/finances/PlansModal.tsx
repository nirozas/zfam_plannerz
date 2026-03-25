import React from 'react';
import { useFinanceStore } from '@/store/financeStore';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Target, DollarSign, Wallet, Tag, Plus, TrendingUp } from 'lucide-react';

interface Props {
    isOpen: boolean;
    onClose: () => void;
    month: number;
    year: number;
}

export const PlansModal: React.FC<Props> = ({ isOpen, onClose, month, year }) => {
    const { budgets, setBudget, categories } = useFinanceStore();
    const [type, setType] = React.useState<'spending' | 'saving'>('spending');
    const [amount, setAmount] = React.useState('');
    const [categoryId, setCategoryId] = React.useState<string | null>(null);
    const [loading, setLoading] = React.useState(false);

    // Filter budgets for the current selected month/year
    const currentBudgets = budgets.filter(b => b.month === month && b.year === year);

    const handleSave = async () => {
        if (!amount) return;
        setLoading(true);
        try {
            await setBudget({
                type,
                amount: parseFloat(amount),
                category_id: categoryId || undefined,
                month,
                year
            });
            setAmount('');
            setCategoryId(null);
        } catch (error) {
            console.error(error);
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
                        className="fixed inset-y-0 right-0 w-full md:w-[500px] bg-white dark:bg-slate-900 z-[1000] border-l border-indigo-50 dark:border-slate-800 p-10 shadow-2xl flex flex-col"
                    >
                        <div className="flex items-center justify-between mb-10">
                            <div className="flex items-center gap-4">
                                <div className="w-14 h-14 rounded-3xl bg-indigo-950 flex items-center justify-center text-white shadow-xl shadow-indigo-200/50">
                                    <Target size={28} />
                                </div>
                                <div className="flex flex-col">
                                    <h2 className="text-2xl font-black text-indigo-950 dark:text-slate-100 uppercase tracking-tighter">Finance Plans</h2>
                                    <span className="text-[10px] font-black text-[#A0C4FF] uppercase tracking-[0.2em]">Strategy Mode • {month + 1}/{year}</span>
                                </div>
                            </div>
                            <button onClick={onClose} className="p-3 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-2xl transition-colors">
                                <X size={20} className="text-slate-400" />
                            </button>
                        </div>

                        {/* Add New Plan Section */}
                        <div className="bg-gray-50 dark:bg-slate-800/40 p-8 rounded-[40px] border border-gray-100 dark:border-slate-800 mb-10">
                            <h3 className="text-[10px] font-black uppercase tracking-widest text-indigo-950/40 mb-6">Create New Goal</h3>
                            
                            <div className="space-y-6">
                                {/* Type Selector */}
                                <div className="grid grid-cols-2 gap-3 p-1.5 bg-white dark:bg-slate-900 rounded-2xl border border-gray-50 dark:border-slate-700">
                                    <button 
                                        onClick={() => setType('spending')}
                                        className={`h-11 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all ${type === 'spending' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-200' : 'text-slate-400'}`}
                                    >
                                        Spending
                                    </button>
                                    <button 
                                        onClick={() => setType('saving')}
                                        className={`h-11 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all ${type === 'saving' ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-200' : 'text-slate-400'}`}
                                    >
                                        Saving
                                    </button>
                                </div>

                                {/* Category Selector (for spending) */}
                                {type === 'spending' && (
                                    <div className="group">
                                        <label className="text-[8px] font-black uppercase text-slate-400 ml-2 mb-2 block">Scope (Optional)</label>
                                        <div className="relative">
                                            <Tag size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" />
                                            <select 
                                                value={categoryId || ''}
                                                onChange={(e) => setCategoryId(e.target.value || null)}
                                                className="w-full h-14 pl-12 pr-6 bg-white dark:bg-slate-900 rounded-2xl text-[10px] font-black uppercase tracking-widest outline-none border border-transparent focus:border-indigo-100 transition-all dark:text-slate-200 appearance-none cursor-pointer"
                                            >
                                                <option value="">Global (All Spending)</option>
                                                {categories.filter(c => !c.parent_id).map(c => (
                                                    <option key={c.id} value={c.id}>{c.name} Limit</option>
                                                ))}
                                            </select>
                                        </div>
                                    </div>
                                )}

                                {/* Amount */}
                                <div className="group">
                                    <label className="text-[8px] font-black uppercase text-slate-400 ml-2 mb-2 block">Target Amount</label>
                                    <div className="relative">
                                        <DollarSign size={20} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" />
                                        <input
                                            type="number"
                                            value={amount}
                                            onChange={(e) => setAmount(e.target.value)}
                                            placeholder="0.00"
                                            className="w-full h-14 pl-12 pr-6 bg-white dark:bg-slate-900 rounded-2xl text-sm font-bold outline-none border border-transparent focus:border-indigo-100 transition-all dark:text-slate-200"
                                        />
                                    </div>
                                </div>

                                <button
                                    onClick={handleSave}
                                    disabled={loading || !amount}
                                    className="w-full h-14 bg-indigo-950 text-white rounded-2xl font-black text-[10px] uppercase tracking-[0.2em] shadow-xl shadow-indigo-100 dark:shadow-none flex items-center justify-center gap-3 active:scale-95 transition-all disabled:opacity-50"
                                >
                                    {loading ? <div className="w-5 h-5 border-2 border-white/40 border-t-white rounded-full animate-spin" /> : <Plus size={16}/>}
                                    Establish Goal
                                </button>
                            </div>
                        </div>

                        {/* Existing Plans List */}
                        <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar">
                            <h3 className="text-[10px] font-black uppercase tracking-widest text-indigo-950/40 mb-6 flex items-center gap-2">
                                Current Strategy <span className="opacity-30">({currentBudgets.length})</span>
                            </h3>
                            
                            <div className="space-y-4">
                                {currentBudgets.map(budget => {
                                    const category = categories.find(c => c.id === budget.category_id);
                                    const isSpending = budget.type === 'spending';

                                    return (
                                        <motion.div 
                                            key={budget.id}
                                            layout
                                            initial={{ opacity: 0, scale: 0.95 }}
                                            animate={{ opacity: 1, scale: 1 }}
                                            className="bg-white dark:bg-slate-800 p-6 rounded-[30px] border border-gray-50 dark:border-slate-700 flex items-center justify-between group"
                                        >
                                            <div className="flex items-center gap-4">
                                                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${isSpending ? 'bg-[#9BF6FF]/20 text-[#9BF6FF]' : 'bg-emerald-50 text-emerald-500'}`}>
                                                    {isSpending ? <TrendingUp size={20} /> : <Wallet size={20} />}
                                                </div>
                                                <div className="flex flex-col">
                                                    <span className="text-[9px] font-black uppercase text-indigo-950/80 dark:text-slate-100">
                                                        {isSpending ? (category ? `${category.name} Budget` : 'Total Budget') : 'Monthly Savings'}
                                                    </span>
                                                    <span className="text-[8px] font-black uppercase tracking-widest text-slate-400 mt-0.5">Target reached at 100%</span>
                                                </div>
                                            </div>
                                            <div className="flex flex-col items-end">
                                               <span className="text-sm font-black text-indigo-950 dark:text-slate-100">${Number(budget.amount).toLocaleString()}</span>
                                               <button className="text-[8px] font-black uppercase text-rose-400 opacity-0 group-hover:opacity-100 transition-opacity mt-1">Delete</button>
                                            </div>
                                        </motion.div>
                                    );
                                })}
                                {currentBudgets.length === 0 && (
                                    <div className="py-20 text-center border-2 border-dashed border-gray-50 rounded-3xl">
                                        <span className="text-[10px] font-black uppercase text-gray-300 tracking-widest">No goals defined</span>
                                    </div>
                                )}
                            </div>
                        </div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
};
