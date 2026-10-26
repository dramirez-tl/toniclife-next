'use client';

// Nueva dirección de un distribuidor desde el admin (26-oct-2026): el enlace
// "+ Agregar" de la ficha caía en 404. Formulario por país (lib/address-forms,
// el mismo del alta) → POST customers/:id/addresses. Permiso customers:update.

import { useParams, useRouter } from 'next/navigation';
import { PermissionGuard } from '@/components/auth';
import { CustomerAddressForm } from '@/components/admin/customers/CustomerAddressForm';

export default function NuevaDireccionPage() {
  const params = useParams();
  const customerId = params.id as string;
  const router = useRouter();
  return (
    <PermissionGuard permissions={['customers:update']}>
      <CustomerAddressForm
        customerId={customerId}
        onDone={() => router.push(`/admin/distribuidores/${customerId}`)}
      />
    </PermissionGuard>
  );
}
