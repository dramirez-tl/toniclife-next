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

export interface GeneratePeriodsDto {
  year: number;
  overwrite?: boolean;
}
