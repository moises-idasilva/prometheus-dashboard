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

interface Props {
  latest: MetricsSnapshot | null;
  history: MetricsHistory;
}

function StatCard({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="bg-gray-800 rounded-lg p-3 flex flex-col gap-1">
      <span className={`text-xs uppercase tracking-wider ${color}`}>{label}</span>
      <span className="text-white text-xl font-mono font-semibold">
        {isNaN(value) ? '—' : Math.round(value)}
      </span>
    </div>
  );
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
    <div className="bg-gray-900 rounded-xl p-5 border border-gray-700 flex flex-col gap-4">
      <h2 className="text-sm font-semibold text-gray-300 uppercase tracking-wider">
        Database Connections
      </h2>

      <div className="grid grid-cols-2 gap-3">
        <StatCard label="Active" value={active} color="text-orange-400" />
        <StatCard label="Idle" value={idle} color="text-green-400" />
        <StatCard label="Total" value={total} color="text-blue-400" />
        <StatCard label="Pool Max" value={max} color="text-gray-400" />
      </div>

      {!isNaN(pending) && pending > 0 && (
        <div className="bg-yellow-900/30 border border-yellow-700 rounded-lg px-3 py-2 text-xs text-yellow-400">
          ⚠ {Math.round(pending)} thread(s) waiting for a connection
        </div>
      )}

      {chartData.length > 1 && (
        <ResponsiveContainer width="100%" height={160}>
          <AreaChart data={chartData} margin={{ top: 4, right: 16, left: 4, bottom: 4 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
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
              contentStyle={{ backgroundColor: '#1F2937', border: '1px solid #374151', borderRadius: '6px', fontSize: '12px' }}
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              labelFormatter={(v: any) => new Date(v as number).toLocaleTimeString()}
            />
            <Legend wrapperStyle={{ fontSize: '11px', color: '#9CA3AF' }} />
            <Area type="monotone" dataKey="active" name="Active" stackId="a" stroke="#FB923C" fill="#FB923C" fillOpacity={0.4} dot={false} />
            <Area type="monotone" dataKey="idle" name="Idle" stackId="a" stroke="#34D399" fill="#34D399" fillOpacity={0.4} dot={false} />
          </AreaChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}
