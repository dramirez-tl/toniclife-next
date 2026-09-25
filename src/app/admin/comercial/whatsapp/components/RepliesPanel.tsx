'use client';

// RepliesPanel - "Qué contestaron": personas por categoría (la más grave de
// cada persona). Rojo = no volver a escribir; ámbar = hay que contestar.

import Link from 'next/link';
import { cn } from '@/lib/utils';
import {
  categoriasOrdenadas,
  hrefPersonas,
  n,
  type CategoriaTone,
} from '@/lib/whatsapp-campaign/format';
import type { CampaignDashboard } from '@/types/whatsappCampaign';
import { EmptyNote, Panel } from './Panel';

const FILL: Record<CategoriaTone, string> = {
  alerta: 'bg-[#B0432D] dark:bg-[#EE8B74]',
  accion: 'bg-amber-600 dark:bg-amber-400',
  normal: 'bg-chart-1',
};

export function RepliesPanel({ data }: { data: CampaignDashboard }) {
  const r = data.respuestas;
  const cats = categoriasOrdenadas(data);
  const key = data.campana.key;
  return (
    <Panel
      id="t-resp"
      title="Qué contestaron"
      aside={
        r && cats.length ? (
          <>
            {n(r.personas)} personas ·{' '}
            {key && r.por_contestar ? (
              <Link
                href={hrefPersonas(key, 'por_contestar')}
                className="underline decoration-dotted underline-offset-4 hover:text-primary"
              >
                {n(r.por_contestar)} esperan respuesta
              </Link>
            ) : (
              <>{n(r.por_contestar)} esperan respuesta</>
            )}
          </>
        ) : null
      }
    >
      {!r || cats.length === 0 ? (
        <EmptyNote>Sin respuestas todavía.</EmptyNote>
      ) : (
        <div className="grid gap-2">
          {cats.map((c) => (
            <div
              key={c.id}
              className="grid grid-cols-[minmax(0,8rem)_minmax(0,1fr)_2.4rem] items-center gap-2.5 text-sm sm:grid-cols-[minmax(0,11rem)_minmax(0,1fr)_2.5rem]"
            >
              <span className="truncate" title={c.nombre}>
                {c.nombre}
              </span>
              <div className="h-2.5 w-full rounded bg-muted">
                <span
                  className={cn('block h-full rounded', FILL[c.tono])}
                  style={{ width: `${(c.frac * 100).toFixed(1)}%` }}
                />
              </div>
              <span className="text-right font-semibold tabular-nums">{n(c.n)}</span>
            </div>
          ))}
          <div className="mt-1.5 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
            <span className="inline-flex items-center gap-1.5">
              <i className={cn('inline-block h-2.5 w-2.5 rounded-sm', FILL.accion)} />
              Hay que contestar
            </span>
            <span className="inline-flex items-center gap-1.5">
              <i className={cn('inline-block h-2.5 w-2.5 rounded-sm', FILL.alerta)} />
              No volver a escribir
            </span>
          </div>
          <p className="text-xs text-muted-foreground">
            {n(r.mensajes)} mensajes recibidos
            {r.opt_out_desde_t0 != null && (
              <> · {n(r.opt_out_desde_t0)} integrantes quedaron fuera de WhatsApp (baja) desde el primer aviso</>
            )}
            .
          </p>
        </div>
      )}
    </Panel>
  );
}
