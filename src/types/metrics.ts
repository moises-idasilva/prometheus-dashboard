export interface MetricSample {
  sampleName: string;
  labels: Record<string, string>;
  value: number;
  timestamp?: number;
}

export interface ParsedMetric {
  metricName: string;
  help: string;
  type: 'counter' | 'gauge' | 'histogram' | 'summary' | 'untyped';
  samples: MetricSample[];
}

export interface MetricsSnapshot {
  ts: number;
  metrics: ParsedMetric[];
}

export type MetricsHistory = MetricsSnapshot[];

export interface ApiConfig {
  id: string;
  name: string;
  url: string;
  tokenEnvKey: string;
  refreshInterval: number;
}
