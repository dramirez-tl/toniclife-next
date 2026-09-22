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
// Cuando el repo del API está junto a este (desarrollo local), el último bloque
// compara las copias contra los archivos reales (DTO, catalog-health.lib,
// catalog-health.service y storefront-status.lib) para que no envejezcan en silencio.

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
  ZONE_SCOPED_ISSUES,
  healthIssueBasesFor,
  healthIssueLabel,
  healthIssueMeta,
  issueAppliesTo,
  issueCodeFor,
  isPriceZone,
  priceCountryLabel,
  priceZoneStoreName,
  priceZonesOf,
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
  'suspicious_low_price',
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
  'zone_price_missing',
];
// --- catalog-health.lib.ts (reglas por ZONA de precio: llegan como <regla>:<ZONA>, hoy solo FN) ---
const API_PER_ZONE_RULES = ['zone_price_missing'];
// --- catalog-health.lib.ts (reglas con perCountry: true) ---
const API_PER_COUNTRY_RULES = ['no_public_price', 'zero_price', 'price_incoherent', 'suspicious_low_price'];
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
    expect(issueCodeFor('suspicious_low_price', 'US')).toBe('suspicious_low_price:US');
    expect(issueCodeFor('no_image', 'US')).toBe('no_image');
  });

  it('suspicious_low_price usa la etiqueta del CSV de salud del API y corrige en Precios', () => {
    expect(healthIssueLabel('suspicious_low_price:MX')).toBe('Precio sospechosamente bajo (MX)');
    expect(healthIssueMeta('suspicious_low_price:MX').section).toBe('precios');
  });

  it('la regla de zona se manda como <regla>:<ZONA> solo en el país con zonas (MX → FN) y se muestra con el nombre de la zona', () => {
    expect(Array.from(ZONE_SCOPED_ISSUES).sort()).toEqual([...API_PER_ZONE_RULES].sort());
    for (const base of ZONE_SCOPED_ISSUES) expect(COUNTRY_SCOPED_ISSUES.has(base)).toBe(false);
    expect(priceZonesOf('MX')).toEqual(['FN']);
    expect(priceZonesOf('US')).toEqual([]);
    expect(issueCodeFor('zone_price_missing', 'MX')).toBe('zone_price_missing:FN');
    expect(issueAppliesTo('zone_price_missing', 'MX')).toBe(true);
    expect(issueAppliesTo('zone_price_missing', 'US')).toBe(false);
    expect(issueAppliesTo('no_image', 'US')).toBe(true);
    // El filtro "Le falta…" ofrece la regla de zona solo en México; el resto de reglas en todos.
    expect(healthIssueBasesFor('MX')).toEqual(HEALTH_ISSUE_BASES);
    expect(healthIssueBasesFor('US')).toEqual(HEALTH_ISSUE_BASES.filter((b) => b !== 'zone_price_missing'));
    expect(healthIssueLabel('zone_price_missing:FN')).toBe('Sin precio de zona (Frontera MX-USA)');
    expect(healthIssueLabel('zone_price_missing:FN', true)).toBe('Precio de zona (Frontera MX-USA)');
    expect(healthIssueLabel('zone_price_missing')).toBe('Sin precio de zona');
    expect(healthIssueMeta('zone_price_missing:FN').section).toBe('precios');
    // Una regla por país sigue mostrando el ISO2 tal cual.
    expect(healthIssueLabel('no_public_price:MX')).toBe('Sin precio público (MX)');
  });

  it('marcar TODAS las incidencias cabe en los límites del DTO', () => {
    expect(HEALTH_ISSUE_BASES.length).toBeLessThanOrEqual(API_ISSUE_MAX_ITEMS);
    for (const base of HEALTH_ISSUE_BASES) {
      expect(issueCodeFor(base, 'MX').length).toBeLessThanOrEqual(API_ISSUE_MAX_LENGTH);
    }
  });
});

describe('captura de precios: zonas de precio', () => {
  it('Frontera MX-USA se rotula como zona de México; un país normal conserva su nombre', () => {
    expect(isPriceZone('FN')).toBe(true);
    expect(isPriceZone('fn')).toBe(true);
    expect(isPriceZone('MX')).toBe(false);
    expect(isPriceZone(null)).toBe(false);
    expect(priceCountryLabel({ code: 'FN', name: 'Frontera MX-USA' })).toBe('Frontera MX-USA (zona de México)');
    expect(priceCountryLabel({ code: 'MX', name: 'Mexico' })).toBe('Mexico');
    expect(priceCountryLabel({ code: 'US', name: 'Estados Unidos' })).toBe('Estados Unidos');
    expect(priceZoneStoreName('FN')).toBe('México');
    expect(priceZoneStoreName('US')).toBeNull();
  });
});

// Repo hermano (solo en desarrollo local; en Vercel/CI no existe y la prueba se omite).
const API_PRODUCTS_DIR = resolve(process.cwd(), '../toniclife-api/src/modules/products');
const API_DTO_PATH = resolve(API_PRODUCTS_DIR, 'catalog-admin/dto/catalog-admin.dto.ts');
const API_HEALTH_LIB_PATH = resolve(API_PRODUCTS_DIR, 'lib/catalog-health.lib.ts');
const API_HEALTH_SERVICE_PATH = resolve(API_PRODUCTS_DIR, 'catalog-admin/catalog-health.service.ts');
const API_STOREFRONT_LIB_PATH = resolve(API_PRODUCTS_DIR, 'lib/storefront-status.lib.ts');
const HAS_API_REPO = [API_DTO_PATH, API_HEALTH_LIB_PATH, API_HEALTH_SERVICE_PATH, API_STOREFRONT_LIB_PATH].every((p) =>
  existsSync(p),
);

const quoted = (text: string): string[] => Array.from(text.matchAll(/'([^']+)'/g)).map((m) => m[1]);

// La regla de zona (`zone_price_missing:<ZONA>`) la agrega el API en un cambio
// aparte: mientras su HealthRuleCode no la tenga, la copia se compara SIN ella y
// el bloque estricto de abajo queda omitido (visible en la salida, no en silencio).
const API_HAS_ZONE_RULE = HAS_API_REPO && readFileSync(API_HEALTH_LIB_PATH, 'utf8').includes("'zone_price_missing'");
const API_HEALTH_RULE_CODES_LANDED = API_HAS_ZONE_RULE
  ? API_HEALTH_RULE_CODES
  : API_HEALTH_RULE_CODES.filter((code) => !API_PER_ZONE_RULES.includes(code));

function readConstList(source: string, name: string): string[] {
  const start = source.indexOf(`export const ${name} = [`);
  const end = start < 0 ? -1 : source.indexOf(']', start);
  if (start < 0 || end < 0) throw new Error(`No se encontró ${name} en el DTO del API`);
  return quoted(source.slice(start, end));
}

/** `export type X = | 'a' | 'b';` → ['a', 'b'] */
function readUnionType(source: string, name: string): string[] {
  const start = source.indexOf(`export type ${name} =`);
  const end = start < 0 ? -1 : source.indexOf(';', start);
  if (start < 0 || end < 0) throw new Error(`No se encontró el tipo ${name} en el API`);
  return quoted(source.slice(start, end));
}

/** Códigos de HEALTH_RULES cuyo bloque declara `perCountry: true`. */
function readPerCountryRules(source: string): string[] {
  const start = source.indexOf('export const HEALTH_RULES');
  const end = start < 0 ? -1 : source.indexOf('\n};', start);
  if (start < 0 || end < 0) throw new Error('No se encontró HEALTH_RULES en el API');
  const blocks = source.slice(start, end).matchAll(/code:\s*'([^']+)'[^}]*?perCountry:\s*(true|false)/g);
  return Array.from(blocks)
    .filter((m) => m[2] === 'true')
    .map((m) => m[1]);
}

describe.skipIf(!HAS_API_REPO)('copias literales vs archivos reales del API', () => {
  it('el DTO no envejeció', () => {
    const source = readFileSync(API_DTO_PATH, 'utf8');
    expect(readConstList(source, 'CATALOG_PRODUCT_TYPES')).toEqual(API_CATALOG_PRODUCT_TYPES);
    expect(readConstList(source, 'CATALOG_SORT_FIELDS')).toEqual(API_CATALOG_SORT_FIELDS);
    expect(readConstList(source, 'CATALOG_BULK_ACTIONS')).toEqual(API_CATALOG_BULK_ACTIONS);
    expect(readUnionType(source, 'CatalogBulkSkipReason')).toEqual(API_BULK_SKIP_REASONS);
  });

  it('HealthRuleCode y las reglas perCountry no envejecieron', () => {
    const source = readFileSync(API_HEALTH_LIB_PATH, 'utf8');
    const codes = readUnionType(source, 'HealthRuleCode');
    expect(codes).toEqual(API_HEALTH_RULE_CODES_LANDED);
    const perCountry = readPerCountryRules(source);
    expect(perCountry.length).toBeGreaterThan(0);
    expect([...perCountry].sort()).toEqual([...API_PER_COUNTRY_RULES].sort());
    // El front y el API hablan de las mismas reglas, sin intermediarios (la de zona, cuando el API la tenga).
    expect([...HEALTH_ISSUE_BASES].filter((b) => API_HAS_ZONE_RULE || !ZONE_SCOPED_ISSUES.has(b)).sort()).toEqual([...codes].sort());
    expect(Array.from(COUNTRY_SCOPED_ISSUES).sort()).toEqual([...perCountry].sort());
  });

  it.skipIf(!API_HAS_ZONE_RULE)('la regla de zona ya está en el API: copia exacta y NO es una regla por país', () => {
    const source = readFileSync(API_HEALTH_LIB_PATH, 'utf8');
    const codes = readUnionType(source, 'HealthRuleCode');
    expect(codes).toEqual(API_HEALTH_RULE_CODES);
    expect([...HEALTH_ISSUE_BASES].sort()).toEqual([...codes].sort());
    for (const zoneRule of API_PER_ZONE_RULES) expect(readPerCountryRules(source)).not.toContain(zoneRule);
  });

  it('la etiqueta de suspicious_low_price es la del CSV de salud del API', () => {
    const source = readFileSync(API_HEALTH_SERVICE_PATH, 'utf8');
    const match = /suspicious_low_price:\s*'([^']+)'/.exec(source);
    expect(match?.[1]).toBe('Precio sospechosamente bajo');
    expect(healthIssueLabel('suspicious_low_price')).toBe(match?.[1]);
  });

  it('StorefrontBlockReason no envejeció', () => {
    const source = readFileSync(API_STOREFRONT_LIB_PATH, 'utf8');
    expect(readUnionType(source, 'StorefrontBlockReason')).toEqual(API_STOREFRONT_REASONS);
  });
});
