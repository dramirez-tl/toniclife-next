'use client';

// Inventario de etiquetas físicas.
//
// El flujo real: se genera un lote de 50 etiquetas con código numérico único, se
// mandan a imprimir (proyecto Electron), se pegan en los aparatos en el orden que
// sea, y al capturar el equipo se escanea ese número para vincularlo. La etiqueta
// existe ANTES que el activo y solo "se activa" cuando se vincula.

import { Suspense, useState } from 'react';
import Link from 'next/link';
import { toast } from 'sonner';
import { ArrowLeftIcon, PlusIcon } from '@heroicons/react/24/outline';
import { Barcode, Loader2, Printer, Ban, RotateCcw } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Skeleton } from '@/components/ui/skeleton';
import { SearchableSelect } from '@/components/ui/SearchableSelect';
import { DataTable, DataTablePagination, type DataTableColumn } from '@/components/ui/DataTable';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { confirmAction } from '@/lib/utils';
import { useQueryFilters } from '@/hooks/useQueryFilters';
import {
  useAssetLabelBatches,
  useAssetLabelStats,
  useAssetLabels,
  useCreateLabelBatch,
  useMarkBatchPrinted,
  useRestoreLabel,
  useVoidLabel,
} from '@/hooks/useAssets';
import { AssetBarcode } from '@/components/admin/assets/AssetBarcode';
import { shortDate } from '@/components/admin/assets/AssignAssetModal';
import {
  LABEL_STATUSES,
  LABEL_STATUS_LABELS,
  LABEL_STATUS_VARIANTS,
  type AssetLabel,
} from '@/types/asset';

export default function EtiquetasPage() {
  return (
    <Suspense fallback={<Skeleton className="m-8 h-96" />}>
      <EtiquetasContent />
    </Suspense>
  );
}

function EtiquetasContent() {
  const { get, getNumber, setParams } = useQueryFilters({
    status: 'all',
    batch: 'all',
    page: '1',
    limit: '50',
  });
  const status = get('status');
  const batch = get('batch');
  const search = get('search');
  const page = getNumber('page') || 1;
  const limit = getNumber('limit') || 50;

  const [searchDraft, setSearchDraft] = useState(search);
  const [batchModalOpen, setBatchModalOpen] = useState(false);
  const [quantity, setQuantity] = useState('50');
  const [notes, setNotes] = useState('');
  const [preview, setPreview] = useState<AssetLabel | null>(null);

  const { data: stats } = useAssetLabelStats();
  const { data: batches = [] } = useAssetLabelBatches();
  const { data, isLoading, isFetching } = useAssetLabels({
    search: search || undefined,
    status: status !== 'all' ? (status as AssetLabel['status']) : undefined,
    batchId: batch !== 'all' ? batch : undefined,
    page,
    limit,
  });

  const createBatch = useCreateLabelBatch();
  const markPrinted = useMarkBatchPrinted();
  const voidLabel = useVoidLabel();
  const restoreLabel = useRestoreLabel();

  const labels = data?.data ?? [];

  const handleCreateBatch = async () => {
    const qty = Number(quantity);
    if (!Number.isInteger(qty) || qty < 1 || qty > 1000) {
      toast.error('La cantidad debe ser un número entre 1 y 1000');
      return;
    }
    try {
      const created = await createBatch.mutateAsync({
        quantity: qty,
        notes: notes.trim() || null,
      });
      toast.success(
        `${created.batchNumber}: ${created.quantity} etiquetas (${created.firstCode} … ${created.lastCode})`,
      );
      setBatchModalOpen(false);
      setQuantity('50');
      setNotes('');
      setParams({ batch: created.id, status: 'all', page: null });
    } catch (e) {
      const err = e as { response?: { data?: { message?: string | string[] } } };
      const msg = err?.response?.data?.message;
      toast.error(Array.isArray(msg) ? msg[0] : msg || 'No se pudo generar el lote');
    }
  };

  const handleVoid = async (l: AssetLabel) => {
    const ok = await confirmAction(`¿Cancelar la etiqueta ${l.code}?`);
    if (!ok) return;
    const reason = window.prompt('Motivo (dañada, perdida, mal impresa):');
    if (!reason?.trim()) {
      toast.error('El motivo es obligatorio');
      return;
    }
    try {
      await voidLabel.mutateAsync({ id: l.id, reason: reason.trim() });
      toast.success(`Etiqueta ${l.code} cancelada`);
    } catch (e) {
      const err = e as { response?: { data?: { message?: string } } };
      toast.error(err?.response?.data?.message || 'No se pudo cancelar');
    }
  };

  const columns: DataTableColumn<AssetLabel>[] = [
    {
      key: 'code',
      header: 'Código',
      render: (l) => (
        <button
          type="button"
          onClick={() => setPreview(l)}
          className="font-mono text-sm font-semibold tracking-wider text-primary hover:underline"
        >
          {l.code}
        </button>
      ),
    },
    {
      key: 'status',
      header: 'Estado',
      render: (l) => (
        <Badge variant={LABEL_STATUS_VARIANTS[l.status]}>
          {LABEL_STATUS_LABELS[l.status]}
        </Badge>
      ),
    },
    {
      key: 'asset',
      header: 'Equipo vinculado',
      render: (l) =>
        l.assetId ? (
          <Link
            href={`/admin/activos/${l.assetId}`}
            className="text-sm text-primary hover:underline"
          >
            {l.assetName}
            {l.assetSerial ? (
              <span className="block font-mono text-xs text-muted-foreground">
                {l.assetSerial}
              </span>
            ) : null}
          </Link>
        ) : l.status === 'void' ? (
          <span className="text-xs text-muted-foreground">{l.voidedReason ?? '—'}</span>
        ) : (
          <span className="text-xs text-muted-foreground">Sin usar</span>
        ),
    },
    {
      key: 'batch',
      header: 'Lote',
      render: (l) => <span className="text-sm">{l.batchNumber ?? '—'}</span>,
    },
    {
      key: 'printed',
      header: 'Impresa',
      render: (l) => (
        <span className="text-xs text-muted-foreground">
          {l.printedAt ? `${shortDate(l.printedAt)} (${l.printedCount})` : 'No'}
        </span>
      ),
    },
    {
      key: 'actions',
      header: 'Acciones',
      headerClassName: 'text-right',
      render: (l) => (
        <div className="flex items-center justify-end gap-1">
          {l.status === 'void' ? (
            <Button
              variant="ghost"
              size="sm"
              onClick={() =>
                void restoreLabel
                  .mutateAsync(l.id)
                  .then(() => toast.success(`Etiqueta ${l.code} reactivada`))
                  .catch(() => toast.error('No se pudo reactivar'))
              }
              title="Reactivar"
            >
              <RotateCcw className="h-4 w-4" />
            </Button>
          ) : l.status === 'available' ? (
            <Button variant="ghost" size="sm" onClick={() => void handleVoid(l)} title="Cancelar">
              <Ban className="h-4 w-4 text-destructive" />
            </Button>
          ) : null}
        </div>
      ),
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-gray-50 dark:from-background dark:to-background">
      <div className="bg-gradient-to-r from-[#3E667D] to-[#0A4B94] text-white">
        <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
          <Link
            href="/admin/activos"
            className="mb-4 inline-flex items-center gap-2 text-sm text-white/80 hover:text-white"
          >
            <ArrowLeftIcon className="h-4 w-4" />
            Volver al inventario
          </Link>
          <div className="mb-2 flex items-center gap-3">
            <Barcode className="h-9 w-9" />
            <h1 className="text-3xl font-bold sm:text-4xl">Etiquetas</h1>
          </div>
          <p className="text-base text-white/80 sm:text-lg">
            Se imprimen por lote y se vinculan a un equipo al capturarlo
          </p>
        </div>
      </div>

      <div className="mx-auto max-w-7xl space-y-6 px-4 py-8 sm:px-6 lg:px-8">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard label="Total impresas" value={stats?.total ?? 0} />
          <StatCard label="Disponibles" value={stats?.available ?? 0} tone="text-emerald-600" hint="listas para pegar" />
          <StatCard label="En uso" value={stats?.linked ?? 0} tone="text-sky-600" />
          <StatCard label="Canceladas" value={stats?.voided ?? 0} tone="text-red-600" />
        </div>

        {/* Lotes */}
        <Card>
          <CardContent className="space-y-4 p-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold">Lotes de impresión</h2>
                <p className="text-sm text-muted-foreground">
                  Genera los códigos, mándalos a imprimir y pega las etiquetas. Se activan
                  cuando las vinculas a un equipo.
                </p>
              </div>
              <Button onClick={() => setBatchModalOpen(true)}>
                <PlusIcon className="mr-2 h-4 w-4" />
                Generar lote
              </Button>
            </div>

            {batches.length === 0 ? (
              <p className="rounded-md border border-dashed border-border p-4 text-sm text-muted-foreground">
                Aún no hay lotes. Genera el primero con 50 etiquetas.
              </p>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {batches.map((b) => (
                  <div key={b.id} className="rounded-md border border-border p-3">
                    <div className="flex items-center justify-between">
                      <p className="font-semibold">{b.batchNumber}</p>
                      <Badge variant={b.printedAt ? 'success' : 'warning'}>
                        {b.printedAt ? 'Impreso' : 'Sin imprimir'}
                      </Badge>
                    </div>
                    <p className="font-mono text-xs text-muted-foreground">
                      {b.firstCode} … {b.lastCode}
                    </p>
                    <p className="mt-2 text-xs text-muted-foreground">
                      {b.quantity} etiquetas · {b.availableCount} libres · {b.linkedCount} en uso
                      {b.voidCount > 0 ? ` · ${b.voidCount} canceladas` : ''}
                    </p>
                    {b.notes ? (
                      <p className="mt-1 truncate text-xs text-muted-foreground">{b.notes}</p>
                    ) : null}
                    <div className="mt-3 flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setParams({ batch: b.id, status: 'all', page: null })}
                      >
                        Ver etiquetas
                      </Button>
                      {!b.printedAt && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() =>
                            void markPrinted
                              .mutateAsync(b.id)
                              .then((r) => toast.success(`${r.printed} etiquetas marcadas`))
                              .catch(() => toast.error('No se pudo marcar el lote'))
                          }
                        >
                          <Printer className="mr-2 h-4 w-4" />
                          Marcar impreso
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Etiquetas */}
        <Card>
          <CardContent className="space-y-4 p-6">
            <div className="flex flex-wrap items-center gap-3">
              <Input
                value={searchDraft}
                onChange={(e) => setSearchDraft(e.target.value.replace(/[^0-9]/g, ''))}
                onKeyDown={(e) =>
                  e.key === 'Enter' && setParams({ search: searchDraft || null, page: null })
                }
                onBlur={() => setParams({ search: searchDraft || null, page: null })}
                placeholder="Buscar por código"
                className="max-w-xs font-mono"
                inputMode="numeric"
              />
              <SearchableSelect
                options={LABEL_STATUSES.map((s) => ({
                  value: s,
                  label: LABEL_STATUS_LABELS[s],
                }))}
                value={status}
                onChange={(v) => setParams({ status: v, page: null })}
                allLabel="Todos los estados"
                allValue="all"
                className="w-52"
              />
              <SearchableSelect
                options={batches.map((b) => ({ value: b.id, label: b.batchNumber }))}
                value={batch}
                onChange={(v) => setParams({ batch: v, page: null })}
                allLabel="Todos los lotes"
                allValue="all"
                className="w-48"
              />
            </div>

            <DataTable
              columns={columns}
              data={labels}
              isLoading={isLoading && !data}
              getRowKey={(l) => l.id}
              minWidthClassName="min-w-[820px]"
              emptyMessage="No hay etiquetas que coincidan."
            />
            {labels.length > 0 && (
              <DataTablePagination
                currentPage={page}
                pageSize={limit}
                totalItems={data?.total ?? 0}
                isLoading={isLoading || isFetching}
                onPageChange={(p) => setParams({ page: String(p) })}
                onPageSizeChange={(size) => setParams({ limit: String(size), page: null })}
                pageSizeOptions={[25, 50, 100, 200]}
              />
            )}
          </CardContent>
        </Card>
      </div>

      {/* Generar lote */}
      <Dialog open={batchModalOpen} onOpenChange={setBatchModalOpen}>
        <DialogContent className="sm:max-w-md" onInteractOutside={(e) => e.preventDefault()}>
          <DialogHeader>
            <DialogTitle>Generar lote de etiquetas</DialogTitle>
            <DialogDescription>
              Se reservan los códigos ahora. Las etiquetas quedan disponibles hasta que las
              vincules a un equipo.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="grid gap-2">
              <Label>Cuántas etiquetas *</Label>
              <Input
                type="number"
                min={1}
                max={1000}
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Lo típico son 50. Los códigos son consecutivos y no se reciclan nunca.
              </p>
            </div>
            <div className="grid gap-2">
              <Label>Nota (opcional)</Label>
              <Textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={2}
                placeholder="Para qué es el lote"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setBatchModalOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={() => void handleCreateBatch()} disabled={createBatch.isPending}>
              {createBatch.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Generar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Vista previa de una etiqueta */}
      <Dialog open={!!preview} onOpenChange={(o) => !o && setPreview(null)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="font-mono tracking-wider">{preview?.code}</DialogTitle>
            <DialogDescription>
              {preview ? LABEL_STATUS_LABELS[preview.status] : ''}
              {preview?.assetName ? ` · ${preview.assetName}` : ''}
            </DialogDescription>
          </DialogHeader>
          {preview ? (
            <div className="flex justify-center py-2">
              <AssetBarcode value={preview.code} />
            </div>
          ) : null}
          <DialogFooter>
            <Button variant="outline" onClick={() => setPreview(null)}>
              Cerrar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function StatCard({
  label,
  value,
  tone,
  hint,
}: {
  label: string;
  value: number;
  tone?: string;
  hint?: string;
}) {
  return (
    <Card>
      <CardContent className="p-4">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className={`text-2xl font-bold ${tone ?? ''}`}>{value.toLocaleString('es-MX')}</p>
        {hint ? <p className="text-[11px] text-muted-foreground">{hint}</p> : null}
      </CardContent>
    </Card>
  );
}
