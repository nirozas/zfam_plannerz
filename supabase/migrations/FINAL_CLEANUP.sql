-- Final cleanup and grouping support for cards
BEGIN;

-- 1. Drop unused columns from cards
ALTER TABLE public.cards DROP COLUMN IF EXISTS review;
ALTER TABLE public.cards DROP COLUMN IF EXISTS remarks;

-- 2. Add 'groups' column for structured list data if not exists
-- This allows organizing list items into named groups (e.g., "Category A", "Category B")
ALTER TABLE public.cards ADD COLUMN IF NOT EXISTS groups JSONB DEFAULT '[]'::jsonb;

-- 3. Ensure 'canvas_data' is present
ALTER TABLE public.cards ADD COLUMN IF NOT EXISTS canvas_data JSONB DEFAULT '[]'::jsonb;

-- 4. Fix task assignments - ensure assigned_to and assigned_by are available
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS assigned_to UUID REFERENCES auth.users(id) ON DELETE SET NULL;
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS assigned_by UUID REFERENCES auth.users(id) ON DELETE SET NULL;

-- 5. Add category column to cards if missing and then add index
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'cards' AND column_name = 'category') THEN
        ALTER TABLE public.cards ADD COLUMN category TEXT;
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_cards_category ON public.cards(category);
CREATE INDEX IF NOT EXISTS idx_tasks_assigned_to ON public.tasks(assigned_to);

COMMIT;
