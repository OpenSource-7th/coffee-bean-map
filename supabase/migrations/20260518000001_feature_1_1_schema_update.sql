-- Feature 1-1: DB 스키마 업데이트
-- cafes.menu_tags 제거, menus/menu_scores 테이블 생성,
-- reviews 컬럼 추가, get_cafes_within_radius 함수 업데이트

-- 1. cafes 테이블 menu_tags 제거
DROP INDEX IF EXISTS idx_cafes_menu_tags;
ALTER TABLE cafes DROP COLUMN IF EXISTS menu_tags;

-- 2. menus 테이블 생성
CREATE TABLE menus (
  id         UUID         PRIMARY KEY DEFAULT uuid_generate_v4(),
  cafe_id    UUID         NOT NULL REFERENCES cafes(id) ON DELETE CASCADE,
  menu_name  VARCHAR(100) NOT NULL,
  created_at TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

ALTER TABLE menus ENABLE ROW LEVEL SECURITY;

-- 3. menu_scores 테이블 생성
CREATE TABLE menu_scores (
  id              UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  cafe_id         UUID        NOT NULL REFERENCES cafes(id) ON DELETE CASCADE,
  menu_id         UUID        NOT NULL REFERENCES menus(id) ON DELETE CASCADE,
  positive_count  INT         NOT NULL DEFAULT 0,
  neutral_count   INT         NOT NULL DEFAULT 0,
  negative_count  INT         NOT NULL DEFAULT 0,
  weighted_score  FLOAT,
  bayesian_score  FLOAT,
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (cafe_id, menu_id)
);

ALTER TABLE menu_scores ENABLE ROW LEVEL SECURITY;

-- 4. reviews 테이블 수정
-- binary 분류 기준 CHECK 제약 제거 (3단계 sentiment 분류로 전환)
ALTER TABLE reviews DROP CONSTRAINT IF EXISTS reviews_confidence_score_check;

-- menu_id FK 추가 (기존 rows 호환을 위해 nullable)
ALTER TABLE reviews
  ADD COLUMN menu_id        UUID        REFERENCES menus(id) ON DELETE SET NULL;

-- sentiment 컬럼 추가
ALTER TABLE reviews
  ADD COLUMN sentiment      VARCHAR(20) CHECK (sentiment IN ('positive', 'neutral', 'negative'));

-- menu_relevance 컬럼 추가
ALTER TABLE reviews
  ADD COLUMN menu_relevance FLOAT;

-- 5. 인덱스 추가
CREATE INDEX idx_menu_scores_menu_bayesian ON menu_scores (menu_id, bayesian_score DESC);
CREATE INDEX idx_reviews_menu_id           ON reviews (menu_id);

-- 6. get_cafes_within_radius 함수 업데이트 (menu_tags 반환 제거)
-- 반환 타입 변경이므로 먼저 DROP 후 재생성
DROP FUNCTION IF EXISTS get_cafes_within_radius(DOUBLE PRECISION, DOUBLE PRECISION, DOUBLE PRECISION);

CREATE OR REPLACE FUNCTION get_cafes_within_radius(
  lat           DOUBLE PRECISION,
  lng           DOUBLE PRECISION,
  radius_meters DOUBLE PRECISION
)
RETURNS TABLE (
  id         UUID,
  name       VARCHAR,
  address    VARCHAR,
  lat        DOUBLE PRECISION,
  lng        DOUBLE PRECISION,
  created_at TIMESTAMPTZ
)
LANGUAGE sql
STABLE
SECURITY INVOKER
AS $$
  SELECT
    c.id,
    c.name,
    c.address,
    ST_Y(c.location::geometry) AS lat,
    ST_X(c.location::geometry) AS lng,
    c.created_at
  FROM cafes c
  WHERE ST_DWithin(
    c.location,
    ST_MakePoint(lng, lat)::geography,
    radius_meters
  )
  ORDER BY c.location <-> ST_MakePoint(lng, lat)::geography;
$$;
