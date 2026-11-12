'use client';

// Mi CEDEA (mig 180, 31-oct-2026): ventas, IVA, ventas netas, ganancia estimada
// y promociones entregadas de las CEDEAS del usuario, por periodo de comisiones
// (commission_periods: nunca mes calendario), por sucursal y por día local.
// Los dueños de CEDEA (rol cedea_owner) y CEDEAS Supervisor solo reciben sus
// sucursales asignadas; Administrador/Sistemas/Operaciones ven todas las CEDEAS.
// La ganancia es un ESTIMADO (ventas netas × porcentaje del contrato o 5 %).
// Piezas gratis por promociones de temporada (12-nov-2026): lo que salió sin
// cobrarse por un 3x2, un "compra 5 y llévate 1" o un regalo por compra, por
// promoción y producto (caja y pedidos en línea de la sucursal).

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { useCedeaEarnings } from '@/hooks/useCedea';
import type { CedeaBranchEarnings, CedeaContract, CedeaCurrencyTotal, CedeaInvoice } from '@/types/cedea';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  ArrowPathIcon,
  BanknotesIcon,
  ChevronDownIcon,
  ChevronRightIcon,
  ExclamationTriangleIcon,
  GiftIcon,
  ReceiptPercentIcon,
  ShoppingBagIcon,
} from '@heroicons/react/24/outline';

function formatMoney(value: number, currency: string): string {
  try {
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency,
      minimumFractionDigits: 2,
    }).format(value);
  } catch {
    return `${value.toFixed(2)} ${currency}`;
  }
}

function formatInt(value: number): string {
  return new Intl.NumberFormat('es-MX').format(value);
}

function formatDate(dateStr: string): string {
  if (!dateStr) return '—';
  const [y, m, d] = dateStr.slice(0, 10).split('-');
  return `${d}/${m}/${y}`;
}

function formatRate(rate: number): string {
  return `${(rate * 100).toLocaleString('es-MX', { maximumFractionDigits: 2 })} %`;
}

function StatCard({
  icon: Icon,
  label,
  value,
  hint,
  accent = false,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
  hint?: string;
  accent?: boolean;
}) {
  return (
    <Card className={accent ? 'border-primary/40 bg-primary/5' : undefined}>
      <CardContent className="p-5">
        <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          <Icon className="h-4 w-4" />
          {label}
        </div>
        <p className="mt-2 text-2xl font-semibold text-foreground">{value}</p>
        {hint ? <p className="mt-1 text-xs text-muted-foreground">{hint}</p> : null}
      </CardContent>
    </Card>
  );
}

function TotalsRow({ total }: { total: CedeaCurrencyTotal }) {
  const c = total.currencyCode;
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-6">
      <StatCard
        icon={ShoppingBagIcon}
        label={`Ventas (${c})`}
        value={formatMoney(total.gross, c)}
        hint={`${formatInt(total.salesCount)} ventas en ${total.branches} sucursal${total.branches === 1 ? '' : 'es'}`}
      />
      <StatCard icon={ReceiptPercentIcon} label="IVA" value={formatMoney(total.tax, c)} />
      <StatCard
        icon={BanknotesIcon}
        label="Ventas netas"
        value={formatMoney(total.net, c)}
        hint="Ventas menos IVA: base de la ganancia"
      />
      <StatCard
        icon={BanknotesIcon}
        label="Ganancia estimada"
        value={formatMoney(total.estimatedEarnings, c)}
        hint="Estimado, ver nota"
        accent
      />
      {total.invoice ? (
        <StatCard
          icon={BanknotesIcon}
          label="Total a recibir"
          value={formatMoney(total.invoice.total, c)}
          hint={`Factura estimada: bono + IVA − retenciones${
            total.branchesWithoutRegime > 0 ? ` · ${total.branchesWithoutRegime} sucursal(es) sin régimen` : ''
          }`}
          accent
        />
      ) : null}
      <StatCard
        icon={GiftIcon}
        label="Promociones entregadas"
        value={formatInt(total.promoPieces)}
        hint="Piezas entregadas en el periodo"
      />
      {(total.seasonalFreePieces ?? 0) > 0 ? (
        <StatCard
          icon={GiftIcon}
          label="Gratis por promoción de temporada"
          value={formatInt(total.seasonalFreePieces ?? 0)}
          hint="Piezas que salieron sin cobrarse (3x2, compra 5 y llévate 1, regalos)"
        />
      ) : null}
    </div>
  );
}

/** Piezas que salieron gratis por promociones de temporada, por promoción y producto. */
function SeasonalFreeBlock({ branch }: { branch: CedeaBranchEarnings }) {
  const rows = branch.seasonalFreeByProduct ?? [];
  if (rows.length === 0) return null;
  const c = branch.currencyCode;
  const pos = branch.seasonalFreePieces ?? 0;
  const online = branch.seasonalFreeOnlinePieces ?? 0;
  const showOnline = online > 0;
  return (
    <div
      className="mt-4 rounded-lg border border-emerald-500/30 bg-emerald-500/5 p-4"
      data-testid="cedea-seasonal-free"
    >
      <p className="text-xs font-semibold uppercase tracking-wide text-emerald-800 dark:text-emerald-300">
        Piezas gratis por promociones de temporada · {formatInt(pos + online)} piezas
      </p>
      <p className="mt-1 text-xs text-muted-foreground">
        Lo que salió de tu existencia sin cobrarse por una promoción (la 3.ª pieza de un 3x2, la 6.ª de un «compra 5
        y llévate 1», un regalo por compra). No cambia tus ventas ni tu ganancia.
      </p>
      <div className="mt-3 overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Promoción</TableHead>
              <TableHead>Clave</TableHead>
              <TableHead>Producto</TableHead>
              <TableHead className="text-right">Gratis en caja</TableHead>
              {showOnline ? <TableHead className="text-right">Gratis en línea</TableHead> : null}
              <TableHead className="text-right">Valor regalado en caja</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((r) => (
              <TableRow key={`${r.promotionCode}-${r.code}`}>
                <TableCell>{r.promotionName}</TableCell>
                <TableCell className="font-mono">{r.code}</TableCell>
                <TableCell>{r.name}</TableCell>
                <TableCell className="text-right font-semibold">{formatInt(r.pieces)}</TableCell>
                {showOnline ? <TableCell className="text-right">{formatInt(r.onlinePieces)}</TableCell> : null}
                <TableCell className="text-right">{formatMoney(r.value, c)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
          <TableFooter>
            <TableRow>
              <TableCell colSpan={3} className="font-semibold">
                Total
              </TableCell>
              <TableCell className="text-right font-semibold">{formatInt(pos)}</TableCell>
              {showOnline ? <TableCell className="text-right font-semibold">{formatInt(online)}</TableCell> : null}
              <TableCell className="text-right font-semibold">
                {formatMoney(
                  rows.reduce((s, r) => s + r.value, 0),
                  c,
                )}
              </TableCell>
            </TableRow>
          </TableFooter>
        </Table>
      </div>
      <p className="mt-2 text-xs text-muted-foreground">
        El detalle venta por venta está en Ventas por producto (columna Gratis) y en su Excel, hoja GRATIS POR
        PROMOCIÓN.
      </p>
    </div>
  );
}

function InvoiceBlock({
  invoice,
  contract,
  currency,
}: {
  invoice: CedeaInvoice | null;
  contract: CedeaContract | null;
  currency: string;
}) {
  if (!invoice) {
    return (
      <p className="mt-3 text-xs text-muted-foreground">
        {contract
          ? 'Tu contrato no tiene régimen fiscal capturado: Tesorería lo agrega en Tesorería › CEDEAS para estimar tu factura.'
          : 'Sin contrato CEDEA capturado: la ganancia se estima al 5 % y la factura se mostrará cuando Tesorería capture el contrato.'}
      </p>
    );
  }
  const retained = invoice.ivaWithholding + invoice.isr + invoice.resico;
  return (
    <div className="mt-4 rounded-lg border border-border bg-muted/30 p-4">
      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        Tu factura del bono (estimado) · régimen {invoice.regimeCode} · {invoice.regimeName}
        {contract?.customerNumber ? ` · distribuidor ${contract.customerNumber}` : ''}
      </p>
      <dl className="mt-2 grid grid-cols-2 gap-x-6 gap-y-2 text-sm sm:grid-cols-3 lg:grid-cols-6">
        <div>
          <dt className="text-muted-foreground">Subtotal (bono)</dt>
          <dd className="font-semibold text-foreground">{formatMoney(invoice.subtotal, currency)}</dd>
        </div>
        <div>
          <dt className="text-muted-foreground">+ IVA</dt>
          <dd className="font-semibold text-foreground">{formatMoney(invoice.iva, currency)}</dd>
        </div>
        <div>
          <dt className="text-muted-foreground">− Ret. IVA</dt>
          <dd className="font-semibold text-foreground">{formatMoney(invoice.ivaWithholding, currency)}</dd>
        </div>
        <div>
          <dt className="text-muted-foreground">− ISR</dt>
          <dd className="font-semibold text-foreground">{formatMoney(invoice.isr, currency)}</dd>
        </div>
        <div>
          <dt className="text-muted-foreground">− RESICO</dt>
          <dd className="font-semibold text-foreground">{formatMoney(invoice.resico, currency)}</dd>
        </div>
        <div>
          <dt className="text-muted-foreground">Total a recibir</dt>
          <dd className="font-semibold text-primary">{formatMoney(invoice.total, currency)}</dd>
        </div>
      </dl>
      <p className="mt-2 text-xs text-muted-foreground">
        {invoice.formula}
        {retained > 0 ? ` · Retenciones: ${formatMoney(retained, currency)}` : ''}
      </p>
    </div>
  );
}

function BranchCard({
  branch,
  period,
}: {
  branch: CedeaBranchEarnings;
  period: { startDate: string; endDate: string };
}) {
  const [open, setOpen] = useState(false);
  const c = branch.currencyCode;
  const seasonalFree = (branch.seasonalFreePieces ?? 0) + (branch.seasonalFreeOnlinePieces ?? 0);
  // La columna "Gratis" del detalle por día solo aparece si la sucursal regaló algo en el periodo.
  const showFreeByDay = (branch.seasonalFreePieces ?? 0) > 0;
  const corteHref = `/admin/reportes/corte-caja?branchId=${branch.branchId}&from=${period.startDate}&to=${period.endDate}`;
  return (
    <Card>
      <CardContent className="p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold text-foreground">
              <span className="mr-2 font-mono text-sm text-muted-foreground">{branch.code}</span>
              {branch.name}
              {branch.isActive === false ? (
                <span className="ml-2 text-xs font-normal text-muted-foreground">(sucursal inactiva)</span>
              ) : null}
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              {formatInt(branch.salesCount)} ventas · porcentaje {formatRate(branch.commissionRate)}
              {branch.rateSource === 'default' ? ' (por defecto, sin contrato capturado)' : ' (contrato)'}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button asChild variant="outline" size="sm">
              <Link href={corteHref}>Corte de caja</Link>
            </Button>
            <Button asChild variant="outline" size="sm">
              <Link href="/admin/reportes/ventas-producto">Ventas por producto</Link>
            </Button>
          </div>
        </div>

        <dl className="mt-4 grid grid-cols-2 gap-x-6 gap-y-3 text-sm sm:grid-cols-3 lg:grid-cols-5">
          <div>
            <dt className="text-muted-foreground">Ventas</dt>
            <dd className="font-semibold text-foreground">{formatMoney(branch.gross, c)}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">IVA</dt>
            <dd className="font-semibold text-foreground">{formatMoney(branch.tax, c)}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Ventas netas</dt>
            <dd className="font-semibold text-foreground">{formatMoney(branch.net, c)}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Ganancia estimada</dt>
            <dd className="font-semibold text-primary">{formatMoney(branch.estimatedEarnings, c)}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Promociones entregadas</dt>
            <dd className="font-semibold text-foreground">{formatInt(branch.promoPieces)} piezas</dd>
          </div>
          {seasonalFree > 0 ? (
            <div>
              <dt className="text-muted-foreground">Gratis por promoción de temporada</dt>
              <dd className="font-semibold text-emerald-700 dark:text-emerald-300">{formatInt(seasonalFree)} piezas</dd>
            </div>
          ) : null}
        </dl>

        <InvoiceBlock invoice={branch.invoice} contract={branch.contract} currency={c} />

        <SeasonalFreeBlock branch={branch} />

        {branch.promoByProduct.length > 0 ? (
          <p className="mt-3 text-xs text-muted-foreground">
            Promociones:{' '}
            {branch.promoByProduct.map((p) => `${p.code} ${formatInt(p.pieces)}`).join(' · ')}
            {branch.legacyZeroLines > 0
              ? ` · además ${formatInt(branch.legacyZeroLines)} renglones a $0 en ventas migradas del sistema anterior (incluyen sus promociones)`
              : ''}
          </p>
        ) : branch.legacyZeroLines > 0 ? (
          <p className="mt-3 text-xs text-muted-foreground">
            {formatInt(branch.legacyZeroLines)} renglones a $0 en ventas migradas del sistema anterior (incluyen sus promociones).
          </p>
        ) : null}

        {branch.onlineOrdersCount > 0 ? (
          <p className="mt-2 text-xs text-muted-foreground">
            Pedidos en línea asignados a la sucursal en el periodo: {formatInt(branch.onlineOrdersCount)} por{' '}
            {formatMoney(branch.onlineOrdersTotal, c)} (no entran en la base de la ganancia).
          </p>
        ) : null}

        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline"
        >
          {open ? <ChevronDownIcon className="h-4 w-4" /> : <ChevronRightIcon className="h-4 w-4" />}
          {open ? 'Ocultar detalle por día' : `Ver detalle por día (${branch.daily.length} días con ventas)`}
        </button>

        {open ? (
          <div className="mt-3 overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Día</TableHead>
                  <TableHead className="text-right">Ventas</TableHead>
                  <TableHead className="text-right">Importe</TableHead>
                  <TableHead className="text-right">IVA</TableHead>
                  <TableHead className="text-right">Neto</TableHead>
                  <TableHead className="text-right">Promos</TableHead>
                  {showFreeByDay ? (
                    <TableHead className="text-right" title="Piezas gratis por promociones de temporada en caja">
                      Gratis
                    </TableHead>
                  ) : null}
                </TableRow>
              </TableHeader>
              <TableBody>
                {branch.daily.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={showFreeByDay ? 7 : 6} className="text-center text-muted-foreground">
                      Sin ventas en el periodo
                    </TableCell>
                  </TableRow>
                ) : (
                  branch.daily.map((d) => (
                    <TableRow key={d.date}>
                      <TableCell>{formatDate(d.date)}</TableCell>
                      <TableCell className="text-right">{formatInt(d.salesCount)}</TableCell>
                      <TableCell className="text-right">{formatMoney(d.gross, c)}</TableCell>
                      <TableCell className="text-right">{formatMoney(d.tax, c)}</TableCell>
                      <TableCell className="text-right">{formatMoney(d.net, c)}</TableCell>
                      <TableCell className="text-right">{formatInt(d.promoPieces)}</TableCell>
                      {showFreeByDay ? (
                        <TableCell className="text-right">{formatInt(d.seasonalFreePieces ?? 0)}</TableCell>
                      ) : null}
                    </TableRow>
                  ))
                )}
              </TableBody>
              {branch.daily.length > 0 ? (
                <TableFooter>
                  <TableRow>
                    <TableCell className="font-semibold">Total</TableCell>
                    <TableCell className="text-right font-semibold">{formatInt(branch.salesCount)}</TableCell>
                    <TableCell className="text-right font-semibold">{formatMoney(branch.gross, c)}</TableCell>
                    <TableCell className="text-right font-semibold">{formatMoney(branch.tax, c)}</TableCell>
                    <TableCell className="text-right font-semibold">{formatMoney(branch.net, c)}</TableCell>
                    <TableCell className="text-right font-semibold">{formatInt(branch.promoPieces)}</TableCell>
                    {showFreeByDay ? (
                      <TableCell className="text-right font-semibold">
                        {formatInt(branch.seasonalFreePieces ?? 0)}
                      </TableCell>
                    ) : null}
                  </TableRow>
                </TableFooter>
              ) : null}
            </Table>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}

export default function MiCedeaPage() {
  const [periodNumber, setPeriodNumber] = useState<number | undefined>(undefined);
  const { data, isLoading, isFetching, error, refetch } = useCedeaEarnings(
    periodNumber ? { periodNumber } : {},
  );

  const periodOptions = useMemo(() => data?.periods ?? [], [data]);
  const period = data?.period;

  return (
    <div className="px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">Mi CEDEA</h1>
          <p className="mt-1 text-sm text-muted-foreground sm:text-base">
            Ventas, IVA, ventas netas, ganancia estimada y promociones entregadas de tus sucursales, por
            periodo de comisiones.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <label className="text-sm text-muted-foreground" htmlFor="cedea-period">
            Periodo
          </label>
          <select
            id="cedea-period"
            className="h-9 rounded-md border border-input bg-background px-3 text-sm text-foreground"
            value={periodNumber ?? period?.periodNumber ?? ''}
            onChange={(e) => setPeriodNumber(e.target.value ? Number(e.target.value) : undefined)}
            disabled={isLoading}
          >
            {periodOptions.length === 0 && period ? (
              <option value={period.periodNumber}>{period.name}</option>
            ) : null}
            {periodOptions.map((p) => (
              <option key={p.periodNumber} value={p.periodNumber}>
                {p.name} · {formatDate(p.startDate)} → {formatDate(p.endDate)}
                {p.isClosed ? '' : ' · en curso'}
              </option>
            ))}
          </select>
          <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isFetching}>
            <ArrowPathIcon className={`mr-1 h-4 w-4 ${isFetching ? 'animate-spin' : ''}`} />
            Actualizar
          </Button>
        </div>
      </div>

      {period ? (
        <p className="mb-4 text-sm text-muted-foreground">
          Periodo <span className="font-medium text-foreground">{period.name}</span>: del{' '}
          {formatDate(period.startDate)} al {formatDate(period.endDate)}
          {period.isClosed ? ' (cerrado)' : ' (en curso: las cifras cambian con cada venta)'}.
        </p>
      ) : null}

      {error ? (
        <Card className="mb-6 border-destructive/40">
          <CardContent className="flex items-start gap-2 p-5 text-sm text-destructive">
            <ExclamationTriangleIcon className="mt-0.5 h-4 w-4 shrink-0" />
            No se pudo cargar la información. Intenta de nuevo o avisa a Sistemas.
          </CardContent>
        </Card>
      ) : null}

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Cargando...</p>
      ) : data ? (
        <>
          {data.branches.length === 0 ? (
            <Card className="mb-6">
              <CardContent className="flex items-start gap-2 p-5 text-sm text-amber-700 dark:text-amber-300">
                <ExclamationTriangleIcon className="mt-0.5 h-4 w-4 shrink-0" />
                <span>
                  {data.scoped
                    ? 'Todavía no tienes sucursales asignadas. Pide a Sistemas que las asigne a tu usuario.'
                    : 'No hay sucursales CEDEA activas.'}
                </span>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-6">
              {data.totals.map((t) => (
                <TotalsRow key={t.currencyCode} total={t} />
              ))}
              <div className="flex items-start gap-2 rounded-lg border border-amber-500/20 bg-amber-500/10 p-3 text-sm text-amber-800 dark:text-amber-300">
                <ExclamationTriangleIcon className="mt-0.5 h-4 w-4 shrink-0" />
                <span>{data.rule}</span>
              </div>
              {data.branches.map((b) => (
                <BranchCard key={b.branchId} branch={b} period={data.period} />
              ))}
            </div>
          )}
        </>
      ) : null}
    </div>
  );
}
