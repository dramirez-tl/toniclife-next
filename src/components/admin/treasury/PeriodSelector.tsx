'use client';

// PeriodSelector — selector de periodo 26→25 compartido por Tesorería
// (extraído de /admin/comisiones). Oculta periodos futuros, muestra el rango
// del periodo y el badge Actual / Cerrado / Abierto; flechas anterior /
// siguiente e "Ir al actual". El valor vive en la URL (`?period=`), por eso
// el componente recibe `value`/`onChange` y un hook resuelve el efectivo.

import { useMemo } from 'react';
import {
  CalendarDaysIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
} from '@heroicons/react/24/outline';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { SearchableSelect } from '@/components/ui/SearchableSelect';
import { Skeleton } from '@/components/ui/skeleton';
import { usePeriods } from '@/hooks/useMlmPeriods';
import { periodsUpToCurrent } from '@/hooks/useCommissions';
import type { MlmPeriod } from '@/types/mlm-periods';
import { formatPeriodRange } from './treasury-format';

export const ALL_PERIODS = 'all';

export interface TreasuryPeriodSelection {
  periods: MlmPeriod[];
  /** Solo hasta el actual (sin futuros), del más reciente al más viejo. */
  visiblePeriods: MlmPeriod[];
  currentPeriodId: string | undefined;
  /** undefined = "Todos los periodos" (solo si `allowAll`). */
  effectivePeriodId: string | undefined;
  selectedPeriod: MlmPeriod | null;
  isAllPeriods: boolean;
  isLoading: boolean;
}

/**
 * Resuelve el periodo efectivo a partir del parámetro de URL: por DEFECTO el
 * actual; `'all'` solo cuando la pantalla lo permite.
 */
export function useTreasuryPeriod(
  periodParam: string,
  options: { allowAll?: boolean } = {},
): TreasuryPeriodSelection {
  const { data, isLoading } = usePeriods();
  const periods = useMemo(() => (Array.isArray(data) ? data : []), [data]);
  // periodsUpToCurrent está tipado sobre Record<string, unknown>; MlmPeriod
  // no tiene index signature, por eso el doble cast (mismo arreglo, sin copia).
  const visiblePeriods = useMemo(
    () =>
      periodsUpToCurrent(periods as unknown as Record<string, unknown>[]) as unknown as MlmPeriod[],
    [periods],
  );
  const currentPeriodId = periods.find((p) => p.isCurrent)?.id;

  const wantsAll = options.allowAll === true && periodParam === ALL_PERIODS;
  const requested = !wantsAll && periodParam && periodParam !== ALL_PERIODS ? periodParam : undefined;
  const effectivePeriodId = wantsAll
    ? undefined
    : requested && periods.some((p) => p.id === requested)
      ? requested
      : currentPeriodId;
  const selectedPeriod = effectivePeriodId
    ? (periods.find((p) => p.id === effectivePeriodId) ?? null)
    : null;

  return {
    periods,
    visiblePeriods,
    currentPeriodId,
    effectivePeriodId,
    selectedPeriod,
    isAllPeriods: wantsAll,
    isLoading,
  };
}

interface PeriodSelectorProps {
  selection: TreasuryPeriodSelection;
  /** `'all'` cuando se eligen todos los periodos; `null` = volver al actual. */
  onChange: (periodId: string | null) => void;
  allowAll?: boolean;
  caption?: string;
}

export function PeriodSelector({
  selection,
  onChange,
  allowAll = false,
  caption = 'Periodo · afecta toda la página',
}: PeriodSelectorProps) {
  const { visiblePeriods, currentPeriodId, effectivePeriodId, selectedPeriod, isAllPeriods, isLoading } =
    selection;

  // visiblePeriods viene del más reciente al más viejo: "anterior" = idx+1.
  const selectedIdx = visiblePeriods.findIndex((p) => p.id === effectivePeriodId);
  const olderPeriod = selectedIdx >= 0 ? visiblePeriods[selectedIdx + 1] : undefined;
  const newerPeriod = selectedIdx > 0 ? visiblePeriods[selectedIdx - 1] : undefined;
  const range = formatPeriodRange(selectedPeriod);

  if (isLoading && visiblePeriods.length === 0) {
    return <Skeleton className="mb-6 h-20 w-full" />;
  }

  return (
    <Card className="mb-6 border-border shadow-sm">
      <CardContent className="p-4 sm:p-5">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-full bg-primary/10">
              <CalendarDaysIcon className="h-5 w-5 text-primary" aria-hidden />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                {caption}
              </p>
              <div className="flex flex-wrap items-center gap-2">
                <p className="text-lg font-bold leading-tight text-foreground">
                  {isAllPeriods ? 'Todos los periodos' : (selectedPeriod?.name ?? '—')}
                </p>
                {!isAllPeriods && range && (
                  <span className="text-xs text-muted-foreground">{range}</span>
                )}
                {!isAllPeriods && selectedPeriod?.isCurrent && <Badge variant="success">Actual</Badge>}
                {!isAllPeriods && selectedPeriod && !selectedPeriod.isCurrent && selectedPeriod.isClosed && (
                  <Badge variant="outline" className="text-muted-foreground">
                    Cerrado
                  </Badge>
                )}
                {!isAllPeriods && selectedPeriod && !selectedPeriod.isCurrent && !selectedPeriod.isClosed && (
                  <Badge variant="warning">Abierto</Badge>
                )}
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              className="h-10 px-2.5"
              disabled={!olderPeriod}
              onClick={() => olderPeriod && onChange(olderPeriod.id)}
              title="Periodo anterior"
              aria-label="Periodo anterior"
            >
              <ChevronLeftIcon className="h-4 w-4" aria-hidden />
            </Button>

            <div className="w-44 sm:w-56">
              <SearchableSelect
                aria-label="Periodo"
                options={visiblePeriods.map((p) => ({ value: p.id, label: p.name }))}
                value={isAllPeriods ? '' : (effectivePeriodId ?? '')}
                onChange={(val) => onChange(val || (allowAll ? ALL_PERIODS : null))}
                allLabel="Todos los periodos"
                showAllOption={allowAll}
                placeholder="Elegir periodo"
              />
            </div>

            <Button
              variant="outline"
              size="sm"
              className="h-10 px-2.5"
              disabled={!newerPeriod}
              onClick={() => newerPeriod && onChange(newerPeriod.id)}
              title="Periodo siguiente"
              aria-label="Periodo siguiente"
            >
              <ChevronRightIcon className="h-4 w-4" aria-hidden />
            </Button>

            {currentPeriodId && (isAllPeriods || effectivePeriodId !== currentPeriodId) && (
              <Button variant="ghost" size="sm" className="h-10 text-primary" onClick={() => onChange(null)}>
                Ir al actual
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
