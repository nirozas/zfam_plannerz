-- Comprehensive template system upgrade schema
ALTER TABLE templates ADD COLUMN IF NOT EXISTS preview_url TEXT;
ALTER TABLE templates ADD COLUMN IF NOT EXISTS page_size VARCHAR(50) DEFAULT 'A4';
ALTER TABLE templates ADD COLUMN IF NOT EXISTS orientation VARCHAR(20) DEFAULT 'portrait';
ALTER TABLE templates ADD COLUMN IF NOT EXISTS template_data JSONB;
ALTER TABLE templates ADD COLUMN IF NOT EXISTS hashtags TEXT[];
ALTER TABLE templates ADD COLUMN IF NOT EXISTS is_calendar BOOLEAN DEFAULT FALSE;
ALTER TABLE templates ADD COLUMN IF NOT EXISTS calendar_type VARCHAR(50); -- 'yearly', 'monthly', 'weekly', 'daily'

-- Create index for hashtags (requires pg_trgm or just gin for arrays)
CREATE INDEX IF NOT EXISTS idx_templates_hashtags ON templates USING GIN(hashtags);
