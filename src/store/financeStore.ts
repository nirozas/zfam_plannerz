import { create } from 'zustand';
import { supabase } from '@/supabase/client';
import { usePlannerStore } from './plannerStore';

export interface FinanceCategory {
    id: string;
    user_id: string | null;
    name: string;
    parent_id: string | null;
    icon: string;
    created_at: string;
}

export interface FinanceEntry {
    id: string;
    user_id: string;
    title: string | null;
    store_name: string;
    amount: number;
    date: string;
    category_id: string | null;
    notes: string;
    payment_method: string;
    category?: FinanceCategory;
    is_income: boolean;
    created_at: string;
}

export interface FinancePaymentMethod {
    id: string;
    user_id: string;
    name: string;
    created_at: string;
}

export interface FinanceBudget {
    id: string;
    user_id: string;
    type: 'spending' | 'saving';
    amount: number;
    category_id?: string;
    month: number;
    year: number;
}

interface FinanceStore {
    entries: FinanceEntry[];
    categories: FinanceCategory[];
    budgets: FinanceBudget[];
    paymentMethods: FinancePaymentMethod[];
    loading: boolean;
    error: string | null;

    fetchEntries: () => Promise<void>;
    fetchCategories: () => Promise<void>;
    addEntry: (entry: Omit<FinanceEntry, 'id' | 'user_id' | 'created_at'>) => Promise<void>;
    updateEntry: (id: string, updates: Partial<FinanceEntry>) => Promise<void>;
    deleteEntry: (id: string) => Promise<void>;
    addCategory: (category: Omit<FinanceCategory, 'id' | 'user_id' | 'created_at'>) => Promise<string | undefined>;
    updateCategory: (id: string, updates: Partial<FinanceCategory>) => Promise<void>;
    deleteCategory: (id: string) => Promise<{ success: boolean; error?: string }>;
    fetchBudgets: () => Promise<void>;
    setBudget: (budget: Omit<FinanceBudget, 'id' | 'user_id'>) => Promise<void>;
    exportToCSV: () => void;
    fetchPaymentMethods: () => Promise<void>;
    addPaymentMethod: (name: string) => Promise<void>;
    updatePaymentMethodString: (oldName: string, newName: string) => Promise<void>;
    deletePaymentMethod: (id: string) => Promise<void>;
}

export const useFinanceStore = create<FinanceStore>((set, get) => ({
    entries: [],
    categories: [],
    budgets: [],
    paymentMethods: [],
    loading: false,
    error: null,

    fetchEntries: async () => {
        const user = usePlannerStore.getState().user;
        if (!user) return;

        set({ loading: true });
        try {
            const { data, error } = await supabase
                .from('finances')
                .select(`
                    *,
                    category:finance_categories(*)
                `)
                .eq('user_id', user.id)
                .order('date', { ascending: false });

            if (error) throw error;
            set({ entries: data || [], loading: false });
        } catch (error: any) {
            set({ error: error.message, loading: false });
        }
    },

    fetchCategories: async () => {
        const user = usePlannerStore.getState().user;
        // Fetch global (user_id IS NULL) and user-specific categories
        try {
            const { data, error } = await supabase
                .from('finance_categories')
                .select('*')
                .or(`user_id.is.null,user_id.eq.${user?.id}`)
                .order('name');

            if (error) throw error;
            
            // Deduplicate categories by name and parent_id
            const unique = (data || []).reduce((acc: any[], current) => {
                const x = acc.find(item => item.name === current.name && item.parent_id === current.parent_id);
                if (!x) return acc.concat([current]);
                else return acc;
            }, []);

            set({ categories: unique });
        } catch (error: any) {
            set({ error: error.message });
        }
    },

    addEntry: async (entry) => {
        const user = usePlannerStore.getState().user;
        if (!user) return;

        try {
            const { data, error } = await supabase
                .from('finances')
                .insert([{ ...entry, user_id: user.id }])
                .select(`
                    *,
                    category:finance_categories(*)
                `)
                .single();

            if (error) throw error;
            set({ entries: [data, ...get().entries] });
        } catch (error: any) {
            set({ error: error.message });
            throw error;
        }
    },

    updateEntry: async (id, updates) => {
        try {
            const { data, error } = await supabase
                .from('finances')
                .update(updates)
                .eq('id', id)
                .select(`
                    *,
                    category:finance_categories(*)
                `)
                .single();

            if (error) throw error;
            set({
                entries: get().entries.map(e => e.id === id ? { ...data } : e)
            });
        } catch (error: any) {
            console.error('Supabase Update Error:', error);
            set({ error: error.message });
            throw error;
        }
    },

    deleteEntry: async (id) => {
        try {
            const { error } = await supabase
                .from('finances')
                .delete()
                .eq('id', id);

            if (error) throw error;
            set({ entries: get().entries.filter(e => e.id !== id) });
        } catch (error: any) {
            set({ error: error.message });
        }
    },

    addCategory: async (category) => {
        const user = usePlannerStore.getState().user;
        if (!user) return;

        try {
            const { data, error } = await supabase
                .from('finance_categories')
                .insert([{ ...category, user_id: user.id }])
                .select()
                .single();

            if (error) throw error;
            set({ categories: [...get().categories, data] });
            return data.id;
        } catch (error: any) {
            set({ error: error.message });
        }
    },

    updateCategory: async (id, updates) => {
        try {
            const { data, error } = await supabase
                .from('finance_categories')
                .update(updates)
                .eq('id', id)
                .select()
                .single();

            if (error) throw error;
            set({
                categories: get().categories.map(c => c.id === id ? data : c)
            });
        } catch (error: any) {
            set({ error: error.message });
            throw error;
        }
    },

    deleteCategory: async (id) => {
        // 1. Check if has subcategories
        const hasSubcategories = get().categories.some(c => c.parent_id === id);
        if (hasSubcategories) {
            return { success: false, error: 'Cannot delete category with subcategories' };
        }

        // 2. Check if has entries (can check locally if all fetched)
        const hasEntries = get().entries.some(e => e.category_id === id);
        if (hasEntries) {
            return { success: false, error: 'Cannot delete category with transactions' };
        }

        try {
            const { error } = await supabase
                .from('finance_categories')
                .delete()
                .eq('id', id);

            if (error) throw error;
            set({ categories: get().categories.filter(c => c.id !== id) });
            return { success: true };
        } catch (error: any) {
            return { success: false, error: error.message };
        }
    },

    fetchBudgets: async () => {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            const { data, error } = await supabase
                .from('finance_budgets')
                .select('*')
                .eq('user_id', user.id);

            if (error) throw error;
            set({ budgets: data || [] });
        } catch (error) {
            console.error('Error fetching budgets:', error);
        }
    },

    setBudget: async (budgetData) => {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            const { error } = await supabase
                .from('finance_budgets')
                .upsert({
                    ...budgetData,
                    user_id: user.id
                }, { 
                    onConflict: 'user_id,type,category_id,month,year' 
                });

            if (error) throw error;
            get().fetchBudgets();
        } catch (error) {
            console.error('Error setting budget:', error);
        }
    },

    fetchPaymentMethods: async () => {
        const user = usePlannerStore.getState().user;
        if (!user) return;
        try {
            const { data, error } = await supabase.from('finance_payment_methods').select('*').eq('user_id', user.id).order('name');
            if (error) throw error;
            set({ paymentMethods: data || [] });
        } catch (error: any) {
            console.error('Error fetching payment methods:', error);
        }
    },

    addPaymentMethod: async (name) => {
        const user = usePlannerStore.getState().user;
        if (!user) return;
        try {
            const { data, error } = await supabase.from('finance_payment_methods').insert([{ user_id: user.id, name }]).select().single();
            if (error) throw error;
            set({ paymentMethods: [...get().paymentMethods, data].sort((a,b) => a.name.localeCompare(b.name)) });
        } catch (error: any) {
            console.error('Error adding payment method:', error);
        }
    },

    updatePaymentMethodString: async (oldName: string, newName: string) => {
        const user = usePlannerStore.getState().user;
        if (!user) return;
        try {
            await supabase.from('finances').update({ payment_method: newName }).eq('user_id', user.id).eq('payment_method', oldName);
            await supabase.from('finance_payment_methods').update({ name: newName }).eq('user_id', user.id).eq('name', oldName);
            get().fetchEntries();
            get().fetchPaymentMethods();
        } catch (error: any) {
            console.error('Error updating payment method universally:', error);
        }
    },

    deletePaymentMethod: async (id) => {
        try {
            const { error } = await supabase.from('finance_payment_methods').delete().eq('id', id);
            if (error) throw error;
            set({ paymentMethods: get().paymentMethods.filter(p => p.id !== id) });
        } catch (error: any) {
            console.error('Error deleting payment method:', error);
        }
    },

    exportToCSV: () => {
        const entries = get().entries;
        if (entries.length === 0) return;

        const headers = ['Date', 'Item Title', 'Merchant', 'Amount', 'Category', 'Payment Method', 'Notes'];
        const csvContent = [
            headers.join(','),
            ...entries.map(e => [
                e.date,
                `"${(e.title || '').replace(/"/g, '""')}"`,
                `"${e.store_name.replace(/"/g, '""')}"`,
                e.amount,
                `"${e.category?.name || 'Uncategorized'}"`,
                `"${e.payment_method || 'Cash'}"`,
                `"${(e.notes || '').replace(/"/g, '""')}"`
            ].join(','))
        ].join('\n');

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', `zoabi_finances_${new Date().toISOString().split('T')[0]}.csv`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }
}));
