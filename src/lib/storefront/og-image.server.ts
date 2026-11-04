// Reencodado de la foto de producto para Open Graph (solo servidor: usa sharp).
// Separado de og-image.ts para que la ficha y las pruebas de los helpers no
// carguen el binario nativo.

import sharp from 'sharp';
import { OG_IMAGE_MAX_BYTES, OG_IMAGE_MAX_PX } from './og-image';

export interface OgJpeg {
  buffer: Buffer;
  width: number;
  height: number;
  quality: number;
}

export interface OgJpegLimits {
  maxPx: number;
  maxBytes: number;
}

const QUALITIES = [82, 72, 62, 52];
/** Entrada acotada: 80 Mpx (una foto de 9000×9000 ya es sospechosa). */
const MAX_INPUT_PIXELS = 80_000_000;

/**
 * Cualquier formato → JPEG progresivo sobre fondo blanco, lado mayor ≤ maxPx y
 * peso ≤ maxBytes: baja la calidad y luego el tamaño hasta caber; el primer
 * intento que cabe gana. Si ni el más chico cabe (caso extremo), devuelve ese.
 */
export async function renderOgJpeg(
  source: Buffer,
  limits: OgJpegLimits = {
    maxPx: OG_IMAGE_MAX_PX,
    maxBytes: OG_IMAGE_MAX_BYTES,
  },
): Promise<OgJpeg> {
  const sides = [limits.maxPx, Math.round(limits.maxPx * 0.8), Math.round(limits.maxPx * 0.6)];
  let last: OgJpeg | null = null;
  for (const side of sides) {
    for (const quality of QUALITIES) {
      const { data, info } = await sharp(source, {
        animated: false,
        limitInputPixels: MAX_INPUT_PIXELS,
      })
        .rotate()
        .resize({
          width: side,
          height: side,
          fit: 'inside',
          withoutEnlargement: true,
        })
        .flatten({ background: '#ffffff' })
        .jpeg({ quality, progressive: true, mozjpeg: true })
        .toBuffer({ resolveWithObject: true });
      last = { buffer: data, width: info.width, height: info.height, quality };
      if (data.length <= limits.maxBytes) return last;
    }
  }
  return last as OgJpeg;
}
