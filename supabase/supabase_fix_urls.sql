-- FIX BROKEN IMAGE URLS
-- This script updates the assets to use working public placeholder services
-- so you can see images immediately without needing to upload files.

-- 1. Fix Templates: Point to a placeholder service that generates images with the title
UPDATE public.assets 
SET url = 'https://placehold.co/600x800/f1f5f9/6366f1/png?text=' || replace(title, ' ', '+')
WHERE type = 'template';

-- 2. Fix Stickers: Ensure we use a reliable Dicebear endpoint (using "bottts" or "initials" as they are very reliable)
-- Switched to 'shapes' or 'icons' or 'identicon' style for generic stickers
UPDATE public.assets 
SET url = 'https://api.dicebear.com/9.x/shapes/svg?seed=' || title
WHERE type = 'sticker';

-- 3. Fix Covers: Use a placeholder book cover style
UPDATE public.assets 
SET url = 'https://placehold.co/400x600/1e293b/FFFFFF/png?text=' || replace(title, ' ', '+')
WHERE type = 'cover';
