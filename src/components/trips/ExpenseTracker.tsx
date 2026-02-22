import React, { useState, useMemo } from 'react';
import { useTripStore } from '../../store/tripStore';
import {
    Plus, Trash2, PieChart as PieIcon, BarChart3,
    Utensils, Car, MoreHorizontal, Target,
    Landmark, Bed, Ticket, ShoppingBag,
    Calendar, Clock, DollarSign, X, Check, ArrowUpRight, TrendingUp, Wallet
} from 'lucide-react';
import {
    PieChart, Pie, Cell, ResponsiveContainer,
    XAxis, YAxis, Tooltip, AreaChart, Area
} from 'recharts';

interface ExpenseTrackerProps {
    trip: any;
}

const CATEGORY_COLORS: Record<string, string> = {
    Dining: '#f59e0b',
    Accommodation: '#8b5cf6',
    Attraction: '#10b981',
    Transportation: '#3b82f6',
    Activity: '#0ea5e9',
    Shopping: '#ec4899',
    Other: '#94a3b8'
};

const CATEGORY_ICONS: Record<string, React.ReactNode> = {
    Dining: <Utensils size={14} />,
    Accommodation: <Bed size={14} />,
    Attraction: <Landmark size={14} />,
    Transportation: <Car size={14} />,
    Activity: <Ticket size={14} />,
    Shopping: <ShoppingBag size={14} />,
    Other: <MoreHorizontal size={14} />
};

const ExpenseTracker: React.FC<ExpenseTrackerProps> = ({ trip }) => {
    const { activeTripExpenses, addExpense, updateExpense, deleteExpense, filters, setFilter, userRole } = useTripStore();
    const isViewer = userRole === 'viewer';
    const [showModal, setShowModal] = useState(false);
    const [budget, setBudget] = useState<string>(() => localStorage.getItem(`budget-${trip.id}`) || '');
    const [editingBudget, setEditingBudget] = useState(false);
    const [budgetInput, setBudgetInput] = useState('');
    const [editingExpenseId, setEditingExpenseId] = useState<string | null>(null);

    const [newExpense, setNewExpense] = useState({
        amount: '',
        category: 'Dining' as any,
        description: '',
        date: new Date().toISOString().split('T')[0],
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false }),
        currency: 'USD'
    });

    const filteredExpenses = useMemo(() => {
        return activeTripExpenses.filter(e => {
            const matchesCategory = filters.categories.length === 0 || filters.categories.includes(e.category);
            let matchesDay = true;
            if (filters.days !== 'all' && trip.start_date) {
                const start = new Date(trip.start_date).getTime();
                const current = new Date(e.date).getTime();
                const dayDiff = Math.floor((current - start) / (1000 * 60 * 60 * 24)) + 1;
                matchesDay = dayDiff === filters.days;
            }
            return matchesCategory && matchesDay;
        });
    }, [activeTripExpenses, filters.categories, filters.days, trip.start_date]);

    const totalSpend = useMemo(() =>
        filteredExpenses.reduce((sum, exp) => sum + Number(exp.amount), 0),
        [filteredExpenses]
    );

    const budgetNum = parseFloat(budget) || 0;
    const budgetUsedPct = budgetNum > 0 ? Math.min((totalSpend / budgetNum) * 100, 100) : 0;
    const remaining = budgetNum > 0 ? budgetNum - totalSpend : null;
    const overBudget = remaining !== null && remaining < 0;

    const pieData = useMemo(() => {
        const cats: Record<string, number> = {};
        filteredExpenses.forEach(exp => {
            cats[exp.category] = (cats[exp.category] || 0) + Number(exp.amount);
        });
        return Object.keys(cats).map(cat => ({ name: cat, value: cats[cat] }));
    }, [filteredExpenses]);

    const barData = useMemo(() => {
        const daily: Record<string, number> = {};
        filteredExpenses.forEach(exp => {
            const day = new Date(exp.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
            daily[day] = (daily[day] || 0) + Number(exp.amount);
        });
        return Object.keys(daily)
            .map(day => ({ day, amount: daily[day] }))
            .sort((a, b) => new Date(a.day).getTime() - new Date(b.day).getTime());
    }, [filteredExpenses]);

    const categoryBreakdown = useMemo(() => {
        const cats: Record<string, { amount: number; count: number }> = {};
        filteredExpenses.forEach(exp => {
            if (!cats[exp.category]) cats[exp.category] = { amount: 0, count: 0 };
            cats[exp.category].amount += Number(exp.amount);
            cats[exp.category].count++;
        });
        return Object.entries(cats).sort((a, b) => b[1].amount - a[1].amount);
    }, [filteredExpenses]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newExpense.amount) return;
        try {
            if (editingExpenseId) {
                await updateExpense(editingExpenseId, {
                    amount: parseFloat(newExpense.amount),
                    category: newExpense.category,
                    description: newExpense.description,
                    date: newExpense.date,
                    time: newExpense.time,
                    currency: newExpense.currency
                });
            } else {
                await addExpense({
                    trip_id: trip.id,
                    amount: parseFloat(newExpense.amount),
                    category: newExpense.category,
                    description: newExpense.description,
                    date: newExpense.date,
                    time: newExpense.time,
                    currency: newExpense.currency
                });
            }
            handleCloseModal();
        } catch (err) {
            console.error('Failed to save expense', err);
        }
    };

    const handleEdit = (exp: any) => {
        setEditingExpenseId(exp.id);
        setNewExpense({
            amount: exp.amount.toString(),
            category: exp.category,
            description: exp.description || '',
            date: exp.date,
            time: exp.time || '12:00',
            currency: exp.currency || 'USD'
        });
        setShowModal(true);
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Delete this expense?')) return;
        try {
            await deleteExpense(id);
        } catch (err) {
            console.error('Failed to delete expense', err);
        }
    };

    const handleCloseModal = () => {
        setShowModal(false);
        setEditingExpenseId(null);
        setNewExpense({
            amount: '',
            category: 'Dining',
            description: '',
            date: new Date().toISOString().split('T')[0],
            time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false }),
            currency: 'USD'
        });
    };

    const saveBudget = () => {
        const val = parseFloat(budgetInput);
        if (!isNaN(val) && val > 0) {
            setBudget(budgetInput);
            localStorage.setItem(`budget-${trip.id}`, budgetInput);
        } else {
            setBudget('');
            localStorage.removeItem(`budget-${trip.id}`);
        }
        setEditingBudget(false);
    };

    return (
        <div className="flex flex-col xl:flex-row xl:divide-x xl:divide-gray-100 h-full overflow-y-auto xl:overflow-hidden bg-gray-50/40">
            {/* Column 1: Identity & Filters */}
            <div className="xl:flex-1 flex flex-col xl:h-full bg-white relative z-20 shadow-xl xl:shadow-none">
                <div className="p-4 md:p-6 xl:overflow-y-auto xl:flex-1 no-scrollbar space-y-4 md:space-y-6">
                    {/* Header */}
                    <div className="flex items-center justify-between">
                        <div>
                            <h3 className="text-xl font-black text-slate-900">Wallet</h3>
                            <p className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] mt-1">Adventure Budgeting</p>
                        </div>
                        {!isViewer && (
                            <button
                                onClick={() => setShowModal(true)}
                                className="bg-slate-900 text-white p-3 rounded-xl shadow-xl shadow-slate-200 hover:scale-110 active:scale-95 transition-all group"
                            >
                                <Plus size={18} className="group-hover:rotate-90 transition-transform duration-300" />
                            </button>
                        )}
                    </div>

                    {/* Stats Card - Slimmer */}
                    <div className="relative group" >
                        <div className="absolute inset-0 bg-gradient-to-br from-indigo-500 to-teal-500 rounded-[2rem] blur-xl opacity-10 group-hover:opacity-20 transition-opacity" />
                        <div className="relative p-6 bg-slate-900 rounded-[2rem] text-white overflow-hidden shadow-2xl">
                            <div className="flex justify-between items-start mb-6">
                                <div>
                                    <span className="text-[9px] font-black uppercase tracking-[0.2em] opacity-50">Total Spend</span>
                                    <div className="flex items-baseline gap-1 mt-1">
                                        <span className="text-2xl font-black">${totalSpend.toLocaleString()}</span>
                                        <span className="text-[10px] font-bold text-teal-400">USD</span>
                                    </div>
                                </div>
                                <div className="p-2.5 bg-white/10 rounded-xl backdrop-blur-md">
                                    <Wallet size={16} className="text-teal-400" />
                                </div>
                            </div>

                            {budgetNum > 0 ? (
                                <div className="space-y-3">
                                    <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                                        <div
                                            className={`h-full rounded-full transition-all duration-1000 ease-out custom-pulse ${overBudget ? 'bg-rose-500' : 'bg-teal-400'}`}
                                            style={{ width: `${budgetUsedPct}%` }}
                                        />
                                    </div>
                                    <div className="flex justify-between items-center bg-white/5 px-3 py-2 rounded-xl">
                                        <span className="text-[9px] font-black uppercase tracking-wider opacity-40">Remaining</span>
                                        <span className={`text-[11px] font-black ${overBudget ? 'text-rose-400' : 'text-white'}`}>
                                            ${Math.abs(remaining || 0).toLocaleString()}
                                        </span>
                                    </div>
                                </div>
                            ) : (
                                !isViewer ? (
                                    <button
                                        onClick={() => { setBudgetInput(''); setEditingBudget(true); }}
                                        className="w-full py-3 border-2 border-dashed border-white/10 rounded-xl text-[9px] font-black uppercase tracking-widest text-white/40 hover:text-white hover:border-white/20 hover:bg-white/5 transition-all"
                                    >
                                        + Set Budget
                                    </button>
                                ) : (
                                    <div className="w-full py-3 border border-white/5 rounded-xl text-[9px] font-black uppercase tracking-widest text-white/20 text-center">
                                        No Budget Set
                                    </div>
                                )
                            )}
                        </div>
                    </div>

                    {/* Category Quick Filter */}
                    <div className="space-y-3" >
                        <h4 className="text-[9px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                            <ArrowUpRight size={10} /> Categories
                        </h4>
                        <div className="grid grid-cols-2 gap-2">
                            <button
                                onClick={() => setFilter('categories', [])}
                                className={`px-3 py-2 rounded-xl text-[9px] font-black uppercase tracking-wider transition-all text-center ${filters.categories.length === 0
                                    ? 'bg-slate-900 text-white shadow-sm'
                                    : 'bg-gray-50 text-slate-400 hover:bg-gray-100'
                                    }`}
                            >
                                All Items
                            </button>
                            {Object.keys(CATEGORY_COLORS).map(cat => (
                                <button
                                    key={cat}
                                    onClick={() => {
                                        const newCats = filters.categories.includes(cat)
                                            ? filters.categories.filter(c => c !== cat)
                                            : [...filters.categories, cat];
                                        setFilter('categories', newCats);
                                    }}
                                    className={`px-3 py-2 rounded-xl text-[9px] font-black uppercase tracking-wider transition-all flex items-center gap-2 ${filters.categories.includes(cat)
                                        ? 'bg-slate-900 text-white shadow-lg'
                                        : 'bg-gray-50 text-slate-400 hover:bg-gray-100'
                                        }`}
                                >
                                    <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: CATEGORY_COLORS[cat] }} />
                                    <span className="truncate">{cat}</span>
                                </button>
                            ))}
                        </div>
                    </div>

                    {budgetNum > 0 && (
                        <div className="p-4 bg-gray-50 rounded-2xl border border-gray-100 mt-auto">
                            <div className="flex items-center justify-between mb-1">
                                <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Goal</span>
                                {!isViewer && (
                                    <button onClick={() => { setBudgetInput(budget); setEditingBudget(true); }} className="text-[9px] font-black text-indigo-600 uppercase">Edit</button>
                                )}
                            </div>
                            <p className="text-sm font-black text-slate-900">${budgetNum.toLocaleString()}</p>
                        </div>
                    )}
                </div>
            </div>

            {/* Column 2: Recent Activity */}
            <div className="flex-1 flex flex-col xl:h-full bg-white xl:bg-transparent border-r border-gray-100" >
                <div className="p-4 md:p-8 xl:overflow-y-auto xl:flex-1 no-scrollbar space-y-4 md:space-y-6">
                    <div className="flex justify-between items-end pb-4 border-b border-gray-100/50">
                        <div>
                            <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Transaction Log</h4>
                            <h2 className="text-2xl font-black text-slate-900 mt-1">Recent Activity</h2>
                        </div>
                        <span className="text-[10px] font-black text-indigo-600 bg-indigo-50 px-3 py-1.5 rounded-full uppercase tracking-wider">
                            {filteredExpenses.length} Records
                        </span>
                    </div>

                    {filteredExpenses.length === 0 ? (
                        <div className="py-20 flex flex-col items-center justify-center bg-white rounded-[3rem] border-2 border-dashed border-gray-100">
                            <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mb-4">
                                <TrendingUp size={24} className="text-gray-200" />
                            </div>
                            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Log your first adventure expense</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 gap-3">
                            {filteredExpenses.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).map(exp => (
                                <div
                                    key={exp.id}
                                    onClick={() => !isViewer && handleEdit(exp)}
                                    className={`group flex items-center justify-between p-5 bg-white border border-transparent rounded-[2rem] transition-all ${!isViewer ? 'cursor-pointer hover:border-indigo-100 hover:shadow-2xl hover:-translate-y-1' : ''}`}
                                >
                                    <div className="flex items-center gap-5">
                                        <div
                                            className="w-14 h-14 rounded-2xl flex items-center justify-center transition-transform group-hover:scale-110 shadow-sm"
                                            style={{ backgroundColor: `${CATEGORY_COLORS[exp.category]}10`, color: CATEGORY_COLORS[exp.category] }}
                                        >
                                            {CATEGORY_ICONS[exp.category] || <MoreHorizontal size={20} />}
                                        </div>
                                        <div>
                                            <p className="text-base font-black text-slate-900 leading-tight">{exp.description || exp.category}</p>
                                            <div className="flex items-center gap-3 mt-1.5">
                                                <span className="flex items-center gap-1.5 text-[10px] font-black text-slate-400 uppercase italic">
                                                    <Calendar size={11} className="text-slate-300" />
                                                    {new Date(exp.date).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                                                </span>
                                                <span className="w-1 h-1 rounded-full bg-slate-200" />
                                                <span className="text-[10px] font-black text-indigo-400 uppercase tracking-tighter">
                                                    {exp.category}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-6">
                                        <div className="text-right">
                                            <div className="flex items-start gap-0.5">
                                                <span className="text-xs font-black text-slate-400 mt-1">$</span>
                                                <span className="text-2xl font-black text-slate-900">{Number(exp.amount).toLocaleString(undefined, { minimumFractionDigits: 0 })}</span>
                                            </div>
                                        </div>
                                        {!isViewer && (
                                            <button
                                                onClick={(e) => { e.stopPropagation(); handleDelete(exp.id); }}
                                                className="p-3 text-slate-200 hover:text-rose-500 hover:bg-rose-50 rounded-2xl transition-all"
                                            >
                                                <Trash2 size={18} />
                                            </button>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* Column 3: Stats & Insights */}
            <div className="xl:flex-1 p-4 md:p-8 xl:overflow-y-auto no-scrollbar bg-gray-50/30 space-y-4 md:space-y-6" >
                <div className="flex items-center gap-3 mb-2">
                    <div className="p-2 bg-indigo-600 rounded-lg text-white">
                        <BarChart3 size={14} />
                    </div>
                    <h4 className="text-[10px] font-black text-slate-900 uppercase tracking-[0.2em]">Visual Insights</h4>
                </div>

                {
                    filteredExpenses.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-20 text-center">
                            <div className="w-20 h-20 bg-white rounded-3xl flex items-center justify-center shadow-sm mb-4 border border-gray-100">
                                <PieIcon size={32} className="text-gray-100" />
                            </div>
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Awaiting Data...</p>
                        </div>
                    ) : (
                        <div className="space-y-6">
                            {/* Charts Row */}
                            <div className="grid grid-cols-1 2xl:grid-cols-2 gap-6">
                                {/* Smaller Distribution Chart */}
                                <div className="bg-white p-6 rounded-[2rem] border border-gray-100 shadow-sm relative group overflow-hidden">
                                    <div className="flex justify-between items-center mb-6">
                                        <h4 className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Spending Distribution</h4>
                                        <PieIcon size={14} className="text-indigo-200" />
                                    </div>
                                    <div className="h-48">
                                        <ResponsiveContainer width="100%" height="100%">
                                            <PieChart>
                                                <Pie
                                                    data={pieData}
                                                    innerRadius={50}
                                                    outerRadius={65}
                                                    paddingAngle={10}
                                                    dataKey="value"
                                                    animationDuration={1000}
                                                >
                                                    {pieData.map((entry, i) => (
                                                        <Cell key={i} fill={CATEGORY_COLORS[entry.name]} stroke="none" />
                                                    ))}
                                                </Pie>
                                                <Tooltip
                                                    contentStyle={{ backgroundColor: '#0f172a', border: 'none', borderRadius: '12px', color: '#fff', padding: '8px' }}
                                                    itemStyle={{ color: '#fff', fontSize: '10px', fontWeight: '900' }}
                                                />
                                            </PieChart>
                                        </ResponsiveContainer>
                                    </div>
                                    <div className="grid grid-cols-2 gap-2 mt-4">
                                        {categoryBreakdown.slice(0, 4).map(([cat, info]) => (
                                            <div key={cat} className="flex items-center gap-2 px-2.5 py-2 bg-gray-50 rounded-xl">
                                                <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: CATEGORY_COLORS[cat] }} />
                                                <span className="text-[9px] font-black text-slate-500 truncate">{cat}</span>
                                                <span className="text-[9px] font-black text-slate-900 ml-auto">${info.amount.toFixed(0)}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                {/* Smaller Spending Flow */}
                                <div className="bg-white p-6 rounded-[2rem] border border-gray-100 shadow-sm overflow-hidden flex flex-col">
                                    <h4 className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-4">Cashflow Timeline</h4>
                                    <div className="flex-1 min-h-[160px]">
                                        <ResponsiveContainer width="100%" height="100%">
                                            <AreaChart data={barData}>
                                                <defs>
                                                    <linearGradient id="colorAmountCol" x1="0" y1="0" x2="0" y2="1">
                                                        <stop offset="5%" stopColor="#6366f1" stopOpacity={0.2} />
                                                        <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                                                    </linearGradient>
                                                </defs>
                                                <XAxis dataKey="day" hide />
                                                <YAxis hide />
                                                <Tooltip
                                                    contentStyle={{ backgroundColor: '#0f172a', border: 'none', borderRadius: '12px', color: '#fff', padding: '8px' }}
                                                    itemStyle={{ color: '#fff', fontSize: '10px', fontWeight: '900' }}
                                                />
                                                <Area
                                                    type="step"
                                                    dataKey="amount"
                                                    stroke="#6366f1"
                                                    strokeWidth={3}
                                                    fillOpacity={1}
                                                    fill="url(#colorAmountCol)"
                                                    animationDuration={1500}
                                                />
                                            </AreaChart>
                                        </ResponsiveContainer>
                                    </div>
                                </div>
                            </div>

                            {/* Smaller Stats Boxes */}
                            <div className="space-y-4">
                                <h4 className="text-[9px] font-black text-slate-400 uppercase tracking-widest px-2">Market Breakdown</h4>
                                <div className="grid grid-cols-2 gap-3">
                                    {categoryBreakdown.map(([cat, info]) => (
                                        <div key={cat} className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-all group overflow-hidden">
                                            <div className="flex items-center justify-between mb-2">
                                                <div
                                                    className="w-8 h-8 rounded-lg flex items-center justify-center transition-transform group-hover:rotate-12"
                                                    style={{ backgroundColor: `${CATEGORY_COLORS[cat]}10`, color: CATEGORY_COLORS[cat] }}
                                                >
                                                    {CATEGORY_ICONS[cat]}
                                                </div>
                                                <span className="text-[8px] font-black text-slate-300 uppercase">{info.count} entries</span>
                                            </div>
                                            <h5 className="text-[10px] font-black text-slate-900 truncate mb-0.5">{cat}</h5>
                                            <p className="text-sm font-black text-slate-900">${info.amount.toLocaleString()}</p>
                                            <div className="h-1 bg-gray-50 rounded-full mt-2 overflow-hidden">
                                                <div
                                                    className="h-full rounded-full transition-all duration-1000"
                                                    style={{ width: `${(info.amount / totalSpend) * 100}%`, backgroundColor: CATEGORY_COLORS[cat] }}
                                                />
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )
                }
            </div>

            {/* Budget Editing Inline (Legacy support or simple prompt) */}
            {
                editingBudget && (
                    <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
                        <div className="bg-white rounded-[2.5rem] p-8 w-full max-w-md shadow-2xl border border-gray-100 animate-in zoom-in-95 duration-200">
                            <div className="flex items-center gap-4 mb-6">
                                <div className="p-4 bg-amber-50 rounded-2xl text-amber-500">
                                    <Target size={24} />
                                </div>
                                <div>
                                    <h4 className="text-xl font-black text-slate-900">Define Budget</h4>
                                    <p className="text-xs font-bold text-slate-400">What is your total target spend?</p>
                                </div>
                            </div>
                            <div className="relative mb-6">
                                <div className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400">
                                    <DollarSign size={20} />
                                </div>
                                <input
                                    type="number"
                                    autoFocus
                                    placeholder="0.00"
                                    value={budgetInput}
                                    onChange={e => setBudgetInput(e.target.value)}
                                    onKeyDown={e => e.key === 'Enter' && saveBudget()}
                                    className="w-full bg-gray-50 rounded-2xl py-6 pl-14 pr-6 text-2xl font-black text-slate-900 border-none focus:ring-2 focus:ring-amber-500/20 transition-all outline-none"
                                />
                            </div>
                            <div className="flex gap-3">
                                <button
                                    onClick={() => setEditingBudget(false)}
                                    className="flex-1 py-4 bg-gray-100 text-slate-500 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-gray-200 transition-all"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={saveBudget}
                                    className="flex-1 py-4 bg-amber-500 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-xl shadow-amber-100 hover:scale-105 active:scale-95 transition-all"
                                >
                                    Set Target
                                </button>
                            </div>
                        </div>
                    </div>
                )
            }

            {/* Main Add/Edit Expense Modal */}
            {
                showModal && (
                    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md flex items-center justify-center z-[150] p-4 overflow-y-auto">
                        <div className="bg-white rounded-[3rem] p-4 w-full max-w-xl shadow-[0_0_100px_rgba(0,0,0,0.2)] border border-gray-100 animate-in slide-in-from-bottom-8 duration-300">
                            <form onSubmit={handleSubmit} className="p-8">
                                <div className="flex justify-between items-start mb-8">
                                    <div className="flex items-center gap-4">
                                        <div className="p-4 bg-teal-50 rounded-[1.5rem] text-teal-600 shadow-inner">
                                            <Wallet size={28} />
                                        </div>
                                        <div>
                                            <h3 className="text-2xl font-black text-slate-900">{editingExpenseId ? 'Edit Entry' : 'Log Expense'}</h3>
                                            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Transaction Details</p>
                                        </div>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={handleCloseModal}
                                        className="p-3 bg-gray-50 text-slate-300 hover:text-rose-500 hover:bg-rose-50 rounded-2xl transition-all"
                                    >
                                        <X size={20} />
                                    </button>
                                </div>

                                <div className="space-y-6">
                                    {/* Amount & Currency */}
                                    <div className="grid grid-cols-3 gap-4">
                                        <div className="col-span-2 space-y-2">
                                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Amount</label>
                                            <div className="relative">
                                                <div className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400">
                                                    <DollarSign size={20} />
                                                </div>
                                                <input
                                                    type="number" step="0.01" required placeholder="0.00"
                                                    value={newExpense.amount}
                                                    onChange={e => setNewExpense({ ...newExpense, amount: e.target.value })}
                                                    className="w-full bg-gray-50 rounded-[1.5rem] py-5 pl-14 pr-6 text-2xl font-black text-slate-900 border-none focus:ring-2 focus:ring-teal-500/20 transition-all outline-none"
                                                />
                                            </div>
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Currency</label>
                                            <select
                                                value={newExpense.currency}
                                                onChange={e => setNewExpense({ ...newExpense, currency: e.target.value })}
                                                className="w-full bg-gray-50 rounded-[1.5rem] py-6 px-6 text-sm font-black text-slate-900 border-none focus:ring-2 focus:ring-teal-500/20 transition-all outline-none appearance-none"
                                            >
                                                <option value="USD">USD ($)</option>
                                                <option value="EUR">EUR (€)</option>
                                                <option value="GBP">GBP (£)</option>
                                                <option value="JPY">JPY (¥)</option>
                                                <option value="ILS">ILS (₪)</option>
                                            </select>
                                        </div>
                                    </div>

                                    {/* Category Selection */}
                                    <div className="space-y-3">
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Category</label>
                                        <div className="grid grid-cols-4 gap-2">
                                            {Object.keys(CATEGORY_COLORS).map(cat => (
                                                <button
                                                    key={cat}
                                                    type="button"
                                                    onClick={() => setNewExpense({ ...newExpense, category: cat as any })}
                                                    className={`flex flex-col items-center justify-center p-3 rounded-2xl transition-all gap-2 border-2 ${newExpense.category === cat
                                                        ? 'bg-slate-900 border-slate-900 text-white'
                                                        : 'bg-white border-gray-100 text-slate-400 hover:border-teal-100 hover:bg-teal-50/20'
                                                        }`}
                                                >
                                                    <div className={`${newExpense.category === cat ? 'text-white' : ''}`} style={{ color: newExpense.category === cat ? '#fff' : CATEGORY_COLORS[cat] }}>
                                                        {CATEGORY_ICONS[cat]}
                                                    </div>
                                                    <span className="text-[9px] font-black uppercase tracking-tighter truncate w-full text-center">{cat}</span>
                                                </button>
                                            ))}
                                        </div>
                                    </div>

                                    {/* Date & Time */}
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Date</label>
                                            <div className="relative">
                                                <div className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400">
                                                    <Calendar size={18} />
                                                </div>
                                                <input
                                                    type="date"
                                                    required
                                                    value={newExpense.date}
                                                    onChange={e => setNewExpense({ ...newExpense, date: e.target.value })}
                                                    className="w-full bg-gray-50 rounded-2xl py-4 pl-14 pr-6 text-sm font-black text-slate-900 border-none focus:ring-2 focus:ring-teal-500/20 transition-all outline-none"
                                                />
                                            </div>
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Time</label>
                                            <div className="relative">
                                                <div className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400">
                                                    <Clock size={18} />
                                                </div>
                                                <input
                                                    type="time"
                                                    value={newExpense.time}
                                                    onChange={e => setNewExpense({ ...newExpense, time: e.target.value })}
                                                    className="w-full bg-gray-50 rounded-2xl py-4 pl-14 pr-6 text-sm font-black text-slate-900 border-none focus:ring-2 focus:ring-teal-500/20 transition-all outline-none"
                                                />
                                            </div>
                                        </div>
                                    </div>

                                    {/* Description */}
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Description / Notes</label>
                                        <textarea
                                            placeholder="What was this for?"
                                            rows={2}
                                            value={newExpense.description}
                                            onChange={e => setNewExpense({ ...newExpense, description: e.target.value })}
                                            className="w-full bg-gray-50 rounded-2xl py-4 px-6 text-sm font-black text-slate-700 border-none focus:ring-2 focus:ring-teal-500/20 transition-all outline-none resize-none"
                                        />
                                    </div>
                                </div>

                                <div className="flex gap-4 mt-10">
                                    <button
                                        type="button"
                                        onClick={handleCloseModal}
                                        className="flex-1 py-5 bg-gray-100 text-slate-500 rounded-[1.5rem] text-[10px] font-black uppercase tracking-widest hover:bg-gray-200 transition-all active:scale-95"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        className="flex-1 py-5 bg-slate-900 text-white rounded-[1.5rem] text-[10px] font-black uppercase tracking-widest shadow-2xl shadow-slate-200 hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-2"
                                    >
                                        <Check size={18} className="text-teal-400" />
                                        {editingExpenseId ? 'Update Entry' : 'Log Transaction'}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                )
            }

            <style>{`
                .no-scrollbar::-webkit-scrollbar { display: none; }
                .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
                
                @keyframes custom-pulse {
                    0% { opacity: 1; }
                    50% { opacity: 0.8; }
                    100% { opacity: 1; }
                }
                .custom-pulse {
                    animation: custom-pulse 3s infinite ease-in-out;
                }
            `}</style>
        </div>
    );
};

export default ExpenseTracker;
