import { describe, expect, it } from 'vitest';
import type { BotnaturaProduct } from '@/types/botnatura';
import type { BotnaturaLineDraft } from './botnatura';
import {
  BATCH_MAX_ROWS,
  addBatchToLines,
  batchSummary,
  parseBatch,
  pendingBatchText,
  resolveBatch,
} from './botnatura-batch';

function product(over: Partial<BotnaturaProduct> & Pick<BotnaturaProduct, 'id' | 'code'>): BotnaturaProduct {
  return {
    name: `Producto ${over.code}`,
    line: 'regular',
    lineLabel: 'Regular',
    unitName: 'Pieza',
    satUnitCode: 'H87',
    satProductCode: '51191900',
    listPrice: null,
    salePrice: null,
    taxLabel: 'IVA 16 %',
    isActive: true,
    updatedAt: '2026-11-17T00:00:00.000Z',
    ...over,
  };
}

// Como en el catálogo real: 1020 y 5618 están en las dos líneas; solo la Línea 2 tiene precio.
const ACEITE_REG = product({ id: 'r-1020', code: '1020', name: 'Aceite Regenerador de Piel 20ml' });
const ACEITE_L2 = product({ id: 'l-1020', code: '1020', name: 'ACEITE RENERADOR DE PIEL 20ML.', line: 'line2', listPrice: 180, salePrice: 90 });
const AG_REG = product({ id: 'r-5618', code: '5618', name: 'AG COLOIDAL 240 ML' });
const AG_L2 = product({ id: 'l-5618', code: '5618', name: 'AG COLOIDAL SPRAY 240 ML.', line: 'line2', listPrice: 180, salePrice: 90 });
const AJO = product({ id: 'r-1303', code: '1303', name: 'AJO 150 CAPS', listPrice: 116, salePrice: 58 });
const KIT_REG = product({ id: 'r-kit', code: 'KiT160', name: 'Kit Inscripcion 2000', listPrice: 2000, salePrice: 1000 });
const KIT_L2 = product({ id: 'l-kit', code: 'KIT160', name: 'KIT INSCRIPCION 2000 CAPSULA', line: 'line2', listPrice: 2000, salePrice: 1000 });
const CATALOG = [ACEITE_REG, ACEITE_L2, AG_REG, AG_L2, AJO, KIT_REG, KIT_L2];

describe('captura por lote de Botnatura: leer el texto pegado', () => {
  it('el ejemplo de Contabilidad: clave, coma y cantidad', () => {
    expect(parseBatch('1020,100\n5618,150')).toEqual({
      entries: [
        { row: 1, code: '1020', quantity: 100 },
        { row: 2, code: '5618', quantity: 150 },
      ],
      errors: [],
      merged: 0,
      skippedHeader: false,
    });
  });

  it('acepta espacios, punto y coma, tabulador (Excel), renglones vacíos y saltos de Windows', () => {
    const parsed = parseBatch('  1020 , 100 \r\n\r\n5618;150\r\n1303\t25\nKIT160 3\n');
    expect(parsed.errors).toEqual([]);
    expect(parsed.entries.map((e) => [e.row, e.code, e.quantity])).toEqual([
      [1, '1020', 100],
      [3, '5618', 150],
      [4, '1303', 25],
      [5, 'KIT160', 3],
    ]);
  });

  it('la coma de los miles es de la cantidad, no el separador', () => {
    expect(parseBatch('1020,1,500').entries).toEqual([{ row: 1, code: '1020', quantity: 1500 }]);
    expect(parseBatch('1020 1,500').entries).toEqual([{ row: 1, code: '1020', quantity: 1500 }]);
    expect(parseBatch('1020\t1,500').entries).toEqual([{ row: 1, code: '1020', quantity: 1500 }]);
  });

  it('ignora el encabezado y suma una clave repetida a la primera', () => {
    const parsed = parseBatch('Clave,Cantidad\n1020,100\n5618,150\n1020,20\nkit160,1\nKIT160,2');
    expect(parsed.skippedHeader).toBe(true);
    expect(parsed.merged).toBe(2);
    expect(parsed.entries).toEqual([
      { row: 2, code: '1020', quantity: 120 },
      { row: 3, code: '5618', quantity: 150 },
      { row: 5, code: 'kit160', quantity: 3 },
    ]);
    expect(parsed.errors).toEqual([]);
  });

  it('dice qué renglón está mal y por qué, sin tirar los buenos', () => {
    const parsed = parseBatch('1020,100\n5618\n,30\n1303,cien\n1303,0\n1303,-4\n1303,12');
    expect(parsed.entries).toEqual([
      { row: 1, code: '1020', quantity: 100 },
      { row: 7, code: '1303', quantity: 12 },
    ]);
    expect(parsed.errors).toEqual([
      { row: 2, text: '5618', problem: 'Falta la cantidad (clave,cantidad)' },
      { row: 3, text: ',30', problem: 'Falta la clave' },
      { row: 4, text: '1303,cien', problem: 'La cantidad debe ser un número mayor que cero' },
      { row: 5, text: '1303,0', problem: 'La cantidad debe ser un número mayor que cero' },
      { row: 6, text: '1303,-4', problem: 'La cantidad debe ser un número mayor que cero' },
    ]);
    expect(parsed.skippedHeader).toBe(false);
  });

  it('vacío no trae nada y hay un tope de renglones', () => {
    expect(parseBatch('')).toEqual({ entries: [], errors: [], merged: 0, skippedHeader: false });
    expect(parseBatch('  \n\n ').entries).toEqual([]);
    const many = Array.from({ length: BATCH_MAX_ROWS + 2 }, (_, i) => `${5000 + i},1`).join('\n');
    const parsed = parseBatch(many);
    expect(parsed.entries).toHaveLength(BATCH_MAX_ROWS);
    expect(parsed.errors).toHaveLength(2);
    expect(parsed.errors[0].problem).toBe(`Son demasiados renglones: máximo ${BATCH_MAX_ROWS} por lote`);
  });
});

describe('captura por lote de Botnatura: casar cada clave con el catálogo', () => {
  const entries = parseBatch('1020,100\n5618,150\n1303,10\n9999,5').entries;

  it('con la Línea 2 elegida toma los de la Línea 2 y avisa de lo que solo está en la otra', () => {
    const rows = resolveBatch(entries, CATALOG, 'line2');
    expect(rows.map((r) => [r.code, r.status, r.product?.id ?? null])).toEqual([
      ['1020', 'ok', 'l-1020'],
      ['5618', 'ok', 'l-5618'],
      ['1303', 'other_line', null],
      ['9999', 'not_found', null],
    ]);
    expect(rows[0].note).toBeNull();
    expect(rows[2].note).toBe('No está en la línea Línea 2; sí está en Regular');
    expect(rows[3].note).toBe('No está en el catálogo de Botnatura (o está dada de baja)');
    expect(batchSummary(rows)).toEqual({ ok: 2, problems: 2, pieces: 250 });
  });

  it('con la Regular elegida toma los de la Regular aunque no tengan precio, y lo avisa', () => {
    const rows = resolveBatch(entries, CATALOG, 'regular');
    expect(rows.map((r) => [r.code, r.status, r.product?.id ?? null])).toEqual([
      ['1020', 'ok', 'r-1020'],
      ['5618', 'ok', 'r-5618'],
      ['1303', 'ok', 'r-1303'],
      ['9999', 'not_found', null],
    ]);
    expect(rows[0].note).toBe('No tiene precio en el catálogo: habrá que capturarlo en la factura');
    expect(rows[2].note).toBeNull();
  });

  it('con las dos líneas: la clave repetida se toma sola solo si una de las dos es la única con precio', () => {
    const rows = resolveBatch(parseBatch('1020,100\n1303,10\nkit160,2').entries, CATALOG, '');
    expect(rows.map((r) => [r.code, r.status, r.product?.id ?? null])).toEqual([
      ['1020', 'ok', 'l-1020'],
      ['1303', 'ok', 'r-1303'],
      ['kit160', 'ambiguous', null],
    ]);
    expect(rows[0].note).toBe('Está en las dos líneas: se tomó Línea 2, la única con precio');
    expect(rows[2].note).toBe('Está en las dos líneas: elige arriba Regular o Línea 2');
    // Ninguna de las dos con precio: tampoco se adivina.
    expect(resolveBatch([{ row: 1, code: '77', quantity: 1 }], [product({ id: 'a', code: '77' }), product({ id: 'b', code: '77', line: 'line2' })], '')[0].status).toBe('ambiguous');
  });

  it('la clave no distingue mayúsculas ni espacios', () => {
    const rows = resolveBatch([{ row: 1, code: 'kit160', quantity: 1 }], [product({ id: 'k', code: ' KiT160 ', listPrice: 10, salePrice: 5 })], 'regular');
    expect(rows[0]).toMatchObject({ status: 'ok', note: null });
    expect(rows[0].product?.id).toBe('k');
  });
});

describe('captura por lote de Botnatura: sumar a la factura', () => {
  const draft = (p: BotnaturaProduct, quantity: string, priceMode: BotnaturaLineDraft['priceMode'] = null): BotnaturaLineDraft => ({
    product: p,
    quantity,
    priceMode,
    customPrice: '',
  });

  it('agrega los que se encontraron, en su orden, sin precio propio', () => {
    const rows = resolveBatch(parseBatch('1020,100\n5618,150\n9999,5').entries, CATALOG, 'line2');
    const lines = addBatchToLines([], rows);
    expect(lines.map((l) => [l.product.id, l.quantity, l.priceMode, l.customPrice])).toEqual([
      ['l-1020', '100', null, ''],
      ['l-5618', '150', null, ''],
    ]);
  });

  it('si el producto ya estaba con el precio general le suma; si tenía precio propio va en otro renglón', () => {
    const before = [draft(ACEITE_L2, '5'), draft(AG_L2, '2', 'list')];
    const rows = resolveBatch(parseBatch('1020,100\n5618,150').entries, CATALOG, 'line2');
    const after = addBatchToLines(before, rows);
    expect(after.map((l) => [l.product.id, l.quantity, l.priceMode])).toEqual([
      ['l-1020', '105', null],
      ['l-5618', '2', 'list'],
      ['l-5618', '150', null],
    ]);
    // No cambia la captura que recibe.
    expect(before.map((l) => l.quantity)).toEqual(['5', '2']);
  });

  it('lo que no se pudo agregar regresa como texto para corregirlo', () => {
    const parsed = parseBatch('1020,100\n9999,5\n1303,3\nmal');
    const rows = resolveBatch(parsed.entries, CATALOG, 'line2');
    expect(pendingBatchText(rows, parsed.errors)).toBe('9999,5\n1303,3\nmal');
    expect(pendingBatchText(resolveBatch(parseBatch('1020,1').entries, CATALOG, 'line2'))).toBe('');
  });
});
