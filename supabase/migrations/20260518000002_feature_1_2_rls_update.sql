-- Feature 1-2: RLS 정책 수정
-- cafes RLS 활성화 + authenticated SELECT, reviews INSERT 정책 갱신,
-- menus/menu_scores READ 정책 추가

-- ----------------------------------------------------------------
-- 1. cafes: RLS 활성화 + anon/authenticated SELECT, 쓰기 차단
-- ----------------------------------------------------------------
ALTER TABLE cafes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS cafes_anon_select ON cafes;
CREATE POLICY cafes_anon_select
  ON cafes FOR SELECT TO anon
  USING (true);

DROP POLICY IF EXISTS cafes_authenticated_select ON cafes;
CREATE POLICY cafes_authenticated_select
  ON cafes FOR SELECT TO authenticated
  USING (true);

-- INSERT/UPDATE/DELETE: 정책 없음 = RLS가 차단

-- ----------------------------------------------------------------
-- 2. reviews: RLS 활성화
--    + anon/authenticated SELECT
--    + authenticated INSERT 정책 수정 (confidence_score 조건 제거)
-- ----------------------------------------------------------------
ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS reviews_anon_select ON reviews;
CREATE POLICY reviews_anon_select
  ON reviews FOR SELECT TO anon
  USING (true);

DROP POLICY IF EXISTS reviews_authenticated_select ON reviews;
CREATE POLICY reviews_authenticated_select
  ON reviews FOR SELECT TO authenticated
  USING (true);

-- Feature 1-1에서 confidence_score >= 0.85 CHECK 제약 제거됨.
-- sentiment 기반 3단계 분류로 전환했으므로 WITH CHECK도 갱신.
DROP POLICY IF EXISTS reviews_authenticated_insert ON reviews;
CREATE POLICY reviews_authenticated_insert
  ON reviews FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- ----------------------------------------------------------------
-- 3. menus: anon/authenticated SELECT 허용
--    (필터 UI, 리뷰 폼에서 카페별 메뉴 목록 공개 읽기 필요)
-- ----------------------------------------------------------------
DROP POLICY IF EXISTS menus_anon_select ON menus;
CREATE POLICY menus_anon_select
  ON menus FOR SELECT TO anon
  USING (true);

DROP POLICY IF EXISTS menus_authenticated_select ON menus;
CREATE POLICY menus_authenticated_select
  ON menus FOR SELECT TO authenticated
  USING (true);

-- ----------------------------------------------------------------
-- 4. menu_scores: authenticated SELECT 허용
--    (시그니처 메뉴 Bayesian score 표시 용도)
-- ----------------------------------------------------------------
DROP POLICY IF EXISTS menu_scores_authenticated_select ON menu_scores;
CREATE POLICY menu_scores_authenticated_select
  ON menu_scores FOR SELECT TO authenticated
  USING (true);
