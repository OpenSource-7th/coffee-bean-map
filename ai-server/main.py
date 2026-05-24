from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from slowapi.util import get_remote_address

from app.api.v1.analyze_review import router as analyze_review_router
from app.api.v1.reports import router as reports_router
from app.api.v1.reviews import router as reviews_router

limiter = Limiter(key_func=get_remote_address, default_limits=["60/minute"])

app = FastAPI()
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_methods=["POST", "PATCH", "GET"],
    allow_headers=["Content-Type"],
)

app.include_router(analyze_review_router, prefix="/api/v1", tags=["Review Analysis"])
app.include_router(reviews_router, prefix="/api/v1", tags=["Reviews"])
app.include_router(reports_router, prefix="/api/v1", tags=["Reports"])