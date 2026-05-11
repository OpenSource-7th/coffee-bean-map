-- cafes: anon SELECT 허용 (지도 핀 렌더링)
DROP POLICY IF EXISTS cafes_anon_select ON cafes;
CREATE POLICY cafes_anon_select
  ON cafes FOR SELECT TO anon
  USING (true);

-- reviews: anon SELECT 허용 (카페 모달 리뷰 목록)
DROP POLICY IF EXISTS reviews_anon_select ON reviews;
CREATE POLICY reviews_anon_select
  ON reviews FOR SELECT TO anon
  USING (true);

-- reviews: AI 검증 통과 리뷰 INSERT 허용
-- WITH CHECK: confidence_score >= 0.85 조건을 DB 레벨에서 이중 검증
-- (테이블 CHECK 제약 + RLS WITH CHECK = 2중 방어선)
DROP POLICY IF EXISTS reviews_anon_insert ON reviews;
CREATE POLICY reviews_anon_insert
  ON reviews FOR INSERT TO anon
  WITH CHECK (confidence_score >= 0.85);

-- spatial_ref_sys RLS는 PostGIS 소유 테이블이라 마이그레이션으로 변경 불가.
-- Supabase 대시보드 > Database > Tables > spatial_ref_sys에서 직접 활성화 필요.
