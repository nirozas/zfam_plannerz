-- Migration to add title_slot to notebook_pages table

DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_schema = 'public' 
                   AND table_name = 'notebook_pages' 
                   AND column_name = 'title_slot') THEN
        ALTER TABLE public.notebook_pages ADD COLUMN title_slot TEXT DEFAULT 'none';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_schema = 'public' 
                   AND table_name = 'notebook_pages' 
                   AND column_name = 'title_font_family') THEN
        ALTER TABLE public.notebook_pages ADD COLUMN title_font_family TEXT;
        ALTER TABLE public.notebook_pages ADD COLUMN title_font_size INTEGER;
        ALTER TABLE public.notebook_pages ADD COLUMN title_color TEXT;
        ALTER TABLE public.notebook_pages ADD COLUMN title_text TEXT;
    END IF;
END $$;
