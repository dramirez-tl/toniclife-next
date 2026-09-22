import { describe, expect, it } from 'vitest';
import {
  canEditKitFields,
  componentInvalidRows,
  formatQuantity,
  isKitErrorCode,
  isValidQuantity,
  modeChangeConsequence,
  moveRow,
  normalizeOwnStockClearResult,
  normalizeOwnStockPreview,
  ownStockClearedSentence,
  ownStockFromDetails,
  ownStockPreviewSentence,
  parseQuantity,
  recipeCopyPayload,
} from './kit-editor';

describe('canEditKitFields (products:kits_manage O products:update)', () => {
  it('con kits_manage puede aunque no tenga update', () => {
    expect(canEditKitFields(['products:read', 'products:kits_manage'], [])).toBe(true);
  });
  it('con update puede (respaldo del contrato §4.2)', () => {
    expect(canEditKitFields(['products:update'], ['admin'])).toBe(true);
  });
  it('comodines y super_admin pasan', () => {
    expect(canEditKitFields(['products:*'], [])).toBe(true);
    expect(canEditKitFields(['*'], [])).toBe(true);
    expect(canEditKitFields([], ['super_admin'])).toBe(true);
  });
  it('solo lectura sin ninguno de los dos', () => {
    expect(canEditKitFields(['products:read', 'products:create', 'products:delete'], ['comercial'])).toBe(false);
    expect(canEditKitFields([], [])).toBe(false);
  });
});

describe('parseQuantity (coma decimal aceptada)', () => {
  it('acepta coma y punto como decimal', () => {
    expect(parseQuantity('1,5')).toBe(1.5);
    expect(parseQuantity('1.5')).toBe(1.5);
    expect(parseQuantity('2')).toBe(2);
    expect(parseQuantity(' 0,25 ')).toBe(0.25);
  });
  it('con ambos separadores, el último es el decimal', () => {
    expect(parseQuantity('1.250,5')).toBe(1250.5);
    expect(parseQuantity('1,250.5')).toBe(1250.5);
    expect(parseQuantity('1,250,000')).toBe(1250000);
  });
  it('vacío es null; letras son NaN', () => {
    expect(parseQuantity('')).toBeNull();
    expect(parseQuantity('   ')).toBeNull();
    expect(Number.isNaN(parseQuantity('abc') as number)).toBe(true);
    expect(Number.isNaN(parseQuantity('1,5x') as number)).toBe(true);
  });
  it('isValidQuantity exige > 0 y formatQuantity redondea a 4 decimales', () => {
    expect(isValidQuantity(1.5)).toBe(true);
    expect(isValidQuantity(0)).toBe(false);
    expect(isValidQuantity(null)).toBe(false);
    expect(isValidQuantity(NaN)).toBe(false);
    expect(formatQuantity(1.23456)).toBe('1.2346');
    expect(formatQuantity(2)).toBe('2');
    expect(formatQuantity(NaN)).toBe('');
  });
});

describe('moveRow (▲▼)', () => {
  const rows = ['a', 'b', 'c'];
  it('sube y baja un renglón', () => {
    expect(moveRow(rows, 1, -1)).toEqual(['b', 'a', 'c']);
    expect(moveRow(rows, 1, 1)).toEqual(['a', 'c', 'b']);
  });
  it('en los extremos no cambia nada (y no muta el original)', () => {
    expect(moveRow(rows, 0, -1)).toEqual(rows);
    expect(moveRow(rows, 2, 1)).toEqual(rows);
    expect(moveRow(rows, 5, 1)).toEqual(rows);
    expect(rows).toEqual(['a', 'b', 'c']);
  });
});

describe('recipeCopyPayload (copiar receta de otro kit → PUT components/bulk)', () => {
  it('toma solo renglones activos con componente, sin duplicados ni el propio kit, y renumera sortOrder', () => {
    const payload = recipeCopyPayload(
      [
        { componentProductId: 'c-1', quantity: '2.0000', isActive: true },
        { componentProductId: 'c-2', quantity: 1 },
        { componentProductId: 'c-1', quantity: 9 },
        { componentProductId: 'destino', quantity: 1 },
        { componentProductId: 'c-3', quantity: 1, isActive: false },
        { componentProductId: null, quantity: 1 },
        { componentProductId: 'c-4', quantity: 0 },
      ],
      'destino',
    );
    expect(payload).toEqual({
      components: [
        { componentProductId: 'c-1', quantity: 2, sortOrder: 0 },
        { componentProductId: 'c-2', quantity: 1, sortOrder: 1 },
      ],
    });
  });
  it('una receta vacía produce un cuerpo vacío', () => {
    expect(recipeCopyPayload([], 'x')).toEqual({ components: [] });
  });
});

describe('modo de surtido: consecuencia y details del 409', () => {
  it('a prearmado avisa que arranca en 0', () => {
    expect(modeChangeConsequence('prebuilt', null)).toContain('arranca en 0');
  });
  it('a "se arma" con existencia propia pregunta si dejarla en cero', () => {
    expect(modeChangeConsequence('assemble_on_sale', { rows: 69, units: 1380 })).toBe(
      'Tiene 1,380 piezas propias en 69 sucursales que ninguna venta usa. ¿Dejarlas en cero?',
    );
    expect(modeChangeConsequence('assemble_on_sale', { rows: 1, units: 3 })).toContain('en 1 sucursal que');
  });
  it('a "se arma" sin existencia explica la regla del POS', () => {
    expect(modeChangeConsequence('assemble_on_sale', { rows: 0, units: 0 })).toContain('si falta uno solo');
    expect(modeChangeConsequence('assemble_on_sale', null)).toContain('si falta uno solo');
  });
  it('ownStockFromDetails lee { rows, units } y tolera basura', () => {
    expect(ownStockFromDetails({ rows: 69, units: '1380' })).toEqual({ rows: 69, units: 1380 });
    expect(ownStockFromDetails({ units: 5 })).toEqual({ rows: 0, units: 5 });
    expect(ownStockFromDetails({})).toBeNull();
    expect(ownStockFromDetails(null)).toBeNull();
  });
});

describe('vaciar existencia propia', () => {
  it('normalizeOwnStockPreview lee la forma real (KitOwnStockPreviewDto)', () => {
    const p = normalizeOwnStockPreview({
      productId: 'p',
      code: 'KA3',
      name: 'Kit',
      stockMode: 'assemble_on_sale',
      rows: 2,
      units: 40,
      reserved: 0,
      blocked: false,
      branches: [
        { branchId: 'b1', code: '164', name: 'Almacén', units: 20, reserved: 0 },
        { branchId: 'b2', code: '205', name: 'US', units: '20', reserved: 0 },
      ],
    });
    expect(p?.rows).toBe(2);
    expect(p?.units).toBe(40);
    expect(p?.blocked).toBe(false);
    expect(p?.branches[1].units).toBe(20);
    expect(ownStockPreviewSentence(p!)).toBe('Se dejarán en cero 40 piezas en 2 sucursales.');
  });
  it('sin `blocked` se deriva de las reservas; sin productId es null', () => {
    expect(normalizeOwnStockPreview({ productId: 'p', reserved: 3, branches: [{ branchId: 'b' }] })?.blocked).toBe(true);
    expect(normalizeOwnStockPreview({ productId: 'p', branches: [{ branchId: 'b' }] })?.rows).toBe(1);
    expect(normalizeOwnStockPreview({})).toBeNull();
  });
  it('normalizeOwnStockClearResult y su frase', () => {
    const r = normalizeOwnStockClearResult({ productId: 'p', code: 'KA3', rows: 1, units: 20, movements: [{ movementId: 'm', movementNumber: 'MOV-1', branchId: 'b', code: '164', units: 20 }] });
    expect(r?.movements[0].name).toBe('164');
    expect(ownStockClearedSentence(r!)).toBe('Se dieron de baja 20 piezas en 1 sucursal.');
    expect(normalizeOwnStockClearResult(null)).toBeNull();
  });
});

describe('errores KIT_*', () => {
  it('isKitErrorCode reconoce los códigos del contrato §4.5', () => {
    expect(isKitErrorCode('KIT_MODE_HAS_OWN_STOCK')).toBe(true);
    expect(isKitErrorCode('KIT_NOT_READY')).toBe(true);
    expect(isKitErrorCode('PRD_STALE')).toBe(false);
    expect(isKitErrorCode(null)).toBe(false);
  });
  it('componentInvalidRows lee details.components del 422', () => {
    expect(
      componentInvalidRows({ components: [{ componentProductId: 'c-1', code: '8050M', reason: 'inactive', label: 'está inactivo' }, { code: 'X', reason: 'duplicate' }, 'basura'] }),
    ).toEqual([
      { componentProductId: 'c-1', code: '8050M', reason: 'inactive', label: 'está inactivo' },
      { componentProductId: '', code: 'X', reason: 'duplicate', label: 'duplicate' },
    ]);
    expect(componentInvalidRows(null)).toEqual([]);
  });
});
