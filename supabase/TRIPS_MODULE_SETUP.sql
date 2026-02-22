-- ============================================================
-- TRIPS MODULE — Supabase SQL Setup Script
-- Run this in your Supabase SQL Editor (Dashboard → SQL Editor)
-- ============================================================

-- 1. TRIPS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS trips (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    title       TEXT NOT NULL,
    description TEXT,
    location    TEXT,
    start_date  DATE,
    end_date    DATE,
    cover_url   TEXT,
    hashtags    TEXT[]  DEFAULT '{}',
    is_archived BOOLEAN DEFAULT FALSE,
    slug        TEXT    UNIQUE NOT NULL,
    created_at  TIMESTAMPTZ DEFAULT NOW(),
    updated_at  TIMESTAMPTZ DEFAULT NOW()
);

-- Auto-update updated_at on change
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trips_updated_at ON trips;
CREATE TRIGGER trips_updated_at
    BEFORE UPDATE ON trips
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 2. TRIP STOPS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS trip_stops (
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    trip_id      UUID NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
    title        TEXT NOT NULL,
    address      TEXT,
    notes        TEXT,
    latitude     DOUBLE PRECISION,
    longitude    DOUBLE PRECISION,
    arrival_time TIMESTAMPTZ,
    day_number   INTEGER NOT NULL DEFAULT 1,
    order_index  INTEGER NOT NULL DEFAULT 0,
    created_at   TIMESTAMPTZ DEFAULT NOW()
);

-- Index for fast trip-specific queries
CREATE INDEX IF NOT EXISTS idx_trip_stops_trip_id ON trip_stops(trip_id);
CREATE INDEX IF NOT EXISTS idx_trip_stops_day ON trip_stops(trip_id, day_number, order_index);

-- 3. TRIP EXPENSES TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS trip_expenses (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    trip_id     UUID NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
    amount      NUMERIC(10, 2) NOT NULL,
    date        DATE NOT NULL DEFAULT CURRENT_DATE,
    time        TIME,
    category    TEXT NOT NULL DEFAULT 'Other'
                    CHECK (category IN ('Food', 'Transport', 'Entry', 'Gifts', 'Accommodation', 'Other')),
    description TEXT,
    currency    TEXT NOT NULL DEFAULT 'USD',
    created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- Index for fast trip-specific queries
CREATE INDEX IF NOT EXISTS idx_trip_expenses_trip_id ON trip_expenses(trip_id);
CREATE INDEX IF NOT EXISTS idx_trip_expenses_date ON trip_expenses(trip_id, date);

-- ============================================================
-- ROW LEVEL SECURITY (RLS) — Users can only access their own trips
-- ============================================================

-- Enable RLS
ALTER TABLE trips         ENABLE ROW LEVEL SECURITY;
ALTER TABLE trip_stops    ENABLE ROW LEVEL SECURITY;
ALTER TABLE trip_expenses ENABLE ROW LEVEL SECURITY;

-- TRIPS policies
DROP POLICY IF EXISTS "trips_select_own" ON trips;
DROP POLICY IF EXISTS "trips_insert_own" ON trips;
DROP POLICY IF EXISTS "trips_update_own" ON trips;
DROP POLICY IF EXISTS "trips_delete_own" ON trips;

CREATE POLICY "trips_select_own" ON trips FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "trips_insert_own" ON trips FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "trips_update_own" ON trips FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "trips_delete_own" ON trips FOR DELETE USING (auth.uid() = user_id);

-- TRIP STOPS policies (access via parent trip ownership)
DROP POLICY IF EXISTS "trip_stops_select_own" ON trip_stops;
DROP POLICY IF EXISTS "trip_stops_insert_own" ON trip_stops;
DROP POLICY IF EXISTS "trip_stops_update_own" ON trip_stops;
DROP POLICY IF EXISTS "trip_stops_delete_own" ON trip_stops;

CREATE POLICY "trip_stops_select_own" ON trip_stops FOR SELECT
    USING (EXISTS (SELECT 1 FROM trips WHERE trips.id = trip_stops.trip_id AND trips.user_id = auth.uid()));
CREATE POLICY "trip_stops_insert_own" ON trip_stops FOR INSERT
    WITH CHECK (EXISTS (SELECT 1 FROM trips WHERE trips.id = trip_stops.trip_id AND trips.user_id = auth.uid()));
CREATE POLICY "trip_stops_update_own" ON trip_stops FOR UPDATE
    USING (EXISTS (SELECT 1 FROM trips WHERE trips.id = trip_stops.trip_id AND trips.user_id = auth.uid()));
CREATE POLICY "trip_stops_delete_own" ON trip_stops FOR DELETE
    USING (EXISTS (SELECT 1 FROM trips WHERE trips.id = trip_stops.trip_id AND trips.user_id = auth.uid()));

-- TRIP EXPENSES policies (access via parent trip ownership)
DROP POLICY IF EXISTS "trip_expenses_select_own" ON trip_expenses;
DROP POLICY IF EXISTS "trip_expenses_insert_own" ON trip_expenses;
DROP POLICY IF EXISTS "trip_expenses_update_own" ON trip_expenses;
DROP POLICY IF EXISTS "trip_expenses_delete_own" ON trip_expenses;

CREATE POLICY "trip_expenses_select_own" ON trip_expenses FOR SELECT
    USING (EXISTS (SELECT 1 FROM trips WHERE trips.id = trip_expenses.trip_id AND trips.user_id = auth.uid()));
CREATE POLICY "trip_expenses_insert_own" ON trip_expenses FOR INSERT
    WITH CHECK (EXISTS (SELECT 1 FROM trips WHERE trips.id = trip_expenses.trip_id AND trips.user_id = auth.uid()));
CREATE POLICY "trip_expenses_update_own" ON trip_expenses FOR UPDATE
    USING (EXISTS (SELECT 1 FROM trips WHERE trips.id = trip_expenses.trip_id AND trips.user_id = auth.uid()));
CREATE POLICY "trip_expenses_delete_own" ON trip_expenses FOR DELETE
    USING (EXISTS (SELECT 1 FROM trips WHERE trips.id = trip_expenses.trip_id AND trips.user_id = auth.uid()));

-- ============================================================
-- STORAGE BUCKET — For trip cover photos
-- Run this separately if you haven't already set up planner-assets
-- ============================================================

-- Create storage bucket (skip if already exists)
INSERT INTO storage.buckets (id, name, public)
VALUES ('planner-assets', 'planner-assets', true)
ON CONFLICT (id) DO NOTHING;

-- Allow authenticated users to upload to their own folder
DROP POLICY IF EXISTS "planner_assets_upload" ON storage.objects;
DROP POLICY IF EXISTS "planner_assets_select" ON storage.objects;
DROP POLICY IF EXISTS "planner_assets_delete" ON storage.objects;

CREATE POLICY "planner_assets_upload" ON storage.objects FOR INSERT
    WITH CHECK (bucket_id = 'planner-assets' AND auth.uid() IS NOT NULL);

CREATE POLICY "planner_assets_select" ON storage.objects FOR SELECT
    USING (bucket_id = 'planner-assets');

CREATE POLICY "planner_assets_delete" ON storage.objects FOR DELETE
    USING (bucket_id = 'planner-assets' AND auth.uid() IS NOT NULL);

-- 4. TRIP PACKING ITEMS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS trip_packing_items (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    trip_id     UUID NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
    text        TEXT NOT NULL,
    category    TEXT NOT NULL DEFAULT 'Other',
    is_packed   BOOLEAN DEFAULT FALSE,
    created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- Index for fast trip-specific queries
CREATE INDEX IF NOT EXISTS idx_trip_packing_trip_id ON trip_packing_items(trip_id);

-- Enable RLS
ALTER TABLE trip_packing_items ENABLE ROW LEVEL SECURITY;

-- TRIP PACKING ITEMS policies (access via parent trip ownership)
DROP POLICY IF EXISTS "trip_packing_select_own" ON trip_packing_items;
DROP POLICY IF EXISTS "trip_packing_insert_own" ON trip_packing_items;
DROP POLICY IF EXISTS "trip_packing_update_own" ON trip_packing_items;
DROP POLICY IF EXISTS "trip_packing_delete_own" ON trip_packing_items;

CREATE POLICY "trip_packing_select_own" ON trip_packing_items FOR SELECT
    USING (EXISTS (SELECT 1 FROM trips WHERE trips.id = trip_packing_items.trip_id AND trips.user_id = auth.uid()));
CREATE POLICY "trip_packing_insert_own" ON trip_packing_items FOR INSERT
    WITH CHECK (EXISTS (SELECT 1 FROM trips WHERE trips.id = trip_packing_items.trip_id AND trips.user_id = auth.uid()));
CREATE POLICY "trip_packing_update_own" ON trip_packing_items FOR UPDATE
    USING (EXISTS (SELECT 1 FROM trips WHERE trips.id = trip_packing_items.trip_id AND trips.user_id = auth.uid()));
CREATE POLICY "trip_packing_delete_own" ON trip_packing_items FOR DELETE
    USING (EXISTS (SELECT 1 FROM trips WHERE trips.id = trip_packing_items.trip_id AND trips.user_id = auth.uid()));
