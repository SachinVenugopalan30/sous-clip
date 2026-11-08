# Contributing to Sous Clip

Thanks for your interest in contributing!

## Getting Started

1. Fork the repo
2. Clone your fork
3. Create a branch: `git checkout -b feat/your-feature`
4. Make your changes
5. Run tests: `cd backend && uv run pytest tests/ -v`
6. Commit and push
7. Open a Pull Request

## Development Setup

```bash
# Backend
cd backend
uv sync --extra dev
uv run uvicorn backend.main:app --reload

# Frontend
cd frontend
bun install
bun run dev
```

## Code Style

- Python: Follow existing patterns, type hints preferred
- TypeScript: Follow existing patterns, strict mode
- Commits: Conventional commits (`feat:`, `fix:`, `chore:`)
