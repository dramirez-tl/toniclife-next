'use client';

// contentShared — piezas comunes de "Contenido (español)" y "Traducciones (inglés)".
// El contenido rico es TEXTO PLANO (contrato §1.8): sin HTML ni editor
// enriquecido; los beneficios son una viñeta por línea. El API sanea al guardar
// y la tienda lo pinta siempre como nodos de texto.

import { z } from 'zod';
import type { ProductContent } from '@/services/products-admin.service';
import { textOrNull } from '../useSectionForm';

export const CONTENT_LIMITS = {
  tagline: 160,
  presentation: 120,
  long: 5000,
  bullets: 12,
  bulletLength: 300,
} as const;

const noHtml = (v: string) => !/<[^>]*>/.test(v);
const NO_HTML_MESSAGE = 'Solo texto: las etiquetas HTML se eliminan al guardar';

const longText = z
  .string()
  .max(CONTENT_LIMITS.long, `Máximo ${CONTENT_LIMITS.long} caracteres`)
  .refine(noHtml, NO_HTML_MESSAGE);

export const contentFieldsSchema = {
  tagline: z.string().max(CONTENT_LIMITS.tagline, `Máximo ${CONTENT_LIMITS.tagline} caracteres`).refine(noHtml, NO_HTML_MESSAGE),
  presentation: z
    .string()
    .max(CONTENT_LIMITS.presentation, `Máximo ${CONTENT_LIMITS.presentation} caracteres`)
    .refine(noHtml, NO_HTML_MESSAGE),
  benefits: longText.refine(
    (v) => toBulletLines(v).length <= CONTENT_LIMITS.bullets,
    `Máximo ${CONTENT_LIMITS.bullets} beneficios (uno por línea)`,
  ),
  ingredients: longText,
  usageInstructions: longText,
  warnings: longText,
};

export interface ContentFormValues {
  tagline: string;
  presentation: string;
  benefits: string;
  ingredients: string;
  usageInstructions: string;
  warnings: string;
}

export const CONTENT_FORM_KEYS: (keyof ContentFormValues)[] = [
  'tagline',
  'presentation',
  'benefits',
  'ingredients',
  'usageInstructions',
  'warnings',
];

export function contentToForm(content: ProductContent | null | undefined): ContentFormValues {
  return {
    tagline: content?.tagline ?? '',
    presentation: content?.presentation ?? '',
    benefits: content?.benefits ?? '',
    ingredients: content?.ingredients ?? '',
    usageInstructions: content?.usageInstructions ?? '',
    warnings: content?.warnings ?? '',
  };
}

/** El PUT reemplaza la fila completa del idioma: se mandan las 6 llaves (null = vacío). */
export function formToContent(values: ContentFormValues): ProductContent {
  return {
    tagline: textOrNull(values.tagline),
    presentation: textOrNull(values.presentation),
    benefits: textOrNull(values.benefits),
    ingredients: textOrNull(values.ingredients),
    usageInstructions: textOrNull(values.usageInstructions),
    warnings: textOrNull(values.warnings),
  };
}

/** Misma regla que `toBulletLines` del API: una viñeta por línea, sin prefijos ni vacías. */
export function toBulletLines(text: string): string[] {
  return text
    .split('\n')
    .map((line) => line.replace(/^\s*[-*•]\s+/, '').trim())
    .filter((line) => line.length > 0);
}

export function BulletPreview({ text, emptyLabel }: { text: string; emptyLabel: string }) {
  const lines = toBulletLines(text);
  return (
    <div className="rounded-lg border border-dashed border-gray-300 bg-gray-50 p-3">
      <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-600">
        Vista previa de viñetas ({lines.length}/{CONTENT_LIMITS.bullets})
      </p>
      {lines.length === 0 ? (
        <p className="text-sm text-gray-600">{emptyLabel}</p>
      ) : (
        <ul className="list-disc space-y-1 pl-5 text-sm text-gray-800">
          {lines.map((line, i) => (
            <li key={`${i}-${line}`} className={line.length > CONTENT_LIMITS.bulletLength ? 'text-amber-700' : undefined}>
              {line}
              {line.length > CONTENT_LIMITS.bulletLength ? ' (más de 300 caracteres: se recortará)' : ''}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export function ContentUnavailableNotice() {
  return (
    <div className="rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900" role="status">
      No se pudo cargar el contenido enriquecido de este producto. Los campos de esta parte quedan
      deshabilitados para no sobrescribir información; recarga la ficha para reintentar.
    </div>
  );
}
