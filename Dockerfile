# Stage 1: Build frontend
FROM docker.io/oven/bun:1.3.14-alpine AS frontend-build
WORKDIR /app/frontend
COPY frontend/package.json frontend/bun.lock ./
RUN bun install --frozen-lockfile
COPY frontend/ ./
RUN bun --bun run build

# Stage 2: Python backend + serve built frontend
FROM docker.io/library/python:3.14-slim AS production
WORKDIR /app

# Install system deps for yt-dlp, ffmpeg, and deno (JS runtime for yt-dlp)
RUN apt-get update && apt-get install -y --no-install-recommends \
    ffmpeg curl unzip \
    && curl -fsSL https://deno.land/install.sh | DENO_INSTALL=/usr/local sh \
    && rm -rf /var/lib/apt/lists/*

# Install Python deps
COPY --from=ghcr.io/astral-sh/uv:0.13.7 /uv /usr/local/bin/uv
COPY backend/pyproject.toml backend/uv.lock ./
RUN uv export --frozen --no-dev --no-emit-project -o requirements.txt \
    && uv pip install --system --no-cache-dir -r requirements.txt

# Copy backend code
COPY backend/backend/ ./backend/

# Copy built frontend
COPY --from=frontend-build /app/frontend/dist ./static/

# Create data directory
RUN mkdir -p /app/data

# Environment defaults
ARG APP_VERSION=dev
ENV APP_VERSION=$APP_VERSION
ENV DATABASE_URL=sqlite:///./data/recipes.db
ENV MEDIA_DIR=./data/media
ENV WHISPER_MODEL_SIZE=base
ENV WHISPER_DEVICE=auto
ENV WHISPER_COMPUTE_TYPE=auto

EXPOSE 3000

# Start FastAPI serving both API and static frontend
CMD ["uvicorn", "backend.main:app", "--host", "0.0.0.0", "--port", "3000"]
