import pytest
from unittest.mock import MagicMock, patch

from backend.services.transcriber import Transcriber


@patch("backend.services.transcriber.WhisperModel")
def test_transcriber_returns_joined_text(mock_model_class):
    mock_model = MagicMock()
    mock_model_class.return_value = mock_model

    # faster-whisper returns an iterator of segments + info
    segment1 = MagicMock()
    segment1.text = "today we're making"
    segment2 = MagicMock()
    segment2.text = " garlic butter pasta"

    mock_info = MagicMock()
    mock_info.language = "en"
    mock_info.language_probability = 0.98

    mock_model.transcribe.return_value = ([segment1, segment2], mock_info)

    transcriber = Transcriber(
        model_size="base", device="cpu", compute_type="int8"
    )
    result = transcriber.transcribe("/tmp/audio.mp3")

    assert result.text == "today we're making garlic butter pasta"
    assert result.language == "en"
    mock_model.transcribe.assert_called_once_with("/tmp/audio.mp3")


@patch("backend.services.transcriber.WhisperModel")
def test_transcriber_auto_device_defaults_to_cpu(mock_model_class):
    Transcriber(model_size="base", device="auto", compute_type="auto")
    # With auto and no CUDA, should resolve to cpu + int8
    mock_model_class.assert_called_once()
    call_kwargs = mock_model_class.call_args
    assert call_kwargs[1]["device"] in ("cpu", "cuda")
    assert call_kwargs[1]["compute_type"] in ("int8", "float16")


def test_decode_audio_real_path(tmp_path):
    """Real faster-whisper decode (PyAV), no model: catches av/faster-whisper drift."""
    import wave

    from faster_whisper.audio import decode_audio

    path = tmp_path / "silence.wav"
    with wave.open(str(path), "wb") as w:
        w.setnchannels(1)
        w.setsampwidth(2)
        w.setframerate(16000)
        w.writeframes(b"\x00\x00" * 1600)
    assert len(decode_audio(str(path))) > 0


@patch("backend.services.transcriber.WhisperModel")
def test_transcribe_reports_each_segment(mock_model_class):
    mock_model = MagicMock()
    mock_model_class.return_value = mock_model
    segment1 = MagicMock()
    segment1.text = " today we're making"
    segment2 = MagicMock()
    segment2.text = " garlic butter pasta "
    blank = MagicMock()
    blank.text = "  "
    mock_model.transcribe.return_value = (iter([segment1, blank, segment2]), MagicMock(language="en"))

    seen = []
    result = Transcriber("base", "cpu", "int8").transcribe("/tmp/audio.mp3", on_segment=seen.append)

    assert seen == ["today we're making", "garlic butter pasta"]
    assert result.text == segment1.text + blank.text + segment2.text


@pytest.mark.parametrize("gpus, libs, expected", [
    (1, {"cublas": "libcublas.so", "cudnn": "libcudnn.so"}, "cuda"),
    (1, {"cublas": "libcublas.so"}, "cpu"),  # the image ships no CUDA libs; CTranslate2 would fail at transcribe time
    (1, {}, "cpu"),
    (0, {"cublas": "libcublas.so", "cudnn": "libcudnn.so"}, "cpu"),
])
def test_auto_device_needs_a_gpu_and_cuda_libs(gpus, libs, expected):
    from backend.services.transcriber import _resolve_device

    with patch("ctranslate2.get_cuda_device_count", return_value=gpus), \
         patch("ctypes.util.find_library", side_effect=libs.get):
        assert _resolve_device("auto") == expected
    assert _resolve_device("cuda") == "cuda" and _resolve_device("cpu") == "cpu"
