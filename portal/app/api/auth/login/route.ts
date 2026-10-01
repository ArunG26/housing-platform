import { NextRequest, NextResponse } from "next/server";

import { createSessionToken, SESSION_COOKIE_NAME, sessionCookieOptions, verifyCredentials } from "@/lib/auth";
import { createRequestContext, logEvent } from "@/lib/observability";

export async function POST(request: NextRequest) {
  const context = createRequestContext(request.headers);
  const started = Date.now();
  try {
    const body = (await request.json()) as { username?: string; password?: string };
    const user = verifyCredentials(body.username ?? "", body.password ?? "");
    if (!user) {
      logEvent("WARN", context, { operation: "login", status: 401, duration_ms: Date.now() - started });
      return NextResponse.json(
        { timestamp: new Date().toISOString(), request_id: context.requestId, trace_id: context.traceId, code: "INVALID_CREDENTIALS", message: "Invalid username or password" },
        { status: 401, headers: { "X-Request-ID": context.requestId } },
      );
    }
    const response = NextResponse.json({ username: user.username, role: user.role });
    response.cookies.set(SESSION_COOKIE_NAME, createSessionToken(user.username, user.role), sessionCookieOptions());
    response.headers.set("X-Request-ID", context.requestId);
    logEvent("INFO", context, { operation: "login", username: user.username, user_role: user.role, status: 200, duration_ms: Date.now() - started });
    return response;
  } catch {
    logEvent("ERROR", context, { operation: "login", status: 400, duration_ms: Date.now() - started });
    return NextResponse.json({ request_id: context.requestId, trace_id: context.traceId, code: "INVALID_REQUEST", message: "Invalid login request" }, { status: 400 });
  }
}
