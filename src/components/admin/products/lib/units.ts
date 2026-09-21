// units.ts — opciones del selector de unidad de medida de la ficha.

export interface UnitLike {
  id: string;
  code: string;
  name: string;
}

export interface UnitOption {
  value: string;
  label: string;
  hint?: string;
}

/**
 * Opciones ordenadas por nombre. Si el producto trae una unidad que el catálogo
 * no lista (p. ej. desactivada), se conserva como opción para no perderla al
 * guardar otros campos ni mostrar el selector vacío.
 */
export function buildUnitOptions(units: UnitLike[], currentUnitId: string | null | undefined): UnitOption[] {
  const options: UnitOption[] = units
    .filter((u) => u.id)
    .map((u) => ({ value: u.id, label: u.name || u.code || u.id, hint: u.name && u.code ? u.code : undefined }))
    .sort((a, b) => a.label.localeCompare(b.label, 'es'));
  const current = (currentUnitId ?? '').trim();
  if (current !== '' && !options.some((o) => o.value === current)) {
    options.push({ value: current, label: 'Unidad actual (no está en el catálogo)', hint: current.slice(0, 8) });
  }
  return options;
}
