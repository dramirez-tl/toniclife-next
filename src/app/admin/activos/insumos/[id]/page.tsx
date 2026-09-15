'use client';

// Detalle de un insumo de TI: ficha, etiqueta del estante, existencias y la
// bitácora de movimientos (entradas, consumos, desechos, ajustes).

import { use, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import {
  ArrowLeftIcon,
  PencilSquareIcon,
  TrashIcon,
  ArrowPathIcon,
} from '@heroicons/react/24/outline';
import {
  ArrowDownToLine,
  ArrowUpFromLine,
  ClipboardList,
  Loader2,
  Printer,
  Trash2,
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  DataTable,
  DataTablePagination,
  type DataTableColumn,
} from '@/components/ui/DataTable';
import { confirmAction } from '@/lib/utils';
import {
  useDeleteSupply,
  useLinkSupplyLabel,
  useMarkSupplyLabelPrinted,
  useRestoreSupply,
  useSupply,
  useSupplyMovements,
  useUnlinkSupplyLabel,
} from '@/hooks/useSupplies';
import { LabelCodeField } from '@/components/admin/assets/LabelCodeField';
import { AssetBarcode } from '@/components/admin/assets/AssetBarcode';
import { SupplyFormModal } from '@/components/admin/assets/SupplyFormModal';
import { SupplyMovementModal } from '@/components/admin/assets/SupplyMovementModal';
import { shortDate } from '@/components/admin/assets/AssignAssetModal';
import {
  MOVEMENT_REASON_LABELS,
  MOVEMENT_TYPES,
  MOVEMENT_TYPE_LABELS,
  MOVEMENT_TYPE_VARIANTS,
  STOCK_STATE_LABELS,
  STOCK_STATE_VARIANTS,
  type SupplyMovement,
  type SupplyMovementType,
} from '@/types/supply';

/** Renglones por página de la bitácora. */
const MOVEMENTS_PAGE_SIZE = 20;

/** Fecha y hora cortas en español, tolerante a null. */
function dateTime(value: string | null | undefined): string {
  if (!value) return '—';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleString('es-MX', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function money(value: number | null | undefined, currency: string | null | undefined): string {
  if (value === null || value === undefined) return '—';
  return `${value.toLocaleString('es-MX', { minimumFractionDigits: 2 })} ${currency ?? ''}`.trim();
}

/** Cantidad con signo según el tipo: entradas suman, consumos y desechos restan. */
function signedQty(m: SupplyMovement): { text: string; tone: string } {
  if (m.movementType === 'entrada') return { text: `+${m.quantity}`, tone: 'text-emerald-600' };
  if (m.movementType === 'ajuste') {
    return m.quantity > 0
      ? { text: `+${m.quantity}`, tone: 'text-emerald-600' }
      : { text: String(m.quantity), tone: 'text-destructive' };
  }
  return { text: `-${m.quantity}`, tone: 'text-destructive' };
}

/** Con qué se relaciona el movimiento: equipo, colaborador, factura o sitio. */
function movementContext(m: SupplyMovement): React.ReactNode[] {
  const parts: React.ReactNode[] = [];
  if (m.assetId) {
    parts.push(
      <Link
        key="asset"
        href={`/admin/activos/${m.assetId}`}
        className="text-primary hover:underline"
      >
        {m.assetTag ? <span className="font-mono">{m.assetTag}</span> : null}
        {m.assetTag && m.assetName ? ' · ' : ''}
        {m.assetName}
      </Link>,
    );
  }
  if (m.userName) parts.push(<span key="user">{m.userName}</span>);
  if (m.purchaseId) {
    parts.push(
      <Link
        key="purchase"
        href={`/admin/activos/facturas?id=${m.purchaseId}`}
        className="text-primary hover:underline"
      >
        Factura {m.purchaseInvoiceNumber ?? 'sin folio'}
      </Link>,
    );
  }
  if (m.branchName || m.locationName) {
    parts.push(
      <span key="site" className="text-muted-foreground">
        {[m.branchName, m.locationName].filter(Boolean).join(' · ')}
      </span>,
    );
  }
  return parts;
}

export default function SupplyDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();

  const { data: supply, isLoading } = useSupply(id);
  const deleteMutation = useDeleteSupply();
  const restoreMutation = useRestoreSupply();
  const linkLabel = useLinkSupplyLabel();
  const unlinkLabel = useUnlinkSupplyLabel();
  const markPrinted = useMarkSupplyLabelPrinted();

  const [editOpen, setEditOpen] = useState(false);
  const [movementType, setMovementType] = useState<SupplyMovementType | null>(null);
  const [labelDraft, setLabelDraft] = useState('');
  const [labelUsable, setLabelUsable] = useState(false);
  const [typeFilter, setTypeFilter] = useState<SupplyMovementType | 'all'>('all');
  const [movementsPage, setMovementsPage] = useState(1);
  const [movementsLimit, setMovementsLimit] = useState(MOVEMENTS_PAGE_SIZE);

  // La bitácora se pide al API: el detalle solo trae los últimos 100 y filtrar
  // esos en el cliente escondería movimientos viejos del tipo elegido.
  const movementsQuery = useSupplyMovements(id, {
    type: typeFilter === 'all' ? undefined : typeFilter,
    page: movementsPage,
    limit: movementsLimit,
  });

  // Mientras llega la primera página se pintan los que ya trajo el detalle.
  const fallbackMovements = useMemo(
    () =>
      (supply?.movements ?? []).filter(
        (m) => typeFilter === 'all' || m.movementType === typeFilter,
      ),
    [supply, typeFilter],
  );
  const movements =
    movementsQuery.data?.data ?? (movementsPage === 1 ? fallbackMovements : []);
  const movementsTotal = movementsQuery.data?.total ?? fallbackMovements.length;

  /** Cambiar de tipo reinicia la paginación: la página 3 del filtro anterior no aplica. */
  const applyTypeFilter = (t: SupplyMovementType | 'all') => {
    setTypeFilter(t);
    setMovementsPage(1);
  };

  if (isLoading) {
    return (
      <div className="mx-auto max-w-6xl space-y-4 p-8">
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  if (!supply) {
    return (
      <div className="mx-auto max-w-6xl p-8 text-center">
        <p className="text-lg font-medium">Insumo no encontrado</p>
        <Button asChild variant="outline" className="mt-4">
          <Link href="/admin/activos/insumos">Volver a insumos</Link>
        </Button>
      </div>
    );
  }

  const handleDeactivate = async () => {
    const ok = await confirmAction(
      `¿Desactivar "${supply.name}"? Se conserva su bitácora y podrás reactivarlo.`,
    );
    if (!ok) return;
    try {
      await deleteMutation.mutateAsync(supply.id);
      toast.success('Insumo desactivado');
    } catch (e) {
      const err = e as { response?: { data?: { message?: string } } };
      toast.error(err?.response?.data?.message || 'No se pudo desactivar');
    }
  };

  const handleRestore = async () => {
    try {
      await restoreMutation.mutateAsync(supply.id);
      toast.success('Insumo reactivado');
    } catch (e) {
      const err = e as { response?: { data?: { message?: string } } };
      toast.error(err?.response?.data?.message || 'No se pudo reactivar');
    }
  };

  const handleLinkLabel = async () => {
    const code = labelDraft.trim();
    if (!code) return;
    try {
      await linkLabel.mutateAsync({ supplyId: supply.id, code });
      toast.success(`Etiqueta ${code} vinculada`);
      setLabelDraft('');
      setLabelUsable(false);
    } catch (e) {
      const err = e as { response?: { data?: { message?: string } } };
      toast.error(err?.response?.data?.message || 'No se pudo vincular la etiqueta');
    }
  };

  const handleUnlinkLabel = async () => {
    const ok = await confirmAction(
      `¿Quitarle la etiqueta ${supply.supplyTag} a este insumo? Volverá al inventario como disponible.`,
    );
    if (!ok) return;
    try {
      const r = await unlinkLabel.mutateAsync({ supplyId: supply.id });
      toast.success(`Etiqueta ${r.code ?? ''} liberada`);
    } catch (e) {
      const err = e as { response?: { data?: { message?: string } } };
      toast.error(err?.response?.data?.message || 'No se pudo quitar la etiqueta');
    }
  };

  const handleMarkPrinted = async () => {
    try {
      await markPrinted.mutateAsync(supply.id);
      toast.success('Impresión registrada');
    } catch (e) {
      const err = e as { response?: { data?: { message?: string } } };
      toast.error(err?.response?.data?.message || 'No se pudo registrar la impresión');
    }
  };

  const movementColumns: DataTableColumn<SupplyMovement>[] = [
    {
      key: 'type',
      header: 'Tipo',
      render: (m) => (
        <Badge variant={MOVEMENT_TYPE_VARIANTS[m.movementType]}>
          {MOVEMENT_TYPE_LABELS[m.movementType]}
        </Badge>
      ),
    },
    {
      key: 'quantity',
      header: 'Cantidad',
      headerClassName: 'text-right',
      render: (m) => {
        const q = signedQty(m);
        return (
          <div className="text-right">
            <p className={`text-sm font-semibold tabular-nums ${q.tone}`}>{q.text}</p>
            {m.unitCost !== null ? (
              <p className="text-[11px] text-muted-foreground">
                {money(m.unitCost, supply.currencyCode)} c/u
              </p>
            ) : null}
          </div>
        );
      },
    },
    {
      key: 'stockAfter',
      header: 'Quedaron',
      headerClassName: 'text-right',
      render: (m) => (
        <p className="text-right text-sm tabular-nums text-muted-foreground">{m.stockAfter}</p>
      ),
    },
    {
      key: 'context',
      header: 'Equipo / colaborador',
      render: (m) => {
        const parts = movementContext(m);
        return (
          <div className="min-w-0 space-y-0.5 text-sm">
            {parts.length ? (
              parts.map((p, i) => (
                <p key={i} className="truncate">
                  {p}
                </p>
              ))
            ) : (
              <span className="text-muted-foreground">—</span>
            )}
            {m.notes ? (
              <p className="truncate text-xs text-muted-foreground" title={m.notes}>
                {m.notes}
              </p>
            ) : null}
          </div>
        );
      },
    },
    {
      key: 'reason',
      header: 'Motivo',
      render: (m) => (
        <span className="text-sm">{m.reason ? MOVEMENT_REASON_LABELS[m.reason] : '—'}</span>
      ),
    },
    {
      key: 'movedAt',
      header: 'Fecha',
      render: (m) => <span className="text-sm whitespace-nowrap">{dateTime(m.movedAt)}</span>,
    },
    {
      key: 'createdBy',
      header: 'Registró',
      render: (m) => (
        <span className="text-xs text-muted-foreground">{m.createdByName ?? '—'}</span>
      ),
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-gray-50 dark:from-background dark:to-background">
      {/* Header */}
      <div className="bg-gradient-to-r from-[#3E667D] to-[#0A4B94] text-white">
        <div className="mx-auto max-w-6xl px-4 py-5 sm:px-6 sm:py-8 lg:px-8">
          <button
            type="button"
            onClick={() => router.push('/admin/activos/insumos')}
            className="mb-4 flex items-center gap-2 text-sm text-white/80 hover:text-white"
          >
            <ArrowLeftIcon className="h-4 w-4" />
            Volver a insumos
          </button>
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="font-mono text-sm tracking-wider text-white/70">
                {supply.supplyTag ?? 'Sin etiqueta'}
              </p>
              <h1 className="text-xl font-bold sm:text-3xl">{supply.name}</h1>
              <p className="text-white/80">
                {[supply.brand, supply.model, supply.categoryName].filter(Boolean).join(' · ')}
              </p>
            </div>
            <div className="grid w-full grid-cols-2 gap-2 sm:flex sm:w-auto sm:flex-wrap">
              {supply.isActive ? (
                <>
                  <Button
                    variant="secondary"
                    size="sm"
                    className="h-11 sm:h-9"
                    onClick={() => setMovementType('entrada')}
                  >
                    <ArrowDownToLine className="mr-2 h-4 w-4" />
                    Entrada
                  </Button>
                  <Button
                    variant="secondary"
                    size="sm"
                    className="h-11 sm:h-9"
                    onClick={() => setMovementType('consumo')}
                    disabled={supply.stockQty === 0}
                  >
                    <ArrowUpFromLine className="mr-2 h-4 w-4" />
                    Consumo
                  </Button>
                  <Button
                    variant="secondary"
                    size="sm"
                    className="h-11 sm:h-9"
                    onClick={() => setMovementType('desecho')}
                    disabled={supply.stockQty === 0}
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    Desecho
                  </Button>
                  <Button
                    variant="secondary"
                    size="sm"
                    className="h-11 sm:h-9"
                    onClick={() => setMovementType('ajuste')}
                  >
                    <ClipboardList className="mr-2 h-4 w-4" />
                    Ajuste
                  </Button>
                  <Button
                    variant="secondary"
                    size="sm"
                    className="h-11 sm:h-9"
                    onClick={() => setEditOpen(true)}
                  >
                    <PencilSquareIcon className="mr-2 h-4 w-4" />
                    Editar
                  </Button>
                  <Button
                    variant="destructive"
                    size="sm"
                    className="h-11 sm:h-9"
                    onClick={() => void handleDeactivate()}
                    disabled={deleteMutation.isPending}
                  >
                    <TrashIcon className="mr-2 h-4 w-4" />
                    Desactivar
                  </Button>
                </>
              ) : (
                <Button
                  variant="secondary"
                  size="sm"
                  className="col-span-2 h-11 sm:h-9"
                  onClick={() => void handleRestore()}
                  disabled={restoreMutation.isPending}
                >
                  <ArrowPathIcon className="mr-2 h-4 w-4" />
                  Restaurar
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-6xl space-y-6 px-4 py-8 sm:px-6 lg:px-8">
        {!supply.isActive && (
          <Card className="border-destructive">
            <CardContent className="p-4">
              <p className="text-sm font-medium text-destructive">
                Este insumo está desactivado. No admite movimientos hasta que lo restaures.
              </p>
            </CardContent>
          </Card>
        )}

        {/* Resumen */}
        <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
          <SummaryCard label="Disponibles">
            <p className="text-2xl font-bold tabular-nums">
              {supply.stockQty}{' '}
              <span className="text-sm font-normal text-muted-foreground">{supply.unit}</span>
            </p>
            <Badge variant={STOCK_STATE_VARIANTS[supply.stockState]} className="mt-1">
              {STOCK_STATE_LABELS[supply.stockState]}
            </Badge>
          </SummaryCard>
          <SummaryCard label="Consumidos">
            <p className="text-2xl font-bold tabular-nums text-sky-600">{supply.consumedQty}</p>
            <p className="text-xs text-muted-foreground">acumulado</p>
          </SummaryCard>
          <SummaryCard label="Desechados">
            <p className="text-2xl font-bold tabular-nums text-red-600">{supply.discardedQty}</p>
            <p className="text-xs text-muted-foreground">acumulado</p>
          </SummaryCard>
          <SummaryCard label="Mínimo">
            <p className="text-2xl font-bold tabular-nums">{supply.minStock}</p>
            <p className="text-xs text-muted-foreground">avisa al llegar aquí</p>
          </SummaryCard>
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          {/* Información */}
          <Card className="lg:col-span-2">
            <CardContent className="grid gap-x-8 gap-y-3 p-6 sm:grid-cols-2">
              <Field label="Etiqueta" value={supply.supplyTag} mono />
              <Field label="Categoría" value={supply.categoryName} />
              <Field label="Marca" value={supply.brand} />
              <Field label="Modelo" value={supply.model} />
              <Field label="Número de parte" value={supply.partNumber} mono />
              <Field label="SKU" value={supply.sku} mono />
              <Field label="Unidad" value={supply.unit} />
              <Field label="Último costo" value={money(supply.lastUnitCost, supply.currencyCode)} />
              <Field label="Sucursal" value={supply.branchName ?? 'Corporativo'} />
              <Field label="Ubicación" value={supply.locationName} />
              <Field label="Registrado el" value={shortDate(supply.createdAt)} />
              <Field label="Última actualización" value={dateTime(supply.updatedAt)} />
              {supply.description ? (
                <div className="sm:col-span-2">
                  <p className="text-sm text-muted-foreground">Descripción</p>
                  <p className="whitespace-pre-wrap text-sm">{supply.description}</p>
                </div>
              ) : null}
              {supply.notes ? (
                <div className="sm:col-span-2">
                  <p className="text-sm text-muted-foreground">Notas</p>
                  <p className="whitespace-pre-wrap text-sm">{supply.notes}</p>
                </div>
              ) : null}
            </CardContent>
          </Card>

          {/* Etiqueta */}
          <Card>
            <CardContent className="space-y-4 p-6">
              <h3 className="text-sm font-semibold">Etiqueta del estante</h3>
              {supply.supplyTag ? (
                <>
                  <AssetBarcode value={supply.supplyTag} height={50} />
                  <p className="text-xs text-muted-foreground">
                    {supply.label?.batchNumber ? `Lote ${supply.label.batchNumber} · ` : ''}
                    {supply.label?.printedCount
                      ? `impresa ${supply.label.printedCount} vez(ces)`
                      : 'sin impresión registrada'}
                  </p>
                  <div className="flex flex-wrap gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => void handleMarkPrinted()}
                      disabled={markPrinted.isPending}
                    >
                      {markPrinted.isPending ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      ) : (
                        <Printer className="mr-2 h-4 w-4" />
                      )}
                      Marcar impresa
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => void handleUnlinkLabel()}
                      disabled={unlinkLabel.isPending || !supply.isActive}
                    >
                      {unlinkLabel.isPending ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      ) : null}
                      Quitar etiqueta
                    </Button>
                  </div>
                </>
              ) : (
                <>
                  <p className="text-sm text-muted-foreground">
                    Escanea o teclea el número de una etiqueta ya impresa para pegarla en el
                    estante o la caja de este insumo.
                  </p>
                  <LabelCodeField
                    value={labelDraft}
                    onChange={setLabelDraft}
                    onValidityChange={({ usable }) => setLabelUsable(usable)}
                    label="Código de la etiqueta"
                    hint="Una sola etiqueta por insumo, no por pieza."
                    disabled={!supply.isActive}
                  />
                  <Button
                    size="sm"
                    onClick={() => void handleLinkLabel()}
                    disabled={
                      !labelDraft.trim() || !labelUsable || linkLabel.isPending || !supply.isActive
                    }
                  >
                    {linkLabel.isPending ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : null}
                    Vincular etiqueta
                  </Button>
                  <p className="text-xs text-muted-foreground">
                    ¿No tienes etiquetas impresas?{' '}
                    <Link
                      href="/admin/activos/etiquetas"
                      className="text-primary hover:underline"
                    >
                      Genera un lote
                    </Link>
                    .
                  </p>
                </>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Bitácora */}
        <Card>
          <CardContent className="space-y-4 p-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h3 className="text-lg font-semibold">Movimientos</h3>
                <p className="text-sm text-muted-foreground">
                  {movementsTotal === 1 ? '1 movimiento' : `${movementsTotal} movimientos`}
                  {typeFilter === 'all'
                    ? ''
                    : ` de tipo ${MOVEMENT_TYPE_LABELS[typeFilter].toLowerCase()}`}
                  , del más reciente al más antiguo.
                </p>
              </div>
              <div className="flex flex-wrap gap-2 text-xs">
                <FilterChip active={typeFilter === 'all'} onClick={() => applyTypeFilter('all')}>
                  Todos
                </FilterChip>
                {MOVEMENT_TYPES.map((t) => (
                  <FilterChip
                    key={t}
                    active={typeFilter === t}
                    onClick={() => applyTypeFilter(t)}
                  >
                    {MOVEMENT_TYPE_LABELS[t]}
                  </FilterChip>
                ))}
              </div>
            </div>

            {/* Celular: lista compacta */}
            <div className="space-y-2 sm:hidden">
              {movements.length === 0 ? (
                <p className="py-6 text-center text-sm text-muted-foreground">
                  Sin movimientos registrados.
                </p>
              ) : (
                movements.map((m) => {
                  const q = signedQty(m);
                  const parts = movementContext(m);
                  return (
                    <div key={m.id} className="rounded-md border border-border p-3">
                      <div className="flex items-center justify-between gap-2">
                        <Badge variant={MOVEMENT_TYPE_VARIANTS[m.movementType]}>
                          {MOVEMENT_TYPE_LABELS[m.movementType]}
                        </Badge>
                        <p className={`text-base font-semibold tabular-nums ${q.tone}`}>
                          {q.text}{' '}
                          <span className="text-xs font-normal text-muted-foreground">
                            → {m.stockAfter}
                          </span>
                        </p>
                      </div>
                      {parts.length ? (
                        <div className="mt-1 space-y-0.5 text-sm">
                          {parts.map((p, i) => (
                            <p key={i} className="truncate">
                              {p}
                            </p>
                          ))}
                        </div>
                      ) : null}
                      <p className="mt-1 text-xs text-muted-foreground">
                        {dateTime(m.movedAt)}
                        {m.reason ? ` · ${MOVEMENT_REASON_LABELS[m.reason]}` : ''}
                        {m.createdByName ? ` · ${m.createdByName}` : ''}
                      </p>
                      {m.notes ? <p className="mt-1 text-xs">{m.notes}</p> : null}
                    </div>
                  );
                })
              )}
            </div>

            <div className="hidden sm:block">
              <DataTable
                columns={movementColumns}
                data={movements}
                isLoading={movementsQuery.isLoading && !movementsQuery.data}
                getRowKey={(m) => m.id}
                minWidthClassName="min-w-[900px]"
                emptyMessage="Sin movimientos registrados."
              />
            </div>

            {movementsTotal > 0 && (
              <DataTablePagination
                currentPage={movementsPage}
                pageSize={movementsLimit}
                totalItems={movementsTotal}
                isLoading={movementsQuery.isFetching}
                onPageChange={setMovementsPage}
                onPageSizeChange={(size) => {
                  setMovementsLimit(size);
                  setMovementsPage(1);
                }}
                pageSizeOptions={[10, 20, 50, 100]}
              />
            )}
          </CardContent>
        </Card>
      </div>

      <SupplyFormModal open={editOpen} onOpenChange={setEditOpen} supply={supply} />
      <SupplyMovementModal
        open={!!movementType}
        onOpenChange={(o) => !o && setMovementType(null)}
        supply={supply}
        initialType={movementType ?? 'entrada'}
      />
    </div>
  );
}

function SummaryCard({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <Card>
      <CardContent className="p-4">
        <p className="mb-2 text-xs text-muted-foreground">{label}</p>
        {children}
      </CardContent>
    </Card>
  );
}

function Field({
  label,
  value,
  mono,
}: {
  label: string;
  value: string | null | undefined;
  mono?: boolean;
}) {
  return (
    <div className="flex justify-between gap-4 border-b border-border pb-2">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className={`text-right text-sm font-medium ${mono ? 'font-mono' : ''}`}>
        {value || '—'}
      </span>
    </div>
  );
}

function FilterChip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-full border px-3 py-1 transition-colors ${
        active
          ? 'border-primary bg-primary text-primary-foreground'
          : 'border-border hover:bg-muted'
      }`}
    >
      {children}
    </button>
  );
}
