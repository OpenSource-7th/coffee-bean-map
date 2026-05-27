from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    KCBERT_ONNX_MODEL_DIR: str = "app/models/kcbert_onnx/onnx_kcbert_lora"
    KOELECTRA_ONNX_MODEL_DIR: str = "app/models/koelectra_onnx/onnx_koelectra"

    MAX_TOKEN_LENGTH: int = 300
    MIN_REVIEW_LENGTH: int = 3

    MENU_RELEVANCE_THRESHOLD: float = 0.85
    SENTIMENT_CONFIDENCE_THRESHOLD: float = 0.6

    ONNX_INTRA_OP_NUM_THREADS: int = 1
    ONNX_INTER_OP_NUM_THREADS: int = 1


settings = Settings()
