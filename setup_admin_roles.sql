-- ==========================================
-- ADMIN ROLE & ASSET MANAGEMENT POLICIES
-- ==========================================

-- 1. Add role to profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'user';

-- 2. Update Assets RLS for Admin Access
-- Allow admins to see ALL assets (public, their own, and other users' private assets)
DROP POLICY IF EXISTS "assets_admin_select" ON public.assets;
CREATE POLICY "assets_admin_select" ON public.assets
    FOR SELECT
    USING (
        user_id IS NULL OR 
        auth.uid() = user_id OR 
        EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
    );

-- Allow admins to update any asset
DROP POLICY IF EXISTS "assets_admin_update" ON public.assets;
CREATE POLICY "assets_admin_update" ON public.assets
    FOR UPDATE
    USING (
        auth.uid() = user_id OR 
        EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
    );

-- Allow admins to delete any asset
DROP POLICY IF EXISTS "assets_admin_delete" ON public.assets;
CREATE POLICY "assets_admin_delete" ON public.assets
    FOR DELETE
    USING (
        auth.uid() = user_id OR 
        EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
    );

-- 3. Update Storage Policies for Admin Access
-- Stickers
DROP POLICY IF EXISTS "stickers_admin_delete" ON storage.objects;
CREATE POLICY "stickers_admin_delete" ON storage.objects
    FOR DELETE TO authenticated
    USING (
        bucket_id = 'stickers' AND (
            auth.uid()::text = (storage.foldername(name))[1] OR
            EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
        )
    );

DROP POLICY IF EXISTS "stickers_admin_update" ON storage.objects;
CREATE POLICY "stickers_admin_update" ON storage.objects
    FOR UPDATE TO authenticated
    USING (
        bucket_id = 'stickers' AND (
            auth.uid()::text = (storage.foldername(name))[1] OR
            EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
        )
    );

-- Templates
DROP POLICY IF EXISTS "templates_admin_delete" ON storage.objects;
CREATE POLICY "templates_admin_delete" ON storage.objects
    FOR DELETE TO authenticated
    USING (
        bucket_id = 'templates' AND (
            auth.uid()::text = (storage.foldername(name))[1] OR
            EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
        )
    );

DROP POLICY IF EXISTS "templates_admin_update" ON storage.objects;
CREATE POLICY "templates_admin_update" ON storage.objects
    FOR UPDATE TO authenticated
    USING (
        bucket_id = 'templates' AND (
            auth.uid()::text = (storage.foldername(name))[1] OR
            EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
        )
    );

-- Covers
DROP POLICY IF EXISTS "covers_admin_delete" ON storage.objects;
CREATE POLICY "covers_admin_delete" ON storage.objects
    FOR DELETE TO authenticated
    USING (
        bucket_id = 'covers' AND (
            auth.uid()::text = (storage.foldername(name))[1] OR
            EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
        )
    );

DROP POLICY IF EXISTS "covers_admin_update" ON storage.objects;
CREATE POLICY "covers_admin_update" ON storage.objects
    FOR UPDATE TO authenticated
    USING (
        bucket_id = 'covers' AND (
            auth.uid()::text = (storage.foldername(name))[1] OR
            EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
        )
    );

-- ==========================================
-- HELPER: SET ADMIN ROLE
-- ==========================================
-- To make yourself an admin, run:
-- UPDATE public.profiles SET role = 'admin' WHERE id = 'your-user-id';
-- OR if you want to set by email (requires subquery):
-- UPDATE public.profiles SET role = 'admin' WHERE id = (SELECT id FROM auth.users WHERE email = 'your-email@example.com');
