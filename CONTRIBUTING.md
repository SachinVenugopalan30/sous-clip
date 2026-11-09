# Contributing to Sous Clip

1. Fork and clone the repo, then branch: `git checkout -b feat/your-feature`
2. Make your change
3. Run the tests (below)
4. Commit and open a Pull Request

## Development setup

Whole stack in Docker, built from source, plus a Mealie to test against:

```bash
cp .env.example .env
docker compose -f docker-compose.yml -f docker-compose.dev.yml up --build
```

Or run the code locally. The backend needs Valkey and Temporal running (the defaults point at `localhost`; see [Configuration](docs/configuration.md#infrastructure)):

```bash
# Backend (Python 3.14, uv)
cd backend
uv sync --extra dev
uv run uvicorn backend.main:app --reload
uv run python -m backend.worker   # separate terminal

# Frontend (Bun); proxies /api to localhost:8000
cd frontend
bun install
bun run dev
```

## Tests

```bash
cd backend && uv run pytest tests/ -v
cd frontend && bun test src && bun run lint
```

## Style

- Follow the existing patterns; Python type hints preferred, TypeScript strict.
- Conventional commits (`feat:`, `fix:`, `docs:`, `chore:`).
