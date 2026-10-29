FROM python:3.12-slim

ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

WORKDIR /app/apps/api

COPY apps/api ./

RUN python -m pip install --upgrade pip && python -m pip install -e .

EXPOSE 8000

CMD ["sh", "-c", "alembic upgrade head && python -m uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8000}"]

