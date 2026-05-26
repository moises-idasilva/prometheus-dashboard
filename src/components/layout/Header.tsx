'use client';

import { useEffect, useState } from 'react';
import { ApiConfig } from '@/types/metrics';

function CountdownTimer({ lastFetched, refreshInterval }: { lastFetched: Date; refreshInterval: number }) {
  const [remaining, setRemaining] = useState(refreshInterval);

  useEffect(() => {
    const tick = () => {
      const elapsed = Date.now() - lastFetched.getTime();
      setRemaining(Math.max(0, refreshInterval - elapsed));
    };
    tick();
    const id = setInterval(tick, 500);
    return () => clearInterval(id);
  }, [lastFetched, refreshInterval]);

  const secs = Math.ceil(remaining / 1000);
  const label = secs >= 60
    ? `${Math.floor(secs / 60)}m ${secs % 60 > 0 ? `${secs % 60}s` : ''}`.trim()
    : `${secs}s`;

  return (
    <span className="text-gray-500 text-xs tabular-nums" title="Next sync in">
      {label}
    </span>
  );
}

const REFRESH_OPTIONS = [
  { label: '5 seconds',  value: 5000 },
  { label: '30 seconds', value: 30000 },
  { label: '1 minute',  value: 60000 },
  { label: '5 minutes',  value: 300000 },
  { label: '10 minutes', value: 600000 },
  { label: '30 minutes', value: 1800000 },
  { label: '1 hour',    value: 3600000 },
];

interface HeaderProps {
  apis: ApiConfig[];
  activeApiId: string;
  onApiChange: (id: string) => void;
  isLoading: boolean;
  lastFetched: Date | null;
  error: string | null;
  refreshInterval: number;
  onRefreshIntervalChange: (ms: number) => void;
}

export function Header({
  apis,
  activeApiId,
  onApiChange,
  isLoading,
  lastFetched,
  error,
  refreshInterval,
  onRefreshIntervalChange,
}: HeaderProps) {
  const selectClass =
    'bg-gray-900 text-gray-100 border border-gray-700 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500/60 hover:border-gray-600 transition-colors';

  return (
    <header className="px-4 sm:px-6 py-3 bg-gray-950/90 backdrop-blur-md border-b border-gray-800 sticky top-0 z-10">
      {/* Desktop */}
      <div className="hidden sm:flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="text-blue-400/80 text-lg leading-none">◎</span>
          <h1 className="text-sm font-semibold text-gray-100 tracking-tight">
            Multiverse Tech — API Metrics
          </h1>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 text-xs">
            {isLoading && (
              <span className="flex items-center gap-1 text-yellow-400">
                <span className="inline-block w-2 h-2 rounded-full bg-yellow-400 animate-pulse" />
                Fetching
              </span>
            )}
            {error && (
              <span
                className="flex items-center gap-1 text-red-400 cursor-help"
                title={error}
              >
                <span className="inline-block w-2 h-2 rounded-full bg-red-400" />
                Error
              </span>
            )}
            {lastFetched && !error && !isLoading && (
              <span className="text-gray-400">
                Updated {lastFetched.toLocaleTimeString()}
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            <select
              value={refreshInterval}
              onChange={(e) => onRefreshIntervalChange(Number(e.target.value))}
              className={selectClass}
            >
              {REFRESH_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
            {lastFetched && (
              <CountdownTimer lastFetched={lastFetched} refreshInterval={refreshInterval} />
            )}
          </div>

          <select
            value={activeApiId}
            onChange={(e) => onApiChange(e.target.value)}
            className={selectClass}
          >
            <option value="all">ALL APIS</option>
            {apis.map((api) => (
              <option key={api.id} value={api.id}>
                {api.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Mobile */}
      <div className="flex sm:hidden flex-col gap-2">
        <div className="flex items-center justify-between">
          <h1 className="text-sm font-semibold text-white tracking-wide">Multiverse Tech APIs</h1>
          <div className="flex items-center gap-2 text-xs">
            {isLoading && (
              <span className="flex items-center gap-1 text-yellow-400">
                <span className="inline-block w-2 h-2 rounded-full bg-yellow-400 animate-pulse" />
                Fetching
              </span>
            )}
            {error && (
              <span
                className="flex items-center gap-1 text-red-400 cursor-help"
                title={error}
              >
                <span className="inline-block w-2 h-2 rounded-full bg-red-400" />
                Error
              </span>
            )}
            {lastFetched && !error && !isLoading && (
              <span className="text-gray-400">
                Updated {lastFetched.toLocaleTimeString()}
              </span>
            )}
          </div>
        </div>
        <div className="flex gap-2">
          <div className="flex items-center gap-2">
            <select
              value={refreshInterval}
              onChange={(e) => onRefreshIntervalChange(Number(e.target.value))}
              className="bg-gray-900 text-gray-100 border border-gray-700 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500/60"
            >
              {REFRESH_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
            {lastFetched && (
              <CountdownTimer lastFetched={lastFetched} refreshInterval={refreshInterval} />
            )}
          </div>
          <select
            value={activeApiId}
            onChange={(e) => onApiChange(e.target.value)}
            className="flex-1 bg-gray-900 text-gray-100 border border-gray-700 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500/60"
          >
            <option value="all">ALL APIS</option>
            {apis.map((api) => (
              <option key={api.id} value={api.id}>
                {api.name}
              </option>
            ))}
          </select>
        </div>
      </div>
    </header>
  );
}
