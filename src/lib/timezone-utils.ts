// timezone-utils.ts - Shared timezone label utilities

export const DEFAULT_TIMEZONE = 'America/Mexico_City';

export const TIMEZONE_FULL_LABELS: Record<string, string> = {
  'America/Mexico_City': 'Ciudad de México (CST/CDT)',
  'America/Tijuana': 'Tijuana / Baja California (PST/PDT)',
  'America/Cancun': 'Cancún (EST fijo)',
  'America/Hermosillo': 'Hermosillo / Sonora (MST fijo)',
  'America/Chihuahua': 'Chihuahua (MST/MDT)',
  'America/Los_Angeles': 'Pacífico — Los Angeles (PST/PDT)',
  'America/Denver': 'Montaña — Denver (MST/MDT)',
  'America/Chicago': 'Central — Chicago / Tulsa (CST/CDT)',
  'America/New_York': 'Este — New York (EST/EDT)',
  'America/Guatemala': 'Guatemala (CST fijo)',
  'America/Tegucigalpa': 'Honduras (CST fijo)',
  'America/El_Salvador': 'El Salvador (CST fijo)',
  'America/Managua': 'Nicaragua (CST fijo)',
  'America/Costa_Rica': 'Costa Rica (CST fijo)',
  'America/Panama': 'Panamá (EST fijo)',
  'America/Bogota': 'Colombia (COT fijo)',
  'America/Lima': 'Perú (PET fijo)',
  'America/Caracas': 'Venezuela (VET fijo)',
  'America/Santiago': 'Chile (CLT/CLST)',
  'America/Argentina/Buenos_Aires': 'Argentina (ART fijo)',
};

export const TIMEZONE_SHORT_LABELS: Record<string, string> = {
  'America/Mexico_City': 'MX Centro',
  'America/Tijuana': 'MX Noroeste',
  'America/Cancun': 'MX Sureste',
  'America/Hermosillo': 'MX Sonora',
  'America/Chihuahua': 'MX Norte',
  'America/Los_Angeles': 'US Pacífico',
  'America/Denver': 'US Montaña',
  'America/Chicago': 'US Central',
  'America/New_York': 'US Este',
  'America/Guatemala': 'Guatemala',
  'America/Tegucigalpa': 'Honduras',
  'America/El_Salvador': 'El Salvador',
  'America/Managua': 'Nicaragua',
  'America/Costa_Rica': 'Costa Rica',
  'America/Panama': 'Panamá',
  'America/Bogota': 'Colombia',
  'America/Lima': 'Perú',
  'America/Caracas': 'Venezuela',
  'America/Santiago': 'Chile',
  'America/Argentina/Buenos_Aires': 'Argentina',
};

// ================================
// DATE FORMATTING WITH TIMEZONE
// ================================

/**
 * Formatea fecha + hora local de la sucursal
 * Ej: "13-mar 11:45 p.m."
 */
export function formatDateTimeLocal(
  date: Date | string,
  timezone: string,
  locale = 'es-MX',
): string {
  return new Date(date).toLocaleString(locale, {
    timeZone: timezone,
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });
}

/**
 * Solo fecha local: "13/03/2026"
 */
export function formatDateLocal(
  date: Date | string,
  timezone: string,
  locale = 'es-MX',
): string {
  return new Date(date).toLocaleString(locale, {
    timeZone: timezone,
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

/**
 * Solo hora local: "11:45 p.m."
 */
export function formatTimeLocal(
  date: Date | string,
  timezone: string,
  locale = 'es-MX',
): string {
  return new Date(date).toLocaleTimeString(locale, {
    timeZone: timezone,
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });
}

/**
 * Formato largo para detalles:
 * "viernes, 13 de marzo de 2026, 11:45 p.m."
 */
export function formatDateTimeLong(
  date: Date | string,
  timezone: string,
  locale = 'es-MX',
): string {
  return new Date(date).toLocaleString(locale, {
    timeZone: timezone,
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });
}

// ================================
// TIMEZONE LABEL HELPERS
// ================================

/** Returns the full human-readable label for an IANA timezone string. */
export function getTimezoneLabel(timezone?: string): string {
  if (!timezone) return TIMEZONE_FULL_LABELS['America/Mexico_City'];
  return TIMEZONE_FULL_LABELS[timezone] ?? timezone;
}

/** Returns the short region label for display in compact UI (e.g. POS header). */
export function getTimezoneShortLabel(timezone: string): string {
  return TIMEZONE_SHORT_LABELS[timezone] ?? timezone;
}
