'use client';

// WavesPanel - "Envíos por ola": una tarjeta por ola con barra apilada
// (leídos · entregados sin leer · en camino · sin WhatsApp · límite · otros),
// contadores y desglose por plantilla. El orden y la suma de los tramos se
// validan en tramosOla() (lib/whatsapp-campaign/format.ts).

import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import {
  TRAMO_ETIQUETAS,
  n,
  pct,
  ratio,
  toneOla,
  tramosOlaSeguro,
  type TramoId,
} from '@/lib/whatsapp-campaign/format';
import type { CampaignOla } from '@/types/whatsappCampaign';
import { EmptyNote, Panel } from './Panel';

const TRAMO_CLASS: Record<TramoId, string> = {
  leidos: 'bg-chart-1',
  entregados: 'bg-chart-1/45',
  pendientes: 'bg-border',
  sin_whatsapp: 'bg-[#B0432D]/75 dark:bg-[#EE8B74]/75',
  limite: 'bg-amber-600 dark:bg-amber-400',
  otros: 'bg-muted-foreground',
};

const LEYENDA: TramoId[] = ['leidos', 'entregados', 'pendientes', 'sin_whatsapp', 'limite', 'otros'];

function OlaCard({ ola }: { ola: CampaignOla }) {
  const tone = toneOla(ola.estado);
  const programada = ola.intentos == null;
  const tramos = programada ? [] : tramosOlaSeguro(ola);
  const limite = (ola.tope_meta ?? 0) + (ola.experimento_meta ?? 0);

  return (
    <article
      className={cn(
        'grid content-start gap-2.5 rounded-lg border p-3.5',
        programada ? 'border-dashed bg-muted/40' : 'bg-card',
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <h3 className="text-sm font-semibold">{ola.nombre}</h3>
          <span className="font-mono text-xs text-muted-foreground">{ola.cuando}</span>
        </div>
        <Badge variant={tone.variant}>
          {tone.pulso && (
            <span aria-hidden className="h-1.5 w-1.5 rounded-full bg-current motion-safe:animate-pulse" />
          )}
          {tone.texto}
        </Badge>
      </div>

      {programada ? (
        <p className="text-xs text-muted-foreground">Todavía no sale.</p>
      ) : (
        <>
          {tramos ? (
            <div
              className="flex h-3 overflow-hidden rounded bg-muted"
              role="img"
              aria-label={`${n(ola.leidos)} leídos de ${n(ola.intentos)} enviados`}
            >
              {tramos
                .filter((t) => t.n > 0)
                .map((t) => (
                  <span
                    key={t.id}
                    className={cn('block h-full', TRAMO_CLASS[t.id])}
                    style={{ width: `${(t.frac * 100).toFixed(2)}%` }}
                    title={`${t.etiqueta}: ${n(t.n)}`}
                  />
                ))}
            </div>
          ) : (
            <p className="text-xs text-amber-700 dark:text-amber-400">
              Los contadores de esta ola no cuadran con los intentos; revisar el cálculo.
            </p>
          )}
          <dl className="grid grid-cols-[1fr_auto] gap-x-3 gap-y-0.5 text-sm tabular-nums">
            <dt className="text-muted-foreground">Enviados</dt>
            <dd className="text-right font-medium">{n(ola.intentos)}</dd>
            <dt className="text-muted-foreground">Recibidos</dt>
            <dd className="text-right font-medium">
              {n(ola.recibidos)} · {pct(ratio(ola.recibidos, ola.intentos))}
            </dd>
            <dt className="text-muted-foreground">Leídos</dt>
            <dd className="text-right font-medium">
              {n(ola.leidos)} · {pct(ratio(ola.leidos, ola.recibidos))}
            </dd>
            <dt className="text-muted-foreground">Sin WhatsApp</dt>
            <dd className="text-right font-medium">{n(ola.sin_whatsapp)}</dd>
            <dt className="text-muted-foreground">Límite de WhatsApp</dt>
            <dd className="text-right font-medium">{n(limite)}</dd>
            {!!ola.otros_fallos && (
              <>
                <dt className="text-muted-foreground">Otros fallos</dt>
                <dd className="text-right font-medium">{n(ola.otros_fallos)}</dd>
              </>
            )}
            {!!ola.pendientes && (
              <>
                <dt className="text-muted-foreground">En camino</dt>
                <dd className="text-right font-medium">{n(ola.pendientes)}</dd>
              </>
            )}
          </dl>
          {(ola.por_plantilla?.length ?? 0) > 1 && (
            <div className="grid gap-0.5 border-t pt-2 text-xs text-muted-foreground">
              {ola.por_plantilla!.map((t) => (
                <div key={t.plantilla} className="flex justify-between gap-2">
                  <span>{t.nombre}</span>
                  <span className="tabular-nums">
                    {n(t.intentos)} · {pct(ratio(t.leidos, t.recibidos))} leídos
                  </span>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </article>
  );
}

export function WavesPanel({ olas }: { olas: CampaignOla[] }) {
  return (
    <Panel
      id="t-olas"
      title="Envíos por ola"
      aside={
        <span className="flex flex-wrap gap-x-4 gap-y-1">
          {LEYENDA.map((id) => (
            <span key={id} className="inline-flex items-center gap-1.5">
              <i className={cn('inline-block h-2.5 w-2.5 rounded-sm', TRAMO_CLASS[id])} />
              {TRAMO_ETIQUETAS[id]}
            </span>
          ))}
        </span>
      }
    >
      {olas.length === 0 ? (
        <EmptyNote>Sin envíos todavía.</EmptyNote>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {olas.map((o) => (
            <OlaCard key={o.id} ola={o} />
          ))}
        </div>
      )}
    </Panel>
  );
}
