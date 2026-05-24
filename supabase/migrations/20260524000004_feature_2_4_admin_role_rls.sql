-- Feature 2-4: Admin Role 전용 RLS 정책
-- app_metadata.role = 'admin' 기반 (Supabase 대시보드에서만 설정 가능, 유저 변조 불가)

CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- menus: authenticated 전체 허용 → admin 전용으로 교체
DROP POLICY IF EXISTS menus_authenticated_insert ON menus;
DROP POLICY IF EXISTS menus_authenticated_delete ON menus;

CREATE POLICY menus_admin_insert ON menus
  FOR INSERT TO authenticated
  WITH CHECK (is_admin());

CREATE POLICY menus_admin_delete ON menus
  FOR DELETE TO authenticated
  USING (is_admin());

-- reports: admin은 전체 신고 조회 + 상태 업데이트 가능
CREATE POLICY reports_admin_select ON reports
  FOR SELECT TO authenticated
  USING (is_admin());

CREATE POLICY reports_admin_update ON reports
  FOR UPDATE TO authenticated
  USING (is_admin())
  WITH CHECK (status IN ('approved', 'rejected'));

-- reviews: admin이 어떤 리뷰든 soft delete 가능
CREATE POLICY reviews_admin_soft_delete ON reviews
  FOR UPDATE TO authenticated
  USING (is_admin())
  WITH CHECK (is_deleted = true AND deleted_at IS NOT NULL);
