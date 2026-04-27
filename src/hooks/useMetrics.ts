'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { parsePrometheusText } from '@/lib/prometheusParser';
import { MetricsHistory, MetricsSnapshot, ParsedMetric } from '@/types/metrics';

const MAX_HISTORY = 30;

export interface UseMetricsResult {
  history: MetricsHistory;
  latest: MetricsSnapshot | null;
  isLoading: boolean;
  error: string | null;
  lastFetched: Date | null;
}

export function useMetrics(apiId: string, refreshInterval: number): UseMetricsResult {
  const [history, setHistory] = useState<MetricsHistory>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastFetched, setLastFetched] = useState<Date | null>(null);

  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const apiIdRef = useRef(apiId);
  apiIdRef.current = apiId;

  const fetchMetrics = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_BASE_PATH}/api/metrics?apiId=${encodeURIComponent(apiIdRef.current)}`);
      if (!res.ok) {
        const body = await res.json().catch(() => ({ error: `HTTP ${res.status}` }));
        throw new Error(body.error ?? `HTTP ${res.status}`);
      }
      const text = await res.text();
      const metrics = parsePrometheusText(text);
      const snapshot: MetricsSnapshot = { ts: Date.now(), metrics };
      setHistory((prev) => [...prev.slice(-(MAX_HISTORY - 1)), snapshot]);
      setLastFetched(new Date());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Fetch failed');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    setHistory([]);
    setError(null);
    setLastFetched(null);

    fetchMetrics();
    intervalRef.current = setInterval(fetchMetrics, refreshInterval);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [apiId, refreshInterval, fetchMetrics]);

  return {
    history,
    latest: history.length > 0 ? history[history.length - 1] : null,
    isLoading,
    error,
    lastFetched,
  };
}

// Computes per-second rate from counter deltas across history snapshots
export function computeRate(
  history: MetricsHistory,
  sampleName: string,
  labelFilter: Record<string, string>
): { ts: number; value: number }[] {
  const points = history.map((snap) => {
    let total = 0;
    let found = false;
    for (const family of snap.metrics) {
      for (const sample of family.samples) {
        if (sample.sampleName !== sampleName) continue;
        if (Object.entries(labelFilter).every(([k, v]) => sample.labels[k] === v)) {
          total += sample.value;
          found = true;
        }
      }
    }
    return { ts: snap.ts, raw: found ? total : NaN };
  });

  return points.slice(1).map((point, i) => {
    const prev = points[i];
    const dtSeconds = (point.ts - prev.ts) / 1000;
    if (dtSeconds === 0 || isNaN(prev.raw) || isNaN(point.raw)) {
      return { ts: point.ts, value: NaN };
    }
    if (point.raw < prev.raw) {
      return { ts: point.ts, value: NaN }; // counter reset
    }
    return { ts: point.ts, value: (point.raw - prev.raw) / dtSeconds };
  });
}

// Finds the first matching sample value across all metric families
export function findSampleValue(
  metrics: ParsedMetric[],
  metricName: string,
  labelFilter: Record<string, string> = {}
): number {
  const family = metrics.find((m) => m.metricName === metricName);
  if (!family) return NaN;
  const sample = family.samples.find((s) =>
    Object.entries(labelFilter).every(([k, v]) => s.labels[k] === v)
  );
  return sample?.value ?? NaN;
}

// Sums all sample values matching a label filter
export function sumSampleValues(
  metrics: ParsedMetric[],
  metricName: string,
  labelFilter: Record<string, string> = {}
): number {
  const family = metrics.find((m) => m.metricName === metricName);
  if (!family) return NaN;
  const matching = family.samples.filter((s) =>
    Object.entries(labelFilter).every(([k, v]) => s.labels[k] === v)
  );
  if (matching.length === 0) return NaN;
  return matching.reduce((sum, s) => sum + s.value, 0);
}
