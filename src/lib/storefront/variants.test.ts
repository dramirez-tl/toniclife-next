import { describe, expect, it } from 'vitest';
import type { StorefrontVariantOption } from './types';
import { axisChips, axisKey, distinctAxisValues, genderLabelFor, pickVariantFor, sizeRank } from './variants';

type Attrs = Partial<Pick<StorefrontVariantOption, 'gender' | 'color' | 'colorHex' | 'size' | 'availability' | 'sizeLabel' | 'genderLabel'>>;

/** Opción completa con valores por omisión (las pruebas solo dicen lo que importa). */
function opt(id: string, attrs: Attrs = {}): StorefrontVariantOption {
  const gender = attrs.gender ?? null;
  const size = attrs.size ?? null;
  return {
    id,
    slug: `${id}-playera`,
    code: id.toUpperCase(),
    gender,
    color: attrs.color ?? null,
    colorHex: attrs.colorHex ?? null,
    size,
    sizeLabel: attrs.sizeLabel ?? size ?? '',
    genderLabel: attrs.genderLabel ?? (gender === 'mujer' ? 'Mujer' : gender === 'hombre' ? 'Hombre' : gender === 'unisex' ? 'Unisex' : ''),
    imageUrl: null,
    availability: attrs.availability ?? 'in_stock',
    price: 350,
  };
}

// Playera negra: mujer CH/M/G, hombre M/G/XL (sin CH); además rosa mujer M.
const negraMujerCH = opt('nm-ch', { gender: 'mujer', color: 'Negra', colorHex: '#000000', size: 'CH' });
const negraMujerM = opt('nm-m', { gender: 'mujer', color: 'Negra', colorHex: '#000000', size: 'M' });
const negraMujerG = opt('nm-g', { gender: 'mujer', color: 'Negra', colorHex: '#000000', size: 'G', availability: 'out_of_stock' });
const negraHombreM = opt('nh-m', { gender: 'hombre', color: 'Negra', colorHex: '#000000', size: 'M' });
const negraHombreG = opt('nh-g', { gender: 'hombre', color: 'Negra', colorHex: '#000000', size: 'G' });
const negraHombreXL = opt('nh-xl', { gender: 'hombre', color: 'Negra', colorHex: '#000000', size: 'XL' });
const rosaMujerM = opt('rm-m', { gender: 'mujer', color: 'Rosa pastel', colorHex: '#F8C8DC', size: 'M' });
const options = [negraMujerCH, negraMujerM, negraMujerG, negraHombreM, negraHombreG, negraHombreXL, rosaMujerM];

const current = (option: StorefrontVariantOption) => ({ id: option.id, gender: option.gender, color: option.color, size: option.size });

describe('axisKey / sizeRank', () => {
  it('talla en mayúsculas sin espacios; color y género sin mayúsculas', () => {
    expect(axisKey('size', ' ch ')).toBe('CH');
    expect(axisKey('size', 'x l')).toBe('XL');
    expect(axisKey('color', '  Rosa   Pastel ')).toBe('rosa pastel');
    expect(axisKey('gender', 'Mujer')).toBe('mujer');
    expect(axisKey('color', '')).toBeNull();
    expect(axisKey('size', null)).toBeNull();
  });

  it('orden canónico, numéricas después y desconocidas al final', () => {
    expect(sizeRank('CH')).toBeLessThan(sizeRank('M'));
    expect(sizeRank('M')).toBeLessThan(sizeRank('XL'));
    expect(sizeRank('XL')).toBeLessThan(sizeRank('28'));
    expect(sizeRank('28')).toBeLessThan(sizeRank('30'));
    expect(sizeRank('30')).toBeLessThan(sizeRank('UNICA'));
    expect(sizeRank(null)).toBeGreaterThan(sizeRank('UNICA'));
  });

  it('etiqueta de respaldo del género por idioma', () => {
    expect(genderLabelFor('mujer', 'es')).toBe('Mujer');
    expect(genderLabelFor('hombre', 'en')).toBe('Men');
    expect(genderLabelFor('otro', 'es')).toBe('otro');
    expect(genderLabelFor(null, 'en')).toBe('');
  });
});

describe('distinctAxisValues', () => {
  it('valores distintos en orden de aparición, sin repetir por mayúsculas', () => {
    expect(distinctAxisValues(options, 'gender')).toEqual(['mujer', 'hombre']);
    expect(distinctAxisValues(options, 'size')).toEqual(['CH', 'M', 'G', 'XL']);
    expect(distinctAxisValues([...options, opt('x', { color: 'negra' })], 'color')).toEqual(['Negra', 'Rosa pastel']);
  });

  it('ignora las opciones sin valor en el eje', () => {
    expect(distinctAxisValues([opt('a', { size: 'M' }), opt('b')], 'color')).toEqual([]);
  });
});

describe('pickVariantFor', () => {
  it('cambiar talla conserva color y género', () => {
    expect(pickVariantFor(options, current(negraMujerCH), 'size', 'M')).toBe(negraMujerM);
    expect(pickVariantFor(options, current(negraHombreXL), 'size', 'G')).toBe(negraHombreG);
  });

  it('la combinación exacta gana aunque esté agotada (tiene página)', () => {
    expect(pickVariantFor(options, current(negraMujerCH), 'size', 'G')).toBe(negraMujerG);
  });

  it('cambiar género cae a la talla más parecida cuando no existe la misma', () => {
    // Mujer CH → Hombre: no hay CH; la más cercana es M (no XL).
    expect(pickVariantFor(options, current(negraMujerCH), 'gender', 'hombre')).toBe(negraHombreM);
    // Hombre XL → Mujer: no hay XL; G está agotada, así que se prefiere M (no agotada).
    expect(pickVariantFor(options, current(negraHombreXL), 'gender', 'mujer')).toBe(negraMujerM);
  });

  it('cambiar color prioriza conservar el género sobre la talla', () => {
    // Rosa solo existe en mujer M: desde hombre G se va a rosa mujer M (única opción).
    expect(pickVariantFor(options, current(negraHombreG), 'color', 'Rosa pastel')).toBe(rosaMujerM);
    // Desde rosa mujer M a negra: conserva mujer y M (combinación exacta).
    expect(pickVariantFor(options, current(rosaMujerM), 'color', 'negra')).toBe(negraMujerM);
    // Azul en hombre M (mismo género) y en mujer G (misma talla): gana el género.
    const azulHombreM = opt('ah-m', { gender: 'hombre', color: 'Azul', size: 'M' });
    const azulMujerG = opt('am-g', { gender: 'mujer', color: 'Azul', size: 'G' });
    expect(pickVariantFor([...options, azulMujerG, azulHombreM], current(negraHombreG), 'color', 'Azul')).toBe(azulHombreM);
  });

  it('cambiar género prioriza conservar el color sobre la talla', () => {
    // Desde rosa mujer M a hombre: no hay rosa hombre; entre las negras de hombre, M (misma talla).
    expect(pickVariantFor(options, current(rosaMujerM), 'gender', 'hombre')).toBe(negraHombreM);
    // Con rosa hombre G disponible gana el color aunque cambie la talla.
    const rosaHombreG = opt('rh-g', { gender: 'hombre', color: 'Rosa pastel', size: 'G' });
    expect(pickVariantFor([...options, rosaHombreG], current(rosaMujerM), 'gender', 'hombre')).toBe(rosaHombreG);
  });

  it('prefiere la no agotada a igual coincidencia', () => {
    const agotadaA = opt('a', { gender: 'unisex', color: 'Azul', size: 'M', availability: 'out_of_stock' });
    const disponibleB = opt('b', { gender: 'unisex', color: 'Azul', size: 'G' });
    const actual = opt('c', { gender: 'unisex', color: 'Rojo', size: 'XL' });
    expect(pickVariantFor([agotadaA, disponibleB, actual], current(actual), 'color', 'Azul')).toBe(disponibleB);
  });

  it('misma opción o valor inexistente => null (no se navega)', () => {
    expect(pickVariantFor(options, current(negraMujerM), 'size', 'M')).toBeNull();
    expect(pickVariantFor(options, current(negraMujerM), 'size', 'XXXL')).toBeNull();
    expect(pickVariantFor(options, current(negraMujerM), 'color', '')).toBeNull();
  });

  it('la combinación actual puede no venir entre las opciones (igual se resuelve)', () => {
    const actual = { id: 'otra', gender: 'mujer', color: 'Negra', size: 'XXL' };
    expect(pickVariantFor(options, actual, 'gender', 'hombre')).toBe(negraHombreXL);
  });
});

describe('axisChips', () => {
  it('tallas: la actual seleccionada sin destino; las demás con destino; agotada marcada', () => {
    const chips = axisChips(options, current(negraMujerCH), 'size', 'es');
    expect(chips.map((chip) => chip.label)).toEqual(['CH', 'M', 'G', 'XL']);
    expect(chips[0]).toMatchObject({ selected: true, target: null, soldOut: false });
    expect(chips[1]).toMatchObject({ selected: false, target: negraMujerM, soldOut: false });
    expect(chips[2]).toMatchObject({ selected: false, target: negraMujerG, soldOut: true });
    // XL solo existe en hombre: el chip lleva a hombre XL (se avisa con el cambio de género al llegar).
    expect(chips[3]).toMatchObject({ selected: false, target: negraHombreXL, soldOut: false });
  });

  it('colores: muestra con el primer hex del color; género con etiqueta del API o de respaldo', () => {
    const colors = axisChips(options, current(negraMujerM), 'color', 'es');
    expect(colors.map((chip) => [chip.label, chip.colorHex, chip.selected])).toEqual([
      ['Negra', '#000000', true],
      ['Rosa pastel', '#F8C8DC', false],
    ]);
    const sinEtiqueta = [opt('a', { gender: 'mujer', genderLabel: '', size: 'M' }), opt('b', { gender: 'hombre', genderLabel: '', size: 'M' })];
    expect(axisChips(sinEtiqueta, current(sinEtiqueta[0]), 'gender', 'en').map((chip) => chip.label)).toEqual(['Women', 'Men']);
  });

  it('seleccionado y agotado: usa la existencia de la opción actual (o la del producto si no viene)', () => {
    expect(axisChips(options, current(negraMujerG), 'size', 'es')[2]).toMatchObject({ selected: true, soldOut: true });
    const ajena = { id: 'otra', gender: 'mujer', color: 'Negra', size: 'XXL' };
    const chips = axisChips([...options, opt('x', { gender: 'mujer', color: 'Negra', size: 'XXL' })], ajena, 'size', 'es', 'out_of_stock');
    expect(chips.find((chip) => chip.value === 'XXL')).toMatchObject({ selected: true, soldOut: true, target: null });
  });
});
