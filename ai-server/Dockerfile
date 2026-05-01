# ── base: 공통 Python 환경 ────────────────────────────────────────
FROM python:3.11-slim AS base
WORKDIR /app
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1

# ── deps: 의존성 설치 ─────────────────────────────────────────────
FROM base AS deps
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# ── dev: 개발 서버 (auto-reload) ──────────────────────────────────
FROM deps AS dev
COPY . .
EXPOSE 8000
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000", "--reload"]

# ── runner: 프로덕션 (Gunicorn + Uvicorn workers) ─────────────────
FROM deps AS runner
COPY . .
EXPOSE 8000
# AVX2 최적화 ONNX Runtime 사용, worker 수는 CPU 코어 × 2 + 1 권장
CMD ["gunicorn", "app.main:app", \
     "--worker-class", "uvicorn.workers.UvicornWorker", \
     "--workers", "3", \
     "--bind", "0.0.0.0:8000", \
     "--timeout", "60"]
