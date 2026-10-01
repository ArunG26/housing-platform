package com.example.housing.market.exception;

import org.slf4j.MDC;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.validation.BindException;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

import java.time.Instant;
import java.util.Map;

@RestControllerAdvice
public class GlobalExceptionHandler {

    @ExceptionHandler(MlServiceException.class)
    ResponseEntity<Map<String, Object>> handleMlService(MlServiceException exception) {
        return error(HttpStatus.SERVICE_UNAVAILABLE, "ML_SERVICE_UNAVAILABLE", exception.getMessage());
    }

    @ExceptionHandler({IllegalArgumentException.class, BindException.class, MethodArgumentNotValidException.class, HttpMessageNotReadableException.class})
    ResponseEntity<Map<String, Object>> handleBadRequest(Exception exception) {
        return error(HttpStatus.BAD_REQUEST, "INVALID_REQUEST", exception.getMessage());
    }

    private ResponseEntity<Map<String, Object>> error(HttpStatus status, String code, String message) {
        String requestId = MDC.get("request_id") == null ? "unknown" : MDC.get("request_id");
        return ResponseEntity.status(status).body(Map.of(
                "timestamp", Instant.now().toString(),
                "request_id", requestId,
                "trace_id", MDC.get("trace_id") == null ? "unknown" : MDC.get("trace_id"),
                "code", code,
                "message", message == null ? status.getReasonPhrase() : message));
    }
}
