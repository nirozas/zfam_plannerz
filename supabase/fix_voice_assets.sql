-- ==========================================
-- FIX VOICE ASSET SCHEMA & PERMISSIONS
-- ==========================================
-- This script aligns the 'assets' table with the requirements for voice notes.
-- Run this in your Supabase SQL Editor.

-- 1. Check and add missing columns to 'assets' table
DO $$ 
BEGIN
    -- Add user_id if missing
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'assets' AND column_name = 'user_id') THEN
        ALTER TABLE public.assets ADD COLUMN user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;
    END IF;

    -- Add title if missing (some old versions used 'name')
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'assets' AND column_name = 'title') THEN
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'assets' AND column_name = 'name') THEN
            ALTER TABLE public.assets RENAME COLUMN name TO title;
        ELSE
            ALTER TABLE public.assets ADD COLUMN title TEXT;
        END IF;
    END IF;

    -- Add type if missing
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'assets' AND column_name = 'type') THEN
        ALTER TABLE public.assets ADD COLUMN type TEXT;
    END IF;

    -- Add hashtags if missing
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'assets' AND column_name = 'hashtags') THEN
        ALTER TABLE public.assets ADD COLUMN hashtags TEXT[] DEFAULT '{}';
    END IF;

    -- Add metadata if missing
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'assets' AND column_name = 'metadata') THEN
        ALTER TABLE public.assets ADD COLUMN metadata JSONB DEFAULT '{}';
    END IF;
END $$;

-- 2. Update the 'type' check constraint to allow 'voice'
-- First, drop the old constraint if it exists (it might have different names depending on when it was created)
DO $$ 
DECLARE
    const_name TEXT;
BEGIN
    SELECT constraint_name INTO const_name
    FROM information_schema.table_constraints
    WHERE table_name = 'assets' AND constraint_type = 'CHECK' AND constraint_name LIKE '%type%';
    
    IF const_name IS NOT NULL THEN
        EXECUTE 'ALTER TABLE public.assets DROP CONSTRAINT ' || const_name;
    END IF;
END $$;

-- Add the new, comprehensive constraint
ALTER TABLE public.assets ADD CONSTRAINT assets_type_check 
CHECK (type IN ('sticker', 'template', 'image', 'cover', 'voice'));

-- 3. Update RLS policies for Asset Hub
ALTER TABLE public.assets ENABLE ROW LEVEL SECURITY;

-- Clear old policies
DROP POLICY IF EXISTS "assets_visibility" ON public.assets;
DROP POLICY IF EXISTS "debug_assets_select" ON public.assets;
DROP POLICY IF EXISTS "assets_owner_write" ON public.assets;

-- Users can see public assets OR their own assets
CREATE POLICY "assets_select_policy" ON public.assets
    FOR SELECT USING (user_id IS NULL OR auth.uid() = user_id);

-- Authenticated users can insert their own assets
CREATE POLICY "assets_insert_policy" ON public.assets
    FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

-- Owners can update/delete their own assets
CREATE POLICY "assets_update_policy" ON public.assets
    FOR UPDATE TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "assets_delete_policy" ON public.assets
    FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- ==========================================
-- ASSETS SCHEMA FIXED SUCCESSFULLY
-- ==========================================
