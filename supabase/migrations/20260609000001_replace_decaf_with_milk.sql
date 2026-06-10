ALTER TABLE public.user_taste_profiles
  ADD COLUMN IF NOT EXISTS milk NUMERIC(4,3) NOT NULL DEFAULT 0
  CHECK (milk >= 0 AND milk <= 1);

ALTER TABLE public.menu_taste_profiles
  ADD COLUMN IF NOT EXISTS milk_score NUMERIC(4,3) NOT NULL DEFAULT 0
  CHECK (milk_score >= 0 AND milk_score <= 1);

UPDATE public.menu_taste_profiles AS profile
SET milk_score = 0.95
FROM public.menus AS menu
WHERE profile.menu_id = menu.id
  AND (
    menu.menu_name ILIKE '%라떼%'
    OR menu.menu_name ILIKE '%latte%'
    OR menu.menu_name ILIKE '%flat%'
    OR menu.menu_name ILIKE '%플랫화이트%'
    OR menu.menu_name ILIKE '%카푸치노%'
  );

ALTER TABLE public.user_taste_profiles
  DROP COLUMN IF EXISTS decaf;

ALTER TABLE public.menu_taste_profiles
  DROP COLUMN IF EXISTS decaf_score;
