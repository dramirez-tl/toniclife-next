'use client';

import { use, useEffect, useState } from 'react';
import Link from 'next/link';
import {
  ArrowLeftIcon,
  SparklesIcon,
  PlusIcon,
  TrashIcon,
  CheckIcon,
  MagnifyingGlassIcon,
} from '@heroicons/react/24/outline';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  usePromotion,
  usePromotionComponents,
  useReplacePromotionComponents,
  usePromotionRules,
  useUpsertPromotionRule,
  useRemovePromotionRule,
} from '@/hooks/usePromotions';
import { useProducts, useUpdateProduct } from '@/hooks/useProducts';
import { useActiveCountries } from '@/hooks/useConfig';
import { ProductType } from '@/types/product';
import type { Product } from '@/types/product';
import type { BulkPromotionComponentItem } from '@/types/promotion';

type CompRow = BulkPromotionComponentItem & {
  productName: string;
  productCode: string;
};

export default function EditarPromocionPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);

  const { data: promo, isLoading: promoLoading } = usePromotion(id);
  const { data: components, isLoading: compsLoading } = usePromotionComponents(id);
  const { data: rules } = usePromotionRules(id);
  const { data: countries } = useActiveCountries();
  const updateProduct = useUpdateProduct();
  const replaceComponents = useReplacePromotionComponents(id);
  const upsertRule = useUpsertPromotionRule(id);
  const removeRule = useRemovePromotionRule(id);

  // -------- datos del producto --------
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

  // -------- componentes (compositor) --------
  const [rows, setRows] = useState<CompRow[]>([]);
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
    }
  }, [components]);

  const { data: productSearchResults } = useProducts(
    productSearch.trim().length >= 2
      ? { search: productSearch, isActive: true, limit: 10, productType: ProductType.FINISHED_GOOD }
      : { limit: 0 },
  );

  // Validación inline del código: no debe repetirse con OTRO producto/promoción
  // (code es único global en la BD). Se excluye la promo actual.
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

  const addComponent = (p: Product) => {
    if (rows.some((r) => r.componentProductId === p.id)) {
      toast.warning('Ese producto ya está en la promoción');
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
    setProductSearch('');
  };

  const removeRow = (productId: string) => {
    setRows((prev) => prev.filter((r) => r.componentProductId !== productId));
  };

  const updateQty = (productId: string, qty: number) => {
    setRows((prev) =>
      prev.map((r) => (r.componentProductId === productId ? { ...r, quantity: qty } : r)),
    );
  };

  // -------- reglas por país --------
  const [newRuleCountry, setNewRuleCountry] = useState('');
  const [newRuleMin, setNewRuleMin] = useState<number>(0);
  const [newRuleValidity, setNewRuleValidity] = useState<number>(90);
  const [newRuleRecurrence, setNewRuleRecurrence] = useState<
    'per_period' | 'one_time'
  >('per_period');
  const [newRuleFrom, setNewRuleFrom] = useState('');
  const [newRuleTo, setNewRuleTo] = useState('');
  const [newRuleConsumes, setNewRuleConsumes] = useState(false);

  // Países que aún no tienen regla configurada (para no duplicar selector).
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
          shortName: shortName.trim() || undefined,
          description: description.trim() || undefined,
          longDescription: longDescription.trim() || undefined,
          isActive,
          availableInPos,
          isVisibleEcommerce,
        },
      });
      toast.success('Datos de la promoción actualizados');
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message ?? 'Error al actualizar';
      toast.error(msg);
    }
  };

  const handleCancelPromo = async () => {
    if (!promo) return;
    try {
      // Cancelar = desactivar (soft). Queda inactiva: no se otorgan nuevos
      // derechos ni aparece en el POS; los derechos existentes dejan de
      // mostrarse porque el producto queda inactivo. Es reversible.
      await updateProduct.mutateAsync({
        id: promo.id,
        dto: { isActive: false, availableInPos: false },
      });
      setIsActive(false);
      setAvailableInPos(false);
      setConfirmCancel(false);
      toast.success('Promoción cancelada. Ya no se otorga ni aparece en el POS.');
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message ?? 'Error al cancelar la promoción';
      toast.error(msg);
    }
  };

  const handleReactivatePromo = async () => {
    if (!promo) return;
    try {
      await updateProduct.mutateAsync({
        id: promo.id,
        dto: { isActive: true },
      });
      setIsActive(true);
      toast.success('Promoción reactivada');
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message ?? 'Error al reactivar la promoción';
      toast.error(msg);
    }
  };

  const handleSaveComponents = async () => {
    try {
      await replaceComponents.mutateAsync({
        components: rows.map((r, i) => ({
          componentProductId: r.componentProductId,
          quantity: r.quantity,
          sortOrder: i,
        })),
      });
      toast.success('Componentes de la promoción guardados');
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message ?? 'Error al guardar componentes';
      toast.error(msg);
    }
  };

  const handleAddRule = async () => {
    if (!newRuleCountry) {
      toast.error('Selecciona un país');
      return;
    }
    if (newRuleMin <= 0) {
      toast.error('El umbral de puntos debe ser mayor a 0');
      return;
    }
    if (newRuleValidity <= 0) {
      toast.error('La vigencia debe ser mayor a 0 días');
      return;
    }
    try {
      await upsertRule.mutateAsync({
        countryId: newRuleCountry,
        minPointsRequired: newRuleMin,
        validityDays: newRuleValidity,
        recurrence: newRuleRecurrence,
        availableFrom: newRuleFrom || null,
        availableTo: newRuleTo || null,
        consumesPoints: newRuleConsumes,
        isActive: true,
      });
      toast.success('Regla de canje agregada');
      setNewRuleCountry('');
      setNewRuleMin(0);
      setNewRuleValidity(90);
      setNewRuleRecurrence('per_period');
      setNewRuleFrom('');
      setNewRuleTo('');
      setNewRuleConsumes(false);
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message ?? 'Error al agregar la regla';
      toast.error(msg);
    }
  };

  const handleUpdateRule = async (
    countryId: string,
    minPointsRequired: number,
    validityDays: number,
    recurrence: 'per_period' | 'one_time',
    availableFrom: string | null,
    availableTo: string | null,
    consumesPoints: boolean,
  ) => {
    try {
      await upsertRule.mutateAsync({
        countryId,
        minPointsRequired,
        validityDays,
        recurrence,
        availableFrom,
        availableTo,
        consumesPoints,
        isActive: true,
      });
      toast.success('Regla actualizada');
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message ?? 'Error al actualizar la regla';
      toast.error(msg);
    }
  };

  const handleRemoveRule = async (countryId: string) => {
    try {
      await removeRule.mutateAsync(countryId);
      toast.success('Regla desactivada');
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message ?? 'Error al desactivar la regla';
      toast.error(msg);
    }
  };

  if (promoLoading || !promo) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-gray-500">Cargando...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-gray-50">
      <div className="bg-gradient-to-r from-[#3E667D] to-[#0A4B94] text-white">
        <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 lg:px-8">
          <Link href="/admin/productos?tab=promociones" className="inline-flex items-center text-white/80 hover:text-white mb-3 text-sm">
            <ArrowLeftIcon className="h-4 w-4 mr-1" /> Volver a Promociones
          </Link>
          <div className="flex items-center gap-3 mb-2">
            <SparklesIcon className="h-9 w-9" />
            <h1 className="text-3xl font-bold sm:text-4xl">{promo.name}</h1>
          </div>
          <div className="flex flex-wrap items-center gap-2 mt-2">
            <span className="bg-white/15 px-3 py-1 rounded text-sm font-mono">{promo.code}</span>
            <span className="bg-white/15 px-3 py-1 rounded text-sm">
              Tipo: Promoción canjeable por puntos
            </span>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8 space-y-6">
        {/* Layout: datos + componentes lado a lado */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* DATOS DEL PRODUCTO */}
          <Card className="lg:col-span-1">
            <CardContent className="p-6 space-y-4">
              <h2 className="text-lg font-semibold">Datos generales</h2>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Código</label>
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
                    Ya existe {codeConflict?.isActive ? 'una promoción/producto activo' : 'un producto'} con el código “{trimmedCode}”. Usa otro.
                  </p>
                ) : (
                  <p className="mt-1 text-xs text-gray-500">
                    Identificador único de la promoción, sin espacios. Cámbialo con
                    cuidado: es la clave por la que se busca en el POS.
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nombre</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nombre corto</label>
                <input
                  type="text"
                  value={shortName}
                  onChange={(e) => setShortName(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Descripción</label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Descripción tienda en línea</label>
                <textarea
                  value={longDescription}
                  onChange={(e) => setLongDescription(e.target.value)}
                  rows={2}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
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
                <span className="text-sm font-medium">Visible en tienda en línea</span>
              </label>

              <div className="pt-2">
                <Button
                  variant="default"
                  className="w-full"
                  onClick={handleSaveDetails}
                  disabled={updateProduct.isPending || codeTaken}
                >
                  {updateProduct.isPending && <Loader2 className="mr-2 size-4 animate-spin" />}
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
                        ¿Cancelar esta promoción? Dejará de otorgarse y de aparecer
                        en el POS. Podrás reactivarla después.
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

          {/* COMPONENTES */}
          <Card className="lg:col-span-2">
            <CardContent className="p-6 space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold">Componentes ({rows.length})</h2>
                <Button
                  variant="default"
                  size="sm"
                  onClick={handleSaveComponents}
                  disabled={replaceComponents.isPending || compsLoading}
                >
                  {replaceComponents.isPending && <Loader2 className="mr-2 size-4 animate-spin" />}
                  <CheckIcon className="h-4 w-4" />
                  Guardar componentes
                </Button>
              </div>

              <div className="relative">
                <MagnifyingGlassIcon className="h-5 w-5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  value={productSearch}
                  onChange={(e) => setProductSearch(e.target.value)}
                  placeholder="Buscar producto para agregar (mínimo 2 caracteres)..."
                  className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#3E667D]"
                />
                {productSearch.trim().length >= 2 && productSearchResults?.data && productSearchResults.data.length > 0 && (
                  <div className="absolute z-10 mt-1 w-full bg-white border border-gray-200 rounded-md shadow-lg max-h-72 overflow-y-auto">
                    {productSearchResults.data.map((p) => (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => addComponent(p)}
                        className="w-full text-left px-4 py-2 hover:bg-gray-50 flex items-center justify-between"
                      >
                        <div>
                          <div className="text-sm font-medium">{p.name}</div>
                          <div className="text-xs text-gray-500 font-mono">{p.code}</div>
                        </div>
                        <PlusIcon className="h-4 w-4 text-[#3E667D]" />
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {rows.length === 0 ? (
                <div className="text-center py-12 text-gray-500 border-2 border-dashed rounded-lg">
                  <p className="text-sm">Sin componentes todavía. Busca productos arriba para armar la promoción.</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {rows.map((row) => (
                    <div
                      key={row.componentProductId}
                      className="flex items-center gap-3 p-3 border border-gray-200 rounded-md hover:bg-gray-50"
                    >
                      <div className="flex-1">
                        <div className="text-sm font-medium">{row.productName}</div>
                        <div className="text-xs text-gray-500 font-mono">{row.productCode}</div>
                      </div>
                      <div className="flex items-center gap-2">
                        <label className="text-xs text-gray-500">Cant:</label>
                        <input
                          type="number"
                          min={0.0001}
                          step={0.0001}
                          value={row.quantity}
                          onChange={(e) => updateQty(row.componentProductId, Number(e.target.value))}
                          className="w-24 px-2 py-1 border border-gray-300 rounded text-sm text-right"
                        />
                      </div>
                      <button
                        type="button"
                        onClick={() => removeRow(row.componentProductId)}
                        className="text-red-500 hover:text-red-700 p-1"
                        title="Quitar"
                      >
                        <TrashIcon className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* REGLAS DE CANJE POR PAÍS */}
        <Card>
          <CardContent className="p-6 space-y-4">
            <div>
              <h2 className="text-lg font-semibold">Reglas de canje por país</h2>
              <p className="text-sm text-gray-500 mt-1">
                Define el umbral de puntos personales acumulados en el periodo abierto que el distribuidor debe alcanzar para canjear esta promoción. Ej: México 4,000 / 6,000 — Estados Unidos 6,600 / 9,900.
              </p>
            </div>

            {/* Listado de reglas existentes */}
            <div className="space-y-2">
              {(rules ?? []).length === 0 ? (
                <div className="text-sm text-gray-500 border-2 border-dashed rounded-lg p-6 text-center">
                  No hay reglas configuradas. Sin reglas, la promoción no se puede canjear en ningún país.
                </div>
              ) : (
                <Table className="w-full">
                  <TableHeader className="bg-gray-50 border-b">
                    <TableRow>
                      <TableHead className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">País</TableHead>
                      <TableHead className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Puntos mínimos</TableHead>
                      <TableHead className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Vigencia (días)</TableHead>
                      <TableHead className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Recurrencia</TableHead>
                      <TableHead className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Disponible</TableHead>
                      <TableHead className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Consume puntos</TableHead>
                      <TableHead className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Estado</TableHead>
                      <TableHead className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">Acciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody className="divide-y divide-gray-200">
                    {(rules ?? []).map((rule) => (
                      <RuleRow
                        key={rule.id}
                        countryLabel={
                          rule.countryName ?? rule.countryCode ?? rule.countryId
                        }
                        initialMin={Number(rule.minPointsRequired)}
                        initialValidity={rule.validityDays ?? 90}
                        initialRecurrence={rule.recurrence ?? 'per_period'}
                        initialFrom={rule.availableFrom ?? ''}
                        initialTo={rule.availableTo ?? ''}
                        initialConsumes={rule.consumesPoints}
                        isActive={rule.isActive}
                        onSave={(min, validity, recurrence, from, to, consumes) =>
                          handleUpdateRule(
                            rule.countryId,
                            min,
                            validity,
                            recurrence,
                            from || null,
                            to || null,
                            consumes,
                          )
                        }
                        onRemove={() => handleRemoveRule(rule.countryId)}
                        savePending={upsertRule.isPending}
                        removePending={removeRule.isPending}
                      />
                    ))}
                  </TableBody>
                </Table>
              )}
            </div>

            {/* Form para agregar regla nueva */}
            {availableCountriesForNewRule.length > 0 && (
              <div className="border-t pt-4">
                <h3 className="text-sm font-semibold mb-3">Agregar regla para otro país</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs text-gray-600 mb-1">País</label>
                    <select
                      value={newRuleCountry}
                      onChange={(e) => setNewRuleCountry(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                    >
                      <option value="">Seleccionar...</option>
                      {availableCountriesForNewRule.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name} ({c.code})
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs text-gray-600 mb-1">Puntos mínimos</label>
                    <input
                      type="number"
                      min={0}
                      step={1}
                      value={newRuleMin}
                      onChange={(e) => setNewRuleMin(Number(e.target.value))}
                      placeholder="4000"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-600 mb-1">Vigencia (días)</label>
                    <input
                      type="number"
                      min={1}
                      step={1}
                      value={newRuleValidity}
                      onChange={(e) => setNewRuleValidity(Number(e.target.value))}
                      placeholder="90"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-600 mb-1">Recurrencia</label>
                    <select
                      value={newRuleRecurrence}
                      onChange={(e) =>
                        setNewRuleRecurrence(
                          e.target.value as 'per_period' | 'one_time',
                        )
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                    >
                      <option value="per_period">Recurrente cada periodo</option>
                      <option value="one_time">Una sola vez</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs text-gray-600 mb-1">Disponible desde (opcional)</label>
                    <input
                      type="date"
                      value={newRuleFrom}
                      onChange={(e) => setNewRuleFrom(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-600 mb-1">Disponible hasta (opcional)</label>
                    <input
                      type="date"
                      value={newRuleTo}
                      onChange={(e) => setNewRuleTo(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                    />
                  </div>
                  <div className="flex items-end">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={newRuleConsumes}
                        onChange={(e) => setNewRuleConsumes(e.target.checked)}
                        className="h-4 w-4"
                      />
                      <span className="text-sm text-gray-700">Consume puntos al canjear</span>
                    </label>
                  </div>
                  <div className="flex items-end">
                    <Button
                      variant="default"
                      className="w-full"
                      onClick={handleAddRule}
                      disabled={upsertRule.isPending}
                    >
                      {upsertRule.isPending && <Loader2 className="mr-2 size-4 animate-spin" />}
                      <PlusIcon className="h-4 w-4" />
                      Agregar regla
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

// --------------------------------------------------------------
// Fila editable de regla (estado local para no perder el input al re-render)
// --------------------------------------------------------------
function RuleRow({
  countryLabel,
  initialMin,
  initialValidity,
  initialRecurrence,
  initialFrom,
  initialTo,
  initialConsumes,
  isActive,
  onSave,
  onRemove,
  savePending,
  removePending,
}: {
  countryLabel: string;
  initialMin: number;
  initialValidity: number;
  initialRecurrence: 'per_period' | 'one_time';
  initialFrom: string;
  initialTo: string;
  initialConsumes: boolean;
  isActive: boolean;
  onSave: (
    minPoints: number,
    validityDays: number,
    recurrence: 'per_period' | 'one_time',
    availableFrom: string,
    availableTo: string,
    consumesPoints: boolean,
  ) => void;
  onRemove: () => void;
  savePending: boolean;
  removePending: boolean;
}) {
  const [min, setMin] = useState(initialMin);
  const [validity, setValidity] = useState(initialValidity);
  const [recurrence, setRecurrence] = useState(initialRecurrence);
  const [from, setFrom] = useState(initialFrom);
  const [to, setTo] = useState(initialTo);
  const [consumes, setConsumes] = useState(initialConsumes);

  useEffect(() => {
    setMin(initialMin);
    setValidity(initialValidity);
    setRecurrence(initialRecurrence);
    setFrom(initialFrom);
    setTo(initialTo);
    setConsumes(initialConsumes);
  }, [
    initialMin,
    initialValidity,
    initialRecurrence,
    initialFrom,
    initialTo,
    initialConsumes,
  ]);

  const dirty =
    min !== initialMin ||
    validity !== initialValidity ||
    recurrence !== initialRecurrence ||
    from !== initialFrom ||
    to !== initialTo ||
    consumes !== initialConsumes;

  return (
    <TableRow className="hover:bg-gray-50">
      <TableCell className="px-4 py-2 text-sm font-medium">{countryLabel}</TableCell>
      <TableCell className="px-4 py-2">
        <input
          type="number"
          min={0}
          step={1}
          value={min}
          onChange={(e) => setMin(Number(e.target.value))}
          className="w-32 px-2 py-1 border border-gray-300 rounded text-sm text-right"
        />
      </TableCell>
      <TableCell className="px-4 py-2">
        <input
          type="number"
          min={1}
          step={1}
          value={validity}
          onChange={(e) => setValidity(Number(e.target.value))}
          className="w-24 px-2 py-1 border border-gray-300 rounded text-sm text-right"
        />
      </TableCell>
      <TableCell className="px-4 py-2">
        <select
          value={recurrence}
          onChange={(e) =>
            setRecurrence(e.target.value as 'per_period' | 'one_time')
          }
          className="w-40 px-2 py-1 border border-gray-300 rounded text-sm"
        >
          <option value="per_period">Recurrente</option>
          <option value="one_time">Una vez</option>
        </select>
      </TableCell>
      <TableCell className="px-4 py-2">
        <div className="flex flex-col gap-1">
          <input
            type="date"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
            className="w-36 px-2 py-1 border border-gray-300 rounded text-xs"
            title="Disponible desde"
          />
          <input
            type="date"
            value={to}
            onChange={(e) => setTo(e.target.value)}
            className="w-36 px-2 py-1 border border-gray-300 rounded text-xs"
            title="Disponible hasta"
          />
        </div>
      </TableCell>
      <TableCell className="px-4 py-2">
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={consumes}
            onChange={(e) => setConsumes(e.target.checked)}
            className="h-4 w-4"
          />
          <span className="text-xs text-gray-600">
            {consumes ? 'Sí, consume' : 'Solo desbloquea'}
          </span>
        </label>
      </TableCell>
      <TableCell className="px-4 py-2">
        <span
          className={
            isActive
              ? 'inline-flex px-2 py-1 text-xs rounded bg-green-100 text-green-800'
              : 'inline-flex px-2 py-1 text-xs rounded bg-gray-100 text-gray-700'
          }
        >
          {isActive ? 'Activa' : 'Inactiva'}
        </span>
      </TableCell>
      <TableCell className="px-4 py-2 text-right">
        <div className="inline-flex gap-2">
          <Button
            variant="default"
            size="sm"
            disabled={savePending || (!dirty)}
            onClick={() => onSave(min, validity, recurrence, from, to, consumes)}
          >
            {savePending && <Loader2 className="mr-2 size-4 animate-spin" />}
            <CheckIcon className="h-4 w-4" />
            Guardar
          </Button>
          <Button
            variant="destructive"
            size="sm"
            disabled={removePending}
            onClick={onRemove}
          >
            {removePending && <Loader2 className="mr-2 size-4 animate-spin" />}
            <TrashIcon className="h-4 w-4" />
            Quitar
          </Button>
        </div>
      </TableCell>
    </TableRow>
  );
}
