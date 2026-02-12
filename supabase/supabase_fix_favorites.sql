-- Run this specific command to fix the missing column error.
-- It is safe to run even if the column already exists (it will do nothing in that case).

ALTER TABLE public.planners ADD COLUMN IF NOT EXISTS is_favorite BOOLEAN DEFAULT false;
