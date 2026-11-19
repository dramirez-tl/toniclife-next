// seasonal-promotion-branches.ts — En qué SUCURSALES vale una promoción de temporada
// (mig 212, 18-nov-2026). Lógica PURA del selector del admin.
//
// Regla del servidor (lib/seasonal-branches del API):
//   - "Todas las sucursales" = todas las de los países de la promoción (lo de siempre).
//   - "Solo algunas" = en la CAJA (sucursales y Call Center en modo staff) vale solo en
//     esas. La tienda en línea no depende de la sucursal: si el canal está marcado, ahí
//     sigue valiendo para todo el país.

import type { SeasonalPromoChannel } from '@/types/seasonal-promotion';

export type PromotionBranchMode = 'all' | 'some';

export const BRANCH_MODE_OPTIONS: { value: PromotionBranchMode; label: string }[] = [
  { value: 'all', label: 'Todas las sucursales' },
  { value: 'some', label: 'Solo algunas' },
];

/** Lo mínimo de una sucursal del catálogo (GET /branches/active). */
export interface BranchLike {
  id: string;
  code: string;
  name: string;
  countryId?: string | null;
}

interface CountryLike {
  id: string;
  code: string;
  name: string;
}

export interface BranchOption {
  id: string;
  code: string;
  name: string;
  countryId: string;
  countryCode: string;
  countryName: string;
}

export interface BranchOptionGroup {
  countryId: string;
  countryCode: string;
  countryName: string;
  options: BranchOption[];
}

const fold = (text: string): string =>
  text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();

/** Países donde corre la promoción: los suyos o, si no restringe, los de la temporada. */
export function promotionCountryIds(seasonCountries: readonly CountryLike[], ownCountryIds: readonly string[]): string[] {
  const season = seasonCountries.map((c) => c.id);
  const own = ownCountryIds.filter((id) => season.includes(id));
  return own.length > 0 ? own : season;
}

/**
 * Sucursales que se pueden elegir: las activas de los países de la promoción, por país
 * (en el orden de la temporada) y por clave.
 */
export function eligibleBranchOptions(
  branches: readonly BranchLike[],
  seasonCountries: readonly CountryLike[],
  ownCountryIds: readonly string[],
): BranchOption[] {
  const countryIds = promotionCountryIds(seasonCountries, ownCountryIds);
  const order = new Map(countryIds.map((id, i) => [id, i]));
  const byId = new Map(seasonCountries.map((c) => [c.id, c]));
  return branches
    .filter((b) => !!b.countryId && order.has(b.countryId))
    .map((b) => {
      const country = byId.get(b.countryId as string) as CountryLike;
      return {
        id: b.id,
        code: b.code,
        name: b.name,
        countryId: country.id,
        countryCode: country.code,
        countryName: country.name,
      };
    })
    .sort(
      (a, b) =>
        (order.get(a.countryId) ?? 0) - (order.get(b.countryId) ?? 0) ||
        a.code.localeCompare(b.code, 'es', { numeric: true }) ||
        a.name.localeCompare(b.name, 'es'),
    );
}

/** Filtra por clave o nombre, sin importar acentos ni mayúsculas. */
export function filterBranchOptions(options: readonly BranchOption[], search: string): BranchOption[] {
  const term = fold(search);
  if (!term) return [...options];
  return options.filter((o) => fold(`${o.code} ${o.name}`).includes(term));
}

export function groupBranchOptions(options: readonly BranchOption[]): BranchOptionGroup[] {
  const groups: BranchOptionGroup[] = [];
  for (const option of options) {
    let group = groups.find((g) => g.countryId === option.countryId);
    if (!group) {
      group = {
        countryId: option.countryId,
        countryCode: option.countryCode,
        countryName: option.countryName,
        options: [],
      };
      groups.push(group);
    }
    group.options.push(option);
  }
  return groups;
}

export function addBranchIds(selected: readonly string[], toAdd: readonly string[]): string[] {
  return [...new Set([...selected, ...toAdd])];
}

export function removeBranchIds(selected: readonly string[], toRemove: readonly string[]): string[] {
  return selected.filter((id) => !toRemove.includes(id));
}

/**
 * Al cambiar los países de la promoción: se quitan las sucursales elegidas que ya no son
 * de esos países. Una sucursal que no está en el catálogo activo (se desactivó después)
 * se conserva: no se sabe de qué país es y el servidor la sigue aceptando.
 */
export function pruneBranchIdsByCountry(
  selected: readonly string[],
  branches: readonly BranchLike[],
  seasonCountries: readonly CountryLike[],
  ownCountryIds: readonly string[],
): { kept: string[]; removed: string[] } {
  const countryIds = promotionCountryIds(seasonCountries, ownCountryIds);
  const byId = new Map(branches.map((b) => [b.id, b]));
  const kept: string[] = [];
  const removed: string[] = [];
  for (const id of selected) {
    const branch = byId.get(id);
    if (branch && (!branch.countryId || !countryIds.includes(branch.countryId))) removed.push(id);
    else kept.push(id);
  }
  return { kept, removed };
}

/**
 * Sucursales elegidas que ya no se pueden elegir (se desactivaron o ya no son de los
 * países de la promoción): se muestran aparte para poder quitarlas.
 */
export function unavailableSelectedBranches(
  selected: readonly string[],
  options: readonly BranchOption[],
  known: readonly { id: string; code: string; name: string }[],
): { id: string; code: string; name: string }[] {
  const eligible = new Set(options.map((o) => o.id));
  const byId = new Map(known.map((b) => [b.id, b]));
  return selected
    .filter((id) => !eligible.has(id))
    .map((id) => byId.get(id) ?? { id, code: '', name: 'Sucursal que ya no está en el catálogo' });
}

/** Qué significa la elección, según los canales de la promoción. */
export function branchScopeHint(mode: PromotionBranchMode, channels: readonly SeasonalPromoChannel[]): string {
  if (mode === 'all') return 'Vale en todas las sucursales de los países de la promoción.';
  const pos = channels.includes('pos');
  const online = channels.includes('online');
  if (pos && online) {
    return (
      'En la caja vale solo en las sucursales elegidas (también cuando Call Center opera una de ellas). ' +
      'En la tienda en línea sigue valiendo para todo el país: si no la quieres en línea, desmarca ese canal.'
    );
  }
  if (pos) {
    return (
      'Vale solo en la caja de las sucursales elegidas (también cuando Call Center opera una de ellas). ' +
      'No se anuncia en la tienda en línea.'
    );
  }
  return 'El límite por sucursal solo cuenta en la caja: marca el canal "Sucursales y Call Center (POS)".';
}

/** Problemas de la elección de sucursales (para el botón Guardar). */
export function validatePromotionBranches(v: {
  branchMode: PromotionBranchMode;
  branchIds: readonly string[];
  channels: readonly SeasonalPromoChannel[];
}): string[] {
  if (v.branchMode !== 'some') return [];
  if (v.branchIds.length === 0) {
    return ['Elige al menos una sucursal, o cambia a "Todas las sucursales".'];
  }
  if (!v.channels.includes('pos')) {
    return [
      'El límite por sucursal solo cuenta en la caja: marca el canal "Sucursales y Call Center (POS)" o cambia a "Todas las sucursales".',
    ];
  }
  return [];
}

/**
 * Sucursales que viajan al guardar. `undefined` = no se manda el campo: la promoción no
 * tiene ni tenía límite, así el guardado sigue funcionando contra un API anterior.
 */
export function branchIdsForPayload(
  v: { branchMode: PromotionBranchMode; branchIds: readonly string[] },
  hadBranches: boolean,
): string[] | undefined {
  const ids = v.branchMode === 'some' ? [...new Set(v.branchIds)] : [];
  return ids.length > 0 || hadBranches ? ids : undefined;
}

/**
 * Resumen para la lista de promociones. null = sin límite (no se pinta nada).
 * "Solo 205 · USA Tulsa" · "Solo 3 sucursales: 205, 253, 254" · "Solo 12 sucursales".
 */
export function branchScopeSummary(
  branches: readonly { code: string; name: string }[] | null | undefined,
): string | null {
  const list = branches ?? [];
  if (list.length === 0) return null;
  if (list.length === 1) return `Solo ${[list[0].code, list[0].name].filter(Boolean).join(' · ')}`;
  if (list.length <= 4) return `Solo ${list.length} sucursales: ${list.map((b) => b.code || b.name).join(', ')}`;
  return `Solo ${list.length} sucursales`;
}
