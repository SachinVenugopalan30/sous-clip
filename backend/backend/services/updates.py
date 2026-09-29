import time

import httpx

from backend.config import settings

REPO_URL = "https://api.github.com/repos/SachinVenugopalan30/sous-clip"
RELEASES_URL = f"{REPO_URL}/releases/latest"
CACHE_SECONDS = 3600

# ponytail: per-process cache; assumes one uvicorn worker. Move to Valkey if --workers is ever added.
_cache: dict[str, tuple[float, object]] = {}


def parse_version(version: str | None) -> tuple[int, ...] | None:
    """'v1.10.0' -> (1, 10, 0); anything unparseable (e.g. 'dev') -> None."""
    try:
        return tuple(int(part) for part in (version or "").removeprefix("v").split("."))
    except ValueError:
        return None


async def _github_field(url: str, field: str):
    """One field from a GitHub API response, cached for an hour per URL (failures too, so GitHub being down stays cheap)."""
    cached = _cache.get(url)
    if cached and time.monotonic() - cached[0] < CACHE_SECONDS:
        return cached[1]
    try:
        async with httpx.AsyncClient(timeout=5) as client:
            response = await client.get(url)
            response.raise_for_status()
            value = response.json()[field]
    except (httpx.HTTPError, KeyError, ValueError):
        value = None
    _cache[url] = (time.monotonic(), value)
    return value


async def latest_release() -> str | None:
    return await _github_field(RELEASES_URL, "tag_name")


async def star_count() -> int | None:
    return await _github_field(REPO_URL, "stargazers_count")


async def watchtower_reachable() -> bool:
    """Any HTTP answer counts; a wrong token only shows up as a 401 when updating."""
    if not settings.watchtower_http_api_token:
        return False
    try:
        async with httpx.AsyncClient(timeout=2) as client:
            await client.get(settings.watchtower_url)
        return True
    except httpx.HTTPError:
        return False


async def trigger_update() -> dict:
    """Ask Watchtower to pull and recreate app + worker. async=true returns 202 before it
    replaces this container; 202 means triggered, not succeeded."""
    if not settings.watchtower_http_api_token:
        return {"ok": False, "error": "Watchtower isn't configured"}
    try:
        async with httpx.AsyncClient(timeout=10) as client:
            response = await client.post(
                f"{settings.watchtower_url}/v1/update",
                params={"async": "true"},
                headers={"Authorization": f"Bearer {settings.watchtower_http_api_token}"},
            )
    except httpx.HTTPError as e:
        return {"ok": False, "error": f"Can't reach Watchtower: {e}"}
    if response.status_code in (200, 202):
        return {"ok": True}
    errors = {
        401: "Watchtower rejected the token. Check that WATCHTOWER_HTTP_API_TOKEN matches your .env",
        429: "An update is already running",
    }
    return {"ok": False, "error": errors.get(response.status_code, f"Watchtower returned HTTP {response.status_code}")}
