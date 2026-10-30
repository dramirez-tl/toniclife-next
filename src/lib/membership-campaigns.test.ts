import { describe, expect, it } from 'vitest';
import {
  EMPTY_MEMBERSHIP_FORM,
  apiErrorMessage,
  appliesToLabel,
  benefitSummary,
  branchesLabel,
  formFromCampaign,
  formatBusinessDate,
  formatPercent,
  formatPoints,
  isMigrationMissingError,
  kitTypeLabel,
  parseDecimal,
  redemptionStatusUi,
  toMembershipPayload,
  toYmd,
  validateMembershipForm,
  validityLabel,
  validityState,
  ymdOnly,
  type MembershipCampaignFormValues,
} from './membership-campaigns';
import type { MembershipCampaign } from '@/types/membership-campaign';

const validForm: MembershipCampaignFormValues = {
  ...EMPTY_MEMBERSHIP_FORM,
  code: 'memb1650',
  name: 'Compra 1,650 puntos y tu membresía es gratis',
  countryId: 'mx-uuid',
  minPoints: '1650',
  couponPercent: '10',
  couponValidDays: '90',
  gifts: [
    { productId: 'p1', sku: 'CAT-01', name: 'Catálogo', quantity: '1' },
    { productId: 'p2', sku: 'SHK-01', name: 'Shaker', quantity: '2' },
  ],
  branchIds: ['b1', 'b1', 'b2'],
};

const campaign: MembershipCampaign = {
  id: 'c1',
  code: 'MEMB1650',
  name: 'Membresía gratis',
  description: null,
  imageUrl: null,
  countryId: 'mx-uuid',
  countryCode: 'MX',
  countryName: 'México',
  minPoints: 1650,
  appliesTo: 'new',
  grantPosition: 'premium',
  couponPercent: null,
  couponValidDays: 60,
  couponChannel: 'pos',
  validFrom: '2026-10-26',
  validTo: null,
  isActive: true,
  sortOrder: 2,
  gifts: [
    { productId: 'p2', sku: 'SHK-01', name: 'Shaker', quantity: 1, sortOrder: 1, productActive: false },
    { productId: 'p1', sku: 'CAT-01', name: 'Catálogo', quantity: 1, sortOrder: 0 },
  ],
  branches: [
    { branchId: 'b1', branchCode: 'MER', branchName: 'Mérida', enabledAt: '2026-10-21T10:00:00Z' },
  ],
  branchCount: 1,
  redemptionCount: 3,
  createdAt: '2026-10-21T10:00:00Z',
  updatedAt: '2026-10-21T10:00:00Z',
};

describe('membership-campaigns: etiquetas y formato', () => {
  it('a quién aplica y posición', () => {
    expect(appliesToLabel('new')).toBe('Nuevos');
    expect(appliesToLabel('basic')).toBe('Básicos');
    expect(appliesToLabel('all')).toBe('Ambos');
    expect(kitTypeLabel(null)).toBe('Sin kit');
    expect(kitTypeLabel('premium')).toBe('Premium');
  });

  it('resumen del beneficio', () => {
    expect(benefitSummary({ grantPosition: 'premium', couponPercent: 10, gifts: [1, 2, 3] })).toBe(
      'Premium · 3 regalos · cupón 10 %',
    );
    expect(benefitSummary({ grantPosition: 'basic', couponPercent: null, gifts: [] })).toBe(
      'Básico · sin regalos · sin cupón',
    );
    expect(benefitSummary({ grantPosition: 'premium', couponPercent: 12.5, gifts: [1] })).toBe(
      'Premium · 1 regalo · cupón 12.5 %',
    );
  });

  it('sucursales: 0 = apagada', () => {
    expect(branchesLabel(0)).toBe('Apagada');
    expect(branchesLabel(1)).toBe('1 sucursal');
    expect(branchesLabel(4)).toBe('4 sucursales');
  });

  it('fechas de negocio sin desfase de zona horaria', () => {
    expect(formatBusinessDate('2026-10-26')).toBe('26 oct 2026');
    expect(formatBusinessDate('2026-01-01')).toBe('1 ene 2026');
    expect(formatBusinessDate(null)).toBe('');
    expect(validityLabel(null, null)).toBe('Sin límite');
    expect(validityLabel('2026-10-26', null)).toBe('Desde 26 oct 2026');
    expect(validityLabel(null, '2026-11-25')).toBe('Hasta 25 nov 2026');
    expect(validityLabel('2026-10-26', '2026-11-25')).toBe('26 oct 2026 → 25 nov 2026');
  });

  it('toYmd usa la fecha local con ceros a la izquierda', () => {
    expect(toYmd(new Date(2026, 9, 5, 23, 30))).toBe('2026-10-05');
    expect(toYmd(new Date(2026, 0, 1))).toBe('2026-01-01');
  });

  it('estado de la vigencia contra hoy', () => {
    expect(validityState('2026-11-01', null, '2026-10-21')).toBe('scheduled');
    expect(validityState(null, '2026-10-20', '2026-10-21')).toBe('expired');
    expect(validityState('2026-10-01', '2026-10-31', '2026-10-21')).toBe('current');
    expect(validityState(null, null, '2026-10-21')).toBe('current');
  });

  it('números y porcentajes', () => {
    expect(formatPoints(1650)).toBe('1,650');
    expect(formatPoints('2000.5')).toBe('2,000.5');
    expect(formatPercent(10)).toBe('10 %');
  });

  it('badges de canje', () => {
    expect(redemptionStatusUi('pending').label).toBe('Sin cobrar');
    expect(redemptionStatusUi('applied').label).toBe('Aplicado');
    expect(redemptionStatusUi('reverted').label).toBe('Anulado');
    expect(redemptionStatusUi('failed').label).toBe('Falló');
  });
});

describe('membership-campaigns: errores del API', () => {
  it('503 = falta la migración 168', () => {
    expect(isMigrationMissingError({ response: { status: 503 } })).toBe(true);
    expect(isMigrationMissingError({ response: { status: 500 } })).toBe(false);
    expect(isMigrationMissingError(new Error('x'))).toBe(false);
    expect(isMigrationMissingError(null)).toBe(false);
  });

  it('mensaje del API (string o arreglo) con respaldo', () => {
    expect(apiErrorMessage({ response: { data: { message: 'Código repetido' } } }, 'x')).toBe('Código repetido');
    expect(apiErrorMessage({ response: { data: { message: ['a', 'b'] } } }, 'x')).toBe('a');
    expect(apiErrorMessage(new Error('boom'), 'Respaldo')).toBe('Respaldo');
  });
});

describe('membership-campaigns: formulario', () => {
  it('parseDecimal acepta coma decimal y rechaza basura', () => {
    expect(parseDecimal('1,5')).toBe(1.5);
    expect(parseDecimal(' 1650 ')).toBe(1650);
    expect(parseDecimal('')).toBeNull();
    expect(parseDecimal('abc')).toBeNull();
    expect(parseDecimal('1.2.3')).toBeNull();
  });

  it('un formulario válido no tiene errores y el DTO va limpio', () => {
    expect(validateMembershipForm(validForm)).toEqual([]);
    const dto = toMembershipPayload(validForm);
    expect(dto.code).toBe('MEMB1650');
    expect(dto.minPoints).toBe(1650);
    expect(dto.couponPercent).toBe(10);
    expect(dto.couponValidDays).toBe(90);
    expect(dto.description).toBeNull();
    expect(dto.imageUrl).toBeNull();
    expect(dto.validFrom).toBeNull();
    expect(dto.validTo).toBeNull();
    expect(dto.isActive).toBe(false);
    expect(dto.gifts).toEqual([
      { productId: 'p1', quantity: 1, sortOrder: 0 },
      { productId: 'p2', quantity: 2, sortOrder: 1 },
    ]);
    // Sucursales sin repetidos.
    expect(dto.branchIds).toEqual(['b1', 'b2']);
  });

  it('cupón vacío = null (sin cupón) y no valida los días', () => {
    const dto = toMembershipPayload({ ...validForm, couponPercent: '', couponValidDays: '' });
    expect(dto.couponPercent).toBeNull();
    expect(validateMembershipForm({ ...validForm, couponPercent: '', couponValidDays: '' })).toEqual([]);
  });

  it('reglas del DTO: código, nombre, país, puntos, cupón, fechas, regalos', () => {
    const errors = validateMembershipForm({
      ...validForm,
      code: 'a b',
      name: 'ab',
      countryId: '',
      minPoints: '0',
      couponPercent: '150',
      couponValidDays: '400',
      validFrom: '2026-11-25',
      validTo: '2026-10-26',
      sortOrder: '1.5',
      gifts: [
        { productId: 'p1', sku: 'CAT-01', name: 'Catálogo', quantity: '0' },
        { productId: 'p1', sku: 'CAT-01', name: 'Catálogo', quantity: '1' },
      ],
    });
    expect(errors).toContain('El código solo admite letras, números, guion y guion bajo.');
    expect(errors).toContain('El nombre debe tener entre 3 y 150 caracteres.');
    expect(errors).toContain('Elige el país donde aplica.');
    expect(errors).toContain('Los puntos mínimos deben ser un número mayor o igual a 1.');
    expect(errors).toContain('El cupón debe ser un porcentaje entre 0.01 y 100 (o vacío = sin cupón).');
    expect(errors).toContain('La vigencia del cupón debe ser un entero entre 1 y 365 días.');
    expect(errors).toContain('La vigencia "hasta" no puede ser anterior a "desde".');
    expect(errors).toContain('El orden debe ser un número entero.');
    expect(errors).toContain('Regalo CAT-01: la cantidad debe ser mayor a 0.');
    expect(errors).toContain('Regalo CAT-01: está repetido.');
    expect(validateMembershipForm({ ...validForm, code: 'ab' })).toContain(
      'El código debe tener entre 3 y 40 caracteres.',
    );
  });

  it('formFromCampaign copia la campaña y ordena los regalos por sortOrder', () => {
    const f = formFromCampaign(campaign);
    expect(f.code).toBe('MEMB1650');
    expect(f.minPoints).toBe('1650');
    expect(f.appliesTo).toBe('new');
    expect(f.couponPercent).toBe('');
    expect(f.couponValidDays).toBe('60');
    expect(f.couponChannel).toBe('pos');
    expect(f.validFrom).toBe('2026-10-26');
    expect(f.validTo).toBe('');
    expect(f.sortOrder).toBe('2');
    expect(f.gifts.map((g) => g.sku)).toEqual(['CAT-01', 'SHK-01']);
    expect(f.gifts[1].productActive).toBe(false);
    expect(f.branchIds).toEqual(['b1']);
    // Ida y vuelta: lo que se carga se puede guardar tal cual.
    expect(validateMembershipForm(f)).toEqual([]);
  });

  it('valores desconocidos del API caen en el default del formulario', () => {
    const f = formFromCampaign({ ...campaign, appliesTo: 'raro', grantPosition: 'x', couponChannel: 'y' });
    expect(f.appliesTo).toBe('all');
    expect(f.grantPosition).toBe('premium');
    expect(f.couponChannel).toBe('all');
  });
});

describe('membership-campaigns: fechas DATE que llegan con hora (bug 30-oct-2026)', () => {
  it('ymdOnly recorta la marca de tiempo y respeta YYYY-MM-DD y vacío', () => {
    expect(ymdOnly('2026-10-24T00:00:00.000Z')).toBe('2026-10-24');
    expect(ymdOnly('2026-10-24')).toBe('2026-10-24');
    expect(ymdOnly(null)).toBe('');
    expect(ymdOnly(undefined)).toBe('');
  });

  it('formFromCampaign deja la fecha lista para el campo y para guardar', () => {
    const f = formFromCampaign({
      ...campaign,
      validFrom: '2026-10-24T00:00:00.000Z',
      validTo: '2026-12-31T00:00:00.000Z',
    });
    expect(f.validFrom).toBe('2026-10-24');
    expect(f.validTo).toBe('2026-12-31');
    expect(validateMembershipForm(f)).toEqual([]);
    expect(toMembershipPayload(f).validFrom).toBe('2026-10-24');
    expect(toMembershipPayload(f).validTo).toBe('2026-12-31');
  });

  it('validityState y validityLabel aceptan la fecha con hora sin cambiar de día', () => {
    expect(validityState('2026-10-30T00:00:00.000Z', null, '2026-10-30')).toBe('current');
    expect(validityState('2026-10-24T00:00:00.000Z', null, '2026-10-30')).toBe('current');
    expect(validityState('2026-11-01T00:00:00.000Z', null, '2026-10-30')).toBe('scheduled');
    expect(validityState(null, '2026-10-29T00:00:00.000Z', '2026-10-30')).toBe('expired');
    expect(validityLabel('2026-10-24T00:00:00.000Z', null)).toBe('Desde 24 oct 2026');
  });
});
