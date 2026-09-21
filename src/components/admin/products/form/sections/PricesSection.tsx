'use client';

// (7) Precios — tabla país × tipo de precio.
//  - SOLO filas activas en la tabla: un país "quitado" no revive al recargar.
//    Las desactivadas viven en el apartado plegable "Precios desactivados" con
//    "Reactivar" explícito.
//  - Columnas: Precio, Puntos, Valor negocio, Vigente desde/hasta, Actualizado
//    por (nombre). La columna Costo se oculta (no hay datos de costo).
//  - Avisos de coherencia en línea (los mismos que devuelve el API en
//    `warnings[]`; no bloquean).
//  - Ayudas derivadas de `price_types.discountPercentage` (antes quemadas).
//  - `effectiveFrom` solo viaja si el usuario lo cambió (el API conserva el
//    vigente). Las vigencias son DATE: se tratan como texto YYYY-MM-DD.
//  - "Vigente desde" NO admite fechas futuras (max = hoy en México): guardar una
//    dejaría el producto sin precio vigente (POS en $0). Programar = PriceSchedulesPanel.
//  - Los cambios programados (PriceSchedulesPanel) se conservan.

import { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react';
import { ChevronDown, ChevronRight, Loader2, Plus, Save, TriangleAlert } from 'lucide-react';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { SearchableSelect } from '@/components/ui/SearchableSelect';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ConfirmDialog } from '@/components/admin/ConfirmDialog';
import { useActiveCountries, useActivePriceTypes } from '@/hooks/useConfig';
import { useDeactivateCountryPrices } from '@/hooks/useProducts';
import { formatCurrency } from '@/lib/currency';
import type { AdminSetPriceDto } from '@/services/products-admin.service';
import type { ProductPrice } from '@/types/product';
import type { Country, PriceType } from '@/types/config';
import { productAdminErrorMessage } from '../../lib/errors';
import { PRICE_WARNING_LABEL } from '../../lib/labels';
import { effectiveFromError, todayInMexico } from '../../lib/price-dates';
import { productsAdminKeys, useAdminProductPrices, useSetAdminProductPrice } from '../../useProductsAdmin';
import { PriceSchedulesPanel } from '../../PriceSchedulesPanel';
import { useProductForm } from '../ProductFormContext';
import { SectionCard } from '../SectionCard';

interface RowValues {
  price: string;
  points: string;
  businessValue: string;
  effectiveFrom: string;
  effectiveTo: string;
}

const EMPTY_ROW: RowValues = { price: '', points: '', businessValue: '', effectiveFrom: '', effectiveTo: '' };
const ROW_FIELDS: (keyof RowValues)[] = ['price', 'points', 'businessValue', 'effectiveFrom', 'effectiveTo'];

const rowKey = (countryId: string, priceTypeId: string) => `${countryId}::${priceTypeId}`;
const dateOnly = (v: string | null | undefined): string => (v ? v.slice(0, 10) : '');
const numText = (v: string | number | null | undefined): string => {
  if (v === null || v === undefined || v === '') return '';
  const n = Number(v);
  return Number.isFinite(n) ? String(n) : '';
};

function toRowValues(price: ProductPrice): RowValues {
  return {
    price: numText(price.price),
    points: numText(price.points),
    businessValue: numText(price.businessValue),
    effectiveFrom: dateOnly(price.effectiveFrom),
    effectiveTo: dateOnly(price.effectiveTo),
  };
}

const isNumber = (v: string) => v.trim() !== '' && Number.isFinite(Number(v));

function validateRow(row: RowValues, allowZero: boolean, savedEffectiveFrom: string, today: string): string | null {
  if (!isNumber(row.price)) return 'Escribe el precio.';
  const price = Number(row.price);
  if (price < 0) return 'El precio no puede ser negativo.';
  if (price === 0 && !allowZero) return 'El precio debe ser mayor a cero.';
  if (row.points !== '' && (!isNumber(row.points) || Number(row.points) < 0)) return 'Puntos no válidos.';
  if (row.businessValue !== '' && (!isNumber(row.businessValue) || Number(row.businessValue) < 0)) {
    return 'Valor de negocio no válido.';
  }
  const futureStart = effectiveFromError(row.effectiveFrom, savedEffectiveFrom, today);
  if (futureStart) return futureStart;
  if (row.effectiveFrom && row.effectiveTo && row.effectiveTo < row.effectiveFrom) {
    return 'El fin de vigencia no puede ser anterior al inicio.';
  }
  return null;
}

/** Misma lógica que `price-coherence.lib` del API; solo informa. */
function coherenceWarnings(byCode: Record<string, number | null>, allowZero: boolean): string[] {
  const out: string[] = [];
  const pub = byCode.public ?? null;
  const dist = byCode.distributor ?? null;
  const pref = byCode.preferred ?? null;
  if (pub !== null && dist !== null && pub < dist) out.push('PUBLIC_LT_DISTRIBUTOR');
  if (pub !== null && pref !== null && pref > pub) out.push('PREFERRED_GT_PUBLIC');
  if (!allowZero && Object.values(byCode).some((v) => v === 0)) out.push('ZERO_PRICE');
  return out;
}

export function PricesSection() {
  const { productId, product, readOnly, notifyWrite, registerSection, setSectionDirty } = useProductForm();
  const queryClient = useQueryClient();
  const addCountryId = useId();
  const reasonId = useId();

  const activeQuery = useAdminProductPrices(productId, true);
  const { data: countries = [], isLoading: countriesLoading } = useActiveCountries();
  const { data: priceTypes = [], isLoading: typesLoading } = useActivePriceTypes();
  const setPrice = useSetAdminProductPrice(productId);
  const deactivateCountry = useDeactivateCountryPrices();

  const [drafts, setDrafts] = useState<Record<string, Partial<RowValues>>>({});
  const [extraCountryIds, setExtraCountryIds] = useState<string[]>([]);
  const [savingKey, setSavingKey] = useState<string | null>(null);
  const [showInactive, setShowInactive] = useState(false);
  const [countryToRemove, setCountryToRemove] = useState<Country | null>(null);
  const [removeReason, setRemoveReason] = useState('');
  const [priceToReactivate, setPriceToReactivate] = useState<ProductPrice | null>(null);

  const allQuery = useAdminProductPrices(productId, false, showInactive);
  const allowZero = product?.productType === 'promotional';
  const today = todayInMexico();

  // Aunque el API aún no filtre, aquí NUNCA entra una fila inactiva.
  const activePrices = useMemo(
    () => (activeQuery.data ?? []).filter((p) => p.isActive !== false),
    [activeQuery.data],
  );
  const inactivePrices = useMemo(
    () => (allQuery.data ?? []).filter((p) => p.isActive === false),
    [allQuery.data],
  );

  const serverRows = useMemo(() => {
    const map: Record<string, { values: RowValues; price: ProductPrice }> = {};
    for (const price of activePrices) {
      map[rowKey(price.countryId, price.priceTypeId)] = { values: toRowValues(price), price };
    }
    return map;
  }, [activePrices]);

  const valuesOf = useCallback(
    (key: string): RowValues => ({ ...(serverRows[key]?.values ?? EMPTY_ROW), ...(drafts[key] ?? {}) }),
    [drafts, serverRows],
  );

  const dirtyKeys = useMemo(
    () =>
      Object.keys(drafts).filter((key) => {
        const base = serverRows[key]?.values ?? EMPTY_ROW;
        const draft = drafts[key] ?? {};
        return ROW_FIELDS.some((f) => draft[f] !== undefined && draft[f] !== base[f]);
      }),
    [drafts, serverRows],
  );

  const shownCountryIds = useMemo(() => {
    const ids = new Set<string>(activePrices.map((p) => p.countryId));
    for (const id of extraCountryIds) ids.add(id);
    return countries.filter((c) => ids.has(c.id)).map((c) => c.id);
  }, [activePrices, countries, extraCountryIds]);

  const availableCountries = countries.filter((c) => !shownCountryIds.includes(c.id));

  const setField = (key: string, field: keyof RowValues, value: string) =>
    setDrafts((prev) => ({ ...prev, [key]: { ...(prev[key] ?? {}), [field]: value } }));

  const clearDraft = (key: string) =>
    setDrafts((prev) => {
      const next = { ...prev };
      delete next[key];
      return next;
    });

  const invalidatePrices = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: productsAdminKeys.pricesRoot(productId) });
  }, [productId, queryClient]);

  const saveRow = useCallback(
    async (key: string): Promise<boolean> => {
      const [countryId, priceTypeId] = key.split('::');
      const country = countries.find((c) => c.id === countryId);
      const currencyCode = country?.currencyCode?.trim();
      if (!country || !currencyCode) {
        toast.error('El país no tiene moneda configurada.');
        return false;
      }
      const row = valuesOf(key);
      const base = serverRows[key]?.values ?? EMPTY_ROW;
      // "Hoy" se recalcula al guardar: la ficha puede llevar abierta desde ayer.
      const problem = validateRow(row, allowZero, base.effectiveFrom, todayInMexico());
      if (problem) {
        toast.error(`${country.name}: ${problem}`);
        return false;
      }
      const dto: AdminSetPriceDto = {
        priceTypeId,
        countryId,
        currencyCode,
        price: Number(row.price),
        points: row.points === '' ? 0 : Number(row.points),
        businessValue: row.businessValue === '' ? 0 : Number(row.businessValue),
      };
      if (row.effectiveFrom && row.effectiveFrom !== base.effectiveFrom) dto.effectiveFrom = row.effectiveFrom;
      if (row.effectiveTo !== base.effectiveTo) dto.effectiveTo = row.effectiveTo === '' ? null : row.effectiveTo;

      setSavingKey(key);
      try {
        const saved = await setPrice.mutateAsync(dto);
        clearDraft(key);
        notifyWrite();
        const warnings = (saved.warnings ?? []).map((w) => PRICE_WARNING_LABEL[w] ?? w);
        if (warnings.length > 0) toast.warning(`Precio guardado con avisos: ${warnings.join(' ')}`);
        else toast.success('Precio guardado');
        return true;
      } catch (err) {
        toast.error(productAdminErrorMessage(err, 'No se pudo guardar el precio'));
        return false;
      } finally {
        setSavingKey(null);
      }
    },
    [allowZero, countries, notifyWrite, serverRows, setPrice, valuesOf],
  );

  // ---- Registro en el cascarón (punto ámbar, "Guardar todo", guard de salida) ----
  const saveAll = useCallback(async (): Promise<boolean> => {
    let ok = true;
    for (const key of dirtyKeys) {
      // Secuencial: cada guardado puede devolver avisos propios.
      if (!(await saveRow(key))) ok = false;
    }
    return ok;
  }, [dirtyKeys, saveRow]);

  const discardAll = useCallback(() => setDrafts({}), []);

  const handlers = useRef({ saveAll, discardAll });
  useEffect(() => {
    handlers.current = { saveAll, discardAll };
  }, [saveAll, discardAll]);
  useEffect(
    () =>
      registerSection('precios', {
        save: () => handlers.current.saveAll(),
        discard: () => handlers.current.discardAll(),
      }),
    [registerSection],
  );
  const isDirty = dirtyKeys.length > 0;
  useEffect(() => {
    setSectionDirty('precios', isDirty);
  }, [isDirty, setSectionDirty]);
  useEffect(() => () => setSectionDirty('precios', false), [setSectionDirty]);

  const handleRemoveCountry = async () => {
    if (!countryToRemove) return;
    try {
      const { deactivatedCount } = await deactivateCountry.mutateAsync({
        productId,
        countryId: countryToRemove.id,
        reason: removeReason.trim(),
      });
      setExtraCountryIds((prev) => prev.filter((id) => id !== countryToRemove.id));
      setDrafts((prev) =>
        Object.fromEntries(Object.entries(prev).filter(([key]) => !key.startsWith(`${countryToRemove.id}::`))),
      );
      invalidatePrices();
      notifyWrite();
      toast.success(
        deactivatedCount > 0
          ? `${deactivatedCount} precios de ${countryToRemove.name} desactivados`
          : `${countryToRemove.name} quitado`,
      );
      setCountryToRemove(null);
      setRemoveReason('');
    } catch (err) {
      toast.error(productAdminErrorMessage(err, `No se pudieron desactivar los precios de ${countryToRemove.name}`));
    }
  };

  const handleReactivate = async () => {
    const price = priceToReactivate;
    if (!price) return;
    try {
      await setPrice.mutateAsync({
        priceTypeId: price.priceTypeId,
        countryId: price.countryId,
        currencyCode: price.currencyCode?.trim(),
        price: Number(price.price),
        points: Number(price.points ?? 0) || 0,
        businessValue: Number(price.businessValue ?? 0) || 0,
      });
      notifyWrite();
      toast.success('Precio reactivado');
      setPriceToReactivate(null);
    } catch (err) {
      toast.error(productAdminErrorMessage(err, 'No se pudo reactivar el precio'));
    }
  };

  const isLoading = activeQuery.isLoading || countriesLoading || typesLoading;
  const countryById = (id: string) => countries.find((c) => c.id === id);
  const typeById = (id: string) => priceTypes.find((t) => t.id === id);

  return (
    <div className="space-y-6">
      <div id="cambios-programados" className="scroll-mt-24">
        <PriceSchedulesPanel productId={productId} />
      </div>

      <SectionCard
        title="Precios por país y tipo"
        description="Solo se muestran los precios activos. La moneda se toma del país."
        isDirty={isDirty}
        isSaving={savingKey !== null}
        onSave={() => void saveAll()}
        onDiscard={discardAll}
        saveLabel={dirtyKeys.length > 1 ? `Guardar ${dirtyKeys.length} precios` : 'Guardar precio'}
        actions={
          !readOnly && availableCountries.length > 0 ? (
            <div className="flex items-center gap-2">
              <Label htmlFor={addCountryId} className="sr-only">
                Agregar país
              </Label>
              <SearchableSelect
                id={addCountryId}
                options={availableCountries.map((c) => ({
                  value: c.id,
                  label: c.name,
                  hint: c.currencyCode?.trim(),
                }))}
                value=""
                onChange={(id) => {
                  if (id) setExtraCountryIds((prev) => (prev.includes(id) ? prev : [...prev, id]));
                }}
                showAllOption={false}
                placeholder="Agregar país…"
                className="w-48"
              />
              <Plus className="h-4 w-4 text-gray-600" aria-hidden />
            </div>
          ) : null
        }
      >
        <p className="mb-4 rounded-lg border border-sky-200 bg-sky-50 px-4 py-3 text-sm text-sky-900" role="note">
          El precio que guardas aquí aplica <strong>de inmediato</strong> en el POS y la tienda; por eso
          «Vigente desde» no admite fechas futuras. Para que un precio cambie en una fecha futura usa{' '}
          <a
            href="#cambios-programados"
            className="font-semibold underline underline-offset-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-700 rounded-sm"
          >
            Cambios programados
          </a>
          .
        </p>
        {isLoading ? (
          <p className="flex items-center gap-2 text-sm text-gray-600" role="status">
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> Cargando precios…
          </p>
        ) : activeQuery.isError ? (
          <p className="text-sm text-red-700" role="alert">
            {productAdminErrorMessage(activeQuery.error, 'No se pudieron cargar los precios.')}
          </p>
        ) : shownCountryIds.length === 0 ? (
          <p className="rounded-lg bg-gray-50 px-4 py-6 text-center text-sm text-gray-700">
            Este producto no tiene precios activos. Sin precio público vigente no aparece en la tienda ni en
            el POS del país. {readOnly ? '' : 'Agrega un país para empezar.'}
          </p>
        ) : (
          <div className="space-y-6">
            {shownCountryIds.map((countryId) => {
              const country = countryById(countryId);
              if (!country) return null;
              const currency = country.currencyCode?.trim() || 'MXN';
              const byCode: Record<string, number | null> = {};
              for (const pt of priceTypes) {
                const v = valuesOf(rowKey(countryId, pt.id)).price;
                byCode[pt.code] = isNumber(v) ? Number(v) : null;
              }
              const warnings = coherenceWarnings(byCode, allowZero);
              const publicPrice = byCode.public ?? null;

              return (
                <section key={countryId} aria-label={`Precios de ${country.name}`} className="rounded-lg border border-gray-200">
                  <header className="flex flex-wrap items-center justify-between gap-2 border-b border-gray-200 bg-gray-50 px-4 py-2.5">
                    <h3 className="text-sm font-semibold text-gray-900">
                      {country.name}{' '}
                      <span className="ml-1 rounded border border-gray-300 bg-white px-1.5 py-0.5 text-xs font-medium text-gray-700">
                        {currency}
                      </span>
                    </h3>
                    {!readOnly ? (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="text-red-700 hover:text-red-800"
                        onClick={() => {
                          setRemoveReason('');
                          setCountryToRemove(country);
                        }}
                      >
                        Quitar país
                      </Button>
                    ) : null}
                  </header>

                  {warnings.length > 0 ? (
                    <ul className="space-y-1 border-b border-amber-200 bg-amber-50 px-4 py-2" aria-live="polite">
                      {warnings.map((w) => (
                        <li key={w} className="flex items-center gap-1.5 text-xs text-amber-900">
                          <TriangleAlert className="h-3.5 w-3.5 shrink-0" aria-hidden />
                          {PRICE_WARNING_LABEL[w] ?? w}
                        </li>
                      ))}
                    </ul>
                  ) : null}

                  <div className="overflow-x-auto">
                    <Table className="min-w-[860px]">
                      <TableHeader>
                        <TableRow>
                          <TableHead scope="col">Tipo de precio</TableHead>
                          <TableHead scope="col">Precio ({currency})</TableHead>
                          <TableHead scope="col">Puntos</TableHead>
                          <TableHead scope="col">Valor negocio</TableHead>
                          <TableHead scope="col">Vigente desde</TableHead>
                          <TableHead scope="col">Vigente hasta</TableHead>
                          <TableHead scope="col">Actualizado por</TableHead>
                          <TableHead scope="col">
                            <span className="sr-only">Guardar</span>
                          </TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {priceTypes.map((pt) => (
                          <PriceRow
                            key={pt.id}
                            rowId={rowKey(countryId, pt.id)}
                            priceType={pt}
                            countryName={country.name}
                            currency={currency}
                            values={valuesOf(rowKey(countryId, pt.id))}
                            saved={serverRows[rowKey(countryId, pt.id)]?.price ?? null}
                            isDirty={dirtyKeys.includes(rowKey(countryId, pt.id))}
                            isSaving={savingKey === rowKey(countryId, pt.id)}
                            readOnly={readOnly}
                            allowZero={allowZero}
                            today={today}
                            publicPrice={publicPrice}
                            onChange={setField}
                            onSave={(key) => void saveRow(key)}
                          />
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </section>
              );
            })}
          </div>
        )}

        {/* ---------- Precios desactivados ---------- */}
        <div className="mt-6 border-t border-gray-100 pt-4">
          <button
            type="button"
            onClick={() => setShowInactive((v) => !v)}
            aria-expanded={showInactive}
            className="flex items-center gap-1.5 text-sm font-semibold text-gray-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#3E667D]"
          >
            {showInactive ? <ChevronDown className="h-4 w-4" aria-hidden /> : <ChevronRight className="h-4 w-4" aria-hidden />}
            Precios desactivados
          </button>
          {showInactive ? (
            <div className="mt-3">
              {allQuery.isLoading ? (
                <p className="text-sm text-gray-600" role="status">
                  Cargando…
                </p>
              ) : allQuery.isError ? (
                <p className="text-sm text-gray-700">No se pudieron cargar los precios desactivados.</p>
              ) : inactivePrices.length === 0 ? (
                <p className="text-sm text-gray-600">No hay precios desactivados.</p>
              ) : (
                <ul className="divide-y divide-gray-100 rounded-lg border border-gray-200">
                  {inactivePrices.map((price) => (
                    <li key={price.id} className="flex flex-wrap items-center justify-between gap-2 p-3 text-sm">
                      <div>
                        <p className="font-medium text-gray-900">
                          {countryById(price.countryId)?.name ?? 'País'} ·{' '}
                          {typeById(price.priceTypeId)?.name ?? price.priceTypeName ?? 'Tipo de precio'}
                        </p>
                        <p className="text-xs text-gray-600">
                          {formatCurrency(price.price, price.currencyCode?.trim())} · desactivado el{' '}
                          {price.updatedAt ? new Date(price.updatedAt).toLocaleDateString('es-MX') : '—'}
                          {price.updatedByName ? ` por ${price.updatedByName.split('@')[0]}` : ''}
                        </p>
                      </div>
                      {!readOnly ? (
                        <Button type="button" variant="outline" size="sm" onClick={() => setPriceToReactivate(price)}>
                          Reactivar
                        </Button>
                      ) : null}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          ) : null}
        </div>
      </SectionCard>

      <ConfirmDialog
        open={!!countryToRemove}
        onOpenChange={(open) => {
          if (!open) setCountryToRemove(null);
        }}
        title={`Quitar ${countryToRemove?.name ?? 'país'}`}
        description="Se desactivan TODOS los precios del producto en ese país: deja de venderse ahí en tienda y POS. Puedes reactivarlos desde «Precios desactivados»."
        confirmLabel="Quitar país"
        destructive
        isPending={deactivateCountry.isPending}
        disabled={removeReason.trim().length < 5}
        onConfirm={handleRemoveCountry}
      >
        <div className="space-y-1.5">
          <Label htmlFor={reasonId}>Motivo (mínimo 5 caracteres)</Label>
          <Textarea
            id={reasonId}
            value={removeReason}
            onChange={(e) => setRemoveReason(e.target.value)}
            rows={3}
            maxLength={300}
            aria-required
          />
        </div>
      </ConfirmDialog>

      <ConfirmDialog
        open={!!priceToReactivate}
        onOpenChange={(open) => {
          if (!open) setPriceToReactivate(null);
        }}
        title="Reactivar precio"
        description="El precio vuelve a estar vigente con el importe que tenía al desactivarse. Después puedes ajustarlo en la tabla."
        confirmLabel="Reactivar"
        isPending={setPrice.isPending}
        onConfirm={handleReactivate}
      >
        {priceToReactivate ? (
          <p>
            {countryById(priceToReactivate.countryId)?.name ?? 'País'} ·{' '}
            {typeById(priceToReactivate.priceTypeId)?.name ?? 'Tipo de precio'}:{' '}
            <strong>{formatCurrency(priceToReactivate.price, priceToReactivate.currencyCode?.trim())}</strong>
          </p>
        ) : null}
      </ConfirmDialog>
    </div>
  );
}

// ================================
// Fila
// ================================
interface PriceRowProps {
  rowId: string;
  priceType: PriceType;
  countryName: string;
  currency: string;
  values: RowValues;
  saved: ProductPrice | null;
  isDirty: boolean;
  isSaving: boolean;
  readOnly: boolean;
  allowZero: boolean;
  /** Hoy en México (YYYY-MM-DD): tope de "Vigente desde". */
  today: string;
  publicPrice: number | null;
  onChange: (key: string, field: keyof RowValues, value: string) => void;
  onSave: (key: string) => void;
}

function PriceRow({
  rowId,
  priceType,
  countryName,
  currency,
  values,
  saved,
  isDirty,
  isSaving,
  readOnly,
  allowZero,
  today,
  publicPrice,
  onChange,
  onSave,
}: PriceRowProps) {
  const savedEffectiveFrom = saved ? dateOnly(saved.effectiveFrom) : '';
  const problem = isDirty ? validateRow(values, allowZero, savedEffectiveFrom, today) : null;
  const discount = Number(priceType.discountPercentage) || 0;
  const suggested =
    discount > 0 && priceType.code !== 'public' && publicPrice !== null && publicPrice > 0
      ? publicPrice * (1 - discount / 100)
      : null;
  const label = `${priceType.name} en ${countryName}`;

  const numberInput = (field: 'price' | 'points' | 'businessValue', aria: string) => (
    <Input
      type="number"
      inputMode="decimal"
      step="0.01"
      min={0}
      value={values[field]}
      disabled={readOnly || isSaving}
      onChange={(e) => onChange(rowId, field, e.target.value)}
      aria-label={`${aria}: ${label}`}
      aria-invalid={field === 'price' && !!problem}
      className="h-9 w-28"
      placeholder="0.00"
    />
  );

  const dateInput = (field: 'effectiveFrom' | 'effectiveTo', aria: string) => (
    <Input
      type="date"
      value={values[field]}
      disabled={readOnly || isSaving}
      onChange={(e) => onChange(rowId, field, e.target.value)}
      aria-label={`${aria}: ${label}`}
      // Sin fechas futuras en "Vigente desde": programar va en "Cambios programados".
      max={field === 'effectiveFrom' ? today : undefined}
      className="h-9 w-40"
    />
  );

  return (
    <TableRow className={isDirty ? 'bg-amber-50/60' : undefined}>
      <TableHead scope="row" className="align-top font-normal">
        <p className="font-medium text-gray-900">{priceType.name}</p>
        <p className="text-xs text-gray-600">
          {priceType.code === 'public'
            ? 'Referencia de la tienda; sin él no se vende en el país.'
            : discount > 0
              ? `${discount}% menos que el público${suggested !== null ? ` · sugerido ${formatCurrency(suggested, currency)}` : ''}`
              : (priceType.description ?? 'Precio libre.')}
        </p>
        {problem ? (
          <p className="mt-1 text-xs font-medium text-red-700" role="alert">
            {problem}
          </p>
        ) : null}
      </TableHead>
      <TableCell className="align-top">{numberInput('price', 'Precio')}</TableCell>
      <TableCell className="align-top">{numberInput('points', 'Puntos')}</TableCell>
      <TableCell className="align-top">{numberInput('businessValue', 'Valor negocio')}</TableCell>
      <TableCell className="align-top">{dateInput('effectiveFrom', 'Vigente desde')}</TableCell>
      <TableCell className="align-top">{dateInput('effectiveTo', 'Vigente hasta')}</TableCell>
      <TableCell className="align-top text-xs text-gray-700">
        {saved ? (
          <>
            <p>{saved.updatedByName ? saved.updatedByName.split('@')[0] : '—'}</p>
            <p className="text-gray-600">
              {saved.updatedAt ? new Date(saved.updatedAt).toLocaleDateString('es-MX') : ''}
            </p>
          </>
        ) : (
          <span className="text-gray-600">Sin precio</span>
        )}
      </TableCell>
      <TableCell className="align-top">
        {!readOnly ? (
          <Button
            type="button"
            size="sm"
            variant={isDirty ? 'default' : 'outline'}
            className="h-9"
            disabled={!isDirty || isSaving || !!problem}
            onClick={() => onSave(rowId)}
            aria-label={`Guardar ${label}`}
          >
            {isSaving ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : <Save className="h-4 w-4" aria-hidden />}
          </Button>
        ) : null}
      </TableCell>
    </TableRow>
  );
}
