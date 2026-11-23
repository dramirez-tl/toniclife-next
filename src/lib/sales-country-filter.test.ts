import { describe, expect, it } from 'vitest';
import {
  ALL_SALES_COUNTRIES_LABEL,
  SALES_COUNTRIES,
  normalizeSalesCountries,
  salesCountriesLabel,
  salesCountriesParam,
  salesCountrySuffix,
  toggleSalesCountry,
} from './sales-country-filter';

describe('filtro por país de Ventas por sucursal', () => {
  it('ofrece los cinco países con sucursales, México primero', () => {
    expect(SALES_COUNTRIES.map((c) => c.code)).toEqual(['MX', 'FN', 'US', 'CO', 'GT']);
  });

  it('sin nada marcado son todos los países y no viaja nada al API', () => {
    expect(salesCountriesParam([])).toBeUndefined();
    expect(salesCountriesLabel([])).toBe(ALL_SALES_COUNTRIES_LABEL);
    expect(salesCountrySuffix(undefined)).toBe('');
    expect(salesCountrySuffix('')).toBe('');
  });

  it('México y Frontera', () => {
    const picked = toggleSalesCountry(toggleSalesCountry([], 'FN'), 'MX');
    // Siempre en el orden del catálogo, sin importar el orden en que se marcaron.
    expect(picked).toEqual(['MX', 'FN']);
    expect(salesCountriesParam(picked)).toBe('MX,FN');
    expect(salesCountriesLabel(picked)).toBe('México, Frontera');
    expect(salesCountrySuffix('MX,FN')).toBe('_MX-FN');
  });

  it('Colombia y Guatemala', () => {
    const picked = toggleSalesCountry(toggleSalesCountry([], 'gt'), 'co');
    expect(salesCountriesParam(picked)).toBe('CO,GT');
    expect(salesCountriesLabel(picked)).toBe('Colombia, Guatemala');
    expect(salesCountrySuffix(salesCountriesParam(picked))).toBe('_CO-GT');
  });

  it('volver a tocar un país lo desmarca', () => {
    expect(toggleSalesCountry(['MX', 'FN'], 'FN')).toEqual(['MX']);
    expect(toggleSalesCountry(['MX'], 'MX')).toEqual([]);
  });

  it('marcar los cinco es lo mismo que "Todos los países"', () => {
    expect(toggleSalesCountry(['MX', 'FN', 'US', 'CO'], 'GT')).toEqual([]);
    expect(normalizeSalesCountries(['GT', 'CO', 'US', 'FN', 'MX'])).toEqual([]);
    expect(salesCountriesParam(['MX', 'FN', 'US', 'CO', 'GT'])).toBeUndefined();
  });

  it('ignora claves desconocidas o repetidas', () => {
    expect(normalizeSalesCountries(['ZZ', 'mx', 'MX', ' fn '])).toEqual(['MX', 'FN']);
    expect(salesCountrySuffix('ZZ')).toBe('');
  });
});
