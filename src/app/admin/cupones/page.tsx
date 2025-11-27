'use client';

import { useState } from 'react';
import {
  MagnifyingGlassIcon,
  PlusIcon,
  TicketIcon,
  CheckCircleIcon,
  XCircleIcon,
  ClockIcon,
  PencilIcon,
  TrashIcon,
  DocumentDuplicateIcon,
  CalendarIcon,
  TagIcon,
  PercentBadgeIcon,
  BanknotesIcon,
  UserGroupIcon,
  ShoppingBagIcon,
} from '@heroicons/react/24/outline';
import { toast } from 'sonner';

const coupons = [
  {
    id: 'CPN-001',
    code: 'WELCOME10',
    description: 'Cupón de bienvenida para nuevos clientes',
    type: 'percentage',
    value: 10,
    minPurchase: 50.00,
    maxDiscount: null,
    usageLimit: 1000,
    usedCount: 247,
    startDate: '2024-01-01',
    endDate: '2024-12-31',
    status: 'active',
    applicableTo: 'all',
    categories: [],
    products: [],
    userRestriction: 'new',
    stackable: false
  },
  {
    id: 'CPN-002',
    code: 'SPRING25',
    description: 'Promoción de primavera - 25% en productos seleccionados',
    type: 'percentage',
    value: 25,
    minPurchase: 100.00,
    maxDiscount: 50.00,
    usageLimit: 500,
    usedCount: 156,
    startDate: '2024-03-01',
    endDate: '2024-05-31',
    status: 'active',
    applicableTo: 'categories',
    categories: ['Vitaminas', 'Suplementos'],
    products: [],
    userRestriction: 'all',
    stackable: false
  },
  {
    id: 'CPN-003',
    code: 'FREESHIP',
    description: 'Envío gratis en pedidos mayores a $75',
    type: 'free_shipping',
    value: 0,
    minPurchase: 75.00,
    maxDiscount: null,
    usageLimit: null,
    usedCount: 1243,
    startDate: '2024-01-01',
    endDate: null,
    status: 'active',
    applicableTo: 'all',
    categories: [],
    products: [],
    userRestriction: 'all',
    stackable: true
  },
  {
    id: 'CPN-004',
    code: 'BUNDLE50',
    description: '$50 de descuento en bundles premium',
    type: 'fixed',
    value: 50.00,
    minPurchase: 200.00,
    maxDiscount: null,
    usageLimit: 200,
    usedCount: 89,
    startDate: '2024-02-01',
    endDate: '2024-03-31',
    status: 'active',
    applicableTo: 'categories',
    categories: ['Bundles'],
    products: [],
    userRestriction: 'all',
    stackable: false
  },
  {
    id: 'CPN-005',
    code: 'VIP15',
    description: 'Descuento exclusivo para distribuidores VIP',
    type: 'percentage',
    value: 15,
    minPurchase: 0,
    maxDiscount: null,
    usageLimit: null,
    usedCount: 567,
    startDate: '2024-01-01',
    endDate: null,
    status: 'active',
    applicableTo: 'all',
    categories: [],
    products: [],
    userRestriction: 'distributor',
    stackable: true
  },
  {
    id: 'CPN-006',
    code: 'FLASH40',
    description: 'Venta flash - 40% en productos seleccionados',
    type: 'percentage',
    value: 40,
    minPurchase: 150.00,
    maxDiscount: 100.00,
    usageLimit: 100,
    usedCount: 100,
    startDate: '2024-01-15',
    endDate: '2024-01-16',
    status: 'expired',
    applicableTo: 'products',
    categories: [],
    products: ['Proteína Vegana', 'Colágeno Plus'],
    userRestriction: 'all',
    stackable: false
  },
  {
    id: 'CPN-007',
    code: 'BLACKFRIDAY',
    description: 'Black Friday - Hasta 50% de descuento',
    type: 'percentage',
    value: 50,
    minPurchase: 100.00,
    maxDiscount: 200.00,
    usageLimit: 10000,
    usedCount: 0,
    startDate: '2024-11-29',
    endDate: '2024-12-02',
    status: 'scheduled',
    applicableTo: 'all',
    categories: [],
    products: [],
    userRestriction: 'all',
    stackable: false
  },
  {
    id: 'CPN-008',
    code: 'REFER20',
    description: 'Cupón de referido - $20 de descuento',
    type: 'fixed',
    value: 20.00,
    minPurchase: 75.00,
    maxDiscount: null,
    usageLimit: null,
    usedCount: 432,
    startDate: '2024-01-01',
    endDate: null,
    status: 'active',
    applicableTo: 'all',
    categories: [],
    products: [],
    userRestriction: 'new',
    stackable: true
  }
];

export default function CuponesAdminPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterType, setFilterType] = useState('all');
  const [showCreateModal, setShowCreateModal] = useState(false);

  const filteredCoupons = coupons.filter(coupon => {
    const matchesSearch =
      coupon.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
      coupon.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = filterStatus === 'all' || coupon.status === filterStatus;
    const matchesType = filterType === 'all' || coupon.type === filterType;
    return matchesSearch && matchesStatus && matchesType;
  });

  const stats = {
    total: coupons.length,
    active: coupons.filter(c => c.status === 'active').length,
    scheduled: coupons.filter(c => c.status === 'scheduled').length,
    expired: coupons.filter(c => c.status === 'expired').length,
    totalUsage: coupons.reduce((sum, c) => sum + c.usedCount, 0),
    averageValue: coupons
      .filter(c => c.type !== 'free_shipping')
      .reduce((sum, c) => sum + c.value, 0) / coupons.filter(c => c.type !== 'free_shipping').length
  };

  const handleDuplicate = (coupon: typeof coupons[0]) => {
    toast.success(`Cupón "${coupon.code}" duplicado`);
  };

  const handleDelete = (coupon: typeof coupons[0]) => {
    if (confirm(`¿Estás seguro de que deseas eliminar el cupón "${coupon.code}"?`)) {
      toast.success('Cupón eliminado');
    }
  };

  const handleToggleStatus = (coupon: typeof coupons[0]) => {
    const newStatus = coupon.status === 'active' ? 'inactive' : 'active';
    toast.success(`Cupón ${newStatus === 'active' ? 'activado' : 'desactivado'}`);
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'percentage':
        return 'Porcentaje';
      case 'fixed':
        return 'Monto Fijo';
      case 'free_shipping':
        return 'Envío Gratis';
      default:
        return type;
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'percentage':
        return <PercentBadgeIcon className="h-5 w-5" />;
      case 'fixed':
        return <BanknotesIcon className="h-5 w-5" />;
      case 'free_shipping':
        return <ShoppingBagIcon className="h-5 w-5" />;
      default:
        return <TagIcon className="h-5 w-5" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-800';
      case 'scheduled':
        return 'bg-blue-100 text-blue-800';
      case 'expired':
        return 'bg-gray-100 text-gray-800';
      case 'inactive':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'active':
        return 'Activo';
      case 'scheduled':
        return 'Programado';
      case 'expired':
        return 'Expirado';
      case 'inactive':
        return 'Inactivo';
      default:
        return status;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Cupones de Descuento</h1>
              <p className="text-gray-600">Gestiona cupones y promociones</p>
            </div>
            <button
              onClick={() => setShowCreateModal(true)}
              className="flex items-center gap-2 px-4 py-2 bg-[#003B7A] text-white rounded-lg hover:bg-[#002855] transition-colors"
            >
              <PlusIcon className="h-5 w-5" />
              Nuevo Cupón
            </button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center gap-2 mb-2">
              <TicketIcon className="h-5 w-5 text-[#003B7A]" />
              <span className="text-sm text-gray-600">Total</span>
            </div>
            <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center gap-2 mb-2">
              <CheckCircleIcon className="h-5 w-5 text-green-500" />
              <span className="text-sm text-gray-600">Activos</span>
            </div>
            <p className="text-2xl font-bold text-gray-900">{stats.active}</p>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center gap-2 mb-2">
              <ClockIcon className="h-5 w-5 text-blue-500" />
              <span className="text-sm text-gray-600">Programados</span>
            </div>
            <p className="text-2xl font-bold text-gray-900">{stats.scheduled}</p>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center gap-2 mb-2">
              <XCircleIcon className="h-5 w-5 text-gray-400" />
              <span className="text-sm text-gray-600">Expirados</span>
            </div>
            <p className="text-2xl font-bold text-gray-900">{stats.expired}</p>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center gap-2 mb-2">
              <UserGroupIcon className="h-5 w-5 text-purple-500" />
              <span className="text-sm text-gray-600">Usos</span>
            </div>
            <p className="text-2xl font-bold text-gray-900">{stats.totalUsage.toLocaleString()}</p>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center gap-2 mb-2">
              <TagIcon className="h-5 w-5 text-[#7AB82E]" />
              <span className="text-sm text-gray-600">Promedio</span>
            </div>
            <p className="text-2xl font-bold text-gray-900">{stats.averageValue.toFixed(0)}%</p>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <div className="relative">
                <MagnifyingGlassIcon className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Buscar cupones..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#003B7A]"
                />
              </div>
            </div>

            <div>
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#003B7A]"
              >
                <option value="all">Todos los Estados</option>
                <option value="active">Activos</option>
                <option value="scheduled">Programados</option>
                <option value="expired">Expirados</option>
                <option value="inactive">Inactivos</option>
              </select>
            </div>

            <div>
              <select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#003B7A]"
              >
                <option value="all">Todos los Tipos</option>
                <option value="percentage">Porcentaje</option>
                <option value="fixed">Monto Fijo</option>
                <option value="free_shipping">Envío Gratis</option>
              </select>
            </div>
          </div>
        </div>

        {/* Coupons List */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Código
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Tipo
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Valor
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Uso
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Vigencia
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
                {filteredCoupons.map((coupon) => (
                  <tr key={coupon.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <div>
                        <div className="flex items-center gap-2">
                          <code className="px-2 py-1 bg-gray-100 rounded text-sm font-mono font-medium text-gray-900">
                            {coupon.code}
                          </code>
                          {coupon.stackable && (
                            <span className="px-2 py-0.5 bg-blue-100 text-blue-800 text-xs rounded">
                              Stackable
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-gray-600 mt-1">{coupon.description}</p>
                        <p className="text-xs text-gray-400 mt-1">ID: {coupon.id}</p>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <div className="p-2 bg-gray-100 rounded">
                          {getTypeIcon(coupon.type)}
                        </div>
                        <span className="text-sm text-gray-900">{getTypeLabel(coupon.type)}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        {coupon.type === 'percentage' && (
                          <p className="text-sm font-bold text-gray-900">{coupon.value}%</p>
                        )}
                        {coupon.type === 'fixed' && (
                          <p className="text-sm font-bold text-gray-900">${coupon.value.toFixed(2)}</p>
                        )}
                        {coupon.type === 'free_shipping' && (
                          <p className="text-sm font-bold text-gray-900">Envío Gratis</p>
                        )}
                        {coupon.minPurchase > 0 && (
                          <p className="text-xs text-gray-500">Min: ${coupon.minPurchase.toFixed(2)}</p>
                        )}
                        {coupon.maxDiscount && (
                          <p className="text-xs text-gray-500">Max: ${coupon.maxDiscount.toFixed(2)}</p>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <p className="text-sm font-medium text-gray-900">
                          {coupon.usedCount.toLocaleString()}{coupon.usageLimit ? ` / ${coupon.usageLimit.toLocaleString()}` : ''}
                        </p>
                        {coupon.usageLimit && (
                          <div className="mt-1 w-full bg-gray-200 rounded-full h-1.5">
                            <div
                              className="bg-[#7AB82E] h-1.5 rounded-full"
                              style={{ width: `${Math.min((coupon.usedCount / coupon.usageLimit) * 100, 100)}%` }}
                            />
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm">
                        <p className="text-gray-900">{coupon.startDate}</p>
                        <p className="text-gray-500">{coupon.endDate || 'Sin límite'}</p>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(coupon.status)}`}>
                        {getStatusLabel(coupon.status)}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => toast.success('Editar cupón')}
                          className="p-1 text-[#003B7A] hover:bg-blue-50 rounded"
                          title="Editar"
                        >
                          <PencilIcon className="h-5 w-5" />
                        </button>
                        <button
                          onClick={() => handleDuplicate(coupon)}
                          className="p-1 text-gray-600 hover:bg-gray-50 rounded"
                          title="Duplicar"
                        >
                          <DocumentDuplicateIcon className="h-5 w-5" />
                        </button>
                        <button
                          onClick={() => handleDelete(coupon)}
                          className="p-1 text-red-600 hover:bg-red-50 rounded"
                          title="Eliminar"
                        >
                          <TrashIcon className="h-5 w-5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {filteredCoupons.length === 0 && (
            <div className="text-center py-12">
              <TicketIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600">No se encontraron cupones</p>
            </div>
          )}
        </div>

        {/* Results count */}
        {filteredCoupons.length > 0 && (
          <div className="mt-6 text-sm text-gray-700">
            Mostrando <span className="font-medium">{filteredCoupons.length}</span> de{' '}
            <span className="font-medium">{coupons.length}</span> cupones
          </div>
        )}
      </div>

      {/* Create Modal Placeholder */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-2xl w-full mx-4">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Crear Nuevo Cupón</h2>
            <p className="text-gray-600 mb-6">Formulario de creación de cupón...</p>
            <button
              onClick={() => setShowCreateModal(false)}
              className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
            >
              Cerrar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
