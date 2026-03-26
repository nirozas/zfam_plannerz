import React, { useMemo, useState } from 'react';
import { useFinanceStore } from '@/store/financeStore';
import { 
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
    Cell, PieChart, Pie
} from 'recharts';
import { motion } from 'framer-motion';
import { ArrowUp, ArrowDown, AlertCircle, PieChart as PieIcon, BarChart3, TrendingUp, Calendar, Store, CreditCard } from 'lucide-react';
import { getColorForName, PASTEL_COLORS } from '@/utils/financeColors';

interface Props {
    fromDate?: string;
    toDate?: string;
    month: number | 'all';
    year: number | 'all';
    categoryFilter?: string;
    onFilterSelect?: (type: 'category' | 'store' | 'payment', value: string) => void;
}

export const FinanceAnalysis: React.FC<Props> = ({ fromDate, toDate, month, year, categoryFilter, onFilterSelect }) => {
    const { entries, categories, budgets } = useFinanceStore();
    const [viewMode, setViewMode] = useState<'monthly' | 'annual'>('monthly');
    const [analyzedCategory, setAnalyzedCategory] = useState<string>('all');

    const filteredEntries = useMemo(() => {
        let base = entries;
        if (viewMode === 'annual') {
            base = base.filter(e => new Date(e.date).getFullYear() === (year === 'all' ? new Date().getFullYear() : year));
        } else if (fromDate && toDate) {
            base = base.filter(e => e.date >= fromDate && e.date <= toDate);
        } else {
            base = base.filter(e => {
                const date = new Date(e.date);
                return (month === 'all' || date.getUTCMonth() === month) && (year === 'all' || date.getUTCFullYear() === year);
            });
        }
        return base;
    }, [entries, fromDate, toDate, month, year, viewMode]);

    const stats = useMemo(() => {
        const isSaving = (e: any) => e.category?.name.toLowerCase().includes('saving');
        
        const income = filteredEntries.filter(e => e.is_income && !isSaving(e)).reduce((sum, e) => sum + Number(e.amount), 0);
        const expenses = filteredEntries.filter(e => !e.is_income && !isSaving(e)).reduce((sum, e) => sum + Number(e.amount), 0);
        const explicitSavings = filteredEntries.filter(e => isSaving(e)).reduce((sum, e) => sum + Number(e.amount), 0);
        const net = income - expenses;
        
        const currentMonth = month === 'all' ? new Date().getMonth() : month;
        const currentYear = year === 'all' ? new Date().getFullYear() : year;
        
        const totalSpendingPlan = budgets.find(b => b.type === 'spending' && !b.category_id && b.month === currentMonth && b.year === currentYear)?.amount || 0;
        const savingPlan = budgets.find(b => b.type === 'saving' && b.month === currentMonth && b.year === currentYear)?.amount || 0;

        // Category Trends
        const isAllCats = analyzedCategory === 'all';
        const baseCats = isAllCats 
            ? categories.filter(c => !c.parent_id) 
            : categories.filter(c => c.parent_id === analyzedCategory);
            
        const categoryData = baseCats.map(cat => {
            const childrenIds = isAllCats ? categories.filter(c => c.parent_id === cat.id).map(c => c.id) : [];
            const spent = filteredEntries.filter(e => {
                const isMatch = e.category_id === cat.id || childrenIds.includes(e.category_id || '');
                return !e.is_income && isMatch && !isSaving(e);
            }).reduce((sum, e) => sum + Number(e.amount), 0);
            
            const budget = budgets.find(b => b.type === 'spending' && b.category_id === cat.id && b.month === currentMonth && b.year === currentYear)?.amount;
            
            return {
                name: cat.name,
                spent,
                budget: budget ? Number(budget) : 0,
                percent: budget ? (spent / Number(budget)) * 100 : 0,
                hasBudget: !!budget
            };
        }).filter(c => {
            const matchesCategory = !categoryFilter || c.name.toLowerCase().includes(categoryFilter.toLowerCase());
            return (c.spent > 0 || c.hasBudget) && matchesCategory;
        }).sort((a, b) => b.spent - a.spent);

        // Subcategory Breakdown (Used in the second graph)
        const subcategoryData = categories.filter(c => c.parent_id && (isAllCats || c.parent_id === analyzedCategory)).map(cat => {
            const spent = filteredEntries.filter(e => !e.is_income && e.category_id === cat.id && !isSaving(e)).reduce((sum, e) => sum + Number(e.amount), 0);
            return { name: cat.name, value: spent };
        }).filter(c => c.value > 0).sort((a, b) => b.value - a.value);

        // Merchant/Store Breakdown
        const storeMap = new Map<string, number>();
        // Payment Method Breakdown
        const paymentMap = new Map<string, number>();

        filteredEntries.forEach(e => {
            if (!e.is_income && !isSaving(e)) {
                const store = e.store_name?.trim() || 'Unknown';
                storeMap.set(store, (storeMap.get(store) || 0) + Number(e.amount));

                const method = e.payment_method || 'Cash';
                paymentMap.set(method, (paymentMap.get(method) || 0) + Number(e.amount));
            }
        });

        const storeData = Array.from(storeMap.entries())
            .map(([name, value]) => ({ name, value }))
            .sort((a, b) => b.value - a.value)
            .slice(0, 10); // Top 10 stores

        const paymentData = Array.from(paymentMap.entries())
            .map(([name, value]) => ({ name, value }))
            .sort((a, b) => b.value - a.value);

        return { 
            income, 
            expenses, 
            net, 
            totalSpendingPlan, 
            savingPlan, 
            categoryUsage: categoryData, 
            subcategories: subcategoryData,
            storeData,
            paymentData,
            explicitSavings
        };
    }, [filteredEntries, budgets, month, year, categories, analyzedCategory, categoryFilter]);

    const spendingPercent = stats.totalSpendingPlan > 0 ? Math.min((stats.expenses / stats.totalSpendingPlan) * 100, 100) : 0;
    const totalSavedComputed = stats.explicitSavings + Math.max(0, stats.net);
    const savingPercent = stats.savingPlan > 0 ? Math.min((totalSavedComputed / stats.savingPlan) * 100, 100) : 0;
    const parentCatsOnly = categories.filter(c => !c.parent_id);

    return (
        <div className="flex flex-col gap-8 w-full font-bold">
            {/* Perspective Toggle */}
            <div className="flex items-center justify-between px-6 py-4 bg-white/40 dark:bg-slate-800/20 backdrop-blur-3xl rounded-[30px] border border-white/50">
                <div className="flex items-center gap-3">
                    <Calendar size={18} className="text-indigo-400" />
                    <span className="text-[10px] font-black uppercase text-indigo-950/60 dark:text-slate-100 tracking-widest">Time Window</span>
                </div>
                <div className="flex items-center gap-2">
                    <div className="flex bg-white/60 p-1 rounded-2xl border border-gray-50 shadow-sm">
                        <button 
                            onClick={() => setViewMode('monthly')}
                            className={`px-4 py-2 rounded-xl text-[8px] font-black uppercase tracking-widest transition-all ${viewMode === 'monthly' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-200' : 'text-slate-400'}`}
                        >
                            Monthly
                        </button>
                        <button 
                            onClick={() => setViewMode('annual')}
                            className={`px-4 py-2 rounded-xl text-[8px] font-black uppercase tracking-widest transition-all ${viewMode === 'annual' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-200' : 'text-slate-400'}`}
                        >
                            Annual
                        </button>
                    </div>
                    <select 
                        value={analyzedCategory}
                        onChange={(e) => setAnalyzedCategory(e.target.value)}
                        className="ml-2 h-8 pl-3 pr-8 bg-white/60 dark:bg-slate-900 border border-gray-100 dark:border-slate-700 text-[8px] font-black uppercase tracking-widest outline-none appearance-none cursor-pointer rounded-xl text-indigo-950/60 dark:text-slate-300 shadow-sm"
                    >
                        <option value="all">All Categories</option>
                        {parentCatsOnly.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                </div>
            </div>

            {/* Summary Row */}
            <div className="grid grid-cols-2 gap-4 w-full">
                {/* Total Spent Box */}
                <motion.div 
                    whileHover={{ scale: 1.01 }}
                    animate={spendingPercent >= 100 ? { x: [-0.5, 0.5, -0.5, 0.5, 0] } : {}}
                    transition={spendingPercent >= 100 ? { repeat: Infinity, duration: 1.2 } : {}}
                    className="bg-gradient-to-br from-[#A0C4FF] to-[#BDB2FF] rounded-[30px] p-5 shadow-xl shadow-indigo-100/20 border border-white/20 relative overflow-hidden"
                >
                    <div className="relative z-10 text-indigo-950">
                        <div className="flex items-center justify-between mb-4">
                            <div className="flex flex-col">
                                <span className="text-[8px] font-black uppercase tracking-widest opacity-60">
                                    {viewMode === 'annual' ? 'Projected Year' : 'Monthly Spent'}
                                </span>
                                <h3 className="text-xl font-black">${stats.expenses.toLocaleString()}</h3>
                            </div>
                            <div className="w-8 h-8 bg-white/40 rounded-xl shadow shadow-indigo-600/10 flex items-center justify-center">
                                <ArrowUp size={16} />
                            </div>
                        </div>
                        <div className="flex items-center justify-between mb-2 text-[8px] font-black uppercase opacity-60">
                            <span>Goal: ${stats.totalSpendingPlan || '---'}</span>
                            <span>{spendingPercent.toFixed(0)}%</span>
                        </div>
                        <div className="h-2 w-full bg-white/30 rounded-full overflow-hidden border border-white/10">
                            <motion.div 
                                initial={{ width: 0 }}
                                animate={{ width: `${spendingPercent}%` }}
                                className={`h-full rounded-full ${spendingPercent > 90 ? 'bg-rose-400' : 'bg-indigo-950'}`}
                            />
                        </div>
                    </div>
                </motion.div>

                {/* Savings Power Box */}
                <motion.div 
                    whileHover={{ scale: 1.01 }}
                    className="bg-white dark:bg-slate-900 rounded-[30px] p-5 shadow-xl shadow-indigo-100/10 border border-emerald-50 dark:border-slate-800 relative overflow-hidden"
                >
                    <div className="relative z-10">
                        <div className="flex items-center justify-between mb-4">
                            <div className="flex flex-col">
                                <span className="text-[8px] font-black uppercase tracking-widest text-emerald-400">Savings Power</span>
                                <h3 className="text-xl font-black text-emerald-600">${Math.max(0, stats.net).toLocaleString()}</h3>
                            </div>
                            <div className="w-8 h-8 bg-emerald-50 text-emerald-500 rounded-xl flex items-center justify-center">
                                <ArrowDown size={16} />
                            </div>
                        </div>
                        <div className="flex items-center justify-between mb-2 text-[8px] font-black uppercase text-emerald-600/40">
                            <span>Goal: ${stats.savingPlan || '---'}</span>
                            <span>{savingPercent.toFixed(0)}%</span>
                        </div>
                        <div className="h-2 w-full bg-emerald-50 dark:bg-slate-800 rounded-full overflow-hidden border border-emerald-100/10 shadow-inner">
                            <motion.div 
                                initial={{ width: 0 }}
                                animate={{ width: `${savingPercent}%` }}
                                className="h-full bg-emerald-400 rounded-full"
                            />
                        </div>
                    </div>
                </motion.div>
            </div>

            {/* Strategy Risks */}
            {stats.categoryUsage.filter(u => u.hasBudget).length > 0 && (
                <div className="bg-white/40 dark:bg-slate-900/40 backdrop-blur-2xl border border-gray-100 dark:border-slate-800 rounded-[40px] p-8 shadow-xl">
                    <div className="flex items-center gap-3 mb-8">
                        <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-500 flex items-center justify-center border border-amber-100 shadow-sm">
                           <AlertCircle size={22} />
                        </div>
                        <div className="flex flex-col">
                            <h3 className="text-sm font-black text-indigo-950 dark:text-slate-100 uppercase tracking-widest">Strategy Risks</h3>
                            <span className="text-[8px] font-black text-slate-400 uppercase tracking-[0.2em] mt-1">Categorized Spending Check</span>
                        </div>
                    </div>
                    <div className="space-y-6">
                        {stats.categoryUsage.filter(u => u.hasBudget).map((u) => {
                            const isViolated = u.percent >= 100;
                            return (
                                <motion.div 
                                    key={u.name} 
                                    className="space-y-2"
                                    animate={isViolated ? { x: [-1.5, 1.5, -1.5, 1.5, 0] } : {}}
                                    transition={isViolated ? { repeat: Infinity, duration: 0.8, repeatDelay: 1 } : {}}
                                >
                                    <div className="flex items-center justify-between text-[10px] font-black uppercase tracking-tight">
                                        <div className="flex items-center gap-2">
                                            <span className="text-indigo-950/80 dark:text-slate-300">{u.name} Strategy</span>
                                            {isViolated && (
                                                <motion.div 
                                                    animate={{ scale: [1, 1.2, 1], opacity: [0.5, 1, 0.5] }}
                                                    transition={{ repeat: Infinity, duration: 2 }}
                                                    className="w-1.5 h-1.5 rounded-full bg-rose-500" 
                                                />
                                            )}
                                        </div>
                                        <span className={u.percent > 90 ? 'text-rose-500 font-black' : 'text-indigo-600'}>
                                            ${u.spent.toLocaleString()} / ${u.budget.toLocaleString()}
                                        </span>
                                    </div>
                                    <div className="h-2 w-full bg-gray-50 dark:bg-slate-800 rounded-full overflow-hidden border border-gray-100 dark:border-slate-700">
                                        <motion.div 
                                            initial={{ width: 0 }}
                                            animate={{ width: `${Math.min(u.percent, 100)}%` }}
                                            className={`h-full rounded-full transition-all duration-1000 ${u.percent > 100 ? 'bg-rose-500 shadow-[0_0_10px_rgba(244,63,94,0.3)]' : u.percent > 80 ? 'bg-amber-400' : ''}`}
                                            style={{ backgroundColor: u.percent <= 80 ? getColorForName(u.name) : undefined }}
                                        />
                                    </div>
                                </motion.div>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* Income vs Expenses Trend - NEW GRAPH */}
            <div className="bg-white/40 dark:bg-slate-900/40 backdrop-blur-xl border border-gray-100 dark:border-slate-800 rounded-[40px] p-8 shadow-xl">
                <div className="flex items-center justify-between mb-8">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
                            <TrendingUp size={18} />
                        </div>
                        <span className="text-[10px] font-black uppercase tracking-widest text-indigo-950/60 dark:text-slate-100">Category Trends</span>
                    </div>
                    <BarChart3 size={18} className="text-indigo-200" />
                </div>
                <div className="h-[250px] w-full mt-4">
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={stats.categoryUsage.map(u => ({ name: u.name, total: u.spent }))}>
                            <CartesianGrid strokeDasharray="5 5" vertical={false} stroke="#F3F4F6" />
                            <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 9, fontWeight: 900, fill: '#6366f1', opacity: 0.6 }} dy={10} />
                            <Tooltip cursor={{ fill: '#F9FAFB', opacity: 0.5 }} contentStyle={{ borderRadius: '24px', border: 'none', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)', fontWeight: 900, fontSize: 10 }} />
                            <Bar dataKey="total" radius={[12, 12, 0, 0]} barSize={44} animationDuration={2000}>
                                {stats.categoryUsage.map((u) => <Cell key={`cell-${u.name}`} fill={getColorForName(u.name)} stroke="#000000" strokeWidth={1.5} />)}
                            </Bar>
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </div>

            {/* Subcategory Decomposition - NEW GRAPH */}
            {stats.subcategories.length > 0 && (
                <div className="bg-white/40 dark:bg-slate-900/40 backdrop-blur-xl border border-gray-100 dark:border-slate-800 rounded-[40px] p-8 shadow-xl">
                    <div className="flex items-center justify-between mb-8">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
                                <PieIcon size={18} />
                            </div>
                            <span className="text-[10px] font-black uppercase tracking-widest text-indigo-950/60 dark:text-slate-100">Subcategory Flow</span>
                        </div>
                    </div>
                    <div className="h-[250px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie
                                    data={stats.subcategories}
                                    dataKey="value"
                                    nameKey="name"
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={60}
                                    outerRadius={80}
                                    paddingAngle={8}
                                >
                                    {stats.subcategories.map((entry) => (
                                        <Cell 
                                            key={`cell-${entry.name}`} 
                                            fill={getColorForName(entry.name)} 
                                            stroke="#000000" strokeWidth={1.5}
                                            className="cursor-pointer hover:opacity-80 outline-none"
                                            onClick={() => {
                                                if(onFilterSelect && entry.name) onFilterSelect('category', entry.name);
                                            }}
                                        />
                                    ))}
                                </Pie>
                                <Tooltip contentStyle={{ borderRadius: '16px', fontWeight: 900, fontSize: 9 }} />
                            </PieChart>
                        </ResponsiveContainer>
                        <div className="grid grid-cols-2 gap-2 mt-4">
                            {stats.subcategories.slice(0, 4).map(sub => (
                                <div key={sub.name} className="flex items-center gap-2">
                                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: getColorForName(sub.name) }} />
                                    <span className="text-[8px] font-black uppercase text-indigo-950/40 dark:text-slate-300 truncate">{sub.name}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {/* Store and Payment Method Breakdown */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {stats.storeData.length > 0 && (
                    <div className="bg-white/40 dark:bg-slate-900/40 backdrop-blur-xl border border-gray-100 dark:border-slate-800 rounded-[40px] p-6 shadow-xl">
                        <div className="flex items-center justify-between mb-6">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
                                    <Store size={18} />
                                </div>
                                <span className="text-[10px] font-black uppercase tracking-widest text-indigo-950/60 dark:text-slate-100">Purchases per Store</span>
                            </div>
                        </div>
                        <div className="h-[200px] w-full">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={stats.storeData} layout="vertical" margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                                    <CartesianGrid strokeDasharray="5 5" horizontal={false} stroke="#E5E7EB" />
                                    <XAxis type="number" hide />
                                    <YAxis type="category" dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 9, fontWeight: 900, fill: '#6366f1', opacity: 0.8 }} />
                                    <Tooltip cursor={{ fill: '#F9FAFB', opacity: 0.5 }} contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)', fontWeight: 900, fontSize: 10 }} />
                                    <Bar 
                                        dataKey="value" 
                                        radius={[0, 8, 8, 0]} 
                                        barSize={20} 
                                        fill="#6366f1"
                                        onClick={(data) => {
                                            if(onFilterSelect && data && data.name) onFilterSelect('store', data.name);
                                        }}
                                    >
                                        {stats.storeData.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={PASTEL_COLORS[index % PASTEL_COLORS.length]} stroke="#000000" strokeWidth={1.5} className="cursor-pointer hover:opacity-80" />
                                        ))}
                                    </Bar>
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                )}

                {stats.paymentData.length > 0 && (
                    <div className="bg-white/40 dark:bg-slate-900/40 backdrop-blur-xl border border-gray-100 dark:border-slate-800 rounded-[40px] p-6 shadow-xl">
                        <div className="flex items-center justify-between mb-6">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
                                    <CreditCard size={18} />
                                </div>
                                <span className="text-[10px] font-black uppercase tracking-widest text-indigo-950/60 dark:text-slate-100">Exp. per Payment</span>
                            </div>
                        </div>
                        <div className="h-[200px] w-full">
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie
                                        data={stats.paymentData}
                                        dataKey="value"
                                        nameKey="name"
                                        cx="50%"
                                        cy="50%"
                                        innerRadius={50}
                                        outerRadius={70}
                                        paddingAngle={5}
                                    >
                                        {stats.paymentData.map((entry) => {
                                            const shades = ['#D1FAE5', '#DCFCE7', '#F0FDF4', '#ECFCCB', '#CCFBF1'];
                                            const hash = entry.name.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
                                            const shade = shades[hash % shades.length];
                                            return (
                                                <Cell 
                                                    key={`cell-${entry.name}`} 
                                                    fill={shade} 
                                                    stroke="#000000" strokeWidth={1.5}
                                                    className="cursor-pointer hover:opacity-80 outline-none"
                                                    onClick={() => {
                                                        if(onFilterSelect && entry.name) onFilterSelect('payment', entry.name);
                                                    }}
                                                />
                                            );
                                        })}
                                    </Pie>
                                    <Tooltip contentStyle={{ borderRadius: '16px', fontWeight: 900, fontSize: 9 }} />
                                </PieChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};
