import { describe, expect, it } from 'vitest';
import {
  emptyCountriesToConfirm,
  fulfillmentErrorMessage,
  isVersionConflict,
  parseFulfillmentError,
} from './fulfillment-error';
import { matchesConfirmText } from '@/lib/confirm-text';

const httpError = (status: number, data: unknown) => ({
  message: `Request failed with status code ${status}`,
  response: { status, data },
});

describe('fulfillment-error', () => {
  it('lee el cuerpo plano y el anidado de Nest', () => {
    expect(parseFulfillmentError(httpError(409, { code: 'FUL_VERSION_CONFLICT', message: 'x' })).code).toBe(
      'FUL_VERSION_CONFLICT',
    );
    expect(
      parseFulfillmentError(
        httpError(409, { statusCode: 409, message: { code: 'FUL_VERSION_CONFLICT', message: 'x' } }),
      ).code,
    ).toBe('FUL_VERSION_CONFLICT');
    expect(isVersionConflict(httpError(409, { code: 'FUL_VERSION_CONFLICT' }))).toBe(true);
    expect(isVersionConflict(httpError(409, { code: 'FUL_EMPTY_COUNTRY_CONFIRM_REQUIRED' }))).toBe(false);
  });

  it('mensaje: tabla por código, luego el del API, nunca el genérico de axios', () => {
    expect(fulfillmentErrorMessage(httpError(400, { code: 'FUL_TOO_MANY_ROUTES', message: 'too many' }))).toBe(
      'Un país puede tener hasta 5 almacenes.',
    );
    expect(fulfillmentErrorMessage(httpError(400, { code: 'FUL_NUEVO', message: 'Texto del API.' }))).toBe(
      'Texto del API.',
    );
    expect(fulfillmentErrorMessage(httpError(500, { message: 'Internal server error' }), 'Falló.')).toBe('Falló.');
    expect(fulfillmentErrorMessage(httpError(403, {}))).toContain('permiso');
    expect(fulfillmentErrorMessage(httpError(404, {}))).toContain('todavía no está disponible');
    expect(fulfillmentErrorMessage({ message: 'Network Error' })).toContain('conectar');
    expect(fulfillmentErrorMessage(httpError(400, { message: ['a', 'b'] }))).toBe('a b');
  });

  it('países a confirmar: acepta string[] y [{countryCode}]', () => {
    const code = 'FUL_EMPTY_COUNTRY_CONFIRM_REQUIRED';
    expect(emptyCountriesToConfirm(httpError(409, { code, details: { countries: ['mx', 'US'] } }))).toEqual([
      'MX',
      'US',
    ]);
    expect(emptyCountriesToConfirm(httpError(409, { code, details: { countries: [{ countryCode: 'CO' }] } }))).toEqual([
      'CO',
    ]);
    expect(emptyCountriesToConfirm(httpError(409, { code }))).toEqual([]);
    expect(emptyCountriesToConfirm(httpError(409, { code: 'FUL_VERSION_CONFLICT' }))).toBeNull();
  });
});

describe('matchesConfirmText', () => {
  it('exact: idéntico salvo espacios a los lados', () => {
    expect(matchesConfirmText(' CANCELAR ', 'CANCELAR')).toBe(true);
    expect(matchesConfirmText('cancelar', 'CANCELAR')).toBe(false);
  });

  it('loose: ignora mayúsculas, acentos y espacios', () => {
    expect(matchesConfirmText('mexico', 'México', 'loose')).toBe(true);
    expect(matchesConfirmText('MÉXICO ', 'México', 'loose')).toBe(true);
    expect(matchesConfirmText('mexico,estados  unidos', 'México, Estados Unidos', 'loose')).toBe(true);
    expect(matchesConfirmText('', 'México', 'loose')).toBe(false);
    expect(matchesConfirmText('Mexic', 'México', 'loose')).toBe(false);
  });
});
