// Detalle/edición de una promoción canjeable por puntos.
//
// ESTRUCTURA (rediseño jul-2026 — pedido del cliente: "que quede claro qué
// quedó para cada país"):
//   1. Datos generales (BASE/global): código, switches y el contenido que se
//      usa donde el país no personaliza.
//   2. Componentes Globales: la lista que aplica en países SIN lista propia.
//   3. UNA TARJETA POR PAÍS con TODO lo de ese país junto:
//      regla de canje + lo que ve el distribuidor (nombre/descr.) +
//      componentes propios.
// La resolución en runtime: componentes del país si existen (mig 099), si no
// los globales; nombre/descr. del país si la regla los define (mig 100), si
// no los base.
'use client';

import { use, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  ArrowLeftIcon,
  SparklesIcon,
  MagnifyingGlassIcon,
  PlusIcon,
  TrashIcon,
  CheckIcon,
  GlobeAmericasIcon,
  PhotoIcon,
  ArrowUpTrayIcon,
} from '@heroicons/react/24/outline';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import {
  usePromotion,
  usePromotionComponents,
  usePromotionRules,
  useReplacePromotionComponents,
  useUpsertPromotionRule,
  useRemovePromotionRule,
  useUploadPromotionRuleImage,
} from '@/hooks/usePromotions';
import { useProducts, useUpdateProduct } from '@/hooks/useProducts';
import { useActiveCountries } from '@/hooks/useConfig';
import { ProductType } from '@/types/product';
import type { Product } from '@/types/product';
import type {
  BulkPromotionComponentItem,
  PromotionRule,
} from '@/types/promotion';

type CompRow = BulkPromotionComponentItem & {
  productName: string;
  productCode: string;
};

const apiMsg = (err: unknown, fallback: string) =>
  (err as { response?: { data?: { message?: string } } })?.response?.data
    ?.message ?? fallback;

// ================================================================
// Compositor de componentes reutilizable (Global o un país).
// Hooks propios: cada instancia carga y guarda SU alcance.
// ================================================================
function ComponentsEditor({
  promotionId,
  scope,
  scopeLabel,
  emptyHint,
}: {
  promotionId: string;
  /** 'global' o UUID de país. */
  scope: string;
  scopeLabel: string;
  emptyHint: string;
}) {
  const { data: components, isLoading } = usePromotionComponents(
    promotionId,
    scope,
  );
  const replaceComponents = useReplacePromotionComponents(promotionId);

  const [rows, setRows] = useState<CompRow[]>([]);
  const [dirty, setDirty] = useState(false);
  const [productSearch, setProductSearch] = useState('');

  useEffect(() => {
    if (components) {
      setRows(
        components.map((c) => ({
          componentProductId: c.componentProductId ?? '',
          productName: c.componentProductName ?? '',
          productCode: c.componentProductCode ?? '',
          quantity: Number(c.quantity),
          sortOrder: c.sortOrder,
        })),
      );
      setDirty(false);
    }
  }, [components]);

  const { data: productSearchResults } = useProducts(
    productSearch.trim().length >= 2
      ? {
          search: productSearch,
          isActive: true,
          limit: 10,
          productType: ProductType.FINISHED_GOOD,
        }
      : { limit: 0 },
  );

  const addComponent = (p: Product) => {
    if (rows.some((r) => r.componentProductId === p.id)) {
      toast.warning('Ese producto ya está en la lista');
      return;
    }
    setRows((prev) => [
      ...prev,
      {
        componentProductId: p.id,
        productName: p.name,
        productCode: p.code,
        quantity: 1,
        sortOrder: prev.length,
      },
    ]);
    setDirty(true);
    setProductSearch('');
  };

  const removeRow = (productId: string) => {
    setRows((prev) => prev.filter((r) => r.componentProductId !== productId));
    setDirty(true);
  };

  const updateQty = (productId: string, qty: number) => {
    setRows((prev) =>
      prev.map((r) =>
        r.componentProductId === productId ? { ...r, quantity: qty } : r,
      ),
    );
    setDirty(true);
  };

  const handleSave = async () => {
    try {
      await replaceComponents.mutateAsync({
        components: rows.map((r, i) => ({
          componentProductId: r.componentProductId,
          quantity: r.quantity,
          sortOrder: i,
        })),
        countryId: scope === 'global' ? undefined : scope,
      });
      setDirty(false);
      toast.success(`Componentes guardados (${scopeLabel})`);
    } catch (err: unknown) {
      toast.error(apiMsg(err, 'Error al guardar componentes'));
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-gray-800">
          Componentes ({rows.length})
          {dirty && (
            <span className="ml-2 text-xs font-normal text-amber-600">
              — sin guardar
            </span>
          )}
        </h3>
        <Button
          variant={dirty ? 'default' : 'outline'}
          size="sm"
          onClick={handleSave}
          disabled={replaceComponents.isPending || isLoading}
        >
          {replaceComponents.isPending && (
            <Loader2 className="mr-1 size-3 animate-spin" />
          )}
          <CheckIcon className="h-3.5 w-3.5" />
          Guardar
        </Button>
      </div>

      <div className="relative">
        <MagnifyingGlassIcon className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <input
          type="text"
          value={productSearch}
          onChange={(e) => setProductSearch(e.target.value)}
          placeholder="Buscar producto para agregar..."
          className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-[#3E667D]"
        />
        {productSearch.trim().length >= 2 &&
          productSearchResults?.data &&
          productSearchResults.data.length > 0 && (
            <div className="absolute z-10 mt-1 w-full bg-white border border-gray-200 rounded-md shadow-lg max-h-64 overflow-y-auto">
              {productSearchResults.data.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => addComponent(p)}
                  className="w-full text-left px-3 py-2 hover:bg-gray-50 flex items-center justify-between"
                >
                  <div>
                    <div className="text-sm font-medium">{p.name}</div>
                    <div className="text-xs text-gray-500 font-mono">
                      {p.code}
                    </div>
                  </div>
                  <PlusIcon className="h-4 w-4 text-[#3E667D]" />
                </button>
              ))}
            </div>
          )}
      </div>

      {isLoading ? (
        <p className="py-4 text-center text-sm text-gray-400">Cargando…</p>
      ) : rows.length === 0 ? (
        <div className="rounded-lg border-2 border-dashed p-4 text-center text-xs text-gray-500">
          {emptyHint}
        </div>
      ) : (
        <div className="space-y-2">
          {rows.map((row) => (
            <div
              key={row.componentProductId}
              className="flex items-center gap-3 rounded-md border border-gray-200 p-2.5 hover:bg-gray-50"
            >
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-medium">
                  {row.productName}
                </div>
                <div className="text-xs text-gray-500 font-mono">
                  {row.productCode}
                </div>
              </div>
              <div className="flex items-center gap-1.5">
                <label className="text-xs text-gray-500">Cant:</label>
                <input
                  type="number"
                  min={0.0001}
                  step={0.0001}
                  value={row.quantity}
                  onChange={(e) =>
                    updateQty(row.componentProductId, Number(e.target.value))
                  }
                  className="w-20 rounded border border-gray-300 px-2 py-1 text-right text-sm"
                />
              </div>
              <button
                type="button"
                onClick={() => removeRow(row.componentProductId)}
                className="p-1 text-red-500 hover:text-red-700"
                title="Quitar"
              >
                <TrashIcon className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ================================================================
// Tarjeta de UN PAÍS: regla de canje + lo que ve el distribuidor +
// componentes del país — todo junto para que se vea qué quedó dónde.
// ================================================================
function CountryCard({
  promotionId,
  rule,
  baseName,
  baseShortName,
  baseDescription,
  baseImageUrl,
}: {
  promotionId: string;
  rule: PromotionRule;
  baseName: string;
  baseShortName: string;
  baseDescription: string;
  /** Imagen principal del producto (respaldo cuando el país no define la suya). */
  baseImageUrl?: string;
}) {
  const upsertRule = useUpsertPromotionRule(promotionId);
  const removeRule = useRemovePromotionRule(promotionId);
  const uploadImage = useUploadPromotionRuleImage(promotionId);
  const imageInputRef = useRef<HTMLInputElement>(null);

  const [min, setMin] = useState(Number(rule.minPointsRequired));
  const [validity, setValidity] = useState(rule.validityDays ?? 90);
  const [recurrence, setRecurrence] = useState<'per_period' | 'one_time'>(
    rule.recurrence ?? 'per_period',
  );
  const [from, setFrom] = useState(rule.availableFrom ?? '');
  const [to, setTo] = useState(rule.availableTo ?? '');
  const [consumes, setConsumes] = useState(rule.consumesPoints);
  const [dName, setDName] = useState(rule.displayName ?? '');
  const [dShortName, setDShortName] = useState(rule.displayShortName ?? '');
  const [dDescription, setDDescription] = useState(
    rule.displayDescription ?? '',
  );

  useEffect(() => {
    setMin(Number(rule.minPointsRequired));
    setValidity(rule.validityDays ?? 90);
    setRecurrence(rule.recurrence ?? 'per_period');
    setFrom(rule.availableFrom ?? '');
    setTo(rule.availableTo ?? '');
    setConsumes(rule.consumesPoints);
    setDName(rule.displayName ?? '');
    setDShortName(rule.displayShortName ?? '');
    setDDescription(rule.displayDescription ?? '');
  }, [rule]);

  const countryLabel = rule.countryName ?? rule.countryCode ?? 'País';

  const handleSave = async () => {
    if (min <= 0) {
      toast.error('El umbral de puntos debe ser mayor a 0');
      return;
    }
    if (validity <= 0) {
      toast.error('La vigencia debe ser mayor a 0 días');
      return;
    }
    try {
      await upsertRule.mutateAsync({
        countryId: rule.countryId,
        minPointsRequired: min,
        validityDays: validity,
        recurrence,
        availableFrom: from || null,
        availableTo: to || null,
        consumesPoints: consumes,
        isActive: true,
        displayName: dName.trim() || null,
        displayShortName: dShortName.trim() || null,
        displayDescription: dDescription.trim() || null,
      });
      toast.success(`${countryLabel}: configuración guardada`);
    } catch (err: unknown) {
      toast.error(apiMsg(err, 'Error al guardar la configuración del país'));
    }
  };

  const handleRemove = async () => {
    try {
      await removeRule.mutateAsync(rule.countryId);
      toast.success(`${countryLabel}: regla desactivada`);
    } catch (err: unknown) {
      toast.error(apiMsg(err, 'Error al desactivar la regla'));
    }
  };

  const handleUploadImage = async (file: File | undefined) => {
    if (!file) return;
    try {
      await uploadImage.mutateAsync({ countryId: rule.countryId, file });
      toast.success(`${countryLabel}: imagen del país actualizada`);
    } catch (err: unknown) {
      toast.error(apiMsg(err, 'Error al subir la imagen del país'));
    } finally {
      if (imageInputRef.current) imageInputRef.current.value = '';
    }
  };

  // Quitar el override de imagen = volver a la imagen base del producto.
  // Manda el payload completo de la regla (upsert) + displayImageUrl null.
  const handleClearImage = async () => {
    try {
      await upsertRule.mutateAsync({
        countryId: rule.countryId,
        minPointsRequired: min,
        validityDays: validity,
        recurrence,
        availableFrom: from || null,
        availableTo: to || null,
        consumesPoints: consumes,
        isActive: true,
        displayName: dName.trim() || null,
        displayShortName: dShortName.trim() || null,
        displayDescription: dDescription.trim() || null,
        displayImageUrl: null,
      });
      toast.success(`${countryLabel}: se usará la imagen base del producto`);
    } catch (err: unknown) {
      toast.error(apiMsg(err, 'Error al quitar la imagen del país'));
    }
  };

  const inputCls =
    'w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-[#3E667D]';

  return (
    <Card className={rule.isActive ? '' : 'opacity-70'}>
      <CardContent className="p-6 space-y-4">
        {/* Header del país */}
        <div className="flex flex-wrap items-center justify-between gap-2 border-b pb-3">
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-semibold">{countryLabel}</h2>
            {rule.countryCode && (
              <span className="rounded bg-gray-100 px-2 py-0.5 font-mono text-xs text-gray-600">
                {rule.countryCode}
              </span>
            )}
            <span
              className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
                rule.isActive
                  ? 'bg-green-100 text-green-700'
                  : 'bg-red-100 text-red-700'
              }`}
            >
              {rule.isActive ? 'Activa' : 'Inactiva'}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="default"
              size="sm"
              onClick={handleSave}
              disabled={upsertRule.isPending}
            >
              {upsertRule.isPending && (
                <Loader2 className="mr-1 size-3 animate-spin" />
              )}
              <CheckIcon className="h-3.5 w-3.5" />
              Guardar {countryLabel}
            </Button>
            {rule.isActive && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleRemove}
                disabled={removeRule.isPending}
                className="text-destructive border-destructive/40 hover:bg-destructive/5"
              >
                Desactivar
              </Button>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          {/* Columna izquierda: regla + personalización */}
          <div className="space-y-4">
            <div>
              <h3 className="text-sm font-semibold text-gray-800 mb-2">
                Regla de canje
              </h3>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-gray-600 mb-1">
                    Puntos mínimos
                  </label>
                  <input
                    type="number"
                    min={0}
                    step={1}
                    value={min}
                    onChange={(e) => setMin(Number(e.target.value))}
                    className={inputCls}
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-600 mb-1">
                    Vigencia (días)
                  </label>
                  <input
                    type="number"
                    min={1}
                    step={1}
                    value={validity}
                    onChange={(e) => setValidity(Number(e.target.value))}
                    className={inputCls}
                  />
                </div>
                <div className="col-span-2">
                  <label className="block text-xs text-gray-600 mb-1">
                    Recurrencia
                  </label>
                  <select
                    value={recurrence}
                    onChange={(e) =>
                      setRecurrence(
                        e.target.value as 'per_period' | 'one_time',
                      )
                    }
                    className={inputCls}
                  >
                    <option value="per_period">Recurrente cada periodo</option>
                    <option value="one_time">Una sola vez</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-gray-600 mb-1">
                    Disponible desde
                  </label>
                  <input
                    type="date"
                    value={from}
                    onChange={(e) => setFrom(e.target.value)}
                    className={inputCls}
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-600 mb-1">
                    Disponible hasta
                  </label>
                  <input
                    type="date"
                    value={to}
                    onChange={(e) => setTo(e.target.value)}
                    className={inputCls}
                  />
                </div>
                <label className="col-span-2 flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={consumes}
                    onChange={(e) => setConsumes(e.target.checked)}
                    className="h-4 w-4"
                  />
                  <span className="text-sm text-gray-700">
                    Consume puntos al canjear
                  </span>
                </label>
              </div>
            </div>

            <div className="border-t pt-4">
              <h3 className="text-sm font-semibold text-gray-800">
                Lo que ve el distribuidor en {countryLabel}
              </h3>
              <p className="mb-2 text-xs text-gray-500">
                Opcional. Si lo dejas vacío se usa el dato base (Global) del
                producto.
              </p>
              <div className="space-y-3">
                <div>
                  <label className="block text-xs text-gray-600 mb-1">
                    Nombre
                  </label>
                  <input
                    type="text"
                    value={dName}
                    onChange={(e) => setDName(e.target.value)}
                    placeholder={baseName || 'Usa el nombre base'}
                    className={inputCls}
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-600 mb-1">
                    Nombre corto
                  </label>
                  <input
                    type="text"
                    value={dShortName}
                    onChange={(e) => setDShortName(e.target.value)}
                    placeholder={baseShortName || 'Usa el nombre corto base'}
                    className={inputCls}
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-600 mb-1">
                    Descripción
                  </label>
                  <textarea
                    value={dDescription}
                    onChange={(e) => setDDescription(e.target.value)}
                    rows={2}
                    placeholder={baseDescription || 'Usa la descripción base'}
                    className={inputCls}
                  />
                </div>

                {/* Imagen por país (mig 107): la foto que ve el distribuidor
                    y el POS en ESTE país. Sin override = imagen base. */}
                <div>
                  <label className="block text-xs text-gray-600 mb-1">
                    Imagen en {countryLabel}
                  </label>
                  <div className="flex items-center gap-3">
                    {rule.displayImageUrl || baseImageUrl ? (
                      <div className="h-16 w-16 flex-shrink-0 overflow-hidden rounded-lg border bg-gray-100">
                        <Image
                          src={(rule.displayImageUrl || baseImageUrl)!}
                          alt={`Imagen de la promo en ${countryLabel}`}
                          width={64}
                          height={64}
                          className="h-16 w-16 object-cover"
                        />
                      </div>
                    ) : (
                      <div
                        className="flex h-16 w-16 flex-shrink-0 items-center justify-center rounded-lg border-2 border-dashed border-amber-300 bg-amber-50"
                        title="Sin imagen (ni del país ni base)"
                      >
                        <PhotoIcon className="h-6 w-6 text-amber-500" />
                      </div>
                    )}
                    <div className="space-y-1.5">
                      <p className="text-xs text-gray-500">
                        {rule.displayImageUrl
                          ? `Imagen propia de ${countryLabel}.`
                          : baseImageUrl
                            ? 'Usa la imagen base del producto.'
                            : 'Sin imagen: sube una o carga la base en el producto.'}
                      </p>
                      <div className="flex flex-wrap gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => imageInputRef.current?.click()}
                          disabled={uploadImage.isPending}
                        >
                          {uploadImage.isPending ? (
                            <Loader2 className="mr-1 size-3 animate-spin" />
                          ) : (
                            <ArrowUpTrayIcon className="h-3.5 w-3.5" />
                          )}
                          Subir imagen de {countryLabel}
                        </Button>
                        {rule.displayImageUrl && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="text-destructive"
                            onClick={handleClearImage}
                            disabled={upsertRule.isPending}
                          >
                            <TrashIcon className="h-3.5 w-3.5" />
                            Usar imagen base
                          </Button>
                        )}
                      </div>
                      <input
                        ref={imageInputRef}
                        type="file"
                        accept="image/jpeg,image/png,image/webp,image/gif"
                        className="hidden"
                        onChange={(e) => handleUploadImage(e.target.files?.[0])}
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Columna derecha: componentes del país */}
          <div className="rounded-lg bg-gray-50/70 p-4">
            <ComponentsEditor
              promotionId={promotionId}
              scope={rule.countryId}
              scopeLabel={countryLabel}
              emptyHint={`Sin lista propia: en ${countryLabel} se entrega la lista GLOBAL. Agrega productos y guarda para darle contenido específico.`}
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ================================================================
// Página
// ================================================================
export default function EditarPromocionPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);

  const { data: promo, isLoading: promoLoading } = usePromotion(id);
  const { data: rules } = usePromotionRules(id);
  const { data: countries } = useActiveCountries();
  const updateProduct = useUpdateProduct();
  const upsertRule = useUpsertPromotionRule(id);

  // -------- datos del producto (BASE) --------
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [shortName, setShortName] = useState('');
  const [description, setDescription] = useState('');
  const [longDescription, setLongDescription] = useState('');
  const [isActive, setIsActive] = useState(true);
  const [availableInPos, setAvailableInPos] = useState(true);
  const [isVisibleEcommerce, setIsVisibleEcommerce] = useState(true);
  const [confirmCancel, setConfirmCancel] = useState(false);

  useEffect(() => {
    if (promo) {
      setCode(promo.code);
      setName(promo.name);
      setShortName(promo.shortName ?? '');
      setDescription(promo.description ?? '');
      setLongDescription(promo.longDescription ?? '');
      setIsActive(promo.isActive);
      setAvailableInPos(promo.availableInPos);
      setIsVisibleEcommerce(promo.isVisibleEcommerce);
    }
  }, [promo]);

  // Validación inline del código: no debe repetirse con OTRO producto.
  const trimmedCode = code.trim();
  const { data: codeMatches } = useProducts(
    trimmedCode.length >= 2 ? { search: trimmedCode, limit: 10 } : { limit: 0 },
  );
  const codeConflict =
    trimmedCode.length >= 2
      ? (codeMatches?.data ?? []).find(
          (p) =>
            (p.code ?? '').toUpperCase() === trimmedCode.toUpperCase() &&
            p.id !== promo?.id,
        )
      : undefined;
  const codeTaken = !!codeConflict;

  // -------- agregar país --------
  const [newRuleCountry, setNewRuleCountry] = useState('');
  const [newRuleMin, setNewRuleMin] = useState<number>(0);
  const ruledCountryIds = new Set((rules ?? []).map((r) => r.countryId));
  const availableCountriesForNewRule = (countries ?? []).filter(
    (c) => !ruledCountryIds.has(c.id),
  );

  const handleSaveDetails = async () => {
    if (!promo) return;
    if (!code.trim()) {
      toast.error('El código es requerido');
      return;
    }
    if (!name.trim()) {
      toast.error(
        'El nombre base no puede quedar vacío: es el nombre interno de la promoción y el respaldo para países sin personalización. Si cada país ya tiene su propio nombre (abajo), el base solo se ve en el admin.',
      );
      return;
    }
    if (/\s/.test(code)) {
      toast.error('El código no debe contener espacios');
      return;
    }
    if (codeTaken) {
      toast.error('Ya existe un producto/promoción con ese código');
      return;
    }
    try {
      await updateProduct.mutateAsync({
        id: promo.id,
        dto: {
          code: code.trim().toUpperCase(),
          name,
          // null (no undefined): vaciar el campo debe BORRARLO en BD.
          shortName: shortName.trim() || null,
          description: description.trim() || null,
          longDescription: longDescription.trim() || null,
          isActive,
          availableInPos,
          isVisibleEcommerce,
        },
      });
      toast.success('Datos base de la promoción actualizados');
    } catch (err: unknown) {
      toast.error(apiMsg(err, 'Error al actualizar'));
    }
  };

  const handleCancelPromo = async () => {
    if (!promo) return;
    try {
      // Cancelar = desactivar (soft). Reversible.
      await updateProduct.mutateAsync({
        id: promo.id,
        dto: { isActive: false, availableInPos: false },
      });
      setIsActive(false);
      setAvailableInPos(false);
      setConfirmCancel(false);
      toast.success('Promoción cancelada. Ya no se otorga ni aparece en el POS.');
    } catch (err: unknown) {
      toast.error(apiMsg(err, 'Error al cancelar la promoción'));
    }
  };

  const handleReactivatePromo = async () => {
    if (!promo) return;
    try {
      await updateProduct.mutateAsync({ id: promo.id, dto: { isActive: true } });
      setIsActive(true);
      toast.success('Promoción reactivada');
    } catch (err: unknown) {
      toast.error(apiMsg(err, 'Error al reactivar la promoción'));
    }
  };

  const handleAddCountry = async () => {
    if (!newRuleCountry) {
      toast.error('Selecciona un país');
      return;
    }
    if (newRuleMin <= 0) {
      toast.error('El umbral de puntos debe ser mayor a 0');
      return;
    }
    try {
      await upsertRule.mutateAsync({
        countryId: newRuleCountry,
        minPointsRequired: newRuleMin,
        validityDays: 90,
        recurrence: 'per_period',
        availableFrom: null,
        availableTo: null,
        consumesPoints: false,
        isActive: true,
      });
      const c = countries?.find((x) => x.id === newRuleCountry);
      toast.success(
        `${c?.name ?? 'País'} agregado. Ajusta su regla, contenido y componentes en su tarjeta.`,
      );
      setNewRuleCountry('');
      setNewRuleMin(0);
    } catch (err: unknown) {
      toast.error(apiMsg(err, 'Error al agregar el país'));
    }
  };

  if (promoLoading || !promo) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-gray-500">Cargando...</div>
      </div>
    );
  }

  const inputCls =
    'w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#3E667D]';

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-gray-50">
      <div className="bg-gradient-to-r from-[#3E667D] to-[#0A4B94] text-white">
        <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 lg:px-8">
          <Link
            href="/admin/productos?tab=promociones"
            className="inline-flex items-center text-white/80 hover:text-white mb-3 text-sm"
          >
            <ArrowLeftIcon className="h-4 w-4 mr-1" /> Volver a Promociones
          </Link>
          <div className="flex items-center gap-3 mb-2">
            <SparklesIcon className="h-9 w-9" />
            <h1 className="text-3xl font-bold sm:text-4xl">{promo.name}</h1>
          </div>
          <div className="flex flex-wrap items-center gap-2 mt-2">
            <span className="bg-white/15 px-3 py-1 rounded text-sm font-mono">
              {promo.code}
            </span>
            <span className="bg-white/15 px-3 py-1 rounded text-sm">
              Tipo: Promoción canjeable por puntos
            </span>
            <span className="bg-white/15 px-3 py-1 rounded text-sm">
              {(rules ?? []).filter((r) => r.isActive).length} país(es)
              configurado(s)
            </span>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8 space-y-6">
        {/* ============ BASE: datos generales + componentes globales ============ */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Card className="lg:col-span-1">
            <CardContent className="p-6 space-y-4">
              <div>
                <h2 className="text-lg font-semibold">Datos generales</h2>
                <p className="text-xs text-gray-500 mt-0.5">
                  Contenido BASE: se muestra en los países que no personalizan
                  el suyo (abajo).
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Código
                </label>
                <input
                  type="text"
                  value={code}
                  onChange={(e) =>
                    setCode(e.target.value.toUpperCase().replace(/\s+/g, ''))
                  }
                  placeholder="PROMOTEST-MX"
                  className={`w-full px-3 py-2 border rounded-md font-mono uppercase focus:outline-none focus:ring-2 ${
                    codeTaken
                      ? 'border-red-400 focus:ring-red-400'
                      : 'border-gray-300 focus:ring-[#3E667D]'
                  }`}
                />
                {codeTaken ? (
                  <p className="mt-1 text-xs text-red-600">
                    Ya existe{' '}
                    {codeConflict?.isActive
                      ? 'una promoción/producto activo'
                      : 'un producto'}{' '}
                    con el código “{trimmedCode}”. Usa otro.
                  </p>
                ) : (
                  <p className="mt-1 text-xs text-gray-500">
                    Identificador único (el MISMO en todos los países); es la
                    clave por la que se busca en el POS.
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Nombre (base) <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className={`${inputCls} ${!name.trim() ? 'border-red-400' : ''}`}
                />
                <p className="mt-1 text-xs text-gray-500">
                  Obligatorio. Es el nombre interno (listados del admin) y el
                  respaldo para países sin nombre propio. Si cada país
                  personaliza el suyo abajo, el distribuidor NUNCA ve este.
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Nombre corto
                </label>
                <input
                  type="text"
                  value={shortName}
                  onChange={(e) => setShortName(e.target.value)}
                  className={inputCls}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Descripción
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={3}
                  className={inputCls}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Descripción tienda en línea
                </label>
                <textarea
                  value={longDescription}
                  onChange={(e) => setLongDescription(e.target.value)}
                  rows={2}
                  className={inputCls}
                />
              </div>

              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={isActive}
                  onChange={(e) => setIsActive(e.target.checked)}
                  className="h-4 w-4"
                />
                <span className="text-sm font-medium">Promoción activa</span>
              </label>

              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={availableInPos}
                  onChange={(e) => setAvailableInPos(e.target.checked)}
                  className="h-4 w-4"
                />
                <span className="text-sm font-medium">Disponible en POS</span>
              </label>

              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={isVisibleEcommerce}
                  onChange={(e) => setIsVisibleEcommerce(e.target.checked)}
                  className="h-4 w-4"
                />
                <span className="text-sm font-medium">
                  Visible en tienda en línea
                </span>
              </label>

              <div className="pt-2">
                <Button
                  variant="default"
                  className="w-full"
                  onClick={handleSaveDetails}
                  disabled={updateProduct.isPending || codeTaken}
                >
                  {updateProduct.isPending && (
                    <Loader2 className="mr-2 size-4 animate-spin" />
                  )}
                  <CheckIcon className="h-4 w-4" />
                  Guardar datos
                </Button>
              </div>

              {/* Cancelar / reactivar la promoción */}
              <div className="border-t pt-4">
                {promo?.isActive ? (
                  confirmCancel ? (
                    <div className="space-y-2">
                      <p className="text-sm text-gray-700">
                        ¿Cancelar esta promoción? Dejará de otorgarse y de
                        aparecer en el POS. Podrás reactivarla después.
                      </p>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          className="flex-1"
                          onClick={() => setConfirmCancel(false)}
                          disabled={updateProduct.isPending}
                        >
                          No, conservar
                        </Button>
                        <Button
                          variant="destructive"
                          className="flex-1"
                          onClick={handleCancelPromo}
                          disabled={updateProduct.isPending}
                        >
                          {updateProduct.isPending && (
                            <Loader2 className="mr-2 size-4 animate-spin" />
                          )}
                          Sí, cancelar promoción
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <Button
                      variant="destructive"
                      className="w-full"
                      onClick={() => setConfirmCancel(true)}
                      disabled={updateProduct.isPending}
                    >
                      <TrashIcon className="h-4 w-4" />
                      Cancelar promoción
                    </Button>
                  )
                ) : (
                  <div className="space-y-2">
                    <p className="inline-flex rounded bg-gray-100 px-2 py-1 text-xs text-gray-700">
                      Promoción cancelada (inactiva)
                    </p>
                    <Button
                      variant="outline"
                      className="w-full"
                      onClick={handleReactivatePromo}
                      disabled={updateProduct.isPending}
                    >
                      {updateProduct.isPending && (
                        <Loader2 className="mr-2 size-4 animate-spin" />
                      )}
                      Reactivar promoción
                    </Button>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Componentes GLOBALES */}
          <Card className="lg:col-span-2">
            <CardContent className="p-6 space-y-4">
              <div className="flex items-center gap-2 border-b pb-3">
                <GlobeAmericasIcon className="h-5 w-5 text-[#3E667D]" />
                <div>
                  <h2 className="text-lg font-semibold">
                    Componentes Globales
                  </h2>
                  <p className="text-xs text-gray-500">
                    Lo que incluye la promo en los países SIN lista propia. Si
                    un país define la suya (abajo), la suya manda.
                  </p>
                </div>
              </div>
              <ComponentsEditor
                promotionId={id}
                scope="global"
                scopeLabel="Global"
                emptyHint="Sin componentes globales. Los países CON lista propia (abajo) no se afectan, pero un país SIN lista propia no recibiría nada al canjear. Déjalo vacío solo si TODOS los países activos tienen su propia lista."
              />
            </CardContent>
          </Card>
        </div>

        {/* ============ CONFIGURACIÓN POR PAÍS ============ */}
        <div className="flex items-end justify-between gap-4 flex-wrap">
          <div>
            <h2 className="text-xl font-bold text-gray-900">
              Configuración por país
            </h2>
            <p className="text-sm text-gray-500">
              Cada tarjeta reúne TODO lo de ese país: su regla de canje, lo que
              ve el distribuidor y sus componentes. Sin regla, la promo no se
              puede canjear en ese país.
            </p>
          </div>
          {availableCountriesForNewRule.length > 0 && (
            <div className="flex items-end gap-2">
              <div>
                <label className="block text-xs text-gray-600 mb-1">País</label>
                <select
                  value={newRuleCountry}
                  onChange={(e) => setNewRuleCountry(e.target.value)}
                  className="rounded-md border border-gray-300 px-3 py-2 text-sm"
                >
                  <option value="">Seleccionar…</option>
                  {availableCountriesForNewRule.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} ({c.code})
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs text-gray-600 mb-1">
                  Puntos mínimos
                </label>
                <input
                  type="number"
                  min={0}
                  step={1}
                  value={newRuleMin}
                  onChange={(e) => setNewRuleMin(Number(e.target.value))}
                  placeholder="4000"
                  className="w-32 rounded-md border border-gray-300 px-3 py-2 text-sm"
                />
              </div>
              <Button
                variant="default"
                onClick={handleAddCountry}
                disabled={upsertRule.isPending}
              >
                {upsertRule.isPending && (
                  <Loader2 className="mr-1 size-3 animate-spin" />
                )}
                <PlusIcon className="h-4 w-4" />
                Agregar país
              </Button>
            </div>
          )}
        </div>

        {(rules ?? []).length === 0 ? (
          <div className="rounded-lg border-2 border-dashed p-8 text-center text-sm text-gray-500">
            No hay países configurados. Sin reglas, la promoción no se puede
            canjear en ningún país — agrega el primero arriba a la derecha.
          </div>
        ) : (
          (rules ?? []).map((rule) => (
            <CountryCard
              key={rule.id}
              promotionId={id}
              rule={rule}
              baseName={name}
              baseShortName={shortName}
              baseDescription={description}
              baseImageUrl={promo.imageUrl}
            />
          ))
        )}
      </div>
    </div>
  );
}
