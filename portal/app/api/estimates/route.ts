import { NextRequest, NextResponse } from "next/server";

import { errorResponse, requireApiAccess, responseHeaders, upstreamHeaders } from "@/lib/api-security";
import { logEvent } from "@/lib/observability";

const BASE_URL = process.env.ESTIMATOR_SERVICE_URL ?? "http://localhost:8001";

export async function POST(request: NextRequest) {
  const access = await requireApiAccess(request);
  if (access instanceof NextResponse) return access;
  const body = await request.text();
  const started = Date.now();
  try {
    const upstream = await fetch(`${BASE_URL}/api/v1/estimates`, {
      method: "POST",
      headers: upstreamHeaders(access, "application/json"),
      body,
      cache: "no-store",
    });
    const payload = await upstream.text();
    logEvent(upstream.ok ? "INFO" : "WARN", access, { operation: "create_estimate", status: upstream.status, duration_ms: Date.now() - started });
    return new NextResponse(payload, {
      status: upstream.status,
      headers: responseHeaders(access, upstream.headers.get("content-type") ?? "application/json"),
    });
  } catch {
    logEvent("ERROR", access, { operation: "create_estimate", status: 503, duration_ms: Date.now() - started });
    return errorResponse(access, 503, "ESTIMATOR_UNAVAILABLE", "Estimator backend is unavailable");
  }
}
