'use client';

import { useState } from 'react';
import { getAllApis } from '@/lib/apiConfig';
import { useMetrics } from '@/hooks/useMetrics';
import { Header } from '@/components/layout/Header';
import { SystemOverviewPanel } from '@/components/panels/SystemOverviewPanel';
import { JvmMemoryPanel } from '@/components/panels/JvmMemoryPanel';
import { HttpRequestsPanel } from '@/components/panels/HttpRequestsPanel';
import { DbConnectionsPanel } from '@/components/panels/DbConnectionsPanel';
import { ThreadsPanel } from '@/components/panels/ThreadsPanel';
import { DiskUsagePanel } from '@/components/panels/DiskUsagePanel';
import { AllMetricsTable } from '@/components/panels/AllMetricsTable';

const apis = getAllApis();

export default function DashboardPage() {
  const [activeApiId, setActiveApiId] = useState(apis[0]?.id ?? '');
  const activeApi = apis.find((a) => a.id === activeApiId) ?? apis[0];

  const { history, latest, isLoading, error, lastFetched } = useMetrics(
    activeApiId,
    activeApi?.refreshInterval ?? 30000
  );

  if (apis.length === 0) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center text-gray-400">
        No APIs configured. Add entries to{' '}
        <code className="mx-1 text-blue-400">config/apis.json</code>.
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100">
      <Header
        apis={apis}
        activeApiId={activeApiId}
        onApiChange={setActiveApiId}
        isLoading={isLoading}
        lastFetched={lastFetched}
        error={error}
        refreshInterval={activeApi?.refreshInterval ?? 30000}
      />

      <main className="p-5 grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-5">
        <SystemOverviewPanel latest={latest} history={history} />
        <JvmMemoryPanel latest={latest} history={history} />
        <HttpRequestsPanel latest={latest} history={history} />
        <DbConnectionsPanel latest={latest} history={history} />
        <ThreadsPanel latest={latest} history={history} />
        <DiskUsagePanel latest={latest} />
        <div className="col-span-1 lg:col-span-2 xl:col-span-3">
          <AllMetricsTable latest={latest} />
        </div>
      </main>
    </div>
  );
}
