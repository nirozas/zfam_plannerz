import React from 'react';
import { useFinanceStore } from '@/store/financeStore';
import { Wallet } from 'lucide-react';
import { motion } from 'framer-motion';

export const FinanceHeader: React.FC = () => {
    const { entries } = useFinanceStore();

    // Calculate monthly spend
    const currentMonth = new Date().getMonth();
    const currentYear = new Date().getFullYear();
    
    const monthlyTotal = entries
        .filter(e => {
            const date = new Date(e.date);
            const isSaving = e.category?.name.toLowerCase().includes('saving');
            return date.getMonth() === currentMonth && 
                   date.getFullYear() === currentYear && 
                   !e.is_income && 
                   !isSaving;
        })
        .reduce((sum, e) => sum + Number(e.amount), 0);

    return (
        <div className="mb-8 overflow-hidden rounded-3xl relative">
            <div className="absolute inset-0 bg-gradient-to-br from-indigo-600 via-indigo-700 to-indigo-900" />
            
            {/* Abstract Background Shapes */}
            <div className="absolute top-0 right-0 -mr-12 -mt-12 bg-white/10 w-48 h-48 rounded-full blur-3xl" />
            <div className="absolute bottom-0 left-0 -ml-8 -mb-8 bg-black/10 w-32 h-32 rounded-full blur-2xl" />

            <div className="relative p-8 md:p-10 flex flex-col md:flex-row items-center justify-between text-white z-10">
                <div className="flex flex-col gap-1 items-center md:items-start mb-6 md:mb-0">
                    <span className="text-white/70 text-sm font-bold tracking-widest uppercase">Total Spent This Month</span>
                    <motion.h1 
                        key={monthlyTotal}
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="text-5xl md:text-6xl font-black tracking-tight"
                    >
                        ${monthlyTotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </motion.h1>
                </div>
                
                <div className="flex bg-white/20 backdrop-blur-xl rounded-2xl p-4 gap-4 items-center">
                    <div className="w-12 h-12 rounded-xl bg-white/10 flex items-center justify-center">
                        <Wallet className="w-6 h-6 text-white" />
                    </div>
                    <div className="flex flex-col">
                        <span className="text-[10px] text-white/60 font-black uppercase">Savings Plan</span>
                        <span className="text-sm font-bold">On Track</span>
                    </div>
                </div>
            </div>
        </div>
    );
};
