'use client';

import { ApiConfig, ParsedMetric } from '@/types/metrics';
import { useMetrics, findSampleValue } from '@/hooks/useMetrics';
import { formatBytes, formatPercent, formatUptime } from '@/lib/formatters';

function sumByArea(metrics: ParsedMetric[], metricName: string, area: string): number {
  const family = metrics.find((m) => m.metricName === metricName);
  if (!family) return NaN;
  const matching = family.samples.filter((s) => s.labels.area === area);
  if (matching.length === 0) return NaN;
  return matching.reduce((sum, s) => sum + s.value, 0);
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
    .map(([uri, { count, sum }]) => ({ uri, count, avgMs: count > 0 ? (sum / count) * 1000 : 0 }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);
}

function Stat({ label, value, color = 'text-white' }: { label: string; value: string; color?: string }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-[10px] text-gray-500 uppercase tracking-wide font-medium">{label}</span>
      <span className={`text-sm font-mono font-semibold tabular-nums ${color}`}>{value}</span>
    </div>
  );
}

function HeapBar({ used, max }: { used: number; max: number }) {
  const pct = max > 0 && isFinite(max) ? Math.min((used / max) * 100, 100) : null;
  return (
    <div className="flex flex-col gap-1">
      <div className="flex justify-between text-[10px] text-gray-500">
        <span>Heap</span>
        <span>
          {formatBytes(used)}
          {max > 0 && isFinite(max) ? ` / ${formatBytes(max)}` : ''}
        </span>
      </div>
      <div className="h-1 bg-gray-800 rounded-full overflow-hidden">
        {pct !== null && (
          <div
            className="h-full rounded-full bg-blue-500 transition-all duration-500"
            style={{ width: `${pct.toFixed(1)}%` }}
          />
        )}
      </div>
    </div>
  );
}

function ApiSummaryCard({ api }: { api: ApiConfig }) {
  const { latest, isLoading, error } = useMetrics(api.id, api.refreshInterval);
  const m = latest?.metrics ?? [];

  const uptime = findSampleValue(m, 'process_uptime_seconds');
  const processCpu = findSampleValue(m, 'process_cpu_usage');
  const heapUsed = sumByArea(m, 'jvm_memory_used_bytes', 'heap');
  const heapMax = sumByArea(m, 'jvm_memory_max_bytes', 'heap');
  const total2xx = sumCountByStatus(m, '2');
  const total4xx = sumCountByStatus(m, '4');
  const total5xx = sumCountByStatus(m, '5');
  const dbActive = findSampleValue(m, 'hikaricp_connections_active');
  const dbMax = findSampleValue(m, 'hikaricp_connections_max');
  const hasDb = !isNaN(dbActive) || !isNaN(dbMax);
  const topEndpoints = getTopEndpoints(m);

  return (
    <div className="bg-gray-900 rounded-xl p-5 border border-gray-800 ring-1 ring-white/[0.04] shadow-lg flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-gray-200 tracking-tight">{api.name}</h3>
        <div className="flex items-center gap-1.5">
          {isLoading && (
            <span className="flex items-center gap-1 text-[10px] text-yellow-400">
              <span className="inline-block w-1.5 h-1.5 rounded-full bg-yellow-400 animate-pulse" />
              Fetching
            </span>
          )}
          {error && (
            <span className="flex items-center gap-1 text-[10px] text-red-400" title={error}>
              <span className="inline-block w-1.5 h-1.5 rounded-full bg-red-400" />
              Error
            </span>
          )}
          {latest && !isLoading && !error && (
            <span className="flex items-center gap-1 text-[10px] text-emerald-400">
              <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-400" />
              Live
            </span>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Stat label="Uptime" value={formatUptime(uptime)} />
        <Stat label="Process CPU" value={formatPercent(processCpu)} />
      </div>

      <HeapBar used={heapUsed} max={heapMax} />

      {hasDb && (
        <div className="grid grid-cols-2 gap-3 pt-3 border-t border-gray-800">
          <Stat
            label="DB Active"
            value={isNaN(dbActive) ? '—' : String(Math.round(dbActive))}
            color="text-orange-400"
          />
          <Stat label="DB Pool Max" value={isNaN(dbMax) ? '—' : String(Math.round(dbMax))} />
        </div>
      )}

      {topEndpoints.length > 0 && (
        <div className="flex flex-col gap-1.5 pt-3 border-t border-gray-800">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[10px] text-gray-500 uppercase tracking-wide font-medium">Top Endpoints</span>
            <div className="flex gap-3 text-[10px] font-mono tabular-nums">
              <span className="text-emerald-400">{Math.round(total2xx).toLocaleString()} 2xx</span>
              <span className="text-yellow-400">{Math.round(total4xx).toLocaleString()} 4xx</span>
              <span className={total5xx > 0 ? 'text-red-400' : 'text-gray-600'}>{Math.round(total5xx).toLocaleString()} 5xx</span>
            </div>
          </div>
          {topEndpoints.map(({ uri, count, avgMs }) => (
            <div key={uri} className="flex items-center justify-between gap-2">
              <span className="text-xs text-gray-300 font-mono truncate" title={uri}>{uri}</span>
              <div className="flex gap-2 shrink-0 text-[10px]">
                <span className="text-blue-400 tabular-nums">{Math.round(count).toLocaleString()}</span>
                <span className="text-gray-600 tabular-nums">{avgMs.toFixed(0)}ms</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export function AllApisView({ apis }: { apis: ApiConfig[] }) {
  return (
    <div className="p-5 grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5">
      {apis.map((api) => (
        <ApiSummaryCard key={api.id} api={api} />
      ))}
    </div>
  );
}
