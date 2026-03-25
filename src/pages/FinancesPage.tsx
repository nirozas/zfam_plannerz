import React, { useState, useEffect, useMemo } from 'react';
import { FinanceHeader } from '@/components/finances/FinanceHeader';
import { FinanceList } from '@/components/finances/FinanceList';
import { FinanceAnalysis } from '@/components/finances/FinanceAnalysis';
import { QuickAddExpense as ExpenseModal } from '@/components/finances/QuickAddExpense';
import { AutocompleteSearch } from '@/components/finances/AutocompleteSearch';
import { PlansModal } from '@/components/finances/PlansModal';
import { FinanceEntry, useFinanceStore } from '@/store/financeStore';
import { Plus, LayoutGrid, Wallet, Download, Store, CreditCard, ArrowRight, Target, Tag } from 'lucide-react';
import { motion } from 'framer-motion';

const MONTHS = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
];

const PASTEL_GRADIENT = "bg-gradient-to-br from-[#FFADAD]/10 via-[#9BF6FF]/10 to-[#BDB2FF]/10";

const FinancesPage: React.FC = () => {
    const { entries, fetchEntries, fetchCategories, fetchBudgets, exportToCSV, categories } = useFinanceStore();
    const [isAddOpen, setIsAddOpen] = useState(false);
    const [isPlansOpen, setIsPlansOpen] = useState(false);
    const [editEntry, setEditEntry] = useState<FinanceEntry | undefined>(undefined);
    const [search, setSearch] = useState('');
    const [paymentFilter, setPaymentFilter] = useState('');
    const [categoryFilter, setCategoryFilter] = useState('');
    
    const [selectedMonth, setSelectedMonth] = useState<number>(new Date().getMonth());
    const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());
    const [fromDate, setFromDate] = useState('');
    const [toDate, setToDate] = useState('');
    const [isCustomRange, setIsCustomRange] = useState(false);
    const [fontSize, setFontSize] = useState(11); // Default font size

    useEffect(() => {
        fetchEntries();
        fetchCategories();
        fetchBudgets();
    }, [fetchEntries, fetchCategories, fetchBudgets]);

    const years = useMemo(() => {
        const currentYear = new Date().getFullYear();
        return Array.from({ length: 5 }, (_, i) => currentYear - i);
    }, []);

    const merchantOptions = useMemo(() => {
        const set = new Set(entries.map(e => e.store_name));
        return Array.from(set).sort();
    }, [entries]);

    const paymentOptions = useMemo(() => {
        const set = new Set(entries.map(e => e.payment_method || 'Cash'));
        return Array.from(set).sort();
    }, [entries]);

    const categoryOptions = useMemo(() => {
        return categories.map(c => c.name).sort();
    }, [categories]);

    return (
        <div className={`flex-1 min-h-screen ${PASTEL_GRADIENT} dark:bg-slate-950 overflow-y-auto custom-scrollbar`}>
            <div className="max-w-[1800px] mx-auto px-6 py-8 md:px-10 lg:px-16">
                
                <div className="flex items-center justify-between mb-6 opacity-60 font-black uppercase text-[10px] tracking-widest text-[#A0C4FF]">
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-xl bg-white flex items-center justify-center shadow-lg shadow-indigo-100/50">
                           <Wallet size={14} className="text-indigo-400" />
                        </div>
                        <span className="text-gray-900 dark:text-white">Zoabi Vault Vault</span>
                    </div>
                    <button 
                        onClick={exportToCSV}
                        className="flex items-center gap-2 hover:text-indigo-600 transition-colors"
                    >
                        <Download size={14} />
                        Export .CSV
                    </button>
                </div>

                <div className="flex flex-col md:flex-row md:items-end justify-between gap-8 mb-6">
                    <div className="flex flex-col">
                        <motion.h1 
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="text-5xl md:text-7xl font-black text-indigo-950 dark:text-white tracking-tighter"
                        >
                            Spending & <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#A0C4FF] to-[#BDB2FF]">Analytics</span>
                        </motion.h1>
                        <p className="text-xs font-black text-slate-400 dark:text-slate-500 max-w-md mt-4 uppercase tracking-[0.2em] opacity-80 leading-relaxed">
                           Personalized. Fast. Colorful. <br/> Your finances in high definition.
                        </p>
                    </div>

                    <div className="flex items-center gap-4">
                        <motion.button
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                            onClick={() => setIsPlansOpen(true)}
                            className="bg-white dark:bg-slate-900 text-indigo-950 px-8 h-16 rounded-[40px] flex items-center justify-center gap-3 font-black text-xs uppercase tracking-widest shadow-2xl shadow-indigo-100/20 hover:shadow-indigo-200/40 transition-all border border-indigo-50"
                        >
                            <Target size={20} className="text-indigo-400" />
                            Set Plans
                        </motion.button>

                        <motion.button
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                            onClick={() => setIsAddOpen(true)}
                            className="bg-indigo-950 text-white px-10 h-16 rounded-[40px] flex items-center justify-center gap-4 font-black text-xs uppercase tracking-widest shadow-2xl shadow-indigo-200/50 hover:shadow-indigo-300/40 transition-all active:scale-95"
                        >
                            <Plus size={24} className="text-[#A0C4FF]" />
                            Add Record
                        </motion.button>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
                    {/* Left Column - Expenses & Strategic Feed */}
                    <div className="lg:col-span-8 flex flex-col">
                        <FinanceHeader />

                        <div className="mb-6 space-y-3">
                            {/* Search & Method Row */}
                            <div className="flex flex-col md:flex-row items-center gap-3">
                                <AutocompleteSearch
                                    value={search}
                                    onChange={setSearch}
                                    options={merchantOptions}
                                    placeholder="Search Merchant..."
                                    icon={Store}
                                />
                                <AutocompleteSearch
                                    value={paymentFilter}
                                    onChange={setPaymentFilter}
                                    options={paymentOptions}
                                    placeholder="Select Method..."
                                    icon={CreditCard}
                                />
                                <AutocompleteSearch
                                    value={categoryFilter}
                                    onChange={setCategoryFilter}
                                    options={categoryOptions}
                                    placeholder="Filter Category..."
                                    icon={Tag}
                                />
                            </div>

                            {/* Controls Row: Feed + Scale */}
                            <div className="flex flex-col xl:flex-row items-center gap-3">
                                <div className="flex-1 flex items-center justify-between gap-4 p-3 pr-4 bg-white/40 dark:bg-slate-800/20 backdrop-blur-2xl rounded-3xl border border-white/50 shadow-sm w-full">
                                    <div className="flex items-center gap-3 ml-2">
                                        <div className="w-8 h-8 rounded-xl bg-[#9BF6FF]/20 flex items-center justify-center">
                                            <LayoutGrid size={16} className="text-[#9BF6FF]" />
                                        </div>
                                        <h2 className="text-[10px] font-black text-indigo-950/60 dark:text-slate-100 uppercase tracking-widest">Feed</h2>
                                    </div>

                                    <div className="flex items-center gap-2">
                                        <button 
                                            onClick={() => setIsCustomRange(!isCustomRange)}
                                            className={`h-9 px-4 rounded-xl text-[8px] font-black uppercase tracking-widest transition-all border ${isCustomRange ? 'bg-indigo-50 border-indigo-200 text-indigo-600' : 'bg-white border-transparent text-slate-400'}`}
                                        >
                                            Range Filter
                                        </button>

                                        {!isCustomRange ? (
                                            <div className="flex bg-white/60 p-0.5 rounded-xl border border-gray-50">
                                                <select 
                                                    value={selectedMonth}
                                                    onChange={(e) => setSelectedMonth(Number(e.target.value))}
                                                    className="h-8 pl-4 pr-6 bg-transparent text-[8px] font-black uppercase tracking-widest outline-none appearance-none cursor-pointer text-indigo-950/60"
                                                >
                                                    {MONTHS.map((m, i) => <option key={m} value={i}>{m}</option>)}
                                                </select>
                                                <select 
                                                    value={selectedYear}
                                                    onChange={(e) => setSelectedYear(Number(e.target.value))}
                                                    className="h-8 pl-2 pr-8 bg-transparent text-[8px] font-black uppercase tracking-widest outline-none appearance-none cursor-pointer text-indigo-950/60"
                                                >
                                                    {years.map(y => <option key={y} value={y}>{y}</option>)}
                                                </select>
                                            </div>
                                        ) : (
                                            <div className="flex items-center gap-2 bg-white/60 p-1 rounded-xl border border-gray-50">
                                                <input 
                                                    type="date"
                                                    value={fromDate}
                                                    onChange={(e) => setFromDate(e.target.value)}
                                                    className="h-7 px-3 bg-transparent text-[8px] font-black outline-none text-indigo-950"
                                                />
                                                <ArrowRight size={10} className="text-[#A0C4FF]" />
                                                <input 
                                                    type="date"
                                                    value={toDate}
                                                    onChange={(e) => setToDate(e.target.value)}
                                                    className="h-7 px-3 bg-transparent text-[8px] font-black outline-none text-indigo-950"
                                                />
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* Font Scale (Now in row) */}
                                <div className="flex items-center gap-4 px-6 py-3 bg-white/40 dark:bg-slate-800/20 backdrop-blur-2xl rounded-3xl border border-white/50 w-full xl:w-fit shrink-0">
                                    <span className="text-[8px] font-black uppercase text-indigo-400 tracking-widest">Scale</span>
                                    <input 
                                        type="range" 
                                        min="8" 
                                        max="16" 
                                        step="1"
                                        value={fontSize}
                                        onChange={(e) => setFontSize(Number(e.target.value))}
                                        className="w-24 h-1 bg-indigo-100 rounded-full appearance-none cursor-pointer accent-indigo-600"
                                    />
                                    <span className="text-[9px] font-black text-indigo-950 dark:text-slate-100">{fontSize}px</span>
                                </div>
                            </div>
                        </div>

                        <div className="mb-24">
                            <FinanceList 
                                search={search} 
                                month={isCustomRange ? 'all' : selectedMonth}
                                year={isCustomRange ? 'all' : selectedYear}
                                fromDate={isCustomRange ? fromDate : undefined}
                                toDate={isCustomRange ? toDate : undefined}
                                paymentFilter={paymentFilter}
                                categoryFilter={categoryFilter}
                                fontSize={fontSize}
                                onEdit={(entry) => {
                                    setEditEntry(entry);
                                    setIsAddOpen(true);
                                }}
                            />
                        </div>
                    </div>

                    {/* Right Column - Analysis & Strategy */}
                    <div className="lg:col-span-4 lg:block">
                        <FinanceAnalysis 
                             fromDate={isCustomRange ? fromDate : undefined}
                             toDate={isCustomRange ? toDate : undefined}
                             month={!isCustomRange ? selectedMonth : 'all'}
                             year={!isCustomRange ? selectedYear : 'all'}
                             categoryFilter={categoryFilter}
                        />
                    </div>
                </div>
            </div>

            <ExpenseModal 
                isOpen={isAddOpen} 
                onClose={() => { setIsAddOpen(false); setEditEntry(undefined); }} 
                editEntry={editEntry}
            />

            <PlansModal
                isOpen={isPlansOpen}
                onClose={() => setIsPlansOpen(false)}
                month={Number(selectedMonth)}
                year={Number(selectedYear)}
            />
            
            <div className="fixed top-0 right-0 -mr-48 -mt-48 w-[600px] h-[600px] bg-[#9BF6FF]/10 rounded-full blur-[200px] pointer-events-none" />
            <div className="fixed bottom-0 left-0 -ml-48 -mb-48 w-[600px] h-[600px] bg-[#BDB2FF]/10 rounded-full blur-[200px] pointer-events-none" />
        </div>
    );
};

export default FinancesPage;
