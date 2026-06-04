from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.v1.analyze_review import router as analyze_review_router
from app.api.v1.reviews import router as reviews_router
from app.api.v1.reports import router as reports_router


app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:3001"],
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(
    analyze_review_router,
    prefix="/api/v1",
    tags=["Review Analysis"],
)

app.include_router(
    reviews_router,
    prefix="/api/v1",
    tags=["Reviews"],
)

app.include_router(
    reports_router,
    prefix="/api/v1",
    tags=["Reports"],
)
