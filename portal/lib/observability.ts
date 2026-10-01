import "server-only";

import { randomBytes, randomUUID } from "node:crypto";

import type { Role } from "@/lib/contracts";

export type RequestContext = {
  requestId: string;
  traceId: string;
  spanId: string;
  traceparent: string;
  role?: Role;
};

function newTraceId(): string {
  return randomBytes(16).toString("hex");
}

function newSpanId(): string {
  return randomBytes(8).toString("hex");
}

function traceIdFrom(header: string | null): string | null {
  if (!header) return null;
  const match = /^00-([0-9a-f]{32})-([0-9a-f]{16})-[0-9a-f]{2}$/i.exec(header.trim());
  return match?.[1]?.toLowerCase() ?? null;
}

export function createRequestContext(headers: Headers, role?: Role): RequestContext {
  const requestId = headers.get("x-request-id") || randomUUID();
  const traceId = traceIdFrom(headers.get("traceparent")) || newTraceId();
  const spanId = newSpanId();
  return {
    requestId,
    traceId,
    spanId,
    traceparent: `00-${traceId}-${spanId}-01`,
    role,
  };
}

export function createChildTraceparent(traceId: string): string {
  return `00-${traceId}-${newSpanId()}-01`;
}

export function logEvent(
  level: "INFO" | "WARN" | "ERROR",
  context: RequestContext,
  fields: Record<string, unknown>,
) {
  const event = {
    timestamp: new Date().toISOString(),
    level,
    service: "portal",
    environment: process.env.ENVIRONMENT ?? "local",
    service_version: process.env.SERVICE_VERSION ?? "1.1.0",
    platform_version: process.env.PLATFORM_VERSION ?? "1.1.0",
    request_id: context.requestId,
    trace_id: context.traceId,
    span_id: context.spanId,
    ...fields,
  };
}
