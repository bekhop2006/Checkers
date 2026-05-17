.PHONY: help install dev backend frontend test test-backend migrate seed lint build up down logs stripe-listen

help:
	@echo "Common targets:"
	@echo "  make install        - install backend & frontend deps"
	@echo "  make dev            - run backend (8000) and frontend (5173) locally"
	@echo "  make backend        - run only the backend"
	@echo "  make frontend       - run only the frontend"
	@echo "  make test           - run all backend tests"
	@echo "  make migrate        - alembic upgrade head"
	@echo "  make seed           - seed cities + puzzles"
	@echo "  make up             - docker compose up -d --build"
	@echo "  make down           - docker compose down"
	@echo "  make logs           - tail docker logs"
	@echo "  make stripe-listen  - forward Stripe webhooks to local backend"

install:
	cd backend && python -m venv .venv && . .venv/bin/activate && pip install -e ".[dev]"
	cd frontend && npm install

backend:
	cd backend && . .venv/bin/activate && uvicorn app.main:app --reload --port 8000

frontend:
	cd frontend && npm run dev

dev:
	@echo "Run 'make backend' and 'make frontend' in two terminals."

test test-backend:
	cd backend && . .venv/bin/activate && pytest

migrate:
	cd backend && . .venv/bin/activate && alembic upgrade head

seed:
	cd backend && . .venv/bin/activate && python -m app.scripts.seed

lint:
	cd backend && . .venv/bin/activate && ruff check app tests
	cd frontend && npm run lint

build:
	docker compose build

up:
	docker compose up -d --build

down:
	docker compose down

logs:
	docker compose logs -f --tail=200

stripe-listen:
	stripe listen --forward-to localhost:8000/api/billing/webhook
