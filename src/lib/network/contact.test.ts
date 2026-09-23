import { describe, expect, it } from 'vitest';
import { phoneDigits, whatsAppUrl } from './contact';

describe('phoneDigits', () => {
  it('deja solo dígitos y quita el 00 internacional', () => {
    expect(phoneDigits('+52 (33) 1234-5678')).toBe('523312345678');
    expect(phoneDigits('0052 33 1234 5678')).toBe('523312345678');
    expect(phoneDigits('01 800 123 4567')).toBe('018001234567');
    expect(phoneDigits('')).toBe('');
    expect(phoneDigits(null)).toBe('');
    expect(phoneDigits(undefined)).toBe('');
  });
});

describe('whatsAppUrl', () => {
  it('arma wa.me con los dígitos cuando el teléfono es marcable', () => {
    expect(whatsAppUrl('+52 33 1234 5678')).toBe('https://wa.me/523312345678');
    expect(whatsAppUrl('3312345678')).toBe('https://wa.me/3312345678');
    expect(whatsAppUrl('+1 (415) 555-0134')).toBe('https://wa.me/14155550134');
  });

  it('sin teléfono, muy corto o muy largo ⇒ null (no se muestra el botón)', () => {
    expect(whatsAppUrl(null)).toBeNull();
    expect(whatsAppUrl('')).toBeNull();
    expect(whatsAppUrl('sin teléfono')).toBeNull();
    expect(whatsAppUrl('1234567')).toBeNull();
    expect(whatsAppUrl('1234567890123456')).toBeNull();
  });
});
