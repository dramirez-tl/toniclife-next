// labels.test.ts — fija las listas cerradas del módulo de Activos de TI que el
// front MANDA al API (`@IsIn` → 400) o pinta con etiqueta, contra las del API.
//
// Origen de las copias literales (repo toniclife-api, src/modules/it-assets):
//   dto/asset.dto.ts            → ASSET_STATUSES, ASSET_CONDITIONS
//   dto/maintenance.dto.ts      → MAINTENANCE_TYPES, MAINTENANCE_STATUSES
//   lib/asset-components.lib.ts → WARRANTY_STATUSES, MAX_PARENT_DEPTH, WARRANTY_SOON_DAYS
//
// Si el API cambia una lista, se actualiza la copia de aquí Y el front a la vez.
// Cuando el repo del API está junto a este (desarrollo local) o en un worktree
// hermano (_wt/api-*), el último bloque compara las copias contra los archivos
// reales para que no envejezcan en silencio.

import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  ASSET_CONDITIONS,
  ASSET_CONDITION_LABELS,
  ASSET_CONDITION_VARIANTS,
  ASSET_STATUSES,
  ASSET_STATUS_LABELS,
  ASSET_STATUS_VARIANTS,
  MAINTENANCE_STATUSES,
  MAINTENANCE_STATUS_LABELS,
  MAINTENANCE_TYPES,
  MAINTENANCE_TYPE_LABELS,
} from '@/types/asset';
import {
  MAX_PARENT_DEPTH,
  WARRANTY_SOON_DAYS,
  WARRANTY_STATUSES,
  WARRANTY_STATUS_LABELS,
  WARRANTY_STATUS_VARIANTS,
} from './warranty';

// --- dto/asset.dto.ts ---
const API_ASSET_STATUSES = [
  'available',
  'reserved',
  'assigned',
  'on_loan',
  'in_repair',
  'in_warranty',
  'in_transit',
  'lost',
  'stolen',
  'retired',
  'sold',
  'donated',
];
const API_ASSET_CONDITIONS = ['new', 'good', 'fair', 'poor', 'broken'];
// --- dto/maintenance.dto.ts ---
// Sin tipo nuevo para SMART: la BD tiene CHECK sobre maintenance_type y la
// revisión SMART se registra como 'inspection' + specUpdates.
const API_MAINTENANCE_TYPES = [
  'preventive',
  'corrective',
  'upgrade',
  'inspection',
  'incident',
  'warranty_claim',
];
const API_MAINTENANCE_STATUSES = ['scheduled', 'in_progress', 'completed', 'cancelled'];
// --- lib/asset-components.lib.ts ---
const API_WARRANTY_STATUSES = ['vigente', 'por_vencer', 'vencida', 'sin_dato'];
const API_MAX_PARENT_DEPTH = 3;
const API_WARRANTY_SOON_DAYS = 60;

const keysOf = (o: Record<string, unknown>) => Object.keys(o).sort();

describe('listas cerradas del front = copias del API', () => {
  it('estados y condiciones del activo', () => {
    expect([...ASSET_STATUSES]).toEqual(API_ASSET_STATUSES);
    expect([...ASSET_CONDITIONS]).toEqual(API_ASSET_CONDITIONS);
  });

  it('tipos y estados de mantenimiento (SMART NO es un tipo nuevo)', () => {
    expect([...MAINTENANCE_TYPES]).toEqual(API_MAINTENANCE_TYPES);
    expect([...MAINTENANCE_STATUSES]).toEqual(API_MAINTENANCE_STATUSES);
    expect(MAINTENANCE_TYPES).toContain('inspection');
    expect(MAINTENANCE_TYPES as readonly string[]).not.toContain('revision_smart');
  });

  it('estados de garantía y constantes de componentes', () => {
    expect([...WARRANTY_STATUSES]).toEqual(API_WARRANTY_STATUSES);
    expect(MAX_PARENT_DEPTH).toBe(API_MAX_PARENT_DEPTH);
    expect(WARRANTY_SOON_DAYS).toBe(API_WARRANTY_SOON_DAYS);
  });
});

describe('cada valor tiene etiqueta (y variante donde aplica)', () => {
  it('estados del activo', () => {
    expect(keysOf(ASSET_STATUS_LABELS)).toEqual([...ASSET_STATUSES].sort());
    expect(keysOf(ASSET_STATUS_VARIANTS)).toEqual([...ASSET_STATUSES].sort());
  });

  it('condiciones del activo', () => {
    expect(keysOf(ASSET_CONDITION_LABELS)).toEqual([...ASSET_CONDITIONS].sort());
    expect(keysOf(ASSET_CONDITION_VARIANTS)).toEqual([...ASSET_CONDITIONS].sort());
  });

  it('mantenimiento', () => {
    expect(keysOf(MAINTENANCE_TYPE_LABELS)).toEqual([...MAINTENANCE_TYPES].sort());
    expect(keysOf(MAINTENANCE_STATUS_LABELS)).toEqual([...MAINTENANCE_STATUSES].sort());
  });

  it('garantía', () => {
    expect(keysOf(WARRANTY_STATUS_LABELS)).toEqual([...WARRANTY_STATUSES].sort());
    expect(keysOf(WARRANTY_STATUS_VARIANTS)).toEqual([...WARRANTY_STATUSES].sort());
  });
});

// Repo hermano (solo en desarrollo local; en Vercel/CI no existe y la prueba se
// omite). Se prueban varias rutas: junto al repo o en un worktree hermano.
const API_FILES = ['dto/asset.dto.ts', 'dto/maintenance.dto.ts', 'lib/asset-components.lib.ts'];
const API_CANDIDATES = ['../toniclife-api', '../_wt/api-discos', '../api-discos', '../../toniclife-api'];

function findApiDir(): string | null {
  for (const rel of API_CANDIDATES) {
    const dir = resolve(process.cwd(), rel, 'src/modules/it-assets');
    if (API_FILES.every((f) => existsSync(resolve(dir, f)))) return dir;
  }
  return null;
}
const API_DIR = findApiDir();

const quoted = (text: string): string[] => Array.from(text.matchAll(/'([^']+)'/g)).map((m) => m[1]);

function readConstList(source: string, name: string): string[] {
  const start = source.indexOf(`export const ${name} = [`);
  const end = start < 0 ? -1 : source.indexOf(']', start);
  if (start < 0 || end < 0) throw new Error(`No se encontró ${name} en el API`);
  return quoted(source.slice(start, end));
}

function readConstNumber(source: string, name: string): number {
  const match = new RegExp(`export const ${name} = (\\d+)`).exec(source);
  if (!match) throw new Error(`No se encontró ${name} en el API`);
  return Number(match[1]);
}

describe.skipIf(!API_DIR)('copias literales vs archivos reales del API', () => {
  it('asset.dto.ts no envejeció', () => {
    const source = readFileSync(resolve(API_DIR as string, 'dto/asset.dto.ts'), 'utf8');
    expect(readConstList(source, 'ASSET_STATUSES')).toEqual(API_ASSET_STATUSES);
    expect(readConstList(source, 'ASSET_CONDITIONS')).toEqual(API_ASSET_CONDITIONS);
  });

  it('maintenance.dto.ts no envejeció', () => {
    const source = readFileSync(resolve(API_DIR as string, 'dto/maintenance.dto.ts'), 'utf8');
    expect(readConstList(source, 'MAINTENANCE_TYPES')).toEqual(API_MAINTENANCE_TYPES);
    expect(readConstList(source, 'MAINTENANCE_STATUSES')).toEqual(API_MAINTENANCE_STATUSES);
    // El registro SMART manda specUpdates: el DTO debe aceptarlo.
    expect(source).toContain('specUpdates');
  });

  it('asset-components.lib.ts no envejeció', () => {
    const source = readFileSync(
      resolve(API_DIR as string, 'lib/asset-components.lib.ts'),
      'utf8',
    );
    expect(readConstList(source, 'WARRANTY_STATUSES')).toEqual(API_WARRANTY_STATUSES);
    expect(readConstNumber(source, 'MAX_PARENT_DEPTH')).toBe(API_MAX_PARENT_DEPTH);
    expect(readConstNumber(source, 'WARRANTY_SOON_DAYS')).toBe(API_WARRANTY_SOON_DAYS);
  });
});
