from __future__ import annotations

import json
import logging
import re
import secrets
import time
from contextvars import ContextVar
from datetime import datetime, timezone
from uuid import uuid4

from fastapi import Request
from starlette.middleware.base import BaseHTTPMiddleware

from app.config import settings

_request_id: ContextVar[str] = ContextVar("request_id", default="")
_trace_id: ContextVar[str] = ContextVar("trace_id", default="")
_span_id: ContextVar[str] = ContextVar("span_id", default="")
_principal: ContextVar[str] = ContextVar("principal", default="")

TRACEPARENT = re.compile(r"^00-([0-9a-f]{32})-([0-9a-f]{16})-[0-9a-f]{2}$", re.IGNORECASE)
logger = logging.getLogger("housing.estimator")


def configure_logging() -> None:
    if logger.handlers:
        return
    handler = logging.StreamHandler()
    handler.setFormatter(logging.Formatter("%(message)s"))
    logger.addHandler(handler)
    logger.setLevel(logging.INFO)
    logger.propagate = False


def _new_trace_id() -> str:
    return secrets.token_hex(16)


def _new_span_id() -> str:
    return secrets.token_hex(8)


def request_id() -> str:
    return _request_id.get() or str(uuid4())


def trace_id() -> str:
    return _trace_id.get() or _new_trace_id()


def span_id() -> str:
    return _span_id.get() or _new_span_id()


def set_principal(value: str) -> None:
    _principal.set(value)


def outgoing_traceparent() -> str:
    return f"00-{trace_id()}-{_new_span_id()}-01"


def log_event(level: str, operation: str, **fields: object) -> None:
    event = {
        "timestamp": datetime.now(timezone.utc).isoformat().replace("+00:00", "Z"),
        "level": level.upper(),
        "service": "estimator-service",
        "environment": settings.environment,
        "service_version": settings.service_version,
        "platform_version": settings.platform_version,
        "request_id": request_id(),
        "trace_id": trace_id(),
        "span_id": span_id(),
        "operation": operation,
    }
    principal = _principal.get()
    if principal:
        event["principal"] = principal
    event.update(fields)
    message = json.dumps(event, separators=(",", ":"), default=str)
    getattr(logger, level.lower(), logger.info)(message)


class RequestContextMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        incoming = request.headers.get("traceparent", "")
        match = TRACEPARENT.match(incoming)
        current_trace_id = match.group(1).lower() if match else _new_trace_id()
        current_span_id = _new_span_id()
        current_request_id = request.headers.get("x-request-id") or str(uuid4())

        rid_token = _request_id.set(current_request_id)
        trace_token = _trace_id.set(current_trace_id)
        span_token = _span_id.set(current_span_id)
        principal_token = _principal.set(request.headers.get("x-user-role", ""))
        started = time.perf_counter()
        status = 500
        try:
            response = await call_next(request)
            status = response.status_code
            response.headers["X-Request-ID"] = current_request_id
            response.headers["traceparent"] = f"00-{current_trace_id}-{current_span_id}-01"
            return response
        finally:
            duration_ms = round((time.perf_counter() - started) * 1000, 2)
            log_event(
                "INFO" if status < 500 else "ERROR",
                "http_request",
                method=request.method,
                path=request.url.path,
                duration_ms=duration_ms,
                status=status,
            )
            _request_id.reset(rid_token)
            _trace_id.reset(trace_token)
            _span_id.reset(span_token)
            _principal.reset(principal_token)
