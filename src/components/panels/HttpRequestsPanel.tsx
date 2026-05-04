'use client';

import { MetricsHistory, MetricsSnapshot, ParsedMetric } from '@/types/metrics';
import { TimeSeriesChart } from '@/components/charts/TimeSeriesChart';
import { PanelCard, InfoRow, StatCard } from '@/components/PanelCard';

const info = (
  <>
    <p>HTTP response-code totals since service start, per-second request rates over time, and the top 8 endpoints by volume.</p>
    <div className="mt-3">
      <InfoRow name="http_server_requests_seconds_count" desc="Total completed requests, labelled by URI, HTTP method, and status code." />
      <InfoRow name="http_server_requests_seconds_sum" desc="Cumulative time spent handling requests. Dividing by count gives average latency." />
    </div>
    <ul className="mt-3 text-xs text-gray-400 list-disc list-inside space-y-1">
      <li><span className="text-green-400">2xx</span> — successful responses</li>
      <li><span className="text-yellow-400">4xx</span> — client errors (bad request, auth, not found)</li>
      <li><span className="text-red-400">5xx</span> — server errors (worth alerting on)</li>
    </ul>
    <p className="mt-3 text-gray-400 text-xs">/actuator endpoints are excluded from the top-endpoints list.</p>
  </>
);

interface Props {
  latest: MetricsSnapshot | null;
  history: MetricsHistory;
}

const EXCLUDED_URIS = ['/actuator', '/actuator/prometheus'];

function sumCountByStatus(metrics: ParsedMetric[], statusPrefix: string): number {
  const family = metrics.find((m) => m.metricName === 'http_server_requests_seconds');
  if (!family) return 0;
  return family.samples
    .filter(
      (s) =>
        s.sampleName === 'http_server_requests_seconds_count' &&
        s.labels.status?.startsWith(statusPrefix) &&
        !EXCLUDED_URIS.includes(s.labels.uri ?? ''),
    )
    .reduce((sum, s) => sum + s.value, 0);
}

function computeRateForStatus(
  history: MetricsHistory,
  statusPrefix: string
): { ts: number; value: number }[] {
  const points = history.map((snap) => ({
    ts: snap.ts,
    raw: sumCountByStatus(snap.metrics, statusPrefix),
  }));
  return points.slice(1).map((point, i) => {
    const prev = points[i];
    const dtSeconds = (point.ts - prev.ts) / 1000;
    if (dtSeconds === 0 || point.raw < prev.raw) return { ts: point.ts, value: NaN };
    return { ts: point.ts, value: (point.raw - prev.raw) / dtSeconds };
  });
}

function getTopEndpoints(metrics: ParsedMetric[]): { uri: string; count: number; avgMs: number }[] {
  const family = metrics.find((m) => m.metricName === 'http_server_requests_seconds');
  if (!family) return [];

  const byUri = new Map<string, { count: number; sum: number }>();
  for (const sample of family.samples) {
    const uri = sample.labels.uri ?? 'unknown';
    if (EXCLUDED_URIS.includes(uri)) continue;
    if (!byUri.has(uri)) byUri.set(uri, { count: 0, sum: 0 });
    const entry = byUri.get(uri)!;
    if (sample.sampleName === 'http_server_requests_seconds_count') entry.count += sample.value;
    if (sample.sampleName === 'http_server_requests_seconds_sum') entry.sum += sample.value;
  }

  return Array.from(byUri.entries())
    .map(([uri, { count, sum }]) => ({
      uri,
      count,
      avgMs: count > 0 ? (sum / count) * 1000 : 0,
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 8);
}

export function HttpRequestsPanel({ latest, history }: Props) {
  const m = latest?.metrics ?? [];

  const rate2xx = computeRateForStatus(history, '2');
  const rate4xx = computeRateForStatus(history, '4');
  const rate5xx = computeRateForStatus(history, '5');

  const chartData = rate2xx.map((p, i) => ({
    ts: p.ts,
    '2xx': p.value,
    '4xx': rate4xx[i]?.value ?? NaN,
    '5xx': rate5xx[i]?.value ?? NaN,
  }));

  const topEndpoints = getTopEndpoints(m);

  const total2xx = sumCountByStatus(m, '2');
  const total4xx = sumCountByStatus(m, '4');
  const total5xx = sumCountByStatus(m, '5');

  return (
    <PanelCard title="HTTP Requests" info={info}>
      <div className="grid grid-cols-3 gap-4">
        <StatCard label="2xx" value={Math.round(total2xx).toLocaleString()} accent="border-emerald-500/50" labelClass="text-emerald-400" />
        <StatCard label="4xx" value={Math.round(total4xx).toLocaleString()} accent="border-yellow-500/50" labelClass="text-yellow-400" />
        <StatCard label="5xx" value={Math.round(total5xx).toLocaleString()} accent="border-red-500/50" labelClass="text-red-400" />
      </div>

      {chartData.length > 1 && (
        <TimeSeriesChart
          data={chartData}
          series={[
            { key: '2xx', color: '#34D399', label: '2xx req/s' },
            { key: '4xx', color: '#FBBF24', label: '4xx req/s' },
            { key: '5xx', color: '#F87171', label: '5xx req/s' },
          ]}
          yTickFormatter={(v) => `${v.toFixed(2)}/s`}
        />
      )}

      {topEndpoints.length > 0 && (
        <div className="flex flex-col gap-1">
          <p className="text-xs text-gray-500 font-medium uppercase tracking-wider">Top Endpoints</p>
          <div className="max-h-48 overflow-y-auto">
            {topEndpoints.map(({ uri, count, avgMs }) => (
              <div key={uri} className="flex justify-between items-center py-1 border-b border-gray-800 last:border-0">
                <span className="text-xs text-gray-300 font-mono truncate max-w-[60%]" title={uri}>
                  {uri}
                </span>
                <div className="flex gap-3 text-xs shrink-0">
                  <span className="text-blue-400">{Math.round(count).toLocaleString()}</span>
                  <span className="text-gray-500">{avgMs.toFixed(1)}ms avg</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </PanelCard>
  );
}
