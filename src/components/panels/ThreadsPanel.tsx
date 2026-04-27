'use client';

import {
  BarChart,
  Bar,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { MetricsHistory, MetricsSnapshot } from '@/types/metrics';
import { findSampleValue } from '@/hooks/useMetrics';

interface Props {
  latest: MetricsSnapshot | null;
  history: MetricsHistory;
}

const THREAD_STATES = [
  { state: 'runnable', color: '#34D399' },
  { state: 'waiting', color: '#60A5FA' },
  { state: 'timed-waiting', color: '#818CF8' },
  { state: 'blocked', color: '#F87171' },
  { state: 'new', color: '#FBBF24' },
  { state: 'terminated', color: '#6B7280' },
];

export function ThreadsPanel({ latest, history }: Props) {
  const m = latest?.metrics ?? [];

  const liveThreads = findSampleValue(m, 'jvm_threads_live_threads');
  const daemonThreads = findSampleValue(m, 'jvm_threads_daemon_threads');
  const peakThreads = findSampleValue(m, 'jvm_threads_peak_threads');

  const stateData = THREAD_STATES.map(({ state, color }) => ({
    state,
    count: findSampleValue(m, 'jvm_threads_states_threads', { state }),
    fill: color,
  })).filter((d) => !isNaN(d.count));

  // Build history chart: total threads over time
  const historyData = history.map((snap) => ({
    ts: snap.ts,
    live: findSampleValue(snap.metrics, 'jvm_threads_live_threads'),
  }));

  return (
    <div className="bg-gray-900 rounded-xl p-5 border border-gray-700 flex flex-col gap-4">
      <h2 className="text-sm font-semibold text-gray-300 uppercase tracking-wider">
        JVM Threads
      </h2>

      <div className="grid grid-cols-3 gap-3">
        {[
          { label: 'Live', value: liveThreads, color: 'text-green-400' },
          { label: 'Daemon', value: daemonThreads, color: 'text-blue-400' },
          { label: 'Peak', value: peakThreads, color: 'text-purple-400' },
        ].map(({ label, value, color }) => (
          <div key={label} className="bg-gray-800 rounded-lg p-3 text-center">
            <div className={`text-xs uppercase tracking-wider ${color}`}>{label}</div>
            <div className="text-white text-xl font-mono font-semibold">
              {isNaN(value) ? '—' : Math.round(value)}
            </div>
          </div>
        ))}
      </div>

      {stateData.length > 0 && (
        <ResponsiveContainer width="100%" height={140}>
          <BarChart
            data={stateData}
            layout="vertical"
            margin={{ top: 4, right: 16, left: 4, bottom: 4 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#374151" horizontal={false} />
            <XAxis type="number" tick={{ fill: '#9CA3AF', fontSize: 10 }} />
            <YAxis
              type="category"
              dataKey="state"
              tick={{ fill: '#9CA3AF', fontSize: 10 }}
              width={80}
            />
            <Tooltip
              contentStyle={{ backgroundColor: '#1F2937', border: '1px solid #374151', borderRadius: '6px', fontSize: '12px' }}
            />
            <Bar dataKey="count" name="Threads">
              {stateData.map((entry) => (
                <Cell key={entry.state} fill={entry.fill} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      )}

      {historyData.length > 1 && (
        <div className="flex gap-2 flex-wrap">
          {stateData.map(({ state, count, fill }) => (
            <div key={state} className="flex items-center gap-1 text-xs">
              <span className="w-2 h-2 rounded-full" style={{ backgroundColor: fill }} />
              <span className="text-gray-400">{state}:</span>
              <span className="text-white font-mono">{Math.round(count)}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
