// filters.test.ts — URL ↔ query del reporte de distribuidores (lógica pura).

import { describe, expect, it } from 'vitest';
import {
  URL_PARAM,
  clearFiltersPatch,
  fmtMoney,
  hasListFilters,
  kpiToFilter,
  scopeOf,
  sortToParam,
  urlToQuery,
} from './filters';

const P1 = '11111111-2222-4333-8444-555555555555';
const B1 = '66666666-7777-4888-8999-000000000000';

describe('urlToQuery', () => {
  it('sin parámetros ⇒ defaults (página 1, 20 filas, puntos desc) y nada más', () => {
    expect(urlToQuery({})).toEqual({ page: 1, limit: 20, sortBy: 'points', sortOrder: 'desc' });
  });

  it('lee todos los filtros válidos (país en mayúsculas)', () => {
    const q = urlToQuery({
      q: 'lopez',
      actividad: 'calificados',
      estado: 'activa',
      rango: '3',
      alta: P1,
      pais: 'mx',
      sucursal: B1,
      periodo: P1,
      orden: 'ventas',
      pagina: '2',
      limite: '50',
    });
    expect(q).toEqual({
      page: 2,
      limit: 50,
      sortBy: 'sales',
      sortOrder: 'desc',
      search: 'lopez',
      activity: 'qualified',
      status: 'active',
      rankNumber: 3,
      joinedPeriodId: P1,
      countryCode: 'MX',
      branchId: B1,
      periodId: P1,
    });
  });

  it('ignora valores inválidos (actividad, rango 0/11, país de 3 letras, uuid malo, límite fuera del catálogo)', () => {
    const q = urlToQuery({ actividad: 'x', rango: '11', pais: 'MEX', sucursal: 'no', alta: 'no', limite: '33', orden: 'nivel', q: 'a' });
    expect(q).toEqual({ page: 1, limit: 20, sortBy: 'points', sortOrder: 'desc' });
  });

  it('acepta un dígito como búsqueda (número de socio) y lee de URLSearchParams', () => {
    expect(urlToQuery(new URLSearchParams('q=5&orden=nombre')).search).toBe('5');
    expect(urlToQuery(new URLSearchParams('orden=nombre'))).toMatchObject({ sortBy: 'name', sortOrder: 'asc' });
  });
});

describe('sortToParam', () => {
  it('ida y vuelta: el default no se escribe', () => {
    expect(sortToParam('points', 'desc')).toBeNull();
    expect(sortToParam(undefined, undefined)).toBeNull();
    expect(sortToParam('points', 'asc')).toBe('puntos-asc');
    expect(sortToParam('sales', 'desc')).toBe('ventas');
    expect(sortToParam('name', 'asc')).toBe('nombre');
    expect(sortToParam('joinDate', 'asc')).toBe('antiguos');
  });
});

describe('scopeOf / hasListFilters / clearFiltersPatch', () => {
  it('el alcance solo lleva periodo, país, sucursal y estado', () => {
    const q = urlToQuery({ periodo: P1, pais: 'US', estado: 'inactiva', actividad: 'conPuntos', q: 'ana' });
    expect(scopeOf(q)).toEqual({ periodId: P1, countryCode: 'US', status: 'inactive' });
  });

  it('hasListFilters ignora periodo, orden y paginación', () => {
    expect(hasListFilters(urlToQuery({ periodo: P1, orden: 'ventas', pagina: '3' }))).toBe(false);
    expect(hasListFilters(urlToQuery({ pais: 'MX' }))).toBe(true);
    expect(hasListFilters(urlToQuery({ q: 'ana' }))).toBe(true);
  });

  it('clearFiltersPatch borra los filtros y la página', () => {
    const patch = clearFiltersPatch();
    expect(patch[URL_PARAM.page]).toBeNull();
    expect(patch[URL_PARAM.activity]).toBeNull();
    expect(patch[URL_PARAM.country]).toBeNull();
    expect(patch).not.toHaveProperty(URL_PARAM.period);
    expect(patch).not.toHaveProperty(URL_PARAM.sort);
  });
});

describe('kpiToFilter', () => {
  it('total limpia actividad y alta; nuevos pone la alta del periodo; el resto la actividad', () => {
    expect(kpiToFilter('total')).toEqual({ pagina: null, actividad: null, alta: null });
    expect(kpiToFilter('newThisPeriod', P1)).toEqual({ pagina: null, actividad: null, alta: P1 });
    expect(kpiToFilter('newThisPeriod', 'x')).toEqual({ pagina: null, actividad: null, alta: null });
    expect(kpiToFilter('atRisk')).toEqual({ pagina: null, actividad: 'enRiesgo', alta: null });
  });
});

describe('fmtMoney', () => {
  it('MXN con sufijo y USD con prefijo, sin decimales', () => {
    expect(fmtMoney(1234.56, 'MXN')).toBe('$1,235 MXN');
    expect(fmtMoney(75, 'USD')).toBe('$75');
    expect(fmtMoney(null, 'MXN')).toBe('$0 MXN');
  });
});
