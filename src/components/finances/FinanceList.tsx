import React from 'react';
import { FinanceEntry, useFinanceStore } from '@/store/financeStore';
import { motion } from 'framer-motion';
import { Trash2, Edit3, FileText, Download, Tag, ChevronUp, ChevronDown } from 'lucide-react';
import { getIconByName } from './financeIcons';

interface Props {
    search: string;
    onEdit: (entry: FinanceEntry) => void;
    month: number | 'all';
    year: number | 'all';
    paymentFilter: string;
    categoryFilter?: string;
    fromDate?: string;
    toDate?: string;
    fontSize?: number;
}

import { getColorForName } from '@/utils/financeColors';

export const FinanceList: React.FC<Props> = ({ search, onEdit, month, year, paymentFilter, categoryFilter, fromDate, toDate, fontSize = 11 }) => {
    const { entries, loading, deleteEntry, exportToCSV, categories } = useFinanceStore();
    const [sortConfig, setSortConfig] = React.useState<{ key: string, direction: 'asc' | 'desc' } | null>(null);

    const handleSort = (key: string) => {
        let direction: 'asc' | 'desc' = 'asc';
        if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') {
            direction = 'desc';
        }
        setSortConfig({ key, direction });
    };

    const filteredEntries = React.useMemo(() => {
        const filtered = entries.filter(e => {
            const dateObj = new Date(e.date);
            const matchesSearch = e.store_name?.toLowerCase().includes(search.toLowerCase()) ||
                e.category?.name.toLowerCase().includes(search.toLowerCase()) ||
                (e.title && e.title.toLowerCase().includes(search.toLowerCase()));
            
            let matchesDate = true;
            if (fromDate && toDate) {
                matchesDate = e.date >= fromDate && e.date <= toDate;
            } else {
                const matchesMonth = month === 'all' || dateObj.getUTCMonth() === month;
                const matchesYear = year === 'all' || dateObj.getUTCFullYear() === year;
                matchesDate = matchesMonth && matchesYear;
            }

            const matchesPayment = !paymentFilter || e.payment_method?.toLowerCase().includes(paymentFilter.toLowerCase());
            const catName = e.category?.name.toLowerCase() || '';
            const parentName = e.category?.parent_id ? categories.find(c => c.id === e.category?.parent_id)?.name.toLowerCase() || '' : '';
            const matchesCategory = !categoryFilter || catName.includes(categoryFilter.toLowerCase()) || parentName.includes(categoryFilter.toLowerCase());
            return matchesSearch && matchesDate && matchesPayment && matchesCategory;
        });

        if (sortConfig) {
            filtered.sort((a, b) => {
                let aValue: any = a[sortConfig.key as keyof FinanceEntry];
                let bValue: any = b[sortConfig.key as keyof FinanceEntry];

                if (sortConfig.key === 'category') {
                    const aParent = a.category?.parent_id ? categories.find(c => c.id === a.category?.parent_id) : a.category;
                    const bParent = b.category?.parent_id ? categories.find(c => c.id === b.category?.parent_id) : b.category;
                    aValue = aParent?.name?.toLowerCase() || '';
                    bValue = bParent?.name?.toLowerCase() || '';
                } else if (sortConfig.key === 'subcategory') {
                    aValue = a.category?.parent_id ? a.category.name.toLowerCase() : '';
                    bValue = b.category?.parent_id ? b.category.name.toLowerCase() : '';
                } else if (sortConfig.key === 'amount') {
                    aValue = Number(aValue);
                    bValue = Number(bValue);
                } else if (sortConfig.key === 'date') {
                    aValue = new Date(aValue).getTime();
                    bValue = new Date(bValue).getTime();
                } else {
                    aValue = String(aValue || '').toLowerCase();
                    bValue = String(bValue || '').toLowerCase();
                }

                if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
                if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
                return 0;
            });
        } else {
            filtered.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
        }
        return filtered;
    }, [entries, search, month, year, paymentFilter, categoryFilter, fromDate, toDate, categories, sortConfig]);


    if (loading && entries.length === 0) {
        return <div className="py-20 text-center text-slate-400 font-bold uppercase tracking-widest animate-pulse">Synchronizing...</div>;
    }

    return (
        <div className="flex flex-col w-full">
            <div className="flex items-center justify-between mb-8 px-4">
                <div className="flex items-center gap-4">
                    <h2 className="text-[10px] font-black text-indigo-950/60 uppercase tracking-[0.2em]">Transaction Ledger</h2>
                </div>
                <button 
                    onClick={exportToCSV}
                    className="flex items-center gap-2 px-3 py-1.5 bg-white dark:bg-slate-800 rounded-xl text-[9px] font-black uppercase tracking-widest text-indigo-600 border border-indigo-50 shadow-sm hover:shadow-md transition-all active:scale-95"
                >
                    <Download size={12} />
                    Export
                </button>
            </div>

            <div className="bg-white/40 dark:bg-slate-900/40 backdrop-blur-3xl rounded-[30px] border border-white/50 shadow-xl shadow-indigo-100/10 overflow-hidden">
                <table className="w-full text-left border-collapse table-fixed">
                    <thead>
                        <tr className="border-b border-gray-50/50">
                            {[
                                { key: 'title', label: 'Item Title', width: 'w-[20%]', align: 'text-left' },
                                { key: 'category', label: 'Category', width: 'w-[12%]', align: 'text-left' },
                                { key: 'subcategory', label: 'Sub.', width: 'w-[12%]', align: 'text-left' },
                                { key: 'store_name', label: 'Merchant', width: 'w-[12%]', align: 'text-left' },
                                { key: 'payment_method', label: 'Payment', width: 'w-[12%]', align: 'text-left' },
                                { key: 'date', label: 'Date', width: 'w-[10%]', align: 'text-left' },
                                { key: 'amount', label: 'Amount', width: 'w-[10%]', align: 'text-right' },
                            ].map((col) => (
                                <th 
                                    key={col.key}
                                    onClick={() => handleSort(col.key)}
                                    className={`${col.width} px-3 py-4 text-[9px] font-black uppercase tracking-widest text-slate-400 cursor-pointer hover:text-indigo-600 transition-colors ${col.align}`}
                                >
                                    <div className={`flex items-center gap-1 ${col.align === 'text-right' ? 'justify-end' : ''}`}>
                                        {col.label}
                                        {sortConfig?.key === col.key && (
                                            sortConfig.direction === 'asc' ? <ChevronUp size={10} /> : <ChevronDown size={10} />
                                        )}
                                    </div>
                                </th>
                            ))}
                            <th className="w-[6%] px-3 py-4 text-[9px] font-black uppercase tracking-widest text-slate-400 text-center">Note</th>
                            <th className="w-[6%] px-3 py-4 text-[9px] font-black uppercase tracking-widest text-slate-400 text-right pr-6">Op</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50/50">
                        {filteredEntries.map((entry, idx) => {
                            const isSub = !!entry.category?.parent_id;
                            const mainCategory = isSub ? categories.find(c => c.id === entry.category?.parent_id) : entry.category;
                            const subCategory = isSub ? entry.category : null;

                            const Icon = getIconByName(mainCategory?.icon || 'Tag');
                            const SubIcon = subCategory ? getIconByName(subCategory.icon || 'Hash') : null;
                            const bgColor = getColorForName(mainCategory?.name);
                            const subBgColor = subCategory ? getColorForName(subCategory.name) : 'transparent';

                            return (
                                <motion.tr 
                                    key={entry.id}
                                    initial={{ opacity: 0, y: 5 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: idx * 0.01 }}
                                    className="group hover:bg-white/60 dark:hover:bg-slate-800/60 transition-colors"
                                    style={{ fontSize: `${fontSize}px` }}
                                >
                                    {/* Item Title */}
                                    <td className="px-4 py-3">
                                        <div className="flex items-center gap-2">
                                            <Tag size={12} className="text-slate-200 shrink-0" />
                                            <span className="font-bold text-indigo-950 dark:text-slate-100 truncate" title={entry.title || ''}>
                                                {entry.title || 'Untitled'}
                                            </span>
                                        </div>
                                    </td>

                                    {/* Category */}
                                    <td className="px-3 py-3">
                                        <div className="flex items-center gap-2">
                                            <div className="w-7 h-7 rounded-xl flex items-center justify-center text-slate-900 shadow-sm shrink-0 border border-black/5" style={{ backgroundColor: bgColor }}>
                                                <Icon size={12} />
                                            </div>
                                            <span className="text-[9px] font-black text-slate-900 uppercase truncate">
                                                {mainCategory?.name || 'Misc'}
                                            </span>
                                        </div>
                                    </td>

                                    {/* Subcategory */}
                                    <td className="px-3 py-3 text-center">
                                        {subCategory ? (
                                            <div className="flex items-center gap-2">
                                                 <div className="w-6 h-6 rounded-lg flex items-center justify-center text-slate-900 shadow-sm shrink-0 border border-black/5" style={{ backgroundColor: subBgColor }}>
                                                    {SubIcon && <SubIcon size={10} />}
                                                </div>
                                                <span className="text-[8px] font-black text-slate-500 uppercase truncate">
                                                    {subCategory.name}
                                                </span>
                                            </div>
                                        ) : (
                                            <span className="text-slate-100">-</span>
                                        )}
                                    </td>

                                    {/* Merchant */}
                                    <td className="px-3 py-3">
                                        <span className="font-bold text-slate-600 dark:text-slate-300 truncate block">{entry.store_name}</span>
                                    </td>

                                    {/* Payment */}
                                    <td className="px-3 py-3">
                                        {(() => {
                                            const method = entry.payment_method || 'Cash';
                                            const shades = [
                                                'bg-[#D1FAE5] text-emerald-900 border-[#A7F3D0]', // emerald-100
                                                'bg-[#DCFCE7] text-green-900 border-[#BBF7D0]',  // green-100
                                                'bg-[#F0FDF4] text-green-800 border-[#DCFCE7]',  // green-50
                                                'bg-[#ECFCCB] text-lime-900 border-[#D9F99D]',   // lime-100
                                                'bg-[#CCFBF1] text-teal-900 border-[#99F6E4]'    // teal-100
                                            ];
                                            const hash = method.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
                                            const shade = shades[hash % shades.length];
                                            return (
                                                <span className={`${shade} px-3 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-tight truncate block text-center border shadow-sm`}>
                                                    {method}
                                                </span>
                                            );
                                        })()}
                                    </td>

                                    {/* Date */}
                                    <td className="px-3 py-3">
                                        <span className="text-[9px] font-black text-slate-900 dark:text-slate-100 uppercase whitespace-nowrap">
                                            {new Date(entry.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                                        </span>
                                    </td>

                                    {/* Amount */}
                                    <td className="px-3 py-3 text-right">
                                        <span className={`font-black ${entry.is_income ? 'text-emerald-500' : 'text-indigo-950 dark:text-white'}`}>
                                            {entry.is_income ? '+' : '-'}${Number(entry.amount).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                        </span>
                                    </td>

                                    {/* Notes */}
                                    <td className="px-3 py-3 overflow-hidden">
                                            {entry.notes ? <FileText size={10} className="text-slate-200" /> : <span className="text-slate-100">-</span>}
                                    </td>

                                    {/* Actions */}
                                    <td className="px-3 py-3 text-right pr-6">
                                        <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-all">
                                            <button onClick={() => onEdit(entry)} className="p-2 text-indigo-300 hover:text-indigo-600"><Edit3 size={12} /></button>
                                            <button onClick={() => deleteEntry(entry.id)} className="p-2 text-rose-200 hover:text-rose-500"><Trash2 size={12} /></button>
                                        </div>
                                    </td>
                                </motion.tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>
        </div>
    );
};
