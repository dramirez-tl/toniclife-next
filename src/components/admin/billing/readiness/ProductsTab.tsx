'use client';

// Pestaña Productos: clave SAT (c_ClaveProdServ), unidad (c_ClaveUnidad) y
// regla de IVA por producto. Sin estos tres datos el concepto del CFDI no se
// puede armar. Edición por fila en un Dialog con SatCodeSearch (busca en el
// PAC) e importación masiva por CSV.

import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';
import { ArrowDownTrayIcon, ArrowUpTrayIcon, PencilIcon } from '@heroicons/react/24/outline';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { SearchableSelect, type SearchableSelectOption } from '@/components/ui/SearchableSelect';
import { DataTable, DataTablePagination, type DataTableColumn } from '@/components/ui/DataTable';
import { useReadinessProducts, useUpdateProductFiscal } from '@/hooks/useBilling';
import { useActiveTaxRules } from '@/hooks/useConfig';
import type { useQueryFilters } from '@/hooks/useQueryFilters';
import { billingService } from '@/services/billing.service';
import { billingErrorMessage } from '@/lib/billing-error';
import { saveBlob } from '@/lib/download';
import { SatCodeSearch } from '@/components/admin/billing/SatCodeSearch';
import { ProductFiscalImportDialog } from '@/components/admin/billing/ProductFiscalImportDialog';
import {
  isValidSatProductCode,
  isValidSatUnitCode,
  taxRatePct,
  type ProductMissingFilter,
  type ReadinessProductRow,
  type UpdateProductFiscalDto,
} from '@/types/billing';

type QueryFilters = ReturnType<typeof useQueryFilters>;

const MISSING_OPTIONS: { value: ProductMissingFilter; label: string }[] = [
  { value: 'any', label: 'Con algún faltante' },
  { value: 'sat', label: 'Sin clave o unidad SAT' },
  { value: 'tax', label: 'Sin regla IVA' },
  { value: 'none', label: 'Listos' },
];

function isMissingFilter(v: string): v is ProductMissingFilter {
  return MISSING_OPTIONS.some((o) => o.value === v);
}

const PRODUCT_TYPE_LABELS: Record<string, string> = {
  simple: 'Producto',
  kit: 'Kit',
  pack: 'Paquete',
  promotional: 'Promocional',
  service: 'Servicio',
};

/** Reglas de IVA para el select del diálogo, cargadas una vez por pestaña. */
interface IvaRulesState {
  options: SearchableSelectOption[];
  isLoading: boolean;
  error: unknown;
}

export function ProductsTab({ canManage, filters }: { canManage: boolean; filters: QueryFilters }) {
  const { get, getNumber, setParams } = filters;
  const missingParam = get('missing');
  const missing: ProductMissingFilter | 'all' = isMissingFilter(missingParam)
    ? missingParam
    : missingParam === 'all'
      ? 'all'
      : 'any';
  const search = get('search');
  const page = getNumber('page') || 1;
  const limit = getNumber('limit') || 25;

  const [searchDraft, setSearchDraft] = useState(search);
  const [importOpen, setImportOpen] = useState(false);
  const [editing, setEditing] = useState<ReadinessProductRow | null>(null);
  const [downloading, setDownloading] = useState(false);

  useEffect(() => {
    if (searchDraft === search) return;
    const t = setTimeout(() => setParams({ search: searchDraft.trim() || null, page: null }), 300);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchDraft]);

  const { data, isLoading, isFetching, error } = useReadinessProducts({
    missing: missing === 'all' ? undefined : missing,
    search: search || undefined,
    page,
    limit,
  });
  const rows = data?.data ?? [];
  const total = data?.total ?? 0;

  // Reglas de IVA desde el endpoint público de activas: `/config/tax-rules`
  // exige admin y Contabilidad (billing:manage) no lo es. Se filtra por tipo
  // IVA aquí; si falla, se avisa en la pestaña (el select quedaría vacío sin
  // explicación).
  const { data: taxRules, isLoading: rulesLoading, error: rulesError } = useActiveTaxRules();
  const ivaRules = useMemo<IvaRulesState>(
    () => ({
      options: (taxRules ?? [])
        .filter((r) => r.taxType === 'iva' && r.isActive)
        .map((r) => ({ value: r.id, label: `${r.name} (${taxRatePct(r.rate)})`, hint: r.code })),
      isLoading: rulesLoading,
      error: rulesError,
    }),
    [taxRules, rulesLoading, rulesError],
  );

  const downloadTemplate = async () => {
    setDownloading(true);
    try {
      const blob = await billingService.downloadProductFiscalTemplate();
      saveBlob(blob, 'productos-claves-sat.csv', 'text/csv;charset=utf-8;');
      toast.success('Plantilla descargada');
    } catch (err) {
      toast.error(billingErrorMessage(err, 'No se pudo descargar la plantilla'));
    } finally {
      setDownloading(false);
    }
  };

  const columns: DataTableColumn<ReadinessProductRow>[] = [
    {
      key: 'product',
      header: 'Producto',
      render: (row) => (
        <div className="min-w-0">
          <p className="truncate font-medium text-gray-900" title={row.name}>
            {row.name}
          </p>
          <p className="font-mono text-xs text-muted-foreground">
            {row.sku}
            {!row.isActive ? ' · inactivo' : ''}
          </p>
        </div>
      ),
    },
    {
      key: 'type',
      header: 'Tipo',
      cellClassName: 'text-sm text-gray-700',
      render: (row) => PRODUCT_TYPE_LABELS[row.productType] ?? row.productType,
    },
    {
      key: 'satProductCode',
      header: 'Clave SAT',
      render: (row) =>
        row.satProductCode ? (
          <span className="font-mono text-sm">{row.satProductCode}</span>
        ) : (
          <Badge variant="destructive">Falta</Badge>
        ),
    },
    {
      key: 'satUnitCode',
      header: 'Unidad SAT',
      render: (row) =>
        row.satUnitCode ? (
          <span className="font-mono text-sm">{row.satUnitCode}</span>
        ) : (
          <Badge variant="destructive">Falta</Badge>
        ),
    },
    {
      key: 'tax',
      header: 'IVA',
      render: (row) =>
        row.isTaxExempt ? (
          <Badge variant="info">Exento</Badge>
        ) : row.taxRuleId ? (
          <span className="text-sm text-gray-700">
            {row.taxRuleName ?? 'Regla'}
            {row.taxRate !== null ? ` (${taxRatePct(row.taxRate)})` : ''}
          </span>
        ) : (
          <Badge variant="destructive">Sin regla</Badge>
        ),
    },
    {
      key: 'status',
      header: 'Estado',
      render: (row) =>
        row.ready ? <Badge variant="success">Listo</Badge> : <Badge variant="warning">Incompleto</Badge>,
    },
    {
      key: 'actions',
      header: 'Acciones',
      headerClassName: 'text-right',
      cellClassName: 'text-right',
      render: (row) => (
        <Button
          variant="outline"
          size="sm"
          onClick={() => setEditing(row)}
          disabled={!canManage}
          aria-label={`Editar datos fiscales de ${row.sku}`}
        >
          <PencilIcon className="mr-1.5 h-4 w-4" />
          Editar
        </Button>
      ),
    },
  ];

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Cada concepto del CFDI lleva la <strong>clave de producto o servicio</strong> del SAT, la{' '}
        <strong>unidad</strong> y el <strong>IVA</strong> que aplica (regla o exento). Un producto sin
        alguno de los tres no se puede facturar. Puedes capturarlos uno por uno o en bloque con la
        plantilla CSV.
      </p>

      <Card>
        <CardContent className="space-y-4 p-4 sm:p-6">
          <div className="grid gap-3 md:grid-cols-3">
            <div className="md:col-span-2">
              <Label htmlFor="pr-search" className="mb-1 block text-xs text-muted-foreground">
                Buscar
              </Label>
              <Input
                id="pr-search"
                value={searchDraft}
                onChange={(e) => setSearchDraft(e.target.value)}
                placeholder="SKU o nombre"
                maxLength={100}
              />
            </div>
            <div>
              <Label htmlFor="pr-missing" className="mb-1 block text-xs text-muted-foreground">
                Mostrar
              </Label>
              <SearchableSelect
                id="pr-missing"
                options={MISSING_OPTIONS}
                value={missing}
                onChange={(v) => setParams({ missing: v, page: null })}
                allLabel="Todos los activos"
                allValue="all"
              />
            </div>
          </div>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="text-xs text-muted-foreground">
              {isFetching && !isLoading ? 'Actualizando…' : `${total} producto(s)`}
            </span>
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" size="sm" onClick={() => void downloadTemplate()} disabled={downloading}>
                {downloading ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <ArrowDownTrayIcon className="mr-2 h-4 w-4" />
                )}
                Descargar plantilla CSV
              </Button>
              <Button size="sm" onClick={() => setImportOpen(true)} disabled={!canManage}>
                <ArrowUpTrayIcon className="mr-2 h-4 w-4" />
                Importar CSV
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {ivaRules.error ? (
        <Card className="border-amber-300 bg-amber-50/60" role="alert">
          <CardContent className="p-4 text-sm text-amber-900">
            No se pudieron cargar las reglas de IVA, así que no se puede asignar una regla al editar:{' '}
            {billingErrorMessage(ivaRules.error, 'error al consultar /config/tax-rules/active')}
          </CardContent>
        </Card>
      ) : null}

      {error && !data ? (
        <Card className="border-destructive/40">
          <CardContent className="p-4 text-sm text-destructive">
            {billingErrorMessage(error, 'No se pudo cargar el listado de productos')}
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-0 sm:p-4">
            <DataTable
              columns={columns}
              data={rows}
              getRowKey={(row) => row.id}
              isLoading={isLoading}
              emptyMessage={
                missing === 'none'
                  ? 'Ningún producto está listo todavía.'
                  : missing === 'any'
                    ? 'No hay productos con faltantes: todos tienen clave, unidad e IVA.'
                    : 'No hay productos con ese criterio.'
              }
            />
            {total > 0 && (
              <DataTablePagination
                className="px-4 pb-4 sm:px-0 sm:pb-0"
                currentPage={page}
                pageSize={limit}
                totalItems={total}
                isLoading={isFetching}
                onPageChange={(p) => setParams({ page: String(p) })}
                onPageSizeChange={(size) => setParams({ limit: String(size), page: null })}
                pageSizeOptions={[25, 50, 100]}
              />
            )}
          </CardContent>
        </Card>
      )}

      <ProductFiscalImportDialog open={importOpen} onOpenChange={setImportOpen} />
      <ProductFiscalDialog
        product={editing}
        ivaRules={ivaRules}
        open={!!editing}
        onOpenChange={(open) => {
          if (!open) setEditing(null);
        }}
      />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Dialog de edición por producto
// ---------------------------------------------------------------------------

interface ProductForm {
  satProductCode: string;
  satUnitCode: string;
  taxRuleId: string;
  isTaxExempt: boolean;
}

function fromRow(row: ReadinessProductRow): ProductForm {
  return {
    satProductCode: row.satProductCode ?? '',
    satUnitCode: row.satUnitCode ?? '',
    taxRuleId: row.taxRuleId ?? '',
    isTaxExempt: row.isTaxExempt,
  };
}

function ProductFiscalDialog({
  product,
  ivaRules,
  open,
  onOpenChange,
}: {
  product: ReadinessProductRow | null;
  ivaRules: IvaRulesState;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-xl">
        {/* Formulario montado por producto (key): estado inicial desde la fila,
            descartado al cerrar; sin efectos de sincronización. */}
        {product && (
          <ProductFiscalForm
            key={product.id}
            product={product}
            ivaRules={ivaRules}
            onClose={() => onOpenChange(false)}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}

function ProductFiscalForm({
  product,
  ivaRules,
  onClose,
}: {
  product: ReadinessProductRow;
  ivaRules: IvaRulesState;
  onClose: () => void;
}) {
  const [form, setForm] = useState<ProductForm>(() => fromRow(product));
  const [touched, setTouched] = useState(false);
  const update = useUpdateProductFiscal();
  const { options: ivaOptions, isLoading: loadingRules, error: rulesError } = ivaRules;

  const errors = {
    satProductCode:
      form.satProductCode && !isValidSatProductCode(form.satProductCode)
        ? 'La clave de producto SAT son 8 dígitos'
        : '',
    satUnitCode:
      form.satUnitCode && !isValidSatUnitCode(form.satUnitCode)
        ? 'La unidad SAT son 2 o 3 caracteres (H87, E48, KGM)'
        : '',
  };
  const hasErrors = Object.values(errors).some(Boolean);
  const showError = (key: keyof typeof errors) => (touched ? errors[key] : '');

  const willBeReady =
    isValidSatProductCode(form.satProductCode) &&
    isValidSatUnitCode(form.satUnitCode) &&
    (form.isTaxExempt || !!form.taxRuleId);

  const submit = async () => {
    setTouched(true);
    if (hasErrors) return;
    const original = fromRow(product);
    const dto: UpdateProductFiscalDto = {};
    if (form.satProductCode && form.satProductCode !== original.satProductCode) {
      dto.satProductCode = form.satProductCode.trim();
    }
    if (form.satUnitCode && form.satUnitCode !== original.satUnitCode) {
      dto.satUnitCode = form.satUnitCode.trim().toUpperCase();
    }
    if (form.taxRuleId !== original.taxRuleId) {
      dto.taxRuleId = form.taxRuleId || null;
    }
    if (form.isTaxExempt !== original.isTaxExempt) {
      dto.isTaxExempt = form.isTaxExempt;
    }
    if (Object.keys(dto).length === 0) {
      onClose();
      return;
    }
    try {
      await update.mutateAsync({ id: product.id, data: dto });
      onClose();
    } catch {
      // El hook ya avisó (incluye el 503 cuando el PAC no responde).
    }
  };

  return (
    <>
      <DialogHeader>
        <DialogTitle>Datos fiscales del producto</DialogTitle>
        <DialogDescription>
          <span className="font-medium text-foreground">{product.name}</span>{' '}
          <span className="font-mono">· {product.sku}</span>. Las claves se validan contra el
          catálogo del SAT al guardar.
        </DialogDescription>
      </DialogHeader>

      <div className="space-y-4">
        <div>
          <Label htmlFor="pf-product-code">Clave de producto o servicio SAT *</Label>
          {/* Sin X de "Quitar clave": el API no admite vaciar una clave ya
              guardada (un '' nunca se envía), así que el botón solo confundía. */}
          <SatCodeSearch
            id="pf-product-code"
            kind="product"
            value={form.satProductCode}
            onChange={(code) => setForm((p) => ({ ...p, satProductCode: code }))}
            allowClear={false}
          />
          <p id="pf-product-code-hint" className="mt-1 text-xs text-muted-foreground">
            Escribe el código completo (8 dígitos) o una palabra de la descripción, p. ej. «suplemento».
          </p>
          {showError('satProductCode') && (
            <p id="pf-product-code-error" className="mt-1 text-xs text-red-600" role="alert">
              {errors.satProductCode}
            </p>
          )}
        </div>

        <div>
          <Label htmlFor="pf-unit-code">Unidad SAT *</Label>
          <SatCodeSearch
            id="pf-unit-code"
            kind="unit"
            value={form.satUnitCode}
            onChange={(code) => setForm((p) => ({ ...p, satUnitCode: code }))}
            allowClear={false}
          />
          <p id="pf-unit-code-hint" className="mt-1 text-xs text-muted-foreground">
            Para productos físicos casi siempre es H87 (Pieza); para servicios, E48.
          </p>
          {showError('satUnitCode') && (
            <p id="pf-unit-code-error" className="mt-1 text-xs text-red-600" role="alert">
              {errors.satUnitCode}
            </p>
          )}
        </div>

        <div className="grid gap-4 sm:grid-cols-[1fr_auto] sm:items-end">
          <div>
            <Label htmlFor="pf-tax-rule">Regla de IVA</Label>
            <SearchableSelect
              id="pf-tax-rule"
              aria-describedby={rulesError ? 'pf-tax-rule-error' : undefined}
              aria-invalid={!!rulesError}
              options={ivaOptions}
              value={form.taxRuleId}
              onChange={(val) => setForm((p) => ({ ...p, taxRuleId: val }))}
              allLabel="Sin regla"
              allValue=""
              placeholder={
                loadingRules
                  ? 'Cargando reglas…'
                  : rulesError
                    ? 'No se cargaron las reglas'
                    : 'Elige la regla de IVA'
              }
              disabled={loadingRules || !!rulesError || form.isTaxExempt}
            />
            {rulesError ? (
              <p id="pf-tax-rule-error" className="mt-1 text-xs text-red-600" role="alert">
                {billingErrorMessage(rulesError, 'No se pudieron cargar las reglas de IVA')}
              </p>
            ) : null}
          </div>
          <div className="flex items-center gap-2 pb-1">
            <Switch
              id="pf-exempt"
              checked={form.isTaxExempt}
              onCheckedChange={(v) => setForm((p) => ({ ...p, isTaxExempt: v, taxRuleId: v ? '' : p.taxRuleId }))}
            />
            <Label htmlFor="pf-exempt">Exento de IVA</Label>
          </div>
        </div>

        <p className={`text-xs ${willBeReady ? 'text-emerald-700' : 'text-amber-700'}`}>
          {willBeReady
            ? 'Con estos datos el producto queda listo para facturar.'
            : 'Falta clave, unidad o IVA (regla o exento): el producto seguirá marcado como incompleto.'}
        </p>
      </div>

      <DialogFooter>
        <Button variant="outline" onClick={onClose} disabled={update.isPending}>
          Cancelar
        </Button>
        <Button onClick={() => void submit()} disabled={update.isPending}>
          {update.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Guardar
        </Button>
      </DialogFooter>
    </>
  );
}
