// money.ts — Montos con su moneda a la vista ("$150.00 MXN") para pantallas del admin
// que mezclan países. `formatCurrency` (lib/currency) pinta según el idioma de la
// tienda y en México deja "$150.00" a secas: aquí siempre se dice el código, porque
// "$150.00" no aclara si son pesos mexicanos, pesos colombianos o dólares.

const SYMBOL: Record<string, string> = { MXN: '$', USD: '$', COP: '$', GTQ: 'Q' };

const AMOUNT = new Intl.NumberFormat('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const COUNT = new Intl.NumberFormat('es-MX', { maximumFractionDigits: 0 });

/** Número de un monto que llega como número o como texto decimal ("5755253.10"); lo ilegible vale 0. */
export function toAmount(value: unknown): number {
  const n = typeof value === 'number' ? value : typeof value === 'string' && value.trim() ? Number(value) : NaN;
  return Number.isFinite(n) ? n : 0;
}

/** "$1,500.00 MXN", "$12.00 USD", "Q150.00 GTQ". Sin moneda conocida: "1,500.00". */
export function formatMoney(amount: unknown, currency: string | null | undefined): string {
  const code = (currency ?? '').trim().toUpperCase();
  const n = toAmount(amount);
  const body = `${SYMBOL[code] ?? ''}${AMOUNT.format(Math.abs(n))}`;
  return `${n < 0 ? '-' : ''}${body}${code ? ` ${code}` : ''}`;
}

/** Cantidad entera con separador de miles ("4,893,189"). */
export function formatCount(value: unknown): string {
  return COUNT.format(Math.round(toAmount(value)));
}
