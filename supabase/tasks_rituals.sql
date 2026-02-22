-- ============================================================
-- ZOABI PLANNER — Tasks & Rituals: Supabase SQL Scripts
-- Run these in order inside the Supabase SQL Editor
-- ============================================================


-- ============================================================
-- SCRIPT 1 — EXTENSIONS & HELPERS
-- ============================================================

-- pgcrypto for gen_random_uuid() (already enabled on most Supabase projects)
CREATE EXTENSION IF NOT EXISTS "pgcrypto";


-- ============================================================
-- SCRIPT 2 — ENUMS
-- ============================================================

CREATE TYPE task_priority     AS ENUM ('low', 'medium', 'high');
CREATE TYPE recurrence_type   AS ENUM ('daily', 'weekly', 'monthly', 'yearly');


-- ============================================================
-- SCRIPT 3 — TABLES
-- ============================================================

-- ─── 3a. task_categories ────────────────────────────────────
-- Each user owns their own set of categories.
CREATE TABLE IF NOT EXISTS task_categories (
    id         UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id    UUID         NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    name       TEXT         NOT NULL,
    color      TEXT         NOT NULL DEFAULT '#6366f1',   -- any CSS hex color
    icon       TEXT,                                       -- optional icon name
    sort_order INT          NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ  NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ  NOT NULL DEFAULT now()
);

-- ─── 3b. tasks ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS tasks (
    id               UUID            PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id          UUID            NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    category_id      UUID            REFERENCES task_categories(id) ON DELETE SET NULL,
    title            TEXT            NOT NULL,
    description      TEXT,
    priority         task_priority   NOT NULL DEFAULT 'medium',

    -- One-time task fields
    due_date         TIMESTAMPTZ,
    is_completed     BOOLEAN         NOT NULL DEFAULT FALSE,

    -- Recurring task fields
    is_recurring     BOOLEAN         NOT NULL DEFAULT FALSE,
    recurrence_type  recurrence_type,
    -- daysOfWeek: array of 0-6 (Sun=0 ... Sat=6)
    recurrence_days_of_week  INT[]   DEFAULT NULL,
    -- dayOfMonth: 1-31
    recurrence_day_of_month  INT     DEFAULT NULL,
    recurrence_start_date    DATE    DEFAULT NULL,
    recurrence_end_date      DATE    DEFAULT NULL,

    date_added       TIMESTAMPTZ     NOT NULL DEFAULT now(),
    updated_at       TIMESTAMPTZ     NOT NULL DEFAULT now()
);

-- ─── 3c. task_completions ───────────────────────────────────
-- Tracks which dates a RECURRING task was completed on.
-- For one-time tasks use tasks.is_completed instead.
CREATE TABLE IF NOT EXISTS task_completions (
    id             UUID   PRIMARY KEY DEFAULT gen_random_uuid(),
    task_id        UUID   NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
    user_id        UUID   NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    completed_date DATE   NOT NULL,     -- YYYY-MM-DD
    created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (task_id, completed_date)    -- one record per task per day
);

-- ─── 3d. task_attachments ───────────────────────────────────
-- Stores Supabase Storage public URLs for images attached to tasks.
-- (Base64 strings in local state are replaced by Storage URLs here.)
CREATE TABLE IF NOT EXISTS task_attachments (
    id          UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    task_id     UUID         NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
    user_id     UUID         NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    storage_url TEXT         NOT NULL,   -- public URL from Supabase Storage
    file_name   TEXT,
    mime_type   TEXT,
    size_bytes  BIGINT,
    sort_order  INT          NOT NULL DEFAULT 0,
    created_at  TIMESTAMPTZ  NOT NULL DEFAULT now()
);


-- ============================================================
-- SCRIPT 4 — INDEXES
-- ============================================================

-- tasks
CREATE INDEX IF NOT EXISTS idx_tasks_user_id       ON tasks(user_id);
CREATE INDEX IF NOT EXISTS idx_tasks_category_id   ON tasks(category_id);
CREATE INDEX IF NOT EXISTS idx_tasks_due_date      ON tasks(due_date);
CREATE INDEX IF NOT EXISTS idx_tasks_is_recurring  ON tasks(is_recurring);

-- task_completions
CREATE INDEX IF NOT EXISTS idx_task_completions_task_id        ON task_completions(task_id);
CREATE INDEX IF NOT EXISTS idx_task_completions_user_date      ON task_completions(user_id, completed_date);

-- task_categories
CREATE INDEX IF NOT EXISTS idx_task_categories_user_id ON task_categories(user_id);

-- task_attachments
CREATE INDEX IF NOT EXISTS idx_task_attachments_task_id ON task_attachments(task_id);


-- ============================================================
-- SCRIPT 5 — UPDATED_AT AUTO-UPDATE TRIGGER
-- ============================================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$;

CREATE TRIGGER tasks_updated_at
    BEFORE UPDATE ON tasks
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER task_categories_updated_at
    BEFORE UPDATE ON task_categories
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();


-- ============================================================
-- SCRIPT 6 — ROW LEVEL SECURITY (RLS)
-- ============================================================

-- Enable RLS on every table
ALTER TABLE task_categories   ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks             ENABLE ROW LEVEL SECURITY;
ALTER TABLE task_completions  ENABLE ROW LEVEL SECURITY;
ALTER TABLE task_attachments  ENABLE ROW LEVEL SECURITY;

-- ────────────────────────────────────────────────────────────
-- task_categories policies
-- ────────────────────────────────────────────────────────────
CREATE POLICY "Users can view their own categories"
    ON task_categories FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own categories"
    ON task_categories FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own categories"
    ON task_categories FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own categories"
    ON task_categories FOR DELETE
    USING (auth.uid() = user_id);

-- ────────────────────────────────────────────────────────────
-- tasks policies
-- ────────────────────────────────────────────────────────────
CREATE POLICY "Users can view their own tasks"
    ON tasks FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own tasks"
    ON tasks FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own tasks"
    ON tasks FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own tasks"
    ON tasks FOR DELETE
    USING (auth.uid() = user_id);

-- ────────────────────────────────────────────────────────────
-- task_completions policies
-- ────────────────────────────────────────────────────────────
CREATE POLICY "Users can view their own completions"
    ON task_completions FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own completions"
    ON task_completions FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own completions"
    ON task_completions FOR DELETE
    USING (auth.uid() = user_id);

-- ────────────────────────────────────────────────────────────
-- task_attachments policies
-- ────────────────────────────────────────────────────────────
CREATE POLICY "Users can view their own attachments"
    ON task_attachments FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own attachments"
    ON task_attachments FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own attachments"
    ON task_attachments FOR DELETE
    USING (auth.uid() = user_id);


-- ============================================================
-- SCRIPT 7 — STORAGE BUCKET (run separately in Dashboard or SQL)
-- ============================================================
-- Create the bucket for task attachment images via Supabase Dashboard:
--   Storage → New Bucket → Name: "task-attachments", Public: ON
--
-- Or run this (requires pg_net / admin role):
-- INSERT INTO storage.buckets (id, name, public)
-- VALUES ('task-attachments', 'task-attachments', true)
-- ON CONFLICT (id) DO NOTHING;

-- Storage RLS policies for 'task-attachments' bucket:
CREATE POLICY "Authenticated users can upload task attachments"
    ON storage.objects FOR INSERT
    WITH CHECK (
        bucket_id = 'task-attachments'
        AND auth.role() = 'authenticated'
        -- enforce path = user_id/... so users can't write to each other's folders
        AND (storage.foldername(name))[1] = auth.uid()::text
    );

CREATE POLICY "Users can view their own task attachment files"
    ON storage.objects FOR SELECT
    USING (
        bucket_id = 'task-attachments'
        AND (storage.foldername(name))[1] = auth.uid()::text
    );

CREATE POLICY "Users can delete their own task attachment files"
    ON storage.objects FOR DELETE
    USING (
        bucket_id = 'task-attachments'
        AND (storage.foldername(name))[1] = auth.uid()::text
    );


-- ============================================================
-- SCRIPT 8 — SEED DEFAULT CATEGORIES (optional)
-- Inserts default categories for a given user.
-- Replace '<user-uuid>' with an actual UUID or call from app layer.
-- ============================================================

/*
INSERT INTO task_categories (user_id, name, color, icon, sort_order) VALUES
    ('<user-uuid>', 'Work',          '#3b82f6', 'briefcase', 0),
    ('<user-uuid>', 'Health',        '#10b981', 'activity',  1),
    ('<user-uuid>', 'Personal',      '#f59e0b', 'user',      2),
    ('<user-uuid>', 'Beauty Routine','#ec4899', 'sparkles',  3),
    ('<user-uuid>', 'Home Cleaning', '#14b8a6', 'home',      4),
    ('<user-uuid>', 'Meetings',      '#8b5cf6', 'calendar',  5);
*/


-- ============================================================
-- SCRIPT 9 — HELPFUL VIEWS
-- ============================================================

-- ─── 9a. tasks_with_category ────────────────────────────────
-- Denormalised view that joins task + category for easy querying
CREATE OR REPLACE VIEW tasks_with_category AS
SELECT
    t.id,
    t.user_id,
    t.title,
    t.description,
    t.priority,
    t.due_date,
    t.is_completed,
    t.is_recurring,
    t.recurrence_type,
    t.recurrence_days_of_week,
    t.recurrence_day_of_month,
    t.recurrence_start_date,
    t.recurrence_end_date,
    t.date_added,
    t.updated_at,
    -- category fields
    t.category_id,
    c.name  AS category_name,
    c.color AS category_color,
    c.icon  AS category_icon
FROM tasks t
LEFT JOIN task_categories c ON c.id = t.category_id;

-- ─── 9b. tasks_due_today ────────────────────────────────────
-- One-time tasks due today + all active recurring tasks visible today
CREATE OR REPLACE VIEW tasks_due_today AS
SELECT t.*, 'one_time' AS match_type
FROM tasks t
WHERE
    t.is_recurring = FALSE
    AND DATE(t.due_date AT TIME ZONE 'UTC') = CURRENT_DATE
    AND t.is_completed = FALSE

UNION ALL

SELECT t.*, 'recurring' AS match_type
FROM tasks t
WHERE
    t.is_recurring = TRUE
    AND (t.recurrence_start_date IS NULL OR t.recurrence_start_date <= CURRENT_DATE)
    AND (t.recurrence_end_date   IS NULL OR t.recurrence_end_date   >= CURRENT_DATE)
    AND (
        t.recurrence_type = 'daily'
        OR (t.recurrence_type = 'weekly'  AND EXTRACT(DOW FROM CURRENT_DATE)::int = ANY(t.recurrence_days_of_week))
        OR (t.recurrence_type = 'monthly' AND EXTRACT(DAY FROM CURRENT_DATE)::int = t.recurrence_day_of_month)
    );


-- ============================================================
-- SCRIPT 10 — RPC: toggle_task_completion
-- Atomically mark a recurring task completed / uncompleted for a date
-- ============================================================

CREATE OR REPLACE FUNCTION toggle_task_completion(
    p_task_id        UUID,
    p_completed_date DATE
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_user_id UUID := auth.uid();
    v_exists  BOOLEAN;
BEGIN
    -- Verify task ownership
    IF NOT EXISTS (
        SELECT 1 FROM tasks WHERE id = p_task_id AND user_id = v_user_id
    ) THEN
        RAISE EXCEPTION 'Task not found or access denied';
    END IF;

    SELECT EXISTS (
        SELECT 1 FROM task_completions
        WHERE task_id = p_task_id AND completed_date = p_completed_date
    ) INTO v_exists;

    IF v_exists THEN
        -- Already completed → uncheck
        DELETE FROM task_completions
        WHERE task_id = p_task_id AND completed_date = p_completed_date;
    ELSE
        -- Not completed → mark complete
        INSERT INTO task_completions (task_id, user_id, completed_date)
        VALUES (p_task_id, v_user_id, p_completed_date)
        ON CONFLICT (task_id, completed_date) DO NOTHING;
    END IF;
END;
$$;


-- ============================================================
-- DONE
-- ============================================================
