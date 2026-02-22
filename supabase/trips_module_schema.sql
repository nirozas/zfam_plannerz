-- Adventure Trips Module Schema

-- 1. Trips Table
CREATE TABLE IF NOT EXISTS public.trips (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT,
    location TEXT,
    start_date DATE,
    end_date DATE,
    cover_url TEXT,
    hashtags TEXT[] DEFAULT '{}',
    is_archived BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Trip Stops (Itinerary)
CREATE TABLE IF NOT EXISTS public.trip_stops (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    trip_id UUID NOT NULL REFERENCES public.trips(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    address TEXT,
    notes TEXT,
    latitude DOUBLE PRECISION,
    longitude DOUBLE PRECISION,
    arrival_time TIMESTAMPTZ,
    day_number INTEGER DEFAULT 1,
    order_index INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 3. Trip Expenses
CREATE TABLE IF NOT EXISTS public.trip_expenses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    trip_id UUID NOT NULL REFERENCES public.trips(id) ON DELETE CASCADE,
    amount NUMERIC(10, 2) NOT NULL,
    date DATE NOT NULL DEFAULT CURRENT_DATE,
    time TIME DEFAULT CURRENT_TIME,
    category TEXT NOT NULL CHECK (category IN ('Food', 'Transport', 'Entry', 'Gifts', 'Accommodation', 'Other')),
    description TEXT,
    currency TEXT DEFAULT 'USD',
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.trips ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trip_stops ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trip_expenses ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Users can manage their own trips" ON public.trips
    FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can manage stops of their own trips" ON public.trip_stops
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.trips 
            WHERE trips.id = trip_stops.trip_id AND trips.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can manage expenses of their own trips" ON public.trip_expenses
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.trips 
            WHERE trips.id = trip_expenses.trip_id AND trips.user_id = auth.uid()
        )
    );

-- Functions & Triggers for updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_trips_updated_at
    BEFORE UPDATE ON public.trips
    FOR EACH ROW
    EXECUTE PROCEDURE update_updated_at_column();
