-- ----------------------------------------------------------------
-- 1. public.profiles 테이블
--    auth.users와 1:1 연결. 회원 탈퇴 시 CASCADE 삭제.
-- ----------------------------------------------------------------
CREATE TABLE public.profiles (
  id          UUID        PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email       TEXT        NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY profiles_select_own
  ON profiles FOR SELECT TO authenticated
  USING (auth.uid() = id);

CREATE POLICY profiles_update_own
  ON profiles FOR UPDATE TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- ----------------------------------------------------------------
-- 2. 회원가입 시 profiles 자동 생성 트리거
--    SECURITY DEFINER + SET search_path = public 으로
--    스키마 인젝션 공격 차단 (Supabase 보안 어드바이저 권장 패턴)
-- ----------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email)
  VALUES (NEW.id, NEW.email);
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- ----------------------------------------------------------------
-- 3. reviews.user_id → auth.users FK 추가
--    NOT VALID: Feature 1-7 시드에 reviews 미포함 예정이므로
--    기존 데이터 검증 생략.
-- ----------------------------------------------------------------
ALTER TABLE public.reviews
  ADD CONSTRAINT reviews_user_id_fkey
  FOREIGN KEY (user_id)
  REFERENCES auth.users(id)
  ON DELETE CASCADE
  NOT VALID;

-- ----------------------------------------------------------------
-- 4. RLS 정책 교체: anon INSERT → authenticated INSERT
--    auth.uid() = user_id: 타인 user_id 사칭 삽입 차단
--    confidence_score >= 0.85: 테이블 CHECK와 2중 방어선 유지
-- ----------------------------------------------------------------
DROP POLICY IF EXISTS reviews_anon_insert ON reviews;

CREATE POLICY reviews_authenticated_insert
  ON reviews FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() = user_id
    AND confidence_score >= 0.85
  );
