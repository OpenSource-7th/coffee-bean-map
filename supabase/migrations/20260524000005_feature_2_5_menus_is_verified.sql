-- Feature 2-5: menus 테이블 is_verified 컬럼 추가
-- 관리자 승인 여부 (사용자 태그 추가 요청 시 기본 false, 관리자 직접 추가 시 true)

ALTER TABLE menus ADD COLUMN is_verified BOOLEAN NOT NULL DEFAULT false;

-- 기존 시드 데이터는 관리자가 직접 입력한 메뉴이므로 전부 승인 처리
UPDATE menus SET is_verified = true;

-- admin이 is_verified를 업데이트할 수 있도록 RLS 정책 추가
CREATE POLICY menus_admin_update ON menus
  FOR UPDATE TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());
