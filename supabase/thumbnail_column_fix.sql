-- Add thumbnail_url column to assets table
ALTER TABLE public.assets 
ADD COLUMN IF NOT EXISTS thumbnail_url TEXT DEFAULT NULL;

-- Ensure RLS policies allow access (usually existing policies cover all columns, but good to check)
-- No RLS changes needed for adding a column typically, unless specific column security is in place.
