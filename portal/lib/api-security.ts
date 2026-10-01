import "server-only";

import { NextRequest, NextResponse } from "next/server";

import { getSession } from "@/lib/auth";
import type { Role, Session } from "@/lib/contracts";
import { createChildTraceparent, createRequestContext, type RequestContext } from "@/lib/observability";
import { requiredEnv } from "@/lib/config";

export type ApiSecurityContext = RequestContext & { session: Session };

export async function requireApiAccess(
  request: NextRequest,
  roles?: Role[],
): Promise<ApiSecurityContext | NextResponse> {
  const session = await getSession();
  const context = createRequestContext(request.headers, session?.role);
  if (!session) {
    return errorResponse(context, 401, "AUTHENTICATION_REQUIRED", "Authentication is required");
  }
  if (roles && !roles.includes(session.role)) {
    return errorResponse(context, 403, "FORBIDDEN", "You are not authorized to perform this action");
  }
  return { ...context, session };
}

export function upstreamHeaders(context: ApiSecurityContext, contentType?: string): HeadersInit {
  const token = requiredEnv("BFF_INTERNAL_TOKEN");
  return {
    ...(contentType ? { "Content-Type": contentType } : {}),
    Authorization: `Bearer ${token}`,
    "X-Request-ID": context.requestId,
    "X-User-Role": context.session.role,
    traceparent: createChildTraceparent(context.traceId),
  };
}

export function responseHeaders(context: RequestContext, contentType = "application/json"): HeadersInit {
  return {
    "Content-Type": contentType,
    "X-Request-ID": context.requestId,
    traceparent: context.traceparent,
  };
}

export function errorResponse(
  context: RequestContext,
  status: number,
  code: string,
  message: string,
): NextResponse {
  return NextResponse.json(
    {
      timestamp: new Date().toISOString(),
      request_id: context.requestId,
      trace_id: context.traceId,
      code,
      message,
    },
    { status, headers: { "X-Request-ID": context.requestId, traceparent: context.traceparent } },
  );
}
