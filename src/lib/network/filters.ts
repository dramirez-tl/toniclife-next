// filters.ts — URL ↔ query de la Lista de "Mi red" (contrato /distribuidor/red
// §3.2 y §5). La URL habla español (`?tab=lista&actividad=enRiesgo&nivel=3
// &orden=puntos&bajo=<memberId>&periodo=<uuid>&pagina=2&limite=50`) y el API
// habla el DTO QueryNetworkMembersDto (`activity=atRisk&level=3&sortBy=points…`).
// Lógica pura, sin React: la página la usa con `useQueryFilters` (get/setParams).
//
// Reglas:
// - Un valor inválido en la URL se IGNORA (no rompe la página ni llega al API,
//   cuyo ValidationPipe rechazaría con 400).
// - Ida y vuelta estable: urlToQuery(queryToUrl(q)) ≡ q; los valores por
//   defecto (página 1, 20 filas, orden nivel asc) NO se escriben en la URL.
// - `setParams` de useQueryFilters solo borra `page` sola; aquí el parámetro es
//   `pagina`, por eso cada parche de filtro incluye `pagina: null`.

import type {
  NetworkActivityFilter,
  NetworkMemberStatus,
  NetworkMembersQuery,
  NetworkMembersSort,
} from '@/types/network';

export type NetworkTab = 'explore' | 'list' | 'volume';
export type OverviewKpi = 'total' | 'active' | 'qualified' | 'toQualify' | 'atRisk' | 'newThisPeriod';

/** Parámetros de la URL (ES). */
export const URL_PARAM = {
  tab: 'tab',
  period: 'periodo',
  search: 'q',
  level: 'nivel',
  activity: 'actividad',
  status: 'estado',
  rank: 'rango',
  joined: 'ingreso',
  under: 'bajo',
  sort: 'orden',
  page: 'pagina',
  limit: 'limite',
} as const;

export const TAB_PARAM: Record<NetworkTab, string> = { explore: 'explorar', list: 'lista', volume: 'volumen' };
export const DEFAULT_TAB: NetworkTab = 'explore';

export const ACTIVITY_PARAM: Record<NetworkActivityFilter, string> = {
  active: 'conPuntos',
  none: 'sinPuntos',
  qualified: 'calificados',
  toQualify: 'porCalificar',
  atRisk: 'enRiesgo',
};

export const STATUS_PARAM: Record<NetworkMemberStatus, string> = {
  active: 'activo',
  inactive: 'inactivo',
  suspended: 'suspendido',
};

/** `orden=` → sortBy/sortOrder del DTO. `nivel` es el orden por defecto (no se escribe). */
export const SORT_PARAM: Record<string, { sortBy: NetworkMembersSort; sortOrder: 'asc' | 'desc' }> = {
  nivel: { sortBy: 'level', sortOrder: 'asc' },
  'nivel-desc': { sortBy: 'level', sortOrder: 'desc' },
  puntos: { sortBy: 'points', sortOrder: 'asc' },
  recientes: { sortBy: 'joinDate', sortOrder: 'asc' },
  nombre: { sortBy: 'name', sortOrder: 'asc' },
};

/** `nivel=mas15` = más de 15 niveles por debajo (levelDeeper). */
export const LEVEL_DEEPER_PARAM = 'mas15';
export const MAX_LEVEL_FILTER = 15;
export const MAX_RANK_FILTER = 10;
export const PAGE_SIZES = [20, 50, 100] as const;
export const DEFAULT_PAGE_SIZE = 20;
export const SEARCH_MAX_LENGTH = 80;

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const invert = <K extends string>(map: Record<K, string>): Record<string, K> =>
  Object.fromEntries(Object.entries(map).map(([k, v]) => [v, k])) as Record<string, K>;

const TAB_BY_PARAM = invert(TAB_PARAM);
const ACTIVITY_BY_PARAM = invert(ACTIVITY_PARAM);
const STATUS_BY_PARAM = invert(STATUS_PARAM);

export function isUuid(value: string | null | undefined): value is string {
  return typeof value === 'string' && UUID_RE.test(value);
}

/** Mínimo para buscar: 2 caracteres, o 1 si es solo dígitos (número de socio). */
export function isSearchable(value: string | null | undefined): boolean {
  const text = (value ?? '').trim();
  if (!text || text.length > SEARCH_MAX_LENGTH) return false;
  return text.length >= 2 || /^\d+$/.test(text);
}

export function parseTab(value: string | null | undefined): NetworkTab {
  return (value && TAB_BY_PARAM[value]) || DEFAULT_TAB;
}

type ParamSource = { get(key: string): string | null } | Record<string, string | null | undefined>;

const readerOf = (source: ParamSource): ((key: string) => string) => {
  if (typeof (source as { get?: unknown }).get === 'function') {
    const params = source as { get(key: string): string | null };
    return (key) => (params.get(key) ?? '').trim();
  }
  const record = source as Record<string, string | null | undefined>;
  return (key) => (record[key] ?? '').trim();
};

const intInRange = (value: string, min: number, max: number): number | undefined => {
  if (!/^\d+$/.test(value)) return undefined;
  const n = Number(value);
  return n >= min && n <= max ? n : undefined;
};

/**
 * Lee los parámetros de la URL y arma la query del API. Siempre trae `page`,
 * `limit`, `sortBy` y `sortOrder` (con sus defaults) para que la clave de
 * React Query sea estable; lo demás solo si es válido.
 */
export function urlToQuery(source: ParamSource): NetworkMembersQuery {
  const read = readerOf(source);
  const query: NetworkMembersQuery = { page: 1, limit: DEFAULT_PAGE_SIZE, sortBy: 'level', sortOrder: 'asc' };

  const search = read(URL_PARAM.search);
  if (isSearchable(search)) query.search = search;

  const level = read(URL_PARAM.level);
  if (level === LEVEL_DEEPER_PARAM) query.levelDeeper = true;
  else {
    const n = intInRange(level, 1, MAX_LEVEL_FILTER);
    if (n !== undefined) query.level = n;
  }

  const activity = ACTIVITY_BY_PARAM[read(URL_PARAM.activity)];
  if (activity) query.activity = activity;

  const status = STATUS_BY_PARAM[read(URL_PARAM.status)];
  if (status) query.status = status;

  const rank = intInRange(read(URL_PARAM.rank), 1, MAX_RANK_FILTER);
  if (rank !== undefined) query.rankNumber = rank;

  const joined = read(URL_PARAM.joined);
  if (isUuid(joined)) query.joinedPeriodId = joined;

  const under = read(URL_PARAM.under);
  if (isUuid(under)) query.under = under;

  const period = read(URL_PARAM.period);
  if (isUuid(period)) query.periodId = period;

  const sort = SORT_PARAM[read(URL_PARAM.sort)];
  if (sort) {
    query.sortBy = sort.sortBy;
    query.sortOrder = sort.sortOrder;
  }

  const page = intInRange(read(URL_PARAM.page), 1, 1_000_000);
  if (page !== undefined) query.page = page;

  const limit = intInRange(read(URL_PARAM.limit), 1, 100);
  if (limit !== undefined && (PAGE_SIZES as readonly number[]).includes(limit)) query.limit = limit;

  return query;
}

/** `orden=` que corresponde a un sortBy/sortOrder (null = orden por defecto). */
export function sortToParam(sortBy: NetworkMembersSort | undefined, sortOrder: 'asc' | 'desc' | undefined): string | null {
  if (!sortBy || sortBy === 'level') return sortOrder === 'desc' ? 'nivel-desc' : null;
  const entry = Object.entries(SORT_PARAM).find(([, v]) => v.sortBy === sortBy);
  return entry ? entry[0] : null;
}

/**
 * Parche para `setParams` a partir de una query: cada parámetro con su valor o
 * null (= quitarlo de la URL). Los defaults no se escriben.
 */
export function queryToUrl(query: NetworkMembersQuery): Record<string, string | null> {
  return {
    [URL_PARAM.search]: query.search && isSearchable(query.search) ? query.search.trim() : null,
    [URL_PARAM.level]: query.levelDeeper
      ? LEVEL_DEEPER_PARAM
      : query.level && query.level >= 1 && query.level <= MAX_LEVEL_FILTER
        ? String(query.level)
        : null,
    [URL_PARAM.activity]: query.activity ? (ACTIVITY_PARAM[query.activity] ?? null) : null,
    [URL_PARAM.status]: query.status ? (STATUS_PARAM[query.status] ?? null) : null,
    [URL_PARAM.rank]:
      query.rankNumber && query.rankNumber >= 1 && query.rankNumber <= MAX_RANK_FILTER ? String(query.rankNumber) : null,
    [URL_PARAM.joined]: isUuid(query.joinedPeriodId) ? query.joinedPeriodId : null,
    [URL_PARAM.under]: isUuid(query.under) ? query.under : null,
    [URL_PARAM.period]: isUuid(query.periodId) ? query.periodId : null,
    [URL_PARAM.sort]: sortToParam(query.sortBy, query.sortOrder),
    [URL_PARAM.page]: query.page && query.page > 1 ? String(query.page) : null,
    [URL_PARAM.limit]:
      query.limit && query.limit !== DEFAULT_PAGE_SIZE && (PAGE_SIZES as readonly number[]).includes(query.limit)
        ? String(query.limit)
        : null,
  };
}

/** Filtros de la Lista que se pueden "limpiar" (no incluye periodo, orden ni paginación). */
export const LIST_FILTER_PARAMS = [
  URL_PARAM.search,
  URL_PARAM.level,
  URL_PARAM.activity,
  URL_PARAM.status,
  URL_PARAM.rank,
  URL_PARAM.joined,
  URL_PARAM.under,
] as const;

/** ¿Hay algún filtro de la Lista aplicado (búsqueda, nivel, actividad, estado, rango, ingreso, línea)? */
export function hasListFilters(query: NetworkMembersQuery): boolean {
  return Boolean(
    query.search ||
      query.level !== undefined ||
      query.levelDeeper ||
      query.activity ||
      query.status ||
      query.rankNumber !== undefined ||
      query.joinedPeriodId ||
      query.under,
  );
}

/** Parche que quita todos los filtros de la Lista y vuelve a la página 1. */
export function clearFiltersPatch(): Record<string, string | null> {
  const patch: Record<string, string | null> = { [URL_PARAM.page]: null };
  for (const key of LIST_FILTER_PARAMS) patch[key] = null;
  return patch;
}

/**
 * Tocar una ficha de la tira lleva a la Lista con el filtro equivalente
 * (§5.2): total = sin filtro de actividad; nuevos = ingreso en el periodo
 * elegido (se necesita su id); las demás = actividad.
 */
export function kpiToFilter(kpi: OverviewKpi, periodId?: string | null): Record<string, string | null> {
  const base: Record<string, string | null> = {
    [URL_PARAM.tab]: TAB_PARAM.list,
    [URL_PARAM.page]: null,
    [URL_PARAM.activity]: null,
    [URL_PARAM.joined]: null,
  };
  if (kpi === 'total') return base;
  if (kpi === 'newThisPeriod') return { ...base, [URL_PARAM.joined]: isUuid(periodId) ? periodId : null };
  return { ...base, [URL_PARAM.activity]: ACTIVITY_PARAM[kpi] };
}

/** Parche para acotar la Lista a la línea de un socio (`bajo=`), desde el explorador o la ficha. */
export function underLinePatch(memberId: string | null): Record<string, string | null> {
  return {
    [URL_PARAM.tab]: TAB_PARAM.list,
    [URL_PARAM.page]: null,
    [URL_PARAM.under]: isUuid(memberId) ? memberId : null,
  };
}

export interface LevelOption {
  /** Valor para `nivel=` en la URL ('1'…'15' o 'mas15'). */
  value: string;
  /** Nivel exacto (1..15); ausente en la opción "más de 15". */
  level?: number;
  deeper?: boolean;
}

/** Opciones del filtro Nivel: 1..min(maxLevel, 15) y "Más de 15" si la red baja más. */
export function levelOptions(maxLevel: number | null | undefined): LevelOption[] {
  const max = Math.max(0, Math.floor(maxLevel ?? 0));
  const options: LevelOption[] = [];
  for (let level = 1; level <= Math.min(max, MAX_LEVEL_FILTER); level += 1) {
    options.push({ value: String(level), level });
  }
  if (max > MAX_LEVEL_FILTER) options.push({ value: LEVEL_DEEPER_PARAM, deeper: true });
  return options;
}

/** Filtro de nivel activo en la URL como valor del select ('' = todos). */
export function levelParamOf(query: NetworkMembersQuery): string {
  if (query.levelDeeper) return LEVEL_DEEPER_PARAM;
  return query.level ? String(query.level) : '';
}
