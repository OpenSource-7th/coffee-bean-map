-- Feature 2-4 fix: reviews_authenticated_select (USING true) 제거
-- reviews_select_active (is_deleted = false, public roles) 로 통합하여
-- soft delete된 리뷰가 authenticated 사용자에게 노출되는 문제 해결
DROP POLICY IF EXISTS reviews_authenticated_select ON reviews;
