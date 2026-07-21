-- COMPREHENSIVE FIX FOR CARDS TABLE
-- Ensures all columns exist for ListEditor and Rating features
-- Fixes RLS to allow shared users to edit

BEGIN;

-- 1. Ensure type exists
DO $$ BEGIN
    CREATE TYPE public.card_type AS ENUM ('folder', 'list');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- 2. Ensure table exists with all required columns
CREATE TABLE IF NOT EXISTS public.cards (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- 3. Add/Ensure all columns one by one
DO $$ 
BEGIN
    -- Core fields
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'cards' AND column_name = 'parent_id') THEN
        ALTER TABLE public.cards ADD COLUMN parent_id UUID REFERENCES public.cards(id) ON DELETE CASCADE;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'cards' AND column_name = 'type') THEN
        ALTER TABLE public.cards ADD COLUMN type public.card_type NOT NULL DEFAULT 'folder';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'cards' AND column_name = 'title') THEN
        ALTER TABLE public.cards ADD COLUMN title TEXT NOT NULL DEFAULT 'Untitled';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'cards' AND column_name = 'description') THEN
        ALTER TABLE public.cards ADD COLUMN description TEXT;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'cards' AND column_name = 'content') THEN
        ALTER TABLE public.cards ADD COLUMN content TEXT;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'cards' AND column_name = 'rating') THEN
        ALTER TABLE public.cards ADD COLUMN rating INT CHECK (rating >= 0 AND rating <= 5);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'cards' AND column_name = 'category') THEN
        ALTER TABLE public.cards ADD COLUMN category TEXT DEFAULT 'uncategorized';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'cards' AND column_name = 'url') THEN
        ALTER TABLE public.cards ADD COLUMN url TEXT;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'cards' AND column_name = 'has_body') THEN
        ALTER TABLE public.cards ADD COLUMN has_body BOOLEAN DEFAULT true;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'cards' AND column_name = 'cover_image') THEN
        ALTER TABLE public.cards ADD COLUMN cover_image TEXT;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'cards' AND column_name = 'background_url') THEN
        ALTER TABLE public.cards ADD COLUMN background_url TEXT;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'cards' AND column_name = 'background_type') THEN
        ALTER TABLE public.cards ADD COLUMN background_type TEXT CHECK (background_type IN ('color', 'image'));
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'cards' AND column_name = 'background_opacity') THEN
        ALTER TABLE public.cards ADD COLUMN background_opacity INT DEFAULT 100;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'cards' AND column_name = 'notes') THEN
        ALTER TABLE public.cards ADD COLUMN notes JSONB DEFAULT '[]'::jsonb;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'cards' AND column_name = 'canvas_data') THEN
        ALTER TABLE public.cards ADD COLUMN canvas_data JSONB DEFAULT '[]'::jsonb;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'cards' AND column_name = 'groups') THEN
        ALTER TABLE public.cards ADD COLUMN groups JSONB DEFAULT '[]'::jsonb;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'cards' AND column_name = 'shared_with') THEN
        ALTER TABLE public.cards ADD COLUMN shared_with UUID[] DEFAULT '{}';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'cards' AND column_name = 'width') THEN
        ALTER TABLE public.cards ADD COLUMN width FLOAT;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'cards' AND column_name = 'height') THEN
        ALTER TABLE public.cards ADD COLUMN height FLOAT;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'cards' AND column_name = 'last_viewed_at') THEN
        ALTER TABLE public.cards ADD COLUMN last_viewed_at TIMESTAMPTZ DEFAULT NOW();
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'cards' AND column_name = 'updated_at') THEN
        ALTER TABLE public.cards ADD COLUMN updated_at TIMESTAMPTZ DEFAULT NOW();
    END IF;
    
    -- Cleanup deprecated columns
    ALTER TABLE public.cards DROP COLUMN IF EXISTS review;
    ALTER TABLE public.cards DROP COLUMN IF EXISTS remarks;
END $$;

-- 4. Enable Realtime
ALTER TABLE public.cards REPLICA IDENTITY FULL;

-- 5. Fix RLS - Enable shared access and owner access
ALTER TABLE public.cards ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "cards_owner_access" ON public.cards;
CREATE POLICY "cards_owner_access" ON public.cards FOR ALL USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "cards_shared_access" ON public.cards;
CREATE POLICY "cards_shared_access" ON public.cards FOR ALL 
USING (auth.uid() = ANY(shared_with))
WITH CHECK (auth.uid() = ANY(shared_with));

-- 6. Add indices for common queries
CREATE INDEX IF NOT EXISTS idx_cards_user_id ON public.cards(user_id);
CREATE INDEX IF NOT EXISTS idx_cards_parent_id ON public.cards(parent_id);
CREATE INDEX IF NOT EXISTS idx_cards_category ON public.cards(category);

COMMIT;
