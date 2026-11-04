// Promociones de temporada (mig 186): helpers PUROS del admin (etiquetas,
// fechas locales, validación y conversión formulario ⇄ payload). Con pruebas.

import type {
  CreatePromoSeasonDto,
  CreateSeasonPromotionDto,
  PromoSeason,
  SeasonPromotion,
  SeasonStatus,
  SeasonUsageStatus,
  SeasonalPromoChannel,
  SeasonalPromoType,
  SeasonalPointsMode,
} from '@/types/seasonal-promotion';

export { apiErrorMessage, isMigrationMissingError } from '@/lib/membership-campaigns';

export const FLAGS: Record<string, string> = {
  MX: '🇲🇽',
  FN: '🇲🇽',
  US: '🇺🇸',
  CO: '🇨🇴',
  GT: '🇬🇹',
  SV: '🇸🇻',
  HN: '🇭🇳',
  NI: '🇳🇮',
  CR: '🇨🇷',
  PA: '🇵🇦',
  PE: '🇵🇪',
  EC: '🇪🇨',
  CL: '🇨🇱',
  AR: '🇦🇷',
  BR: '🇧🇷',
  ES: '🇪🇸',
};

export const PROMO_TYPE_OPTIONS: { value: SeasonalPromoType; label: string; hint: string }[] = [
  {
    value: 'nxm',
    label: 'Lleva N, paga M (3x2, 2x1…)',
    hint: 'Las piezas gratis salen en $0, descuentan existencia y no dan puntos.',
  },
  {
    value: 'fixed_price',
    label: 'Precio especial',
    hint: 'Precio final por país para los productos elegidos (p. ej. kit de $2,789 a $2,000).',
  },
  {
    value: 'percent_off',
    label: '% de descuento',
    hint: 'Porcentaje sobre el precio del renglón.',
  },
  {
    value: 'gift_with_purchase',
    label: 'Regalo por compra',
    hint: 'Al comprar N piezas (o $ monto) de los elegidos se agrega el regalo en $0.',
  },
];

export const CHANNEL_OPTIONS: { value: SeasonalPromoChannel; label: string; hint: string }[] = [
  { value: 'pos', label: 'Sucursales y Call Center (POS)', hint: 'Las terminales la aplican solas.' },
  { value: 'online', label: 'Tienda en línea', hint: 'El carrito la aplica para el país de la tienda.' },
];

export const POINTS_MODE_OPTIONS: { value: SeasonalPointsMode; label: string }[] = [
  { value: 'keep', label: 'Las piezas cobradas dan sus puntos completos' },
  { value: 'none', label: 'Las piezas cobradas con descuento tampoco dan puntos' },
];

export function promoTypeLabel(type: SeasonalPromoType): string {
  return PROMO_TYPE_OPTIONS.find((o) => o.value === type)?.label ?? type;
}

export function seasonStatusLabel(status: SeasonStatus): string {
  switch (status) {
    case 'active':
      return 'En curso';
    case 'upcoming':
      return 'Programada';
    case 'ended':
      return 'Terminada';
    default:
      return 'Inactiva';
  }
}

export function usageStatusLabel(status: SeasonUsageStatus): string {
  switch (status) {
    case 'applied':
      return 'Cobrada';
    case 'pending':
      return 'Sin cobrar';
    default:
      return 'Revertida';
  }
}

export function channelsLabel(channels: SeasonalPromoChannel[]): string {
  const parts: string[] = [];
  if (channels.includes('pos')) parts.push('POS');
  if (channels.includes('online')) parts.push('Tienda');
  return parts.join(' · ') || '—';
}

const MONTHS_ES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
const WEEKDAYS_ES = ['dom', 'lun', 'mar', 'mié', 'jue', 'vie', 'sáb'];

/**
 * 'YYYY-MM-DDTHH:mm[:ss]' (hora local, sin zona) → "vie 13 nov 2026, 00:00".
 * Lee las partes a mano: construir un Date con la cadena la interpretaría en
 * la zona del navegador y podría mover el día.
 */
export function formatLocalStamp(stamp: string | null | undefined, opts: { weekday?: boolean } = {}): string {
  if (!stamp) return '';
  const m = /^(\d{4})-(\d{2})-(\d{2})(?:[T ](\d{2}):(\d{2}))?/.exec(stamp);
  if (!m) return stamp;
  const y = Number(m[1]);
  const mo = Number(m[2]);
  const d = Number(m[3]);
  const month = MONTHS_ES[mo - 1];
  if (!month) return stamp;
  const time = m[4] ? `, ${m[4]}:${m[5]}` : '';
  let prefix = '';
  if (opts.weekday) {
    // Día de la semana con Date.UTC: la fecha es civil, no depende de la zona.
    const wd = new Date(Date.UTC(y, mo - 1, d)).getUTCDay();
    prefix = `${WEEKDAYS_ES[wd]} `;
  }
  return `${prefix}${d} ${month} ${y}${time}`;
}

/** "13 nov 2026, 00:00 → 17 nov 2026, 23:59". */
export function windowLabel(startsAt: string, endsAt: string): string {
  return `${formatLocalStamp(startsAt)} → ${formatLocalStamp(endsAt)}`;
}

/** Valor para <input type="datetime-local">: 'YYYY-MM-DDTHH:mm'. */
export function toInputStamp(stamp: string | null | undefined): string {
  if (!stamp) return '';
  const m = /^(\d{4}-\d{2}-\d{2})[T ](\d{2}:\d{2})/.exec(stamp);
  return m ? `${m[1]}T${m[2]}` : stamp.slice(0, 16);
}

/** Normaliza lo que viene del input a 'YYYY-MM-DDTHH:mm' (o '' si está vacío/inválido). */
export function normalizeInputStamp(value: string): string {
  const v = value.trim().replace(' ', 'T');
  const m = /^(\d{4}-\d{2}-\d{2})T(\d{2}:\d{2})/.exec(v);
  return m ? `${m[1]}T${m[2]}` : '';
}

/** 'YYYY-MM-DDTHH:mm' del momento actual en hora Centro (para proponer fechas). */
export function nowCdmxStamp(now: Date = new Date()): string {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Mexico_City',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).formatToParts(now);
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? '00';
  const hour = get('hour') === '24' ? '00' : get('hour');
  return `${get('year')}-${get('month')}-${get('day')}T${hour}:${get('minute')}`;
}

// ================================================================
// Formulario de temporada
// ================================================================

export interface SeasonFormValues {
  code: string;
  name: string;
  description: string;
  imageUrl: string;
  startsAt: string;
  endsAt: string;
  countryIds: string[];
  isActive: boolean;
}

export const EMPTY_SEASON_FORM: SeasonFormValues = {
  code: '',
  name: '',
  description: '',
  imageUrl: '',
  startsAt: '',
  endsAt: '',
  countryIds: [],
  isActive: true,
};

export function formFromSeason(s: PromoSeason): SeasonFormValues {
  return {
    code: s.code,
    name: s.name,
    description: s.description ?? '',
    imageUrl: s.imageUrl ?? '',
    startsAt: toInputStamp(s.startsAt),
    endsAt: toInputStamp(s.endsAt),
    countryIds: s.countries.map((c) => c.id),
    isActive: s.isActive,
  };
}

export function validateSeasonForm(v: SeasonFormValues): string[] {
  const errors: string[] = [];
  if (v.name.trim().length < 3) errors.push('El nombre debe tener al menos 3 caracteres.');
  if (v.code.trim() && !/^[A-Za-z0-9_-]+$/.test(v.code.trim())) {
    errors.push('El código solo admite letras, números, guion y guion bajo.');
  }
  const start = normalizeInputStamp(v.startsAt);
  const end = normalizeInputStamp(v.endsAt);
  if (!start) errors.push('Captura la fecha y hora de inicio.');
  if (!end) errors.push('Captura la fecha y hora de fin.');
  if (start && end && end <= start) errors.push('La temporada debe terminar después de que empieza.');
  if (v.countryIds.length === 0) errors.push('Elige al menos un país.');
  return errors;
}

export function toSeasonPayload(
  v: SeasonFormValues,
  mode: 'create' | 'edit',
): CreatePromoSeasonDto & {
  imageUrl?: string | null;
} {
  const base: CreatePromoSeasonDto = {
    code: v.code.trim() || null,
    name: v.name.trim(),
    description: v.description.trim() || null,
    startsAt: normalizeInputStamp(v.startsAt),
    endsAt: normalizeInputStamp(v.endsAt),
    countryIds: [...new Set(v.countryIds)],
    isActive: v.isActive,
  };
  return mode === 'edit' ? { ...base, imageUrl: v.imageUrl.trim() || null } : base;
}

// ================================================================
// Formulario de promoción
// ================================================================

export interface PromotionProductRow {
  productId: string;
  sku: string;
  name: string;
  productActive?: boolean;
  /** Solo regalos. */
  quantity: string;
}

export interface PromotionFormValues {
  code: string;
  name: string;
  description: string;
  imageUrl: string;
  type: SeasonalPromoType;
  // nxm
  buy: string;
  pay: string;
  sameProductOnly: boolean;
  // percent_off
  percent: string;
  // fixed_price: por código de país
  prices: Record<string, string>;
  // gift_with_purchase
  minQuantity: string;
  minAmount: string;
  repeat: boolean;
  channels: SeasonalPromoChannel[];
  /** Vacío = todos los países de la temporada. */
  countryIds: string[];
  useOwnWindow: boolean;
  startsAt: string;
  endsAt: string;
  priority: string;
  maxPerSale: string;
  pointsMode: SeasonalPointsMode;
  excludesKitBonus: boolean;
  isActive: boolean;
  eligible: PromotionProductRow[];
  gifts: PromotionProductRow[];
}

export const EMPTY_PROMOTION_FORM: PromotionFormValues = {
  code: '',
  name: '',
  description: '',
  imageUrl: '',
  type: 'nxm',
  buy: '3',
  pay: '2',
  sameProductOnly: true,
  percent: '',
  prices: {},
  minQuantity: '',
  minAmount: '',
  repeat: false,
  channels: ['pos', 'online'],
  countryIds: [],
  useOwnWindow: false,
  startsAt: '',
  endsAt: '',
  priority: '0',
  maxPerSale: '',
  pointsMode: 'keep',
  excludesKitBonus: false,
  isActive: true,
  eligible: [],
  gifts: [],
};

export function formFromPromotion(p: SeasonPromotion): PromotionFormValues {
  const cfg = (p.config ?? {}) as unknown as Record<string, unknown>;
  const prices: Record<string, string> = {};
  const rawPrices = (cfg.prices && typeof cfg.prices === 'object' ? cfg.prices : {}) as Record<
    string,
    unknown
  >;
  for (const [k, val] of Object.entries(rawPrices)) prices[k] = val == null ? '' : String(val);
  return {
    code: p.code,
    name: p.name,
    description: p.description ?? '',
    imageUrl: p.imageUrl ?? '',
    type: p.type,
    buy: cfg.buy != null ? String(cfg.buy) : '3',
    pay: cfg.pay != null ? String(cfg.pay) : '2',
    sameProductOnly: cfg.sameProductOnly !== false,
    percent: cfg.percent != null ? String(cfg.percent) : '',
    prices,
    minQuantity: cfg.minQuantity != null ? String(cfg.minQuantity) : '',
    minAmount: cfg.minAmount != null ? String(cfg.minAmount) : '',
    repeat: cfg.repeat === true,
    channels: p.channels.length > 0 ? [...p.channels] : ['pos', 'online'],
    countryIds: p.countriesRestricted ? p.countries.map((c) => c.id) : [],
    useOwnWindow: !!(p.startsAt && p.endsAt),
    startsAt: toInputStamp(p.startsAt),
    endsAt: toInputStamp(p.endsAt),
    priority: String(p.priority ?? 0),
    maxPerSale: p.maxPerSale != null ? String(p.maxPerSale) : '',
    pointsMode: p.pointsMode,
    excludesKitBonus: p.excludesKitBonus,
    isActive: p.isActive,
    eligible: p.products
      .filter((x) => x.role === 'eligible')
      .map((x) => ({
        productId: x.productId,
        sku: x.sku,
        name: x.name,
        productActive: x.productActive,
        quantity: '1',
      })),
    gifts: p.products
      .filter((x) => x.role === 'gift')
      .map((x) => ({
        productId: x.productId,
        sku: x.sku,
        name: x.name,
        productActive: x.productActive,
        quantity: String(x.quantity),
      })),
  };
}

export function parseDecimal(raw: string): number | null {
  const s = raw.trim().replace(/,/g, '');
  if (!s) return null;
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}

export function validatePromotionForm(
  v: PromotionFormValues,
  season: { startsAt: string; endsAt: string; countryCodes: string[] },
): string[] {
  const errors: string[] = [];
  if (v.name.trim().length < 3) errors.push('El nombre debe tener al menos 3 caracteres.');
  if (v.code.trim() && !/^[A-Za-z0-9_-]+$/.test(v.code.trim())) {
    errors.push('El código solo admite letras, números, guion y guion bajo.');
  }
  if (v.channels.length === 0) errors.push('Elige al menos un canal (POS o tienda).');
  if (v.eligible.length === 0) {
    errors.push(
      v.type === 'gift_with_purchase'
        ? 'Indica qué productos hay que comprar para recibir el regalo.'
        : 'Agrega al menos un producto a la promoción.',
    );
  }
  switch (v.type) {
    case 'nxm': {
      const buy = parseDecimal(v.buy);
      const pay = parseDecimal(v.pay);
      if (buy == null || !Number.isInteger(buy) || buy < 2)
        errors.push('"Lleva" debe ser un entero de 2 o más.');
      if (pay == null || !Number.isInteger(pay) || pay < 1)
        errors.push('"Paga" debe ser un entero de 1 o más.');
      if (buy != null && pay != null && pay >= buy)
        errors.push('"Paga" debe ser menor que "Lleva" (3x2: lleva 3, paga 2).');
      break;
    }
    case 'percent_off': {
      const pct = parseDecimal(v.percent);
      if (pct == null || pct <= 0 || pct > 100)
        errors.push('El porcentaje debe ser mayor que 0 y hasta 100.');
      break;
    }
    case 'fixed_price': {
      const codes = v.countryIds.length > 0 ? season.countryCodes : season.countryCodes;
      const filled = codes.filter((c) => (v.prices[c] ?? '').trim() !== '');
      if (filled.length === 0) errors.push('Captura el precio especial de al menos un país.');
      for (const c of filled) {
        const n = parseDecimal(v.prices[c] ?? '');
        if (n == null || n < 0) errors.push(`Precio inválido para ${c}.`);
      }
      break;
    }
    case 'gift_with_purchase': {
      const q = parseDecimal(v.minQuantity);
      const a = parseDecimal(v.minAmount);
      if ((q == null || q <= 0) && (a == null || a <= 0)) {
        errors.push('Indica piezas mínimas o monto mínimo de compra.');
      }
      if (q != null && !Number.isInteger(q)) errors.push('Las piezas mínimas deben ser un entero.');
      if (v.gifts.length === 0) errors.push('Agrega al menos un producto de regalo.');
      for (const g of v.gifts) {
        const n = parseDecimal(g.quantity);
        if (n == null || n <= 0) errors.push(`Cantidad inválida para el regalo ${g.sku}.`);
      }
      break;
    }
  }
  const giftIds = new Set(v.gifts.map((g) => g.productId));
  if (v.eligible.some((e) => giftIds.has(e.productId))) {
    errors.push('Un producto no puede ser elegible y regalo a la vez.');
  }
  if (v.useOwnWindow) {
    const start = normalizeInputStamp(v.startsAt);
    const end = normalizeInputStamp(v.endsAt);
    if (!start || !end)
      errors.push('Captura inicio y fin de la promoción (o usa la ventana de la temporada).');
    else {
      if (end <= start) errors.push('La promoción debe terminar después de que empieza.');
      if (start < toInputStamp(season.startsAt) || end > toInputStamp(season.endsAt)) {
        errors.push(
          `La promoción debe quedar dentro de la temporada (${windowLabel(season.startsAt, season.endsAt)}).`,
        );
      }
    }
  }
  const prio = parseDecimal(v.priority);
  if (prio == null || !Number.isInteger(prio)) errors.push('La prioridad debe ser un entero.');
  if (v.maxPerSale.trim()) {
    const m = parseDecimal(v.maxPerSale);
    if (m == null || !Number.isInteger(m) || m < 1)
      errors.push('El tope por venta debe ser un entero de 1 o más.');
  }
  return errors;
}

export function toPromotionPayload(
  v: PromotionFormValues,
  mode: 'create' | 'edit',
): CreateSeasonPromotionDto & {
  imageUrl?: string | null;
} {
  let config: Record<string, unknown>;
  switch (v.type) {
    case 'nxm':
      config = { buy: parseDecimal(v.buy), pay: parseDecimal(v.pay), sameProductOnly: v.sameProductOnly };
      break;
    case 'percent_off':
      config = { percent: parseDecimal(v.percent) };
      break;
    case 'fixed_price': {
      const prices: Record<string, number> = {};
      for (const [code, raw] of Object.entries(v.prices)) {
        const n = parseDecimal(raw);
        if (n != null) prices[code] = n;
      }
      config = { prices };
      break;
    }
    default:
      config = {
        minQuantity: parseDecimal(v.minQuantity),
        minAmount: parseDecimal(v.minAmount),
        repeat: v.repeat,
      };
  }
  const useWindow = v.useOwnWindow && normalizeInputStamp(v.startsAt) && normalizeInputStamp(v.endsAt);
  const base: CreateSeasonPromotionDto = {
    code: v.code.trim() || null,
    name: v.name.trim(),
    description: v.description.trim() || null,
    type: v.type,
    config,
    channels: [...new Set(v.channels)],
    countryIds: [...new Set(v.countryIds)],
    startsAt: useWindow ? normalizeInputStamp(v.startsAt) : null,
    endsAt: useWindow ? normalizeInputStamp(v.endsAt) : null,
    priority: parseDecimal(v.priority) ?? 0,
    maxPerSale: v.maxPerSale.trim() ? parseDecimal(v.maxPerSale) : null,
    pointsMode: v.pointsMode,
    excludesKitBonus: v.type === 'fixed_price' || v.type === 'percent_off' ? v.excludesKitBonus : false,
    isActive: v.isActive,
    eligibleProductIds: v.eligible.map((e) => e.productId),
    gifts:
      v.type === 'gift_with_purchase'
        ? v.gifts.map((g) => ({ productId: g.productId, quantity: parseDecimal(g.quantity) ?? 1 }))
        : [],
  };
  return mode === 'edit' ? { ...base, imageUrl: v.imageUrl.trim() || null } : base;
}

/** Resumen de una promoción para la tabla: "3x2 · 19 productos · POS · Tienda". */
export function promotionSummary(p: Pick<SeasonPromotion, 'typeLabel' | 'products' | 'channels'>): string {
  const eligible = p.products.filter((x) => x.role === 'eligible').length;
  const gifts = p.products.filter((x) => x.role === 'gift').length;
  const parts = [p.typeLabel, `${eligible} producto${eligible === 1 ? '' : 's'}`];
  if (gifts > 0) parts.push(`${gifts} regalo${gifts === 1 ? '' : 's'}`);
  parts.push(channelsLabel(p.channels));
  return parts.join(' · ');
}

export function formatMoney(n: number, currency = 'MXN'): string {
  return new Intl.NumberFormat('es-MX', { style: 'currency', currency, maximumFractionDigits: 2 }).format(n);
}
