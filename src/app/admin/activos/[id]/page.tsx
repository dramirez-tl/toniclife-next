'use client';

// Detalle de un activo de TI: información, características técnicas, compra,
// asignaciones (con historial), mantenimiento, documentos y etiqueta.

import { use, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import {
  ArrowLeftIcon,
  PencilSquareIcon,
  UserPlusIcon,
  ArrowUturnLeftIcon,
  ArrowsRightLeftIcon,
  TrashIcon,
  ArrowPathIcon,
} from '@heroicons/react/24/outline';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { confirmAction } from '@/lib/utils';
import { useAsset, useMarkLabelsPrinted, useRestoreAsset, useRetireAsset } from '@/hooks/useAssets';
import { AssetFormModal } from '@/components/admin/assets/AssetFormModal';
import {
  AssignAssetModal,
  LifeBar,
  shortDate,
  type AssignMode,
} from '@/components/admin/assets/AssignAssetModal';
import { AssetBarcode } from '@/components/admin/assets/AssetBarcode';
import { SpecFieldsView } from '@/components/admin/assets/SpecFieldsRenderer';
import { AssetDocumentsSection } from '@/components/admin/assets/AssetDocumentsSection';
import { AssetMaintenanceSection } from '@/components/admin/assets/AssetMaintenanceSection';
import {
  ASSET_CONDITION_LABELS,
  ASSET_CONDITION_VARIANTS,
  ASSET_STATUS_LABELS,
  ASSET_STATUS_VARIANTS,
  ASSIGNMENT_TYPE_LABELS,
} from '@/types/asset';

export default function AssetDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();

  const { data: asset, isLoading } = useAsset(id);
  const retireMutation = useRetireAsset();
  const restoreMutation = useRestoreAsset();
  const markLabels = useMarkLabelsPrinted();

  const [editOpen, setEditOpen] = useState(false);
  const [assignOpen, setAssignOpen] = useState(false);
  const [assignMode, setAssignMode] = useState<AssignMode>('assign');

  if (isLoading) {
    return (
      <div className="mx-auto max-w-6xl space-y-4 p-8">
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  if (!asset) {
    return (
      <div className="mx-auto max-w-6xl p-8 text-center">
        <p className="text-lg font-medium">Activo no encontrado</p>
        <Button asChild variant="outline" className="mt-4">
          <Link href="/admin/activos">Volver al inventario</Link>
        </Button>
      </div>
    );
  }

  const openAssign = (mode: AssignMode) => {
    setAssignMode(mode);
    setAssignOpen(true);
  };

  const handleRetire = async () => {
    const ok = await confirmAction(
      `¿Dar de baja el activo ${asset.assetTag}? Se cerrará su asignación actual.`,
    );
    if (!ok) return;
    const reason = window.prompt('Motivo de la baja:');
    if (!reason?.trim()) {
      toast.error('El motivo es obligatorio');
      return;
    }
    try {
      await retireMutation.mutateAsync({
        id: asset.id,
        dto: { status: 'retired', reason: reason.trim() },
      });
      toast.success(`Activo ${asset.assetTag} dado de baja`);
    } catch (e) {
      const err = e as { response?: { data?: { message?: string } } };
      toast.error(err?.response?.data?.message || 'No se pudo dar de baja');
    }
  };

  const handleRestore = async () => {
    try {
      await restoreMutation.mutateAsync(asset.id);
      toast.success('Activo reactivado');
    } catch (e) {
      const err = e as { response?: { data?: { message?: string } } };
      toast.error(err?.response?.data?.message || 'No se pudo reactivar');
    }
  };

  const handleMarkLabel = async () => {
    try {
      await markLabels.mutateAsync([asset.id]);
      toast.success('Etiqueta marcada como impresa');
    } catch {
      toast.error('No se pudo marcar la etiqueta');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-gray-50 dark:from-background dark:to-background">
      {/* Header */}
      <div className="bg-gradient-to-r from-[#3E667D] to-[#0A4B94] text-white">
        <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
          <button
            type="button"
            onClick={() => router.push('/admin/activos')}
            className="mb-4 flex items-center gap-2 text-sm text-white/80 hover:text-white"
          >
            <ArrowLeftIcon className="h-4 w-4" />
            Volver al inventario
          </button>
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="font-mono text-sm text-white/70">{asset.assetTag}</p>
              <h1 className="text-2xl font-bold sm:text-3xl">{asset.name}</h1>
              <p className="text-white/80">
                {[asset.brand, asset.model, asset.categoryName].filter(Boolean).join(' · ')}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              {asset.isActive ? (
                <>
                  <Button variant="secondary" size="sm" onClick={() => setEditOpen(true)}>
                    <PencilSquareIcon className="mr-2 h-4 w-4" />
                    Editar
                  </Button>
                  {asset.currentAssignment ? (
                    <>
                      <Button variant="secondary" size="sm" onClick={() => openAssign('transfer')}>
                        <ArrowsRightLeftIcon className="mr-2 h-4 w-4" />
                        Transferir
                      </Button>
                      <Button variant="secondary" size="sm" onClick={() => openAssign('return')}>
                        <ArrowUturnLeftIcon className="mr-2 h-4 w-4" />
                        Devolver
                      </Button>
                    </>
                  ) : (
                    <Button variant="secondary" size="sm" onClick={() => openAssign('assign')}>
                      <UserPlusIcon className="mr-2 h-4 w-4" />
                      Asignar
                    </Button>
                  )}
                  <Button variant="destructive" size="sm" onClick={() => void handleRetire()}>
                    <TrashIcon className="mr-2 h-4 w-4" />
                    Dar de baja
                  </Button>
                </>
              ) : (
                <Button variant="secondary" size="sm" onClick={() => void handleRestore()}>
                  <ArrowPathIcon className="mr-2 h-4 w-4" />
                  Reactivar
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-6xl space-y-6 px-4 py-8 sm:px-6 lg:px-8">
        {!asset.isActive && (
          <Card className="border-destructive">
            <CardContent className="p-4">
              <p className="text-sm font-medium text-destructive">
                Este activo está dado de baja ({ASSET_STATUS_LABELS[asset.status]})
                {asset.retiredAt ? ` el ${shortDate(asset.retiredAt)}` : ''}.
              </p>
              {asset.retirementReason ? (
                <p className="text-sm text-muted-foreground">{asset.retirementReason}</p>
              ) : null}
            </CardContent>
          </Card>
        )}

        {/* Resumen */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <SummaryCard label="Estado">
            <Badge variant={ASSET_STATUS_VARIANTS[asset.status]}>
              {ASSET_STATUS_LABELS[asset.status]}
            </Badge>
          </SummaryCard>
          <SummaryCard label="Condición">
            <Badge variant={ASSET_CONDITION_VARIANTS[asset.condition]}>
              {ASSET_CONDITION_LABELS[asset.condition]}
            </Badge>
          </SummaryCard>
          <SummaryCard label="Vida útil restante">
            <LifeBar pct={asset.lifeRemainingPct} />
            {asset.monthsInUse !== null ? (
              <p className="mt-1 text-xs text-muted-foreground">
                {asset.monthsInUse} mes(es) de uso
              </p>
            ) : null}
          </SummaryCard>
          <SummaryCard label="Asignado a">
            <p className="text-sm font-medium">
              {asset.currentAssignment?.assignedToName ?? 'Sin asignar'}
            </p>
            {asset.currentAssignment ? (
              <p className="text-xs text-muted-foreground">
                {ASSIGNMENT_TYPE_LABELS[asset.currentAssignment.assignmentType]} · desde{' '}
                {shortDate(asset.currentAssignment.assignedAt)}
              </p>
            ) : null}
          </SummaryCard>
        </div>

        <Tabs defaultValue="info">
          <TabsList className="flex-wrap">
            <TabsTrigger value="info">Información</TabsTrigger>
            <TabsTrigger value="specs">Características</TabsTrigger>
            <TabsTrigger value="purchase">Compra</TabsTrigger>
            <TabsTrigger value="assignments">
              Asignaciones ({asset.assignments.length})
            </TabsTrigger>
            <TabsTrigger value="maintenance">
              Mantenimiento ({asset.maintenance.length})
            </TabsTrigger>
            <TabsTrigger value="documents">Documentos ({asset.documents.length})</TabsTrigger>
            <TabsTrigger value="label">Etiqueta</TabsTrigger>
          </TabsList>

          {/* Información */}
          <TabsContent value="info">
            <Card>
              <CardContent className="grid gap-x-8 gap-y-3 p-6 sm:grid-cols-2">
                <Field label="Etiqueta" value={asset.assetTag} mono />
                <Field label="Número de serie" value={asset.serialNumber} mono />
                <Field label="Etiqueta del fabricante" value={asset.manufacturerTag} mono />
                <Field label="Etiqueta del inventario anterior" value={asset.legacyTag} mono />
                <Field label="Número de parte" value={asset.partNumber} mono />
                <Field label="Categoría" value={asset.categoryName} />
                <Field label="Sucursal" value={asset.branchName} />
                <Field label="Ubicación" value={asset.locationName} />
                <Field label="Departamento" value={asset.departmentName} />
                <Field label="Cantidad" value={String(asset.quantity)} />
                {asset.parentAssetTag ? (
                  <Field label="Accesorio de" value={asset.parentAssetTag} mono />
                ) : null}
                <Field label="Registrado el" value={shortDate(asset.createdAt)} />
                {asset.notes ? (
                  <div className="sm:col-span-2">
                    <p className="text-sm text-muted-foreground">Notas</p>
                    <p className="whitespace-pre-wrap text-sm">{asset.notes}</p>
                  </div>
                ) : null}
                {asset.children.length > 0 && (
                  <div className="sm:col-span-2">
                    <p className="mb-2 text-sm text-muted-foreground">Accesorios ligados</p>
                    <div className="flex flex-wrap gap-2">
                      {asset.children.map((c) => (
                        <Link
                          key={c.id}
                          href={`/admin/activos/${c.id}`}
                          className="rounded-md border border-border px-3 py-1 text-xs hover:bg-muted"
                        >
                          <span className="font-mono">{c.assetTag}</span> · {c.name}
                        </Link>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Características técnicas */}
          <TabsContent value="specs">
            <Card>
              <CardContent className="p-6">
                <SpecFieldsView template={asset.specTemplate} values={asset.specifications} />
              </CardContent>
            </Card>
          </TabsContent>

          {/* Compra */}
          <TabsContent value="purchase">
            <Card>
              <CardContent className="grid gap-x-8 gap-y-3 p-6 sm:grid-cols-2">
                <Field label="Fecha de compra" value={shortDate(asset.purchaseDate)} />
                <Field
                  label="Costo"
                  value={
                    asset.purchaseCost !== null
                      ? `${asset.purchaseCost.toLocaleString('es-MX', {
                          minimumFractionDigits: 2,
                        })} ${asset.currencyCode ?? ''}`
                      : null
                  }
                />
                <Field label="Vida útil" value={
                  asset.usefulLifeMonths ? `${asset.usefulLifeMonths} meses` : null
                } />
                <Field label="Garantía hasta" value={shortDate(asset.warrantyUntil)} />
                <Field label="Proveedor de garantía" value={asset.warrantyProvider} />
                <div className="sm:col-span-2">
                  <p className="text-sm text-muted-foreground">Factura de compra</p>
                  {asset.purchaseId ? (
                    <Link
                      href={`/admin/activos/facturas?id=${asset.purchaseId}`}
                      className="text-sm font-medium text-primary hover:underline"
                    >
                      {asset.invoiceNumber ?? 'Sin folio'} — {asset.supplierName ?? 'Sin proveedor'}
                    </Link>
                  ) : (
                    <p className="text-sm">
                      Sin factura enlazada.{' '}
                      <Link href="/admin/activos/facturas" className="text-primary hover:underline">
                        Ir a facturas
                      </Link>
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Asignaciones */}
          <TabsContent value="assignments">
            <Card>
              <CardContent className="p-6">
                {asset.assignments.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    Este equipo nunca se ha asignado.
                  </p>
                ) : (
                  <ol className="relative space-y-6 border-l border-border pl-6">
                    {asset.assignments.map((a) => (
                      <li key={a.id} className="relative">
                        <span
                          className={`absolute -left-[27px] top-1 h-3 w-3 rounded-full ring-4 ring-background ${
                            a.isOpen ? 'bg-emerald-500' : 'bg-muted-foreground/40'
                          }`}
                        />
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="font-medium">{a.assignedToName}</p>
                          <Badge variant={a.isOpen ? 'success' : 'secondary'}>
                            {a.isOpen ? 'Vigente' : 'Devuelto'}
                          </Badge>
                          <Badge variant="outline">
                            {ASSIGNMENT_TYPE_LABELS[a.assignmentType]}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {shortDate(a.assignedAt)}
                          {a.returnedAt ? ` → ${shortDate(a.returnedAt)}` : ' → a la fecha'}
                          {a.assignedByName ? ` · entregó ${a.assignedByName}` : ''}
                        </p>
                        {(a.conditionOut || a.conditionIn) && (
                          <p className="text-xs text-muted-foreground">
                            {a.conditionOut
                              ? `Salió: ${ASSET_CONDITION_LABELS[a.conditionOut]}`
                              : ''}
                            {a.conditionOut && a.conditionIn ? ' · ' : ''}
                            {a.conditionIn
                              ? `Regresó: ${ASSET_CONDITION_LABELS[a.conditionIn]}`
                              : ''}
                          </p>
                        )}
                        {a.notes ? (
                          <p className="mt-1 whitespace-pre-wrap text-sm">{a.notes}</p>
                        ) : null}
                      </li>
                    ))}
                  </ol>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="maintenance">
            <AssetMaintenanceSection assetId={asset.id} maintenance={asset.maintenance} />
          </TabsContent>

          <TabsContent value="documents">
            <AssetDocumentsSection assetId={asset.id} documents={asset.documents} />
          </TabsContent>

          {/* Etiqueta */}
          <TabsContent value="label">
            <Card>
              <CardContent className="space-y-4 p-6">
                <div>
                  <p className="text-sm text-muted-foreground">
                    Código de barras de la etiqueta (CODE128). La impresión física se hará desde el
                    proyecto de etiquetas; aquí puedes verificarlo y escanearlo desde pantalla.
                  </p>
                </div>
                <div className="flex flex-col items-start gap-4">
                  <AssetBarcode value={asset.assetTag} />
                  <div className="text-sm">
                    <p>
                      <span className="text-muted-foreground">Impresa: </span>
                      {asset.labelPrintedAt
                        ? `${shortDate(asset.labelPrintedAt)} (${asset.labelPrintedCount} vez/veces)`
                        : 'Pendiente'}
                    </p>
                  </div>
                  <Button variant="outline" size="sm" onClick={() => void handleMarkLabel()}>
                    Marcar como impresa
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      <AssetFormModal open={editOpen} onOpenChange={setEditOpen} asset={asset} />
      <AssignAssetModal
        open={assignOpen}
        onOpenChange={setAssignOpen}
        asset={asset}
        mode={assignMode}
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
      <span className={`text-sm font-medium ${mono ? 'font-mono' : ''}`}>{value || '—'}</span>
    </div>
  );
}
