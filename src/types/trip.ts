export interface Trip {
    id: string;
    user_id: string;
    title: string;
    description?: string | null;
    location?: string | null;
    start_date?: string | null;
    end_date?: string | null;
    cover_url?: string | null;
    hashtags: string[];
    participants: string[];
    is_archived: boolean;
    slug: string;
    created_at: string;
    updated_at: string;
}

export interface TripStop {
    id: string;
    trip_id: string;
    title: string;
    address?: string;
    notes?: string;
    category?: 'Dining' | 'Accommodation' | 'Attraction' | 'Transportation' | 'Activity' | 'Shopping' | 'Other';
    image_url?: string | null;
    latitude?: number;
    longitude?: number;
    arrival_time?: string;
    day_number: number;
    order_index: number;
}

export interface TripExpense {
    id: string;
    trip_id: string;
    amount: number;
    date: string;
    time?: string;
    category: 'Dining' | 'Accommodation' | 'Attraction' | 'Transportation' | 'Activity' | 'Shopping' | 'Other';
    description?: string;
    currency: string;
}

export interface TripPackingItem {
    id: string;
    trip_id: string;
    traveler_name?: string | null;
    text: string;
    category: string;
    is_packed: boolean;
    created_at: string;
}

export type TripExpenseCategory = TripExpense['category'];
