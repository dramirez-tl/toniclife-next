import { describe, expect, it } from 'vitest';
import {
  NETWORK_ERROR_KEYS,
  isHttpStatus,
  isNetworkErrorCode,
  isUnreachable,
  networkErrorKey,
  parseNetworkError,
} from './network-error';

const httpError = (status: number, data: unknown, headers?: Record<string, string>) => ({
  message: `Request failed with status code ${status}`,
  response: { status, data, headers },
});

describe('networkErrorKey: tabla de códigos', () => {
  it('cada código NET_* ⇒ su clave i18n', () => {
    expect(networkErrorKey(httpError(404, { statusCode: 404, code: 'NET_NOT_IN_NETWORK', message: 'x' }))).toBe(
      'errors.notInNetwork',
    );
    expect(networkErrorKey(httpError(400, { code: 'NET_PERIOD_NOT_FOUND' }))).toBe('errors.periodNotFound');
    expect(networkErrorKey(httpError(400, { code: 'NET_PARENTS_LIMIT', details: { max: 50, received: 51 } }))).toBe(
      'errors.parentsLimit',
    );
    expect(networkErrorKey(httpError(404, { code: 'NET_EXPORT_JOB_NOT_FOUND' }))).toBe('exportPanel.phase.interrupted');
    expect(networkErrorKey(httpError(404, { code: 'NET_EXPORT_NOT_READY', details: { phase: 'writing' } }))).toBe(
      'errors.notReady',
    );
    expect(networkErrorKey(httpError(429, { code: 'NET_EXPORT_QUEUE_FULL' }))).toBe('exportPanel.busyGlobal');
    expect(networkErrorKey(httpError(429, { code: 'NET_EXPORT_DISK_FULL' }))).toBe('exportPanel.busyGlobal');
    expect(networkErrorKey(httpError(422, { code: 'NET_EXPORT_TOO_LARGE', details: { total: 80603 } }))).toBe(
      'exportPanel.tooLarge',
    );
    expect(networkErrorKey(httpError(409, { code: 'NET_EXPORT_NOT_CANCELLABLE' }))).toBe('errors.notCancellable');
    // La tabla cubre los 9 códigos del contrato §4.3.
    expect(Object.keys(NETWORK_ERROR_KEYS)).toHaveLength(9);
  });

  it('el código gana al estado HTTP', () => {
    // 404 con código propio NO es "interrumpido".
    expect(networkErrorKey(httpError(404, { code: 'NET_NOT_IN_NETWORK' }))).toBe('errors.notInNetwork');
  });

  it('cuerpo anidado por Nest ({ message: { code } })', () => {
    expect(networkErrorKey(httpError(429, { statusCode: 429, message: { code: 'NET_EXPORT_QUEUE_FULL' } }))).toBe(
      'exportPanel.busyGlobal',
    );
  });
});

describe('networkErrorKey: sin código', () => {
  it('429 del throttler ⇒ ocupado', () => {
    expect(
      networkErrorKey(httpError(429, { statusCode: 429, message: 'ThrottlerException: Too Many Requests' })),
    ).toBe('exportPanel.busyGlobal');
  });

  it('404 sin código ⇒ interrumpido (servidor reiniciado o job expirado)', () => {
    expect(networkErrorKey(httpError(404, { statusCode: 404, message: 'Not Found' }))).toBe(
      'exportPanel.phase.interrupted',
    );
  });

  it('sin respuesta ⇒ inalcanzable; otros ⇒ genérico', () => {
    expect(networkErrorKey({ message: 'Network Error', code: 'ERR_NETWORK' })).toBe('errors.unreachable');
    expect(networkErrorKey(new Error('boom'))).toBe('errors.unreachable');
    expect(networkErrorKey(httpError(500, { statusCode: 500, message: 'Internal server error' }))).toBe(
      'errors.generic',
    );
    expect(networkErrorKey(httpError(400, { statusCode: 400, message: ['periodId must be a UUID'] }))).toBe(
      'errors.generic',
    );
    expect(networkErrorKey(null)).toBe('errors.unreachable');
  });
});

describe('parseNetworkError', () => {
  it('lee estado, código, mensaje (plano, anidado o arreglo), detalles y Retry-After', () => {
    const parsed = parseNetworkError(
      httpError(
        429,
        { statusCode: 429, code: 'NET_EXPORT_DISK_FULL', message: 'No hay espacio…', details: { liveBytes: 1 } },
        { 'retry-after': '120' },
      ),
    );
    expect(parsed).toEqual({
      status: 429,
      code: 'NET_EXPORT_DISK_FULL',
      message: 'No hay espacio…',
      details: { liveBytes: 1 },
      retryAfterS: 120,
    });
    expect(parseNetworkError(httpError(400, { message: ['a', 'b'] })).message).toBe('a b');
    expect(parseNetworkError(httpError(400, { message: '   ' })).message).toBeNull();
    expect(parseNetworkError({ message: 'Network Error' })).toEqual({
      status: null,
      code: null,
      message: null,
      details: null,
      retryAfterS: null,
    });
    expect(parseNetworkError(httpError(429, {}, { 'Retry-After': 'x' })).retryAfterS).toBeNull();
  });

  it('predicados', () => {
    const err = httpError(409, { code: 'NET_EXPORT_NOT_CANCELLABLE', details: { phase: 'done' } });
    expect(isNetworkErrorCode(err, 'NET_EXPORT_NOT_CANCELLABLE')).toBe(true);
    expect(isNetworkErrorCode(err, 'NET_EXPORT_TOO_LARGE')).toBe(false);
    expect(isHttpStatus(err, 409)).toBe(true);
    expect(isHttpStatus(err, 404)).toBe(false);
    expect(isUnreachable(err)).toBe(false);
    expect(isUnreachable({ message: 'timeout of 10000ms exceeded' })).toBe(true);
  });
});
