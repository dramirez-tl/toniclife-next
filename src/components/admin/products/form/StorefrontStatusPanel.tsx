'use client';

// StorefrontStatusPanel — "Dónde se vende": por país, si el producto aparece en
// la tienda y, si no, POR QUÉ en claro, con acceso directo a la sección de la
// ficha que lo corrige. Fuente: GET /products/:id/storefront-status.

import { CheckCircle2, ExternalLink, Loader2, XCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { StorefrontStatusEntry } from '@/services/products-admin.service';
import {
  SECTION_LABEL,
  STOREFRONT_REASON_SECTION,
  countryName,
  isBlockingReason,
  storefrontReasonLabel,
  type ProductSectionId,
} from '../lib/labels';

interface StorefrontStatusPanelProps {
  entries: StorefrontStatusEntry[] | undefined;
  isLoading: boolean;
  isError: boolean;
  onGoToSection?: (id: ProductSectionId) => void;
  compact?: boolean;
}

/** Texto único y legible: "No aparece en México: no tiene precio público vigente". */
export function storefrontSentence(entry: StorefrontStatusEntry): string {
  const country = countryName(entry.countryCode);
  if (entry.sellable) {
    return entry.reasons.includes('out_of_stock')
      ? `Aparece en ${country} como Agotado`
      : `Aparece en la tienda de ${country}`;
  }
  const blocking = entry.reasons.filter(isBlockingReason);
  const reasons = (blocking.length > 0 ? blocking : entry.reasons).map(storefrontReasonLabel);
  return reasons.length > 0
    ? `No aparece en ${country}: ${reasons.join('; ')}`
    : `No aparece en ${country}`;
}

export function StorefrontStatusPanel({
  entries,
  isLoading,
  isError,
  onGoToSection,
  compact = false,
}: StorefrontStatusPanelProps) {
  if (isLoading) {
    return (
      <p className="flex items-center gap-2 text-sm text-gray-600" role="status">
        <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> Revisando la tienda…
      </p>
    );
  }
  if (isError || !entries) {
    return (
      <p className="text-sm text-gray-700" role="status">
        No se pudo consultar el estado del producto en la tienda. Intenta de nuevo en unos minutos.
      </p>
    );
  }
  if (entries.length === 0) {
    return <p className="text-sm text-gray-700">Sin países configurados para la tienda.</p>;
  }

  return (
    <ul className={compact ? 'space-y-2' : 'divide-y divide-gray-100 rounded-lg border border-gray-200'}>
      {entries.map((entry) => {
        const fixes = Array.from(
          new Set(
            entry.reasons
              .map((r) => STOREFRONT_REASON_SECTION[r])
              .filter((s): s is ProductSectionId => !!s),
          ),
        );
        return (
          <li key={entry.countryCode} className={compact ? '' : 'p-3'}>
            <div className="flex items-start gap-2">
              {entry.sellable ? (
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" aria-hidden />
              ) : (
                <XCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-600" aria-hidden />
              )}
              <div className="min-w-0 flex-1">
                <p className="text-sm text-gray-900">{storefrontSentence(entry)}</p>
                <div className="mt-1 flex flex-wrap items-center gap-2">
                  {entry.sellable && entry.url ? (
                    <a
                      href={entry.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-xs font-medium text-[#3E667D] underline underline-offset-2"
                    >
                      Ver en tienda <ExternalLink className="h-3 w-3" aria-hidden />
                      <span className="sr-only">(se abre en una pestaña nueva)</span>
                    </a>
                  ) : null}
                  {onGoToSection
                    ? fixes.map((sectionId) => (
                        <Button
                          key={sectionId}
                          type="button"
                          variant="outline"
                          size="sm"
                          className="h-7 text-xs"
                          onClick={() => onGoToSection(sectionId)}
                        >
                          Corregir en {SECTION_LABEL[sectionId]}
                        </Button>
                      ))
                    : null}
                </div>
              </div>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
