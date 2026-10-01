import { NextRequest, NextResponse } from "next/server";

import { SESSION_COOKIE_NAME } from "@/lib/auth";
import { createRequestContext, logEvent } from "@/lib/observability";

export async function POST(request: NextRequest) {
  const context = createRequestContext(request.headers);
  const response = NextResponse.redirect(new URL("/login", request.url), 303);
  response.cookies.set(SESSION_COOKIE_NAME, "", { httpOnly: true, path: "/", maxAge: 0, sameSite: "lax" });
  logEvent("INFO", context, { operation: "logout", status: 303 });
  return response;
}
