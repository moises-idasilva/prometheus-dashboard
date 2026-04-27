'use client';

import { useState, useMemo } from 'react';
import { MetricsSnapshot } from '@/types/metrics';
import { PanelCard } from '@/components/PanelCard';

const info = (
  <>
    <p>Raw view of every Prometheus metric the service currently exposes. Useful for debugging and discovering available metrics.</p>
    <ul className="mt-3 text-xs text-gray-400 list-disc list-inside space-y-1">
      <li>Search by metric name, label key/value, or help text.</li>
      <li>Hover any row to see the full help description in a tooltip.</li>
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
    const result: { name: string; type: string; labels: string; value: number; help: string }[] = [];
    for (const family of latest.metrics) {
      for (const sample of family.samples) {
        result.push({
          name: sample.sampleName,
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
        className="bg-gray-800 border border-gray-600 rounded-md px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-blue-500 w-full max-w-md"
      />

      {latest ? (
        <div className="overflow-x-auto max-h-96 overflow-y-auto rounded-lg border border-gray-700">
          <table className="w-full text-xs border-collapse">
            <thead className="sticky top-0 bg-gray-800">
              <tr>
                <th className="text-left px-3 py-2 text-gray-400 font-medium w-1/3">Metric</th>
                <th className="text-left px-3 py-2 text-gray-400 font-medium w-1/4">Labels</th>
                <th className="text-right px-3 py-2 text-gray-400 font-medium w-24">Value</th>
                <th className="text-left px-3 py-2 text-gray-400 font-medium w-16">Type</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((row, i) => (
                <tr
                  key={`${row.name}-${i}`}
                  className="border-t border-gray-800 hover:bg-gray-800/50 transition-colors"
                  title={row.help}
                >
                  <td className="px-3 py-1.5 font-mono text-blue-300 truncate max-w-0">{row.name}</td>
                  <td className="px-3 py-1.5 font-mono text-gray-400 truncate max-w-0">{row.labels}</td>
                  <td className="px-3 py-1.5 font-mono text-white text-right tabular-nums">{formatValue(row.value)}</td>
                  <td className={`px-3 py-1.5 ${typeColor[row.type] ?? 'text-gray-400'}`}>{row.type}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="text-gray-500 text-sm text-center py-8">Waiting for data...</p>
      )}
    </PanelCard>
  );
}
