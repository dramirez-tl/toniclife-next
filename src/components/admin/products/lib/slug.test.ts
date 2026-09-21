// slug.test.ts — la URL del producto en la ficha admin ("SEO y URL").

import { describe, expect, it } from 'vitest';
import { SLUG_FORMAT_MESSAGE, buildProductSlug, isLegacyInvalidSlug, isValidSlug, slugFieldError } from './slug';

// Slug real del producto MTP: el único fuera de formato en la BD (termina en guion).
const MTP_SLUG = 'membresia-premium-cortesia-';

describe('slugFieldError: el formato solo se exige si el usuario tocó la URL', () => {
  it('una URL heredada fuera de formato, SIN tocar, no bloquea guardar los metadatos (L7)', () => {
    expect(isValidSlug(MTP_SLUG)).toBe(false);
    expect(slugFieldError(MTP_SLUG, MTP_SLUG)).toBeNull();
  });

  it('si el usuario la cambia, el valor nuevo sí debe cumplir el formato', () => {
    expect(slugFieldError('membresia-premium-cortesia--', MTP_SLUG)).toBe(SLUG_FORMAT_MESSAGE);
    expect(slugFieldError('Membresía Premium', MTP_SLUG)).toBe(SLUG_FORMAT_MESSAGE);
    expect(slugFieldError('mtp-membresia-premium-cortesia', MTP_SLUG)).toBeNull();
  });

  it('una URL válida sin cambios y el vacío no dan error de formato (el vacío lo frena la sección)', () => {
    expect(slugFieldError('3025-crema-corporal', '3025-crema-corporal')).toBeNull();
    expect(slugFieldError('', '3025-crema-corporal')).toBeNull();
    expect(slugFieldError('  3025-crema-corporal  ', '3025-crema-corporal')).toBeNull();
  });

  it('producto sin URL guardada: cualquier valor nuevo se valida', () => {
    expect(slugFieldError('con espacios', null)).toBe(SLUG_FORMAT_MESSAGE);
    expect(slugFieldError('sin-espacios', undefined)).toBeNull();
  });
});

describe('isLegacyInvalidSlug: aviso no bloqueante', () => {
  it('avisa solo cuando hay URL guardada y está fuera de formato', () => {
    expect(isLegacyInvalidSlug(MTP_SLUG)).toBe(true);
    expect(isLegacyInvalidSlug('3025-crema-corporal')).toBe(false);
    expect(isLegacyInvalidSlug('')).toBe(false);
    expect(isLegacyInvalidSlug(null)).toBe(false);
  });

  it('"Regenerar URL" propone un valor que sí pasa el formato', () => {
    const regenerated = buildProductSlug('MTP', 'Membresía Premium (Cortesía) ');
    expect(regenerated).toBe('mtp-membresia-premium-cortesia');
    expect(isValidSlug(regenerated)).toBe(true);
  });
});
