// botnatura.ts - Reglas puras de la captura de una factura a Botnatura (Admin > Facturación >
// Botnatura). Los dos precios del catálogo ("Precio" y "Precio venta") YA incluyen IVA; aquí
// nunca se inventa un precio: si un producto no lo tiene, la captura lo dice y no deja timbrar.
// El servidor repite estas reglas (botnatura.lib.ts del API): esto solo evita viajes inútiles.

import type {
  BotnaturaInvoiceRequest,
  BotnaturaLine,
  BotnaturaPriceMode,
  BotnaturaProduct,
  BotnaturaReceiver,
} from '@/types/botnatura';

export const BOTNATURA_PRICE_LABEL: Record<BotnaturaPriceMode, string> = {
  list: 'Precio',
  sale: 'Precio venta',
  custom: 'Otro precio',
};

export const BOTNATURA_LINES: BotnaturaLine[] = ['regular', 'line2'];

export const BOTNATURA_LINE_LABEL: Record<BotnaturaLine, string> = {
  regular: 'Regular',
  line2: 'Línea 2',
};

/** Lo que no sea Línea 2 es Regular (también un servidor que aún no manda la línea). */
export function lineOf(product: { line?: string | null }): BotnaturaLine {
  return product.line === 'line2' ? 'line2' : 'regular';
}

export const LINE_BADGE: Record<BotnaturaLine, string> = {
  regular: 'bg-gray-100 text-gray-700',
  line2: 'bg-violet-100 text-violet-800',
};

/** Texto del precio con el que salió una factura ('mixed' = conceptos con precios distintos). */
export function priceModeLabel(mode: string): string {
  if (mode === 'mixed') return 'Varios precios';
  return BOTNATURA_PRICE_LABEL[mode as BotnaturaPriceMode] ?? mode;
}

/** El precio general de la factura solo puede ser uno del catálogo. */
export type BotnaturaInvoiceMode = Exclude<BotnaturaPriceMode, 'custom'>;

export interface BotnaturaLineDraft {
  product: Pick<BotnaturaProduct, 'id' | 'code' | 'name' | 'listPrice' | 'salePrice' | 'line'>;
  /** Como se tecleó. */
  quantity: string;
  /** null = usa el precio general de la factura. */
  priceMode: BotnaturaPriceMode | null;
  /** Precio unitario CON IVA como se tecleó (solo con priceMode = 'custom'). */
  customPrice: string;
}

const round2 = (n: number) => Math.round(n * 100) / 100;

/** "1,234.50" o "$ 58" a número; vacío, texto o negativo = null. */
export function parseAmount(text: string | number | null | undefined): number | null {
  if (text === null || text === undefined) return null;
  const clean = String(text).replace(/[$,\s]/g, '');
  if (clean === '' || !/^\d*\.?\d+$|^\d+\.$/.test(clean)) return null;
  const n = Number(clean);
  return Number.isFinite(n) && n >= 0 ? n : null;
}

export function catalogPrice(
  product: Pick<BotnaturaProduct, 'listPrice' | 'salePrice'>,
  mode: BotnaturaInvoiceMode,
): number | null {
  const value = mode === 'list' ? product.listPrice : product.salePrice;
  return value !== null && value !== undefined && value > 0 ? round2(value) : null;
}

/** Precio unitario (con IVA) con el que saldría el concepto; null = no se puede saber todavía. */
export function lineUnitPrice(line: BotnaturaLineDraft, invoiceMode: BotnaturaInvoiceMode | null): number | null {
  const mode = line.priceMode ?? invoiceMode;
  if (mode === null) return null;
  if (mode === 'custom') {
    const captured = parseAmount(line.customPrice);
    return captured !== null && captured > 0 ? round2(captured) : null;
  }
  return catalogPrice(line.product, mode);
}

export function lineQuantity(line: BotnaturaLineDraft): number | null {
  const q = parseAmount(line.quantity);
  return q !== null && q > 0 ? q : null;
}

export function lineTotal(line: BotnaturaLineDraft, invoiceMode: BotnaturaInvoiceMode | null): number | null {
  const price = lineUnitPrice(line, invoiceMode);
  const quantity = lineQuantity(line);
  return price === null || quantity === null ? null : round2(price * quantity);
}

/** Por qué este concepto todavía no se puede facturar (null = listo). */
export function lineProblem(line: BotnaturaLineDraft, invoiceMode: BotnaturaInvoiceMode | null): string | null {
  if (lineQuantity(line) === null) return 'Captura la cantidad';
  const mode = line.priceMode ?? invoiceMode;
  // Sin precio general elegido, el aviso es uno solo para toda la factura (draftBlockers).
  if (mode === null) return null;
  if (lineUnitPrice(line, invoiceMode) !== null) return null;
  return mode === 'custom'
    ? 'Captura el precio'
    : `No tiene "${BOTNATURA_PRICE_LABEL[mode]}" en el catálogo: elige otro precio o captúralo`;
}

/** Suma de la captura con IVA incluido; null si algún concepto no tiene precio o cantidad. */
export function draftTotal(
  lines: readonly BotnaturaLineDraft[],
  invoiceMode: BotnaturaInvoiceMode | null,
): number | null {
  let sum = 0;
  for (const line of lines) {
    const total = lineTotal(line, invoiceMode);
    if (total === null) return null;
    sum += total;
  }
  return round2(sum);
}

/** De un importe con IVA incluido, cuánto es base y cuánto IVA (16 % por omisión). */
export function splitIvaIncluded(total: number, rate = 0.16): { base: number; tax: number } {
  const base = round2(total / (1 + rate));
  return { base, tax: round2(total - base) };
}

export interface BotnaturaDraft {
  settingsReady: boolean;
  missing: readonly string[];
  branchId: string;
  /** null = todavía no se elige con qué precio sale la factura. */
  invoiceMode: BotnaturaInvoiceMode | null;
  paymentMethod: 'PUE' | 'PPD';
  paymentForm: string;
  lines: readonly BotnaturaLineDraft[];
}

/** Lo que falta para poder timbrar, en el orden de la pantalla. Vacío = listo. */
export function draftBlockers(draft: BotnaturaDraft): string[] {
  const blockers: string[] = [];
  if (!draft.settingsReady) {
    blockers.push(
      draft.missing.length > 0
        ? `Completa los datos fiscales de Botnatura: ${draft.missing.join(', ')}`
        : 'Captura los datos fiscales de Botnatura',
    );
  }
  if (!draft.branchId) blockers.push('Elige la sucursal que expide');
  if (draft.invoiceMode === null) blockers.push('Elige con qué precio se factura: Precio o Precio venta');
  if (draft.lines.length === 0) blockers.push('Agrega al menos un producto');
  for (const line of draft.lines) {
    const problem = lineProblem(line, draft.invoiceMode);
    if (problem) blockers.push(`${line.product.code} ${line.product.name}: ${problem}`);
  }
  if (draft.paymentMethod === 'PUE' && !draft.paymentForm) blockers.push('Elige la forma de pago');
  return blockers;
}

/** Lo que viaja al servidor. Solo manda el precio de un concepto cuando difiere del general. */
export function toInvoiceRequest(
  draft: BotnaturaDraft,
  extra: { sendEmail: boolean; notes: string },
): BotnaturaInvoiceRequest {
  const notes = extra.notes.trim();
  return {
    branchId: draft.branchId,
    priceMode: draft.invoiceMode ?? 'sale',
    paymentMethod: draft.paymentMethod,
    ...(draft.paymentMethod === 'PUE' ? { paymentForm: draft.paymentForm } : {}),
    lines: draft.lines.map((line) => {
      const mode = line.priceMode ?? draft.invoiceMode;
      return {
        productId: line.product.id,
        quantity: lineQuantity(line) ?? 0,
        ...(line.priceMode !== null && line.priceMode !== draft.invoiceMode ? { priceMode: line.priceMode } : {}),
        ...(mode === 'custom' ? { unitPrice: lineUnitPrice(line, draft.invoiceMode) ?? 0 } : {}),
      };
    }),
    sendEmail: extra.sendEmail,
    ...(notes ? { notes } : {}),
  };
}

/** Qué dato fiscal de Botnatura falta o está mal escrito (mismas reglas que el servidor). */
export function receiverProblems(r: {
  rfc: string;
  name: string;
  taxRegimeCode: string;
  cfdiUseCode: string;
  zipCode: string;
  email?: string;
}): string[] {
  const problems: string[] = [];
  if (!/^[A-ZÑ&]{3,4}[0-9]{6}[A-Z0-9]{3}$/.test(r.rfc.trim().toUpperCase())) problems.push('RFC');
  if (!r.name.trim()) problems.push('Razón social');
  if (!/^[0-9]{3}$/.test(r.taxRegimeCode.trim())) problems.push('Régimen fiscal');
  if (!/^[A-Z]{1,2}[0-9]{2}$/.test(r.cfdiUseCode.trim().toUpperCase())) problems.push('Uso del CFDI');
  if (!/^[0-9]{5}$/.test(r.zipCode.trim())) problems.push('Código postal fiscal');
  const email = (r.email ?? '').trim();
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) problems.push('Correo');
  return problems;
}

/** Datos guardados a los campos del formulario (nulos como texto vacío). */
export function receiverToForm(r: BotnaturaReceiver | undefined) {
  return {
    rfc: r?.rfc ?? '',
    name: r?.name ?? '',
    taxRegimeCode: r?.taxRegimeCode ?? '',
    cfdiUseCode: r?.cfdiUseCode ?? '',
    zipCode: r?.zipCode ?? '',
    email: r?.email ?? '',
  };
}
