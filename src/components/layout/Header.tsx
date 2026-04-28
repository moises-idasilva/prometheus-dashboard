'use client';

import { ApiConfig } from '@/types/metrics';

interface HeaderProps {
  apis: ApiConfig[];
  activeApiId: string;
  onApiChange: (id: string) => void;
  isLoading: boolean;
  lastFetched: Date | null;
  error: string | null;
  refreshInterval: number;
}

export function Header({
  apis,
  activeApiId,
  onApiChange,
  isLoading,
  lastFetched,
  error,
  refreshInterval,
}: HeaderProps) {
  return (
    <header className="px-4 sm:px-6 py-3 bg-gray-900 border-b border-gray-700 sticky top-0 z-10">
      {/* Desktop */}
      <div className="hidden sm:flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="text-blue-400 text-lg">◎</span>
          <h1 className="text-base font-semibold text-white tracking-wide">
            Sparx Novate API Metrics Dashboard
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
            <span className="text-gray-600 text-xs">
              (every {refreshInterval / 1000}s)
            </span>
          </div>

          <select
            value={activeApiId}
            onChange={(e) => onApiChange(e.target.value)}
            className="bg-gray-800 text-white border border-gray-600 rounded-md px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
          >
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
          <h1 className="text-sm font-semibold text-white tracking-wide">SN APIs</h1>
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
        <select
          value={activeApiId}
          onChange={(e) => onApiChange(e.target.value)}
          className="w-full bg-gray-800 text-white border border-gray-600 rounded-md px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
        >
          {apis.map((api) => (
            <option key={api.id} value={api.id}>
              {api.name}
            </option>
          ))}
        </select>
      </div>
    </header>
  );
}
