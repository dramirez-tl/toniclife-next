'use client';

// Sucursales de UNA promoción de temporada (mig 212): "Todas las sucursales" o
// "Solo algunas". Con "Solo algunas" se eligen de la lista de sucursales activas
// de los países de la promoción (por país, con buscador y "marcar todas").
//
// La regla vive en lib/seasonal-promotion-branches: el límite cuenta en la caja
// (sucursales y Call Center en modo staff); la tienda en línea no depende de la
// sucursal.

import { useId, useMemo, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { MagnifyingGlassIcon, XMarkIcon } from '@heroicons/react/24/outline';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import type { SeasonCountry, SeasonalPromoChannel } from '@/types/seasonal-promotion';
import { FLAGS } from '@/lib/seasonal-promotions';
import {
  BRANCH_MODE_OPTIONS,
  addBranchIds,
  branchScopeHint,
  eligibleBranchOptions,
  filterBranchOptions,
  groupBranchOptions,
  removeBranchIds,
  unavailableSelectedBranches,
  type BranchLike,
  type PromotionBranchMode,
} from '@/lib/seasonal-promotion-branches';

interface PromotionBranchesSectionProps {
  seasonCountries: SeasonCountry[];
  /** Países propios de la promoción (vacío = los de la temporada). */
  countryIds: string[];
  channels: SeasonalPromoChannel[];
  mode: PromotionBranchMode;
  branchIds: string[];
  /** Sucursales que la promoción ya tenía guardadas (para nombrar las que ya no están activas). */
  savedBranches: { id: string; code: string; name: string }[];
  /** Catálogo de sucursales activas; undefined = todavía carga. */
  branches: BranchLike[] | undefined;
  loading: boolean;
  failed: boolean;
  onRetry: () => void;
  readOnly: boolean;
  onChange: (patch: { branchMode?: PromotionBranchMode; branchIds?: string[] }) => void;
}

export function PromotionBranchesSection({
  seasonCountries,
  countryIds,
  channels,
  mode,
  branchIds,
  savedBranches,
  branches,
  loading,
  failed,
  onRetry,
  readOnly,
  onChange,
}: PromotionBranchesSectionProps) {
  const uid = useId();
  const [search, setSearch] = useState('');

  const options = useMemo(
    () => eligibleBranchOptions(branches ?? [], seasonCountries, countryIds),
    [branches, seasonCountries, countryIds],
  );
  const groups = useMemo(() => groupBranchOptions(filterBranchOptions(options, search)), [options, search]);
  const selected = useMemo(() => new Set(branchIds), [branchIds]);
  // Mientras el catálogo no llega no se puede saber cuáles "ya no están": no se avisa de más.
  const unavailable = branches ? unavailableSelectedBranches(branchIds, options, savedBranches) : [];
  const searching = search.trim().length > 0;
  const visibleCount = groups.reduce((n, g) => n + g.options.length, 0);

  const toggle = (id: string, on: boolean) =>
    onChange({ branchIds: on ? addBranchIds(branchIds, [id]) : removeBranchIds(branchIds, [id]) });

  return (
    <div className="space-y-3 rounded-lg border border-gray-200 p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p id={`${uid}-title`} className="text-sm font-semibold text-gray-800">
          Sucursales
        </p>
        <div role="radiogroup" aria-labelledby={`${uid}-title`} className="flex flex-wrap gap-1.5">
          {BRANCH_MODE_OPTIONS.map((o) => {
            const active = mode === o.value;
            return (
              <button
                key={o.value}
                type="button"
                role="radio"
                aria-checked={active}
                disabled={readOnly}
                onClick={() => onChange({ branchMode: o.value })}
                className={`min-h-9 rounded-full px-3.5 py-1.5 text-sm font-medium disabled:cursor-not-allowed disabled:opacity-60 ${
                  active ? 'bg-[#3E667D] text-white' : 'bg-white text-gray-700 ring-1 ring-gray-300 hover:bg-gray-100'
                }`}
              >
                {o.label}
              </button>
            );
          })}
        </div>
      </div>
      <p className="text-xs text-gray-600">{branchScopeHint(mode, channels)}</p>

      {mode === 'some' && (
        <>
          {unavailable.length > 0 && (
            <div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">
              <p className="font-semibold">
                {unavailable.length === 1
                  ? 'Esta sucursal elegida ya no se puede usar (está inactiva o no es de los países de la promoción):'
                  : 'Estas sucursales elegidas ya no se pueden usar (están inactivas o no son de los países de la promoción):'}
              </p>
              <ul className="mt-1 flex flex-wrap gap-1.5">
                {unavailable.map((b) => (
                  <li
                    key={b.id}
                    className="inline-flex items-center gap-1 rounded-full bg-white px-2 py-0.5 ring-1 ring-amber-300"
                  >
                    <span>{[b.code, b.name].filter(Boolean).join(' · ')}</span>
                    {!readOnly && (
                      <button
                        type="button"
                        onClick={() => toggle(b.id, false)}
                        className="rounded-full p-0.5 hover:bg-amber-100"
                        aria-label={`Quitar ${b.name}`}
                      >
                        <XMarkIcon className="h-3 w-3" />
                      </button>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {loading ? (
            <p className="flex items-center gap-2 text-sm text-gray-600">
              <Loader2 className="h-4 w-4 animate-spin" /> Cargando sucursales…
            </p>
          ) : failed ? (
            <div className="flex flex-wrap items-center gap-2 text-sm text-red-700">
              <span>No se pudieron cargar las sucursales.</span>
              <Button type="button" variant="outline" size="sm" onClick={onRetry}>
                Reintentar
              </Button>
            </div>
          ) : (
            <>
              <div className="relative">
                <MagnifyingGlassIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                <Input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Buscar sucursal por clave o nombre…"
                  aria-label="Buscar sucursal"
                  className="pl-9"
                />
              </div>
              <div className="max-h-64 overflow-y-auto rounded-md border border-gray-200">
                {groups.length === 0 ? (
                  <p className="px-3 py-4 text-center text-sm text-gray-500">
                    {options.length === 0
                      ? 'No hay sucursales activas en los países de la promoción.'
                      : 'Ninguna sucursal coincide con la búsqueda.'}
                  </p>
                ) : (
                  groups.map((g) => {
                    const ids = g.options.map((o) => o.id);
                    const chosen = ids.filter((id) => selected.has(id)).length;
                    const allChosen = chosen === ids.length;
                    return (
                      <div key={g.countryId}>
                        <div className="sticky top-0 z-10 flex items-center justify-between gap-2 border-b border-gray-200 bg-gray-50 px-3 py-1.5">
                          <span className="text-xs font-semibold text-gray-700">
                            {FLAGS[g.countryCode] ?? ''} {g.countryName} · {chosen} de {ids.length}
                            {searching ? ' que coinciden' : ''}
                          </span>
                          {!readOnly && (
                            <button
                              type="button"
                              onClick={() =>
                                onChange({
                                  branchIds: allChosen ? removeBranchIds(branchIds, ids) : addBranchIds(branchIds, ids),
                                })
                              }
                              className="text-xs font-semibold text-[#3E667D] hover:underline"
                            >
                              {allChosen
                                ? searching
                                  ? 'Quitar las que coinciden'
                                  : 'Quitar todas'
                                : searching
                                  ? `Marcar las ${ids.length} que coinciden`
                                  : 'Marcar todas'}
                            </button>
                          )}
                        </div>
                        <ul>
                          {g.options.map((o) => (
                            <li key={o.id}>
                              <label className="flex cursor-pointer items-start gap-2 px-3 py-1.5 text-sm text-gray-800 hover:bg-gray-50">
                                <Checkbox
                                  checked={selected.has(o.id)}
                                  onCheckedChange={(v) => toggle(o.id, v === true)}
                                  disabled={readOnly}
                                  className="mt-0.5"
                                />
                                <span className="mt-0.5 font-mono text-xs text-gray-500">{o.code}</span>
                                {/* El nombre baja de renglón (no se corta): uno largo no ensancha el diálogo en teléfono. */}
                                <span className="min-w-0 flex-1 break-words">{o.name}</span>
                              </label>
                            </li>
                          ))}
                        </ul>
                      </div>
                    );
                  })
                )}
              </div>
              <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-gray-600">
                <span aria-live="polite">
                  {branchIds.length === 0
                    ? 'Ninguna sucursal elegida.'
                    : branchIds.length === 1
                      ? '1 sucursal elegida.'
                      : `${branchIds.length} sucursales elegidas.`}
                  {searching ? ` Se ${visibleCount === 1 ? 've' : 'ven'} ${visibleCount} de ${options.length}.` : ''}
                </span>
                {!readOnly && branchIds.length > 0 && (
                  <button
                    type="button"
                    onClick={() => onChange({ branchIds: [] })}
                    className="font-semibold text-gray-600 hover:underline"
                  >
                    Quitar todas las elegidas
                  </button>
                )}
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
}
