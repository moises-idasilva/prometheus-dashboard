'use client';

import { useState, useMemo } from 'react';
import { MetricsSnapshot } from '@/types/metrics';
import { PanelCard } from '@/components/PanelCard';

const METRIC_DESCRIPTIONS: Record<string, string> = {
  // Process & system
  process_cpu_usage:              'How much CPU the app is using right now (0–100%)',
  system_cpu_usage:               'Total CPU usage across the whole machine',
  process_uptime_seconds:         'How long the app has been running',
  system_cpu_count:               'Number of CPU cores available to the app',
  process_files_open_files:       'Number of files the app currently has open',
  process_files_max_files:        'Max files the app is allowed to open at once',
  process_start_time_seconds:     'Timestamp of when the app last started',

  // JVM memory
  jvm_memory_used_bytes:          'Memory the app is actively using right now',
  jvm_memory_committed_bytes:     'Memory the OS has reserved for the app',
  jvm_memory_max_bytes:           'Maximum memory the app is allowed to use',
  jvm_buffer_memory_used_bytes:   'Memory used for temporary I/O read/write buffers',
  jvm_buffer_total_capacity_bytes:'Total capacity of all I/O buffers',
  jvm_buffer_count_buffers:       'Number of I/O buffer pools in use',

  // JVM garbage collection
  jvm_gc_pause_seconds:           'Time the app was frozen for garbage collection (shorter is better)',
  jvm_gc_memory_promoted_bytes:   'Data moved from short-lived to long-lived memory',
  jvm_gc_memory_allocated_bytes:  'New memory created since the last GC cycle',
  jvm_gc_max_data_size_bytes:     'Max size of the long-lived memory region',
  jvm_gc_live_data_size_bytes:    'Live objects still in memory after the last GC',
  jvm_gc_overhead_percent:        'Percentage of time the app spends doing garbage collection',

  // JVM threads
  jvm_threads_live_threads:       'Number of threads currently running',
  jvm_threads_daemon_threads:     'Background threads doing housekeeping work quietly',
  jvm_threads_peak_threads:       'Highest number of threads seen since startup',
  jvm_threads_states_threads:     'Threads grouped by state — running, waiting, blocked, etc.',

  // JVM classes
  jvm_classes_loaded_classes:     'Number of Java classes currently loaded into memory',
  jvm_classes_unloaded_classes:   'Number of Java classes unloaded to free memory',

  // HTTP server
  http_server_requests_seconds:   'How long incoming HTTP requests take and how many are handled',

  // HTTP client (outgoing)
  http_client_requests_seconds:   'How long outgoing HTTP calls to other services take',

  // Database pool (HikariCP)
  hikaricp_connections:           'Total database connections in the pool',
  hikaricp_connections_active:    'Connections currently executing a database query',
  hikaricp_connections_idle:      'Connections ready and waiting to be used',
  hikaricp_connections_pending:   'Requests waiting for a free connection — a spike here means the pool is too small',
  hikaricp_connections_max:       'Maximum database connections the pool is allowed to have',
  hikaricp_connections_min:       'Minimum connections kept warm and ready at all times',
  hikaricp_connections_timeout_total: 'Times a request gave up waiting for a connection',
  hikaricp_connections_acquire_seconds: 'Time it takes to get a connection from the pool',
  hikaricp_connections_creation_seconds: 'Time it takes to open a fresh database connection',
  hikaricp_connections_usage_seconds: 'How long a connection is used before being returned to the pool',

  // Disk
  disk_free_bytes:                'Free storage space available on disk',
  disk_total_bytes:               'Total storage capacity of the disk',

  // Tomcat web server
  tomcat_sessions_active_current_sessions: 'User sessions currently open',
  tomcat_sessions_active_max_sessions:     'Most sessions open at the same time',
  tomcat_sessions_created_sessions_total:  'Total sessions created since startup',
  tomcat_sessions_expired_sessions_total:  'Sessions that ended because they timed out',
  tomcat_sessions_rejected_sessions_total: 'Sessions turned away because the server was full',
  tomcat_sessions_alive_max_seconds:       'Longest time any single session has stayed open',
  tomcat_global_request_seconds:           'Total time spent handling web requests',
  tomcat_global_sent_bytes_total:          'Total data sent out to clients',
  tomcat_global_received_bytes_total:      'Total data received from clients',
  tomcat_global_error_total:               'Total errors encountered handling requests',
  tomcat_threads_config_max_threads:       'Max threads the web server can use',
  tomcat_threads_busy_threads:             'Threads currently handling an incoming request',
  tomcat_threads_current_threads:          'Total threads alive in the web server right now',

  // Thread pool / executor
  executor_pool_size_threads:     'Current number of threads in the task pool',
  executor_active_threads:        'Threads actively running a task right now',
  executor_queued_tasks:          'Tasks sitting in the queue waiting to be picked up',
  executor_completed_tasks_total: 'Total tasks finished since startup',
  executor_queue_remaining_tasks: 'How many more tasks the queue can still accept',
  executor_pool_max_threads:      'Maximum threads this pool can grow to',
  executor_pool_core_threads:     'Minimum threads always kept alive in the pool',

  // Logging
  logback_events_total:           'Number of log messages written, broken down by log level',

  // Spring Data
  spring_data_repository_invocations_seconds: 'Time spent calling the database through repository methods',

  // Spring Security
  spring_security_authentications_seconds: 'Time taken to verify a user\'s identity',
};

const info = (
  <>
    <p>Raw view of every Prometheus metric the service currently exposes. Useful for debugging and discovering available metrics.</p>
    <ul className="mt-3 text-xs text-gray-400 list-disc list-inside space-y-1">
      <li>Search by metric name, label key/value, or help text.</li>
      <li>The Description column shows a plain-English summary of what each metric measures.</li>
    </ul>
    <div className="mt-3 flex flex-col gap-1.5 text-xs">
      <div className="flex gap-2"><span className="text-green-400 font-mono w-20">counter</span><span className="text-gray-400">Monotonically increasing total (e.g. request count). Use rate() for per-second rates.</span></div>
      <div className="flex gap-2"><span className="text-blue-400 font-mono w-20">gauge</span><span className="text-gray-400">A value that can go up or down (e.g. memory used, active threads).</span></div>
      <div className="flex gap-2"><span className="text-purple-400 font-mono w-20">histogram</span><span className="text-gray-400">Samples distributed across configurable buckets. Exposes _count, _sum, _bucket.</span></div>
      <div className="flex gap-2"><span className="text-orange-400 font-mono w-20">summary</span><span className="text-gray-400">Pre-computed quantiles on the client side.</span></div>
    </div>
  </>
);

interface Props {
  latest: MetricsSnapshot | null;
}

function formatValue(v: number): string {
  if (isNaN(v)) return 'NaN';
  if (!isFinite(v)) return v > 0 ? '+Inf' : '-Inf';
  if (Math.abs(v) >= 1e9) return `${(v / 1e9).toFixed(3)}G`;
  if (Math.abs(v) >= 1e6) return `${(v / 1e6).toFixed(3)}M`;
  if (Math.abs(v) >= 1e3) return `${(v / 1e3).toFixed(3)}K`;
  return v.toPrecision(6).replace(/\.?0+$/, '');
}

function labelsToString(labels: Record<string, string>): string {
  return Object.entries(labels)
    .map(([k, v]) => `${k}="${v}"`)
    .join(', ');
}

export function AllMetricsTable({ latest }: Props) {
  const [search, setSearch] = useState('');

  const rows = useMemo(() => {
    if (!latest) return [];
    const result: {
      name: string;
      familyName: string;
      type: string;
      labels: string;
      value: number;
      help: string;
    }[] = [];
    for (const family of latest.metrics) {
      for (const sample of family.samples) {
        result.push({
          name: sample.sampleName,
          familyName: family.metricName,
          type: family.type,
          labels: labelsToString(sample.labels),
          value: sample.value,
          help: family.help,
        });
      }
    }
    return result;
  }, [latest]);

  const filtered = useMemo(() => {
    if (!search.trim()) return rows;
    const q = search.toLowerCase();
    return rows.filter(
      (r) =>
        r.name.toLowerCase().includes(q) ||
        r.labels.toLowerCase().includes(q) ||
        r.help.toLowerCase().includes(q)
    );
  }, [rows, search]);

  const typeColor: Record<string, string> = {
    gauge: 'text-blue-400',
    counter: 'text-green-400',
    histogram: 'text-purple-400',
    summary: 'text-orange-400',
    untyped: 'text-gray-400',
  };

  return (
    <PanelCard
      title="All Metrics"
      info={info}
      headerRight={<span className="text-xs text-gray-500">{filtered.length} samples</span>}
    >
      <input
        type="text"
        placeholder="Search metric name, labels, or help text..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="bg-gray-900/80 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-100 placeholder-gray-600 focus:outline-none focus:ring-1 focus:ring-blue-500/60 hover:border-gray-600 transition-colors w-full max-w-md"
      />

      {latest ? (
        <div className="overflow-x-auto max-h-96 overflow-y-auto rounded-lg border border-gray-800">
          <table className="w-full text-xs border-collapse">
            <thead className="sticky top-0 bg-gray-900/95 backdrop-blur-sm">
              <tr>
                <th className="text-left px-3 py-2 text-gray-400 font-medium w-1/4">Metric</th>
                <th className="text-left px-3 py-2 text-gray-400 font-medium w-1/4">Labels</th>
                <th className="text-right px-3 py-2 text-gray-400 font-medium w-20">Value</th>
                <th className="text-left px-3 py-2 text-gray-400 font-medium w-16">Type</th>
                <th className="text-left px-3 py-2 text-gray-400 font-medium w-1/4">Description</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((row, i) => {
                const description = METRIC_DESCRIPTIONS[row.familyName] ?? row.help;
                return (
                  <tr
                    key={`${row.name}-${i}`}
                    className="border-t border-gray-800 hover:bg-gray-800/50 transition-colors"
                  >
                    <td className="px-3 py-1.5 font-mono text-blue-300 truncate max-w-0">{row.name}</td>
                    <td className="px-3 py-1.5 font-mono text-gray-400 truncate max-w-0">{row.labels}</td>
                    <td className="px-3 py-1.5 font-mono text-white text-right tabular-nums">{formatValue(row.value)}</td>
                    <td className={`px-3 py-1.5 ${typeColor[row.type] ?? 'text-gray-400'}`}>{row.type}</td>
                    <td className="px-3 py-1.5 text-gray-400">{description}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="text-gray-500 text-sm text-center py-8">Waiting for data...</p>
      )}
    </PanelCard>
  );
}
