'use client';

// EvolutionChart - "Cómo avanza el día": % que ya llegó al umbral, con
// campaña vs control, en cada foto por sync (bloque ➕ `historial`).

import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { CONTROL_COLOR, n, pct, puntosHistorial } from '@/lib/whatsapp-campaign/format';
import type { CampaignDashboard } from '@/types/whatsappCampaign';
import { CHART_TICK, CHART_TOOLTIP } from './HourlyChart';
import { EmptyNote, Panel } from './Panel';

/** Etiqueta del valor solo en el último punto de la línea. */
function lastLabel(total: number, color: string) {
  function LastPointLabel(props: {
    x?: number | string;
    y?: number | string;
    index?: number;
    value?: unknown;
  }) {
    if (props.index !== total - 1) return null;
    const x = Number(props.x);
    const y = Number(props.y);
    if (!Number.isFinite(x) || !Number.isFinite(y)) return null;
    return (
      <text x={x - 6} y={y - 9} textAnchor="end" fill={color} fontSize={12} fontWeight={600}>
        {pct(typeof props.value === 'number' ? props.value : null, 1)}
      </text>
    );
  }
  return LastPointLabel;
}

export function EvolutionChart({ data }: { data: CampaignDashboard }) {
  const pts = puntosHistorial(data);
  return (
    <Panel
      id="t-evol"
      title="Cómo avanza el día"
      aside={`Ya llegaron a ${n(data.periodo.umbral)}, en cada actualización`}
    >
      {pts.length < 2 ? (
        <EmptyNote>
          La línea aparece con la segunda actualización del día. Cada punto es una actualización de
          cifras (cada 2 horas).
        </EmptyNote>
      ) : (
        <div
          role="img"
          aria-label={`Avance de la calificación en el día. Última actualización (${
            pts[pts.length - 1].generado_cdmx
          }): con campaña ${pct(pts[pts.length - 1].pct_califican_trat, 1)}, control ${pct(
            pts[pts.length - 1].pct_califican_ctrl,
            1,
          )}.`}
        >
          <ResponsiveContainer width="100%" height={240}>
            <LineChart data={pts} margin={{ top: 20, right: 16, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
              <XAxis
                dataKey="generado_cdmx"
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
                width={48}
                domain={[0, 'auto']}
                tickFormatter={(v: number) => pct(v, 1)}
              />
              <Tooltip
                {...CHART_TOOLTIP}
                formatter={(value, name) =>
                  [pct(typeof value === 'number' ? value : null, 1), String(name)] as [string, string]
                }
              />
              <Legend iconType="plainline" wrapperStyle={{ fontSize: 12 }} />
              <Line
                type="monotone"
                dataKey="pct_califican_ctrl"
                name="Control"
                stroke={CONTROL_COLOR}
                strokeWidth={2.5}
                dot={{ r: 3, fill: CONTROL_COLOR, strokeWidth: 0 }}
                label={lastLabel(pts.length, CONTROL_COLOR)}
                connectNulls
              />
              <Line
                type="monotone"
                dataKey="pct_califican_trat"
                name="Con campaña"
                stroke="var(--chart-1)"
                strokeWidth={2.5}
                dot={{ r: 3, fill: 'var(--chart-1)', strokeWidth: 0 }}
                label={lastLabel(pts.length, 'var(--chart-1)')}
                connectNulls
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
    </Panel>
  );
}
