'use client';

// KitReadinessPanel — "Listo para vender" de un kit/paquete (contrato de kits
// §5.2 bloque 6), gemelo de StorefrontStatusPanel: lista de verificación con
// ✔ / ✘ / ⚠, acceso directo a la sección que corrige cada punto y el botón
// para activar. Fuente: GET /products/:id/kit-readiness.

import { CheckCircle2, Loader2, TriangleAlert, XCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  READINESS_SECTION,
  readinessChecklist,
  readinessSummary,
  type ChecklistState,
  type KitReadiness,
} from '@/lib/kits/kit-readiness';
import { SECTION_LABEL, isProductSectionId, type ProductSectionId } from '../lib/labels';

interface KitReadinessPanelProps {
  readiness: KitReadiness | null | undefined;
  isLoading: boolean;
  isError: boolean;
  onGoToSection?: (id: ProductSectionId) => void;
  /** Abre Desactivar / Reactivar del encabezado; solo se pinta si el kit está inactivo. */
  onActivate?: () => void;
  canToggleActive?: boolean;
  /** No sale en pantalla el punto de esta sección (evita "Corregir en Kit" dentro de Kit). */
  currentSection?: ProductSectionId;
}

const ICON: Record<ChecklistState, { Icon: typeof CheckCircle2; className: string; sr: string }> = {
  ok: { Icon: CheckCircle2, className: 'text-emerald-600', sr: 'Cumplido' },
  critical: { Icon: XCircle, className: 'text-red-600', sr: 'Falta (impide activar)' },
  warning: { Icon: TriangleAlert, className: 'text-amber-600', sr: 'Aviso' },
};

export function KitReadinessPanel({
  readiness,
  isLoading,
  isError,
  onGoToSection,
  onActivate,
  canToggleActive = false,
  currentSection,
}: KitReadinessPanelProps) {
  if (isLoading) {
    return (
      <p className="flex items-center gap-2 text-sm text-gray-600" role="status">
        <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> Revisando si el kit está listo…
      </p>
    );
  }
  if (isError) {
    return (
      <p className="text-sm text-gray-700" role="status">
        No se pudo revisar si el kit está listo. Intenta de nuevo en unos minutos.
      </p>
    );
  }
  if (!readiness) {
    return (
      <p className="text-sm text-gray-700" role="status">
        Este servidor aún no evalúa si un kit está listo para vender. Se activará cuando se despliegue el API.
      </p>
    );
  }

  const lines = readinessChecklist(readiness);
  const canActivate = readiness.critical.length === 0;

  return (
    <div className="space-y-3">
      <div
        className={`rounded-lg border px-4 py-3 text-sm font-semibold ${
          canActivate ? 'border-emerald-200 bg-emerald-50 text-emerald-900' : 'border-red-200 bg-red-50 text-red-900'
        }`}
        role="status"
      >
        {readinessSummary(readiness)}
      </div>

      <ul className="divide-y divide-gray-100 rounded-lg border border-gray-200">
        {lines.map((line) => {
          const { Icon, className, sr } = ICON[line.state];
          const sectionId = READINESS_SECTION[line.code];
          const fix = line.state !== 'ok' && isProductSectionId(sectionId) && sectionId !== currentSection ? sectionId : null;
          return (
            <li key={`${line.state}-${line.code}`} className="flex items-start gap-2 p-3">
              <Icon className={`mt-0.5 h-4 w-4 shrink-0 ${className}`} aria-hidden />
              <span className="sr-only">{sr}:</span>
              <div className="min-w-0 flex-1">
                <p className="text-sm text-gray-900">{line.label}</p>
                {fix && onGoToSection ? (
                  <Button type="button" variant="outline" size="sm" className="mt-1 h-7 text-xs" onClick={() => onGoToSection(fix)}>
                    Corregir en {SECTION_LABEL[fix]}
                  </Button>
                ) : null}
              </div>
            </li>
          );
        })}
      </ul>

      {!readiness.isActive && onActivate ? (
        <div className="flex flex-wrap items-center gap-3">
          <Button type="button" onClick={onActivate} disabled={!canToggleActive}>
            Activar kit
          </Button>
          <p className="text-xs text-gray-600">
            {!canToggleActive
              ? 'Activar o desactivar requiere el permiso products:delete.'
              : canActivate
                ? 'Está inactivo (borrador): no se ofrece en el POS ni en la inscripción en línea hasta activarlo.'
                : 'Puedes intentarlo, pero el sistema lo rechazará mientras falten los puntos marcados en rojo.'}
          </p>
        </div>
      ) : null}
    </div>
  );
}
