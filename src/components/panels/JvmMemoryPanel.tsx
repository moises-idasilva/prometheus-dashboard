'use client';

import { MetricsHistory, MetricsSnapshot, ParsedMetric } from '@/types/metrics';
import { sumSampleValues } from '@/hooks/useMetrics';
import { formatBytes, formatBytesOrUnlimited } from '@/lib/formatters';
import { TimeSeriesChart } from '@/components/charts/TimeSeriesChart';

interface Props {
  latest: MetricsSnapshot | null;
  history: MetricsHistory;
}

function sumByArea(metrics: ParsedMetric[], metricName: string, area: string): number {
  const family = metrics.find((m) => m.metricName === metricName);
  if (!family) return NaN;
  const matching = family.samples.filter((s) => s.labels.area === area);
  if (matching.length === 0) return NaN;
  return matching.reduce((sum, s) => sum + s.value, 0);
}

function MemBar({ used, max, label }: { used: number; max: number; label: string }) {
  const pct = max > 0 && max !== -1 ? Math.min((used / max) * 100, 100) : null;
  return (
    <div className="flex flex-col gap-1">
      <div className="flex justify-between text-xs text-gray-400">
        <span>{label}</span>
        <span>
          {formatBytes(used)}
          {max !== -1 && isFinite(max) ? ` / ${formatBytesOrUnlimited(max)}` : ' / Unlimited'}
        </span>
      </div>
      <div className="h-2 bg-gray-700 rounded-full overflow-hidden">
        {pct !== null && (
          <div
            className="h-full rounded-full bg-blue-500"
            style={{ width: `${pct.toFixed(1)}%` }}
          />
        )}
      </div>
    </div>
  );
}

export function JvmMemoryPanel({ latest, history }: Props) {
  const m = latest?.metrics ?? [];

  const heapUsed = sumByArea(m, 'jvm_memory_used_bytes', 'heap');
  const heapMax = sumByArea(m, 'jvm_memory_max_bytes', 'heap');
  const nonheapUsed = sumByArea(m, 'jvm_memory_used_bytes', 'nonheap');

  const heapChartData = history.map((snap) => ({
    ts: snap.ts,
    used: sumByArea(snap.metrics, 'jvm_memory_used_bytes', 'heap'),
    committed: sumByArea(snap.metrics, 'jvm_memory_committed_bytes', 'heap'),
  }));

  const nonheapChartData = history.map((snap) => ({
    ts: snap.ts,
    used: sumByArea(snap.metrics, 'jvm_memory_used_bytes', 'nonheap'),
    committed: sumByArea(snap.metrics, 'jvm_memory_committed_bytes', 'nonheap'),
  }));

  return (
    <div className="bg-gray-900 rounded-xl p-5 border border-gray-700 flex flex-col gap-4">
      <h2 className="text-sm font-semibold text-gray-300 uppercase tracking-wider">
        JVM Memory
      </h2>

      <div className="flex flex-col gap-3">
        <MemBar used={heapUsed} max={heapMax} label="Heap" />
        <MemBar used={nonheapUsed} max={-1} label="Non-Heap" />
      </div>

      {heapChartData.length > 1 && (
        <>
          <p className="text-xs text-gray-500 font-medium">Heap trend</p>
          <TimeSeriesChart
            data={heapChartData}
            series={[
              { key: 'used', color: '#60A5FA', label: 'Used' },
              { key: 'committed', color: '#818CF8', label: 'Committed' },
            ]}
            yTickFormatter={formatBytes}
            height={150}
          />
          <p className="text-xs text-gray-500 font-medium">Non-Heap trend</p>
          <TimeSeriesChart
            data={nonheapChartData}
            series={[
              { key: 'used', color: '#34D399', label: 'Used' },
              { key: 'committed', color: '#6EE7B7', label: 'Committed' },
            ]}
            yTickFormatter={formatBytes}
            height={150}
          />
        </>
      )}
    </div>
  );
}
