from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.v1.analyze_review import router as analyze_review_router


app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_methods=["POST"],
    allow_headers=["Content-Type"],
)

app.include_router(
    analyze_review_router,
    prefix="/api/v1",
    tags=["Review Analysis"],
)