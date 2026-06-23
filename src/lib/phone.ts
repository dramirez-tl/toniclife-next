// phone.ts - Catálogo de ladas y normalización de teléfonos.
// Guardado canónico: E.164 sin espacios -> "+<lada><número>" (ej. +525512345678).
// Validación: longitud de dígitos por país (MX/US = 10).

export interface PhoneCountry {
  /** ISO-2 (coincide con tonic.countries.code) */
  code: string;
  name: string;
  /** Lada / código telefónico, sin '+' (tonic.countries.phone_code) */
  dial: string;
  /** Dígitos esperados del número local */
  digits: number;
  flag: string;
}

// Países del catálogo (tonic.countries). digits = longitud del número local.
export const PHONE_COUNTRIES: PhoneCountry[] = [
  { code: 'MX', name: 'México', dial: '52', digits: 10, flag: '🇲🇽' },
  { code: 'US', name: 'Estados Unidos', dial: '1', digits: 10, flag: '🇺🇸' },
  { code: 'GT', name: 'Guatemala', dial: '502', digits: 8, flag: '🇬🇹' },
  { code: 'SV', name: 'El Salvador', dial: '503', digits: 8, flag: '🇸🇻' },
  { code: 'HN', name: 'Honduras', dial: '504', digits: 8, flag: '🇭🇳' },
  { code: 'NI', name: 'Nicaragua', dial: '505', digits: 8, flag: '🇳🇮' },
  { code: 'CR', name: 'Costa Rica', dial: '506', digits: 8, flag: '🇨🇷' },
  { code: 'PA', name: 'Panamá', dial: '507', digits: 8, flag: '🇵🇦' },
  { code: 'CO', name: 'Colombia', dial: '57', digits: 10, flag: '🇨🇴' },
  { code: 'PE', name: 'Perú', dial: '51', digits: 9, flag: '🇵🇪' },
  { code: 'EC', name: 'Ecuador', dial: '593', digits: 9, flag: '🇪🇨' },
  { code: 'CL', name: 'Chile', dial: '56', digits: 9, flag: '🇨🇱' },
  { code: 'AR', name: 'Argentina', dial: '54', digits: 10, flag: '🇦🇷' },
  { code: 'BR', name: 'Brasil', dial: '55', digits: 11, flag: '🇧🇷' },
  { code: 'ES', name: 'España', dial: '34', digits: 9, flag: '🇪🇸' },
];

export const DEFAULT_PHONE_COUNTRY = PHONE_COUNTRIES[0]; // México

/** Dials ordenados por longitud desc (para hacer match del más específico). */
const DIALS_BY_LEN = [...PHONE_COUNTRIES].sort(
  (a, b) => b.dial.length - a.dial.length,
);

export function findCountryByCode(code: string): PhoneCountry | undefined {
  return PHONE_COUNTRIES.find((c) => c.code === code);
}

/** Solo dígitos. */
export function onlyDigits(s: string): string {
  return (s || '').replace(/\D/g, '');
}

/**
 * Parsea un valor guardado a { country, number }.
 * Acepta E.164 ('+525512345678'), con espacios/legacy, o un número suelto
 * (se asume México). country = el país detectado por la lada.
 */
export function parsePhone(value?: string | null): {
  country: PhoneCountry;
  number: string;
} {
  const raw = (value || '').trim();
  if (!raw) return { country: DEFAULT_PHONE_COUNTRY, number: '' };

  if (raw.startsWith('+')) {
    const digits = onlyDigits(raw);
    for (const c of DIALS_BY_LEN) {
      if (digits.startsWith(c.dial)) {
        return { country: c, number: digits.slice(c.dial.length) };
      }
    }
    return { country: DEFAULT_PHONE_COUNTRY, number: digits };
  }

  // Sin '+': número local legacy -> México por defecto.
  return { country: DEFAULT_PHONE_COUNTRY, number: onlyDigits(raw) };
}

/** Construye E.164 sin espacios: '+<dial><número>'. '' si no hay número. */
export function toE164(country: PhoneCountry, number: string): string {
  const n = onlyDigits(number);
  if (!n) return '';
  return `+${country.dial}${n}`;
}

/** ¿El número local tiene la longitud correcta para el país? */
export function isValidLocalNumber(
  country: PhoneCountry,
  number: string,
): boolean {
  return onlyDigits(number).length === country.digits;
}

/** Formato legible: '+52 55 1234 5678' (solo para mostrar). */
export function formatPhoneDisplay(value?: string | null): string {
  if (!value) return '';
  const { country, number } = parsePhone(value);
  if (!number) return value;
  return `+${country.dial} ${number}`;
}
