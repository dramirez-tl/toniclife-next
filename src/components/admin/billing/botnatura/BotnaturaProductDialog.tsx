'use client';

// BotnaturaProductDialog - Alta o corrección de un producto del catálogo de Botnatura. Los dos
// precios se capturan CON IVA incluido; vacío = sin precio (no se inventa ninguno). El IVA es
// 16 % para todo el catálogo (decisión de Contabilidad, 17-nov-2026) y no se edita aquí.

import { useState } from 'react';
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
import { useSaveBotnaturaProduct } from '@/hooks/useBotnatura';
import { billingErrorMessage } from '@/lib/billing-error';
import { parseAmount, splitIvaIncluded } from '@/lib/billing/botnatura';
import { moneyMx as money } from '@/lib/billing/manual-free';
import type { BotnaturaProduct, SaveBotnaturaProduct } from '@/types/botnatura';

interface Props {
  /** null = alta de un producto nuevo. */
  product: BotnaturaProduct | null;
  onClose: () => void;
}

const priceText = (value: number | null | undefined) => (value === null || value === undefined ? '' : String(value));

export function BotnaturaProductDialog({ product, onClose }: Props) {
  const [code, setCode] = useState(product?.code ?? '');
  const [name, setName] = useState(product?.name ?? '');
  const [listPrice, setListPrice] = useState(priceText(product?.listPrice));
  const [salePrice, setSalePrice] = useState(priceText(product?.salePrice));
  const [isActive, setIsActive] = useState(product?.isActive ?? true);
  const save = useSaveBotnaturaProduct();

  const list = listPrice.trim() === '' ? null : parseAmount(listPrice);
  const sale = salePrice.trim() === '' ? null : parseAmount(salePrice);
  const problems: string[] = [];
  if (!product && !code.trim()) problems.push('Captura la clave');
  if (!name.trim()) problems.push('Captura el nombre');
  if (listPrice.trim() !== '' && list === null) problems.push('El "Precio" no es un importe válido');
  if (salePrice.trim() !== '' && sale === null) problems.push('El "Precio venta" no es un importe válido');

  const submit = async () => {
    if (problems.length > 0) return;
    const dto: SaveBotnaturaProduct = {
      ...(product ? {} : { code: code.trim() }),
      name: name.trim(),
      listPrice: list,
      salePrice: sale,
      isActive,
    };
    try {
      const saved = await save.mutateAsync({ id: product?.id, dto });
      toast.success(product ? `${saved.code} actualizado` : `${saved.code} agregado al catálogo`);
      onClose();
    } catch (err) {
      toast.error(billingErrorMessage(err, 'No se pudo guardar el producto'));
    }
  };

  const breakdown = (value: number | null) => {
    if (value === null || value <= 0) return 'Vacío = sin precio';
    const { base, tax } = splitIvaIncluded(value);
    return `${money(base)} + ${money(tax)} de IVA`;
  };

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{product ? `Editar ${product.code}` : 'Agregar producto de Botnatura'}</DialogTitle>
          <DialogDescription>
            Catálogo propio de Botnatura. No cambia nada del catálogo ni de los precios de Tonic Life.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          {!product && (
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-600">Clave</label>
              <Input value={code} onChange={(e) => setCode(e.target.value)} maxLength={40} className="font-mono" />
            </div>
          )}
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-600">Nombre (así sale en la factura)</label>
            <Input value={name} onChange={(e) => setName(e.target.value)} maxLength={255} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-600">Precio venta (con IVA)</label>
              <Input
                value={salePrice}
                onChange={(e) => setSalePrice(e.target.value)}
                inputMode="decimal"
                className="text-right tabular-nums"
              />
              <p className="mt-1 text-xs text-gray-400">{breakdown(sale)}</p>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-600">Precio (con IVA)</label>
              <Input
                value={listPrice}
                onChange={(e) => setListPrice(e.target.value)}
                inputMode="decimal"
                className="text-right tabular-nums"
              />
              <p className="mt-1 text-xs text-gray-400">{breakdown(list)}</p>
            </div>
          </div>
          <label className="flex items-center gap-2 text-sm text-gray-700">
            <input
              type="checkbox"
              checked={isActive}
              onChange={(e) => setIsActive(e.target.checked)}
              className="h-4 w-4 rounded border-gray-300"
            />
            Activo (se puede facturar)
          </label>
          <p className="text-xs text-gray-500">
            IVA 16 % · Clave SAT {product?.satProductCode ?? '51191900'} · Unidad {product?.satUnitCode ?? 'H87'} (Pieza)
          </p>
          {problems.length > 0 && <p className="text-xs text-red-600">{problems.join(' · ')}</p>}
        </div>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="button" onClick={() => void submit()} disabled={problems.length > 0 || save.isPending}>
            {save.isPending ? 'Guardando…' : 'Guardar'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
