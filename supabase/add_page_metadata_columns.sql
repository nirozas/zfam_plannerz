-- Zoabi Planner: Metadata Enhancement for Pages Table
-- Run this in your Supabase SQL Editor to support Year, Month, Category, and Section controls.

-- 1. Add missing metadata columns to pages table
ALTER TABLE pages 
ADD COLUMN IF NOT EXISTS year INTEGER,
ADD COLUMN IF NOT EXISTS month TEXT,
ADD COLUMN IF NOT EXISTS category TEXT,
ADD COLUMN IF NOT EXISTS section TEXT DEFAULT 'General';

-- 2. Add comments for documentation
COMMENT ON COLUMN pages.year IS 'The calendar year associated with the page (e.g., 2025)';
COMMENT ON COLUMN pages.month IS 'The month abbreviated name (JAN, FEB, etc.)';
COMMENT ON COLUMN pages.category IS 'The high-level category: Productivity, Wellness, Finance, Academic, Lifestyle, General';
COMMENT ON COLUMN pages.section IS 'The specific section within the category (e.g., Daily Schedule, Budgets, etc.)';

-- 3. Create indexes for high-performance filtering and search
CREATE INDEX IF NOT EXISTS idx_pages_year ON pages(year);
CREATE INDEX IF NOT EXISTS idx_pages_month ON pages(month);
CREATE INDEX IF NOT EXISTS idx_pages_category ON pages(category);
CREATE INDEX IF NOT EXISTS idx_pages_section ON pages(section);

-- 4. Verify the pages table structure
SELECT 
    column_name, 
    data_type, 
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_name = 'pages'
  AND column_name IN ('year', 'month', 'category', 'section')
ORDER BY ordinal_position;
