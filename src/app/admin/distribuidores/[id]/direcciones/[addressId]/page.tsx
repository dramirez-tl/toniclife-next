'use client';

// Editar una dirección existente de un distribuidor desde el admin
// (26-oct-2026): mismo formulario por país que el alta, precargado con
// GET customers/:id/addresses/:addressId → PATCH; además "predeterminada" y
// eliminar. Permiso customers:update.

import { useParams, useRouter } from 'next/navigation';
import { PermissionGuard } from '@/components/auth';
import { CustomerAddressForm } from '@/components/admin/customers/CustomerAddressForm';

export default function EditarDireccionPage() {
  const params = useParams();
  const customerId = params.id as string;
  const addressId = params.addressId as string;
  const router = useRouter();
  return (
    <PermissionGuard permissions={['customers:update']}>
      <CustomerAddressForm
        customerId={customerId}
        addressId={addressId}
        onDone={() => router.push(`/admin/distribuidores/${customerId}`)}
      />
    </PermissionGuard>
  );
}
