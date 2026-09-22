'use client';

// ProductActiveDialog — Desactivar / Reactivar UN producto con texto veraz.
// "Eliminar" en el API es una baja lógica (is_active = false): nada se borra y
// se puede revertir. Desactivar usa DELETE /products/:id (products:delete);
// reactivar usa PATCH { isActive: true } (products:update + products:delete:
// el API responde 403 PRD_FORBIDDEN si `isActive` cambia sin products:delete).
//
// Kits y paquetes (contrato de kits §4.2): "eliminar" = la misma baja lógica
// (conserva ventas, receta, precios y bonos); reactivar exige la ficha lista:
// 422 KIT_NOT_READY con la lista de faltantes críticos, que se muestra aquí.

import { useState } from 'react';
import { toast } from 'sonner';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { ConfirmDialog } from '@/components/admin/ConfirmDialog';
import { productKeys, useDeleteProduct } from '@/hooks/useProducts';
import { kitAdminKeys } from '@/hooks/useKitAdmin';
import { notReadyCritical } from '@/lib/kits/kit-readiness';
import { productsAdminService } from '@/services/products-admin.service';
import { parseProductAdminError, productAdminErrorMessage } from './lib/errors';
import { isKitLikeType } from './lib/labels';
import { productsAdminKeys } from './useProductsAdmin';

export interface ProductActiveTarget {
  id: string;
  code: string;
  name: string;
  slug?: string | null;
  isActive: boolean;
  productType?: string | null;
}

interface ProductActiveDialogProps {
  target: ProductActiveTarget | null;
  onOpenChange: (open: boolean) => void;
  onDone?: () => void;
}

export function ProductActiveDialog({ target, onOpenChange, onDone }: ProductActiveDialogProps) {
  const queryClient = useQueryClient();
  const deactivate = useDeleteProduct();
  const reactivate = useMutation({
    mutationFn: (id: string) => productsAdminService.updateProduct(id, { isActive: true }),
  });
  const [notReady, setNotReady] = useState<{ message: string; critical: { code: string; label: string }[] } | null>(null);
  const isPending = deactivate.isPending || reactivate.isPending;
  const deactivating = target?.isActive === true;
  const kitLike = isKitLikeType(target?.productType);
  const noun = target?.productType === 'pack' ? 'paquete' : kitLike ? 'kit' : 'producto';

  const close = (open: boolean) => {
    if (!open) setNotReady(null);
    onOpenChange(open);
  };

  const confirm = async () => {
    if (!target) return;
    setNotReady(null);
    try {
      if (target.isActive) {
        await deactivate.mutateAsync(target.id);
        toast.success(kitLike ? `${target.name} se desactivó (baja lógica): conserva sus ventas, receta, precios y bonos.` : `${target.name} se desactivó`);
      } else {
        await reactivate.mutateAsync(target.id);
        toast.success(`${target.name} se reactivó`);
      }
      queryClient.invalidateQueries({ queryKey: productsAdminKeys.all });
      queryClient.invalidateQueries({ queryKey: productKeys.all });
      queryClient.invalidateQueries({ queryKey: kitAdminKeys.readiness(target.id) });
      void productsAdminService.revalidateCatalog([target.slug]);
      close(false);
      onDone?.();
    } catch (err) {
      const body = parseProductAdminError(err);
      if (body.code === 'KIT_NOT_READY') {
        // El diálogo se queda abierto con la lista de faltantes.
        setNotReady({
          message: body.message ?? 'No se puede activar el kit: faltan datos críticos.',
          critical: notReadyCritical(body.details),
        });
        return;
      }
      toast.error(
        productAdminErrorMessage(err, target.isActive ? `No se pudo desactivar el ${noun}` : `No se pudo reactivar el ${noun}`),
      );
    }
  };

  return (
    <ConfirmDialog
      open={!!target}
      onOpenChange={close}
      title={deactivating ? (kitLike ? `Eliminar (desactivar) ${noun}` : 'Desactivar producto') : kitLike ? `Reactivar ${noun}` : 'Reactivar producto'}
      description={
        deactivating
          ? kitLike
            ? `Los ${noun}s no se borran: quedan inactivos y conservan sus ventas, receta, precios y bonos. Dejará de ofrecerse en el POS y en la inscripción en línea. Puedes reactivarlo cuando quieras.`
            : 'Dejará de venderse en tienda y POS. Puedes reactivarlo cuando quieras.'
          : kitLike
            ? 'Volverá a ofrecerse en los canales donde esté encendido y tenga precio vigente. El sistema lo rechaza si le faltan datos críticos (precio de distribuidor, receta o posición).'
            : 'Volverá a venderse en los canales donde esté visible y tenga precio vigente.'
      }
      confirmLabel={deactivating ? (kitLike ? 'Eliminar (desactivar)' : 'Desactivar') : 'Reactivar'}
      confirmText={deactivating ? 'DESACTIVAR' : undefined}
      destructive={deactivating}
      isPending={isPending}
      onConfirm={confirm}
    >
      {target ? (
        <div className="space-y-3">
          <div className="rounded-lg border border-gray-200 bg-gray-50 p-3">
            <p className="font-semibold text-gray-900">{target.name}</p>
            <p className="font-mono text-xs text-gray-700">Clave {target.code}</p>
          </div>
          {notReady ? (
            <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-900" role="alert">
              <p className="font-semibold">{notReady.message}</p>
              {notReady.critical.length > 0 ? (
                <ul className="mt-1 list-disc space-y-0.5 pl-5">
                  {notReady.critical.map((c) => (
                    <li key={c.code || c.label}>{c.label}</li>
                  ))}
                </ul>
              ) : null}
              <p className="mt-1 text-xs">Corrige los puntos en la sección Kit («Listo para vender») y vuelve a intentarlo.</p>
            </div>
          ) : null}
        </div>
      ) : null}
    </ConfirmDialog>
  );
}
