'use client';

// useOnlineRevenue — Rango y consulta de "Ingresos en línea".
//
// El rango sale de los PERIODOS DE NEGOCIO que da el API (`/mlm/periods/current` y
// `/mlm/periods`): periodo actual por defecto, el anterior, o las fechas que escriba la
// persona. Aquí no se calcula ningún mes. La respuesta trae los cuatro países a la vez,
// así que cambiar de país no vuelve a consultar: por eso este estado vive en la página
// y no en la tarjeta.

import { useState } from 'react';
import { useCurrentPeriod, usePeriods } from '@/hooks/useMlmPeriods';
import { useOnlineSalesByCountry } from '@/hooks/useReports';
import {
  checkDateRange,
  dateRangeMessage,
  periodRange,
  previousPeriod,
  type DateRange,
} from '@/lib/store-country/online-sales';

export type RevenueMode = 'current' | 'previous' | 'custom';

/** `enabled` = la persona puede ver reportes (`reports:read`); sin él no se consulta nada. */
export function useOnlineRevenue(enabled: boolean) {
  const [mode, setMode] = useState<RevenueMode>('current');
  const [draft, setDraft] = useState<DateRange>({ from: '', to: '' });
  const [applied, setApplied] = useState<DateRange | null>(null);
  const [customError, setCustomError] = useState<string | null>(null);

  const currentQuery = useCurrentPeriod({ enabled });
  const periodsQuery = usePeriods({ enabled });

  const current = currentQuery.data ?? null;
  const previous = previousPeriod(periodsQuery.data, current);

  const range: DateRange | null =
    mode === 'current' ? periodRange(current) : mode === 'previous' ? periodRange(previous) : applied;

  const query = useOnlineSalesByCountry(range, { enabled });

  /** Aplica las fechas escritas si pasan las reglas del reporte; si no, dice por qué. */
  const applyCustom = () => {
    const problem = checkDateRange(draft.from, draft.to);
    if (problem) {
      setCustomError(dateRangeMessage(problem));
      return;
    }
    setCustomError(null);
    setApplied({ from: draft.from, to: draft.to });
  };

  const changeDraft = (patch: Partial<DateRange>) => {
    setDraft((prev) => ({ ...prev, ...patch }));
    setCustomError(null);
  };

  return {
    mode,
    setMode,
    /** Periodo de negocio en curso (del API); null mientras carga o si no se pudo leer. */
    current,
    previous,
    periodsLoading: currentQuery.isLoading || (mode === 'previous' && periodsQuery.isLoading),
    /** No se pudo leer el periodo que se pidió: solo queda escribir las fechas. */
    periodFailed:
      (mode === 'current' && (currentQuery.isError || (!currentQuery.isLoading && !periodRange(current)))) ||
      (mode === 'previous' && !currentQuery.isLoading && !periodsQuery.isLoading && !periodRange(previous)),
    range,
    draft,
    changeDraft,
    customError,
    applyCustom,
    query,
  };
}

export type OnlineRevenue = ReturnType<typeof useOnlineRevenue>;
