import * as fs from 'fs';
import * as path from 'path';
import { parsePrometheusText } from '@/lib/prometheusParser';

const fixture = fs.readFileSync(
  path.join(__dirname, '../__fixtures__/sample.prom'),
  'utf-8'
);

describe('parsePrometheusText', () => {
  it('returns empty array for empty string', () => {
    expect(parsePrometheusText('')).toEqual([]);
  });

  it('parses scientific notation values correctly', () => {
    const result = parsePrometheusText(fixture);
    const memFamily = result.find((m) => m.metricName === 'jvm_memory_used_bytes');
    expect(memFamily).toBeDefined();
    const edenSample = memFamily!.samples.find((s) => s.labels.id === 'G1 Eden Space');
    expect(edenSample!.value).toBeCloseTo(411041792, 0);
  });

  it('parses large scientific notation (4.194304E9) correctly', () => {
    const result = parsePrometheusText(fixture);
    const maxFamily = result.find((m) => m.metricName === 'jvm_memory_max_bytes');
    const oldGen = maxFamily!.samples.find((s) => s.labels.id === 'G1 Old Gen');
    expect(oldGen!.value).toBeCloseTo(4194304000, 0);
  });

  it('stores -1.0 as -1 (not NaN or Infinity)', () => {
    const result = parsePrometheusText(fixture);
    const maxFamily = result.find((m) => m.metricName === 'jvm_memory_max_bytes');
    const eden = maxFamily!.samples.find((s) => s.labels.id === 'G1 Eden Space');
    expect(eden!.value).toBe(-1);
    expect(isNaN(eden!.value)).toBe(false);
  });

  it('parses NaN sentinel as JavaScript NaN', () => {
    const result = parsePrometheusText(fixture);
    const sentinel = result.find((m) => m.metricName === 'some_sentinel_metric');
    const nanSample = sentinel!.samples.find((s) => s.labels.label === 'nan');
    expect(isNaN(nanSample!.value)).toBe(true);
  });

  it('parses +Inf sentinel as Infinity', () => {
    const result = parsePrometheusText(fixture);
    const sentinel = result.find((m) => m.metricName === 'some_sentinel_metric');
    const infSample = sentinel!.samples.find((s) => s.labels.label === 'inf');
    expect(infSample!.value).toBe(Infinity);
  });

  it('parses -Inf sentinel as -Infinity', () => {
    const result = parsePrometheusText(fixture);
    const sentinel = result.find((m) => m.metricName === 'some_sentinel_metric');
    const negInfSample = sentinel!.samples.find((s) => s.labels.label === 'neginf');
    expect(negInfSample!.value).toBe(-Infinity);
  });

  it('handles comma inside quoted label value', () => {
    const result = parsePrometheusText(fixture);
    const httpFamily = result.find((m) => m.metricName === 'http_server_requests_seconds');
    expect(httpFamily).toBeDefined();
    const commaSample = httpFamily!.samples.find(
      (s) => s.labels.uri === '/api/search?q=foo,bar'
    );
    expect(commaSample).toBeDefined();
    expect(commaSample!.labels.uri).toBe('/api/search?q=foo,bar');
  });

  it('groups _count and _sum samples under the parent family', () => {
    const result = parsePrometheusText(fixture);
    const httpFamily = result.find((m) => m.metricName === 'http_server_requests_seconds');
    expect(httpFamily).toBeDefined();
    const countSamples = httpFamily!.samples.filter((s) =>
      s.sampleName === 'http_server_requests_seconds_count'
    );
    const sumSamples = httpFamily!.samples.filter((s) =>
      s.sampleName === 'http_server_requests_seconds_sum'
    );
    expect(countSamples.length).toBeGreaterThan(0);
    expect(sumSamples.length).toBeGreaterThan(0);
    // Both _count and _sum live under the same family, not as separate families
    const countFamily = result.find((m) => m.metricName === 'http_server_requests_seconds_count');
    expect(countFamily).toBeUndefined();
  });

  it('parses metric with no labels', () => {
    const result = parsePrometheusText(fixture);
    const cpuFamily = result.find((m) => m.metricName === 'process_cpu_usage');
    expect(cpuFamily).toBeDefined();
    expect(cpuFamily!.samples).toHaveLength(1);
    expect(cpuFamily!.samples[0].labels).toEqual({});
    expect(cpuFamily!.samples[0].value).toBeGreaterThan(0);
  });

  it('preserves help text', () => {
    const result = parsePrometheusText(fixture);
    const cpuFamily = result.find((m) => m.metricName === 'process_cpu_usage');
    expect(cpuFamily!.help).toBe('The "recent cpu usage" for the JVM process');
  });

  it('sets correct type from # TYPE line', () => {
    const result = parsePrometheusText(fixture);
    const mem = result.find((m) => m.metricName === 'jvm_memory_used_bytes');
    expect(mem!.type).toBe('gauge');
    const http = result.find((m) => m.metricName === 'http_server_requests_seconds');
    expect(http!.type).toBe('summary');
  });
});
