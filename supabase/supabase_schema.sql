-- Planners table
CREATE TABLE planners (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL,
    name TEXT NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('Calendar', 'Notes', 'Custom')),
    cover_url TEXT,
    structure TEXT NOT NULL CHECK (structure IN ('Annual', 'Monthly', 'Weekly', 'Freeform')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Pages table
CREATE TABLE pages (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    planner_id UUID NOT NULL REFERENCES planners(id) ON DELETE CASCADE,
    template_id UUID,
    page_number INTEGER NOT NULL,
    elements JSONB DEFAULT '[]',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Templates table
CREATE TABLE templates (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    category TEXT NOT NULL,
    thumbnail_url TEXT,
    content_url TEXT,
    is_public BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Stickers/Assets table
CREATE TABLE assets (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    category TEXT,
    url TEXT NOT NULL,
    is_public BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_planners_user_id ON planners(user_id);
CREATE INDEX idx_pages_planner_id ON pages(planner_id);
CREATE INDEX idx_templates_category ON templates(category);
CREATE INDEX idx_assets_category ON assets(category);

-- Row Level Security (RLS) Policies
ALTER TABLE planners ENABLE ROW LEVEL SECURITY;
ALTER TABLE pages ENABLE ROW LEVEL SECURITY;

-- Users can only see their own planners
CREATE POLICY "Users can view own planners" ON planners
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own planners" ON planners
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own planners" ON planners
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own planners" ON planners
    FOR DELETE USING (auth.uid() = user_id);

-- Users can only see pages from their own planners
CREATE POLICY "Users can view own pages" ON pages
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM planners
            WHERE planners.id = pages.planner_id
            AND planners.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can insert own pages" ON pages
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM planners
            WHERE planners.id = pages.planner_id
            AND planners.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can update own pages" ON pages
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM planners
            WHERE planners.id = pages.planner_id
            AND planners.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can delete own pages" ON pages
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM planners
            WHERE planners.id = pages.planner_id
            AND planners.user_id = auth.uid()
        )
    );

-- Templates and assets are public
CREATE POLICY "Templates are viewable by everyone" ON templates
    FOR SELECT USING (is_public = true);

CREATE POLICY "Assets are viewable by everyone" ON assets
    FOR SELECT USING (is_public = true);
