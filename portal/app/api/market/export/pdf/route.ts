import { NextRequest, NextResponse } from "next/server";

import { errorResponse, requireApiAccess, upstreamHeaders } from "@/lib/api-security";
import { logEvent } from "@/lib/observability";

const BASE_URL = process.env.MARKET_SERVICE_URL ?? "http://localhost:8080";

export async function GET(request: NextRequest) {
  const access = await requireApiAccess(request, ["ANALYST"]);
  if (access instanceof NextResponse) return access;
  const started = Date.now();
  try {
    const query = request.nextUrl.searchParams.toString();
    const upstream = await fetch(`${BASE_URL}/api/v1/market/export/pdf${query ? `?${query}` : ""}`, { cache: "no-store", headers: upstreamHeaders(access) });
    if (!upstream.ok) return errorResponse(access, upstream.status, "EXPORT_FAILED", "PDF export failed");
    logEvent("INFO", access, { operation: "market_export_pdf", status: 200, duration_ms: Date.now() - started });
    return new NextResponse(await upstream.arrayBuffer(), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": 'attachment; filename="market-analysis.pdf"',
        "X-Request-ID": access.requestId,
        traceparent: access.traceparent,
      },
    });
  } catch {
    logEvent("ERROR", access, { operation: "market_export_pdf", status: 503, duration_ms: Date.now() - started });
    return errorResponse(access, 503, "MARKET_UNAVAILABLE", "Market backend is unavailable");
  }
}
