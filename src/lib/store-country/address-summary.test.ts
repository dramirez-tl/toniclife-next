import { describe, expect, it } from 'vitest';
import { addressSummary, stateCatalogNote } from './address-summary';

describe('store-country/address-summary · qué pide la tienda en cada país', () => {
  it('México: calle, número exterior, colonia, código postal, municipio y estado son obligatorios', () => {
    const mx = addressSummary('MX');
    expect(mx.fields.map((f) => f.key)).toEqual([
      'street',
      'extNumber',
      'intNumber',
      'neighborhood',
      'zipCode',
      'city',
      'state',
      'reference',
    ]);
    expect(mx.fields.filter((f) => f.required).map((f) => f.key)).toEqual([
      'street',
      'extNumber',
      'neighborhood',
      'zipCode',
      'city',
      'state',
    ]);
    expect(mx.requiredCount).toBe(6);
    expect(mx.optionalCount).toBe(2);
    expect(mx.stateAsCode).toBe(false);
    // Solo el código postal tiene formato.
    expect(mx.fields.filter((f) => f.hasFormat).map((f) => f.key)).toEqual(['zipCode']);
  });

  it('Estados Unidos: sin colonia ni número aparte, y el estado viaja como clave', () => {
    const us = addressSummary('us');
    expect(us.fields.map((f) => f.key)).toEqual(['street', 'intNumber', 'city', 'state', 'zipCode', 'reference']);
    expect(us.fields.filter((f) => f.required).map((f) => f.key)).toEqual(['street', 'city', 'state', 'zipCode']);
    expect(us.stateAsCode).toBe(true);
  });

  it('Colombia y Guatemala: el código postal es obligatorio en la tienda aunque el alta lo deje opcional', () => {
    const co = addressSummary('CO');
    expect(co.fields.find((f) => f.key === 'zipCode')?.required).toBe(true);
    expect(co.fields.find((f) => f.key === 'neighborhood')?.required).toBe(false);
    expect(co.requiredCount).toBe(4);

    const gt = addressSummary('GT');
    expect(gt.fields.find((f) => f.key === 'zipCode')?.required).toBe(true);
    expect(gt.fields.find((f) => f.key === 'neighborhood')?.required).toBe(true);
    expect(gt.requiredCount).toBe(5);
  });

  it('respeta los topes del pedido (calle 200, referencias 255)', () => {
    const mx = addressSummary('MX');
    expect(mx.fields.find((f) => f.key === 'street')?.maxLength).toBe(200);
    expect(mx.fields.find((f) => f.key === 'reference')?.maxLength).toBe(255);
    expect(mx.fields.find((f) => f.key === 'zipCode')?.maxLength).toBe(5);
  });
});

describe('store-country/address-summary · estado o departamento', () => {
  it('con catálogo se elige de la lista', () => {
    expect(stateCatalogNote('Estado', { kind: 'list', count: 32 }, false)).toEqual({
      ok: true,
      text: '«Estado» se elige de una lista de 32 opciones.',
    });
    expect(stateCatalogNote('Departamento', { kind: 'list', count: 1 }, false).text).toBe(
      '«Departamento» se elige de una lista de 1 opción.',
    );
  });

  it('en Estados Unidos se guarda la clave de 2 letras', () => {
    const note = stateCatalogNote('Estado', { kind: 'list', count: 51 }, true);
    expect(note.ok).toBe(true);
    expect(note.text).toContain('lista de 51 opciones');
    expect(note.text).toContain('clave de 2 letras');
  });

  it('sin catálogo se escribe a mano, y se avisa', () => {
    expect(stateCatalogNote('Departamento', { kind: 'list', count: 0 }, false)).toEqual({
      ok: false,
      text: '«Departamento» no tiene lista cargada: quien compra lo escribe a mano. La lista la carga Sistemas.',
    });
    expect(stateCatalogNote('Estado', { kind: 'error' }, false).ok).toBe(false);
    expect(stateCatalogNote('Estado', { kind: 'loading' }, false)).toEqual({ ok: true, text: 'Consultando la lista de «Estado»…' });
    // Sin etiqueta usa una genérica.
    expect(stateCatalogNote(' ', { kind: 'list', count: 2 }, false).text).toBe('«Estado» se elige de una lista de 2 opciones.');
  });
});
