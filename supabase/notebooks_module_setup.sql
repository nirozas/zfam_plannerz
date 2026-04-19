-- ==========================================
-- ZOABI PLANNER: NOTEBOOKS MODULE SCHEMA
-- ==========================================
-- This schema supports a database-backed alternative to the 
-- current Google Drive JSON storage. 
-- It enables multi-user collaboration and faster metadata queries.

-- 1. Notebooks Table
CREATE TABLE IF NOT EXISTS public.notebooks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    last_page_id UUID,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Section Groups (Optional nesting)
CREATE TABLE IF NOT EXISTS public.notebook_section_groups (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    notebook_id UUID NOT NULL REFERENCES public.notebooks(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    "order" INTEGER DEFAULT 0
);

-- 3. Sections
CREATE TABLE IF NOT EXISTS public.notebook_sections (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    notebook_id UUID NOT NULL REFERENCES public.notebooks(id) ON DELETE CASCADE,
    group_id UUID REFERENCES public.notebook_section_groups(id) ON DELETE SET NULL,
    name TEXT NOT NULL,
    color TEXT DEFAULT '#6366f1',
    "order" INTEGER DEFAULT 0
);

-- 4. Pages
CREATE TABLE IF NOT EXISTS public.notebook_pages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    section_id UUID NOT NULL REFERENCES public.notebook_sections(id) ON DELETE CASCADE,
    title TEXT NOT NULL DEFAULT 'Untitled Page',
    orientation TEXT DEFAULT 'portrait', -- portrait, landscape
    template TEXT DEFAULT 'blank', -- blank, lined, grid, dotted
    is_subpage BOOLEAN DEFAULT false,
    parent_id UUID REFERENCES public.notebook_pages(id) ON DELETE CASCADE,
    due_date TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    "order" INTEGER DEFAULT 0
);

-- 5. Page Elements (Text, Images, Drawings)
-- Using JSONB for 'properties' to handle diverse element attributes 
-- (font, filters, stroke points, etc.) without rigid columns.
CREATE TABLE IF NOT EXISTS public.notebook_elements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    page_id UUID NOT NULL REFERENCES public.notebook_pages(id) ON DELETE CASCADE,
    type TEXT NOT NULL, -- text, image, path
    x FLOAT NOT NULL DEFAULT 0,
    y FLOAT NOT NULL DEFAULT 0,
    width FLOAT,
    height FLOAT,
    rotation FLOAT DEFAULT 0,
    z_index INTEGER DEFAULT 0,
    properties JSONB NOT NULL DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.notebooks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notebook_section_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notebook_sections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notebook_pages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notebook_elements ENABLE ROW LEVEL SECURITY;

-- RLS Policies (Owner Access Only)
CREATE POLICY "Users can manage their own notebooks"
ON public.notebooks FOR ALL
USING (auth.uid() = user_id);

CREATE POLICY "Users can manage groups of their notebooks"
ON public.notebook_section_groups FOR ALL
USING (EXISTS (SELECT 1 FROM public.notebooks WHERE id = notebook_id AND user_id = auth.uid()));

CREATE POLICY "Users can manage sections of their notebooks"
ON public.notebook_sections FOR ALL
USING (EXISTS (SELECT 1 FROM public.notebooks WHERE id = notebook_id AND user_id = auth.uid()));

CREATE POLICY "Users can manage pages in their sections"
ON public.notebook_pages FOR ALL
USING (EXISTS (
    SELECT 1 FROM public.notebook_sections s
    JOIN public.notebooks n ON s.notebook_id = n.id
    WHERE s.id = section_id AND n.user_id = auth.uid()
));

CREATE POLICY "Users can manage elements on their pages"
ON public.notebook_elements FOR ALL
USING (EXISTS (
    SELECT 1 FROM public.notebook_pages p
    JOIN public.notebook_sections s ON p.section_id = s.id
    JOIN public.notebooks n ON s.notebook_id = n.id
    WHERE p.id = page_id AND n.user_id = auth.uid()
));

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_notebooks_user_id ON public.notebooks(user_id);
CREATE INDEX IF NOT EXISTS idx_sections_notebook_id ON public.notebook_sections(notebook_id);
CREATE INDEX IF NOT EXISTS idx_pages_section_id ON public.notebook_pages(section_id);
CREATE INDEX IF NOT EXISTS idx_elements_page_id ON public.notebook_elements(page_id);
