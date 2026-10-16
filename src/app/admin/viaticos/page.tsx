'use client';

// Viáticos - solicitudes y aprobación.
//
// Una sola pantalla con tres vistas según permisos: "Mis solicitudes" (quien
// tiene viaticos:request), "Por aprobar" y "Todas" (viaticos:approve /
// viaticos:read). El rol "Viáticos" solo ve la primera. Como en el sistema
// anterior: filtro por SEMANA (lunes a domingo) y "Descargar Excel" con los
// filtros actuales. Filtros en la URL (useQueryFilters -> requiere Suspense);
// alta/edición y detalle en modales.

import { Suspense, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { ChevronLeft, ChevronRight, Loader2 } from 'lucide-react';
import {
  ArrowDownTrayIcon,
  BanknotesIcon,
  EyeIcon,
  MagnifyingGlassIcon,
  PlusIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { SearchableSelect } from '@/components/ui/SearchableSelect';
import { DataTable, DataTablePagination, type DataTableColumn } from '@/components/ui/DataTable';
import { useQueryFilters } from '@/hooks/useQueryFilters';
import { useViaticoSummary, useViaticos } from '@/hooks/useViaticos';
import { ViaticoFormModal } from '@/components/admin/viaticos/ViaticoFormModal';
import { ViaticoDetailModal } from '@/components/admin/viaticos/ViaticoDetailModal';
import { viaticosService } from '@/services/viaticos.service';
import { saveBlob } from '@/lib/download';
import { addDaysIso, mondayOf, rangeLabel, todayIso, weekLabel } from '@/lib/viaticos-week';
import {
  VIATICO_STATUS_LABELS,
  VIATICO_STATUS_VARIANTS,
  type Viatico,
  type ViaticoQueryParams,
  type ViaticoStatus,
} from '@/types/viaticos';

/** mine / toprove: las propias (todas / aprobadas por comprobar); pending / proofs / all: quien ve todas. */
type View = 'mine' | 'toprove' | 'pending' | 'proofs' | 'all';

/** Vistas que fijan el estatus (sin selector de estatus). */
const VIEW_STATUS: Partial<Record<View, ViaticoStatus>> = {
  toprove: 'approved',
  pending: 'pending',
  proofs: 'proof_submitted',
};

const APPROVED_FAMILY: ViaticoStatus[] = ['approved', 'proof_submitted', 'verified'];

const STATUS_OPTIONS = [
  { value: 'all', label: 'Todos los estatus' },
  ...(Object.keys(VIATICO_STATUS_LABELS) as ViaticoStatus[]).map((s) => ({
    value: s,
    label: VIATICO_STATUS_LABELS[s],
  })),
];

const money = (n: number | null | undefined, currency = 'MXN') =>
  (n ?? 0).toLocaleString('es-MX', { style: 'currency', currency });

const fmtDate = (iso: string) => {
  const d = iso.length === 10 ? new Date(`${iso}T12:00:00`) : new Date(iso);
  return d.toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' });
};

export default function ViaticosPage() {
  return (
    <Suspense fallback={<ViaticosSkeleton />}>
      <ViaticosContent />
    </Suspense>
  );
}

function ViaticosSkeleton() {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="h-32 bg-gradient-to-r from-[#3E667D] to-[#0A4B94]" />
      <div className="mx-auto max-w-7xl space-y-4 px-4 py-8 sm:px-6 lg:px-8">
        <Skeleton className="h-20 w-full" />
        <Skeleton className="h-96 w-full" />
      </div>
    </div>
  );
}

function ViaticosContent() {
  const { get, getNumber, setParams } = useQueryFilters({
    view: '',
    status: 'all',
    week: '',
    page: '1',
    limit: '20',
  });
  const { data: summary } = useViaticoSummary();
  const canSeeAll = summary?.canSeeAll ?? false;
  const canApprove = summary?.canApprove ?? false;
  const canRequest = summary?.canRequest ?? true;

  // Vista por defecto: quien aprueba cae en "Por aprobar"; el resto en las suyas.
  const viewParam = get('view') as View | '';
  const view: View = viewParam || (canSeeAll ? 'pending' : 'mine');
  const status = get('status');
  const search = get('search');
  // Semana (lunes ISO) o '' = todas. Se normaliza al lunes por si la URL trae otro día.
  const weekParam = get('week');
  const week = /^\d{4}-\d{2}-\d{2}$/.test(weekParam) ? mondayOf(weekParam) : '';
  const page = getNumber('page') || 1;
  const limit = getNumber('limit') || 20;
  const [searchDraft, setSearchDraft] = useState(search);
  const [downloading, setDownloading] = useState(false);

  const params = useMemo<ViaticoQueryParams>(
    () => ({
      page,
      limit,
      search: search || undefined,
      mine: view === 'mine' || view === 'toprove' ? true : undefined,
      status: VIEW_STATUS[view] ?? (status !== 'all' ? (status as ViaticoStatus) : undefined),
      from: week || undefined,
      to: week ? addDaysIso(week, 6) : undefined,
    }),
    [page, limit, search, view, status, week],
  );
  const { data, isLoading, isFetching } = useViaticos(params);
  const rows = data?.data ?? [];

  const setWeek = (monday: string) => setParams({ week: monday, page: '1' });

  const downloadExcel = async () => {
    setDownloading(true);
    try {
      const blob = await viaticosService.exportXlsx(params);
      saveBlob(
        blob,
        `viaticos${week ? `_${week}` : ''}.xlsx`,
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      );
    } catch {
      toast.error('No se pudo descargar el Excel.');
    } finally {
      setDownloading(false);
    }
  };

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Viatico | null>(null);
  const [detail, setDetail] = useState<Viatico | null>(null);

  const openNew = () => {
    setEditing(null);
    setFormOpen(true);
  };
  const openEdit = (v: Viatico) => {
    setDetail(null);
    setEditing(v);
    setFormOpen(true);
  };

  const columns: DataTableColumn<Viatico>[] = [
    {
      key: 'folio',
      header: 'Folio',
      render: (v) => (
        <div>
          <p className="font-mono text-sm font-semibold text-foreground">{v.folio}</p>
          <p className="text-xs text-muted-foreground">{fmtDate(v.createdAt)}</p>
        </div>
      ),
    },
    ...(view !== 'mine' && view !== 'toprove'
      ? [
          {
            key: 'requester',
            header: 'Solicitante',
            render: (v: Viatico) => (
              <div>
                <p className="text-sm text-foreground">{v.requesterName}</p>
                {v.departmentName && <p className="text-xs text-muted-foreground">{v.departmentName}</p>}
              </div>
            ),
          } satisfies DataTableColumn<Viatico>,
        ]
      : []),
    {
      key: 'period',
      header: 'Semana / motivo',
      render: (v) => (
        <div className="max-w-xs">
          <p className="text-sm font-medium text-foreground">{rangeLabel(v.tripStart, v.tripEnd)}</p>
          <p className="truncate text-xs text-muted-foreground" title={v.purpose}>
            {[v.destination, v.purpose].filter(Boolean).join(' · ')}
          </p>
        </div>
      ),
    },
    {
      key: 'amount',
      header: 'Solicitado',
      render: (v) => <span className="tabular-nums">{money(v.requestedAmount, v.currencyCode)}</span>,
    },
    {
      key: 'approved',
      header: 'Autorizado',
      render: (v) =>
        APPROVED_FAMILY.includes(v.status) ? (
          <span className="tabular-nums font-medium text-emerald-700">{money(v.approvedAmount, v.currencyCode)}</span>
        ) : (
          <span className="text-muted-foreground">—</span>
        ),
    },
    {
      key: 'proof',
      header: 'Comprobación',
      render: (v) => {
        if (v.status === 'approved') {
          return <span className="text-xs font-medium text-amber-700">Por comprobar</span>;
        }
        if (v.status !== 'proof_submitted' && v.status !== 'verified') {
          return <span className="text-muted-foreground">—</span>;
        }
        const rest = v.proofBalance ?? 0;
        return (
          <div>
            <p className="tabular-nums text-sm text-foreground">{money(v.proofTotal, v.currencyCode)}</p>
            <p
              className={`text-xs tabular-nums ${rest > 0 ? 'text-amber-700' : rest < 0 ? 'text-red-700' : 'text-muted-foreground'}`}
            >
              Resto {money(rest, v.currencyCode)}
            </p>
          </div>
        );
      },
    },
    {
      key: 'status',
      header: 'Estatus',
      render: (v) => <Badge variant={VIATICO_STATUS_VARIANTS[v.status]}>{VIATICO_STATUS_LABELS[v.status]}</Badge>,
    },
    {
      key: 'actions',
      header: '',
      headerClassName: 'text-right',
      render: (v) => {
        const action =
          canApprove && !v.isMine && v.status === 'pending'
            ? 'Revisar'
            : canApprove && !v.isMine && v.status === 'proof_submitted'
              ? 'Validar'
              : v.isMine && v.status === 'approved'
                ? 'Comprobar'
                : null;
        return (
          <div className="flex justify-end gap-1">
            {action ? (
              <Button size="sm" onClick={() => setDetail(v)}>
                {action}
              </Button>
            ) : (
              <Button variant="ghost" size="icon" title="Ver detalle" onClick={() => setDetail(v)}>
                <EyeIcon className="h-5 w-5" />
              </Button>
            )}
          </div>
        );
      },
    },
  ];

  const chips = [
    ...(canSeeAll
      ? [
          { label: 'Por aprobar', value: summary?.pendingAll ?? 0, accent: 'text-amber-600' },
          { label: 'Por validar', value: summary?.proofToReview ?? 0, accent: 'text-[#0A4B94]' },
        ]
      : []),
    { label: 'Mis pendientes', value: summary?.minePending ?? 0 },
    { label: 'Por comprobar', value: summary?.mineToProve ?? summary?.mineApproved ?? 0, accent: 'text-emerald-600' },
    { label: 'Mis rechazadas', value: summary?.mineRejected ?? 0, accent: 'text-red-600' },
  ];

  const count = (n: number | undefined) => (n ? ` (${n})` : '');
  const views: { id: View; label: string }[] = [
    ...(canRequest
      ? [
          { id: 'mine' as const, label: 'Mis solicitudes' },
          { id: 'toprove' as const, label: `Por comprobar${count(summary?.mineToProve)}` },
        ]
      : []),
    ...(canSeeAll
      ? [
          { id: 'pending' as const, label: `Por aprobar${count(summary?.pendingAll)}` },
          { id: 'proofs' as const, label: `Por validar${count(summary?.proofToReview)}` },
          { id: 'all' as const, label: 'Todas' },
        ]
      : []),
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-gradient-to-r from-[#3E667D] to-[#0A4B94] text-white">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 px-4 py-7 sm:flex-row sm:items-center sm:justify-between sm:px-6 lg:px-8">
          <div className="flex items-center gap-3">
            <BanknotesIcon className="h-8 w-8" />
            <div>
              <h1 className="text-2xl font-bold sm:text-3xl">Viáticos</h1>
              <p className="text-sm text-white/80">Solicitudes de viáticos y su aprobación</p>
            </div>
          </div>
          {canRequest && (
            <Button onClick={openNew} className="bg-white text-[#0A4B94] hover:bg-white/90">
              <PlusIcon className="mr-2 h-5 w-5" />
              Nueva solicitud
            </Button>
          )}
        </div>
      </div>

      <div className="mx-auto max-w-7xl space-y-5 px-4 py-6 sm:px-6 lg:px-8">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          {chips.map((c) => (
            <Card key={c.label}>
              <CardContent className="p-4">
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{c.label}</p>
                <p className={`text-2xl font-bold tabular-nums ${c.accent ?? 'text-foreground'}`}>{c.value}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        <Card>
          <CardContent className="flex flex-col gap-3 p-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex flex-wrap gap-2">
              {views.map((v) => (
                <Button
                  key={v.id}
                  type="button"
                  size="sm"
                  variant={view === v.id ? 'default' : 'outline'}
                  onClick={() => setParams({ view: v.id, page: '1' })}
                >
                  {v.label}
                </Button>
              ))}
            </div>
            <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
              {week ? (
                <div className="flex items-center gap-1">
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    aria-label="Semana anterior"
                    onClick={() => setWeek(addDaysIso(week, -7))}
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <span className="min-w-[150px] rounded-md border border-input px-3 py-1.5 text-center text-sm font-medium tabular-nums">
                    {weekLabel(week)}
                  </span>
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    aria-label="Semana siguiente"
                    onClick={() => setWeek(addDaysIso(week, 7))}
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    title="Todas las semanas"
                    aria-label="Quitar filtro de semana"
                    onClick={() => setWeek('')}
                  >
                    <XMarkIcon className="h-4 w-4" />
                  </Button>
                </div>
              ) : (
                <Button type="button" variant="outline" size="sm" onClick={() => setWeek(mondayOf(todayIso()))}>
                  Filtrar por semana
                </Button>
              )}
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  setParams({ search: searchDraft.trim(), page: '1' });
                }}
                className="relative"
              >
                <MagnifyingGlassIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={searchDraft}
                  onChange={(e) => setSearchDraft(e.target.value)}
                  placeholder="Folio, destino, motivo o solicitante"
                  className="w-full pl-9 sm:w-72"
                />
              </form>
              {!VIEW_STATUS[view] && (
                <SearchableSelect
                  options={STATUS_OPTIONS}
                  value={status}
                  onChange={(val) => setParams({ status: val, page: '1' })}
                  showAllOption={false}
                  placeholder="Estatus"
                  className="sm:w-48"
                />
              )}
              <Button type="button" variant="outline" size="sm" onClick={downloadExcel} disabled={downloading}>
                {downloading ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <ArrowDownTrayIcon className="mr-2 h-4 w-4" />
                )}
                Descargar Excel
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-0">
            <DataTable
              columns={columns}
              data={rows}
              getRowKey={(v) => v.id}
              isLoading={isLoading || isFetching}
              emptyMessage={
                {
                  pending: 'No hay solicitudes pendientes de aprobar.',
                  proofs: 'No hay comprobaciones por validar.',
                  toprove: 'No tienes solicitudes aprobadas por comprobar.',
                  mine: 'Aún no tienes solicitudes. Crea la primera con "Nueva solicitud".',
                  all: 'No hay solicitudes con esos filtros.',
                }[view]
              }
            />
            <DataTablePagination
              currentPage={page}
              pageSize={limit}
              totalItems={data?.total ?? 0}
              onPageChange={(p) => setParams({ page: String(p) })}
              onPageSizeChange={(size) => setParams({ limit: String(size), page: '1' })}
              isLoading={isLoading}
            />
          </CardContent>
        </Card>
      </div>

      <ViaticoFormModal open={formOpen} onOpenChange={setFormOpen} viatico={editing} />
      <ViaticoDetailModal
        open={!!detail}
        onOpenChange={(o) => !o && setDetail(null)}
        viatico={detail}
        canApprove={canApprove}
        onEdit={openEdit}
      />
    </div>
  );
}
