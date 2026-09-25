'use client';

// HourlyChart - "Entregas y lecturas por hora" (hora CDMX, del API).

import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { n } from '@/lib/whatsapp-campaign/format';
import type { LecturaHora } from '@/types/whatsappCampaign';
import { EmptyNote, Panel } from './Panel';

export const CHART_TICK = { fontSize: 11, fill: 'var(--muted-foreground)' };
export const CHART_TOOLTIP = {
  contentStyle: {
    borderRadius: 12,
    border: '1px solid var(--border)',
    background: 'var(--popover)',
    color: 'var(--popover-foreground)',
    boxShadow: '0 8px 24px rgba(62,102,125,0.12)',
    fontSize: 13,
  },
  labelStyle: { color: 'var(--popover-foreground)', fontWeight: 600, marginBottom: 4 },
} as const;

export function HourlyChart({ data }: { data: LecturaHora[] }) {
  return (
    <Panel id="t-hora" title="Entregas y lecturas por hora" aside="Hora del centro de México">
      {data.length === 0 ? (
        <EmptyNote>Sin entregas todavía.</EmptyNote>
      ) : (
        <div role="img" aria-label="Entregas y lecturas por hora">
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }} barGap={2}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
              <XAxis
                dataKey="hora"
                tick={CHART_TICK}
                tickLine={false}
                axisLine={{ stroke: 'var(--border)' }}
                interval="preserveStartEnd"
                minTickGap={16}
              />
              <YAxis
                tick={CHART_TICK}
                tickLine={false}
                axisLine={false}
                width={44}
                allowDecimals={false}
                tickFormatter={(v: number) => n(v)}
              />
              <Tooltip
                cursor={{ fill: 'var(--muted)', opacity: 0.5 }}
                {...CHART_TOOLTIP}
                formatter={(value, name) => [n(Number(value) || 0), String(name)] as [string, string]}
              />
              <Legend iconType="square" iconSize={10} wrapperStyle={{ fontSize: 12 }} />
              <Bar dataKey="entregados" name="Entregados" fill="var(--chart-3)" radius={[2, 2, 0, 0]} />
              <Bar dataKey="leidos" name="Leídos" fill="var(--chart-1)" radius={[2, 2, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </Panel>
  );
}
