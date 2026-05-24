from prometheus_client import Counter, Histogram

INFERENCE_LATENCY = Histogram(
    "ai_inference_latency_seconds",
    "ONNX inference latency in seconds",
    labelnames=["model"],
    buckets=[0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1.0, 2.5],
)

DB_QUERY_LATENCY = Histogram(
    "ai_db_query_latency_seconds",
    "Supabase query latency in seconds",
    labelnames=["operation"],
    buckets=[0.01, 0.05, 0.1, 0.25, 0.5, 1.0, 2.5],
)

SENTIMENT_COUNTER = Counter(
    "ai_sentiment_total",
    "Number of sentiment predictions by label",
    labelnames=["sentiment"],
)

# cache hit ratio 대체: sentiment 판단이 우회된 횟수
FORCED_NEUTRAL_COUNTER = Counter(
    "ai_forced_neutral_total",
    "Number of times sentiment was forced to neutral",
    labelnames=["reason"],
)
