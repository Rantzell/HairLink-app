-- ─── MASTER DATABASE SETUP FOR HAIRLINK ──────────────────────────────
-- Run this entire script in your Supabase SQL Editor (SQL Editor -> New Query)
-- This will set up all tables, functions, triggers, and security policies.

-- 0. Enable Extension for UUIDs
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ─── TABLES ───────────────────────────────────────────────────────────

-- 1. Create Profiles Table (Core User Data)
CREATE TABLE IF NOT EXISTS public.profiles (
  id            UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  full_name     TEXT,
  role          TEXT DEFAULT 'Donor' CHECK (role IN ('Donor', 'Recipient')),
  age           INTEGER,
  gender        TEXT,
  phone         TEXT,
  city          TEXT,
  barangay      TEXT,
  address       TEXT,
  avatar_url    TEXT,
  reward_points INTEGER DEFAULT 0,
  referral_code TEXT UNIQUE,
  has_redeemed_code BOOLEAN DEFAULT FALSE,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);

-- Add avatar_url column if upgrading from an older schema
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS avatar_url TEXT;

-- 2. Create Hair Requests Table
CREATE TABLE IF NOT EXISTS public.hair_requests (
  id             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id        UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  story          TEXT NOT NULL,
  hair_length    TEXT NOT NULL,
  wig_color      TEXT NOT NULL,
  document_path  TEXT,
  reference_path TEXT,
  survey_source  TEXT[],
  permissions    TEXT[],
  status         TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'declined')),
  created_at     TIMESTAMPTZ DEFAULT NOW(),
  updated_at     TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Create Notifications Table
CREATE TABLE IF NOT EXISTS public.notifications (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id    UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  title      TEXT NOT NULL,
  message    TEXT NOT NULL,
  type       TEXT DEFAULT 'general',
  is_read    BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Create Donations Table (for DonationHistory & Calendar screens)
CREATE TABLE IF NOT EXISTS public.donations (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id           UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  type              TEXT NOT NULL CHECK (type IN ('hair', 'monetary')),
  status            TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  amount            NUMERIC DEFAULT 0,
  proof_url         TEXT,
  hair_length       TEXT,
  hair_color        TEXT,
  chemically_treated BOOLEAN DEFAULT false,
  address           TEXT,
  reason            TEXT,
  created_at        TIMESTAMPTZ DEFAULT NOW(),
  updated_at        TIMESTAMPTZ DEFAULT NOW()
);

-- ─── FUNCTIONS & TRIGGERS ─────────────────────────────────────────────

-- 5. Referral Code Generator
CREATE OR REPLACE FUNCTION generate_referral_code() RETURNS TEXT AS $$
DECLARE
    new_code TEXT;
    done BOOLEAN := FALSE;
BEGIN
    WHILE NOT done LOOP
        new_code := UPPER(substring(md5(random()::text) from 1 for 6));
        SELECT NOT EXISTS (SELECT 1 FROM public.profiles WHERE referral_code = new_code) INTO done;
    END LOOP;
    RETURN new_code;
END;
$$ LANGUAGE plpgsql;

-- 6. Assign referral code to new profiles (BEFORE INSERT trigger)
CREATE OR REPLACE FUNCTION public.handle_new_user_referral()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.referral_code IS NULL THEN
        NEW.referral_code := generate_referral_code();
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS on_profile_created_referral ON public.profiles;
CREATE TRIGGER on_profile_created_referral
    BEFORE INSERT ON public.profiles
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user_referral();

-- 7. Auto-create Profile on Sign Up (AFTER INSERT on auth.users)
--    Uses ON CONFLICT DO NOTHING so the trigger NEVER causes signup to fail.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (
    id,
    full_name,
    role,
    phone,
    city,
    barangay,
    address,
    age,
    gender
  )
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'role', 'Donor'),
    NEW.raw_user_meta_data->>'phone',
    NEW.raw_user_meta_data->>'city',
    NEW.raw_user_meta_data->>'barangay',
    NEW.raw_user_meta_data->>'address',
    CASE
      WHEN NEW.raw_user_meta_data->>'age' ~ '^\d+$'
      THEN (NEW.raw_user_meta_data->>'age')::INTEGER
      ELSE NULL
    END,
    NEW.raw_user_meta_data->>'gender'
  )
  ON CONFLICT (id) DO NOTHING;   -- safe re-runs & email-confirm flows
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  -- Log but never crash signup
  RAISE WARNING 'handle_new_user failed: %', SQLERRM;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 8. Referral Code Redemption RPC
CREATE OR REPLACE FUNCTION public.redeem_referral_code(code_to_redeem TEXT)
RETURNS JSON AS $$
DECLARE
    referrer_id       UUID;
    current_uid       UUID;
    already_redeemed  BOOLEAN;
    cleaned_code      TEXT;
BEGIN
    current_uid := auth.uid();
    IF current_uid IS NULL THEN
        RETURN json_build_object('success', false, 'message', 'Authentication required');
    END IF;

    cleaned_code := UPPER(TRIM(code_to_redeem));

    SELECT has_redeemed_code INTO already_redeemed FROM public.profiles WHERE id = current_uid;
    IF already_redeemed THEN
        RETURN json_build_object('success', false, 'message', 'You have already redeemed a referral code.');
    END IF;

    SELECT id INTO referrer_id FROM public.profiles
    WHERE UPPER(referral_code) = cleaned_code
      AND id != current_uid;

    IF referrer_id IS NULL THEN
        IF EXISTS (SELECT 1 FROM public.profiles WHERE id = current_uid AND UPPER(referral_code) = cleaned_code) THEN
            RETURN json_build_object('success', false, 'message', 'You cannot redeem your own referral code.');
        ELSE
            RETURN json_build_object('success', false, 'message', 'Invalid referral code.');
        END IF;
    END IF;

    UPDATE public.profiles
    SET reward_points = COALESCE(reward_points, 0) + 3,
        has_redeemed_code = true
    WHERE id = current_uid;

    UPDATE public.profiles
    SET reward_points = COALESCE(reward_points, 0) + 2
    WHERE id = referrer_id;

    INSERT INTO public.notifications (user_id, title, message, type)
    VALUES
    (current_uid, 'Welcome Gift! 🌟', 'You earned 3 stars for using a referral code!', 'donation'),
    (referrer_id, 'Referral Reward! 🎁', 'Someone used your code! You earned 2 bonus stars.', 'donation');

    RETURN json_build_object('success', true, 'message', 'Success! You earned 3 stars.');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ─── SECURITY POLICIES (RLS) ──────────────────────────────────────────

ALTER TABLE public.profiles    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hair_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.donations    ENABLE ROW LEVEL SECURITY;

-- Profiles Policies
DROP POLICY IF EXISTS "Users can view their own profiles"   ON public.profiles;
CREATE POLICY "Users can view their own profiles"   ON public.profiles FOR SELECT USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can update their own profiles" ON public.profiles;
CREATE POLICY "Users can update their own profiles" ON public.profiles FOR UPDATE USING (auth.uid() = id);

-- IMPORTANT: Allow service/trigger to insert profiles during signup
DROP POLICY IF EXISTS "Service role can insert profiles"    ON public.profiles;
CREATE POLICY "Service role can insert profiles"    ON public.profiles FOR INSERT WITH CHECK (true);

-- Hair Request Policies
DROP POLICY IF EXISTS "Users can insert their own requests" ON public.hair_requests;
CREATE POLICY "Users can insert their own requests" ON public.hair_requests FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can view their own requests"   ON public.hair_requests;
CREATE POLICY "Users can view their own requests"   ON public.hair_requests FOR SELECT USING (auth.uid() = user_id);

-- Notification Policies
DROP POLICY IF EXISTS "Users can view their own notifications"  ON public.notifications;
CREATE POLICY "Users can view their own notifications"  ON public.notifications FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own notifications" ON public.notifications;
CREATE POLICY "Users can insert their own notifications" ON public.notifications FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Donation Policies
DROP POLICY IF EXISTS "Users can insert their own donations" ON public.donations;
CREATE POLICY "Users can insert their own donations" ON public.donations FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can view their own donations"   ON public.donations;
CREATE POLICY "Users can view their own donations"   ON public.donations FOR SELECT USING (auth.uid() = user_id);

-- ─── STORAGE BUCKETS ──────────────────────────────────────────────────

DO $$
BEGIN
    -- hair-requests bucket (for medical docs & reference images)
    INSERT INTO storage.buckets (id, name, public)
    VALUES ('hair-requests', 'hair-requests', true)
    ON CONFLICT DO NOTHING;

    -- avatars bucket (for profile pictures)
    INSERT INTO storage.buckets (id, name, public)
    VALUES ('avatars', 'avatars', true)
    ON CONFLICT DO NOTHING;

    -- Storage policies for hair-requests
    DROP POLICY IF EXISTS "Allow authenticated uploads"  ON storage.objects;
    CREATE POLICY "Allow authenticated uploads"  ON storage.objects
        FOR INSERT TO authenticated WITH CHECK (bucket_id IN ('hair-requests', 'avatars'));

    DROP POLICY IF EXISTS "Allow authenticated selects" ON storage.objects;
    CREATE POLICY "Allow authenticated selects" ON storage.objects
        FOR SELECT TO authenticated USING (bucket_id IN ('hair-requests', 'avatars'));

    DROP POLICY IF EXISTS "Allow authenticated updates" ON storage.objects;
    CREATE POLICY "Allow authenticated updates" ON storage.objects
        FOR UPDATE TO authenticated USING (bucket_id IN ('hair-requests', 'avatars'));
END $$;
