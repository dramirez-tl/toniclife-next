'use client';

// ShippingCostsCard — Costos de envío y envío gratis de un país de la tienda.
//
// Es el MISMO formulario de Configuración › Envíos (`components/admin/shipping`): mismos
// campos, mismo guardado. Aquí además se dice de dónde salen los montos que hoy cobra
// el país (propios, de fábrica o los de México en otra moneda) y qué pasa con sus zonas.

import { CircleDollarSign, Loader2, RefreshCw } from 'lucide-react';
import { ShippingSettingsFields } from '@/components/admin/shipping/ShippingSettingsFields';
import type { ShippingSettingsForm } from '@/components/admin/shipping/useShippingSettingsForm';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import type { StoreCountryInfo } from '@/lib/store-country/countries';
import type { ReadinessItem } from '@/lib/store-country/readiness';
import { SectionCard, STATE_BOX, StateIcon } from './store-country-ui';

interface ShippingCostsCardProps {
  country: StoreCountryInfo;
  /** Moneda del país (ISO 4217). */
  currency: string;
  form: ShippingSettingsForm;
  /** El renglón "Costos de envío" de la lista de arriba: mismo estado y misma frase. */
  item: ReadinessItem | undefined;
  /**
   * true = el país usa sus montos de fábrica y todavía no los tiene guardados: se pueden
   * guardar tal cual para dejarlos confirmados (aunque no se cambie nada).
   */
  needsConfirm: boolean;
  /** Qué pasa con cada zona del país (Frontera) respecto de estos costos. */
  zoneNotes: string[];
}

export function ShippingCostsCard({ country, currency, form, item, needsConfirm, zoneNotes }: ShippingCostsCardProps) {
  const status = (form.error as { response?: { status?: number } } | null)?.response?.status;
  const canSave = !!form.data && (form.dirty || needsConfirm);

  return (
    <SectionCard
      id="costos-envio"
      icon={CircleDollarSign}
      title="Costos de envío y envío gratis"
      description={`Lo que se cobra por enviar a domicilio en ${country.name}, en ${currency}, y cuándo el envío sale gratis. Es el mismo formulario de Configuración › Envíos.`}
    >
      {form.isLoading ? (
        <div className="space-y-3" aria-busy="true">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-40 w-full" />
        </div>
      ) : !form.data ? (
        <div className="rounded-lg border border-dashed p-4 text-sm">
          <p className="text-foreground">
            {status === 403
              ? 'Tu usuario no puede ver ni cambiar los costos de envío.'
              : 'No se pudieron consultar los costos de envío de este país.'}
          </p>
          {/* Sin poder leer los montos, el diagnóstico de rutas aún puede decir de dónde salen. */}
          {item && !item.pending && item.state !== 'unknown' && status === 403 && (
            <p className="mt-1 text-muted-foreground">{item.detail}</p>
          )}
          {status !== 403 && (
            <Button type="button" variant="outline" size="sm" className="mt-3" onClick={() => form.refetch()}>
              <RefreshCw aria-hidden /> Reintentar
            </Button>
          )}
        </div>
      ) : (
        <>
          {item && !item.pending && item.state !== 'ok' && (
            <div className={`flex items-start gap-2 rounded-lg border px-4 py-3 text-sm ${STATE_BOX[item.state]}`} role="status">
              <StateIcon state={item.state} className="mt-0.5 size-4" />
              <span>{item.detail}</span>
            </div>
          )}

          <ShippingSettingsFields
            values={form.values}
            onChange={form.change}
            currency={currency}
            flagsSupported={form.flagsSupported}
          />

          {zoneNotes.map((note) => (
            <p key={note} className="rounded-lg bg-[#C8DDF2]/25 px-4 py-3 text-sm text-[#2f5165]">
              {note}
            </p>
          ))}

          <div className="flex flex-wrap items-center justify-end gap-3 border-t pt-4">
            {form.dirty && <span className="mr-auto text-sm text-amber-800">Tienes cambios sin guardar.</span>}
            {form.dirty && (
              <Button type="button" variant="outline" onClick={form.reset} disabled={form.isSaving}>
                Descartar cambios
              </Button>
            )}
            <Button type="button" onClick={form.save} disabled={!canSave || form.isSaving}>
              {form.isSaving && <Loader2 aria-hidden className="animate-spin" />}
              {form.isSaving ? 'Guardando…' : 'Guardar costos de envío'}
            </Button>
          </div>
        </>
      )}
    </SectionCard>
  );
}
