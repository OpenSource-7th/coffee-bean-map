import os

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, Response
from prometheus_client import CONTENT_TYPE_LATEST, CollectorRegistry, generate_latest
from prometheus_fastapi_instrumentator import Instrumentator
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

Instrumentator(
    should_group_status_codes=False,
    should_ignore_untemplated=True,
    excluded_handlers=["/health", "/metrics"],
).instrument(app)

app.include_router(analyze_review_router, prefix="/api/v1", tags=["Review Analysis"])
app.include_router(reviews_router, prefix="/api/v1", tags=["Reviews"])
app.include_router(reports_router, prefix="/api/v1", tags=["Reports"])


@app.get("/health")
def health_check():
    return {"status": "ok"}


@app.get("/metrics", include_in_schema=False)
def get_metrics():
    multiproc_dir = os.getenv("PROMETHEUS_MULTIPROC_DIR")
    if multiproc_dir:
        from prometheus_client import multiprocess

        registry = CollectorRegistry()
        multiprocess.MultiProcessCollector(registry)
        data = generate_latest(registry)
    else:
        from prometheus_client import REGISTRY

        data = generate_latest(REGISTRY)
    return Response(content=data, media_type=CONTENT_TYPE_LATEST)