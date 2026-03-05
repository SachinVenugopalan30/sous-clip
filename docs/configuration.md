# Configuration Guide

Sous Clip is configured via environment variables. Create a `.env` file in the project root (use `.env.example` as a starting point):

```bash
cp .env.example .env
```

## Required Settings

These must be set before first run:

| Variable | Description | Example |
|---|---|---|
| `APP_PASSWORD` | Login password | a strong password |
| `JWT_SECRET` | Token signing key — generate with `openssl rand -hex 32` | `a1b2c3...` |
| `ANTHROPIC_API_KEY` | Required if `AI_PROVIDER=anthropic` | `sk-ant-...` |
| `OPENAI_API_KEY` | Required if `AI_PROVIDER=openai` | `sk-...` |

## AI Provider

| Variable | Default | Options |
|---|---|---|
| `AI_PROVIDER` | `anthropic` | `anthropic`, `openai`, `ollama` |
| `AI_MODEL` | `claude-sonnet-4-6` | Any model supported by your provider |
| `ANTHROPIC_API_KEY` | _(empty)_ | Your Anthropic API key |
| `OPENAI_API_KEY` | _(empty)_ | Your OpenAI API key |
| `OLLAMA_BASE_URL` | `http://localhost:11434` | Ollama server URL |

### Provider Examples

**Anthropic (default):**
```env
AI_PROVIDER=anthropic
AI_MODEL=claude-sonnet-4-6
ANTHROPIC_API_KEY=sk-ant-your-key-here
```

**OpenAI:**
```env
AI_PROVIDER=openai
AI_MODEL=gpt-4o
OPENAI_API_KEY=sk-your-key-here
```

**Ollama (fully local, no API key needed):**
```env
AI_PROVIDER=ollama
AI_MODEL=llama3
OLLAMA_BASE_URL=http://host.docker.internal:11434
```

> When running Ollama on the host machine and Sous Clip in Docker, use `host.docker.internal` instead of `localhost`.

You can also change these at runtime from the **Settings** page in the UI.

## Whisper Transcription

| Variable | Default | Options |
|---|---|---|
| `WHISPER_MODEL_SIZE` | `base` | `tiny`, `base`, `small`, `medium`, `large-v3` |
| `WHISPER_DEVICE` | `auto` | `auto`, `cpu`, `cuda` |
| `WHISPER_COMPUTE_TYPE` | `auto` | `auto`, `int8`, `float16`, `float32` |

- **Model size:** Larger models are more accurate but slower and use more memory. `base` is a good starting point; `medium` or `large-v3` recommended if you have a GPU.
- **Device:** `auto` detects a CUDA GPU and falls back to CPU if unavailable.
- **Compute type:** `int8` is fastest on CPU, `float16` is fastest on GPU.

## Authentication

| Variable | Default | Description |
|---|---|---|
| `APP_USERNAME` | `admin` | Login username |
| `APP_PASSWORD` | `changeme` | Login password — **change this** |
| `JWT_SECRET` | _(must be set)_ | Signing key for auth tokens |
| `JWT_ALGORITHM` | `HS256` | JWT signing algorithm |
| `JWT_EXPIRE_MINUTES` | `1440` | Token expiry (default 24 hours) |

Generate a secure JWT secret:

```bash
openssl rand -hex 32
```

## Whisper Model Download (One-Time Setup)

The Whisper model must be downloaded before first run. A script is provided:

```bash
python scripts/download-model.py
```

This downloads the `base` model to `data/whisper-models/`. To download a different size:

```bash
python scripts/download-model.py medium
python scripts/download-model.py large-v3
```

The model directory is mounted read-only into the worker container. Make sure `WHISPER_MODEL_SIZE` in `.env` matches the model you downloaded.

## Database

| Variable | Default | Description |
|---|---|---|
| `DATABASE_URL` | `sqlite:///./data/recipes.db` | SQLite database path |
| `MEDIA_DIR` | `./data/media` | Directory for downloaded audio files |

Both paths are inside the `app-data` Docker volume by default, so data persists across container restarts.

## Infrastructure

These are pre-configured for Docker Compose. Only change them if running services separately.

| Variable | Default | Description |
|---|---|---|
| `VALKEY_URL` | `redis://valkey:6379/0` | Valkey (Redis) connection URL |
| `TEMPORAL_HOST` | `temporal:7233` | Temporal server address |

For local development (outside Docker):

```env
VALKEY_URL=redis://localhost:6379/0
TEMPORAL_HOST=localhost:7233
```

## Observability (Optional)

| Variable | Default | Description |
|---|---|---|
| `OTEL_ENABLED` | `false` | Enable OpenTelemetry tracing |
| `OTEL_ENDPOINT` | `http://localhost:4317` | OTLP gRPC collector endpoint |
| `OTEL_SERVICE_NAME` | `Sous Clip` | Service name in traces |

To send traces to Jaeger or Grafana Tempo:

```env
OTEL_ENABLED=true
OTEL_ENDPOINT=http://jaeger:4317
```

## GPU Support

To enable NVIDIA GPU acceleration for Whisper, uncomment the GPU block in `docker-compose.yml`:

```yaml
deploy:
  resources:
    reservations:
      devices:
        - driver: nvidia
          count: all
          capabilities: [gpu]
```

Then set:

```env
WHISPER_DEVICE=cuda
WHISPER_COMPUTE_TYPE=float16
WHISPER_MODEL_SIZE=medium  # or large-v3
```

Requires the [NVIDIA Container Toolkit](https://docs.nvidia.com/datacenter/cloud-native/container-toolkit/latest/install-guide.html) to be installed on the host.
