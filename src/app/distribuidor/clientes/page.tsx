'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/Button';
import { Card, CardContent } from '@/components/ui/Card';
import {
  UserGroupIcon,
  MagnifyingGlassIcon,
  PhoneIcon,
  EnvelopeIcon,
  ChatBubbleLeftIcon,
  PlusIcon,
  PencilIcon,
  ShoppingBagIcon,
  CalendarIcon,
  StarIcon,
  CheckCircleIcon,
} from '@heroicons/react/24/outline';
import { StarIcon as StarSolidIcon } from '@heroicons/react/24/solid';
import { toast } from 'sonner';

const mockCustomers = [
  {
    id: '1',
    name: 'Patricia González',
    email: 'patricia@email.com',
    phone: '+52 111 222 3333',
    avatar: 'PG',
    type: 'Cliente Frecuente',
    totalPurchases: 12,
    totalSpent: 15400,
    lastPurchase: '2025-01-23',
    favoriteProducts: ['Vitamina D3', 'Omega 3'],
    status: 'active',
    rating: 5,
    notes: 'Le encantan los productos de inmunidad. Compra mensualmente.',
    birthDate: '1985-03-15',
    joinDate: '2024-06-01',
  },
  {
    id: '2',
    name: 'Ricardo Méndez',
    email: 'ricardo@email.com',
    phone: '+52 444 555 6666',
    avatar: 'RM',
    type: 'Cliente VIP',
    totalPurchases: 28,
    totalSpent: 42300,
    lastPurchase: '2025-01-20',
    favoriteProducts: ['Colágeno', 'Magnesio', 'Probióticos'],
    status: 'active',
    rating: 5,
    notes: 'Cliente desde hace 8 meses. Recomienda mucho.',
    birthDate: '1978-11-22',
    joinDate: '2024-05-15',
  },
  {
    id: '3',
    name: 'Lucía Ramírez',
    email: 'lucia@email.com',
    phone: '+52 777 888 9999',
    avatar: 'LR',
    type: 'Cliente Nuevo',
    totalPurchases: 2,
    totalSpent: 1298,
    lastPurchase: '2025-01-15',
    favoriteProducts: ['Vitamina D3'],
    status: 'active',
    rating: 4,
    notes: 'Primera compra en diciembre. Interesada en más productos.',
    birthDate: '1992-07-08',
    joinDate: '2024-12-10',
  },
  {
    id: '4',
    name: 'Fernando Silva',
    email: 'fernando@email.com',
    phone: '+52 333 444 5555',
    avatar: 'FS',
    type: 'Cliente Frecuente',
    totalPurchases: 15,
    totalSpent: 18950,
    lastPurchase: '2024-12-20',
    favoriteProducts: ['Omega 3', 'Cúrcuma'],
    status: 'inactive',
    rating: 4,
    notes: 'No compra desde hace más de un mes. Hacer seguimiento.',
    birthDate: '1980-04-30',
    joinDate: '2024-04-20',
  },
  {
    id: '5',
    name: 'Carmen Torres',
    email: 'carmen@email.com',
    phone: '+52 666 777 8888',
    avatar: 'CT',
    type: 'Cliente VIP',
    totalPurchases: 34,
    totalSpent: 52100,
    lastPurchase: '2025-01-24',
    favoriteProducts: ['Colágeno', 'Vitamina D3', 'Magnesio', 'Probióticos'],
    status: 'active',
    rating: 5,
    notes: 'Nuestra mejor cliente. Siempre compra para toda la familia.',
    birthDate: '1975-09-12',
    joinDate: '2024-03-01',
  },
  {
    id: '6',
    name: 'Jorge Morales',
    email: 'jorge@email.com',
    phone: '+52 222 333 4444',
    avatar: 'JM',
    type: 'Cliente Nuevo',
    totalPurchases: 1,
    totalSpent: 599,
    lastPurchase: '2025-01-10',
    favoriteProducts: ['Omega 3'],
    status: 'active',
    rating: 5,
    notes: 'Primera compra. Muy entusiasta.',
    birthDate: '1988-12-05',
    joinDate: '2025-01-05',
  },
];

const customerTypes = ['Todos', 'Cliente VIP', 'Cliente Frecuente', 'Cliente Nuevo'];

export default function ClientesPage() {
  const [customers, setCustomers] = useState(mockCustomers);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState('Todos');
  const [filterStatus, setFilterStatus] = useState('all');
  const [selectedCustomer, setSelectedCustomer] = useState<typeof mockCustomers[0] | null>(null);

  const filteredCustomers = customers.filter(customer => {
    if (searchQuery && !customer.name.toLowerCase().includes(searchQuery.toLowerCase()) &&
        !customer.email.toLowerCase().includes(searchQuery.toLowerCase()) &&
        !customer.phone.includes(searchQuery)) {
      return false;
    }
    if (filterType !== 'Todos' && customer.type !== filterType) return false;
    if (filterStatus === 'active' && customer.status !== 'active') return false;
    if (filterStatus === 'inactive' && customer.status !== 'inactive') return false;
    return true;
  });

  const stats = {
    total: customers.length,
    active: customers.filter(c => c.status === 'active').length,
    vip: customers.filter(c => c.type === 'Cliente VIP').length,
    totalRevenue: customers.reduce((sum, c) => sum + c.totalSpent, 0),
  };

  const handleContact = (customer: typeof mockCustomers[0], method: string) => {
    toast.success(`Iniciando ${method} con ${customer.name}`);
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
                <h1 className="text-4xl font-bold">Gestión de Clientes</h1>
              </div>
              <p className="text-white/80 text-lg">
                Administra tu base de clientes
              </p>
            </div>
            <div className="flex gap-3">
              <Link href="/distribuidor">
                <Button variant="secondary">
                  Volver al Dashboard
                </Button>
              </Link>
              <Button
                variant="primary"
                leftIcon={<PlusIcon className="h-5 w-5" />}
                onClick={() => toast.info('Función próximamente disponible')}
              >
                Nuevo Cliente
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
                  <p className="text-sm text-gray-600 mb-1">Clientes Totales</p>
                  <p className="text-3xl font-bold text-gray-900">{stats.total}</p>
                </div>
                <UserGroupIcon className="h-12 w-12 text-blue-400" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 mb-1">Clientes Activos</p>
                  <p className="text-3xl font-bold text-gray-900">{stats.active}</p>
                </div>
                <CheckCircleIcon className="h-12 w-12 text-green-400" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 mb-1">Clientes VIP</p>
                  <p className="text-3xl font-bold text-gray-900">{stats.vip}</p>
                </div>
                <StarSolidIcon className="h-12 w-12 text-yellow-400" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-[#7AB82E] to-[#7AB82E]/90 text-white">
            <CardContent className="p-6">
              <div>
                <p className="text-sm text-white/80 mb-1">Ingresos Totales</p>
                <p className="text-2xl font-bold">${stats.totalRevenue.toLocaleString('es-MX')}</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card className="mb-6">
          <CardContent className="p-6">
            <div className="space-y-4">
              {/* Search */}
              <div className="relative">
                <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Buscar por nombre, email o teléfono..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#7AB82E] focus:border-transparent"
                />
              </div>

              {/* Filters */}
              <div className="grid md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Tipo de Cliente
                  </label>
                  <select
                    value={filterType}
                    onChange={(e) => setFilterType(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#7AB82E] focus:border-transparent"
                  >
                    {customerTypes.map(type => (
                      <option key={type} value={type}>{type}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Estado
                  </label>
                  <select
                    value={filterStatus}
                    onChange={(e) => setFilterStatus(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#7AB82E] focus:border-transparent"
                  >
                    <option value="all">Todos</option>
                    <option value="active">Activos</option>
                    <option value="inactive">Inactivos</option>
                  </select>
                </div>

                <div className="flex items-end">
                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={() => {
                      setSearchQuery('');
                      setFilterType('Todos');
                      setFilterStatus('all');
                    }}
                  >
                    Limpiar Filtros
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Customers Grid */}
        <div className="grid lg:grid-cols-2 gap-6">
          {filteredCustomers.map((customer) => (
            <Card key={customer.id} className="hover:shadow-lg transition-shadow cursor-pointer" onClick={() => setSelectedCustomer(customer)}>
              <CardContent className="p-6">
                {/* Header */}
                <div className="flex items-start gap-4 mb-4">
                  <div className="w-16 h-16 bg-gradient-to-br from-[#003B7A] to-[#7AB82E] rounded-full flex items-center justify-center text-white font-bold text-xl flex-shrink-0">
                    {customer.avatar}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between mb-1">
                      <h3 className="font-bold text-gray-900 text-lg">{customer.name}</h3>
                      <div className="flex items-center gap-0.5">
                        {Array.from({ length: customer.rating }).map((_, i) => (
                          <StarSolidIcon key={i} className="h-4 w-4 text-yellow-400" />
                        ))}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-wrap mb-2">
                      <span className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium ${
                        customer.type === 'Cliente VIP' ? 'bg-purple-100 text-purple-800' :
                        customer.type === 'Cliente Frecuente' ? 'bg-blue-100 text-blue-800' :
                        'bg-green-100 text-green-800'
                      }`}>
                        {customer.type}
                      </span>
                      <span className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium ${
                        customer.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                      }`}>
                        {customer.status === 'active' ? '● Activo' : '○ Inactivo'}
                      </span>
                    </div>
                    <p className="text-sm text-gray-600 mb-1">📧 {customer.email}</p>
                    <p className="text-sm text-gray-600">📱 {customer.phone}</p>
                  </div>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-3 gap-4 mb-4 p-4 bg-gray-50 rounded-lg">
                  <div className="text-center">
                    <p className="text-xs text-gray-600 mb-1">Compras</p>
                    <p className="font-bold text-gray-900">{customer.totalPurchases}</p>
                  </div>
                  <div className="text-center">
                    <p className="text-xs text-gray-600 mb-1">Total Gastado</p>
                    <p className="font-bold text-[#003B7A]">${(customer.totalSpent / 1000).toFixed(1)}k</p>
                  </div>
                  <div className="text-center">
                    <p className="text-xs text-gray-600 mb-1">Última Compra</p>
                    <p className="font-bold text-gray-900">
                      {Math.floor((new Date().getTime() - new Date(customer.lastPurchase).getTime()) / (1000 * 60 * 60 * 24))}d
                    </p>
                  </div>
                </div>

                {/* Notes */}
                <p className="text-sm text-gray-700 mb-4 line-clamp-2">
                  💡 {customer.notes}
                </p>

                {/* Favorite Products */}
                <div className="mb-4">
                  <p className="text-xs text-gray-600 mb-2">Productos Favoritos:</p>
                  <div className="flex flex-wrap gap-1">
                    {customer.favoriteProducts.map((product, idx) => (
                      <span key={idx} className="inline-flex items-center px-2 py-0.5 rounded text-xs bg-white text-gray-700 border border-gray-300">
                        {product}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Actions */}
                <div className="grid grid-cols-3 gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    leftIcon={<PhoneIcon className="h-4 w-4" />}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleContact(customer, 'llamada');
                    }}
                  >
                    Llamar
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    leftIcon={<ChatBubbleLeftIcon className="h-4 w-4" />}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleContact(customer, 'WhatsApp');
                    }}
                  >
                    WhatsApp
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    leftIcon={<EnvelopeIcon className="h-4 w-4" />}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleContact(customer, 'email');
                    }}
                  >
                    Email
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Customer Detail Modal */}
        {selectedCustomer && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <Card className="max-w-3xl w-full max-h-[90vh] overflow-auto">
              <CardContent className="p-6">
                <div className="flex items-start justify-between mb-6">
                  <div className="flex items-start gap-4">
                    <div className="w-20 h-20 bg-gradient-to-br from-[#003B7A] to-[#7AB82E] rounded-full flex items-center justify-center text-white font-bold text-2xl">
                      {selectedCustomer.avatar}
                    </div>
                    <div>
                      <h2 className="text-2xl font-bold text-gray-900 mb-1">{selectedCustomer.name}</h2>
                      <div className="flex items-center gap-2 mb-2">
                        <span className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium ${
                          selectedCustomer.type === 'Cliente VIP' ? 'bg-purple-100 text-purple-800' :
                          selectedCustomer.type === 'Cliente Frecuente' ? 'bg-blue-100 text-blue-800' :
                          'bg-green-100 text-green-800'
                        }`}>
                          {selectedCustomer.type}
                        </span>
                        <div className="flex items-center gap-0.5">
                          {Array.from({ length: selectedCustomer.rating }).map((_, i) => (
                            <StarSolidIcon key={i} className="h-4 w-4 text-yellow-400" />
                          ))}
                        </div>
                      </div>
                      <p className="text-sm text-gray-600">Cliente desde {new Date(selectedCustomer.joinDate).toLocaleDateString('es-MX')}</p>
                    </div>
                  </div>
                  <button
                    onClick={() => setSelectedCustomer(null)}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>

                <div className="grid md:grid-cols-2 gap-6 mb-6">
                  <div>
                    <h3 className="font-semibold text-gray-900 mb-3">Información de Contacto</h3>
                    <div className="space-y-2 text-sm">
                      <p className="flex items-center gap-2">
                        <EnvelopeIcon className="h-4 w-4 text-gray-400" />
                        {selectedCustomer.email}
                      </p>
                      <p className="flex items-center gap-2">
                        <PhoneIcon className="h-4 w-4 text-gray-400" />
                        {selectedCustomer.phone}
                      </p>
                      <p className="flex items-center gap-2">
                        <CalendarIcon className="h-4 w-4 text-gray-400" />
                        Cumpleaños: {new Date(selectedCustomer.birthDate).toLocaleDateString('es-MX')}
                      </p>
                    </div>
                  </div>

                  <div>
                    <h3 className="font-semibold text-gray-900 mb-3">Estadísticas</h3>
                    <div className="space-y-2 text-sm">
                      <p className="flex items-center justify-between">
                        <span className="text-gray-600">Total de Compras:</span>
                        <span className="font-semibold">{selectedCustomer.totalPurchases}</span>
                      </p>
                      <p className="flex items-center justify-between">
                        <span className="text-gray-600">Total Gastado:</span>
                        <span className="font-semibold text-[#003B7A]">${selectedCustomer.totalSpent.toLocaleString('es-MX')}</span>
                      </p>
                      <p className="flex items-center justify-between">
                        <span className="text-gray-600">Última Compra:</span>
                        <span className="font-semibold">{new Date(selectedCustomer.lastPurchase).toLocaleDateString('es-MX')}</span>
                      </p>
                      <p className="flex items-center justify-between">
                        <span className="text-gray-600">Promedio por Compra:</span>
                        <span className="font-semibold">${Math.round(selectedCustomer.totalSpent / selectedCustomer.totalPurchases).toLocaleString('es-MX')}</span>
                      </p>
                    </div>
                  </div>
                </div>

                <div className="mb-6">
                  <h3 className="font-semibold text-gray-900 mb-3">Productos Favoritos</h3>
                  <div className="flex flex-wrap gap-2">
                    {selectedCustomer.favoriteProducts.map((product, idx) => (
                      <span key={idx} className="inline-flex items-center px-3 py-1 rounded-lg text-sm bg-blue-50 text-blue-800 border border-blue-200">
                        {product}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="mb-6 p-4 bg-gray-50 rounded-lg">
                  <h3 className="font-semibold text-gray-900 mb-2">Notas</h3>
                  <p className="text-sm text-gray-700">{selectedCustomer.notes}</p>
                </div>

                <div className="flex gap-3">
                  <Button
                    variant="primary"
                    className="flex-1"
                    leftIcon={<ShoppingBagIcon className="h-5 w-5" />}
                    onClick={() => toast.info('Abriendo nueva venta')}
                  >
                    Nueva Venta
                  </Button>
                  <Button
                    variant="outline"
                    leftIcon={<PencilIcon className="h-5 w-5" />}
                    onClick={() => toast.info('Abriendo edición')}
                  >
                    Editar
                  </Button>
                  <Button
                    variant="ghost"
                    leftIcon={<PhoneIcon className="h-5 w-5" />}
                    onClick={() => handleContact(selectedCustomer, 'llamada')}
                  >
                    Contactar
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}
