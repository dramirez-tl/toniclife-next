'use client';

// Cola de etiquetas pendientes de imprimir.
// La impresión física será un proyecto Electron aparte; aquí se ve el código de
// barras generado, se verifica y se marca como impresa.

import { useState } from 'react';
import Link from 'next/link';
import { toast } from 'sonner';
import { QrCodeIcon, ArrowLeftIcon } from '@heroicons/react/24/outline';
import { Loader2 } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Skeleton } from '@/components/ui/skeleton';
import { AssetBarcode } from '@/components/admin/assets/AssetBarcode';
import { useMarkLabelsPrinted, usePendingLabels } from '@/hooks/useAssets';

export default function EtiquetasPage() {
  const { data: labels = [], isLoading } = usePendingLabels(200);
  const markMutation = useMarkLabelsPrinted();
  const [selected, setSelected] = useState<string[]>([]);

  const toggle = (id: string, checked: boolean) =>
    setSelected((prev) => (checked ? [...prev, id] : prev.filter((x) => x !== id)));

  const toggleAll = (checked: boolean) =>
    setSelected(checked ? labels.map((l) => l.assetId) : []);

  const handleMark = async () => {
    if (!selected.length) {
      toast.error('Selecciona al menos una etiqueta');
      return;
    }
    try {
      const result = await markMutation.mutateAsync(selected);
      toast.success(`${result.updated} etiqueta(s) marcadas como impresas`);
      setSelected([]);
    } catch {
      toast.error('No se pudieron marcar las etiquetas');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-gray-50 dark:from-background dark:to-background">
      <div className="bg-gradient-to-r from-[#3E667D] to-[#0A4B94] text-white">
        <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
          <Link
            href="/admin/activos"
            className="mb-4 inline-flex items-center gap-2 text-sm text-white/80 hover:text-white"
          >
            <ArrowLeftIcon className="h-4 w-4" />
            Volver al inventario
          </Link>
          <div className="mb-2 flex items-center gap-3">
            <QrCodeIcon className="h-9 w-9" />
            <h1 className="text-3xl font-bold sm:text-4xl">Etiquetas pendientes</h1>
          </div>
          <p className="text-base text-white/80 sm:text-lg">
            Equipos que aún no tienen su etiqueta con código de barras pegada
          </p>
        </div>
      </div>

      <div className="mx-auto max-w-6xl space-y-6 px-4 py-8 sm:px-6 lg:px-8">
        <Card>
          <CardContent className="flex flex-wrap items-center justify-between gap-3 p-6">
            <div className="flex items-center gap-3">
              <Checkbox
                id="select-all"
                checked={selected.length > 0 && selected.length === labels.length}
                onCheckedChange={(c) => toggleAll(c === true)}
              />
              <label htmlFor="select-all" className="text-sm">
                Seleccionar todas ({labels.length})
              </label>
            </div>
            <Button
              onClick={() => void handleMark()}
              disabled={!selected.length || markMutation.isPending}
            >
              {markMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Marcar {selected.length} como impresas
            </Button>
          </CardContent>
        </Card>

        {isLoading ? (
          <Skeleton className="h-96 w-full" />
        ) : labels.length === 0 ? (
          <Card>
            <CardContent className="p-10 text-center">
              <QrCodeIcon className="mx-auto mb-3 h-10 w-10 text-muted-foreground/50" />
              <p className="text-sm font-medium">No hay etiquetas pendientes</p>
              <p className="text-sm text-muted-foreground">
                Todos los equipos registrados ya tienen su etiqueta marcada como impresa.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {labels.map((l) => (
              <Card key={l.assetId} className={selected.includes(l.assetId) ? 'ring-2 ring-primary' : ''}>
                <CardContent className="space-y-3 p-4">
                  <div className="flex items-start gap-2">
                    <Checkbox
                      checked={selected.includes(l.assetId)}
                      onCheckedChange={(c) => toggle(l.assetId, c === true)}
                    />
                    <div className="min-w-0 flex-1">
                      <Link
                        href={`/admin/activos/${l.assetId}`}
                        className="truncate text-sm font-medium hover:underline"
                      >
                        {l.name}
                      </Link>
                      <p className="truncate text-xs text-muted-foreground">
                        {[l.brand, l.model].filter(Boolean).join(' · ') || l.categoryName}
                      </p>
                    </div>
                  </div>
                  <AssetBarcode value={l.barcodeValue} height={44} width={1.6} />
                  <p className="text-xs text-muted-foreground">
                    {[l.branchName, l.locationName].filter(Boolean).join(' › ') || 'Sin ubicación'}
                    {l.serialNumber ? ` · S/N ${l.serialNumber}` : ''}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
