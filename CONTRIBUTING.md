# Contributing to Sous Clip

Thanks for your interest in contributing!

## Getting Started

1. Fork the repo
2. Clone your fork
3. Create a branch: `git checkout -b feat/your-feature`
4. Make your changes
5. Run tests: `cd backend && pytest tests/ -v`
6. Commit and push
7. Open a Pull Request

## Development Setup

```bash
# Backend
cd backend
uv venv .venv --python 3.13
uv pip install -e ".[dev]"
.venv/bin/uvicorn backend.main:app --reload

# Frontend
cd frontend
npm install
npm run dev
```

## Code Style

- Python: Follow existing patterns, type hints preferred
- TypeScript: Follow existing patterns, strict mode
- Commits: Conventional commits (`feat:`, `fix:`, `chore:`)
