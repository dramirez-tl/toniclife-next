'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
  ArrowLeftIcon,
  UserIcon,
  EnvelopeIcon,
  PhoneIcon,
  MapPinIcon,
  CalendarIcon,
  ShoppingBagIcon,
  CreditCardIcon,
  HeartIcon,
  TrophyIcon,
  BanknotesIcon,
  UserGroupIcon,
  PencilIcon,
  TrashIcon,
  LockClosedIcon,
  CheckCircleIcon,
  XCircleIcon,
  ChartBarIcon,
  ClockIcon,
} from '@heroicons/react/24/outline';
import { toast } from 'sonner';

// Mock data - In real app, fetch based on [id]
const userData = {
  id: 'USR-789',
  name: 'María González',
  email: 'maria.gonzalez@email.com',
  phone: '+52 55 1234 5678',
  status: 'active',
  role: 'customer',
  dateJoined: '2023-06-15',
  lastLogin: '2024-01-26 09:15 AM',
  avatar: '/avatars/maria.jpg',
  verified: true,
  address: {
    street: 'Av. Insurgentes Sur 1602',
    city: 'Ciudad de México',
    state: 'CDMX',
    zip: '03940',
    country: 'México'
  },
  preferences: {
    newsletter: true,
    sms: false,
    pushNotifications: true,
    language: 'es',
    currency: 'USD'
  },
  stats: {
    totalOrders: 12,
    totalSpent: 1245.60,
    averageOrderValue: 103.80,
    lifetimeValue: 1245.60,
    favoriteProducts: 8,
    rewardPoints: 1246
  },
  distributor: {
    isDistributor: true,
    distributorId: 'DIST-456',
    level: 'Gold',
    enrollmentDate: '2023-08-20',
    totalSales: 15600.00,
    teamSize: 23,
    rank: 'Senior Consultant'
  },
  recentOrders: [
    {
      id: 'TL-2024-12345',
      date: '2024-01-26',
      total: 203.94,
      status: 'processing',
      items: 3
    },
    {
      id: 'TL-2024-11234',
      date: '2024-01-10',
      total: 156.00,
      status: 'delivered',
      items: 2
    },
    {
      id: 'TL-2023-10123',
      date: '2023-12-15',
      total: 89.50,
      status: 'delivered',
      items: 1
    }
  ],
  activityLog: [
    {
      id: 'A1',
      action: 'Realizó una compra',
      details: 'Pedido TL-2024-12345 por $203.94',
      timestamp: '2024-01-26 10:30 AM'
    },
    {
      id: 'A2',
      action: 'Inició sesión',
      details: 'Acceso desde Chrome en Windows',
      timestamp: '2024-01-26 09:15 AM'
    },
    {
      id: 'A3',
      action: 'Agregó producto a favoritos',
      details: 'Colágeno Hidrolizado',
      timestamp: '2024-01-25 03:20 PM'
    },
    {
      id: 'A4',
      action: 'Completó el quiz de bienestar',
      details: 'Puntuación: 85/100',
      timestamp: '2024-01-22 11:45 AM'
    }
  ],
  notes: [
    {
      id: 'N1',
      author: 'Admin',
      date: '2024-01-15',
      text: 'Cliente VIP - Ofrecer descuento especial en próxima compra'
    },
    {
      id: 'N2',
      author: 'Soporte',
      date: '2024-01-10',
      text: 'Solicitó información sobre el programa de distribuidores'
    }
  ]
};

const statusOptions = [
  { value: 'active', label: 'Activo', color: 'bg-green-100 text-green-800' },
  { value: 'inactive', label: 'Inactivo', color: 'bg-gray-100 text-gray-800' },
  { value: 'suspended', label: 'Suspendido', color: 'bg-red-100 text-red-800' },
  { value: 'pending', label: 'Pendiente', color: 'bg-yellow-100 text-yellow-800' }
];

const roleOptions = [
  { value: 'customer', label: 'Cliente' },
  { value: 'distributor', label: 'Distribuidor' },
  { value: 'admin', label: 'Administrador' },
  { value: 'support', label: 'Soporte' }
];

export default function UserDetailAdminPage() {
  const [status, setStatus] = useState(userData.status);
  const [role, setRole] = useState(userData.role);
  const [newNote, setNewNote] = useState('');
  const [activeTab, setActiveTab] = useState<'overview' | 'orders' | 'activity'>('overview');

  const handleStatusChange = (newStatus: string) => {
    setStatus(newStatus);
    toast.success(`Estado actualizado a: ${statusOptions.find(s => s.value === newStatus)?.label}`);
  };

  const handleRoleChange = (newRole: string) => {
    setRole(newRole);
    toast.success(`Rol actualizado a: ${roleOptions.find(r => r.value === newRole)?.label}`);
  };

  const handleAddNote = () => {
    if (newNote.trim()) {
      toast.success('Nota agregada al usuario');
      setNewNote('');
    }
  };

  const handleResetPassword = () => {
    if (confirm('¿Enviar email de restablecimiento de contraseña a este usuario?')) {
      toast.success('Email de restablecimiento enviado');
    }
  };

  const handleDeleteUser = () => {
    if (confirm('¿Estás seguro de que deseas eliminar este usuario? Esta acción no se puede deshacer.')) {
      toast.success('Usuario eliminado');
    }
  };

  const handleSendEmail = () => {
    toast.success('Abriendo cliente de email...');
  };

  const currentStatusOption = statusOptions.find(s => s.value === status);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link
                href="/admin/usuarios"
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <ArrowLeftIcon className="h-5 w-5 text-gray-600" />
              </Link>
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 bg-gradient-to-br from-[#003B7A] to-[#7AB82E] rounded-full flex items-center justify-center text-white text-2xl font-bold">
                  {userData.name.split(' ').map(n => n[0]).join('')}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h1 className="text-2xl font-bold text-gray-900">{userData.name}</h1>
                    {userData.verified && (
                      <CheckCircleIcon className="h-6 w-6 text-[#7AB82E]" />
                    )}
                  </div>
                  <p className="text-gray-600">{userData.email}</p>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={handleSendEmail}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 flex items-center gap-2"
              >
                <EnvelopeIcon className="h-5 w-5" />
                Enviar Email
              </button>
              <button
                onClick={handleResetPassword}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 flex items-center gap-2"
              >
                <LockClosedIcon className="h-5 w-5" />
                Reset Password
              </button>
              <button
                onClick={handleDeleteUser}
                className="px-4 py-2 border border-red-300 text-red-700 rounded-lg hover:bg-red-50 flex items-center gap-2"
              >
                <TrashIcon className="h-5 w-5" />
                Eliminar
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Stats Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-white rounded-lg shadow p-4">
                <div className="flex items-center gap-2 mb-2">
                  <ShoppingBagIcon className="h-5 w-5 text-[#003B7A]" />
                  <span className="text-sm text-gray-600">Pedidos</span>
                </div>
                <p className="text-2xl font-bold text-gray-900">{userData.stats.totalOrders}</p>
              </div>
              <div className="bg-white rounded-lg shadow p-4">
                <div className="flex items-center gap-2 mb-2">
                  <BanknotesIcon className="h-5 w-5 text-[#7AB82E]" />
                  <span className="text-sm text-gray-600">Total Gastado</span>
                </div>
                <p className="text-2xl font-bold text-gray-900">${userData.stats.totalSpent.toFixed(0)}</p>
              </div>
              <div className="bg-white rounded-lg shadow p-4">
                <div className="flex items-center gap-2 mb-2">
                  <ChartBarIcon className="h-5 w-5 text-purple-500" />
                  <span className="text-sm text-gray-600">Promedio</span>
                </div>
                <p className="text-2xl font-bold text-gray-900">${userData.stats.averageOrderValue.toFixed(0)}</p>
              </div>
              <div className="bg-white rounded-lg shadow p-4">
                <div className="flex items-center gap-2 mb-2">
                  <TrophyIcon className="h-5 w-5 text-yellow-500" />
                  <span className="text-sm text-gray-600">Puntos</span>
                </div>
                <p className="text-2xl font-bold text-gray-900">{userData.stats.rewardPoints}</p>
              </div>
            </div>

            {/* Tabs */}
            <div className="bg-white rounded-lg shadow">
              <div className="border-b">
                <div className="flex gap-4 px-6">
                  <button
                    onClick={() => setActiveTab('overview')}
                    className={`py-4 px-2 border-b-2 font-medium transition-colors ${
                      activeTab === 'overview'
                        ? 'border-[#003B7A] text-[#003B7A]'
                        : 'border-transparent text-gray-600 hover:text-gray-900'
                    }`}
                  >
                    Resumen
                  </button>
                  <button
                    onClick={() => setActiveTab('orders')}
                    className={`py-4 px-2 border-b-2 font-medium transition-colors ${
                      activeTab === 'orders'
                        ? 'border-[#003B7A] text-[#003B7A]'
                        : 'border-transparent text-gray-600 hover:text-gray-900'
                    }`}
                  >
                    Pedidos ({userData.stats.totalOrders})
                  </button>
                  <button
                    onClick={() => setActiveTab('activity')}
                    className={`py-4 px-2 border-b-2 font-medium transition-colors ${
                      activeTab === 'activity'
                        ? 'border-[#003B7A] text-[#003B7A]'
                        : 'border-transparent text-gray-600 hover:text-gray-900'
                    }`}
                  >
                    Actividad
                  </button>
                </div>
              </div>

              <div className="p-6">
                {/* Overview Tab */}
                {activeTab === 'overview' && (
                  <div className="space-y-6">
                    {/* Personal Information */}
                    <div>
                      <h3 className="text-lg font-bold text-gray-900 mb-4">Información Personal</h3>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="text-sm text-gray-600">Email</label>
                          <p className="font-medium text-gray-900">{userData.email}</p>
                        </div>
                        <div>
                          <label className="text-sm text-gray-600">Teléfono</label>
                          <p className="font-medium text-gray-900">{userData.phone}</p>
                        </div>
                        <div>
                          <label className="text-sm text-gray-600">Fecha de Registro</label>
                          <p className="font-medium text-gray-900">{userData.dateJoined}</p>
                        </div>
                        <div>
                          <label className="text-sm text-gray-600">Último Acceso</label>
                          <p className="font-medium text-gray-900">{userData.lastLogin}</p>
                        </div>
                      </div>
                    </div>

                    {/* Address */}
                    <div>
                      <h3 className="text-lg font-bold text-gray-900 mb-4">Dirección</h3>
                      <p className="text-gray-700">
                        {userData.address.street}<br />
                        {userData.address.city}, {userData.address.state} {userData.address.zip}<br />
                        {userData.address.country}
                      </p>
                    </div>

                    {/* Preferences */}
                    <div>
                      <h3 className="text-lg font-bold text-gray-900 mb-4">Preferencias</h3>
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-gray-700">Newsletter</span>
                          <span className={`px-3 py-1 rounded-full text-sm ${
                            userData.preferences.newsletter
                              ? 'bg-green-100 text-green-800'
                              : 'bg-gray-100 text-gray-800'
                          }`}>
                            {userData.preferences.newsletter ? 'Suscrito' : 'No suscrito'}
                          </span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-gray-700">SMS</span>
                          <span className={`px-3 py-1 rounded-full text-sm ${
                            userData.preferences.sms
                              ? 'bg-green-100 text-green-800'
                              : 'bg-gray-100 text-gray-800'
                          }`}>
                            {userData.preferences.sms ? 'Activo' : 'Inactivo'}
                          </span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-gray-700">Notificaciones Push</span>
                          <span className={`px-3 py-1 rounded-full text-sm ${
                            userData.preferences.pushNotifications
                              ? 'bg-green-100 text-green-800'
                              : 'bg-gray-100 text-gray-800'
                          }`}>
                            {userData.preferences.pushNotifications ? 'Activo' : 'Inactivo'}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Distributor Info */}
                    {userData.distributor.isDistributor && (
                      <div>
                        <h3 className="text-lg font-bold text-gray-900 mb-4">Información de Distribuidor</h3>
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className="text-sm text-gray-600">ID de Distribuidor</label>
                            <p className="font-medium text-gray-900">{userData.distributor.distributorId}</p>
                          </div>
                          <div>
                            <label className="text-sm text-gray-600">Nivel</label>
                            <p className="font-medium text-gray-900">{userData.distributor.level}</p>
                          </div>
                          <div>
                            <label className="text-sm text-gray-600">Rango</label>
                            <p className="font-medium text-gray-900">{userData.distributor.rank}</p>
                          </div>
                          <div>
                            <label className="text-sm text-gray-600">Tamaño del Equipo</label>
                            <p className="font-medium text-gray-900">{userData.distributor.teamSize} miembros</p>
                          </div>
                          <div>
                            <label className="text-sm text-gray-600">Ventas Totales</label>
                            <p className="font-medium text-gray-900">${userData.distributor.totalSales.toFixed(2)}</p>
                          </div>
                          <div>
                            <label className="text-sm text-gray-600">Fecha de Inscripción</label>
                            <p className="font-medium text-gray-900">{userData.distributor.enrollmentDate}</p>
                          </div>
                        </div>
                        <Link
                          href={`/admin/distribuidores/${userData.distributor.distributorId}`}
                          className="inline-block mt-4 text-[#003B7A] font-medium hover:underline"
                        >
                          Ver perfil completo de distribuidor →
                        </Link>
                      </div>
                    )}
                  </div>
                )}

                {/* Orders Tab */}
                {activeTab === 'orders' && (
                  <div className="space-y-4">
                    {userData.recentOrders.map((order) => (
                      <div key={order.id} className="border rounded-lg p-4 hover:bg-gray-50 transition-colors">
                        <div className="flex items-center justify-between mb-2">
                          <Link
                            href={`/admin/pedidos/${order.id}`}
                            className="font-medium text-[#003B7A] hover:underline"
                          >
                            #{order.id}
                          </Link>
                          <span className={`px-3 py-1 rounded-full text-sm ${
                            order.status === 'delivered'
                              ? 'bg-green-100 text-green-800'
                              : 'bg-blue-100 text-blue-800'
                          }`}>
                            {order.status === 'delivered' ? 'Entregado' : 'Procesando'}
                          </span>
                        </div>
                        <div className="flex items-center justify-between text-sm text-gray-600">
                          <span>{order.date}</span>
                          <span>{order.items} {order.items === 1 ? 'producto' : 'productos'}</span>
                          <span className="font-bold text-gray-900">${order.total.toFixed(2)}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Activity Tab */}
                {activeTab === 'activity' && (
                  <div className="space-y-4">
                    {userData.activityLog.map((activity) => (
                      <div key={activity.id} className="flex gap-4 pb-4 border-b last:border-0">
                        <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center flex-shrink-0">
                          <ClockIcon className="h-5 w-5 text-gray-600" />
                        </div>
                        <div className="flex-1">
                          <h4 className="font-medium text-gray-900">{activity.action}</h4>
                          <p className="text-sm text-gray-600">{activity.details}</p>
                          <p className="text-xs text-gray-500 mt-1">{activity.timestamp}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Notes */}
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-lg font-bold text-gray-900 mb-4">Notas Internas</h2>

              <div className="space-y-4 mb-6">
                {userData.notes.map((note) => (
                  <div key={note.id} className="bg-yellow-50 border-l-4 border-yellow-400 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-medium text-gray-900">{note.author}</span>
                      <span className="text-sm text-gray-600">{note.date}</span>
                    </div>
                    <p className="text-gray-700">{note.text}</p>
                  </div>
                ))}
              </div>

              <div className="flex gap-2">
                <input
                  type="text"
                  value={newNote}
                  onChange={(e) => setNewNote(e.target.value)}
                  placeholder="Agregar una nota interna..."
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#003B7A]"
                />
                <button
                  onClick={handleAddNote}
                  className="px-6 py-2 bg-[#003B7A] text-white rounded-lg hover:bg-[#002855]"
                >
                  Agregar
                </button>
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Status Card */}
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-lg font-bold text-gray-900 mb-4">Estado</h2>
              <select
                value={status}
                onChange={(e) => handleStatusChange(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#003B7A] mb-3"
              >
                {statusOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
              <div className="flex justify-center">
                <span className={`px-4 py-2 rounded-full text-sm font-medium ${currentStatusOption?.color}`}>
                  {currentStatusOption?.label}
                </span>
              </div>
            </div>

            {/* Role Card */}
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-lg font-bold text-gray-900 mb-4">Rol</h2>
              <select
                value={role}
                onChange={(e) => handleRoleChange(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#003B7A]"
              >
                {roleOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Quick Actions */}
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-lg font-bold text-gray-900 mb-4">Acciones Rápidas</h2>
              <div className="space-y-2">
                <button
                  className="w-full px-4 py-2 bg-gray-50 text-gray-700 rounded-lg hover:bg-gray-100 text-left"
                  onClick={() => toast.success('Ver historial de compras')}
                >
                  Ver Historial Completo
                </button>
                <button
                  className="w-full px-4 py-2 bg-gray-50 text-gray-700 rounded-lg hover:bg-gray-100 text-left"
                  onClick={() => toast.success('Ver tickets de soporte')}
                >
                  Tickets de Soporte
                </button>
                <button
                  className="w-full px-4 py-2 bg-gray-50 text-gray-700 rounded-lg hover:bg-gray-100 text-left"
                  onClick={() => toast.success('Aplicar cupón descuento')}
                >
                  Aplicar Cupón
                </button>
                <button
                  className="w-full px-4 py-2 bg-gray-50 text-gray-700 rounded-lg hover:bg-gray-100 text-left"
                  onClick={() => toast.success('Exportar datos')}
                >
                  Exportar Datos
                </button>
              </div>
            </div>

            {/* Account Info */}
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-lg font-bold text-gray-900 mb-4">Información de Cuenta</h2>
              <div className="space-y-3 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">ID de Usuario</span>
                  <span className="font-medium text-gray-900">{userData.id}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">Email Verificado</span>
                  <CheckCircleIcon className="h-5 w-5 text-green-500" />
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">LTV</span>
                  <span className="font-bold text-[#7AB82E]">${userData.stats.lifetimeValue.toFixed(2)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">Favoritos</span>
                  <span className="font-medium text-gray-900">{userData.stats.favoriteProducts}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
