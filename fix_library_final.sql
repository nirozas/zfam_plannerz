-- ==========================================
-- FINAL FIX FOR ASSET LIBRARY & UPLOADS
-- ==========================================
-- This script fixes the 'assets' table schema and storage buckets
-- to support 'planner' and 'voice' types.
-- Run this in your Supabase SQL Editor.

-- 1. Ensure 'assets' table has correct columns
DO $$ 
BEGIN
    -- Rename 'name' to 'title' if it exists (for backward compatibility)
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'assets' AND column_name = 'name') 
       AND NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'assets' AND column_name = 'title') THEN
        ALTER TABLE public.assets RENAME COLUMN name TO title;
    END IF;

    -- Add title if missing
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'assets' AND column_name = 'title') THEN
        ALTER TABLE public.assets ADD COLUMN title TEXT;
    END IF;

    -- Add type if missing
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'assets' AND column_name = 'type') THEN
        ALTER TABLE public.assets ADD COLUMN type TEXT;
    END IF;

    -- Add hashtags if missing
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'assets' AND column_name = 'hashtags') THEN
        ALTER TABLE public.assets ADD COLUMN hashtags TEXT[] DEFAULT '{}';
    END IF;

    -- Add user_id if missing
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'assets' AND column_name = 'user_id') THEN
        ALTER TABLE public.assets ADD COLUMN user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;
    END IF;
END $$;

-- 2. Update the 'type' check constraint
-- This allows stickers, templates, images, covers, voice notes, and planners
DO $$ 
DECLARE
    const_name TEXT;
BEGIN
    SELECT constraint_name INTO const_name
    FROM information_schema.table_constraints
    WHERE table_name = 'assets' AND constraint_type = 'CHECK' AND (constraint_name LIKE '%type%' OR constraint_name = 'assets_type_check');
    
    IF const_name IS NOT NULL THEN
        EXECUTE 'ALTER TABLE public.assets DROP CONSTRAINT ' || const_name;
    END IF;
END $$;

ALTER TABLE public.assets ADD CONSTRAINT assets_type_check 
CHECK (type IN ('sticker', 'template', 'image', 'cover', 'voice', 'planner'));

-- 3. Create missing storage buckets
INSERT INTO storage.buckets (id, name, public)
VALUES 
    ('planner-uploads', 'planner-uploads', true),
    ('voice-notes', 'voice-notes', true),
    ('stickers', 'stickers', true),
    ('templates', 'templates', true),
    ('covers', 'covers', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- 4. Set up Storage Policies for ALL buckets
-- This ensures users can only upload to their own folder (folder name = user_id)

-- Function to apply policies to a bucket
CREATE OR REPLACE FUNCTION public.setup_bucket_policies(bucket_name TEXT)
RETURNS VOID AS $$
BEGIN
    -- Public Read
    EXECUTE format('DROP POLICY IF EXISTS %I ON storage.objects', 'public_read_' || bucket_name);
    EXECUTE format('CREATE POLICY %I ON storage.objects FOR SELECT USING (bucket_id = %L)', 'public_read_' || bucket_name, bucket_name);

    -- Auth Upload (to own folder)
    EXECUTE format('DROP POLICY IF EXISTS %I ON storage.objects', 'auth_upload_' || bucket_name);
    EXECUTE format('CREATE POLICY %I ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = %L AND (storage.foldername(name))[1] = auth.uid()::text)', 'auth_upload_' || bucket_name, bucket_name);

    -- Auth Update (own files)
    EXECUTE format('DROP POLICY IF EXISTS %I ON storage.objects', 'auth_update_' || bucket_name);
    EXECUTE format('CREATE POLICY %I ON storage.objects FOR UPDATE TO authenticated USING (bucket_id = %L AND (storage.foldername(name))[1] = auth.uid()::text)', 'auth_update_' || bucket_name, bucket_name);

    -- Auth Delete (own files)
    EXECUTE format('DROP POLICY IF EXISTS %I ON storage.objects', 'auth_delete_' || bucket_name);
    EXECUTE format('CREATE POLICY %I ON storage.objects FOR DELETE TO authenticated USING (bucket_id = %L AND (storage.foldername(name))[1] = auth.uid()::text)', 'auth_delete_' || bucket_name, bucket_name);
END;
$$ LANGUAGE plpgsql;

-- Apply to all relevant buckets
SELECT public.setup_bucket_policies('planner-uploads');
SELECT public.setup_bucket_policies('voice-notes');
SELECT public.setup_bucket_policies('stickers');
SELECT public.setup_bucket_policies('templates');
SELECT public.setup_bucket_policies('covers');

-- 5. Final Assets Table RLS
ALTER TABLE public.assets ENABLE ROW LEVEL SECURITY;

-- Clear old policies
DROP POLICY IF EXISTS "assets_owner_all" ON public.assets;
DROP POLICY IF EXISTS "assets_public_read" ON public.assets;
DROP POLICY IF EXISTS "assets_insert_policy" ON public.assets;
DROP POLICY IF EXISTS "assets_select_policy" ON public.assets;
DROP POLICY IF EXISTS "assets_update_policy" ON public.assets;
DROP POLICY IF EXISTS "assets_delete_policy" ON public.assets;

-- Owners can do everything with their own assets
CREATE POLICY "assets_owner_all" ON public.assets
    FOR ALL TO authenticated
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- Everyone can read public assets (user_id IS NULL)
CREATE POLICY "assets_public_read" ON public.assets
    FOR SELECT USING (user_id IS NULL);

-- Admin override (Optional: if you have an admin role)
-- CREATE POLICY "admin_all_assets" ON public.assets
--     FOR ALL TO authenticated
--     USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin'));
