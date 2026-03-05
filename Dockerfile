# Stage 1: Build frontend
FROM node:20-alpine AS frontend-build
WORKDIR /app/frontend
COPY frontend/package.json frontend/package-lock.json ./
RUN npm ci
COPY frontend/ ./
RUN npm run build

# Stage 2: Python backend + serve built frontend
FROM python:3.12-slim AS production
WORKDIR /app

# Install system deps for yt-dlp, ffmpeg, and deno (JS runtime for yt-dlp)
RUN apt-get update && apt-get install -y --no-install-recommends \
    ffmpeg curl unzip \
    && curl -fsSL https://deno.land/install.sh | DENO_INSTALL=/usr/local sh \
    && rm -rf /var/lib/apt/lists/*

# Install Python deps
COPY backend/pyproject.toml ./
COPY --from=ghcr.io/astral-sh/uv:latest /uv /usr/local/bin/uv
RUN uv pip install --system --no-cache-dir .

# Copy backend code
COPY backend/backend/ ./backend/

# Copy built frontend
COPY --from=frontend-build /app/frontend/dist ./static/

# Create data directory
RUN mkdir -p /app/data

# Environment defaults
ENV DATABASE_URL=sqlite:///./data/recipes.db
ENV MEDIA_DIR=./data/media
ENV WHISPER_MODEL_SIZE=base
ENV WHISPER_DEVICE=auto
ENV WHISPER_COMPUTE_TYPE=auto

EXPOSE 3000

# Start FastAPI serving both API and static frontend
CMD ["uvicorn", "backend.main:app", "--host", "0.0.0.0", "--port", "3000"]
