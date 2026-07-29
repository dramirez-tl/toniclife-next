'use client';

// Ubicaciones físicas de los activos dentro de cada sucursal.
// Jerárquicas: "Corporativo › Piso 2 › Sistemas".

import { Suspense, useState } from 'react';
import { toast } from 'sonner';
import { MapPinIcon, PlusIcon, PencilSquareIcon, TrashIcon } from '@heroicons/react/24/outline';
import { Loader2 } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Textarea } from '@/components/ui/textarea';
import { Skeleton } from '@/components/ui/skeleton';
import { SearchableSelect } from '@/components/ui/SearchableSelect';
import { DataTable, type DataTableColumn } from '@/components/ui/DataTable';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { confirmAction } from '@/lib/utils';
import { useQueryFilters } from '@/hooks/useQueryFilters';
import {
  useAssetLocations,
  useCreateAssetLocation,
  useDeleteAssetLocation,
  useUpdateAssetLocation,
} from '@/hooks/useAssets';
import { useBranches } from '@/hooks/useBranches';
import type { AssetLocation } from '@/types/asset';

export default function UbicacionesPage() {
  return (
    <Suspense fallback={<Skeleton className="m-8 h-96" />}>
      <UbicacionesContent />
    </Suspense>
  );
}

interface FormState {
  branchId: string;
  name: string;
  code: string;
  parentId: string;
  description: string;
  isActive: boolean;
}

const EMPTY: FormState = {
  branchId: '',
  name: '',
  code: '',
  parentId: '',
  description: '',
  isActive: true,
};

function UbicacionesContent() {
  const { get, setParams } = useQueryFilters({ branch: 'all' });
  const branchFilter = get('branch');

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<AssetLocation | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY);

  const { data: branchesData } = useBranches({ limit: 200, isActive: true });
  const branches = branchesData?.data ?? [];

  const { data: locations = [], isLoading } = useAssetLocations({
    includeInactive: 'true',
    branchId: branchFilter !== 'all' ? branchFilter : undefined,
  });
  const { data: parentOptions = [] } = useAssetLocations(
    form.branchId ? { branchId: form.branchId } : {},
  );

  const createMutation = useCreateAssetLocation();
  const updateMutation = useUpdateAssetLocation();
  const deleteMutation = useDeleteAssetLocation();
  const isSaving = createMutation.isPending || updateMutation.isPending;

  const set = (patch: Partial<FormState>) => setForm((prev) => ({ ...prev, ...patch }));

  const openNew = () => {
    setEditing(null);
    setForm({ ...EMPTY, branchId: branchFilter !== 'all' ? branchFilter : '' });
    setModalOpen(true);
  };

  const openEdit = (l: AssetLocation) => {
    setEditing(l);
    setForm({
      branchId: l.branchId,
      name: l.name,
      code: l.code ?? '',
      parentId: l.parentId ?? '',
      description: l.description ?? '',
      isActive: l.isActive,
    });
    setModalOpen(true);
  };

  const handleSubmit = async () => {
    if (!form.branchId) {
      toast.error('Selecciona la sucursal');
      return;
    }
    if (!form.name.trim()) {
      toast.error('El nombre de la ubicación es obligatorio');
      return;
    }
    const payload = {
      branchId: form.branchId,
      name: form.name.trim(),
      code: form.code.trim().toUpperCase() || null,
      parentId: form.parentId || null,
      description: form.description.trim() || null,
      isActive: form.isActive,
    };
    try {
      if (editing) {
        await updateMutation.mutateAsync({ id: editing.id, dto: payload });
        toast.success('Ubicación actualizada');
      } else {
        await createMutation.mutateAsync(payload);
        toast.success('Ubicación creada');
      }
      setModalOpen(false);
    } catch (e) {
      const err = e as { response?: { data?: { message?: string | string[] } } };
      const msg = err?.response?.data?.message;
      toast.error(Array.isArray(msg) ? msg[0] : msg || 'Error al guardar la ubicación');
    }
  };

  const handleDelete = async (l: AssetLocation) => {
    const ok = await confirmAction(`¿Eliminar la ubicación "${l.name}"?`);
    if (!ok) return;
    try {
      const result = await deleteMutation.mutateAsync(l.id);
      toast.success(result.message);
    } catch (e) {
      const err = e as { response?: { data?: { message?: string } } };
      toast.error(err?.response?.data?.message || 'No se pudo eliminar');
    }
  };

  const columns: DataTableColumn<AssetLocation>[] = [
    {
      key: 'name',
      header: 'Ubicación',
      sortable: true,
      sortValue: (l) => l.fullName,
      render: (l) => (
        <div>
          <p className="text-sm font-medium">{l.fullName}</p>
          {l.code ? <p className="font-mono text-xs text-muted-foreground">{l.code}</p> : null}
        </div>
      ),
    },
    {
      key: 'branch',
      header: 'Sucursal',
      sortable: true,
      sortValue: (l) => l.branchName ?? '',
      render: (l) => <span className="text-sm">{l.branchName ?? '—'}</span>,
    },
    {
      key: 'assets',
      header: 'Equipos',
      sortable: true,
      sortValue: (l) => l.assetCount,
      render: (l) => <span className="text-sm tabular-nums">{l.assetCount}</span>,
    },
    {
      key: 'status',
      header: 'Estado',
      render: (l) =>
        l.isActive ? (
          <Badge variant="success">Activa</Badge>
        ) : (
          <Badge variant="secondary">Inactiva</Badge>
        ),
    },
    {
      key: 'actions',
      header: 'Acciones',
      headerClassName: 'text-right',
      render: (l) => (
        <div className="flex items-center justify-end gap-1">
          <Button variant="ghost" size="sm" onClick={() => openEdit(l)}>
            <PencilSquareIcon className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="sm" onClick={() => void handleDelete(l)}>
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
            <MapPinIcon className="h-9 w-9" />
            <h1 className="text-3xl font-bold sm:text-4xl">Ubicaciones</h1>
          </div>
          <p className="text-base text-white/80 sm:text-lg">
            Dónde está físicamente cada equipo dentro de la sucursal
          </p>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <Card>
          <CardContent className="space-y-4 p-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="text-lg font-semibold">{locations.length} ubicaciones</h2>
              <div className="flex flex-wrap items-center gap-2">
                <SearchableSelect
                  options={branches.map((b) => ({ value: b.id, label: b.name }))}
                  value={branchFilter}
                  onChange={(v) => setParams({ branch: v })}
                  allLabel="Todas las sucursales"
                  allValue="all"
                  className="w-56"
                />
                <Button onClick={openNew}>
                  <PlusIcon className="mr-2 h-4 w-4" />
                  Nueva ubicación
                </Button>
              </div>
            </div>
            <DataTable
              columns={columns}
              data={locations}
              isLoading={isLoading}
              getRowKey={(l) => l.id}
              minWidthClassName="min-w-[700px]"
              emptyMessage="No hay ubicaciones registradas."
            />
          </CardContent>
        </Card>
      </div>

      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{editing ? 'Editar ubicación' : 'Nueva ubicación'}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="grid gap-2">
              <Label>Sucursal *</Label>
              <SearchableSelect
                options={branches.map((b) => ({ value: b.id, label: `${b.name} (${b.code})` }))}
                value={form.branchId}
                onChange={(v) => set({ branchId: v, parentId: '' })}
                placeholder="Busca la sucursal"
                showAllOption={false}
              />
            </div>
            <div className="grid gap-2">
              <Label>Nombre *</Label>
              <Input
                value={form.name}
                onChange={(e) => set({ name: e.target.value })}
                placeholder="Piso 2 - Sistemas"
                maxLength={120}
              />
            </div>
            <div className="grid gap-2">
              <Label>Código (opcional)</Label>
              <Input
                value={form.code}
                onChange={(e) => set({ code: e.target.value.toUpperCase() })}
                className="font-mono uppercase"
                maxLength={40}
                placeholder="P2-SIS"
              />
            </div>
            <div className="grid gap-2">
              <Label>Ubicación padre</Label>
              <SearchableSelect
                options={parentOptions
                  .filter((p) => p.id !== editing?.id)
                  .map((p) => ({ value: p.id, label: p.fullName }))}
                value={form.parentId}
                onChange={(v) => set({ parentId: v })}
                allLabel="Sin padre"
                allValue=""
                disabled={!form.branchId}
              />
            </div>
            <div className="grid gap-2">
              <Label>Descripción</Label>
              <Textarea
                value={form.description}
                onChange={(e) => set({ description: e.target.value })}
                rows={2}
              />
            </div>
            <div className="flex items-center gap-2">
              <Checkbox
                id="loc-active"
                checked={form.isActive}
                onCheckedChange={(c) => set({ isActive: c === true })}
              />
              <Label htmlFor="loc-active">Activa</Label>
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
    </div>
  );
}
