-- Feature 2-4: Soft Delete support for reviews

ALTER TABLE reviews
    ADD COLUMN is_deleted BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN deleted_at TIMESTAMPTZ;

CREATE INDEX idx_reviews_is_deleted ON reviews (is_deleted);

-- SELECT 정책 갱신: 삭제된 리뷰 제외
DROP POLICY IF EXISTS reviews_anon_select ON reviews;

CREATE POLICY reviews_select_active ON reviews
    FOR SELECT
    USING (is_deleted = false);

-- UPDATE 정책: 본인 리뷰만 soft delete 가능
CREATE POLICY reviews_soft_delete_own ON reviews
    FOR UPDATE TO authenticated
    USING (auth.uid() = user_id)
    WITH CHECK (is_deleted = true AND deleted_at IS NOT NULL);
