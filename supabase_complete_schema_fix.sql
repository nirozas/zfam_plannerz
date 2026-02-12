-- Zoabi Planner: Complete Schema Update for Pages Table
-- Run this in your Supabase SQL Editor

-- Add ALL missing columns to pages table
ALTER TABLE pages 
ADD COLUMN IF NOT EXISTS section TEXT DEFAULT 'General',
ADD COLUMN IF NOT EXISTS links JSONB DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS dimensions JSONB,
ADD COLUMN IF NOT EXISTS layout TEXT;

-- Add comments for documentation
COMMENT ON COLUMN pages.section IS 'Page section/category: General, Daily, Weekly, Monthly, Notes, etc.';
COMMENT ON COLUMN pages.links IS 'Array of clickable hotspot links extracted from PDF or manually added';
COMMENT ON COLUMN pages.dimensions IS 'Page dimensions as {width: number, height: number}';
COMMENT ON COLUMN pages.layout IS 'Page layout type: portrait, landscape, square, double-width, widescreen, or custom';

-- Create indexes for faster filtering
CREATE INDEX IF NOT EXISTS idx_pages_section ON pages(section);
CREATE INDEX IF NOT EXISTS idx_pages_layout ON pages(layout);

-- Verify the changes
SELECT 
    column_name, 
    data_type, 
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_name = 'pages'
  AND column_name IN ('section', 'links', 'dimensions', 'layout')
ORDER BY column_name;
