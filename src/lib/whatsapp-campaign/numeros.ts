// numeros.ts - Formato de números (es-MX) del tablero Comercial → WhatsApp.
// Sin React ni DOM. Vive aparte de format.ts para que reportes.ts (bloques
// de reportes) pueda usarlo sin importar format.ts (que a su vez importa los
// adaptadores de reportes): sin ciclos de módulos.

const NF = new Intl.NumberFormat('es-MX');

export const isNum = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);

/** Entero con separador de miles; '—' si no hay dato. */
export function n(v: number | null | undefined): string {
  return isNum(v) ? NF.format(Math.round(v)) : '—';
}

/** Fracción 0..1 → '12%' / '12.5%'; '—' si no hay dato. */
export function pct(v: number | null | undefined, dec = 0): string {
  return isNum(v) ? `${(v * 100).toFixed(dec)}%` : '—';
}

/** a / b, o null si falta a o b es 0. */
export function ratio(a: number | null | undefined, b: number | null | undefined): number | null {
  if (!isNum(a) || !isNum(b) || b === 0) return null;
  return a / b;
}

/** '+12.5 pp' / '-3' / '0'; '—' si no hay dato. */
export function signed(v: number | null | undefined, dec = 0, suf = ''): string {
  if (!isNum(v)) return '—';
  const s = v.toFixed(dec);
  return `${v > 0 ? '+' : ''}${s}${suf}`;
}

/** Fracción recortada a 0..1 para anchos de barra (null → 0). */
export function clamp01(v: number | null | undefined): number {
  return isNum(v) ? Math.max(0, Math.min(1, v)) : 0;
}

/** Color del efecto: verde si el intervalo queda arriba de 0, rojo si abajo. */
export function toneEfecto(
  lo: number | null | undefined,
  hi: number | null | undefined,
): 'bien' | 'mal' | 'neutro' {
  if (isNum(lo) && lo > 0) return 'bien';
  if (isNum(hi) && hi < 0) return 'mal';
  return 'neutro';
}

/**
 * Pesos mexicanos sin centavos: '$4,105,159'; negativo '-$210,601'; con
 * `signo`, '+$98,150'. '—' si no hay dato.
 */
export function money(v: number | null | undefined, opts: { signo?: boolean } = {}): string {
  if (!isNum(v)) return '—';
  const r = Math.round(v);
  const abs = NF.format(Math.abs(r));
  if (r < 0) return `-$${abs}`;
  return `${opts.signo && r > 0 ? '+' : ''}$${abs}`;
}

/** Pesos en miles para tablas apretadas: '$4,105k' (desde $10,000); abajo, money(). */
export function moneyCorto(v: number | null | undefined): string {
  if (!isNum(v)) return '—';
  if (Math.abs(v) < 10_000) return money(v);
  const r = Math.round(v / 1000);
  return `${r < 0 ? '-' : ''}$${NF.format(Math.abs(r))}k`;
}
