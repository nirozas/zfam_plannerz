-- ==========================================
-- VISIBILITY RESCUE SCRIPT
-- ==========================================
-- Run this in your Supabase SQL Editor to fix missing planners and assets

-- 1. Reset Planners RLS
ALTER TABLE public.planners ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "planners_owner_all" ON public.planners;
DROP POLICY IF EXISTS "Users can see own planners." ON public.planners;
DROP POLICY IF EXISTS "Users can insert own planners." ON public.planners;
DROP POLICY IF EXISTS "Users can update own planners." ON public.planners;

-- New Comprehensive Planner Policy
CREATE POLICY "planners_visibility" ON public.planners
    FOR ALL
    USING (
        auth.uid() = user_id OR 
        EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
    )
    WITH CHECK (
        auth.uid() = user_id OR 
        EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
    );

-- 2. Reset Assets RLS
ALTER TABLE public.assets ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "assets_public_read" ON public.assets;
DROP POLICY IF EXISTS "assets_admin_select" ON public.assets;
DROP POLICY IF EXISTS "assets_admin_update" ON public.assets;
DROP POLICY IF EXISTS "assets_admin_delete" ON public.assets;
DROP POLICY IF EXISTS "Assets are publicly readable" ON public.assets;
DROP POLICY IF EXISTS "Users can manage their own assets" ON public.assets;

-- New Comprehensive Asset Policy
CREATE POLICY "assets_visibility" ON public.assets
    FOR ALL
    USING (
        user_id IS NULL OR 
        auth.uid() = user_id OR 
        EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
    )
    WITH CHECK (
        auth.uid() = user_id OR 
        EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
    );

-- 3. Ensure Storage is Public for Library
-- This ensures that the actual images are viewable if URL is known
INSERT INTO storage.buckets (id, name, public) 
VALUES ('stickers', 'stickers', true), ('templates', 'templates', true), ('covers', 'covers', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- Ensure Select policy exists for everyone on these buckets
DROP POLICY IF EXISTS "public_read_stickers" ON storage.objects;
CREATE POLICY "public_read_stickers" ON storage.objects FOR SELECT USING (bucket_id = 'stickers');

DROP POLICY IF EXISTS "public_read_templates" ON storage.objects;
CREATE POLICY "public_read_templates" ON storage.objects FOR SELECT USING (bucket_id = 'templates');

DROP POLICY IF EXISTS "public_read_covers" ON storage.objects;
CREATE POLICY "public_read_covers" ON storage.objects FOR SELECT USING (bucket_id = 'covers');

-- 4. Final Sanity Check for Profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "profiles_public_read" ON public.profiles;
CREATE POLICY "profiles_public_read" ON public.profiles FOR SELECT USING (true);

DROP POLICY IF EXISTS "profiles_self_update" ON public.profiles;
CREATE POLICY "profiles_self_update" ON public.profiles FOR UPDATE USING (auth.uid() = id);

-- ==========================================
-- SCRIPT COMPLETE
-- ==========================================
