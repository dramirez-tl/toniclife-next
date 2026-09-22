import { describe, expect, it } from 'vitest';
import {
  availabilityShort,
  availabilitySentence,
  availabilitySortValue,
  availabilityTone,
  branchSentence,
  filterKitsByAvailability,
  limitingSentence,
  matchesAvailabilityFilter,
  missingForOne,
  normalizeKitAvailabilityDetail,
  normalizeKitAvailabilitySummary,
  phantomSentence,
  posKitEnrollWarning,
  posKitEnrolledSoldOutToast,
  posKitStockLabel,
  recipeHeadline,
  recipeSellableAt,
  resolveStockMode,
  shortageOptions,
  shortageText,
  stockModeLabel,
  summarizeBranches,
  summaryFlags,
  type KitAvailabilitySummary,
} from './kit-availability';

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

describe('kit-availability · modo de surtido', () => {
  it('usa kitStockMode si viaja; si no, el booleano; null si no es kit ni paquete', () => {
    expect(resolveStockMode({ productType: 'kit', kitStockMode: 'prebuilt', kitDeductsInventory: true })).toBe('prebuilt');
    expect(resolveStockMode({ productType: 'kit', kitDeductsInventory: true })).toBe('assemble_on_sale');
    expect(resolveStockMode({ productType: 'pack', kitDeductsInventory: false })).toBe('prebuilt');
    expect(resolveStockMode({ productType: 'pack', kitDeductsInventory: null })).toBe('prebuilt');
    expect(resolveStockMode({ productType: 'finished_good', kitDeductsInventory: true })).toBeNull();
    expect(resolveStockMode({ productType: 'kit', kitStockMode: 'otra-cosa', kitDeductsInventory: true })).toBe('assemble_on_sale');
  });

  it('rotula en español claro', () => {
    expect(stockModeLabel('assemble_on_sale')).toBe('Se arma al vender');
    expect(stockModeLabel('prebuilt')).toBe('Prearmado');
    expect(stockModeLabel(null)).toBe('Sin definir');
  });
});

describe('kit-availability · textos del listado', () => {
  it('semáforo: verde todas, ámbar alguna, rojo ninguna, gris sin universo', () => {
    expect(availabilityTone({ branchesTotal: 60, branchesSellable: 60 })).toBe('good');
    expect(availabilityTone({ branchesTotal: 60, branchesSellable: 47 })).toBe('warn');
    expect(availabilityTone({ branchesTotal: 60, branchesSellable: 0 })).toBe('bad');
    expect(availabilityTone({ branchesTotal: 0, branchesSellable: 0 })).toBe('none');
  });

  it('chip corto y frase completa', () => {
    expect(availabilityShort(summary())).toBe('47 de 60 · máx 20');
    expect(availabilityShort(summary({ branchesSellable: 0 }))).toBe('Agotado en las 60');
    expect(availabilityShort(summary({ branchesTotal: 0, branchesSellable: 0 }))).toBe('Sin sucursales con precio');
    expect(availabilitySentence(summary(), 'KPM05')).toBe('KPM05 se puede vender hoy en 47 de 60 sucursales.');
    expect(availabilitySentence(summary({ branchesSellable: 60 }), 'KPM05')).toBe('KPM05 se puede vender hoy en las 60 sucursales.');
    expect(availabilitySentence(summary({ branchesSellable: 0 }), 'KPM05')).toBe(
      'KPM05 no se puede vender hoy en ninguna de las 60 sucursales.',
    );
    expect(availabilitySentence(summary({ branchesTotal: 0, branchesSellable: 0 }))).toContain('no tiene precio vigente');
    expect(availabilitySentence(summary())).toMatch(/^Este kit se puede vender/);
  });

  it('"Falta 8050M en 13 sucursales, 8203M en 9."', () => {
    expect(limitingSentence(summary().limiting)).toBe('Falta 8050M en 13 sucursales, 8203M en 9.');
    expect(limitingSentence([{ code: '8050M', name: '', branchesShort: 1 }])).toBe('Falta 8050M en 1 sucursal.');
    expect(limitingSentence([])).toBe('');
    expect(limitingSentence([{ code: 'X', name: '', branchesShort: 0 }])).toBe('');
  });

  it('chips de estado: sin receta, sin precio, fantasma, sin respaldo', () => {
    expect(summaryFlags(summary()).map((f) => f.key)).toEqual([]);
    expect(summaryFlags(summary({ componentsCount: 0 })).map((f) => f.key)).toEqual(['no_recipe']);
    expect(summaryFlags(summary({ branchesTotal: 0 })).map((f) => f.key)).toEqual(['no_price']);
    const phantom = summaryFlags(summary({ ownStockPhantom: { rows: 69, units: 1380 } }));
    expect(phantom[0].label).toBe('Existencia fantasma (1,380 pzas)');
    // "Sin respaldo" solo aplica a prearmados; un kit que se arma con la bandera no la enseña.
    expect(summaryFlags(summary({ unbackedOwnStock: true })).map((f) => f.key)).toEqual([]);
    expect(summaryFlags(summary({ stockMode: 'prebuilt', componentsCount: 0, unbackedOwnStock: true })).map((f) => f.key)).toEqual([
      'unbacked',
    ]);
  });
});

describe('kit-availability · filtros y orden', () => {
  const rows = [
    summary(),
    summary({ productId: 'p-2', code: 'KBM01', stockMode: 'prebuilt', componentsCount: 0, branchesSellable: 60, limiting: [] }),
    summary({ productId: 'p-3', code: 'KUS06', branchesTotal: 7, branchesSellable: 0, limiting: [{ code: '8451', name: 'X', branchesShort: 7 }] }),
    summary({ productId: 'p-4', code: 'KPH23', branchesTotal: 0, branchesSellable: 0, limiting: [] }),
  ];
  const byId = new Map(rows.map((r) => [r.productId, r]));
  const kits = rows.map((r) => ({ id: r.productId, productType: 'kit', kitDeductsInventory: r.stockMode === 'assemble_on_sale' }));
  const modeOf = (k: (typeof kits)[number]) => resolveStockMode(k);

  it('disponibilidad: alguna agotada / todas agotadas / se vende en todas; sin universo no cuenta', () => {
    expect(matchesAvailabilityFilter(rows[0], 'some_short')).toBe(true);
    expect(matchesAvailabilityFilter(rows[1], 'some_short')).toBe(false);
    expect(matchesAvailabilityFilter(rows[2], 'all_short')).toBe(true);
    expect(matchesAvailabilityFilter(rows[0], 'all_short')).toBe(false);
    expect(matchesAvailabilityFilter(rows[1], 'all_ok')).toBe(true);
    expect(matchesAvailabilityFilter(rows[3], 'all_ok')).toBe(false);
    expect(matchesAvailabilityFilter(undefined, 'some_short')).toBe(false);
    expect(matchesAvailabilityFilter(undefined, '')).toBe(true);
  });

  it('"Le falta…" filtra por componente limitante (sin distinguir mayúsculas)', () => {
    expect(filterKitsByAvailability(kits, byId, { missingCode: '8050m' }, modeOf).map((k) => k.id)).toEqual(['p-1']);
    expect(filterKitsByAvailability(kits, byId, { missingCode: '8451' }, modeOf).map((k) => k.id)).toEqual(['p-3']);
    expect(filterKitsByAvailability(kits, byId, { missingCode: 'NADA' }, modeOf)).toEqual([]);
  });

  it('surtido y combinación de filtros; sin resumen cae al modo del kit', () => {
    expect(filterKitsByAvailability(kits, byId, { stockMode: 'prebuilt' }, modeOf).map((k) => k.id)).toEqual(['p-2']);
    expect(
      filterKitsByAvailability(kits, byId, { stockMode: 'assemble_on_sale', availability: 'some_short' }, modeOf).map((k) => k.id),
    ).toEqual(['p-1', 'p-3']);
    const orphan = [{ id: 'p-9', productType: 'pack', kitDeductsInventory: false }];
    expect(filterKitsByAvailability(orphan, byId, { stockMode: 'prebuilt' }, modeOf)).toHaveLength(1);
    expect(filterKitsByAvailability(orphan, byId, { availability: 'all_ok' }, modeOf)).toHaveLength(0);
    expect(filterKitsByAvailability(kits, byId, {}, modeOf)).toHaveLength(4);
  });

  it('opciones de "Le falta…": por cuántos kits afecta, sin duplicar por kit', () => {
    const dup = summary({ productId: 'p-5', limiting: [{ code: '8050m', name: 'Omega', branchesShort: 2 }, { code: '8050M', name: 'Omega', branchesShort: 1 }] });
    const opts = shortageOptions([...rows, dup]);
    expect(opts[0]).toEqual({ code: '8050M', name: 'Omega sobre', kits: 2 });
    expect(opts.map((o) => o.code)).toEqual(['8050M', '8203M', '8451']);
  });

  it('orden: los más agotados primero; sin universo al final', () => {
    const sorted = [...rows].sort((a, b) => availabilitySortValue(a) - availabilitySortValue(b));
    expect(sorted.map((r) => r.code)).toEqual(['KPH23', 'KUS06', 'KPM05', 'KBM01']);
    expect(availabilitySortValue(undefined)).toBe(-1);
  });
});

describe('kit-availability · ficha', () => {
  const branches = [
    { branchId: 'b1', code: '101', name: 'Irapuato Centro', isWarehouse: false, sellable: 3, limitingCode: null },
    { branchId: 'b2', code: '102', name: 'León', isWarehouse: false, sellable: 0, limitingCode: '8050M' },
    { branchId: 'b3', code: '103', name: 'Celaya', isWarehouse: false, sellable: 0, limitingCode: '8050M' },
    { branchId: 'b4', code: '104', name: 'Silao', isWarehouse: true, sellable: 0, limitingCode: '8203M' },
    { branchId: 'b5', code: '105', name: 'Salamanca', isWarehouse: false, sellable: 20, limitingCode: null },
  ];

  it('resume la tabla por sucursal en cifras y faltantes ordenados', () => {
    const s = summarizeBranches(branches, new Map([['8050M', 'Omega sobre']]));
    expect(s).toEqual({
      total: 5,
      sellable: 2,
      maxSellable: 20,
      limiting: [
        { code: '8050M', name: 'Omega sobre', branchesShort: 2 },
        { code: '8203M', name: '', branchesShort: 1 },
      ],
    });
    expect(availabilitySentence({ branchesTotal: s.total, branchesSellable: s.sellable }, 'KPM05')).toBe(
      'KPM05 se puede vender hoy en 2 de 5 sucursales.',
    );
    expect(limitingSentence(s.limiting)).toBe('Falta 8050M en 2 sucursales, 8203M en 1.');
  });

  it('frases por sucursal, receta y faltante', () => {
    expect(branchSentence(branches[0])).toBe('En Irapuato Centro se pueden vender 3.');
    expect(branchSentence({ name: 'X', sellable: 1, limitingCode: null })).toBe('En X se puede vender 1.');
    expect(branchSentence(branches[1])).toBe('En León no se puede vender: falta 8050M.');
    expect(branchSentence({ name: 'Y', sellable: 0, limitingCode: null })).toBe('En Y no se puede vender.');
    expect(recipeHeadline(null, 'León')).toContain('Elige una sucursal');
    expect(recipeHeadline(0, 'León')).toBe('Con esta receta hoy no se puede vender ninguno en León.');
    expect(recipeHeadline(1, 'León')).toBe('Con esta receta hoy se puede vender 1 en León.');
    expect(recipeHeadline(7, 'León')).toBe('Con esta receta hoy se pueden vender 7 en León.');
    expect(shortageText({ code: '8050M', name: 'Omega sobre', need: 1, available: 0 })).toBe('Falta "Omega sobre" (8050M): requiere 1, hay 0.');
    expect(shortageText({ code: '8050M', name: '', need: 2, available: 1 })).toBe('Falta 8050M: requiere 2, hay 1.');
    expect(missingForOne({ qtyPerUnit: 2, available: 0.5 })).toBe(1.5);
    expect(missingForOne({ qtyPerUnit: 1, available: 5 })).toBe(0);
    expect(phantomSentence({ rows: 69, units: 1380 })).toBe(
      'Tiene 1,380 piezas propias en 69 sucursales que ninguna venta usa: este kit se arma al vender y solo cuentan sus componentes.',
    );
    expect(phantomSentence({ rows: 1, units: 1 })).toContain('1 pieza propia en 1 sucursal');
  });
});

describe('kit-availability · receta del borrador contra existencias de la sucursal', () => {
  const stock = new Map([
    ['c1', { available: 5 }],
    ['c2', { available: 3 }],
    ['c3', { available: 0 }],
  ]);

  it('el mínimo manda; cantidad 2 divide; 0 de un componente deja el kit en cero', () => {
    expect(recipeSellableAt([{ componentProductId: 'c1', quantity: 1 }, { componentProductId: 'c2', quantity: 1 }], stock)).toEqual({
      sellable: 3,
      limiting: { componentProductId: 'c2', buildable: 3 },
      unknown: 0,
    });
    expect(recipeSellableAt([{ componentProductId: 'c1', quantity: 2 }], stock).sellable).toBe(2);
    expect(recipeSellableAt([{ componentProductId: 'c1', quantity: 1 }, { componentProductId: 'c3', quantity: 1 }], stock)).toMatchObject({
      sellable: 0,
      limiting: { componentProductId: 'c3', buildable: 0 },
    });
  });

  it('sin receta ⇒ 0; componente sin dato no cuenta pero se reporta; cantidad inválida cuenta como 1', () => {
    expect(recipeSellableAt([], stock)).toEqual({ sellable: 0, limiting: null, unknown: 0 });
    expect(recipeSellableAt([{ componentProductId: 'nuevo', quantity: 1 }, { componentProductId: 'c1', quantity: 1 }], stock)).toEqual({
      sellable: 5,
      limiting: { componentProductId: 'c1', buildable: 5 },
      unknown: 1,
    });
    expect(recipeSellableAt([{ componentProductId: 'nuevo', quantity: 1 }], stock)).toEqual({ sellable: 0, limiting: null, unknown: 1 });
    expect(recipeSellableAt([{ componentProductId: 'c1', quantity: Number.NaN }], stock).sellable).toBe(5);
    expect(recipeSellableAt([{ componentProductId: 'c1', quantity: 0 }], stock).sellable).toBe(5);
  });
});

describe('kit-availability · POS web', () => {
  it('rótulo de la tarjeta: Disponibles / Quedan / Agotado; sin dato ⇒ null', () => {
    expect(posKitStockLabel({ stock: undefined })).toBeNull();
    expect(posKitStockLabel({ stock: null })).toBeNull();
    expect(posKitStockLabel({ stock: 7, kitStockMode: 'assemble_on_sale' })).toEqual({ text: 'Disponibles: 7', tone: 'good', soldOut: false });
    expect(posKitStockLabel({ stock: 3, kitStockMode: 'prebuilt' })).toEqual({ text: 'Quedan: 3', tone: 'good', soldOut: false });
    expect(posKitStockLabel({ stock: 1 })?.tone).toBe('warn');
    expect(posKitStockLabel({ stock: 0, kitStockMode: 'assemble_on_sale' })).toEqual({ text: 'Agotado — falta un componente', tone: 'bad', soldOut: true });
    expect(posKitStockLabel({ stock: 0, kitStockMode: 'prebuilt' })).toEqual({ text: 'Agotado', tone: 'bad', soldOut: true });
    expect(
      posKitStockLabel({ stock: 0, kitStockMode: 'assemble_on_sale', limitingComponent: { code: '8050M', name: 'Omega', need: 1, available: 0 } })
        ?.text,
    ).toBe('Agotado — falta 8050M');
  });

  it('aviso en el alta: claro, con sucursal y componente, y SIN bloquear', () => {
    const msg = posKitEnrollWarning({
      kitCode: 'KPM05',
      branchName: 'Irapuato Centro',
      limitingComponent: { code: '8050M', name: 'Omega sobre', need: 1, available: 0 },
    });
    expect(msg).toBe(
      'KPM05 está agotado en Irapuato Centro. Falta "Omega sobre" (8050M): requiere 1, hay 0. Puedes registrar al distribuidor, pero no podrás cobrarle este kit aquí hasta que haya existencias: pide traspaso o elige otro kit.',
    );
    expect(posKitEnrollWarning({ kitCode: 'KPM05' })).toBe(
      'KPM05 está agotado en esta sucursal. Puedes registrar al distribuidor, pero no podrás cobrarle este kit aquí hasta que haya existencias: pide traspaso o elige otro kit.',
    );
    expect(posKitEnrolledSoldOutToast('KPM05', 'León')).toBe('Registrado, pero KPM05 está agotado en León: pide traspaso o elige otro kit.');
    expect(posKitEnrolledSoldOutToast('KPM05')).toBe('Registrado, pero KPM05 está agotado aquí: pide traspaso o elige otro kit.');
  });
});

describe('kit-availability · normalización (el API se construye en paralelo)', () => {
  it('resumen: coerciona números, tolera faltantes y descarta filas sin id', () => {
    expect(normalizeKitAvailabilitySummary(null)).toBeNull();
    expect(normalizeKitAvailabilitySummary({ code: 'X' })).toBeNull();
    const s = normalizeKitAvailabilitySummary({
      productId: 'p-1',
      code: 'KPM05',
      stockMode: 'assemble_on_sale',
      branchesTotal: '60',
      branchesSellable: 47,
      maxSellable: null,
      limiting: [{ code: '8050M', name: 'Omega', branchesShort: '13' }, { name: 'sin clave' }, 'basura'],
      ownStockPhantom: { rows: 0, units: 0 },
      unbackedOwnStock: 'yes',
    });
    expect(s).toEqual({
      productId: 'p-1',
      code: 'KPM05',
      name: '',
      stockMode: 'assemble_on_sale',
      componentsCount: 0,
      branchesTotal: 60,
      branchesSellable: 47,
      maxSellable: 0,
      limiting: [{ code: '8050M', name: 'Omega', branchesShort: 13 }],
      ownStockPhantom: null,
      unbackedOwnStock: false,
    });
    expect(normalizeKitAvailabilitySummary({ id: 'p-2', stockMode: 'raro' })?.stockMode).toBeNull();
  });

  it('detalle: sellable/ownStock null cuando no vienen; sucursales null sin branchId; limitante sin clave se descarta', () => {
    const d = normalizeKitAvailabilityDetail({
      stockMode: 'prebuilt',
      components: [{ productId: 'c1', code: '8050M', name: 'Omega', qtyPerUnit: '1', available: '0', buildable: 0, isActive: false }],
      ownStock: '20',
      hasKardex: false,
      limiting: { name: 'sin clave' },
    });
    expect(d?.sellable).toBeNull();
    expect(d?.branches).toBeNull();
    expect(d?.ownStock).toBe(20);
    expect(d?.hasKardex).toBe(false);
    expect(d?.limiting).toBeNull();
    expect(d?.components[0]).toMatchObject({ code: '8050M', qtyPerUnit: 1, available: 0, isActive: false, tracksInventory: true, hasPriceInKitCountries: null });
    const withBranches = normalizeKitAvailabilityDetail({ sellable: 3, branches: [{ branchId: 'b1', code: '101', name: 'X', sellable: '2', limitingCode: '' }] });
    expect(withBranches?.sellable).toBe(3);
    expect(withBranches?.branches).toEqual([{ branchId: 'b1', code: '101', name: 'X', isWarehouse: false, sellable: 2, limitingCode: null }]);
    expect(normalizeKitAvailabilityDetail('nada')).toBeNull();
  });
});
