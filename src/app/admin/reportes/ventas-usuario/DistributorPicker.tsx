'use client';

// DistributorPicker — selector de distribuidor igual de preciso que el del POS:
// búsqueda ABIERTA (nombre, correo o número parcial) o número EXACTO + Enter.
// Al elegir uno, el reporte filtra por su número exacto (ni 20, ni 200, ni
// 1112 cuando buscas al 2). Sin elegir, lo tecleado viaja como texto libre.

import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { HashtagIcon, MagnifyingGlassIcon, XMarkIcon } from '@heroicons/react/24/outline';
import { Input } from '@/components/ui/input';
import { customersService } from '@/services/customers.service';
import type { Customer } from '@/types/customer';

export interface PickedDistributor {
  customerNumber: string;
  name: string;
  status: string;
}

const fullName = (c: Customer) =>
  [c.firstName, c.lastName, c.lastNameMother].filter(Boolean).join(' ').trim() || c.email || '—';

const STATUS_BADGE: Record<string, string> = {
  active: 'bg-emerald-100 text-emerald-700',
  pending: 'bg-amber-100 text-amber-800',
  inactive: 'bg-gray-200 text-gray-600',
};

export function DistributorPicker({
  value,
  onChange,
  onFreeTextChange,
  onSubmit,
}: {
  value: PickedDistributor | null;
  onChange: (picked: PickedDistributor | null) => void;
  /** Texto de la búsqueda abierta (para consultar sin elegir a nadie). */
  onFreeTextChange?: (text: string) => void;
  /** Enter con un resultado único o sin resultados: consultar. */
  onSubmit?: () => void;
}) {
  const [query, setQuery] = useState('');
  const [debounced, setDebounced] = useState('');
  const [numberQuery, setNumberQuery] = useState('');
  const [open, setOpen] = useState(false);

  // Espera 300 ms sin teclear antes de consultar (setState dentro del timer,
  // no en el cuerpo del efecto).
  useEffect(() => {
    const t = setTimeout(() => setDebounced(query.trim()), 300);
    return () => clearTimeout(t);
  }, [query]);

  const byNumber = numberQuery.trim().length >= 1;
  const { data: fuzzy, isFetching: fuzzyFetching } = useQuery({
    queryKey: ['ventas-usuario', 'customer-search', debounced],
    queryFn: () => customersService.getAll({ search: debounced, limit: 10 }),
    enabled: !byNumber && debounced.length >= 2,
    staleTime: 60 * 1000,
  });
  const { data: exact, isFetching: exactFetching } = useQuery({
    queryKey: ['ventas-usuario', 'customer-number', numberQuery.trim()],
    queryFn: () => customersService.getAll({ customerNumber: numberQuery.trim(), limit: 5 }),
    enabled: byNumber,
    staleTime: 60 * 1000,
  });
  const results: Customer[] = (byNumber ? exact?.data : fuzzy?.data) ?? [];
  const isFetching = byNumber ? exactFetching : fuzzyFetching;
  const hasQuery = byNumber || debounced.length >= 2;

  const pick = (c: Customer) => {
    onChange({ customerNumber: c.customerNumber ?? '', name: fullName(c), status: c.status });
    setQuery('');
    setNumberQuery('');
    onFreeTextChange?.('');
    setOpen(false);
  };

  if (value) {
    return (
      <div className="flex h-10 items-center gap-2 rounded-md border border-[#3E667D]/30 bg-[#3E667D]/5 px-3 text-sm">
        <span className="font-mono font-semibold text-[#3E667D]">#{value.customerNumber}</span>
        <span className="min-w-0 flex-1 truncate text-gray-900" title={value.name}>{value.name}</span>
        <span className={`rounded-full px-1.5 py-0.5 text-[10px] font-medium ${STATUS_BADGE[value.status] ?? 'bg-gray-100 text-gray-600'}`}>
          {value.status}
        </span>
        <button
          type="button"
          onClick={() => onChange(null)}
          className="rounded p-0.5 text-gray-400 hover:bg-white hover:text-red-600"
          title="Quitar distribuidor"
          aria-label="Quitar distribuidor"
        >
          <XMarkIcon className="h-4 w-4" />
        </button>
      </div>
    );
  }

  return (
    <div className="relative">
      <div className="flex gap-2">
        <div className="relative min-w-0 flex-1">
          <MagnifyingGlassIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <Input
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              onFreeTextChange?.(e.target.value);
              if (e.target.value.trim()) setNumberQuery('');
              setOpen(true);
            }}
            onFocus={() => setOpen(true)}
            onKeyDown={(e) => {
              if (e.key === 'Escape') setOpen(false);
              if (e.key === 'Enter') {
                if (results.length === 1) pick(results[0]);
                else onSubmit?.();
              }
            }}
            placeholder="Buscar por nombre, email o número (parcial)..."
            className="bg-gray-50 pl-9"
            autoComplete="off"
          />
        </div>
        <div className="relative w-56 shrink-0 sm:w-64">
          <HashtagIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <Input
            value={numberQuery}
            onChange={(e) => {
              setNumberQuery(e.target.value.replace(/\D/g, ''));
              if (e.target.value.trim()) {
                setQuery('');
                onFreeTextChange?.('');
              }
              setOpen(true);
            }}
            onFocus={() => setOpen(true)}
            onKeyDown={(e) => {
              if (e.key === 'Escape') setOpen(false);
              if (e.key === 'Enter') {
                if (results.length >= 1) pick(results[0]);
                else onSubmit?.();
              }
            }}
            placeholder="No. EXACTO (ej. 2) + Enter"
            title="Número de distribuidor exacto + Enter"
            className="bg-gray-50 pl-9 font-mono"
            inputMode="numeric"
            autoComplete="off"
          />
        </div>
      </div>

      {open && hasQuery && (
        <div className="absolute left-0 right-0 top-full z-20 mt-1 max-h-72 overflow-y-auto rounded-md border border-gray-200 bg-white shadow-lg">
          {isFetching ? (
            <div className="px-3 py-3 text-xs text-gray-400">Buscando…</div>
          ) : results.length === 0 ? (
            <div className="px-3 py-3 text-xs text-gray-400">
              {byNumber ? `No existe el distribuidor #${numberQuery.trim()}` : 'Sin coincidencias'}
            </div>
          ) : (
            results.map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() => pick(c)}
                className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-[#3E667D]/5"
              >
                <span className="w-20 shrink-0 font-mono text-xs text-gray-500">#{c.customerNumber ?? '—'}</span>
                <span className="min-w-0 flex-1 truncate text-gray-900">{fullName(c)}</span>
                {c.email ? <span className="hidden max-w-[180px] truncate text-xs text-gray-400 md:inline">{c.email}</span> : null}
                <span className={`rounded-full px-1.5 py-0.5 text-[10px] font-medium ${STATUS_BADGE[c.status] ?? 'bg-gray-100 text-gray-600'}`}>
                  {c.status}
                </span>
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}
