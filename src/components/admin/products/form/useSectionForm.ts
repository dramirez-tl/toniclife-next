'use client';

// useSectionForm — formulario de UNA sección de la ficha.
//
// react-hook-form + zod (validación en vivo, `mode: 'onChange'`). Guarda SOLO
// los campos tocados (`dirtyFields` → PATCH parcial; `null` para vaciar). Los
// valores del servidor entran por `values` con `keepDirtyValues`: un refetch no
// pisa lo que el usuario está editando.
//
// La sección se registra en el cascarón (punto ámbar, "Guardar todo", guard de
// salida). `beforeSave` permite pedir una confirmación (cambio de clave, motivo
// fiscal) antes de escribir: devolver `false` cancela sin error.

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useForm, useFormState, type DefaultValues, type FieldValues, type UseFormReturn } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import type { z } from 'zod';
import type { CreateProductDto } from '@/types/product';
import { productAdminErrorMessage } from '../lib/errors';
import { SECTION_LABEL, type ProductSectionId } from '../lib/labels';
import { useProductForm } from './ProductFormContext';

export type DirtyKeys<T> = Partial<Record<keyof T, boolean>>;

export interface SectionSaveArgs<T, E> {
  values: T;
  dirty: DirtyKeys<T>;
  /** Lo que devolvió `beforeSave` (p. ej. el motivo fiscal). */
  extra: E | undefined;
}

export interface UseSectionFormOptions<T extends FieldValues, E> {
  id: ProductSectionId;
  schema: z.ZodType<T, T>;
  /** Valores derivados del servidor (memorizados por quien llama). */
  values: T;
  save: (args: SectionSaveArgs<T, E>) => Promise<void>;
  beforeSave?: (args: { values: T; dirty: DirtyKeys<T> }) => Promise<E | false>;
  /** Solo alta: parte del POST /products que aporta esta sección. */
  toCreate?: (values: T) => Partial<CreateProductDto>;
  successMessage?: string;
}

export interface UseSectionFormResult<T extends FieldValues> {
  form: UseFormReturn<T, unknown, T>;
  isDirty: boolean;
  isSaving: boolean;
  isValid: boolean;
  readOnly: boolean;
  submit: () => Promise<boolean>;
  discard: () => void;
}

export function useSectionForm<T extends FieldValues, E = undefined>(
  options: UseSectionFormOptions<T, E>,
): UseSectionFormResult<T> {
  const { id, schema, values, save, beforeSave, toCreate, successMessage } = options;
  const { readOnly, registerSection, setSectionDirty } = useProductForm();
  const [isSaving, setIsSaving] = useState(false);

  const form = useForm<T, unknown, T>({
    resolver: zodResolver(schema),
    mode: 'onChange',
    defaultValues: values as DefaultValues<T>,
    values,
    resetOptions: { keepDirtyValues: true },
    disabled: readOnly,
  });

  const { isDirty, dirtyFields, isValid } = useFormState({ control: form.control });
  const dirtyKeys = useMemo<DirtyKeys<T>>(() => {
    const out: DirtyKeys<T> = {};
    for (const [key, flag] of Object.entries(dirtyFields)) {
      if (flag) out[key as keyof T] = true;
    }
    return out;
  }, [dirtyFields]);
  const hasChanges = isDirty && Object.keys(dirtyKeys).length > 0;

  const submit = useCallback(async (): Promise<boolean> => {
    if (readOnly) return false;
    if (!hasChanges) return true;
    let ok = false;
    await form.handleSubmit(
      async (current) => {
        let extra: E | undefined;
        if (beforeSave) {
          const confirmed = await beforeSave({ values: current, dirty: dirtyKeys });
          if (confirmed === false) return;
          extra = confirmed;
        }
        setIsSaving(true);
        try {
          await save({ values: current, dirty: dirtyKeys, extra });
          form.reset(current, { keepValues: true });
          toast.success(successMessage ?? `${SECTION_LABEL[id]}: cambios guardados`);
          ok = true;
        } catch (err) {
          toast.error(productAdminErrorMessage(err, `No se pudo guardar "${SECTION_LABEL[id]}"`));
        } finally {
          setIsSaving(false);
        }
      },
      () => {
        toast.error(`Revisa los campos marcados en "${SECTION_LABEL[id]}"`);
      },
    )();
    return ok;
  }, [beforeSave, dirtyKeys, form, hasChanges, id, readOnly, save, successMessage]);

  const discard = useCallback(() => {
    form.reset(values);
  }, [form, values]);

  const collectCreate = useCallback(async (): Promise<Partial<CreateProductDto> | null> => {
    if (!toCreate) return {};
    const valid = await form.trigger();
    if (!valid) return null;
    return toCreate(form.getValues());
  }, [form, toCreate]);

  // El cascarón siempre llama a la versión más reciente de los manejadores.
  const handlers = useRef({ submit, discard, collectCreate });
  useEffect(() => {
    handlers.current = { submit, discard, collectCreate };
  }, [submit, discard, collectCreate]);

  useEffect(
    () =>
      registerSection(id, {
        save: () => handlers.current.submit(),
        discard: () => handlers.current.discard(),
        collectCreate: () => handlers.current.collectCreate(),
      }),
    [id, registerSection],
  );

  // En el alta también se reporta: alimenta el guard de salida (la barra de
  // "Guardar todo" y los puntos ámbar solo se pintan en la ficha).
  useEffect(() => {
    setSectionDirty(id, hasChanges);
  }, [id, hasChanges, setSectionDirty]);
  useEffect(() => () => setSectionDirty(id, false), [id, setSectionDirty]);

  return { form, isDirty: hasChanges, isSaving, isValid, readOnly, submit, discard };
}

// ================================
// Conversores valor-de-formulario → DTO
// ================================

/** '' → null (vacía el campo en BD); si no, el texto recortado. */
export const textOrNull = (v: string): string | null => {
  const t = v.trim();
  return t === '' ? null : t;
};

/** '' → null; si no, número. La validación de formato ya la hizo zod. */
export const numberOrNull = (v: string): number | null => {
  const t = v.trim();
  if (t === '') return null;
  const n = Number(t);
  return Number.isFinite(n) ? n : null;
};

export const toFormText = (v: string | number | null | undefined): string =>
  v === null || v === undefined ? '' : String(v);
