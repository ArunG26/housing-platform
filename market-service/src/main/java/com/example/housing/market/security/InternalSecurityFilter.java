package com.example.housing.market.security;

import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.slf4j.MDC;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.Ordered;
import org.springframework.core.annotation.Order;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.time.Instant;
import java.util.Map;
import java.util.Set;
import java.util.Locale;

@Component
@Order(Ordered.HIGHEST_PRECEDENCE + 10)
public class InternalSecurityFilter extends OncePerRequestFilter {
    private final String expectedToken;
    private final ObjectMapper objectMapper;

    public InternalSecurityFilter(@Value("${security.bff-token}") String expectedToken, ObjectMapper objectMapper) {
        this.expectedToken = expectedToken;
        this.objectMapper = objectMapper;
    }

    @Override
    protected boolean shouldNotFilter(HttpServletRequest request) {
        String path = request.getRequestURI();
        return path.equals("/health") || path.equals("/version") || path.equals("/api/v1/market/health")
                || path.equals("/actuator") || path.startsWith("/actuator/");
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain filterChain)
            throws ServletException, IOException {
        String auth = request.getHeader("Authorization");
        String supplied = auth != null && auth.startsWith("Bearer ") ? auth.substring(7) : "";
        if (!constantTimeEquals(supplied, expectedToken)) {
            writeError(response, 401, "UNAUTHORIZED", "Invalid internal service credential");
            return;
        }

        String role = request.getHeader("X-User-Role");

        if (role == null || role.isBlank()) {
            writeError(
            response,
            403,
            "FORBIDDEN",
            "X-User-Role header is required"
            );
            return;
        }

        role = role.trim().toUpperCase(Locale.ROOT);

        if (!Set.of("VIEWER", "ANALYST").contains(role)) {
            writeError(
            response,
            403,
            "FORBIDDEN",
            "Invalid user role"
            );
            return;
        }

        MDC.put("principal", "portal-bff");
        MDC.put("user_role", role);

        String path = request.getRequestURI();

        if ((path.endsWith("/what-if") || path.contains("/export/")) && !"ANALYST".equals(role)) {
            writeError(response, 403, "FORBIDDEN", "ANALYST role is required for this action");
            return;
        }
        try {
            filterChain.doFilter(request, response);
        } finally {
            MDC.remove("principal");
            MDC.remove("user_role");
        }
    }

    private boolean constantTimeEquals(String left, String right) {
        return MessageDigest.isEqual(left.getBytes(StandardCharsets.UTF_8), right.getBytes(StandardCharsets.UTF_8));
    }

    private void writeError(HttpServletResponse response, int status, String code, String message) throws IOException {
        response.setStatus(status);
        response.setContentType(MediaType.APPLICATION_JSON_VALUE);
        objectMapper.writeValue(response.getWriter(), Map.of(
                "timestamp", Instant.now().toString(),
                "request_id", MDC.get("request_id") == null ? "unknown" : MDC.get("request_id"),
                "trace_id", MDC.get("trace_id") == null ? "unknown" : MDC.get("trace_id"),
                "code", code,
                "message", message));
    }
}
