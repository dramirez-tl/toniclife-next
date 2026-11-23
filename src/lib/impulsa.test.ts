import { describe, expect, it } from 'vitest';
import type { ImpulsaMessagePart } from '@/types/impulsa';
import {
  IMPULSA_LEVELS,
  boxClickDelta,
  counterBoxes,
  daysAgoLabel,
  formatDateOnly,
  formatPhone,
  messageText,
  phoneDigits,
  routePercent,
  telUrl,
  victoryDaysLabel,
  victoryFromLevel,
  victoryFromMaterialCategory,
  victoryLevelLabel,
  victoryMaterialCategory,
  victoryOptionLabel,
  whatsappUrl,
} from './impulsa';

describe('IMPULSA: los niveles se manejan por Victorias', () => {
  it('el nivel de un curso es la Victoria (v1 … v6)', () => {
    expect([...IMPULSA_LEVELS]).toEqual(['v1', 'v2', 'v3', 'v4', 'v5', 'v6']);
    expect(victoryFromLevel('v1')).toBe(1);
    expect(victoryFromLevel(' V6 ')).toBe(6);
    expect(victoryFromLevel('v7')).toBeNull();
    expect(victoryFromLevel('intermedio')).toBeNull();
    expect(victoryFromLevel(null)).toBeNull();
    expect(victoryLevelLabel('v3')).toBe('V3');
    expect(victoryLevelLabel('avanzado')).toBeNull();
    expect(victoryOptionLabel(1)).toBe('V1 · Ya pertenezco a Tonic Life');
    expect(victoryOptionLabel(6)).toBe('V6 · Soy un constructor de organizaciones');
  });

  it('las guías de una Victoria van en su categoría de Materiales', () => {
    expect(victoryMaterialCategory(1)).toBe('impulsa_v1');
    expect(victoryFromMaterialCategory('impulsa_v4')).toBe(4);
    expect(victoryFromMaterialCategory('guias')).toBeNull();
    expect(victoryFromMaterialCategory('impulsa_v9')).toBeNull();
  });

  it('los días de una Victoria y el avance por calendario en los 90 días', () => {
    expect(victoryDaysLabel({ dayFrom: 0, dayTo: 7 })).toBe('Días 0 a 7');
    expect(victoryDaysLabel({ dayFrom: 61, dayTo: 90 })).toBe('Días 61 a 90');
    expect(victoryDaysLabel({ dayFrom: 5, dayTo: 5 })).toBe('Día 5');
    expect(routePercent(0)).toBe(0);
    expect(routePercent(45)).toBe(50);
    expect(routePercent(90)).toBe(100);
    expect(routePercent(200)).toBe(100);
    expect(routePercent(-3)).toBe(0);
  });
});

describe('IMPULSA: renglones diarios de la Tarjeta de Ruta', () => {
  it('marca las primeras casillas y avisa de lo que pasa de las 10', () => {
    expect(counterBoxes(0, 10)).toEqual({ boxes: Array(10).fill(false), extra: 0 });
    const three = counterBoxes(3, 10);
    expect(three.boxes.filter(Boolean)).toHaveLength(3);
    expect(three.boxes.slice(0, 4)).toEqual([true, true, true, false]);
    expect(counterBoxes(10, 10)).toEqual({ boxes: Array(10).fill(true), extra: 0 });
    expect(counterBoxes(13, 10)).toEqual({ boxes: Array(10).fill(true), extra: 3 });
    expect(counterBoxes(-2, 10).boxes.some(Boolean)).toBe(false);
    expect(counterBoxes(Number.NaN, 4)).toEqual({ boxes: [false, false, false, false], extra: 0 });
  });

  it('una casilla vacía suma una; una marcada quita una', () => {
    expect(boxClickDelta(0, 0)).toBe(1);
    expect(boxClickDelta(5, 3)).toBe(1);
    expect(boxClickDelta(2, 3)).toBe(-1);
    expect(boxClickDelta(0, 3)).toBe(-1);
  });
});

describe('IMPULSA: teléfono y WhatsApp', () => {
  it('arma el enlace con el código del país y el mensaje ya puesto', () => {
    expect(whatsappUrl('462 555 0101', '52', '¡Hola, Ana! ¿Cómo vas?')).toBe(
      'https://wa.me/524625550101?text=%C2%A1Hola%2C%20Ana!%20%C2%BFC%C3%B3mo%20vas%3F',
    );
    // Sin código de país se asume México; con otro país se respeta.
    expect(whatsappUrl('4625550101', null, 'x')).toBe('https://wa.me/524625550101?text=x');
    expect(whatsappUrl('9182809717', '+1', 'x')).toBe('https://wa.me/19182809717?text=x');
    // Un número que ya trae su código no se le pone otro.
    expect(whatsappUrl('+52 462 555 0101', '52', 'x')).toBe('https://wa.me/524625550101?text=x');
    expect(whatsappUrl('12345', '52', 'x')).toBeNull();
    expect(whatsappUrl(null, '52', 'x')).toBeNull();
  });

  it('formatea y marca', () => {
    expect(phoneDigits('(462) 555-0101')).toBe('4625550101');
    expect(formatPhone('4625550101')).toBe('462 555 0101');
    expect(formatPhone('+1 918 280 9717')).toBe('+1 918 280 9717');
    expect(formatPhone(null)).toBe('');
    expect(telUrl('462 555 0101')).toBe('tel:4625550101');
    expect(telUrl('123')).toBeNull();
  });
});

describe('IMPULSA: texto de un mensaje', () => {
  const parts: ImpulsaMessagePart[] = [
    { type: 'text', text: 'Hola, Ana. ▶ ' },
    { type: 'field', field: 'enlace del video' },
    { type: 'text', text: ' Tu guía: ' },
    { type: 'field', field: 'enlace de la guía' },
    { type: 'text', text: '. Nos vemos a las ' },
    { type: 'field', field: 'hora' },
    { type: 'text', text: '.' },
  ];

  it('pone los enlaces que se le dan y deja entre corchetes lo que falta', () => {
    expect(messageText(parts)).toBe('Hola, Ana. ▶ [enlace del video] Tu guía: [enlace de la guía]. Nos vemos a las [hora].');
    expect(messageText(parts, { video: 'https://t.l/v', guide: 'https://t.l/g' })).toBe(
      'Hola, Ana. ▶ https://t.l/v Tu guía: https://t.l/g. Nos vemos a las [hora].',
    );
    expect(messageText(parts, { video: null })).toContain('[enlace del video]');
    expect(messageText([])).toBe('');
  });
});

describe('IMPULSA: fechas', () => {
  it('hace cuánto y en formato de día/mes/año', () => {
    expect(daysAgoLabel('2026-12-05', '2026-12-05')).toBe('hoy');
    expect(daysAgoLabel('2026-12-04T23:00:00.000Z', '2026-12-05')).toBe('ayer');
    expect(daysAgoLabel('2026-12-01', '2026-12-05')).toBe('hace 4 días');
    expect(daysAgoLabel('2026-12-06', '2026-12-05')).toBe('hoy');
    expect(daysAgoLabel(null, '2026-12-05')).toBe('');
    expect(formatDateOnly('2026-12-05')).toBe('05/12/2026');
    expect(formatDateOnly(null)).toBe('—');
  });
});
