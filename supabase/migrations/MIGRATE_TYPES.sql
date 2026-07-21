-- Final Migration to ensure all card types are compatible and indices are optimized
BEGIN;

-- 1. Ensure 'list' and 'folder' are the only primary types in use
UPDATE public.cards SET type = 'list' WHERE type = 'entry';

-- 2. Add missing columns if any from recent features
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'cards' AND column_name = 'background_opacity') THEN
        ALTER TABLE public.cards ADD COLUMN background_opacity INT DEFAULT 100;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'cards' AND column_name = 'sentiment') THEN
        -- Though sentiment is currently inside the JSONB notes, having a top-level summary could be useful
        -- For now, we'll stick to the JSONB structure as implemented in types/cards.ts
    END IF;
END $$;

-- 3. Optimization: Add indices for path-based lookups (parent_id)
CREATE INDEX IF NOT EXISTS idx_cards_parent_id ON public.cards(parent_id);
CREATE INDEX IF NOT EXISTS idx_cards_user_id ON public.cards(user_id);
CREATE INDEX IF NOT EXISTS idx_cards_type ON public.cards(type);

COMMIT;
