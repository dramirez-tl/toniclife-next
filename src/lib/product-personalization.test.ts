// product-personalization.test.ts - reglas puras de la personalización en la
// tienda (mig 179): máximo de caracteres, etiqueta, formulario <-> PATCH/POST y
// el texto que ven Almacén y Pedidos.

import { describe, expect, it } from 'vitest';
import {
  PERSONALIZATION_DEFAULT_MAX_LENGTH,
  PERSONALIZATION_MAX_LENGTH_LIMIT,
  countPersonalizedLines,
  normalizePersonalizationLabel,
  parsePersonalizationMaxLength,
  personalizationCreatePayload,
  personalizationEffective,
  personalizationFormValues,
  personalizationLine,
  personalizationMaxLengthError,
  personalizationPatch,
  type PersonalizationFormValues,
} from './product-personalization';

const form = (overrides: Partial<PersonalizationFormValues> = {}): PersonalizationFormValues => ({
  personalizationEnabled: true,
  personalizationMaxLength: '20',
  personalizationLabel: '',
  ...overrides,
});

describe('parsePersonalizationMaxLength', () => {
  it('acepta enteros entre 1 y 60 (con espacios alrededor)', () => {
    expect(parsePersonalizationMaxLength('1')).toBe(1);
    expect(parsePersonalizationMaxLength(' 20 ')).toBe(20);
    expect(parsePersonalizationMaxLength(String(PERSONALIZATION_MAX_LENGTH_LIMIT))).toBe(60);
  });

  it('rechaza vacío, cero, fuera de rango, decimales, negativos y texto', () => {
    for (const raw of ['', '   ', '0', '61', '100', '1.5', '-3', 'abc', '2e1', '1 0']) {
      expect(parsePersonalizationMaxLength(raw), raw).toBeNull();
      expect(personalizationMaxLengthError(raw), raw).toBe('Número entero entre 1 y 60');
    }
    expect(personalizationMaxLengthError('30')).toBeNull();
  });
});

describe('normalizePersonalizationLabel', () => {
  it('recorta y vacío = null (etiqueta por defecto de la tienda)', () => {
    expect(normalizePersonalizationLabel('  Tu nombre  ')).toBe('Tu nombre');
    expect(normalizePersonalizationLabel('   ')).toBeNull();
    expect(normalizePersonalizationLabel('')).toBeNull();
  });
});

describe('personalizationFormValues', () => {
  it('sin producto o sin máximo: apagado y propone el máximo por defecto', () => {
    expect(personalizationFormValues(null)).toEqual({
      personalizationEnabled: false,
      personalizationMaxLength: String(PERSONALIZATION_DEFAULT_MAX_LENGTH),
      personalizationLabel: '',
    });
    expect(personalizationFormValues({ personalizationMaxLength: null, personalizationLabel: 'Tu nombre' })).toEqual({
      personalizationEnabled: false,
      personalizationMaxLength: '20',
      personalizationLabel: 'Tu nombre',
    });
  });

  it('con máximo: encendido con los valores guardados', () => {
    expect(personalizationFormValues({ personalizationMaxLength: 30, personalizationLabel: 'Nombre a estampar' })).toEqual({
      personalizationEnabled: true,
      personalizationMaxLength: '30',
      personalizationLabel: 'Nombre a estampar',
    });
    // API anterior a la mig 179 (campos ausentes) = apagado.
    expect(personalizationFormValues({}).personalizationEnabled).toBe(false);
  });
});

describe('personalizationEffective', () => {
  it('apagado: máximo null; la etiqueta se conserva recortada', () => {
    expect(personalizationEffective(form({ personalizationEnabled: false, personalizationLabel: ' X ' }))).toEqual({
      personalizationMaxLength: null,
      personalizationLabel: 'X',
    });
  });

  it('encendido: máximo numérico y etiqueta vacía = null', () => {
    expect(personalizationEffective(form({ personalizationMaxLength: ' 15 ' }))).toEqual({
      personalizationMaxLength: 15,
      personalizationLabel: null,
    });
  });
});

describe('personalizationPatch (solo lo que cambió)', () => {
  it('sin cambios no manda nada', () => {
    expect(personalizationPatch(null, form({ personalizationEnabled: false }))).toEqual({});
    expect(personalizationPatch({ personalizationMaxLength: 20, personalizationLabel: null }, form())).toEqual({});
    expect(
      personalizationPatch(
        { personalizationMaxLength: 20, personalizationLabel: 'Tu nombre' },
        form({ personalizationLabel: '  Tu nombre ' }),
      ),
    ).toEqual({});
  });

  it('encender manda solo el máximo (etiqueta vacía sigue en null)', () => {
    expect(personalizationPatch(null, form())).toEqual({ personalizationMaxLength: 20 });
    expect(personalizationPatch({}, form({ personalizationMaxLength: '35', personalizationLabel: 'Nombre' }))).toEqual({
      personalizationMaxLength: 35,
      personalizationLabel: 'Nombre',
    });
  });

  it('apagar manda el máximo en null y deja la etiqueta como estaba', () => {
    expect(
      personalizationPatch(
        { personalizationMaxLength: 20, personalizationLabel: 'Tu nombre' },
        form({ personalizationEnabled: false, personalizationLabel: 'Tu nombre' }),
      ),
    ).toEqual({ personalizationMaxLength: null });
  });

  it('vaciar la etiqueta manda null solo para la etiqueta', () => {
    expect(
      personalizationPatch({ personalizationMaxLength: 20, personalizationLabel: 'Tu nombre' }, form({ personalizationLabel: '' })),
    ).toEqual({ personalizationLabel: null });
  });

  it('cambiar el máximo manda solo el máximo', () => {
    expect(
      personalizationPatch({ personalizationMaxLength: 20, personalizationLabel: null }, form({ personalizationMaxLength: '12' })),
    ).toEqual({ personalizationMaxLength: 12 });
  });

  it('un máximo inválido con el interruptor encendido no se manda', () => {
    expect(personalizationPatch(null, form({ personalizationMaxLength: '0' }))).toEqual({});
    expect(
      personalizationPatch({ personalizationMaxLength: 20, personalizationLabel: null }, form({ personalizationMaxLength: '99' })),
    ).toEqual({});
  });
});

describe('personalizationCreatePayload (alta)', () => {
  it('apagado o inválido: no toca las columnas de la mig 179', () => {
    expect(personalizationCreatePayload(form({ personalizationEnabled: false, personalizationLabel: 'X' }))).toEqual({});
    expect(personalizationCreatePayload(form({ personalizationMaxLength: '' }))).toEqual({});
  });

  it('encendido: máximo y, si la hay, etiqueta', () => {
    expect(personalizationCreatePayload(form())).toEqual({ personalizationMaxLength: 20 });
    expect(personalizationCreatePayload(form({ personalizationMaxLength: '10', personalizationLabel: ' Tu nombre ' }))).toEqual({
      personalizationMaxLength: 10,
      personalizationLabel: 'Tu nombre',
    });
  });
});

describe('personalizationLine / countPersonalizedLines', () => {
  it('arma el texto para Almacén y Pedidos; vacío = null', () => {
    expect(personalizationLine('María José')).toBe('Personalización: María José');
    expect(personalizationLine('  ')).toBeNull();
    expect(personalizationLine(null)).toBeNull();
    expect(personalizationLine(undefined)).toBeNull();
  });

  it('cuenta los renglones con texto a estampar', () => {
    expect(
      countPersonalizedLines([
        { personalization: 'Ana' },
        { personalization: null },
        {},
        { personalization: '   ' },
        { personalization: 'Luis' },
      ]),
    ).toBe(2);
    expect(countPersonalizedLines([])).toBe(0);
  });
});
