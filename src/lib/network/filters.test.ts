import { describe, expect, it } from 'vitest';
import {
  ACTIVITY_PARAM,
  LEVEL_DEEPER_PARAM,
  clearFiltersPatch,
  hasListFilters,
  isSearchable,
  isUuid,
  kpiToFilter,
  levelOptions,
  levelParamOf,
  parseTab,
  queryToUrl,
  searchBoxAction,
  searchChangedOutside,
  sortToParam,
  underLinePatch,
  urlToQuery,
  URL_PARAM,
} from './filters';
import type { NetworkMembersQuery } from '@/types/network';

const PERIOD = '11111111-2222-4333-8444-555555555555';
const MEMBER = 'aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee';

const params = (qs: string) => new URLSearchParams(qs);

describe('urlToQuery', () => {
  it('sin parámetros ⇒ solo defaults estables', () => {
    expect(urlToQuery(params(''))).toEqual({ page: 1, limit: 20, sortBy: 'level', sortOrder: 'asc' });
    expect(urlToQuery({})).toEqual({ page: 1, limit: 20, sortBy: 'level', sortOrder: 'asc' });
  });

  it('traduce cada parámetro español al DTO del API', () => {
    const q = urlToQuery(
      params(
        `q=garcia&nivel=3&actividad=enRiesgo&estado=inactivo&rango=4&ingreso=${PERIOD}&bajo=${MEMBER}&periodo=${PERIOD}&orden=puntos&pagina=2&limite=50`,
      ),
    );
    expect(q).toEqual({
      search: 'garcia',
      level: 3,
      activity: 'atRisk',
      status: 'inactive',
      rankNumber: 4,
      joinedPeriodId: PERIOD,
      under: MEMBER,
      periodId: PERIOD,
      sortBy: 'points',
      sortOrder: 'asc',
      page: 2,
      limit: 50,
    });
  });

  it('mapa completo de actividad, estado y orden', () => {
    expect(urlToQuery(params('actividad=conPuntos')).activity).toBe('active');
    expect(urlToQuery(params('actividad=sinPuntos')).activity).toBe('none');
    expect(urlToQuery(params('actividad=calificados')).activity).toBe('qualified');
    expect(urlToQuery(params('actividad=porCalificar')).activity).toBe('toQualify');
    expect(urlToQuery(params('estado=activo')).status).toBe('active');
    expect(urlToQuery(params('estado=suspendido')).status).toBe('suspended');
    expect(urlToQuery(params('orden=nivel-desc'))).toMatchObject({ sortBy: 'level', sortOrder: 'desc' });
    expect(urlToQuery(params('orden=recientes')).sortBy).toBe('joinDate');
    expect(urlToQuery(params('orden=nombre')).sortBy).toBe('name');
    expect(urlToQuery(params('orden=nivel'))).toMatchObject({ sortBy: 'level', sortOrder: 'asc' });
  });

  it('nivel=mas15 ⇒ levelDeeper (sin level)', () => {
    const q = urlToQuery(params(`nivel=${LEVEL_DEEPER_PARAM}`));
    expect(q.levelDeeper).toBe(true);
    expect(q.level).toBeUndefined();
  });

  it('valores inválidos se ignoran (no llegan al API)', () => {
    const q = urlToQuery(
      params('q=a&nivel=16&actividad=loQueSea&estado=muerto&rango=11&ingreso=no-uuid&bajo=123&periodo=x&orden=rarito&pagina=0&limite=33'),
    );
    expect(q).toEqual({ page: 1, limit: 20, sortBy: 'level', sortOrder: 'asc' });
    expect(urlToQuery(params('nivel=0')).level).toBeUndefined();
    expect(urlToQuery(params('nivel=-3')).level).toBeUndefined();
    expect(urlToQuery(params('nivel=3.5')).level).toBeUndefined();
    expect(urlToQuery(params('pagina=abc')).page).toBe(1);
    expect(urlToQuery(params('limite=100')).limit).toBe(100);
  });

  it('búsqueda: 2+ caracteres o 1 dígito; recorta espacios; tope 80', () => {
    expect(urlToQuery(params('q=%20ab%20')).search).toBe('ab');
    expect(urlToQuery(params('q=5')).search).toBe('5');
    expect(urlToQuery(params('q=a')).search).toBeUndefined();
    expect(urlToQuery(params(`q=${'x'.repeat(81)}`)).search).toBeUndefined();
    expect(urlToQuery(params(`q=${'x'.repeat(80)}`)).search).toHaveLength(80);
  });
});

describe('queryToUrl + ida y vuelta', () => {
  it('no escribe los defaults y sí lo demás', () => {
    expect(queryToUrl({ page: 1, limit: 20, sortBy: 'level', sortOrder: 'asc' })).toEqual({
      q: null,
      nivel: null,
      actividad: null,
      estado: null,
      rango: null,
      ingreso: null,
      bajo: null,
      periodo: null,
      orden: null,
      pagina: null,
      limite: null,
    });
    expect(
      queryToUrl({
        search: 'ana',
        levelDeeper: true,
        activity: 'toQualify',
        status: 'active',
        rankNumber: 2,
        joinedPeriodId: PERIOD,
        under: MEMBER,
        periodId: PERIOD,
        sortBy: 'level',
        sortOrder: 'desc',
        page: 3,
        limit: 100,
      }),
    ).toEqual({
      q: 'ana',
      nivel: LEVEL_DEEPER_PARAM,
      actividad: 'porCalificar',
      estado: 'activo',
      rango: '2',
      ingreso: PERIOD,
      bajo: MEMBER,
      periodo: PERIOD,
      orden: 'nivel-desc',
      pagina: '3',
      limite: '100',
    });
  });

  it('ida y vuelta estable para todas las combinaciones de orden y nivel', () => {
    const cases: NetworkMembersQuery[] = [
      { page: 1, limit: 20, sortBy: 'level', sortOrder: 'asc' },
      { page: 2, limit: 50, sortBy: 'points', sortOrder: 'asc', level: 7, activity: 'atRisk' },
      { page: 1, limit: 20, sortBy: 'joinDate', sortOrder: 'asc', levelDeeper: true, status: 'suspended' },
      { page: 9, limit: 100, sortBy: 'name', sortOrder: 'asc', search: '1234', rankNumber: 10, under: MEMBER },
      { page: 1, limit: 20, sortBy: 'level', sortOrder: 'desc', joinedPeriodId: PERIOD, periodId: PERIOD },
    ];
    for (const query of cases) {
      const url = queryToUrl(query);
      const record = Object.fromEntries(Object.entries(url).filter(([, v]) => v !== null));
      expect(urlToQuery(record)).toEqual(query);
      // Segunda vuelta idéntica.
      expect(queryToUrl(urlToQuery(record))).toEqual(url);
    }
  });

  it('sortToParam', () => {
    expect(sortToParam('level', 'asc')).toBeNull();
    expect(sortToParam(undefined, undefined)).toBeNull();
    expect(sortToParam('level', 'desc')).toBe('nivel-desc');
    expect(sortToParam('points', 'asc')).toBe('puntos');
    expect(sortToParam('joinDate', 'desc')).toBe('recientes');
    expect(sortToParam('name', 'asc')).toBe('nombre');
  });
});

describe('kpiToFilter', () => {
  it('cada ficha lleva a la Lista con su filtro y vuelve a la página 1', () => {
    expect(kpiToFilter('total')).toEqual({ tab: 'lista', pagina: null, actividad: null, ingreso: null });
    expect(kpiToFilter('active')).toMatchObject({ tab: 'lista', actividad: ACTIVITY_PARAM.active, ingreso: null });
    expect(kpiToFilter('qualified').actividad).toBe('calificados');
    expect(kpiToFilter('toQualify').actividad).toBe('porCalificar');
    expect(kpiToFilter('atRisk').actividad).toBe('enRiesgo');
    expect(kpiToFilter('newThisPeriod', PERIOD)).toEqual({ tab: 'lista', pagina: null, actividad: null, ingreso: PERIOD });
    // Sin periodo válido no se inventa el filtro de ingreso.
    expect(kpiToFilter('newThisPeriod', 'no-uuid').ingreso).toBeNull();
  });

  it('underLinePatch y clearFiltersPatch', () => {
    expect(underLinePatch(MEMBER)).toEqual({ tab: 'lista', pagina: null, bajo: MEMBER });
    expect(underLinePatch(null).bajo).toBeNull();
    expect(clearFiltersPatch()).toEqual({
      pagina: null,
      q: null,
      nivel: null,
      actividad: null,
      estado: null,
      rango: null,
      ingreso: null,
      bajo: null,
    });
  });
});

describe('levelOptions', () => {
  it('1..min(maxLevel,15) + más de 15', () => {
    expect(levelOptions(3)).toEqual([
      { value: '1', level: 1 },
      { value: '2', level: 2 },
      { value: '3', level: 3 },
    ]);
    const deep = levelOptions(34);
    expect(deep).toHaveLength(16);
    expect(deep[14]).toEqual({ value: '15', level: 15 });
    expect(deep[15]).toEqual({ value: LEVEL_DEEPER_PARAM, deeper: true });
    expect(levelOptions(15)).toHaveLength(15);
    expect(levelOptions(0)).toEqual([]);
    expect(levelOptions(null)).toEqual([]);
  });

  it('levelParamOf refleja la query', () => {
    expect(levelParamOf({ level: 4 })).toBe('4');
    expect(levelParamOf({ levelDeeper: true })).toBe(LEVEL_DEEPER_PARAM);
    expect(levelParamOf({})).toBe('');
  });
});

describe('utilidades', () => {
  it('parseTab', () => {
    expect(parseTab('explorar')).toBe('explore');
    expect(parseTab('lista')).toBe('list');
    expect(parseTab('volumen')).toBe('volume');
    expect(parseTab('')).toBe('explore');
    expect(parseTab('otra')).toBe('explore');
    expect(parseTab(null)).toBe('explore');
  });

  it('isSearchable / isUuid / hasListFilters', () => {
    expect(isSearchable('ab')).toBe(true);
    expect(isSearchable(' 7 ')).toBe(true);
    expect(isSearchable('a')).toBe(false);
    expect(isSearchable('')).toBe(false);
    expect(isSearchable(null)).toBe(false);
    expect(isUuid(PERIOD)).toBe(true);
    expect(isUuid(PERIOD.toUpperCase())).toBe(true);
    expect(isUuid('123')).toBe(false);
    expect(hasListFilters({ page: 2, limit: 50, sortBy: 'points' })).toBe(false);
    expect(hasListFilters({ search: 'x' })).toBe(true);
    expect(hasListFilters({ levelDeeper: true })).toBe(true);
    expect(hasListFilters({ under: MEMBER })).toBe(true);
  });
});

describe('caja de búsqueda ↔ URL (la URL manda)', () => {
  it('searchBoxAction: empuja texto buscable distinto, quita q con texto no buscable, nada si es igual', () => {
    expect(searchBoxAction('ab', '')).toEqual({ kind: 'push', search: 'ab' });
    expect(searchBoxAction(' ab ', 'ab')).toEqual({ kind: 'none' });
    expect(searchBoxAction('7', '')).toEqual({ kind: 'push', search: '7' });
    expect(searchBoxAction('x', '')).toEqual({ kind: 'none' });
    expect(searchBoxAction('', 'ab')).toEqual({ kind: 'clear' });
    expect(searchBoxAction('x', 'ab')).toEqual({ kind: 'clear' });
    expect(searchBoxAction('', '')).toEqual({ kind: 'none' });
  });

  it('Limpiar filtros / Atrás: q cambió por fuera ⇒ la caja se alinea y NO vuelve a filtrar con el texto viejo', () => {
    // La caja escribió "ab" y lo empujó a la URL: ese es el último q aplicado.
    let applied = '';
    const typed = searchBoxAction('ab', '');
    expect(typed.kind).toBe('push');
    if (typed.kind === 'push') applied = typed.search;
    // Su propio empuje no cuenta como cambio externo (no se pisa lo tecleado).
    expect(searchChangedOutside('ab', applied)).toBe(false);
    // "Limpiar filtros" quita q ⇒ cambio externo ⇒ la caja toma '' y aplica ''.
    expect(clearFiltersPatch()[URL_PARAM.search]).toBeNull();
    expect(searchChangedOutside('', applied)).toBe(true);
    applied = '';
    // Con la caja alineada, el debounce ya no empuja "ab" de vuelta (antes sí).
    expect(searchBoxAction('', '')).toEqual({ kind: 'none' });
    // Atrás del navegador a ?q=cd ⇒ la caja toma "cd" y no lo re-empuja.
    expect(searchChangedOutside('cd', applied)).toBe(true);
    applied = 'cd';
    expect(searchBoxAction('cd', 'cd')).toEqual({ kind: 'none' });
    // Lo que la caja acaba de empujar (q = "cd" con applied = "cd") no es cambio externo.
    expect(searchChangedOutside('cd', 'cd')).toBe(false);
  });
});
