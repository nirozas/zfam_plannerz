-- Zoabi Planner: Schema Update for PDF Import Features
-- Run this in your Supabase SQL Editor

-- Add missing columns to pages table for PDF import and page management
ALTER TABLE pages 
ADD COLUMN IF NOT EXISTS links JSONB DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS dimensions JSONB,
ADD COLUMN IF NOT EXISTS layout TEXT;

-- Add comment for documentation
COMMENT ON COLUMN pages.links IS 'Array of clickable hotspot links extracted from PDF or manually added';
COMMENT ON COLUMN pages.dimensions IS 'Page dimensions as {width: number, height: number}';
COMMENT ON COLUMN pages.layout IS 'Page layout type: portrait, landscape, square, double-width, widescreen, or custom';

-- Create index on layout for faster filtering
CREATE INDEX IF NOT EXISTS idx_pages_layout ON pages(layout);
