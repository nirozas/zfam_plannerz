-- ==========================================
-- ASSET HUB SEED SCRIPT
-- ==========================================

-- 1. Ensure columns exist
ALTER TABLE public.assets ADD COLUMN IF NOT EXISTS hashtags TEXT[] DEFAULT '{}';
ALTER TABLE public.assets ADD COLUMN IF NOT EXISTS category TEXT DEFAULT 'uncategorized';

-- 2. Clean existing public assets to avoid duplicates (optional, use with CAUTION)
-- DELETE FROM public.assets WHERE user_id IS NULL;

-- 3. Seed Templates (12 categories x 12 items = 144 items)
DO $$
DECLARE
    categories TEXT[] := ARRAY['Annual', 'Monthly', 'Weekly', 'Daily', 'Finance', 'Goals', 'Notes', 'Mood/Habit Tracker', 'Exercise Tracker', 'Kawaii', 'Routines', 'Chores'];
    cat TEXT;
    i INTEGER;
BEGIN
    FOREACH cat IN ARRAY categories
    LOOP
        FOR i IN 1..12
        LOOP
            INSERT INTO public.assets (user_id, title, type, url, category, hashtags, is_favorite)
            VALUES (
                NULL, 
                cat || ' Template ' || i, 
                'template', 
                'templates/' || lower(replace(cat, ' ', '_')) || '_' || i || '.png', 
                cat, 
                ARRAY[lower(replace(cat, ' ', '')), 'planner', 'organize'], 
                (i % 5 = 0)
            )
            ON CONFLICT DO NOTHING;
        END LOOP;
    END LOOP;
END $$;

-- 4. Seed Sticker Categories (Structure for 1000+)
-- We won't seed 1000 items here, but we'll seed samples for major groups
DO $$
DECLARE
    sticker_groups TEXT[] := ARRAY['Animals', 'Nature', 'Weather', 'Food', 'Travel', 'Work', 'School', 'Home', 'Health', 'Hobbies', 'Emotions', 'Shapes', 'Arrows', 'Banners', 'Quotes'];
    grp TEXT;
    i INTEGER;
BEGIN
    FOREACH grp IN ARRAY sticker_groups
    LOOP
        FOR i IN 1..10
        LOOP
            INSERT INTO public.assets (user_id, title, type, url, category, hashtags)
            VALUES (
                NULL, 
                grp || ' Sticker ' || i, 
                'sticker', 
                'https://api.dicebear.com/7.x/icons/svg?seed=' || grp || i, 
                grp, 
                ARRAY[lower(grp), 'cute', 'sticker']
            )
            ON CONFLICT DO NOTHING;
        END LOOP;
    END LOOP;
END $$;
