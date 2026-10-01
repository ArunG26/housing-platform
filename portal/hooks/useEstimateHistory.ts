"use client";

import { useCallback, useEffect, useState } from "react";

import type { EstimateResponse, HousingFeatures } from "@/lib/contracts";

export type EstimateHistoryEntry = EstimateResponse & HousingFeatures;

const STORAGE_KEY = "property-estimate-history-v1";
const MAX_HISTORY = 20;

function write(entries: EstimateHistoryEntry[]) {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
  } catch {
    // History is progressive enhancement; prediction remains usable without localStorage.
  }
}

export function useEstimateHistory() {
  const [history, setHistory] = useState<EstimateHistoryEntry[]>([]);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (raw) setHistory(JSON.parse(raw) as EstimateHistoryEntry[]);
    } catch {
      // Corrupt or unavailable localStorage should not block estimation.
    }
  }, []);

  const add = useCallback((entry: EstimateHistoryEntry) => {
    setHistory((current) => {
      const next = [entry, ...current].slice(0, MAX_HISTORY);
      write(next);
      return next;
    });
  }, []);

  const clear = useCallback(() => {
    setHistory([]);
    write([]);
  }, []);

  return { history, add, clear };
}
