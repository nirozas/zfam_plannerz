-- Zoabi Planner: Full-Text Search (FTS) Migration
-- Run this in your Supabase SQL Editor

-- 1. Add Search Columns to pages table
ALTER TABLE pages 
ADD COLUMN IF NOT EXISTS searchable_text TEXT,
ADD COLUMN IF NOT EXISTS ink_transcription TEXT,
ADD COLUMN IF NOT EXISTS search_vector tsvector;

-- 2. Create GIN index for fast searching
CREATE INDEX IF NOT EXISTS idx_pages_search_vector ON pages USING gin(search_vector);

-- 3. Create Trigger Function to auto-update search_vector
CREATE OR REPLACE FUNCTION pages_update_search_vector() RETURNS trigger AS $$
BEGIN
  -- We prioritize Page Name (A), then searchable_text from text boxes (B), then ink_transcription (C)
  NEW.search_vector := 
    setweight(to_tsvector('english', coalesce(NEW.name, '')), 'A') ||
    setweight(to_tsvector('english', coalesce(NEW.searchable_text, '')), 'B') ||
    setweight(to_tsvector('english', coalesce(NEW.ink_transcription, '')), 'C');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 4. Create Trigger
DROP TRIGGER IF EXISTS tr_pages_search_vector ON pages;
CREATE TRIGGER tr_pages_search_vector 
BEFORE INSERT OR UPDATE ON pages
FOR EACH ROW EXECUTE FUNCTION pages_update_search_vector();

-- 5. Global Search RPC function
-- Searches both Planners (by title) and Pages (by title & content)
CREATE OR REPLACE FUNCTION global_search(query_text TEXT)
RETURNS TABLE (
    type TEXT,
    id UUID,
    planner_id UUID,
    name TEXT,
    page_index INTEGER,
    snippet TEXT,
    rank REAL
) AS $$
BEGIN
    RETURN QUERY
    -- A: Search in Planners (Matches title)
    SELECT 
        'planner'::TEXT as type,
        p.id,
        p.id as planner_id,
        p.name,
        0 as page_index,
        p.name as snippet,
        ts_rank_cd(to_tsvector('english', p.name), websearch_to_tsquery('english', query_text))::REAL as rank
    FROM planners p
    WHERE to_tsvector('english', p.name) @@ websearch_to_tsquery('english', query_text)
       OR p.name ILIKE '%' || query_text || '%' -- Support partial matches as requested
    
    UNION ALL
    
    -- B: Search in Pages (Matches title OR content)
    SELECT 
        'page'::TEXT as type,
        pg.id,
        pg.planner_id,
        pg.name,
        pg.page_number as page_index,
        ts_headline('english', 
            coalesce(pg.name, '') || ' ' || 
            coalesce(pg.searchable_text, '') || ' ' || 
            coalesce(pg.ink_transcription, ''), 
            websearch_to_tsquery('english', query_text)
        ) as snippet,
        ts_rank_cd(pg.search_vector, websearch_to_tsquery('english', query_text))::REAL as rank
    FROM pages pg
    WHERE pg.search_vector @@ websearch_to_tsquery('english', query_text)
       OR pg.name ILIKE '%' || query_text || '%'
       OR pg.searchable_text ILIKE '%' || query_text || '%'
       OR pg.ink_transcription ILIKE '%' || query_text || '%'
    
    ORDER BY rank DESC, name ASC;
END;
$$ LANGUAGE plpgsql;
