'use client';

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';

export interface ChartSeries {
  key: string;
  color: string;
  label: string;
}

interface TimeSeriesChartProps {
  data: Record<string, number | string>[];
  series: ChartSeries[];
  yTickFormatter?: (v: number) => string;
  height?: number;
}

export function TimeSeriesChart({
  data,
  series,
  yTickFormatter,
  height = 180,
}: TimeSeriesChartProps) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <LineChart data={data} margin={{ top: 4, right: 16, left: 4, bottom: 4 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
        <XAxis
          dataKey="ts"
          type="number"
          domain={['dataMin', 'dataMax']}
          tickFormatter={(v: number) =>
            new Date(v).toLocaleTimeString([], {
              hour: '2-digit',
              minute: '2-digit',
              second: '2-digit',
            })
          }
          tick={{ fill: '#9CA3AF', fontSize: 10 }}
          tickCount={4}
        />
        <YAxis
          tickFormatter={yTickFormatter}
          tick={{ fill: '#9CA3AF', fontSize: 10 }}
          width={65}
        />
        <Tooltip
          contentStyle={{
            backgroundColor: '#111827',
            border: '1px solid #1f2937',
            borderRadius: '6px',
            fontSize: '12px',
          }}
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          labelFormatter={(v: any) => new Date(v as number).toLocaleTimeString()}
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          formatter={(value: any, name: any) => [
            typeof value === 'number' && yTickFormatter ? yTickFormatter(value) : String(value ?? ''),
            name,
          ]}
        />
        <Legend wrapperStyle={{ fontSize: '11px', color: '#9CA3AF' }} />
        {series.map((s) => (
          <Line
            key={s.key}
            type="monotone"
            dataKey={s.key}
            name={s.label}
            stroke={s.color}
            dot={false}
            strokeWidth={2}
            connectNulls={false}
          />
        ))}
      </LineChart>
    </ResponsiveContainer>
  );
}
