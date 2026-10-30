// product-families.test.ts - orden de tallas (igual al API), claves de columna,
// selector de talla de la ficha y validación/normalización de los formularios
// de familia y de guía de tallas (mig 178).

import { describe, expect, it } from 'vitest';
import {
  DEFAULT_GUIDE_COLUMNS,
  EMPTY_FAMILY_FORM,
  OTHER_SIZE_OPTION,
  SIZE_GUIDE_MAX_COLUMNS,
  SIZE_GUIDE_MAX_ROWS,
  SIZE_PRESETS,
  VARIANT_SIZE_ORDER,
  addColumn,
  addSizeRow,
  compareSizes,
  familyFormFromDto,
  genderLabels,
  guideHasMeasures,
  isMigrationPendingError,
  newSizeGuideForm,
  normalizeColorHex,
  normalizeSize,
  removeColumn,
  sizeFromSelect,
  sizeGuideFormFromDto,
  sizeSelectState,
  slugColumnKey,
  sortRows,
  sortSizes,
  toFamilyPayload,
  toSizeGuidePayload,
  updateColumnKey,
  updateColumnLabel,
  updateRowValue,
  validateFamilyForm,
  validateSizeGuideForm,
  variantGenderLabel,
  variantLabel,
  type SizeGuideFormValues,
} from './product-families';
import type { ProductFamily, SizeGuide } from '@/types/product-family';

const guideForm = (overrides: Partial<SizeGuideFormValues> = {}): SizeGuideFormValues => ({
  code: 'playera-mujer',
  name: 'Playera de mujer',
  nameEn: "Women's t-shirt",
  gender: 'mujer',
  unit: 'cm',
  columns: [
    { key: 'pecho', label: 'Pecho', labelEn: 'Chest' },
    { key: 'largo', label: 'Largo', labelEn: '' },
  ],
  rows: [
    { size: 'm', values: { pecho: '48', largo: '64' } },
    { size: ' ch ', values: { pecho: '46', largo: '62', fantasma: 'x' } },
  ],
  notes: '',
  notesEn: '',
  isActive: true,
  ...overrides,
});

describe('tallas: normalización y orden canónico', () => {
  it('normaliza a MAYÚSCULAS sin espacios; vacío → null', () => {
    expect(normalizeSize(' ch ')).toBe('CH');
    expect(normalizeSize('x l')).toBe('XL');
    expect(normalizeSize('')).toBeNull();
    expect(normalizeSize(null)).toBeNull();
  });

  it('ordena como el API: lista canónica, luego numéricas, luego el resto', () => {
    expect(sortSizes(['XL', '30', 'UNITALLA', 'CH', '28', 'M', 'G', 'XXL', 'XCH', '2XL', 'S'])).toEqual([
      'XCH',
      'CH',
      'S',
      'M',
      'G',
      'XL',
      'XXL',
      '2XL',
      '28',
      '30',
      'UNITALLA',
    ]);
    expect(VARIANT_SIZE_ORDER[0]).toBe('XXCH');
    expect(VARIANT_SIZE_ORDER[VARIANT_SIZE_ORDER.length - 1]).toBe('4XL');
  });

  it('las numéricas se comparan como número, no como texto', () => {
    expect(compareSizes('9', '10')).toBeLessThan(0);
    expect(compareSizes('30.5', '30')).toBeGreaterThan(0);
  });

  it('sortSizes no muta la lista original y tolera minúsculas', () => {
    const original = ['g', 'ch'];
    expect(sortSizes(original)).toEqual(['ch', 'g']);
    expect(original).toEqual(['g', 'ch']);
  });
});

describe('selector de talla de la ficha', () => {
  it('una talla de la lista corta queda como preset; cualquier otra abre "Otra…"', () => {
    expect(sizeSelectState('ch')).toEqual({ preset: 'CH', other: '' });
    expect(sizeSelectState('28')).toEqual({ preset: OTHER_SIZE_OPTION, other: '28' });
    expect(sizeSelectState(null)).toEqual({ preset: '', other: '' });
    for (const s of SIZE_PRESETS) expect(sizeSelectState(s).preset).toBe(s);
  });

  it('del selector a lo que se guarda: null sin talla, normalizada si es libre', () => {
    expect(sizeFromSelect({ preset: '', other: 'ignorada' })).toBeNull();
    expect(sizeFromSelect({ preset: 'M', other: '' })).toBe('M');
    expect(sizeFromSelect({ preset: OTHER_SIZE_OPTION, other: ' uni talla ' })).toBe('UNITALLA');
    expect(sizeFromSelect({ preset: OTHER_SIZE_OPTION, other: '  ' })).toBeNull();
  });
});

describe('para quién, color y etiquetas', () => {
  it('etiquetas y orden de géneros (mujer, hombre, unisex)', () => {
    expect(variantGenderLabel('mujer')).toBe('Mujer');
    expect(variantGenderLabel('otro')).toBe('');
    expect(variantGenderLabel(null)).toBe('');
    expect(genderLabels(['unisex', 'mujer', 'x', 'hombre'])).toEqual(['Mujer', 'Hombre', 'Unisex']);
  });

  it('normaliza el hex a #RRGGBB en mayúsculas; lo que no es color → null', () => {
    expect(normalizeColorHex('#abc')).toBe('#AABBCC');
    expect(normalizeColorHex('ff0000')).toBe('#FF0000');
    expect(normalizeColorHex(' #f8c8dc ')).toBe('#F8C8DC');
    expect(normalizeColorHex('rosa')).toBeNull();
    expect(normalizeColorHex('#12345')).toBeNull();
    expect(normalizeColorHex('')).toBeNull();
  });

  it('variantLabel arma "Mujer · Rosa · CH" y omite lo vacío', () => {
    expect(variantLabel({ variantGender: 'mujer', variantColor: 'Rosa', variantSize: 'ch' })).toBe('Mujer · Rosa · CH');
    expect(variantLabel({ variantGender: null, variantColor: ' ', variantSize: '28' })).toBe('28');
    expect(variantLabel({})).toBe('Sin atributos');
  });
});

describe('slugColumnKey', () => {
  it('minúsculas, sin acentos, no alfanumérico → _, sin _ en los bordes', () => {
    expect(slugColumnKey('Pecho')).toBe('pecho');
    expect(slugColumnKey('Largo de manga (cm)')).toBe('largo_de_manga_cm');
    expect(slugColumnKey('  Cadera / Ñandú  ')).toBe('cadera_nandu');
    expect(slugColumnKey('---')).toBe('');
    expect(slugColumnKey('')).toBe('');
  });

  it('recorta a 40 sin dejar un _ colgando', () => {
    const key = slugColumnKey('a'.repeat(39) + ' b');
    expect(key).toBe('a'.repeat(39));
    expect(key.length).toBeLessThanOrEqual(40);
  });
});

describe('errores del API', () => {
  it('503 o PRD_MIGRATION_PENDING = falta la migración', () => {
    expect(isMigrationPendingError({ response: { status: 503 } })).toBe(true);
    expect(isMigrationPendingError({ response: { status: 409, data: { code: 'PRD_MIGRATION_PENDING' } } })).toBe(true);
    expect(isMigrationPendingError({ response: { status: 409, data: { code: 'PRD_VARIANT_DUPLICATE' } } })).toBe(false);
    expect(isMigrationPendingError(new Error('Network Error'))).toBe(false);
    expect(isMigrationPendingError(null)).toBe(false);
  });
});

describe('formulario de familia', () => {
  const family: ProductFamily = {
    id: 'f1',
    code: 'PLR',
    name: 'Playera rosa',
    nameEn: null,
    sizeGuideId: 'g1',
    sizeGuideName: 'Playera de mujer',
    isActive: false,
    sortOrder: 3,
    variantCount: 4,
    activeVariantCount: 4,
    genders: ['mujer'],
    colors: ['Rosa'],
    sizes: ['CH', 'M', 'G', 'XL'],
    createdAt: '2026-10-30T10:00:00Z',
    updatedAt: '2026-10-30T10:00:00Z',
  };

  it('va y viene entre el DTO y el formulario', () => {
    const form = familyFormFromDto(family);
    expect(form).toEqual({ code: 'PLR', name: 'Playera rosa', nameEn: '', sizeGuideId: 'g1', isActive: false, sortOrder: '3' });
    expect(toFamilyPayload(form)).toEqual({
      code: 'PLR',
      name: 'Playera rosa',
      nameEn: null,
      sizeGuideId: 'g1',
      isActive: false,
      sortOrder: 3,
    });
  });

  it('la clave sube a MAYÚSCULAS, los vacíos se mandan como null y el orden vacío es 0', () => {
    expect(toFamilyPayload({ ...EMPTY_FAMILY_FORM, code: 'sdn', name: ' Sudadera ', sortOrder: '' })).toEqual({
      code: 'SDN',
      name: 'Sudadera',
      nameEn: null,
      sizeGuideId: null,
      isActive: true,
      sortOrder: 0,
    });
  });

  it('valida como el DTO: clave 2-40 [A-Za-z0-9_-], nombre obligatorio, orden entero', () => {
    expect(validateFamilyForm({ ...EMPTY_FAMILY_FORM, code: 'PLR', name: 'Playera' })).toEqual([]);
    const errors = validateFamilyForm({ ...EMPTY_FAMILY_FORM, code: 'P', name: ' ', sortOrder: '1.5' });
    expect(errors).toHaveLength(3);
    expect(validateFamilyForm({ ...EMPTY_FAMILY_FORM, code: 'PL R', name: 'x' })).toHaveLength(1);
    expect(validateFamilyForm({ ...EMPTY_FAMILY_FORM, code: 'PLR', name: 'x', nameEn: 'y'.repeat(256) })).toHaveLength(1);
  });
});

describe('guía de tallas: formulario', () => {
  it('una guía nueva arranca con las columnas sugeridas y sin tallas', () => {
    const form = newSizeGuideForm();
    expect(form.columns).toEqual(DEFAULT_GUIDE_COLUMNS);
    expect(form.columns).not.toBe(DEFAULT_GUIDE_COLUMNS);
    expect(form.rows).toEqual([]);
    expect(form.unit).toBe('cm');
  });

  it('del DTO al formulario: claves bloqueadas, vacíos como texto', () => {
    const guide: SizeGuide = {
      id: 'g1',
      code: 'SUDADERA',
      name: 'Sudadera',
      nameEn: null,
      gender: null,
      unit: 'in',
      columns: [{ key: 'pecho', label: 'Pecho', labelEn: null }],
      rows: [],
      notes: null,
      notesEn: null,
      isActive: true,
      familyCount: 1,
      createdAt: '2026-10-30T10:00:00Z',
      updatedAt: '2026-10-30T10:00:00Z',
    };
    const form = sizeGuideFormFromDto(guide);
    expect(form.gender).toBe('');
    expect(form.unit).toBe('in');
    expect(form.columns).toEqual([{ key: 'pecho', label: 'Pecho', labelEn: '', keyLocked: true }]);
    expect(guideHasMeasures(guide)).toBe(false);
  });

  it('valida lo mismo que el API: sin claves ni tallas repetidas, valores ≤ 20', () => {
    expect(validateSizeGuideForm(guideForm())).toEqual([]);
    const errors = validateSizeGuideForm(
      guideForm({
        columns: [
          { key: 'pecho', label: 'Pecho', labelEn: '' },
          { key: 'Pecho', label: 'Pecho otra vez', labelEn: '' },
        ],
        rows: [
          { size: 'CH', values: { pecho: '46' } },
          { size: 'ch', values: { pecho: '1234567890123456789012' } },
          { size: '', values: {} },
        ],
      }),
    );
    expect(errors).toContain('La columna "pecho" está repetida.');
    expect(errors).toContain('La talla "CH" está repetida.');
    expect(errors).toContain('El valor de "Pecho" en la talla CH es demasiado largo (máximo 20).');
    expect(errors).toContain('La talla del renglón 3 está vacía.');
  });

  it('rechaza claves inválidas, etiquetas vacías y los topes de columnas y tallas', () => {
    const badKey = validateSizeGuideForm(guideForm({ columns: [{ key: 'Pecho cm', label: '', labelEn: '' }] }));
    expect(badKey.some((e) => e.includes('solo admite minúsculas'))).toBe(true);
    expect(badKey.some((e) => e.includes('etiqueta de la columna 1'))).toBe(true);

    const manyColumns = Array.from({ length: SIZE_GUIDE_MAX_COLUMNS + 1 }, (_, i) => ({
      key: `c${i}`,
      label: `C${i}`,
      labelEn: '',
    }));
    expect(validateSizeGuideForm(guideForm({ columns: manyColumns, rows: [] }))).toContain(
      `Máximo ${SIZE_GUIDE_MAX_COLUMNS} columnas de medidas.`,
    );

    const manyRows = Array.from({ length: SIZE_GUIDE_MAX_ROWS + 1 }, (_, i) => ({ size: `${20 + i}`, values: {} }));
    expect(validateSizeGuideForm(guideForm({ rows: manyRows }))).toContain(`Máximo ${SIZE_GUIDE_MAX_ROWS} tallas.`);

    expect(validateSizeGuideForm(guideForm({ code: 'x', name: '' }))).toHaveLength(2);
  });

  it('el payload normaliza: clave en MAYÚSCULAS, tallas ordenadas y solo valores de columnas existentes', () => {
    expect(toSizeGuidePayload(guideForm())).toEqual({
      code: 'PLAYERA-MUJER',
      name: 'Playera de mujer',
      nameEn: "Women's t-shirt",
      gender: 'mujer',
      unit: 'cm',
      columns: [
        { key: 'pecho', label: 'Pecho', labelEn: 'Chest' },
        { key: 'largo', label: 'Largo', labelEn: null },
      ],
      rows: [
        { size: 'CH', values: { pecho: '46', largo: '62' } },
        { size: 'M', values: { pecho: '48', largo: '64' } },
      ],
      notes: null,
      notesEn: null,
      isActive: true,
    });
  });

  it('una fila sin talla se omite del payload y los valores faltantes salen como ""', () => {
    const payload = toSizeGuidePayload(guideForm({ rows: [{ size: ' ', values: {} }, { size: 'g', values: {} }] }));
    expect(payload.rows).toEqual([{ size: 'G', values: { pecho: '', largo: '' } }]);
  });
});

describe('guía de tallas: edición de columnas y filas', () => {
  it('la clave se genera desde la etiqueta hasta que se escribe a mano, y los valores siguen a la clave', () => {
    let form = guideForm({ columns: [{ key: 'pecho', label: 'Pecho', labelEn: '' }], rows: [{ size: 'M', values: { pecho: '48' } }] });
    form = updateColumnLabel(form, 0, 'Pecho (cm)');
    expect(form.columns[0].key).toBe('pecho_cm');
    expect(form.rows[0].values).toEqual({ pecho_cm: '48' });

    form = updateColumnKey(form, 0, 'Contorno-Pecho');
    expect(form.columns[0]).toEqual({ key: 'contornopecho', label: 'Pecho (cm)', labelEn: '', keyLocked: true });
    expect(form.rows[0].values).toEqual({ contornopecho: '48' });

    form = updateColumnLabel(form, 0, 'Otra etiqueta');
    expect(form.columns[0].key).toBe('contornopecho');
  });

  it('agregar y quitar columnas respeta el tope y limpia los valores', () => {
    let form = guideForm({ rows: [{ size: 'M', values: { pecho: '48', largo: '64' } }] });
    form = removeColumn(form, 1);
    expect(form.columns.map((c) => c.key)).toEqual(['pecho']);
    expect(form.rows[0].values).toEqual({ pecho: '48' });

    for (let i = 0; i < SIZE_GUIDE_MAX_COLUMNS; i += 1) {
      const next = addColumn(form);
      if (next) form = next;
    }
    expect(form.columns).toHaveLength(SIZE_GUIDE_MAX_COLUMNS);
    expect(addColumn(form)).toBeNull();
  });

  it('agregar talla: normalizada, con valores vacíos, sin repetir y con tope de 30', () => {
    const base = guideForm({ rows: [] });
    const withCh = addSizeRow(base, ' ch ');
    expect(withCh?.rows).toEqual([{ size: 'CH', values: { pecho: '', largo: '' } }]);
    expect(addSizeRow(withCh!, 'Ch')).toBeNull();
    expect(addSizeRow(withCh!, '  ')).toBeNull();

    let full = base;
    for (let i = 0; i < SIZE_GUIDE_MAX_ROWS; i += 1) full = addSizeRow(full, `${20 + i}`)!;
    expect(full.rows).toHaveLength(SIZE_GUIDE_MAX_ROWS);
    expect(addSizeRow(full, 'XL')).toBeNull();
  });

  it('updateRowValue y sortRows no mutan y ordenan por talla', () => {
    const form = guideForm();
    const edited = updateRowValue(form, 0, 'pecho', '50');
    expect(edited.rows[0].values.pecho).toBe('50');
    expect(form.rows[0].values.pecho).toBe('48');
    expect(sortRows(form).rows.map((r) => r.size)).toEqual([' ch ', 'm']);
  });
});
