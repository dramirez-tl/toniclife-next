import sharp from 'sharp';
import { describe, expect, it } from 'vitest';
import {
  OG_IMAGE_MAX_BYTES,
  OG_IMAGE_MAX_PX,
  isValidStorageKey,
  keyFromSegments,
  ogImagePathForKey,
  ogImageUrlFor,
  storageKeyFromImageUrl,
  upstreamUrlForKey,
} from './og-image';
import { renderOgJpeg } from './og-image.server';

const ENV = {
  NEXT_PUBLIC_BASE_URL: 'https://tienda.example.com',
  NEXT_PUBLIC_API_URL: 'https://api.example.com/api/v1',
};
const KEY = 'products/6b83e026-471e-4965-a5ad-409e44c86a31/e7b552c0-d0fb-4066-a7d3-db766a7efa04.jpg';
const PROD_IMG = `https://toniclife-api-production.up.railway.app/api/v1/storage/file/${KEY}`;

describe('storageKeyFromImageUrl / ogImageUrlFor', () => {
  it('foto del API en Railway → clave products/… y URL en este dominio', () => {
    expect(storageKeyFromImageUrl(PROD_IMG, ENV)).toBe(KEY);
    expect(ogImageUrlFor(PROD_IMG, ENV)).toBe(`https://tienda.example.com/og/imagen/${KEY}`);
  });

  it('el host del API configurado también cuenta (staging, local)', () => {
    expect(storageKeyFromImageUrl(`https://api.example.com/api/v1/storage/file/${KEY}`, ENV)).toBe(KEY);
    expect(storageKeyFromImageUrl(`http://localhost:3001/api/v1/storage/file/${KEY}`, {})).toBe(KEY);
  });

  it('otros orígenes o prefijos: null (no es un proxy abierto)', () => {
    expect(ogImageUrlFor('https://storage.googleapis.com/tl/3025.png', ENV)).toBeNull();
    expect(
      ogImageUrlFor('https://toniclife-api-production.up.railway.app/api/v1/storage/file/billing/x.pdf', ENV),
    ).toBeNull();
    expect(
      ogImageUrlFor(
        'https://toniclife-api-production.up.railway.app/api/v1/storage/file/users/avatars/a.jpg',
        ENV,
      ),
    ).toBeNull();
    expect(ogImageUrlFor('https://evil.example.com/api/v1/storage/file/products/a/b.jpg', ENV)).toBeNull();
    expect(
      ogImageUrlFor('https://up.railway.app.evil.example.com/api/v1/storage/file/products/a/b.jpg', ENV),
    ).toBeNull();
    expect(
      ogImageUrlFor(`https://toniclife-api-production.up.railway.app/api/v1/storage/file/${KEY}?x=1`, ENV),
    ).toBe(`https://tienda.example.com/og/imagen/${KEY}`);
    expect(ogImageUrlFor(null, ENV)).toBeNull();
    expect(ogImageUrlFor('', ENV)).toBeNull();
    expect(ogImageUrlFor('no es url', ENV)).toBeNull();
  });
});

describe('claves y rutas', () => {
  it('isValidStorageKey', () => {
    expect(isValidStorageKey(KEY)).toBe(true);
    expect(isValidStorageKey('products/a/b.PNG')).toBe(true);
    expect(isValidStorageKey('products/a.jpg')).toBe(true);
    expect(isValidStorageKey('products')).toBe(false);
    expect(isValidStorageKey('users/avatars/a.jpg')).toBe(false);
    expect(isValidStorageKey('products/a/b.pdf')).toBe(false);
    expect(isValidStorageKey('products/a/b.jpg/')).toBe(false);
    expect(isValidStorageKey('products/a/..jpg')).toBe(false);
    expect(isValidStorageKey('products/a/b..c.jpg')).toBe(false);
    expect(isValidStorageKey('products//b.jpg')).toBe(false);
    expect(isValidStorageKey('products/a/b c.jpg')).toBe(false);
    expect(isValidStorageKey('products/a/b%2Fc.jpg')).toBe(false);
    expect(isValidStorageKey(`products/${'a'.repeat(300)}.jpg`)).toBe(false);
  });

  it('keyFromSegments decodifica y valida', () => {
    expect(keyFromSegments(KEY.split('/'))).toBe(KEY);
    expect(keyFromSegments(['products', 'a', 'b%2E%2E%2Fc.jpg'])).toBeNull();
    expect(keyFromSegments(['products'])).toBeNull();
    expect(keyFromSegments([])).toBeNull();
    expect(keyFromSegments(undefined)).toBeNull();
    expect(keyFromSegments(['products', 'a', '%E0%A4%A'])).toBeNull();
  });

  it('ogImagePathForKey / upstreamUrlForKey', () => {
    expect(ogImagePathForKey(KEY)).toBe(`/og/imagen/${KEY}`);
    expect(upstreamUrlForKey(KEY, ENV)).toBe(`https://api.example.com/api/v1/storage/file/${KEY}`);
  });
});

describe('renderOgJpeg', () => {
  it('PNG grande (foto borrosa de 2000 px) → JPEG ≤ 1200 px y ≤ 280 KB', async () => {
    // Ruido a 250 px escalado a 2000 px: compresión parecida a una foto real.
    const small = 250;
    const raw = Buffer.alloc(small * small * 3);
    let seed = 7;
    for (let i = 0; i < raw.length; i++) {
      seed = (seed * 1103515245 + 12345) & 0x7fffffff;
      raw[i] = seed & 0xff;
    }
    const png = await sharp(raw, {
      raw: { width: small, height: small, channels: 3 },
    })
      .resize(2000, 2000)
      .png()
      .toBuffer();
    expect(png.length).toBeGreaterThan(OG_IMAGE_MAX_BYTES);

    const out = await renderOgJpeg(png);
    expect(out.buffer.length).toBeLessThanOrEqual(OG_IMAGE_MAX_BYTES);
    expect(Math.max(out.width, out.height)).toBeLessThanOrEqual(OG_IMAGE_MAX_PX);
    expect(Math.max(out.width, out.height)).toBe(OG_IMAGE_MAX_PX);
    const meta = await sharp(out.buffer).metadata();
    expect(meta.format).toBe('jpeg');
    expect(meta.isProgressive).toBe(true);
  }, 30_000);

  it('foto chica no se agranda y la transparencia queda en blanco', async () => {
    const png = await sharp({
      create: {
        width: 400,
        height: 300,
        channels: 4,
        background: { r: 0, g: 0, b: 0, alpha: 0 },
      },
    })
      .png()
      .toBuffer();
    const out = await renderOgJpeg(png);
    expect([out.width, out.height]).toEqual([400, 300]);
    expect(out.quality).toBe(82);
    const { data } = await sharp(out.buffer).raw().toBuffer({ resolveWithObject: true });
    expect(data[0]).toBeGreaterThan(250);
  });

  it('bytes que no son imagen: rechaza', async () => {
    await expect(renderOgJpeg(Buffer.from('<html>no soy imagen</html>'))).rejects.toThrow();
  });
});
