-- Add canvas_data column to cards table for ListEditor shapes
ALTER TABLE public.cards ADD COLUMN IF NOT EXISTS canvas_data JSONB DEFAULT '[]'::jsonb;

-- Ensure all necessary columns for ListEditor are present
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'cards' AND column_name = 'has_body') THEN
        ALTER TABLE public.cards ADD COLUMN has_body BOOLEAN DEFAULT true;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'cards' AND column_name = 'background_url') THEN
        ALTER TABLE public.cards ADD COLUMN background_url TEXT;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'cards' AND column_name = 'background_type') THEN
        ALTER TABLE public.cards ADD COLUMN background_type TEXT CHECK (background_type IN ('color', 'image'));
    END IF;
END $$;
