// pos-ticket-totals.ts — Bloque "Totales" de la reimpresión del ticket POS del
// admin (PDF de generate-pos-ticket.ts y HTML de Reportes › Ventas) y de los
// bloques de totales en pantalla (detalle de /admin/pos, Reportes › Ventas y
// Ventas por Usuario) a partir de la venta que devuelve el API (GET /pos/sales/:id).
//
// Regla del API (29-oct-2026, toniclife-api src/modules/pos/lib/sale-discount.lib.ts):
// el cupón o descuento global D se calcula SOBRE el total con impuesto T y se
// prorratea por renglón, así que la venta llega con `subtotal` (base) y
// `taxAmount` YA netos del descuento, `discountAmount` = D CON impuesto y
// `total` = T − D (subtotal + taxAmount = total al centavo). Imprimir
// "Subtotal neto, Descuento −D, IVA neto" haría que las filas no sumaran el
// TOTAL (200.34 − 99.60 + 32.06 ≠ 232.40).
//
// Presentación decidida por Sistemas (29-oct-2026 11:40, ticket-cupon-presentacion.md):
//   1. Sin descuento global (D = 0): el bloque de siempre, sin cambiar un
//      carácter: SUB Total (base sin impuesto), IVA/TAX, TOTAL.
//   2. Con descuento global y precios CON impuesto incluido (MX, FN, GT):
//        SUB Total        T = total + D       (bruto con impuesto)
//        Cupón <código>   −D                  ("Descuento" si es manual)
//        TOTAL            total               (negritas)
//        IVA incluido     taxAmount           (informativa, debajo del TOTAL)
//   3. Con descuento global y precios SIN impuesto incluido (US, sales tax
//      añadido):
//        SUB Total        Σ precio × cantidad (sin impuesto)
//        Descuento        −(Σ precio × cantidad − subtotal neto): la parte del
//                         descuento en el espacio del precio (manual de línea
//                         + cupón); así las filas suman 100.00 − 10.00 + 7.42
//                         = 97.42
//        IVA/TAX          taxAmount
//        TOTAL            total
//      Sin renglones no hay Σ precio × cantidad (el renglón del listado
//      GET /pos/sales trae items = [] y Reportes › Ventas lo usa mientras carga
//      el detalle): entonces se usa la presentación 2 (T = total + D, −D,
//      TOTAL, impuesto incluido debajo), que también suma y no inventa importes.
//
// Importes a centavos (`cents`): sumar precios a dos decimales arrastra ruido
// binario (0.1 + 0.7 = 0.7999999999999999) que, sin redondear, imprimiría
// "--0.00" en el PDF o "-$0.00" con Intl.NumberFormat.
//
// Puro (sin jsPDF ni DOM) para probarlo con vitest (pos-ticket-totals.test.ts).

/** Lo que necesita del renglón (SaleItem del API cumple la forma). */
export interface PosTicketTotalsItem {
  unitPrice: number;
  quantity: number;
  /**
   * pos_sale_items.discount_amount: descuento de línea manual MÁS la parte del
   * cupón/global, en el espacio del precio (regla 29-oct). NO es otro
   * descuento aparte de `discountAmount` de la cabecera.
   */
  discountAmount?: number;
  /** Base del renglón (sin impuesto, ya neta). */
  subtotal?: number;
  /** Total del renglón (con impuesto, ya neto). */
  total?: number;
}

/** Lo que necesita de la venta (Sale del API cumple la forma). */
export interface PosTicketTotalsSale {
  /**
   * Renglones de la venta. Puede faltar o venir vacío: el renglón del listado
   * (GET /pos/sales) trae items = [] y Reportes › Ventas lo usa mientras carga
   * el detalle (o si el detalle falla).
   */
  items?: readonly PosTicketTotalsItem[];
  /** Σ base de los renglones, ya con el descuento global prorrateado. */
  subtotal: number;
  /** D: descuento global (cupón o manual) CON impuesto. */
  discountAmount: number;
  discountPercent?: number;
  /** 'Cupón <código>' en ventas con cupón (lo guarda createSale). */
  discountReason?: string;
  /** Código del cupón aplicado, cuando el API lo manda. */
  couponCode?: string;
  /** Impuesto ya con el descuento prorrateado; subtotal + taxAmount = total. */
  taxAmount: number;
  total: number;
  /** Moneda de la venta (MXN, USD, GTQ, COP…). */
  currencyCode?: string;
}

/** Desglose a imprimir, sin etiquetas: cada reimpresión pone las suyas. */
export interface SaleTotalsPresentation {
  /** true = precios con impuesto incluido (MX); false = impuesto añadido (US). */
  taxIncluded: boolean;
  /**
   * Subtotal a imprimir: la base neta de siempre sin descuento global; con
   * descuento, T = total + D (impuesto incluido, o impuesto añadido sin
   * renglones) o Σ precio × cantidad (impuesto añadido con renglones).
   */
  subtotal: number;
  /**
   * Fila de descuento; null sin descuento global. `amount` es D con impuesto
   * (cuando el subtotal es T) o la parte en el espacio del precio (impuesto
   * añadido con renglones). `couponCode` solo cuando la fila debe decir "Cupón".
   */
  discount: { amount: number; couponCode?: string; percent?: number } | null;
  /**
   * Fila IVA/TAX antes del TOTAL; null cuando el subtotal es el bruto con
   * impuesto T (entonces el impuesto va como `taxIncludedAmount` debajo del TOTAL).
   */
  tax: number | null;
  total: number;
  /** "IVA incluido" informativo debajo del TOTAL; null cuando no aplica. */
  taxIncludedAmount: number | null;
}

/** Fila del PDF: [etiqueta, valor ya formateado]. */
export type PosTicketTotalsRow = [label: string, value: string];

/** Filas del bloque "6. Totales" del PDF (generate-pos-ticket.ts). */
export interface PosTicketTotals {
  /** Letra normal, antes del TOTAL. */
  rows: PosTicketTotalsRow[];
  /** Fila TOTAL (negritas). */
  total: PosTicketTotalsRow;
  /** Letra normal, después del TOTAL y antes de MONEDA ("IVA incluido"). */
  after: PosTicketTotalsRow[];
}

/** Más largo que esto y el código no cabe en el rollo de 80 mm: solo "Cupón". */
const MAX_COUPON_CODE_CHARS = 16;

/** Medio centavo más el ruido binario de sumar importes a dos decimales. */
const CENT_EPS = 0.006;

const num = (v: unknown): number => {
  const n = typeof v === 'string' ? parseFloat(v) : Number(v);
  return Number.isFinite(n) ? n : 0;
};

/**
 * A centavos y sin −0 (Intl.NumberFormat imprimiría "-$0.00"): quita el ruido
 * binario de sumar o restar importes a dos decimales.
 */
const cents = (n: number): number => Math.round(num(n) * 100) / 100 + 0;

/** Mismo formato que el ticket de siempre (fmtCurrency): dos decimales, sin separador de miles. */
const fmt = (n: number): string => num(n).toFixed(2);

/** Σ precio × cantidad de los renglones (espacio del precio, antes de descuentos). */
function itemsGrossPrice(items: readonly PosTicketTotalsItem[] | undefined): number {
  return (items ?? []).reduce((sum, it) => sum + num(it.unitPrice) * num(it.quantity), 0);
}

/**
 * Código del cupón de la venta: `couponCode` del API o, en su defecto, el que
 * createSale deja en discount_reason ('Cupón <código>'). undefined = descuento
 * manual (o sin descuento).
 */
export function saleCouponCode(sale: Pick<PosTicketTotalsSale, 'couponCode' | 'discountReason'>): string | undefined {
  const direct = sale.couponCode?.trim();
  if (direct) return direct;
  const match = sale.discountReason?.trim().match(/^cup[oó]n\s+(\S+)$/i);
  return match ? match[1] : undefined;
}

/**
 * ¿Los precios de la venta traen el impuesto incluido (MX) o se añade (US)?
 * 1. Identidad exacta que guarda el API por renglón (regla 29-oct; también se
 *    cumple en ventas anteriores): precio × cantidad − discountAmount es el
 *    total del renglón si el impuesto va incluido, o su base (subtotal) si se
 *    añade. Solo votan renglones con impuesto: sin él, base y total coinciden.
 * 2. Sin voto claro, la moneda de la venta: USD = sales tax añadido
 *    (sucursales de EE. UU.); el resto (MXN, GTQ, COP…) vende con el impuesto
 *    dentro del precio.
 * 3. Sin moneda: incluido cuando Σ precio × cantidad ≈ total + D.
 */
export function saleTaxIncludedInPrice(sale: PosTicketTotalsSale): boolean {
  const items = sale.items ?? [];
  let included = 0;
  let added = 0;
  for (const it of items) {
    const subtotal = num(it.subtotal);
    const total = num(it.total);
    if (Math.abs(total - subtotal) < CENT_EPS) continue;
    const priceSpace = num(it.unitPrice) * num(it.quantity) - num(it.discountAmount);
    if (Math.abs(priceSpace - total) < CENT_EPS) included++;
    else if (Math.abs(priceSpace - subtotal) < CENT_EPS) added++;
  }
  if (included !== added) return included > added;

  const currency = sale.currencyCode?.trim().toUpperCase();
  if (currency) return currency !== 'USD';

  const discount = Math.max(0, num(sale.discountAmount));
  return Math.abs(itemsGrossPrice(items) - (num(sale.total) + discount)) < 0.01;
}

/** Desglose a imprimir según la regla de presentación (ver cabecera del archivo). */
export function saleTotalsPresentation(sale: PosTicketTotalsSale): SaleTotalsPresentation {
  const discount = num(sale.discountAmount);
  const total = num(sale.total);
  const percent = num(sale.discountPercent) > 0 ? num(sale.discountPercent) : undefined;

  // Sin descuento global: el desglose de siempre (base neta, impuesto, total).
  if (!(discount > 0)) {
    return {
      taxIncluded: saleTaxIncludedInPrice(sale),
      subtotal: num(sale.subtotal),
      discount: null,
      tax: num(sale.taxAmount),
      total,
      taxIncludedAmount: null,
    };
  }

  const taxIncluded = saleTaxIncludedInPrice(sale);
  const grossPrice = cents(itemsGrossPrice(sale.items));
  if (!taxIncluded && grossPrice > 0) {
    // Impuesto añadido (US): Subtotal sin impuesto, la parte del descuento en el
    // espacio del precio (manual de línea + cupón), Tax y TOTAL. Aquí la fila
    // dice "Descuento" aunque venga de cupón: su monto no es D (que lleva
    // impuesto), sino lo descontado del precio (10.00 en el ejemplo de 10.83).
    // Nunca negativo: Σ precio × cantidad puede quedar una fracción de centavo
    // por debajo de la base que guarda el API.
    return {
      taxIncluded: false,
      subtotal: grossPrice,
      discount: { amount: Math.max(0, cents(grossPrice - num(sale.subtotal))), percent },
      tax: num(sale.taxAmount),
      total,
      taxIncludedAmount: null,
    };
  }

  // Precio con impuesto incluido: SUB Total bruto (T = total + D), Cupón −D,
  // TOTAL e "IVA incluido" informativo debajo. Con impuesto añadido pero sin
  // renglones (listado mientras carga el detalle) se usa esta misma
  // presentación: T y D sí se conocen y las filas suman.
  return {
    taxIncluded,
    subtotal: cents(total + discount),
    discount: { amount: discount, couponCode: saleCouponCode(sale), percent },
    tax: null,
    total,
    taxIncludedAmount: num(sale.taxAmount),
  };
}

/** Etiqueta de la fila de descuento del PDF (formato legacy "Descuento (10%) $"). */
function discountLabel(discount: NonNullable<SaleTotalsPresentation['discount']>): string {
  const code = discount.couponCode;
  if (code) return code.length <= MAX_COUPON_CODE_CHARS ? `Cupón ${code} $` : 'Cupón $';
  return discount.percent ? `Descuento (${discount.percent}%) $` : 'Descuento $';
}

/**
 * Filas del bloque "6. Totales" del ticket PDF con las etiquetas de siempre
 * ("SUB Total $", "IVA/TAX $", "TOTAL $"). Sin descuento global devuelve
 * exactamente las filas anteriores a la regla.
 */
export function buildPosTicketTotals(sale: PosTicketTotalsSale): PosTicketTotals {
  const p = saleTotalsPresentation(sale);
  const rows: PosTicketTotalsRow[] = [['SUB Total $', fmt(p.subtotal)]];
  if (p.discount) rows.push([discountLabel(p.discount), `-${fmt(p.discount.amount)}`]);
  if (p.tax != null) rows.push(['IVA/TAX $', fmt(p.tax)]);
  const after: PosTicketTotalsRow[] =
    p.taxIncludedAmount != null ? [['IVA incluido $', fmt(p.taxIncludedAmount)]] : [];
  return { rows, total: ['TOTAL $', fmt(p.total)], after };
}

/**
 * Importe que se imprime por renglón. Con descuento global (cupón o manual)
 * el renglón va en BRUTO (precio × cantidad): el bloque de totales arranca con
 * el "SUB Total" bruto y el descuento se muestra aparte, así los renglones
 * suman el SUB Total (el API guarda el total del renglón ya NETO de su parte
 * prorrateada: 8616 con cupón 30 % trae 232.40 bajo un SUB Total de 332.00).
 * Sin descuento global, el total guardado del renglón, como siempre.
 */
export function ticketLineAmount(
  sale: Pick<PosTicketTotalsSale, 'discountAmount'>,
  item: Pick<PosTicketTotalsItem, 'unitPrice' | 'quantity' | 'total'>,
): number {
  if (!(num(sale.discountAmount) > 0)) return num(item.total);
  return cents(num(item.unitPrice) * num(item.quantity));
}
