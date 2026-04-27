'use client';

import { MetricsSnapshot } from '@/types/metrics';
import { formatBytes } from '@/lib/formatters';
import { PanelCard, InfoRow } from '@/components/PanelCard';

const info = (
  <>
    <p>Storage utilisation per filesystem mountpoint, updated with each metrics poll.</p>
    <div className="mt-3">
      <InfoRow name="disk_free_bytes" desc="Free (available) bytes on the mountpoint." />
      <InfoRow name="disk_total_bytes" desc="Total capacity of the filesystem." />
    </div>
    <ul className="mt-3 text-xs text-gray-400 list-disc list-inside space-y-1">
      <li>Progress bar is <span className="text-blue-400">blue</span> below 75%, <span className="text-yellow-400">yellow</span> from 75–90%, and <span className="text-red-400">red</span> at 90%+.</li>
    </ul>
  </>
);

interface Props {
  latest: MetricsSnapshot | null;
}

interface DiskEntry {
  path: string;
  total: number;
  free: number;
  used: number;
  pct: number;
}

function getDiskEntries(latest: MetricsSnapshot | null): DiskEntry[] {
  if (!latest) return [];

  const freeFamily = latest.metrics.find((m) => m.metricName === 'disk_free_bytes');
  const totalFamily = latest.metrics.find((m) => m.metricName === 'disk_total_bytes');
  if (!freeFamily || !totalFamily) return [];

  return freeFamily.samples
    .map((freeSample) => {
      const path = freeSample.labels.path ?? '/';
      const totalSample = totalFamily.samples.find((s) => s.labels.path === path);
      if (!totalSample) return null;
      const total = totalSample.value;
      const free = freeSample.value;
      const used = total - free;
      const pct = total > 0 ? (used / total) * 100 : 0;
      return { path, total, free, used, pct };
    })
    .filter((e): e is DiskEntry => e !== null);
}

function usageColor(pct: number): string {
  if (pct >= 90) return 'bg-red-500';
  if (pct >= 75) return 'bg-yellow-500';
  return 'bg-blue-500';
}

export function DiskUsagePanel({ latest }: Props) {
  const entries = getDiskEntries(latest);

  return (
    <PanelCard title="Disk Usage" info={info}>
      {entries.length === 0 ? (
        <p className="text-gray-500 text-sm text-center py-4">Waiting for data...</p>
      ) : (
        entries.map(({ path, total, free, used, pct }) => (
          <div key={path} className="flex flex-col gap-2">
            <div className="flex justify-between items-center text-xs text-gray-400">
              <span className="font-mono truncate" title={path}>{path}</span>
              <span className="shrink-0 ml-2 text-white font-semibold">
                {pct.toFixed(1)}% used
              </span>
            </div>

            <div className="h-2.5 bg-gray-700 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${usageColor(pct)}`}
                style={{ width: `${Math.min(pct, 100).toFixed(1)}%` }}
              />
            </div>

            <div className="grid grid-cols-3 gap-2">
              {[
                { label: 'Used', value: used, color: 'text-white' },
                { label: 'Free', value: free, color: 'text-green-400' },
                { label: 'Total', value: total, color: 'text-gray-400' },
              ].map(({ label, value, color }) => (
                <div key={label} className="bg-gray-800 rounded-lg p-2.5 text-center">
                  <div className="text-xs text-gray-500 uppercase tracking-wider">{label}</div>
                  <div className={`text-sm font-mono font-semibold mt-0.5 ${color}`}>
                    {formatBytes(value)}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))
      )}
    </PanelCard>
  );
}
