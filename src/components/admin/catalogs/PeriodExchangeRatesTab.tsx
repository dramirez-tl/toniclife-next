'use client';

// Tab "Tipos de Cambio" (catálogos): tasas X→MXN CONGELADAS POR PERIODO (26→25).
// El sistema las captura solo al abrir cada periodo (cron + proveedor FX) y no
// las vuelve a tocar; aquí el admin las consulta, las corrige a mano o fuerza
// una re-captura del proveedor mientras el periodo siga abierto.

import { useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { DataTable, type DataTableColumn } from '@/components/ui';
import { SearchableSelect } from '@/components/ui/SearchableSelect';
import { toast } from 'sonner';
import { ArrowPathIcon, PencilSquareIcon } from '@heroicons/react/24/outline';
import {
  usePeriods,
  usePeriodExchangeRates,
  useSetPeriodExchangeRate,
  useRefreshPeriodExchangeRates,
} from '@/hooks/useMlmPeriods';
import type { PeriodExchangeRate } from '@/types/mlm-periods';

const SOURCE_LABEL: Record<string, { label: string; variant: 'info' | 'warning' | 'secondary' }> = {
  auto: { label: 'Automática', variant: 'info' },
  manual: { label: 'Manual', variant: 'warning' },
  backfill: { label: 'Histórica', variant: 'secondary' },
};

function formatDate(iso?: string): string {
  if (!iso) return '-';
  return new Date(iso).toLocaleDateString('es-MX', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

export function PeriodExchangeRatesTab() {
  const { data: periods = [], isLoading: loadingPeriods } = usePeriods();
  const [selectedPeriodId, setSelectedPeriodId] = useState<string>('');

  // Default: periodo actual (o el más reciente si ninguno es actual).
  const effectivePeriodId = useMemo(() => {
    if (selectedPeriodId) return selectedPeriodId;
    const current = periods.find((p) => p.isCurrent);
    return current?.id ?? periods[0]?.id ?? '';
  }, [selectedPeriodId, periods]);

  const selectedPeriod = periods.find((p) => p.id === effectivePeriodId);

  const {
    data: fx,
    isLoading: loadingFx,
  } = usePeriodExchangeRates(effectivePeriodId, !!effectivePeriodId);

  const setRate = useSetPeriodExchangeRate();
  const refresh = useRefreshPeriodExchangeRates();

  // Modal de edición manual
  const [editing, setEditing] = useState<PeriodExchangeRate | null>(null);
  const [rateInput, setRateInput] = useState('');

  const openEdit = (row: PeriodExchangeRate) => {
    setEditing(row);
    setRateInput(row.rateToMxn ? Number(row.rateToMxn).toString() : '');
  };

  const handleSave = () => {
    const value = Number(rateInput);
    if (!editing || !Number.isFinite(value) || value <= 0) {
      toast.error('Captura una tasa válida mayor a 0');
      return;
    }
    setRate.mutate(
      {
        periodId: effectivePeriodId,
        currencyCode: editing.currencyCode,
        rateToMxn: value,
      },
      {
        onSuccess: () => {
          toast.success(`Tasa ${editing.currencyCode} → MXN actualizada`);
          setEditing(null);
        },
        onError: () => toast.error('Error al guardar la tasa'),
      }
    );
  };

  const handleRefresh = () => {
    refresh.mutate(effectivePeriodId, {
      onSuccess: (r) => {
        if (r.inserted === 0 && r.updated === 0) {
          toast.info('No había tasas automáticas que actualizar');
        } else {
          toast.success(
            `Tasas actualizadas: ${r.inserted} nuevas, ${r.updated} refrescadas`
          );
        }
        if (r.unavailable.length > 0) {
          toast.warning(`Sin tasa del proveedor: ${r.unavailable.join(', ')}`);
        }
      },
      onError: () => toast.error('El proveedor de tipo de cambio no respondió'),
    });
  };

  const periodOptions = useMemo(
    () =>
      periods.map((p) => ({
        value: p.id,
        label: `${p.name}${p.isCurrent ? ' · actual' : p.isClosed ? ' · cerrado' : ''}`,
      })),
    [periods]
  );

  const columns: DataTableColumn<PeriodExchangeRate & { id: string }>[] = [
    {
      key: 'pair',
      header: 'Par',
      render: (r) => (
        <span className="font-medium">
          {r.currencyCode} <span className="text-gray-400 mx-1">&rarr;</span> MXN
        </span>
      ),
    },
    { key: 'currencyName', header: 'Moneda', render: (r) => r.currencyName },
    {
      key: 'rateToMxn',
      header: 'Tasa (MXN por unidad)',
      render: (r) =>
        r.rateToMxn ? (
          <span className="font-mono">{Number(r.rateToMxn).toFixed(4)}</span>
        ) : (
          <Badge variant="destructive">Sin capturar</Badge>
        ),
    },
    {
      key: 'source',
      header: 'Fuente',
      render: (r) => {
        const s = r.source ? SOURCE_LABEL[r.source] : null;
        return s ? <Badge variant={s.variant}>{s.label}</Badge> : '-';
      },
    },
    {
      key: 'updatedAt',
      header: 'Capturada',
      render: (r) => formatDate(r.updatedAt ?? r.fetchedAt),
    },
    ...(!fx?.isClosed
      ? [
          {
            key: '__actions',
            header: 'Acciones',
            headerClassName: 'text-right',
            cellClassName: 'text-right',
            render: (r: PeriodExchangeRate & { id: string }) => (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => openEdit(r)}
                className="text-[#3E667D]"
              >
                <PencilSquareIcon className="h-4 w-4 mr-1" />
                Editar
              </Button>
            ),
          } satisfies DataTableColumn<PeriodExchangeRate & { id: string }>,
        ]
      : []),
  ];

  const rows = useMemo(
    () => (fx?.rates ?? []).map((r) => ({ ...r, id: r.currencyCode })),
    [fx]
  );

  return (
    <div className="space-y-4">
      {/* Toolbar: selector de periodo + refresh */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
        <div className="w-full sm:w-72">
          <SearchableSelect
            options={periodOptions}
            value={effectivePeriodId}
            onChange={(v: string) => setSelectedPeriodId(v)}
            placeholder="Selecciona periodo"
            showAllOption={false}
            disabled={loadingPeriods}
          />
        </div>
        {selectedPeriod && (
          <p className="text-sm text-muted-foreground">
            {formatDate(selectedPeriod.startDate)} &ndash;{' '}
            {formatDate(selectedPeriod.endDate)}
          </p>
        )}
        <div className="flex-1" />
        {!fx?.isClosed && (
          <Button
            variant="default"
            size="sm"
            onClick={handleRefresh}
            disabled={refresh.isPending || !effectivePeriodId}
          >
            <ArrowPathIcon
              className={`h-4 w-4 mr-1.5 ${refresh.isPending ? 'animate-spin' : ''}`}
            />
            Actualizar del proveedor
          </Button>
        )}
      </div>

      {/* Aviso: tasa congelada */}
      <p className="text-sm text-muted-foreground">
        La tasa se captura automáticamente al abrir cada periodo y queda{' '}
        <span className="font-medium text-foreground">congelada durante todo el periodo</span>
        {fx?.isClosed
          ? '. Este periodo está cerrado: sus tasas son historia y no se pueden modificar.'
          : '. Puedes corregirla manualmente o re-capturar del proveedor mientras el periodo siga abierto.'}
      </p>

      <Card className="p-0">
        <CardContent className="p-0">
          <DataTable<PeriodExchangeRate & { id: string }>
            columns={columns}
            data={rows}
            getRowKey={(r) => r.id}
            isLoading={loadingFx || loadingPeriods}
            emptyMessage="Sin monedas de países activos."
          />
        </CardContent>
      </Card>

      {/* Modal edición manual */}
      <Dialog open={!!editing} onOpenChange={(open) => !open && setEditing(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              Tasa {editing?.currencyCode} &rarr; MXN
            </DialogTitle>
            <DialogDescription>
              Pesos mexicanos por 1 {editing?.currencyName ?? ''} en el periodo{' '}
              {fx?.periodName}. Quedará marcada como manual y el sistema no la
              volverá a tocar.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-1.5">
            <Label htmlFor="fx-rate">Tasa (MXN por unidad)</Label>
            <Input
              id="fx-rate"
              type="number"
              step="0.0001"
              min="0"
              value={rateInput}
              onChange={(e) => setRateInput(e.target.value)}
              placeholder="17.4798"
              autoFocus
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditing(null)}>
              Cancelar
            </Button>
            <Button onClick={handleSave} disabled={setRate.isPending}>
              {setRate.isPending ? 'Guardando…' : 'Guardar tasa'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
