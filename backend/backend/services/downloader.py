import re
from collections.abc import Callable
from dataclasses import dataclass
from pathlib import Path

import yt_dlp


URL_PATTERN = re.compile(r"^https?://")


@dataclass
class DownloadResult:
    audio_path: str
    title: str
    channel: str | None = None
    duration: int | None = None  # seconds
    thumbnail: str | None = None  # URL


class Downloader:
    def __init__(self, media_dir: str):
        self.media_dir = Path(media_dir)
        self.media_dir.mkdir(parents=True, exist_ok=True)

    def download(
        self, url: str, progress_hook: Callable[[int], None] | None = None
    ) -> DownloadResult:
        if not URL_PATTERN.match(url):
            raise ValueError(f"Invalid URL: {url}")

        def _yt_dlp_hook(d: dict) -> None:
            if progress_hook is None:
                return
            if d.get("status") == "downloading":
                total = d.get("total_bytes") or d.get("total_bytes_estimate") or 0
                downloaded = d.get("downloaded_bytes", 0)
                if total > 0:
                    progress_hook(int(downloaded * 100 / total))

        ydl_opts = {
            "format": "bestaudio/best",
            "postprocessors": [
                {
                    "key": "FFmpegExtractAudio",
                    "preferredcodec": "mp3",
                    "preferredquality": "192",
                }
            ],
            "outtmpl": str(self.media_dir / "%(id)s.%(ext)s"),
            "quiet": True,
            "no_warnings": True,
            "remote_components": ["ejs:github"],
            "progress_hooks": [_yt_dlp_hook],
        }

        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            info = ydl.extract_info(url, download=True)

        video_id = info["id"]
        audio_path = str(self.media_dir / f"{video_id}.mp3")
        return DownloadResult(
            audio_path=audio_path,
            title=info.get("title", "Unknown"),
            channel=info.get("channel") or info.get("uploader"),
            duration=info.get("duration"),
            thumbnail=info.get("thumbnail"),
        )
