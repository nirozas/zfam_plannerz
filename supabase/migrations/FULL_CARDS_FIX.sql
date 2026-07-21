-- ============================================================
-- COMPREHENSIVE FIX FOR CARDS TABLE (RUN THIS IN SUPABASE SQL EDITOR)
-- ============================================================

-- 1. Ensure the core types exist in the public.card_type enum
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'folder' AND enumtypid = 'public.card_type'::regtype) THEN
        ALTER TYPE public.card_type ADD VALUE 'folder';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'list' AND enumtypid = 'public.card_type'::regtype) THEN
        ALTER TYPE public.card_type ADD VALUE 'list';
    END IF;
EXCEPTION WHEN OTHERS THEN
    -- If the type doesn't exist at all, create it
    CREATE TYPE public.card_type AS ENUM ('folder', 'list');
END $$;

-- 2. Ensure all columns exist in the public.cards table
DO $$ BEGIN
    -- Add category for grouping
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'cards' AND column_name = 'category') THEN
        ALTER TABLE public.cards ADD COLUMN category TEXT;
    END IF;

    -- Add background_opacity for transparency feature
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'cards' AND column_name = 'background_opacity') THEN
        ALTER TABLE public.cards ADD COLUMN background_opacity INT DEFAULT 100;
    END IF;

    -- Add rating for the new star system
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'cards' AND column_name = 'rating') THEN
        ALTER TABLE public.cards ADD COLUMN rating INT CHECK (rating >= 0 AND rating <= 5);
    END IF;

    -- Add review column if missing
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'cards' AND column_name = 'review') THEN
        ALTER TABLE public.cards ADD COLUMN review TEXT;
    END IF;

    -- Add notes column (JSONB) if missing
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'cards' AND column_name = 'notes') THEN
        ALTER TABLE public.cards ADD COLUMN notes JSONB DEFAULT '[]'::jsonb;
    END IF;
    
    -- Ensure content column exists
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'cards' AND column_name = 'content') THEN
        ALTER TABLE public.cards ADD COLUMN content TEXT;
    END IF;
END $$;

-- 3. Confirm Column Types and Constraints
ALTER TABLE public.cards ALTER COLUMN background_opacity SET DEFAULT 100;
ALTER TABLE public.cards ALTER COLUMN notes SET DEFAULT '[]'::jsonb;

-- 4. Verify RLS (Row Level Security)
-- This ensures you can actually read/write your own cards
ALTER TABLE public.cards ENABLE ROW LEVEL SECURITY;

-- Re-create simple policy if it's missing
CREATE POLICY "Users can manage their own cards" ON public.cards
    FOR ALL USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- 5. SUCCESS NOTIFICATION
SELECT 'Database successfully synchronized with Cards Page features' as status;
