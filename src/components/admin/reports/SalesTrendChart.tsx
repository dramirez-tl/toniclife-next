'use client';

import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import type { MonthlySalesTrend } from '@/types/reports';

type Metric = 'sales' | 'orders' | 'customers';

const METRIC_LABEL: Record<Metric, string> = {
  sales: 'Ventas',
  orders: 'Ventas/Documentos',
  customers: 'Clientes',
};

function formatMxn(v: number): string {
  return new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency: 'MXN',
    maximumFractionDigits: 0,
  }).format(v);
}

function formatCompact(v: number): string {
  return new Intl.NumberFormat('es-MX', {
    notation: 'compact',
    maximumFractionDigits: 1,
  }).format(v);
}

export function SalesTrendChart({
  data,
  metric,
}: {
  data: MonthlySalesTrend[];
  metric: Metric;
}) {
  const chartData = data.map((d) => ({
    label: `${d.month} ${String(d.year).slice(2)}`,
    value: metric === 'sales' ? d.sales : metric === 'orders' ? d.orders : d.customers,
  }));

  const isCurrency = metric === 'sales';

  return (
    <ResponsiveContainer width="100%" height={320}>
      <AreaChart data={chartData} margin={{ top: 10, right: 12, left: 4, bottom: 0 }}>
        <defs>
          <linearGradient id="trendFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#3E667D" stopOpacity={0.35} />
            <stop offset="100%" stopColor="#C8DDF2" stopOpacity={0.02} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="#eef2f5" vertical={false} />
        <XAxis
          dataKey="label"
          tick={{ fontSize: 12, fill: '#64748b' }}
          tickLine={false}
          axisLine={{ stroke: '#e2e8f0' }}
        />
        <YAxis
          tick={{ fontSize: 12, fill: '#64748b' }}
          tickLine={false}
          axisLine={false}
          width={56}
          tickFormatter={(v: number) =>
            isCurrency ? `$${formatCompact(v)}` : formatCompact(v)
          }
        />
        <Tooltip
          cursor={{ stroke: '#3E667D', strokeWidth: 1, strokeDasharray: '4 4' }}
          contentStyle={{
            borderRadius: 12,
            border: '1px solid #e2e8f0',
            boxShadow: '0 8px 24px rgba(62,102,125,0.12)',
            fontSize: 13,
          }}
          labelStyle={{ color: '#0f172a', fontWeight: 600, marginBottom: 4 }}
          formatter={(value) => {
            const n = Number(value) || 0;
            return [
              isCurrency ? formatMxn(n) : n.toLocaleString('es-MX'),
              METRIC_LABEL[metric],
            ] as [string, string];
          }}
        />
        <Area
          type="monotone"
          dataKey="value"
          stroke="#3E667D"
          strokeWidth={2.5}
          fill="url(#trendFill)"
          dot={{ r: 3, fill: '#3E667D', strokeWidth: 0 }}
          activeDot={{ r: 5, fill: '#3E667D', stroke: '#fff', strokeWidth: 2 }}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}

export default SalesTrendChart;
