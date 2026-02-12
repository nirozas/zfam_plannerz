-- ==========================================
-- EMERGENCY 401 RECOVERY SCRIPT
-- ==========================================
-- Run this in your Supabase SQL Editor to restore access.
-- The error "role admin does not exist" means your login role was changed incorrectly.

-- 1. Reset your connection role to the standard 'authenticated'
-- This fixes the 401 Unauthorized error immediately.
UPDATE auth.users 
SET role = 'authenticated' 
WHERE id = 'adbee7d8-be2d-43fd-ab3c-f2b2bb775830';

-- 2. Keep the 'admin' status in the profiles table (where our app's logic looks)
UPDATE public.profiles 
SET role = 'admin' 
WHERE id = 'adbee7d8-be2d-43fd-ab3c-f2b2bb775830';

-- 3. Create the Postgres 'admin' role as a fallback 
-- (This satisfies any policies that specifically mention the role name)
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'admin') THEN
        CREATE ROLE admin;
        GRANT authenticated TO admin;
    END IF;
END $$;

-- 4. Ensure basic visibility policies exist and are permissive for the fix
DROP POLICY IF EXISTS "debug_planners_select" ON public.planners;
CREATE POLICY "debug_planners_select" ON public.planners FOR SELECT USING (true);

DROP POLICY IF EXISTS "debug_assets_select" ON public.assets;
CREATE POLICY "debug_assets_select" ON public.assets FOR SELECT USING (true);

-- ==========================================
-- SCRIPT COMPLETE
-- IMPORTANT: AFTER RUNNING THIS, LOG OUT AND LOG BACK IN 
-- OR CLEAR YOUR BROWSER CACHE TO GET A NEW SESSION KEY.
-- ==========================================
