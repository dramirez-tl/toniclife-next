import { describe, expect, it } from 'vitest';
import type { CreateBranchDto } from '@/types/branch';
import {
  blankToUndefined,
  toCreateBranchPayload,
  toUpdateBranchPayload,
} from '@/lib/branches/branch-form-payload';

// Estado inicial REAL del modal de /admin/sucursales (initialFormState).
const initialForm: CreateBranchDto = {
  name: '',
  code: '',
  countryId: '',
  stateId: '',
  addressStreet: '',
  addressCity: '',
  addressState: '',
  addressZip: '',
  addressPhone: '',
  addressEmail: '',
  currencyCode: '',
  isWarehouse: false,
  isPickupPoint: false,
  isPosEnabled: false,
  isEcommerceEnabled: false,
  isCedea: false,
  ticketName: '',
  ticketHeader: '',
  ticketFooter: '',
  timezone: 'America/Mexico_City',
};

const COUNTRY = 'b47b4f94-011d-4071-adf9-5c5285606af7';
const STATE = '0c1b2f4e-5a6d-4e7f-8a9b-0c1d2e3f4a5b';

describe('blankToUndefined', () => {
  it("'' y espacios → undefined; recorta el resto", () => {
    expect(blankToUndefined('')).toBeUndefined();
    expect(blankToUndefined('   ')).toBeUndefined();
    expect(blankToUndefined(undefined)).toBeUndefined();
    expect(blankToUndefined(null)).toBeUndefined();
    expect(blankToUndefined('  a@b.mx ')).toBe('a@b.mx');
  });
});

describe('toCreateBranchPayload (POST /branches)', () => {
  it('manda timezone y omite los opcionales vacíos que el API rechaza', () => {
    const payload = toCreateBranchPayload({
      ...initialForm,
      name: 'Tijuana Centro',
      code: 'TJ_01',
      countryId: COUNTRY,
      currencyCode: 'MXN',
      timezone: 'America/Tijuana',
    });
    expect(payload.timezone).toBe('America/Tijuana');
    expect(payload.stateId).toBeUndefined();
    expect(payload.addressEmail).toBeUndefined();
    expect(payload.currencyCode).toBe('MXN');
    expect(payload.isCedea).toBe(false);
    expect(payload.ticketName).toBe('');
  });

  it("currencyCode '' no viaja (FK currencies) y stateId con valor sí", () => {
    const payload = toCreateBranchPayload({
      ...initialForm,
      name: 'X',
      code: 'X',
      countryId: COUNTRY,
      stateId: STATE,
      addressEmail: ' sucursal@toniclife.com ',
    });
    expect(payload.currencyCode).toBeUndefined();
    expect(payload.stateId).toBe(STATE);
    expect(payload.addressEmail).toBe('sucursal@toniclife.com');
  });

  it('no altera el formulario original', () => {
    const form = { ...initialForm, addressEmail: '' };
    toCreateBranchPayload(form);
    expect(form.addressEmail).toBe('');
  });
});

describe('toUpdateBranchPayload (PATCH /branches/:id)', () => {
  it('quita code, manda stateId null para limpiar y omite vacíos', () => {
    const payload = toUpdateBranchPayload({
      ...initialForm,
      name: 'Culiacán',
      code: 'MX_CUL',
      countryId: COUNTRY,
      currencyCode: '',
      timezone: 'America/Mazatlan',
    });
    expect('code' in payload).toBe(false);
    expect(payload.stateId).toBeNull();
    expect(payload.addressEmail).toBeUndefined();
    expect(payload.currencyCode).toBeUndefined();
    expect(payload.timezone).toBe('America/Mazatlan');
    expect(payload.name).toBe('Culiacán');
  });

  it('conserva stateId y moneda cuando vienen con valor', () => {
    const payload = toUpdateBranchPayload({
      ...initialForm,
      name: 'X',
      code: 'X',
      stateId: STATE,
      currencyCode: 'USD',
    });
    expect(payload.stateId).toBe(STATE);
    expect(payload.currencyCode).toBe('USD');
  });
});
