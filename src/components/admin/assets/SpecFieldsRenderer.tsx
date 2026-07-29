'use client';

// SpecFieldsRenderer - Formulario dinámico de características técnicas.
//
// Los campos NO están hardcodeados: se generan desde el spec_template de la
// categoría elegida. Al seleccionar "Laptop" aparecen RAM, procesador,
// almacenamiento y gráficos; al elegir "Mouse" prácticamente nada.
//
// Validación imperativa (el repo no usa zod ni react-hook-form).

import { useMemo } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { SearchableSelect } from '@/components/ui/SearchableSelect';
import type { SpecFieldDef, SpecValues } from '@/types/asset';

interface SpecFieldsRendererProps {
  template: SpecFieldDef[];
  values: SpecValues;
  onChange: (values: SpecValues) => void;
  disabled?: boolean;
}

/** Ordena la plantilla por `order` y, a igualdad, por la posición original. */
export function sortSpecTemplate(template: SpecFieldDef[]): SpecFieldDef[] {
  return [...(template ?? [])]
    .map((f, i) => ({ f, i }))
    .sort((a, b) => (a.f.order ?? a.i) - (b.f.order ?? b.i) || a.i - b.i)
    .map(({ f }) => f);
}

/**
 * Al cambiar de categoría, conserva SOLO los valores cuya clave siga existiendo
 * en la nueva plantilla. Evita arrastrar specs huérfanas de la categoría previa.
 * Devuelve también las claves descartadas para poder avisar al usuario.
 */
export function reconcileSpecs(
  values: SpecValues,
  nextTemplate: SpecFieldDef[],
): { kept: SpecValues; dropped: string[] } {
  const allowed = new Set((nextTemplate ?? []).map((f) => f.key));
  const kept: SpecValues = {};
  const dropped: string[] = [];
  for (const [key, value] of Object.entries(values ?? {})) {
    if (allowed.has(key)) kept[key] = value;
    else if (value !== undefined && value !== null && value !== '') dropped.push(key);
  }
  return { kept, dropped };
}

/** Valida los valores contra la plantilla. Devuelve el primer error o null. */
export function validateSpecs(template: SpecFieldDef[], values: SpecValues): string | null {
  for (const field of template ?? []) {
    const raw = values?.[field.key];
    const empty = raw === undefined || raw === null || raw === '';
    if (empty) {
      if (field.required) return `La característica "${field.label}" es obligatoria`;
      continue;
    }
    if (field.type === 'number' && !Number.isFinite(Number(raw))) {
      return `La característica "${field.label}" debe ser numérica`;
    }
    if (field.type === 'date' && !/^\d{4}-\d{2}-\d{2}$/.test(String(raw))) {
      return `La característica "${field.label}" debe ser una fecha válida`;
    }
  }
  return null;
}

export function SpecFieldsRenderer({
  template,
  values,
  onChange,
  disabled,
}: SpecFieldsRendererProps) {
  const fields = useMemo(() => sortSpecTemplate(template), [template]);

  const set = (key: string, value: unknown) => onChange({ ...values, [key]: value });

  if (!fields.length) {
    return (
      <p className="rounded-md border border-dashed border-border p-4 text-sm text-muted-foreground">
        Esta categoría no tiene características técnicas configuradas. Puedes agregarlas en
        Activos → Categorías.
      </p>
    );
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {fields.map((field) => {
        const value = values?.[field.key];
        const label = (
          <Label htmlFor={`spec-${field.key}`}>
            {field.label}
            {field.unit ? <span className="text-muted-foreground"> ({field.unit})</span> : null}
            {field.required ? <span className="text-destructive"> *</span> : null}
          </Label>
        );

        if (field.type === 'boolean') {
          return (
            <div key={field.key} className="flex items-center gap-2 self-end pb-2">
              <Checkbox
                id={`spec-${field.key}`}
                checked={value === true}
                disabled={disabled}
                onCheckedChange={(checked) => set(field.key, checked === true)}
              />
              {label}
            </div>
          );
        }

        if (field.type === 'select') {
          return (
            <div key={field.key} className="grid gap-2">
              {label}
              <SearchableSelect
                options={(field.options ?? []).map((o) => ({ value: o, label: o }))}
                value={typeof value === 'string' ? value : ''}
                onChange={(v) => set(field.key, v)}
                placeholder={`Selecciona ${field.label.toLowerCase()}`}
                allLabel="Sin especificar"
                allValue=""
                disabled={disabled}
              />
            </div>
          );
        }

        return (
          <div key={field.key} className="grid gap-2">
            {label}
            <Input
              id={`spec-${field.key}`}
              type={field.type === 'number' ? 'number' : field.type === 'date' ? 'date' : 'text'}
              value={value === undefined || value === null ? '' : String(value)}
              disabled={disabled}
              onChange={(e) =>
                set(
                  field.key,
                  field.type === 'number'
                    ? e.target.value === ''
                      ? ''
                      : Number(e.target.value)
                    : e.target.value,
                )
              }
            />
          </div>
        );
      })}
    </div>
  );
}

/** Muestra las características en modo lectura (detalle del activo). */
export function SpecFieldsView({
  template,
  values,
}: {
  template: SpecFieldDef[];
  values: SpecValues;
}) {
  const fields = useMemo(() => sortSpecTemplate(template), [template]);
  const filled = fields.filter((f) => {
    const v = values?.[f.key];
    return v !== undefined && v !== null && v !== '';
  });

  if (!filled.length) {
    return (
      <p className="text-sm text-muted-foreground">
        Este equipo no tiene características técnicas capturadas.
      </p>
    );
  }

  return (
    <dl className="grid gap-x-8 gap-y-3 sm:grid-cols-2">
      {filled.map((field) => {
        const v = values[field.key];
        const text =
          field.type === 'boolean' ? (v === true ? 'Sí' : 'No') : `${String(v)}${field.unit ? ` ${field.unit}` : ''}`;
        return (
          <div key={field.key} className="flex justify-between gap-4 border-b border-border pb-2">
            <dt className="text-sm text-muted-foreground">{field.label}</dt>
            <dd className="text-sm font-medium">{text}</dd>
          </div>
        );
      })}
    </dl>
  );
}
