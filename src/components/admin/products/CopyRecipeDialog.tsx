'use client';

// CopyRecipeDialog — "Copiar receta de otro kit…" (contrato de kits §5.2):
// buscador de kits/paquetes, confirmación con el número de renglones y
// reemplazo de la receta GLOBAL del kit destino vía PUT /products/:id/
// components/bulk (recipeCopyPayload: solo renglones activos, sin duplicados).

import { useEffect, useId, useState } from 'react';
import { Loader2, Search } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useReplaceKitComponents } from '@/hooks/useKits';
import { useProducts } from '@/hooks/useProducts';
import { recipeCopyPayload } from '@/lib/kits/kit-editor';
import { kitAdminService } from '@/services/kit-admin.service';
import { ProductType, type Product } from '@/types/product';
import { KitConfirmDialog } from './KitConfirmDialog';
import { productAdminErrorMessage } from './lib/errors';

interface CopyRecipeDialogProps {
  /** Kit/paquete destino. */
  productId: string;
  productType: 'kit' | 'pack';
  /** Renglones que hoy tiene la receta (para el texto de la confirmación). */
  currentRows: number;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCopied?: () => void;
}

export function CopyRecipeDialog({ productId, productType, currentRows, open, onOpenChange, onCopied }: CopyRecipeDialogProps) {
  const searchId = useId();
  const [search, setSearch] = useState('');
  const [term, setTerm] = useState('');
  const [source, setSource] = useState<Product | null>(null);
  const [sourceRows, setSourceRows] = useState<number | null>(null);
  const [loadingSource, setLoadingSource] = useState(false);
  const replace = useReplaceKitComponents(productId);

  useEffect(() => {
    const t = setTimeout(() => setTerm(search.trim()), 300);
    return () => clearTimeout(t);
  }, [search]);
  const searchEnabled = open && term.length >= 2;
  const { data: results, isFetching } = useProducts(
    { search: term, productType: productType === 'pack' ? ProductType.PACK : ProductType.KIT, limit: 10 },
    { enabled: searchEnabled },
  );
  const candidates = (searchEnabled ? (results?.data ?? []) : []).filter((p) => p.id !== productId);

  const close = (next: boolean) => {
    if (!next) {
      setSearch('');
      setSource(null);
      setSourceRows(null);
    }
    onOpenChange(next);
  };

  // Elegir un kit: se lee su receta global para decir cuántos renglones se copiarán.
  const pick = async (p: Product) => {
    setLoadingSource(true);
    try {
      const rows = await kitAdminService.getGlobalComponents(p.id);
      const payload = recipeCopyPayload(rows, productId);
      if (payload.components.length === 0) {
        toast.error(`${p.code} no tiene receta global que copiar.`);
        return;
      }
      setSource(p);
      setSourceRows(payload.components.length);
    } catch (err) {
      toast.error(productAdminErrorMessage(err, `No se pudo leer la receta de ${p.code}`));
    } finally {
      setLoadingSource(false);
    }
  };

  const confirm = async () => {
    if (!source) return;
    try {
      // Se relee al confirmar: la receta origen pudo cambiar entre elegir y confirmar.
      const rows = await kitAdminService.getGlobalComponents(source.id);
      const payload = recipeCopyPayload(rows, productId);
      if (payload.components.length === 0) {
        toast.error(`${source.code} ya no tiene receta global que copiar.`);
        setSource(null);
        return;
      }
      await replace.mutateAsync(payload);
      toast.success(`Receta copiada de ${source.code}: ${payload.components.length} ${payload.components.length === 1 ? 'componente' : 'componentes'}.`);
      close(false);
      onCopied?.();
    } catch (err) {
      toast.error(productAdminErrorMessage(err, 'No se pudo copiar la receta'));
    }
  };

  return (
    <>
      <Dialog open={open && !source} onOpenChange={close}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Copiar receta de otro {productType === 'pack' ? 'paquete' : 'kit'}</DialogTitle>
            <DialogDescription>
              Busca el {productType === 'pack' ? 'paquete' : 'kit'} origen. Su receta global reemplazará por completo la de este
              producto{currentRows > 0 ? ` (hoy ${currentRows} ${currentRows === 1 ? 'renglón' : 'renglones'})` : ''}.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor={searchId} className="sr-only">
              Buscar por clave o nombre
            </Label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500" aria-hidden />
              <Input
                id={searchId}
                type="search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Clave o nombre (mínimo 2 caracteres)…"
                className="pl-9"
                autoComplete="off"
                autoFocus
              />
            </div>
            <div className="max-h-72 overflow-y-auto rounded-md border border-gray-200">
              {!searchEnabled ? (
                <p className="px-4 py-3 text-sm text-gray-600">Escribe al menos 2 caracteres.</p>
              ) : isFetching && candidates.length === 0 ? (
                <p className="flex items-center gap-2 px-4 py-3 text-sm text-gray-600" role="status">
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> Buscando…
                </p>
              ) : candidates.length === 0 ? (
                <p className="px-4 py-3 text-sm text-gray-700">Sin resultados para «{term}».</p>
              ) : (
                <ul>
                  {candidates.map((p) => (
                    <li key={p.id}>
                      <button
                        type="button"
                        onClick={() => void pick(p)}
                        disabled={loadingSource}
                        className="flex min-h-11 w-full items-center justify-between gap-3 px-4 py-2 text-left hover:bg-gray-50 focus-visible:bg-gray-50 focus-visible:outline-none disabled:opacity-60"
                      >
                        <span className="min-w-0">
                          <span className="block truncate text-sm font-medium text-gray-900">{p.name}</span>
                          <span className="block font-mono text-xs text-gray-600">{p.code}</span>
                        </span>
                        {!p.isActive ? <span className="shrink-0 rounded-full bg-gray-100 px-2 py-0.5 text-[11px] text-gray-700">Inactivo</span> : null}
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => close(false)}>
              Cancelar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <KitConfirmDialog
        open={open && !!source}
        onOpenChange={(next) => {
          if (!next && !replace.isPending) setSource(null);
        }}
        title={`Reemplazar la receta con la de ${source?.code ?? ''}`}
        description={`Se reemplazará la receta actual${currentRows > 0 ? ` (${currentRows} ${currentRows === 1 ? 'renglón' : 'renglones'})` : ''} por los ${sourceRows ?? 0} componentes de ${source?.name ?? ''}. Se guarda de inmediato.`}
        confirmLabel="Copiar y guardar"
        destructive
        isPending={replace.isPending}
        onConfirm={confirm}
      />
    </>
  );
}
