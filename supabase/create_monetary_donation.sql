-- ─── CREATE MONETARY DONATION TABLE ─────────────────────────
-- Run this in your Supabase SQL Editor (SQL Editor -> New Query)

CREATE TABLE IF NOT EXISTS public.monetary_donation (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    full_name TEXT NOT NULL,
    amount NUMERIC NOT NULL,
    words_amount TEXT,
    payment_method TEXT,
    is_anonymous BOOLEAN DEFAULT false,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
    proof_of_Donation TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ─── SET UP SECURITY POLICIES ────────────────────────────────

ALTER TABLE public.monetary_donation ENABLE ROW LEVEL SECURITY;

-- Allow users to insert their own donations
DROP POLICY IF EXISTS "Users can insert their own monetary donations" ON public.monetary_donation;
CREATE POLICY "Users can insert their own monetary donations" 
    ON public.monetary_donation FOR INSERT 
    WITH CHECK (auth.uid() = user_id);

-- Allow users to view their own donations
DROP POLICY IF EXISTS "Users can view their own monetary donations" ON public.monetary_donation;
CREATE POLICY "Users can view their own monetary donations" 
    ON public.monetary_donation FOR SELECT 
    USING (auth.uid() = user_id);

-- ─── FINISHED ──────────────────────────────────────────────
