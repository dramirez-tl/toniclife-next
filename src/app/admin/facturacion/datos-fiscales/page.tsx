// app/admin/facturacion/datos-fiscales/page.tsx - Gestión de Datos Fiscales
// Ref: TONIC_LIFE_2.0_MASTER.md - Sección 5.5 Facturación
'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/Button';
import { Card, CardContent } from '@/components/ui/Card';
import {
  BuildingOfficeIcon,
  MagnifyingGlassIcon,
  PlusIcon,
  PencilSquareIcon,
  CheckCircleIcon,
  XCircleIcon,
  ArrowLeftIcon,
  UserIcon,
} from '@heroicons/react/24/outline';
import { getFiscalRegimeName, getCfdiUseName } from '@/types/billing';
import { useFiscalDataList } from '@/hooks/useBilling';

export default function DatosFiscalesPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterValidated, setFilterValidated] = useState<'all' | 'validated' | 'pending'>('all');

  // Fetch fiscal data from API
  const { data: fiscalDataList = [], isLoading, error } = useFiscalDataList();

  const filteredData = useMemo(() => {
    return fiscalDataList.filter((data) => {
      const customerName = data.customer?.customerNumber || '';
      const matchesSearch =
        searchTerm === '' ||
        customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        data.rfc.toLowerCase().includes(searchTerm.toLowerCase()) ||
        data.legalName.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesFilter =
        filterValidated === 'all' ||
        (filterValidated === 'validated' && data.isValidated) ||
        (filterValidated === 'pending' && !data.isValidated);

      return matchesSearch && matchesFilter;
    });
  }, [fiscalDataList, searchTerm, filterValidated]);

  const stats = useMemo(() => ({
    total: fiscalDataList.length,
    validated: fiscalDataList.filter((d) => d.isValidated).length,
    pending: fiscalDataList.filter((d) => !d.isValidated).length,
  }), [fiscalDataList]);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-gradient-to-r from-[#003B7A] to-[#003B7A]/90 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link
                href="/admin/facturacion"
                className="p-2 hover:bg-white/10 rounded-lg transition-colors"
              >
                <ArrowLeftIcon className="h-6 w-6" />
              </Link>
              <div>
                <div className="flex items-center gap-3 mb-2">
                  <BuildingOfficeIcon className="h-10 w-10" />
                  <h1 className="text-4xl font-bold">Datos Fiscales</h1>
                </div>
                <p className="text-white/80 text-lg">
                  Gestiona los datos fiscales de los clientes para facturación
                </p>
              </div>
            </div>
            <Link href="/admin/facturacion/datos-fiscales/nuevo">
              <Button
                variant="secondary"
                leftIcon={<PlusIcon className="h-5 w-5" />}
              >
                Agregar Datos Fiscales
              </Button>
            </Link>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                  <BuildingOfficeIcon className="h-6 w-6 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-600">Total Registros</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                  <CheckCircleIcon className="h-6 w-6 text-green-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-600">RFC Validados</p>
                  <p className="text-2xl font-bold text-green-600">{stats.validated}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-yellow-100 rounded-lg flex items-center justify-center">
                  <XCircleIcon className="h-6 w-6 text-yellow-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-600">Pendientes Validación</p>
                  <p className="text-2xl font-bold text-yellow-600">{stats.pending}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card className="mb-6">
          <CardContent className="p-4">
            <div className="flex flex-col sm:flex-row gap-4">
              {/* Search */}
              <div className="relative flex-1">
                <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Buscar por cliente, RFC o razón social..."
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#003B7A] focus:border-transparent"
                />
              </div>

              {/* Filter by validation status */}
              <select
                value={filterValidated}
                onChange={(e) =>
                  setFilterValidated(e.target.value as 'all' | 'validated' | 'pending')
                }
                className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#003B7A] focus:border-transparent"
              >
                <option value="all">Todos los Estados</option>
                <option value="validated">RFC Validados</option>
                <option value="pending">Pendientes Validación</option>
              </select>
            </div>
          </CardContent>
        </Card>

        {/* Table */}
        <Card>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="text-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#003B7A] mx-auto mb-4"></div>
                <p className="text-gray-600">Cargando datos fiscales...</p>
              </div>
            ) : error ? (
              <div className="text-center py-12">
                <XCircleIcon className="h-16 w-16 text-red-400 mx-auto mb-4" />
                <h3 className="text-xl font-bold text-gray-900 mb-2">
                  Error al cargar datos
                </h3>
                <p className="text-gray-600 mb-6">
                  No se pudieron cargar los datos fiscales. Intenta de nuevo.
                </p>
              </div>
            ) : (
              <>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-gray-200 bg-gray-50">
                        <th className="text-left py-4 px-6 text-sm font-semibold text-gray-900">
                          Cliente
                        </th>
                        <th className="text-left py-4 px-6 text-sm font-semibold text-gray-900">
                          RFC
                        </th>
                        <th className="text-left py-4 px-6 text-sm font-semibold text-gray-900">
                          Razón Social
                        </th>
                        <th className="text-left py-4 px-6 text-sm font-semibold text-gray-900">
                          Régimen Fiscal
                        </th>
                        <th className="text-left py-4 px-6 text-sm font-semibold text-gray-900">
                          Uso CFDI
                        </th>
                        <th className="text-center py-4 px-6 text-sm font-semibold text-gray-900">
                          Estado
                        </th>
                        <th className="text-center py-4 px-6 text-sm font-semibold text-gray-900">
                          Acciones
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredData.map((data) => (
                        <tr
                          key={data.id}
                          className="border-b border-gray-100 hover:bg-gray-50 transition-colors"
                        >
                          <td className="py-4 px-6">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center">
                                <UserIcon className="h-5 w-5 text-gray-500" />
                              </div>
                              <div>
                                <p className="font-medium text-gray-900">{data.legalName}</p>
                                <p className="text-sm text-gray-500">{data.customer?.customerNumber || '-'}</p>
                              </div>
                            </div>
                          </td>
                          <td className="py-4 px-6">
                            <span className="font-mono text-sm text-[#003B7A] font-medium">
                              {data.rfc}
                            </span>
                          </td>
                          <td className="py-4 px-6">
                            <p className="text-sm text-gray-900 max-w-xs truncate">
                              {data.legalName}
                            </p>
                            <p className="text-xs text-gray-500">CP: {data.postalCode}</p>
                          </td>
                          <td className="py-4 px-6">
                            <p className="text-sm text-gray-600">
                              {getFiscalRegimeName(data.taxRegime)}
                            </p>
                          </td>
                          <td className="py-4 px-6">
                            <p className="text-sm text-gray-600">
                              {getCfdiUseName(data.defaultCfdiUse)}
                            </p>
                          </td>
                          <td className="py-4 px-6 text-center">
                            {data.isValidated ? (
                              <span className="inline-flex items-center gap-1 px-3 py-1 bg-green-100 text-green-700 rounded-full text-xs font-medium">
                                <CheckCircleIcon className="h-4 w-4" />
                                Validado
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-3 py-1 bg-yellow-100 text-yellow-700 rounded-full text-xs font-medium">
                                <XCircleIcon className="h-4 w-4" />
                                Pendiente
                              </span>
                            )}
                          </td>
                          <td className="py-4 px-6 text-center">
                            <div className="flex items-center justify-center gap-2">
                              <Link href={`/admin/facturacion/datos-fiscales/${data.id}`}>
                                <Button variant="outline" size="sm">
                                  <PencilSquareIcon className="h-4 w-4" />
                                </Button>
                              </Link>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {filteredData.length === 0 && (
                  <div className="text-center py-12">
                    <BuildingOfficeIcon className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-xl font-bold text-gray-900 mb-2">
                      No se encontraron registros
                    </h3>
                    <p className="text-gray-600 mb-6">
                      {searchTerm
                        ? 'Intenta con otros términos de búsqueda'
                        : 'Aún no hay datos fiscales registrados'}
                    </p>
                    <Link href="/admin/facturacion/datos-fiscales/nuevo">
                      <Button
                        variant="primary"
                        leftIcon={<PlusIcon className="h-5 w-5" />}
                      >
                        Agregar Datos Fiscales
                      </Button>
                    </Link>
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
