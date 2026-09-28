'use client';

// AssetComponentsSection - Componentes instalados en un equipo (los discos de
// un NVR, el cargador de una laptop): tabla con vida útil y garantía, alta de
// un componente nuevo ya ligado al equipo, vínculo de uno existente y
// desvinculación. Tabla en escritorio, tarjetas en celular (como el listado).
//
// Los datos vienen en `asset.children` (GET /it-assets/:id): solo hijos activos.

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { toast } from 'sonner';
import { Link2, Loader2, Plus, Unlink } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { DataTable, type DataTableColumn } from '@/components/ui/DataTable';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { confirmAction } from '@/lib/utils';
import {
  WARRANTY_STATUS_LABELS,
  WARRANTY_STATUS_VARIANTS,
  defaultComponentCategoryCode,
  isParentLinkError,
} from '@/lib/assets/warranty';
import { useSetAssetParent } from '@/hooks/useAssets';
import { AssetFormModal } from './AssetFormModal';
import { AssetParentSelect, type AssetParentOption } from './AssetParentSelect';
import { LifeBar, shortDate } from './AssignAssetModal';
import {
  ASSET_STATUS_LABELS,
  ASSET_STATUS_VARIANTS,
  type AssetComponent,
  type AssetDetail,
} from '@/types/asset';

/** Chip de garantía con la fecha; reutilizable en el panel. */
export function WarrantyBadge({
  status,
  until,
}: {
  status: AssetComponent['warrantyStatus'];
  until: string | null;
}) {
  return (
    <div className="flex flex-col gap-0.5">
      <Badge variant={WARRANTY_STATUS_VARIANTS[status]} className="w-fit">
        {WARRANTY_STATUS_LABELS[status]}
      </Badge>
      {until ? <span className="text-[11px] text-muted-foreground">{shortDate(until)}</span> : null}
    </div>
  );
}

function componentSubtitle(c: AssetComponent): string {
  const cap = c.specs.capacidad_tb;
  return [
    [c.brand, c.model].filter(Boolean).join(' '),
    cap !== undefined && cap !== null && cap !== '' ? `${cap} TB` : null,
    c.specs.bahia ? `Bahía ${c.specs.bahia}` : null,
  ]
    .filter(Boolean)
    .join(' · ');
}

export function AssetComponentsSection({ asset }: { asset: AssetDetail }) {
  const [formOpen, setFormOpen] = useState(false);
  const [linkOpen, setLinkOpen] = useState(false);
  const [selected, setSelected] = useState<AssetParentOption | null>(null);
  const [linkError, setLinkError] = useState<string | null>(null);
  const setParent = useSetAssetParent();

  const components = asset.children;

  // El propio equipo como "padre" del componente nuevo (estable entre renders).
  const asParent = useMemo<AssetParentOption>(
    () => ({
      id: asset.id,
      assetTag: asset.assetTag,
      name: asset.name,
      branchId: asset.branchId,
      locationId: asset.locationId,
      branchName: asset.branchName,
      categoryCode: asset.categoryCode,
    }),
    [
      asset.id,
      asset.assetTag,
      asset.name,
      asset.branchId,
      asset.locationId,
      asset.branchName,
      asset.categoryCode,
    ],
  );
  const suggestedCategory = defaultComponentCategoryCode(asset.categoryCode) ?? undefined;

  const handleUnlink = async (c: AssetComponent) => {
    const ok = await confirmAction(
      `¿Desvincular ${c.assetTag ?? c.name} de este equipo? Sigue en el inventario, solo deja de colgar de aquí.`,
    );
    if (!ok) return;
    try {
      await setParent.mutateAsync({ id: c.id, parentAssetId: null });
      toast.success('Componente desvinculado');
    } catch (e) {
      const err = e as { response?: { data?: { message?: string | string[] } } };
      const msg = err?.response?.data?.message;
      toast.error(Array.isArray(msg) ? msg[0] : msg || 'No se pudo desvincular');
    }
  };

  const closeLink = (next: boolean) => {
    setLinkOpen(next);
    if (!next) {
      setSelected(null);
      setLinkError(null);
    }
  };

  const handleLink = async () => {
    if (!selected) {
      toast.error('Elige el equipo que va instalado aquí');
      return;
    }
    setLinkError(null);
    try {
      await setParent.mutateAsync({ id: selected.id, parentAssetId: asset.id });
      toast.success(`${selected.assetTag ?? selected.name} ahora es componente de ${asset.assetTag ?? asset.name}`);
      closeLink(false);
    } catch (e) {
      const err = e as { response?: { data?: { message?: string | string[] } } };
      const msg = err?.response?.data?.message;
      const text = Array.isArray(msg) ? msg[0] : msg;
      if (isParentLinkError(text)) setLinkError(text ?? null);
      toast.error(text || 'No se pudo vincular el equipo');
    }
  };

  const columns: DataTableColumn<AssetComponent>[] = [
    {
      key: 'assetTag',
      header: 'Etiqueta',
      render: (c) => (
        <Link href={`/admin/activos/${c.id}`} className="text-sm font-semibold text-primary hover:underline">
          {c.assetTag ? (
            <span className="font-mono tracking-wider">{c.assetTag}</span>
          ) : (
            <span className="italic text-muted-foreground">Sin etiqueta</span>
          )}
        </Link>
      ),
    },
    {
      key: 'name',
      header: 'Componente',
      render: (c) => (
        <div className="min-w-0">
          <p className="truncate text-sm font-medium">{c.name}</p>
          <p className="truncate text-xs text-muted-foreground">{componentSubtitle(c) || '—'}</p>
        </div>
      ),
    },
    {
      key: 'category',
      header: 'Categoría',
      render: (c) => <span className="text-sm">{c.categoryName}</span>,
    },
    {
      key: 'serial',
      header: 'No. de serie',
      render: (c) => (
        <span className="font-mono text-xs text-muted-foreground">{c.serialNumber ?? '—'}</span>
      ),
    },
    {
      key: 'status',
      header: 'Estado',
      render: (c) => (
        <Badge variant={ASSET_STATUS_VARIANTS[c.status]}>{ASSET_STATUS_LABELS[c.status]}</Badge>
      ),
    },
    {
      key: 'life',
      header: 'Vida útil',
      render: (c) => <LifeBar pct={c.lifeRemainingPct} />,
    },
    {
      key: 'warranty',
      header: 'Garantía',
      render: (c) => <WarrantyBadge status={c.warrantyStatus} until={c.warrantyUntil} />,
    },
    {
      key: 'actions',
      header: 'Acciones',
      headerClassName: 'text-right',
      render: (c) => (
        <div className="flex items-center justify-end gap-1">
          <Button asChild variant="ghost" size="sm">
            <Link href={`/admin/activos/${c.id}`}>Abrir</Link>
          </Button>
          {asset.isActive ? (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => void handleUnlink(c)}
              disabled={setParent.isPending}
              aria-label={`Desvincular ${c.assetTag ?? c.name}`}
              title="Desvincular"
            >
              <Unlink className="h-4 w-4 text-destructive" />
            </Button>
          ) : null}
        </div>
      ),
    },
  ];

  return (
    <Card>
      <CardContent className="space-y-4 p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-muted-foreground">
            Equipos instalados dentro de este: discos de un NVR, cargador de una laptop…
          </p>
          {asset.isActive ? (
            <div className="flex w-full flex-wrap gap-2 sm:w-auto">
              <Button size="sm" onClick={() => setFormOpen(true)} className="h-11 flex-1 sm:h-9 sm:flex-none">
                <Plus className="mr-2 h-4 w-4" />
                Registrar componente
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setLinkOpen(true)}
                className="h-11 flex-1 sm:h-9 sm:flex-none"
              >
                <Link2 className="mr-2 h-4 w-4" />
                Vincular existente
              </Button>
            </div>
          ) : null}
        </div>

        {components.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Este equipo no tiene componentes registrados.
          </p>
        ) : (
          <>
            {/* Celular: tarjetas */}
            <div className="space-y-3 sm:hidden">
              {components.map((c) => (
                <Card key={c.id}>
                  <CardContent className="space-y-2 p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <Link href={`/admin/activos/${c.id}`} className="block truncate text-base font-medium text-primary">
                          {c.name}
                        </Link>
                        <p className="truncate text-sm text-muted-foreground">
                          {componentSubtitle(c) || c.categoryName}
                        </p>
                      </div>
                      <WarrantyBadge status={c.warrantyStatus} until={c.warrantyUntil} />
                    </div>
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                      {c.assetTag ? (
                        <span className="font-mono tracking-wider text-foreground">{c.assetTag}</span>
                      ) : (
                        <span className="italic">Sin etiqueta</span>
                      )}
                      {c.serialNumber ? <span className="font-mono">S/N {c.serialNumber}</span> : null}
                      <span>{c.categoryName}</span>
                    </div>
                    <div className="flex items-center justify-between gap-2">
                      <LifeBar pct={c.lifeRemainingPct} />
                      {asset.isActive ? (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => void handleUnlink(c)}
                          disabled={setParent.isPending}
                        >
                          <Unlink className="mr-1 h-4 w-4 text-destructive" />
                          Desvincular
                        </Button>
                      ) : null}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Escritorio: tabla */}
            <div className="hidden sm:block">
              <DataTable
                columns={columns}
                data={components}
                getRowKey={(c) => c.id}
                minWidthClassName="min-w-[900px]"
              />
            </div>
          </>
        )}

        <p className="text-xs text-muted-foreground">
          Al asignar o transferir este equipo marca &quot;Incluir los accesorios ligados&quot;
          para que los componentes se muevan con él.
        </p>
      </CardContent>

      {/* Alta de un componente nuevo, ya ligado a este equipo */}
      <AssetFormModal
        open={formOpen}
        onOpenChange={setFormOpen}
        defaultParent={asParent}
        defaultCategoryCode={suggestedCategory}
        onSaved={() => toast.success('Componente registrado')}
      />

      {/* Vincular un equipo que ya está en el inventario */}
      <Dialog open={linkOpen} onOpenChange={closeLink}>
        <DialogContent className="sm:max-w-lg" onInteractOutside={(e) => e.preventDefault()}>
          <DialogHeader>
            <DialogTitle>Vincular un equipo existente</DialogTitle>
            <DialogDescription>
              El equipo elegido pasa a ser componente de {asset.assetTag ?? asset.name}. Si no
              tenía sucursal, toma la de este equipo.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-2 py-2">
            <Label htmlFor="link-component">Equipo a vincular</Label>
            <AssetParentSelect
              id="link-component"
              value={selected}
              onChange={(opt) => {
                setSelected(opt);
                setLinkError(null);
              }}
              excludeId={asset.id}
              aria-describedby="link-component-hint"
              aria-invalid={!!linkError}
            />
            {linkError ? (
              <p id="link-component-hint" role="alert" className="text-xs text-destructive">
                {linkError}
              </p>
            ) : (
              <p id="link-component-hint" className="text-xs text-muted-foreground">
                Busca por etiqueta, nombre o número de serie.
              </p>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => closeLink(false)} disabled={setParent.isPending}>
              Cancelar
            </Button>
            <Button onClick={() => void handleLink()} disabled={!selected || setParent.isPending}>
              {setParent.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Vincular
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
