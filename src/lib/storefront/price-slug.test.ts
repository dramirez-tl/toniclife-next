import { describe, expect, it } from 'vitest';
import { currencyForCountry, formatStorePrice, parseApiPrice } from './price';
import { buildProductSlug, extractCodeCandidate, isValidSlug, productPath, slugify } from './slug';

// Intl separa símbolo y cifra con espacios "raros" (NBSP) según moneda/ICU.
const plain = (value: string | null) => (value ?? '').replace(/[\u00a0\u202f]/g, ' ');

describe('parseApiPrice', () => {
  it('string numérica o number > 0', () => {
    expect(parseApiPrice('1121.00')).toBe(1121);
    expect(parseApiPrice(64.5)).toBe(64.5);
  });

  it('sin precio => null (la UI pinta "No disponible"; jamás se cae a los puntos)', () => {
    expect(parseApiPrice(undefined)).toBeNull();
    expect(parseApiPrice(null)).toBeNull();
    expect(parseApiPrice('')).toBeNull();
    expect(parseApiPrice('abc')).toBeNull();
    expect(parseApiPrice('0')).toBeNull();
    expect(parseApiPrice('0.00')).toBeNull();
    expect(parseApiPrice(-5)).toBeNull();
    expect(parseApiPrice(Number.NaN)).toBeNull();
  });
});

describe('formato de precio por país', () => {
  it('moneda del país', () => {
    expect(currencyForCountry('MX')).toBe('MXN');
    expect(currencyForCountry('US')).toBe('USD');
    expect(currencyForCountry('CO')).toBe('COP');
    expect(currencyForCountry('GT')).toBe('GTQ');
  });

  it('siempre con código de moneda explícito', () => {
    expect(plain(formatStorePrice(1121, 'MXN', 'es'))).toBe('$1,121.00 MXN');
    expect(plain(formatStorePrice(64.5, 'usd', 'en'))).toBe('$64.50 USD');
  });

  it('COP sin decimales (lo decide Intl)', () => {
    expect(plain(formatStorePrice(185000, 'COP', 'es'))).toMatch(/^\$185,000 COP$/);
  });

  it('sin precio => null; moneda inválida no rompe', () => {
    expect(formatStorePrice(null, 'MXN')).toBeNull();
    expect(formatStorePrice(0, 'MXN')).toBeNull();
    expect(formatStorePrice(Number.NaN, 'MXN')).toBeNull();
    expect(formatStorePrice(10, 'NO-ES-MONEDA')).toBe('10.00 NO-ES-MONEDA');
  });
});

describe('slug canónico', () => {
  it('convención codigo-nombre', () => {
    expect(buildProductSlug('3025', 'Crema Corporal Spectra 500ml')).toBe(
      '3025-crema-corporal-spectra-500ml',
    );
  });

  it('quita acentos, ñ, símbolos y espacios raros', () => {
    expect(slugify('Living. Elévate Ixtapa 2026\t')).toBe('living-elevate-ixtapa-2026');
    expect(slugify('INSCRIPCIÓN ENERGY GOLD $609.00')).toBe('inscripcion-energy-gold-609-00');
    expect(slugify('Piña & Ñandú')).toBe('pina-nandu');
    expect(slugify('')).toBe('');
    expect(slugify(null)).toBe('');
  });

  it('idempotente y con tope de 250 sin guion final', () => {
    const samples = ['Crema  Spectra—500 ml', 'ÁÉÍÓÚ ñ', '---a---b---'];
    for (const sample of samples) expect(slugify(slugify(sample))).toBe(slugify(sample));
    const long = slugify(`${'a'.repeat(249)} bcd`);
    expect(long.length).toBeLessThanOrEqual(250);
    expect(long.endsWith('-')).toBe(false);
  });

  it('isValidSlug', () => {
    expect(isValidSlug('3025-crema-corporal-spectra-500ml')).toBe(true);
    expect(isValidSlug('Crema')).toBe(false);
    expect(isValidSlug('crema--spectra')).toBe(false);
    expect(isValidSlug('-crema')).toBe(false);
    expect(isValidSlug('crema_spectra')).toBe(false);
    expect(isValidSlug('')).toBe(false);
    expect(isValidSlug(null)).toBe(false);
    expect(isValidSlug('a'.repeat(251))).toBe(false);
  });

  it('extractCodeCandidate y productPath', () => {
    expect(extractCodeCandidate('3025-crema-corporal')).toBe('3025');
    expect(extractCodeCandidate('kn002-inscripcion')).toBe('KN002');
    expect(extractCodeCandidate('../x')).toBeNull();
    expect(productPath('3025-crema')).toBe('/productos/3025-crema');
  });
});
