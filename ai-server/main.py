from fastapi import FastAPI

from app.api.v1.analyze_review import router as analyze_review_router


app = FastAPI()

app.include_router(
    analyze_review_router,
    prefix="/api/v1",
    tags=["Review Analysis"],
)