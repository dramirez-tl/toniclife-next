import { describe, expect, it } from 'vitest';
import {
  DEFAULT_ART_RATIO,
  EMPTY_PROMOTION_FORM,
  EMPTY_SEASON_FORM,
  artAspectRatio,
  formFromPromotion,
  formFromSeason,
  formatLocalStamp,
  isOnlinePromotion,
  normalizeInputStamp,
  nowCdmxStamp,
  promotionSummary,
  seasonHighlights,
  toInputStamp,
  toPromotionPayload,
  toSeasonPayload,
  validatePromotionForm,
  validateSeasonForm,
  windowLabel,
} from './seasonal-promotions';
import type { PromoSeason, SeasonPromotion } from '@/types/seasonal-promotion';

const SEASON: PromoSeason = {
  id: 's1',
  code: 'BUENFIN2026',
  name: 'Buen Fin 2026',
  description: null,
  imageUrl: 'https://api/storage/file/marketing/seasonal-promotions/s1.jpg',
  imageThumbnailUrl: null,
  startsAt: '2026-11-13T00:00:00',
  endsAt: '2026-11-17T23:59:59',
  isActive: true,
  status: 'upcoming',
  sortOrder: 0,
  countries: [
    { id: 'mx', code: 'MX', name: 'México' },
    { id: 'fn', code: 'FN', name: 'Frontera' },
  ],
  promotionsCount: 1,
  usageCount: 0,
  discountTotal: 0,
  createdAt: '2026-11-04T18:00:00.000Z',
  updatedAt: '2026-11-04T18:00:00.000Z',
};

const PROMO: SeasonPromotion = {
  id: 'p1',
  seasonId: 's1',
  code: 'BF-3X2-SAB',
  name: '3x2 en tés',
  description: null,
  imageUrl: null,
  imageThumbnailUrl: null,
  type: 'nxm',
  typeLabel: '3x2',
  config: { buy: 3, pay: 2, sameProductOnly: true },
  channels: ['pos', 'online'],
  countries: SEASON.countries,
  countriesRestricted: false,
  startsAt: '2026-11-14T00:00:00',
  endsAt: '2026-11-14T23:59:59',
  effectiveStartsAt: '2026-11-14T00:00:00',
  effectiveEndsAt: '2026-11-14T23:59:59',
  priority: 0,
  maxPerSale: null,
  pointsMode: 'keep',
  excludesKitBonus: false,
  isActive: true,
  sortOrder: 0,
  products: [
    { productId: 'a', sku: 'TE1', name: 'Legline Té', role: 'eligible', quantity: 1, sortOrder: 0 },
    { productId: 'b', sku: 'TE2', name: 'Pp Té', role: 'eligible', quantity: 1, sortOrder: 1 },
  ],
  usageCount: 0,
  createdAt: '2026-11-04T18:00:00.000Z',
  updatedAt: '2026-11-04T18:00:00.000Z',
};

const SEASON_CTX = { startsAt: SEASON.startsAt, endsAt: SEASON.endsAt, countryCodes: ['MX', 'FN'] };

describe('fechas locales', () => {
  it('formatea sin pasar por Date (no mueve el día)', () => {
    expect(formatLocalStamp('2026-11-13T00:00:00')).toBe('13 nov 2026, 00:00');
    expect(formatLocalStamp('2026-11-13T00:00:00', { weekday: true })).toBe('vie 13 nov 2026, 00:00');
    expect(formatLocalStamp('2026-11-13')).toBe('13 nov 2026');
    expect(windowLabel('2026-11-13T00:00:00', '2026-11-17T23:59:59')).toBe(
      '13 nov 2026, 00:00 → 17 nov 2026, 23:59',
    );
  });

  it('convierte de/para el input datetime-local', () => {
    expect(toInputStamp('2026-11-13T09:05:07')).toBe('2026-11-13T09:05');
    expect(toInputStamp(null)).toBe('');
    expect(normalizeInputStamp('2026-11-13T09:05')).toBe('2026-11-13T09:05');
    expect(normalizeInputStamp('2026-11-13 09:05:00')).toBe('2026-11-13T09:05');
    expect(normalizeInputStamp('nada')).toBe('');
  });

  it('nowCdmxStamp da hora Centro, no UTC', () => {
    // 2026-11-05T02:30Z = 4-nov 20:30 en CDMX (UTC-6).
    expect(nowCdmxStamp(new Date('2026-11-05T02:30:00Z'))).toBe('2026-11-04T20:30');
  });
});

describe('temporada: formulario ⇄ payload', () => {
  it('valida nombre, fechas y países', () => {
    expect(validateSeasonForm(EMPTY_SEASON_FORM)).toEqual([
      'El nombre debe tener al menos 3 caracteres.',
      'Captura la fecha y hora de inicio.',
      'Captura la fecha y hora de fin.',
      'Elige al menos un país.',
    ]);
    expect(
      validateSeasonForm({
        ...EMPTY_SEASON_FORM,
        name: 'Buen Fin',
        startsAt: '2026-11-17T00:00',
        endsAt: '2026-11-13T00:00',
        countryIds: ['mx'],
      }),
    ).toEqual(['La temporada debe terminar después de que empieza.']);
  });

  it('round-trip y payload', () => {
    const form = formFromSeason(SEASON);
    expect(form.startsAt).toBe('2026-11-13T00:00');
    expect(form.countryIds).toEqual(['mx', 'fn']);
    expect(validateSeasonForm(form)).toEqual([]);
    const payload = toSeasonPayload({ ...form, code: '' }, 'edit');
    expect(payload).toMatchObject({
      code: null,
      name: 'Buen Fin 2026',
      startsAt: '2026-11-13T00:00',
      endsAt: '2026-11-17T23:59',
      countryIds: ['mx', 'fn'],
      imageUrl: SEASON.imageUrl,
    });
    expect('imageUrl' in toSeasonPayload(form, 'create')).toBe(false);
  });
});

describe('promoción: formulario ⇄ payload', () => {
  it('round-trip de un 3x2 con ventana propia', () => {
    const form = formFromPromotion(PROMO);
    expect(form).toMatchObject({
      type: 'nxm',
      buy: '3',
      pay: '2',
      useOwnWindow: true,
      startsAt: '2026-11-14T00:00',
    });
    expect(form.eligible).toHaveLength(2);
    expect(validatePromotionForm(form, SEASON_CTX)).toEqual([]);
    const payload = toPromotionPayload(form, 'create');
    expect(payload).toMatchObject({
      type: 'nxm',
      config: { buy: 3, pay: 2, sameProductOnly: true },
      startsAt: '2026-11-14T00:00',
      endsAt: '2026-11-14T23:59',
      eligibleProductIds: ['a', 'b'],
      gifts: [],
      excludesKitBonus: false,
    });
  });

  it('valida cada tipo', () => {
    const base = {
      ...EMPTY_PROMOTION_FORM,
      name: 'Promo',
      eligible: [{ productId: 'a', sku: 'A', name: 'A', quantity: '1' }],
    };
    expect(validatePromotionForm({ ...base, buy: '2', pay: '2' }, SEASON_CTX)).toEqual([
      '"Paga" debe ser menor que "Lleva" (3x2: lleva 3, paga 2).',
    ]);
    expect(validatePromotionForm({ ...base, type: 'percent_off', percent: '0' }, SEASON_CTX)).toEqual([
      'El porcentaje debe ser mayor que 0 y hasta 100.',
    ]);
    expect(validatePromotionForm({ ...base, type: 'fixed_price', prices: {} }, SEASON_CTX)).toEqual([
      'Captura el precio especial de al menos un país.',
    ]);
    expect(
      validatePromotionForm({ ...base, type: 'fixed_price', prices: { MX: '2000', FN: '' } }, SEASON_CTX),
    ).toEqual([]);
    expect(validatePromotionForm({ ...base, type: 'gift_with_purchase' }, SEASON_CTX)).toEqual([
      'Indica piezas mínimas o monto mínimo de compra.',
      'Agrega al menos un producto de regalo.',
    ]);
    expect(
      validatePromotionForm(
        { ...base, useOwnWindow: true, startsAt: '2026-11-12T00:00', endsAt: '2026-11-13T10:00' },
        SEASON_CTX,
      ),
    ).toEqual([
      `La promoción debe quedar dentro de la temporada (${windowLabel(SEASON.startsAt, SEASON.endsAt)}).`,
    ]);
  });

  it('precio especial: solo países con precio y sin bono para el kit', () => {
    const form = {
      ...EMPTY_PROMOTION_FORM,
      name: 'Kit Premium a $2,000',
      type: 'fixed_price' as const,
      prices: { MX: '2,000', FN: '2000', US: '' },
      excludesKitBonus: true,
      eligible: [{ productId: 'kit', sku: 'KPM', name: 'Kit Premium', quantity: '1' }],
    };
    expect(toPromotionPayload(form, 'create')).toMatchObject({
      config: { prices: { MX: 2000, FN: 2000 } },
      excludesKitBonus: true,
      startsAt: null,
      endsAt: null,
    });
  });

  it('regalo por compra manda los regalos con cantidad', () => {
    const form = {
      ...EMPTY_PROMOTION_FORM,
      name: 'Shaker de regalo',
      type: 'gift_with_purchase' as const,
      minQuantity: '2',
      repeat: true,
      eligible: [{ productId: 'a', sku: 'A', name: 'A', quantity: '1' }],
      gifts: [{ productId: 'sh', sku: 'SHK', name: 'Shaker', quantity: '1' }],
    };
    expect(validatePromotionForm(form, SEASON_CTX)).toEqual([]);
    expect(toPromotionPayload(form, 'create')).toMatchObject({
      config: { minQuantity: 2, minAmount: null, repeat: true },
      gifts: [{ productId: 'sh', quantity: 1 }],
      excludesKitBonus: false,
    });
  });

  it('resumen de la tabla', () => {
    expect(promotionSummary(PROMO)).toBe('3x2 · 2 productos · POS · Tienda');
  });
});

describe('tienda: ¿la promoción vale comprando en línea?', () => {
  it('con canal en línea (solo o junto con punto de venta) sí vale', () => {
    expect(isOnlinePromotion({ channels: ['online'] })).toBe(true);
    expect(isOnlinePromotion({ channels: ['pos', 'online'] })).toBe(true);
  });

  it('solo punto de venta (sucursales y Call Center) no vale en línea', () => {
    // Buen Fin 2026: el kit del viernes y "compra 5 y llévate 1 gratis".
    expect(isOnlinePromotion({ channels: ['pos'] })).toBe(false);
  });

  it('sin canales capturados vale en los dos, como la guarda el API', () => {
    expect(isOnlinePromotion({ channels: [] })).toBe(true);
    expect(isOnlinePromotion({ channels: null })).toBe(true);
    expect(isOnlinePromotion({})).toBe(true);
  });
});

describe('inicio del distribuidor: tarjeta de la temporada vigente', () => {
  const promo = (id: string, name: string, channels: SeasonPromotion['channels'], typeLabel = '3x2'): SeasonPromotion => ({
    ...PROMO,
    id,
    name,
    channels,
    typeLabel,
  });

  it('lista primero lo que se compra en la tienda y marca lo que solo vale en sucursal', () => {
    const season = {
      promotions: [
        promo('kit', 'Kit Tonic Center Premium a $2,000', ['pos'], 'Precio especial'),
        promo('3x2', '3x2 Buen Fin sábado 14', ['pos', 'online']),
        promo('6x5', 'Compra 5 y llévate 1 gratis', ['pos'], '6x5'),
      ],
    };
    expect(seasonHighlights(season)).toEqual({
      items: [
        { id: '3x2', typeLabel: '3x2', name: '3x2 Buen Fin sábado 14', storeOnly: false },
        { id: 'kit', typeLabel: 'Precio especial', name: 'Kit Tonic Center Premium a $2,000', storeOnly: true },
        { id: '6x5', typeLabel: '6x5', name: 'Compra 5 y llévate 1 gratis', storeOnly: true },
      ],
      more: 0,
    });
  });

  it('muestra hasta el tope y dice cuántas más hay', () => {
    const season = {
      promotions: ['a', 'b', 'c', 'd', 'e'].map((id) => promo(id, `Promo ${id}`, ['online'])),
    };
    const { items, more } = seasonHighlights(season, 3);
    expect(items.map((i) => i.id)).toEqual(['a', 'b', 'c']);
    expect(more).toBe(2);
    expect(seasonHighlights(season, 0)).toEqual({ items: [], more: 5 });
  });

  it('sin promociones (o sin el dato) queda vacío', () => {
    expect(seasonHighlights({ promotions: [] })).toEqual({ items: [], more: 0 });
    expect(seasonHighlights({})).toEqual({ items: [], more: 0 });
  });

  it('el arte se pinta con su propia proporción, acotada', () => {
    expect(artAspectRatio(1800, 1200)).toBe(1.5); // el formato pedido a Marketing
    expect(artAspectRatio(1080, 1080)).toBe(1); // publicación cuadrada
    expect(artAspectRatio(1080, 1920)).toBe(0.75); // historia vertical: se acota
    expect(artAspectRatio(3000, 600)).toBe(2); // tira muy ancha: se acota
    for (const [w, h] of [[0, 100], [100, 0], [Number.NaN, 100], [-5, 10]]) {
      expect(artAspectRatio(w, h)).toBe(DEFAULT_ART_RATIO);
    }
  });
});
