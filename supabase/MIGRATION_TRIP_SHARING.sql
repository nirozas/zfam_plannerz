-- ==========================================
-- TRIP COLLABORATION & SHARING (REPAIR SCRIPT)
-- ==========================================

-- 1. Reset and Recreate Trip Collaborators Table
-- If you have important data, you might want to back it up first.
-- However, for the initial setup, a clean slate is safest to fix relation errors.
DROP TABLE IF EXISTS public.trip_collaborators CASCADE;

CREATE TABLE public.trip_collaborators (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    trip_id UUID NOT NULL REFERENCES public.trips(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    role TEXT NOT NULL DEFAULT 'viewer' CHECK (role IN ('viewer', 'editor')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(trip_id, user_id)
);

-- Ensure participants column exists in trips (matches the TypeScript type)
ALTER TABLE public.trips ADD COLUMN IF NOT EXISTS participants TEXT[] DEFAULT '{}';

-- Enable RLS
ALTER TABLE public.trip_collaborators ENABLE ROW LEVEL SECURITY;

-- 2. Helper Function to break RLS recursion
CREATE OR REPLACE FUNCTION public.check_trip_access(t_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.trips WHERE id = t_id AND user_id = auth.uid()
    ) OR EXISTS (
        SELECT 1 FROM public.trip_collaborators WHERE trip_id = t_id AND user_id = auth.uid()
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. TRIPS Policies
DROP POLICY IF EXISTS "trips_collaborator_select" ON public.trips;
DROP POLICY IF EXISTS "trips_collaborator_update" ON public.trips;
DROP POLICY IF EXISTS "trips_select_own" ON public.trips;

-- Owner always has access
CREATE POLICY "trips_select_own" ON public.trips 
    FOR SELECT TO authenticated 
    USING (auth.uid() = user_id);

CREATE POLICY "trips_collaborator_select" ON public.trips
    FOR SELECT TO authenticated
    USING (public.check_trip_access(id));

CREATE POLICY "trips_collaborator_update" ON public.trips
    FOR UPDATE TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.trip_collaborators
            WHERE trip_collaborators.trip_id = trips.id
            AND trip_collaborators.user_id = auth.uid()
            AND trip_collaborators.role = 'editor'
        )
    );

-- 4. COLLABORATORS Table Policies
DROP POLICY IF EXISTS "collaborators_owner_manage" ON public.trip_collaborators;
DROP POLICY IF EXISTS "collaborators_view_team" ON public.trip_collaborators;

CREATE POLICY "collaborators_owner_manage" ON public.trip_collaborators
    FOR ALL TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.trips
            WHERE trips.id = trip_collaborators.trip_id
            AND trips.user_id = auth.uid()
        )
    );

CREATE POLICY "collaborators_view_team" ON public.trip_collaborators
    FOR SELECT TO authenticated
    USING (public.check_trip_access(trip_id));


-- 5. TRIP COMPONENTS Policies (Stops, Expenses, Packing Items)

-- STOPS
DROP POLICY IF EXISTS "trip_stops_collaborator_select" ON public.trip_stops;
DROP POLICY IF EXISTS "trip_stops_collaborator_all" ON public.trip_stops;

CREATE POLICY "trip_stops_collaborator_select" ON public.trip_stops
    FOR SELECT TO authenticated
    USING (public.check_trip_access(trip_id));

CREATE POLICY "trip_stops_collaborator_all" ON public.trip_stops
    FOR ALL TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.trip_collaborators
            WHERE trip_collaborators.trip_id = trip_stops.trip_id
            AND trip_collaborators.user_id = auth.uid()
            AND trip_collaborators.role = 'editor'
        )
    );

-- EXPENSES
DROP POLICY IF EXISTS "trip_expenses_collaborator_select" ON public.trip_expenses;
DROP POLICY IF EXISTS "trip_expenses_collaborator_all" ON public.trip_expenses;

CREATE POLICY "trip_expenses_collaborator_select" ON public.trip_expenses
    FOR SELECT TO authenticated
    USING (public.check_trip_access(trip_id));

CREATE POLICY "trip_expenses_collaborator_all" ON public.trip_expenses
    FOR ALL TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.trip_collaborators
            WHERE trip_collaborators.trip_id = trip_expenses.trip_id
            AND trip_collaborators.user_id = auth.uid()
            AND trip_collaborators.role = 'editor'
        )
    );

-- PACKING ITEMS
DROP POLICY IF EXISTS "trip_packing_collaborator_select" ON public.trip_packing_items;
DROP POLICY IF EXISTS "trip_packing_collaborator_all" ON public.trip_packing_items;

CREATE POLICY "trip_packing_collaborator_select" ON public.trip_packing_items
    FOR SELECT TO authenticated
    USING (public.check_trip_access(trip_id));

CREATE POLICY "trip_packing_collaborator_all" ON public.trip_packing_items
    FOR ALL TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.trip_collaborators
            WHERE trip_collaborators.trip_id = trip_packing_items.trip_id
            AND trip_collaborators.user_id = auth.uid()
            AND trip_collaborators.role = 'editor'
        )
    );

-- 6. FORCE SCHEMA REFRESH
-- This tells Supabase to reload its API definitions immediately
NOTIFY pgrst, 'reload schema';
