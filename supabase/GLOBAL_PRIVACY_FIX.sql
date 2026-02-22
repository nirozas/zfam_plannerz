-- ==========================================
-- GLOBAL PRIVACY & SECURITY LOCKDOWN
-- ==========================================
-- This script ensures all private tables have RLS enabled
-- and strict "Owner Only" access policies.

-- 1. PLANNERS
ALTER TABLE public.planners ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "planners_owner_all" ON public.planners;
DROP POLICY IF EXISTS "planners_visibility" ON public.planners;
DROP POLICY IF EXISTS "Users can view own planners" ON public.planners;

CREATE POLICY "planners_owner_all" ON public.planners
    FOR ALL TO authenticated
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- 2. PAGES (Via Planner Ownership)
ALTER TABLE public.pages ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "pages_owner_all" ON public.pages;
DROP POLICY IF EXISTS "Users can view own pages" ON public.pages;

CREATE POLICY "pages_owner_all" ON public.pages
    FOR ALL TO authenticated
    USING (EXISTS (SELECT 1 FROM planners WHERE planners.id = pages.planner_id AND planners.user_id = auth.uid()))
    WITH CHECK (EXISTS (SELECT 1 FROM planners WHERE planners.id = pages.planner_id AND planners.user_id = auth.uid()));

-- 3. TRIPS
ALTER TABLE public.trips ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "trips_owner_all" ON public.trips;
DROP POLICY IF EXISTS "trips_select_own" ON public.trips;

CREATE POLICY "trips_owner_all" ON public.trips
    FOR ALL TO authenticated
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- 4. TRIP COMPONENTS (Stops, Expenses, Packing)
ALTER TABLE public.trip_stops ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trip_expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trip_packing_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "trip_stops_owner_all" ON public.trip_stops;
DROP POLICY IF EXISTS "trip_stops_select_own" ON public.trip_stops;
CREATE POLICY "trip_stops_owner_all" ON public.trip_stops
    FOR ALL TO authenticated
    USING (EXISTS (SELECT 1 FROM trips WHERE trips.id = trip_stops.trip_id AND trips.user_id = auth.uid()))
    WITH CHECK (EXISTS (SELECT 1 FROM trips WHERE trips.id = trip_stops.trip_id AND trips.user_id = auth.uid()));

DROP POLICY IF EXISTS "trip_expenses_owner_all" ON public.trip_expenses;
DROP POLICY IF EXISTS "trip_expenses_select_own" ON public.trip_expenses;
CREATE POLICY "trip_expenses_owner_all" ON public.trip_expenses
    FOR ALL TO authenticated
    USING (EXISTS (SELECT 1 FROM trips WHERE trips.id = trip_expenses.trip_id AND trips.user_id = auth.uid()))
    WITH CHECK (EXISTS (SELECT 1 FROM trips WHERE trips.id = trip_expenses.trip_id AND trips.user_id = auth.uid()));

DROP POLICY IF EXISTS "trip_packing_owner_all" ON public.trip_packing_items;
DROP POLICY IF EXISTS "trip_packing_select_own" ON public.trip_packing_items;
CREATE POLICY "trip_packing_owner_all" ON public.trip_packing_items
    FOR ALL TO authenticated
    USING (EXISTS (SELECT 1 FROM trips WHERE trips.id = trip_packing_items.trip_id AND trips.user_id = auth.uid()))
    WITH CHECK (EXISTS (SELECT 1 FROM trips WHERE trips.id = trip_packing_items.trip_id AND trips.user_id = auth.uid()));

-- 5. TASKS & RITUALS
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.task_categories ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "tasks_owner_all" ON public.tasks;
DROP POLICY IF EXISTS "Users can view their own tasks" ON public.tasks;
CREATE POLICY "tasks_owner_all" ON public.tasks
    FOR ALL TO authenticated
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "categories_owner_all" ON public.task_categories;
DROP POLICY IF EXISTS "Users can view their own categories" ON public.task_categories;
CREATE POLICY "categories_owner_all" ON public.task_categories
    FOR ALL TO authenticated
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- 6. ASSETS (LIBRARY - THE EXCEPTION)
-- Here we allow users to see their own assets AND public assets (user_id IS NULL)
ALTER TABLE public.assets ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "assets_visibility" ON public.assets;
DROP POLICY IF EXISTS "assets_owner_all" ON public.assets;
DROP POLICY IF EXISTS "assets_public_read" ON public.assets;

-- Owners can manage (Update/Delete) their own assets
CREATE POLICY "assets_owner_all" ON public.assets
    FOR ALL TO authenticated
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- Everyone can view public assets OR their own
CREATE POLICY "assets_view_policy" ON public.assets
    FOR SELECT USING (user_id IS NULL OR auth.uid() = user_id);

-- 7. STORAGE BUCKETS
-- Ensure only owners can write to their folders
-- (Assuming folders are named after auth.uid())

-- Use a helper to re-apply strict storage policies if needed, 
-- but generally the folder-based check (storage.foldername(name))[1] = auth.uid()::text is best.
