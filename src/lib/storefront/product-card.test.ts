import { describe, expect, it } from 'vitest';
import type { StorefrontCardFamily, StorefrontProductCard } from '@/types/storefront';
import { cardAction, cardBadges, cardFamily } from './product-card';

type CardInput = Parameters<typeof cardBadges>[0];

const family = (over: Partial<StorefrontCardFamily> = {}): StorefrontCardFamily => ({
  code: 'TLC',
  name: 'Tenis Tonic Life Lava – Café',
  variantCount: 5,
  fromPrice: 700,
  genders: ['unisex'],
  colors: [{ name: 'Café', hex: '#8B5030' }],
  sizes: ['22', '23', '24', '25', '26'],
  ...over,
});

const card = (over: Partial<CardInput> = {}): CardInput => ({
  availability: 'in_stock',
  stockLeft: null,
  madeToOrder: null,
  isNew: false,
  isFeatured: false,
  type: 'product' as StorefrontProductCard['type'],
  family: null,
  ...over,
});

describe('cardFamily (¿la tarjeta habla por varias variantes?)', () => {
  it('sin familia o con una sola variante no hay nada que elegir', () => {
    expect(cardFamily(card())).toBeNull();
    expect(cardFamily(card({ family: family({ variantCount: 1, sizes: ['24'] }) }))).toBeNull();
  });

  it('con más de una variante, la familia', () => {
    const f = family();
    expect(cardFamily(card({ family: f }))).toBe(f);
  });
});

describe('cardAction (qué hace el botón de la tarjeta)', () => {
  it('un producto suelto se agrega al carrito desde la tarjeta', () => {
    expect(cardAction(card())).toBe('add');
    expect(cardAction(card({ family: family({ variantCount: 1, sizes: ['24'] }) }))).toBe('add');
  });

  it('caso real: los tenis vienen en 5 tallas; la tarjeta no agrega la 22, lleva a elegir talla', () => {
    expect(cardAction(card({ family: family() }))).toBe('choose_size');
  });

  it('varias variantes sin tallas distintas (colores o para quién): lleva a ver opciones', () => {
    const colors = family({
      variantCount: 2,
      sizes: [],
      colors: [
        { name: 'Azul rey', hex: '#0C3C98' },
        { name: 'Verde oscuro', hex: '#2B3A3B' },
      ],
    });
    expect(cardAction(card({ family: colors }))).toBe('choose_options');
    expect(cardAction(card({ family: family({ variantCount: 2, sizes: ['CH'] }) }))).toBe('choose_options');
  });
});

describe('cardBadges (etiquetas de la tarjeta)', () => {
  it('producto suelto con pocas piezas: "Últimas n"', () => {
    expect(cardBadges(card({ availability: 'low_stock', stockLeft: 3 }))).toEqual(['lowStock']);
  });

  it('caso real: familia cuya primera talla tiene 1 pieza; la tarjeta NO dice "Última pieza" (el modelo tiene más pares)', () => {
    expect(cardBadges(card({ availability: 'low_stock', stockLeft: 1, isNew: true, family: family() }))).toEqual(['new']);
  });

  it('familia de una sola variante: su existencia sí es la del producto', () => {
    const single = family({ variantCount: 1, sizes: ['24'] });
    expect(cardBadges(card({ availability: 'low_stock', stockLeft: 1, family: single }))).toEqual(['lowStock']);
  });

  it('agotado se sigue avisando también en la familia (la representativa es la primera que se puede vender)', () => {
    expect(cardBadges(card({ availability: 'out_of_stock', family: family() }))).toEqual(['outOfStock']);
  });

  it('máximo dos, por prioridad: Agotado > Últimas n > Bajo pedido > Nuevo > Destacado > Paquete', () => {
    const all = card({
      availability: 'low_stock',
      stockLeft: 2,
      madeToOrder: { leadDays: 5 },
      isNew: true,
      isFeatured: true,
      type: 'pack' as StorefrontProductCard['type'],
    });
    expect(cardBadges(all)).toEqual(['lowStock', 'madeToOrder']);
    expect(cardBadges(card({ isNew: true, isFeatured: true, type: 'pack' as StorefrontProductCard['type'] }))).toEqual(['new', 'featured']);
    expect(cardBadges(card())).toEqual([]);
  });

  it('sin el dato de piezas no hay "Últimas n"', () => {
    expect(cardBadges(card({ availability: 'low_stock', stockLeft: null }))).toEqual([]);
  });
});
