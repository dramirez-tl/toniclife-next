// prepare-upload.ts - Deja un archivo listo para subirse como documento (INE,
// constancia, carátula bancaria…) ANTES de validarlo y mandarlo.
//
// Sistemas (Diego, 24-nov-2026): "me reportan que no pueden subir sus documentos
// los distribuidores". La mayoría lo hace desde el celular, y ahí:
//  - la foto de la cámara pesa más que el tope (5-12 MB) y se rechazaba;
//  - WhatsApp / Drive / la galería entregan WEBP o HEIC, o el archivo llega sin
//    tipo declarado, y el formulario solo aceptaba JPG, PNG o PDF "tal cual".
// Aquí una foto se reduce (lado mayor 2400 px, suficiente para leer una
// credencial) y se guarda como JPG: pesa menos de 1 MB y siempre es un formato
// que el servidor acepta. Un PDF no se toca.
//
// Las reglas (qué es cada archivo, cuándo se convierte, a qué tamaño) son puras
// y se prueban; decodificar y dibujar depende del navegador.

export type UploadKind = 'image' | 'pdf' | 'other';

/** Lado mayor de la foto ya reducida. */
export const UPLOAD_IMAGE_MAX_SIDE = 2400;
/** Un JPG/PNG de hasta este peso se sube tal cual (no pierde calidad). */
export const UPLOAD_REENCODE_ABOVE_BYTES = 2 * 1024 * 1024;
/** Peso que se busca al convertir; si no se logra, se reduce otra vez. */
export const UPLOAD_IMAGE_TARGET_BYTES = 4 * 1024 * 1024;

const IMAGE_EXTENSIONS = /\.(jpe?g|png|webp|heic|heif|gif|bmp|avif|tiff?)$/i;

/**
 * Qué es el archivo. El tipo declarado manda; si viene vacío o genérico (pasa
 * con algunos selectores de Android, Drive o WhatsApp) se decide por la extensión.
 */
export function uploadKindOf(name: string, type: string): UploadKind {
  const mime = (type || '').toLowerCase();
  if (mime === 'application/pdf') return 'pdf';
  if (mime.startsWith('image/')) return 'image';
  if (/\.pdf$/i.test(name)) return 'pdf';
  if (IMAGE_EXTENSIONS.test(name)) return 'image';
  return 'other';
}

/** ¿La foto se convierte? Sí, si no es JPG/PNG o si pesa más del umbral. */
export function shouldReencode(type: string, size: number): boolean {
  const mime = (type || '').toLowerCase();
  const direct = mime === 'image/jpeg' || mime === 'image/png';
  return !direct || size > UPLOAD_REENCODE_ABOVE_BYTES;
}

/** Medidas que caben en `maxSide` conservando la proporción (nunca agranda). */
export function fitInside(width: number, height: number, maxSide: number): { width: number; height: number } {
  const longest = Math.max(width, height);
  if (!(longest > 0)) return { width: 0, height: 0 };
  if (longest <= maxSide) return { width: Math.round(width), height: Math.round(height) };
  const scale = maxSide / longest;
  return { width: Math.max(1, Math.round(width * scale)), height: Math.max(1, Math.round(height * scale)) };
}

/** "IMG_0042.HEIC" → "IMG_0042.jpg". */
export function jpgName(name: string): string {
  const base = (name || '').replace(/\.[A-Za-z0-9]{1,5}$/, '').trim();
  return `${base || 'documento'}.jpg`;
}

/**
 * unreadable = el navegador no pudo abrir la foto (típico: HEIC en Android o en
 * computadora) · unsupported = no es foto ni PDF.
 */
export class PrepareUploadError extends Error {
  code: 'unreadable' | 'unsupported';

  constructor(code: 'unreadable' | 'unsupported') {
    super(code);
    this.name = 'PrepareUploadError';
    this.code = code;
  }
}

interface Decoded {
  width: number;
  height: number;
  source: CanvasImageSource;
  release: () => void;
}

async function decodeImage(file: File): Promise<Decoded> {
  if (typeof createImageBitmap === 'function') {
    try {
      // 'from-image' respeta la orientación con la que se tomó la foto.
      const bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' });
      return { width: bitmap.width, height: bitmap.height, source: bitmap, release: () => bitmap.close() };
    } catch {
      // Se intenta con <img>: Safari abre HEIC por esa vía.
    }
  }
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const el = new Image();
      el.onload = () => resolve(el);
      el.onerror = () => reject(new Error('decode'));
      el.src = url;
    });
    return {
      width: img.naturalWidth,
      height: img.naturalHeight,
      source: img,
      release: () => URL.revokeObjectURL(url),
    };
  } catch {
    URL.revokeObjectURL(url);
    throw new PrepareUploadError('unreadable');
  }
}

function toJpeg(decoded: Decoded, maxSide: number, quality: number): Promise<Blob> {
  const { width, height } = fitInside(decoded.width, decoded.height, maxSide);
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx || width === 0 || height === 0) throw new PrepareUploadError('unreadable');
  // Fondo blanco: un PNG con transparencia no debe quedar negro.
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, width, height);
  ctx.drawImage(decoded.source, 0, 0, width, height);
  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new PrepareUploadError('unreadable'))), 'image/jpeg', quality);
  });
}

/**
 * Deja el archivo listo: una foto pesada o en un formato que el servidor no
 * recibe se reduce y se guarda como JPG; un JPG/PNG ligero y un PDF pasan igual
 * (al PDF solo se le pone su tipo si venía vacío). Lanza PrepareUploadError si
 * no es foto ni PDF, o si el navegador no pudo abrir la foto.
 */
export async function prepareUploadFile(file: File): Promise<File> {
  const kind = uploadKindOf(file.name, file.type);
  if (kind === 'other') throw new PrepareUploadError('unsupported');
  if (kind === 'pdf') {
    return file.type === 'application/pdf' ? file : new File([file], file.name, { type: 'application/pdf' });
  }
  if (!shouldReencode(file.type, file.size)) return file;

  const decoded = await decodeImage(file);
  try {
    let blob = await toJpeg(decoded, UPLOAD_IMAGE_MAX_SIDE, 0.85);
    if (blob.size > UPLOAD_IMAGE_TARGET_BYTES) blob = await toJpeg(decoded, 1800, 0.75);
    return new File([blob], jpgName(file.name), { type: 'image/jpeg', lastModified: file.lastModified });
  } finally {
    decoded.release();
  }
}
