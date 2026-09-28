'use client';

// DecisionRule - Regla de decisión del plan de medición (§6): las cuatro
// reglas en orden, con la que aplicó resaltada, el texto del veredicto, la
// lectura (preliminar/oficial), el MDE y qué sigue. Los textos vienen del
// API (reporte); si el reporte no trae las reglas, se usan las del front.

import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { badgeContraste, pct } from '@/lib/whatsapp-campaign/format';
import { REGLAS_DECISION, resultadoRegla } from '@/lib/whatsapp-campaign/reportes';
import type { CampaignImpacto, ReglaDecision } from '@/types/whatsappCampaign';

const BORDE_TONO: Record<string, string> = {
  success: 'border-l-emerald-600 dark:border-l-emerald-400',
  destructive: 'border-l-[#B0432D] dark:border-l-[#EE8B74]',
  warning: 'border-l-amber-600 dark:border-l-amber-400',
  info: 'border-l-chart-1',
  outline: 'border-l-border',
};

export function DecisionRule({
  regla,
  impacto,
  pctControl,
}: {
  regla: ReglaDecision;
  impacto: Pick<CampaignImpacto, 'lectura' | 'mde_pts' | 'mde_pp' | 'corte'>;
  pctControl: number | null;
}) {
  const r = resultadoRegla(regla.resultado);
  const reglas = regla.reglas.length ? regla.reglas : [...REGLAS_DECISION];
  return (
    <div className="grid gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <h3 className="text-sm font-semibold">Regla de decisión</h3>
        {impacto.lectura && (
          <Badge variant="outline" className="font-mono">
            {impacto.lectura}
          </Badge>
        )}
      </div>
      <ol className="grid gap-1.5 text-sm">
        {reglas.map((texto, i) => {
          const aplica = r.indice === i;
          return (
            <li
              key={texto}
              className={cn(
                'grid grid-cols-[1.4rem_minmax(0,1fr)] gap-2 rounded-md border border-l-4 px-3 py-2',
                aplica ? cn('bg-muted font-medium', BORDE_TONO[r.variant] ?? BORDE_TONO.outline) : 'border-l-transparent text-muted-foreground',
              )}
              aria-current={aplica ? 'true' : undefined}
            >
              <span className="font-mono text-xs leading-5 text-muted-foreground">{i + 1}.</span>
              <span>
                {texto}
                {aplica && (
                  <Badge variant={r.variant} className={cn('ml-2 align-middle', badgeContraste(r.variant))}>
                    Aplicó
                  </Badge>
                )}
              </span>
            </li>
          );
        })}
      </ol>
      <div className="grid gap-1 rounded-md bg-muted p-3 text-sm">
        {regla.texto && <p className="font-medium">{regla.texto}</p>}
        <p className="text-muted-foreground">{r.siguiente}</p>
        {(impacto.mde_pts || impacto.mde_pp) && (
          <p className="text-xs text-muted-foreground">
            Con un control de {pct(pctControl)}, este cierre solo confirma efectos de al menos{' '}
            {impacto.mde_pts || '—'} pts por persona o {impacto.mde_pp || '—'} puntos porcentuales
            (MDE). Un efecto más chico queda dentro del intervalo y no se puede afirmar ni descartar.
          </p>
        )}
      </div>
    </div>
  );
}
