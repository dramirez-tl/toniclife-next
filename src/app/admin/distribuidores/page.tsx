'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
  MagnifyingGlassIcon,
  FunnelIcon,
  PlusIcon,
  UserGroupIcon,
  TrophyIcon,
  BanknotesIcon,
  ChartBarIcon,
  EnvelopeIcon,
  PhoneIcon,
  MapPinIcon,
  CheckCircleIcon,
  XCircleIcon,
  EyeIcon,
  PencilIcon,
  ArrowTrendingUpIcon,
  ArrowTrendingDownIcon,
} from '@heroicons/react/24/outline';
import { StarIcon } from '@heroicons/react/24/solid';

const distributors = [
  {
    id: 'DIST-001',
    name: 'Carlos Mendoza',
    email: 'carlos.mendoza@email.com',
    phone: '+52 55 1111 2222',
    country: 'México',
    city: 'Ciudad de México',
    level: 'Diamond',
    rank: 'Executive Director',
    enrollmentDate: '2022-03-15',
    status: 'active',
    stats: {
      personalSales: 45600.00,
      teamSales: 234500.00,
      teamSize: 87,
      activeMembers: 72,
      monthlyGrowth: 15.5,
      commissions: 23450.00,
      rank: 1
    },
    performance: {
      lastMonthSales: 12400.00,
      thisMonthSales: 14200.00,
      trend: 'up'
    }
  },
  {
    id: 'DIST-002',
    name: 'Ana Rodríguez',
    email: 'ana.rodriguez@email.com',
    phone: '+52 55 2222 3333',
    country: 'México',
    city: 'Guadalajara',
    level: 'Gold',
    rank: 'Senior Manager',
    enrollmentDate: '2022-08-20',
    status: 'active',
    stats: {
      personalSales: 32400.00,
      teamSales: 156300.00,
      teamSize: 45,
      activeMembers: 38,
      monthlyGrowth: 12.3,
      commissions: 15630.00,
      rank: 2
    },
    performance: {
      lastMonthSales: 10200.00,
      thisMonthSales: 11800.00,
      trend: 'up'
    }
  },
  {
    id: 'DIST-003',
    name: 'Roberto Sánchez',
    email: 'roberto.sanchez@email.com',
    phone: '+52 55 3333 4444',
    country: 'México',
    city: 'Monterrey',
    level: 'Silver',
    rank: 'Manager',
    enrollmentDate: '2023-01-10',
    status: 'active',
    stats: {
      personalSales: 28900.00,
      teamSales: 98700.00,
      teamSize: 32,
      activeMembers: 28,
      monthlyGrowth: 8.7,
      commissions: 9870.00,
      rank: 3
    },
    performance: {
      lastMonthSales: 9800.00,
      thisMonthSales: 10100.00,
      trend: 'up'
    }
  },
  {
    id: 'DIST-004',
    name: 'Laura Martínez',
    email: 'laura.martinez@email.com',
    phone: '+52 55 4444 5555',
    country: 'México',
    city: 'Puebla',
    level: 'Bronze',
    rank: 'Consultant',
    enrollmentDate: '2023-06-05',
    status: 'active',
    stats: {
      personalSales: 15600.00,
      teamSales: 45200.00,
      teamSize: 18,
      activeMembers: 15,
      monthlyGrowth: 22.1,
      commissions: 4520.00,
      rank: 5
    },
    performance: {
      lastMonthSales: 3200.00,
      thisMonthSales: 4100.00,
      trend: 'up'
    }
  },
  {
    id: 'DIST-005',
    name: 'Miguel Torres',
    email: 'miguel.torres@email.com',
    phone: '+52 55 5555 6666',
    country: 'México',
    city: 'Querétaro',
    level: 'Silver',
    rank: 'Manager',
    enrollmentDate: '2023-02-28',
    status: 'active',
    stats: {
      personalSales: 22300.00,
      teamSales: 78900.00,
      teamSize: 25,
      activeMembers: 21,
      monthlyGrowth: -3.2,
      commissions: 7890.00,
      rank: 4
    },
    performance: {
      lastMonthSales: 8500.00,
      thisMonthSales: 7800.00,
      trend: 'down'
    }
  },
  {
    id: 'DIST-006',
    name: 'Patricia Gómez',
    email: 'patricia.gomez@email.com',
    phone: '+52 55 6666 7777',
    country: 'México',
    city: 'Mérida',
    level: 'Gold',
    rank: 'Senior Manager',
    enrollmentDate: '2022-11-12',
    status: 'active',
    stats: {
      personalSales: 34200.00,
      teamSales: 167800.00,
      teamSize: 52,
      activeMembers: 44,
      monthlyGrowth: 18.9,
      commissions: 16780.00,
      rank: 2
    },
    performance: {
      lastMonthSales: 11200.00,
      thisMonthSales: 13800.00,
      trend: 'up'
    }
  },
  {
    id: 'DIST-007',
    name: 'Diego Ramírez',
    email: 'diego.ramirez@email.com',
    phone: '+52 55 7777 8888',
    country: 'México',
    city: 'Cancún',
    level: 'Bronze',
    rank: 'Associate',
    enrollmentDate: '2023-09-18',
    status: 'inactive',
    stats: {
      personalSales: 8900.00,
      teamSales: 23400.00,
      teamSize: 9,
      activeMembers: 6,
      monthlyGrowth: -12.5,
      commissions: 2340.00,
      rank: 8
    },
    performance: {
      lastMonthSales: 3400.00,
      thisMonthSales: 2100.00,
      trend: 'down'
    }
  },
  {
    id: 'DIST-008',
    name: 'Sofía Hernández',
    email: 'sofia.hernandez@email.com',
    phone: '+52 55 8888 9999',
    country: 'México',
    city: 'Tijuana',
    level: 'Silver',
    rank: 'Manager',
    enrollmentDate: '2023-04-22',
    status: 'active',
    stats: {
      personalSales: 26700.00,
      teamSales: 112300.00,
      teamSize: 38,
      activeMembers: 32,
      monthlyGrowth: 10.4,
      commissions: 11230.00,
      rank: 3
    },
    performance: {
      lastMonthSales: 9200.00,
      thisMonthSales: 10600.00,
      trend: 'up'
    }
  }
];

const levelColors: Record<string, string> = {
  'Diamond': 'bg-blue-100 text-blue-800',
  'Gold': 'bg-yellow-100 text-yellow-800',
  'Silver': 'bg-gray-100 text-gray-800',
  'Bronze': 'bg-orange-100 text-orange-800'
};

export default function DistribuidoresAdminPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterLevel, setFilterLevel] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [sortBy, setSortBy] = useState('rank');

  const filteredDistributors = distributors
    .filter(d => {
      const matchesSearch =
        d.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        d.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
        d.id.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesLevel = filterLevel === 'all' || d.level === filterLevel;
      const matchesStatus = filterStatus === 'all' || d.status === filterStatus;
      return matchesSearch && matchesLevel && matchesStatus;
    })
    .sort((a, b) => {
      switch (sortBy) {
        case 'rank':
          return a.stats.rank - b.stats.rank;
        case 'sales':
          return b.stats.teamSales - a.stats.teamSales;
        case 'growth':
          return b.stats.monthlyGrowth - a.stats.monthlyGrowth;
        case 'team':
          return b.stats.teamSize - a.stats.teamSize;
        default:
          return 0;
      }
    });

  const totalStats = {
    totalDistributors: distributors.length,
    activeDistributors: distributors.filter(d => d.status === 'active').length,
    totalSales: distributors.reduce((sum, d) => sum + d.stats.teamSales, 0),
    totalCommissions: distributors.reduce((sum, d) => sum + d.stats.commissions, 0),
    averageTeamSize: Math.round(
      distributors.reduce((sum, d) => sum + d.stats.teamSize, 0) / distributors.length
    ),
    averageGrowth: (
      distributors.reduce((sum, d) => sum + d.stats.monthlyGrowth, 0) / distributors.length
    ).toFixed(1)
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Distribuidores</h1>
              <p className="text-gray-600">Gestiona y monitorea la red de distribuidores</p>
            </div>
            <Link
              href="/admin/distribuidores/nuevo"
              className="flex items-center gap-2 px-4 py-2 bg-[#003B7A] text-white rounded-lg hover:bg-[#002855] transition-colors"
            >
              <PlusIcon className="h-5 w-5" />
              Nuevo Distribuidor
            </Link>
          </div>
        </div>
      </div>

      {/* Stats Overview */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center gap-2 mb-2">
              <UserGroupIcon className="h-5 w-5 text-[#003B7A]" />
              <span className="text-sm text-gray-600">Total</span>
            </div>
            <p className="text-2xl font-bold text-gray-900">{totalStats.totalDistributors}</p>
            <p className="text-xs text-gray-500 mt-1">distribuidores</p>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center gap-2 mb-2">
              <CheckCircleIcon className="h-5 w-5 text-green-500" />
              <span className="text-sm text-gray-600">Activos</span>
            </div>
            <p className="text-2xl font-bold text-gray-900">{totalStats.activeDistributors}</p>
            <p className="text-xs text-gray-500 mt-1">
              {((totalStats.activeDistributors / totalStats.totalDistributors) * 100).toFixed(0)}% del total
            </p>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center gap-2 mb-2">
              <BanknotesIcon className="h-5 w-5 text-[#7AB82E]" />
              <span className="text-sm text-gray-600">Ventas</span>
            </div>
            <p className="text-2xl font-bold text-gray-900">
              ${(totalStats.totalSales / 1000).toFixed(0)}K
            </p>
            <p className="text-xs text-gray-500 mt-1">ventas totales</p>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center gap-2 mb-2">
              <TrophyIcon className="h-5 w-5 text-yellow-500" />
              <span className="text-sm text-gray-600">Comisiones</span>
            </div>
            <p className="text-2xl font-bold text-gray-900">
              ${(totalStats.totalCommissions / 1000).toFixed(0)}K
            </p>
            <p className="text-xs text-gray-500 mt-1">pagadas</p>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center gap-2 mb-2">
              <UserGroupIcon className="h-5 w-5 text-purple-500" />
              <span className="text-sm text-gray-600">Equipo Prom.</span>
            </div>
            <p className="text-2xl font-bold text-gray-900">{totalStats.averageTeamSize}</p>
            <p className="text-xs text-gray-500 mt-1">miembros</p>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center gap-2 mb-2">
              <ChartBarIcon className="h-5 w-5 text-blue-500" />
              <span className="text-sm text-gray-600">Crecimiento</span>
            </div>
            <p className="text-2xl font-bold text-gray-900">{totalStats.averageGrowth}%</p>
            <p className="text-xs text-gray-500 mt-1">promedio mensual</p>
          </div>
        </div>

        {/* Filters and Search */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="md:col-span-2">
              <div className="relative">
                <MagnifyingGlassIcon className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Buscar por nombre, email o ID..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#003B7A]"
                />
              </div>
            </div>

            <div>
              <select
                value={filterLevel}
                onChange={(e) => setFilterLevel(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#003B7A]"
              >
                <option value="all">Todos los Niveles</option>
                <option value="Diamond">Diamond</option>
                <option value="Gold">Gold</option>
                <option value="Silver">Silver</option>
                <option value="Bronze">Bronze</option>
              </select>
            </div>

            <div>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#003B7A]"
              >
                <option value="rank">Ordenar por Ranking</option>
                <option value="sales">Ordenar por Ventas</option>
                <option value="growth">Ordenar por Crecimiento</option>
                <option value="team">Ordenar por Equipo</option>
              </select>
            </div>
          </div>
        </div>

        {/* Distributors Table */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Rank
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Distribuidor
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Nivel
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Ubicación
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Equipo
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Ventas del Equipo
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Crecimiento
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Estado
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Acciones
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredDistributors.map((distributor) => (
                  <tr key={distributor.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        {distributor.stats.rank <= 3 && (
                          <StarIcon className="h-5 w-5 text-yellow-500" />
                        )}
                        <span className="text-sm font-bold text-gray-900">
                          #{distributor.stats.rank}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <div className="text-sm font-medium text-gray-900">
                          {distributor.name}
                        </div>
                        <div className="text-sm text-gray-500">{distributor.email}</div>
                        <div className="text-xs text-gray-400">{distributor.id}</div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <span className={`px-3 py-1 rounded-full text-xs font-medium ${levelColors[distributor.level]}`}>
                          {distributor.level}
                        </span>
                        <div className="text-xs text-gray-600 mt-1">{distributor.rank}</div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{distributor.city}</div>
                      <div className="text-xs text-gray-500">{distributor.country}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">
                        {distributor.stats.teamSize} miembros
                      </div>
                      <div className="text-xs text-gray-500">
                        {distributor.stats.activeMembers} activos
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-bold text-gray-900">
                        ${(distributor.stats.teamSales / 1000).toFixed(1)}K
                      </div>
                      <div className="text-xs text-gray-500">
                        Personal: ${(distributor.stats.personalSales / 1000).toFixed(1)}K
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-1">
                        {distributor.performance.trend === 'up' ? (
                          <ArrowTrendingUpIcon className="h-4 w-4 text-green-500" />
                        ) : (
                          <ArrowTrendingDownIcon className="h-4 w-4 text-red-500" />
                        )}
                        <span className={`text-sm font-medium ${
                          distributor.stats.monthlyGrowth >= 0 ? 'text-green-600' : 'text-red-600'
                        }`}>
                          {distributor.stats.monthlyGrowth >= 0 ? '+' : ''}
                          {distributor.stats.monthlyGrowth}%
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                        distributor.status === 'active'
                          ? 'bg-green-100 text-green-800'
                          : 'bg-gray-100 text-gray-800'
                      }`}>
                        {distributor.status === 'active' ? 'Activo' : 'Inactivo'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <div className="flex items-center gap-2">
                        <Link
                          href={`/admin/distribuidores/${distributor.id}`}
                          className="p-1 text-[#003B7A] hover:bg-blue-50 rounded"
                        >
                          <EyeIcon className="h-5 w-5" />
                        </Link>
                        <button className="p-1 text-gray-600 hover:bg-gray-50 rounded">
                          <EnvelopeIcon className="h-5 w-5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {filteredDistributors.length === 0 && (
            <div className="text-center py-12">
              <UserGroupIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600">No se encontraron distribuidores</p>
            </div>
          )}
        </div>

        {/* Pagination */}
        {filteredDistributors.length > 0 && (
          <div className="mt-6 flex items-center justify-between">
            <p className="text-sm text-gray-700">
              Mostrando <span className="font-medium">{filteredDistributors.length}</span> de{' '}
              <span className="font-medium">{distributors.length}</span> distribuidores
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
