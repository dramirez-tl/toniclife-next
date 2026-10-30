'use client';

// SizeGuideDialog - alta y edición de una guía de tallas (mig 178): datos
// generales, columnas de medidas (clave autogenerada desde la etiqueta, máximo
// 8), tallas con un valor por columna (máximo 30) y notas en ambos idiomas.
// Valida en el cliente lo mismo que el API (sin claves ni tallas repetidas,
// valores de máximo 20 caracteres) y muestra el 400/409 del API si aun así lo
// rechaza. Sin `<form>`: Enter en una celda no guarda la guía por accidente.

import { useId, useState } from 'react';
import { ListOrdered, Loader2, Plus, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { SearchableSelect } from '@/components/ui/SearchableSelect';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  SIZE_GUIDE_MAX_COLUMNS,
  SIZE_GUIDE_MAX_ROWS,
  SIZE_GUIDE_MAX_VALUE_LENGTH,
  SIZE_GUIDE_UNIT_LABEL,
  SIZE_GUIDE_UNIT_OPTIONS,
  SIZE_SUGGESTIONS,
  VARIANT_GENDER_OPTIONS,
  addColumn,
  addSizeRow,
  newSizeGuideForm,
  normalizeSize,
  removeColumn,
  removeRow,
  sizeGuideFormFromDto,
  sortRows,
  toSizeGuidePayload,
  updateColumnKey,
  updateColumnLabel,
  updateColumnLabelEn,
  updateRowSize,
  updateRowValue,
  validateSizeGuideForm,
  type SizeGuideFormValues,
} from '@/lib/product-families';
import type { SizeGuide, SizeGuideUnit } from '@/types/product-family';
import type { VariantGender } from '@/types/product';
import { productAdminErrorCode, productAdminErrorMessage } from '../lib/errors';
import { useCreateSizeGuide, useUpdateSizeGuide } from '../useProductFamilies';

interface SizeGuideDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Guía a editar; null o ausente = alta. */
  guide?: SizeGuide | null;
  /** Sin products:update: el diálogo solo muestra. */
  readOnly?: boolean;
  onSaved?: (guide: SizeGuide) => void;
}

export function SizeGuideDialog({ open, onOpenChange, guide = null, readOnly = false, onSaved }: SizeGuideDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-3xl">
        {open ? (
          <SizeGuideForm guide={guide} readOnly={readOnly} onClose={() => onOpenChange(false)} onSaved={onSaved} />
        ) : null}
      </DialogContent>
    </Dialog>
  );
}

interface SizeGuideFormProps {
  guide: SizeGuide | null;
  readOnly: boolean;
  onClose: () => void;
  onSaved?: (guide: SizeGuide) => void;
}

const isUnit = (v: string): v is SizeGuideUnit => v === 'cm' || v === 'in';
const isGenderOrEmpty = (v: string): v is VariantGender | '' =>
  v === '' || v === 'mujer' || v === 'hombre' || v === 'unisex';

/** Se monta al abrir: arranca con la guía recibida o con las columnas sugeridas. */
function SizeGuideForm({ guide, readOnly, onClose, onSaved }: SizeGuideFormProps) {
  const ids = useId();
  const create = useCreateSizeGuide();
  const update = useUpdateSizeGuide();
  const [form, setForm] = useState<SizeGuideFormValues>(() =>
    guide ? sizeGuideFormFromDto(guide) : newSizeGuideForm(),
  );
  const [errors, setErrors] = useState<string[]>([]);
  const [codeError, setCodeError] = useState<string | null>(null);
  const [newSize, setNewSize] = useState('');
  const isPending = create.isPending || update.isPending;

  const patch = (changes: Partial<SizeGuideFormValues>) => setForm((prev) => ({ ...prev, ...changes }));

  const handleAddColumn = () => {
    const next = addColumn(form);
    if (!next) {
      toast.error(`Máximo ${SIZE_GUIDE_MAX_COLUMNS} columnas de medidas.`);
      return;
    }
    setForm(next);
  };

  const handleAddSize = (size: string) => {
    const next = addSizeRow(form, size);
    if (!next) {
      const normalized = normalizeSize(size);
      toast.error(
        normalized === null
          ? 'Escribe la talla.'
          : form.rows.length >= SIZE_GUIDE_MAX_ROWS
            ? `Máximo ${SIZE_GUIDE_MAX_ROWS} tallas.`
            : `La talla ${normalized} ya está en la guía.`,
      );
      return;
    }
    setForm(next);
    setNewSize('');
  };

  const submit = async () => {
    if (readOnly || isPending) return;
    const problems = validateSizeGuideForm(form);
    setErrors(problems);
    if (problems.length > 0) return;
    setCodeError(null);
    const payload = toSizeGuidePayload(form);
    try {
      const saved = guide
        ? await update.mutateAsync({ id: guide.id, dto: payload })
        : await create.mutateAsync(payload);
      toast.success(
        guide
          ? `Guía ${saved.code} guardada (${saved.rows.length} tallas)`
          : `Guía ${saved.code} creada (${saved.rows.length} tallas)`,
      );
      onSaved?.(saved);
      onClose();
    } catch (err) {
      const code = productAdminErrorCode(err);
      if (code === 'PRD_SIZE_GUIDE_CODE_TAKEN') {
        setCodeError('Esa clave ya la usa otra guía de tallas.');
        return;
      }
      if (code === 'PRD_SIZE_GUIDE_INVALID') {
        setErrors([productAdminErrorMessage(err, 'El API rechazó la guía: revisa columnas y tallas.')]);
        return;
      }
      toast.error(productAdminErrorMessage(err, guide ? 'No se pudo guardar la guía' : 'No se pudo crear la guía'));
    }
  };

  const hasSize = (size: string) => form.rows.some((r) => normalizeSize(r.size) === size);
  const rowsFull = form.rows.length >= SIZE_GUIDE_MAX_ROWS;

  return (
    <div className="space-y-5">
      <DialogHeader>
        <DialogTitle>{guide ? `Guía de tallas ${guide.code}` : 'Nueva guía de tallas'}</DialogTitle>
        <DialogDescription>
          Tabla de medidas por talla que la tienda muestra junto al selector. Se liga a una o varias
          familias; una guía sin tallas no se muestra.
        </DialogDescription>
      </DialogHeader>

      {/* ---------- Datos generales ---------- */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-[minmax(0,180px)_minmax(0,1fr)]">
        <div className="space-y-1.5">
          <Label htmlFor={`${ids}-code`}>Clave</Label>
          <Input
            id={`${ids}-code`}
            value={form.code}
            onChange={(e) => {
              patch({ code: e.target.value.toUpperCase() });
              setCodeError(null);
            }}
            maxLength={40}
            className="font-mono"
            placeholder="PLAYERA-MUJER"
            autoComplete="off"
            disabled={readOnly}
            aria-required
            aria-invalid={!!codeError}
            aria-describedby={codeError ? `${ids}-code-error` : undefined}
          />
          {codeError ? (
            <p id={`${ids}-code-error`} className="text-xs font-medium text-red-700" role="alert">
              {codeError}
            </p>
          ) : null}
        </div>
        <div className="space-y-1.5">
          <Label htmlFor={`${ids}-name`}>Nombre</Label>
          <Input
            id={`${ids}-name`}
            value={form.name}
            onChange={(e) => patch({ name: e.target.value })}
            maxLength={120}
            placeholder="Playera de mujer"
            disabled={readOnly}
            aria-required
          />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="space-y-1.5">
          <Label htmlFor={`${ids}-name-en`}>Nombre en inglés</Label>
          <Input
            id={`${ids}-name-en`}
            value={form.nameEn}
            onChange={(e) => patch({ nameEn: e.target.value })}
            maxLength={120}
            placeholder="Women's t-shirt"
            disabled={readOnly}
            lang="en"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor={`${ids}-gender`}>Para quién</Label>
          <SearchableSelect
            id={`${ids}-gender`}
            options={VARIANT_GENDER_OPTIONS}
            value={form.gender}
            onChange={(v) => {
              if (isGenderOrEmpty(v)) patch({ gender: v });
            }}
            allLabel="Sin indicar"
            disabled={readOnly}
            className="w-full"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor={`${ids}-unit`}>Unidad</Label>
          <SearchableSelect
            id={`${ids}-unit`}
            options={SIZE_GUIDE_UNIT_OPTIONS}
            value={form.unit}
            onChange={(v) => {
              if (isUnit(v)) patch({ unit: v });
            }}
            showAllOption={false}
            disabled={readOnly}
            className="w-full"
          />
        </div>
      </div>

      <div className="flex items-start justify-between gap-4 rounded-lg border border-gray-200 p-3">
        <div className="min-w-0">
          <Label htmlFor={`${ids}-active`} className="cursor-pointer">
            Activa
          </Label>
          <p className="mt-0.5 text-xs text-gray-600">Inactiva: no se ofrece al ligar una familia.</p>
        </div>
        <Switch
          id={`${ids}-active`}
          checked={form.isActive}
          onCheckedChange={(checked) => patch({ isActive: checked })}
          disabled={readOnly}
          className="mt-0.5"
        />
      </div>

      {/* ---------- Columnas ---------- */}
      <fieldset className="space-y-2">
        <legend className="text-sm font-semibold text-gray-900">Columnas de medidas</legend>
        <div className="flex flex-wrap items-start justify-between gap-2">
          <p className="text-xs text-gray-600">
            Qué se mide en cada talla (pecho, largo, manga…). La clave se genera sola desde la etiqueta y
            se puede ajustar; máximo {SIZE_GUIDE_MAX_COLUMNS} columnas.
          </p>
          {readOnly ? null : (
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="shrink-0"
              onClick={handleAddColumn}
              disabled={form.columns.length >= SIZE_GUIDE_MAX_COLUMNS}
            >
              <Plus className="h-4 w-4" aria-hidden />
              Agregar columna
            </Button>
          )}
        </div>
        {form.columns.length === 0 ? (
          <p className="rounded-lg border border-dashed border-gray-300 px-3 py-3 text-center text-xs text-gray-600">
            Sin columnas: agrega al menos una medida.
          </p>
        ) : (
          <div className="space-y-2">
            <div className="hidden gap-2 text-xs font-medium text-gray-600 sm:grid sm:grid-cols-[1fr_1fr_1fr_2.5rem]">
              <span>Etiqueta</span>
              <span>Etiqueta en inglés</span>
              <span>Clave</span>
              <span />
            </div>
            {form.columns.map((c, i) => (
              <div key={i} className="grid grid-cols-1 gap-2 rounded-lg border border-gray-100 p-2 sm:grid-cols-[1fr_1fr_1fr_2.5rem] sm:border-0 sm:p-0">
                <Input
                  aria-label={`Etiqueta de la columna ${i + 1}`}
                  value={c.label}
                  onChange={(e) => setForm((prev) => updateColumnLabel(prev, i, e.target.value))}
                  maxLength={60}
                  placeholder="Pecho"
                  disabled={readOnly}
                />
                <Input
                  aria-label={`Etiqueta en inglés de la columna ${i + 1}`}
                  value={c.labelEn}
                  onChange={(e) => setForm((prev) => updateColumnLabelEn(prev, i, e.target.value))}
                  maxLength={60}
                  placeholder="Chest"
                  disabled={readOnly}
                  lang="en"
                />
                <Input
                  aria-label={`Clave de la columna ${i + 1}`}
                  value={c.key}
                  onChange={(e) => setForm((prev) => updateColumnKey(prev, i, e.target.value))}
                  maxLength={40}
                  className="font-mono"
                  placeholder="pecho"
                  disabled={readOnly}
                />
                {readOnly ? (
                  <span />
                ) : (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="justify-self-end px-2 text-gray-600 hover:text-red-700"
                    onClick={() => setForm((prev) => removeColumn(prev, i))}
                    aria-label={`Quitar columna ${c.label || i + 1}`}
                  >
                    <Trash2 className="h-4 w-4" aria-hidden />
                  </Button>
                )}
              </div>
            ))}
          </div>
        )}
      </fieldset>

      {/* ---------- Tallas ---------- */}
      <fieldset className="space-y-2">
        <legend className="text-sm font-semibold text-gray-900">Tallas y medidas</legend>
        <p className="text-xs text-gray-600">
          Una fila por talla, en {SIZE_GUIDE_UNIT_LABEL[form.unit].toLowerCase()}; cada valor admite hasta{' '}
          {SIZE_GUIDE_MAX_VALUE_LENGTH} caracteres (46, 46-48, 1/2). Máximo {SIZE_GUIDE_MAX_ROWS} tallas; se
          ordenan solas al guardar.
        </p>
        {form.rows.length === 0 ? (
          <p className="rounded-lg border border-dashed border-gray-300 px-3 py-3 text-center text-xs text-gray-600">
            Sin tallas todavía: una guía sin medidas no se muestra en la tienda.
          </p>
        ) : (
          <div className="overflow-x-auto rounded-lg border border-gray-200">
            <table className="w-full min-w-[420px] text-sm">
              <thead className="bg-gray-50 text-xs text-gray-600">
                <tr>
                  <th scope="col" className="px-2 py-1.5 text-left font-medium">
                    Talla
                  </th>
                  {form.columns.map((c, ci) => (
                    <th key={ci} scope="col" className="px-2 py-1.5 text-left font-medium">
                      {c.label.trim() || c.key || `Columna ${ci + 1}`}
                    </th>
                  ))}
                  <th scope="col" className="w-10 px-1 py-1.5">
                    <span className="sr-only">Quitar</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {form.rows.map((r, i) => (
                  <tr key={i} className="border-t border-gray-100">
                    <td className="px-2 py-1">
                      <Input
                        aria-label={`Talla del renglón ${i + 1}`}
                        value={r.size}
                        onChange={(e) => setForm((prev) => updateRowSize(prev, i, e.target.value))}
                        maxLength={20}
                        className="h-8 w-24 font-mono"
                        disabled={readOnly}
                      />
                    </td>
                    {form.columns.map((c, ci) => (
                      <td key={ci} className="px-2 py-1">
                        <Input
                          aria-label={`${c.label.trim() || c.key || `Columna ${ci + 1}`} de la talla ${r.size || i + 1}`}
                          value={r.values[c.key] ?? ''}
                          onChange={(e) => setForm((prev) => updateRowValue(prev, i, c.key, e.target.value))}
                          maxLength={SIZE_GUIDE_MAX_VALUE_LENGTH}
                          inputMode="decimal"
                          className="h-8 w-24"
                          disabled={readOnly}
                        />
                      </td>
                    ))}
                    <td className="px-1 py-1 text-right">
                      {readOnly ? null : (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="px-2 text-gray-600 hover:text-red-700"
                          onClick={() => setForm((prev) => removeRow(prev, i))}
                          aria-label={`Quitar talla ${r.size || i + 1}`}
                        >
                          <Trash2 className="h-4 w-4" aria-hidden />
                        </Button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {readOnly ? null : (
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-medium text-gray-700">Agregar talla:</span>
            {SIZE_SUGGESTIONS.map((s) => (
              <Button
                key={s}
                type="button"
                variant="outline"
                size="sm"
                onClick={() => handleAddSize(s)}
                disabled={hasSize(s) || rowsFull}
              >
                {s}
              </Button>
            ))}
            <div className="flex items-center gap-1">
              <Input
                aria-label="Otra talla"
                value={newSize}
                onChange={(e) => setNewSize(e.target.value.toUpperCase())}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddSize(newSize);
                  }
                }}
                maxLength={20}
                placeholder="XXL, 28…"
                className="h-8 w-28 font-mono"
                disabled={rowsFull}
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => handleAddSize(newSize)}
                disabled={newSize.trim() === '' || rowsFull}
              >
                <Plus className="h-4 w-4" aria-hidden />
                Agregar
              </Button>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setForm((prev) => sortRows(prev))}
              disabled={form.rows.length < 2}
            >
              <ListOrdered className="h-4 w-4" aria-hidden />
              Ordenar tallas
            </Button>
          </div>
        )}
      </fieldset>

      {/* ---------- Notas ---------- */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor={`${ids}-notes`}>Notas (español)</Label>
          <Textarea
            id={`${ids}-notes`}
            value={form.notes}
            onChange={(e) => patch({ notes: e.target.value })}
            maxLength={1000}
            rows={3}
            placeholder="Cómo medir, tolerancias…"
            disabled={readOnly}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor={`${ids}-notes-en`}>Notas (inglés)</Label>
          <Textarea
            id={`${ids}-notes-en`}
            value={form.notesEn}
            onChange={(e) => patch({ notesEn: e.target.value })}
            maxLength={1000}
            rows={3}
            placeholder="How to measure, tolerances…"
            disabled={readOnly}
            lang="en"
          />
        </div>
      </div>

      {errors.length > 0 ? (
        <ul className="list-disc space-y-1 rounded-lg border border-red-200 bg-red-50 px-4 py-2 pl-8 text-sm text-red-800" role="alert">
          {errors.map((message) => (
            <li key={message}>{message}</li>
          ))}
        </ul>
      ) : null}

      <DialogFooter>
        <Button type="button" variant="ghost" onClick={onClose} disabled={isPending}>
          {readOnly ? 'Cerrar' : 'Cancelar'}
        </Button>
        {readOnly ? null : (
          <Button type="button" onClick={() => void submit()} disabled={isPending} aria-busy={isPending}>
            {isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden /> : null}
            {isPending ? 'Guardando…' : guide ? 'Guardar cambios' : 'Crear guía'}
          </Button>
        )}
      </DialogFooter>
    </div>
  );
}
