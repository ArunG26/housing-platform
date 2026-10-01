package com.example.housing.market.observability;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.slf4j.MDC;
import org.springframework.core.Ordered;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.concurrent.TimeUnit;

@Component
@Order(Ordered.HIGHEST_PRECEDENCE)
public class ObservabilityContextFilter extends OncePerRequestFilter {
    private static final Logger log = LoggerFactory.getLogger(ObservabilityContextFilter.class);

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain filterChain)
            throws ServletException, IOException {
        String requestId = TraceContext.requestId(request.getHeader("X-Request-ID"));
        String traceId = TraceContext.traceId(request.getHeader("traceparent"));
        String spanId = TraceContext.newSpanId();
        long started = System.nanoTime();
        MDC.put("request_id", requestId);
        MDC.put("trace_id", traceId);
        MDC.put("span_id", spanId);
        String role = request.getHeader("X-User-Role");
        if (role != null && !role.isBlank()) MDC.put("user_role", role.toUpperCase());
        try {
            response.setHeader("X-Request-ID", requestId);
            response.setHeader("traceparent", "00-" + traceId + "-" + spanId + "-01");
            filterChain.doFilter(request, response);
        } finally {
            long durationMs = TimeUnit.NANOSECONDS.toMillis(System.nanoTime() - started);
            log.atInfo()
                    .addKeyValue("operation", "http_request")
                    .addKeyValue("method", request.getMethod())
                    .addKeyValue("path", request.getRequestURI())
                    .addKeyValue("duration_ms", durationMs)
                    .addKeyValue("status", response.getStatus())
                    .log("request completed");
            MDC.clear();
        }
    }
}
