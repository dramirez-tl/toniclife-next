// mx-ids.ts — espejo mínimo de src/common/validators (API) para validación en
// vivo en el navegador. TODO: sustituir por la versión canónica del paso 2 del
// contrato Tesorería (misma spec que mx-ids.lib.ts / bank-accounts.lib.ts).

export interface IdValidation {
  ok: boolean;
  reason?: string;
  personType?: 'fisica' | 'moral';
}

export interface BankInfo {
  code: string;
  name: string;
  shortName: string;
}

const CURP_ALPHABET = '0123456789ABCDEFGHIJKLMNÑOPQRSTUVWXYZ';
const RFC_ALPHABET = '0123456789ABCDEFGHIJKLMN&OPQRSTUVWXYZ Ñ';

const BANKS: BankInfo[] = [
  { code: '002', name: 'Banamex', shortName: 'Banamex' },
  { code: '012', name: 'BBVA México', shortName: 'BBVA' },
  { code: '014', name: 'Santander', shortName: 'Santander' },
  { code: '021', name: 'HSBC', shortName: 'HSBC' },
  { code: '030', name: 'BanBajío', shortName: 'BanBajío' },
  { code: '036', name: 'Inbursa', shortName: 'Inbursa' },
  { code: '044', name: 'Scotiabank', shortName: 'Scotiabank' },
  { code: '058', name: 'Banregio', shortName: 'Banregio' },
  { code: '062', name: 'Afirme', shortName: 'Afirme' },
  { code: '072', name: 'Banorte', shortName: 'Banorte' },
  { code: '127', name: 'Banco Azteca', shortName: 'Azteca' },
  { code: '137', name: 'BanCoppel', shortName: 'BanCoppel' },
  { code: '638', name: 'Nu México', shortName: 'Nu' },
  { code: '646', name: 'STP', shortName: 'STP' },
  { code: '722', name: 'Mercado Pago', shortName: 'Mercado Pago' },
  { code: '728', name: 'Spin by OXXO', shortName: 'Spin' },
];

function norm(s: string): string {
  return (s || '').toUpperCase().replace(/\s+/g, '');
}

function validDate(yy: string, mm: string, dd: string): boolean {
  const m = Number(mm);
  const d = Number(dd);
  if (m < 1 || m > 12 || d < 1) return false;
  const y = Number(yy);
  const year = y <= 30 ? 2000 + y : 1900 + y;
  const days = new Date(year, m, 0).getDate();
  return d <= days;
}

export function validateCurp(curp: string): IdValidation {
  const v = norm(curp);
  if (!/^[A-ZÑ]{4}\d{6}[HM][A-Z]{5}[A-Z0-9]\d$/.test(v)) return { ok: false, reason: 'FORMAT' };
  if (!validDate(v.slice(4, 6), v.slice(6, 8), v.slice(8, 10))) return { ok: false, reason: 'DATE' };
  let sum = 0;
  for (let i = 0; i < 17; i++) sum += CURP_ALPHABET.indexOf(v[i]) * (18 - i);
  const check = (10 - (sum % 10)) % 10;
  if (check !== Number(v[17])) return { ok: false, reason: 'CHECK_DIGIT' };
  return { ok: true };
}

export function validateRfc(rfc: string): IdValidation {
  const v = norm(rfc);
  if (v === 'XAXX010101000' || v === 'XEXX010101000') return { ok: false, reason: 'GENERIC', personType: 'fisica' };
  if (!/^[A-ZÑ&]{3,4}\d{6}[A-Z0-9]{3}$/.test(v)) return { ok: false, reason: 'FORMAT' };
  const personType: 'fisica' | 'moral' = v.length === 13 ? 'fisica' : 'moral';
  const padded = v.length === 12 ? ` ${v}` : v;
  let sum = 0;
  for (let i = 0; i < 12; i++) sum += RFC_ALPHABET.indexOf(padded[i]) * (13 - i);
  const mod = sum % 11;
  const expected = mod === 0 ? '0' : mod === 1 ? 'A' : String(11 - mod);
  if (padded[12] !== expected) return { ok: false, reason: 'CHECK_DIGIT', personType };
  return { ok: true, personType };
}

export function validateClabe(clabe: string): IdValidation {
  const v = (clabe || '').replace(/\s+/g, '');
  if (/\D/.test(v)) return { ok: false, reason: 'DIGITS' };
  if (v.length !== 18) return { ok: false, reason: 'LENGTH' };
  const weights = [3, 7, 1];
  let sum = 0;
  for (let i = 0; i < 17; i++) sum += (Number(v[i]) * weights[i % 3]) % 10;
  const check = (10 - (sum % 10)) % 10;
  if (check !== Number(v[17])) return { ok: false, reason: 'CHECK_DIGIT' };
  return { ok: true };
}

export function detectBankFromClabe(clabe: string): BankInfo | null {
  const v = (clabe || '').replace(/\s+/g, '');
  if (v.length < 3) return null;
  return BANKS.find((b) => b.code === v.slice(0, 3)) ?? null;
}

export function validateUsRouting(routing: string): IdValidation {
  const v = (routing || '').replace(/\s+/g, '');
  if (!/^\d{9}$/.test(v)) return { ok: false, reason: 'FORMAT' };
  const weights = [3, 7, 1];
  let sum = 0;
  for (let i = 0; i < 9; i++) sum += Number(v[i]) * weights[i % 3];
  if (sum % 10 !== 0) return { ok: false, reason: 'CHECK_DIGIT' };
  return { ok: true };
}
