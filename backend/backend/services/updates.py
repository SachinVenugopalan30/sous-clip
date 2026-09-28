import time

import httpx

RELEASES_URL = "https://api.github.com/repos/SachinVenugopalan30/sous-clip/releases/latest"
CACHE_SECONDS = 3600

# ponytail: per-process cache; assumes one uvicorn worker. Move to Valkey if --workers is ever added.
_cache: tuple[float, str | None] | None = None


def parse_version(version: str | None) -> tuple[int, ...] | None:
    """'v1.10.0' -> (1, 10, 0); anything unparseable (e.g. 'dev') -> None."""
    try:
        return tuple(int(part) for part in (version or "").removeprefix("v").split("."))
    except ValueError:
        return None


async def latest_release() -> str | None:
    """Latest GitHub release tag, cached for an hour (failures too, so GitHub being down stays cheap)."""
    global _cache
    if _cache and time.monotonic() - _cache[0] < CACHE_SECONDS:
        return _cache[1]
    try:
        async with httpx.AsyncClient(timeout=5) as client:
            response = await client.get(RELEASES_URL)
            response.raise_for_status()
            tag = response.json()["tag_name"]
    except (httpx.HTTPError, KeyError, ValueError):
        tag = None
    _cache = (time.monotonic(), tag)
    return tag
