'use client';

// /admin/distribuidores/[id]/red — la red de un distribuidor tal como él la ve
// en su panel ("Mi red": resumen del periodo, niveles, explorador por líneas,
// lista con filtros, volumen por línea directa y ficha del socio), para que
// Comercial y demás colaboradores con customers:read la consulten desde la
// ficha. Solo lectura: sin alta de socios, invitaciones ni descarga (el Excel
// de red del admin sigue en "Actividad por Periodo" de la ficha). Los datos
// salen de /customers/:id/network/* vía <NetworkScopeProvider>.

import { Suspense } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeftIcon } from '@heroicons/react/24/outline';
import { Skeleton } from '@/components/ui/skeleton';
import { customersService } from '@/services/customers.service';
import { NetworkScopeProvider } from '@/lib/network/scope';
import { NetworkWorkspace } from '@/components/network/NetworkWorkspace';

export default function AdminDistributorNetworkPage() {
  const params = useParams();
  const id = String(params?.id ?? '');
  const customerQuery = useQuery({
    queryKey: ['customers', 'detail', id],
    queryFn: () => customersService.getById(id),
    enabled: Boolean(id),
    staleTime: 60 * 1000,
  });
  const customer = customerQuery.data;
  const fullName = customer ? `${customer.firstName ?? ''} ${customer.lastName ?? ''}`.trim() : '';

  return (
    <div className="min-h-screen bg-gray-50 pb-10">
      <div className="mx-auto max-w-7xl px-4 pt-6 sm:px-6 lg:px-8">
        <Link
          href={`/admin/distribuidores/${id}`}
          className="inline-flex items-center gap-1.5 text-sm text-gray-600 hover:text-gray-900"
        >
          <ArrowLeftIcon className="h-4 w-4" aria-hidden="true" />
          Volver a la ficha
        </Link>
        <div className="mb-5 mt-3">
          {customerQuery.isLoading ? (
            <Skeleton className="h-7 w-72" />
          ) : customerQuery.isError || !customer ? (
            <p className="text-sm text-red-700">No se pudo cargar la ficha del distribuidor.</p>
          ) : (
            <p className="text-sm text-gray-600">
              Lo que ve <span className="font-semibold text-gray-900">{fullName || 'el distribuidor'}</span>
              {customer.customerNumber ? (
                <>
                  {' '}
                  (<code className="rounded bg-gray-100 px-1.5 py-0.5 text-xs">#{customer.customerNumber}</code>)
                </>
              ) : null}{' '}
              en su panel, en «Mi red». Solo consulta: desde aquí no se dan de alta socios ni se envían invitaciones.
            </p>
          )}
        </div>
      </div>

      {id && (
        <NetworkScopeProvider customerId={id}>
          <Suspense>
            <NetworkWorkspace
              title={
                customer?.customerNumber
                  ? `Red de ${fullName || 'distribuidor'} · #${customer.customerNumber}`
                  : 'Red del distribuidor'
              }
            />
          </Suspense>
        </NetworkScopeProvider>
      )}
    </div>
  );
}
