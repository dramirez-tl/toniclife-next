'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/Button';
import { Card, CardContent } from '@/components/ui/Card';
import {
  CurrencyDollarIcon,
  MagnifyingGlassIcon,
  FunnelIcon,
  ArrowDownTrayIcon,
  CheckCircleIcon,
  ClockIcon,
  XCircleIcon,
  UserIcon,
  CalendarIcon,
  BanknotesIcon,
  ChartBarIcon,
} from '@heroicons/react/24/outline';
import { toast } from 'sonner';

const mockCommissions = [
  {
    id: 'COM-2025-001',
    distributor: {
      name: 'Laura Mendoza',
      email: 'laura.mendoza@email.com',
      level: 'Diamond Elite',
    },
    period: '2025-01',
    personalSales: 125000,
    teamSales: 287000,
    totalSales: 412000,
    personalCommission: 15625,
    teamCommission: 28700,
    bonuses: 5000,
    totalCommission: 49325,
    status: 'pending',
    generatedAt: '2025-01-31T23:59:00',
    paymentDate: '2025-02-05',
  },
  {
    id: 'COM-2025-002',
    distributor: {
      name: 'Diana Flores',
      email: 'diana.flores@email.com',
      level: 'Gold',
    },
    period: '2025-01',
    personalSales: 98000,
    teamSales: 156000,
    totalSales: 254000,
    personalCommission: 12250,
    teamCommission: 15600,
    bonuses: 2000,
    totalCommission: 29850,
    status: 'pending',
    generatedAt: '2025-01-31T23:59:00',
    paymentDate: '2025-02-05',
  },
  {
    id: 'COM-2024-156',
    distributor: {
      name: 'Patricia González',
      email: 'patricia.gonzalez@email.com',
      level: 'Silver',
    },
    period: '2024-12',
    personalSales: 87000,
    teamSales: 98000,
    totalSales: 185000,
    personalCommission: 10875,
    teamCommission: 9800,
    bonuses: 1500,
    totalCommission: 22175,
    status: 'paid',
    generatedAt: '2024-12-31T23:59:00',
    paymentDate: '2025-01-05',
    paidAt: '2025-01-05T10:30:00',
  },
  {
    id: 'COM-2024-155',
    distributor: {
      name: 'Ana Martínez',
      email: 'ana.martinez@email.com',
      level: 'Silver',
    },
    period: '2024-12',
    personalSales: 76000,
    teamSales: 67000,
    totalSales: 143000,
    personalCommission: 9500,
    teamCommission: 6700,
    bonuses: 1000,
    totalCommission: 17200,
    status: 'paid',
    generatedAt: '2024-12-31T23:59:00',
    paymentDate: '2025-01-05',
    paidAt: '2025-01-05T10:30:00',
  },
  {
    id: 'COM-2024-154',
    distributor: {
      name: 'Fernando García',
      email: 'fernando.garcia@email.com',
      level: 'Bronze',
    },
    period: '2024-12',
    personalSales: 54000,
    teamSales: 23000,
    totalSales: 77000,
    personalCommission: 6750,
    teamCommission: 2300,
    bonuses: 500,
    totalCommission: 9550,
    status: 'paid',
    generatedAt: '2024-12-31T23:59:00',
    paymentDate: '2025-01-05',
    paidAt: '2025-01-05T10:30:00',
  },
  {
    id: 'COM-2024-153',
    distributor: {
      name: 'Laura Mendoza',
      email: 'laura.mendoza@email.com',
      level: 'Diamond Elite',
    },
    period: '2024-11',
    personalSales: 112000,
    teamSales: 245000,
    totalSales: 357000,
    personalCommission: 14000,
    teamCommission: 24500,
    bonuses: 4500,
    totalCommission: 43000,
    status: 'paid',
    generatedAt: '2024-11-30T23:59:00',
    paymentDate: '2024-12-05',
    paidAt: '2024-12-05T09:15:00',
  },
  {
    id: 'COM-2024-152',
    distributor: {
      name: 'Diana Flores',
      email: 'diana.flores@email.com',
      level: 'Gold',
    },
    period: '2024-11',
    personalSales: 89000,
    teamSales: 134000,
    totalSales: 223000,
    personalCommission: 11125,
    teamCommission: 13400,
    bonuses: 1800,
    totalCommission: 26325,
    status: 'paid',
    generatedAt: '2024-11-30T23:59:00',
    paymentDate: '2024-12-05',
    paidAt: '2024-12-05T09:15:00',
  },
  {
    id: 'COM-2024-151',
    distributor: {
      name: 'Roberto Sánchez',
      email: 'roberto.sanchez@email.com',
      level: 'Bronze',
    },
    period: '2024-11',
    personalSales: 34000,
    teamSales: 12000,
    totalSales: 46000,
    personalCommission: 4250,
    teamCommission: 1200,
    bonuses: 0,
    totalCommission: 5450,
    status: 'cancelled',
    generatedAt: '2024-11-30T23:59:00',
    paymentDate: '2024-12-05',
    cancelledAt: '2024-12-03T14:20:00',
    cancelReason: 'Distribuidor dado de baja',
  },
];

const commissionRates = [
  { level: 'Bronze', personalRate: 12.5, teamRate: 10, minSales: 0 },
  { level: 'Silver', personalRate: 12.5, teamRate: 10, minSales: 50000 },
  { level: 'Gold', personalRate: 12.5, teamRate: 10, minSales: 80000 },
  { level: 'Diamond', personalRate: 12.5, teamRate: 10, minSales: 100000 },
  { level: 'Diamond Elite', personalRate: 12.5, teamRate: 10, minSales: 120000 },
];

export default function ComisionesPage() {
  const [commissions, setCommissions] = useState(mockCommissions);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterPeriod, setFilterPeriod] = useState('all');

  const filteredCommissions = commissions.filter(commission => {
    const matchesSearch = commission.distributor.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         commission.distributor.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         commission.id.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = filterStatus === 'all' || commission.status === filterStatus;
    const matchesPeriod = filterPeriod === 'all' || commission.period === filterPeriod;
    return matchesSearch && matchesStatus && matchesPeriod;
  });

  const stats = {
    pending: commissions.filter(c => c.status === 'pending'),
    paid: commissions.filter(c => c.status === 'paid'),
    cancelled: commissions.filter(c => c.status === 'cancelled'),
  };

  const totalPending = stats.pending.reduce((sum, c) => sum + c.totalCommission, 0);
  const totalPaid = stats.paid.reduce((sum, c) => sum + c.totalCommission, 0);
  const totalThisMonth = commissions
    .filter(c => c.period === '2025-01')
    .reduce((sum, c) => sum + c.totalCommission, 0);

  const handleApproveCommission = (commissionId: string) => {
    setCommissions(commissions.map(c =>
      c.id === commissionId ? { ...c, status: 'approved' as const } : c
    ));
    toast.success(`Comisión ${commissionId} aprobada para pago`);
  };

  const handleApproveAll = () => {
    setCommissions(commissions.map(c =>
      c.status === 'pending' ? { ...c, status: 'approved' as const } : c
    ));
    toast.success(`${stats.pending.length} comisiones aprobadas para pago`);
  };

  const handleExport = () => {
    toast.success('Exportando datos de comisiones...');
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-1 bg-yellow-100 text-yellow-700 rounded-full text-xs font-medium">
            <ClockIcon className="h-3 w-3" />
            Pendiente
          </span>
        );
      case 'approved':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-1 bg-blue-100 text-blue-700 rounded-full text-xs font-medium">
            <CheckCircleIcon className="h-3 w-3" />
            Aprobada
          </span>
        );
      case 'paid':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-1 bg-green-100 text-green-700 rounded-full text-xs font-medium">
            <CheckCircleIcon className="h-3 w-3" />
            Pagada
          </span>
        );
      case 'cancelled':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-1 bg-red-100 text-red-700 rounded-full text-xs font-medium">
            <XCircleIcon className="h-3 w-3" />
            Cancelada
          </span>
        );
      default:
        return null;
    }
  };

  const getLevelBadge = (level: string) => {
    const colors: Record<string, string> = {
      'Bronze': 'bg-orange-100 text-orange-700',
      'Silver': 'bg-gray-200 text-gray-700',
      'Gold': 'bg-yellow-100 text-yellow-700',
      'Diamond': 'bg-blue-100 text-blue-700',
      'Diamond Elite': 'bg-purple-100 text-purple-700',
    };
    return (
      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${colors[level] || 'bg-gray-100 text-gray-700'}`}>
        {level}
      </span>
    );
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: 'MXN',
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('es-MX', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const formatPeriod = (period: string) => {
    const [year, month] = period.split('-');
    const date = new Date(parseInt(year), parseInt(month) - 1);
    return date.toLocaleDateString('es-MX', {
      year: 'numeric',
      month: 'long',
    });
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
                <h1 className="text-4xl font-bold">Gestión de Comisiones</h1>
              </div>
              <p className="text-white/80 text-lg">
                Administra y procesa comisiones de distribuidores
              </p>
            </div>
            <div className="flex gap-3">
              <Link href="/admin">
                <Button variant="secondary">
                  Volver al Dashboard
                </Button>
              </Link>
              {stats.pending.length > 0 && (
                <Button
                  variant="primary"
                  leftIcon={<CheckCircleIcon className="h-5 w-5" />}
                  onClick={handleApproveAll}
                >
                  Aprobar Todas ({stats.pending.length})
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 mb-1">Pendientes de Pago</p>
                  <p className="text-3xl font-bold text-yellow-600">{formatCurrency(totalPending)}</p>
                  <p className="text-xs text-gray-500 mt-1">{stats.pending.length} comisiones</p>
                </div>
                <div className="w-12 h-12 bg-yellow-100 rounded-full flex items-center justify-center">
                  <ClockIcon className="h-6 w-6 text-yellow-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 mb-1">Total Pagado</p>
                  <p className="text-3xl font-bold text-green-600">{formatCurrency(totalPaid)}</p>
                  <p className="text-xs text-gray-500 mt-1">{stats.paid.length} comisiones</p>
                </div>
                <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                  <CheckCircleIcon className="h-6 w-6 text-green-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 mb-1">Este Mes (Enero)</p>
                  <p className="text-3xl font-bold text-[#003B7A]">{formatCurrency(totalThisMonth)}</p>
                  <p className="text-xs text-gray-500 mt-1">2 distribuidores</p>
                </div>
                <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                  <BanknotesIcon className="h-6 w-6 text-blue-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 mb-1">Promedio por Distribuidor</p>
                  <p className="text-3xl font-bold text-gray-900">
                    {formatCurrency(totalThisMonth / 2)}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">Mes actual</p>
                </div>
                <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center">
                  <ChartBarIcon className="h-6 w-6 text-purple-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Commission Rates Card */}
        <Card className="mb-6">
          <CardContent className="p-6">
            <h3 className="text-lg font-bold text-gray-900 mb-4">Tasas de Comisión por Nivel</h3>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-3 px-4 text-sm font-semibold text-gray-900">Nivel</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-gray-900">Comisión Personal</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-gray-900">Comisión Equipo</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-gray-900">Ventas Mínimas</th>
                  </tr>
                </thead>
                <tbody>
                  {commissionRates.map((rate) => (
                    <tr key={rate.level} className="border-b border-gray-100">
                      <td className="py-3 px-4">{getLevelBadge(rate.level)}</td>
                      <td className="py-3 px-4 text-sm font-semibold text-green-600">{rate.personalRate}%</td>
                      <td className="py-3 px-4 text-sm font-semibold text-blue-600">{rate.teamRate}%</td>
                      <td className="py-3 px-4 text-sm text-gray-900">{formatCurrency(rate.minSales)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        {/* Filters and Search */}
        <Card className="mb-6">
          <CardContent className="p-6">
            <div className="flex flex-col lg:flex-row gap-4">
              {/* Search */}
              <div className="flex-1">
                <div className="relative">
                  <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Buscar por nombre, email o ID..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#003B7A] focus:border-transparent"
                  />
                </div>
              </div>

              {/* Status Filter */}
              <div className="flex items-center gap-2">
                <FunnelIcon className="h-5 w-5 text-gray-400" />
                <select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                  className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#003B7A] focus:border-transparent"
                >
                  <option value="all">Todos los Estados</option>
                  <option value="pending">Pendientes</option>
                  <option value="approved">Aprobadas</option>
                  <option value="paid">Pagadas</option>
                  <option value="cancelled">Canceladas</option>
                </select>
              </div>

              {/* Period Filter */}
              <div>
                <select
                  value={filterPeriod}
                  onChange={(e) => setFilterPeriod(e.target.value)}
                  className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#003B7A] focus:border-transparent"
                >
                  <option value="all">Todos los Períodos</option>
                  <option value="2025-01">Enero 2025</option>
                  <option value="2024-12">Diciembre 2024</option>
                  <option value="2024-11">Noviembre 2024</option>
                </select>
              </div>

              {/* Export Button */}
              <Button
                variant="outline"
                leftIcon={<ArrowDownTrayIcon className="h-5 w-5" />}
                onClick={handleExport}
              >
                Exportar
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Commissions List */}
        <div className="space-y-4">
          {filteredCommissions.map((commission) => (
            <Card key={commission.id}>
              <CardContent className="p-6">
                <div className="flex flex-col lg:flex-row lg:items-start gap-6">
                  {/* Commission Info */}
                  <div className="flex-1">
                    <div className="flex items-start justify-between mb-4">
                      <div>
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="text-lg font-bold text-gray-900">{commission.id}</h3>
                          {getStatusBadge(commission.status)}
                          {getLevelBadge(commission.distributor.level)}
                        </div>
                        <div className="flex items-center gap-2 text-sm text-gray-600">
                          <UserIcon className="h-4 w-4" />
                          <span className="font-medium">{commission.distributor.name}</span>
                          <span className="text-gray-400">•</span>
                          <span>{commission.distributor.email}</span>
                        </div>
                        <div className="flex items-center gap-2 text-sm text-gray-600 mt-1">
                          <CalendarIcon className="h-4 w-4" />
                          <span className="font-medium">Período:</span>
                          <span>{formatPeriod(commission.period)}</span>
                          <span className="text-gray-400">•</span>
                          <span>Pago programado: {formatDate(commission.paymentDate)}</span>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-2xl font-bold text-[#003B7A]">
                          {formatCurrency(commission.totalCommission)}
                        </p>
                        <p className="text-sm text-gray-600">Comisión Total</p>
                      </div>
                    </div>

                    {/* Sales Breakdown */}
                    <div className="grid grid-cols-3 gap-4 bg-gray-50 rounded-lg p-4 mb-4">
                      <div>
                        <p className="text-xs text-gray-600 mb-1">Ventas Personales</p>
                        <p className="text-lg font-bold text-gray-900">{formatCurrency(commission.personalSales)}</p>
                        <p className="text-xs text-green-600 font-semibold mt-1">
                          Comisión: {formatCurrency(commission.personalCommission)}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-600 mb-1">Ventas de Equipo</p>
                        <p className="text-lg font-bold text-gray-900">{formatCurrency(commission.teamSales)}</p>
                        <p className="text-xs text-blue-600 font-semibold mt-1">
                          Comisión: {formatCurrency(commission.teamCommission)}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-600 mb-1">Bonos</p>
                        <p className="text-lg font-bold text-gray-900">{formatCurrency(commission.bonuses)}</p>
                        <p className="text-xs text-purple-600 font-semibold mt-1">
                          Total: {formatCurrency(commission.totalSales)}
                        </p>
                      </div>
                    </div>

                    {/* Additional Info */}
                    {commission.status === 'paid' && commission.paidAt && (
                      <p className="text-sm text-green-600">
                        ✓ Pagada el {formatDate(commission.paidAt)}
                      </p>
                    )}
                    {commission.status === 'cancelled' && commission.cancelReason && (
                      <p className="text-sm text-red-600">
                        ✗ Cancelada: {commission.cancelReason}
                      </p>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="lg:w-48 flex flex-col gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => toast.info('Función próximamente disponible')}
                      className="w-full justify-center"
                    >
                      Ver Detalles
                    </Button>
                    {commission.status === 'pending' && (
                      <Button
                        variant="primary"
                        size="sm"
                        leftIcon={<CheckCircleIcon className="h-4 w-4" />}
                        onClick={() => handleApproveCommission(commission.id)}
                        className="w-full justify-center"
                      >
                        Aprobar Pago
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="sm"
                      leftIcon={<ArrowDownTrayIcon className="h-4 w-4" />}
                      onClick={() => toast.success('Descargando recibo de comisión...')}
                      className="w-full justify-center"
                    >
                      Descargar Recibo
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {filteredCommissions.length === 0 && (
          <Card>
            <CardContent className="p-12">
              <div className="text-center">
                <CurrencyDollarIcon className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                <h3 className="text-xl font-bold text-gray-900 mb-2">
                  No se encontraron comisiones
                </h3>
                <p className="text-gray-600">
                  Intenta ajustar los filtros de búsqueda
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Pagination */}
        {filteredCommissions.length > 0 && (
          <div className="mt-6 flex items-center justify-between">
            <p className="text-sm text-gray-600">
              Mostrando {filteredCommissions.length} de {commissions.length} comisiones
            </p>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" disabled>
                Anterior
              </Button>
              <Button variant="outline" size="sm" disabled>
                Siguiente
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
