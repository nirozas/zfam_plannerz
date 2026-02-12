-- ==========================================
-- MEGA FORCE FIX - VISIBILITY & PERMISSIONS
-- ==========================================
-- Run this to force data visibility for debugging

-- 1. Ensure RLS is enabled but policies are permissive for now
ALTER TABLE public.planners ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- 2. Clear ALL existing policies to prevent conflicts
DO $$ 
DECLARE 
    r RECORD;
BEGIN
    FOR r IN (SELECT policyname, tablename FROM pg_policies WHERE schemaname = 'public' AND tablename IN ('planners', 'assets', 'profiles')) 
    LOOP
        EXECUTE 'DROP POLICY IF EXISTS ' || quote_ident(r.policyname) || ' ON ' || quote_ident(r.tablename);
    END LOOP;
END $$;

-- 3. Reset Planners: Allow ANY authenticated user to see planners (DEBUG MODE)
-- This confirms if the data is reachable via Supabase client
CREATE POLICY "debug_planners_select" ON public.planners FOR SELECT TO authenticated USING (true);
CREATE POLICY "debug_planners_all" ON public.planners FOR ALL TO authenticated USING (auth.uid() = user_id);

-- 4. Reset Assets: Allow PUBLIC read for everyone
CREATE POLICY "debug_assets_select" ON public.assets FOR SELECT USING (true);

-- 5. Reset Profiles: Allow everyone to see profiles, owners to update
CREATE POLICY "debug_profiles_select" ON public.profiles FOR SELECT USING (true);
CREATE POLICY "debug_profiles_update" ON public.profiles FOR UPDATE USING (auth.uid() = id);

-- 6. Ensure Profiles exist for all users
INSERT INTO public.profiles (id, username, full_name, role)
SELECT id, email, split_part(email, '@', 1), 'user' FROM auth.users
ON CONFLICT (id) DO NOTHING;

-- 7. Fix potential bucket issues
UPDATE storage.buckets SET public = true WHERE id IN ('stickers', 'templates', 'covers', 'avatars');

-- 8. Add Storage policies if missing
DROP POLICY IF EXISTS "public_view" ON storage.objects;
CREATE POLICY "public_view" ON storage.objects FOR SELECT USING (true);

-- ==========================================
-- SCRIPT COMPLETE - PLEASE REFRESH THE SITE
-- ==========================================
