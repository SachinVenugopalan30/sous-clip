import ctypes.util
import os
from collections.abc import Callable
from dataclasses import dataclass

from faster_whisper import WhisperModel

from backend.config import settings


@dataclass
class TranscribeResult:
    text: str
    language: str


def _resolve_device(device: str) -> str:
    if device != "auto":
        return device
    import ctranslate2  # faster-whisper's engine; the image has no torch

    # A visible GPU isn't enough: CTranslate2 fails at transcribe time without cuBLAS and cuDNN
    has_libs = all(ctypes.util.find_library(lib) for lib in ("cublas", "cudnn"))
    return "cuda" if has_libs and ctranslate2.get_cuda_device_count() > 0 else "cpu"


def _resolve_compute_type(compute_type: str, device: str) -> str:
    if compute_type != "auto":
        return compute_type
    return "float16" if device == "cuda" else "int8"


def model_path(size: str) -> str:
    """Where the downloaded model for `size` lives."""
    return os.path.join(settings.whisper_models_dir, f"faster-whisper-{size}")


class Transcriber:
    def __init__(self, model_size: str, device: str, compute_type: str):
        resolved_device = _resolve_device(device)
        resolved_compute = _resolve_compute_type(compute_type, resolved_device)
        # Local model if present, else download
        local_path = model_path(model_size)
        model_ref = local_path if os.path.isdir(local_path) else model_size
        self.model = WhisperModel(
            model_ref,
            device=resolved_device,
            compute_type=resolved_compute,
        )

    def transcribe(self, audio_path: str, on_segment: Callable[[str], None] | None = None) -> TranscribeResult:
        segments, info = self.model.transcribe(audio_path)
        parts: list[str] = []
        for segment in segments:
            parts.append(segment.text)
            if on_segment and segment.text.strip():
                on_segment(segment.text.strip())
        return TranscribeResult(text="".join(parts), language=info.language)
