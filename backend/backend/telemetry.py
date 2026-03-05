from opentelemetry import trace
from opentelemetry.sdk.trace import TracerProvider
from opentelemetry.sdk.trace.export import BatchSpanProcessor, ConsoleSpanExporter
from opentelemetry.sdk.resources import Resource

from backend.config import settings

_initialized = False


def init_telemetry():
    global _initialized
    if _initialized:
        return

    if not settings.otel_enabled:
        _initialized = True
        return

    resource = Resource.create({"service.name": settings.otel_service_name})
    provider = TracerProvider(resource=resource)

    try:
        from opentelemetry.exporter.otlp.proto.grpc.trace_exporter import (
            OTLPSpanExporter,
        )
        exporter = OTLPSpanExporter(endpoint=settings.otel_endpoint)
    except Exception:
        exporter = ConsoleSpanExporter()

    provider.add_span_processor(BatchSpanProcessor(exporter))
    trace.set_tracer_provider(provider)
    _initialized = True


def get_tracer(name: str) -> trace.Tracer:
    return trace.get_tracer(name)
