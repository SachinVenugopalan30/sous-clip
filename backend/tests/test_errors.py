import pytest

from temporalio.exceptions import ActivityError, ApplicationError, RetryState, TimeoutError as TemporalTimeout, TimeoutType

from backend.services.errors import describe_failure, explain


@pytest.mark.parametrize("error_type, message, expected", [
    ("AuthenticationError", "401 invalid key", "rejected the API key"),
    ("APIConnectionError", "Connection error.", "Can't reach the AI endpoint"),
    ("NotFoundError", "model 'x' not found", "model name or URL"),
    ("RateLimitError", "429", "rate-limiting"),
    ("JSONDecodeError", "Expecting ','", "wasn't valid JSON"),
    ("UnicodeEncodeError", "'ascii' codec", "invalid characters"),
    ("DownloadError", "ERROR: [youtube] abc: Private video", "Couldn't download the video: [youtube] abc: Private video"),
    ("SomethingElse", "raw detail", "raw detail"),
])
def test_explain_maps_errors_to_actionable_messages(error_type, message, expected):
    assert expected in explain(error_type, message)


def _activity_error(cause: Exception) -> ActivityError:
    err = ActivityError("Activity task failed", scheduled_event_id=1, started_event_id=2, identity="w",
                        activity_type="extract_activity", activity_id="3", retry_state=RetryState.MAXIMUM_ATTEMPTS_REACHED)
    err.__cause__ = cause
    return err


def test_describe_failure_names_the_step_and_the_real_cause():
    # Temporal wraps activity exceptions; the queue used to show only "Activity task failed"
    err = _activity_error(ApplicationError("Error code: 401", type="AuthenticationError"))
    assert describe_failure("AI extraction", err).startswith("AI extraction failed: The AI endpoint rejected the API key")


def test_describe_failure_explains_timeouts():
    err = _activity_error(TemporalTimeout("activity timeout", type=TimeoutType.START_TO_CLOSE, last_heartbeat_details=[]))
    assert "AI extraction timed out" in describe_failure("AI extraction", err)
