"use client";

import { useCallback, useState } from "react";

import type { MarketAnalysis, PagedProperties } from "@/lib/contracts";

export type MarketFilters = {
  minPrice?: string;
  maxPrice?: string;
  bedrooms?: string;
  minSchoolRating?: string;
  maxDistance?: string;
};

export function buildMarketQuery(filters: MarketFilters): URLSearchParams {
  const params = new URLSearchParams();
  Object.entries(filters).forEach(([key, value]) => {
    if (value != null && value !== "") params.set(key, value);
  });
  return params;
}

export function useMarketData(initialAnalysis: MarketAnalysis, initialProperties: PagedProperties) {
  const [analysis, setAnalysis] = useState(initialAnalysis);
  const [properties, setProperties] = useState(initialProperties);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadPage = useCallback(
  async (
    filters: MarketFilters,
    sortBy = "price",
    direction = "desc",
    page = 0,
    size = 20
  ) => {
    setLoading(true);
    setError(null);

    const propertyParams = buildMarketQuery(filters);

    propertyParams.set("sortBy", sortBy);
    propertyParams.set("direction", direction);
    propertyParams.set("page", String(page));
    propertyParams.set("size", String(size));

    try {
      const response = await fetch(
        `/api/market/properties?${propertyParams.toString()}`
      );

      if (!response.ok) {
        throw new Error("Unable to load properties");
      }

      setProperties(
        (await response.json()) as PagedProperties
      );
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to load properties"
      );
    } finally {
      setLoading(false);
    }
  }, []);

  const refresh = useCallback(async (filters: MarketFilters, sortBy = "price", direction = "desc", page = 0, size = 20) => {
    setLoading(true);
    setError(null);
    const params = buildMarketQuery(filters);
    const propertyParams = new URLSearchParams(params);
    propertyParams.set("sortBy", sortBy);
    propertyParams.set("direction", direction);
    propertyParams.set("page", String(page));
    propertyParams.set("size", String(size));

    try {
      const [analysisResponse, propertiesResponse] = await Promise.all([
        fetch(`/api/market/analysis?${params.toString()}`),
        fetch(`/api/market/properties?${propertyParams.toString()}`),
      ]);
      if (!analysisResponse.ok || !propertiesResponse.ok) {
        throw new Error("Unable to refresh market data");
      }
      setAnalysis((await analysisResponse.json()) as MarketAnalysis);
      setProperties((await propertiesResponse.json()) as PagedProperties);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to refresh market data");
    } finally {
      setLoading(false);
    }
  }, []);

  return { analysis, properties, loading, error, refresh,loadPage };
}
