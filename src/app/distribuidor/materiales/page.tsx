'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/Button';
import { Card, CardContent } from '@/components/ui/Card';
import {
  ArrowDownTrayIcon,
  DocumentTextIcon,
  PhotoIcon,
  VideoCameraIcon,
  PresentationChartLineIcon,
  ShareIcon,
  MagnifyingGlassIcon,
  FunnelIcon,
  EyeIcon,
} from '@heroicons/react/24/outline';
import { toast } from 'sonner';

const mockMaterials = [
  {
    id: '1',
    title: 'Catálogo Digital 2025',
    type: 'PDF',
    category: 'Catálogos',
    description: 'Catálogo completo de productos con precios y beneficios',
    size: '12.5 MB',
    downloads: 234,
    preview: '/materials/catalog-preview.jpg',
    date: '2025-01-15',
  },
  {
    id: '2',
    title: 'Banner Facebook - Promoción Enero',
    type: 'Imagen',
    category: 'Redes Sociales',
    description: 'Banner optimizado para Facebook (1200x628px)',
    size: '450 KB',
    downloads: 189,
    preview: '/materials/fb-banner.jpg',
    date: '2025-01-10',
  },
  {
    id: '3',
    title: 'Video Testimonio - Vitamina D3',
    type: 'Video',
    category: 'Testimonios',
    description: 'Video testimonial de cliente satisfecho',
    size: '45 MB',
    downloads: 156,
    preview: '/materials/video-thumb.jpg',
    date: '2025-01-05',
  },
  {
    id: '4',
    title: 'Presentación Negocio Tonic Life',
    type: 'PowerPoint',
    category: 'Presentaciones',
    description: 'Presentación completa del plan de negocio',
    size: '8.2 MB',
    downloads: 312,
    preview: '/materials/ppt-preview.jpg',
    date: '2024-12-20',
  },
  {
    id: '5',
    title: 'Stories Instagram - Pack 10 diseños',
    type: 'Imagen',
    category: 'Redes Sociales',
    description: 'Pack de 10 stories editables para Instagram',
    size: '3.5 MB',
    downloads: 267,
    preview: '/materials/ig-stories.jpg',
    date: '2024-12-15',
  },
  {
    id: '6',
    title: 'Guía de Beneficios por Producto',
    type: 'PDF',
    category: 'Guías',
    description: 'Guía detallada de beneficios y usos de cada producto',
    size: '5.8 MB',
    downloads: 423,
    preview: '/materials/benefits-guide.jpg',
    date: '2024-12-10',
  },
  {
    id: '7',
    title: 'Tarjetas de Presentación Editables',
    type: 'PDF',
    category: 'Branding',
    description: 'Plantilla editable para tarjetas personales',
    size: '1.2 MB',
    downloads: 198,
    preview: '/materials/business-cards.jpg',
    date: '2024-12-05',
  },
  {
    id: '8',
    title: 'Video Explicativo - Cómo Ganar',
    type: 'Video',
    category: 'Capacitación',
    description: 'Video explicando el plan de compensación',
    size: '67 MB',
    downloads: 289,
    preview: '/materials/comp-plan-video.jpg',
    date: '2024-11-25',
  },
];

const categories = ['Todas', 'Catálogos', 'Redes Sociales', 'Testimonios', 'Presentaciones', 'Guías', 'Branding', 'Capacitación'];
const types = ['Todos', 'PDF', 'Imagen', 'Video', 'PowerPoint'];

const typeIcons = {
  PDF: DocumentTextIcon,
  Imagen: PhotoIcon,
  Video: VideoCameraIcon,
  PowerPoint: PresentationChartLineIcon,
};

export default function MaterialesPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterCategory, setFilterCategory] = useState('Todas');
  const [filterType, setFilterType] = useState('Todos');
  const [sortBy, setSortBy] = useState('recent');

  const filteredMaterials = mockMaterials.filter(material => {
    if (searchQuery && !material.title.toLowerCase().includes(searchQuery.toLowerCase()) && !material.description.toLowerCase().includes(searchQuery.toLowerCase())) {
      return false;
    }
    if (filterCategory !== 'Todas' && material.category !== filterCategory) {
      return false;
    }
    if (filterType !== 'Todos' && material.type !== filterType) {
      return false;
    }
    return true;
  });

  const handleDownload = (materialTitle: string) => {
    toast.success(`Descargando: ${materialTitle}`);
  };

  const handlePreview = (materialTitle: string) => {
    toast.info(`Abriendo vista previa: ${materialTitle}`);
  };

  const handleShare = (materialTitle: string) => {
    toast.success(`Enlace de ${materialTitle} copiado al portapapeles`);
  };

  const stats = {
    totalMaterials: mockMaterials.length,
    totalDownloads: mockMaterials.reduce((sum, m) => sum + m.downloads, 0),
    categories: [...new Set(mockMaterials.map(m => m.category))].length,
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-gradient-to-r from-[#003B7A] to-[#003B7A]/90 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <ArrowDownTrayIcon className="h-10 w-10" />
                <h1 className="text-4xl font-bold">Material de Marketing</h1>
              </div>
              <p className="text-white/80 text-lg">
                Recursos descargables para impulsar tu negocio
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
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 mb-1">Total de Materiales</p>
                  <p className="text-3xl font-bold text-gray-900">{stats.totalMaterials}</p>
                </div>
                <DocumentTextIcon className="h-12 w-12 text-blue-400" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 mb-1">Descargas Totales</p>
                  <p className="text-3xl font-bold text-gray-900">{stats.totalDownloads}</p>
                </div>
                <ArrowDownTrayIcon className="h-12 w-12 text-green-400" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 mb-1">Categorías</p>
                  <p className="text-3xl font-bold text-gray-900">{stats.categories}</p>
                </div>
                <FunnelIcon className="h-12 w-12 text-purple-400" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card className="mb-6">
          <CardContent className="p-6">
            <div className="flex flex-col lg:flex-row gap-4">
              {/* Search */}
              <div className="flex-1 relative">
                <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Buscar materiales..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#7AB82E] focus:border-transparent"
                />
              </div>

              {/* Category Filter */}
              <select
                value={filterCategory}
                onChange={(e) => setFilterCategory(e.target.value)}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#7AB82E] focus:border-transparent"
              >
                {categories.map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>

              {/* Type Filter */}
              <select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value)}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#7AB82E] focus:border-transparent"
              >
                {types.map(type => (
                  <option key={type} value={type}>{type}</option>
                ))}
              </select>

              {/* Sort */}
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#7AB82E] focus:border-transparent"
              >
                <option value="recent">Más Recientes</option>
                <option value="popular">Más Descargados</option>
                <option value="name">Nombre A-Z</option>
              </select>
            </div>
          </CardContent>
        </Card>

        {/* Materials Grid */}
        {filteredMaterials.length === 0 ? (
          <Card>
            <CardContent className="p-16 text-center">
              <DocumentTextIcon className="h-16 w-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-xl font-bold text-gray-900 mb-2">
                No se encontraron materiales
              </h3>
              <p className="text-gray-600">
                Intenta ajustar los filtros de búsqueda
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredMaterials.map((material) => {
              const IconComponent = typeIcons[material.type as keyof typeof typeIcons];
              return (
                <Card key={material.id} className="hover:shadow-lg transition-shadow">
                  <CardContent className="p-6">
                    {/* Preview Image */}
                    <div className="aspect-video bg-gray-100 rounded-lg mb-4 flex items-center justify-center relative overflow-hidden">
                      <div className="absolute inset-0 bg-gradient-to-br from-[#003B7A]/20 to-[#7AB82E]/20 flex items-center justify-center">
                        <IconComponent className="h-16 w-16 text-gray-400" />
                      </div>
                      {material.type === 'Video' && (
                        <div className="absolute inset-0 flex items-center justify-center">
                          <div className="w-12 h-12 bg-white/90 rounded-full flex items-center justify-center">
                            <div className="w-0 h-0 border-t-6 border-t-transparent border-l-10 border-l-[#003B7A] border-b-6 border-b-transparent ml-1" />
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Type Badge */}
                    <div className="flex items-center gap-2 mb-2">
                      <span className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium ${
                        material.type === 'PDF' ? 'bg-red-100 text-red-800' :
                        material.type === 'Imagen' ? 'bg-blue-100 text-blue-800' :
                        material.type === 'Video' ? 'bg-purple-100 text-purple-800' :
                        'bg-orange-100 text-orange-800'
                      }`}>
                        <IconComponent className="h-3 w-3 mr-1" />
                        {material.type}
                      </span>
                      <span className="text-xs text-gray-500">{material.category}</span>
                    </div>

                    {/* Title & Description */}
                    <h3 className="font-bold text-gray-900 mb-2 line-clamp-2">
                      {material.title}
                    </h3>
                    <p className="text-sm text-gray-600 mb-4 line-clamp-2">
                      {material.description}
                    </p>

                    {/* Meta Info */}
                    <div className="flex items-center justify-between text-xs text-gray-500 mb-4">
                      <span>{material.size}</span>
                      <span>{material.downloads} descargas</span>
                    </div>

                    {/* Actions */}
                    <div className="space-y-2">
                      <Button
                        variant="primary"
                        size="sm"
                        className="w-full"
                        leftIcon={<ArrowDownTrayIcon className="h-4 w-4" />}
                        onClick={() => handleDownload(material.title)}
                      >
                        Descargar
                      </Button>
                      <div className="grid grid-cols-2 gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          leftIcon={<EyeIcon className="h-4 w-4" />}
                          onClick={() => handlePreview(material.title)}
                        >
                          Vista Previa
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          leftIcon={<ShareIcon className="h-4 w-4" />}
                          onClick={() => handleShare(material.title)}
                        >
                          Compartir
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}

        {/* Help Section */}
        <Card className="mt-8 bg-gradient-to-r from-[#7AB82E] to-[#7AB82E]/90 text-white">
          <CardContent className="p-8">
            <div className="grid md:grid-cols-2 gap-8">
              <div>
                <h3 className="text-2xl font-bold mb-4">¿Necesitas Material Personalizado?</h3>
                <p className="text-white/90 mb-4">
                  Si necesitas materiales con tu información personalizada (nombre, contacto, QR), contáctanos.
                </p>
                <ul className="space-y-2 text-sm text-white/90">
                  <li>✓ Tarjetas de presentación personalizadas</li>
                  <li>✓ Catálogos con tu enlace de referido</li>
                  <li>✓ Material para eventos especiales</li>
                </ul>
              </div>
              <div className="flex items-center justify-center">
                <Link href="/distribuidor/soporte">
                  <Button variant="secondary" size="lg">
                    Solicitar Material Personalizado
                  </Button>
                </Link>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Tips Section */}
        <Card className="mt-6">
          <CardContent className="p-8">
            <h3 className="text-xl font-bold text-gray-900 mb-4">
              💡 Tips para Usar el Material de Marketing
            </h3>
            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <h4 className="font-semibold text-gray-900 mb-2">Redes Sociales</h4>
                <ul className="text-sm text-gray-600 space-y-1">
                  <li>• Publica contenido 3-5 veces por semana</li>
                  <li>• Usa los hashtags sugeridos en cada material</li>
                  <li>• Personaliza los textos con tu experiencia</li>
                  <li>• Responde todos los comentarios y mensajes</li>
                </ul>
              </div>
              <div>
                <h4 className="font-semibold text-gray-900 mb-2">Presentaciones</h4>
                <ul className="text-sm text-gray-600 space-y-1">
                  <li>• Practica antes de presentar a prospectos</li>
                  <li>• Adapta el contenido a tu audiencia</li>
                  <li>• Comparte testimonios reales</li>
                  <li>• Siempre incluye tu información de contacto</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
