'use client';

// AssignAssetModal - Asignar, transferir o devolver un activo.
//
// El destino puede ser un COLABORADOR, una SUCURSAL, un DEPARTAMENTO o una
// UBICACIÓN física: hay equipo (cámaras, DVRs, switches) que se asigna al sitio
// y no a una persona.
//
// Los colaboradores se cargan de /hr/employees, NO de /users: esa tabla tiene
// 221 mil filas (distribuidores y clientes) y colgaría el selector.

import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { SearchableSelect } from '@/components/ui/SearchableSelect';
import { groupByRoot } from '@/lib/asset-select-options';
import { useAssignAsset, useAssetLocations, useReturnAsset, useTransferAsset } from '@/hooks/useAssets';
import { useBranches } from '@/hooks/useBranches';
import { useDepartments, useEmployees } from '@/hooks/useHR';
import {
  ASSET_CONDITIONS,
  ASSET_CONDITION_LABELS,
  ASSIGNMENT_TYPES,
  ASSIGNMENT_TYPE_LABELS,
  type AssetCondition,
  type AssetDetail,
  type AssignmentType,
} from '@/types/asset';

export type AssignMode = 'assign' | 'transfer' | 'return';

interface AssignAssetModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  asset: AssetDetail | null;
  mode: AssignMode;
  onDone?: () => void;
}

const TITLES: Record<AssignMode, string> = {
  assign: 'Asignar activo',
  transfer: 'Transferir activo',
  return: 'Devolver activo',
};

export function AssignAssetModal({
  open,
  onOpenChange,
  asset,
  mode,
  onDone,
}: AssignAssetModalProps) {
  const [assignmentType, setAssignmentType] = useState<AssignmentType>('user');
  const [targetId, setTargetId] = useState('');
  const [conditionOut, setConditionOut] = useState<AssetCondition | ''>('');
  const [conditionIn, setConditionIn] = useState<AssetCondition | ''>('');
  const [locationId, setLocationId] = useState('');
  const [branchId, setBranchId] = useState('');
  const [includeChildren, setIncludeChildren] = useState(false);
  const [returnStatus, setReturnStatus] = useState('available');
  const [notes, setNotes] = useState('');

  const { data: employeesData } = useEmployees({ limit: 200, status: 'ACTIVE' });
  const { data: branchesData } = useBranches({ limit: 200, isActive: true });
  const { data: departments = [] } = useDepartments();
  const { data: locations = [] } = useAssetLocations(branchId ? { branchId } : {});

  const assignMutation = useAssignAsset();
  const transferMutation = useTransferAsset();
  const returnMutation = useReturnAsset();
  const isSaving =
    assignMutation.isPending || transferMutation.isPending || returnMutation.isPending;

  const employees = employeesData?.data ?? [];
  const branches = branchesData?.data ?? [];
  const hasChildren = (asset?.children?.length ?? 0) > 0;

  useEffect(() => {
    if (!open) return;
    setAssignmentType('user');
    setTargetId('');
    setConditionOut(asset?.condition ?? '');
    setConditionIn(asset?.condition ?? '');
    setLocationId(asset?.locationId ?? '');
    setBranchId(asset?.branchId ?? '');
    setIncludeChildren(false);
    setReturnStatus('available');
    setNotes('');
  }, [open, asset]);

  const targetOptions = useMemo(() => {
    switch (assignmentType) {
      // El nombre propio va en la primera línea y el contexto (número de
      // empleado, ruta de la ubicación) en la segunda: en un teléfono el
      // renglón completo se cortaba justo donde está el dato que desempata.
      case 'user':
        return employees
          .filter((e) => !!e.userId)
          .map((e) => ({
            value: e.userId,
            label: `${e.firstName} ${e.lastName}${e.secondLastName ? ` ${e.secondLastName}` : ''}`,
            hint: e.employeeNumber,
          }));
      case 'branch':
        return branches.map((b) => ({ value: b.id, label: b.name, hint: b.code }));
      case 'department':
        return departments.map((d) => ({ value: d.id, label: d.name }));
      case 'location':
        // Aquí la lista NO viene filtrada por sucursal, así que el encabezado
        // lleva la sucursal: dos sucursales pueden tener una "Bodega" cada una
        // y sin eso se mezclarían bajo el mismo título.
        return groupByRoot(locations, (root) =>
          root.branchName ? `${root.branchName} › ${root.name}` : root.name,
        );
      default:
        return [];
    }
  }, [assignmentType, employees, branches, departments, locations]);

  const handleSubmit = async () => {
    if (!asset) return;

    try {
      if (mode === 'return') {
        await returnMutation.mutateAsync({
          id: asset.id,
          dto: {
            conditionIn: conditionIn || null,
            status: returnStatus as 'available' | 'in_repair' | 'reserved' | 'retired',
            branchId: branchId || null,
            locationId: locationId || null,
            notes: notes.trim() || null,
          },
        });
        toast.success(`Activo ${asset.assetTag} devuelto`);
      } else {
        if (!targetId) {
          toast.error(`Selecciona ${ASSIGNMENT_TYPE_LABELS[assignmentType].toLowerCase()}`);
          return;
        }
        const dto = {
          assignmentType,
          assignedUserId: assignmentType === 'user' ? targetId : null,
          assignedBranchId: assignmentType === 'branch' ? targetId : null,
          assignedDepartmentId: assignmentType === 'department' ? targetId : null,
          assignedLocationId: assignmentType === 'location' ? targetId : null,
          locationId: locationId || null,
          conditionOut: conditionOut || null,
          includeChildren: includeChildren ? 'true' : undefined,
          notes: notes.trim() || null,
        };

        if (mode === 'transfer') {
          await transferMutation.mutateAsync({
            id: asset.id,
            dto: { ...dto, conditionIn: conditionIn || null },
          });
          toast.success(`Activo ${asset.assetTag} transferido`);
        } else {
          await assignMutation.mutateAsync({ id: asset.id, dto });
          toast.success(`Activo ${asset.assetTag} asignado`);
        }
      }
      onOpenChange(false);
      onDone?.();
    } catch (e) {
      const err = e as { response?: { data?: { message?: string | string[] } } };
      const msg = err?.response?.data?.message;
      toast.error(Array.isArray(msg) ? msg[0] : msg || 'No se pudo completar la operación');
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="max-h-[90vh] overflow-y-auto sm:max-w-lg"
        onInteractOutside={(e) => e.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle>{TITLES[mode]}</DialogTitle>
          <DialogDescription>
            {asset ? `${asset.assetTag} · ${asset.name}` : ''}
            {mode === 'transfer' && asset?.currentAssignment
              ? ` — hoy con ${asset.currentAssignment.assignedToName}`
              : ''}
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-2">
          {mode !== 'return' && (
            <>
              <div className="grid gap-2">
                <Label>Asignar a *</Label>
                <SearchableSelect
                  options={ASSIGNMENT_TYPES.map((t) => ({
                    value: t,
                    label: ASSIGNMENT_TYPE_LABELS[t],
                  }))}
                  value={assignmentType}
                  onChange={(v) => {
                    setAssignmentType(v as AssignmentType);
                    setTargetId('');
                  }}
                  showAllOption={false}
                />
              </div>

              <div className="grid gap-2">
                <Label>{ASSIGNMENT_TYPE_LABELS[assignmentType]} *</Label>
                <SearchableSelect
                  options={targetOptions}
                  value={targetId}
                  onChange={setTargetId}
                  placeholder={`Busca ${ASSIGNMENT_TYPE_LABELS[assignmentType].toLowerCase()}`}
                  showAllOption={false}
                />
                {assignmentType === 'location' && !locations.length ? (
                  <p className="text-xs text-muted-foreground">
                    No hay ubicaciones registradas. Créalas en Activos → Ubicaciones.
                  </p>
                ) : null}
              </div>

              <div className="grid gap-2">
                <Label>Condición con la que se entrega</Label>
                <SearchableSelect
                  options={ASSET_CONDITIONS.map((c) => ({
                    value: c,
                    label: ASSET_CONDITION_LABELS[c],
                  }))}
                  value={conditionOut}
                  onChange={(v) => setConditionOut(v as AssetCondition)}
                  allLabel="Sin especificar"
                  allValue=""
                />
              </div>

              {mode === 'transfer' && (
                <div className="grid gap-2">
                  <Label>Condición con la que se recibe del anterior</Label>
                  <SearchableSelect
                    options={ASSET_CONDITIONS.map((c) => ({
                      value: c,
                      label: ASSET_CONDITION_LABELS[c],
                    }))}
                    value={conditionIn}
                    onChange={(v) => setConditionIn(v as AssetCondition)}
                    allLabel="Sin especificar"
                    allValue=""
                  />
                </div>
              )}

              {hasChildren && (
                <div className="flex items-start gap-2 rounded-md border border-border p-3">
                  <Checkbox
                    id="include-children"
                    checked={includeChildren}
                    onCheckedChange={(c) => setIncludeChildren(c === true)}
                  />
                  <div>
                    <Label htmlFor="include-children">
                      Incluir los {asset?.children.length} accesorio(s) ligados
                    </Label>
                    <p className="text-xs text-muted-foreground">
                      {asset?.children.map((c) => c.assetTag).join(', ')}
                    </p>
                  </div>
                </div>
              )}
            </>
          )}

          {mode === 'return' && (
            <>
              <div className="grid gap-2">
                <Label>Condición con la que se recibe</Label>
                <SearchableSelect
                  options={ASSET_CONDITIONS.map((c) => ({
                    value: c,
                    label: ASSET_CONDITION_LABELS[c],
                  }))}
                  value={conditionIn}
                  onChange={(v) => setConditionIn(v as AssetCondition)}
                  allLabel="Sin especificar"
                  allValue=""
                />
              </div>
              <div className="grid gap-2">
                <Label>Estado en el que queda</Label>
                <SearchableSelect
                  options={[
                    { value: 'available', label: 'Disponible' },
                    { value: 'reserved', label: 'Apartado' },
                    { value: 'in_repair', label: 'En reparación' },
                    { value: 'retired', label: 'Dado de baja' },
                  ]}
                  value={returnStatus}
                  onChange={setReturnStatus}
                  showAllOption={false}
                />
              </div>
            </>
          )}

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="grid gap-2">
              <Label>Sucursal donde queda</Label>
              <SearchableSelect
                options={branches.map((b) => ({ value: b.id, label: `${b.name} (${b.code})` }))}
                value={branchId}
                onChange={(v) => {
                  setBranchId(v);
                  setLocationId('');
                }}
                allLabel="Sin cambio"
                allValue=""
              />
            </div>
            <div className="grid gap-2">
              <Label>Ubicación física</Label>
              <SearchableSelect
                options={locations.map((l) => ({ value: l.id, label: l.fullName }))}
                value={locationId}
                onChange={setLocationId}
                allLabel="Sin cambio"
                allValue=""
                disabled={!branchId}
              />
            </div>
          </div>

          <div className="grid gap-2">
            <Label>Notas</Label>
            <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSaving}>
            Cancelar
          </Button>
          <Button onClick={() => void handleSubmit()} disabled={isSaving}>
            {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            {TITLES[mode]}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/** Barra de vida útil reutilizable (listado y detalle). */
export function LifeBar({ pct }: { pct: number | null }) {
  if (pct === null || pct === undefined) {
    return <span className="text-xs text-muted-foreground">Sin datos</span>;
  }
  const color = pct <= 20 ? 'bg-red-500' : pct <= 50 ? 'bg-amber-500' : 'bg-emerald-500';
  return (
    <div className="flex items-center gap-2">
      <div className="h-2 w-16 overflow-hidden rounded-full bg-muted">
        <div className={`h-full ${color}`} style={{ width: `${Math.max(2, pct)}%` }} />
      </div>
      <span className="text-xs tabular-nums text-muted-foreground">{pct}%</span>
    </div>
  );
}

/** Fecha corta en español, tolerante a null.
 *  OJO: una fecha PURA ('2026-08-04') new Date la toma como medianoche UTC y
 *  el navegador en México la pinta el día ANTERIOR (04→03). Se construye en
 *  hora local; los timestamps completos sí se convierten normal. */
export function shortDate(value: string | null | undefined): string {
  if (!value) return '—';
  const soloFecha = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  const d = soloFecha
    ? new Date(Number(soloFecha[1]), Number(soloFecha[2]) - 1, Number(soloFecha[3]))
    : new Date(value);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' });
}

/** Input de fecha nativo: el repo no tiene DatePicker de shadcn. */
export function DateField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="grid gap-2">
      <Label>{label}</Label>
      <Input type="date" value={value} onChange={(e) => onChange(e.target.value)} />
    </div>
  );
}
