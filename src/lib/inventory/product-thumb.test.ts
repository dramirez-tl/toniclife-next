import { describe, expect, it } from 'vitest';
import type { ProductImage } from '@/types/product';
import { canOptimizeImage, imageAttempts, thumbFromGallery, thumbFromRow } from './product-thumb';

const API = 'https://toniclife-api-production.up.railway.app/api/v1/storage/file/products';

const image = (over: Partial<ProductImage> = {}): ProductImage => ({
  id: 'i-1',
  productId: 'p-1',
  imageUrl: `${API}/p-1/a.jpg`,
  imageType: 'main',
  sortOrder: 0,
  isPrimary: true,
  isActive: true,
  createdAt: '2026-11-11T21:07:00.000Z',
  updatedAt: '2026-11-11T21:07:00.000Z',
  ...over,
});

describe('thumbFromRow (lo que dice la lista de existencias)', () => {
  it('el API aún no manda la foto (campos ausentes): hay que consultar la galería', () => {
    expect(thumbFromRow({})).toEqual({ kind: 'lookup' });
  });

  it('el API respondió y el producto no tiene foto: sin miniatura y sin consultar nada', () => {
    expect(thumbFromRow({ imageUrl: null })).toEqual({ kind: 'none' });
    expect(thumbFromRow({ imageUrl: null, thumbnailUrl: null })).toEqual({ kind: 'none' });
    expect(thumbFromRow({ imageUrl: '   ' })).toEqual({ kind: 'none' });
  });

  it('con foto: la miniatura usa la versión pequeña si existe y "ver en grande" la original', () => {
    expect(thumbFromRow({ imageUrl: `${API}/p-1/a.jpg`, thumbnailUrl: null })).toEqual({
      kind: 'ready',
      small: `${API}/p-1/a.jpg`,
      large: `${API}/p-1/a.jpg`,
    });
    expect(thumbFromRow({ imageUrl: `${API}/p-1/a.jpg`, thumbnailUrl: `${API}/p-1/a-thumb.jpg` })).toEqual({
      kind: 'ready',
      small: `${API}/p-1/a-thumb.jpg`,
      large: `${API}/p-1/a.jpg`,
    });
  });

  it('solo viene la miniatura: sirve para las dos cosas', () => {
    expect(thumbFromRow({ thumbnailUrl: '/fotos/a-thumb.jpg' })).toEqual({
      kind: 'ready',
      small: '/fotos/a-thumb.jpg',
      large: '/fotos/a-thumb.jpg',
    });
  });

  it('una dirección que no es http(s) ni ruta del sitio no se pinta', () => {
    expect(thumbFromRow({ imageUrl: 'javascript:alert(1)' })).toEqual({ kind: 'none' });
    expect(thumbFromRow({ imageUrl: 'data:image/png;base64,AAAA' })).toEqual({ kind: 'none' });
  });
});

describe('thumbFromGallery (la galería del producto)', () => {
  it('sin fotos, sin respuesta o todas dadas de baja: sin miniatura', () => {
    expect(thumbFromGallery(undefined)).toEqual({ kind: 'none' });
    expect(thumbFromGallery([])).toEqual({ kind: 'none' });
    expect(thumbFromGallery([image({ isActive: false })])).toEqual({ kind: 'none' });
  });

  it('gana la principal aunque no venga primero; entre iguales, el orden', () => {
    const gallery = [
      image({ id: 'b', imageUrl: `${API}/p-1/b.jpg`, isPrimary: false, sortOrder: 0 }),
      image({ id: 'a', imageUrl: `${API}/p-1/a.jpg`, isPrimary: true, sortOrder: 5 }),
    ];
    expect(thumbFromGallery(gallery)).toMatchObject({ kind: 'ready', large: `${API}/p-1/a.jpg` });
    const noPrimary = [
      image({ id: 'c', imageUrl: `${API}/p-1/c.jpg`, isPrimary: false, sortOrder: 2 }),
      image({ id: 'd', imageUrl: `${API}/p-1/d.jpg`, isPrimary: false, sortOrder: 1 }),
    ];
    expect(thumbFromGallery(noPrimary)).toMatchObject({ kind: 'ready', large: `${API}/p-1/d.jpg` });
  });

  it('la principal dada de baja no cuenta: sigue la siguiente activa', () => {
    const gallery = [
      image({ id: 'a', imageUrl: `${API}/p-1/a.jpg`, isPrimary: true, isActive: false }),
      image({ id: 'b', imageUrl: `${API}/p-1/b.jpg`, isPrimary: false, thumbnailUrl: `${API}/p-1/b-thumb.jpg` }),
    ];
    expect(thumbFromGallery(gallery)).toEqual({
      kind: 'ready',
      small: `${API}/p-1/b-thumb.jpg`,
      large: `${API}/p-1/b.jpg`,
    });
  });
});

describe('imageAttempts (cómo se pide la foto y qué sigue si falla)', () => {
  it('foto del API: primero achicada por el optimizador y, si falla, la original tal cual', () => {
    expect(imageAttempts(`${API}/p-1/a.jpg`)).toEqual([
      { src: `${API}/p-1/a.jpg`, optimized: true },
      { src: `${API}/p-1/a.jpg`, optimized: false },
    ]);
  });

  it('miniatura con respaldo en la foto grande', () => {
    expect(imageAttempts(`${API}/p-1/a-thumb.jpg`, `${API}/p-1/a.jpg`)).toEqual([
      { src: `${API}/p-1/a-thumb.jpg`, optimized: true },
      { src: `${API}/p-1/a.jpg`, optimized: false },
    ]);
  });

  it('origen que no se puede optimizar: un solo intento (no se repite la misma petición)', () => {
    expect(imageAttempts('https://example.com/a.jpg')).toEqual([{ src: 'https://example.com/a.jpg', optimized: false }]);
  });
});

describe('canOptimizeImage (¿se puede pedir una versión pequeña?)', () => {
  it('las fotos que sirve el API y las rutas del sitio: sí', () => {
    expect(canOptimizeImage(`${API}/p-1/a.jpg`)).toBe(true);
    expect(canOptimizeImage('/images/logo.png')).toBe(true);
    expect(canOptimizeImage('https://storage.googleapis.com/bucket/a.jpg')).toBe(true);
  });

  it('otro origen, http sin candado o texto que no es una dirección: no (se sirve tal cual)', () => {
    expect(canOptimizeImage('https://example.com/a.jpg')).toBe(false);
    expect(canOptimizeImage('http://toniclife-api-production.up.railway.app/a.jpg')).toBe(false);
    expect(canOptimizeImage('no es una url')).toBe(false);
  });
});
