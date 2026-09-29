// warranty.test.ts — etiquetas/variantes de garantía, categoría sugerida del
// componente y detección de los mensajes de guarda del API.

import { describe, expect, it } from 'vitest';
import {
  COMPONENT_DEFAULT_CATEGORY_BY_PARENT,
  DISK_CATEGORY_CODE,
  WARRANTY_STATUSES,
  WARRANTY_STATUS_LABELS,
  WARRANTY_STATUS_VARIANTS,
  defaultComponentCategoryCode,
  isParentLinkError,
} from './warranty';

describe('estado de garantía', () => {
  it('cada estado tiene etiqueta y variante (ni más ni menos)', () => {
    expect(Object.keys(WARRANTY_STATUS_LABELS).sort()).toEqual([...WARRANTY_STATUSES].sort());
    expect(Object.keys(WARRANTY_STATUS_VARIANTS).sort()).toEqual([...WARRANTY_STATUSES].sort());
    for (const s of WARRANTY_STATUSES) expect(WARRANTY_STATUS_LABELS[s].length).toBeGreaterThan(0);
  });

  it('vencida se ve en rojo, por vencer en ámbar, vigente en verde', () => {
    expect(WARRANTY_STATUS_VARIANTS.vencida).toBe('destructive');
    expect(WARRANTY_STATUS_VARIANTS.por_vencer).toBe('warning');
    expect(WARRANTY_STATUS_VARIANTS.vigente).toBe('success');
    expect(WARRANTY_STATUS_VARIANTS.sin_dato).toBe('secondary');
  });
});

describe('categoría sugerida al registrar un componente', () => {
  it('DVR / SERVIDOR / CPU → disco duro; el resto sin sugerencia', () => {
    expect(defaultComponentCategoryCode('DVR')).toBe(DISK_CATEGORY_CODE);
    expect(defaultComponentCategoryCode('SERVIDOR')).toBe(DISK_CATEGORY_CODE);
    expect(defaultComponentCategoryCode('CPU')).toBe(DISK_CATEGORY_CODE);
    expect(defaultComponentCategoryCode('LAPTOP')).toBeNull();
    expect(defaultComponentCategoryCode('MONITOR')).toBeNull();
  });

  it('tolera minúsculas y valores vacíos', () => {
    expect(defaultComponentCategoryCode('dvr')).toBe(DISK_CATEGORY_CODE);
    expect(defaultComponentCategoryCode(null)).toBeNull();
    expect(defaultComponentCategoryCode(undefined)).toBeNull();
    expect(defaultComponentCategoryCode('')).toBeNull();
  });

  it('todas las sugerencias apuntan a la categoría de discos', () => {
    expect(DISK_CATEGORY_CODE).toBe('DISCO_DURO');
    for (const code of Object.values(COMPONENT_DEFAULT_CATEGORY_BY_PARENT)) {
      expect(code).toBe(DISK_CATEGORY_CODE);
    }
  });
});

describe('mensajes de guarda del vínculo padre ↔ componente', () => {
  // Mensajes exactos del API (lib/asset-components.lib.ts → validateParentLink).
  const API_MESSAGES = [
    'El equipo padre no existe o está dado de baja',
    'Un activo no puede ser su propio activo padre',
    'El activo está dado de baja; restáuralo antes de vincularlo a un equipo',
    'El árbol de componentes del equipo padre es inconsistente (ciclo); avisa a Sistemas',
    'La categoría del equipo padre es de insumos: no puede tener componentes',
    'Ese vínculo crearía un ciclo (el equipo padre ya cuelga de este activo)',
    'Solo se permiten 3 niveles de componentes debajo del equipo (equipo → componente → subcomponente → pieza)',
  ];

  it('reconoce los 7 mensajes del API', () => {
    for (const m of API_MESSAGES) expect(isParentLinkError(m)).toBe(true);
  });

  it('no confunde otros errores ni valores vacíos', () => {
    expect(isParentLinkError('Activo no encontrado')).toBe(false);
    expect(isParentLinkError('La etiqueta ya está vinculada a otro equipo')).toBe(false);
    expect(isParentLinkError('')).toBe(false);
    expect(isParentLinkError(null)).toBe(false);
    expect(isParentLinkError(undefined)).toBe(false);
  });
});
