'use client';

// ReportHeader — encabezado del reporte de distribuidores: título, línea del
// periodo (26→25, días que faltan) y el ALCANCE que gobierna resumen y lista:
// periodo, país de residencia, sucursal de alta y estado de la cuenta.

import { useMemo } from 'react';
import { CalendarDaysIcon, UsersIcon } from '@heroicons/react/24/outline';
import { SearchableSelect } from '@/components/ui/SearchableSelect';
import { useActiveBranches } from '@/hooks/useBranches';
import { STATUS_LABEL, STATUS_PARAM } from '@/lib/distributors-report/filters';
import { fmtPeriodRange } from '@/lib/network/format';
import type { ReportStatus } from '@/types/distributors-report';
import type { NetworkOverviewPeriod } from '@/types/network';

export interface PeriodOption {
  id: string;
  name: string;
  isCurrent: boolean;
}

const COUNTRY_LABEL: Record<string, string> = {
  MX: 'México',
  US: 'Estados Unidos',
  CO: 'Colombia',
  GT: 'Guatemala',
};
const BASE_COUNTRIES = ['MX', 'US', 'CO', 'GT'];
const STATUSES: ReportStatus[] = ['active', 'inactive', 'suspended', 'pending'];
const LOCALE = 'es';

interface ReportHeaderProps {
  periods: PeriodOption[];
  selectedPeriodId: string;
  /** Periodo mostrado (lo resuelve el servidor; null mientras carga). */
  period: NetworkOverviewPeriod | null;
  onPeriodChange: (id: string) => void;
  countryCode: string | null;
  branchId: string | null;
  status: ReportStatus | null;
  /** Códigos de país presentes en el resumen (para ofrecer también países fuera de la lista base). */
  countryCodes: string[];
  onScope: (key: 'pais' | 'sucursal' | 'estado', value: string | null) => void;
}

export function ReportHeader({
  periods,
  selectedPeriodId,
  period,
  onPeriodChange,
  countryCode,
  branchId,
  status,
  countryCodes,
  onScope,
}: ReportHeaderProps) {
  const { data: branches } = useActiveBranches();
  const branchOptions = useMemo(
    () =>
      [...(branches ?? [])]
        .sort((a, b) => a.code.localeCompare(b.code, 'es', { numeric: true }))
        .map((b) => ({ value: b.id, label: `${b.code} · ${b.name}` })),
    [branches],
  );
  const countryOptions = useMemo(() => {
    const codes = Array.from(new Set([...BASE_COUNTRIES, ...countryCodes, ...(countryCode ? [countryCode] : [])]));
    return codes.map((code) => ({ value: code, label: COUNTRY_LABEL[code] ? `${COUNTRY_LABEL[code]} (${code})` : code }));
  }, [countryCodes, countryCode]);

  const range = period ? fmtPeriodRange(period.startDate, period.endDate, LOCALE) : null;
  const periodLine = period
    ? `Periodo ${period.name} · ${range?.start} — ${range?.end}${
        period.daysLeft !== null && period.daysLeft >= 0 ? ` · quedan ${period.daysLeft} días` : period.isClosed ? ' · cerrado' : ''
      }`
    : 'Cargando periodo…';

  return (
    <div className="bg-gradient-to-r from-[#3E667D] to-[#0A4B94] text-white">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <div className="mb-1 flex items-center gap-3">
              <UsersIcon className="h-9 w-9" aria-hidden="true" />
              <h1 className="text-2xl font-bold sm:text-3xl">Reporte de distribuidores</h1>
            </div>
            <p className="text-sm text-white/80">
              Inscritos, activos, calificados, rangos y ventas del periodo (26 → 25) sobre todos los distribuidores. Mismas
              definiciones que «Mi red»: activo = con puntos; calificado = 3,300 puntos o más.
            </p>
            <p className="mt-2 flex items-center gap-2 text-sm text-white/90">
              <CalendarDaysIcon className="h-4 w-4" aria-hidden="true" />
              {periodLine}
            </p>
          </div>
          <div className="grid w-full grid-cols-1 gap-2 sm:grid-cols-2 lg:w-[640px] lg:grid-cols-4">
            <div className="rounded-lg bg-white/95 text-gray-900">
              <SearchableSelect
                aria-label="Periodo"
                options={periods.map((p) => ({ value: p.id, label: `${p.name}${p.isCurrent ? ' (Actual)' : ''}` }))}
                value={selectedPeriodId}
                onChange={(v) => onPeriodChange(v)}
                showAllOption={false}
              />
            </div>
            <div className="rounded-lg bg-white/95 text-gray-900">
              <SearchableSelect
                aria-label="País"
                options={countryOptions}
                value={countryCode ?? ''}
                onChange={(v) => onScope('pais', v)}
                allLabel="Todos los países"
                allValue=""
              />
            </div>
            <div className="rounded-lg bg-white/95 text-gray-900">
              <SearchableSelect
                aria-label="Sucursal de alta"
                options={branchOptions}
                value={branchId ?? ''}
                onChange={(v) => onScope('sucursal', v)}
                allLabel="Todas las sucursales"
                allValue=""
              />
            </div>
            <div className="rounded-lg bg-white/95 text-gray-900">
              <SearchableSelect
                aria-label="Estado de la cuenta"
                options={STATUSES.map((s) => ({ value: STATUS_PARAM[s], label: `Cuenta ${STATUS_LABEL[s].toLowerCase()}` }))}
                value={status ? STATUS_PARAM[status] : ''}
                onChange={(v) => onScope('estado', v)}
                allLabel="Cualquier estado de cuenta"
                allValue=""
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
