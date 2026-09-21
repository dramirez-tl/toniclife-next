'use client';

// StockModeSetting — "Cuando un país tiene varios almacenes" (contrato §7.3-5).
// Solo se muestra abierto si algún país tiene 2 o más almacenes; si no, es una
// línea plegada para no distraer.

import { useId } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import type { FulfillmentStockMode } from '@/types/fulfillment';

interface StockModeSettingProps {
  value: FulfillmentStockMode;
  expanded: boolean;
  canEdit: boolean;
  onChange: (mode: FulfillmentStockMode) => void;
}

const OPTIONS: Array<{ value: FulfillmentStockMode; label: string; help: string }> = [
  {
    value: 'full_order',
    label: 'Usar el primero que tenga todo el pedido (recomendado)',
    help: 'Si el principal no tiene todo, se intenta con el siguiente de la lista.',
  },
  {
    value: 'first_active',
    label: 'Usar siempre el primero de la lista',
    help: 'Los respaldos solo entran si el principal está en pausa o desactivado.',
  },
];

export function StockModeSetting({ value, expanded, canEdit, onChange }: StockModeSettingProps) {
  const id = useId();
  const body = (
    <>
      <RadioGroup
        value={value}
        onValueChange={(v) => onChange(v === 'first_active' ? 'first_active' : 'full_order')}
        disabled={!canEdit}
        aria-labelledby={`${id}-title`}
        className="gap-3"
      >
        {OPTIONS.map((option) => (
          <div key={option.value} className="flex items-start gap-3">
            <RadioGroupItem id={`${id}-${option.value}`} value={option.value} className="mt-1" />
            <div className="text-sm">
              <Label htmlFor={`${id}-${option.value}`} className="font-medium leading-snug">
                {option.label}
              </Label>
              <p className="text-muted-foreground">{option.help}</p>
            </div>
          </div>
        ))}
      </RadioGroup>
      <p className="text-xs text-muted-foreground">Un pedido siempre sale completo de un solo almacén.</p>
    </>
  );

  return (
    <Card>
      <CardContent className="p-4 sm:p-5">
        {expanded ? (
          <div className="space-y-3">
            <h2 id={`${id}-title`} className="text-lg font-semibold text-foreground">
              Cuando un país tiene varios almacenes
            </h2>
            {body}
          </div>
        ) : (
          <details>
            <summary className="cursor-pointer rounded text-sm font-medium text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring">
              <span id={`${id}-title`}>Cuando un país tiene varios almacenes</span>
              <span className="ml-1 font-normal text-muted-foreground">(hoy ningún país tiene más de uno)</span>
            </summary>
            <div className="mt-3 space-y-3">{body}</div>
          </details>
        )}
      </CardContent>
    </Card>
  );
}
