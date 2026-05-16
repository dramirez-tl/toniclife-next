'use client';

import { Suspense, useState } from 'react';
import Link from 'next/link';
import {
  GiftIcon,
  PlusIcon,
  PencilIcon,
  MagnifyingGlassIcon,
  CheckCircleIcon,
  XCircleIcon,
} from '@heroicons/react/24/outline';
import { Card, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { useKits } from '@/hooks/useKits';
import { KitPosition, KIT_POSITION_LABEL } from '@/types/product';
import type { Product } from '@/types/product';

const KIT_POSITION_COLORS: Record<string, string> = {
  basic: 'bg-blue-100 text-blue-800',
  premium: 'bg-purple-100 text-purple-800',
  preferente: 'bg-amber-100 text-amber-800',
};

export default function KitsPage() {
  return (
    <Suspense fallback={<KitsSkeleton />}>
      <KitsContent />
    </Suspense>
  );
}

function KitsContent() {
  const [search, setSearch] = useState('');
  const [position, setPosition] = useState<KitPosition | ''>('');

  const { data, isLoading } = useKits({
    search: search.trim() || undefined,
    kitPosition: position || undefined,
    limit: 50,
  });

  const kits: Product[] = data?.data ?? [];

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-gray-50">
      <div className="bg-gradient-to-r from-[#3E667D] to-[#0A4B94] text-white">
        <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <GiftIcon className="h-9 w-9" />
                <h1 className="text-3xl font-bold sm:text-4xl">Kits de Inscripción</h1>
              </div>
              <p className="text-base text-white/80 sm:text-lg">
                Crea y administra los kits Básico, Premium y Preferente que se venden para inscribir nuevos distribuidores
              </p>
            </div>
            <Link href="/admin/kits/nuevo">
              <Button variant="secondary" leftIcon={<PlusIcon className="h-5 w-5" />}>
                Nuevo Kit
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
                    placeholder="Buscar por nombre o código (KBM10, Kit Básico...)"
                    className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#3E667D]"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Posición</label>
                <select
                  value={position}
                  onChange={(e) => setPosition(e.target.value as KitPosition | '')}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#3E667D]"
                >
                  <option value="">Todas las posiciones</option>
                  <option value={KitPosition.BASIC}>Básico</option>
                  <option value={KitPosition.PREMIUM}>Premium</option>
                  <option value={KitPosition.PREFERENTE}>Preferente</option>
                </select>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="p-8 text-center text-gray-500">Cargando kits...</div>
            ) : kits.length === 0 ? (
              <div className="p-12 text-center">
                <GiftIcon className="h-12 w-12 mx-auto text-gray-300 mb-3" />
                <p className="text-gray-600 mb-4">No hay kits que coincidan con los filtros</p>
                <Link href="/admin/kits/nuevo">
                  <Button variant="primary" leftIcon={<PlusIcon className="h-5 w-5" />}>
                    Crear primer kit
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
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Posición</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Precio</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Países</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Estado</th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {kits.map((kit) => (
                      <tr key={kit.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap font-mono text-sm">{kit.code}</td>
                        <td className="px-6 py-4">
                          <div className="text-sm font-medium text-gray-900">{kit.name}</div>
                          {kit.shortName && (
                            <div className="text-xs text-gray-500">{kit.shortName}</div>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {kit.kitPosition ? (
                            <span
                              className={`inline-flex px-2 py-1 text-xs font-medium rounded ${
                                KIT_POSITION_COLORS[kit.kitPosition] || 'bg-gray-100 text-gray-800'
                              }`}
                            >
                              {KIT_POSITION_LABEL[kit.kitPosition as KitPosition] || kit.kitPosition}
                            </span>
                          ) : (
                            <span className="text-xs text-gray-400 italic">Sin posición</span>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                          {kit.price ? `$${Number(kit.price).toLocaleString('es-MX')} ${kit.priceCurrency || ''}` : '—'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                          {(kit.activeCountries ?? []).join(', ') || '—'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {kit.isActive ? (
                            <CheckCircleIcon className="h-5 w-5 text-green-500" />
                          ) : (
                            <XCircleIcon className="h-5 w-5 text-red-500" />
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right">
                          <Link href={`/admin/kits/${kit.id}`}>
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

function KitsSkeleton() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-gray-50">
      <div className="bg-gradient-to-r from-[#3E667D] to-[#0A4B94] text-white">
        <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3 mb-2">
            <GiftIcon className="h-9 w-9" />
            <h1 className="text-3xl font-bold sm:text-4xl">Kits de Inscripción</h1>
          </div>
        </div>
      </div>
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="h-96 animate-pulse bg-gray-200 rounded-xl" />
      </div>
    </div>
  );
}
