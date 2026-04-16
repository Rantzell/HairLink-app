-- ─── NUCLEAR FIX FOR MONETARY_DONATIONS ──────────────────────
-- This script removes broken constraints and fixes type mismatches.

-- 1. Drop the broken foreign key first
ALTER TABLE public.monetary_donations DROP CONSTRAINT IF EXISTS monetary_donations_user_id_foreign;

-- 2. Drop the old policies
DROP POLICY IF EXISTS "Allow authenticated inserts" ON public.monetary_donations;
DROP POLICY IF EXISTS "Allow authenticated selects" ON public.monetary_donations;

-- 3. Force user_id to UUID
ALTER TABLE public.monetary_donations 
ALTER COLUMN user_id TYPE UUID USING NULL;

-- 4. Add missing columns
ALTER TABLE public.monetary_donations ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'pending';
ALTER TABLE public.monetary_donations ADD COLUMN IF NOT EXISTS proof_of_donation TEXT;
ALTER TABLE public.monetary_donations ADD COLUMN IF NOT EXISTS currency TEXT DEFAULT 'PHP';
ALTER TABLE public.monetary_donations ADD COLUMN IF NOT EXISTS payment_method TEXT;

-- 5. Enable Security
ALTER TABLE public.monetary_donations ENABLE ROW LEVEL SECURITY;

-- 6. Create clean, working policies
CREATE POLICY "Allow authenticated inserts" ON public.monetary_donations 
    FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Allow authenticated selects" ON public.monetary_donations 
    FOR SELECT TO authenticated USING (auth.uid() = user_id);
