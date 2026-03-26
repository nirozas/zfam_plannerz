CREATE TABLE IF NOT EXISTS public.finance_payment_methods (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, name)
);
ALTER TABLE public.finance_payment_methods ENABLE ROW LEVEL SECURITY;
CREATE POLICY "finance_payment_methods_owner_all" ON public.finance_payment_methods FOR ALL USING (auth.uid() = user_id);
