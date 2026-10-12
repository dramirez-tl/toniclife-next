// badge-photo.ts - Recorte de la foto del expediente a la medida de la credencial.
//
// Las fotos de la sesión fotográfica llegan apaisadas y enormes (6000 × 3494
// px, 22 MB en PNG) y el API acepta 5 MB como máximo. En vez de pedirle a RRHH
// que las edite a mano, el admin recorta en el navegador a la proporción del
// marco de la credencial y sube un JPEG chico. La foto original no se toca.
//
// La proporción y el tamaño de salida son los del marco que imprime
// toniclife-etiquetas (BADGE_LAYOUT.front.photo: 31.5 × 34.4 mm a 300 dpi =
// 372 × 406 px); se guarda al doble para que el recorte y el escalado del
// driver no se noten.

export interface CropArea {
  x: number;
  y: number;
  width: number;
  height: number;
}

/** Ancho / alto del marco de la foto en la credencial (31.5 × 34.4 mm). */
export const BADGE_PHOTO_ASPECT = 31.5 / 34.4;

/** Píxeles del JPEG resultante: 2× el marco a 300 dpi, con la misma proporción. */
export const BADGE_PHOTO_OUTPUT = { width: 744, height: 813 } as const;

export const BADGE_PHOTO_JPEG_QUALITY = 0.9;

/**
 * Hasta dónde se intenta abrir el archivo original en el navegador. No es el
 * límite del API (ese aplica al JPEG ya recortado): es para no colgar la
 * pestaña decodificando un PNG de cientos de MB.
 */
export const BADGE_PHOTO_SOURCE_MAX_MB = 60;

/** Nombre del archivo que se sube; el API lo renombra en el bucket. */
export const BADGE_PHOTO_FILE_NAME = 'foto-credencial.jpg';

/** Relleno cuando no se puede muestrear la foto (lienzo no disponible, imagen vacía). */
export const BADGE_PHOTO_DEFAULT_FILL = '#ffffff';

/**
 * Color dominante de un bloque de píxeles RGBA: se cuantiza a 16 niveles por
 * canal y se promedia el bin más frecuente. Es el fondo del estudio aunque el
 * cabello toque el borde (el cabello cae en otros bins y no mueve el color).
 * Los píxeles transparentes no cuentan. Exportada para probarla sin canvas.
 */
export function dominantColor(pixels: Uint8ClampedArray): string {
  const bins = new Map<number, { n: number; r: number; g: number; b: number }>();
  for (let i = 0; i + 3 < pixels.length; i += 4) {
    if (pixels[i + 3] < 128) continue;
    const r = pixels[i];
    const g = pixels[i + 1];
    const b = pixels[i + 2];
    const key = ((r >> 4) << 8) | ((g >> 4) << 4) | (b >> 4);
    const bin = bins.get(key) ?? { n: 0, r: 0, g: 0, b: 0 };
    bin.n += 1;
    bin.r += r;
    bin.g += g;
    bin.b += b;
    bins.set(key, bin);
  }
  let best: { n: number; r: number; g: number; b: number } | null = null;
  for (const bin of bins.values()) {
    if (!best || bin.n > best.n) best = bin;
  }
  if (!best) return BADGE_PHOTO_DEFAULT_FILL;
  const n = best.n;
  const hex = (v: number) =>
    Math.round(v / n)
      .toString(16)
      .padStart(2, '0');
  return `#${hex(best.r)}${hex(best.g)}${hex(best.b)}`;
}

/**
 * Color con el que se rellena lo que la foto no cubra: el dominante de la
 * franja superior de la foto (ahí está el fondo del estudio: blanco, gris...).
 * Se muestrea sobre una copia de 64 px de ancho para que sea instantáneo.
 */
export function edgeFillColor(bitmap: ImageBitmap): string {
  const w = 64;
  const h = Math.max(4, Math.round((bitmap.height / bitmap.width) * w));
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  if (!ctx) return BADGE_PHOTO_DEFAULT_FILL;
  ctx.drawImage(bitmap, 0, 0, w, h);
  const rows = Math.max(2, Math.round(h * 0.04));
  return dominantColor(ctx.getImageData(0, 0, w, rows).data);
}

/** El color de relleno de un archivo, para pintarlo igual en el recortador. */
export async function detectEdgeFill(file: File): Promise<string> {
  const bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' });
  try {
    return edgeFillColor(bitmap);
  } finally {
    bitmap.close();
  }
}

/**
 * Recorta `area` (en píxeles de la imagen ya orientada, como la devuelve
 * react-easy-crop) y la escala al tamaño de salida como JPEG.
 *
 * `imageOrientation: 'from-image'` aplica la rotación EXIF de las fotos de
 * celular, igual que hace el <img> del recortador: así las coordenadas del
 * área y los píxeles que se dibujan hablan de la misma imagen.
 *
 * `fill` es el color de lo que el área no cubra (ver edgeFillColor); si no
 * viene, se calcula aquí mismo de la foto.
 */
export async function cropToBadgeJpeg(file: File, area: CropArea, fill?: string): Promise<File> {
  const bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' });
  try {
    const canvas = document.createElement('canvas');
    canvas.width = BADGE_PHOTO_OUTPUT.width;
    canvas.height = BADGE_PHOTO_OUTPUT.height;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('El navegador no pudo preparar el lienzo de la foto');
    // El área puede salirse de la foto (el recortador deja bajarla para dar
    // aire a la cabeza cuando el cabello viene pegado al borde): ese margen se
    // rellena con el color del fondo de la propia foto, no con blanco fijo —
    // en una foto con fondo gris el blanco se notaba como una franja. También
    // cubre la transparencia de un PNG, que en JPEG saldría negra.
    ctx.fillStyle = fill ?? edgeFillColor(bitmap);
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    // Solo se dibuja la parte del área que sí cae dentro de la foto, en el lugar
    // que le toca del lienzo (misma geometría que vio el usuario).
    const areaW = Math.max(1, area.width);
    const areaH = Math.max(1, area.height);
    const sx = Math.max(0, area.x);
    const sy = Math.max(0, area.y);
    const sw = Math.min(bitmap.width, area.x + areaW) - sx;
    const sh = Math.min(bitmap.height, area.y + areaH) - sy;
    if (sw > 0 && sh > 0) {
      const kx = canvas.width / areaW;
      const ky = canvas.height / areaH;
      ctx.drawImage(bitmap, sx, sy, sw, sh, (sx - area.x) * kx, (sy - area.y) * ky, sw * kx, sh * ky);
    }
    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, 'image/jpeg', BADGE_PHOTO_JPEG_QUALITY),
    );
    if (!blob) throw new Error('El navegador no pudo generar el JPEG');
    return new File([blob], BADGE_PHOTO_FILE_NAME, { type: 'image/jpeg' });
  } finally {
    bitmap.close();
  }
}
