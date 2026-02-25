-- SQL Script to ensure 'entry' type exists in card_type enum
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'entry' AND enumtypid = 'public.card_type'::regtype) THEN
        ALTER TYPE public.card_type ADD VALUE 'entry';
    END IF;
END $$;
