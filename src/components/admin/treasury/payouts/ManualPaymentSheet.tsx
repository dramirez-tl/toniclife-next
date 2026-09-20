'use client';

// ManualPaymentSheet — pago DIRECTO cash|check fuera de lote (contrato §1.3):
// lista las comisiones Aprobadas del periodo (búsqueda, hasta 100 por página),
// selección por checkbox y MarkPaidDialog (referencia + fecha, `confirmText`).
// Las transferencias NO pasan por aquí (TRS_USE_BATCH): van por lote.

import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { MagnifyingGlassIcon } from '@heroicons/react/24/outline';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { DataTable, DataTablePagination, type DataTableColumn } from '@/components/ui/DataTable';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { useMarkCommissionsPaid, useTreasuryCommissions } from '@/hooks/useTreasury';
import { listMeta } from '@/services/treasury.service';
import type { MlmPeriod } from '@/types/mlm-periods';
import type { CommissionRow, MarkPaidPayload } from '@/types/treasury';
import { MarkPaidDialog } from '../MarkPaidDialog';
import { ReadinessChip } from '../ReadinessChip';
import { treasuryBlockedDetails, treasuryErrorMessage } from '../treasury-error';
import { COMMISSION_TYPE_LABELS, currencyTotalsText, formatInt, formatMoney, sumRowsByCurrency } from '../treasury-format';

interface ManualPaymentSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  period: MlmPeriod | null;
  payable: boolean;
}

const PAGE_SIZE = 50;

export function ManualPaymentSheet({ open, onOpenChange, period, payable }: ManualPaymentSheetProps) {
  const [searchDraft, setSearchDraft] = useState('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<Record<string, CommissionRow>>({});
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogKey, setDialogKey] = useState(0);
  const markPaid = useMarkCommissionsPaid();

  useEffect(() => {
    if (searchDraft.trim() === search) return;
    const t = setTimeout(() => {
      setSearch(searchDraft.trim());
      setPage(1);
    }, 300);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchDraft]);

  const listQuery = useTreasuryCommissions(
    { periodId: period?.id, stage: 'approved', search: search || undefined, page, limit: PAGE_SIZE, sortBy: 'customerName', sortDir: 'asc' },
    open && !!period?.id,
  );
  const rows = useMemo(() => listQuery.data?.data ?? [], [listQuery.data]);
  const meta = listQuery.data ? listMeta(listQuery.data, PAGE_SIZE) : null;
  const selectedRows = Object.values(selected);
  const totals = sumRowsByCurrency(selectedRows);

  const columns: DataTableColumn<CommissionRow>[] = [
    {
      key: 'customer',
      header: 'Distribuidor',
      render: (r) => (
        <div>
          <p className="font-medium text-foreground">{r.customerName ?? '—'}</p>
          <p className="text-xs text-muted-foreground">
            {r.customerNumber ? `#${r.customerNumber}` : ''} · {COMMISSION_TYPE_LABELS[r.commissionType] ?? r.commissionType}
          </p>
        </div>
      ),
    },
    {
      key: 'net',
      header: 'Neto',
      headerClassName: 'text-right',
      cellClassName: 'text-right tabular-nums',
      render: (r) => formatMoney(r.totalAmount, r.currencyCode),
    },
    {
      key: 'readiness',
      header: 'Datos',
      render: (r) => <ReadinessChip readiness={r.readiness} />,
    },
  ];

  const handleConfirm = async (payload: Omit<MarkPaidPayload, 'commissionIds'>) => {
    const ids = selectedRows.filter((r) => r.stage === 'approved').map((r) => r.id);
    if (ids.length === 0) return;
    try {
      const res = await markPaid.mutateAsync({ ...payload, commissionIds: ids });
      const skipped = res.skipped?.length ?? 0;
      if (res.paid > 0) {
        toast.success(`${formatInt(res.paid)} comisión(es) pagadas${skipped > 0 ? ` · ${formatInt(skipped)} omitidas` : ''}`);
      } else {
        toast.warning(skipped > 0 ? `Ninguna pagada: ${formatInt(skipped)} omitidas (${res.skipped.map((s) => s.code).join(', ')})` : 'Ninguna comisión pagada');
      }
      setDialogOpen(false);
      setSelected({});
    } catch (err) {
      const blocked = treasuryBlockedDetails(err);
      toast.error(treasuryErrorMessage(err, 'No se pudo registrar el pago') + (blocked.length > 0 ? ` · bloqueadas: ${blocked.length}` : ''));
    }
  };

  return (
    <>
      <Sheet open={open} onOpenChange={(o) => !markPaid.isPending && onOpenChange(o)}>
        <SheetContent side="right" className="w-full overflow-y-auto sm:max-w-2xl">
          <SheetHeader className="pb-0">
            <SheetTitle>Pago manual (cheque o efectivo)</SheetTitle>
            <SheetDescription>
              Solo para pagos fuera del banco. Elige comisiones Aprobadas del periodo {period?.name ?? ''}; las transferencias se dispersan por lote.
            </SheetDescription>
          </SheetHeader>
          <div className="space-y-4 px-4 pb-6">
            {!payable && (
              <p className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
                El periodo no es pagable (abierto, sin corte o anterior al corte): el API rechazará el pago.
              </p>
            )}
            <div className="space-y-1.5">
              <Label htmlFor="manual-pay-search">Buscar</Label>
              <div className="relative">
                <MagnifyingGlassIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
                <Input id="manual-pay-search" type="search" className="pl-9" placeholder="Nombre o nº de distribuidor" value={searchDraft} onChange={(e) => setSearchDraft(e.target.value)} />
              </div>
            </div>

            {listQuery.isError ? (
              <p className="text-sm text-destructive">{treasuryErrorMessage(listQuery.error, 'No se pudieron cargar las comisiones aprobadas')}</p>
            ) : (
              <>
                <DataTable
                  columns={columns}
                  data={rows}
                  getRowKey={(r) => r.id}
                  isLoading={listQuery.isLoading}
                  enableRowSelection
                  selectedRowKeys={Object.keys(selected)}
                  onSelectedRowKeysChange={(keys) => {
                    const keySet = new Set(keys);
                    setSelected((prev) => {
                      const next: Record<string, CommissionRow> = {};
                      for (const [id, row] of Object.entries(prev)) if (keySet.has(id)) next[id] = row;
                      for (const row of rows) if (keySet.has(row.id)) next[row.id] = row;
                      return next;
                    });
                  }}
                  emptyMessage="Sin comisiones Aprobadas en este periodo."
                />
                {meta && meta.total > PAGE_SIZE && (
                  <DataTablePagination currentPage={meta.page} pageSize={PAGE_SIZE} totalItems={meta.total} onPageChange={setPage} isLoading={listQuery.isFetching} />
                )}
              </>
            )}

            <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border pt-3 text-sm">
              <span className="text-muted-foreground">
                {formatInt(selectedRows.length)} seleccionada(s) · {currencyTotalsText(totals)}
              </span>
              <Button
                type="button"
                disabled={selectedRows.length === 0 || !payable}
                onClick={() => {
                  setDialogKey((k) => k + 1);
                  setDialogOpen(true);
                }}
              >
                Registrar pago…
              </Button>
            </div>
          </div>
        </SheetContent>
      </Sheet>

      {dialogOpen && (
        <MarkPaidDialog key={dialogKey} open={dialogOpen} onOpenChange={setDialogOpen} rows={selectedRows} onConfirm={handleConfirm} isPending={markPaid.isPending} />
      )}
    </>
  );
}
