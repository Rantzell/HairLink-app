-- ─── FIX DONATIONS TABLE (CALENDAR CRASH FIX) ─────────────────
-- This script fixes the "invalid input syntax for type bigint" error.

-- 1. Drop old policies to allow the change
DROP POLICY IF EXISTS "Users can insert their own donations" ON public.donations;
DROP POLICY IF EXISTS "Users can view their own donations" ON public.donations;

-- 2. Convert user_id to UUID
ALTER TABLE public.donations 
ALTER COLUMN user_id TYPE UUID USING NULL;

-- 3. Enable Security
ALTER TABLE public.donations ENABLE ROW LEVEL SECURITY;

-- 4. Create secure policies
CREATE POLICY "Users can insert their own donations" ON public.donations 
    FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view their own donations" ON public.donations 
    FOR SELECT TO authenticated USING (auth.uid() = user_id);
