// units.test.ts — selector de unidad de medida (L11).

import { describe, expect, it } from 'vitest';
import { buildUnitOptions } from './units';

const PZA = { id: '11111111-1111-4111-8111-111111111111', code: 'PZA', name: 'Pieza' };
const CAJA = { id: '22222222-2222-4222-8222-222222222222', code: 'CJ', name: 'Caja' };

describe('buildUnitOptions', () => {
  it('ordena por nombre y usa la clave como pista', () => {
    expect(buildUnitOptions([PZA, CAJA], null)).toEqual([
      { value: CAJA.id, label: 'Caja', hint: 'CJ' },
      { value: PZA.id, label: 'Pieza', hint: 'PZA' },
    ]);
  });

  it('sin nombre cae a la clave; descarta filas sin id', () => {
    expect(buildUnitOptions([{ id: PZA.id, code: 'PZA', name: '' }, { id: '', code: 'X', name: 'X' }], null)).toEqual([
      { value: PZA.id, label: 'PZA', hint: undefined },
    ]);
  });

  it('conserva la unidad actual aunque el catálogo no la liste', () => {
    const orphan = '33333333-3333-4333-8333-333333333333';
    const options = buildUnitOptions([PZA], orphan);
    expect(options).toHaveLength(2);
    expect(options[1]).toEqual({ value: orphan, label: 'Unidad actual (no está en el catálogo)', hint: '33333333' });
  });

  it('no duplica la unidad actual cuando sí está listada', () => {
    expect(buildUnitOptions([PZA], PZA.id)).toHaveLength(1);
  });
});
