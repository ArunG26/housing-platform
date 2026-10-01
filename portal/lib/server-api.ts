import "server-only";

import { headers } from "next/headers";

import type { Session } from "@/lib/contracts";
import { requiredEnv } from "@/lib/config";
import type { MarketAnalysis, ModelInfo, PagedProperties } from "@/lib/contracts";
import { createChildTraceparent, createRequestContext, logEvent, type RequestContext } from "@/lib/observability";

const ESTIMATOR_SERVICE_URL = process.env.ESTIMATOR_SERVICE_URL ?? "http://localhost:8001";
const MARKET_SERVICE_URL = process.env.MARKET_SERVICE_URL ?? "http://localhost:8080";
const DEFAULT_PAGE_SIZE = 20;
const BFF_INTERNAL_TOKEN = requiredEnv("BFF_INTERNAL_TOKEN");

export async function createServerRenderContext(session: Session): Promise<RequestContext> {
  return createRequestContext(await headers(), session.role);
}

async function getJson<T>(url: string, session: Session, context: RequestContext, operation: string): Promise<T> {
  const started = Date.now();
  const upstream = new URL(url);
  try {
    const response = await fetch(url, {
      cache: "no-store",
      headers: {
        Authorization: `Bearer ${BFF_INTERNAL_TOKEN}`,
        "X-Request-ID": context.requestId,
        "X-User-Role": session.role,
        traceparent: createChildTraceparent(context.traceId),
      },
    });
    logEvent(response.ok ? "INFO" : "WARN", context, {
      operation,
      upstream: upstream.host,
      duration_ms: Date.now() - started,
      status: response.status,
    });
    if (!response.ok) throw new Error(`Upstream request failed (${response.status})`);
    return response.json() as Promise<T>;
  } catch (error) {
    logEvent("ERROR", context, { operation, upstream: upstream.host, duration_ms: Date.now() - started, error: error instanceof Error ? error.message : "unknown" });
    throw error;
  }
}

export function fetchModelInfo(session: Session, context: RequestContext): Promise<ModelInfo> {
  return getJson<ModelInfo>(`${ESTIMATOR_SERVICE_URL}/api/v1/model-info`, session, context, "load_model_info");
}

export function fetchInitialMarketAnalysis(session: Session, context: RequestContext): Promise<MarketAnalysis> {
  return getJson<MarketAnalysis>(`${MARKET_SERVICE_URL}/api/v1/market/analysis`, session, context, "load_market_analysis");
}

export function fetchInitialProperties(session: Session, context: RequestContext): Promise<PagedProperties> {
  return getJson<PagedProperties>(
    `${MARKET_SERVICE_URL}/api/v1/market/properties?sortBy=price&direction=desc&page=0&size=${DEFAULT_PAGE_SIZE}`,
    session,
    context,
    "load_market_properties",
  );
}
