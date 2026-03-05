"""Download the Whisper model for offline use.

Run this once before starting Docker Compose:

    python scripts/download-model.py

By default downloads the "base" model. Pass a different size as an argument:

    python scripts/download-model.py medium
    python scripts/download-model.py large-v3
"""

import os
import sys
from pathlib import Path

try:
    from huggingface_hub import snapshot_download
except ImportError:
    import subprocess
    import venv

    venv_dir = Path(__file__).resolve().parent.parent / ".dl-venv"
    venv_python = venv_dir / "bin" / "python"

    if not venv_python.exists():
        print(f"Creating temporary venv at {venv_dir}...")
        try:
            venv.create(venv_dir, with_pip=True)
        except Exception:
            venv.create(venv_dir, with_pip=False)

    # Ensure pip is available inside the venv
    subprocess.call([str(venv_python), "-m", "ensurepip", "--upgrade"],
                    stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)

    print("Installing huggingface_hub...")
    subprocess.check_call([str(venv_python), "-m", "pip", "install", "-q", "huggingface_hub"])

    # Re-exec the script inside the venv so the import works
    os.execv(str(venv_python), [str(venv_python)] + sys.argv)

# Load HF_TOKEN from .env if not already set in environment
env_file = Path(__file__).resolve().parent.parent / ".env"
if not os.environ.get("HF_TOKEN") and env_file.exists():
    for line in env_file.read_text().splitlines():
        line = line.strip()
        if line.startswith("HF_TOKEN=") and not line.startswith("#"):
            token = line.split("=", 1)[1].strip()
            if token:
                os.environ["HF_TOKEN"] = token
                break

hf_token = os.environ.get("HF_TOKEN")

MODEL_SIZE = sys.argv[1] if len(sys.argv) > 1 else "base"
REPO = f"Systran/faster-whisper-{MODEL_SIZE}"
OUT_DIR = Path(__file__).resolve().parent.parent / "data" / "whisper-models" / f"faster-whisper-{MODEL_SIZE}"

if hf_token:
    print(f"Using HF_TOKEN for authenticated download")
else:
    print(f"No HF_TOKEN found — downloading without authentication (may be slower)")

print(f"Downloading {REPO} to {OUT_DIR}...")
snapshot_download(REPO, local_dir=str(OUT_DIR), token=hf_token)
print(f"Done. Model saved to {OUT_DIR}")
