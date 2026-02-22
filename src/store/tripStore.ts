import { create } from 'zustand';
import { supabase } from '../supabase/client';
import { Trip, TripStop, TripExpense, TripPackingItem } from '../types/trip';

interface TripState {
    trips: Trip[];
    activeTrip: Trip | null;
    activeTripStops: TripStop[];
    activeTripExpenses: TripExpense[];
    activeTripPackingItems: TripPackingItem[];
    collaborators: any[];
    userRole: 'owner' | 'editor' | 'viewer' | null;
    isLoading: boolean;
    error: string | null;
    filters: {
        categories: string[];
        days: number | 'all';
    };
    setFilter: (field: string, value: any) => void;

    // Trip Actions
    fetchTrips: () => Promise<void>;
    fetchTripDetails: (identifier: string) => Promise<void>;
    createTrip: (trip: Partial<Trip>) => Promise<Trip>;
    updateTrip: (tripId: string, updates: Partial<Trip>) => Promise<void>;
    deleteTrip: (tripId: string) => Promise<void>;

    // Stop Actions
    fetchStops: (tripId: string) => Promise<void>;
    addStop: (stop: Partial<TripStop>) => Promise<void>;
    updateStop: (stopId: string, updates: Partial<TripStop>) => Promise<void>;
    deleteStop: (stopId: string) => Promise<void>;

    // Expense Actions
    fetchExpenses: (tripId: string) => Promise<void>;
    addExpense: (expense: Partial<TripExpense>) => Promise<void>;
    updateExpense: (expenseId: string, updates: Partial<TripExpense>) => Promise<void>;
    deleteExpense: (expenseId: string) => Promise<void>;
    // Packing Actions
    addPackingItem: (item: Partial<TripPackingItem>) => Promise<void>;
    addPackingItems: (items: Partial<TripPackingItem>[]) => Promise<void>;
    updatePackingItem: (itemId: string, updates: Partial<TripPackingItem>) => Promise<void>;
    deletePackingItem: (itemId: string) => Promise<void>;
    // Sharing Actions
    fetchCollaborators: (tripId: string) => Promise<void>;
    addCollaborator: (tripId: string, userId: string, role: string) => Promise<void>;
    removeCollaborator: (collaboratorId: string) => Promise<void>;
    searchUsers: (query: string) => Promise<any[]>;
}

export const useTripStore = create<TripState>((set) => ({
    trips: [],
    activeTrip: null,
    activeTripStops: [],
    activeTripExpenses: [],
    activeTripPackingItems: [],
    collaborators: [],
    userRole: null,
    isLoading: false,
    error: null,
    filters: {
        categories: [],
        days: 'all'
    },
    setFilter: (field, value) => set(state => ({
        filters: { ...state.filters, [field]: value }
    })),

    fetchTrips: async () => {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;
        set({ isLoading: true });
        try {
            // 1. Fetch trips
            const { data: trips, error } = await supabase
                .from('trips')
                .select('*')
                .order('created_at', { ascending: false });

            if (error) throw error;

            // 2. Fetch my roles for shared trips
            const { data: roles } = await supabase
                .from('trip_collaborators')
                .select('trip_id, role')
                .eq('user_id', user.id);

            const tripsWithRole = (trips || []).map(trip => {
                const roleEntry = roles?.find(r => r.trip_id === trip.id);
                return {
                    ...trip,
                    userRole: trip.user_id === user.id ? 'owner' : (roleEntry?.role || 'viewer')
                };
            });

            set({ trips: tripsWithRole, isLoading: false });
        } catch (error: any) {
            console.error('[tripStore] fetchTrips catch:', error);
            set({ error: error.message, isLoading: false });
        }
    },

    fetchTripDetails: async (identifier: string) => {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;
        set({ isLoading: true });
        try {
            const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(identifier);

            let query = supabase.from('trips').select('*');

            if (isUuid) {
                query = query.eq('id', identifier);
            } else {
                query = query.eq('slug', identifier);
            }

            const { data: trip, error: tripError } = await query.single();
            if (tripError) throw tripError;

            // Fetch sub-resources individually
            const [stopsRes, expensesRes, packingRes] = await Promise.allSettled([
                supabase.from('trip_stops').select('*').eq('trip_id', trip.id).order('day_number', { ascending: true }).order('arrival_time', { ascending: true }).order('order_index', { ascending: true }),
                supabase.from('trip_expenses').select('*').eq('trip_id', trip.id).order('date', { ascending: false }),
                supabase.from('trip_packing_items').select('*').eq('trip_id', trip.id).order('created_at', { ascending: true })
            ]);

            const stops = stopsRes.status === 'fulfilled' ? (stopsRes.value.data || []) : [];
            const expenses = expensesRes.status === 'fulfilled' ? (expensesRes.value.data || []) : [];
            const packing = packingRes.status === 'fulfilled' ? (packingRes.value.data || []) : [];

            set({
                activeTrip: trip,
                activeTripStops: stops,
                activeTripExpenses: expenses,
                activeTripPackingItems: packing,
                isLoading: false
            });

            // Try to fetch collaborators separately so it doesn't break the main trip if table is missing
            try {
                const { data: colRes } = await supabase
                    .from('trip_collaborators')
                    .select(`
                        *,
                        profile:user_id(id, username, full_name, avatar_url)
                    `)
                    .eq('trip_id', trip.id);

                if (colRes) {
                    const myCollab = colRes.find(c => c.user_id === user.id);
                    set({
                        collaborators: colRes,
                        userRole: trip.user_id === user.id ? 'owner' : (myCollab?.role || 'viewer')
                    });
                } else {
                    set({ userRole: trip.user_id === user.id ? 'owner' : 'viewer' });
                }
            } catch (e) {
                console.warn('Trip collaborators fetch failed:', e);
                set({ userRole: trip.user_id === user.id ? 'owner' : 'viewer' });
            }
        } catch (error: any) {
            set({ error: error.message, isLoading: false });
        }
    },

    createTrip: async (trip) => {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error("Not authenticated");

        const { data, error } = await supabase
            .from('trips')
            .insert([{ ...trip, user_id: user.id }])
            .select()
            .single();

        if (error) throw error;
        set(state => ({ trips: [data, ...state.trips] }));
        return data;
    },

    updateTrip: async (tripId, updates) => {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const { error } = await supabase
            .from('trips')
            .update(updates)
            .eq('id', tripId);

        if (error) throw error;
        set(state => ({
            trips: state.trips.map(t => t.id === tripId ? { ...t, ...updates } : t),
            activeTrip: state.activeTrip?.id === tripId ? { ...state.activeTrip, ...updates } : state.activeTrip
        }));
    },

    deleteTrip: async (tripId) => {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const { error } = await supabase
            .from('trips')
            .delete()
            .eq('id', tripId);

        if (error) throw error;
        set(state => ({
            trips: state.trips.filter(t => t.id !== tripId),
            activeTrip: state.activeTrip?.id === tripId ? null : state.activeTrip
        }));
    },

    fetchStops: async (tripId) => {
        const { data, error } = await supabase
            .from('trip_stops')
            .select('*')
            .eq('trip_id', tripId)
            .order('day_number', { ascending: true })
            .order('arrival_time', { ascending: true })
            .order('order_index', { ascending: true });

        if (error) throw error;
        set({ activeTripStops: data || [] });
    },

    addStop: async (stop) => {
        const { data, error } = await supabase
            .from('trip_stops')
            .insert([stop])
            .select()
            .single();

        if (error) throw error;
        set(state => ({ activeTripStops: [...state.activeTripStops, data] }));
    },

    updateStop: async (stopId, updates) => {
        const { error } = await supabase
            .from('trip_stops')
            .update(updates)
            .eq('id', stopId);

        if (error) throw error;
        set(state => ({
            activeTripStops: state.activeTripStops.map(s => s.id === stopId ? { ...s, ...updates } : s)
        }));
    },

    deleteStop: async (stopId) => {
        const { error } = await supabase.from('trip_stops').delete().eq('id', stopId);
        if (error) throw error;
        set(state => ({
            activeTripStops: state.activeTripStops.filter(s => s.id !== stopId)
        }));
    },

    fetchExpenses: async (tripId) => {
        const { data, error } = await supabase
            .from('trip_expenses')
            .select('*')
            .eq('trip_id', tripId)
            .order('date', { ascending: false });

        if (error) throw error;
        set({ activeTripExpenses: data || [] });
    },

    addExpense: async (expense) => {
        const { data, error } = await supabase
            .from('trip_expenses')
            .insert([expense])
            .select()
            .single();

        if (error) throw error;
        set(state => ({ activeTripExpenses: [data, ...state.activeTripExpenses] }));
    },

    updateExpense: async (expenseId, updates) => {
        const { error } = await supabase
            .from('trip_expenses')
            .update(updates)
            .eq('id', expenseId);

        if (error) throw error;
        set(state => ({
            activeTripExpenses: state.activeTripExpenses.map(e => e.id === expenseId ? { ...e, ...updates } : e)
        }));
    },

    deleteExpense: async (expenseId: string) => {
        const { error } = await supabase.from('trip_expenses').delete().eq('id', expenseId);
        if (error) throw error;
        set(state => ({
            activeTripExpenses: state.activeTripExpenses.filter(e => e.id !== expenseId)
        }));
    },

    // Packing Actions
    addPackingItem: async (item) => {
        const { data, error } = await supabase
            .from('trip_packing_items')
            .insert([item])
            .select()
            .single();

        if (error) throw error;
        set(state => ({
            activeTripPackingItems: [...state.activeTripPackingItems, data]
        }));
    },

    addPackingItems: async (items) => {
        const { data, error } = await supabase
            .from('trip_packing_items')
            .insert(items)
            .select();

        if (error) throw error;
        set(state => ({
            activeTripPackingItems: [...state.activeTripPackingItems, ...data]
        }));
    },

    updatePackingItem: async (itemId, updates) => {
        const { error } = await supabase
            .from('trip_packing_items')
            .update(updates)
            .eq('id', itemId);

        if (error) throw error;
        set(state => ({
            activeTripPackingItems: state.activeTripPackingItems.map(item =>
                item.id === itemId ? { ...item, ...updates } : item
            )
        }));
    },

    deletePackingItem: async (itemId) => {
        const { error } = await supabase
            .from('trip_packing_items')
            .delete()
            .eq('id', itemId);

        if (error) throw error;
        set(state => ({
            activeTripPackingItems: state.activeTripPackingItems.filter(item => item.id !== itemId)
        }));
    },

    // Sharing Actions
    fetchCollaborators: async (tripId) => {
        const { data, error } = await supabase
            .from('trip_collaborators')
            .select(`
                *,
                profile:profiles(id, username, full_name, avatar_url)
            `)
            .eq('trip_id', tripId);

        if (error) throw error;
        set({ collaborators: data || [] });
    },

    addCollaborator: async (tripId, userId, role) => {
        const { data, error } = await supabase
            .from('trip_collaborators')
            .insert([{ trip_id: tripId, user_id: userId, role }])
            .select(`
                *,
                profile:profiles(id, username, full_name, avatar_url)
            `)
            .single();

        if (error) throw error;
        set(state => ({ collaborators: [...state.collaborators, data] }));
    },

    removeCollaborator: async (collaboratorId) => {
        const { error } = await supabase
            .from('trip_collaborators')
            .delete()
            .eq('id', collaboratorId);

        if (error) throw error;
        set(state => ({
            collaborators: state.collaborators.filter(c => c.id !== collaboratorId)
        }));
    },

    searchUsers: async (query) => {
        if (!query || query.length < 2) return [];

        const { data, error } = await supabase
            .from('profiles')
            .select('id, username, full_name, avatar_url')
            .or(`username.ilike.%${query}%,full_name.ilike.%${query}%`)
            .limit(10);

        if (error) throw error;
        return data || [];
    },
}));
