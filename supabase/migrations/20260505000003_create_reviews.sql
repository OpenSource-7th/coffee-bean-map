CREATE TABLE reviews (
  id               UUID         PRIMARY KEY DEFAULT uuid_generate_v4(),
  cafe_id          UUID         NOT NULL REFERENCES cafes(id) ON DELETE CASCADE,
  user_id          UUID         NOT NULL,
  review_text      TEXT         NOT NULL,
  confidence_score NUMERIC(5,4) NOT NULL CHECK (confidence_score >= 0.85),
  created_at       TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- 카페별 리뷰 조회
CREATE INDEX idx_reviews_cafe_id    ON reviews(cafe_id);

-- "내가 쓴 리뷰 모아보기" (Should Have) 대비
CREATE INDEX idx_reviews_user_id    ON reviews(user_id);

-- 최신순 정렬
CREATE INDEX idx_reviews_created_at ON reviews(created_at DESC);
