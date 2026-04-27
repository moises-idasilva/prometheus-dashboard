'use client';

import { MetricsHistory, MetricsSnapshot } from '@/types/metrics';
import { findSampleValue } from '@/hooks/useMetrics';
import { formatPercent, formatUptime } from '@/lib/formatters';
import { TimeSeriesChart } from '@/components/charts/TimeSeriesChart';

interface Props {
  latest: MetricsSnapshot | null;
  history: MetricsHistory;
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-gray-800 rounded-lg p-4 flex flex-col gap-1">
      <span className="text-gray-400 text-xs uppercase tracking-wider">{label}</span>
      <span className="text-white text-xl font-mono font-semibold">{value}</span>
    </div>
  );
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
    <div className="bg-gray-900 rounded-xl p-5 border border-gray-700 flex flex-col gap-4">
      <h2 className="text-sm font-semibold text-gray-300 uppercase tracking-wider">
        System Overview
      </h2>

      <div className="grid grid-cols-3 gap-3">
        <StatCard label="Process CPU" value={formatPercent(processCpu)} />
        <StatCard label="System CPU" value={formatPercent(systemCpu)} />
        <StatCard label="Uptime" value={formatUptime(uptime)} />
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
    </div>
  );
}
