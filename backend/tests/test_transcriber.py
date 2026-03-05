from unittest.mock import MagicMock, patch

from backend.services.transcriber import Transcriber, TranscribeResult


def test_transcribe_result():
    result = TranscribeResult(text="Hello world", language="en")
    assert result.text == "Hello world"
    assert result.language == "en"


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
