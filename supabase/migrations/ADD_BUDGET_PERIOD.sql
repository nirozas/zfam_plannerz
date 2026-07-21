-- Migration to add period column to finance_budgets

-- Add the column with a default value
ALTER TABLE public.finance_budgets ADD COLUMN IF NOT EXISTS period TEXT DEFAULT 'monthly' CHECK (period IN ('monthly', 'yearly'));

-- Drop the old unique constraint if it exists
ALTER TABLE public.finance_budgets DROP CONSTRAINT IF EXISTS finance_budgets_user_id_type_category_id_month_year_key;

-- Add a new unique constraint that includes period
ALTER TABLE public.finance_budgets DROP CONSTRAINT IF EXISTS finance_budgets_user_id_type_category_id_month_year_period_key;
ALTER TABLE public.finance_budgets ADD CONSTRAINT finance_budgets_user_id_type_category_id_month_year_period_key UNIQUE(user_id, type, category_id, month, year, period);
