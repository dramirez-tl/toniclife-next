'use client';

// Tesorería › CEDEAS (2-nov-2026): cuánto se paga a cada CEDEA en el periodo,
// independiente de las comisiones de distribuidor. Base = ventas POS completadas
// del periodo (día local de la sucursal) menos IVA; bono = base × porcentaje del
// contrato (5 % sin contrato); factura estimada con el régimen fiscal del
// contrato (mismas tasas que Tesorería aplica a las comisiones). El "ID" del
// CEDEA es el número de distribuidor del dueño (contrato). Periodo =
// commission_periods (selector común de Tesorería), nunca mes calendario.

import { Suspense, useState } from 'react';
import { toast } from 'sonner';
import {
  ArrowDownTrayIcon,
  BuildingStorefrontIcon,
  InformationCircleIcon,
  PencilSquareIcon,
} from '@heroicons/react/24/outline';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { PermissionGuard } from '@/components/auth';
import { useQueryFilters } from '@/hooks/useQueryFilters';
import { useTaxRegimes } from '@/hooks/useTreasury';
import { useCedeaPayouts, useUpsertCedeaContract } from '@/hooks/useCedea';
import { cedeaService } from '@/services/cedea.service';
import { saveBlob } from '@/lib/download';
import {
  PeriodSelector,
  TREASURY_VALIDATE_PERMISSIONS,
  TreasuryHeader,
  TreasuryTabs,
  filenameFromDisposition,
  formatMoney,
  treasuryErrorMessage,
  useTreasuryPeriod,
} from '@/components/admin/treasury';
import type { CedeaBranchEarnings, CedeaCurrencyTotal } from '@/types/cedea';

function pct(rate: number): string {
  return `${(rate * 100).toLocaleString('es-MX', { maximumFractionDigits: 2 })} %`;
}

export default function CedeasPage() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <CedeasContent />
    </Suspense>
  );
}

function PageSkeleton() {
  return (
    <div className="space-y-4 p-6">
      <Skeleton className="h-10 w-72" />
      <Skeleton className="h-20 w-full" />
      <Skeleton className="h-36 w-full" />
      <Skeleton className="h-96 w-full" />
    </div>
  );
}

function TotalCard({ total }: { total: CedeaCurrencyTotal }) {
  const c = total.currencyCode;
  const inv = total.invoice;
  return (
    <Card>
      <CardContent className="p-5">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          {c} · {total.branches} CEDEA{total.branches === 1 ? '' : 'S'}
        </p>
        <dl className="mt-3 grid grid-cols-2 gap-x-6 gap-y-2 text-sm sm:grid-cols-4">
          <div>
            <dt className="text-muted-foreground">Ventas netas</dt>
            <dd className="font-semibold text-foreground">{formatMoney(total.net, c)}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Bono (subtotal)</dt>
            <dd className="font-semibold text-foreground">{formatMoney(total.estimatedEarnings, c)}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">IVA − retenciones</dt>
            <dd className="font-semibold text-foreground">
              {inv ? formatMoney(inv.iva - inv.ivaWithholding - inv.isr - inv.resico, c) : '—'}
            </dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Total a pagar</dt>
            <dd className="text-lg font-bold tabular-nums text-primary">
              {inv ? formatMoney(inv.total, c) : '—'}
            </dd>
          </div>
        </dl>
        {total.branchesWithoutRegime > 0 ? (
          <p className="mt-2 text-xs text-amber-700 dark:text-amber-300">
            {total.branchesWithoutRegime} CEDEA{total.branchesWithoutRegime === 1 ? '' : 'S'} sin contrato o sin
            régimen: su bono no entra en el total a pagar hasta capturarlo.
          </p>
        ) : null}
      </CardContent>
    </Card>
  );
}

function CedeasContent() {
  const { get, setParams } = useQueryFilters({});
  const periodSel = useTreasuryPeriod(get('period'));
  const { effectivePeriodId } = periodSel;
  const query = effectivePeriodId ? { periodId: effectivePeriodId } : {};
  const { data, isLoading, error } = useCedeaPayouts(query, !periodSel.isLoading);
  const [exporting, setExporting] = useState(false);
  const [editing, setEditing] = useState<CedeaBranchEarnings | null>(null);

  const handleExport = async () => {
    setExporting(true);
    try {
      const { blob, disposition } = await cedeaService.exportPayouts(query);
      const fallback = `bono-cedea-${new Date().toISOString().slice(0, 10)}.csv`;
      saveBlob(blob, filenameFromDisposition(disposition, fallback), blob.type || 'text/csv;charset=utf-8;');
    } catch (err) {
      toast.error(treasuryErrorMessage(err, 'No se pudo exportar el CSV'));
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="p-6">
      <TreasuryHeader
        icon={BuildingStorefrontIcon}
        title="CEDEAS"
        subtitle="Bono de CEDEA del periodo por sucursal: ventas netas × porcentaje del contrato, con IVA y retenciones según el régimen del dueño. Independiente de las comisiones de distribuidor."
        actions={
          <Button variant="outline" onClick={handleExport} disabled={exporting || !data}>
            {exporting ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden />
            ) : (
              <ArrowDownTrayIcon className="mr-2 h-4 w-4" aria-hidden />
            )}
            Exportar CSV
          </Button>
        }
      />

      <div className="mb-6">
        <TreasuryTabs active="cedeas" periodId={effectivePeriodId} />
      </div>

      <PeriodSelector selection={periodSel} onChange={(id) => setParams({ period: id })} />

      {data?.period && !data.period.isClosed ? (
        <div
          role="status"
          className="mb-6 flex items-start gap-3 rounded-lg border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900"
        >
          <InformationCircleIcon className="mt-0.5 h-5 w-5 shrink-0" aria-hidden />
          <p>
            <strong>Periodo en curso: cifras estimadas.</strong> Cambian con cada venta hasta el cierre del
            periodo.
          </p>
        </div>
      ) : null}

      {error ? (
        <Card className="mb-6 border-destructive/40">
          <CardContent className="p-5 text-sm text-destructive">
            {treasuryErrorMessage(error, 'No se pudo cargar el bono de las CEDEAS.')}
          </CardContent>
        </Card>
      ) : null}

      {isLoading || !data ? (
        !error ? <PageSkeleton /> : null
      ) : (
        <>
          <div className="mb-6 grid gap-4 md:grid-cols-2">
            {data.totals.map((t) => (
              <TotalCard key={t.currencyCode} total={t} />
            ))}
          </div>

          <div className="mb-4 flex items-start gap-2 rounded-lg border border-amber-500/20 bg-amber-500/10 p-3 text-sm text-amber-800 dark:text-amber-200">
            <InformationCircleIcon className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
            <span>{data.rule}</span>
          </div>

          <Card>
            <CardContent className="overflow-x-auto p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Sucursal</TableHead>
                    <TableHead>ID CEDEA · dueño</TableHead>
                    <TableHead>Régimen</TableHead>
                    <TableHead className="text-right">%</TableHead>
                    <TableHead className="text-right">Ventas netas</TableHead>
                    <TableHead className="text-right">Bono</TableHead>
                    <TableHead className="text-right">IVA</TableHead>
                    <TableHead className="text-right">Retenciones</TableHead>
                    <TableHead className="text-right">Total a pagar</TableHead>
                    <TableHead>Moneda</TableHead>
                    <TableHead className="text-right">Contrato</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.branches.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={11} className="text-center text-muted-foreground">
                        No hay sucursales CEDEA activas.
                      </TableCell>
                    </TableRow>
                  ) : (
                    data.branches.map((b) => {
                      const inv = b.invoice;
                      const retained = inv ? inv.ivaWithholding + inv.isr + inv.resico : null;
                      return (
                        <TableRow key={b.branchId}>
                          <TableCell>
                            <span className="mr-2 font-mono text-xs text-muted-foreground">{b.code}</span>
                            <span className="font-medium text-foreground">{b.name}</span>
                          </TableCell>
                          <TableCell>
                            {b.contract ? (
                              <>
                                <span className="font-mono text-sm text-foreground">{b.contract.customerNumber ?? '—'}</span>
                                <span className="block text-xs text-muted-foreground">{b.contract.customerName}</span>
                              </>
                            ) : (
                              <span className="text-xs text-amber-700 dark:text-amber-300">Sin contrato</span>
                            )}
                          </TableCell>
                          <TableCell className="text-sm">
                            {b.contract?.taxRegimeCode ?? <span className="text-muted-foreground">Sin régimen</span>}
                          </TableCell>
                          <TableCell className="text-right tabular-nums">
                            {pct(b.commissionRate)}
                            {b.rateSource === 'default' ? (
                              <span className="block text-xs text-muted-foreground">por defecto</span>
                            ) : null}
                          </TableCell>
                          <TableCell className="text-right tabular-nums">{formatMoney(b.net, b.currencyCode)}</TableCell>
                          <TableCell className="text-right tabular-nums">{formatMoney(b.estimatedEarnings, b.currencyCode)}</TableCell>
                          <TableCell className="text-right tabular-nums">{inv ? formatMoney(inv.iva, b.currencyCode) : '—'}</TableCell>
                          <TableCell className="text-right tabular-nums text-destructive">
                            {retained != null ? `− ${formatMoney(retained, b.currencyCode)}` : '—'}
                          </TableCell>
                          <TableCell className="text-right font-semibold tabular-nums text-primary">
                            {inv ? formatMoney(inv.total, b.currencyCode) : '—'}
                          </TableCell>
                          <TableCell className="text-sm">{b.currencyCode}</TableCell>
                          <TableCell className="text-right">
                            <PermissionGuard permissions={TREASURY_VALIDATE_PERMISSIONS} fallback={<></>}>
                              <Button variant="ghost" size="sm" onClick={() => setEditing(b)} title="Capturar o editar el contrato">
                                <PencilSquareIcon className="mr-1 h-4 w-4" aria-hidden />
                                {b.contract ? 'Editar' : 'Capturar'}
                              </Button>
                            </PermissionGuard>
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </>
      )}

      <Dialog open={editing !== null} onOpenChange={(open) => (!open ? setEditing(null) : undefined)}>
        <DialogContent className="sm:max-w-lg">
          {editing ? <ContractForm key={editing.branchId} branch={editing} onDone={() => setEditing(null)} /> : null}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function ContractForm({ branch, onDone }: { branch: CedeaBranchEarnings; onDone: () => void }) {
  const { data: regimes } = useTaxRegimes();
  const upsert = useUpsertCedeaContract();
  const [customerNumber, setCustomerNumber] = useState(branch.contract?.customerNumber ?? '');
  const [ratePct, setRatePct] = useState(
    String(Math.round(((branch.contract?.commissionRate ?? branch.commissionRate) * 100) * 100) / 100),
  );
  const [regime, setRegime] = useState(branch.contract?.taxRegimeCode ?? '');
  const [contractNumber, setContractNumber] = useState(branch.contract?.contractNumber ?? '');
  const [notes, setNotes] = useState(branch.contract?.notes ?? '');

  const rate = Number(ratePct);
  const valid = customerNumber.trim().length > 0 && Number.isFinite(rate) && rate >= 0 && rate <= 50;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!valid) return;
    try {
      const saved = await upsert.mutateAsync({
        branchId: branch.branchId,
        input: {
          customerNumber: customerNumber.trim(),
          commissionRate: Math.round(rate * 100) / 10000,
          taxRegimeCode: regime || undefined,
          contractNumber: contractNumber.trim() || undefined,
          notes: notes.trim() || undefined,
        },
      });
      toast.success(`Contrato de ${branch.code} guardado: ${saved.customerName} (${saved.customerNumber ?? '—'})`);
      onDone();
    } catch (err) {
      toast.error(treasuryErrorMessage(err, 'No se pudo guardar el contrato'));
    }
  };

  return (
    <form onSubmit={submit} className="space-y-4">
      <DialogHeader>
        <DialogTitle>
          Contrato CEDEA · {branch.code} {branch.name}
        </DialogTitle>
        <DialogDescription>
          El número de distribuidor del dueño es el ID que lleva el CEDEA. El régimen fiscal define el IVA y las
          retenciones de su factura (mismas tasas que las comisiones). Sustituye al contrato vigente anterior.
        </DialogDescription>
      </DialogHeader>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="cedea-owner">Número de distribuidor (dueño)</Label>
          <Input
            id="cedea-owner"
            value={customerNumber}
            onChange={(e) => setCustomerNumber(e.target.value)}
            placeholder="84910"
            autoFocus
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="cedea-rate">Porcentaje del bono (%)</Label>
          <Input
            id="cedea-rate"
            type="number"
            min={0}
            max={50}
            step="0.01"
            value={ratePct}
            onChange={(e) => setRatePct(e.target.value)}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="cedea-regime">Régimen fiscal de la factura</Label>
          <select
            id="cedea-regime"
            className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm text-foreground"
            value={regime}
            onChange={(e) => setRegime(e.target.value)}
          >
            <option value="">Sin régimen (no se estima la factura)</option>
            {(regimes ?? [])
              .filter((r) => r.isActive !== false)
              .map((r) => (
                <option key={r.code} value={r.code}>
                  {r.code} · {r.name}
                </option>
              ))}
          </select>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="cedea-contract">Número de contrato (opcional)</Label>
          <Input
            id="cedea-contract"
            value={contractNumber}
            onChange={(e) => setContractNumber(e.target.value)}
            placeholder="Folio del contrato"
          />
        </div>
        <div className="space-y-1.5 sm:col-span-2">
          <Label htmlFor="cedea-notes">Notas (opcional)</Label>
          <Input id="cedea-notes" value={notes} onChange={(e) => setNotes(e.target.value)} />
        </div>
      </div>

      <DialogFooter>
        <Button type="button" variant="outline" onClick={onDone} disabled={upsert.isPending}>
          Cancelar
        </Button>
        <Button type="submit" disabled={!valid || upsert.isPending}>
          {upsert.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden /> : null}
          Guardar contrato
        </Button>
      </DialogFooter>
    </form>
  );
}
