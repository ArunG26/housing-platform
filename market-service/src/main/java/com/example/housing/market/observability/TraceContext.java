package com.example.housing.market.observability;

import org.slf4j.MDC;

import java.security.SecureRandom;
import java.util.HexFormat;
import java.util.UUID;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

public final class TraceContext {
    private static final Pattern TRACEPARENT = Pattern.compile("^00-([0-9a-fA-F]{32})-([0-9a-fA-F]{16})-[0-9a-fA-F]{2}$");
    private static final SecureRandom RANDOM = new SecureRandom();

    private TraceContext() {
    }

    public static String requestId(String incoming) {
        return incoming == null || incoming.isBlank() ? UUID.randomUUID().toString() : incoming;
    }

    public static String traceId(String traceparent) {
        if (traceparent != null) {
            Matcher matcher = TRACEPARENT.matcher(traceparent.trim());
            if (matcher.matches()) return matcher.group(1).toLowerCase();
        }
        byte[] bytes = new byte[16];
        RANDOM.nextBytes(bytes);
        return HexFormat.of().formatHex(bytes);
    }

    public static String newSpanId() {
        byte[] bytes = new byte[8];
        RANDOM.nextBytes(bytes);
        return HexFormat.of().formatHex(bytes);
    }

    public static String currentRequestId() {
        String value = MDC.get("request_id");
        return value == null ? UUID.randomUUID().toString() : value;
    }

    public static String currentTraceId() {
        String value = MDC.get("trace_id");
        return value == null ? traceId(null) : value;
    }

    public static String childTraceparent() {
        return "00-" + currentTraceId() + "-" + newSpanId() + "-01";
    }
}
