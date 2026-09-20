'use client';

// ReadinessChip — "Datos de pago" de una fila: Listo / Bloqueado con Tooltip
// Radix (accesible por teclado) que lista los bloqueadores.

import { CheckCircleIcon, ExclamationTriangleIcon } from '@heroicons/react/24/outline';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import type { RowReadiness } from '@/types/treasury';
import { blockerLabels } from './treasury-format';

interface ReadinessChipProps {
  readiness: RowReadiness | null | undefined;
}

export function ReadinessChip({ readiness }: ReadinessChipProps) {
  if (!readiness) {
    return (
      <Badge variant="outline" className="text-muted-foreground">
        Sin evaluar
      </Badge>
    );
  }
  if (readiness.ready) {
    return (
      <Badge variant="success">
        <CheckCircleIcon className="h-3 w-3" aria-hidden />
        Listo
      </Badge>
    );
  }
  const labels = blockerLabels(readiness.blockers);
  return (
    <TooltipProvider>
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          type="button"
          className="rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          aria-label={`Bloqueado: ${labels.join(', ') || 'sin detalle'}`}
        >
          <Badge variant="warning">
            <ExclamationTriangleIcon className="h-3 w-3" aria-hidden />
            Bloqueado{labels.length > 0 ? ` (${labels.length})` : ''}
          </Badge>
        </button>
      </TooltipTrigger>
      <TooltipContent side="top" className="max-w-xs">
        {labels.length > 0 ? (
          <ul className="list-disc space-y-0.5 pl-4 text-left">
            {labels.map((l, i) => (
              <li key={`${l}-${i}`}>{l}</li>
            ))}
          </ul>
        ) : (
          'Sin datos de pago validados'
        )}
      </TooltipContent>
    </Tooltip>
    </TooltipProvider>
  );
}
