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

/** Nombre del archivo que se sube; el API lo renombra en GCS. */
export const BADGE_PHOTO_FILE_NAME = 'foto-credencial.jpg';

/**
 * Recorta `area` (en píxeles de la imagen ya orientada, como la devuelve
 * react-easy-crop) y la escala al tamaño de salida como JPEG.
 *
 * `imageOrientation: 'from-image'` aplica la rotación EXIF de las fotos de
 * celular, igual que hace el <img> del recortador: así las coordenadas del
 * área y los píxeles que se dibujan hablan de la misma imagen.
 */
export async function cropToBadgeJpeg(file: File, area: CropArea): Promise<File> {
  const bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' });
  try {
    const canvas = document.createElement('canvas');
    canvas.width = BADGE_PHOTO_OUTPUT.width;
    canvas.height = BADGE_PHOTO_OUTPUT.height;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('El navegador no pudo preparar el lienzo de la foto');
    // Fondo blanco: un PNG con transparencia saldría negro en JPEG.
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(
      bitmap,
      Math.max(0, area.x),
      Math.max(0, area.y),
      Math.max(1, area.width),
      Math.max(1, area.height),
      0,
      0,
      canvas.width,
      canvas.height,
    );
    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, 'image/jpeg', BADGE_PHOTO_JPEG_QUALITY),
    );
    if (!blob) throw new Error('El navegador no pudo generar el JPEG');
    return new File([blob], BADGE_PHOTO_FILE_NAME, { type: 'image/jpeg' });
  } finally {
    bitmap.close();
  }
}
