'use client';

// SupplyMovementModal - Registra un movimiento de un INSUMO de TI.
//
// Cuatro tipos, cada uno con sus campos:
//   Entrada  → cantidad, costo unitario, factura.
//   Consumo  → cantidad, en qué equipo se usó, a quién se entregó, dónde.
//   Desecho  → cantidad y motivo (agotado, dañado, caducado, perdido, otro).
//   Ajuste   → la cantidad CONTADA físicamente; el API calcula la diferencia.
//
// La existencia nunca se edita a mano: cada cambio deja un renglón en la
// bitácora y el API mantiene los contadores en la misma transacción.
//
// Los colaboradores se cargan de /hr/employees, NO de /users (221 mil filas).

import { useEffect, useMemo, useState } from 'react';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Loader2, X } from 'lucide-react';
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
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { SearchableSelect } from '@/components/ui/SearchableSelect';
import { groupByRoot } from '@/lib/asset-select-options';
import { assetsService } from '@/services/assets.service';
import { assetKeys, useAssetLocations, useAssetPurchases } from '@/hooks/useAssets';
import { useAddSupplyMovement } from '@/hooks/useSupplies';
import { useBranches } from '@/hooks/useBranches';
import { useEmployees } from '@/hooks/useHR';
import type { Asset } from '@/types/asset';
import {
  ADJUST_REASONS,
  ADJUST_REASON_LABELS,
  DISCARD_REASONS,
  DISCARD_REASON_LABELS,
  MOVEMENT_TYPES,
  MOVEMENT_TYPE_LABELS,
  type CreateSupplyMovementDto,
  type Supply,
  type SupplyDetail,
  type SupplyMovementReason,
  type SupplyMovementType,
} from '@/types/supply';

interface SupplyMovementModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  supply: Supply | null;
  /** Tipo con el que abre (los botones rápidos del listado lo preseleccionan). */
  initialType?: SupplyMovementType;
  onDone?: (supply: SupplyDetail) => void;
}

const SUBMIT_LABELS: Record<SupplyMovementType, string> = {
  entrada: 'Registrar entrada',
  consumo: 'Registrar consumo',
  desecho: 'Registrar desecho',
  ajuste: 'Aplicar ajuste',
};

/** Equipo elegido para un consumo: lo mínimo para pintar el chip. */
interface PickedAsset {
  id: string;
  assetTag: string | null;
  name: string;
}

export function SupplyMovementModal({
  open,
  onOpenChange,
  supply,
  initialType = 'entrada',
  onDone,
}: SupplyMovementModalProps) {
  const [type, setType] = useState<SupplyMovementType>(initialType);
  const [quantity, setQuantity] = useState('');
  const [countedQty, setCountedQty] = useState('');
  const [unitCost, setUnitCost] = useState('');
  const [purchaseId, setPurchaseId] = useState('');
  const [asset, setAsset] = useState<PickedAsset | null>(null);
  const [assetSearch, setAssetSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [userId, setUserId] = useState('');
  const [branchId, setBranchId] = useState('');
  const [locationId, setLocationId] = useState('');
  const [reason, setReason] = useState<SupplyMovementReason | ''>('');
  const [movedAt, setMovedAt] = useState('');
  const [notes, setNotes] = useState('');

  const { data: employeesData } = useEmployees({ limit: 200, status: 'ACTIVE' });
  const { data: branchesData } = useBranches({ limit: 200, isActive: true });
  const { data: locations = [] } = useAssetLocations({});
  const { data: purchasesData } = useAssetPurchases({ limit: 100 });

  const addMovement = useAddSupplyMovement();

  // Memorizado: el arreglo alimenta un useMemo y un `?? []` suelto crea uno
  // nuevo en cada render.
  const employees = useMemo(() => employeesData?.data ?? [], [employeesData]);
  const branches = branchesData?.data ?? [];
  const purchases = purchasesData?.data ?? [];

  // Búsqueda de equipos en el servidor (por etiqueta, serie o nombre) con un
  // pequeño retraso para no pegarle al API en cada tecla.
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(assetSearch.trim()), 300);
    return () => clearTimeout(t);
  }, [assetSearch]);

  const assetParams = { search: debouncedSearch || undefined, limit: 20 };
  const { data: assetResults, isFetching: searchingAssets } = useQuery({
    queryKey: assetKeys.list(assetParams),
    queryFn: () => assetsService.getAssets(assetParams),
    enabled: open && type === 'consumo' && debouncedSearch.length >= 2,
    placeholderData: keepPreviousData,
  });
  const candidates: Asset[] = debouncedSearch.length >= 2 ? (assetResults?.data ?? []) : [];

  // Al abrir: tipo preseleccionado y la ubicación del propio insumo como base.
  //
  // Las dependencias son campos sueltos, NO el objeto `supply`: React Query
  // entrega un objeto nuevo en cada refetch (al volver a la pestaña, por
  // ejemplo) y con el objeto en la lista se borraba lo ya capturado.
  useEffect(() => {
    if (!open) return;
    setType(initialType);
    setQuantity('');
    setCountedQty('');
    setUnitCost('');
    setPurchaseId('');
    setAsset(null);
    setAssetSearch('');
    setDebouncedSearch('');
    setUserId('');
    setBranchId(supply?.branchId ?? '');
    setLocationId(supply?.locationId ?? '');
    setReason(initialType === 'ajuste' ? 'conteo' : '');
    setMovedAt('');
    setNotes('');
  }, [open, initialType, supply?.id, supply?.branchId, supply?.locationId]);

  const handleTypeChange = (next: SupplyMovementType) => {
    setType(next);
    // El motivo depende del tipo: no arrastrar "agotado" a un ajuste.
    setReason(next === 'ajuste' ? 'conteo' : '');
  };

  const locationOptions = useMemo(() => {
    const applicable = branchId
      ? locations.filter((l) => l.branchId === branchId)
      : locations.filter((l) => l.isOffsite);
    return groupByRoot(applicable, (root) => root.name);
  }, [locations, branchId]);

  const employeeOptions = useMemo(
    () =>
      employees
        .filter((e) => !!e.userId)
        .map((e) => ({
          value: e.userId,
          label: `${e.firstName} ${e.lastName}${e.secondLastName ? ` ${e.secondLastName}` : ''}`,
          hint: e.employeeNumber,
        })),
    [employees],
  );

  const reasonOptions = useMemo(
    () =>
      type === 'desecho'
        ? DISCARD_REASONS.map((r) => ({ value: r, label: DISCARD_REASON_LABELS[r] }))
        : type === 'ajuste'
          ? ADJUST_REASONS.map((r) => ({ value: r, label: ADJUST_REASON_LABELS[r] }))
          : [],
    [type],
  );

  // ---------- Vista previa de la existencia resultante ----------
  const stock = supply?.stockQty ?? 0;
  const unit = supply?.unit || 'pieza';
  const qty = Number(quantity);
  const counted = countedQty === '' ? null : Number(countedQty);
  const resulting =
    type === 'entrada'
      ? stock + (Number.isFinite(qty) ? qty : 0)
      : type === 'ajuste'
        ? (counted ?? stock)
        : stock - (Number.isFinite(qty) ? qty : 0);
  const delta = type === 'ajuste' && counted !== null ? counted - stock : null;

  const handleSubmit = async () => {
    if (!supply) return;

    const isMagnitude = type !== 'ajuste';
    if (isMagnitude && (!Number.isInteger(qty) || qty <= 0)) {
      toast.error('La cantidad debe ser un entero mayor que cero');
      return;
    }
    if ((type === 'consumo' || type === 'desecho') && qty > stock) {
      toast.error(`Existencia insuficiente (disponibles: ${stock})`);
      return;
    }
    if (
      type === 'entrada' &&
      unitCost &&
      (!Number.isFinite(Number(unitCost)) || Number(unitCost) < 0)
    ) {
      toast.error('El costo unitario debe ser numérico');
      return;
    }
    if (type === 'desecho' && !reason) {
      toast.error('Indica el motivo del desecho');
      return;
    }
    if (type === 'ajuste') {
      if (counted === null || !Number.isInteger(counted) || counted < 0) {
        toast.error('La cantidad contada debe ser un entero mayor o igual a cero');
        return;
      }
      if (counted === stock) {
        toast.error(
          'La cantidad contada es igual a la existencia actual: no hay nada que ajustar',
        );
        return;
      }
      if (!reason) {
        toast.error('Indica el motivo del ajuste');
        return;
      }
    }

    const common = {
      reason: reason || null,
      notes: notes.trim() || null,
      // datetime-local viene en hora local; se manda en ISO para no perder la zona.
      movedAt: movedAt ? new Date(movedAt).toISOString() : null,
    };

    let dto: CreateSupplyMovementDto;
    switch (type) {
      case 'entrada':
        dto = {
          movementType: type,
          quantity: qty,
          unitCost: unitCost ? Number(unitCost) : null,
          purchaseId: purchaseId || null,
          ...common,
        };
        break;
      case 'consumo':
        dto = {
          movementType: type,
          quantity: qty,
          assetId: asset?.id ?? null,
          userId: userId || null,
          branchId: branchId || null,
          locationId: locationId || null,
          ...common,
        };
        break;
      case 'desecho':
        dto = { movementType: type, quantity: qty, ...common };
        break;
      default:
        dto = { movementType: type, countedQty: counted as number, ...common };
    }

    try {
      const saved = await addMovement.mutateAsync({ id: supply.id, dto });
      toast.success(
        `${MOVEMENT_TYPE_LABELS[type]} registrado: ${saved.stockQty} ${saved.unit} en existencia`,
      );
      onOpenChange(false);
      onDone?.(saved);
    } catch (e) {
      const err = e as { response?: { data?: { message?: string | string[] } } };
      const msg = err?.response?.data?.message;
      toast.error(Array.isArray(msg) ? msg[0] : msg || 'No se pudo registrar el movimiento');
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="max-h-[90vh] overflow-y-auto sm:max-w-lg"
        onInteractOutside={(e) => e.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle>Movimiento de insumo</DialogTitle>
          <DialogDescription>
            {supply ? (
              <>
                {supply.supplyTag ? (
                  <span className="font-mono tracking-wider">{supply.supplyTag} · </span>
                ) : null}
                {supply.name} — existencia actual: {stock} {unit}
              </>
            ) : (
              ''
            )}
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-2">
          <Tabs value={type} onValueChange={(v) => handleTypeChange(v as SupplyMovementType)}>
            <TabsList className="grid w-full grid-cols-4">
              {MOVEMENT_TYPES.map((t) => (
                <TabsTrigger key={t} value={t}>
                  {MOVEMENT_TYPE_LABELS[t]}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>

          {type !== 'ajuste' ? (
            <div className="grid gap-2">
              <Label>Cantidad ({unit}) *</Label>
              <Input
                type="number"
                min={1}
                step={1}
                inputMode="numeric"
                className="h-12 text-base sm:h-10 sm:text-sm"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                autoFocus
              />
            </div>
          ) : (
            <div className="grid gap-2">
              <Label>Cantidad contada ({unit}) *</Label>
              <Input
                type="number"
                min={0}
                step={1}
                inputMode="numeric"
                className="h-12 text-base sm:h-10 sm:text-sm"
                value={countedQty}
                onChange={(e) => setCountedQty(e.target.value)}
                placeholder={String(stock)}
                autoFocus
              />
              <p className="text-xs text-muted-foreground">
                Lo que hay físicamente. El sistema calcula la diferencia contra la existencia
                registrada.
              </p>
            </div>
          )}

          {/* Vista previa */}
          <div className="rounded-md border border-border bg-muted/30 px-3 py-2 text-sm">
            <span className="text-muted-foreground">Existencia: </span>
            <span className="tabular-nums">{stock}</span>
            <span className="text-muted-foreground"> → </span>
            <span
              className={`font-semibold tabular-nums ${resulting < 0 ? 'text-destructive' : ''}`}
            >
              {resulting}
            </span>{' '}
            <span className="text-muted-foreground">{unit}</span>
            {delta !== null && delta !== 0 ? (
              <span
                className={`ml-2 text-xs ${delta > 0 ? 'text-emerald-600' : 'text-destructive'}`}
              >
                ({delta > 0 ? '+' : ''}
                {delta})
              </span>
            ) : null}
            {supply && resulting >= 0 && resulting <= supply.minStock ? (
              <span className="ml-2 text-xs text-amber-600">
                {resulting === 0 ? 'Quedará agotado' : 'Quedará bajo mínimo'}
              </span>
            ) : null}
          </div>

          {/* ---------- Entrada ---------- */}
          {type === 'entrada' && (
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="grid gap-2">
                <Label>Costo unitario</Label>
                <Input
                  type="number"
                  min={0}
                  step="0.01"
                  value={unitCost}
                  onChange={(e) => setUnitCost(e.target.value)}
                  placeholder={
                    supply?.lastUnitCost !== null && supply?.lastUnitCost !== undefined
                      ? String(supply.lastUnitCost)
                      : ''
                  }
                />
              </div>
              <div className="grid gap-2">
                <Label>Factura de compra</Label>
                <SearchableSelect
                  options={purchases.map((p) => ({
                    value: p.id,
                    label: p.invoiceNumber ?? 'Sin folio',
                    hint: [p.supplierName ?? 'Sin proveedor', p.invoiceDate]
                      .filter(Boolean)
                      .join(' · '),
                  }))}
                  value={purchaseId}
                  onChange={setPurchaseId}
                  placeholder="Busca la factura"
                  allLabel="Sin factura"
                  allValue=""
                />
              </div>
            </div>
          )}

          {/* ---------- Consumo ---------- */}
          {type === 'consumo' && (
            <>
              <div className="grid gap-2">
                <Label>Equipo en el que se usó</Label>
                {asset ? (
                  <div className="flex items-center justify-between gap-2 rounded-md border border-border px-3 py-2 text-sm">
                    <span className="min-w-0 truncate">
                      {asset.assetTag ? (
                        <span className="font-mono font-medium">{asset.assetTag} · </span>
                      ) : null}
                      {asset.name}
                    </span>
                    <button
                      type="button"
                      onClick={() => setAsset(null)}
                      aria-label="Quitar el equipo"
                      className="shrink-0 text-muted-foreground hover:text-foreground"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                ) : (
                  <>
                    <div className="relative">
                      <Input
                        value={assetSearch}
                        onChange={(e) => setAssetSearch(e.target.value)}
                        placeholder="Busca por etiqueta, serie o nombre"
                      />
                      {searchingAssets ? (
                        <Loader2 className="absolute top-1/2 right-3 h-4 w-4 -translate-y-1/2 animate-spin text-muted-foreground" />
                      ) : null}
                    </div>
                    {debouncedSearch.length >= 2 ? (
                      <div className="max-h-40 space-y-1 overflow-y-auto rounded-md border border-border p-1">
                        {candidates.map((a) => (
                          <button
                            key={a.id}
                            type="button"
                            onClick={() =>
                              setAsset({ id: a.id, assetTag: a.assetTag, name: a.name })
                            }
                            className="flex w-full items-center gap-2 rounded p-1.5 text-left text-sm hover:bg-muted"
                          >
                            <span className="font-mono text-xs">{a.assetTag ?? '—'}</span>
                            <span className="truncate">{a.name}</span>
                          </button>
                        ))}
                        {candidates.length === 0 && !searchingAssets ? (
                          <p className="p-2 text-sm text-muted-foreground">
                            No hay equipos que coincidan.
                          </p>
                        ) : null}
                      </div>
                    ) : (
                      <p className="text-xs text-muted-foreground">
                        Opcional. Teclea al menos 2 caracteres para buscar.
                      </p>
                    )}
                  </>
                )}
              </div>

              <div className="grid gap-2">
                <Label>Entregado a</Label>
                <SearchableSelect
                  options={employeeOptions}
                  value={userId}
                  onChange={setUserId}
                  placeholder="Busca al colaborador"
                  allLabel="Sin colaborador"
                  allValue=""
                />
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="grid gap-2">
                  <Label>Sucursal</Label>
                  <SearchableSelect
                    options={branches.map((b) => ({
                      value: b.id,
                      label: `${b.name} (${b.code})`,
                    }))}
                    value={branchId}
                    onChange={(v) => {
                      setBranchId(v);
                      setLocationId('');
                    }}
                    allLabel="Sin sucursal"
                    allValue=""
                  />
                </div>
                <div className="grid gap-2">
                  <Label>Ubicación</Label>
                  <SearchableSelect
                    options={locationOptions}
                    value={locationId}
                    onChange={setLocationId}
                    allLabel="Sin ubicación"
                    allValue=""
                  />
                </div>
              </div>
            </>
          )}

          {/* ---------- Desecho / Ajuste ---------- */}
          {(type === 'desecho' || type === 'ajuste') && (
            <div className="grid gap-2">
              <Label>Motivo *</Label>
              <SearchableSelect
                options={reasonOptions}
                value={reason}
                onChange={(v) => setReason(v as SupplyMovementReason)}
                placeholder="Elige el motivo"
                showAllOption={false}
              />
            </div>
          )}

          <div className="grid gap-2">
            <Label>Fecha del movimiento</Label>
            <Input
              type="datetime-local"
              value={movedAt}
              onChange={(e) => setMovedAt(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">Vacío = ahora mismo.</p>
          </div>

          <div className="grid gap-2">
            <Label>Notas</Label>
            <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} />
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={addMovement.isPending}
          >
            Cancelar
          </Button>
          <Button
            onClick={() => void handleSubmit()}
            disabled={addMovement.isPending || !supply}
            variant={type === 'desecho' ? 'destructive' : 'default'}
          >
            {addMovement.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            {SUBMIT_LABELS[type]}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
