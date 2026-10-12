// badge-photo.test.ts - El color de relleno del recorte de la foto (la parte
// pura: sin canvas). Lo demás (recorte, JPEG) necesita navegador.

import { describe, expect, it } from 'vitest';
import { BADGE_PHOTO_DEFAULT_FILL, dominantColor } from './badge-photo';

/** Pixeles RGBA a partir de una lista de [r, g, b, a?]. */
function pixels(list: Array<[number, number, number] | [number, number, number, number]>) {
  const out = new Uint8ClampedArray(list.length * 4);
  list.forEach(([r, g, b, a = 255], i) => {
    out.set([r, g, b, a], i * 4);
  });
  return out;
}

describe('dominantColor (fondo del estudio en la franja superior)', () => {
  it('devuelve el color más frecuente, no el promedio', () => {
    // 3 píxeles de fondo gris claro y 2 de cabello oscuro: gana el gris.
    const data = pixels([
      [200, 201, 202],
      [201, 200, 203],
      [199, 202, 201],
      [20, 18, 15],
      [22, 19, 16],
    ]);
    expect(dominantColor(data)).toBe('#c8c9ca');
  });

  it('fondo blanco con cabello pegado al borde sigue siendo blanco', () => {
    const data = pixels([
      [255, 255, 255],
      [254, 255, 255],
      [255, 254, 255],
      [255, 255, 254],
      [30, 25, 20],
      [31, 26, 21],
      [29, 24, 19],
    ]);
    // Los cuatro blancos caen en el mismo bin y su promedio redondea a 255.
    expect(dominantColor(data)).toBe('#ffffff');
  });

  it('ignora los píxeles transparentes', () => {
    const data = pixels([
      [0, 0, 0, 0],
      [0, 0, 0, 0],
      [0, 0, 0, 0],
      [120, 130, 140],
    ]);
    expect(dominantColor(data)).toBe('#78828c');
  });

  it('sin píxeles útiles cae al blanco por defecto', () => {
    expect(dominantColor(new Uint8ClampedArray(0))).toBe(BADGE_PHOTO_DEFAULT_FILL);
    expect(dominantColor(pixels([[1, 2, 3, 0]]))).toBe(BADGE_PHOTO_DEFAULT_FILL);
  });
});
