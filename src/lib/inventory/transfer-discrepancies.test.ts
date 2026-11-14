import { describe, expect, it } from 'vitest';
import type { TransferDiscrepancyDto } from '@/types/inventory';
import {
  CHOICE_OPTIONS,
  NOTHING_CHOSEN_MESSAGE,
  buildResolvePayload,
  discrepancyMissing,
  discrepancyPending,
  discrepancyStateInfo,
  effectLines,
  formatPieces,
  initialDrafts,
  resolutionPhrase,
  successMessage,
  totalPending,
} from './transfer-discrepancies';

const BRANCHES = { origin: 'Almacén General', destination: 'Huamantla TL' };

const dsc = (patch: Partial<TransferDiscrepancyDto> = {}): TransferDiscrepancyDto => ({
  id: 'd1',
  productId: 'p1',
  productCode: '9378',
  productName: 'Azúcar Mascabado 500 g',
  discrepancyType: 'missing',
  quantityExpected: 10,
  quantityActual: 0,
  status: 'reported',
  createdAt: '2026-11-13T23:32:00.000Z',
  pendingQuantity: 10,
  arrivedQuantity: 0,
  returnedQuantity: 0,
  lostQuantity: 0,
  ...patch,
});

const second = dsc({
  id: 'd2',
  productId: 'p2',
  productCode: '9873',
  productName: 'Hidra Energy',
  quantityExpected: 5,
  pendingQuantity: 5,
});

describe('traspasos: cuánto falta por aclarar de una diferencia', () => {
  it('enviado 10, recibido 0: faltan 10 y las 10 están por aclarar', () => {
    expect(discrepancyMissing(dsc())).toBe(10);
    expect(discrepancyPending(dsc())).toBe(10);
  });

  it('usa lo pendiente que manda el API (ya descontado lo aclarado)', () => {
    expect(discrepancyPending(dsc({ pendingQuantity: 4, arrivedQuantity: 6 }))).toBe(4);
  });

  it('con un API anterior (sin pendiente): el faltante completo mientras siga abierta, 0 si ya cerró', () => {
    expect(discrepancyPending(dsc({ pendingQuantity: undefined }))).toBe(10);
    expect(
      discrepancyPending(dsc({ pendingQuantity: undefined, status: 'resolved' })),
    ).toBe(0);
    expect(
      discrepancyPending(dsc({ pendingQuantity: undefined, status: 'written_off' })),
    ).toBe(0);
  });

  it('un excedente no tiene faltante', () => {
    const excess = dsc({
      discrepancyType: 'excess',
      quantityExpected: 4,
      quantityActual: 6,
      pendingQuantity: 0,
    });
    expect(discrepancyMissing(excess)).toBe(0);
    expect(discrepancyPending(excess)).toBe(0);
  });

  it('suma lo pendiente de todo el traspaso', () => {
    expect(totalPending([dsc(), second, dsc({ id: 'd3', pendingQuantity: 0 })])).toBe(15);
    expect(totalPending(undefined)).toBe(0);
  });
});

describe('traspasos: estado de la diferencia en pantalla', () => {
  it.each([
    ['nada aclarado', dsc(), 'Por aclarar', 'warning'],
    [
      'aclarada en parte',
      dsc({ pendingQuantity: 4, arrivedQuantity: 6, status: 'investigating' }),
      'Aclarada en parte',
      'warning',
    ],
    [
      'todo llegó',
      dsc({ pendingQuantity: 0, arrivedQuantity: 10, status: 'resolved' }),
      'Aclarada',
      'success',
    ],
    [
      'llegó una parte y se extravió otra',
      dsc({ pendingQuantity: 0, arrivedQuantity: 9, lostQuantity: 1, status: 'resolved' }),
      'Aclarada',
      'success',
    ],
    [
      'todo se extravió',
      dsc({ pendingQuantity: 0, lostQuantity: 10, status: 'written_off' }),
      'Extraviada',
      'muted',
    ],
    [
      'excedente reportado',
      dsc({ discrepancyType: 'excess', quantityExpected: 4, quantityActual: 6, pendingQuantity: 0 }),
      'Reportada',
      'warning',
    ],
  ])('%s', (_label, d, label, tone) => {
    expect(discrepancyStateInfo(d)).toEqual({ label, tone });
  });
});

describe('traspasos: frases de lo aclarado', () => {
  it('singular y plural', () => {
    expect(resolutionPhrase({ resolution: 'arrived', quantity: 6 })).toBe('Llegaron 6');
    expect(resolutionPhrase({ resolution: 'arrived', quantity: 1 })).toBe('Llegó 1');
    expect(resolutionPhrase({ resolution: 'returned', quantity: 3 })).toBe(
      'Regresaron 3 al origen',
    );
    expect(resolutionPhrase({ resolution: 'returned', quantity: 1 })).toBe(
      'Regresó 1 al origen',
    );
    expect(resolutionPhrase({ resolution: 'lost', quantity: 2 })).toBe('2 extraviadas');
    expect(resolutionPhrase({ resolution: 'lost', quantity: 1 })).toBe('1 extraviada');
  });

  it('formatPieces: sin ceros de relleno, con miles y decimales reales', () => {
    expect(formatPieces(10)).toBe('10');
    expect(formatPieces(2.5)).toBe('2.5');
    expect(formatPieces(1250)).toBe('1,250');
    expect(formatPieces(0.1 + 0.2)).toBe('0.3');
  });

  it('cada opción dice qué le pasa al inventario', () => {
    const effect = (value: string) =>
      CHOICE_OPTIONS.find((o) => o.value === value)?.effect(BRANCHES);
    expect(effect('arrived')).toBe('Entra al inventario de Huamantla TL.');
    expect(effect('returned')).toBe('Regresa al inventario de Almacén General.');
    expect(effect('lost')).toBe('Se da de baja: no entra a ningún inventario.');
    expect(effect('pending')).toBe('No cambia nada.');
  });
});

describe('traspasos: armar la aclaración que se manda al API', () => {
  it('al abrir todo está en "sigue pendiente" con la cantidad pendiente lista; lo ya aclarado no aparece', () => {
    expect(initialDrafts([dsc(), second, dsc({ id: 'd3', pendingQuantity: 0 })])).toEqual({
      d1: { choice: 'pending', quantity: '10' },
      d2: { choice: 'pending', quantity: '5' },
    });
  });

  it('sin elegir nada no hay envío y solo pide elegir', () => {
    const out = buildResolvePayload([dsc(), second], initialDrafts([dsc(), second]), '');
    expect(out.payload).toEqual({ items: [] });
    expect(out.errors).toEqual([NOTHING_CHOSEN_MESSAGE]);
    expect(out.remaining).toBe(15);
  });

  it('"marcar todo como sí llegó": una línea por producto con lo pendiente que veía la pantalla', () => {
    const rows = [dsc(), second];
    const out = buildResolvePayload(rows, initialDrafts(rows, 'arrived'), '  llegó la caja 2 ');
    expect(out.errors).toEqual([]);
    expect(out.payload).toEqual({
      items: [
        { discrepancyId: 'd1', resolution: 'arrived', quantity: 10, pendingQuantity: 10 },
        { discrepancyId: 'd2', resolution: 'arrived', quantity: 5, pendingQuantity: 5 },
      ],
      notes: 'llegó la caja 2',
    });
    expect(out.totals).toEqual({ arrived: 15, returned: 0, lost: 0 });
    expect(out.remaining).toBe(0);
  });

  it('llegó solo una parte: manda esa parte y lo demás sigue por aclarar; lo no elegido no viaja', () => {
    const out = buildResolvePayload(
      [dsc(), second],
      { d1: { choice: 'arrived', quantity: '6' }, d2: { choice: 'pending', quantity: '5' } },
      '',
    );
    expect(out.errors).toEqual([]);
    expect(out.payload).toEqual({
      items: [{ discrepancyId: 'd1', resolution: 'arrived', quantity: 6, pendingQuantity: 10 }],
    });
    expect(out.remaining).toBe(9);
  });

  it('extraviar exige nota; con nota pasa', () => {
    const drafts = { d1: { choice: 'lost' as const, quantity: '10' } };
    expect(buildResolvePayload([dsc()], drafts, '   ').errors).toEqual([
      'Escribe qué pasó con lo extraviado (paquetería, guía, a quién se reportó).',
    ]);
    const ok = buildResolvePayload([dsc()], drafts, 'guía 123 extraviada');
    expect(ok.errors).toEqual([]);
    expect(ok.payload.notes).toBe('guía 123 extraviada');
    expect(ok.totals.lost).toBe(10);
  });

  it.each([
    ['vacía', '', '9378: escribe cuántas piezas.'],
    ['cero', '0', '9378: escribe cuántas piezas.'],
    ['negativa', '-3', '9378: escribe cuántas piezas.'],
    ['texto', 'abc', '9378: escribe cuántas piezas.'],
    ['más de lo pendiente', '11', '9378: solo quedan 10 por aclarar.'],
    ['tres decimales', '1.234', '9378: usa máximo dos decimales.'],
  ])('cantidad %s: no se manda y dice por qué', (_label, quantity, message) => {
    const out = buildResolvePayload([dsc()], { d1: { choice: 'arrived', quantity } }, '');
    expect(out.payload.items).toEqual([]);
    expect(out.errors).toEqual([message]);
  });

  it('acepta decimales reales cuando lo pendiente los tiene', () => {
    const out = buildResolvePayload(
      [dsc({ quantityExpected: 2.5, pendingQuantity: 2.5 })],
      { d1: { choice: 'returned', quantity: '2.5' } },
      '',
    );
    expect(out.errors).toEqual([]);
    expect(out.payload.items[0]).toMatchObject({ quantity: 2.5, pendingQuantity: 2.5 });
  });
});

describe('traspasos: resumen antes de confirmar y aviso de éxito', () => {
  it('dice a qué inventario entra cada cosa y cuánto queda por aclarar', () => {
    const out = buildResolvePayload(
      [dsc(), second],
      { d1: { choice: 'arrived', quantity: '6' }, d2: { choice: 'returned', quantity: '5' } },
      '',
    );
    expect(effectLines(out, BRANCHES)).toEqual([
      '6 piezas entran al inventario de Huamantla TL.',
      '5 piezas regresan al inventario de Almacén General.',
      '4 piezas siguen por aclarar.',
    ]);
  });

  it('singular y extravío', () => {
    const out = buildResolvePayload(
      [dsc({ quantityExpected: 1, pendingQuantity: 1 }), second],
      { d1: { choice: 'lost', quantity: '1' }, d2: { choice: 'arrived', quantity: '1' } },
      'se cayó en la paquetería',
    );
    expect(effectLines(out, BRANCHES)).toEqual([
      '1 pieza entra al inventario de Huamantla TL.',
      '1 pieza se da de baja por extravío (no entra a ningún inventario).',
      '4 piezas siguen por aclarar.',
    ]);
  });

  it('sin nada elegido no hay resumen', () => {
    expect(
      effectLines(buildResolvePayload([dsc()], initialDrafts([dsc()]), ''), BRANCHES),
    ).toEqual([]);
  });

  it('aviso de éxito', () => {
    expect(successMessage({ arrived: 15, returned: 0, lost: 0 }, BRANCHES)).toBe(
      'Diferencias aclaradas: 15 piezas a Huamantla TL.',
    );
    expect(successMessage({ arrived: 6, returned: 3, lost: 1 }, BRANCHES)).toBe(
      'Diferencias aclaradas: 6 piezas a Huamantla TL, 3 piezas de regreso a Almacén General, 1 pieza por extravío.',
    );
  });
});
