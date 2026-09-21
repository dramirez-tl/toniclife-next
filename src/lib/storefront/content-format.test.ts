import { describe, expect, it } from 'vitest';
import { formatProductName, hasText, productInitials, toBlocks, toBulletItems } from './content-format';

describe('toBlocks', () => {
  it('devuelve vacío sin texto', () => {
    expect(toBlocks(null)).toEqual([]);
    expect(toBlocks('   \n \n')).toEqual([]);
  });

  it('separa párrafos por línea en blanco y conserva saltos simples', () => {
    expect(toBlocks('Uno\nDos\r\n\r\nTres')).toEqual([
      { type: 'paragraph', text: 'Uno\nDos' },
      { type: 'paragraph', text: 'Tres' },
    ]);
  });

  it('agrupa viñetas con distintos prefijos', () => {
    expect(toBlocks('Intro:\n- a\n* b\n• c\n1. d\nCierre')).toEqual([
      { type: 'paragraph', text: 'Intro:' },
      { type: 'list', items: ['a', 'b', 'c', 'd'] },
      { type: 'paragraph', text: 'Cierre' },
    ]);
  });

  it('las etiquetas quedan como texto (nunca HTML)', () => {
    expect(toBlocks('<script>alert(1)</script>')).toEqual([
      { type: 'paragraph', text: '<script>alert(1)</script>' },
    ]);
  });

  it('quita caracteres de control y colapsa espacios', () => {
    expect(toBlocks('a\u0000b\t\tc')).toEqual([{ type: 'paragraph', text: 'a b c' }]);
  });
});

describe('toBulletItems / hasText', () => {
  it('limpia vacías y prefijos', () => {
    expect(toBulletItems(['- Uno', ' ', '• Dos', 'Tres'])).toEqual(['Uno', 'Dos', 'Tres']);
    expect(toBulletItems(null)).toEqual([]);
  });

  it('hasText', () => {
    expect(hasText('  ')).toBe(false);
    expect(hasText(null)).toBe(false);
    expect(hasText('x')).toBe(true);
  });
});

describe('formatProductName', () => {
  it('pasa a formato título lo que viene en mayúsculas', () => {
    expect(formatProductName('CREMA CORPORAL SPECTRA 500ML')).toBe('Crema Corporal Spectra 500ml');
    expect(formatProductName('TÉ DE LIMÓN Y MIEL')).toBe('Té de Limón y Miel');
    expect(formatProductName('  COLÁGENO   B12 TL ')).toBe('Colágeno B12 TL');
    expect(formatProductName('ÑAME-ÁCIDO / PLUS')).toBe('Ñame-Ácido / Plus');
    expect(formatProductName('DE LA ROSA (EDICIÓN)')).toBe('De la Rosa (Edición)');
  });

  it('respeta nombres ya capturados con minúsculas', () => {
    expect(formatProductName('Crema Spectra pH balance')).toBe('Crema Spectra pH balance');
  });

  it('vacío y sin letras', () => {
    expect(formatProductName(null)).toBe('');
    expect(formatProductName('3025')).toBe('3025');
  });

  it('es idempotente', () => {
    const once = formatProductName('ACEITE DE COCO 250ML');
    expect(once).toBe('Aceite de Coco 250ml');
    expect(formatProductName(once)).toBe(once);
  });
});

describe('productInitials', () => {
  it('dos palabras, una palabra y vacío', () => {
    expect(productInitials('Crema Spectra')).toBe('CS');
    expect(productInitials('ámbar')).toBe('ÁM');
    expect(productInitials('')).toBe('TL');
    expect(productInitials('(Nuevo) Té')).toBe('NT');
  });
});
