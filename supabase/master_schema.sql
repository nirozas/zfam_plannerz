-- ============================================================
-- ZOABI PLANNER PRO (MASTER SCHEMA)
-- ============================================================
-- This file is the SINGLE SOURCE OF TRUTH for all database setup.
-- Every statement is idempotent (safe to re-run on an existing database).
-- ============================================================

-- 1. EXTENSIONS
-- ============================================================
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 2. ENUMS
-- ============================================================
DO $$ BEGIN
    CREATE TYPE public.task_priority AS ENUM ('low', 'medium', 'high');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    CREATE TYPE public.recurrence_type AS ENUM ('daily', 'weekly', 'monthly', 'yearly');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    CREATE TYPE public.card_type AS ENUM ('folder', 'list');
EXCEPTION WHEN duplicate_object THEN 
    -- If type exists, ensure all values are present
    IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'folder' AND enumtypid = 'public.card_type'::regtype) THEN
        ALTER TYPE public.card_type ADD VALUE 'folder';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'list' AND enumtypid = 'public.card_type'::regtype) THEN
        ALTER TYPE public.card_type ADD VALUE 'list';
    END IF;
END $$;

-- 3. CORE TABLES
-- ============================================================

-- PROFILES
CREATE TABLE IF NOT EXISTS public.profiles (
    id          UUID REFERENCES auth.users ON DELETE CASCADE PRIMARY KEY,
    updated_at  TIMESTAMPTZ DEFAULT NOW(),
    username    TEXT UNIQUE,
    full_name   TEXT,
    avatar_url  TEXT,
    avatar_source TEXT DEFAULT 'supabase',
    avatar_external_id TEXT,
    website     TEXT,
    role        TEXT DEFAULT 'user',
    CONSTRAINT username_length CHECK (char_length(username) >= 3)
);

-- PLANNERS
CREATE TABLE IF NOT EXISTS public.planners (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id         UUID REFERENCES auth.users ON DELETE CASCADE NOT NULL,
    name            TEXT NOT NULL,
    type            TEXT CHECK (type IN ('Calendar', 'Notes', 'Custom')),
    structure       TEXT CHECK (structure IN ('Annual', 'Monthly', 'Weekly', 'Freeform')),
    cover_url       TEXT,
    cover_source    TEXT DEFAULT 'supabase',
    cover_external_id TEXT,
    cover_color     TEXT DEFAULT '#6366f1',
    category        TEXT,
    is_archived     BOOLEAN DEFAULT false,
    is_favorite     BOOLEAN DEFAULT false,
    archived_at     TIMESTAMPTZ,
    last_opened_at  TIMESTAMPTZ DEFAULT NOW(),
    created_at      TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at      TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- PAGES
CREATE TABLE IF NOT EXISTS public.pages (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    planner_id  UUID REFERENCES public.planners(id) ON DELETE CASCADE NOT NULL,
    page_number INTEGER NOT NULL,
    name        TEXT,
    template_id TEXT,
    section     TEXT DEFAULT 'General',
    elements    JSONB DEFAULT '{"lines": []}'::jsonb,
    links       JSONB DEFAULT '[]'::jsonb,
    dimensions  JSONB,
    layout      TEXT,
    searchable_text    TEXT,
    ink_transcription  TEXT,
    search_vector      tsvector,
    created_at  TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at  TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    UNIQUE(planner_id, page_number)
);

-- ASSETS
CREATE TABLE IF NOT EXISTS public.assets (
    id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id       UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    title         TEXT NOT NULL,
    type          TEXT NOT NULL,
    url           TEXT NOT NULL,
    thumbnail_url TEXT,
    category      TEXT DEFAULT 'uncategorized',
    hashtags      TEXT[] DEFAULT '{}',
    metadata      JSONB DEFAULT '{}',
    is_favorite   BOOLEAN DEFAULT false,
    source        TEXT DEFAULT 'supabase',
    external_id   TEXT,
    created_at    TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- TEMPLATES
CREATE TABLE IF NOT EXISTS public.templates (
    id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name          TEXT NOT NULL,
    category      TEXT NOT NULL,
    thumbnail_url TEXT,
    preview_url   TEXT,
    content_url   TEXT,
    page_size     VARCHAR(50) DEFAULT 'A4',
    orientation   VARCHAR(20) DEFAULT 'portrait',
    template_data JSONB,
    hashtags      TEXT[],
    is_calendar   BOOLEAN DEFAULT FALSE,
    calendar_type VARCHAR(50),
    is_public     BOOLEAN DEFAULT true,
    created_at    TIMESTAMPTZ DEFAULT NOW()
);

-- 4. TASKS MODULE
-- ============================================================
CREATE TABLE IF NOT EXISTS public.task_categories (
    id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id    UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    name       TEXT NOT NULL,
    color      TEXT NOT NULL DEFAULT '#6366f1',
    icon       TEXT,
    sort_order INT NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.tasks (
    id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id          UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    category_id      UUID REFERENCES public.task_categories(id) ON DELETE SET NULL,
    title            TEXT NOT NULL,
    description      TEXT,
    priority         public.task_priority NOT NULL DEFAULT 'medium',
    due_date         TIMESTAMPTZ,
    due_time         TIME,
    is_completed     BOOLEAN NOT NULL DEFAULT FALSE,
    is_recurring     BOOLEAN NOT NULL DEFAULT FALSE,
    recurrence_type  public.recurrence_type,
    recurrence_days_of_week  INT[] DEFAULT NULL,
    recurrence_day_of_month  INT DEFAULT NULL,
    recurrence_start_date    DATE DEFAULT NULL,
    recurrence_end_date      DATE DEFAULT NULL,
    date_added       TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
    notifications    JSONB DEFAULT '[]'::jsonb,
    assigned_to      UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    assigned_by      UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    subtasks         JSONB DEFAULT '[]'::jsonb,
    col_span         INT DEFAULT 1,
    row_span         INT DEFAULT 1
);

CREATE TABLE IF NOT EXISTS public.task_completions (
    id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    task_id        UUID NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
    user_id        UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    completed_date DATE NOT NULL,
    created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (task_id, completed_date)
);

CREATE TABLE IF NOT EXISTS public.task_attachments (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    task_id     UUID NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
    user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    storage_url TEXT NOT NULL,
    file_name   TEXT,
    mime_type   TEXT,
    size_bytes  BIGINT,
    sort_order  INT NOT NULL DEFAULT 0,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 5. CONNECTIONS / COLLABORATION
-- ============================================================
CREATE TABLE IF NOT EXISTS public.connections (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    requester_id    UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    receiver_id     UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    status          TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected')),
    connection_type TEXT DEFAULT 'work' CHECK (connection_type IN ('family', 'work')),
    created_at      TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(requester_id, receiver_id)
);

-- 6. TRIPS MODULE
-- ============================================================
CREATE TABLE IF NOT EXISTS public.trips (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    title       TEXT NOT NULL,
    description TEXT,
    location    TEXT,
    start_date  DATE,
    end_date    DATE,
    cover_url   TEXT,
    hashtags    TEXT[] DEFAULT '{}',
    is_archived BOOLEAN DEFAULT FALSE,
    slug        TEXT UNIQUE NOT NULL,
    participants TEXT[] DEFAULT '{}',
    created_at  TIMESTAMPTZ DEFAULT NOW(),
    updated_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.trip_stops (
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    trip_id      UUID NOT NULL REFERENCES public.trips(id) ON DELETE CASCADE,
    title        TEXT NOT NULL,
    address      TEXT,
    notes        TEXT,
    latitude     DOUBLE PRECISION,
    longitude    DOUBLE PRECISION,
    arrival_time TIMESTAMPTZ,
    day_number   INTEGER NOT NULL DEFAULT 1,
    order_index  INTEGER NOT NULL DEFAULT 0,
    created_at   TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.trip_expenses (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    trip_id     UUID NOT NULL REFERENCES public.trips(id) ON DELETE CASCADE,
    amount      NUMERIC(10, 2) NOT NULL,
    date        DATE NOT NULL DEFAULT CURRENT_DATE,
    time        TIME,
    category    TEXT NOT NULL DEFAULT 'Other' CHECK (category IN ('Food', 'Transport', 'Entry', 'Gifts', 'Accommodation', 'Other')),
    description TEXT,
    currency    TEXT NOT NULL DEFAULT 'USD',
    created_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.trip_packing_items (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    trip_id     UUID NOT NULL REFERENCES public.trips(id) ON DELETE CASCADE,
    text        TEXT NOT NULL,
    category    TEXT NOT NULL DEFAULT 'Other',
    is_packed   BOOLEAN DEFAULT FALSE,
    created_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.trip_collaborators (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    trip_id UUID NOT NULL REFERENCES public.trips(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    role TEXT NOT NULL DEFAULT 'viewer' CHECK (role IN ('viewer', 'editor')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(trip_id, user_id)
);

-- 7. RECURSIVE CARDS
-- ============================================================
CREATE TABLE IF NOT EXISTS public.cards (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    parent_id       UUID REFERENCES public.cards(id) ON DELETE CASCADE,
    type            public.card_type NOT NULL DEFAULT 'folder',
    title           TEXT NOT NULL,
    description     TEXT,
    cover_image     TEXT,
    content         TEXT, 
    url             TEXT, 
    has_body        BOOLEAN DEFAULT true,
    width           FLOAT,
    height          FLOAT,
    rating          INT CHECK (rating >= 0 AND rating <= 5),
    review          TEXT,
    background_url  TEXT,
    background_type TEXT CHECK (background_type IN ('color', 'image')),
    notes           JSONB DEFAULT '[]'::jsonb,
    shared_with     UUID[] DEFAULT '{}',
    item_count      INT DEFAULT 0,
    line_count      INT DEFAULT 0,
    category        TEXT, -- For grouping (favorite, priority, etc)
    background_opacity INT DEFAULT 100,
    created_at      TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at      TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    last_viewed_at  TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- 8. SCHEMAL ALIGNMENT (ALTER STATEMENTS)
-- ============================================================
DO $$ BEGIN
    -- Profiles
    ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'user';
    ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS avatar_source TEXT DEFAULT 'supabase';
    ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS avatar_external_id TEXT;
    
    -- Planners
    ALTER TABLE public.planners ADD COLUMN IF NOT EXISTS cover_source TEXT DEFAULT 'supabase';
    ALTER TABLE public.planners ADD COLUMN IF NOT EXISTS cover_external_id TEXT;
    ALTER TABLE public.planners ADD COLUMN IF NOT EXISTS is_favorite BOOLEAN DEFAULT false;
    
    -- Pages
    ALTER TABLE public.pages ADD COLUMN IF NOT EXISTS section TEXT DEFAULT 'General';
    ALTER TABLE public.pages ADD COLUMN IF NOT EXISTS links JSONB DEFAULT '[]'::jsonb;
    ALTER TABLE public.pages ADD COLUMN IF NOT EXISTS dimensions JSONB;
    ALTER TABLE public.pages ADD COLUMN IF NOT EXISTS layout TEXT;
    ALTER TABLE public.pages ADD COLUMN IF NOT EXISTS searchable_text TEXT;
    ALTER TABLE public.pages ADD COLUMN IF NOT EXISTS ink_transcription TEXT;
    ALTER TABLE public.pages ADD COLUMN IF NOT EXISTS search_vector tsvector;
    
    -- Assets
    ALTER TABLE public.assets ADD COLUMN IF NOT EXISTS source TEXT DEFAULT 'supabase';
    ALTER TABLE public.assets ADD COLUMN IF NOT EXISTS external_id TEXT;
    ALTER TABLE public.assets ADD COLUMN IF NOT EXISTS thumbnail_url TEXT;

    -- Trips
    ALTER TABLE public.trips ADD COLUMN IF NOT EXISTS participants TEXT[] DEFAULT '{}';

    -- Cards
    ALTER TABLE public.cards ADD COLUMN IF NOT EXISTS category TEXT;
    ALTER TABLE public.cards ADD COLUMN IF NOT EXISTS background_opacity INT DEFAULT 100;
END $$;

-- Type check for Assets
DO $$ 
DECLARE const_name TEXT;
BEGIN
    SELECT constraint_name INTO const_name FROM information_schema.table_constraints
    WHERE table_name = 'assets' AND constraint_type = 'CHECK' AND (constraint_name LIKE '%type%' OR constraint_name = 'assets_type_check');
    IF const_name IS NOT NULL THEN EXECUTE 'ALTER TABLE public.assets DROP CONSTRAINT ' || const_name; END IF;
END $$;
ALTER TABLE public.assets ADD CONSTRAINT assets_type_check CHECK (type IN ('sticker', 'template', 'image', 'cover', 'voice', 'planner'));

-- 9. FUNCTIONS & TRIGGERS
-- ============================================================

-- updated_at helper
CREATE OR REPLACE FUNCTION public.handle_updated_at() RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

-- Profile creation on signup
CREATE OR REPLACE FUNCTION public.handle_new_user() RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (id, full_name, avatar_url, username)
    VALUES (
        NEW.id,
        NEW.raw_user_meta_data->>'full_name',
        NEW.raw_user_meta_data->>'avatar_url',
        COALESCE(NEW.raw_user_meta_data->>'username', split_part(NEW.email, '@', 1) || '_' || floor(random() * 1000)::text)
    ) ON CONFLICT (id) DO NOTHING;
    RETURN NEW;
END; $$ LANGUAGE plpgsql SECURITY DEFINER;

-- Search vector update
CREATE OR REPLACE FUNCTION pages_update_search_vector() RETURNS trigger AS $$
BEGIN
    NEW.search_vector :=
        setweight(to_tsvector('english', coalesce(NEW.name, '')), 'A') ||
        setweight(to_tsvector('english', coalesce(NEW.searchable_text, '')), 'B') ||
        setweight(to_tsvector('english', coalesce(NEW.ink_transcription, '')), 'C');
    RETURN NEW;
END; $$ LANGUAGE plpgsql;

-- Bucket policy helper
CREATE OR REPLACE FUNCTION public.setup_bucket_policies(bucket_name TEXT) RETURNS VOID AS $$
BEGIN
    EXECUTE format('DROP POLICY IF EXISTS %I ON storage.objects', 'public_read_' || bucket_name);
    EXECUTE format('CREATE POLICY %I ON storage.objects FOR SELECT USING (bucket_id = %L)', 'public_read_' || bucket_name, bucket_name);
    EXECUTE format('DROP POLICY IF EXISTS %I ON storage.objects', 'auth_upload_' || bucket_name);
    EXECUTE format('CREATE POLICY %I ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = %L AND (storage.foldername(name))[1] = auth.uid()::text)', 'auth_upload_' || bucket_name, bucket_name);
    EXECUTE format('DROP POLICY IF EXISTS %I ON storage.objects', 'auth_update_' || bucket_name);
    EXECUTE format('CREATE POLICY %I ON storage.objects FOR UPDATE TO authenticated USING (bucket_id = %L AND (storage.foldername(name))[1] = auth.uid()::text)', 'auth_update_' || bucket_name, bucket_name);
    EXECUTE format('DROP POLICY IF EXISTS %I ON storage.objects', 'auth_delete_' || bucket_name);
    EXECUTE format('CREATE POLICY %I ON storage.objects FOR DELETE TO authenticated USING (bucket_id = %L AND (storage.foldername(name))[1] = auth.uid()::text)', 'auth_delete_' || bucket_name, bucket_name);
END; $$ LANGUAGE plpgsql;

-- Trip access helper
CREATE OR REPLACE FUNCTION public.check_trip_access(t_id UUID) RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (SELECT 1 FROM public.trips WHERE id = t_id AND user_id = auth.uid()) 
        OR EXISTS (SELECT 1 FROM public.trip_collaborators WHERE trip_id = t_id AND user_id = auth.uid());
END; $$ LANGUAGE plpgsql SECURITY DEFINER;

-- APPLY TRIGGERS
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

DROP TRIGGER IF EXISTS set_updated_at ON public.profiles;
CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION handle_updated_at();

DROP TRIGGER IF EXISTS set_updated_at ON public.planners;
CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.planners FOR EACH ROW EXECUTE FUNCTION handle_updated_at();

DROP TRIGGER IF EXISTS set_updated_at ON public.pages;
CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.pages FOR EACH ROW EXECUTE FUNCTION handle_updated_at();

DROP TRIGGER IF EXISTS set_updated_at ON public.tasks;
CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.tasks FOR EACH ROW EXECUTE FUNCTION handle_updated_at();

DROP TRIGGER IF EXISTS tr_pages_search_vector ON public.pages;
CREATE TRIGGER tr_pages_search_vector BEFORE INSERT OR UPDATE ON public.pages FOR EACH ROW EXECUTE FUNCTION pages_update_search_vector();

-- 10. INDEXES
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_planners_user_id ON public.planners(user_id);
CREATE INDEX IF NOT EXISTS idx_pages_planner_id ON public.pages(planner_id);
CREATE INDEX IF NOT EXISTS idx_pages_search_vector ON public.pages USING gin(search_vector);
CREATE INDEX IF NOT EXISTS idx_assets_user_type ON public.assets(user_id, type);
CREATE INDEX IF NOT EXISTS idx_tasks_user_id ON public.tasks(user_id);
CREATE INDEX IF NOT EXISTS idx_trips_user_id ON public.trips(user_id);
CREATE INDEX IF NOT EXISTS idx_cards_user_id ON public.cards(user_id);

-- 11. ROW LEVEL SECURITY (RLS)
-- ============================================================
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.planners ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pages    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assets   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tasks    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trips    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cards    ENABLE ROW LEVEL SECURITY;

-- Profiles: Public read, Self write
DROP POLICY IF EXISTS "profiles_public_read" ON public.profiles;
CREATE POLICY "profiles_public_read" ON public.profiles FOR SELECT USING (true);
DROP POLICY IF EXISTS "profiles_self_write" ON public.profiles;
CREATE POLICY "profiles_self_write" ON public.profiles FOR ALL USING (auth.uid() = id);

-- Planners: Owner only (or admin)
DROP POLICY IF EXISTS "planners_owner_all" ON public.planners;
CREATE POLICY "planners_owner_all" ON public.planners FOR ALL USING (auth.uid() = user_id OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));

-- Pages: Owner of Planner only
DROP POLICY IF EXISTS "pages_owner_all" ON public.pages;
CREATE POLICY "pages_owner_all" ON public.pages FOR ALL USING (EXISTS (SELECT 1 FROM public.planners WHERE planners.id = pages.planner_id AND planners.user_id = auth.uid()));

-- Assets: Public Read (if user_id NULL) or Owner
DROP POLICY IF EXISTS "assets_visibility" ON public.assets;
CREATE POLICY "assets_visibility" ON public.assets FOR ALL USING (user_id IS NULL OR auth.uid() = user_id OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));

-- Tasks: Owner or Assigned-to
DROP POLICY IF EXISTS "tasks_visibility" ON public.tasks;
CREATE POLICY "tasks_visibility" ON public.tasks FOR ALL USING (auth.uid() = user_id OR auth.uid() = assigned_to);

-- Trips: Owner or Collaborator
DROP POLICY IF EXISTS "trips_visibility" ON public.trips;
CREATE POLICY "trips_visibility" ON public.trips FOR ALL USING (public.check_trip_access(id));

-- Cards: Owner only
DROP POLICY IF EXISTS "cards_visibility" ON public.cards;
CREATE POLICY "cards_visibility" ON public.cards FOR ALL USING (auth.uid() = user_id);

-- 12. STORAGE BUCKETS
-- ============================================================
INSERT INTO storage.buckets (id, name, public) VALUES
    ('avatars', 'avatars', true),
    ('stickers', 'stickers', true),
    ('templates', 'templates', true),
    ('covers', 'covers', true),
    ('planner-uploads', 'planner-uploads', true),
    ('voice-notes', 'voice-notes', true),
    ('task-attachments', 'task-attachments', true),
    ('planner-assets', 'planner-assets', true)
ON CONFLICT (id) DO UPDATE SET public = true;

SELECT public.setup_bucket_policies('avatars');
SELECT public.setup_bucket_policies('stickers');
SELECT public.setup_bucket_policies('templates');
SELECT public.setup_bucket_policies('covers');
SELECT public.setup_bucket_policies('planner-uploads');
SELECT public.setup_bucket_policies('voice-notes');
SELECT public.setup_bucket_policies('task-attachments');
SELECT public.setup_bucket_policies('planner-assets');

-- 13. RPCs
-- ============================================================

-- Global Search
CREATE OR REPLACE FUNCTION global_search(query_text TEXT)
RETURNS TABLE (type TEXT, id UUID, planner_id UUID, name TEXT, page_index INTEGER, snippet TEXT, rank REAL) AS $$
BEGIN
    RETURN QUERY
    SELECT 'planner'::TEXT, p.id, p.id, p.name, 0, p.name, ts_rank_cd(to_tsvector('english', p.name), websearch_to_tsquery('english', query_text))::REAL
    FROM public.planners p WHERE to_tsvector('english', p.name) @@ websearch_to_tsquery('english', query_text) OR p.name ILIKE '%' || query_text || '%'
    UNION ALL
    SELECT 'page'::TEXT, pg.id, pg.planner_id, pg.name, pg.page_number, ts_headline('english', coalesce(pg.name, '') || ' ' || coalesce(pg.searchable_text, '') || ' ' || coalesce(pg.ink_transcription, ''), websearch_to_tsquery('english', query_text)), ts_rank_cd(pg.search_vector, websearch_to_tsquery('english', query_text))::REAL
    FROM public.pages pg WHERE pg.search_vector @@ websearch_to_tsquery('english', query_text) OR pg.name ILIKE '%' || query_text || '%' OR pg.searchable_text ILIKE '%' || query_text || '%' OR pg.ink_transcription ILIKE '%' || query_text || '%'
    ORDER BY rank DESC;
END; $$ LANGUAGE plpgsql;

-- Atomic toggle completion
CREATE OR REPLACE FUNCTION toggle_task_completion(p_task_id UUID, p_completed_date DATE) RETURNS VOID LANGUAGE plpgsql AS $$
DECLARE v_user_id UUID := auth.uid(); BEGIN
    IF NOT EXISTS (SELECT 1 FROM tasks WHERE id = p_task_id AND (user_id = v_user_id OR assigned_to = v_user_id)) THEN RAISE EXCEPTION 'Access denied'; END IF;
    IF EXISTS (SELECT 1 FROM task_completions WHERE task_id = p_task_id AND completed_date = p_completed_date) THEN
        DELETE FROM task_completions WHERE task_id = p_task_id AND completed_date = p_completed_date;
    ELSE
        INSERT INTO task_completions (task_id, user_id, completed_date) VALUES (p_task_id, v_user_id, p_completed_date);
    END IF;
END; $$;

-- Secure RPC for email → user ID lookup
CREATE OR REPLACE FUNCTION get_user_id_by_email(p_email TEXT)
RETURNS UUID AS $$
DECLARE v_user_id UUID;
BEGIN
    SELECT id INTO v_user_id FROM auth.users WHERE email = p_email LIMIT 1;
    RETURN v_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Bulk email lookup for connection list display
CREATE OR REPLACE FUNCTION get_emails_for_users(user_ids UUID[])
RETURNS TABLE(id UUID, email TEXT) AS $$
BEGIN
    RETURN QUERY
    SELECT u.id, u.email
    FROM auth.users u
    WHERE u.id = ANY(user_ids);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- REALTIME ENABLEMENT
ALTER TABLE public.connections REPLICA IDENTITY FULL;
ALTER TABLE public.cards REPLICA IDENTITY FULL;
ALTER TABLE public.tasks REPLICA IDENTITY FULL;

-- MASTER SCHEMA COMPLETE
