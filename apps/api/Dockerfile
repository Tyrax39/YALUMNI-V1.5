FROM python:3.12-slim

ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

WORKDIR /app/apps/api

COPY apps/api/pyproject.toml ./pyproject.toml
RUN python -m pip install --upgrade pip && python -m pip install -e .

COPY apps/api ./

EXPOSE 8000

CMD ["python", "-m", "uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]

