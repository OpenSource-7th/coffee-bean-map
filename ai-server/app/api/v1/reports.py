import os

from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel
from slowapi import Limiter
from slowapi.util import get_remote_address
from supabase import create_client

limiter = Limiter(key_func=get_remote_address)
router = APIRouter()

_supabase = create_client(
    os.environ["SUPABASE_URL"],
    os.environ["SUPABASE_SERVICE_ROLE_KEY"],
)

VALID_REASONS = {"spam", "offensive", "irrelevant", "other"}


class CreateReportRequest(BaseModel):
    reporter_id: str
    review_id: str
    reason: str
    description: str | None = None


@router.post("/reports")
@limiter.limit("5/minute")
def create_report(body: CreateReportRequest, request: Request):
    if body.reason not in VALID_REASONS:
        raise HTTPException(
            status_code=422,
            detail=f"reason은 {sorted(VALID_REASONS)} 중 하나여야 합니다.",
        )

    review_result = (
        _supabase.table("reviews")
        .select("id, is_deleted")
        .eq("id", body.review_id)
        .single()
        .execute()
    )

    if not review_result.data:
        raise HTTPException(status_code=404, detail="해당 리뷰를 찾을 수 없습니다.")
    if review_result.data["is_deleted"]:
        raise HTTPException(status_code=409, detail="이미 삭제된 리뷰입니다.")

    existing = (
        _supabase.table("reports")
        .select("id")
        .eq("reporter_id", body.reporter_id)
        .eq("review_id", body.review_id)
        .execute()
    )
    if existing.data:
        raise HTTPException(status_code=409, detail="이미 신고한 리뷰입니다.")

    result = (
        _supabase.table("reports")
        .insert(
            {
                "reporter_id": body.reporter_id,
                "review_id": body.review_id,
                "reason": body.reason,
                "description": body.description,
            }
        )
        .execute()
    )

    return {"status": "ok", "report_id": result.data[0]["id"]}
