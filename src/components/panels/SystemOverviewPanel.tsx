'use client';

import { MetricsHistory, MetricsSnapshot } from '@/types/metrics';
import { findSampleValue } from '@/hooks/useMetrics';
import { formatPercent, formatUptime } from '@/lib/formatters';
import { TimeSeriesChart } from '@/components/charts/TimeSeriesChart';
import { PanelCard, InfoRow, StatCard } from '@/components/PanelCard';

const info = (
  <>
    <p>Real-time CPU load for the JVM process and the host system, plus process uptime and available CPU cores.</p>
    <div className="mt-3">
      <InfoRow name="process_cpu_usage" desc="Fraction of total CPU time consumed by the JVM process (0–100%)." />
      <InfoRow name="system_cpu_usage" desc="Overall system-wide CPU utilization across all processes (0–100%)." />
      <InfoRow name="process_uptime_seconds" desc="Elapsed seconds since the JVM process started." />
      <InfoRow name="system_cpu_count" desc="Number of logical CPU cores visible to the JVM." />
    </div>
    <p className="mt-3 text-gray-400 text-xs">The chart tracks both CPU values over the last ~30 polling intervals (≈15 min).</p>
  </>
);

interface Props {
  latest: MetricsSnapshot | null;
  history: MetricsHistory;
}

export function SystemOverviewPanel({ latest, history }: Props) {
  const m = latest?.metrics ?? [];

  const processCpu = findSampleValue(m, 'process_cpu_usage');
  const systemCpu = findSampleValue(m, 'system_cpu_usage');
  const uptime = findSampleValue(m, 'process_uptime_seconds');
  const cpuCount = findSampleValue(m, 'system_cpu_count');

  const chartData = history.map((snap) => ({
    ts: snap.ts,
    process: findSampleValue(snap.metrics, 'process_cpu_usage'),
    system: findSampleValue(snap.metrics, 'system_cpu_usage'),
  }));

  return (
    <PanelCard title="System Overview" info={info}>
      <div className="grid grid-cols-3 gap-4">
        <StatCard label="Process CPU" value={formatPercent(processCpu)} accent="border-blue-500/50" />
        <StatCard label="System CPU" value={formatPercent(systemCpu)} accent="border-emerald-500/50" />
        <StatCard label="Uptime" value={formatUptime(uptime)} accent="border-purple-500/40" />
      </div>

      {cpuCount > 0 && (
        <p className="text-xs text-gray-500">{cpuCount} CPU cores available</p>
      )}

      {chartData.length > 1 && (
        <TimeSeriesChart
          data={chartData}
          series={[
            { key: 'process', color: '#60A5FA', label: 'Process CPU' },
            { key: 'system', color: '#34D399', label: 'System CPU' },
          ]}
          yTickFormatter={(v) => formatPercent(v)}
        />
      )}
    </PanelCard>
  );
}
