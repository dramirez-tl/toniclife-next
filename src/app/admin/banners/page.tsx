'use client';

import { useState } from 'react';
import {
  PlusIcon,
  PhotoIcon,
  PencilIcon,
  TrashIcon,
  EyeIcon,
  EyeSlashIcon,
  ArrowUpIcon,
  ArrowDownIcon,
  DevicePhoneMobileIcon,
  ComputerDesktopIcon,
  CheckCircleIcon,
  XCircleIcon,
  ClockIcon,
  CalendarIcon,
} from '@heroicons/react/24/outline';
import { toast } from 'sonner';

const banners = [
  {
    id: 'BNR-001',
    title: 'Black Friday Sale - 50% Off',
    description: 'Banner principal de promoción Black Friday',
    location: 'home_hero',
    imageDesktop: '/banners/blackfriday-desktop.jpg',
    imageMobile: '/banners/blackfriday-mobile.jpg',
    linkUrl: '/productos?promo=blackfriday',
    linkText: 'Comprar Ahora',
    startDate: '2024-11-25',
    endDate: '2024-12-02',
    status: 'scheduled',
    order: 1,
    clicks: 0,
    impressions: 0,
    ctr: 0
  },
  {
    id: 'BNR-002',
    title: 'Nueva Línea de Proteínas',
    description: 'Lanzamiento de proteínas veganas',
    location: 'home_hero',
    imageDesktop: '/banners/protein-desktop.jpg',
    imageMobile: '/banners/protein-mobile.jpg',
    linkUrl: '/productos/proteinas',
    linkText: 'Descubrir',
    startDate: '2024-01-01',
    endDate: null,
    status: 'active',
    order: 2,
    clicks: 1247,
    impressions: 15678,
    ctr: 7.95
  },
  {
    id: 'BNR-003',
    title: 'Programa de Distribuidores',
    description: 'Banner de invitación al programa MLM',
    location: 'home_secondary',
    imageDesktop: '/banners/distributor-desktop.jpg',
    imageMobile: '/banners/distributor-mobile.jpg',
    linkUrl: '/distribuidor/registro',
    linkText: 'Únete Ahora',
    startDate: '2024-01-01',
    endDate: null,
    status: 'active',
    order: 1,
    clicks: 567,
    impressions: 12340,
    ctr: 4.59
  },
  {
    id: 'BNR-004',
    title: 'Envío Gratis en Pedidos +$50',
    description: 'Banner de promoción de envío gratis',
    location: 'cart_top',
    imageDesktop: '/banners/freeship-desktop.jpg',
    imageMobile: '/banners/freeship-mobile.jpg',
    linkUrl: '/productos',
    linkText: 'Ver Productos',
    startDate: '2024-01-15',
    endDate: '2024-06-30',
    status: 'active',
    order: 1,
    clicks: 2345,
    impressions: 34567,
    ctr: 6.78
  },
  {
    id: 'BNR-005',
    title: 'Spring Wellness Challenge',
    description: 'Desafío de primavera - comunidad',
    location: 'blog_sidebar',
    imageDesktop: '/banners/challenge-desktop.jpg',
    imageMobile: '/banners/challenge-mobile.jpg',
    linkUrl: '/comunidad/desafios',
    linkText: 'Participar',
    startDate: '2024-03-01',
    endDate: '2024-05-31',
    status: 'inactive',
    order: 2,
    clicks: 890,
    impressions: 18920,
    ctr: 4.70
  },
  {
    id: 'BNR-006',
    title: 'Quiz de Bienestar Personalizado',
    description: 'Banner promocional del quiz',
    location: 'products_sidebar',
    imageDesktop: '/banners/quiz-desktop.jpg',
    imageMobile: '/banners/quiz-mobile.jpg',
    linkUrl: '/quiz',
    linkText: 'Comenzar Quiz',
    startDate: '2024-01-01',
    endDate: null,
    status: 'active',
    order: 1,
    clicks: 1678,
    impressions: 25430,
    ctr: 6.60
  },
  {
    id: 'BNR-007',
    title: 'Promoción de Verano - Cerrado',
    description: 'Promoción de verano finalizada',
    location: 'home_hero',
    imageDesktop: '/banners/summer-desktop.jpg',
    imageMobile: '/banners/summer-mobile.jpg',
    linkUrl: '/productos?promo=summer',
    linkText: 'Ver Ofertas',
    startDate: '2024-06-01',
    endDate: '2024-08-31',
    status: 'expired',
    order: 3,
    clicks: 4567,
    impressions: 67890,
    ctr: 6.73
  },
  {
    id: 'BNR-008',
    title: 'Testimonio - Transformación María',
    description: 'Historia de éxito destacada',
    location: 'checkout_bottom',
    imageDesktop: '/banners/testimonial-desktop.jpg',
    imageMobile: '/banners/testimonial-mobile.jpg',
    linkUrl: '/testimonios',
    linkText: 'Ver Más Historias',
    startDate: '2024-02-01',
    endDate: null,
    status: 'active',
    order: 1,
    clicks: 234,
    impressions: 8900,
    ctr: 2.63
  }
];

const locations = [
  { value: 'home_hero', label: 'Homepage - Hero Principal' },
  { value: 'home_secondary', label: 'Homepage - Sección Secundaria' },
  { value: 'products_top', label: 'Productos - Top' },
  { value: 'products_sidebar', label: 'Productos - Sidebar' },
  { value: 'cart_top', label: 'Carrito - Top' },
  { value: 'checkout_bottom', label: 'Checkout - Bottom' },
  { value: 'blog_sidebar', label: 'Blog - Sidebar' },
  { value: 'account_dashboard', label: 'Cuenta - Dashboard' }
];

export default function BannersAdminPage() {
  const [filterLocation, setFilterLocation] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');

  const filteredBanners = banners.filter(banner => {
    const matchesLocation = filterLocation === 'all' || banner.location === filterLocation;
    const matchesStatus = filterStatus === 'all' || banner.status === filterStatus;
    return matchesLocation && matchesStatus;
  });

  const stats = {
    total: banners.length,
    active: banners.filter(b => b.status === 'active').length,
    scheduled: banners.filter(b => b.status === 'scheduled').length,
    expired: banners.filter(b => b.status === 'expired').length,
    totalClicks: banners.reduce((sum, b) => sum + b.clicks, 0),
    totalImpressions: banners.reduce((sum, b) => sum + b.impressions, 0),
    averageCtr: banners.length > 0
      ? (banners.reduce((sum, b) => sum + b.ctr, 0) / banners.filter(b => b.impressions > 0).length).toFixed(2)
      : 0
  };

  const handleToggleStatus = (banner: typeof banners[0]) => {
    const newStatus = banner.status === 'active' ? 'inactive' : 'active';
    toast.success(`Banner ${newStatus === 'active' ? 'activado' : 'desactivado'}`);
  };

  const handleDelete = (banner: typeof banners[0]) => {
    if (confirm(`¿Estás seguro de que deseas eliminar el banner "${banner.title}"?`)) {
      toast.success('Banner eliminado');
    }
  };

  const handleMoveUp = (banner: typeof banners[0]) => {
    toast.success(`Banner movido hacia arriba`);
  };

  const handleMoveDown = (banner: typeof banners[0]) => {
    toast.success(`Banner movido hacia abajo`);
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

  const getLocationLabel = (location: string) => {
    return locations.find(l => l.value === location)?.label || location;
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Banners Promocionales</h1>
              <p className="text-gray-600">Gestiona banners y carruseles del sitio</p>
            </div>
            <button
              onClick={() => toast.success('Crear nuevo banner')}
              className="flex items-center gap-2 px-4 py-2 bg-[#003B7A] text-white rounded-lg hover:bg-[#002855] transition-colors"
            >
              <PlusIcon className="h-5 w-5" />
              Nuevo Banner
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
              <PhotoIcon className="h-5 w-5 text-[#003B7A]" />
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
              <EyeIcon className="h-5 w-5 text-purple-500" />
              <span className="text-sm text-gray-600">Impresiones</span>
            </div>
            <p className="text-2xl font-bold text-gray-900">
              {(stats.totalImpressions / 1000).toFixed(1)}K
            </p>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center gap-2 mb-2">
              <CheckCircleIcon className="h-5 w-5 text-[#7AB82E]" />
              <span className="text-sm text-gray-600">CTR Promedio</span>
            </div>
            <p className="text-2xl font-bold text-gray-900">{stats.averageCtr}%</p>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <select
                value={filterLocation}
                onChange={(e) => setFilterLocation(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#003B7A]"
              >
                <option value="all">Todas las Ubicaciones</option>
                {locations.map((location) => (
                  <option key={location.value} value={location.value}>
                    {location.label}
                  </option>
                ))}
              </select>
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
          </div>
        </div>

        {/* Banners Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {filteredBanners.map((banner) => (
            <div key={banner.id} className="bg-white rounded-lg shadow overflow-hidden">
              {/* Banner Preview */}
              <div className="aspect-[16/6] bg-gradient-to-br from-gray-100 to-gray-200 relative">
                <div className="absolute inset-0 flex items-center justify-center">
                  <PhotoIcon className="h-16 w-16 text-gray-400" />
                </div>
                <div className="absolute top-4 right-4 flex gap-2">
                  <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(banner.status)}`}>
                    {getStatusLabel(banner.status)}
                  </span>
                </div>
              </div>

              {/* Banner Info */}
              <div className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <h3 className="text-lg font-bold text-gray-900 mb-1">{banner.title}</h3>
                    <p className="text-sm text-gray-600 mb-2">{banner.description}</p>
                    <div className="flex items-center gap-2 text-xs text-gray-500">
                      <span className="px-2 py-1 bg-gray-100 rounded">{getLocationLabel(banner.location)}</span>
                      <span>Orden: {banner.order}</span>
                      <span>ID: {banner.id}</span>
                    </div>
                  </div>
                </div>

                {/* Dates */}
                <div className="mb-4 pb-4 border-b">
                  <div className="flex items-center gap-4 text-sm">
                    <div className="flex items-center gap-2">
                      <CalendarIcon className="h-4 w-4 text-gray-400" />
                      <span className="text-gray-600">Inicio:</span>
                      <span className="font-medium text-gray-900">{banner.startDate}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <CalendarIcon className="h-4 w-4 text-gray-400" />
                      <span className="text-gray-600">Fin:</span>
                      <span className="font-medium text-gray-900">{banner.endDate || 'Sin límite'}</span>
                    </div>
                  </div>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-3 gap-4 mb-4 pb-4 border-b">
                  <div>
                    <p className="text-xs text-gray-600">Impresiones</p>
                    <p className="text-lg font-bold text-gray-900">{banner.impressions.toLocaleString()}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-600">Clicks</p>
                    <p className="text-lg font-bold text-gray-900">{banner.clicks.toLocaleString()}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-600">CTR</p>
                    <p className="text-lg font-bold text-[#7AB82E]">{banner.ctr.toFixed(2)}%</p>
                  </div>
                </div>

                {/* Link Info */}
                <div className="mb-4 text-sm">
                  <p className="text-gray-600 mb-1">Enlace:</p>
                  <code className="px-2 py-1 bg-gray-100 rounded text-xs text-gray-900">
                    {banner.linkUrl}
                  </code>
                  <p className="text-gray-600 mt-2">Texto del botón: <span className="font-medium text-gray-900">{banner.linkText}</span></p>
                </div>

                {/* Images */}
                <div className="mb-4 flex gap-2">
                  <div className="flex items-center gap-1 text-xs text-gray-600">
                    <ComputerDesktopIcon className="h-4 w-4" />
                    Desktop
                  </div>
                  <div className="flex items-center gap-1 text-xs text-gray-600">
                    <DevicePhoneMobileIcon className="h-4 w-4" />
                    Mobile
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleToggleStatus(banner)}
                    className={`flex-1 px-3 py-2 rounded-lg font-medium text-sm transition-colors ${
                      banner.status === 'active'
                        ? 'bg-red-50 text-red-700 hover:bg-red-100'
                        : 'bg-green-50 text-green-700 hover:bg-green-100'
                    }`}
                  >
                    {banner.status === 'active' ? (
                      <>
                        <EyeSlashIcon className="h-4 w-4 inline mr-1" />
                        Desactivar
                      </>
                    ) : (
                      <>
                        <EyeIcon className="h-4 w-4 inline mr-1" />
                        Activar
                      </>
                    )}
                  </button>

                  <button
                    onClick={() => toast.success('Editar banner')}
                    className="p-2 text-[#003B7A] hover:bg-blue-50 rounded-lg"
                    title="Editar"
                  >
                    <PencilIcon className="h-5 w-5" />
                  </button>

                  <button
                    onClick={() => handleMoveUp(banner)}
                    className="p-2 text-gray-600 hover:bg-gray-50 rounded-lg"
                    title="Mover arriba"
                  >
                    <ArrowUpIcon className="h-5 w-5" />
                  </button>

                  <button
                    onClick={() => handleMoveDown(banner)}
                    className="p-2 text-gray-600 hover:bg-gray-50 rounded-lg"
                    title="Mover abajo"
                  >
                    <ArrowDownIcon className="h-5 w-5" />
                  </button>

                  <button
                    onClick={() => handleDelete(banner)}
                    className="p-2 text-red-600 hover:bg-red-50 rounded-lg"
                    title="Eliminar"
                  >
                    <TrashIcon className="h-5 w-5" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>

        {filteredBanners.length === 0 && (
          <div className="bg-white rounded-lg shadow text-center py-12">
            <PhotoIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600">No se encontraron banners</p>
          </div>
        )}

        {/* Results count */}
        {filteredBanners.length > 0 && (
          <div className="mt-6 text-sm text-gray-700">
            Mostrando <span className="font-medium">{filteredBanners.length}</span> de{' '}
            <span className="font-medium">{banners.length}</span> banners
          </div>
        )}
      </div>
    </div>
  );
}
