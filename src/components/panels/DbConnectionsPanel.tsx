'use client';

import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { MetricsHistory, MetricsSnapshot } from '@/types/metrics';
import { findSampleValue } from '@/hooks/useMetrics';
import { PanelCard, InfoRow, StatCard } from '@/components/PanelCard';

const info = (
  <>
    <p>Monitors the HikariCP JDBC connection pool health in real time.</p>
    <div className="mt-3">
      <InfoRow name="hikaricp_connections_active" desc="Connections currently checked out and executing queries." />
      <InfoRow name="hikaricp_connections_idle" desc="Connections in the pool ready to be used." />
      <InfoRow name="hikaricp_connections_pending" desc="Threads waiting to acquire a connection. A non-zero value signals a bottleneck." />
      <InfoRow name="hikaricp_connections_max" desc="Maximum pool size as configured in HikariCP." />
    </div>
    <p className="mt-3 text-gray-400 text-xs">If pending threads appear, consider increasing pool size or optimising query duration.</p>
  </>
);

interface Props {
  latest: MetricsSnapshot | null;
  history: MetricsHistory;
}

export function DbConnectionsPanel({ latest, history }: Props) {
  const m = latest?.metrics ?? [];

  const total = findSampleValue(m, 'hikaricp_connections');
  const active = findSampleValue(m, 'hikaricp_connections_active');
  const idle = findSampleValue(m, 'hikaricp_connections_idle');
  const max = findSampleValue(m, 'hikaricp_connections_max');
  const pending = findSampleValue(m, 'hikaricp_connections_pending');

  const chartData = history.map((snap) => ({
    ts: snap.ts,
    active: findSampleValue(snap.metrics, 'hikaricp_connections_active'),
    idle: findSampleValue(snap.metrics, 'hikaricp_connections_idle'),
  }));

  const tickFmt = (v: number) => new Date(v).toLocaleTimeString([], {
    hour: '2-digit', minute: '2-digit', second: '2-digit',
  });

  return (
    <PanelCard title="Database Connections" info={info}>
      <div className="grid grid-cols-2 gap-4">
        <StatCard label="Active" value={isNaN(active) ? '—' : String(Math.round(active))} accent="border-orange-500/50" labelClass="text-orange-400" />
        <StatCard label="Idle" value={isNaN(idle) ? '—' : String(Math.round(idle))} accent="border-emerald-500/50" labelClass="text-emerald-400" />
        <StatCard label="Total" value={isNaN(total) ? '—' : String(Math.round(total))} accent="border-blue-500/50" labelClass="text-blue-400" />
        <StatCard label="Pool Max" value={isNaN(max) ? '—' : String(Math.round(max))} />
      </div>

      {!isNaN(pending) && pending > 0 && (
        <div className="bg-yellow-900/30 border border-yellow-700 rounded-lg px-3 py-2 text-xs text-yellow-400">
          ⚠ {Math.round(pending)} thread(s) waiting for a connection
        </div>
      )}

      {chartData.length > 1 && (
        <ResponsiveContainer width="100%" height={160}>
          <AreaChart data={chartData} margin={{ top: 4, right: 16, left: 4, bottom: 4 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
            <XAxis
              dataKey="ts"
              type="number"
              domain={['dataMin', 'dataMax']}
              tickFormatter={tickFmt}
              tick={{ fill: '#9CA3AF', fontSize: 10 }}
              tickCount={4}
            />
            <YAxis tick={{ fill: '#9CA3AF', fontSize: 10 }} width={30} />
            <Tooltip
              contentStyle={{ backgroundColor: '#111827', border: '1px solid #1f2937', borderRadius: '6px', fontSize: '12px' }}
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              labelFormatter={(v: any) => new Date(v as number).toLocaleTimeString()}
            />
            <Legend wrapperStyle={{ fontSize: '11px', color: '#9CA3AF' }} />
            <Area type="monotone" dataKey="active" name="Active" stackId="a" stroke="#FB923C" fill="#FB923C" fillOpacity={0.4} dot={false} />
            <Area type="monotone" dataKey="idle" name="Idle" stackId="a" stroke="#34D399" fill="#34D399" fillOpacity={0.4} dot={false} />
          </AreaChart>
        </ResponsiveContainer>
      )}
    </PanelCard>
  );
}
