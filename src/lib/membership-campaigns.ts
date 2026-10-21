// Lógica PURA de la pestaña Membresías (campañas de membresía, mig 168):
// etiquetas, formato, estado del formulario y su validación. Sin React ni DOM
// para poder probarla con vitest (membership-campaigns.test.ts).

import type {
  CreateMembershipCampaignDto,
  MembershipAppliesTo,
  MembershipCampaign,
  MembershipCouponChannel,
  MembershipPosition,
  MembershipRedemptionStatus,
} from '@/types/membership-campaign';

// ================================================================
// Catálogos de opciones (con el texto que ve la persona)
// ================================================================

export const APPLIES_TO_OPTIONS: ReadonlyArray<{
  value: MembershipAppliesTo;
  label: string;
  description: string;
}> = [
  {
    value: 'new',
    label: 'Nuevos',
    description: 'Nuevos (pendientes sin kit): se inscriben con esta compra.',
  },
  {
    value: 'basic',
    label: 'Básicos',
    description: 'Básicos (suben a Premium): ya tienen kit básico y con esta compra suben.',
  },
  {
    value: 'all',
    label: 'Ambos',
    description: 'Ambos: nuevos pendientes sin kit y básicos que suben.',
  },
];

export const POSITION_OPTIONS: ReadonlyArray<{ value: MembershipPosition; label: string }> = [
  { value: 'premium', label: 'Premium' },
  { value: 'basic', label: 'Básico' },
];

export const COUPON_CHANNEL_OPTIONS: ReadonlyArray<{
  value: MembershipCouponChannel;
  label: string;
}> = [
  { value: 'all', label: 'POS y Tienda en línea' },
  { value: 'pos', label: 'Solo Punto de Venta' },
  { value: 'ecommerce', label: 'Solo Tienda en línea' },
];

export const REDEMPTION_STATUS_OPTIONS: ReadonlyArray<{
  value: MembershipRedemptionStatus;
  label: string;
}> = [
  { value: 'pending', label: 'Sin cobrar' },
  { value: 'applied', label: 'Aplicado' },
  { value: 'reverted', label: 'Anulado' },
  { value: 'failed', label: 'Falló' },
];

export function appliesToLabel(value: string): string {
  return APPLIES_TO_OPTIONS.find((o) => o.value === value)?.label ?? value;
}

export function positionLabel(value: string): string {
  return POSITION_OPTIONS.find((o) => o.value === value)?.label ?? value;
}

export function couponChannelLabel(value: string): string {
  return COUPON_CHANNEL_OPTIONS.find((o) => o.value === value)?.label ?? value;
}

/** Nombre legible de la posición/kit tal como llega en los canjes (`kitTypeBefore/After`). */
export function kitTypeLabel(value: string | null | undefined): string {
  if (!value) return 'Sin kit';
  const known: Record<string, string> = {
    basic: 'Básico',
    premium: 'Premium',
    preferred: 'Preferente',
  };
  return known[value] ?? value;
}

export interface RedemptionStatusUi {
  label: string;
  className: string;
}

export function redemptionStatusUi(status: string): RedemptionStatusUi {
  switch (status) {
    case 'pending':
      return { label: 'Sin cobrar', className: 'bg-amber-50 text-amber-800 border-amber-200' };
    case 'applied':
      return { label: 'Aplicado', className: 'bg-emerald-50 text-emerald-800 border-emerald-200' };
    case 'reverted':
      return { label: 'Anulado', className: 'bg-gray-100 text-gray-600 border-gray-200' };
    case 'failed':
      return { label: 'Falló', className: 'bg-red-50 text-red-700 border-red-200' };
    default:
      return { label: status, className: 'bg-gray-100 text-gray-600 border-gray-200' };
  }
}

// ================================================================
// Formato
// ================================================================

const numberFormat = new Intl.NumberFormat('es-MX', { maximumFractionDigits: 2 });

export function formatPoints(n: number | string): string {
  const value = typeof n === 'string' ? Number(n) : n;
  return Number.isFinite(value) ? numberFormat.format(value) : '0';
}

/** `10` → "10 %", `12.5` → "12.5 %". */
export function formatPercent(n: number): string {
  return `${numberFormat.format(n)} %`;
}

const MONTHS_ES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];

/**
 * "2026-10-12" → "12 oct 2026". Lee las partes a mano: construir un Date con
 * la cadena lo interpreta en UTC y, en horario de México, retrocede un día.
 */
export function formatBusinessDate(ymd: string | null | undefined): string {
  if (!ymd) return '';
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(ymd);
  if (!m) return ymd;
  const month = MONTHS_ES[Number(m[2]) - 1];
  if (!month) return ymd;
  return `${Number(m[3])} ${month} ${m[1]}`;
}

/** Vigencia en una línea: "Sin límite", "Desde …", "Hasta …" o "… → …". */
export function validityLabel(from: string | null | undefined, to: string | null | undefined): string {
  if (from && to) return `${formatBusinessDate(from)} → ${formatBusinessDate(to)}`;
  if (from) return `Desde ${formatBusinessDate(from)}`;
  if (to) return `Hasta ${formatBusinessDate(to)}`;
  return 'Sin límite';
}

/** Fecha LOCAL como YYYY-MM-DD, para compararla con las fechas de negocio. */
export function toYmd(d: Date): string {
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

export type ValidityState = 'current' | 'scheduled' | 'expired';

/** Contra una fecha de negocio (YYYY-MM-DD): programada, vencida o vigente. */
export function validityState(
  from: string | null | undefined,
  to: string | null | undefined,
  today: string,
): ValidityState {
  if (from && from > today) return 'scheduled';
  if (to && to < today) return 'expired';
  return 'current';
}

/** "Premium · 3 regalos · cupón 10 %" / "Básico · sin regalos · sin cupón". */
export function benefitSummary(
  c: Pick<MembershipCampaign, 'grantPosition' | 'couponPercent'> & { gifts?: { length: number } | null },
): string {
  const gifts = c.gifts?.length ?? 0;
  const giftsPart = gifts === 0 ? 'sin regalos' : gifts === 1 ? '1 regalo' : `${gifts} regalos`;
  const couponPart =
    c.couponPercent === null || c.couponPercent === undefined
      ? 'sin cupón'
      : `cupón ${formatPercent(Number(c.couponPercent))}`;
  return `${positionLabel(c.grantPosition)} · ${giftsPart} · ${couponPart}`;
}

/** 0 = "Apagada" (sin sucursales no se ofrece en ningún POS). */
export function branchesLabel(count: number): string {
  if (count <= 0) return 'Apagada';
  return count === 1 ? '1 sucursal' : `${count} sucursales`;
}

// ================================================================
// Errores del API
// ================================================================

interface ApiErrorShape {
  response?: { status?: number; data?: { message?: string | string[] } };
}

/** Sin la migración 168 el API responde 503 en todo el módulo. */
export function isMigrationMissingError(err: unknown): boolean {
  return (err as ApiErrorShape | null)?.response?.status === 503;
}

export function apiErrorMessage(err: unknown, fallback: string): string {
  const msg = (err as ApiErrorShape | null)?.response?.data?.message;
  if (Array.isArray(msg)) return msg[0] ?? fallback;
  return msg || fallback;
}

// ================================================================
// Formulario (texto tal como se teclea) ↔ DTO
// ================================================================

export interface MembershipGiftRow {
  productId: string;
  sku: string;
  name: string;
  /** Texto del input; se valida al guardar. */
  quantity: string;
  productActive?: boolean;
}

export interface MembershipCampaignFormValues {
  code: string;
  name: string;
  description: string;
  imageUrl: string;
  countryId: string;
  minPoints: string;
  appliesTo: MembershipAppliesTo;
  grantPosition: MembershipPosition;
  /** Vacío = sin cupón. */
  couponPercent: string;
  couponValidDays: string;
  couponChannel: MembershipCouponChannel;
  validFrom: string;
  validTo: string;
  isActive: boolean;
  sortOrder: string;
  gifts: MembershipGiftRow[];
  branchIds: string[];
}

export const EMPTY_MEMBERSHIP_FORM: MembershipCampaignFormValues = {
  code: '',
  name: '',
  description: '',
  imageUrl: '',
  countryId: '',
  minPoints: '',
  appliesTo: 'all',
  grantPosition: 'premium',
  couponPercent: '',
  couponValidDays: '90',
  couponChannel: 'all',
  validFrom: '',
  validTo: '',
  isActive: false,
  sortOrder: '0',
  gifts: [],
  branchIds: [],
};

const isAppliesTo = (v: string): v is MembershipAppliesTo => v === 'new' || v === 'basic' || v === 'all';
const isPosition = (v: string): v is MembershipPosition => v === 'basic' || v === 'premium';
const isChannel = (v: string): v is MembershipCouponChannel =>
  v === 'all' || v === 'pos' || v === 'ecommerce';

/** Copia la campaña del servidor al formulario. */
export function formFromCampaign(c: MembershipCampaign): MembershipCampaignFormValues {
  return {
    code: c.code,
    name: c.name,
    description: c.description ?? '',
    imageUrl: c.imageUrl ?? '',
    countryId: c.countryId,
    minPoints: String(c.minPoints ?? ''),
    appliesTo: isAppliesTo(c.appliesTo) ? c.appliesTo : 'all',
    grantPosition: isPosition(c.grantPosition) ? c.grantPosition : 'premium',
    couponPercent: c.couponPercent === null || c.couponPercent === undefined ? '' : String(c.couponPercent),
    couponValidDays: String(c.couponValidDays ?? 90),
    couponChannel: isChannel(c.couponChannel) ? c.couponChannel : 'all',
    validFrom: c.validFrom ?? '',
    validTo: c.validTo ?? '',
    isActive: c.isActive,
    sortOrder: String(c.sortOrder ?? 0),
    gifts: [...(c.gifts ?? [])]
      .sort((a, b) => a.sortOrder - b.sortOrder)
      .map((g) => ({
        productId: g.productId,
        sku: g.sku,
        name: g.name,
        quantity: String(g.quantity),
        productActive: g.productActive,
      })),
    branchIds: (c.branches ?? []).map((b) => b.branchId),
  };
}

/** Acepta coma decimal ("1,5"); null si no es número. */
export function parseDecimal(text: string): number | null {
  const normalized = text.trim().replace(',', '.');
  if (normalized === '') return null;
  if (!/^-?\d*(\.\d+)?$/.test(normalized) || normalized === '-' || normalized === '.') return null;
  const n = Number(normalized);
  return Number.isFinite(n) ? n : null;
}

export const CODE_PATTERN = /^[A-Za-z0-9_-]+$/;

/** Mensajes de validación (vacío = se puede guardar). Mismas reglas que el DTO. */
export function validateMembershipForm(v: MembershipCampaignFormValues): string[] {
  const errors: string[] = [];
  const code = v.code.trim();
  if (code.length < 3 || code.length > 40) errors.push('El código debe tener entre 3 y 40 caracteres.');
  else if (!CODE_PATTERN.test(code)) errors.push('El código solo admite letras, números, guion y guion bajo.');

  const name = v.name.trim();
  if (name.length < 3 || name.length > 150) errors.push('El nombre debe tener entre 3 y 150 caracteres.');
  if (v.description.trim().length > 2000) errors.push('La descripción no puede pasar de 2,000 caracteres.');
  if (v.imageUrl.trim().length > 1000) errors.push('La URL de la imagen no puede pasar de 1,000 caracteres.');
  if (!v.countryId) errors.push('Elige el país donde aplica.');

  const minPoints = parseDecimal(v.minPoints);
  if (minPoints === null || minPoints < 1) errors.push('Los puntos mínimos deben ser un número mayor o igual a 1.');

  if (v.couponPercent.trim() !== '') {
    const pct = parseDecimal(v.couponPercent);
    if (pct === null || pct <= 0 || pct > 100) errors.push('El cupón debe ser un porcentaje entre 0.01 y 100 (o vacío = sin cupón).');
    const days = parseDecimal(v.couponValidDays);
    if (days === null || !Number.isInteger(days) || days < 1 || days > 365) {
      errors.push('La vigencia del cupón debe ser un entero entre 1 y 365 días.');
    }
  }

  if (v.validFrom && v.validTo && v.validFrom > v.validTo) {
    errors.push('La vigencia "hasta" no puede ser anterior a "desde".');
  }

  const sortOrder = parseDecimal(v.sortOrder);
  if (v.sortOrder.trim() !== '' && (sortOrder === null || !Number.isInteger(sortOrder))) {
    errors.push('El orden debe ser un número entero.');
  }

  if (v.gifts.length > 20) errors.push('Máximo 20 regalos por campaña.');
  const seen = new Set<string>();
  for (const g of v.gifts) {
    const qty = parseDecimal(g.quantity);
    if (qty === null || qty <= 0) errors.push(`Regalo ${g.sku}: la cantidad debe ser mayor a 0.`);
    if (seen.has(g.productId)) errors.push(`Regalo ${g.sku}: está repetido.`);
    seen.add(g.productId);
  }

  return errors;
}

/**
 * DTO completo para POST o PATCH (en edición se manda todo: `gifts` y
 * `branchIds` reemplazan la lista). Vacíos → null para BORRAR en BD.
 */
export function toMembershipPayload(v: MembershipCampaignFormValues): CreateMembershipCampaignDto {
  const couponPercent = v.couponPercent.trim() === '' ? null : parseDecimal(v.couponPercent);
  return {
    code: v.code.trim().toUpperCase(),
    name: v.name.trim(),
    description: v.description.trim() || null,
    imageUrl: v.imageUrl.trim() || null,
    countryId: v.countryId,
    minPoints: parseDecimal(v.minPoints) ?? 0,
    appliesTo: v.appliesTo,
    grantPosition: v.grantPosition,
    couponPercent,
    couponValidDays: parseDecimal(v.couponValidDays) ?? 90,
    couponChannel: v.couponChannel,
    validFrom: v.validFrom || null,
    validTo: v.validTo || null,
    isActive: v.isActive,
    sortOrder: parseDecimal(v.sortOrder) ?? 0,
    gifts: v.gifts.map((g, i) => ({
      productId: g.productId,
      quantity: parseDecimal(g.quantity) ?? 1,
      sortOrder: i,
    })),
    branchIds: Array.from(new Set(v.branchIds)),
  };
}
