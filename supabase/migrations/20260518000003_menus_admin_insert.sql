-- menus: authenticated 사용자 INSERT 허용 (개발 단계 어드민 환경용)
-- 추후 admin 전용 RLS 정책으로 교체 예정
CREATE POLICY menus_authenticated_insert
  ON menus FOR INSERT TO authenticated
  WITH CHECK (true);
