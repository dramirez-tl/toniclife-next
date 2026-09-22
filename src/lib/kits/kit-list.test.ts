import { describe, expect, it } from 'vitest';
import { buildCsv } from '@/components/admin/products/lib/csv';
import type { KitAvailabilitySummary } from './kit-availability';
import {
  CHANNEL_FILTER_OPTIONS,
  HEALTH_FILTER_OPTIONS,
  KITS_CSV_HEADERS,
  SALES_FILTER_OPTIONS,
  channelFilterParams,
  filterKitList,
  healthText,
  isChannelFilter,
  isHealthFilter,
  isSalesFilter,
  kitCsvRow,
  kitHealthFlags,
  limitingText,
  matchesHealthFilter,
  matchesSalesFilter,
  recipeCell,
} from './kit-list';

const summary = (overrides: Partial<KitAvailabilitySummary> = {}): KitAvailabilitySummary => ({
  productId: 'p-1',
  code: 'KPM05',
  name: 'Kit Premium 5',
  stockMode: 'assemble_on_sale',
  componentsCount: 12,
  branchesTotal: 60,
  branchesSellable: 47,
  maxSellable: 20,
  limiting: [
    { code: '8050M', name: 'Omega sobre', branchesShort: 13 },
    { code: '8203M', name: 'Colágeno', branchesShort: 9 },
  ],
  ownStockPhantom: null,
  unbackedOwnStock: false,
  ...overrides,
});

describe('kit-list · columna Receta', () => {
  it('cuenta componentes en español y marca en rojo solo al kit que se arma sin receta', () => {
    expect(recipeCell(summary())).toEqual({ label: '12 componentes', missing: false, known: true });
    expect(recipeCell(summary({ componentsCount: 1 }))).toEqual({ label: '1 componente', missing: false, known: true });
    expect(recipeCell(summary({ componentsCount: 0 }))).toEqual({ label: 'Sin receta', missing: true, known: true });
    expect(recipeCell(summary({ componentsCount: 0, stockMode: 'prebuilt' }))).toEqual({
      label: 'Sin receta',
      missing: false,
      known: true,
    });
    expect(recipeCell(undefined)).toEqual({ label: 'Sin dato', missing: false, known: false });
  });
});

describe('kit-list · columna Salud', () => {
  it('sin pendientes cuando hay receta, precio, imagen y nada raro', () => {
    expect(kitHealthFlags({ imageUrl: 'https://cdn/kit.png' }, summary())).toEqual([]);
  });

  it('chips del contrato: sin receta, sin precio, sin imagen, fantasma y sin respaldo', () => {
    const flags = kitHealthFlags(
      { imageUrl: null },
      summary({
        componentsCount: 0,
        branchesTotal: 0,
        branchesSellable: 0,
        ownStockPhantom: { rows: 69, units: 1380 },
      }),
    );
    expect(flags.map((f) => f.key)).toEqual(['no_recipe', 'no_price', 'no_image', 'phantom']);
    expect(flags.map((f) => f.label)).toEqual(['Sin receta', 'Sin precio', 'Sin imagen', 'Existencia fantasma']);
    expect(flags[0].tone).toBe('bad');
    expect(flags[3].title).toContain('1,380 piezas propias en 69 sucursales');

    const unbacked = kitHealthFlags({ imageUrl: 'x' }, summary({ stockMode: 'prebuilt', unbackedOwnStock: true }));
    expect(unbacked.map((f) => f.label)).toEqual(['Sin respaldo']);
    // Un kit que se arma nunca está "sin respaldo" (no maneja existencia propia).
    expect(kitHealthFlags({ imageUrl: 'x' }, summary({ unbackedOwnStock: true }))).toEqual([]);
    // Un prearmado sin receta no es un pendiente: vende con su propia existencia.
    expect(kitHealthFlags({ imageUrl: 'x' }, summary({ stockMode: 'prebuilt', componentsCount: 0 }))).toEqual([]);
  });

  it('sin resumen del servidor solo evalúa la imagen (no adivina lo demás)', () => {
    expect(kitHealthFlags({ imageUrl: '' }, undefined).map((f) => f.key)).toEqual(['no_image']);
    expect(kitHealthFlags({ imageUrl: 'x' }, undefined)).toEqual([]);
  });

  it('healthText une las etiquetas para el CSV', () => {
    const flags = kitHealthFlags({ imageUrl: null }, summary({ componentsCount: 0 }));
    expect(healthText(flags)).toBe('Sin receta; Sin imagen');
    expect(healthText([])).toBe('');
  });
});

describe('kit-list · filtros', () => {
  it('salud: con o sin pendientes', () => {
    const pending = kitHealthFlags({ imageUrl: null }, summary());
    expect(matchesHealthFilter(pending, 'pending')).toBe(true);
    expect(matchesHealthFilter(pending, 'ok')).toBe(false);
    expect(matchesHealthFilter([], 'ok')).toBe(true);
    expect(matchesHealthFilter([], 'pending')).toBe(false);
    expect(matchesHealthFilter([], '')).toBe(true);
    expect(HEALTH_FILTER_OPTIONS.map((o) => o.label)).toEqual(['Con pendientes', 'Sin pendientes']);
    expect(isHealthFilter('pending')).toBe(true);
    expect(isHealthFilter('')).toBe(true);
    expect(isHealthFilter('otra')).toBe(false);
  });

  it('ventas del periodo: un kit sin fila en el resumen cuenta como sin ventas', () => {
    expect(matchesSalesFilter({ unitsPaid: 77 }, 'with')).toBe(true);
    expect(matchesSalesFilter({ unitsPaid: 0 }, 'with')).toBe(false);
    expect(matchesSalesFilter(undefined, 'with')).toBe(false);
    expect(matchesSalesFilter(undefined, 'without')).toBe(true);
    expect(matchesSalesFilter({ unitsPaid: 3 }, 'without')).toBe(false);
    expect(matchesSalesFilter(undefined, '')).toBe(true);
    expect(SALES_FILTER_OPTIONS.map((o) => o.value)).toEqual(['with', 'without']);
    expect(isSalesFilter('with')).toBe(true);
    expect(isSalesFilter('nada')).toBe(false);
  });

  it('canal se traduce a los booleanos que GET /products ya filtra en el servidor', () => {
    expect(channelFilterParams('pos')).toEqual({ availableInPos: true });
    expect(channelFilterParams('web')).toEqual({ isVisibleEcommerce: true });
    expect(channelFilterParams('')).toEqual({});
    expect(CHANNEL_FILTER_OPTIONS.map((o) => o.label)).toEqual(['Punto de venta', 'Inscripción en línea']);
    expect(isChannelFilter('web')).toBe(true);
    expect(isChannelFilter('tienda')).toBe(false);
  });

  it('filterKitList combina disponibilidad, salud y ventas sobre la lista completa', () => {
    const kits = [
      { id: 'a', imageUrl: 'x', kitStockMode: 'assemble_on_sale' as const },
      { id: 'b', imageUrl: null, kitStockMode: 'prebuilt' as const },
      { id: 'c', imageUrl: 'x', kitStockMode: 'assemble_on_sale' as const },
    ];
    const ctx = {
      availabilityById: new Map([
        ['a', summary({ productId: 'a' })],
        ['b', summary({ productId: 'b', stockMode: 'prebuilt', branchesSellable: 60 })],
        ['c', summary({ productId: 'c', componentsCount: 0, branchesSellable: 0 })],
      ]),
      salesById: new Map([
        ['a', { productId: 'a', code: 'A', unitsPaid: 77, unitsCancelled: 1 }],
        ['b', { productId: 'b', code: 'B', unitsPaid: 0, unitsCancelled: 0 }],
      ]),
      modeOf: (k: (typeof kits)[number]) => k.kitStockMode,
    };
    const ids = (rows: { id: string }[]) => rows.map((r) => r.id);

    expect(ids(filterKitList(kits, ctx, {}))).toEqual(['a', 'b', 'c']);
    expect(ids(filterKitList(kits, ctx, { health: 'pending' }))).toEqual(['b', 'c']);
    expect(ids(filterKitList(kits, ctx, { health: 'ok' }))).toEqual(['a']);
    expect(ids(filterKitList(kits, ctx, { sales: 'with' }))).toEqual(['a']);
    expect(ids(filterKitList(kits, ctx, { sales: 'without' }))).toEqual(['b', 'c']);
    expect(ids(filterKitList(kits, ctx, { stockMode: 'assemble_on_sale', sales: 'without' }))).toEqual(['c']);
    expect(ids(filterKitList(kits, ctx, { availability: 'all_short', health: 'pending' }))).toEqual(['c']);
    expect(ids(filterKitList(kits, ctx, { availability: 'all_ok', sales: 'with' }))).toEqual([]);
  });
});

describe('kit-list · CSV', () => {
  const kit = {
    id: 'p-1',
    code: 'KPM05',
    name: '=Kit Premium 5',
    kitPosition: 'premium',
    imageUrl: null,
    price: '1500.00',
    priceCurrency: 'MXN',
    activeCountries: ['MX', 'US'],
    availableInPos: true,
    isVisibleEcommerce: false,
    isActive: true,
    createdAt: '2026-09-01T10:00:00.000Z',
  };

  it('limitingText resume los componentes que dejan sucursales en cero', () => {
    expect(limitingText(summary())).toBe('8050M en 13; 8203M en 9');
    expect(limitingText(summary({ limiting: [{ code: 'X', name: '', branchesShort: 0 }] }))).toBe('');
    expect(limitingText(undefined)).toBe('');
  });

  it('una fila por kit con los mismos encabezados', () => {
    const row = kitCsvRow(kit, {
      summary: summary(),
      sales: { productId: 'p-1', code: 'KPM05', unitsPaid: 77, unitsCancelled: 1 },
      periodLabel: 'Septiembre 2026 (26-ago → 25-sep)',
      mode: 'assemble_on_sale',
      positionLabel: 'Premium',
      stockModeLabel: 'Se arma al vender',
    });
    expect(row).toHaveLength(KITS_CSV_HEADERS.length);
    expect(row).toEqual([
      'KPM05',
      '=Kit Premium 5',
      'Premium',
      'Se arma al vender',
      12,
      '47 de 60',
      47,
      60,
      20,
      '8050M en 13; 8203M en 9',
      'Sin imagen',
      77,
      1,
      'Septiembre 2026 (26-ago → 25-sep)',
      1500,
      'MXN',
      'MX US',
      true,
      false,
      true,
      '2026-09-01',
    ]);
  });

  it('sin resumen ni ventas deja las celdas vacías (no inventa ceros)', () => {
    const row = kitCsvRow(
      { ...kit, price: null, activeCountries: undefined, createdAt: null },
      {
        summary: undefined,
        sales: undefined,
        periodLabel: '',
        mode: null,
        positionLabel: 'Premium',
        stockModeLabel: '',
      },
    );
    expect(row.slice(3, 14)).toEqual(['', '', '', '', '', '', '', 'Sin imagen', '', '', '']);
    expect(row.slice(14)).toEqual(['', '', '', true, false, true, '']);
  });

  it('las fórmulas se neutralizan al construir el CSV, como en el resto del admin', () => {
    const csv = buildCsv(
      [...KITS_CSV_HEADERS],
      [
        kitCsvRow(kit, {
          summary: summary(),
          sales: undefined,
          periodLabel: '',
          mode: 'assemble_on_sale',
          positionLabel: 'Premium',
          stockModeLabel: 'Se arma al vender',
        }),
      ],
    );
    const lines = csv.split('\r\n');
    expect(lines[0].startsWith('﻿"Clave","Nombre"')).toBe(true);
    expect(lines[1]).toContain('"\'=Kit Premium 5"');
    expect(lines[1]).toContain('"Sí"');
  });
});
