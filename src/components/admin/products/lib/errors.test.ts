// errors.test.ts — qué mensaje ve el usuario ante cada error del catálogo admin.

import { describe, expect, it } from 'vitest';
import { hydrateBlobErrorBody, migrationPendingMessage, productAdminErrorMessage } from './errors';

const httpError = (status: number, data: unknown) => ({ message: `Request failed with status code ${status}`, response: { status, data } });

describe('productAdminErrorMessage', () => {
  it('PRD_PRICE_INVALID muestra el mensaje del API (promocional distinto de 0)', () => {
    const err = httpError(400, { code: 'PRD_PRICE_INVALID', message: 'Un producto promocional solo admite precio 0.', field: 'price' });
    expect(productAdminErrorMessage(err, 'respaldo')).toBe('Un producto promocional solo admite precio 0.');
  });

  it('PRD_PRICE_INVALID muestra el mensaje del API (fecha de vigencia futura)', () => {
    const message = 'La vigencia no puede iniciar en el futuro. Usa Cambios programados.';
    const err = httpError(400, { code: 'PRD_PRICE_INVALID', message, field: 'effectiveFrom' });
    expect(productAdminErrorMessage(err, 'respaldo')).toBe(message);
  });

  it('PRD_PRICE_INVALID sin mensaje útil cae al texto fijo', () => {
    expect(productAdminErrorMessage(httpError(400, { code: 'PRD_PRICE_INVALID' }), 'respaldo')).toBe(
      'El precio debe ser mayor a cero (solo los promocionales admiten 0).',
    );
    expect(productAdminErrorMessage(httpError(400, { code: 'PRD_PRICE_INVALID', message: 'Bad Request' }), 'respaldo')).toBe(
      'El precio debe ser mayor a cero (solo los promocionales admiten 0).',
    );
  });

  it('403 con PRD_FORBIDDEN muestra qué permiso falta', () => {
    const message = 'Activar o desactivar productos requiere el permiso products:delete.';
    expect(productAdminErrorMessage(httpError(403, { code: 'PRD_FORBIDDEN', message }), 'respaldo')).toBe(message);
  });

  it('403 sin código propio conserva el texto genérico de permisos', () => {
    expect(productAdminErrorMessage(httpError(403, { message: 'Forbidden resource' }), 'respaldo')).toBe(
      'No tienes permiso para realizar esta acción.',
    );
    expect(productAdminErrorMessage(httpError(403, { code: 'PRD_FORBIDDEN' }), 'respaldo')).toBe(
      'No tienes permiso para realizar esta acción.',
    );
  });

  it('los demás códigos siguen con su texto fijo y la sugerencia de URL', () => {
    const err = httpError(409, { code: 'PRD_SLUG_TAKEN', message: 'x', details: { suggestion: '3025-crema-2' } });
    expect(productAdminErrorMessage(err, 'respaldo')).toBe('Esa URL ya la usa otro producto. Sugerencia: 3025-crema-2');
  });

  it('sin cuerpo útil usa el respaldo de la acción', () => {
    expect(productAdminErrorMessage(httpError(500, { message: 'Internal server error' }), 'respaldo')).toBe('respaldo');
    expect(productAdminErrorMessage(new Error('Network Error'), 'respaldo')).toBe('respaldo');
  });

  it('503 PRD_MIGRATION_PENDING nombra la migración que falta (details.migration)', () => {
    const apiText =
      'Esta función estará disponible en cuanto se aplique una actualización pendiente de la base de datos. Intenta de nuevo en unos minutos.';
    const err = httpError(503, { code: 'PRD_MIGRATION_PENDING', message: apiText, details: { migration: '178_product_families.sql' } });
    expect(productAdminErrorMessage(err, 'respaldo')).toBe(
      'Falta aplicar la migración 178 en la base de datos (el API respondió 503).',
    );
    expect(migrationPendingMessage({ migration: 'migrations/177_online_audience.sql' })).toBe(
      'Falta aplicar la migración 177 en la base de datos (el API respondió 503).',
    );
    expect(productAdminErrorMessage(httpError(503, { code: 'PRD_MIGRATION_PENDING', message: apiText }), 'respaldo')).toBe(
      'Falta aplicar una migración pendiente en la base de datos (el API respondió 503).',
    );
  });

  it('PRD_VARIANT_DUPLICATE prefiere el mensaje del API (dice la clave que choca) y tiene respaldo', () => {
    const message = 'Ya existe otra variante activa con ese género, color y talla en la familia (clave PLR-M).';
    expect(productAdminErrorMessage(httpError(409, { code: 'PRD_VARIANT_DUPLICATE', message, field: 'variantSize' }), 'respaldo')).toBe(message);
    expect(productAdminErrorMessage(httpError(409, { code: 'PRD_VARIANT_DUPLICATE' }), 'respaldo')).toBe(
      'Ya existe otra variante activa con el mismo género, color y talla en esta familia.',
    );
    expect(productAdminErrorMessage(httpError(409, { code: 'PRD_FAMILY_CODE_TAKEN', message: 'Ya existe una familia con la clave PLR.' }), 'respaldo')).toBe(
      'Esa clave ya la usa otra familia.',
    );
  });
});

describe('hydrateBlobErrorBody (descargas con responseType blob)', () => {
  it('convierte el Blob del error en el JSON del API', async () => {
    const body = { code: 'PRD_ISSUE_INVALID', message: 'Incidencia no válida: x.' };
    const err = httpError(400, new Blob([JSON.stringify(body)], { type: 'application/json' }));
    await hydrateBlobErrorBody(err);
    expect(err.response.data).toEqual(body);
    expect(productAdminErrorMessage(err, 'respaldo')).toBe('Incidencia no válida: x.');
  });

  it('un 403 PRD_FORBIDDEN en blob también se lee', async () => {
    const body = { code: 'PRD_FORBIDDEN', message: 'Exportar requiere products:read.' };
    const err = httpError(403, new Blob([JSON.stringify(body)]));
    await hydrateBlobErrorBody(err);
    expect(productAdminErrorMessage(err, 'respaldo')).toBe('Exportar requiere products:read.');
  });

  it('cuerpo no-JSON o error sin respuesta: no lanza y queda el respaldo', async () => {
    const err = httpError(502, new Blob(['<html>Bad gateway</html>']));
    await expect(hydrateBlobErrorBody(err)).resolves.toBeUndefined();
    expect(productAdminErrorMessage(err, 'respaldo')).toBe('respaldo');
    await expect(hydrateBlobErrorBody(new Error('Network Error'))).resolves.toBeUndefined();
    await expect(hydrateBlobErrorBody(null)).resolves.toBeUndefined();
  });
});
