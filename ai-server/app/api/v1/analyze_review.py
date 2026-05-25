import time

from fastapi import APIRouter, Request
from pydantic import BaseModel, Field
from slowapi import Limiter
from slowapi.util import get_remote_address

from app.core.config import settings
from app.core.metrics import FORCED_NEUTRAL_COUNTER, INFERENCE_LATENCY, SENTIMENT_COUNTER
from app.core.text_cleaner import clean_review_text
from app.models.predict import KcbertRelevancePredictor, KoelectraSentimentPredictor


limiter = Limiter(key_func=get_remote_address)
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
@limiter.limit("10/minute")
def analyze_review(request: Request, body: AnalyzeReviewRequest):
    start_time = time.perf_counter()

    cleaned_text = clean_review_text(
        body.review_text,
        kcbert_predictor.tokenizer,
    )

    with INFERENCE_LATENCY.labels(model="kcbert").time():
        relevance_label, menu_relevance = kcbert_predictor.predict(cleaned_text)

    if relevance_label == 0 or menu_relevance < settings.MENU_RELEVANCE_THRESHOLD:
        sentiment = "neutral"
        confidence = menu_relevance
        reason = "irrelevant_label" if relevance_label == 0 else "low_relevance"
        FORCED_NEUTRAL_COUNTER.labels(reason=reason).inc()
    else:
        with INFERENCE_LATENCY.labels(model="koelectra").time():
            sentiment, confidence = koelectra_predictor.predict(cleaned_text)

        if confidence < settings.SENTIMENT_CONFIDENCE_THRESHOLD:
            sentiment = "neutral"
            FORCED_NEUTRAL_COUNTER.labels(reason="low_confidence").inc()

    SENTIMENT_COUNTER.labels(sentiment=sentiment).inc()

    latency_ms = round((time.perf_counter() - start_time) * 1000, 3)

    return AnalyzeReviewResponse(
        status="success",
        sentiment=sentiment,
        confidence=round(confidence, 4),
        menu_relevance=round(menu_relevance, 4),
        latency_ms=latency_ms,
    )