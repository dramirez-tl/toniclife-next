// types/mlm-periods.ts - Types for MLM Periods
// Aligned with backend DTO: toniclife-api/src/modules/mlm/dto/period.dto.ts

export interface MlmPeriod {
  id: string;
  code: string;
  name: string;
  periodNumber?: number;
  startDate: string;
  endDate: string;
  status?: 'open' | 'closed' | 'processing' | 'paid';
  isClosed: boolean;
  exchangeRateUsdMxn?: string;
  exchangeRateGtq?: string;
  closedAt?: string;
  createdAt: string;
  isCurrent?: boolean;
}

export interface PeriodStats {
  totalActiveCustomers: number;
  totalPersonalPoints: number;
  totalBusinessValueMxn: string;
  totalCommissions: string;
  qualifiedCustomers: number;
}

export interface MlmPeriodWithStats extends MlmPeriod {
  stats?: PeriodStats;
}

// Proyección de los periodos de un año con la regla de cierre en día hábil
// aplicada (NO persiste). Backend: GET /mlm/periods/preview?year=YYYY.
export interface PeriodPreview {
  month: number;
  code: string;
  name: string;
  /** Día 25 nominal (sin recorrer). */
  nominalEndDate: string;
  /** Inicio efectivo (contiguo con el periodo anterior). */
  startDate: string;
  /** Fin efectivo (día 25 recorrido a día hábil). */
  endDate: string;
  shifted: boolean;
  shiftDays: number;
  /** Por qué el 25 no fue hábil: "domingo", "Navidad", etc. null si no se recorrió. */
  reason?: string | null;
  existsInDb: boolean;
  /** Si existe en BD: si está cerrado (un mismatch cerrado es histórico esperado). */
  isClosed?: boolean | null;
  /** Si existe en BD: si las fechas guardadas coinciden con la regla. */
  matchesRule?: boolean | null;
}

export interface CreatePeriodDto {
  code: string;
  name: string;
  startDate: string;
  endDate: string;
  exchangeRateUsdMxn?: string;
  exchangeRateGtq?: string;
}

export interface UpdatePeriodDto {
  name?: string;
  startDate?: string;
  endDate?: string;
  exchangeRateUsdMxn?: string;
  exchangeRateGtq?: string;
}

export interface ClosePeriodDto {
  confirm: boolean;
}

// Tipos de cambio por periodo (X→MXN congelado durante el periodo).
// Backend: GET/PUT /mlm/periods/:id/exchange-rates
export interface PeriodExchangeRate {
  currencyCode: string;
  currencyName: string;
  /** Pesos MXN por 1 unidad. undefined = pendiente de captura. */
  rateToMxn?: string;
  source?: 'auto' | 'manual' | 'backfill';
  fetchedAt?: string;
  updatedAt?: string;
}

export interface PeriodExchangeRatesResponse {
  periodId: string;
  periodName: string;
  isClosed: boolean;
  rates: PeriodExchangeRate[];
  missing: string[];
}

export interface PeriodFxSnapshotResult {
  inserted: number;
  updated: number;
  unavailable: string[];
}

export interface GeneratePeriodsDto {
  year: number;
  overwrite?: boolean;
}
