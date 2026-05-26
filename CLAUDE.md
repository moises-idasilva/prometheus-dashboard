# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev       # Start dev server at http://localhost:3000
npm run build     # Production build
npm run lint      # ESLint via next lint
npm test          # Jest (ts-jest); all tests are in __tests__/
```

To run a single test file:
```bash
npx jest __tests__/prometheusParser.test.ts
```

## Architecture

**Next.js 14 App Router** with a single dashboard page. The app proxies Prometheus `/actuator/prometheus` endpoints from several Multiverse Tech microservices through a Next.js API route, then parses and renders the metrics client-side.

### Data flow

```
config/apis.json
  → src/app/page.tsx (selects active API)
    → useMetrics hook (polls every 30s via /api/metrics?apiId=...)
      → src/app/api/metrics/route.ts (server-side proxy with Bearer auth)
        → upstream Prometheus endpoint
      ← raw text/plain Prometheus format
    → parsePrometheusText() → MetricsSnapshot
    → maintains rolling history (max 30 snapshots)
  → panel components (receive latest + history as props)
```

### Key files

- `config/apis.json` — API registry: `id`, `name`, `url`, `tokenEnvKey`, `refreshInterval`. Each token is read from `process.env[tokenEnvKey]` (all currently map to `BEARER_TOKEN`).
- `src/lib/prometheusParser.ts` — Custom regex parser for Prometheus text format. Handles `_bucket`/`_count`/`_sum`/`_total`/`_created` family grouping, escaped label values, NaN/±Inf, and scientific notation.
- `src/hooks/useMetrics.ts` — Polling hook + helper functions (`computeRate`, `findSampleValue`, `sumSampleValues`) used by all panels.
- `src/lib/formatters.ts` — Bytes, uptime, percent, and short-number formatters used across panels.
- `src/components/charts/TimeSeriesChart.tsx` — Recharts LineChart wrapper used by most panels. DbConnectionsPanel and ThreadsPanel import Recharts primitives directly for AreaChart/BarChart.

### Adding a new panel

1. Create `src/components/panels/MyPanel.tsx` — accept `latest: MetricsSnapshot | null` and `history: MetricsHistory`.
2. Use helpers from `useMetrics` (`findSampleValue`, `sumSampleValues`, `computeRate`) to extract values from `latest.samples`.
3. Add the panel to the grid in `src/app/page.tsx`.

### Adding a new API endpoint

Add an entry to `config/apis.json`. The `tokenEnvKey` field names the env var holding the Bearer token. Set that var in `.env.local`.

## Parser gotchas

The Prometheus parser groups metric families by stripping `_bucket`, `_count`, `_sum`, `_total`, and `_created` suffixes — a bare metric name like `jvm_memory_used_bytes` is its own family. When querying samples, look up by the base family name and filter by labels, not by the suffixed name.

## Testing

Tests live in `__tests__/` and use a real fixture (`__tests__/__fixtures__/sample.prom`). Jest runs in `node` environment (no browser APIs). The parser is the only module with tests; new parsing logic should be covered there.
