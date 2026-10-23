'use client';

// Canjes de una campaña de membresía (solo en edición): quién la usó, en qué
// venta y sucursal, posición antes/después, cupón y regalos. Paginado en el
// servidor, con filtro por estado.

import { useId, useMemo, useState } from 'react';
import { ArrowPathIcon, ReceiptPercentIcon, XCircleIcon } from '@heroicons/react/24/outline';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { DataTable, DataTablePagination, type DataTableColumn } from '@/components/ui';
import { SearchableSelect } from '@/components/ui/SearchableSelect';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useApplyMembershipToSale, useMembershipRedemptions } from '@/hooks/useMembershipCampaigns';
import type {
  MembershipRedemption,
  MembershipRedemptionListQueryParams,
  MembershipRedemptionStatus,
} from '@/types/membership-campaign';
import {
  REDEMPTION_STATUS_OPTIONS,
  apiErrorMessage,
  formatPoints,
  kitTypeLabel,
  redemptionStatusUi,
} from '@/lib/membership-campaigns';

const formatDateTime = (iso: string | null | undefined) =>
  iso ? new Date(iso).toLocaleString('es-MX', { dateStyle: 'medium', timeStyle: 'short' }) : '';

const SALE_STATUS_LABEL: Record<string, string> = {
  pending: 'Sin cobrar',
  completed: 'Cobrada',
  paid: 'Cobrada',
  cancelled: 'Cancelada',
  canceled: 'Cancelada',
  refunded: 'Devuelta',
};

/**
 * "Aplicar a una venta ya cobrada": para ventas hechas antes de encender la
 * campaña (evento de Toluca, 22-oct-2026) o en las que el cajero no la marcó.
 * El API valida lo mismo que en caja y otorga posición + cupón; los regalos
 * quedan como no entregados (no se tocan venta ni inventario).
 */
function ApplyToSaleForm({ campaignId }: { campaignId: string }) {
  const inputId = useId();
  const [saleNumber, setSaleNumber] = useState('');
  const apply = useApplyMembershipToSale(campaignId);

  const submit = () => {
    const folio = saleNumber.trim();
    if (folio.length < 5) {
      toast.error('Captura el folio de la venta (p. ej. 253-20261021-0032).');
      return;
    }
    apply.mutate(
      { saleNumber: folio },
      {
        onSuccess: (r) => {
          if (r.status === 'applied') {
            toast.success(
              `Campaña aplicada a ${r.customerName || r.customerNumber || 'el distribuidor'}: posición ${kitTypeLabel(r.kitTypeAfter)}${r.couponCode ? ` · cupón ${r.couponCode}` : ''}.`,
              { duration: 10000 },
            );
            if (r.gifts.length > 0) {
              toast.info(
                `Regalos de la campaña (${r.gifts.map((g) => `${formatPoints(g.quantity)} × ${g.name}`).join(', ')}) NO se descontaron del inventario: la sucursal los entrega a mano.`,
                { duration: 12000 },
              );
            }
          } else {
            toast.error(
              `La campaña quedó en estado "${redemptionStatusUi(r.status).label}"${r.error ? `: ${r.error}` : ''}.`,
              { duration: 12000 },
            );
          }
          setSaleNumber('');
        },
        onError: (err) => toast.error(apiErrorMessage(err, 'No se pudo aplicar la campaña a esa venta.')),
      },
    );
  };

  return (
    <div className="rounded-lg border border-dashed border-gray-300 bg-gray-50 p-4">
      <p className="text-sm font-medium text-gray-900">Aplicar a una venta ya cobrada</p>
      <p className="mt-0.5 text-xs text-gray-600">
        Para ventas hechas antes de encender la campaña o en las que el cajero no la marcó. Se validan las
        mismas reglas que en caja (vigencia, sucursal, público, puntos de producto de la venta) y se otorgan la
        posición y el cupón; los regalos no se descuentan del inventario.
      </p>
      <div className="mt-3 flex flex-wrap items-end gap-2">
        <div className="w-64 space-y-1">
          <Label htmlFor={inputId}>Folio de la venta</Label>
          <Input
            id={inputId}
            value={saleNumber}
            onChange={(e) => setSaleNumber(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                submit();
              }
            }}
            placeholder="253-20261021-0032"
            className="font-mono"
            disabled={apply.isPending}
          />
        </div>
        <Button type="button" onClick={submit} disabled={apply.isPending || saleNumber.trim().length < 5}>
          {apply.isPending ? 'Aplicando…' : 'Aplicar campaña'}
        </Button>
      </div>
    </div>
  );
}

export function MembershipRedemptionsSection({ campaignId }: { campaignId: string }) {
  const [status, setStatus] = useState<'' | MembershipRedemptionStatus>('');
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);

  const params: MembershipRedemptionListQueryParams = useMemo(
    () => ({ page, limit, ...(status ? { status } : {}) }),
    [page, limit, status],
  );

  const { data, isLoading, isFetching, isError, error, refetch } = useMembershipRedemptions(
    campaignId,
    params,
  );
  const rows = data?.data ?? [];
  const total = data?.total ?? 0;

  const columns: DataTableColumn<MembershipRedemption>[] = [
    {
      key: 'createdAt',
      header: 'Fecha',
      render: (r) => <span className="text-sm text-gray-700 whitespace-nowrap">{formatDateTime(r.createdAt)}</span>,
    },
    {
      key: 'customer',
      header: 'Distribuidor',
      render: (r) => (
        <div>
          <p className="text-sm font-medium text-gray-900">{r.customerName}</p>
          {r.customerNumber && <p className="font-mono text-xs text-gray-500">{r.customerNumber}</p>}
        </div>
      ),
    },
    {
      key: 'sale',
      header: 'Venta',
      render: (r) => (
        <div>
          <p className="font-mono text-sm text-gray-900">{r.saleNumber}</p>
          <p className="text-xs text-gray-500">{SALE_STATUS_LABEL[r.saleStatus] ?? r.saleStatus}</p>
        </div>
      ),
    },
    {
      key: 'branch',
      header: 'Sucursal',
      render: (r) => <span className="text-sm text-gray-700">{r.branchName}</span>,
    },
    {
      key: 'points',
      header: 'Puntos',
      headerClassName: 'text-right',
      cellClassName: 'text-right',
      render: (r) => (
        <span className="text-sm whitespace-nowrap">
          <span className="font-semibold text-gray-900">{formatPoints(r.pointsCounted)}</span>
          <span className="text-gray-500"> / {formatPoints(r.minPoints)}</span>
        </span>
      ),
    },
    {
      key: 'position',
      header: 'Posición',
      render: (r) => (
        <span className="text-sm text-gray-700 whitespace-nowrap">
          {kitTypeLabel(r.kitTypeBefore)} → <span className="font-medium text-gray-900">{kitTypeLabel(r.kitTypeAfter)}</span>
        </span>
      ),
    },
    {
      key: 'coupon',
      header: 'Cupón',
      render: (r) =>
        r.couponCode ? (
          <div>
            <p className="font-mono text-sm text-gray-900">{r.couponCode}</p>
            <p className="text-xs text-gray-500">
              {r.couponUses ? `Usado ${r.couponUses} ${r.couponUses === 1 ? 'vez' : 'veces'}` : 'Sin usar'}
            </p>
          </div>
        ) : (
          <span className="text-sm text-gray-400">—</span>
        ),
    },
    {
      key: 'gifts',
      header: 'Regalos',
      render: (r) => {
        if (r.gifts.length === 0) return <span className="text-sm text-gray-400">—</span>;
        const delivered = r.gifts.filter((g) => g.delivered).length;
        return (
          <div className="text-xs">
            <p className="text-sm text-gray-700">
              {delivered}/{r.gifts.length} entregados
            </p>
            <ul className="mt-0.5 space-y-0.5">
              {r.gifts.map((g) => (
                <li
                  key={g.productId}
                  className={g.delivered ? 'text-gray-500' : 'text-red-700'}
                  title={g.delivered ? g.name : `${g.name}: sin existencia en la sucursal al vender`}
                >
                  <span className="font-mono">{g.sku}</span> × {formatPoints(g.quantity)}
                  {!g.delivered && ' · sin existencia'}
                </li>
              ))}
            </ul>
          </div>
        );
      },
    },
    {
      key: 'status',
      header: 'Estado',
      render: (r) => {
        const ui = redemptionStatusUi(r.status);
        const badge = (
          <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium ${ui.className}`}>
            {ui.label}
          </span>
        );
        return (
          <div className="flex flex-col items-start gap-0.5">
            {r.status === 'failed' && r.error ? (
              <Tooltip>
                <TooltipTrigger asChild>
                  <span className="cursor-help" title={r.error}>
                    {badge}
                  </span>
                </TooltipTrigger>
                <TooltipContent className="max-w-xs">{r.error}</TooltipContent>
              </Tooltip>
            ) : (
              badge
            )}
            {r.status === 'applied' && r.appliedAt && (
              <span className="text-[11px] text-gray-500">{formatDateTime(r.appliedAt)}</span>
            )}
            {r.status === 'reverted' && r.revertedAt && (
              <span className="text-[11px] text-gray-500">{formatDateTime(r.revertedAt)}</span>
            )}
          </div>
        );
      },
    },
  ];

  return (
    <TooltipProvider delayDuration={200}>
      <Card>
        <CardContent className="p-6 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b pb-3">
            <div className="flex items-center gap-2">
              <ReceiptPercentIcon className="h-5 w-5 text-[#3E667D]" />
              <div>
                <h2 className="text-lg font-semibold">Canjes</h2>
                <p className="text-xs text-gray-500">
                  Distribuidores que usaron la campaña. Sin cobrar = la venta sigue abierta; Anulado = la
                  venta se canceló y se revirtió todo.
                </p>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <div className="w-48">
                <SearchableSelect
                  options={REDEMPTION_STATUS_OPTIONS.map((o) => ({ value: o.value, label: o.label }))}
                  value={status}
                  onChange={(v) => {
                    setStatus(v as '' | MembershipRedemptionStatus);
                    setPage(1);
                  }}
                  allLabel="Todos los estados"
                  aria-label="Filtrar canjes por estado"
                />
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="gap-2 text-gray-600"
                onClick={() => refetch()}
                disabled={isFetching}
              >
                <ArrowPathIcon className={`h-4 w-4 ${isFetching ? 'animate-spin' : ''}`} />
                {isFetching ? 'Actualizando...' : 'Actualizar'}
              </Button>
            </div>
          </div>

          <ApplyToSaleForm campaignId={campaignId} />

          {isError && !data ? (
            <div className="flex items-center gap-3 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              <XCircleIcon className="h-5 w-5 shrink-0" />
              <p>{apiErrorMessage(error, 'No se pudieron cargar los canjes.')}</p>
            </div>
          ) : (
            <>
              <DataTable
                columns={columns}
                data={rows}
                isLoading={isLoading && !data}
                getRowKey={(r) => r.id}
                minWidthClassName="min-w-[1000px]"
                emptyMessage={
                  status
                    ? 'No hay canjes con ese estado.'
                    : 'Todavía nadie ha usado esta campaña.'
                }
              />
              {rows.length > 0 && (
                <DataTablePagination
                  currentPage={page}
                  pageSize={limit}
                  totalItems={total}
                  isLoading={isLoading || isFetching}
                  onPageChange={setPage}
                  onPageSizeChange={(size) => {
                    setLimit(size);
                    setPage(1);
                  }}
                  pageSizeOptions={[10, 20, 50, 100]}
                />
              )}
            </>
          )}
        </CardContent>
      </Card>
    </TooltipProvider>
  );
}
