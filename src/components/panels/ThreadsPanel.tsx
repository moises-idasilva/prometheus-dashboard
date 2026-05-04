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
import { PanelCard, InfoRow, StatCard } from '@/components/PanelCard';

const info = (
  <>
    <p>JVM thread counts by state — live, daemon, peak, and a bar-chart breakdown per thread state.</p>
    <div className="mt-3">
      <InfoRow name="jvm_threads_live_threads" desc="Currently live (non-terminated) threads." />
      <InfoRow name="jvm_threads_daemon_threads" desc="Live daemon threads (background JVM housekeeping threads)." />
      <InfoRow name="jvm_threads_peak_threads" desc="Highest live thread count since JVM start." />
      <InfoRow name="jvm_threads_states_threads" desc="Per-state breakdown labelled by state." />
    </div>
    <ul className="mt-3 text-xs text-gray-400 list-disc list-inside space-y-1">
      <li><span className="text-green-400">RUNNABLE</span> — executing or ready to execute</li>
      <li><span className="text-red-400">BLOCKED</span> — waiting on a monitor lock; spikes may indicate contention</li>
      <li><span className="text-blue-400">WAITING / TIMED_WAITING</span> — parked waiting for a signal or timeout</li>
    </ul>
  </>
);

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
    <PanelCard title="JVM Threads" info={info}>
      <div className="grid grid-cols-3 gap-4">
        <StatCard label="Live" value={isNaN(liveThreads) ? '—' : String(Math.round(liveThreads))} accent="border-emerald-500/50" labelClass="text-emerald-400" />
        <StatCard label="Daemon" value={isNaN(daemonThreads) ? '—' : String(Math.round(daemonThreads))} accent="border-blue-500/50" labelClass="text-blue-400" />
        <StatCard label="Peak" value={isNaN(peakThreads) ? '—' : String(Math.round(peakThreads))} accent="border-purple-500/40" labelClass="text-purple-400" />
      </div>

      {stateData.length > 0 && (
        <ResponsiveContainer width="100%" height={140}>
          <BarChart
            data={stateData}
            layout="vertical"
            margin={{ top: 4, right: 16, left: 4, bottom: 4 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" horizontal={false} />
            <XAxis type="number" tick={{ fill: '#9CA3AF', fontSize: 10 }} />
            <YAxis
              type="category"
              dataKey="state"
              tick={{ fill: '#9CA3AF', fontSize: 10 }}
              width={80}
            />
            <Tooltip
              contentStyle={{ backgroundColor: '#111827', border: '1px solid #1f2937', borderRadius: '6px', fontSize: '12px' }}
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
    </PanelCard>
  );
}
