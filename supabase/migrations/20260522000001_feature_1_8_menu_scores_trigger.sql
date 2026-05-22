-- Feature 1-8: Background Aggregation Worker
-- reviews INSERT 후 menu_scores 자동 집계 (PostgreSQL Trigger 방식)
-- 변경 내용:
--   1. menu_scores 에 is_signature BOOLEAN 컬럼 추가
--   2. update_menu_scores_on_review() 집계 함수 생성
--   3. AFTER INSERT 트리거 생성

-- ----------------------------------------------------------------
-- 1. menu_scores 테이블: is_signature 컬럼 추가
-- ----------------------------------------------------------------
ALTER TABLE menu_scores
  ADD COLUMN IF NOT EXISTS is_signature BOOLEAN NOT NULL DEFAULT false;

-- ----------------------------------------------------------------
-- 2. 집계 함수 정의
--
-- 설계:
--   - 전체 재계산(COUNT FILTER) 방식: Soft Delete 이후에도 정확성 보장
--   - AFTER INSERT: 방금 삽입된 행이 COUNT에 포함됨
--   - SECURITY DEFINER: RLS를 우회해 menu_scores INSERT/UPDATE 가능
--     (기존 handle_new_user() 트리거와 동일 패턴)
--
-- 상수 (변경 시 DECLARE 블록만 수정):
--   v_C  = 5.0  — Bayesian prior strength (가상 리뷰 수)
--   v_m  = 0.6  — Bayesian prior mean (사전 기대 점수)
--   v_MIN_REVIEWS      = 5   — 시그니처 최소 리뷰 수
--   v_BAYESIAN_THRESH  = 0.7 — 시그니처 Bayesian score 임계값
--   v_POS_RATIO_THRESH = 0.6 — 시그니처 긍정 비율 임계값
-- ----------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.update_menu_scores_on_review()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_C  CONSTANT NUMERIC := 5.0;
  v_m  CONSTANT NUMERIC := 0.6;

  v_MIN_REVIEWS      CONSTANT INT     := 5;
  v_BAYESIAN_THRESH  CONSTANT NUMERIC := 0.7;
  v_POS_RATIO_THRESH CONSTANT NUMERIC := 0.6;

  v_pos_count    INT;
  v_neu_count    INT;
  v_neg_count    INT;
  v_total        INT;
  v_weighted     NUMERIC;
  v_bayesian     NUMERIC;
  v_pos_ratio    NUMERIC;
  v_is_signature BOOLEAN;
BEGIN
  -- menu_id 없는 리뷰는 집계 대상 아님
  IF NEW.menu_id IS NULL THEN
    RETURN NEW;
  END IF;

  -- 해당 menu_id 의 유효 sentiment 리뷰 전체 재계산
  SELECT
    COUNT(*) FILTER (WHERE sentiment = 'positive'),
    COUNT(*) FILTER (WHERE sentiment = 'neutral'),
    COUNT(*) FILTER (WHERE sentiment = 'negative'),
    COUNT(*) FILTER (WHERE sentiment IN ('positive', 'neutral', 'negative'))
  INTO v_pos_count, v_neu_count, v_neg_count, v_total
  FROM reviews
  WHERE menu_id = NEW.menu_id;

  -- 유효 sentiment 가 없으면 점수 NULL 유지
  IF v_total = 0 THEN
    INSERT INTO menu_scores (
      cafe_id, menu_id,
      positive_count, neutral_count, negative_count,
      weighted_score, bayesian_score, is_signature, updated_at
    )
    VALUES (NEW.cafe_id, NEW.menu_id, 0, 0, 0, NULL, NULL, false, NOW())
    ON CONFLICT (cafe_id, menu_id) DO UPDATE SET
      positive_count = 0,
      neutral_count  = 0,
      negative_count = 0,
      weighted_score = NULL,
      bayesian_score = NULL,
      is_signature   = false,
      updated_at     = NOW();
    RETURN NEW;
  END IF;

  -- weighted_score = (pos*1.0 + neu*0.5 + neg*0.0) / total
  v_weighted := (v_pos_count::NUMERIC * 1.0
               + v_neu_count::NUMERIC  * 0.5
               + v_neg_count::NUMERIC  * 0.0)
               / v_total;

  -- bayesian_score = (C*m + n*weighted) / (C + n)
  v_bayesian := (v_C * v_m + v_total * v_weighted) / (v_C + v_total);

  -- positive_ratio = positive_count / total
  v_pos_ratio := v_pos_count::NUMERIC / v_total;

  -- 시그니처 여부: 세 조건 모두 충족
  v_is_signature := (
    v_total     >= v_MIN_REVIEWS
    AND v_bayesian  >= v_BAYESIAN_THRESH
    AND v_pos_ratio >= v_POS_RATIO_THRESH
  );

  -- UPSERT: (cafe_id, menu_id) UNIQUE 제약 활용
  INSERT INTO menu_scores (
    cafe_id, menu_id,
    positive_count, neutral_count, negative_count,
    weighted_score, bayesian_score, is_signature, updated_at
  )
  VALUES (
    NEW.cafe_id, NEW.menu_id,
    v_pos_count, v_neu_count, v_neg_count,
    v_weighted, v_bayesian, v_is_signature, NOW()
  )
  ON CONFLICT (cafe_id, menu_id) DO UPDATE SET
    positive_count = EXCLUDED.positive_count,
    neutral_count  = EXCLUDED.neutral_count,
    negative_count = EXCLUDED.negative_count,
    weighted_score = EXCLUDED.weighted_score,
    bayesian_score = EXCLUDED.bayesian_score,
    is_signature   = EXCLUDED.is_signature,
    updated_at     = NOW();

  RETURN NEW;
END;
$$;

-- ----------------------------------------------------------------
-- 3. AFTER INSERT 트리거 생성
-- ----------------------------------------------------------------
DROP TRIGGER IF EXISTS trg_update_menu_scores ON reviews;

CREATE TRIGGER trg_update_menu_scores
  AFTER INSERT ON reviews
  FOR EACH ROW
  EXECUTE FUNCTION public.update_menu_scores_on_review();
