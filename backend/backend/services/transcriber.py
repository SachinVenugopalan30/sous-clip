import os
from dataclasses import dataclass

from faster_whisper import WhisperModel


@dataclass
class TranscribeResult:
    text: str
    language: str


def _resolve_device(device: str) -> str:
    if device != "auto":
        return device
    try:
        import torch
        return "cuda" if torch.cuda.is_available() else "cpu"
    except ImportError:
        return "cpu"


def _resolve_compute_type(compute_type: str, device: str) -> str:
    if compute_type != "auto":
        return compute_type
    return "float16" if device == "cuda" else "int8"


class Transcriber:
    def __init__(self, model_size: str, device: str, compute_type: str):
        resolved_device = _resolve_device(device)
        resolved_compute = _resolve_compute_type(compute_type, resolved_device)
        # Use local model if available, otherwise download from HF
        local_path = os.path.join(
            os.environ.get("WHISPER_MODELS_DIR", "./data/whisper-models"),
            f"faster-whisper-{model_size}",
        )
        model_ref = local_path if os.path.isdir(local_path) else model_size
        self.model = WhisperModel(
            model_ref,
            device=resolved_device,
            compute_type=resolved_compute,
        )

    def transcribe(self, audio_path: str) -> TranscribeResult:
        segments, info = self.model.transcribe(audio_path)
        text = "".join(segment.text for segment in segments)
        return TranscribeResult(text=text, language=info.language)
