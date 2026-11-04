# syntax=docker/dockerfile:1
# Service de prévision (FastAPI + scikit-learn). Un seul worker : l'ordonnanceur est local au processus.
FROM python:3.12-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1

WORKDIR /app
COPY requirements.txt ./
RUN pip install -r requirements.txt

COPY app ./app
RUN useradd --create-home --uid 10001 ai && mkdir -p models && chown -R ai:ai /app/models
USER ai

EXPOSE 8001
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8001", "--workers", "1"]
