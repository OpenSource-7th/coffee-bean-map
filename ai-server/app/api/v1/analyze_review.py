import time

from fastapi import APIRouter
from pydantic import BaseModel, Field

from app.core.config import settings
from app.core.text_cleaner import clean_review_text
from app.models.predict import KcbertRelevancePredictor, KoelectraSentimentPredictor


router = APIRouter()

kcbert_predictor = KcbertRelevancePredictor()
koelectra_predictor = KoelectraSentimentPredictor()


class AnalyzeReviewRequest(BaseModel):
    user_id: str
    cafe_id: str
    menu_id: str
    review_text: str = Field(..., min_length=1)


class AnalyzeReviewResponse(BaseModel):
    status: str
    sentiment: str
    confidence: float
    menu_relevance: float
    latency_ms: float


@router.post("/analyze-review", response_model=AnalyzeReviewResponse)
def analyze_review(request: AnalyzeReviewRequest):
    start_time = time.perf_counter()

    cleaned_text = clean_review_text(
        request.review_text,
        kcbert_predictor.tokenizer,
    )

    relevance_label, menu_relevance = kcbert_predictor.predict(cleaned_text)

    if relevance_label == 0 or menu_relevance < settings.MENU_RELEVANCE_THRESHOLD:
        sentiment = "neutral"
        confidence = menu_relevance
    else:
        sentiment, confidence = koelectra_predictor.predict(cleaned_text)

        if confidence < settings.SENTIMENT_CONFIDENCE_THRESHOLD:
            sentiment = "neutral"

    latency_ms = round((time.perf_counter() - start_time) * 1000, 3)

    return AnalyzeReviewResponse(
        status="success",
        sentiment=sentiment,
        confidence=round(confidence, 4),
        menu_relevance=round(menu_relevance, 4),
        latency_ms=latency_ms,
    )