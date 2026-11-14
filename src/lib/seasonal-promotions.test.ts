import { describe, expect, it } from 'vitest';
import {
  DEFAULT_ART_RATIO,
  EMPTY_PROMOTION_FORM,
  EMPTY_SEASON_FORM,
  artAspectRatio,
  assignProductToGroup,
  formFromPromotion,
  formFromSeason,
  formatLocalStamp,
  formatSalesAmount,
  hasOnlinePromotion,
  isOnlinePromotion,
  nextGroupKey,
  normalizeInputStamp,
  nowCdmxStamp,
  nxmCombineExample,
  nxmGroupsOf,
  nxmOffer,
  nxmProgress,
  promotionSalesSummary,
  promotionSummary,
  removeProductFromGroups,
  seasonHighlights,
  seasonalFilterName,
  seasonalProductBadges,
  suggestNxmGroups,
  suggestedGroupRows,
  toInputStamp,
  toPromotionPayload,
  toSeasonPayload,
  ungroupedProducts,
  validatePromotionForm,
  validatePromotionGroups,
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

describe('catálogo de la tienda: insignia y filtro de los productos en promoción', () => {
  const product = (productId: string, role: 'eligible' | 'gift' = 'eligible') => ({
    productId,
    sku: productId,
    name: productId,
    role,
    quantity: 1,
    sortOrder: 0,
  });
  const promo = (
    id: string,
    name: string,
    channels: SeasonPromotion['channels'],
    typeLabel: string,
    products: SeasonPromotion['products'],
  ): SeasonPromotion => ({ ...PROMO, id, name, channels, typeLabel, products });

  // El sábado del Buen Fin: 3x2 en tienda y caja, y "compra 5 y llévate 1" solo en caja.
  const SATURDAY = {
    name: 'Buen Fin 2026',
    promotions: [
      promo('3x2', '3x2 Buen Fin sábado 14', ['pos', 'online'], '3x2', [product('aby'), product('oximagic')]),
      promo('6x5', 'Compra 5 y llévate 1 gratis', ['pos'], '6x5', [product('shake'), product('oximagic')]),
    ],
  };

  it('cada producto elegible lleva la insignia de su promoción; las de solo sucursal van marcadas', () => {
    const badges = seasonalProductBadges([SATURDAY]);
    expect([...badges.keys()].sort()).toEqual(['aby', 'oximagic', 'shake']);
    expect(badges.get('aby')).toEqual({
      promotionId: '3x2',
      label: '3x2',
      name: '3x2 Buen Fin sábado 14',
      seasonName: 'Buen Fin 2026',
      storeOnly: false,
      nxm: { buy: 3, pay: 2, free: 1, sameProductOnly: true },
      maxPerSale: null,
      description: null,
    });
    expect(badges.get('shake')).toMatchObject({ label: '6x5', storeOnly: true });
  });

  it('la insignia trae la mecánica, el tope por compra y las condiciones de la promoción', () => {
    const season = {
      name: 'Buen Fin 2026',
      promotions: [
        {
          ...promo('sab', '3x2 Buen Fin sábado 14', ['pos', 'online'], '3x2', [product('aby')]),
          maxPerSale: 2,
          description: '  Válido solo el 14 de noviembre de 2026.  ',
        },
        {
          ...promo('kit', 'Kit a $2,000', ['online'], 'Precio especial', [product('kit')]),
          type: 'fixed_price' as const,
          config: { prices: { MX: 2000 } },
        },
      ],
    };
    const badges = seasonalProductBadges([season]);
    expect(badges.get('aby')).toMatchObject({
      nxm: { buy: 3, pay: 2, free: 1, sameProductOnly: true },
      maxPerSale: 2,
      description: 'Válido solo el 14 de noviembre de 2026.',
    });
    // Otro tipo de promoción: sin mecánica "lleva N, paga M".
    expect(badges.get('kit')).toMatchObject({ nxm: null, maxPerSale: null, description: null });
  });

  it('nxmOffer: solo "lleva N, paga M" bien configurado (mismas guardas que el motor)', () => {
    expect(nxmOffer({ type: 'nxm', config: { buy: 3, pay: 2, sameProductOnly: true } })).toEqual({
      buy: 3,
      pay: 2,
      free: 1,
      sameProductOnly: true,
    });
    expect(nxmOffer({ type: 'nxm', config: { buy: 6, pay: 5, sameProductOnly: false } })).toEqual({
      buy: 6,
      pay: 5,
      free: 1,
      sameProductOnly: false,
    });
    expect(nxmOffer({ type: 'nxm', config: { buy: '4', pay: '2' } })).toMatchObject({ buy: 4, pay: 2, free: 2, sameProductOnly: false });
    for (const config of [{ buy: 1, pay: 1 }, { buy: 3, pay: 3 }, { buy: 3, pay: 0 }, { buy: 3 }, {}, null, undefined]) {
      expect(nxmOffer({ type: 'nxm', config })).toBeNull();
    }
    expect(nxmOffer({ type: 'percent_off', config: { percent: 20 } })).toBeNull();
    expect(nxmOffer({})).toBeNull();
  });

  it('nxmProgress: cuántas salen gratis y cuántas faltan para la siguiente', () => {
    const offer = { buy: 3, pay: 2, free: 1, sameProductOnly: true };
    expect(nxmProgress(1, offer)).toEqual({ freeNow: 0, missing: 2, freeNext: 1, targetQuantity: 3 });
    expect(nxmProgress(2, offer)).toEqual({ freeNow: 0, missing: 1, freeNext: 1, targetQuantity: 3 });
    expect(nxmProgress(3, offer)).toEqual({ freeNow: 1, missing: 0, freeNext: 1, targetQuantity: 3 });
    expect(nxmProgress(5, offer)).toEqual({ freeNow: 1, missing: 1, freeNext: 1, targetQuantity: 6 });
    expect(nxmProgress(6, offer)).toEqual({ freeNow: 2, missing: 0, freeNext: 1, targetQuantity: 6 });
    // 6x5 ("compra 5 y llévate 1"): con 5 falta 1, que es la gratis.
    const sixFive = { buy: 6, pay: 5, free: 1, sameProductOnly: true };
    expect(nxmProgress(5, sixFive)).toMatchObject({ missing: 1, freeNow: 0 });
    // 4x2: cada grupo da 2 gratis.
    expect(nxmProgress(8, { buy: 4, pay: 2, free: 2, sameProductOnly: true })).toMatchObject({ freeNow: 4, missing: 0 });
    // Cantidades que no sirven: como cero.
    expect(nxmProgress(Number.NaN, offer)).toEqual({ freeNow: 0, missing: 0, freeNext: 1, targetQuantity: 0 });
    expect(nxmProgress(-2, offer)).toMatchObject({ freeNow: 0, missing: 0 });
    expect(nxmProgress(2.9, offer)).toMatchObject({ missing: 1, targetQuantity: 3 });
  });

  it('si un producto está en dos promociones gana la que se puede comprar en la tienda, sin importar el orden', () => {
    expect(seasonalProductBadges([SATURDAY]).get('oximagic')).toMatchObject({ label: '3x2', storeOnly: false });
    const reversed = { ...SATURDAY, promotions: [...SATURDAY.promotions].reverse() };
    expect(seasonalProductBadges([reversed]).get('oximagic')).toMatchObject({ label: '3x2', storeOnly: false });
  });

  it('entre dos promociones iguales en canal se queda la primera (el orden en que el motor las aplica)', () => {
    const season = {
      name: 'Buen Fin 2026 · PRUEBA',
      promotions: [
        promo('sab', '3x2 Buen Fin sábado 14', ['pos', 'online'], '3x2', [product('aby')]),
        promo('dom', '3x2 Buen Fin domingo 15', ['pos', 'online'], '3x2', [product('aby')]),
      ],
    };
    expect(seasonalProductBadges([season]).get('aby')).toMatchObject({ promotionId: 'sab' });
  });

  it('el regalo de una promoción no lleva insignia', () => {
    const season = {
      name: 'Navidad',
      promotions: [promo('regalo', 'Taza de regalo', ['online'], 'Regalo por compra', [product('cafe'), product('taza', 'gift')])],
    };
    const badges = seasonalProductBadges([season]);
    expect(badges.has('cafe')).toBe(true);
    expect(badges.has('taza')).toBe(false);
  });

  it('sin temporadas (o sin el dato) no hay insignias', () => {
    expect(seasonalProductBadges(undefined).size).toBe(0);
    expect(seasonalProductBadges(null).size).toBe(0);
    expect(seasonalProductBadges([]).size).toBe(0);
    expect(seasonalProductBadges([{ name: 'Vacía' }]).size).toBe(0);
  });

  it('el filtro se llama como la temporada cuando corre una sola; con varias, texto genérico', () => {
    expect(seasonalFilterName([{ name: 'Buen Fin 2026 · PRUEBA' }])).toBe('Buen Fin 2026 · PRUEBA');
    expect(seasonalFilterName([{ name: ' Buen Fin 2026 ' }, { name: 'Buen Fin 2026' }])).toBe('Buen Fin 2026');
    expect(seasonalFilterName([{ name: 'Buen Fin 2026' }, { name: 'Navidad' }])).toBeNull();
    expect(seasonalFilterName([])).toBeNull();
    expect(seasonalFilterName(undefined)).toBeNull();
  });

  it('hay algo que comprar en línea si alguna promoción de hoy vale en la tienda', () => {
    expect(hasOnlinePromotion(SATURDAY)).toBe(true);
    // Viernes del Buen Fin: solo el kit, que es de sucursal.
    expect(hasOnlinePromotion({ promotions: [promo('kit', 'Kit a $2,000', ['pos'], 'Precio especial', [product('kit')])] })).toBe(false);
    expect(hasOnlinePromotion({ promotions: [] })).toBe(false);
    expect(hasOnlinePromotion({})).toBe(false);
  });
});

describe('admin: insignia de ventas de cada promoción', () => {
  /** Intl separa algunos símbolos con un espacio duro; para comparar da igual. */
  const plain = (s: string) => s.replace(/ /g, ' ');

  it('el kit del Buen Fin: 64 ventas y lo cobrado por los kits, en pesos', () => {
    const s = promotionSalesSummary({ usageCount: 64, salesAmounts: [{ currency: 'MXN', amount: 130000 }] });
    expect(s.hasSales).toBe(true);
    expect(s.label).toBe('64 ventas · $130,000.00 MXN');
    expect(s.hint).toContain('ya cobrados');
    expect(s.hint).toContain('No cuenta lo demás del ticket');
  });

  it('una sola venta va en singular y con centavos', () => {
    expect(promotionSalesSummary({ usageCount: 1, salesAmounts: [{ currency: 'MXN', amount: 1899.5 }] }).label).toBe(
      '1 venta · $1,899.50 MXN',
    );
  });

  it('la promoción que todavía no vende lo dice, en gris', () => {
    const s = promotionSalesSummary({ usageCount: 0, salesAmounts: [] });
    expect(s).toEqual({
      hasSales: false,
      label: 'Sin ventas',
      hint: 'Todavía ninguna venta cobrada usó esta promoción.',
    });
    // Aunque llegara un monto sin ventas, sin ventas no hay nada que presumir.
    expect(promotionSalesSummary({ usageCount: 0, salesAmounts: [{ currency: 'MXN', amount: 50 }] }).label).toBe(
      'Sin ventas',
    );
  });

  it('miles de ventas llevan separador', () => {
    expect(
      promotionSalesSummary({ usageCount: 1234, salesAmounts: [{ currency: 'MXN', amount: 2468000 }] }).label,
    ).toBe('1,234 ventas · $2,468,000.00 MXN');
  });

  it('vendida en dos monedas: cada monto aparte, no se suman pesos con dólares', () => {
    const s = promotionSalesSummary({
      usageCount: 12,
      salesAmounts: [
        { currency: 'MXN', amount: 8450.5 },
        { currency: 'USD', amount: 1200 },
      ],
    });
    expect(plain(s.label)).toBe('12 ventas · $8,450.50 MXN + $1,200.00 USD');
  });

  it('sin el monto (API anterior) o con monto en cero queda solo el conteo', () => {
    expect(promotionSalesSummary({ usageCount: 64 }).label).toBe('64 ventas');
    expect(promotionSalesSummary({ usageCount: 64, salesAmounts: [] }).label).toBe('64 ventas');
    expect(promotionSalesSummary({ usageCount: 3, salesAmounts: [{ currency: 'MXN', amount: 0 }] }).label).toBe(
      '3 ventas',
    );
  });

  it('el monto siempre lleva el código de su moneda, sin repetirlo', () => {
    expect(formatSalesAmount(130000, 'MXN')).toBe('$130,000.00 MXN');
    expect(formatSalesAmount(1200, ' usd ')).toBe('$1,200.00 USD');
    // Monedas sin símbolo corto: el formato ya trae el código.
    expect(plain(formatSalesAmount(500, 'PAB'))).toBe('PAB 500.00');
    // Sin moneda se asume la de la casa; un código que no es moneda no rompe la pantalla.
    expect(formatSalesAmount(2000, '')).toBe('$2,000.00 MXN');
    expect(formatSalesAmount(2000, 'XX')).toBe('2,000.00 XX');
  });
});

describe('promoción "lleva N, paga M": sabores que se combinan por grupo (14-nov-2026)', () => {
  // Los productos del "Compra 5 y llévate 1" del sábado 14, con sus nombres reales.
  const row = (productId: string, sku: string, name: string) => ({ productId, sku, name, quantity: '1' });
  const SHAKES = [
    row('s-gal', '9408', '24 Shake Galleta 625 g.'),
    row('s-cap', '9422', '24 Shake Capuchino 625 g.'),
    row('s-cho', '8234', '24 Shake Chocolate 625 g'),
    row('s-fre', '9712', '24 Shake Fresa 625 g'),
    row('s-van', '9705', '24 Shake Vainilla 625 g.'),
    row('s-pin', '9415', '24 Shake Piña Colada 625 g.'),
  ];
  const GUBI = [
    row('g-fre', '9781', 'Gubi Shake Sport Fresa 625 g'),
    row('g-van', '8883', 'Gubi Shake Sport Vainilla 625 g'),
  ];
  const MIX = row('mix', '8289', '12 Mix 500 g');
  const ELIGIBLE = [...GUBI, ...SHAKES, MIX];
  const ids = (rows: { productId: string }[]) => rows.map((r) => r.productId);

  const groupedPromo: SeasonPromotion = {
    ...PROMO,
    typeLabel: '6x5',
    config: {
      buy: 6,
      pay: 5,
      sameProductOnly: true,
      groups: [
        { name: '24 Shake', productIds: [...ids(SHAKES), 'ya-no-esta'] },
        { name: 'Gubi Shake Sport', productIds: ids(GUBI) },
      ],
    },
    channels: ['pos'],
    products: ELIGIBLE.map((e, i) => ({
      productId: e.productId,
      sku: e.sku,
      name: e.name,
      role: 'eligible' as const,
      quantity: 1,
      sortOrder: i,
    })),
  };

  it('sugiere los grupos por el nombre: mismo arranque y misma presentación', () => {
    expect(suggestNxmGroups(ELIGIBLE)).toEqual([
      { name: 'Gubi Shake Sport', productIds: ids(GUBI) },
      { name: '24 Shake', productIds: ids(SHAKES) },
    ]);
  });

  it('la sugerencia no junta lo que solo se parece: otra presentación, una sola palabra en común o un nombre contenido en otro', () => {
    const none = (names: string[]) => suggestNxmGroups(names.map((name, i) => ({ productId: `p${i}`, name })));
    expect(none(['24 Shake Vainilla 625 g', '24 Shake Vainilla 1 kg'])).toEqual([]);
    expect(none(['Tonic Life Cápsulas 60 pzas', 'Tonic Bron Té 200 g'])).toEqual([]);
    expect(none(['Té Verde 200 g', 'Té Negro 200 g'])).toEqual([]);
    expect(none(['Jimmy Coffee 270 g', 'Jimmy Coffee Moka 270 g'])).toEqual([]);
    expect(none(['12 Mix 500 g'])).toEqual([]);
    expect(none([])).toEqual([]);
    // Sin presentación en el nombre también agrupa por el arranque.
    expect(none(['Legline Té Limón', 'Legline Té Menta'])).toEqual([{ name: 'Legline Té', productIds: ['p0', 'p1'] }]);
    // "625g" pegado y "625 g." con punto son la misma presentación.
    expect(none(['24 Shake Vainilla 625g', '24 Shake Fresa 625 g.'])).toEqual([
      { name: '24 Shake', productIds: ['p0', 'p1'] },
    ]);
  });

  it('al abrir una promoción con grupos el formulario queda en "por grupo", solo con productos que siguen en la lista', () => {
    const form = formFromPromotion(groupedPromo);
    expect(form.combineMode).toBe('groups');
    expect(form.groups.map((g) => [g.name, g.productIds])).toEqual([
      ['24 Shake', ids(SHAKES)],
      ['Gubi Shake Sport', ids(GUBI)],
    ]);
    expect(new Set(form.groups.map((g) => g.key)).size).toBe(2);
    expect(validatePromotionForm(form, SEASON_CTX)).toEqual([]);
    // Sin grupos: idénticas; con sameProductOnly false: todo.
    expect(formFromPromotion(PROMO)).toMatchObject({ combineMode: 'same', groups: [] });
    expect(
      formFromPromotion({ ...PROMO, config: { buy: 3, pay: 2, sameProductOnly: false } }),
    ).toMatchObject({ combineMode: 'all', groups: [] });
  });

  it('el payload lleva los grupos dentro de la config; sin grupos viaja igual que siempre', () => {
    const form = formFromPromotion(groupedPromo);
    expect(toPromotionPayload(form, 'edit').config).toEqual({
      buy: 6,
      pay: 5,
      sameProductOnly: true,
      groups: [
        { name: '24 Shake', productIds: ids(SHAKES) },
        { name: 'Gubi Shake Sport', productIds: ids(GUBI) },
      ],
    });
    expect(toPromotionPayload({ ...form, combineMode: 'same' }, 'edit').config).toEqual({
      buy: 6,
      pay: 5,
      sameProductOnly: true,
    });
    expect(toPromotionPayload({ ...form, combineMode: 'all' }, 'edit').config).toEqual({
      buy: 6,
      pay: 5,
      sameProductOnly: false,
    });
    expect(toPromotionPayload(formFromPromotion(PROMO), 'edit').config).toEqual({
      buy: 3,
      pay: 2,
      sameProductOnly: true,
    });
  });

  it('al guardar, un grupo solo lleva productos de la promoción, con el nombre limpio', () => {
    const form = {
      ...formFromPromotion(groupedPromo),
      eligible: [...SHAKES.slice(0, 2), MIX],
      groups: [
        { key: 'a', name: '  24   Shake ', productIds: [...ids(SHAKES), 's-gal'] },
        { key: 'b', name: 'Gubi Shake Sport', productIds: ids(GUBI) },
        { key: 'c', name: '', productIds: [] },
      ],
    };
    expect(toPromotionPayload(form, 'edit').config).toEqual({
      buy: 6,
      pay: 5,
      sameProductOnly: true,
      groups: [{ name: '24 Shake', productIds: ['s-gal', 's-cap'] }],
    });
  });

  it('valida los grupos: al menos uno, de 2 o más productos, con nombre, sin repetir nombre ni producto', () => {
    const base = { ...formFromPromotion(groupedPromo), eligible: ELIGIBLE };
    const problems = (groups: typeof base.groups) => validatePromotionForm({ ...base, groups }, SEASON_CTX).join(' | ');
    expect(problems([])).toContain('Arma al menos un grupo');
    expect(problems([{ key: 'a', name: '24 Shake', productIds: ['s-gal'] }])).toContain('necesita al menos 2 productos');
    expect(problems([{ key: 'a', name: '  ', productIds: ['s-gal', 's-cap'] }])).toContain('Ponle nombre al grupo');
    expect(
      problems([
        { key: 'a', name: 'Shake', productIds: ['s-gal', 's-cap'] },
        { key: 'b', name: 'shake', productIds: ['s-cho', 's-fre'] },
      ]),
    ).toContain('dos grupos con el nombre');
    expect(
      problems([
        { key: 'a', name: 'A', productIds: ['s-gal', 's-cap'] },
        { key: 'b', name: 'B', productIds: ['s-cap', 's-cho'] },
      ]),
    ).toContain('El producto 9422 está en dos grupos');
    // Una fila vacía y sin nombre no estorba; en otro modo los grupos no se validan.
    expect(
      problems([
        { key: 'a', name: '24 Shake', productIds: ['s-gal', 's-cap'] },
        { key: 'b', name: '', productIds: [] },
      ]),
    ).toBe('');
    expect(validatePromotionForm({ ...base, combineMode: 'same', groups: [] }, SEASON_CTX)).toEqual([]);
    expect(validatePromotionGroups({ eligible: ELIGIBLE, groups: base.groups })).toEqual([]);
  });

  it('mover productos entre grupos: un producto va en un solo grupo', () => {
    const groups = [
      { key: 'a', name: '24 Shake', productIds: ['s-gal', 's-cap'] },
      { key: 'b', name: 'Gubi', productIds: ['g-fre'] },
    ];
    expect(assignProductToGroup(groups, 'b', 's-cap').map((g) => g.productIds)).toEqual([['s-gal'], ['g-fre', 's-cap']]);
    expect(assignProductToGroup(groups, 'a', 's-cap').map((g) => g.productIds)).toEqual([['s-gal', 's-cap'], ['g-fre']]);
    expect(removeProductFromGroups(groups, 's-gal').map((g) => g.productIds)).toEqual([['s-cap'], ['g-fre']]);
    expect(ids(ungroupedProducts(ELIGIBLE, groups))).toEqual(['g-van', 's-cho', 's-fre', 's-van', 's-pin', 'mix']);
    expect(nextGroupKey(groups)).toBe('n3');
    expect(nextGroupKey([...groups, { key: 'n3', name: '', productIds: [] }])).toBe('n4');
    expect(suggestedGroupRows(ELIGIBLE).map((g) => [g.key, g.name])).toEqual([
      ['s1', 'Gubi Shake Sport'],
      ['s2', '24 Shake'],
    ]);
  });

  it('nxmGroupsOf lee los grupos como el motor: solo con piezas idénticas, 2+ productos, cada uno en su primer grupo', () => {
    expect(nxmGroupsOf(groupedPromo).map((g) => g.name)).toEqual(['24 Shake', 'Gubi Shake Sport']);
    expect(nxmGroupsOf(PROMO)).toEqual([]);
    expect(nxmGroupsOf({ type: 'percent_off', config: { percent: 10 } })).toEqual([]);
    expect(
      nxmGroupsOf({
        type: 'nxm',
        config: {
          buy: 3,
          pay: 2,
          sameProductOnly: true,
          groups: [{ name: ' A ', productIds: ['x', 'y', 'x', 7] }, { name: 'B', productIds: ['y', 'z'] }, null, { name: 'C', productIds: ['z', 'w'] }],
        },
      }),
    ).toEqual([
      { name: 'A', productIds: ['x', 'y'] },
      { name: 'C', productIds: ['z', 'w'] },
    ]);
    expect(
      nxmGroupsOf({
        type: 'nxm',
        config: { buy: 3, pay: 2, sameProductOnly: false, groups: [{ name: 'A', productIds: ['x', 'y'] }] },
      }),
    ).toEqual([]);
  });

  it('el resumen de la tabla dice cuántos grupos se combinan', () => {
    expect(promotionSummary(groupedPromo)).toBe('6x5 · 9 productos · 2 grupos que se combinan · POS');
    expect(promotionSummary(PROMO)).toBe('3x2 · 2 productos · POS · Tienda');
  });

  it('el ejemplo en palabras sigue al "lleva / paga" capturado', () => {
    expect(nxmCombineExample('groups', '6', '5')).toContain('cada 6 piezas del grupo = 1 gratis');
    expect(nxmCombineExample('same', '3', '2')).toContain('3 piezas del mismo producto = 1 gratis');
    expect(nxmCombineExample('all', '4', '2')).toContain('cada 4 piezas = 2 gratis');
    // Con datos a medias no truena: usa un 3x2 de ejemplo.
    expect(nxmCombineExample('same', '', 'x')).toContain('3 piezas del mismo producto = 1 gratis');
  });

  it('la tienda sabe con qué productos se combina cada uno (insignia con su grupo)', () => {
    const online = { ...groupedPromo, channels: ['pos', 'online'] as SeasonPromotion['channels'] };
    const badges = seasonalProductBadges([{ name: 'Buen Fin 2026', promotions: [online] }]);
    expect(badges.get('s-van')?.group).toEqual({ name: '24 Shake', productIds: ids(SHAKES) });
    expect(badges.get('g-fre')?.group).toEqual({ name: 'Gubi Shake Sport', productIds: ids(GUBI) });
    // El 12 Mix cuenta solo: sin la llave.
    expect(badges.get('mix')).toBeDefined();
    expect(badges.get('mix')).not.toHaveProperty('group');
    // Sin grupos la insignia queda igual que siempre.
    const plain = seasonalProductBadges([{ name: 'Buen Fin 2026', promotions: [PROMO] }]);
    expect(plain.get('a')).not.toHaveProperty('group');
  });
});
