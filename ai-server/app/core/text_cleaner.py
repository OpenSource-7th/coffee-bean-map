import html
import re

from fastapi import HTTPException

from app.core.config import settings

CONTROL_TOKEN_PATTERN = re.compile(
    r"[\x00-\x1F\x7F-\x9F]|"
    r"(<\|.*?\|>)|"
    r"(\[CLS\]|\[SEP\]|\[PAD\]|\[MASK\])",
    re.IGNORECASE,
)

SPECIAL_CHAR_PATTERN = re.compile(r"[<>\"'`;]")

# Spam detection patterns
_SPAM_URL_PATTERN = re.compile(r"(https?://|www\.)\S+", re.IGNORECASE)
_SPAM_PHONE_PATTERN = re.compile(r"\d{3}[-.\s]?\d{3,4}[-.\s]?\d{4}")
_SPAM_REPEAT_CHAR_PATTERN = re.compile(r"(.)\1{9,}", re.UNICODE)
_SPAM_JAMO_PATTERN = re.compile(r"[ㄱ-ㅎㅏ-ㅣ]{5,}")


def _check_spam(text: str) -> None:
    if _SPAM_URL_PATTERN.search(text):
        raise HTTPException(status_code=422, detail="URL이 포함된 리뷰는 등록할 수 없습니다.")
    if _SPAM_PHONE_PATTERN.search(text):
        raise HTTPException(status_code=422, detail="전화번호가 포함된 리뷰는 등록할 수 없습니다.")
    if _SPAM_REPEAT_CHAR_PATTERN.search(text):
        raise HTTPException(status_code=422, detail="반복 문자가 너무 많은 리뷰는 등록할 수 없습니다.")
    if _SPAM_JAMO_PATTERN.search(text):
        raise HTTPException(status_code=422, detail="의미 없는 자음·모음 반복이 포함된 리뷰는 등록할 수 없습니다.")


def clean_review_text(text: str, tokenizer) -> str:
    if text is None:
        raise HTTPException(status_code=400, detail="review_text is required")

    text = str(text).strip()

    if len(text) < settings.MIN_REVIEW_LENGTH:
        raise HTTPException(status_code=400, detail="review_text must be at least 3 characters")

    _check_spam(text)

    text = CONTROL_TOKEN_PATTERN.sub(" ", text)
    text = SPECIAL_CHAR_PATTERN.sub(" ", text)
    text = html.escape(text)
    text = re.sub(r"\s+", " ", text).strip()

    if len(text) < settings.MIN_REVIEW_LENGTH:
        raise HTTPException(status_code=400, detail="review_text must be at least 3 characters")

    token_ids = tokenizer.encode(
        text,
        add_special_tokens=False,
        truncation=True,
        max_length=settings.MAX_TOKEN_LENGTH,
    )

    return tokenizer.decode(token_ids, skip_special_tokens=True)