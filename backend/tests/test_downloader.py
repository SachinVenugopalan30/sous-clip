import os
from unittest.mock import MagicMock, patch

import pytest

from backend.services.downloader import Downloader, DownloadResult


def test_download_result_has_audio_path():
    result = DownloadResult(audio_path="/tmp/audio.mp3", title="Test Video")
    assert result.audio_path == "/tmp/audio.mp3"
    assert result.title == "Test Video"


@patch("backend.services.downloader.yt_dlp.YoutubeDL")
def test_download_extracts_audio(mock_ydl_class, tmp_path):
    mock_ydl = MagicMock()
    mock_ydl_class.return_value.__enter__ = MagicMock(return_value=mock_ydl)
    mock_ydl_class.return_value.__exit__ = MagicMock(return_value=False)
    mock_ydl.extract_info.return_value = {
        "title": "Garlic Butter Pasta",
        "id": "abc123",
    }

    # Simulate the audio file existing after download
    expected_audio = str(tmp_path / "abc123.mp3")
    open(expected_audio, "w").close()

    downloader = Downloader(media_dir=str(tmp_path))
    result = downloader.download("https://youtube.com/shorts/abc123")

    assert result.title == "Garlic Butter Pasta"
    mock_ydl.extract_info.assert_called_once_with(
        "https://youtube.com/shorts/abc123", download=True
    )


def test_download_rejects_invalid_url():
    downloader = Downloader(media_dir="/tmp")
    with pytest.raises(ValueError, match="Invalid URL"):
        downloader.download("not-a-url")
