-- menus: authenticated 사용자 DELETE 허용 (개발 단계 어드민 환경용)
CREATE POLICY menus_authenticated_delete
  ON menus FOR DELETE TO authenticated
  USING (true);
