'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/Button';
import { Card, CardContent } from '@/components/ui/Card';
import {
  CurrencyDollarIcon,
  ArrowDownTrayIcon,
  CalendarIcon,
  ChartBarIcon,
  BanknotesIcon,
  ClockIcon,
  CheckCircleIcon,
  ArrowTrendingUpIcon,
  FunnelIcon,
} from '@heroicons/react/24/outline';
import { toast } from 'sonner';

const mockCommissions = [
  {
    id: 'COM-2025-034',
    date: '2025-01-25',
    type: 'Venta Personal',
    orderId: 'ORD-2025-102',
    customer: 'Ana Martínez',
    amount: 245.99,
    commission: 61.50,
    rate: 25,
    status: 'paid',
  },
  {
    id: 'COM-2025-033',
    date: '2025-01-24',
    type: 'Venta de Red (Nivel 1)',
    orderId: 'ORD-2025-098',
    distributor: 'Laura Pérez',
    amount: 189.50,
    commission: 18.95,
    rate: 10,
    status: 'paid',
  },
  {
    id: 'COM-2025-032',
    date: '2025-01-23',
    type: 'Venta Personal',
    orderId: 'ORD-2025-095',
    customer: 'Carlos Rodríguez',
    amount: 399.00,
    commission: 99.75,
    rate: 25,
    status: 'paid',
  },
  {
    id: 'COM-2025-031',
    date: '2025-01-22',
    type: 'Venta de Red (Nivel 2)',
    orderId: 'ORD-2025-089',
    distributor: 'José García',
    amount: 156.80,
    commission: 7.84,
    rate: 5,
    status: 'pending',
  },
  {
    id: 'COM-2025-030',
    date: '2025-01-20',
    type: 'Bono de Rango',
    description: 'Promoción a Gold',
    amount: 500.00,
    commission: 500.00,
    rate: 100,
    status: 'paid',
  },
];

const monthlyStats = {
  january: {
    total: 4567.89,
    personal: 3245.50,
    team: 987.39,
    bonuses: 335.00,
    paid: 4567.89,
    pending: 0,
  },
  december: {
    total: 3892.45,
    personal: 2678.20,
    team: 814.25,
    bonuses: 400.00,
    paid: 3892.45,
    pending: 0,
  },
};

const statusConfig = {
  paid: { label: 'Pagada', color: 'bg-green-100 text-green-800' },
  pending: { label: 'Pendiente', color: 'bg-yellow-100 text-yellow-800' },
  processing: { label: 'Procesando', color: 'bg-blue-100 text-blue-800' },
};

export default function ComisionesPage() {
  const [selectedMonth, setSelectedMonth] = useState('january');
  const [filterType, setFilterType] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');

  const stats = selectedMonth === 'january' ? monthlyStats.january : monthlyStats.december;

  const filteredCommissions = mockCommissions.filter(comm => {
    if (filterType !== 'all' && comm.type !== filterType) return false;
    if (filterStatus !== 'all' && comm.status !== filterStatus) return false;
    return true;
  });

  const handleDownloadStatement = () => {
    toast.success('Descargando estado de cuenta...');
  };

  const handleRequestPayment = () => {
    toast.info('Solicitud de pago enviada');
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-gradient-to-r from-[#003B7A] to-[#003B7A]/90 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <CurrencyDollarIcon className="h-10 w-10" />
                <h1 className="text-4xl font-bold">Comisiones y Ganancias</h1>
              </div>
              <p className="text-white/80 text-lg">
                Historial completo de tus ingresos
              </p>
            </div>
            <Link href="/distribuidor">
              <Button variant="secondary">
                Volver al Dashboard
              </Button>
            </Link>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card className="bg-gradient-to-br from-[#7AB82E] to-[#7AB82E]/90 text-white">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-2">
                <BanknotesIcon className="h-8 w-8 text-white/80" />
                <ArrowTrendingUpIcon className="h-5 w-5" />
              </div>
              <p className="text-sm text-white/80 mb-1">Total del Mes</p>
              <p className="text-3xl font-bold">${stats.total.toLocaleString('es-MX')}</p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-2">
                <ChartBarIcon className="h-8 w-8 text-blue-500" />
              </div>
              <p className="text-sm text-gray-600 mb-1">Ventas Personales</p>
              <p className="text-3xl font-bold text-gray-900">${stats.personal.toLocaleString('es-MX')}</p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-2">
                <ChartBarIcon className="h-8 w-8 text-purple-500" />
              </div>
              <p className="text-sm text-gray-600 mb-1">Comisiones de Equipo</p>
              <p className="text-3xl font-bold text-gray-900">${stats.team.toLocaleString('es-MX')}</p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-2">
                <BanknotesIcon className="h-8 w-8 text-orange-500" />
              </div>
              <p className="text-sm text-gray-600 mb-1">Bonos</p>
              <p className="text-3xl font-bold text-gray-900">${stats.bonuses.toLocaleString('es-MX')}</p>
            </CardContent>
          </Card>
        </div>

        {/* Payment Status */}
        <div className="grid md:grid-cols-2 gap-6 mb-8">
          <Card className="bg-green-50 border-green-200">
            <CardContent className="p-6">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                  <CheckCircleIcon className="h-6 w-6 text-green-600" />
                </div>
                <div className="flex-1">
                  <h3 className="font-bold text-green-900 mb-1">Pagado este Mes</h3>
                  <p className="text-3xl font-bold text-green-600">
                    ${stats.paid.toLocaleString('es-MX')}
                  </p>
                  <p className="text-sm text-green-700 mt-2">
                    Último pago: 25 de Enero, 2025
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-yellow-50 border-yellow-200">
            <CardContent className="p-6">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 bg-yellow-100 rounded-full flex items-center justify-center">
                  <ClockIcon className="h-6 w-6 text-yellow-600" />
                </div>
                <div className="flex-1">
                  <h3 className="font-bold text-yellow-900 mb-1">Pendiente de Pago</h3>
                  <p className="text-3xl font-bold text-yellow-600">
                    ${stats.pending.toLocaleString('es-MX')}
                  </p>
                  <p className="text-sm text-yellow-700 mt-2">
                    Próximo pago: 5 de Febrero, 2025
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters & Actions */}
        <Card className="mb-6">
          <CardContent className="p-6">
            <div className="flex flex-col lg:flex-row gap-4 items-start lg:items-center justify-between">
              <div className="flex flex-wrap gap-3 flex-1">
                {/* Month Selector */}
                <select
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(e.target.value)}
                  className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#7AB82E] focus:border-transparent"
                >
                  <option value="january">Enero 2025</option>
                  <option value="december">Diciembre 2024</option>
                </select>

                {/* Type Filter */}
                <select
                  value={filterType}
                  onChange={(e) => setFilterType(e.target.value)}
                  className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#7AB82E] focus:border-transparent"
                >
                  <option value="all">Todos los tipos</option>
                  <option value="Venta Personal">Ventas Personales</option>
                  <option value="Venta de Red (Nivel 1)">Nivel 1</option>
                  <option value="Venta de Red (Nivel 2)">Nivel 2</option>
                  <option value="Bono de Rango">Bonos</option>
                </select>

                {/* Status Filter */}
                <select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                  className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#7AB82E] focus:border-transparent"
                >
                  <option value="all">Todos los estados</option>
                  <option value="paid">Pagadas</option>
                  <option value="pending">Pendientes</option>
                </select>
              </div>

              {/* Actions */}
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  leftIcon={<ArrowDownTrayIcon className="h-4 w-4" />}
                  onClick={handleDownloadStatement}
                >
                  Descargar
                </Button>
                {stats.pending > 0 && (
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={handleRequestPayment}
                  >
                    Solicitar Pago
                  </Button>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Commissions Table */}
        <Card>
          <CardContent className="p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-6">
              Historial de Comisiones
            </h2>

            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-3 px-4 text-sm font-semibold text-gray-600">Fecha</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-gray-600">Tipo</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-gray-600">Detalle</th>
                    <th className="text-right py-3 px-4 text-sm font-semibold text-gray-600">Monto Venta</th>
                    <th className="text-right py-3 px-4 text-sm font-semibold text-gray-600">%</th>
                    <th className="text-right py-3 px-4 text-sm font-semibold text-gray-600">Comisión</th>
                    <th className="text-center py-3 px-4 text-sm font-semibold text-gray-600">Estado</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredCommissions.map((comm) => {
                    const status = statusConfig[comm.status as keyof typeof statusConfig];
                    return (
                      <tr key={comm.id} className="border-b hover:bg-gray-50">
                        <td className="py-4 px-4">
                          <div className="flex items-center gap-2">
                            <CalendarIcon className="h-4 w-4 text-gray-400" />
                            <span className="text-sm text-gray-900">
                              {new Date(comm.date).toLocaleDateString('es-MX', {
                                day: 'numeric',
                                month: 'short'
                              })}
                            </span>
                          </div>
                        </td>
                        <td className="py-4 px-4">
                          <span className="text-sm text-gray-900">{comm.type}</span>
                        </td>
                        <td className="py-4 px-4">
                          <div className="text-sm">
                            {comm.customer && (
                              <p className="text-gray-900">Cliente: {comm.customer}</p>
                            )}
                            {comm.distributor && (
                              <p className="text-gray-900">Dist: {comm.distributor}</p>
                            )}
                            {comm.description && (
                              <p className="text-gray-900">{comm.description}</p>
                            )}
                            {comm.orderId && (
                              <p className="text-xs text-gray-500">{comm.orderId}</p>
                            )}
                          </div>
                        </td>
                        <td className="py-4 px-4 text-right">
                          <span className="text-sm font-medium text-gray-900">
                            ${comm.amount.toLocaleString('es-MX')}
                          </span>
                        </td>
                        <td className="py-4 px-4 text-right">
                          <span className="text-sm text-gray-600">{comm.rate}%</span>
                        </td>
                        <td className="py-4 px-4 text-right">
                          <span className="text-sm font-bold text-[#7AB82E]">
                            +${comm.commission.toLocaleString('es-MX')}
                          </span>
                        </td>
                        <td className="py-4 px-4 text-center">
                          <span className={`inline-flex px-3 py-1 rounded-full text-xs font-medium ${status.color}`}>
                            {status.label}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot>
                  <tr className="bg-gray-50 font-bold">
                    <td colSpan={5} className="py-4 px-4 text-right">
                      Total mostrado:
                    </td>
                    <td className="py-4 px-4 text-right text-[#003B7A]">
                      ${filteredCommissions.reduce((sum, c) => sum + c.commission, 0).toLocaleString('es-MX')}
                    </td>
                    <td></td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </CardContent>
        </Card>

        {/* Commission Structure Info */}
        <Card className="mt-8">
          <CardContent className="p-8">
            <h3 className="text-xl font-bold text-gray-900 mb-6">
              Estructura de Comisiones
            </h3>

            <div className="grid md:grid-cols-3 gap-6">
              <div className="p-6 bg-blue-50 rounded-lg">
                <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mb-4">
                  <ChartBarIcon className="h-6 w-6 text-blue-600" />
                </div>
                <h4 className="font-bold text-blue-900 mb-2">Ventas Personales</h4>
                <p className="text-3xl font-bold text-blue-600 mb-2">25%</p>
                <p className="text-sm text-blue-800">
                  Gana el 25% de comisión en todas tus ventas directas
                </p>
              </div>

              <div className="p-6 bg-purple-50 rounded-lg">
                <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center mb-4">
                  <ChartBarIcon className="h-6 w-6 text-purple-600" />
                </div>
                <h4 className="font-bold text-purple-900 mb-2">Nivel 1</h4>
                <p className="text-3xl font-bold text-purple-600 mb-2">10%</p>
                <p className="text-sm text-purple-800">
                  Comisión sobre ventas de distribuidores que referiste directamente
                </p>
              </div>

              <div className="p-6 bg-orange-50 rounded-lg">
                <div className="w-12 h-12 bg-orange-100 rounded-full flex items-center justify-center mb-4">
                  <ChartBarIcon className="h-6 w-6 text-orange-600" />
                </div>
                <h4 className="font-bold text-orange-900 mb-2">Nivel 2</h4>
                <p className="text-3xl font-bold text-orange-600 mb-2">5%</p>
                <p className="text-sm text-orange-800">
                  Comisión sobre ventas de distribuidores en segundo nivel
                </p>
              </div>
            </div>

            <div className="mt-6 p-6 bg-gradient-to-r from-[#7AB82E] to-[#7AB82E]/90 rounded-lg text-white">
              <h4 className="font-bold text-lg mb-2">Bonos de Rango</h4>
              <p className="text-white/90">
                Además de las comisiones por ventas, recibe bonos especiales al alcanzar nuevos rangos.
                ¡Consulta los requisitos completos en tu dashboard!
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
