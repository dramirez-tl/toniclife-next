import { describe, expect, it } from 'vitest';
import {
  PrepareUploadError,
  UPLOAD_REENCODE_ABOVE_BYTES,
  fitInside,
  jpgName,
  prepareUploadFile,
  shouldReencode,
  uploadKindOf,
} from './prepare-upload';

const MB = 1024 * 1024;

describe('preparar un documento antes de subirlo', () => {
  it('reconoce qué es el archivo por su tipo o, si no lo trae, por la extensión', () => {
    expect(uploadKindOf('ine.jpg', 'image/jpeg')).toBe('image');
    expect(uploadKindOf('foto.HEIC', 'image/heic')).toBe('image');
    expect(uploadKindOf('whatsapp.webp', 'image/webp')).toBe('image');
    expect(uploadKindOf('constancia.pdf', 'application/pdf')).toBe('pdf');
    // Algunos selectores de Android / Drive entregan el archivo sin tipo.
    expect(uploadKindOf('IMG_20261124.JPG', '')).toBe('image');
    expect(uploadKindOf('IMG_0042.heic', '')).toBe('image');
    expect(uploadKindOf('Constancia.PDF', '')).toBe('pdf');
    expect(uploadKindOf('estado de cuenta.pdf', 'application/octet-stream')).toBe('pdf');
    expect(uploadKindOf('datos.xlsx', '')).toBe('other');
    expect(uploadKindOf('documento', 'application/msword')).toBe('other');
  });

  it('una foto ligera en JPG o PNG se sube tal cual; lo demás se convierte', () => {
    expect(shouldReencode('image/jpeg', 800 * 1024)).toBe(false);
    expect(shouldReencode('image/png', UPLOAD_REENCODE_ABOVE_BYTES)).toBe(false);
    expect(shouldReencode('image/jpeg', UPLOAD_REENCODE_ABOVE_BYTES + 1)).toBe(true);
    expect(shouldReencode('image/jpeg', 9 * MB)).toBe(true);
    expect(shouldReencode('image/webp', 200 * 1024)).toBe(true);
    expect(shouldReencode('image/heic', 200 * 1024)).toBe(true);
    expect(shouldReencode('', 200 * 1024)).toBe(true);
  });

  it('reduce al lado mayor permitido sin deformar y nunca agranda', () => {
    expect(fitInside(4000, 3000, 2400)).toEqual({ width: 2400, height: 1800 });
    expect(fitInside(3000, 4000, 2400)).toEqual({ width: 1800, height: 2400 });
    expect(fitInside(8000, 100, 2400)).toEqual({ width: 2400, height: 30 });
    expect(fitInside(1200, 800, 2400)).toEqual({ width: 1200, height: 800 });
    expect(fitInside(2400, 2400, 2400)).toEqual({ width: 2400, height: 2400 });
    expect(fitInside(0, 0, 2400)).toEqual({ width: 0, height: 0 });
  });

  it('la foto convertida se llama .jpg', () => {
    expect(jpgName('IMG_0042.HEIC')).toBe('IMG_0042.jpg');
    expect(jpgName('ine frente.webp')).toBe('ine frente.jpg');
    expect(jpgName('foto.final.png')).toBe('foto.final.jpg');
    expect(jpgName('sin-extension')).toBe('sin-extension.jpg');
    expect(jpgName('')).toBe('documento.jpg');
  });

  it('un PDF pasa igual (solo se le pone su tipo si venía vacío) y lo demás se rechaza', async () => {
    const pdf = new File(['%PDF-1.7'], 'constancia.pdf', { type: 'application/pdf' });
    expect(await prepareUploadFile(pdf)).toBe(pdf);
    const untyped = await prepareUploadFile(new File(['%PDF-1.7'], 'Constancia.PDF', { type: '' }));
    expect(untyped.type).toBe('application/pdf');
    expect(untyped.name).toBe('Constancia.PDF');
    expect(untyped.size).toBe(8);
    // Una foto ligera en JPG no se toca (ni se abre).
    const small = new File(['x'], 'ine.jpg', { type: 'image/jpeg' });
    expect(await prepareUploadFile(small)).toBe(small);
    await expect(prepareUploadFile(new File(['x'], 'datos.xlsx', { type: '' }))).rejects.toMatchObject({
      name: 'PrepareUploadError',
      code: 'unsupported',
    });
    expect(new PrepareUploadError('unreadable').code).toBe('unreadable');
  });
});
