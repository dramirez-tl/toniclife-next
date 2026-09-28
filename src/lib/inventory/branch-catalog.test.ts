// branch-catalog.test.ts — Catálogo POS por sucursal (lógica pura).
//
// Las listas API_* son COPIAS LITERALES de
// toniclife-api/src/modules/inventory/dto/branch-catalog.dto.ts
// (BRANCH_CATALOG_SKIP_REASONS y BRANCH_CATALOG_ENABLE_MODES). Si cambian allá,
// se cambian aquí y en las etiquetas. Con el repo hermano a la mano, además se
// comparan contra el archivo real.

import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { BRANCH_CATALOG_ENABLE_MODES, BRANCH_CATALOG_MAX_PRODUCT_IDS } from '@/types/inventory';
import type { BranchCatalogEnableResult } from '@/types/inventory';
import {
  BRANCH_CATALOG_MODE_HELP,
  BRANCH_CATALOG_MODE_LABEL,
  BRANCH_CATALOG_SKIP_REASON_LABEL,
  NEW_BRANCH_DAYS,
  buildEnableBranchCatalogDto,
  canEnableBranchCatalog,
  coverageStatus,
  coverageTotals,
  enableResultMessage,
  filterCoverageRows,
  isNewBranch,
  seededCatalogFromResponse,
  seededCatalogToast,
  skippedSummary,
} from './branch-catalog';

// --- branch-catalog.dto.ts (BRANCH_CATALOG_SKIP_REASONS, en ese orden) ---
const API_BRANCH_CATALOG_SKIP_REASONS = ['unknown', 'inactive', 'not_pos', 'service', 'dynamic_kit', 'no_price_for_country'];
// --- branch-catalog.dto.ts (BRANCH_CATALOG_ENABLE_MODES) ---
const API_BRANCH_CATALOG_ENABLE_MODES = ['eligible', 'copy_from_branch', 'products'];
// --- branch-catalog.dto.ts (BRANCH_CATALOG_MAX_PRODUCT_IDS) ---
const API_BRANCH_CATALOG_MAX_PRODUCT_IDS = 500;

// Repo hermano (solo en desarrollo local; en Vercel/CI no existe y la prueba se
// omite). Se acepta el checkout normal y el worktree _wt/api-catsuc.
const API_DTO_CANDIDATES = [
  resolve(process.cwd(), '../toniclife-api/src/modules/inventory/dto/branch-catalog.dto.ts'),
  resolve(process.cwd(), '../api-catsuc/src/modules/inventory/dto/branch-catalog.dto.ts'),
];
const API_DTO_PATH = API_DTO_CANDIDATES.find((p) => existsSync(p));

const quoted = (text: string): string[] => Array.from(text.matchAll(/'([^']+)'/g)).map((m) => m[1]);

/**
 * `export const X: readonly T[] = [ 'a', 'b' ]` → ['a', 'b']. Se busca el `[`
 * DESPUÉS del `=` (el de la anotación `T[]` no cuenta); los comentarios se quitan.
 */
function readConstList(source: string, name: string): string[] {
  const start = source.indexOf(`export const ${name}`);
  const eq = start < 0 ? -1 : source.indexOf('=', start);
  const open = eq < 0 ? -1 : source.indexOf('[', eq);
  const end = open < 0 ? -1 : source.indexOf(']', open);
  if (start < 0 || end < 0) throw new Error(`No se encontró ${name} en el DTO del API`);
  return quoted(source.slice(open, end).replace(/\/\*[\s\S]*?\*\//g, ''));
}

/** `export type X = | 'a' | 'b';` → ['a', 'b'] */
function readUnionType(source: string, name: string): string[] {
  const start = source.indexOf(`export type ${name} =`);
  const end = start < 0 ? -1 : source.indexOf(';', start);
  if (start < 0 || end < 0) throw new Error(`No se encontró el tipo ${name} en el API`);
  return quoted(source.slice(start, end).replace(/\/\*[\s\S]*?\*\//g, ''));
}

const B427 = '11111111-1111-4111-8111-111111111111';
const B404 = '22222222-2222-4222-8222-222222222222';
const P1 = '33333333-3333-4333-8333-333333333333';
const P2 = '44444444-4444-4444-8444-444444444444';

const result = (over: Partial<BranchCatalogEnableResult> = {}): BranchCatalogEnableResult => ({
  branch: { id: B427, code: '427', name: 'MX ACAPULCO DIAMANTE', countryCode: 'MX', isPosEnabled: true, isWarehouse: false, isActive: true },
  mode: 'eligible',
  sourceBranchId: null,
  dryRun: false,
  requested: null,
  eligible: 233,
  alreadyPresent: 0,
  inactiveRows: 0,
  toCreate: 233,
  created: 233,
  skipped: { total: 0, byReason: {}, sample: [] },
  warnings: [],
  ...over,
});

describe('copias literales del API (razones, modos, tope)', () => {
  it('las etiquetas cubren exactamente las razones del API, en su orden de prioridad', () => {
    expect(Object.keys(BRANCH_CATALOG_SKIP_REASON_LABEL)).toEqual(API_BRANCH_CATALOG_SKIP_REASONS);
    for (const label of Object.values(BRANCH_CATALOG_SKIP_REASON_LABEL)) expect(label.trim()).not.toBe('');
  });

  it('los modos y sus textos coinciden con el API', () => {
    expect([...BRANCH_CATALOG_ENABLE_MODES]).toEqual(API_BRANCH_CATALOG_ENABLE_MODES);
    expect(Object.keys(BRANCH_CATALOG_MODE_LABEL)).toEqual(API_BRANCH_CATALOG_ENABLE_MODES);
    expect(Object.keys(BRANCH_CATALOG_MODE_HELP)).toEqual(API_BRANCH_CATALOG_ENABLE_MODES);
    expect(BRANCH_CATALOG_MAX_PRODUCT_IDS).toBe(API_BRANCH_CATALOG_MAX_PRODUCT_IDS);
  });

  describe.skipIf(!API_DTO_PATH)('vs el archivo real del API', () => {
    it('el DTO no envejeció', () => {
      const source = readFileSync(API_DTO_PATH!, 'utf8');
      expect(readConstList(source, 'BRANCH_CATALOG_SKIP_REASONS')).toEqual(API_BRANCH_CATALOG_SKIP_REASONS);
      expect(readUnionType(source, 'BranchCatalogSkipReason')).toEqual(API_BRANCH_CATALOG_SKIP_REASONS);
      expect(readConstList(source, 'BRANCH_CATALOG_ENABLE_MODES')).toEqual(API_BRANCH_CATALOG_ENABLE_MODES);
      expect(source).toContain(`BRANCH_CATALOG_MAX_PRODUCT_IDS = ${API_BRANCH_CATALOG_MAX_PRODUCT_IDS}`);
    });
  });
});

describe('permiso para habilitar (inventory:update)', () => {
  it('super_admin siempre; luego el permiso exacto, el comodín del módulo o el global', () => {
    expect(canEnableBranchCatalog(['super_admin'], [])).toBe(true);
    expect(canEnableBranchCatalog(['almacen'], ['inventory:update'])).toBe(true);
    expect(canEnableBranchCatalog(['almacen'], ['inventory:*'])).toBe(true);
    expect(canEnableBranchCatalog(['almacen'], ['*'])).toBe(true);
    expect(canEnableBranchCatalog(['almacen'], ['*:*'])).toBe(true);
  });

  it('solo lectura o permisos de otro módulo: no', () => {
    expect(canEnableBranchCatalog(['almacen'], ['inventory:read'])).toBe(false);
    expect(canEnableBranchCatalog(['comercial'], ['products:*'])).toBe(false);
    expect(canEnableBranchCatalog([], [])).toBe(false);
  });
});

describe('cobertura: nueva, estado, búsqueda y totales', () => {
  const now = Date.UTC(2026, 8, 28, 12, 0, 0); // 28-sep-2026

  it(`"Nueva" = creada hace menos de ${NEW_BRANCH_DAYS} días`, () => {
    expect(isNewBranch('2026-09-23T14:00:00.000Z', now)).toBe(true);
    expect(isNewBranch('2026-08-30T12:00:00.000Z', now)).toBe(true); // 29 días: todavía nueva
    expect(isNewBranch('2026-08-29T12:00:00.000Z', now)).toBe(false); // justo 30 días: ya no
    expect(isNewBranch('2025-06-23T00:00:00.000Z', now)).toBe(false);
    expect(isNewBranch('2027-01-01T00:00:00.000Z', now)).toBe(false); // fecha futura: no es "nueva"
    expect(isNewBranch('no-es-fecha', now)).toBe(false);
    expect(isNewBranch(undefined, now)).toBe(false);
    expect(isNewBranch('2026-09-23T14:00:00.000Z', new Date(now))).toBe(true);
  });

  it('estado: sin catálogo (0 filas), incompleto (faltan) o completo', () => {
    expect(coverageStatus({ presentCount: 0, missingCount: 233 })).toBe('sin_catalogo');
    expect(coverageStatus({ presentCount: 0, missingCount: 0 })).toBe('sin_catalogo'); // sin país
    expect(coverageStatus({ presentCount: 39, missingCount: 194 })).toBe('incompleto');
    expect(coverageStatus({ presentCount: 233, missingCount: 0 })).toBe('completo');
  });

  it('búsqueda por código, nombre o país sin acentos ni mayúsculas', () => {
    const rows = [
      { code: '427', name: 'MX ACAPULCO DIAMANTE', countryCode: 'MX' },
      { code: '404', name: 'CEDEA IZTAPALAPA', countryCode: 'MX' },
      { code: 'US1', name: 'Houston', countryCode: 'US' },
      { code: 'X', name: 'Sin país', countryCode: null },
    ];
    expect(filterCoverageRows(rows, '').map((r) => r.code)).toEqual(['427', '404', 'US1', 'X']);
    expect(filterCoverageRows(rows, 'acápulco').map((r) => r.code)).toEqual(['427']);
    expect(filterCoverageRows(rows, '40').map((r) => r.code)).toEqual(['404']);
    expect(filterCoverageRows(rows, 'us').map((r) => r.code)).toEqual(['US1']);
    expect(filterCoverageRows(rows, 'pais').map((r) => r.code)).toEqual(['X']);
    expect(filterCoverageRows(rows, 'zzz')).toEqual([]);
  });

  it('totales por estado', () => {
    expect(
      coverageTotals([
        { presentCount: 0, missingCount: 233 },
        { presentCount: 39, missingCount: 194 },
        { presentCount: 233, missingCount: 0 },
        { presentCount: 233, missingCount: 0 },
      ]),
    ).toEqual({ branches: 4, sinCatalogo: 1, incompletas: 1, completas: 2 });
    expect(coverageTotals([])).toEqual({ branches: 0, sinCatalogo: 0, incompletas: 0, completas: 0 });
  });
});

describe('body de POST /inventory/branches/:id/catalog/enable', () => {
  it('vista previa por defecto; solo dryRun === false escribe', () => {
    expect(buildEnableBranchCatalogDto({ mode: 'eligible' })).toEqual({ mode: 'eligible', dryRun: true });
    expect(buildEnableBranchCatalogDto({ mode: 'eligible', dryRun: true })).toEqual({ mode: 'eligible', dryRun: true });
    expect(buildEnableBranchCatalogDto({ mode: 'eligible', dryRun: false })).toEqual({ mode: 'eligible', dryRun: false });
  });

  it('copy_from_branch exige sucursal origen', () => {
    expect(buildEnableBranchCatalogDto({ mode: 'copy_from_branch' })).toBeNull();
    expect(buildEnableBranchCatalogDto({ mode: 'copy_from_branch', sourceBranchId: '' })).toBeNull();
    expect(buildEnableBranchCatalogDto({ mode: 'copy_from_branch', sourceBranchId: B404, dryRun: false })).toEqual({
      mode: 'copy_from_branch',
      sourceBranchId: B404,
      dryRun: false,
    });
  });

  it('products exige ids; deduplica, quita vacíos y recorta al tope del API', () => {
    expect(buildEnableBranchCatalogDto({ mode: 'products' })).toBeNull();
    expect(buildEnableBranchCatalogDto({ mode: 'products', productIds: [] })).toBeNull();
    expect(buildEnableBranchCatalogDto({ mode: 'products', productIds: ['', ' '] })).toBeNull();
    expect(buildEnableBranchCatalogDto({ mode: 'products', productIds: [P1, P2, P1, ''] })).toEqual({
      mode: 'products',
      productIds: [P1, P2],
      dryRun: true,
    });
    const many = Array.from({ length: BRANCH_CATALOG_MAX_PRODUCT_IDS + 7 }, (_, i) => `id-${i}`);
    expect(buildEnableBranchCatalogDto({ mode: 'products', productIds: many })?.productIds).toHaveLength(BRANCH_CATALOG_MAX_PRODUCT_IDS);
  });

  it('los parámetros de otro modo no viajan', () => {
    expect(buildEnableBranchCatalogDto({ mode: 'eligible', sourceBranchId: B404, productIds: [P1] })).toEqual({
      mode: 'eligible',
      dryRun: true,
    });
  });
});

describe('textos del resultado', () => {
  it('omitidos por razón, en el orden de prioridad del API y con etiquetas en español', () => {
    expect(skippedSummary({ byReason: { no_price_for_country: 2, inactive: 3, service: 1 } })).toBe(
      '3 inactivos, 1 servicio, 2 sin precio vigente en el país',
    );
    expect(skippedSummary({ byReason: {} })).toBe('');
    expect(skippedSummary(null)).toBe('');
    // Una razón nueva del API que aún no tiene etiqueta sale con su código, no se pierde.
    expect(skippedSummary({ byReason: { otra_razon: 1 } as never })).toBe('1 otra_razon');
  });

  it('toast tras habilitar: creados · ya estaban · omitidos (razones)', () => {
    expect(enableResultMessage(result())).toBe('Se habilitaron 233 productos en 427');
    expect(
      enableResultMessage(
        result({
          created: 12,
          alreadyPresent: 221,
          skipped: { total: 3, byReason: { inactive: 2, service: 1 }, sample: [] },
        }),
      ),
    ).toBe('Se habilitaron 12 productos en 427 · 221 ya estaban · 3 omitidos (2 inactivos, 1 servicio)');
    expect(enableResultMessage(result({ created: 1, alreadyPresent: 1, skipped: { total: 1, byReason: { unknown: 1 }, sample: [] } }))).toBe(
      'Se habilitó 1 producto en 427 · 1 ya estaba · 1 omitido (1 ya no existe)',
    );
    expect(enableResultMessage(result({ created: 0, alreadyPresent: 233 }))).toBe(
      'No se habilitó ningún producto en 427 · 233 ya estaban',
    );
  });
});

describe('catalogSeeded de POST/PATCH /branches', () => {
  it('solo cuando el API lo manda con created > 0', () => {
    expect(seededCatalogFromResponse({ id: B427, catalogSeeded: { created: 233, eligible: 233 } })).toEqual({
      created: 233,
      eligible: 233,
    });
    expect(seededCatalogFromResponse({ id: B427 })).toBeNull();
    expect(seededCatalogFromResponse({ id: B427, catalogSeeded: null })).toBeNull();
    expect(seededCatalogFromResponse({ id: B427, catalogSeeded: { created: 0, eligible: 233 } })).toBeNull();
    expect(seededCatalogFromResponse({ id: B427, catalogSeeded: { created: '233' } })).toBeNull();
    expect(seededCatalogFromResponse(undefined)).toBeNull();
    expect(seededCatalogFromResponse('ok')).toBeNull();
  });

  it('un eligible ausente o incoherente se iguala a created', () => {
    expect(seededCatalogFromResponse({ catalogSeeded: { created: 10 } })).toEqual({ created: 10, eligible: 10 });
    expect(seededCatalogFromResponse({ catalogSeeded: { created: 10, eligible: 3 } })).toEqual({ created: 10, eligible: 10 });
  });

  it('texto del toast', () => {
    expect(seededCatalogToast({ created: 233, eligible: 233 })).toBe(
      'Se habilitaron 233 productos en el catálogo del POS (existencia 0). Carga existencias con un traspaso o un conteo inicial.',
    );
    expect(seededCatalogToast({ created: 1, eligible: 1 })).toBe(
      'Se habilitó 1 producto en el catálogo del POS (existencia 0). Carga existencias con un traspaso o un conteo inicial.',
    );
  });
});
