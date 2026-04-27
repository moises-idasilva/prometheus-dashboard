export function formatBytes(bytes: number): string {
  if (!isFinite(bytes) || bytes < 0) return '—';
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  let value = bytes;
  let unitIdx = 0;
  while (value >= 1024 && unitIdx < units.length - 1) {
    value /= 1024;
    unitIdx++;
  }
  return `${value.toFixed(2)} ${units[unitIdx]}`;
}

export function formatBytesOrUnlimited(bytes: number): string {
  if (bytes === -1) return 'Unlimited';
  return formatBytes(bytes);
}

export function formatUptime(seconds: number): string {
  if (!isFinite(seconds) || seconds < 0) return '—';
  const d = Math.floor(seconds / 86400);
  const h = Math.floor((seconds % 86400) / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  return `${d}d ${String(h).padStart(2, '0')}h ${String(m).padStart(2, '0')}m`;
}

export function formatPercent(ratio: number, decimals = 2): string {
  if (!isFinite(ratio)) return '—';
  return `${(ratio * 100).toFixed(decimals)}%`;
}

export function formatNumber(n: number, decimals = 2): string {
  if (!isFinite(n)) return '—';
  if (Math.abs(n) >= 1_000_000) return `${(n / 1_000_000).toFixed(decimals)}M`;
  if (Math.abs(n) >= 1_000) return `${(n / 1_000).toFixed(decimals)}K`;
  return n.toFixed(decimals);
}
