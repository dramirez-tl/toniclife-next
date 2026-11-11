'use client';

// PaymentsCard — Con qué se cobra en línea en un país de la tienda. SOLO LECTURA: las
// llaves de Stripe (y de lo que se conecte después) viven en el servidor y las administra Sistemas.

import { CreditCard, KeyRound } from 'lucide-react';
import { paymentPlan, type StoreCountryInfo } from '@/lib/store-country/countries';
import type { ReadinessItem } from '@/lib/store-country/readiness';
import { SectionCard, StateBadge, StateIcon } from './store-country-ui';

interface PaymentsCardProps {
  country: StoreCountryInfo;
  /** El renglón "Cobro en línea" de la lista de arriba: mismo estado y misma frase. */
  item: ReadinessItem | undefined;
}

function gatewayName(country: StoreCountryInfo): string {
  const plan = paymentPlan(country.code);
  if (plan.kind === 'stripe') return `Stripe · cuenta de ${plan.accountName}`;
  if (plan.kind === 'planned') return `${plan.gatewayName} (todavía sin conectar)`;
  return 'Sin servicio de cobro';
}

function gatewayNote(country: StoreCountryInfo): string {
  const plan = paymentPlan(country.code);
  if (plan.kind !== 'stripe') {
    return 'Mientras no haya con qué cobrar, en la tienda de este país se puede armar el carrito pero no pagar.';
  }
  const zones = country.zones.map((z) => z.name).join(' y ');
  return plan.account === 'mx'
    ? `Cobra en ${country.currency}.${zones ? ` Los pedidos de ${zones} se cobran en esta misma cuenta.` : ''}`
    : `Cobra en ${country.currency}. Es una cuenta de Stripe distinta de la de México: el dinero de cada país llega a su propia cuenta.`;
}

export function PaymentsCard({ country, item }: PaymentsCardProps) {
  return (
    <SectionCard
      id="cobro"
      icon={CreditCard}
      title="Cobro en línea"
      description={`Con qué paga quien compra en la tienda de ${country.name}.`}
    >
      <div className="rounded-lg border bg-background p-3 sm:p-4">
        <div className="flex items-start gap-3">
          {item && <StateIcon state={item.state} pending={item.pending} className="mt-0.5" />}
          <div className="min-w-0">
            <p className="flex flex-wrap items-center gap-x-2 gap-y-1 font-medium text-foreground">
              {gatewayName(country)}
              {item && <StateBadge state={item.state} pending={item.pending} label={item.label} />}
            </p>
            {item && <p className="mt-1 text-sm text-muted-foreground">{item.detail}</p>}
            <p className="mt-2 text-sm text-muted-foreground">{gatewayNote(country)}</p>
          </div>
        </div>
      </div>

      <p className="flex items-start gap-2 text-xs text-muted-foreground">
        <KeyRound aria-hidden className="mt-0.5 size-3.5 shrink-0" />
        <span>
          Las llaves de los servicios de cobro las guarda y cambia Sistemas en el servidor. En esta pantalla no se
          capturan ni se muestran.
        </span>
      </p>
    </SectionCard>
  );
}
