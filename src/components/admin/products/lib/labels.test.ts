// labels.test.ts — fija los valores que el admin de productos MANDA al API
// contra las listas cerradas que el API valida (`@IsIn` → 400).
//
// Origen de las copias literales (repo toniclife-api):
//   src/modules/products/catalog-admin/dto/catalog-admin.dto.ts
//     CATALOG_PRODUCT_TYPES, CATALOG_SORT_FIELDS, CATALOG_BULK_ACTIONS, CatalogBulkSkipReason
//   src/modules/products/lib/catalog-health.lib.ts          → HealthRuleCode (+ perCountry)
//   src/modules/products/lib/storefront-status.lib.ts       → StorefrontBlockReason
//
// Si el API cambia una lista, se actualiza la copia de aquí Y el front a la vez.
// Cuando el repo del API está junto a este (desarrollo local), la última prueba
// compara las copias contra el archivo real para que no envejezcan en silencio.

import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  BULK_ACTIONS,
  BULK_SKIP_REASON_LABEL,
  CATALOG_LIST_SORT_KEYS,
  COUNTRY_SCOPED_ISSUES,
  CREATE_PRODUCT_TYPES,
  HEALTH_ISSUE_BASES,
  PRODUCTS_TAB_TYPES,
  SELLABLE_TYPES,
  STOREFRONT_REASON_LABEL,
  issueCodeFor,
} from './labels';

// --- catalog-admin.dto.ts:42-49 ---
const API_CATALOG_PRODUCT_TYPES = ['finished_good', 'pack', 'kit', 'promotional', 'service', 'raw_material'];
// --- catalog-admin.dto.ts:51-59 ---
const API_CATALOG_SORT_FIELDS = ['name', 'code', 'createdAt', 'updatedAt', 'sortOrder', 'price', 'score'];
// --- catalog-admin.dto.ts (CATALOG_BULK_ACTIONS) ---
const API_CATALOG_BULK_ACTIONS = [
  'activate',
  'deactivate',
  'show_store',
  'hide_store',
  'enable_pos',
  'disable_pos',
  'feature',
  'unfeature',
  'set_category',
];
// --- catalog-admin.dto.ts (CatalogBulkSkipReason) ---
const API_BULK_SKIP_REASONS = ['enrollment_kit', 'not_sellable_type', 'not_found', 'unchanged'];
// --- catalog-health.lib.ts (HealthRuleCode) ---
const API_HEALTH_RULE_CODES = [
  'no_image',
  'no_description',
  'no_category',
  'no_public_price',
  'zero_price',
  'price_incoherent',
  'no_tax_rule',
  'no_sat_code',
  'no_en_name',
  'no_en_description',
  'no_seo',
  'no_slug',
  'slug_off_convention',
  'name_uppercase',
  'name_untrimmed',
  'duplicate_name',
  'components_missing',
  'visible_not_sellable_type',
];
// --- catalog-health.lib.ts (reglas con perCountry: true) ---
const API_PER_COUNTRY_RULES = ['no_public_price', 'zero_price', 'price_incoherent'];
// --- storefront-status.lib.ts (StorefrontBlockReason) ---
const API_STOREFRONT_REASONS = [
  'inactive',
  'hidden',
  'not_sellable_type',
  'enrollment_kit',
  'no_slug',
  'no_public_price',
  'out_of_stock',
  'country_not_ready',
];
// --- catalog-admin.dto.ts: `issue` admite a lo más 20 valores de <= 40 caracteres ---
const API_ISSUE_MAX_ITEMS = 20;
const API_ISSUE_MAX_LENGTH = 40;

describe('tipos de producto que manda el admin', () => {
  it('la pestaña Productos solo filtra por tipos que el API acepta (C1: "virtual" daba 400)', () => {
    expect(PRODUCTS_TAB_TYPES).toEqual(['finished_good', 'pack', 'raw_material', 'service']);
    for (const type of PRODUCTS_TAB_TYPES) expect(API_CATALOG_PRODUCT_TYPES).toContain(type);
    expect(PRODUCTS_TAB_TYPES).not.toContain('virtual');
  });

  it('el alta no ofrece tipos que la BD rechaza ni los que tienen módulo propio', () => {
    for (const type of CREATE_PRODUCT_TYPES) expect(API_CATALOG_PRODUCT_TYPES).toContain(type);
    expect(CREATE_PRODUCT_TYPES).not.toContain('virtual');
    expect(CREATE_PRODUCT_TYPES).not.toContain('kit');
    expect(CREATE_PRODUCT_TYPES).not.toContain('promotional');
  });

  it('los tipos vendibles (Salud del catálogo) son válidos para el filtro', () => {
    for (const type of SELLABLE_TYPES) expect(API_CATALOG_PRODUCT_TYPES).toContain(type);
  });
});

describe('orden, acciones masivas y razones', () => {
  it('sortBy del listado ⊆ CATALOG_SORT_FIELDS', () => {
    for (const key of CATALOG_LIST_SORT_KEYS) expect(API_CATALOG_SORT_FIELDS).toContain(key);
  });

  it('las acciones masivas son exactamente las del API, sin repetir', () => {
    const actions = BULK_ACTIONS.map((a) => a.action);
    expect(new Set(actions).size).toBe(actions.length);
    expect([...actions].sort()).toEqual([...API_CATALOG_BULK_ACTIONS].sort());
  });

  it('activar y desactivar piden products:delete (el API responde 403 PRD_FORBIDDEN si no)', () => {
    const needsDelete = BULK_ACTIONS.filter((a) => a.needsDelete).map((a) => a.action).sort();
    expect(needsDelete).toEqual(['activate', 'deactivate']);
  });

  it('todas las razones de omitido del bulk tienen texto', () => {
    expect(Object.keys(BULK_SKIP_REASON_LABEL).sort()).toEqual([...API_BULK_SKIP_REASONS].sort());
  });

  it('todas las razones del candado de tienda tienen texto', () => {
    expect(Object.keys(STOREFRONT_REASON_LABEL).sort()).toEqual([...API_STOREFRONT_REASONS].sort());
  });
});

describe('incidencias de salud ("Le falta…")', () => {
  it('los códigos base son exactamente las reglas del API (otro valor → 400 PRD_ISSUE_INVALID)', () => {
    expect([...HEALTH_ISSUE_BASES].sort()).toEqual([...API_HEALTH_RULE_CODES].sort());
  });

  it('las reglas por país coinciden y se mandan como <regla>:<CC>', () => {
    expect(Array.from(COUNTRY_SCOPED_ISSUES).sort()).toEqual([...API_PER_COUNTRY_RULES].sort());
    expect(issueCodeFor('no_public_price', 'US')).toBe('no_public_price:US');
    expect(issueCodeFor('no_image', 'US')).toBe('no_image');
  });

  it('marcar TODAS las incidencias cabe en los límites del DTO', () => {
    expect(HEALTH_ISSUE_BASES.length).toBeLessThanOrEqual(API_ISSUE_MAX_ITEMS);
    for (const base of HEALTH_ISSUE_BASES) {
      expect(issueCodeFor(base, 'MX').length).toBeLessThanOrEqual(API_ISSUE_MAX_LENGTH);
    }
  });
});

// Repo hermano (solo en desarrollo local; en Vercel/CI no existe y la prueba se omite).
const API_DTO_PATH = resolve(
  process.cwd(),
  '../toniclife-api/src/modules/products/catalog-admin/dto/catalog-admin.dto.ts',
);

function readConstList(source: string, name: string): string[] {
  const start = source.indexOf(`export const ${name} = [`);
  const end = start < 0 ? -1 : source.indexOf(']', start);
  if (start < 0 || end < 0) throw new Error(`No se encontró ${name} en el DTO del API`);
  return Array.from(source.slice(start, end).matchAll(/'([^']+)'/g)).map((m) => m[1]);
}

describe.skipIf(!existsSync(API_DTO_PATH))('copias literales vs DTO real del API', () => {
  it('no envejecieron', () => {
    const source = readFileSync(API_DTO_PATH, 'utf8');
    expect(readConstList(source, 'CATALOG_PRODUCT_TYPES')).toEqual(API_CATALOG_PRODUCT_TYPES);
    expect(readConstList(source, 'CATALOG_SORT_FIELDS')).toEqual(API_CATALOG_SORT_FIELDS);
    expect(readConstList(source, 'CATALOG_BULK_ACTIONS')).toEqual(API_CATALOG_BULK_ACTIONS);
  });
});
