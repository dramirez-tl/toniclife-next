'use client';

// AssetMaintenanceSection - Bitácora de mantenimientos E incidencias.
// Van en la misma tabla: una incidencia es un mantenimiento de tipo 'incident'.
//
// "Revisión SMART" (discos duros): un registro de tipo 'inspection' que además
// actualiza horas_encendido / ultima_revision_smart en las características del
// activo (specUpdates). Solo aparece si la plantilla de la categoría tiene
// horas_encendido; no hay tipo de mantenimiento nuevo (la BD lo restringe).

import { useState } from 'react';
import { toast } from 'sonner';
import { Activity, Loader2, Plus, Trash2 } from 'lucide-react';
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
  type SpecFieldDef,
  type SpecValues,
} from '@/types/asset';

const TYPE_VARIANTS: Record<MaintenanceType, 'default' | 'warning' | 'destructive' | 'info'> = {
  preventive: 'info',
  corrective: 'warning',
  upgrade: 'default',
  inspection: 'info',
  incident: 'destructive',
  warranty_claim: 'warning',
};

/** Claves de la plantilla de discos que actualiza la revisión SMART. */
const SMART_HOURS_KEY = 'horas_encendido';
const SMART_DATE_KEY = 'ultima_revision_smart';
const SMART_PREFIX = 'Revisión SMART';

/** Hoy en hora LOCAL ('YYYY-MM-DD'); toISOString daría el día UTC por la noche. */
function todayYmd(): string {
  const d = new Date();
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

export function AssetMaintenanceSection({
  assetId,
  maintenance,
  specTemplate,
  specifications,
}: {
  assetId: string;
  maintenance: AssetMaintenance[];
  /** Plantilla de la categoría: si trae horas_encendido se ofrece "Revisión SMART". */
  specTemplate?: SpecFieldDef[];
  /** Características actuales (para precargar las horas de la última lectura). */
  specifications?: SpecValues;
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
  // Revisión SMART: horas encendido y fecha de la lectura
  const [smartMode, setSmartMode] = useState(false);
  const [smartHours, setSmartHours] = useState('');
  const [smartDate, setSmartDate] = useState('');

  const supportsSmart = specTemplate?.some((f) => f.key === SMART_HOURS_KEY) ?? false;

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
    setSmartMode(false);
    setSmartHours('');
    setSmartDate('');
  };

  /** Abre el diálogo ya armado como revisión SMART (tipo Revisión, hoy, terminado). */
  const openSmart = () => {
    reset();
    const today = todayYmd();
    setSmartMode(true);
    setType('inspection');
    setStatus('completed');
    setPerformedAt(today);
    setSmartDate(today);
    const current = specifications?.[SMART_HOURS_KEY];
    setSmartHours(current !== undefined && current !== null ? String(current) : '');
    setDescription(`${SMART_PREFIX}: `);
    setOpen(true);
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
    let specUpdates: SpecValues | undefined;
    let finalDescription = description.trim();
    if (smartMode) {
      const hours = Number(smartHours);
      if (!smartHours.trim() || !Number.isInteger(hours) || hours < 0) {
        toast.error('Captura las horas encendido que reporta SMART (entero, sin decimales)');
        return;
      }
      specUpdates = {
        [SMART_HOURS_KEY]: hours,
        [SMART_DATE_KEY]: smartDate || performedAt || todayYmd(),
      };
      // Las horas van también en el texto: la bitácora no guarda specUpdates.
      if (!/\d+\s*h\b/i.test(finalDescription)) {
        finalDescription = `${finalDescription} · ${hours.toLocaleString('es-MX')} h encendido`;
      }
    }
    try {
      await addMutation.mutateAsync({
        assetId,
        dto: {
          maintenanceType: type,
          status,
          description: finalDescription,
          performedAt: performedAt || null,
          nextDueDate: nextDueDate || null,
          providerName: providerName.trim() || null,
          cost: cost ? Number(cost) : null,
          setAssetStatus: setAssetStatus
            ? (setAssetStatus as 'in_repair' | 'in_warranty' | 'available' | 'assigned')
            : undefined,
          specUpdates,
        },
      });
      toast.success(smartMode ? 'Revisión SMART registrada y horas actualizadas' : 'Registro agregado');
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
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-sm text-muted-foreground">
            Mantenimientos preventivos, correctivos, incidencias y garantías.
          </p>
          <div className="flex flex-wrap gap-2">
            {supportsSmart ? (
              <Button size="sm" variant="outline" onClick={openSmart}>
                <Activity className="mr-2 h-4 w-4" />
                Revisión SMART
              </Button>
            ) : null}
            <Button
              size="sm"
              onClick={() => {
                reset();
                setOpen(true);
              }}
            >
              <Plus className="mr-2 h-4 w-4" />
              Registrar
            </Button>
          </div>
        </div>
        {supportsSmart ? (
          <p className="text-xs text-muted-foreground">
            Última lectura SMART:{' '}
            {specifications?.[SMART_HOURS_KEY] !== undefined && specifications?.[SMART_HOURS_KEY] !== null
              ? `${Number(specifications[SMART_HOURS_KEY]).toLocaleString('es-MX')} h encendido`
              : 'sin registrar'}
            {specifications?.[SMART_DATE_KEY]
              ? ` · ${shortDate(String(specifications[SMART_DATE_KEY]))}`
              : ''}
          </p>
        ) : null}

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
                    {m.description.startsWith(SMART_PREFIX) ? (
                      <Badge variant="outline">SMART</Badge>
                    ) : null}
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
            <DialogTitle>
              {smartMode ? 'Registrar revisión SMART' : 'Registrar mantenimiento o incidencia'}
            </DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            {smartMode ? (
              <div className="grid gap-4 rounded-md border border-border bg-muted/30 p-3 sm:grid-cols-2">
                <div className="grid gap-2">
                  <Label htmlFor="smart-hours">Horas encendido *</Label>
                  <Input
                    id="smart-hours"
                    type="number"
                    min={0}
                    step={1}
                    inputMode="numeric"
                    value={smartHours}
                    onChange={(e) => setSmartHours(e.target.value)}
                    placeholder="Power-On Hours que reporta SMART"
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="smart-date">Fecha de la lectura</Label>
                  <Input
                    id="smart-date"
                    type="date"
                    value={smartDate}
                    onChange={(e) => setSmartDate(e.target.value)}
                  />
                </div>
                <p className="text-xs text-muted-foreground sm:col-span-2">
                  Se actualizan las características del disco (horas encendido y última
                  revisión SMART) junto con este registro.
                </p>
              </div>
            ) : null}
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
            <Button
              variant="outline"
              onClick={() => {
                setOpen(false);
                reset();
              }}
            >
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
