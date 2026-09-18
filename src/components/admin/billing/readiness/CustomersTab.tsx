'use client';

// Pestaña Clientes: clientes activos CON RFC y lo que les falta para que el
// CFDI 4.0 pase (régimen, CP fiscal, razón social, uso compatible…). Los chips
// filtran por faltante con el conteo del resumen; cada fila abre el Dialog de
// datos fiscales. Aparte: limpieza masiva de RFC inválidos (vista previa →
// confirmación → aplicar) y tabla informativa de RFC repetidos.

import { useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { ExclamationTriangleIcon, PencilIcon } from '@heroicons/react/24/outline';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { DataTable, DataTablePagination, type DataTableColumn } from '@/components/ui/DataTable';
import { useCleanInvalidRfc, useReadinessCustomers, useRfcDuplicates } from '@/hooks/useBilling';
import type { useQueryFilters } from '@/hooks/useQueryFilters';
import { billingErrorMessage } from '@/lib/billing-error';
import { CustomerFiscalDialog } from '@/components/admin/billing/CustomerFiscalDialog';
import {
  CUSTOMER_ISSUE_INFO,
  CUSTOMER_ISSUE_ORDER,
  type CleanRfcResult,
  type CustomerFiscalIssue,
  type CustomerIssueFilter,
  type ReadinessCustomerRow,
  type ReadinessCustomers,
  type RfcDuplicateGroup,
} from '@/types/billing';

type QueryFilters = ReturnType<typeof useQueryFilters>;

const nf = new Intl.NumberFormat('es-MX');
const DUPLICATES_PAGE_SIZE = 10;

function isIssueFilter(v: string): v is CustomerIssueFilter {
  return v === 'any' || v === 'ready' || (CUSTOMER_ISSUE_ORDER as string[]).includes(v);
}

const COUNT_KEY: Record<CustomerFiscalIssue, keyof ReadinessCustomers> = {
  invalid_rfc: 'invalidRfc',
  duplicate_rfc: 'duplicateRfc',
  missing_regime: 'missingRegime',
  missing_zip: 'missingZip',
  missing_legal_name: 'missingLegalName',
  missing_email: 'missingEmail',
  incompatible_use: 'incompatibleUse',
};

export function CustomersTab({
  canManage,
  filters,
  counts,
}: {
  canManage: boolean;
  filters: QueryFilters;
  counts: ReadinessCustomers | undefined;
}) {
  const { get, getNumber, setParams } = filters;
  const issueParam = get('issue');
  const issue: CustomerIssueFilter = isIssueFilter(issueParam) ? issueParam : 'any';
  const search = get('search');
  const page = getNumber('page') || 1;
  const limit = getNumber('limit') || 25;

  const [searchDraft, setSearchDraft] = useState(search);
  const [editing, setEditing] = useState<ReadinessCustomerRow | null>(null);

  useEffect(() => {
    if (searchDraft === search) return;
    const t = setTimeout(() => setParams({ search: searchDraft.trim() || null, page: null }), 300);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchDraft]);

  const { data, isLoading, isFetching, error } = useReadinessCustomers({
    issue,
    search: search || undefined,
    page,
    limit,
  });
  const rows = data?.data ?? [];
  const total = data?.total ?? 0;

  // "Con faltantes" = clientes con RFC que aún no están listos: el resumen no
  // lo trae directo, pero withRfc − ready es exacto (mismo universo que el
  // listado con issue=any).
  const chips: { value: CustomerIssueFilter; label: string; count?: number; why?: string }[] = [
    { value: 'any', label: 'Con faltantes', count: counts ? counts.withRfc - counts.ready : undefined },
    ...CUSTOMER_ISSUE_ORDER.map((k) => ({
      value: k,
      label: CUSTOMER_ISSUE_INFO[k].label,
      count: counts ? counts[COUNT_KEY[k]] : undefined,
      why: CUSTOMER_ISSUE_INFO[k].why,
    })),
    { value: 'ready', label: 'Listos', count: counts?.ready },
  ];

  const columns: DataTableColumn<ReadinessCustomerRow>[] = [
    {
      key: 'customer',
      header: 'Cliente',
      render: (row) => (
        <div className="min-w-0">
          <p className="truncate font-medium text-gray-900" title={row.name}>
            {row.name}
          </p>
          <p className="font-mono text-xs text-muted-foreground">{row.code ?? '—'}</p>
        </div>
      ),
    },
    {
      key: 'rfc',
      header: 'RFC',
      render: (row) => <span className="font-mono text-sm">{row.rfc}</span>,
    },
    {
      key: 'legalName',
      header: 'Razón social',
      cellClassName: 'text-sm text-gray-700',
      render: (row) => row.legalName || <span className="text-muted-foreground">—</span>,
    },
    {
      key: 'regime',
      header: 'Régimen',
      cellClassName: 'text-sm text-gray-700',
      render: (row) =>
        row.taxRegime ? (
          <span title={row.taxRegimeDescription ?? undefined}>
            {row.taxRegime}
            {row.taxRegimeDescription ? ` — ${row.taxRegimeDescription}` : ''}
          </span>
        ) : (
          <span className="text-muted-foreground">—</span>
        ),
    },
    {
      key: 'use',
      header: 'Uso',
      cellClassName: 'font-mono text-sm text-gray-700',
      render: (row) => row.cfdiUseCode || <span className="font-sans text-muted-foreground">—</span>,
    },
    {
      key: 'zip',
      header: 'CP fiscal',
      cellClassName: 'font-mono text-sm text-gray-700',
      render: (row) => row.fiscalZipCode || <span className="font-sans text-muted-foreground">—</span>,
    },
    {
      key: 'email',
      header: 'Correo fiscal',
      cellClassName: 'text-sm text-gray-700',
      render: (row) =>
        row.fiscalEmail ? (
          row.fiscalEmail
        ) : row.email ? (
          <span title="Correo de contacto (no fiscal)" className="text-muted-foreground">
            {row.email}
          </span>
        ) : (
          <span className="text-muted-foreground">—</span>
        ),
    },
    {
      key: 'issues',
      header: 'Faltantes',
      render: (row) =>
        row.ready ? (
          <Badge variant="success">Listo</Badge>
        ) : (
          <div className="flex max-w-[260px] flex-wrap gap-1">
            {row.issues.map((k) => (
              <Badge
                key={k}
                variant={k === 'missing_email' ? 'warning' : 'destructive'}
                title={CUSTOMER_ISSUE_INFO[k]?.why}
              >
                {CUSTOMER_ISSUE_INFO[k]?.label ?? k}
              </Badge>
            ))}
          </div>
        ),
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
          aria-label={`Editar datos fiscales de ${row.name}`}
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
        Solo se listan clientes activos con RFC. Para timbrar a nombre del cliente el SAT exige RFC
        válido, razón social exacta, régimen, CP fiscal y un uso de CFDI compatible con el régimen.
      </p>

      <InvalidRfcCard canManage={canManage} invalidCount={counts?.invalidRfc} />

      <Card>
        <CardContent className="space-y-4 p-4 sm:p-6">
          <div className="flex flex-wrap gap-2" role="group" aria-label="Filtrar por faltante">
            {chips.map((chip) => {
              const active = chip.value === issue;
              return (
                <button
                  key={chip.value}
                  type="button"
                  onClick={() => setParams({ issue: chip.value, page: null })}
                  aria-pressed={active}
                  title={chip.why}
                  className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
                    active
                      ? 'border-[#3E667D] bg-[#3E667D] text-white'
                      : 'border-border bg-background text-gray-700 hover:bg-muted'
                  }`}
                >
                  {chip.label}
                  {chip.count !== undefined && (
                    <span
                      className={`rounded-full px-1.5 py-0.5 text-[10px] ${
                        active ? 'bg-white/20' : 'bg-muted text-muted-foreground'
                      }`}
                    >
                      {nf.format(chip.count)}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
          <div className="grid gap-3 md:grid-cols-3">
            <div className="md:col-span-2">
              <Label htmlFor="cu-search" className="mb-1 block text-xs text-muted-foreground">
                Buscar
              </Label>
              <Input
                id="cu-search"
                value={searchDraft}
                onChange={(e) => setSearchDraft(e.target.value)}
                placeholder="Número, nombre o RFC"
                maxLength={100}
              />
            </div>
            <div className="flex items-end text-xs text-muted-foreground">
              {isFetching && !isLoading ? 'Actualizando…' : `${nf.format(total)} cliente(s)`}
            </div>
          </div>
        </CardContent>
      </Card>

      {error && !data ? (
        <Card className="border-destructive/40">
          <CardContent className="p-4 text-sm text-destructive">
            {billingErrorMessage(error, 'No se pudo cargar el listado de clientes')}
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-0 sm:p-4">
            <DataTable
              columns={columns}
              data={rows}
              getRowKey={(row) => row.customerId}
              isLoading={isLoading}
              minWidthClassName="min-w-[1100px]"
              emptyMessage={
                issue === 'ready'
                  ? 'Ningún cliente está listo todavía.'
                  : 'No hay clientes con ese criterio.'
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

      <DuplicatesSection duplicateCount={counts?.duplicateRfc} />

      <CustomerFiscalDialog
        customer={editing}
        open={!!editing}
        onOpenChange={(open) => {
          if (!open) setEditing(null);
        }}
      />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Limpieza de RFC inválidos: vista previa (dryRun) → confirmación → aplicar
// ---------------------------------------------------------------------------

function InvalidRfcCard({
  canManage,
  invalidCount,
}: {
  canManage: boolean;
  invalidCount: number | undefined;
}) {
  const clean = useCleanInvalidRfc();
  const [preview, setPreview] = useState<CleanRfcResult | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);

  const runPreview = async () => {
    try {
      const result = await clean.mutateAsync(true);
      setPreview(result);
      setConfirmOpen(true);
    } catch {
      // El hook ya avisó.
    }
  };

  const apply = async () => {
    try {
      await clean.mutateAsync(false);
      setConfirmOpen(false);
      setPreview(null);
    } catch {
      // El hook ya avisó.
    }
  };

  return (
    <Card className="border-amber-200 bg-amber-50/50">
      <CardContent className="flex flex-wrap items-start justify-between gap-3 p-4">
        <div className="flex items-start gap-2">
          <ExclamationTriangleIcon className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" aria-hidden />
          <div className="text-sm">
            <p className="font-medium text-gray-900">
              RFC inválidos: {invalidCount === undefined ? '…' : nf.format(invalidCount)}
            </p>
            <p className="text-muted-foreground">
              RFC que no cumplen el formato del SAT (RFC inválidos heredados del sistema anterior:
              nombres, guiones, longitud incorrecta). Limpiarlos pone el RFC en blanco; el cliente sigue activo y podrá
              capturarlo bien después. Se guarda el valor anterior en auditoría para poder revertir.
            </p>
          </div>
        </div>
        <Button
          variant="outline"
          onClick={() => void runPreview()}
          disabled={!canManage || clean.isPending || invalidCount === 0}
        >
          {clean.isPending && !confirmOpen && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Limpiar RFC inválidos
        </Button>
      </CardContent>

      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirmar limpieza de RFC inválidos</DialogTitle>
            <DialogDescription>
              Se pondrá en blanco el RFC de{' '}
              <strong>{nf.format(preview?.affected ?? 0)}</strong> cliente(s). No se tocan régimen, uso
              ni CP. La acción queda en auditoría con el RFC anterior.
            </DialogDescription>
          </DialogHeader>
          {preview && preview.sample.length > 0 && (
            <div className="rounded-lg border border-border">
              <p className="border-b border-border px-3 py-2 text-xs font-medium text-muted-foreground">
                Muestra ({preview.sample.length} de {nf.format(preview.affected)})
              </p>
              <ul className="max-h-48 divide-y divide-border overflow-y-auto text-xs">
                {preview.sample.map((s) => (
                  <li key={s.customerId} className="flex justify-between gap-3 px-3 py-1.5">
                    <span className="font-mono">{s.code ?? s.customerId}</span>
                    <span className="font-mono text-muted-foreground">{s.rfcMasked}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmOpen(false)} disabled={clean.isPending}>
              Cancelar
            </Button>
            <Button
              variant="destructive"
              onClick={() => void apply()}
              disabled={clean.isPending || !preview || preview.affected === 0}
            >
              {clean.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Limpiar {nf.format(preview?.affected ?? 0)} RFC
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// RFC repetidos (informativo)
// ---------------------------------------------------------------------------

function DuplicatesSection({ duplicateCount }: { duplicateCount: number | undefined }) {
  const [page, setPage] = useState(1);
  const { data, isLoading, error } = useRfcDuplicates({ page, limit: DUPLICATES_PAGE_SIZE });
  const rows = data?.data ?? [];
  const total = data?.total ?? 0;

  const columns: DataTableColumn<RfcDuplicateGroup>[] = [
    {
      key: 'rfc',
      header: 'RFC',
      render: (g) => <span className="font-mono text-sm">{g.rfc}</span>,
    },
    {
      key: 'count',
      header: 'Clientes',
      render: (g) => <Badge variant="warning">{g.count}</Badge>,
    },
    {
      key: 'customers',
      header: 'Quiénes lo tienen',
      render: (g) => (
        <ul className="space-y-0.5 text-sm text-gray-700">
          {g.customers.map((c) => (
            <li key={c.customerId}>
              <span className="font-mono text-xs text-muted-foreground">{c.code ?? '—'}</span> {c.name}
            </li>
          ))}
        </ul>
      ),
    },
  ];

  return (
    <Card>
      <CardContent className="space-y-3 p-4 sm:p-6">
        <div>
          <h3 className="font-semibold text-gray-900">
            RFC repetidos{duplicateCount !== undefined ? ` (${nf.format(duplicateCount)})` : ''}
          </h3>
          <p className="text-sm text-muted-foreground">
            Un mismo RFC en varios clientes activos. Es informativo: Contabilidad decide a cuál
            pertenece y corrige o limpia el de los demás desde el listado.
          </p>
        </div>
        {error && !data ? (
          <p className="text-sm text-destructive">
            {billingErrorMessage(error, 'No se pudieron cargar los RFC repetidos')}
          </p>
        ) : (
          <>
            <DataTable
              columns={columns}
              data={rows}
              getRowKey={(g) => g.rfc}
              isLoading={isLoading}
              emptyMessage="No hay RFC repetidos."
            />
            {total > DUPLICATES_PAGE_SIZE && (
              <DataTablePagination
                currentPage={page}
                pageSize={DUPLICATES_PAGE_SIZE}
                totalItems={total}
                onPageChange={setPage}
              />
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
