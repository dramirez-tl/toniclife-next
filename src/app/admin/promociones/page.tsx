'use client';

import { Suspense, useState } from 'react';
import Link from 'next/link';
import {
  SparklesIcon,
  PlusIcon,
  PencilIcon,
  MagnifyingGlassIcon,
  CheckCircleIcon,
  XCircleIcon,
} from '@heroicons/react/24/outline';
import { Card, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { usePromotions } from '@/hooks/usePromotions';
import type { Product } from '@/types/product';

export default function PromocionesPage() {
  return (
    <Suspense fallback={<PromocionesSkeleton />}>
      <PromocionesContent />
    </Suspense>
  );
}

function PromocionesContent() {
  const [search, setSearch] = useState('');
  const [onlyActive, setOnlyActive] = useState(true);

  const { data, isLoading } = usePromotions({
    search: search.trim() || undefined,
    isActive: onlyActive ? true : undefined,
    limit: 50,
  });

  const promos: Product[] = data?.data ?? [];

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-gray-50">
      <div className="bg-gradient-to-r from-[#3E667D] to-[#0A4B94] text-white">
        <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <SparklesIcon className="h-9 w-9" />
                <h1 className="text-3xl font-bold sm:text-4xl">Promociones</h1>
              </div>
              <p className="text-base text-white/80 sm:text-lg">
                Crea promociones canjeables por puntos acumulados del periodo (México 4,000/6,000 — Estados Unidos 6,600/9,900)
              </p>
            </div>
            <Link href="/admin/promociones/nuevo">
              <Button variant="secondary" leftIcon={<PlusIcon className="h-5 w-5" />}>
                Nueva Promoción
              </Button>
            </Link>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <Card className="mb-6">
          <CardContent className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">Buscar</label>
                <div className="relative">
                  <MagnifyingGlassIcon className="h-5 w-5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    type="text"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Buscar por nombre o código (PROMO99, PROMO100…)"
                    className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#3E667D]"
                  />
                </div>
              </div>
              <div className="flex items-end">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={onlyActive}
                    onChange={(e) => setOnlyActive(e.target.checked)}
                    className="h-4 w-4 rounded"
                  />
                  <span className="text-sm font-medium text-gray-700">Solo activas</span>
                </label>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="p-8 text-center text-gray-500">Cargando promociones...</div>
            ) : promos.length === 0 ? (
              <div className="p-12 text-center">
                <SparklesIcon className="h-12 w-12 mx-auto text-gray-300 mb-3" />
                <p className="text-gray-600 mb-4">No hay promociones que coincidan con los filtros</p>
                <Link href="/admin/promociones/nuevo">
                  <Button variant="primary" leftIcon={<PlusIcon className="h-5 w-5" />}>
                    Crear primera promoción
                  </Button>
                </Link>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Código</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Nombre</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Países</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Estado</th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {promos.map((promo) => (
                      <tr key={promo.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap font-mono text-sm">{promo.code}</td>
                        <td className="px-6 py-4">
                          <div className="text-sm font-medium text-gray-900">{promo.name}</div>
                          {promo.shortName && (
                            <div className="text-xs text-gray-500">{promo.shortName}</div>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                          {(promo.activeCountries ?? []).join(', ') || '—'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {promo.isActive ? (
                            <CheckCircleIcon className="h-5 w-5 text-green-500" />
                          ) : (
                            <XCircleIcon className="h-5 w-5 text-red-500" />
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right">
                          <Link href={`/admin/promociones/${promo.id}`}>
                            <Button variant="ghost" size="sm" leftIcon={<PencilIcon className="h-4 w-4" />}>
                              Editar
                            </Button>
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function PromocionesSkeleton() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-gray-50">
      <div className="bg-gradient-to-r from-[#3E667D] to-[#0A4B94] text-white">
        <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3 mb-2">
            <SparklesIcon className="h-9 w-9" />
            <h1 className="text-3xl font-bold sm:text-4xl">Promociones</h1>
          </div>
        </div>
      </div>
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="h-96 animate-pulse bg-gray-200 rounded-xl" />
      </div>
    </div>
  );
}
