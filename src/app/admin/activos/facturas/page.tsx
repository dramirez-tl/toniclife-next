'use client';

// Facturas de compra de activos.
// El punto de esta pantalla: una factura cubre VARIOS equipos. El PDF (y el XML
// del CFDI) se suben UNA sola vez y luego se enlazan los equipos.

import { Suspense, useState } from 'react';
import { toast } from 'sonner';
import {
  DocumentTextIcon,
  PlusIcon,
  PencilSquareIcon,
  TrashIcon,
  LinkIcon,
} from '@heroicons/react/24/outline';
import { Loader2, Upload, Download, X } from 'lucide-react';
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
  useAssetPurchase,
  useAssetPurchases,
  useAssets,
  useCreateAssetPurchase,
  useDeleteAssetPurchase,
  useDeletePurchaseFile,
  useLinkAssetsToPurchase,
  useUnlinkAssetFromPurchase,
  useUpdateAssetPurchase,
  useUploadPurchaseFile,
} from '@/hooks/useAssets';
import { assetsService } from '@/services/assets.service';
import { shortDate } from '@/components/admin/assets/AssignAssetModal';
import { PURCHASE_FILE_KIND_LABELS, type AssetPurchase } from '@/types/asset';

const ACCEPTED = [
  'application/pdf',
  'application/xml',
  'text/xml',
  'image/jpeg',
  'image/png',
  'image/webp',
];

export default function FacturasPage() {
  return (
    <Suspense fallback={<Skeleton className="m-8 h-96" />}>
      <FacturasContent />
    </Suspense>
  );
}

interface FormState {
  supplierName: string;
  supplierRfc: string;
  invoiceNumber: string;
  invoiceUuid: string;
  invoiceDate: string;
  currencyCode: string;
  subtotal: string;
  taxAmount: string;
  totalAmount: string;
  notes: string;
}

const EMPTY: FormState = {
  supplierName: '',
  supplierRfc: '',
  invoiceNumber: '',
  invoiceUuid: '',
  invoiceDate: '',
  currencyCode: 'MXN',
  subtotal: '',
  taxAmount: '',
  totalAmount: '',
  notes: '',
};

function FacturasContent() {
  const { get, getNumber, setParams } = useQueryFilters({ page: '1', limit: '20' });
  const search = get('search');
  const page = getNumber('page') || 1;
  const limit = getNumber('limit') || 20;
  const detailId = get('id');

  const [searchDraft, setSearchDraft] = useState(search);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY);

  const { data, isLoading, isFetching } = useAssetPurchases({
    search: search || undefined,
    page,
    limit,
  });
  const purchases = data?.data ?? [];

  const createMutation = useCreateAssetPurchase();
  const updateMutation = useUpdateAssetPurchase();
  const deleteMutation = useDeleteAssetPurchase();
  const isSaving = createMutation.isPending || updateMutation.isPending;

  const set = (patch: Partial<FormState>) => setForm((prev) => ({ ...prev, ...patch }));

  const openNew = () => {
    setEditingId(null);
    setForm(EMPTY);
    setModalOpen(true);
  };

  const openEdit = (p: AssetPurchase) => {
    setEditingId(p.id);
    setForm({
      supplierName: p.supplierName ?? '',
      supplierRfc: p.supplierRfc ?? '',
      invoiceNumber: p.invoiceNumber ?? '',
      invoiceUuid: p.invoiceUuid ?? '',
      invoiceDate: p.invoiceDate ?? '',
      currencyCode: p.currencyCode ?? 'MXN',
      subtotal: p.subtotal !== null ? String(p.subtotal) : '',
      taxAmount: p.taxAmount !== null ? String(p.taxAmount) : '',
      totalAmount: p.totalAmount !== null ? String(p.totalAmount) : '',
      notes: p.notes ?? '',
    });
    setModalOpen(true);
  };

  const handleSubmit = async () => {
    if (!form.supplierName.trim() && !form.invoiceNumber.trim()) {
      toast.error('Captura al menos el proveedor o el folio de la factura');
      return;
    }
    const payload = {
      supplierName: form.supplierName.trim() || null,
      supplierRfc: form.supplierRfc.trim().toUpperCase() || null,
      invoiceNumber: form.invoiceNumber.trim() || null,
      invoiceUuid: form.invoiceUuid.trim() || null,
      invoiceDate: form.invoiceDate || null,
      currencyCode: form.currencyCode || null,
      subtotal: form.subtotal ? Number(form.subtotal) : null,
      taxAmount: form.taxAmount ? Number(form.taxAmount) : null,
      totalAmount: form.totalAmount ? Number(form.totalAmount) : null,
      notes: form.notes.trim() || null,
    };
    try {
      if (editingId) {
        await updateMutation.mutateAsync({ id: editingId, dto: payload });
        toast.success('Factura actualizada');
      } else {
        const created = await createMutation.mutateAsync(payload);
        toast.success('Factura registrada. Ahora sube el archivo y enlaza los equipos.');
        setParams({ id: created.id });
      }
      setModalOpen(false);
    } catch (e) {
      const err = e as { response?: { data?: { message?: string | string[] } } };
      const msg = err?.response?.data?.message;
      toast.error(Array.isArray(msg) ? msg[0] : msg || 'Error al guardar la factura');
    }
  };

  const handleDelete = async (p: AssetPurchase) => {
    const ok = await confirmAction(
      `¿Eliminar la factura ${p.invoiceNumber ?? 'sin folio'}?`,
    );
    if (!ok) return;
    try {
      const result = await deleteMutation.mutateAsync(p.id);
      toast.success(result.message);
    } catch (e) {
      const err = e as { response?: { data?: { message?: string } } };
      toast.error(err?.response?.data?.message || 'No se pudo eliminar');
    }
  };

  const columns: DataTableColumn<AssetPurchase>[] = [
    {
      key: 'invoice',
      header: 'Factura',
      render: (p) => (
        <button
          type="button"
          className="text-left"
          onClick={() => setParams({ id: p.id })}
        >
          <p className="text-sm font-semibold text-primary hover:underline">
            {p.invoiceNumber ?? 'Sin folio'}
          </p>
          <p className="text-xs text-muted-foreground">{p.supplierName ?? 'Sin proveedor'}</p>
        </button>
      ),
    },
    {
      key: 'date',
      header: 'Fecha',
      render: (p) => <span className="text-sm">{shortDate(p.invoiceDate)}</span>,
    },
    {
      key: 'total',
      header: 'Total',
      render: (p) => (
        <span className="text-sm tabular-nums">
          {p.totalAmount !== null
            ? `$${p.totalAmount.toLocaleString('es-MX', { minimumFractionDigits: 2 })} ${p.currencyCode ?? ''}`
            : '—'}
        </span>
      ),
    },
    {
      key: 'assets',
      header: 'Equipos',
      render: (p) => (
        <Badge variant={p.assetCount > 0 ? 'info' : 'outline'}>{p.assetCount}</Badge>
      ),
    },
    {
      key: 'files',
      header: 'Archivos',
      render: (p) => (
        <Badge variant={p.fileCount > 0 ? 'success' : 'warning'}>
          {p.fileCount > 0 ? `${p.fileCount}` : 'Sin archivo'}
        </Badge>
      ),
    },
    {
      key: 'actions',
      header: 'Acciones',
      headerClassName: 'text-right',
      render: (p) => (
        <div className="flex items-center justify-end gap-1">
          <Button variant="ghost" size="sm" onClick={() => setParams({ id: p.id })}>
            <LinkIcon className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="sm" onClick={() => openEdit(p)}>
            <PencilSquareIcon className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="sm" onClick={() => void handleDelete(p)}>
            <TrashIcon className="h-4 w-4 text-destructive" />
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-gray-50 dark:from-background dark:to-background">
      <div className="bg-gradient-to-r from-[#3E667D] to-[#0A4B94] text-white">
        <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
          <div className="mb-2 flex items-center gap-3">
            <DocumentTextIcon className="h-9 w-9" />
            <h1 className="text-3xl font-bold sm:text-4xl">Facturas de compra</h1>
          </div>
          <p className="text-base text-white/80 sm:text-lg">
            Una factura puede cubrir varios equipos: se sube una sola vez
          </p>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <Card>
          <CardContent className="space-y-4 p-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <Input
                value={searchDraft}
                onChange={(e) => setSearchDraft(e.target.value)}
                onKeyDown={(e) =>
                  e.key === 'Enter' && setParams({ search: searchDraft.trim() || null, page: null })
                }
                onBlur={() => setParams({ search: searchDraft.trim() || null, page: null })}
                placeholder="Proveedor, folio o UUID fiscal"
                className="max-w-sm"
              />
              <Button onClick={openNew}>
                <PlusIcon className="mr-2 h-4 w-4" />
                Nueva factura
              </Button>
            </div>
            <DataTable
              columns={columns}
              data={purchases}
              isLoading={isLoading && !data}
              getRowKey={(p) => p.id}
              minWidthClassName="min-w-[800px]"
              emptyMessage="No hay facturas registradas."
            />
            {purchases.length > 0 && (
              <DataTablePagination
                currentPage={page}
                pageSize={limit}
                totalItems={data?.total ?? 0}
                isLoading={isLoading || isFetching}
                onPageChange={(p) => setParams({ page: String(p) })}
                onPageSizeChange={(size) => setParams({ limit: String(size), page: null })}
                pageSizeOptions={[10, 20, 50]}
              />
            )}
          </CardContent>
        </Card>
      </div>

      {/* Modal de alta/edición */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editingId ? 'Editar factura' : 'Nueva factura'}</DialogTitle>
            <DialogDescription>
              Basta con el proveedor o el folio. Los importes son opcionales.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-2 sm:grid-cols-2">
            <div className="grid gap-2">
              <Label>Proveedor</Label>
              <Input
                value={form.supplierName}
                onChange={(e) => set({ supplierName: e.target.value })}
                placeholder="CompuSoluciones SA de CV"
              />
            </div>
            <div className="grid gap-2">
              <Label>RFC del proveedor</Label>
              <Input
                value={form.supplierRfc}
                onChange={(e) => set({ supplierRfc: e.target.value.toUpperCase() })}
                className="font-mono uppercase"
                maxLength={20}
              />
            </div>
            <div className="grid gap-2">
              <Label>Folio</Label>
              <Input
                value={form.invoiceNumber}
                onChange={(e) => set({ invoiceNumber: e.target.value })}
                className="font-mono"
              />
            </div>
            <div className="grid gap-2">
              <Label>Fecha de la factura</Label>
              <Input
                type="date"
                value={form.invoiceDate}
                onChange={(e) => set({ invoiceDate: e.target.value })}
              />
            </div>
            <div className="grid gap-2 sm:col-span-2">
              <Label>UUID fiscal (CFDI)</Label>
              <Input
                value={form.invoiceUuid}
                onChange={(e) => set({ invoiceUuid: e.target.value })}
                className="font-mono text-xs"
                maxLength={36}
              />
            </div>
            <div className="grid gap-2">
              <Label>Moneda</Label>
              <SearchableSelect
                options={[
                  { value: 'MXN', label: 'MXN' },
                  { value: 'USD', label: 'USD' },
                ]}
                value={form.currencyCode}
                onChange={(v) => set({ currencyCode: v })}
                showAllOption={false}
              />
            </div>
            <div className="grid gap-2">
              <Label>Subtotal</Label>
              <Input
                type="number"
                step="0.01"
                value={form.subtotal}
                onChange={(e) => set({ subtotal: e.target.value })}
              />
            </div>
            <div className="grid gap-2">
              <Label>Impuestos</Label>
              <Input
                type="number"
                step="0.01"
                value={form.taxAmount}
                onChange={(e) => set({ taxAmount: e.target.value })}
              />
            </div>
            <div className="grid gap-2">
              <Label>Total</Label>
              <Input
                type="number"
                step="0.01"
                value={form.totalAmount}
                onChange={(e) => set({ totalAmount: e.target.value })}
              />
            </div>
            <div className="grid gap-2 sm:col-span-2">
              <Label>Notas</Label>
              <Textarea
                value={form.notes}
                onChange={(e) => set({ notes: e.target.value })}
                rows={2}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setModalOpen(false)} disabled={isSaving}>
              Cancelar
            </Button>
            <Button onClick={() => void handleSubmit()} disabled={isSaving}>
              {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Guardar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <PurchaseDetailDialog
        purchaseId={detailId || null}
        onClose={() => setParams({ id: null })}
      />
    </div>
  );
}

// ================================
// Detalle: archivos + equipos enlazados
// ================================

function PurchaseDetailDialog({
  purchaseId,
  onClose,
}: {
  purchaseId: string | null;
  onClose: () => void;
}) {
  const { data: purchase, isLoading } = useAssetPurchase(purchaseId ?? undefined);
  const [linkIds, setLinkIds] = useState<string[]>([]);
  const [assetSearch, setAssetSearch] = useState('');

  const uploadMutation = useUploadPurchaseFile();
  const deleteFileMutation = useDeletePurchaseFile();
  const linkMutation = useLinkAssetsToPurchase();
  const unlinkMutation = useUnlinkAssetFromPurchase();

  // Solo equipos SIN factura, para no robárselos a otra
  const { data: candidates } = useAssets({
    hasInvoice: 'false',
    search: assetSearch || undefined,
    limit: 50,
  });

  const handleFile = async (files: FileList | null) => {
    const file = files?.[0];
    if (!file || !purchaseId) return;
    if (!ACCEPTED.includes(file.type)) {
      toast.error('Solo se aceptan PDF, XML, JPG, PNG o WEBP');
      return;
    }
    if (file.size > 20 * 1024 * 1024) {
      toast.error('El archivo supera los 20 MB');
      return;
    }
    try {
      await uploadMutation.mutateAsync({ purchaseId, file });
      toast.success('Archivo subido');
    } catch (e) {
      const err = e as { response?: { data?: { message?: string } } };
      toast.error(err?.response?.data?.message || 'No se pudo subir el archivo');
    }
  };

  const handleDownload = async (fileId: string) => {
    if (!purchaseId) return;
    try {
      const { url } = await assetsService.getPurchaseFileUrl(purchaseId, fileId);
      window.open(url, '_blank', 'noopener,noreferrer');
    } catch (e) {
      const err = e as { response?: { data?: { message?: string } } };
      toast.error(err?.response?.data?.message || 'No se pudo abrir el archivo');
    }
  };

  const handleLink = async () => {
    if (!purchaseId || !linkIds.length) {
      toast.error('Selecciona al menos un equipo');
      return;
    }
    try {
      const result = await linkMutation.mutateAsync({ purchaseId, assetIds: linkIds });
      toast.success(result.message);
      setLinkIds([]);
    } catch (e) {
      const err = e as { response?: { data?: { message?: string } } };
      toast.error(err?.response?.data?.message || 'No se pudieron enlazar los equipos');
    }
  };

  return (
    <Dialog open={!!purchaseId} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>
            {purchase?.invoiceNumber ?? 'Factura'} — {purchase?.supplierName ?? 'Sin proveedor'}
          </DialogTitle>
          <DialogDescription>
            Sube el PDF y el XML una sola vez, y enlaza todos los equipos que cubre.
          </DialogDescription>
        </DialogHeader>

        {isLoading || !purchase ? (
          <Skeleton className="h-64 w-full" />
        ) : (
          <div className="space-y-6 py-2">
            {/* Archivos */}
            <section className="space-y-2">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold">Archivos ({purchase.files.length})</h3>
                <label className="inline-flex">
                  <input
                    type="file"
                    accept={ACCEPTED.join(',')}
                    className="hidden"
                    onChange={(e) => void handleFile(e.target.files)}
                  />
                  <Button asChild variant="outline" size="sm" disabled={uploadMutation.isPending}>
                    <span className="cursor-pointer">
                      {uploadMutation.isPending ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      ) : (
                        <Upload className="mr-2 h-4 w-4" />
                      )}
                      Subir archivo
                    </span>
                  </Button>
                </label>
              </div>
              {purchase.files.length === 0 ? (
                <p className="rounded-md border border-dashed border-border p-3 text-sm text-muted-foreground">
                  Sin archivos. Sube el PDF de la factura (y el XML si lo tienes).
                </p>
              ) : (
                <ul className="divide-y divide-border rounded-md border border-border">
                  {purchase.files.map((f) => (
                    <li key={f.id} className="flex items-center justify-between gap-2 p-3">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium">{f.fileName}</p>
                        <p className="text-xs text-muted-foreground">
                          {PURCHASE_FILE_KIND_LABELS[f.fileKind]}
                        </p>
                      </div>
                      <div className="flex shrink-0 gap-1">
                        <Button variant="ghost" size="sm" onClick={() => void handleDownload(f.id)}>
                          <Download className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() =>
                            void deleteFileMutation
                              .mutateAsync({ purchaseId: purchase.id, fileId: f.id })
                              .then(() => toast.success('Archivo eliminado'))
                              .catch(() => toast.error('No se pudo eliminar'))
                          }
                        >
                          <X className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </section>

            {/* Equipos enlazados */}
            <section className="space-y-2">
              <h3 className="text-sm font-semibold">
                Equipos de esta factura ({purchase.assets.length})
              </h3>
              {purchase.assets.length === 0 ? (
                <p className="rounded-md border border-dashed border-border p-3 text-sm text-muted-foreground">
                  Todavía no hay equipos enlazados.
                </p>
              ) : (
                <ul className="divide-y divide-border rounded-md border border-border">
                  {purchase.assets.map((a) => (
                    <li key={a.id} className="flex items-center justify-between gap-2 p-3">
                      <div className="min-w-0">
                        <p className="truncate text-sm">
                          <span className="font-mono font-medium">{a.assetTag}</span> · {a.name}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {[a.brand, a.model, a.serialNumber].filter(Boolean).join(' · ') || '—'}
                        </p>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() =>
                          void unlinkMutation
                            .mutateAsync({ purchaseId: purchase.id, assetId: a.id })
                            .then(() => toast.success('Equipo desenlazado'))
                            .catch(() => toast.error('No se pudo desenlazar'))
                        }
                      >
                        <X className="h-4 w-4 text-destructive" />
                      </Button>
                    </li>
                  ))}
                </ul>
              )}
            </section>

            {/* Enlazar equipos existentes */}
            <section className="space-y-2 rounded-md border border-border p-3">
              <h3 className="text-sm font-semibold">Enlazar equipos sin factura</h3>
              <Input
                value={assetSearch}
                onChange={(e) => setAssetSearch(e.target.value)}
                placeholder="Busca por etiqueta, nombre o serie"
              />
              <div className="max-h-48 space-y-1 overflow-y-auto">
                {(candidates?.data ?? []).map((a) => {
                  const checked = linkIds.includes(a.id);
                  return (
                    <label
                      key={a.id}
                      className="flex cursor-pointer items-center gap-2 rounded p-1 text-sm hover:bg-muted"
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={(e) =>
                          setLinkIds((prev) =>
                            e.target.checked ? [...prev, a.id] : prev.filter((id) => id !== a.id),
                          )
                        }
                      />
                      <span className="font-mono text-xs">{a.assetTag}</span>
                      <span className="truncate">{a.name}</span>
                    </label>
                  );
                })}
                {(candidates?.data ?? []).length === 0 && (
                  <p className="p-2 text-sm text-muted-foreground">
                    No hay equipos sin factura que coincidan.
                  </p>
                )}
              </div>
              <Button
                size="sm"
                onClick={() => void handleLink()}
                disabled={!linkIds.length || linkMutation.isPending}
              >
                {linkMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                Enlazar {linkIds.length} equipo(s)
              </Button>
            </section>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cerrar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
