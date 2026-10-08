// filters.ts — URL ↔ query del reporte de distribuidores de Comercial
// (/admin/comercial/distribuidores). La URL habla español
// (`?periodo=<uuid>&actividad=calificados&rango=3&pais=MX&orden=ventas&pagina=2`)
// y el API habla el DTO QueryDistributorsReportDto. Lógica pura, sin React:
// la página la usa con `useQueryFilters` (get/setParams). Mismas reglas que
// lib/network/filters.ts: un valor inválido se IGNORA; los defaults (página 1,
// 20 filas, orden puntos desc) NO se escriben en la URL.

import type {
  DistributorsReportQuery,
  DistributorsScopeQuery,
  ReportActivityFilter,
  ReportSort,
  ReportStatus,
} from '@/types/distributors-report';

export type OverviewKpi = 'total' | 'newThisPeriod' | 'active' | 'qualified' | 'toQualify' | 'atRisk';

/** Parámetros de la URL (ES). */
export const URL_PARAM = {
  period: 'periodo',
  search: 'q',
  activity: 'actividad',
  status: 'estado',
  rank: 'rango',
  joined: 'alta',
  country: 'pais',
  branch: 'sucursal',
  sort: 'orden',
  page: 'pagina',
  limit: 'limite',
} as const;

export const ACTIVITY_PARAM: Record<ReportActivityFilter, string> = {
  active: 'conPuntos',
  none: 'sinPuntos',
  qualified: 'calificados',
  toQualify: 'porCalificar',
  atRisk: 'enRiesgo',
};

export const STATUS_PARAM: Record<ReportStatus, string> = {
  active: 'activa',
  inactive: 'inactiva',
  suspended: 'suspendida',
  pending: 'pendiente',
};

export const STATUS_LABEL: Record<ReportStatus, string> = {
  active: 'Activa',
  inactive: 'Inactiva',
  suspended: 'Suspendida',
  pending: 'Pendiente',
};

/** `orden=` → sortBy/sortOrder del DTO. `puntos` es el orden por defecto (no se escribe). */
export const SORT_PARAM: Record<string, { sortBy: ReportSort; sortOrder: 'asc' | 'desc' }> = {
  puntos: { sortBy: 'points', sortOrder: 'desc' },
  'puntos-asc': { sortBy: 'points', sortOrder: 'asc' },
  ventas: { sortBy: 'sales', sortOrder: 'desc' },
  grupo: { sortBy: 'groupPoints', sortOrder: 'desc' },
  rango: { sortBy: 'rank', sortOrder: 'desc' },
  recientes: { sortBy: 'joinDate', sortOrder: 'desc' },
  antiguos: { sortBy: 'joinDate', sortOrder: 'asc' },
  nombre: { sortBy: 'name', sortOrder: 'asc' },
  numero: { sortBy: 'number', sortOrder: 'asc' },
};

export const SORT_LABEL: Record<string, string> = {
  puntos: 'Más puntos primero',
  'puntos-asc': 'Menos puntos primero',
  ventas: 'Más ventas primero',
  grupo: 'Más puntos de grupo primero',
  rango: 'Rango más alto primero',
  recientes: 'Alta más reciente',
  antiguos: 'Alta más antigua',
  nombre: 'Nombre A→Z',
  numero: 'Número de socio',
};

export const DEFAULT_SORT = 'puntos';
export const MAX_RANK_FILTER = 10;
export const PAGE_SIZES = [20, 50, 100] as const;
export const DEFAULT_PAGE_SIZE = 20;
export const SEARCH_MAX_LENGTH = 80;

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const COUNTRY_RE = /^[A-Za-z]{2}$/;

const invert = <K extends string>(map: Record<K, string>): Record<string, K> =>
  Object.fromEntries(Object.entries(map).map(([k, v]) => [v, k])) as Record<string, K>;

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
export function urlToQuery(source: ParamSource): DistributorsReportQuery {
  const read = readerOf(source);
  const sortDefault = SORT_PARAM[DEFAULT_SORT];
  const query: DistributorsReportQuery = {
    page: 1,
    limit: DEFAULT_PAGE_SIZE,
    sortBy: sortDefault.sortBy,
    sortOrder: sortDefault.sortOrder,
  };

  const search = read(URL_PARAM.search);
  if (isSearchable(search)) query.search = search;

  const activity = ACTIVITY_BY_PARAM[read(URL_PARAM.activity)];
  if (activity) query.activity = activity;

  const status = STATUS_BY_PARAM[read(URL_PARAM.status)];
  if (status) query.status = status;

  const rank = intInRange(read(URL_PARAM.rank), 1, MAX_RANK_FILTER);
  if (rank !== undefined) query.rankNumber = rank;

  const joined = read(URL_PARAM.joined);
  if (isUuid(joined)) query.joinedPeriodId = joined;

  const country = read(URL_PARAM.country);
  if (COUNTRY_RE.test(country)) query.countryCode = country.toUpperCase();

  const branch = read(URL_PARAM.branch);
  if (isUuid(branch)) query.branchId = branch;

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
export function sortToParam(sortBy: ReportSort | undefined, sortOrder: 'asc' | 'desc' | undefined): string | null {
  const entry = Object.entries(SORT_PARAM).find(
    ([, v]) => v.sortBy === (sortBy ?? 'points') && v.sortOrder === (sortOrder ?? (sortBy === 'name' || sortBy === 'number' ? 'asc' : 'desc')),
  );
  const key = entry ? entry[0] : null;
  return key === DEFAULT_SORT ? null : key;
}

/** Alcance (resumen y lista): periodo, país, sucursal y estado. */
export function scopeOf(query: DistributorsReportQuery): DistributorsScopeQuery {
  const scope: DistributorsScopeQuery = {};
  if (query.periodId) scope.periodId = query.periodId;
  if (query.countryCode) scope.countryCode = query.countryCode;
  if (query.branchId) scope.branchId = query.branchId;
  if (query.status) scope.status = query.status;
  return scope;
}

/** Filtros que se pueden "limpiar" (no incluye periodo, orden ni paginación). */
export const LIST_FILTER_PARAMS = [
  URL_PARAM.search,
  URL_PARAM.activity,
  URL_PARAM.status,
  URL_PARAM.rank,
  URL_PARAM.joined,
  URL_PARAM.country,
  URL_PARAM.branch,
] as const;

export function hasListFilters(query: DistributorsReportQuery): boolean {
  return Boolean(
    query.search ||
      query.activity ||
      query.status ||
      query.rankNumber !== undefined ||
      query.joinedPeriodId ||
      query.countryCode ||
      query.branchId,
  );
}

/** Parche que quita todos los filtros y vuelve a la página 1. */
export function clearFiltersPatch(): Record<string, string | null> {
  const patch: Record<string, string | null> = { [URL_PARAM.page]: null };
  for (const key of LIST_FILTER_PARAMS) patch[key] = null;
  return patch;
}

/**
 * Tocar una ficha del resumen aplica el filtro equivalente en la lista:
 * total = sin actividad ni alta; nuevos = alta en el periodo mostrado; las
 * demás = actividad.
 */
export function kpiToFilter(kpi: OverviewKpi, periodId?: string | null): Record<string, string | null> {
  const base: Record<string, string | null> = {
    [URL_PARAM.page]: null,
    [URL_PARAM.activity]: null,
    [URL_PARAM.joined]: null,
  };
  if (kpi === 'total') return base;
  if (kpi === 'newThisPeriod') return { ...base, [URL_PARAM.joined]: isUuid(periodId) ? periodId : null };
  return { ...base, [URL_PARAM.activity]: ACTIVITY_PARAM[kpi] };
}

/** Importe con moneda ("$3,299.99 MXN" / "US$75.00"). */
export function fmtMoney(value: number | null | undefined, currency: 'MXN' | 'USD'): string {
  const n = typeof value === 'number' && Number.isFinite(value) ? value : 0;
  const text = new Intl.NumberFormat(currency === 'USD' ? 'en-US' : 'es-MX', {
    style: 'currency',
    currency,
    maximumFractionDigits: 0,
  }).format(n);
  return currency === 'MXN' ? `${text} MXN` : text;
}
