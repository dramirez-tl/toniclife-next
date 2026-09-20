'use client';

// useServerForm.ts — estado local de una sección sincronizado con el servidor:
// `baseline` = lo que devolvió el API; `form` = lo que edita el distribuidor.
// Cuando llega una respuesta nueva se adopta SOLO si no hay cambios locales
// (no pisa lo que se está escribiendo). `dirty` compara ambos.
//
// La adopción se hace "durante el render" (patrón de React para derivar estado
// de props) en vez de en un efecto, para no encadenar renders.

import { useMemo, useState, type Dispatch, type SetStateAction } from 'react';

export function useServerForm<TData, TForm>(
  data: TData,
  fromData: (data: TData) => TForm,
): {
  form: TForm;
  setForm: Dispatch<SetStateAction<TForm>>;
  baseline: TForm;
  dirty: boolean;
} {
  const next = useMemo(() => fromData(data), [data, fromData]);
  const [form, setForm] = useState<TForm>(next);
  const [baseline, setBaseline] = useState<TForm>(next);

  const nextStr = JSON.stringify(next);
  const baseStr = JSON.stringify(baseline);
  if (nextStr !== baseStr) {
    if (JSON.stringify(form) === baseStr) setForm(next);
    setBaseline(next);
  }

  const dirty = useMemo(() => JSON.stringify(form) !== JSON.stringify(baseline), [form, baseline]);

  return { form, setForm, baseline, dirty };
}
