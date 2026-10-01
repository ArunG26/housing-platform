from __future__ import annotations

from datetime import datetime, timezone

from fastapi import FastAPI, HTTPException, Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse

from app.observability import request_id, trace_id


def _body(code: str, message: str):
    return {
        "timestamp": datetime.now(timezone.utc).isoformat().replace("+00:00", "Z"),
        "request_id": request_id(),
        "trace_id": trace_id(),
        "code": code,
        "message": message,
    }


def install_error_handlers(app: FastAPI) -> None:
    @app.exception_handler(HTTPException)
    async def http_exception_handler(_: Request, exc: HTTPException):
        code = {401: "UNAUTHORIZED", 403: "FORBIDDEN", 413: "BATCH_LIMIT_EXCEEDED", 503: "SERVICE_UNAVAILABLE"}.get(exc.status_code, "REQUEST_FAILED")
        return JSONResponse(status_code=exc.status_code, content=_body(code, str(exc.detail)))

    @app.exception_handler(RequestValidationError)
    async def validation_exception_handler(_: Request, exc: RequestValidationError):
        return JSONResponse(status_code=422, content=_body("VALIDATION_ERROR", str(exc.errors())))
