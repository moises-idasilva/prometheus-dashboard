'use client';

import { MetricsHistory, MetricsSnapshot, ParsedMetric } from '@/types/metrics';
import { formatBytes, formatBytesOrUnlimited } from '@/lib/formatters';
import { TimeSeriesChart } from '@/components/charts/TimeSeriesChart';
import { PanelCard, InfoRow } from '@/components/PanelCard';

const info = (
  <>
    <p>Tracks heap and non-heap memory consumption inside the JVM.</p>
    <ul className="mt-2 text-xs text-gray-400 list-disc list-inside space-y-1">
      <li><span className="text-gray-300">Heap</span> — object store managed by garbage collection. Pressure rises as used approaches max.</li>
      <li><span className="text-gray-300">Non-Heap</span> — class metadata, compiled-code cache (metaspace, code cache). Usually stable.</li>
    </ul>
    <div className="mt-3">
      <InfoRow name="jvm_memory_used_bytes" desc="Bytes currently occupied in each memory area." />
      <InfoRow name="jvm_memory_committed_bytes" desc="Bytes the JVM has reserved from the OS (may exceed used)." />
      <InfoRow name="jvm_memory_max_bytes" desc="Upper limit the JVM can use; -1 means unlimited." />
    </div>
  </>
);

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
      <div className="h-1.5 bg-gray-800 rounded-full overflow-hidden">
        {pct !== null && (
          <div
            className="h-full rounded-full bg-gradient-to-r from-blue-500 to-blue-400 transition-all duration-500"
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
    <PanelCard title="JVM Memory" info={info}>
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
    </PanelCard>
  );
}
