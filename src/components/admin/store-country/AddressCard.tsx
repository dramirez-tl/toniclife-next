'use client';

// AddressCard — Qué pide la tienda en la dirección de envío de un país. SOLO LECTURA.
//
// Sale de la misma fuente que usa el checkout (`lib/checkout/shipping-address` para los
// campos y `useAddressFormTexts` para cómo se llaman en ese país), así que lo que se
// ve aquí es lo que ve quien compra.

import { CircleAlert, MapPin } from 'lucide-react';
import { useAddressFormTexts } from '@/components/checkout/ShippingAddressForm';
import { Badge } from '@/components/ui/badge';
import { addressSummary, stateCatalogNote, type StateCatalogInfo } from '@/lib/store-country/address-summary';
import type { StoreCountryInfo } from '@/lib/store-country/countries';
import { SectionCard } from './store-country-ui';

interface AddressCardProps {
  country: StoreCountryInfo;
  /** Catálogo de estados / departamentos del país. */
  states: StateCatalogInfo;
}

export function AddressCard({ country, states }: AddressCardProps) {
  const { label, zipHint } = useAddressFormTexts(country.code);
  const summary = addressSummary(country.code);
  const stateNote = stateCatalogNote(label('state'), states, summary.stateAsCode);

  return (
    <SectionCard
      id="direccion"
      icon={MapPin}
      title="Dirección de envío"
      description={`Lo que la tienda le pide a quien compra en ${country.name} para una dirección nueva. Aquí solo se consulta.`}
    >
      <ul className="divide-y rounded-lg border" aria-label={`Campos de la dirección en ${country.name}`}>
        {summary.fields.map((field) => (
          <li key={field.key} className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 px-3 py-2">
            <span className="min-w-0 text-sm text-foreground">
              {label(field.key)}
              {field.key === 'zipCode' && zipHint && <span className="text-muted-foreground"> · {zipHint}</span>}
            </span>
            {field.required ? (
              <Badge variant="info">Obligatorio</Badge>
            ) : (
              <Badge variant="outline" className="text-muted-foreground">
                Opcional
              </Badge>
            )}
          </li>
        ))}
      </ul>

      <p
        className={`flex items-start gap-2 text-sm ${stateNote.ok ? 'text-muted-foreground' : 'rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-amber-950'}`}
      >
        {!stateNote.ok && <CircleAlert aria-hidden className="mt-0.5 size-4 shrink-0 text-amber-600" />}
        <span>{stateNote.text}</span>
      </p>

      <p className="text-sm text-muted-foreground">Además se pide el nombre y el teléfono de quien recibe.</p>
    </SectionCard>
  );
}
