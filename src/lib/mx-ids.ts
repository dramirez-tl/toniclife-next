// mx-ids.ts - Espejo en el front de toniclife-api/src/common/validators
// (mx-ids.lib.ts, bank-accounts.lib.ts, bank-catalog.lib.ts) para validar EN
// VIVO en /distribuidor/pagos y en el revisor de Tesorería: CURP y RFC con
// dígito verificador, RFC genérico, cruce CURP↔RFC, CLABE (dígito 3-7-1) con
// banco detectado por prefijo ABM, routing ABA y máscaras. Sin dependencias.
// El servidor SIEMPRE vuelve a validar: esto solo acorta el ciclo de captura.
// Mantener sincronizado con la API (mismos algoritmos y vectores de prueba:
// scripts/mx-ids.test.mjs).

export type PersonType = 'fisica' | 'moral';
export type CurpFailure = 'FORMAT' | 'DATE' | 'CHECK_DIGIT';
export type RfcFailure = 'FORMAT' | 'CHECK_DIGIT' | 'GENERIC';
export type ClabeFailure = 'LENGTH' | 'DIGITS' | 'CHECK_DIGIT';

export const CURP_ALPHABET = '0123456789ABCDEFGHIJKLMNÑOPQRSTUVWXYZ';
export const RFC_ALPHABET = '0123456789ABCDEFGHIJKLMN&OPQRSTUVWXYZ Ñ';
export const RFC_REGEX = /^[A-ZÑ&]{3,4}[0-9]{6}[A-Z0-9]{3}$/;
export const GENERIC_RFCS = ['XAXX010101000', 'XEXX010101000'] as const;

export const CURP_STATE_CODES = [
  'AS', 'BC', 'BS', 'CC', 'CL', 'CM', 'CS', 'CH', 'DF', 'DG', 'GT', 'GR', 'HG',
  'JC', 'MC', 'MN', 'MS', 'NT', 'NL', 'OC', 'PL', 'QT', 'QR', 'SP', 'SL', 'SR',
  'TC', 'TS', 'TL', 'VZ', 'YN', 'ZS', 'NE',
] as const;

export const CURP_REGEX = new RegExp(
  '^[A-ZÑ][AEIOUX][A-ZÑ]{2}' +
    '\\d{2}(0[1-9]|1[0-2])(0[1-9]|[12]\\d|3[01])' +
    '[HM]' +
    `(${CURP_STATE_CODES.join('|')})` +
    '[B-DF-HJ-NP-TV-ZÑ]{3}' +
    '[A-Z\\d]\\d$',
);

export interface CurpCheck {
  ok: boolean;
  normalized: string;
  reason?: CurpFailure;
}

export interface RfcCheck {
  ok: boolean;
  normalized: string;
  personType?: PersonType;
  reason?: RfcFailure;
}

export interface BankMx {
  code: string;
  name: string;
  shortName: string;
}

export interface ClabeCheck {
  ok: boolean;
  normalized: string;
  reason?: ClabeFailure;
  bank: BankMx | null;
}

// ---------------------------------------------------------------------------
// normalización
// ---------------------------------------------------------------------------

export function normalizeId(value: unknown): string {
  if (value === null || value === undefined) return '';
  return String(value)
    .normalize('NFC')
    .toUpperCase()
    .replace(/[\s\-.]/g, '');
}

export function normalizeAccount(value: unknown): string {
  if (value === null || value === undefined) return '';
  return String(value).replace(/[\s\-.]/g, '');
}

// ---------------------------------------------------------------------------
// CURP
// ---------------------------------------------------------------------------

function isLeap(y: number): boolean {
  return (y % 4 === 0 && y % 100 !== 0) || y % 400 === 0;
}

function daysInMonth(y: number, m: number): number {
  return [31, isLeap(y) ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31][m - 1];
}

export function curpDateIsValid(curp: string): boolean {
  const yy = Number(curp.slice(4, 6));
  const mm = Number(curp.slice(6, 8));
  const dd = Number(curp.slice(8, 10));
  if (!(mm >= 1 && mm <= 12) || dd < 1) return false;
  const century = /\d/.test(curp[16]) ? 1900 : 2000;
  return dd <= daysInMonth(century + yy, mm);
}

export function curpCheckDigit(curp17: string): number {
  let sum = 0;
  for (let i = 0; i < 17; i++) {
    const v = CURP_ALPHABET.indexOf(curp17[i]);
    if (v < 0) return -1;
    sum += v * (18 - i);
  }
  return (10 - (sum % 10)) % 10;
}

export function isValidCurp(value: unknown): CurpCheck {
  const normalized = normalizeId(value);
  if (normalized.length !== 18 || !CURP_REGEX.test(normalized)) {
    return { ok: false, normalized, reason: 'FORMAT' };
  }
  if (!curpDateIsValid(normalized)) return { ok: false, normalized, reason: 'DATE' };
  if (curpCheckDigit(normalized) !== Number(normalized[17])) {
    return { ok: false, normalized, reason: 'CHECK_DIGIT' };
  }
  return { ok: true, normalized };
}

// ---------------------------------------------------------------------------
// RFC
// ---------------------------------------------------------------------------

export function isGenericRfc(value: unknown): boolean {
  return (GENERIC_RFCS as readonly string[]).includes(normalizeId(value));
}

export function rfcPersonType(rfc: string): PersonType | null {
  if (rfc.length === 13) return 'fisica';
  if (rfc.length === 12) return 'moral';
  return null;
}

export function rfcCheckDigit(rfc: string): string {
  const padded = rfc.length === 12 ? ' ' + rfc : rfc;
  if (padded.length !== 13) return '';
  let sum = 0;
  for (let i = 0; i < 12; i++) {
    const v = RFC_ALPHABET.indexOf(padded[i]);
    if (v < 0) return '';
    sum += v * (13 - i);
  }
  const d = 11 - (sum % 11);
  if (d === 11) return '0';
  if (d === 10) return 'A';
  return String(d);
}

function rfcDateIsPlausible(rfc: string): boolean {
  const start = rfc.length === 13 ? 4 : 3;
  const mm = Number(rfc.slice(start + 2, start + 4));
  const dd = Number(rfc.slice(start + 4, start + 6));
  return mm >= 1 && mm <= 12 && dd >= 1 && dd <= 31;
}

export function isValidRfc(value: unknown, options: { allowGeneric?: boolean } = {}): RfcCheck {
  const normalized = normalizeId(value);
  if (isGenericRfc(normalized)) {
    return options.allowGeneric
      ? { ok: true, normalized, personType: 'fisica' }
      : { ok: false, normalized, personType: 'fisica', reason: 'GENERIC' };
  }
  const personType = rfcPersonType(normalized);
  if (!personType || !RFC_REGEX.test(normalized) || !rfcDateIsPlausible(normalized)) {
    return { ok: false, normalized, reason: 'FORMAT' };
  }
  if (rfcCheckDigit(normalized) !== normalized[normalized.length - 1]) {
    return { ok: false, normalized, personType, reason: 'CHECK_DIGIT' };
  }
  return { ok: true, normalized, personType };
}

export function rfcMatchesCurp(rfc: unknown, curp: unknown): boolean {
  const r = normalizeId(rfc);
  const c = normalizeId(curp);
  if (r.length !== 13 || c.length !== 18) return false;
  return r.slice(0, 10) === c.slice(0, 10);
}

export function maskRfc(value: unknown): string {
  const r = normalizeId(value);
  if (!r) return '';
  if (r.length <= 6) return '*'.repeat(r.length);
  return r.slice(0, 3) + '*'.repeat(r.length - 6) + r.slice(-3);
}

export function maskCurp(value: unknown): string {
  const c = normalizeId(value);
  if (!c) return '';
  if (c.length <= 6) return '*'.repeat(c.length);
  return c.slice(0, 4) + '*'.repeat(c.length - 6) + c.slice(-2);
}

// ---------------------------------------------------------------------------
// Bancos (catálogo ABM) y CLABE
// ---------------------------------------------------------------------------

export const BANKS_MX: readonly BankMx[] = [
  { code: '002', name: 'Banco Nacional de México (Citibanamex)', shortName: 'Banamex' },
  { code: '006', name: 'Banco Nacional de Comercio Exterior', shortName: 'Bancomext' },
  { code: '009', name: 'Banco Nacional de Obras y Servicios Públicos', shortName: 'Banobras' },
  { code: '012', name: 'BBVA México', shortName: 'BBVA' },
  { code: '014', name: 'Banco Santander México', shortName: 'Santander' },
  { code: '019', name: 'Banco Nacional del Ejército, Fuerza Aérea y Armada', shortName: 'Banjército' },
  { code: '021', name: 'HSBC México', shortName: 'HSBC' },
  { code: '030', name: 'Banco del Bajío', shortName: 'BanBajío' },
  { code: '036', name: 'Banco Inbursa', shortName: 'Inbursa' },
  { code: '042', name: 'Banca Mifel', shortName: 'Mifel' },
  { code: '044', name: 'Scotiabank Inverlat', shortName: 'Scotiabank' },
  { code: '058', name: 'Banco Regional de Monterrey', shortName: 'Banregio' },
  { code: '059', name: 'Banco Invex', shortName: 'Invex' },
  { code: '060', name: 'Bansi', shortName: 'Bansi' },
  { code: '062', name: 'Banca Afirme', shortName: 'Afirme' },
  { code: '072', name: 'Banco Mercantil del Norte', shortName: 'Banorte' },
  { code: '106', name: 'Bank of America México', shortName: 'Bank of America' },
  { code: '108', name: 'MUFG Bank México', shortName: 'MUFG' },
  { code: '110', name: 'Banco J.P. Morgan', shortName: 'JP Morgan' },
  { code: '112', name: 'Banco Monex', shortName: 'Monex' },
  { code: '113', name: 'Banco Ve por Más', shortName: 'Ve por Más' },
  { code: '126', name: 'Banco Credit Suisse México', shortName: 'Credit Suisse' },
  { code: '127', name: 'Banco Azteca', shortName: 'Azteca' },
  { code: '128', name: 'Banco Autofin México', shortName: 'Autofin' },
  { code: '129', name: 'Barclays Bank México', shortName: 'Barclays' },
  { code: '130', name: 'Banco Compartamos', shortName: 'Compartamos' },
  { code: '132', name: 'Banco Multiva', shortName: 'Multiva' },
  { code: '133', name: 'Banco Actinver', shortName: 'Actinver' },
  { code: '135', name: 'Nacional Financiera', shortName: 'Nafin' },
  { code: '136', name: 'Intercam Banco', shortName: 'Intercam' },
  { code: '137', name: 'BanCoppel', shortName: 'BanCoppel' },
  { code: '138', name: 'ABC Capital', shortName: 'ABC Capital' },
  { code: '140', name: 'Consubanco', shortName: 'Consubanco' },
  { code: '141', name: 'Volkswagen Bank', shortName: 'Volkswagen Bank' },
  { code: '143', name: 'CIBanco', shortName: 'CIBanco' },
  { code: '145', name: 'Banco Base', shortName: 'BanBase' },
  { code: '147', name: 'Bankaool', shortName: 'Bankaool' },
  { code: '148', name: 'Banco PagaTodo', shortName: 'PagaTodo' },
  { code: '150', name: 'Banco Inmobiliario Mexicano', shortName: 'BIM' },
  { code: '151', name: 'Fundación Dondé Banco', shortName: 'Dondé' },
  { code: '152', name: 'Bancrea', shortName: 'Bancrea' },
  { code: '154', name: 'Banco Covalto', shortName: 'Covalto' },
  { code: '155', name: 'Industrial and Commercial Bank of China México', shortName: 'ICBC' },
  { code: '156', name: 'Banco Sabadell', shortName: 'Sabadell' },
  { code: '157', name: 'Shinhan Bank México', shortName: 'Shinhan' },
  { code: '158', name: 'Mizuho Bank México', shortName: 'Mizuho' },
  { code: '159', name: 'Bank of China México', shortName: 'Bank of China' },
  { code: '160', name: 'Banco S3 Caceis México', shortName: 'Banco S3' },
  { code: '166', name: 'Banco del Bienestar', shortName: 'Bienestar' },
  { code: '168', name: 'Sociedad Hipotecaria Federal', shortName: 'SHF' },
  { code: '600', name: 'Monex Casa de Bolsa', shortName: 'Monex CB' },
  { code: '601', name: 'GBM Grupo Bursátil Mexicano', shortName: 'GBM' },
  { code: '602', name: 'Masari Casa de Bolsa', shortName: 'Masari' },
  { code: '605', name: 'Value Casa de Bolsa', shortName: 'Value' },
  { code: '608', name: 'Vector Casa de Bolsa', shortName: 'Vector' },
  { code: '610', name: 'B y B Casa de Cambio', shortName: 'B&B' },
  { code: '613', name: 'Multiva Casa de Bolsa', shortName: 'Multiva CB' },
  { code: '616', name: 'Casa de Bolsa Finamex', shortName: 'Finamex' },
  { code: '617', name: 'Valores Mexicanos Casa de Bolsa', shortName: 'Valmex' },
  { code: '618', name: 'Única Casa de Cambio', shortName: 'Única' },
  { code: '619', name: 'MAPFRE Tepeyac', shortName: 'Mapfre' },
  { code: '620', name: 'Profuturo GNP Afore', shortName: 'Profuturo' },
  { code: '630', name: 'Intercam Casa de Bolsa', shortName: 'Intercam CB' },
  { code: '631', name: 'CI Casa de Bolsa', shortName: 'CI Bolsa' },
  { code: '634', name: 'Fincomún Servicios Financieros Comunitarios', shortName: 'Fincomún' },
  { code: '636', name: 'HDI Seguros', shortName: 'HDI' },
  { code: '637', name: 'OrderExpress Casa de Cambio', shortName: 'Order' },
  { code: '638', name: 'Nu México Financiera', shortName: 'Nu' },
  { code: '640', name: 'J.P. Morgan Casa de Bolsa', shortName: 'JP Morgan CB' },
  { code: '642', name: 'Operadora de Recursos Reforma', shortName: 'Reforma' },
  { code: '646', name: 'Sistema de Transferencias y Pagos STP', shortName: 'STP' },
  { code: '648', name: 'Evercore Casa de Bolsa', shortName: 'Evercore' },
  { code: '652', name: 'Solución Asea (Credicapital)', shortName: 'Credicapital' },
  { code: '653', name: 'Kuspit Casa de Bolsa', shortName: 'Kuspit' },
  { code: '656', name: 'Unagra', shortName: 'Unagra' },
  { code: '659', name: 'Operadora de Pagos Móviles (ASP Integra)', shortName: 'ASP Integra' },
  { code: '661', name: 'Servicios Financieros Alternativos (Klar)', shortName: 'Klar' },
  { code: '670', name: 'Libertad Servicios Financieros', shortName: 'Libertad' },
  { code: '677', name: 'Caja Popular Mexicana', shortName: 'Caja Popular Mexicana' },
  { code: '680', name: 'Caja Cristóbal Colón', shortName: 'Cristóbal Colón' },
  { code: '683', name: 'Caja Telefonistas', shortName: 'Caja Telefonistas' },
  { code: '684', name: 'Operadora de Pagos Móviles de México (Transfer)', shortName: 'Transfer' },
  { code: '685', name: 'Fondo de Garantía y Fomento (FIRA)', shortName: 'FIRA' },
  { code: '686', name: 'Invercap', shortName: 'Invercap' },
  { code: '689', name: 'Fomento Empresarial (Fomped)', shortName: 'Fomped' },
  { code: '703', name: 'Tesored', shortName: 'Tesored' },
  { code: '706', name: 'Arcus Financial Intelligence', shortName: 'Arcus' },
  { code: '710', name: 'NVIO Pagos México', shortName: 'NVIO' },
  { code: '722', name: 'Mercado Pago (Mercado Lending)', shortName: 'Mercado Pago' },
  { code: '723', name: 'Cuenca Tecnología Financiera', shortName: 'Cuenca' },
  { code: '728', name: 'Spin by OXXO', shortName: 'Spin' },
];

const BANK_BY_CODE = new Map(BANKS_MX.map((b) => [b.code, b]));

export function findBank(code: unknown): BankMx | null {
  if (code === null || code === undefined) return null;
  const c = String(code).trim();
  if (!/^\d{1,3}$/.test(c)) return null;
  return BANK_BY_CODE.get(c.padStart(3, '0')) ?? null;
}

const CLABE_WEIGHTS = [3, 7, 1] as const;

export function clabeCheckDigit(clabe17: string): number {
  if (!/^\d{17}/.test(clabe17)) return -1;
  let sum = 0;
  for (let i = 0; i < 17; i++) {
    sum += (Number(clabe17[i]) * CLABE_WEIGHTS[i % 3]) % 10;
  }
  return (10 - (sum % 10)) % 10;
}

export function bankFromClabe(value: unknown): BankMx | null {
  const n = normalizeAccount(value);
  if (n.length < 3 || !/^\d{3}/.test(n)) return null;
  return findBank(n.slice(0, 3));
}

export function isValidClabe(value: unknown): ClabeCheck {
  const normalized = normalizeAccount(value);
  if (normalized.length !== 18) return { ok: false, normalized, reason: 'LENGTH', bank: null };
  if (!/^\d{18}$/.test(normalized)) return { ok: false, normalized, reason: 'DIGITS', bank: null };
  const bank = bankFromClabe(normalized);
  if (clabeCheckDigit(normalized) !== Number(normalized[17])) {
    return { ok: false, normalized, reason: 'CHECK_DIGIT', bank };
  }
  return { ok: true, normalized, bank };
}

// ---------------------------------------------------------------------------
// ABA routing (EE.UU.) y máscaras de cuenta
// ---------------------------------------------------------------------------

export function abaPrefixIsAssigned(routing: string): boolean {
  const p = Number(routing.slice(0, 2));
  return (p >= 1 && p <= 12) || (p >= 21 && p <= 32) || (p >= 61 && p <= 72) || p === 80;
}

export function isValidAbaRouting(value: unknown): boolean {
  const r = normalizeAccount(value);
  if (!/^\d{9}$/.test(r)) return false;
  if (!abaPrefixIsAssigned(r)) return false;
  const d = r.split('').map(Number);
  const sum = 3 * (d[0] + d[3] + d[6]) + 7 * (d[1] + d[4] + d[7]) + (d[2] + d[5] + d[8]);
  return sum % 10 === 0;
}

export function accountLast4(value: unknown): string {
  return normalizeAccount(value).slice(-4);
}

export function maskAccount(value: unknown): string {
  const n = normalizeAccount(value);
  if (!n) return '';
  return '****' + n.slice(-4);
}

// ---------------------------------------------------------------------------
// Compatibilidad con el espejo mínimo anterior (paymentUtils.ts): mismos
// nombres y forma { ok, reason?, personType? } sobre los validadores canónicos.
// ---------------------------------------------------------------------------

export interface IdValidation {
  ok: boolean;
  reason?: string;
  personType?: PersonType;
}

/** Alias histórico de BankMx. */
export type BankInfo = BankMx;

export function validateCurp(curp: string): IdValidation {
  const r = isValidCurp(curp);
  return r.ok ? { ok: true } : { ok: false, reason: r.reason };
}

export function validateRfc(rfc: string): IdValidation {
  const r = isValidRfc(rfc);
  return r.ok
    ? { ok: true, personType: r.personType }
    : { ok: false, reason: r.reason, personType: r.personType };
}

export function validateClabe(clabe: string): IdValidation {
  const r = isValidClabe(clabe);
  return r.ok ? { ok: true } : { ok: false, reason: r.reason };
}

export function detectBankFromClabe(clabe: string): BankInfo | null {
  return bankFromClabe(clabe);
}

export function validateUsRouting(routing: string): IdValidation {
  const v = normalizeAccount(routing);
  if (!/^\d{9}$/.test(v)) return { ok: false, reason: 'FORMAT' };
  return isValidAbaRouting(v) ? { ok: true } : { ok: false, reason: 'CHECK_DIGIT' };
}
