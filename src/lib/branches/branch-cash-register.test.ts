import { describe, expect, it, vi } from 'vitest';
import { CashRegisterStatus, type CashRegister, type CashRegisterListResponse } from '@/types/pos';
import {
  CASH_REGISTER_MAX_PAGES,
  CASH_REGISTER_PAGE_LIMIT,
  branchRegisterStatus,
  branchesMissingRegister,
  canCreateCashRegister,
  canListCashRegisters,
  createdCashRegisterFromResponse,
  createdCashRegisterToast,
  fetchAllCashRegisters,
  hasApiRole,
  mainCashRegisterCode,
  mainCashRegisterPayload,
  nextMainCashRegisterCode,
  summarizeRegistersByBranch,
} from '@/lib/branches/branch-cash-register';

const B428 = '235ac4d9-e8c2-45a2-96ea-84f62434a48b';
const B101 = '0c1b2f4e-5a6d-4e7f-8a9b-0c1d2e3f4a5b';
const B150 = '9f0e8d7c-6b5a-4c3d-8e2f-1a0b9c8d7e6f';

const register = (over: Partial<CashRegister> = {}): CashRegister => ({
  id: over.id ?? `r-${Math.random()}`,
  branchId: B101,
  branchName: 'MX 101',
  name: 'Caja Principal',
  code: '101-C1',
  status: CashRegisterStatus.CLOSED,
  allowNegativeBalance: false,
  requireOpeningAmount: true,
  autoPrintTicket: true,
  isActive: true,
  createdAt: '2026-06-23T00:00:00.000Z',
  ...over,
});

const page = (data: CashRegister[], p: number, totalPages: number, total = data.length): CashRegisterListResponse => ({
  data,
  total,
  page: p,
  limit: CASH_REGISTER_PAGE_LIMIT,
  totalPages,
});

describe('roles (espejo del RolesGuard del API)', () => {
  it('POST /pos/registers: super_admin y administrador (alias admin) sí; operaciones y sistemas no', () => {
    expect(canCreateCashRegister(['super_admin'])).toBe(true);
    expect(canCreateCashRegister(['administrador'])).toBe(true);
    expect(canCreateCashRegister(['admin'])).toBe(true);
    expect(canCreateCashRegister(['operaciones'])).toBe(false);
    expect(canCreateCashRegister(['sistemas'])).toBe(false);
    expect(canCreateCashRegister(['call_center'])).toBe(false);
    expect(canCreateCashRegister([])).toBe(false);
  });

  it('GET /pos/registers: incluye operaciones, call_center (alias cashier) y cedeas; no sistemas', () => {
    expect(canListCashRegisters(['administrador'])).toBe(true);
    expect(canListCashRegisters(['operaciones'])).toBe(true);
    expect(canListCashRegisters(['call_center'])).toBe(true);
    expect(canListCashRegisters(['cedeas'])).toBe(true);
    expect(canListCashRegisters(['sistemas'])).toBe(false);
    expect(canListCashRegisters(['contabilidad'])).toBe(false);
  });

  it('super_admin pasa siempre, aunque el endpoint no lo liste', () => {
    expect(hasApiRole(['super_admin'], ['nadie'])).toBe(true);
    expect(hasApiRole(['rh'], ['hr'])).toBe(true);
    expect(hasApiRole(['rh'], ['admin'])).toBe(false);
  });
});

describe('fetchAllCashRegisters', () => {
  it('con ≤100 cajas hace UNA sola llamada, sin filtros, limit 100', async () => {
    const fetchPage = vi.fn(async (p: number) => page([register({ id: 'a' }), register({ id: 'b' })], p, 1));
    const all = await fetchAllCashRegisters(fetchPage);
    expect(all.map((r) => r.id)).toEqual(['a', 'b']);
    expect(fetchPage).toHaveBeenCalledTimes(1);
    expect(fetchPage).toHaveBeenCalledWith(1, 100);
  });

  it('pagina hasta totalPages y junta todo', async () => {
    const fetchPage = vi.fn(async (p: number) => page([register({ id: `p${p}` })], p, 3, 3));
    const all = await fetchAllCashRegisters(fetchPage);
    expect(all.map((r) => r.id)).toEqual(['p1', 'p2', 'p3']);
    expect(fetchPage.mock.calls.map((c) => c[0])).toEqual([1, 2, 3]);
  });

  it('lista vacía (totalPages 0) → [] con una sola llamada', async () => {
    const fetchPage = vi.fn(async (p: number) => page([], p, 0, 0));
    expect(await fetchAllCashRegisters(fetchPage)).toEqual([]);
    expect(fetchPage).toHaveBeenCalledTimes(1);
  });

  it('pasado el tope de páginas falla (nunca un "Sin caja" por lista incompleta)', async () => {
    const fetchPage = vi.fn(async (p: number) => page([register()], p, CASH_REGISTER_MAX_PAGES + 1, 5000));
    await expect(fetchAllCashRegisters(fetchPage)).rejects.toThrow(/5000 cajas/);
    expect(fetchPage).toHaveBeenCalledTimes(1);
  });
});

describe('cruce sucursal → caja', () => {
  const registers = [
    register({ id: 'r101', branchId: B101, code: '101-C1' }),
    register({ id: 'r150', branchId: B150, code: '150-C1', isActive: false }),
    register({ id: 'r101', branchId: B101, code: '101-C1' }), // repetida por el paginado
  ];
  const summary = summarizeRegistersByBranch(registers);

  it('agrupa por sucursal, separa activas y conserva los códigos de las inactivas', () => {
    expect(summary[B101].active.map((r) => r.id)).toEqual(['r101']);
    expect(summary[B101].codes).toEqual(['101-C1']);
    expect(summary[B150].active).toEqual([]);
    expect(summary[B150].codes).toEqual(['150-C1']);
    expect(summary[B428]).toBeUndefined();
    expect(summarizeRegistersByBranch(null)).toEqual({});
  });

  it('428 (activa, con POS, sin fila en cash_registers) → missing', () => {
    expect(branchRegisterStatus({ id: B428, isActive: true, isPosEnabled: true }, summary)).toBe('missing');
  });

  it('solo una caja INACTIVA también es missing (el POS solo abre cajas activas)', () => {
    expect(branchRegisterStatus({ id: B150, isActive: true, isPosEnabled: true }, summary)).toBe('missing');
  });

  it('con caja activa → ok', () => {
    expect(branchRegisterStatus({ id: B101, isActive: true, isPosEnabled: true }, summary)).toBe('ok');
  });

  it('inactiva o sin POS → not-applicable (no se marca)', () => {
    expect(branchRegisterStatus({ id: B428, isActive: false, isPosEnabled: true }, summary)).toBe('not-applicable');
    expect(branchRegisterStatus({ id: B428, isActive: true, isPosEnabled: false }, summary)).toBe('not-applicable');
  });

  it('sin listado de cajas (403, error, cargando) → unknown, nunca missing', () => {
    expect(branchRegisterStatus({ id: B428, isActive: true, isPosEnabled: true }, undefined)).toBe('unknown');
    expect(branchRegisterStatus({ id: B428, isActive: true, isPosEnabled: true }, null)).toBe('unknown');
  });

  it('branchesMissingRegister filtra solo las que el POS no puede cobrar', () => {
    const branches = [
      { id: B428, code: '428', isActive: true, isPosEnabled: true },
      { id: B101, code: '101', isActive: true, isPosEnabled: true },
      { id: B150, code: '150', isActive: false, isPosEnabled: true },
    ];
    expect(branchesMissingRegister(branches, summary).map((b) => b.code)).toEqual(['428']);
    expect(branchesMissingRegister(branches, undefined)).toEqual([]);
  });
});

describe('payload de "Crear caja principal"', () => {
  it('428 → Caja Principal 428-C1 con las banderas de las 69 cajas de la carga masiva', () => {
    expect(mainCashRegisterPayload({ id: B428, code: '428' })).toEqual({
      branchId: B428,
      name: 'Caja Principal',
      code: '428-C1',
      allowNegativeBalance: false,
      requireOpeningAmount: true,
      autoPrintTicket: true,
    });
  });

  it('si el -C1 ya lo usa una caja (aunque esté inactiva) toma el siguiente libre', () => {
    expect(nextMainCashRegisterCode('150', ['150-C1'])).toBe('150-C2');
    expect(nextMainCashRegisterCode('150', ['150-c1', '150-C2'])).toBe('150-C3');
    expect(mainCashRegisterPayload({ id: B150, code: '150' }, ['150-C1']).code).toBe('150-C2');
  });

  it('recorta el código de sucursal (nunca el sufijo) para caber en @MaxLength(20)', () => {
    const code = mainCashRegisterCode('ABCDEFGHIJKLMNOPQRST'); // 20 caracteres
    expect(code).toBe('ABCDEFGHIJKLMNOPQ-C1');
    expect(code.length).toBe(20);
    expect(mainCashRegisterCode('  428 ')).toBe('428-C1');
  });

  it('si ya no hay sufijos libres, falla en vez de mandar un código repetido', () => {
    const taken = Array.from({ length: 20 }, (_, i) => `428-C${i + 1}`);
    expect(() => nextMainCashRegisterCode('428', taken)).toThrow(/428-C1 a 428-C20/);
  });
});

describe('respuesta de POST/PATCH /branches (cashRegisterCreated opcional)', () => {
  it('API con el cambio: { id, code, name } → toast con el código', () => {
    const created = createdCashRegisterFromResponse({
      id: B428,
      cashRegisterCreated: { id: 'x', code: '428-C1', name: 'Caja Principal' },
    });
    expect(created).toEqual({ code: '428-C1', name: 'Caja Principal' });
    expect(createdCashRegisterToast(created!)).toBe('Se creó la Caja Principal (428-C1)');
  });

  it('API sin el cambio (campo ausente) o sin caja nueva → null: no se dice nada', () => {
    expect(createdCashRegisterFromResponse({ id: B428 })).toBeNull();
    expect(createdCashRegisterFromResponse({ id: B428, cashRegisterCreated: null })).toBeNull();
    expect(createdCashRegisterFromResponse({ id: B428, cashRegisterCreated: false })).toBeNull();
    expect(createdCashRegisterFromResponse(undefined)).toBeNull();
    expect(createdCashRegisterFromResponse('ok')).toBeNull();
  });

  it('tolera la bandera booleana y campos vacíos', () => {
    const flag = createdCashRegisterFromResponse({ cashRegisterCreated: true });
    expect(flag).toEqual({});
    expect(createdCashRegisterToast(flag!)).toBe('Se creó la Caja Principal');
    expect(createdCashRegisterFromResponse({ cashRegisterCreated: { code: '', name: 3 } })).toEqual({
      code: undefined,
      name: undefined,
    });
  });
});
