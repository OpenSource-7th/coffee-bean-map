-- Feature 2-4: Reports table for user review flagging

CREATE TABLE reports (
    id          UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
    reporter_id UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    review_id   UUID        NOT NULL REFERENCES reviews(id)   ON DELETE CASCADE,
    reason      VARCHAR(50) NOT NULL
                CHECK (reason IN ('spam', 'offensive', 'irrelevant', 'other')),
    description TEXT,
    status      VARCHAR(20) NOT NULL DEFAULT 'pending'
                CHECK (status IN ('pending', 'approved', 'rejected')),
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE reports ENABLE ROW LEVEL SECURITY;

-- 인증된 사용자가 신고 제출 가능
CREATE POLICY reports_insert ON reports
    FOR INSERT TO authenticated
    WITH CHECK (auth.uid() = reporter_id);

-- 본인이 제출한 신고만 조회 가능
CREATE POLICY reports_select_own ON reports
    FOR SELECT TO authenticated
    USING (auth.uid() = reporter_id);
