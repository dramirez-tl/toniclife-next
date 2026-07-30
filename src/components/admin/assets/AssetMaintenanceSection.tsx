'use client';

// AssetMaintenanceSection - Bitácora de mantenimientos E incidencias.
// Van en la misma tabla: una incidencia es un mantenimiento de tipo 'incident'.

import { useState } from 'react';
import { toast } from 'sonner';
import { Loader2, Plus, Trash2 } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { SearchableSelect } from '@/components/ui/SearchableSelect';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { confirmAction } from '@/lib/utils';
import { useAddMaintenance, useDeleteMaintenance } from '@/hooks/useAssets';
import { shortDate } from './AssignAssetModal';
import {
  MAINTENANCE_STATUSES,
  MAINTENANCE_STATUS_LABELS,
  MAINTENANCE_TYPES,
  MAINTENANCE_TYPE_LABELS,
  type AssetMaintenance,
  type MaintenanceStatus,
  type MaintenanceType,
} from '@/types/asset';

const TYPE_VARIANTS: Record<MaintenanceType, 'default' | 'warning' | 'destructive' | 'info'> = {
  preventive: 'info',
  corrective: 'warning',
  upgrade: 'default',
  inspection: 'info',
  incident: 'destructive',
  warranty_claim: 'warning',
};

export function AssetMaintenanceSection({
  assetId,
  maintenance,
}: {
  assetId: string;
  maintenance: AssetMaintenance[];
}) {
  const [open, setOpen] = useState(false);
  const [type, setType] = useState<MaintenanceType>('corrective');
  const [status, setStatus] = useState<MaintenanceStatus>('completed');
  const [description, setDescription] = useState('');
  const [performedAt, setPerformedAt] = useState('');
  const [nextDueDate, setNextDueDate] = useState('');
  const [providerName, setProviderName] = useState('');
  const [cost, setCost] = useState('');
  const [setAssetStatus, setSetAssetStatus] = useState('');

  const addMutation = useAddMaintenance();
  const deleteMutation = useDeleteMaintenance();

  const reset = () => {
    setType('corrective');
    setStatus('completed');
    setDescription('');
    setPerformedAt('');
    setNextDueDate('');
    setProviderName('');
    setCost('');
    setSetAssetStatus('');
  };

  const handleSubmit = async () => {
    if (!description.trim()) {
      toast.error('Describe qué se hizo o qué falló');
      return;
    }
    if (cost && !Number.isFinite(Number(cost))) {
      toast.error('El costo debe ser numérico');
      return;
    }
    try {
      await addMutation.mutateAsync({
        assetId,
        dto: {
          maintenanceType: type,
          status,
          description: description.trim(),
          performedAt: performedAt || null,
          nextDueDate: nextDueDate || null,
          providerName: providerName.trim() || null,
          cost: cost ? Number(cost) : null,
          setAssetStatus: setAssetStatus
            ? (setAssetStatus as 'in_repair' | 'in_warranty' | 'available' | 'assigned')
            : undefined,
        },
      });
      toast.success('Registro agregado');
      setOpen(false);
      reset();
    } catch (e) {
      const err = e as { response?: { data?: { message?: string | string[] } } };
      const msg = err?.response?.data?.message;
      toast.error(Array.isArray(msg) ? msg[0] : msg || 'No se pudo guardar el registro');
    }
  };

  const handleDelete = async (m: AssetMaintenance) => {
    const ok = await confirmAction('¿Borrar este registro de mantenimiento?');
    if (!ok) return;
    try {
      await deleteMutation.mutateAsync({ assetId, maintenanceId: m.id });
      toast.success('Registro eliminado');
    } catch {
      toast.error('No se pudo eliminar el registro');
    }
  };

  return (
    <Card>
      <CardContent className="space-y-4 p-6">
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Mantenimientos preventivos, correctivos, incidencias y garantías.
          </p>
          <Button size="sm" onClick={() => setOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Registrar
          </Button>
        </div>

        {maintenance.length === 0 ? (
          <p className="text-sm text-muted-foreground">Sin registros de mantenimiento.</p>
        ) : (
          <ul className="divide-y divide-border rounded-md border border-border">
            {maintenance.map((m) => (
              <li key={m.id} className="flex items-start justify-between gap-3 p-3">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant={TYPE_VARIANTS[m.maintenanceType]}>
                      {MAINTENANCE_TYPE_LABELS[m.maintenanceType]}
                    </Badge>
                    <Badge variant="outline">{MAINTENANCE_STATUS_LABELS[m.status]}</Badge>
                    <span className="text-xs text-muted-foreground">
                      {shortDate(m.performedAt ?? m.scheduledFor ?? m.createdAt)}
                    </span>
                  </div>
                  <p className="mt-1 whitespace-pre-wrap text-sm">{m.description}</p>
                  <p className="text-xs text-muted-foreground">
                    {[
                      m.providerName,
                      m.performedByName,
                      m.cost !== null ? `$${m.cost.toLocaleString('es-MX')}` : null,
                      m.nextDueDate ? `Próximo: ${shortDate(m.nextDueDate)}` : null,
                    ]
                      .filter(Boolean)
                      .join(' · ')}
                  </p>
                </div>
                <Button variant="ghost" size="sm" onClick={() => void handleDelete(m)}>
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </li>
            ))}
          </ul>
        )}
      </CardContent>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent
          className="max-h-[90vh] overflow-y-auto sm:max-w-lg"
          onInteractOutside={(e) => e.preventDefault()}
        >
          <DialogHeader>
            <DialogTitle>Registrar mantenimiento o incidencia</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="grid gap-2">
                <Label>Tipo</Label>
                <SearchableSelect
                  options={MAINTENANCE_TYPES.map((t) => ({
                    value: t,
                    label: MAINTENANCE_TYPE_LABELS[t],
                  }))}
                  value={type}
                  onChange={(v) => setType(v as MaintenanceType)}
                  showAllOption={false}
                />
              </div>
              <div className="grid gap-2">
                <Label>Estado</Label>
                <SearchableSelect
                  options={MAINTENANCE_STATUSES.map((s) => ({
                    value: s,
                    label: MAINTENANCE_STATUS_LABELS[s],
                  }))}
                  value={status}
                  onChange={(v) => setStatus(v as MaintenanceStatus)}
                  showAllOption={false}
                />
              </div>
            </div>
            <div className="grid gap-2">
              <Label>Descripción *</Label>
              <Textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
                placeholder="Se cambió el disco duro por un SSD de 480 GB"
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="grid gap-2">
                <Label>Fecha</Label>
                <Input
                  type="date"
                  value={performedAt}
                  onChange={(e) => setPerformedAt(e.target.value)}
                />
              </div>
              <div className="grid gap-2">
                <Label>Próximo mantenimiento</Label>
                <Input
                  type="date"
                  value={nextDueDate}
                  onChange={(e) => setNextDueDate(e.target.value)}
                />
              </div>
              <div className="grid gap-2">
                <Label>Proveedor</Label>
                <Input
                  value={providerName}
                  onChange={(e) => setProviderName(e.target.value)}
                />
              </div>
              <div className="grid gap-2">
                <Label>Costo</Label>
                <Input
                  type="number"
                  step="0.01"
                  min={0}
                  value={cost}
                  onChange={(e) => setCost(e.target.value)}
                />
              </div>
            </div>
            <div className="grid gap-2">
              <Label>Cambiar el estado del activo</Label>
              <SearchableSelect
                options={[
                  { value: 'in_repair', label: 'En reparación' },
                  { value: 'in_warranty', label: 'En garantía' },
                  { value: 'available', label: 'Disponible' },
                  { value: 'assigned', label: 'Asignado' },
                ]}
                value={setAssetStatus}
                onChange={setSetAssetStatus}
                allLabel="No cambiar"
                allValue=""
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={() => void handleSubmit()} disabled={addMutation.isPending}>
              {addMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Guardar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
