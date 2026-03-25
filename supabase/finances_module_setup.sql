-- ============================================================
-- FINANCES MODULE (ROCKET MONEY STYLE)
-- ============================================================

-- 1. CATEGORIES TABLE
CREATE TABLE IF NOT EXISTS public.finance_categories (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id     UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    name        TEXT NOT NULL,
    parent_id   UUID REFERENCES public.finance_categories(id) ON DELETE CASCADE,
    icon        TEXT DEFAULT 'Tag', -- Lucide icon name
    created_at  TIMESTAMPTZ DEFAULT NOW(),
    updated_at  TIMESTAMPTZ DEFAULT NOW()
);

-- 2. FINANCES TABLE
CREATE TABLE IF NOT EXISTS public.finances (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id       UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    title         TEXT, -- e.g. "Dinner", "New Headphones"
    store_name    TEXT NOT NULL,
    amount        DECIMAL(12, 2) NOT NULL,
    date          DATE NOT NULL DEFAULT CURRENT_DATE,
    category_id   UUID REFERENCES public.finance_categories(id) ON DELETE SET NULL,
    notes         TEXT,
    payment_method TEXT DEFAULT 'Cash',
    is_income     BOOLEAN DEFAULT FALSE,
    created_at    TIMESTAMPTZ DEFAULT NOW(),
    updated_at    TIMESTAMPTZ DEFAULT NOW()
);

-- 3. BUDGETS TABLE
CREATE TABLE IF NOT EXISTS public.finance_budgets (
    id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id        UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    type           TEXT NOT NULL CHECK (type IN ('spending', 'saving')),
    amount         DECIMAL(12, 2) NOT NULL,
    category_id    UUID REFERENCES public.finance_categories(id) ON DELETE CASCADE, -- Optional for global
    month          INTEGER NOT NULL,
    year           INTEGER NOT NULL,
    created_at     TIMESTAMPTZ DEFAULT NOW(),
    updated_at     TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, type, category_id, month, year)
);

-- 3. RLS POLICIES
ALTER TABLE public.finance_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.finances ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.finance_budgets ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "finance_categories_owner_all" ON public.finance_categories;
CREATE POLICY "finance_categories_owner_all" ON public.finance_categories 
    FOR ALL USING (auth.uid() = user_id OR user_id IS NULL); -- Allow global categories if user_id is null

DROP POLICY IF EXISTS "finances_owner_all" ON public.finances;
CREATE POLICY "finances_owner_all" ON public.finances 
    FOR ALL USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "finance_budgets_owner_all" ON public.finance_budgets;
CREATE POLICY "finance_budgets_owner_all" ON public.finance_budgets 
    FOR ALL USING (auth.uid() = user_id);

-- 4. TRIGGERS
DROP TRIGGER IF EXISTS set_updated_at ON public.finance_categories;
CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.finance_categories 
    FOR EACH ROW EXECUTE FUNCTION handle_updated_at();

DROP TRIGGER IF EXISTS set_updated_at ON public.finances;
CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.finances 
    FOR EACH ROW EXECUTE FUNCTION handle_updated_at();

DROP TRIGGER IF EXISTS set_updated_at ON public.finance_budgets;
CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.finance_budgets 
    FOR EACH ROW EXECUTE FUNCTION handle_updated_at();

-- 5. INITIAL SEED (Global Categories)
INSERT INTO public.finance_categories (name, icon, user_id) VALUES
    ('Food', 'Utensils', NULL),
    ('Transport', 'Car', NULL),
    ('Shopping', 'ShoppingBag', NULL),
    ('Bills', 'Receipt', NULL),
    ('Entertainment', 'Play', NULL),
    ('Health', 'Heart', NULL),
    ('Travel', 'Plane', NULL),
    ('Misc', 'MoreHorizontal', NULL)
ON CONFLICT DO NOTHING;

-- Sub-categories for Food
DO $$ 
DECLARE 
    food_id UUID;
BEGIN
    SELECT id INTO food_id FROM public.finance_categories WHERE name = 'Food' AND parent_id IS NULL LIMIT 1;
    IF food_id IS NOT NULL THEN
        INSERT INTO public.finance_categories (name, parent_id, icon, user_id) VALUES
            ('Groceries', food_id, 'ShoppingBasket', NULL),
            ('Dining Out', food_id, 'Coffee', NULL)
        ON CONFLICT DO NOTHING;
    END IF;
END $$;
