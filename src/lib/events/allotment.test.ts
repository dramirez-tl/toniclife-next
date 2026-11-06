import { describe, expect, it } from 'vitest';
import { evenSplitAllotments, placesPerUnit } from './allotment';

describe('placesPerUnit', () => {
  it('titular + invitado = 2 lugares por boleto', () => {
    expect(
      placesPerUnit([
        { ticketsPerUnit: 1, isActive: true },
        { ticketsPerUnit: 1, isActive: true },
      ]),
    ).toBe(2);
  });
  it('ignora claves inactivas y nunca baja de 1', () => {
    expect(placesPerUnit([{ ticketsPerUnit: 1, isActive: false }])).toBe(1);
    expect(placesPerUnit([])).toBe(1);
  });
});

describe('evenSplitAllotments', () => {
  const branches = [
    { branchId: 'a', soldUnits: 10 },
    { branchId: 'b', soldUnits: 0 },
    { branchId: 'c', soldUnits: 3 },
  ];

  it('reparte lo que cabe (aforo − vigentes) / lugares por unidad, parejo y con sobrante a las primeras', () => {
    // 100 lugares libres, 2 por boleto → 50 boletos: 16 a cada una y 2 sobran.
    const r = evenSplitAllotments({ capacity: 200, ticketsIssued: 100, placesPerUnit: 2, branches });
    expect(r).toMatchObject({ placesLeft: 100, unitsToSplit: 50, base: 16, extra: 2 });
    expect(r.allotments).toEqual({ a: 10 + 17, b: 0 + 17, c: 3 + 16 });
  });

  it('aforo ya rebasado: cada sucursal queda con lo vendido (nada que repartir)', () => {
    const r = evenSplitAllotments({ capacity: 350, ticketsIssued: 641, placesPerUnit: 2, branches });
    expect(r).toMatchObject({ placesLeft: 0, unitsToSplit: 0, base: 0, extra: 0 });
    expect(r.allotments).toEqual({ a: 10, b: 0, c: 3 });
  });

  it('redondea hacia abajo para no rebasar ni con invitados', () => {
    // 7 lugares libres, 2 por boleto → 3 boletos (el 4.º metería 8 personas).
    const r = evenSplitAllotments({ capacity: 107, ticketsIssued: 100, placesPerUnit: 2, branches });
    expect(r.unitsToSplit).toBe(3);
    expect(r.allotments).toEqual({ a: 11, b: 1, c: 4 });
  });

  it('sin aforo o sin sucursales no reparte', () => {
    expect(evenSplitAllotments({ capacity: null, ticketsIssued: 0, placesPerUnit: 2, branches }).unitsToSplit).toBe(0);
    expect(evenSplitAllotments({ capacity: 100, ticketsIssued: 0, placesPerUnit: 2, branches: [] }).allotments).toEqual({});
  });
});
