import { NextRequest, NextResponse } from "next/server";

import { errorResponse, requireApiAccess, responseHeaders, upstreamHeaders } from "@/lib/api-security";
import { logEvent } from "@/lib/observability";

const BASE_URL = process.env.MARKET_SERVICE_URL ?? "http://localhost:8080";

export async function GET(request: NextRequest) {
  const access = await requireApiAccess(request);
  if (access instanceof NextResponse) return access;
  const started = Date.now();
  try {
    const query = request.nextUrl.searchParams.toString();
    const upstream = await fetch(`${BASE_URL}/api/v1/market/analysis${query ? `?${query}` : ""}`, { cache: "no-store", headers: upstreamHeaders(access) });
    const payload = await upstream.text();
    logEvent(upstream.ok ? "INFO" : "WARN", access, { operation: "market_analysis", status: upstream.status, duration_ms: Date.now() - started });
    return new NextResponse(payload, { status: upstream.status, headers: responseHeaders(access) });
  } catch {
    logEvent("ERROR", access, { operation: "market_analysis", status: 503, duration_ms: Date.now() - started });
    return errorResponse(access, 503, "MARKET_UNAVAILABLE", "Market backend is unavailable");
  }
}
