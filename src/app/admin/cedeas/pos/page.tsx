'use client';

// CEDEAS › Punto de venta (mig 183, 3-nov-2026). Solo sucursales CEDEA. El
// interruptor bloquea o libera el POS de la sucursal AL INSTANTE: el API
// rechaza cualquier venta nueva de esa sucursal y sus terminales muestran la
// leyenda de bloqueo en el siguiente latido (≤60 s). Pensado para las CEDEAS
// que no pagan: se les desactiva el almacén y se les bloquea la caja.

import { useMemo, useState } from 'react';
import { Loader2, Lock, LockOpen, RefreshCw, Store } from 'lucide-react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { Switch } from '@/components/ui/switch';
import { ConfirmDialog } from '@/components/admin/ConfirmDialog';
import { useCedeaPosStatus, useSetBranchPosBlock } from '@/hooks/useBranches';
import { apiErrorMessage } from '@/lib/branches/branch-cash-register';
import type { CedeaPosStatus } from '@/types/branch';

function fmtDate(iso: string | null | undefined): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleString('es-MX', { dateStyle: 'medium', timeStyle: 'short' });
}

export default function CedeasPosPage() {
  const { data, isLoading, isError, refetch, isFetching } = useCedeaPosStatus();
  const setBlock = useSetBranchPosBlock();
  const [search, setSearch] = useState('');
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [blockTarget, setBlockTarget] = useState<CedeaPosStatus | null>(null);
  const [reason, setReason] = useState('');

  const rows = useMemo(() => {
    const list = data ?? [];
    const q = search.trim().toLowerCase();
    const filtered = q
      ? list.filter((b) => b.name.toLowerCase().includes(q) || b.code.toLowerCase().includes(q))
      : list;
    // Bloqueadas primero, luego por nombre.
    return [...filtered].sort((a, b) => Number(b.posBlocked) - Number(a.posBlocked) || a.name.localeCompare(b.name));
  }, [data, search]);
  const blockedCount = (data ?? []).filter((b) => b.posBlocked).length;

  const apply = (branch: CedeaPosStatus, blocked: boolean, note?: string) => {
    setPendingId(branch.id);
    setBlock.mutate(
      { id: branch.id, blocked, reason: blocked ? note?.trim() || undefined : undefined },
      {
        onSuccess: () => {
          setBlockTarget(null);
          setReason('');
          toast.success(
            blocked
              ? `${branch.name}: punto de venta BLOQUEADO. Sus terminales dejan de vender ahora mismo.`
              : `${branch.name}: punto de venta liberado.`,
          );
        },
        onError: (err) => toast.error(apiErrorMessage(err, 'No se pudo cambiar el punto de venta'), { duration: 8000 }),
        onSettled: () => setPendingId(null),
      },
    );
  };

  const onToggle = (branch: CedeaPosStatus, released: boolean) => {
    if (released) {
      apply(branch, false);
      return;
    }
    setReason('');
    setBlockTarget(branch);
  };

  return (
    <div className="space-y-6 p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">CEDEAS · Punto de venta</h1>
          <p className="mt-1 max-w-3xl text-sm text-muted-foreground">
            Solo sucursales CEDEA. <strong>Bloquear</strong> apaga la venta en todas las terminales de la sucursal al instante (el servidor rechaza las ventas y la caja muestra la leyenda en menos de un minuto). <strong>Liberar</strong> la vuelve a activar. No afecta el candado global de Sistema ni la facturación.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="border-rose-300 bg-rose-50 text-rose-800">
            {blockedCount} bloqueada{blockedCount === 1 ? '' : 's'}
          </Badge>
          <Badge variant="outline">{(data ?? []).length} CEDEAS</Badge>
          <Button variant="outline" size="sm" onClick={() => void refetch()} disabled={isFetching}>
            <RefreshCw className={isFetching ? 'mr-1 h-4 w-4 animate-spin' : 'mr-1 h-4 w-4'} aria-hidden />
            Actualizar
          </Button>
        </div>
      </div>

      <Card>
        <CardContent className="p-4">
          <Label htmlFor="cedeas-pos-search" className="text-xs text-muted-foreground">Buscar</Label>
          <Input
            id="cedeas-pos-search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Nombre o código de la CEDEA"
            className="mt-1 max-w-md"
          />
        </CardContent>
      </Card>

      {isLoading && (
        <Card>
          <CardContent className="space-y-3 p-6">
            <Skeleton className="h-6 w-1/2" />
            <Skeleton className="h-6 w-2/3" />
            <Skeleton className="h-6 w-1/3" />
          </CardContent>
        </Card>
      )}
      {isError && (
        <Card>
          <CardContent className="p-6 text-sm text-rose-700">
            No se pudo cargar la lista. Si acabas de recibir el permiso, cierra sesión y vuelve a entrar; si persiste, falta aplicar la migración 183 en la base.
          </CardContent>
        </Card>
      )}

      {!isLoading && !isError && (
        <Card>
          <CardContent className="divide-y p-0">
            {rows.length === 0 && (
              <p className="p-6 text-sm text-muted-foreground">No hay sucursales CEDEA que coincidan.</p>
            )}
            {rows.map((b) => {
              const busy = pendingId === b.id || setBlock.isPending && pendingId === b.id;
              return (
                <div key={b.id} className="flex flex-wrap items-center justify-between gap-4 px-6 py-4">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <Store className="h-4 w-4 text-muted-foreground" aria-hidden />
                      <span className="font-medium text-foreground">{b.name}</span>
                      <span className="font-mono text-xs text-muted-foreground">{b.code}</span>
                      {b.isActive ? (
                        <Badge variant="outline" className="border-emerald-300 bg-emerald-50 text-emerald-800">Activa</Badge>
                      ) : (
                        <Badge variant="outline" className="border-gray-300 bg-gray-50 text-gray-700">Inactiva</Badge>
                      )}
                      {b.posBlocked ? (
                        <Badge variant="outline" className="border-rose-300 bg-rose-50 text-rose-800">
                          <Lock className="mr-1 h-3 w-3" aria-hidden /> POS bloqueado
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="border-emerald-300 bg-emerald-50 text-emerald-800">
                          <LockOpen className="mr-1 h-3 w-3" aria-hidden /> Liberado
                        </Badge>
                      )}
                      {!b.isPosEnabled && (
                        <Badge variant="outline" className="border-amber-300 bg-amber-50 text-amber-800">Sin POS habilitado</Badge>
                      )}
                    </div>
                    {b.posBlocked && (
                      <p className="mt-1 text-xs text-rose-700">
                        Bloqueado el {fmtDate(b.posBlockedAt)}{b.posBlockedBy ? ` por ${b.posBlockedBy}` : ''}
                        {b.posBlockedReason ? ` · Motivo: ${b.posBlockedReason}` : ''}
                      </p>
                    )}
                    <p className="mt-1 text-xs text-muted-foreground">
                      {b.terminals.length === 0
                        ? 'Sin terminales instaladas.'
                        : b.terminals
                            .map((t) => `${t.label ?? t.licenseKey} · ${t.status === 'active' ? 'visto ' + fmtDate(t.lastSeenAt) : t.status}`)
                            .join('  |  ')}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className={b.posBlocked ? 'text-sm font-medium text-rose-700' : 'text-sm font-medium text-emerald-700'}>
                      {b.posBlocked ? 'Bloqueado' : 'Liberado'}
                    </span>
                    {busy ? (
                      <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" aria-hidden />
                    ) : (
                      <Switch
                        checked={!b.posBlocked}
                        onCheckedChange={(v) => onToggle(b, v)}
                        aria-label={b.posBlocked ? `Liberar el punto de venta de ${b.name}` : `Bloquear el punto de venta de ${b.name}`}
                      />
                    )}
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>
      )}

      {blockTarget && (
        <ConfirmDialog
          open={!!blockTarget}
          onOpenChange={(open) => {
            if (!open) setBlockTarget(null);
          }}
          title={`Bloquear el punto de venta de ${blockTarget.name}`}
          description="Sus terminales dejan de vender en este momento: el servidor rechaza cualquier venta nueva y la caja muestra la leyenda de bloqueo en menos de un minuto. Las ventas ya cobradas no se tocan."
          confirmLabel="Bloquear ahora"
          destructive
          isPending={pendingId === blockTarget.id}
          onConfirm={() => apply(blockTarget, true, reason)}
        >
          <Label htmlFor="cedeas-pos-reason" className="text-sm">Motivo (lo verá la caja)</Label>
          <Input
            id="cedeas-pos-reason"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Ej. Adeudo del periodo de octubre"
            maxLength={300}
            className="mt-1"
          />
        </ConfirmDialog>
      )}
    </div>
  );
}
