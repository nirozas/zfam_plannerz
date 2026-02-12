-- ==========================================
-- MEGA STICKER PACK SEED SCRIPT (500 ITEMS)
-- ==========================================

DO $$
DECLARE
    i INTEGER;
    sticker_url TEXT;
    sticker_title TEXT;
    sticker_category TEXT;
    sticker_hashtags TEXT[];
BEGIN
    -- 1. Notionists (200 stickers) - Minimalist/Professional
    FOR i IN 1..200
    LOOP
        sticker_url := 'https://api.dicebear.com/7.x/notionists/svg?seed=' || i;
        sticker_title := 'Notionist Sticker ' || i;
        sticker_category := 'Professional';
        sticker_hashtags := ARRAY['minimalist', 'notion', 'aesthetic'];
        
        INSERT INTO public.assets (user_id, title, type, url, category, hashtags)
        VALUES (NULL, sticker_title, 'sticker', sticker_url, sticker_category, sticker_hashtags)
        ON CONFLICT DO NOTHING;
    END LOOP;

    -- 2. Functional Icons (100 stickers)
    FOR i IN 1..100
    LOOP
        sticker_url := 'https://api.dicebear.com/7.x/icons/svg?seed=' || (i + 500);
        sticker_title := 'Functional Icon ' || i;
        sticker_category := 'Functional';
        sticker_hashtags := ARRAY['icon', 'ui', 'utility'];
        
        INSERT INTO public.assets (user_id, title, type, url, category, hashtags)
        VALUES (NULL, sticker_title, 'sticker', sticker_url, sticker_category, sticker_hashtags)
        ON CONFLICT DO NOTHING;
    END LOOP;

    -- 3. Fun Emojis (100 stickers)
    FOR i IN 1..100
    LOOP
        sticker_url := 'https://api.dicebear.com/7.x/fun-emoji/svg?seed=' || (i + 1000);
        sticker_title := 'Emoji Sticker ' || i;
        sticker_category := 'Decorative';
        sticker_hashtags := ARRAY['emoji', 'fun', 'cute'];
        
        INSERT INTO public.assets (user_id, title, type, url, category, hashtags)
        VALUES (NULL, sticker_title, 'sticker', sticker_url, sticker_category, sticker_hashtags)
        ON CONFLICT DO NOTHING;
    END LOOP;

    -- 4. Lorelei Characters (100 stickers) - Cute
    FOR i IN 1..100
    LOOP
        sticker_url := 'https://api.dicebear.com/7.x/lorelei/svg?seed=' || (i + 1500);
        sticker_title := 'Cute character ' || i;
        sticker_category := 'Characters';
        sticker_hashtags := ARRAY['cute', 'illustrative', 'vibrant'];
        
        INSERT INTO public.assets (user_id, title, type, url, category, hashtags)
        VALUES (NULL, sticker_title, 'sticker', sticker_url, sticker_category, sticker_hashtags)
        ON CONFLICT DO NOTHING;
    END LOOP;
END $$;

-- Verify insertion
SELECT category, count(*) FROM public.assets WHERE type = 'sticker' GROUP BY category;
