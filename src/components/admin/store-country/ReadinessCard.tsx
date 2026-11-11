'use client';

// ReadinessCard — "¿Lista para vender?": el veredicto y, debajo, cada punto con su
// estado, una frase y a dónde ir para arreglarlo. Las frases salen de
// `lib/store-country/readiness`; aquí solo se pintan.

import Link from 'next/link';
import { ArrowRight, ClipboardCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { ReadinessItem, ReadinessVerdict } from '@/lib/store-country/readiness';
import { SectionCard, STATE_BOX, StateBadge, StateIcon } from './store-country-ui';

interface ReadinessCardProps {
  /** "México (incluye Frontera)". */
  countryScope: string;
  items: ReadinessItem[];
  verdict: ReadinessVerdict;
}

export function ReadinessCard({ countryScope, items, verdict }: ReadinessCardProps) {
  return (
    <SectionCard
      id="lista-para-vender"
      icon={ClipboardCheck}
      title="¿Lista para vender?"
      description={`Lo que la tienda en línea de ${countryScope} necesita para vender, punto por punto.`}
    >
      <div className={`rounded-lg border px-4 py-3 ${STATE_BOX[verdict.state]}`} role="status" aria-live="polite">
        <p className="flex items-start gap-2 font-semibold">
          <StateIcon state={verdict.state} pending={verdict.pending && verdict.state === 'unknown'} className="mt-0.5" />
          <span>{verdict.title}</span>
        </p>
        <p className="mt-1 text-sm">{verdict.detail}</p>
      </div>

      <ul className="divide-y rounded-lg border" aria-label={`Puntos que necesita la tienda de ${countryScope}`}>
        {items.map((item) => (
          <li key={item.id} className="flex flex-col gap-3 p-3 sm:flex-row sm:items-start sm:gap-4 sm:p-4">
            <div className="flex min-w-0 flex-1 items-start gap-3">
              <StateIcon state={item.state} pending={item.pending} className="mt-0.5" />
              <div className="min-w-0">
                <p className="flex flex-wrap items-center gap-x-2 gap-y-1 font-medium text-foreground">
                  {item.title}
                  <StateBadge state={item.state} pending={item.pending} label={item.label} />
                </p>
                <p className="mt-1 text-sm text-muted-foreground">{item.detail}</p>
              </div>
            </div>
            {item.action && (
              <Button asChild variant="outline" size="sm" className="h-auto min-h-8 self-start whitespace-normal py-1.5 text-left sm:shrink-0">
                {item.action.href.startsWith('#') ? (
                  <a href={item.action.href}>
                    {item.action.label} <ArrowRight aria-hidden />
                  </a>
                ) : (
                  <Link href={item.action.href}>
                    {item.action.label} <ArrowRight aria-hidden />
                  </Link>
                )}
              </Button>
            )}
          </li>
        ))}
      </ul>
    </SectionCard>
  );
}
