'use client';

// Zona horaria por sucursal para "Timbrado (zona sucursal)". El DTO de factura
// trae `branchId`; la zona sale del catálogo de sucursales activas (cache 10 min).

import { useCallback, useMemo } from 'react';
import { useActiveBranches } from '@/hooks/useBranches';
import { DEFAULT_TIMEZONE, formatDateTimeLocal, resolveTimeZone } from '@/lib/timezone-utils';
import type { Branch } from '@/types/branch';

export function useBranchTimezone() {
  const { data: branches } = useActiveBranches();
  const byId = useMemo(() => {
    const map = new Map<string, string>();
    for (const b of (branches ?? []) as Branch[]) {
      if (b.timezone) map.set(b.id, b.timezone);
    }
    return map;
  }, [branches]);

  const timezoneOf = useCallback(
    (branchId: string | null | undefined): string =>
      resolveTimeZone((branchId && byId.get(branchId)) || DEFAULT_TIMEZONE),
    [byId],
  );

  /** "13 sep 2026, 11:45 p.m." en la zona de la sucursal; '—' si no hay fecha. */
  const formatInBranch = useCallback(
    (date: string | null | undefined, branchId: string | null | undefined): string => {
      if (!date) return '—';
      const tz = timezoneOf(branchId);
      return new Date(date).toLocaleString('es-MX', {
        timeZone: tz,
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true,
      });
    },
    [timezoneOf],
  );

  const formatShortInBranch = useCallback(
    (date: string | null | undefined, branchId: string | null | undefined): string =>
      date ? formatDateTimeLocal(date, timezoneOf(branchId)) : '—',
    [timezoneOf],
  );

  return { timezoneOf, formatInBranch, formatShortInBranch, branches: (branches ?? []) as Branch[] };
}

/** 'YYYY-MM-DD' de hoy (o con desplazamiento de días) en una zona IANA. */
export function localDateInZone(timezone: string, offsetDays = 0): string {
  const now = new Date();
  now.setUTCDate(now.getUTCDate() + offsetDays);
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: resolveTimeZone(timezone),
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(now);
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? '';
  return `${get('year')}-${get('month')}-${get('day')}`;
}

/** 'YYYY-MM-DD' → '18/09/2026' sin pasar por Date (evita el corrimiento UTC). */
export function formatIsoDate(iso: string | null | undefined): string {
  if (!iso) return '—';
  const [y, m, d] = iso.slice(0, 10).split('-');
  return y && m && d ? `${d}/${m}/${y}` : iso;
}
