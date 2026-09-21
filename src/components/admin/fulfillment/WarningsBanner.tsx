'use client';

// WarningsBanner — avisos en vivo (contrato §7.3-2). Errores primero; cada aviso
// lleva ícono Y texto (nunca solo color) y un enlace a la tarjeta del país.

import { CircleAlert, Info, TriangleAlert } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import type { FulfillmentWarning, FulfillmentWarningSeverity } from '@/types/fulfillment';

interface WarningsBannerProps {
  warnings: FulfillmentWarning[];
  countryNames: Record<string, string>;
  /** true = hay cambios sin guardar: los avisos ya consideran el borrador. */
  isDraft: boolean;
}

const SEVERITY: Record<FulfillmentWarningSeverity, { label: string; className: string; Icon: typeof Info }> = {
  error: { label: 'Importante', className: 'border-red-200 bg-red-50 text-red-900', Icon: CircleAlert },
  warning: { label: 'Atención', className: 'border-amber-200 bg-amber-50 text-amber-900', Icon: TriangleAlert },
  info: { label: 'Para tu información', className: 'border-slate-200 bg-slate-50 text-slate-800', Icon: Info },
};

/** Lleva el foco a la tarjeta del país (el ancla sola no mueve el foco del teclado). */
function focusCountry(countryCode: string) {
  const card = document.getElementById(`pais-${countryCode}`);
  if (!card) return;
  const details = card.closest('details');
  if (details) details.open = true;
  card.scrollIntoView({ behavior: 'smooth', block: 'start' });
  card.focus({ preventScroll: true });
}

export function WarningsBanner({ warnings, countryNames, isDraft }: WarningsBannerProps) {
  // SCOPE_NOTE ya vive fijo en "Qué controla esta pantalla".
  const list = warnings.filter((w) => w.code !== 'SCOPE_NOTE');
  if (list.length === 0) return null;
  const important = list.filter((w) => w.severity !== 'info');
  const informative = list.filter((w) => w.severity === 'info');

  const renderItem = (w: FulfillmentWarning, i: number) => {
    const { label, className, Icon } = SEVERITY[w.severity] ?? SEVERITY.info;
    const countryCode = w.countryCode;
    return (
      <li
        key={`${w.code}-${countryCode ?? ''}-${w.branchId ?? ''}-${i}`}
        className={`flex gap-2 rounded-md border px-3 py-2 text-sm ${className}`}
      >
        <Icon aria-hidden className="mt-0.5 size-4 shrink-0" />
        <div className="min-w-0">
          <span className="font-semibold">{label}: </span>
          <span>{w.message}</span>
          {countryCode && (
            <>
              {' '}
              <a
                href={`#pais-${countryCode}`}
                onClick={(e) => {
                  e.preventDefault();
                  focusCountry(countryCode);
                }}
                className="whitespace-nowrap font-medium underline underline-offset-2"
              >
                Ir a {countryNames[countryCode] ?? countryCode}
              </a>
            </>
          )}
        </div>
      </li>
    );
  };

  return (
    <Card>
      <CardContent className="space-y-3 p-4 sm:p-5">
        <div>
          <h2 className="text-lg font-semibold text-foreground">Avisos</h2>
          <p className="text-sm text-muted-foreground">
            {isDraft ? 'Ya consideran tus cambios sin guardar.' : 'Se calculan con lo que está guardado.'}
          </p>
        </div>
        {important.length > 0 && <ul className="space-y-2">{important.map(renderItem)}</ul>}
        {informative.length > 0 && (
          <details open={important.length === 0}>
            <summary className="cursor-pointer rounded text-sm font-medium text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring">
              Para tu información ({informative.length})
            </summary>
            <ul className="mt-2 space-y-2">{informative.map(renderItem)}</ul>
          </details>
        )}
      </CardContent>
    </Card>
  );
}
