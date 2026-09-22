'use client';

// Compositor de componentes (receta) de un kit/paquete en la ficha de producto
// (contrato de kits §5.2, sección Componentes). Guarda con reemplazo atómico
// PUT /products/:id/components/bulk (alcance GLOBAL; las promos editan por país
// en /admin/promociones/[id]).
//
// - Por renglón: estado del componente (Inactivo en rojo), existencia total y
//   en la sucursal elegida, aviso "no tiene precio en un país donde el kit sí".
// - Reordenar con ▲▼ (sort_order = posición al guardar), cantidades con coma
//   decimal, "Copiar receta de otro kit…" (reemplaza y guarda).
// - Banner "Hay N ventas/pedidos sin cobrar con este kit" (candado de la receta:
//   el API responde 409 KIT_RECIPE_LOCKED) y encabezado "Con esta receta hoy se
//   pueden vender N en {sucursal}".
// - 422 KIT_COMPONENT_INVALID: la razón del API se marca en cada renglón.
// - La búsqueda solo consulta con 2+ caracteres y 300 ms de retraso.
// - `controller` (opcional) permite a la ficha enterarse de los cambios sin
//   guardar y dispararlos desde "Guardar todo".

import { useCallback, useEffect, useId, useMemo, useRef, useState, type ReactNode } from 'react';
import { Check, ChevronDown, ChevronUp, Copy, Loader2, Plus, Search, Trash2, TriangleAlert } from 'lucide-react';
import { toast } from 'sonner';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useKitComponents, useReplaceKitComponents } from '@/hooks/useKits';
import { useProducts } from '@/hooks/useProducts';
import { ProductType } from '@/types/product';
import type { Product } from '@/types/product';
import type { BulkComponentItem } from '@/types/kit';
import type { KitComponentsScope } from '@/services/kits.service';
import { fmt, recipeHeadline, recipeSellableAt, type KitStockMode } from '@/lib/kits/kit-availability';
import { componentInvalidRows, formatQuantity, isValidQuantity, moveRow, parseQuantity } from '@/lib/kits/kit-editor';
import { recipeLockSentence } from '@/lib/kits/kit-readiness';
import { CopyRecipeDialog } from './CopyRecipeDialog';
import { parseProductAdminError, productAdminErrorMessage } from './lib/errors';

type CompRow = BulkComponentItem & {
  productName: string;
  productCode: string;
  /** Texto tal como lo teclea la persona (acepta coma decimal). */
  quantityText: string;
};

export interface ComponentsSectionController {
  onDirtyChange: (dirty: boolean) => void;
  bind: (handle: { save: () => Promise<boolean>; discard: () => void }) => void;
}

/** Existencias de los componentes en la sucursal elegida (solo lectura, contrato kits §5.2). */
export interface ComponentsStockContext {
  branchName: string;
  /** Por `componentProductId`. Un componente ausente = sin dato en esa sucursal. */
  byComponent: Map<string, { available: number; onHand: number; reserved: number; isActive: boolean }>;
  loading?: boolean;
}

/** Estado y existencia TOTAL de cada componente (detalle de disponibilidad sin sucursal). */
export interface ComponentInfo {
  isActive: boolean;
  /** Suma de disponible en las sucursales del universo del kit. */
  totalAvailable: number;
  /** `false` = sin precio vigente en un país donde el kit sí tiene precio. */
  hasPriceInKitCountries: boolean | null;
}

interface ProductComponentsSectionProps {
  productId: string;
  /** Cómo se surte (kit/paquete); `null` = otro tipo de producto. */
  stockMode?: KitStockMode | null;
  /** Tipo para el buscador de "Copiar receta de otro kit…". */
  productType?: 'kit' | 'pack';
  /** Sustantivo para los textos ("kit" | "paquete"). Default: "producto". */
  noun?: string;
  readOnly?: boolean;
  controller?: ComponentsSectionController;
  onSaved?: () => void;
  /** Selector de sucursal u otros controles que se pintan bajo el encabezado. */
  toolbar?: ReactNode;
  /** Con esto cada renglón muestra cuánto hay del componente y el encabezado cuántos kits salen. */
  stockContext?: ComponentsStockContext;
  /** Por `componentProductId`: estado, existencia total y precio por país. */
  componentInfo?: Map<string, ComponentInfo>;
  /** Ventas POS / pedidos sin cobrar con el kit (readiness.recipeLock). */
  recipeLock?: { pendingSales: number; pendingOrders: number } | null;
  /** Ir a la sección Kit (cambiar cómo se surte). */
  onGoToKit?: () => void;
  /** `global` = solo la receta global (ficha del kit). Default: todos los renglones. */
  scope?: KitComponentsScope;
}

const sameRows = (a: CompRow[], b: CompRow[]): boolean =>
  a.length === b.length &&
  a.every((row, i) => row.componentProductId === b[i].componentProductId && row.quantity === b[i].quantity);

const rowIsInvalid = (row: CompRow): boolean => !isValidQuantity(row.quantity);

/** `warnings: string[]` que cada renglón guardado puede traer (sin repetidos). */
function responseWarnings(saved: unknown): string[] {
  const out = new Set<string>();
  if (!Array.isArray(saved)) return [];
  for (const row of saved) {
    const raw = typeof row === 'object' && row !== null ? (row as { warnings?: unknown }).warnings : undefined;
    if (!Array.isArray(raw)) continue;
    for (const w of raw) if (typeof w === 'string' && w.length > 0) out.add(w);
  }
  return Array.from(out);
}

export function ProductComponentsSection({
  productId,
  stockMode = null,
  productType,
  noun = 'producto',
  readOnly = false,
  controller,
  onSaved,
  toolbar,
  stockContext,
  componentInfo,
  recipeLock,
  onGoToKit,
  scope = 'all',
}: ProductComponentsSectionProps) {
  const searchId = useId();
  const { data: components, isLoading: compsLoading } = useKitComponents(productId, scope);
  const replaceComponents = useReplaceKitComponents(productId);

  const serverRows = useMemo<CompRow[]>(
    () =>
      (components ?? []).map((c) => ({
        componentProductId: c.componentProductId ?? '',
        productName: c.componentProductName ?? '',
        productCode: c.componentProductCode ?? '',
        quantity: Number(c.quantity),
        quantityText: formatQuantity(Number(c.quantity)),
        sortOrder: c.sortOrder,
      })),
    [components],
  );

  // `draft` = edición local; null = se muestra lo guardado.
  const [draft, setDraft] = useState<CompRow[] | null>(null);
  const rows = draft ?? serverRows;
  const isDirty = draft !== null && !sameRows(draft, serverRows);
  const hasInvalidQty = rows.some(rowIsInvalid);
  // Razón por renglón del último 422 KIT_COMPONENT_INVALID (se limpia al editar).
  const [rowErrors, setRowErrors] = useState<Map<string, string>>(new Map());
  const [copyOpen, setCopyOpen] = useState(false);

  const setRows = (next: CompRow[]) => {
    setDraft(next);
    if (rowErrors.size > 0) setRowErrors(new Map());
  };

  const [productSearch, setProductSearch] = useState('');
  const [term, setTerm] = useState('');
  useEffect(() => {
    const t = setTimeout(() => setTerm(productSearch.trim()), 300);
    return () => clearTimeout(t);
  }, [productSearch]);
  const searchEnabled = term.length >= 2;

  const { data: productSearchResults, isFetching: searching } = useProducts(
    { search: term, isActive: true, limit: 10, productType: ProductType.FINISHED_GOOD },
    { enabled: searchEnabled },
  );

  const addComponent = (p: Product) => {
    if (p.id === productId) {
      toast.warning('Un producto no puede ser componente de sí mismo');
      return;
    }
    if (rows.some((r) => r.componentProductId === p.id)) {
      toast.warning(`Ese producto ya está en el ${noun}`);
      return;
    }
    setRows([
      ...rows,
      { componentProductId: p.id, productName: p.name, productCode: p.code, quantity: 1, quantityText: '1', sortOrder: rows.length },
    ]);
    setProductSearch('');
  };

  const removeRow = (pid: string) => setRows(rows.filter((r) => r.componentProductId !== pid));

  const updateQty = (pid: string, text: string) =>
    setRows(
      rows.map((r) => {
        if (r.componentProductId !== pid) return r;
        const parsed = parseQuantity(text);
        return { ...r, quantityText: text, quantity: parsed === null ? NaN : parsed };
      }),
    );

  const move = (index: number, direction: -1 | 1) => setRows(moveRow(rows, index, direction));

  const handleSave = useCallback(async (): Promise<boolean> => {
    if (!isDirty) return true;
    if (hasInvalidQty) {
      toast.error('Todas las cantidades deben ser mayores a cero (acepta coma o punto decimal)');
      return false;
    }
    try {
      const saved = await replaceComponents.mutateAsync({
        components: rows.map((r, i) => ({
          componentProductId: r.componentProductId,
          quantity: r.quantity,
          sortOrder: i,
        })),
      });
      setDraft(null);
      setRowErrors(new Map());
      toast.success('Composición guardada');
      // Avisos no bloqueantes del API (p. ej. componente sin precio en un país del kit).
      for (const w of responseWarnings(saved)) toast.warning(w);
      onSaved?.();
      return true;
    } catch (err) {
      const body = parseProductAdminError(err);
      if (body.code === 'KIT_COMPONENT_INVALID') {
        const byRow = new Map<string, string>();
        for (const r of componentInvalidRows(body.details)) {
          const key = r.componentProductId || rows.find((x) => x.productCode === r.code)?.componentProductId || '';
          if (key) byRow.set(key, r.label);
        }
        setRowErrors(byRow);
      }
      toast.error(productAdminErrorMessage(err, 'No se pudieron guardar los componentes'));
      return false;
    }
  }, [hasInvalidQty, isDirty, onSaved, replaceComponents, rows]);

  const discard = useCallback(() => {
    setDraft(null);
    setRowErrors(new Map());
  }, []);

  // Enlace opcional con la ficha (cambios sin guardar + "Guardar todo").
  const handlers = useRef({ handleSave, discard });
  useEffect(() => {
    handlers.current = { handleSave, discard };
  }, [handleSave, discard]);
  const bind = controller?.bind;
  const onDirtyChange = controller?.onDirtyChange;
  useEffect(() => {
    bind?.({ save: () => handlers.current.handleSave(), discard: () => handlers.current.discard() });
  }, [bind]);
  useEffect(() => {
    onDirtyChange?.(isDirty);
  }, [isDirty, onDirtyChange]);

  const results = searchEnabled ? (productSearchResults?.data ?? []) : [];

  // Con la receta que se está editando (borrador incluido) y las existencias de
  // la sucursal elegida: cuántos kits salen hoy y qué renglón limita.
  const recipeStock = useMemo(
    () => (stockContext && !compsLoading ? recipeSellableAt(rows, stockContext.byComponent) : null),
    [stockContext, rows, compsLoading],
  );

  const lockSentence = recipeLock ? recipeLockSentence(recipeLock) : null;
  const assembles = stockMode === 'assemble_on_sale';
  const canEdit = !readOnly;

  return (
    <Card className="p-0">
      <CardContent className="space-y-4 p-4 sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="flex items-center gap-2 text-lg font-bold text-gray-900">
            Componentes ({rows.length})
            {isDirty ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800">
                <span className="h-1.5 w-1.5 rounded-full bg-amber-500" aria-hidden />
                Sin guardar
              </span>
            ) : null}
          </h2>
          {canEdit ? (
            <div className="flex flex-wrap items-center gap-2">
              {productType ? (
                <Button type="button" variant="outline" size="sm" onClick={() => setCopyOpen(true)} disabled={replaceComponents.isPending || compsLoading}>
                  <Copy className="mr-2 h-4 w-4" aria-hidden />
                  Copiar receta de otro {productType === 'pack' ? 'paquete' : 'kit'}…
                </Button>
              ) : null}
              <Button type="button" variant="ghost" size="sm" onClick={discard} disabled={!isDirty || replaceComponents.isPending}>
                Descartar
              </Button>
              <Button
                type="button"
                size="sm"
                onClick={() => void handleSave()}
                disabled={!isDirty || hasInvalidQty || replaceComponents.isPending || compsLoading}
                aria-busy={replaceComponents.isPending}
              >
                {replaceComponents.isPending ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden />
                ) : (
                  <Check className="mr-2 h-4 w-4" aria-hidden />
                )}
                Guardar composición
              </Button>
            </div>
          ) : null}
        </div>

        {lockSentence ? (
          <div className="flex items-start gap-2 rounded-md border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900" role="status">
            <TriangleAlert className="mt-0.5 h-5 w-5 shrink-0" aria-hidden />
            <p>
              <strong>{lockSentence}</strong> Los cambios a la receta se rechazan hasta que se cobren o se cancelen.
            </p>
          </div>
        ) : null}

        {toolbar ? <div className="rounded-lg border border-gray-200 bg-gray-50 p-3">{toolbar}</div> : null}

        {stockContext && rows.length > 0 ? (
          <p className="text-sm font-semibold text-gray-900" role="status" aria-live="polite">
            {stockContext.loading
              ? `Consultando existencias en ${stockContext.branchName}…`
              : recipeStock
                ? `${recipeHeadline(recipeStock.sellable, stockContext.branchName)}${
                    recipeStock.unknown > 0
                      ? ` (sin contar ${recipeStock.unknown} ${recipeStock.unknown === 1 ? 'componente sin dato' : 'componentes sin dato'})`
                      : ''
                  }${isDirty ? ' Con la receta sin guardar.' : ''}`
                : ''}
          </p>
        ) : null}

        {assembles && !compsLoading && rows.length === 0 ? (
          <div className="flex items-start gap-2 rounded-md border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900">
            <TriangleAlert className="mt-0.5 h-5 w-5 shrink-0" aria-hidden />
            <p>
              Este {noun} <strong>se arma al vender</strong> y no tiene receta: no se puede vender hasta que agregues sus
              componentes. Si está activo, el sistema tampoco dejará guardarlo sin receta.
            </p>
          </div>
        ) : null}

        {stockMode === 'prebuilt' && !compsLoading && rows.length > 0 ? (
          <div className="flex items-start gap-2 rounded-md border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900">
            <TriangleAlert className="mt-0.5 h-5 w-5 shrink-0" aria-hidden />
            <p>
              Este {noun} es <strong>prearmado</strong>: la receta es informativa, el POS descuenta la pieza propia del {noun}.
              {onGoToKit ? (
                <>
                  {' '}
                  Si debe armarse al vender, cámbialo en{' '}
                  <button type="button" className="font-medium underline" onClick={onGoToKit}>
                    la sección {noun === 'paquete' ? 'Paquete' : 'Kit'}
                  </button>
                  .
                </>
              ) : null}
            </p>
          </div>
        ) : null}

        {canEdit ? (
          <div className="relative">
            <Label htmlFor={searchId} className="sr-only">
              Buscar producto para agregarlo como componente
            </Label>
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500" aria-hidden />
            <Input
              id={searchId}
              type="search"
              value={productSearch}
              onChange={(e) => setProductSearch(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') e.preventDefault();
              }}
              placeholder="Buscar producto para agregar (mínimo 2 caracteres)…"
              className="pl-9"
              autoComplete="off"
            />
            {searchEnabled ? (
              <div className="absolute z-10 mt-1 max-h-72 w-full overflow-y-auto rounded-md border border-gray-200 bg-white shadow-lg">
                {searching && results.length === 0 ? (
                  <p className="px-4 py-3 text-sm text-gray-600" role="status">
                    Buscando…
                  </p>
                ) : results.length === 0 ? (
                  <p className="px-4 py-3 text-sm text-gray-700">Sin resultados para «{term}».</p>
                ) : (
                  <ul>
                    {results.map((p) => (
                      <li key={p.id}>
                        <button
                          type="button"
                          onClick={() => addComponent(p)}
                          className="flex min-h-11 w-full items-center justify-between px-4 py-2 text-left hover:bg-gray-50 focus-visible:bg-gray-50 focus-visible:outline-none"
                        >
                          <span>
                            <span className="block text-sm font-medium text-gray-900">{p.name}</span>
                            <span className="block font-mono text-xs text-gray-600">{p.code}</span>
                          </span>
                          <Plus className="h-4 w-4 text-[#3E667D]" aria-hidden />
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            ) : null}
          </div>
        ) : null}

        {compsLoading ? (
          <p className="flex items-center gap-2 text-sm text-gray-600" role="status">
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> Cargando componentes…
          </p>
        ) : rows.length === 0 ? (
          <div className="rounded-lg border-2 border-dashed py-10 text-center text-gray-700">
            <p className="text-sm">
              No hay componentes.{canEdit ? ` Busca productos arriba para agregarlos al ${noun}.` : ''}
            </p>
          </div>
        ) : (
          <ol className="space-y-2">
            {rows.map((row, index) => {
              const qtyId = `${searchId}-qty-${row.componentProductId}`;
              const invalid = rowIsInvalid(row);
              const apiError = rowErrors.get(row.componentProductId);
              const info = componentInfo?.get(row.componentProductId);
              const stock = stockContext && !stockContext.loading ? stockContext.byComponent.get(row.componentProductId) : undefined;
              const inactive = info?.isActive === false || stock?.isActive === false;
              const noPrice = info?.hasPriceInKitCountries === false;
              const qtyForStock = invalid ? 1 : row.quantity;
              const short = stock ? stock.available < qtyForStock : false;
              const limitsRecipe = recipeStock?.limiting?.componentProductId === row.componentProductId && rows.length > 1;
              const problem = short || inactive || !!apiError;
              return (
                <li
                  key={row.componentProductId}
                  className={`flex flex-wrap items-center gap-3 rounded-md border p-3 ${problem ? 'border-red-200 bg-red-50/40' : 'border-gray-200'}`}
                >
                  {canEdit ? (
                    <div className="flex flex-col">
                      <button
                        type="button"
                        onClick={() => move(index, -1)}
                        disabled={index === 0}
                        className="rounded p-0.5 text-gray-600 hover:bg-gray-100 disabled:opacity-30"
                        aria-label={`Subir ${row.productName}`}
                      >
                        <ChevronUp className="h-4 w-4" aria-hidden />
                      </button>
                      <button
                        type="button"
                        onClick={() => move(index, 1)}
                        disabled={index === rows.length - 1}
                        className="rounded p-0.5 text-gray-600 hover:bg-gray-100 disabled:opacity-30"
                        aria-label={`Bajar ${row.productName}`}
                      >
                        <ChevronDown className="h-4 w-4" aria-hidden />
                      </button>
                    </div>
                  ) : (
                    <span className="w-6 text-center font-mono text-xs text-gray-500">{index + 1}</span>
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-gray-900">
                      {row.productName}
                      {inactive ? (
                        <span className="ml-2 rounded-full bg-red-100 px-1.5 py-0.5 text-[11px] font-medium text-red-800">Inactivo</span>
                      ) : null}
                    </p>
                    <p className="font-mono text-xs text-gray-600">{row.productCode}</p>
                    {apiError ? (
                      <p className="mt-1 text-xs font-medium text-red-700" role="alert">
                        {row.productCode}: {apiError}
                      </p>
                    ) : null}
                    {noPrice ? (
                      <p className="mt-1 text-xs text-amber-800">
                        Este componente no tiene precio en un país donde el {noun} sí lo tiene.
                      </p>
                    ) : null}
                    {info ? (
                      <p className="mt-1 text-xs text-gray-700">
                        Existencia total: <span className="font-semibold">{fmt(info.totalAvailable)}</span>
                      </p>
                    ) : null}
                    {stockContext ? (
                      <p className="mt-1 text-xs text-gray-700">
                        {stockContext.loading ? (
                          'Consultando…'
                        ) : !stock ? (
                          <span className="text-gray-500">Sin dato en {stockContext.branchName}</span>
                        ) : (
                          <>
                            Hay <span className={short ? 'font-semibold text-red-700' : 'font-semibold'}>{fmt(stock.available)}</span> en{' '}
                            {stockContext.branchName}
                            {stock.reserved > 0 ? ` (${fmt(stock.onHand)} en piso, ${fmt(stock.reserved)} apartadas)` : ''} · se pueden armar{' '}
                            <span className="font-semibold">{fmt(Math.floor(stock.available / qtyForStock))}</span>
                            {short ? (
                              <span className="ml-2 rounded-full bg-red-100 px-1.5 py-0.5 text-[11px] font-semibold text-red-800">
                                Falta {fmt(qtyForStock - stock.available)}
                              </span>
                            ) : limitsRecipe ? (
                              <span className="ml-2 rounded-full bg-amber-100 px-1.5 py-0.5 text-[11px] font-medium text-amber-800">
                                Es el que limita
                              </span>
                            ) : null}
                          </>
                        )}
                      </p>
                    ) : null}
                  </div>
                  <div className="flex items-center gap-2">
                    <Label htmlFor={qtyId} className="text-xs text-gray-700">
                      Cantidad
                    </Label>
                    <Input
                      id={qtyId}
                      type="text"
                      inputMode="decimal"
                      value={row.quantityText}
                      disabled={!canEdit}
                      aria-invalid={invalid}
                      aria-describedby={invalid ? `${qtyId}-error` : undefined}
                      onChange={(e) => updateQty(row.componentProductId, e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') e.preventDefault();
                      }}
                      className="h-9 w-24 text-right"
                      autoComplete="off"
                    />
                    {invalid ? (
                      <span id={`${qtyId}-error`} className="text-xs font-medium text-red-700" role="alert">
                        Mayor a 0
                      </span>
                    ) : null}
                  </div>
                  {canEdit ? (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-9 text-red-700 hover:text-red-800"
                      onClick={() => removeRow(row.componentProductId)}
                      aria-label={`Quitar ${row.productName}`}
                    >
                      <Trash2 className="h-4 w-4" aria-hidden />
                    </Button>
                  ) : null}
                </li>
              );
            })}
          </ol>
        )}

        <p className="border-t pt-3 text-xs text-gray-600">
          {assembles
            ? `Al cobrar el ${noun} se descuenta de cada componente la cantidad indicada; si falta uno solo, el ${noun} no se puede vender.`
            : `La cantidad es cuántas piezas de cada componente lleva un ${noun}. Se acepta coma o punto decimal.`}
        </p>
      </CardContent>

      {productType ? (
        <CopyRecipeDialog
          productId={productId}
          productType={productType}
          currentRows={rows.length}
          open={copyOpen}
          onOpenChange={setCopyOpen}
          onCopied={() => {
            setDraft(null);
            setRowErrors(new Map());
            onSaved?.();
          }}
        />
      ) : null}
    </Card>
  );
}
