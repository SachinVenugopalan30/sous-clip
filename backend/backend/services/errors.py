"""Turn pipeline and provider exceptions into messages that say what to fix."""

import re

from temporalio.exceptions import TimeoutError as TemporalTimeoutError

_KEY_HINT = "The AI endpoint rejected the API key. Check it in Settings → AI Provider."
# Keyed by exception class name: Temporal keeps it as ApplicationError.type across the activity boundary
_HINTS = {
    "AuthenticationError": _KEY_HINT,
    "PermissionDeniedError": _KEY_HINT,
    "APIConnectionError": "Can't reach the AI endpoint. Check the URL and that the server is running "
    "(from Docker, use host.docker.internal instead of localhost).",
    "APITimeoutError": "The AI endpoint didn't answer in time. Check that the server is running and not overloaded.",
    "NotFoundError": "The AI endpoint returned 404, so the model name or URL is wrong",
    "RateLimitError": "The AI provider is rate-limiting requests or the account is out of credits",
    "BadRequestError": "The AI endpoint rejected the request",
    "JSONDecodeError": "The model's reply wasn't valid JSON. Retry, or use a larger model.",
    "UnicodeEncodeError": "The API key contains invalid characters. Re-enter it in Settings → AI Provider.",
}
_WITH_DETAIL = {"NotFoundError", "RateLimitError", "BadRequestError"}


def explain(error_type: str, message: str | None) -> str:
    detail = re.sub(r"\x1b\[[0-9;]*m", "", message or "").removeprefix("ERROR: ").strip()[:300]
    if error_type == "DownloadError":
        return (f"Couldn't download the video: {detail}. It may be private, removed or region-locked; "
                "if public videos keep failing, update the image (docker compose pull) for a newer yt-dlp.")
    hint = _HINTS.get(error_type)
    if not hint:
        return detail or error_type
    return f"{hint} ({detail})" if detail and error_type in _WITH_DETAIL else hint


def describe_failure(step: str, exc: BaseException) -> str:
    """'<step> failed: <what to fix>' for the queue, unwrapping Temporal's ActivityError."""
    cause = getattr(exc, "cause", None) or exc
    if isinstance(cause, TemporalTimeoutError):
        return f"{step} timed out. It took longer than allowed; for AI extraction, try a faster model or endpoint."
    error_type = getattr(cause, "type", None) or type(cause).__name__
    return f"{step} failed: {explain(error_type, getattr(cause, 'message', None) or str(cause))}"
