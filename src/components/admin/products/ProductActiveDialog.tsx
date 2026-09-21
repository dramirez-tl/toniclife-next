'use client';

// ProductActiveDialog — Desactivar / Reactivar UN producto con texto veraz.
// "Eliminar" en el API es una baja lógica (is_active = false): nada se borra y
// se puede revertir. Desactivar usa DELETE /products/:id (products:delete);
// reactivar usa PATCH { isActive: true } (products:update + products:delete:
// el API responde 403 PRD_FORBIDDEN si `isActive` cambia sin products:delete).

import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';
import { ConfirmDialog } from '@/components/admin/ConfirmDialog';
import { productKeys, useDeleteProduct } from '@/hooks/useProducts';
import { productsAdminService } from '@/services/products-admin.service';
import { useMutation } from '@tanstack/react-query';
import { productAdminErrorMessage } from './lib/errors';
import { productsAdminKeys } from './useProductsAdmin';

export interface ProductActiveTarget {
  id: string;
  code: string;
  name: string;
  slug?: string | null;
  isActive: boolean;
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
  const isPending = deactivate.isPending || reactivate.isPending;
  const deactivating = target?.isActive === true;

  const confirm = async () => {
    if (!target) return;
    try {
      if (target.isActive) {
        await deactivate.mutateAsync(target.id);
        toast.success(`${target.name} se desactivó`);
      } else {
        await reactivate.mutateAsync(target.id);
        toast.success(`${target.name} se reactivó`);
      }
      queryClient.invalidateQueries({ queryKey: productsAdminKeys.all });
      queryClient.invalidateQueries({ queryKey: productKeys.all });
      void productsAdminService.revalidateCatalog([target.slug]);
      onOpenChange(false);
      onDone?.();
    } catch (err) {
      toast.error(
        productAdminErrorMessage(err, target.isActive ? 'No se pudo desactivar el producto' : 'No se pudo reactivar el producto'),
      );
    }
  };

  return (
    <ConfirmDialog
      open={!!target}
      onOpenChange={onOpenChange}
      title={deactivating ? 'Desactivar producto' : 'Reactivar producto'}
      description={
        deactivating
          ? 'Dejará de venderse en tienda y POS. Puedes reactivarlo cuando quieras.'
          : 'Volverá a venderse en los canales donde esté visible y tenga precio vigente.'
      }
      confirmLabel={deactivating ? 'Desactivar' : 'Reactivar'}
      confirmText={deactivating ? 'DESACTIVAR' : undefined}
      destructive={deactivating}
      isPending={isPending}
      onConfirm={confirm}
    >
      {target ? (
        <div className="rounded-lg border border-gray-200 bg-gray-50 p-3">
          <p className="font-semibold text-gray-900">{target.name}</p>
          <p className="font-mono text-xs text-gray-700">Clave {target.code}</p>
        </div>
      ) : null}
    </ConfirmDialog>
  );
}
