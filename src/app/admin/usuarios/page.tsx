'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/Button';
import { Card, CardContent } from '@/components/ui/Card';
import {
  UserGroupIcon,
  MagnifyingGlassIcon,
  FunnelIcon,
  PlusIcon,
  PencilIcon,
  TrashIcon,
  CheckCircleIcon,
  XCircleIcon,
  ArrowDownTrayIcon,
  ShieldCheckIcon,
  UserIcon,
  BuildingStorefrontIcon,
  ChartBarIcon,
} from '@heroicons/react/24/outline';
import { toast } from 'sonner';

const mockUsers = [
  {
    id: '1',
    name: 'Patricia González',
    email: 'patricia.gonzalez@email.com',
    role: 'distributor',
    status: 'active',
    registrationDate: '2024-01-15',
    lastLogin: '2025-01-25T14:30:00',
    totalOrders: 45,
    totalSpent: 23500,
    team: 12,
    avatar: 'https://ui-avatars.com/api/?name=Patricia+González',
  },
  {
    id: '2',
    name: 'Laura Mendoza',
    email: 'laura.mendoza@email.com',
    role: 'distributor',
    status: 'active',
    registrationDate: '2023-11-20',
    lastLogin: '2025-01-25T16:45:00',
    totalOrders: 125,
    totalSpent: 125000,
    team: 45,
    avatar: 'https://ui-avatars.com/api/?name=Laura+Mendoza',
  },
  {
    id: '3',
    name: 'Carlos Ramírez',
    email: 'carlos.ramirez@email.com',
    role: 'customer',
    status: 'active',
    registrationDate: '2024-03-10',
    lastLogin: '2025-01-24T10:20:00',
    totalOrders: 8,
    totalSpent: 3200,
    team: 0,
    avatar: 'https://ui-avatars.com/api/?name=Carlos+Ramírez',
  },
  {
    id: '4',
    name: 'Ana Martínez',
    email: 'ana.martinez@email.com',
    role: 'distributor',
    status: 'active',
    registrationDate: '2024-06-05',
    lastLogin: '2025-01-25T09:15:00',
    totalOrders: 32,
    totalSpent: 15800,
    team: 8,
    avatar: 'https://ui-avatars.com/api/?name=Ana+Martínez',
  },
  {
    id: '5',
    name: 'Miguel Torres',
    email: 'miguel.torres@email.com',
    role: 'customer',
    status: 'inactive',
    registrationDate: '2024-02-20',
    lastLogin: '2024-12-10T15:30:00',
    totalOrders: 3,
    totalSpent: 1200,
    team: 0,
    avatar: 'https://ui-avatars.com/api/?name=Miguel+Torres',
  },
  {
    id: '6',
    name: 'Diana Flores',
    email: 'diana.flores@email.com',
    role: 'distributor',
    status: 'active',
    registrationDate: '2024-04-12',
    lastLogin: '2025-01-25T11:00:00',
    totalOrders: 58,
    totalSpent: 28900,
    team: 18,
    avatar: 'https://ui-avatars.com/api/?name=Diana+Flores',
  },
  {
    id: '7',
    name: 'Roberto Sánchez',
    email: 'roberto.sanchez@email.com',
    role: 'admin',
    status: 'active',
    registrationDate: '2023-09-01',
    lastLogin: '2025-01-25T17:00:00',
    totalOrders: 0,
    totalSpent: 0,
    team: 0,
    avatar: 'https://ui-avatars.com/api/?name=Roberto+Sánchez',
  },
  {
    id: '8',
    name: 'Sofía Ramírez',
    email: 'sofia.ramirez@email.com',
    role: 'customer',
    status: 'active',
    registrationDate: '2024-07-22',
    lastLogin: '2025-01-23T14:20:00',
    totalOrders: 15,
    totalSpent: 7800,
    team: 0,
    avatar: 'https://ui-avatars.com/api/?name=Sofía+Ramírez',
  },
  {
    id: '9',
    name: 'Fernando García',
    email: 'fernando.garcia@email.com',
    role: 'distributor',
    status: 'pending',
    registrationDate: '2025-01-20',
    lastLogin: '2025-01-25T08:30:00',
    totalOrders: 2,
    totalSpent: 980,
    team: 0,
    avatar: 'https://ui-avatars.com/api/?name=Fernando+García',
  },
  {
    id: '10',
    name: 'Gabriela López',
    email: 'gabriela.lopez@email.com',
    role: 'customer',
    status: 'active',
    registrationDate: '2024-05-18',
    lastLogin: '2025-01-24T16:45:00',
    totalOrders: 12,
    totalSpent: 5600,
    team: 0,
    avatar: 'https://ui-avatars.com/api/?name=Gabriela+López',
  },
];

export default function UsuariosPage() {
  const [users, setUsers] = useState(mockUsers);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterRole, setFilterRole] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');

  const filteredUsers = users.filter(user => {
    const matchesSearch = user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         user.email.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesRole = filterRole === 'all' || user.role === filterRole;
    const matchesStatus = filterStatus === 'all' || user.status === filterStatus;
    return matchesSearch && matchesRole && matchesStatus;
  });

  const stats = {
    total: users.length,
    active: users.filter(u => u.status === 'active').length,
    distributors: users.filter(u => u.role === 'distributor').length,
    customers: users.filter(u => u.role === 'customer').length,
  };

  const handleActivateUser = (userId: string) => {
    setUsers(users.map(u =>
      u.id === userId ? { ...u, status: 'active' } : u
    ));
    toast.success('Usuario activado correctamente');
  };

  const handleDeactivateUser = (userId: string) => {
    setUsers(users.map(u =>
      u.id === userId ? { ...u, status: 'inactive' } : u
    ));
    toast.success('Usuario desactivado correctamente');
  };

  const handleDeleteUser = (userId: string) => {
    setUsers(users.filter(u => u.id !== userId));
    toast.success('Usuario eliminado correctamente');
  };

  const handleExport = () => {
    toast.success('Exportando datos de usuarios...');
  };

  const getRoleBadge = (role: string) => {
    switch (role) {
      case 'admin':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-1 bg-purple-100 text-purple-700 rounded-full text-xs font-medium">
            <ShieldCheckIcon className="h-3 w-3" />
            Admin
          </span>
        );
      case 'distributor':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-1 bg-blue-100 text-blue-700 rounded-full text-xs font-medium">
            <BuildingStorefrontIcon className="h-3 w-3" />
            Distribuidor
          </span>
        );
      case 'customer':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-1 bg-gray-100 text-gray-700 rounded-full text-xs font-medium">
            <UserIcon className="h-3 w-3" />
            Cliente
          </span>
        );
      default:
        return null;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-1 bg-green-100 text-green-700 rounded-full text-xs font-medium">
            <CheckCircleIcon className="h-3 w-3" />
            Activo
          </span>
        );
      case 'inactive':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-1 bg-gray-100 text-gray-700 rounded-full text-xs font-medium">
            <XCircleIcon className="h-3 w-3" />
            Inactivo
          </span>
        );
      case 'pending':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-1 bg-yellow-100 text-yellow-700 rounded-full text-xs font-medium">
            <ChartBarIcon className="h-3 w-3" />
            Pendiente
          </span>
        );
      default:
        return null;
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('es-MX', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: 'MXN',
    }).format(amount);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-gradient-to-r from-[#003B7A] to-[#003B7A]/90 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <UserGroupIcon className="h-10 w-10" />
                <h1 className="text-4xl font-bold">Gestión de Usuarios</h1>
              </div>
              <p className="text-white/80 text-lg">
                Administra usuarios, roles y permisos del sistema
              </p>
            </div>
            <div className="flex gap-3">
              <Link href="/admin">
                <Button variant="secondary">
                  Volver al Dashboard
                </Button>
              </Link>
              <Button
                variant="primary"
                leftIcon={<PlusIcon className="h-5 w-5" />}
                onClick={() => toast.info('Función próximamente disponible')}
              >
                Nuevo Usuario
              </Button>
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
                  <p className="text-sm text-gray-600 mb-1">Total Usuarios</p>
                  <p className="text-3xl font-bold text-gray-900">{stats.total}</p>
                </div>
                <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                  <UserGroupIcon className="h-6 w-6 text-blue-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 mb-1">Usuarios Activos</p>
                  <p className="text-3xl font-bold text-green-600">{stats.active}</p>
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
                  <p className="text-sm text-gray-600 mb-1">Distribuidores</p>
                  <p className="text-3xl font-bold text-blue-600">{stats.distributors}</p>
                </div>
                <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                  <BuildingStorefrontIcon className="h-6 w-6 text-blue-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 mb-1">Clientes</p>
                  <p className="text-3xl font-bold text-gray-900">{stats.customers}</p>
                </div>
                <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center">
                  <UserIcon className="h-6 w-6 text-gray-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

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
                    placeholder="Buscar por nombre o email..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#003B7A] focus:border-transparent"
                  />
                </div>
              </div>

              {/* Role Filter */}
              <div className="flex items-center gap-2">
                <FunnelIcon className="h-5 w-5 text-gray-400" />
                <select
                  value={filterRole}
                  onChange={(e) => setFilterRole(e.target.value)}
                  className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#003B7A] focus:border-transparent"
                >
                  <option value="all">Todos los Roles</option>
                  <option value="admin">Admin</option>
                  <option value="distributor">Distribuidor</option>
                  <option value="customer">Cliente</option>
                </select>
              </div>

              {/* Status Filter */}
              <div>
                <select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                  className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#003B7A] focus:border-transparent"
                >
                  <option value="all">Todos los Estados</option>
                  <option value="active">Activos</option>
                  <option value="inactive">Inactivos</option>
                  <option value="pending">Pendientes</option>
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

        {/* Users Table */}
        <Card>
          <CardContent className="p-6">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-3 px-4 text-sm font-semibold text-gray-900">Usuario</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-gray-900">Rol</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-gray-900">Estado</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-gray-900">Registro</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-gray-900">Último Acceso</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-gray-900">Órdenes</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-gray-900">Gastado</th>
                    {filterRole === 'distributor' && (
                      <th className="text-left py-3 px-4 text-sm font-semibold text-gray-900">Equipo</th>
                    )}
                    <th className="text-right py-3 px-4 text-sm font-semibold text-gray-900">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredUsers.map((user) => (
                    <tr key={user.id} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                      <td className="py-4 px-4">
                        <div className="flex items-center gap-3">
                          <img
                            src={user.avatar}
                            alt={user.name}
                            className="w-10 h-10 rounded-full"
                          />
                          <div>
                            <p className="font-semibold text-gray-900">{user.name}</p>
                            <p className="text-sm text-gray-600">{user.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="py-4 px-4">
                        {getRoleBadge(user.role)}
                      </td>
                      <td className="py-4 px-4">
                        {getStatusBadge(user.status)}
                      </td>
                      <td className="py-4 px-4 text-sm text-gray-600">
                        {formatDate(user.registrationDate)}
                      </td>
                      <td className="py-4 px-4 text-sm text-gray-600">
                        {formatDate(user.lastLogin)}
                      </td>
                      <td className="py-4 px-4 text-sm text-gray-900 font-medium">
                        {user.totalOrders}
                      </td>
                      <td className="py-4 px-4 text-sm text-gray-900 font-medium">
                        {formatCurrency(user.totalSpent)}
                      </td>
                      {filterRole === 'distributor' && (
                        <td className="py-4 px-4 text-sm text-gray-900 font-medium">
                          {user.team} miembros
                        </td>
                      )}
                      <td className="py-4 px-4">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => toast.info('Función próximamente disponible')}
                            className="p-2 hover:bg-blue-50 rounded-lg transition-colors"
                            title="Editar usuario"
                          >
                            <PencilIcon className="h-4 w-4 text-blue-600" />
                          </button>
                          {user.status === 'active' ? (
                            <button
                              onClick={() => handleDeactivateUser(user.id)}
                              className="p-2 hover:bg-yellow-50 rounded-lg transition-colors"
                              title="Desactivar usuario"
                            >
                              <XCircleIcon className="h-4 w-4 text-yellow-600" />
                            </button>
                          ) : (
                            <button
                              onClick={() => handleActivateUser(user.id)}
                              className="p-2 hover:bg-green-50 rounded-lg transition-colors"
                              title="Activar usuario"
                            >
                              <CheckCircleIcon className="h-4 w-4 text-green-600" />
                            </button>
                          )}
                          <button
                            onClick={() => handleDeleteUser(user.id)}
                            className="p-2 hover:bg-red-50 rounded-lg transition-colors"
                            title="Eliminar usuario"
                          >
                            <TrashIcon className="h-4 w-4 text-red-600" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {filteredUsers.length === 0 && (
              <div className="text-center py-12">
                <UserGroupIcon className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                <h3 className="text-xl font-bold text-gray-900 mb-2">
                  No se encontraron usuarios
                </h3>
                <p className="text-gray-600">
                  Intenta ajustar los filtros de búsqueda
                </p>
              </div>
            )}

            {/* Pagination */}
            {filteredUsers.length > 0 && (
              <div className="mt-6 flex items-center justify-between">
                <p className="text-sm text-gray-600">
                  Mostrando {filteredUsers.length} de {users.length} usuarios
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
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
