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


def clean_review_text(text: str, tokenizer) -> str:
    if text is None:
        raise HTTPException(status_code=400, detail="review_text is required")

    text = str(text).strip()

    if len(text) < settings.MIN_REVIEW_LENGTH:
        raise HTTPException(status_code=400, detail="review_text must be at least 3 characters")

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