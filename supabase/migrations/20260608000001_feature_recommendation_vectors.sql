-- Feature: Recommendation taste vectors
-- Adds interpretable taste-vector tables used by the recommendation scorer.

CREATE TABLE IF NOT EXISTS public.user_taste_profiles (
  user_id    UUID         PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  acidity    NUMERIC(4,3) NOT NULL DEFAULT 0 CHECK (acidity >= 0 AND acidity <= 1),
  sweetness  NUMERIC(4,3) NOT NULL DEFAULT 0 CHECK (sweetness >= 0 AND sweetness <= 1),
  bitterness NUMERIC(4,3) NOT NULL DEFAULT 0 CHECK (bitterness >= 0 AND bitterness <= 1),
  nutty      NUMERIC(4,3) NOT NULL DEFAULT 0 CHECK (nutty >= 0 AND nutty <= 1),
  body       NUMERIC(4,3) NOT NULL DEFAULT 0 CHECK (body >= 0 AND body <= 1),
  aroma      NUMERIC(4,3) NOT NULL DEFAULT 0 CHECK (aroma >= 0 AND aroma <= 1),
  milk       NUMERIC(4,3) NOT NULL DEFAULT 0 CHECK (milk >= 0 AND milk <= 1),
  taste_match_weight NUMERIC(5,4) NOT NULL DEFAULT 0.5000 CHECK (taste_match_weight >= 0 AND taste_match_weight <= 1),
  similar_user_weight NUMERIC(5,4) NOT NULL DEFAULT 0.3000 CHECK (similar_user_weight >= 0 AND similar_user_weight <= 1),
  sentiment_weight NUMERIC(5,4) NOT NULL DEFAULT 0.1500 CHECK (sentiment_weight >= 0 AND sentiment_weight <= 1),
  popularity_weight NUMERIC(5,4) NOT NULL DEFAULT 0.0500 CHECK (popularity_weight >= 0 AND popularity_weight <= 1),
  created_at TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

ALTER TABLE public.user_taste_profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS user_taste_profiles_authenticated_select ON public.user_taste_profiles;
CREATE POLICY user_taste_profiles_authenticated_select
  ON public.user_taste_profiles FOR SELECT TO authenticated
  USING (true);

DROP POLICY IF EXISTS user_taste_profiles_insert_own ON public.user_taste_profiles;
CREATE POLICY user_taste_profiles_insert_own
  ON public.user_taste_profiles FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS user_taste_profiles_update_own ON public.user_taste_profiles;
CREATE POLICY user_taste_profiles_update_own
  ON public.user_taste_profiles FOR UPDATE TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE TABLE IF NOT EXISTS public.menu_taste_profiles (
  menu_id          UUID         PRIMARY KEY REFERENCES public.menus(id) ON DELETE CASCADE,
  cafe_id          UUID         NOT NULL REFERENCES public.cafes(id) ON DELETE CASCADE,
  acidity_score    NUMERIC(4,3) NOT NULL DEFAULT 0 CHECK (acidity_score >= 0 AND acidity_score <= 1),
  sweetness_score  NUMERIC(4,3) NOT NULL DEFAULT 0 CHECK (sweetness_score >= 0 AND sweetness_score <= 1),
  bitterness_score NUMERIC(4,3) NOT NULL DEFAULT 0 CHECK (bitterness_score >= 0 AND bitterness_score <= 1),
  nutty_score      NUMERIC(4,3) NOT NULL DEFAULT 0 CHECK (nutty_score >= 0 AND nutty_score <= 1),
  body_score       NUMERIC(4,3) NOT NULL DEFAULT 0 CHECK (body_score >= 0 AND body_score <= 1),
  aroma_score      NUMERIC(4,3) NOT NULL DEFAULT 0 CHECK (aroma_score >= 0 AND aroma_score <= 1),
  milk_score       NUMERIC(4,3) NOT NULL DEFAULT 0 CHECK (milk_score >= 0 AND milk_score <= 1),
  created_at       TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  UNIQUE (cafe_id, menu_id)
);

CREATE INDEX IF NOT EXISTS idx_menu_taste_profiles_cafe_id
  ON public.menu_taste_profiles(cafe_id);

ALTER TABLE public.menu_taste_profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS menu_taste_profiles_anon_select ON public.menu_taste_profiles;
CREATE POLICY menu_taste_profiles_anon_select
  ON public.menu_taste_profiles FOR SELECT TO anon
  USING (true);

DROP POLICY IF EXISTS menu_taste_profiles_authenticated_select ON public.menu_taste_profiles;
CREATE POLICY menu_taste_profiles_authenticated_select
  ON public.menu_taste_profiles FOR SELECT TO authenticated
  USING (true);
