from datetime import datetime, timezone

from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel
from slowapi import Limiter
from slowapi.util import get_remote_address
from supabase import create_client

from app.core.config import settings
from app.core.metrics import DB_QUERY_LATENCY

limiter = Limiter(key_func=get_remote_address)
router = APIRouter()

_supabase = create_client(settings.SUPABASE_URL, settings.SUPABASE_SERVICE_ROLE_KEY)


class SoftDeleteRequest(BaseModel):
    user_id: str


@router.patch("/reviews/{review_id}/delete")
@limiter.limit("30/minute")
def soft_delete_review(review_id: str, body: SoftDeleteRequest, request: Request):
    with DB_QUERY_LATENCY.labels(operation="select_review").time():
        result = (
            _supabase.table("reviews")
            .select("id, user_id, is_deleted")
            .eq("id", review_id)
            .single()
            .execute()
        )

    if not result.data:
        raise HTTPException(status_code=404, detail="리뷰를 찾을 수 없습니다.")

    review = result.data
    if review["is_deleted"]:
        raise HTTPException(status_code=409, detail="이미 삭제된 리뷰입니다.")

    if review["user_id"] != body.user_id:
        raise HTTPException(status_code=403, detail="본인의 리뷰만 삭제할 수 있습니다.")

    with DB_QUERY_LATENCY.labels(operation="soft_delete_review").time():
        _supabase.table("reviews").update(
            {
                "is_deleted": True,
                "deleted_at": datetime.now(timezone.utc).isoformat(),
            }
        ).eq("id", review_id).execute()

    return {"status": "ok", "review_id": review_id}
