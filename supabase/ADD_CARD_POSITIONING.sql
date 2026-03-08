-- ADD POSITIONING AND SORT ORDER TO CARDS
-- Supports "Arrange randomly" (via x/y) and "Drag and drop reordering" (via sort_order)

BEGIN;

DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'cards' AND column_name = 'x') THEN
        ALTER TABLE public.cards ADD COLUMN x FLOAT DEFAULT 0;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'cards' AND column_name = 'y') THEN
        ALTER TABLE public.cards ADD COLUMN y FLOAT DEFAULT 0;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'cards' AND column_name = 'sort_order') THEN
        ALTER TABLE public.cards ADD COLUMN sort_order INT DEFAULT 0;
    END IF;
END $$;

COMMIT;
