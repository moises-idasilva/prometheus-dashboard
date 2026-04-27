import { ParsedMetric, MetricSample } from '@/types/metrics';

const SAMPLE_RE = /^([a-zA-Z_:][a-zA-Z0-9_:]*)(?:\{([^}]*)\})?\s+([^\s]+)(?:\s+(\d+))?$/;

function parseLabels(labelStr: string): Record<string, string> {
  const result: Record<string, string> = {};
  let i = 0;
  while (i < labelStr.length) {
    while (i < labelStr.length && (labelStr[i] === ' ' || labelStr[i] === '\t')) i++;
    const eqIdx = labelStr.indexOf('=', i);
    if (eqIdx === -1) break;
    const key = labelStr.slice(i, eqIdx).trim();
    i = eqIdx + 1;
    if (labelStr[i] !== '"') break;
    i++;
    let value = '';
    while (i < labelStr.length) {
      if (labelStr[i] === '\\' && i + 1 < labelStr.length) {
        const next = labelStr[i + 1];
        if (next === 'n') value += '\n';
        else if (next === '\\') value += '\\';
        else value += next;
        i += 2;
      } else if (labelStr[i] === '"') {
        i++;
        break;
      } else {
        value += labelStr[i++];
      }
    }
    result[key] = value;
    if (labelStr[i] === ',') i++;
  }
  return result;
}

function parseValue(raw: string): number {
  if (raw === 'NaN') return NaN;
  if (raw === '+Inf') return Infinity;
  if (raw === '-Inf') return -Infinity;
  return parseFloat(raw);
}

// Strip _bucket/_count/_sum/_total suffixes to find the parent metric family name
function familyName(sampleName: string): string {
  return sampleName
    .replace(/_bucket$/, '')
    .replace(/_count$/, '')
    .replace(/_sum$/, '')
    .replace(/_total$/, '')
    .replace(/_created$/, '');
}

export function parsePrometheusText(raw: string): ParsedMetric[] {
  const families = new Map<string, ParsedMetric>();

  const getOrCreate = (name: string): ParsedMetric => {
    if (!families.has(name)) {
      families.set(name, { metricName: name, help: '', type: 'untyped', samples: [] });
    }
    return families.get(name)!;
  };

  for (const line of raw.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    if (trimmed.startsWith('# HELP ')) {
      const rest = trimmed.slice(7);
      const spaceIdx = rest.indexOf(' ');
      const name = spaceIdx === -1 ? rest : rest.slice(0, spaceIdx);
      const help = spaceIdx === -1 ? '' : rest.slice(spaceIdx + 1);
      getOrCreate(name).help = help;
      continue;
    }

    if (trimmed.startsWith('# TYPE ')) {
      const parts = trimmed.slice(7).split(' ');
      const name = parts[0];
      const type = parts[1] as ParsedMetric['type'];
      const family = getOrCreate(name);
      family.type = type || 'untyped';
      continue;
    }

    if (trimmed.startsWith('#')) continue;

    const match = SAMPLE_RE.exec(trimmed);
    if (!match) continue;

    const [, sampleName, labelsStr, valueStr, tsStr] = match;
    const value = parseValue(valueStr);
    const labels = labelsStr ? parseLabels(labelsStr) : {};
    const sample: MetricSample = { sampleName, labels, value };
    if (tsStr) sample.timestamp = parseInt(tsStr, 10);

    const parent = familyName(sampleName);
    // Try the parent name first, fall back to the sample name itself
    const family = families.has(parent) ? families.get(parent)! : getOrCreate(sampleName);
    family.samples.push(sample);
  }

  return Array.from(families.values());
}
