from unittest.mock import patch

from backend.telemetry import init_telemetry, get_tracer


def test_init_telemetry_disabled():
    with patch("backend.telemetry.settings") as mock_settings:
        mock_settings.otel_enabled = False
        init_telemetry()
        # Should not crash when disabled


def test_get_tracer_returns_tracer():
    tracer = get_tracer("test")
    assert tracer is not None
