'use client';

// FamilyDialog - alta y edición de una familia de producto (mig 178) en un
// diálogo: clave, nombre, nombre en inglés y guía de tallas; en Familias y
// tallas además "activa" y "orden". `compact` (desde la ficha del producto) los
// oculta: la familia nace activa y con orden 0. Con `readOnly` solo muestra.

import { useId, useMemo, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
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
  EMPTY_FAMILY_FORM,
  familyFormFromDto,
  guideHasMeasures,
  toFamilyPayload,
  validateFamilyForm,
  type FamilyFormValues,
} from '@/lib/product-families';
import type { ProductFamily } from '@/types/product-family';
import { productAdminErrorCode, productAdminErrorMessage } from '../lib/errors';
import { useCreateProductFamily, useSizeGuides, useUpdateProductFamily } from '../useProductFamilies';

interface FamilyDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Familia a editar; null o ausente = alta. */
  family?: ProductFamily | null;
  /** Desde la ficha del producto: sin "activa" ni "orden". */
  compact?: boolean;
  /** Sin products:update: el diálogo solo muestra. */
  readOnly?: boolean;
  onSaved?: (family: ProductFamily) => void;
}

export function FamilyDialog({
  open,
  onOpenChange,
  family = null,
  compact = false,
  readOnly = false,
  onSaved,
}: FamilyDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        {open ? (
          <FamilyForm
            family={family}
            compact={compact}
            readOnly={readOnly}
            onClose={() => onOpenChange(false)}
            onSaved={onSaved}
          />
        ) : null}
      </DialogContent>
    </Dialog>
  );
}

interface FamilyFormProps {
  family: ProductFamily | null;
  compact: boolean;
  readOnly: boolean;
  onClose: () => void;
  onSaved?: (family: ProductFamily) => void;
}

/** Se monta al abrir: el formulario siempre arranca con la familia recibida (o vacío). */
function FamilyForm({ family, compact, readOnly, onClose, onSaved }: FamilyFormProps) {
  const ids = useId();
  const create = useCreateProductFamily();
  const update = useUpdateProductFamily();
  const guides = useSizeGuides({ includeInactive: true });
  const [values, setValues] = useState<FamilyFormValues>(() =>
    family ? familyFormFromDto(family) : EMPTY_FAMILY_FORM,
  );
  const [errors, setErrors] = useState<string[]>([]);
  const [codeError, setCodeError] = useState<string | null>(null);
  const isPending = create.isPending || update.isPending;

  const patch = (changes: Partial<FamilyFormValues>) => setValues((prev) => ({ ...prev, ...changes }));

  // Guías activas + la que ya tiene la familia aunque esté inactiva.
  const guideOptions = useMemo(
    () =>
      (guides.data ?? [])
        .filter((g) => g.isActive || g.id === values.sizeGuideId)
        .map((g) => ({
          value: g.id,
          label: g.isActive ? g.name : `${g.name} (inactiva)`,
          hint: `${g.code} · ${guideHasMeasures(g) ? `${g.rows.length} tallas` : 'sin medidas'}`,
        })),
    [guides.data, values.sizeGuideId],
  );
  const selectedGuide = (guides.data ?? []).find((g) => g.id === values.sizeGuideId) ?? null;

  const submit = async () => {
    if (readOnly || isPending) return;
    const problems = validateFamilyForm(values);
    setErrors(problems);
    if (problems.length > 0) return;
    setCodeError(null);
    const payload = toFamilyPayload(values);
    try {
      const saved = family
        ? await update.mutateAsync({ id: family.id, dto: payload })
        : await create.mutateAsync(payload);
      toast.success(family ? `Familia ${saved.code} guardada` : `Familia ${saved.code} creada`);
      onSaved?.(saved);
      onClose();
    } catch (err) {
      if (productAdminErrorCode(err) === 'PRD_FAMILY_CODE_TAKEN') {
        setCodeError('Esa clave ya la usa otra familia.');
        return;
      }
      toast.error(productAdminErrorMessage(err, family ? 'No se pudo guardar la familia' : 'No se pudo crear la familia'));
    }
  };

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        void submit();
      }}
      className="space-y-4"
    >
      <DialogHeader>
        <DialogTitle>{family ? `Familia ${family.code}` : 'Nueva familia'}</DialogTitle>
        <DialogDescription>
          Una familia agrupa las variantes de un mismo diseño (la playera rosa en CH, M y G). Cada talla
          sigue siendo un producto con su clave, su precio y su existencia.
        </DialogDescription>
      </DialogHeader>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-[minmax(0,160px)_minmax(0,1fr)]">
        <div className="space-y-1.5">
          <Label htmlFor={`${ids}-code`}>Clave</Label>
          <Input
            id={`${ids}-code`}
            value={values.code}
            onChange={(e) => {
              patch({ code: e.target.value.toUpperCase() });
              setCodeError(null);
            }}
            maxLength={40}
            className="font-mono"
            placeholder="PLR"
            autoComplete="off"
            disabled={readOnly}
            aria-required
            aria-invalid={!!codeError}
            aria-describedby={codeError ? `${ids}-code-error` : `${ids}-code-help`}
          />
          {codeError ? (
            <p id={`${ids}-code-error`} className="text-xs font-medium text-red-700" role="alert">
              {codeError}
            </p>
          ) : (
            <p id={`${ids}-code-help`} className="text-xs text-gray-600">
              2 a 40: letras, números, guion.
            </p>
          )}
        </div>
        <div className="space-y-1.5">
          <Label htmlFor={`${ids}-name`}>Nombre</Label>
          <Input
            id={`${ids}-name`}
            value={values.name}
            onChange={(e) => patch({ name: e.target.value })}
            maxLength={200}
            placeholder="Playera Oficial Tonic Life"
            disabled={readOnly}
            aria-required
          />
        </div>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor={`${ids}-name-en`}>Nombre en inglés</Label>
        <Input
          id={`${ids}-name-en`}
          value={values.nameEn}
          onChange={(e) => patch({ nameEn: e.target.value })}
          maxLength={255}
          placeholder="Official Tonic Life T-shirt"
          disabled={readOnly}
          lang="en"
        />
        <p className="text-xs text-gray-600">Lo ve la tienda en inglés; si falta, usa el nombre en español.</p>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor={`${ids}-guide`}>Guía de tallas</Label>
        <SearchableSelect
          id={`${ids}-guide`}
          options={guideOptions}
          value={values.sizeGuideId}
          onChange={(v) => patch({ sizeGuideId: v })}
          allLabel="Sin guía de tallas"
          placeholder="Buscar guía…"
          disabled={readOnly}
          className="w-full"
        />
        <p className="text-xs text-gray-600">
          {selectedGuide && !guideHasMeasures(selectedGuide)
            ? `La guía ${selectedGuide.name} no tiene medidas todavía: la tienda no la mostrará hasta cargarlas.`
            : 'La tabla de medidas que la tienda muestra junto al selector de talla. Opcional.'}
        </p>
      </div>

      {compact ? null : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="flex items-start justify-between gap-4 rounded-lg border border-gray-200 p-3">
            <div className="min-w-0">
              <Label htmlFor={`${ids}-active`} className="cursor-pointer">
                Activa
              </Label>
              <p className="mt-0.5 text-xs text-gray-600">Inactiva: no se ofrece al asignar familia en la ficha.</p>
            </div>
            <Switch
              id={`${ids}-active`}
              checked={values.isActive}
              onCheckedChange={(checked) => patch({ isActive: checked })}
              disabled={readOnly}
              className="mt-0.5"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor={`${ids}-order`}>Orden</Label>
            <Input
              id={`${ids}-order`}
              value={values.sortOrder}
              onChange={(e) => patch({ sortOrder: e.target.value.replace(/[^\d]/g, '') })}
              inputMode="numeric"
              maxLength={6}
              disabled={readOnly}
            />
            <p className="text-xs text-gray-600">Menor número = aparece antes en los listados.</p>
          </div>
        </div>
      )}

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
          <Button type="submit" disabled={isPending} aria-busy={isPending}>
            {isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden /> : null}
            {isPending ? 'Guardando…' : family ? 'Guardar cambios' : 'Crear familia'}
          </Button>
        )}
      </DialogFooter>
    </form>
  );
}
