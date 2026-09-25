'use client';

// CampaignHeader - Nombre de la campaña, chips de estado (campaña, cierre del
// periodo, hora de actualización, sync en curso) y "Actualizar ahora".

import { useEffect, useState } from 'react';
import { ArrowPathIcon } from '@heroicons/react/24/outline';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { chipCierre, hayOlaEnCurso, pct } from '@/lib/whatsapp-campaign/format';
import type { CampaignDashboard } from '@/types/whatsappCampaign';

/** Hora actual refrescada cada minuto (solo para la cuenta regresiva del chip). */
function useNow(stepMs = 60_000): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), stepMs);
    return () => window.clearInterval(id);
  }, [stepMs]);
  return now;
}

const ESTADO_LABEL: Record<string, string> = {
  borrador: 'Borrador',
  activa: 'Activa',
  cerrada: 'Cerrada',
  archivada: 'Archivada',
};

export function CampaignHeader({
  data,
  isFetching,
  onRefresh,
}: {
  data: CampaignDashboard;
  isFetching: boolean;
  onRefresh: () => void;
}) {
  const now = useNow();
  const cierre = chipCierre(data.periodo, now);
  const enCurso = hayOlaEnCurso(data.olas);
  const hhmm = data.generado_cdmx ? data.generado_cdmx.slice(-5) : '—';

  return (
    <header className="flex flex-wrap items-start justify-between gap-x-5 gap-y-3">
      <div className="min-w-0">
        <p className="text-[0.72rem] font-semibold uppercase tracking-wider text-muted-foreground">
          Campaña de WhatsApp · {ESTADO_LABEL[data.campana.estado] ?? data.campana.estado}
        </p>
        <h2 className="text-2xl font-bold tracking-tight text-balance sm:text-3xl">
          {data.campana.nombre || data.campana.key}
        </h2>
        <p className="mt-0.5 text-sm text-muted-foreground">
          Periodo {data.periodo.nombre}
          {data.campana.t0_cdmx && <> · primer aviso {data.campana.t0_cdmx}</>}
          {data.campana.pct_control > 0 && <> · control {pct(data.campana.pct_control)}</>}
        </p>
      </div>

      <div className="flex flex-wrap items-center justify-end gap-2">
        {data.estado_campana && (
          <Badge variant="info" className="max-w-full whitespace-normal text-left">
            {enCurso && (
              <span
                aria-hidden
                className="h-1.5 w-1.5 shrink-0 rounded-full bg-current motion-safe:animate-pulse"
              />
            )}
            {data.estado_campana}
          </Badge>
        )}
        {cierre && <Badge variant={cierre.tono}>{cierre.texto}</Badge>}
        {data.corte.sync_en_curso && (
          <Badge variant="warning">Sync en curso: las cifras de puntos pueden cambiar</Badge>
        )}
        <Badge variant="outline" className="font-mono" title={data.generado_cdmx}>
          Actualizado {hhmm}
        </Badge>
        <Button variant="outline" size="sm" onClick={onRefresh} disabled={isFetching}>
          <ArrowPathIcon className={cn('h-4 w-4', isFetching && 'motion-safe:animate-spin')} />
          {isFetching ? 'Actualizando…' : 'Actualizar ahora'}
        </Button>
      </div>
    </header>
  );
}
