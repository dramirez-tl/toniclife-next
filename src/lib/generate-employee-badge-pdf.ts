// generate-employee-badge-pdf.ts - Gafete del colaborador en PDF (tarjeta CR80).
//
// Receta copiada de generate-pos-ticket.ts: página en milímetros a medida,
// import dinámico de jspdf (para no inflar el bundle), logo en base64 con
// addImage y código de barras CODE128 generado con JsBarcode sobre un canvas
// fuera de pantalla.
//
// El código que se imprime es el GAFETE (employees.badge_code), NO el número
// del checador: así se puede reponer un gafete extraviado sin cambiar el
// número con el que la persona checa ni su número de nómina.
//
// Medidas: CR80 (tarjeta de crédito) 85.6 x 54 mm horizontal. Página 1 =
// frente, página 2 = reverso con el aviso de propiedad.

import { saveBlob } from '@/lib/download';

// ================================
// Constantes
// ================================

const PAGE_W = 85.6; // mm
const PAGE_H = 54; // mm
const MARGIN = 5;
/** Azul de marca (#3E667D) en RGB: jsPDF acepta hex, pero RGB no depende de versión. */
const BRAND_RGB: [number, number, number] = [62, 102, 125];
const FONT_BODY = 'helvetica';
const FONT_MONO = 'courier';

const PHOTO_X = MARGIN;
const PHOTO_Y = 14;
const PHOTO_W = 22;
const PHOTO_H = 27;

const INFO_X = PHOTO_X + PHOTO_W + 4;
const INFO_W = PAGE_W - INFO_X - MARGIN;

export interface EmployeeBadgeData {
  fullName: string;
  /** Número con el que la persona checa (employees.employee_number). */
  employeeNumber: string;
  /** Código del gafete (employees.badge_code); es el que va en el CODE128. */
  badgeCode: string;
  jobPositionName?: string | null;
  branchName?: string | null;
  departmentName?: string | null;
  /** URL firmada de la foto; si falla la descarga se dibuja una silueta. */
  photoUrl?: string | null;
}

// ================================
// Ayudas
// ================================

/**
 * Baja la foto (URL firmada de GCS) y la vuelve un data URL JPEG recortado al
 * marco del gafete. Se pasa por un blob URL para que el canvas NO quede
 * "tainted" y `toDataURL` pueda leerlo. Si algo falla (CORS, URL vencida)
 * devuelve null y el gafete sale con la silueta.
 */
async function fetchPhotoDataUrl(url: string): Promise<string | null> {
  if (typeof document === 'undefined') return null;
  let objectUrl: string | null = null;
  try {
    const response = await fetch(url, { mode: 'cors', credentials: 'omit' });
    if (!response.ok) return null;
    const blob = await response.blob();
    objectUrl = URL.createObjectURL(blob);

    const image = await new Promise<HTMLImageElement | null>((resolve) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => resolve(null);
      img.src = objectUrl as string;
    });
    if (!image) return null;

    // Recorte centrado a la proporción del marco (evita caras estiradas).
    const targetRatio = PHOTO_W / PHOTO_H;
    const sourceRatio = image.width / image.height;
    let sx = 0;
    let sy = 0;
    let sw = image.width;
    let sh = image.height;
    if (sourceRatio > targetRatio) {
      sw = Math.round(image.height * targetRatio);
      sx = Math.round((image.width - sw) / 2);
    } else {
      sh = Math.round(image.width / targetRatio);
      sy = Math.round((image.height - sh) / 2);
    }

    const canvas = document.createElement('canvas');
    canvas.width = 330; // ~300 dpi para 22 mm
    canvas.height = Math.round((330 * PHOTO_H) / PHOTO_W);
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(image, sx, sy, sw, sh, 0, 0, canvas.width, canvas.height);
    return canvas.toDataURL('image/jpeg', 0.92);
  } catch {
    return null;
  } finally {
    if (objectUrl) URL.revokeObjectURL(objectUrl);
  }
}

/** Código de barras CODE128 como data URL (canvas fuera de pantalla). */
async function generateBarcodeDataUrl(text: string): Promise<string | null> {
  if (typeof document === 'undefined') return null;
  try {
    const JsBarcode = (await import('jsbarcode')).default;
    const canvas = document.createElement('canvas');
    JsBarcode(canvas, text, {
      format: 'CODE128',
      width: 2,
      height: 60,
      displayValue: false,
      margin: 0,
      background: '#ffffff',
      lineColor: '#000000',
    });
    return canvas.toDataURL('image/png');
  } catch {
    return null;
  }
}

/** Silueta de respaldo cuando no hay foto (o no se pudo descargar). */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function drawSilhouette(doc: any): void {
  doc.setFillColor(232, 236, 240);
  doc.rect(PHOTO_X, PHOTO_Y, PHOTO_W, PHOTO_H, 'F');
  doc.setFillColor(180, 190, 200);
  // Cabeza y hombros.
  doc.circle(PHOTO_X + PHOTO_W / 2, PHOTO_Y + PHOTO_H * 0.35, 4.2, 'F');
  doc.ellipse(PHOTO_X + PHOTO_W / 2, PHOTO_Y + PHOTO_H * 0.92, 7.5, 5.5, 'F');
  doc.setDrawColor(200, 206, 212);
  doc.rect(PHOTO_X, PHOTO_Y, PHOTO_W, PHOTO_H, 'S');
}

// ================================
// Generador
// ================================

/**
 * Arma el PDF del gafete y devuelve el Blob. `badgeCode` es obligatorio: sin
 * código no hay gafete que imprimir (la pantalla deshabilita el botón).
 */
export async function generateEmployeeBadgePdf(data: EmployeeBadgeData): Promise<Blob> {
  const { jsPDF: JsPDF } = await import('jspdf');

  let logoBase64: string | null = null;
  try {
    const logoModule = await import('./logo-base64');
    logoBase64 = logoModule.LOGO_BASE64;
  } catch {
    // sin logo: el gafete sale igual
  }

  const [photoDataUrl, barcodeDataUrl] = await Promise.all([
    data.photoUrl ? fetchPhotoDataUrl(data.photoUrl) : Promise.resolve(null),
    generateBarcodeDataUrl(data.badgeCode),
  ]);

  const doc = new JsPDF({
    orientation: 'landscape',
    unit: 'mm',
    format: [PAGE_W, PAGE_H],
  });

  // ---------- Frente ----------
  doc.setFillColor(255, 255, 255);
  doc.rect(0, 0, PAGE_W, PAGE_H, 'F');

  // Logo arriba a la izquierda + regla de marca.
  if (logoBase64) {
    try {
      doc.addImage(logoBase64, 'PNG', MARGIN, 4, 26, 5.5);
    } catch {
      // logo inválido: se omite
    }
  }
  doc.setDrawColor(BRAND_RGB[0], BRAND_RGB[1], BRAND_RGB[2]);
  doc.setLineWidth(0.6);
  doc.line(MARGIN, 11.5, PAGE_W - MARGIN, 11.5);

  // Foto (o silueta).
  if (photoDataUrl) {
    try {
      doc.addImage(photoDataUrl, 'JPEG', PHOTO_X, PHOTO_Y, PHOTO_W, PHOTO_H);
      doc.setDrawColor(200, 206, 212);
      doc.setLineWidth(0.3);
      doc.rect(PHOTO_X, PHOTO_Y, PHOTO_W, PHOTO_H, 'S');
    } catch {
      drawSilhouette(doc);
    }
  } else {
    drawSilhouette(doc);
  }

  // Datos del colaborador.
  let y = PHOTO_Y + 3;
  doc.setTextColor(30, 41, 51);
  doc.setFont(FONT_BODY, 'bold');
  doc.setFontSize(11);
  const nameLines = doc.splitTextToSize(data.fullName || 'Sin nombre', INFO_W).slice(0, 2);
  for (const line of nameLines) {
    doc.text(line, INFO_X, y);
    y += 4.6;
  }

  doc.setFont(FONT_BODY, 'normal');
  doc.setFontSize(8);
  doc.setTextColor(90, 100, 110);
  if (data.jobPositionName) {
    const puesto = doc.splitTextToSize(data.jobPositionName, INFO_W).slice(0, 1);
    doc.text(puesto, INFO_X, y);
    y += 3.6;
  }
  const lugar = [data.branchName, data.departmentName].filter(Boolean).join(' · ');
  if (lugar) {
    const lugarLines = doc.splitTextToSize(lugar, INFO_W).slice(0, 1);
    doc.text(lugarLines, INFO_X, y);
    y += 3.6;
  }

  doc.setFont(FONT_MONO, 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(30, 41, 51);
  doc.text(`No. ${data.employeeNumber}`, INFO_X, Math.min(y + 1, PHOTO_Y + 17));

  // Código de barras del GAFETE, abajo a la derecha.
  const barcodeW = INFO_W;
  const barcodeH = 8;
  const barcodeY = PAGE_H - MARGIN - barcodeH - 3.4;
  if (barcodeDataUrl) {
    try {
      doc.addImage(barcodeDataUrl, 'PNG', INFO_X, barcodeY, barcodeW, barcodeH);
    } catch {
      // sin barras: queda el texto del código
    }
  }
  doc.setFont(FONT_MONO, 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(30, 41, 51);
  const codeW = doc.getTextWidth(data.badgeCode);
  doc.text(data.badgeCode, INFO_X + (barcodeW - codeW) / 2, PAGE_H - MARGIN - 0.5);

  // ---------- Reverso ----------
  doc.addPage([PAGE_W, PAGE_H], 'landscape');
  doc.setFillColor(255, 255, 255);
  doc.rect(0, 0, PAGE_W, PAGE_H, 'F');
  if (logoBase64) {
    try {
      doc.addImage(logoBase64, 'PNG', (PAGE_W - 30) / 2, 8, 30, 6.4);
    } catch {
      // sin logo
    }
  }
  doc.setFont(FONT_BODY, 'bold');
  doc.setFontSize(9);
  doc.setTextColor(30, 41, 51);
  const titulo = 'Propiedad de Tonic Life';
  doc.text(titulo, (PAGE_W - doc.getTextWidth(titulo)) / 2, 21);

  doc.setFont(FONT_BODY, 'normal');
  doc.setFontSize(7);
  doc.setTextColor(90, 100, 110);
  const aviso =
    'Este gafete es personal e intransferible. Si lo encuentras, favor de ' +
    'devolverlo en la sucursal Tonic Life mas cercana o al corporativo: ' +
    'Bosques de Duraznos No. 65, Bosques de las Lomas, CDMX.';
  const avisoLines = doc.splitTextToSize(aviso, PAGE_W - MARGIN * 2);
  let backY = 26;
  for (const line of avisoLines) {
    doc.text(line, (PAGE_W - doc.getTextWidth(line)) / 2, backY);
    backY += 3.2;
  }

  doc.setFont(FONT_MONO, 'normal');
  doc.setFontSize(7);
  doc.setTextColor(30, 41, 51);
  const pie = `${data.badgeCode}  ·  No. ${data.employeeNumber}`;
  doc.text(pie, (PAGE_W - doc.getTextWidth(pie)) / 2, PAGE_H - MARGIN);

  return doc.output('blob') as Blob;
}

/** Arma el gafete y lo descarga como archivo. */
export async function downloadEmployeeBadgePdf(data: EmployeeBadgeData): Promise<void> {
  const blob = await generateEmployeeBadgePdf(data);
  const safeNumber = (data.employeeNumber || data.badgeCode).replace(/[^A-Za-z0-9_-]/g, '');
  saveBlob(blob, `gafete-${safeNumber}.pdf`, 'application/pdf');
}
