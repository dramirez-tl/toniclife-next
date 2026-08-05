'use client';

// Tesorería → Retenciones: convenios de retención sobre comisiones
// (préstamos personales con saldo + conceptos ad-hoc por distribuidor).
// La retención se aplica automáticamente al "Marcar como Pagadas" las
// comisiones del periodo (con preview en la página de Comisiones).
// Diseño: DISENO_RETENCIONES_COMISIONES.md.

import { Suspense, useState } from 'react';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  BanknotesIcon,
  PlusIcon,
  PauseIcon,
  PlayIcon,
  XMarkIcon,
  ClockIcon,
  MagnifyingGlassIcon,
} from '@heroicons/react/24/outline';
import { Loader2 } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { SearchableSelect } from '@/components/ui/SearchableSelect';
import { PermissionGuard } from '@/components/auth';
import {
  useWithholdings,
  useWithholdingApplications,
  useCreateWithholding,
  useUpdateWithholding,
} from '@/hooks/useWithholdings';
import { customersService } from '@/services/customers.service';
import type { WithholdingAgreement } from '@/services/withholdings.service';

const fmtMoney = (v: number, cur: string) =>
  new Intl.NumberFormat(cur === 'USD' ? 'en-US' : 'es-MX', {
    style: 'currency',
    currency: cur || 'MXN',
    minimumFractionDigits: 2,
  }).format(v);

const STATUS_META: Record<string, { label: string; cls: string }> = {
  active: { label: 'Activo', cls: 'bg-emerald-100 text-emerald-700' },
  paused: { label: 'Pausado', cls: 'bg-amber-100 text-amber-700' },
  settled: { label: 'Liquidado', cls: 'bg-blue-100 text-blue-700' },
  cancelled: { label: 'Cancelado', cls: 'bg-gray-200 text-gray-500' },
};

export default function RetencionesPage() {
  return (
    <Suspense>
      <PermissionGuard permissions={['commissions:read', 'commissions:*']}>
        <RetencionesContent />
      </PermissionGuard>
    </Suspense>
  );
}

function RetencionesContent() {
  const [statusFilter, setStatusFilter] = useState('');
  const { data: agreements, isLoading } = useWithholdings(
    statusFilter ? { status: statusFilter } : undefined,
  );
  const updateMutation = useUpdateWithholding();

  const [showCreate, setShowCreate] = useState(false);
  const [historyFor, setHistoryFor] = useState<WithholdingAgreement | null>(
    null,
  );

  const activeCount = (agreements ?? []).filter(
    (a) => a.status === 'active',
  ).length;

  const handleStatusChange = async (
    a: WithholdingAgreement,
    status: 'active' | 'paused' | 'cancelled',
  ) => {
    const labels = {
      active: 'reanudar',
      paused: 'pausar',
      cancelled: 'CANCELAR',
    } as const;
    if (
      status === 'cancelled' &&
      !window.confirm(
        `¿Cancelar el convenio "${a.description}" de ${a.customerName}? El saldo pendiente dejará de retenerse.`,
      )
    ) {
      return;
    }
    try {
      await updateMutation.mutateAsync({ id: a.id, dto: { status } });
      toast.success(`Convenio ${labels[status]} correctamente`);
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data
          ?.message ?? 'Error al actualizar el convenio';
      toast.error(msg);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-gray-50">
      <div className="bg-gradient-to-r from-[#3E667D] to-[#0A4B94] text-white">
        <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <div className="mb-2 flex items-center gap-3">
                <BanknotesIcon className="h-9 w-9" />
                <h1 className="text-3xl font-bold sm:text-4xl">
                  Retenciones de Comisiones
                </h1>
              </div>
              <p className="text-base text-white/80 sm:text-lg">
                Convenios de Tesorería (préstamos personales y descuentos) que se
                aplican al pagar las comisiones del periodo
              </p>
            </div>
            <div className="flex gap-2">
              <Link href="/admin/comisiones">
                <Button
                  variant="outline"
                  className="border-white/40 bg-white/10 text-white hover:bg-white/20"
                >
                  Ir a Comisiones
                </Button>
              </Link>
              <Button
                onClick={() => setShowCreate(true)}
                className="bg-white font-semibold text-[#3E667D] hover:bg-white/90"
              >
                <PlusIcon className="h-5 w-5" />
                Nueva Retención
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-gray-500">
            {activeCount} convenio{activeCount === 1 ? '' : 's'} activo
            {activeCount === 1 ? '' : 's'} · la retención respeta el tope % del
            neto y se abona al saldo hasta liquidarse
          </p>
          <div className="w-48">
            <SearchableSelect
              options={[
                { value: 'active', label: 'Activos' },
                { value: 'paused', label: 'Pausados' },
                { value: 'settled', label: 'Liquidados' },
                { value: 'cancelled', label: 'Cancelados' },
              ]}
              value={statusFilter}
              onChange={setStatusFilter}
              showAllOption={true}
              allLabel="Todos los estados"
              allValue=""
            />
          </div>
        </div>

        <Card>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="flex items-center justify-center gap-2 p-10 text-gray-500">
                <Loader2 className="size-5 animate-spin" /> Cargando convenios…
              </div>
            ) : !agreements || agreements.length === 0 ? (
              <div className="p-10 text-center text-gray-500">
                <p className="font-medium">Sin convenios de retención</p>
                <p className="mt-1 text-sm">
                  Crea el primero con “Nueva Retención”: préstamo personal con
                  saldo o un concepto personalizado.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-gray-50 text-left text-xs uppercase tracking-wide text-gray-500">
                      <th className="px-4 py-3">Distribuidor</th>
                      <th className="px-4 py-3">Concepto</th>
                      <th className="px-4 py-3 text-right">Abono/periodo</th>
                      <th className="px-4 py-3 text-right">Tope % neto</th>
                      <th className="px-4 py-3 text-right">Total</th>
                      <th className="px-4 py-3 text-right">Saldo</th>
                      <th className="px-4 py-3 text-right">Retenido</th>
                      <th className="px-4 py-3">Estado</th>
                      <th className="px-4 py-3 text-right">Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {agreements.map((a) => {
                      const meta = STATUS_META[a.status] ?? STATUS_META.active;
                      return (
                        <tr key={a.id} className="border-b hover:bg-gray-50">
                          <td className="px-4 py-3">
                            <Link
                              href={`/admin/distribuidores/${a.customerId}`}
                              className="font-medium text-[#3E667D] hover:underline"
                            >
                              {a.customerName}
                            </Link>
                            <div className="text-xs text-gray-400">
                              #{a.customerNumber} · {a.currencyCode}
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <span
                              className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${a.concept === 'loan' ? 'bg-purple-100 text-purple-700' : 'bg-sky-100 text-sky-700'}`}
                            >
                              {a.concept === 'loan' ? 'Préstamo' : 'Otro'}
                            </span>
                            <div className="mt-0.5 max-w-56 truncate text-xs text-gray-500" title={a.description}>
                              {a.description}
                            </div>
                          </td>
                          <td className="px-4 py-3 text-right font-medium tabular-nums">
                            {fmtMoney(a.installmentAmount, a.currencyCode)}
                          </td>
                          <td className="px-4 py-3 text-right tabular-nums">
                            {a.maxPctOfNet}%
                          </td>
                          <td className="px-4 py-3 text-right tabular-nums">
                            {a.totalAmount != null
                              ? fmtMoney(a.totalAmount, a.currencyCode)
                              : '—'}
                          </td>
                          <td className="px-4 py-3 text-right font-semibold tabular-nums">
                            {a.balanceRemaining != null
                              ? fmtMoney(a.balanceRemaining, a.currencyCode)
                              : '—'}
                          </td>
                          <td className="px-4 py-3 text-right tabular-nums text-gray-600">
                            {a.withheldToDate != null
                              ? fmtMoney(a.withheldToDate, a.currencyCode)
                              : '—'}
                          </td>
                          <td className="px-4 py-3">
                            <span
                              className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${meta.cls}`}
                            >
                              {meta.label}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex justify-end gap-1">
                              <button
                                type="button"
                                onClick={() => setHistoryFor(a)}
                                className="rounded p-1.5 text-gray-500 hover:bg-gray-100"
                                title="Historial de abonos"
                              >
                                <ClockIcon className="h-4 w-4" />
                              </button>
                              {a.status === 'active' && (
                                <button
                                  type="button"
                                  onClick={() => handleStatusChange(a, 'paused')}
                                  className="rounded p-1.5 text-amber-600 hover:bg-amber-50"
                                  title="Pausar"
                                >
                                  <PauseIcon className="h-4 w-4" />
                                </button>
                              )}
                              {a.status === 'paused' && (
                                <button
                                  type="button"
                                  onClick={() => handleStatusChange(a, 'active')}
                                  className="rounded p-1.5 text-emerald-600 hover:bg-emerald-50"
                                  title="Reanudar"
                                >
                                  <PlayIcon className="h-4 w-4" />
                                </button>
                              )}
                              {(a.status === 'active' ||
                                a.status === 'paused') && (
                                <button
                                  type="button"
                                  onClick={() =>
                                    handleStatusChange(a, 'cancelled')
                                  }
                                  className="rounded p-1.5 text-red-500 hover:bg-red-50"
                                  title="Cancelar convenio"
                                >
                                  <XMarkIcon className="h-4 w-4" />
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {showCreate && (
        <CreateWithholdingDialog onClose={() => setShowCreate(false)} />
      )}
      {historyFor && (
        <ApplicationsDialog
          agreement={historyFor}
          onClose={() => setHistoryFor(null)}
        />
      )}
    </div>
  );
}

// ============================================================
// Alta de convenio
// ============================================================
function CreateWithholdingDialog({ onClose }: { onClose: () => void }) {
  const createMutation = useCreateWithholding();

  const [customerSearch, setCustomerSearch] = useState('');
  const [selected, setSelected] = useState<{
    id: string;
    name: string;
    number: string;
  } | null>(null);
  const [concept, setConcept] = useState<'loan' | 'other'>('loan');
  const [description, setDescription] = useState('');
  const [totalAmount, setTotalAmount] = useState('');
  const [installment, setInstallment] = useState('');
  const [maxPct, setMaxPct] = useState('30');
  const [notes, setNotes] = useState('');

  const { data: searchResults } = useQuery({
    queryKey: ['withholdings', 'customer-search', customerSearch],
    queryFn: () =>
      customersService.getAll({ search: customerSearch, limit: 10 } as any),
    enabled: customerSearch.trim().length >= 2 && !selected,
    staleTime: 30 * 1000,
  });

  const handleSubmit = async () => {
    if (!selected) return toast.error('Selecciona un distribuidor');
    if (!description.trim()) return toast.error('Captura la descripción');
    const inst = parseFloat(installment);
    if (!inst || inst <= 0)
      return toast.error('El abono por periodo debe ser mayor a 0');
    const total = totalAmount ? parseFloat(totalAmount) : undefined;
    if (concept === 'loan' && (!total || total <= 0))
      return toast.error('Un préstamo requiere el total a recuperar');
    if (total != null && total < inst)
      return toast.error('El total no puede ser menor que el abono por periodo');
    if (notes.trim().length < 5)
      return toast.error('La nota de autorización es obligatoria');

    try {
      await createMutation.mutateAsync({
        customerId: selected.id,
        concept,
        description: description.trim(),
        totalAmount: total,
        installmentAmount: inst,
        maxPctOfNet: parseFloat(maxPct) || 30,
        notes: notes.trim(),
      });
      toast.success(
        `Convenio creado para ${selected.name} — se aplicará al pagar comisiones`,
      );
      onClose();
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data
          ?.message ?? 'Error al crear el convenio';
      toast.error(msg);
    }
  };

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Nueva retención</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          {/* Distribuidor */}
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              Distribuidor *
            </label>
            {selected ? (
              <div className="flex items-center justify-between rounded-md border border-gray-300 px-3 py-2">
                <span className="text-sm">
                  <span className="font-medium">{selected.name}</span>{' '}
                  <span className="text-gray-400">#{selected.number}</span>
                </span>
                <button
                  type="button"
                  className="text-xs text-red-500 hover:underline"
                  onClick={() => setSelected(null)}
                >
                  Cambiar
                </button>
              </div>
            ) : (
              <div className="relative">
                <MagnifyingGlassIcon className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                <Input
                  value={customerSearch}
                  onChange={(e) => setCustomerSearch(e.target.value)}
                  placeholder="Nombre o número de distribuidor…"
                  className="pl-9"
                />
                {customerSearch.trim().length >= 2 &&
                  (searchResults as any)?.data?.length > 0 && (
                    <div className="absolute z-20 mt-1 max-h-56 w-full overflow-y-auto rounded-md border border-gray-200 bg-white shadow-lg">
                      {(searchResults as any).data.map((c: any) => (
                        <button
                          key={c.id}
                          type="button"
                          onClick={() => {
                            setSelected({
                              id: c.id,
                              name: `${c.firstName ?? ''} ${c.lastName ?? ''}`.trim(),
                              number: c.customerNumber ?? '',
                            });
                            setCustomerSearch('');
                          }}
                          className="flex w-full items-center justify-between px-3 py-2 text-left text-sm hover:bg-gray-50"
                        >
                          <span>
                            {c.firstName} {c.lastName}
                          </span>
                          <span className="font-mono text-xs text-gray-400">
                            #{c.customerNumber}
                          </span>
                        </button>
                      ))}
                    </div>
                  )}
              </div>
            )}
            <p className="mt-1 text-xs text-gray-400">
              La moneda del convenio será la de la sucursal del distribuidor
              (la fija el sistema).
            </p>
          </div>

          {/* Concepto */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                Concepto *
              </label>
              <SearchableSelect
                options={[
                  { value: 'loan', label: 'Préstamo personal (con saldo)' },
                  { value: 'other', label: 'Otro concepto' },
                ]}
                value={concept}
                onChange={(v) => setConcept(v as 'loan' | 'other')}
                showAllOption={false}
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                Tope % del neto
              </label>
              <Input
                type="number"
                min={1}
                max={100}
                value={maxPct}
                onChange={(e) => setMaxPct(e.target.value)}
              />
            </div>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              Descripción *
            </label>
            <Input
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Ej. Préstamo personal — convenio 12-jul-2026"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                {concept === 'loan' ? 'Total del préstamo *' : 'Total (opcional)'}
              </label>
              <Input
                type="number"
                min={0}
                step="0.01"
                value={totalAmount}
                onChange={(e) => setTotalAmount(e.target.value)}
                placeholder={concept === 'loan' ? '10000.00' : 'Sin tope'}
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                Abono por periodo *
              </label>
              <Input
                type="number"
                min={0}
                step="0.01"
                value={installment}
                onChange={(e) => setInstallment(e.target.value)}
                placeholder="1000.00"
              />
            </div>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              Nota de autorización * (folio/quién autorizó)
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#3E667D]"
              placeholder="Ej. Autorizó Tesorería — convenio firmado 12-jul-2026, folio T-0045"
            />
          </div>

          <div className="rounded-md bg-blue-50 px-3 py-2 text-xs text-blue-700">
            La retención se aplica automáticamente al <strong>Marcar como
            Pagadas</strong> las comisiones del periodo, respetando el tope %
            del neto. Si el neto no alcanza, se retiene lo disponible y el
            resto permanece en el saldo.
          </div>

          <div className="flex justify-end gap-2 pt-1">
            <Button variant="outline" onClick={onClose}>
              Cancelar
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={createMutation.isPending}
              className="bg-[#3E667D] hover:bg-[#2f5165]"
            >
              {createMutation.isPending && (
                <Loader2 className="mr-2 size-4 animate-spin" />
              )}
              Crear convenio
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ============================================================
// Historial de abonos
// ============================================================
function ApplicationsDialog({
  agreement,
  onClose,
}: {
  agreement: WithholdingAgreement;
  onClose: () => void;
}) {
  const { data: applications, isLoading } = useWithholdingApplications(
    agreement.id,
  );

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>
            Abonos — {agreement.description}
          </DialogTitle>
        </DialogHeader>
        <p className="text-sm text-gray-500">
          {agreement.customerName} #{agreement.customerNumber}
          {agreement.balanceRemaining != null && (
            <>
              {' · Saldo: '}
              <span className="font-semibold text-gray-700">
                {fmtMoney(agreement.balanceRemaining, agreement.currencyCode)}
              </span>
            </>
          )}
        </p>
        {isLoading ? (
          <div className="flex items-center gap-2 py-6 text-gray-500">
            <Loader2 className="size-4 animate-spin" /> Cargando…
          </div>
        ) : !applications || applications.length === 0 ? (
          <p className="py-6 text-center text-sm text-gray-500">
            Aún sin abonos: se registran al pagar las comisiones del periodo.
          </p>
        ) : (
          <div className="max-h-80 overflow-y-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-xs uppercase text-gray-500">
                  <th className="py-2 pr-2">Periodo</th>
                  <th className="py-2 pr-2 text-right">Retenido</th>
                  <th className="py-2 pr-2 text-right">Abono</th>
                  <th className="py-2 text-right">Saldo</th>
                </tr>
              </thead>
              <tbody>
                {applications.map((ap) => (
                  <tr key={ap.id} className="border-b last:border-0">
                    <td className="py-2 pr-2">{ap.periodName ?? '—'}</td>
                    <td className="py-2 pr-2 text-right tabular-nums">
                      {fmtMoney(ap.amountWithheld, ap.currencyCode)}
                    </td>
                    <td className="py-2 pr-2 text-right tabular-nums">
                      {fmtMoney(ap.agreementAmount, ap.agreementCurrency)}
                    </td>
                    <td className="py-2 text-right tabular-nums">
                      {ap.balanceAfter != null
                        ? fmtMoney(ap.balanceAfter, ap.agreementCurrency)
                        : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
