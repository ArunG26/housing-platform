import { NextRequest, NextResponse } from "next/server";

import { errorResponse, requireApiAccess, responseHeaders, upstreamHeaders } from "@/lib/api-security";
import { logEvent } from "@/lib/observability";

const BASE_URL = process.env.MARKET_SERVICE_URL ?? "http://localhost:8080";

export async function POST(request: NextRequest) {
  const access = await requireApiAccess(request, ["ANALYST"]);
  if (access instanceof NextResponse) return access;
  const body = await request.text();
  const started = Date.now();
  try {
    const upstream = await fetch(`${BASE_URL}/api/v1/market/what-if`, {
      method: "POST",
      headers: upstreamHeaders(access, "application/json"),
      body,
      cache: "no-store",
    });
    const payload = await upstream.text();
    logEvent(upstream.ok ? "INFO" : "WARN", access, { operation: "market_what_if", status: upstream.status, duration_ms: Date.now() - started });
    return new NextResponse(payload, { status: upstream.status, headers: responseHeaders(access, upstream.headers.get("content-type") ?? "application/json") });
  } catch {
    logEvent("ERROR", access, { operation: "market_what_if", status: 503, duration_ms: Date.now() - started });
    return errorResponse(access, 503, "MARKET_UNAVAILABLE", "Market backend is unavailable");
  }
}
