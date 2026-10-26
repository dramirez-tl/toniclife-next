import { describe, expect, it } from 'vitest';
import {
  exactCodeMatch,
  freeDraftBlockers,
  inlineBatchLine,
  parseBatchLines,
  sortProductMatches,
  type FreeDraft,
} from './manual-free';

describe('parseBatchLines', () => {
  it('entiende clave,cantidad y cantidad opcional (1 por defecto)', () => {
    expect(parseBatchLines('5663,2\n3026,1\n8159N')).toEqual({
      lines: [
        { sku: '5663', quantity: 2 },
        { sku: '3026', quantity: 1 },
        { sku: '8159N', quantity: 1 },
      ],
      invalid: [],
    });
  });

  it('acepta punto y coma, tabulador (Excel), espacio, CRLF y mayúsculas', () => {
    expect(parseBatchLines('ki9019;3\r\n8451\t2\r\n  8371 4  \r\n\r\n')).toEqual({
      lines: [
        { sku: 'KI9019', quantity: 3 },
        { sku: '8451', quantity: 2 },
        { sku: '8371', quantity: 4 },
      ],
      invalid: [],
    });
  });

  it('suma la misma clave repetida y reporta renglones con cantidad inválida', () => {
    expect(parseBatchLines('9019,2\n9019,3\n8001,x\n8002,0\n8003,-1')).toEqual({
      lines: [{ sku: '9019', quantity: 5 }],
      invalid: ['8001,x', '8002,0', '8003,-1'],
    });
  });

  it('acepta cantidades con decimales', () => {
    expect(parseBatchLines('9019,1.5').lines).toEqual([{ sku: '9019', quantity: 1.5 }]);
  });
});

describe('inlineBatchLine', () => {
  it('solo reconoce un renglón "clave,cantidad" en el cuadro de búsqueda', () => {
    expect(inlineBatchLine('9019,2')).toEqual({ sku: '9019', quantity: 2 });
    expect(inlineBatchLine('9019')).toBeNull();
    expect(inlineBatchLine('jimmy coffee')).toBeNull();
    expect(inlineBatchLine('9019,x')).toBeNull();
  });
});

describe('sortProductMatches / exactCodeMatch', () => {
  const items = [
    { code: 'KI9019', name: 'Kit de Inicio' },
    { code: 'EP9019', name: 'Expansión Puebla' },
    { code: '9019', name: 'Jimmy Coffee Frasco 270g.' },
    { code: '9019-1', name: 'Jimmy Coffee Invitado' },
    { code: 'ABC', name: '9019 Promo' },
  ];

  it('pone la clave exacta primero, luego las que empiezan igual, luego nombres', () => {
    expect(sortProductMatches(items, '9019').map((p) => p.code)).toEqual(['9019', '9019-1', 'ABC', 'KI9019', 'EP9019']);
    expect(sortProductMatches(items, 'ki').map((p) => p.code)).toEqual(['KI9019', 'EP9019', '9019', '9019-1', 'ABC']);
  });

  it('encuentra la clave exacta sin importar mayúsculas', () => {
    expect(exactCodeMatch(items, 'ki9019 ')?.code).toBe('KI9019');
    expect(exactCodeMatch(items, '901')).toBeUndefined();
    expect(exactCodeMatch(items, '')).toBeUndefined();
  });
});

describe('freeDraftBlockers', () => {
  const base: FreeDraft = {
    branchId: 'b1',
    hasCustomer: false,
    lines: [{ productId: 'p1', code: '9019', name: 'Jimmy', quantity: '2', unitPrice: '' }],
    receiverMode: 'public',
    other: { rfc: '', name: '', taxRegimeCode: '', cfdiUseCode: 'G03', zipCode: '', email: '' },
  };

  it('captura completa a público en general = sin bloqueos', () => {
    expect(freeDraftBlockers(base)).toEqual([]);
  });

  it('pide sucursal y productos, y valida cantidad y precio por renglón', () => {
    expect(freeDraftBlockers({ ...base, branchId: '', lines: [] })).toEqual([
      'Elige la sucursal que expide',
      'Agrega al menos un producto',
    ]);
    expect(
      freeDraftBlockers({
        ...base,
        lines: [
          { productId: 'p1', code: '9019', name: 'Jimmy', quantity: '0', unitPrice: '' },
          { productId: 'p2', code: '8451', name: 'Lista', quantity: '1', unitPrice: '-5' },
          { productId: 'p3', code: '8371', name: 'Catálogo', quantity: '1', unitPrice: '0' },
        ],
      }),
    ).toEqual(['Cantidad inválida en 9019', 'Precio inválido en 8451']);
  });

  it('receptor distribuidor exige haberlo elegido; otros datos exige RFC, nombre, régimen, uso y CP', () => {
    expect(freeDraftBlockers({ ...base, receiverMode: 'customer' })).toEqual([
      'Elige al distribuidor para usar sus datos fiscales',
    ]);
    expect(freeDraftBlockers({ ...base, receiverMode: 'customer', hasCustomer: true })).toEqual([]);
    expect(freeDraftBlockers({ ...base, receiverMode: 'other' })).toEqual([
      'RFC inválido (12 o 13 caracteres)',
      'Falta el nombre o razón social',
      'Elige el régimen fiscal',
      'Código postal fiscal de 5 dígitos',
    ]);
    expect(
      freeDraftBlockers({
        ...base,
        receiverMode: 'other',
        other: { rfc: 'xaxx010101000', name: 'Público', taxRegimeCode: '616', cfdiUseCode: 'S01', zipCode: '36500', email: '' },
      }),
    ).toEqual([]);
  });
});
