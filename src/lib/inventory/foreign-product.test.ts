import { describe, expect, it } from 'vitest';
import {
  clampCountQuantity,
  countUpperLimit,
  foreignBulkMessage,
  isForeignProductError,
  isForeignStockRow,
  PRODUCT_NOT_IN_BRANCH_COUNTRY,
  splitLookupFailures,
  toProductLookupFailure,
} from './foreign-product';

const apiError = (status: number, data: unknown) => ({ response: { status, data } });
const FOREIGN_MESSAGE =
  'La clave 6708 (R-TONIC 60 CAPS) no se maneja en México y Frontera: solo tiene precio en Estados Unidos, Colombia y Guatemala. No se le puede dar entrada en esta sucursal.';

describe('error del API "clave de otro país"', () => {
  it('se reconoce por el código, no por el estatus', () => {
    expect(isForeignProductError(apiError(400, { code: PRODUCT_NOT_IN_BRANCH_COUNTRY, message: 'x' }))).toBe(true);
    expect(isForeignProductError(apiError(400, { message: 'Datos inválidos' }))).toBe(false);
    expect(isForeignProductError(apiError(404, { message: 'Producto no encontrado' }))).toBe(false);
    expect(isForeignProductError(new Error('Network Error'))).toBe(false);
    expect(isForeignProductError(null)).toBe(false);
    expect(isForeignProductError(apiError(400, 'texto plano'))).toBe(false);
  });

  it('al buscar una clave de otro país se muestra el motivo del API, con los países donde sí existe', () => {
    const failure = toProductLookupFailure(
      apiError(400, { code: PRODUCT_NOT_IN_BRANCH_COUNTRY, message: FOREIGN_MESSAGE }),
      '6708',
    );
    expect(failure).toEqual({ sku: '6708', foreign: true, message: FOREIGN_MESSAGE });
  });

  it('si el API no manda texto, uno genérico que nombra la clave', () => {
    expect(toProductLookupFailure(apiError(400, { code: PRODUCT_NOT_IN_BRANCH_COUNTRY }), '6708').message).toBe(
      'La clave 6708 no se maneja en el país de esta sucursal.',
    );
    expect(
      toProductLookupFailure(apiError(400, { code: PRODUCT_NOT_IN_BRANCH_COUNTRY, message: ['uno', 'dos'] }), '6708')
        .message,
    ).toBe('uno dos');
  });

  it('cualquier otro fallo sigue siendo "Producto no encontrado"', () => {
    expect(toProductLookupFailure(apiError(404, { message: 'Producto no encontrado' }), 'ABC1')).toEqual({
      sku: 'ABC1',
      foreign: false,
      message: 'Producto no encontrado: ABC1',
    });
    expect(toProductLookupFailure(new Error('timeout'), '9019').foreign).toBe(false);
  });
});

describe('captura por lista', () => {
  it('separa las claves que no existen de las de otro país', () => {
    const failures = [
      toProductLookupFailure(apiError(404, {}), 'NOPE'),
      toProductLookupFailure(apiError(400, { code: PRODUCT_NOT_IN_BRANCH_COUNTRY, message: 'm' }), '6708'),
      toProductLookupFailure(apiError(400, { code: PRODUCT_NOT_IN_BRANCH_COUNTRY, message: 'm' }), '6043'),
    ];
    expect(splitLookupFailures(failures)).toEqual({ notFound: ['NOPE'], foreign: ['6708', '6043'] });
    expect(splitLookupFailures([])).toEqual({ notFound: [], foreign: [] });
  });

  it('aviso de las claves de otro país', () => {
    expect(foreignBulkMessage(['6708'])).toBe('La clave 6708 es de otro país y no se agregó');
    expect(foreignBulkMessage(['6708', '6043'])).toBe('Claves de otro país, no se agregaron: 6708, 6043');
  });
});

describe('renglones de existencias', () => {
  it('la marca viene del API; si no viene (API anterior) no hay marca', () => {
    expect(isForeignStockRow({ foreignToBranch: true })).toBe(true);
    expect(isForeignStockRow({ foreignToBranch: false })).toBe(false);
    expect(isForeignStockRow({})).toBe(false);
  });
});

describe('conteo de una clave de otro país', () => {
  it('una clave del país no tiene tope', () => {
    expect(countUpperLimit(false, 5)).toBeUndefined();
    expect(countUpperLimit(undefined, 5)).toBeUndefined();
    expect(clampCountQuantity(40, false, 5)).toBe(40);
  });

  it('una clave de otro país solo se confirma o se baja', () => {
    expect(countUpperLimit(true, 5)).toBe(5);
    expect(clampCountQuantity(9, true, 5)).toBe(5);
    expect(clampCountQuantity(5, true, 5)).toBe(5);
    expect(clampCountQuantity(0, true, 5)).toBe(0);
    expect(countUpperLimit(true, 0)).toBe(0);
    expect(clampCountQuantity(3, true, 0)).toBe(0);
  });

  it('nunca negativa ni NaN', () => {
    expect(clampCountQuantity(-4, false, 5)).toBe(0);
    expect(clampCountQuantity(Number.NaN, false, 5)).toBe(0);
    expect(clampCountQuantity(-4, true, 5)).toBe(0);
  });
});
