-- ============================================================
-- ZOABI PLANNER PRO — MASTER DATABASE SCHEMA
-- ============================================================
-- This file is the SINGLE SOURCE OF TRUTH for all database setup.
-- It merges every individual SQL file that previously existed in the
-- project root and the /supabase folder.
--
-- HOW TO USE:
--   Paste this entire file into the Supabase SQL Editor and click Run.
--   Every statement is idempotent (safe to re-run on an existing database).
--
-- SECTIONS:
--   1.  Extensions
--   2.  Core Tables  (profiles, planners, pages, assets, templates, tasks)
--   3.  Tasks Feature  (due_time, notifications, assignments)
--   4.  Connections / Collaboration
--   5.  Pages Extensions  (FTS, PDF import, layout, search)
--   6.  Assets Extensions  (thumbnails, voice, templates upgrade)
--   7.  Indexes
--   8.  Functions & Triggers
--   9.  Row Level Security (RLS)
--  10.  Storage Buckets & Policies
--  11.  Admin Role Setup
--  12.  Emergency Recovery  (run only if needed)
-- ============================================================


-- ============================================================
-- SECTION 1: EXTENSIONS
-- ============================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";


-- ============================================================
-- SECTION 2: CORE TABLES
-- ============================================================

-- Profiles (auto-created for every auth user)
CREATE TABLE IF NOT EXISTS public.profiles (
    id          UUID REFERENCES auth.users ON DELETE CASCADE PRIMARY KEY,
    updated_at  TIMESTAMPTZ DEFAULT NOW(),
    username    TEXT UNIQUE,
    full_name   TEXT,
    avatar_url  TEXT,
    website     TEXT,
    role        TEXT DEFAULT 'user',
    CONSTRAINT username_length CHECK (char_length(username) >= 3)
);

-- Planners
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'planners') THEN
        CREATE TABLE public.planners (
            id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
            user_id         UUID REFERENCES auth.users ON DELETE CASCADE NOT NULL,
            name            TEXT NOT NULL,
            type            TEXT CHECK (type IN ('Calendar', 'Notes', 'Custom')),
            structure       TEXT CHECK (structure IN ('Annual', 'Monthly', 'Weekly', 'Freeform')),
            cover_url       TEXT,
            cover_color     TEXT DEFAULT '#6366f1',
            category        TEXT,
            is_archived     BOOLEAN DEFAULT false,
            is_favorite     BOOLEAN DEFAULT false,
            archived_at     TIMESTAMPTZ,
            last_opened_at  TIMESTAMPTZ DEFAULT NOW(),
            created_at      TIMESTAMPTZ DEFAULT NOW() NOT NULL,
            updated_at      TIMESTAMPTZ DEFAULT NOW() NOT NULL
        );
    END IF;

    -- Safely add any missing columns to existing table
    ALTER TABLE public.planners ADD COLUMN IF NOT EXISTS type TEXT;
    ALTER TABLE public.planners ADD COLUMN IF NOT EXISTS structure TEXT;
    ALTER TABLE public.planners ADD COLUMN IF NOT EXISTS cover_url TEXT;
    ALTER TABLE public.planners ADD COLUMN IF NOT EXISTS cover_color TEXT DEFAULT '#6366f1';
    ALTER TABLE public.planners ADD COLUMN IF NOT EXISTS category TEXT;
    ALTER TABLE public.planners ADD COLUMN IF NOT EXISTS is_archived BOOLEAN DEFAULT false;
    ALTER TABLE public.planners ADD COLUMN IF NOT EXISTS is_favorite BOOLEAN DEFAULT false;
    ALTER TABLE public.planners ADD COLUMN IF NOT EXISTS archived_at TIMESTAMPTZ;
    ALTER TABLE public.planners ADD COLUMN IF NOT EXISTS last_opened_at TIMESTAMPTZ DEFAULT NOW();
END $$;

-- Pages
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'pages') THEN
        CREATE TABLE public.pages (
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
    END IF;

    -- Rename old 'index' column if it exists
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'pages' AND column_name = 'index') THEN
        ALTER TABLE public.pages RENAME COLUMN index TO page_number;
    END IF;

    -- Add any missing columns
    ALTER TABLE public.pages ADD COLUMN IF NOT EXISTS name TEXT;
    ALTER TABLE public.pages ADD COLUMN IF NOT EXISTS section TEXT DEFAULT 'General';
    ALTER TABLE public.pages ADD COLUMN IF NOT EXISTS links JSONB DEFAULT '[]'::jsonb;
    ALTER TABLE public.pages ADD COLUMN IF NOT EXISTS dimensions JSONB;
    ALTER TABLE public.pages ADD COLUMN IF NOT EXISTS layout TEXT;
    ALTER TABLE public.pages ADD COLUMN IF NOT EXISTS searchable_text TEXT;
    ALTER TABLE public.pages ADD COLUMN IF NOT EXISTS ink_transcription TEXT;
    ALTER TABLE public.pages ADD COLUMN IF NOT EXISTS search_vector tsvector;
END $$;

-- Assets (stickers, templates, images, voice notes, covers)
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
    created_at    TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Ensure 'title' exists (some old schemas used 'name')
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'assets' AND column_name = 'name')
       AND NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'assets' AND column_name = 'title') THEN
        ALTER TABLE public.assets RENAME COLUMN name TO title;
    END IF;
    ALTER TABLE public.assets ADD COLUMN IF NOT EXISTS thumbnail_url TEXT;
    ALTER TABLE public.assets ADD COLUMN IF NOT EXISTS hashtags TEXT[] DEFAULT '{}';
    ALTER TABLE public.assets ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}';
    ALTER TABLE public.assets ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;
END $$;

-- Drop and recreate the type check constraint to include all known types
DO $$
DECLARE const_name TEXT;
BEGIN
    SELECT constraint_name INTO const_name
    FROM information_schema.table_constraints
    WHERE table_name = 'assets' AND constraint_type = 'CHECK' AND constraint_name LIKE '%type%';
    IF const_name IS NOT NULL THEN
        EXECUTE 'ALTER TABLE public.assets DROP CONSTRAINT ' || const_name;
    END IF;
END $$;
ALTER TABLE public.assets
    ADD CONSTRAINT assets_type_check
    CHECK (type IN ('sticker', 'template', 'image', 'cover', 'voice', 'planner'));

-- Templates (standalone template library)
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
ALTER TABLE public.templates ADD COLUMN IF NOT EXISTS preview_url TEXT;
ALTER TABLE public.templates ADD COLUMN IF NOT EXISTS page_size VARCHAR(50) DEFAULT 'A4';
ALTER TABLE public.templates ADD COLUMN IF NOT EXISTS orientation VARCHAR(20) DEFAULT 'portrait';
ALTER TABLE public.templates ADD COLUMN IF NOT EXISTS template_data JSONB;
ALTER TABLE public.templates ADD COLUMN IF NOT EXISTS hashtags TEXT[];
ALTER TABLE public.templates ADD COLUMN IF NOT EXISTS is_calendar BOOLEAN DEFAULT FALSE;
ALTER TABLE public.templates ADD COLUMN IF NOT EXISTS calendar_type VARCHAR(50);


-- ============================================================
-- SECTION 3: TASKS FEATURE
-- ============================================================

-- Enums
DO $$ BEGIN
    CREATE TYPE public.task_priority AS ENUM ('low', 'medium', 'high');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    CREATE TYPE public.recurrence_type AS ENUM ('daily', 'weekly', 'monthly', 'yearly');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ─── 3a. task_categories ────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.task_categories (
    id         UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id    UUID         NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    name       TEXT         NOT NULL,
    color      TEXT         NOT NULL DEFAULT '#6366f1',
    icon       TEXT,
    sort_order INT          NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ  NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ  NOT NULL DEFAULT now()
);

-- ─── 3b. tasks ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.tasks (
    id               UUID            PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id          UUID            NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    category_id      UUID            REFERENCES public.task_categories(id) ON DELETE SET NULL,
    title            TEXT            NOT NULL,
    description      TEXT,
    priority         public.task_priority   NOT NULL DEFAULT 'medium',
    due_date         TIMESTAMPTZ,
    due_time         TIME,
    is_completed     BOOLEAN         NOT NULL DEFAULT FALSE,
    is_recurring     BOOLEAN         NOT NULL DEFAULT FALSE,
    recurrence_type  public.recurrence_type,
    recurrence_days_of_week  INT[]   DEFAULT NULL,
    recurrence_day_of_month  INT     DEFAULT NULL,
    recurrence_start_date    DATE    DEFAULT NULL,
    recurrence_end_date      DATE    DEFAULT NULL,
    date_added       TIMESTAMPTZ     NOT NULL DEFAULT now(),
    updated_at       TIMESTAMPTZ     NOT NULL DEFAULT now(),
    notifications    JSONB           DEFAULT '[]'::jsonb,
    assigned_to      UUID            REFERENCES auth.users(id) ON DELETE SET NULL,
    assigned_by      UUID            REFERENCES auth.users(id) ON DELETE SET NULL,
    subtasks         JSONB           DEFAULT '[]'::jsonb,
    col_span         INT             DEFAULT 1,
    row_span         INT             DEFAULT 1
);

-- Safely update tasks table for existing setups
DO $$ BEGIN
    ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS due_time TIME;
    ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS notifications JSONB DEFAULT '[]'::jsonb;
    ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS assigned_to UUID REFERENCES auth.users(id) ON DELETE SET NULL;
    ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS assigned_by UUID REFERENCES auth.users(id) ON DELETE SET NULL;
    ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS subtasks JSONB DEFAULT '[]'::jsonb;
    ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS col_span INT DEFAULT 1;
    ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS row_span INT DEFAULT 1;
END $$;

-- ─── 3c. task_completions ───────────────────────────────────
CREATE TABLE IF NOT EXISTS public.task_completions (
    id             UUID   PRIMARY KEY DEFAULT gen_random_uuid(),
    task_id        UUID   NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
    user_id        UUID   NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    completed_date DATE   NOT NULL,
    created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (task_id, completed_date)
);

-- ─── 3d. task_attachments ───────────────────────────────────
CREATE TABLE IF NOT EXISTS public.task_attachments (
    id          UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    task_id     UUID         NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
    user_id     UUID         NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    storage_url TEXT         NOT NULL,
    file_name   TEXT,
    mime_type   TEXT,
    size_bytes  BIGINT,
    sort_order  INT          NOT NULL DEFAULT 0,
    created_at  TIMESTAMPTZ  NOT NULL DEFAULT now()
);

-- Triggers for task_categories and tasks
DROP TRIGGER IF EXISTS set_updated_at ON public.task_categories;
CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.task_categories
    FOR EACH ROW EXECUTE FUNCTION handle_updated_at();

DROP TRIGGER IF EXISTS set_updated_at ON public.tasks;
CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.tasks
    FOR EACH ROW EXECUTE FUNCTION handle_updated_at();

-- Task RLS
ALTER TABLE public.task_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tasks           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.task_completions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.task_attachments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage their own categories" ON public.task_categories;
CREATE POLICY "Users can manage their own categories" ON public.task_categories
    FOR ALL USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can manage tasks and assigned tasks" ON public.tasks;
CREATE POLICY "Users can manage tasks and assigned tasks" ON public.tasks
    FOR ALL USING (auth.uid() = user_id OR auth.uid() = assigned_to)
    WITH CHECK (auth.uid() = user_id OR auth.uid() = assigned_to);

DROP POLICY IF EXISTS "Users can manage their own completions" ON public.task_completions;
CREATE POLICY "Users can manage their own completions" ON public.task_completions
    FOR ALL USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can manage their own attachments" ON public.task_attachments;
CREATE POLICY "Users can manage their own attachments" ON public.task_attachments
    FOR ALL USING (auth.uid() = user_id);

-- Atomic toggle RPC
CREATE OR REPLACE FUNCTION toggle_task_completion(p_task_id UUID, p_completed_date DATE)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
    v_user_id UUID := auth.uid();
    v_exists  BOOLEAN;
BEGIN
    IF NOT EXISTS (SELECT 1 FROM tasks WHERE id = p_task_id AND (user_id = v_user_id OR assigned_to = v_user_id)) THEN
        RAISE EXCEPTION 'Task not found or access denied';
    END IF;
    SELECT EXISTS (SELECT 1 FROM task_completions WHERE task_id = p_task_id AND completed_date = p_completed_date) INTO v_exists;
    IF v_exists THEN
        DELETE FROM task_completions WHERE task_id = p_task_id AND completed_date = p_completed_date;
    ELSE
        INSERT INTO task_completions (task_id, user_id, completed_date) VALUES (p_task_id, v_user_id, p_completed_date);
    END IF;
END;
$$;


-- ============================================================
-- SECTION 4: CONNECTIONS / COLLABORATION
-- ============================================================

CREATE TABLE IF NOT EXISTS public.connections (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    requester_id    UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    receiver_id     UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    status          TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected')),
    connection_type TEXT DEFAULT 'work'   CHECK (connection_type IN ('family', 'work')),
    created_at      TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(requester_id, receiver_id)
);

-- Add connection_type to existing databases that were created before this column existed
ALTER TABLE public.connections ADD COLUMN IF NOT EXISTS
    connection_type TEXT DEFAULT 'work' CHECK (connection_type IN ('family', 'work'));

ALTER TABLE public.connections ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their connections" ON public.connections;
CREATE POLICY "Users can view their connections"
    ON public.connections FOR SELECT
    USING (auth.uid() = requester_id OR auth.uid() = receiver_id);

DROP POLICY IF EXISTS "Users can create a connection request" ON public.connections;
CREATE POLICY "Users can create a connection request"
    ON public.connections FOR INSERT
    WITH CHECK (auth.uid() = requester_id);

DROP POLICY IF EXISTS "Users can accept/reject connections" ON public.connections;
CREATE POLICY "Users can accept/reject connections"
    ON public.connections FOR UPDATE
    USING (auth.uid() = receiver_id OR auth.uid() = requester_id);

DROP POLICY IF EXISTS "Users can delete their connections" ON public.connections;
CREATE POLICY "Users can delete their connections"
    ON public.connections FOR DELETE
    USING (auth.uid() = requester_id OR auth.uid() = receiver_id);

-- Secure RPC for email → user ID lookup (used when sending connection requests)
CREATE OR REPLACE FUNCTION get_user_id_by_email(p_email TEXT)
RETURNS UUID AS $$
DECLARE v_user_id UUID;
BEGIN
    SELECT id INTO v_user_id FROM auth.users WHERE email = p_email LIMIT 1;
    RETURN v_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Bulk email lookup for connection list display
-- (profiles table does NOT store email — only auth.users does)
CREATE OR REPLACE FUNCTION get_emails_for_users(user_ids UUID[])
RETURNS TABLE(id UUID, email TEXT) AS $$
BEGIN
    RETURN QUERY
    SELECT u.id, u.email
    FROM auth.users u
    WHERE u.id = ANY(user_ids);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Enable Supabase Realtime on the connections table so clients
-- receive instant push events (no polling needed)
ALTER TABLE public.connections REPLICA IDENTITY FULL;
BEGIN;
    DROP PUBLICATION IF EXISTS supabase_realtime;
    CREATE PUBLICATION supabase_realtime FOR ALL TABLES;
COMMIT;


-- ============================================================
-- SECTION 5: PAGES EXTENSIONS (FTS, PDF, layout)
-- ============================================================

-- Migrate data from old 'layers' table if it exists
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'layers') THEN
        UPDATE public.pages
        SET elements = jsonb_build_object(
            'lines', COALESCE((SELECT ink_paths FROM public.layers WHERE layers.page_id = pages.id), '[]'::jsonb),
            'elements', COALESCE((SELECT elements FROM public.layers WHERE layers.page_id = pages.id), '[]'::jsonb)
        )
        WHERE EXISTS (SELECT 1 FROM public.layers WHERE layers.page_id = pages.id);
    END IF;
END $$;


-- ============================================================
-- SECTION 6: ASSETS EXTENSIONS
-- ============================================================
-- (thumbnail_url and type constraint already applied in Section 2)

-- Fix broken placeholder URLs (run manually if needed — commented out by default)
-- UPDATE public.assets SET url = 'https://placehold.co/600x800/f1f5f9/6366f1/png?text=' || replace(title, ' ', '+') WHERE type = 'template';
-- UPDATE public.assets SET url = 'https://api.dicebear.com/9.x/shapes/svg?seed=' || title WHERE type = 'sticker';
-- UPDATE public.assets SET url = 'https://placehold.co/400x600/1e293b/FFFFFF/png?text=' || replace(title, ' ', '+') WHERE type = 'cover';


-- ============================================================
-- SECTION 7: INDEXES
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_planners_user_id    ON public.planners(user_id);
CREATE INDEX IF NOT EXISTS idx_planners_archived   ON public.planners(user_id, is_archived);
CREATE INDEX IF NOT EXISTS idx_planners_last_opened ON public.planners(user_id, last_opened_at DESC);

CREATE INDEX IF NOT EXISTS idx_pages_planner_id    ON public.pages(planner_id);
CREATE INDEX IF NOT EXISTS idx_pages_planner_page  ON public.pages(planner_id, page_number);
CREATE INDEX IF NOT EXISTS idx_pages_section       ON public.pages(section);
CREATE INDEX IF NOT EXISTS idx_pages_layout        ON public.pages(layout);
CREATE INDEX IF NOT EXISTS idx_pages_search_vector ON public.pages USING gin(search_vector);

CREATE INDEX IF NOT EXISTS idx_assets_user_type    ON public.assets(user_id, type);
CREATE INDEX IF NOT EXISTS idx_assets_category     ON public.assets(category);
CREATE INDEX IF NOT EXISTS idx_assets_public       ON public.assets(user_id) WHERE user_id IS NULL;

CREATE INDEX IF NOT EXISTS idx_templates_hashtags  ON public.templates USING GIN(hashtags);


-- ============================================================
-- SECTION 8: FUNCTIONS & TRIGGERS
-- ============================================================

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

-- Auto-create profile on user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (id, full_name, avatar_url, username)
    VALUES (
        NEW.id,
        NEW.raw_user_meta_data->>'full_name',
        NEW.raw_user_meta_data->>'avatar_url',
        COALESCE(
            NEW.raw_user_meta_data->>'username',
            split_part(NEW.email, '@', 1) || '_' || floor(random() * 1000)::text
        )
    )
    ON CONFLICT (id) DO NOTHING;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger on new user
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- updated_at triggers
DROP TRIGGER IF EXISTS set_updated_at ON public.profiles;
CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.profiles
    FOR EACH ROW EXECUTE FUNCTION handle_updated_at();

DROP TRIGGER IF EXISTS set_updated_at ON public.planners;
CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.planners
    FOR EACH ROW EXECUTE FUNCTION handle_updated_at();

DROP TRIGGER IF EXISTS set_updated_at ON public.pages;
CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.pages
    FOR EACH ROW EXECUTE FUNCTION handle_updated_at();

-- Full-Text Search trigger for pages
CREATE OR REPLACE FUNCTION pages_update_search_vector() RETURNS trigger AS $$
BEGIN
    NEW.search_vector :=
        setweight(to_tsvector('english', coalesce(NEW.name, '')), 'A') ||
        setweight(to_tsvector('english', coalesce(NEW.searchable_text, '')), 'B') ||
        setweight(to_tsvector('english', coalesce(NEW.ink_transcription, '')), 'C');
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS tr_pages_search_vector ON public.pages;
CREATE TRIGGER tr_pages_search_vector
    BEFORE INSERT OR UPDATE ON public.pages
    FOR EACH ROW EXECUTE FUNCTION pages_update_search_vector();

-- Global Search RPC
CREATE OR REPLACE FUNCTION global_search(query_text TEXT)
RETURNS TABLE (
    type       TEXT,
    id         UUID,
    planner_id UUID,
    name       TEXT,
    page_index INTEGER,
    snippet    TEXT,
    rank       REAL
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        'planner'::TEXT,
        p.id, p.id,
        p.name, 0,
        p.name,
        ts_rank_cd(to_tsvector('english', p.name), websearch_to_tsquery('english', query_text))::REAL
    FROM public.planners p
    WHERE to_tsvector('english', p.name) @@ websearch_to_tsquery('english', query_text)
       OR p.name ILIKE '%' || query_text || '%'

    UNION ALL

    SELECT
        'page'::TEXT,
        pg.id, pg.planner_id,
        pg.name, pg.page_number,
        ts_headline('english',
            coalesce(pg.name, '') || ' ' || coalesce(pg.searchable_text, '') || ' ' || coalesce(pg.ink_transcription, ''),
            websearch_to_tsquery('english', query_text)
        ),
        ts_rank_cd(pg.search_vector, websearch_to_tsquery('english', query_text))::REAL
    FROM public.pages pg
    WHERE pg.search_vector @@ websearch_to_tsquery('english', query_text)
       OR pg.name ILIKE '%' || query_text || '%'
       OR pg.searchable_text ILIKE '%' || query_text || '%'
       OR pg.ink_transcription ILIKE '%' || query_text || '%'

    ORDER BY rank DESC, name ASC;
END;
$$ LANGUAGE plpgsql;

-- Dynamic bucket policy helper
CREATE OR REPLACE FUNCTION public.setup_bucket_policies(bucket_name TEXT)
RETURNS VOID AS $$
BEGIN
    EXECUTE format('DROP POLICY IF EXISTS %I ON storage.objects', 'public_read_' || bucket_name);
    EXECUTE format('CREATE POLICY %I ON storage.objects FOR SELECT USING (bucket_id = %L)', 'public_read_' || bucket_name, bucket_name);
    EXECUTE format('DROP POLICY IF EXISTS %I ON storage.objects', 'auth_upload_' || bucket_name);
    EXECUTE format('CREATE POLICY %I ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = %L AND (storage.foldername(name))[1] = auth.uid()::text)', 'auth_upload_' || bucket_name, bucket_name);
    EXECUTE format('DROP POLICY IF EXISTS %I ON storage.objects', 'auth_update_' || bucket_name);
    EXECUTE format('CREATE POLICY %I ON storage.objects FOR UPDATE TO authenticated USING (bucket_id = %L AND (storage.foldername(name))[1] = auth.uid()::text)', 'auth_update_' || bucket_name, bucket_name);
    EXECUTE format('DROP POLICY IF EXISTS %I ON storage.objects', 'auth_delete_' || bucket_name);
    EXECUTE format('CREATE POLICY %I ON storage.objects FOR DELETE TO authenticated USING (bucket_id = %L AND (storage.foldername(name))[1] = auth.uid()::text)', 'auth_delete_' || bucket_name, bucket_name);
END;
$$ LANGUAGE plpgsql;


-- ============================================================
-- SECTION 9: ROW LEVEL SECURITY
-- ============================================================

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.planners ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pages    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assets   ENABLE ROW LEVEL SECURITY;

-- Drop old/conflicting policies
DROP POLICY IF EXISTS "Public profiles are viewable by everyone." ON public.profiles;
DROP POLICY IF EXISTS "Users can insert their own profile."      ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile."           ON public.profiles;
DROP POLICY IF EXISTS "profiles_public_read"  ON public.profiles;
DROP POLICY IF EXISTS "profiles_user_insert"  ON public.profiles;
DROP POLICY IF EXISTS "profiles_user_update"  ON public.profiles;
DROP POLICY IF EXISTS "profiles_self_update"  ON public.profiles;

-- Profiles
CREATE POLICY "profiles_public_read" ON public.profiles FOR SELECT USING (true);
CREATE POLICY "profiles_user_insert" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "profiles_user_update" ON public.profiles FOR UPDATE USING (auth.uid() = id);

-- Planners (owner + admin)
DROP POLICY IF EXISTS "planners_owner_all"    ON public.planners;
DROP POLICY IF EXISTS "planners_visibility"   ON public.planners;
DROP POLICY IF EXISTS "debug_planners_select" ON public.planners;
DROP POLICY IF EXISTS "debug_planners_all"    ON public.planners;
DROP POLICY IF EXISTS "Users can see own planners."     ON public.planners;
DROP POLICY IF EXISTS "Users can insert own planners."  ON public.planners;
DROP POLICY IF EXISTS "Users can update own planners."  ON public.planners;

CREATE POLICY "planners_visibility" ON public.planners
    FOR ALL
    USING (
        auth.uid() = user_id OR
        EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
    )
    WITH CHECK (
        auth.uid() = user_id OR
        EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
    );

-- Pages (through planner ownership)
DROP POLICY IF EXISTS "pages_owner_all" ON public.pages;
CREATE POLICY "pages_owner_all" ON public.pages
    FOR ALL TO authenticated
    USING (
        EXISTS (SELECT 1 FROM public.planners WHERE planners.id = pages.planner_id AND planners.user_id = auth.uid())
    )
    WITH CHECK (
        EXISTS (SELECT 1 FROM public.planners WHERE planners.id = pages.planner_id AND planners.user_id = auth.uid())
    );

-- Assets (public assets readable by all; owner + admin full access)
DROP POLICY IF EXISTS "assets_public_read"    ON public.assets;
DROP POLICY IF EXISTS "assets_owner_write"    ON public.assets;
DROP POLICY IF EXISTS "assets_owner_all"      ON public.assets;
DROP POLICY IF EXISTS "assets_visibility"     ON public.assets;
DROP POLICY IF EXISTS "assets_select_policy"  ON public.assets;
DROP POLICY IF EXISTS "assets_insert_policy"  ON public.assets;
DROP POLICY IF EXISTS "assets_update_policy"  ON public.assets;
DROP POLICY IF EXISTS "assets_delete_policy"  ON public.assets;
DROP POLICY IF EXISTS "assets_admin_select"   ON public.assets;
DROP POLICY IF EXISTS "assets_admin_update"   ON public.assets;
DROP POLICY IF EXISTS "assets_admin_delete"   ON public.assets;
DROP POLICY IF EXISTS "debug_assets_select"   ON public.assets;

CREATE POLICY "assets_visibility" ON public.assets
    FOR ALL
    USING (
        user_id IS NULL OR
        auth.uid() = user_id OR
        EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
    )
    WITH CHECK (
        auth.uid() = user_id OR
        EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
    );


-- ============================================================
-- SECTION 10: STORAGE BUCKETS & POLICIES
-- ============================================================

INSERT INTO storage.buckets (id, name, public)
VALUES
    ('avatars',          'avatars',          true),
    ('stickers',         'stickers',         true),
    ('templates',        'templates',        true),
    ('covers',           'covers',           true),
    ('planner-uploads',  'planner-uploads',  true),
    ('voice-notes',      'voice-notes',      true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- Avatar policies
DROP POLICY IF EXISTS "avatar_upload" ON storage.objects;
DROP POLICY IF EXISTS "avatar_update" ON storage.objects;
DROP POLICY IF EXISTS "avatar_read"   ON storage.objects;

CREATE POLICY "avatar_upload" ON storage.objects FOR INSERT TO authenticated
    WITH CHECK (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "avatar_update" ON storage.objects FOR UPDATE TO authenticated
    USING (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "avatar_read" ON storage.objects FOR SELECT USING (bucket_id = 'avatars');

-- Apply standard read/upload/update/delete policies to all other buckets
SELECT public.setup_bucket_policies('stickers');
SELECT public.setup_bucket_policies('templates');
SELECT public.setup_bucket_policies('covers');
SELECT public.setup_bucket_policies('planner-uploads');
SELECT public.setup_bucket_policies('voice-notes');


-- ============================================================
-- SECTION 11: ADMIN ROLE SETUP
-- ============================================================
-- To make a user an admin, run:
--   UPDATE public.profiles SET role = 'admin'
--   WHERE id = (SELECT id FROM auth.users WHERE email = 'your-email@example.com');

-- Admin storage override for stickers
DROP POLICY IF EXISTS "stickers_admin_delete" ON storage.objects;
CREATE POLICY "stickers_admin_delete" ON storage.objects FOR DELETE TO authenticated
    USING (bucket_id = 'stickers' AND (
        auth.uid()::text = (storage.foldername(name))[1] OR
        EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
    ));

DROP POLICY IF EXISTS "templates_admin_delete" ON storage.objects;
CREATE POLICY "templates_admin_delete" ON storage.objects FOR DELETE TO authenticated
    USING (bucket_id = 'templates' AND (
        auth.uid()::text = (storage.foldername(name))[1] OR
        EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
    ));

DROP POLICY IF EXISTS "covers_admin_delete" ON storage.objects;
CREATE POLICY "covers_admin_delete" ON storage.objects FOR DELETE TO authenticated
    USING (bucket_id = 'covers' AND (
        auth.uid()::text = (storage.foldername(name))[1] OR
        EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
    ));


-- ============================================================
-- SECTION 12: EMERGENCY RECOVERY  (run only if needed)
-- ============================================================
-- If you get a 401 "role admin does not exist" error, uncomment and run:

-- UPDATE auth.users  SET role = 'authenticated' WHERE id = '<your-user-id>';
-- UPDATE public.profiles SET role = 'admin'    WHERE id = '<your-user-id>';
-- DO $$ BEGIN
--     IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'admin') THEN
--         CREATE ROLE admin; GRANT authenticated TO admin;
--     END IF;
-- END $$;


-- ============================================================
-- MASTER SCHEMA COMPLETE
-- ============================================================
-- Summary of all features covered:
--   ✅ Profiles with role field (user / admin)
--   ✅ Planners with favorites, archiving, cover colors
--   ✅ Pages with FTS, section, layout, PDF import columns
--   ✅ Assets with thumbnails, voice, planner types
--   ✅ Templates with hashtags, page size, orientation, calendar types
--   ✅ Tasks with due_time, notifications, assigned_to / assigned_by
--   ✅ Connections (peer collaboration & task assignment)
--   ✅ All RLS policies (owner, admin, public asset access)
--   ✅ Storage buckets (avatars, stickers, templates, covers, uploads, voice)
--   ✅ FTS global_search() RPC
--   ✅ get_user_id_by_email() RPC for connection requests
--   ✅ Auto-profile creation on signup
--   ✅ Auto updated_at triggers
-- ============================================================
