.PHONY: install dev-api dev-web lint test build verify docker-up docker-down

install:
	npm install
	cd apps/api && python -m pip install -e ".[dev]"

dev-api:
	cd apps/api && python -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8000

dev-web:
	npm run dev:web

lint:
	npm run lint:web
	npm run lint:api

test:
	npm run test:api

build:
	npm run build:web

verify:
	npm run verify

docker-up:
	docker compose up --build

docker-down:
	docker compose down

