'use client';

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Button } from '@/components/ui/Button';
import { Card, CardContent } from '@/components/ui/Card';
import {
  DocumentTextIcon,
  MagnifyingGlassIcon,
  FunnelIcon,
  PlusIcon,
  PencilIcon,
  TrashIcon,
  EyeIcon,
  PhotoIcon,
  NewspaperIcon,
  TagIcon,
  CalendarIcon,
  CheckCircleIcon,
  XCircleIcon,
  ClockIcon,
} from '@heroicons/react/24/outline';
import { toast } from 'sonner';

interface ContentItem {
  id: string;
  type: string;
  title: string;
  description: string;
  image: string | null;
  status: string;
  author: string;
  category: string;
  publishedAt: string | null;
  updatedAt: string;
  views: number;
  clicks: number;
}

const mockContent: ContentItem[] = [
  {
    id: '1',
    type: 'banner',
    title: 'Banner Principal - Promoción Enero',
    description: 'Banner promocional para descuentos de enero',
    image: 'https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?w=800&h=400&fit=crop',
    status: 'published',
    author: 'Roberto Sánchez',
    category: 'Marketing',
    publishedAt: '2025-01-01T00:00:00',
    updatedAt: '2025-01-15T10:30:00',
    views: 12450,
    clicks: 876,
  },
  {
    id: '2',
    type: 'blog',
    title: '10 Beneficios de la Vitamina D3',
    description: 'Artículo educativo sobre los beneficios de la vitamina D3',
    image: 'https://images.unsplash.com/photo-1505751172876-fa1923c5c528?w=800&h=400&fit=crop',
    status: 'published',
    author: 'Laura Mendoza',
    category: 'Educación',
    publishedAt: '2025-01-20T09:00:00',
    updatedAt: '2025-01-20T09:00:00',
    views: 3240,
    clicks: 245,
  },
  {
    id: '3',
    type: 'product_info',
    title: 'Guía de Uso - Colágeno Hidrolizado',
    description: 'Información detallada sobre cómo usar el colágeno',
    image: 'https://images.unsplash.com/photo-1556742111-a301076d9d18?w=800&h=400&fit=crop',
    status: 'published',
    author: 'Diana Flores',
    category: 'Productos',
    publishedAt: '2025-01-18T14:00:00',
    updatedAt: '2025-01-22T11:20:00',
    views: 5680,
    clicks: 892,
  },
  {
    id: '4',
    type: 'announcement',
    title: 'Nueva Línea de Productos Premium',
    description: 'Anuncio sobre el lanzamiento de productos premium',
    image: 'https://images.unsplash.com/photo-1556740749-887f6717d7e4?w=800&h=400&fit=crop',
    status: 'draft',
    author: 'Roberto Sánchez',
    category: 'Noticias',
    publishedAt: null,
    updatedAt: '2025-01-24T16:45:00',
    views: 0,
    clicks: 0,
  },
  {
    id: '5',
    type: 'blog',
    title: 'Beneficios del Omega 3 para el Corazón',
    description: 'Artículo científico sobre omega 3 y salud cardiovascular',
    image: 'https://images.unsplash.com/photo-1505751172876-fa1923c5c528?w=800&h=400&fit=crop',
    status: 'published',
    author: 'Patricia González',
    category: 'Educación',
    publishedAt: '2025-01-15T10:00:00',
    updatedAt: '2025-01-15T10:00:00',
    views: 4320,
    clicks: 312,
  },
  {
    id: '6',
    type: 'faq',
    title: 'Preguntas Frecuentes - Envíos',
    description: 'Respuestas a preguntas comunes sobre envíos',
    image: null,
    status: 'published',
    author: 'Ana Martínez',
    category: 'Soporte',
    publishedAt: '2025-01-10T12:00:00',
    updatedAt: '2025-01-23T09:15:00',
    views: 8920,
    clicks: 1234,
  },
  {
    id: '7',
    type: 'testimonial',
    title: 'Testimonio - María Rodríguez',
    description: 'Historia de éxito de cliente satisfecha',
    image: 'https://ui-avatars.com/api/?name=Maria+Rodriguez&size=400',
    status: 'published',
    author: 'Laura Mendoza',
    category: 'Testimonios',
    publishedAt: '2025-01-22T15:30:00',
    updatedAt: '2025-01-22T15:30:00',
    views: 2150,
    clicks: 98,
  },
  {
    id: '8',
    type: 'banner',
    title: 'Banner Secundario - Envío Gratis',
    description: 'Banner promocional de envío gratis',
    image: 'https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?w=800&h=400&fit=crop',
    status: 'scheduled',
    author: 'Roberto Sánchez',
    category: 'Marketing',
    publishedAt: '2025-02-01T00:00:00',
    updatedAt: '2025-01-25T11:00:00',
    views: 0,
    clicks: 0,
  },
  {
    id: '9',
    type: 'blog',
    title: 'Guía Completa de Suplementación',
    description: 'Guía detallada sobre cómo suplementar correctamente',
    image: 'https://images.unsplash.com/photo-1505751172876-fa1923c5c528?w=800&h=400&fit=crop',
    status: 'draft',
    author: 'Diana Flores',
    category: 'Educación',
    publishedAt: null,
    updatedAt: '2025-01-25T14:20:00',
    views: 0,
    clicks: 0,
  },
  {
    id: '10',
    type: 'product_info',
    title: 'Ficha Técnica - Probióticos Avanzados',
    description: 'Información técnica del producto',
    image: 'https://images.unsplash.com/photo-1556742111-a301076d9d18?w=800&h=400&fit=crop',
    status: 'published',
    author: 'Ana Martínez',
    category: 'Productos',
    publishedAt: '2025-01-12T08:00:00',
    updatedAt: '2025-01-12T08:00:00',
    views: 6780,
    clicks: 567,
  },
];

const contentTypes = [
  { id: 'all', name: 'Todos los Tipos', icon: DocumentTextIcon },
  { id: 'banner', name: 'Banners', icon: PhotoIcon },
  { id: 'blog', name: 'Blog', icon: NewspaperIcon },
  { id: 'product_info', name: 'Info Productos', icon: TagIcon },
  { id: 'announcement', name: 'Anuncios', icon: DocumentTextIcon },
  { id: 'faq', name: 'FAQs', icon: DocumentTextIcon },
  { id: 'testimonial', name: 'Testimonios', icon: DocumentTextIcon },
];

export default function ContenidoPage() {
  const [content, setContent] = useState(mockContent);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');

  const filteredContent = content.filter(item => {
    const matchesSearch = item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         item.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesType = filterType === 'all' || item.type === filterType;
    const matchesStatus = filterStatus === 'all' || item.status === filterStatus;
    return matchesSearch && matchesType && matchesStatus;
  });

  const stats = {
    total: content.length,
    published: content.filter(c => c.status === 'published').length,
    draft: content.filter(c => c.status === 'draft').length,
    scheduled: content.filter(c => c.status === 'scheduled').length,
  };

  const totalViews = content.reduce((sum, c) => sum + c.views, 0);
  const totalClicks = content.reduce((sum, c) => sum + c.clicks, 0);

  const handleDeleteContent = (contentId: string) => {
    setContent(content.filter(c => c.id !== contentId));
    toast.success('Contenido eliminado correctamente');
  };

  const handlePublish = (contentId: string) => {
    setContent(content.map(c =>
      c.id === contentId ? { ...c, status: 'published', publishedAt: new Date().toISOString() } : c
    ));
    toast.success('Contenido publicado correctamente');
  };

  const handleUnpublish = (contentId: string) => {
    setContent(content.map(c =>
      c.id === contentId ? { ...c, status: 'draft', publishedAt: null } : c
    ));
    toast.success('Contenido despublicado correctamente');
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'published':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-1 bg-green-100 text-green-700 rounded-full text-xs font-medium">
            <CheckCircleIcon className="h-3 w-3" />
            Publicado
          </span>
        );
      case 'draft':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-1 bg-gray-100 text-gray-700 rounded-full text-xs font-medium">
            <PencilIcon className="h-3 w-3" />
            Borrador
          </span>
        );
      case 'scheduled':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-1 bg-blue-100 text-blue-700 rounded-full text-xs font-medium">
            <ClockIcon className="h-3 w-3" />
            Programado
          </span>
        );
      default:
        return null;
    }
  };

  const getTypeBadge = (type: string) => {
    const typeNames: Record<string, string> = {
      banner: 'Banner',
      blog: 'Blog',
      product_info: 'Info Producto',
      announcement: 'Anuncio',
      faq: 'FAQ',
      testimonial: 'Testimonio',
    };
    return (
      <span className="inline-flex items-center px-2 py-1 bg-purple-100 text-purple-700 rounded-full text-xs font-medium">
        {typeNames[type] || type}
      </span>
    );
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'No publicado';
    return new Date(dateString).toLocaleDateString('es-MX', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatNumber = (num: number) => {
    return new Intl.NumberFormat('es-MX').format(num);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-gradient-to-r from-[#003B7A] to-[#003B7A]/90 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <DocumentTextIcon className="h-10 w-10" />
                <h1 className="text-4xl font-bold">Gestión de Contenido</h1>
              </div>
              <p className="text-white/80 text-lg">
                Administra todo el contenido del sitio web
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
                Nuevo Contenido
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
                  <p className="text-sm text-gray-600 mb-1">Total Contenido</p>
                  <p className="text-3xl font-bold text-gray-900">{stats.total}</p>
                </div>
                <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                  <DocumentTextIcon className="h-6 w-6 text-blue-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 mb-1">Publicados</p>
                  <p className="text-3xl font-bold text-green-600">{stats.published}</p>
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
                  <p className="text-sm text-gray-600 mb-1">Total Vistas</p>
                  <p className="text-3xl font-bold text-purple-600">{formatNumber(totalViews)}</p>
                </div>
                <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center">
                  <EyeIcon className="h-6 w-6 text-purple-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 mb-1">Total Clicks</p>
                  <p className="text-3xl font-bold text-orange-600">{formatNumber(totalClicks)}</p>
                </div>
                <div className="w-12 h-12 bg-orange-100 rounded-full flex items-center justify-center">
                  <CalendarIcon className="h-6 w-6 text-orange-600" />
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
                    placeholder="Buscar contenido..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#003B7A] focus:border-transparent"
                  />
                </div>
              </div>

              {/* Type Filter */}
              <div className="flex items-center gap-2">
                <FunnelIcon className="h-5 w-5 text-gray-400" />
                <select
                  value={filterType}
                  onChange={(e) => setFilterType(e.target.value)}
                  className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#003B7A] focus:border-transparent"
                >
                  {contentTypes.map((type) => (
                    <option key={type.id} value={type.id}>
                      {type.name}
                    </option>
                  ))}
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
                  <option value="published">Publicados</option>
                  <option value="draft">Borradores</option>
                  <option value="scheduled">Programados</option>
                </select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Content Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredContent.map((item) => (
            <Card key={item.id} className="overflow-hidden hover:shadow-lg transition-shadow">
              <div className="relative h-48 bg-gray-200">
                {item.image ? (
                  <Image
                    src={item.image}
                    alt={item.title}
                    fill
                    className="object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <DocumentTextIcon className="h-20 w-20 text-gray-400" />
                  </div>
                )}
                <div className="absolute top-3 right-3 flex gap-2">
                  {getStatusBadge(item.status)}
                </div>
              </div>
              <CardContent className="p-6">
                <div className="flex items-start justify-between mb-2">
                  {getTypeBadge(item.type)}
                  <span className="text-xs text-gray-500">{item.category}</span>
                </div>
                <h3 className="font-bold text-gray-900 mb-2 line-clamp-2">{item.title}</h3>
                <p className="text-sm text-gray-600 mb-4 line-clamp-2">{item.description}</p>

                <div className="space-y-2 mb-4">
                  <div className="flex items-center gap-2 text-xs text-gray-500">
                    <CalendarIcon className="h-4 w-4" />
                    <span>{formatDate(item.publishedAt)}</span>
                  </div>
                  <div className="flex items-center gap-4 text-xs text-gray-500">
                    <div className="flex items-center gap-1">
                      <EyeIcon className="h-4 w-4" />
                      <span>{formatNumber(item.views)} vistas</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <span>{formatNumber(item.clicks)} clicks</span>
                    </div>
                  </div>
                  <p className="text-xs text-gray-500">
                    Por: {item.author}
                  </p>
                </div>

                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1"
                    leftIcon={<EyeIcon className="h-4 w-4" />}
                    onClick={() => toast.info('Función próximamente disponible')}
                  >
                    Ver
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1"
                    leftIcon={<PencilIcon className="h-4 w-4" />}
                    onClick={() => toast.info('Función próximamente disponible')}
                  >
                    Editar
                  </Button>
                  {item.status === 'draft' && (
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={() => handlePublish(item.id)}
                    >
                      <CheckCircleIcon className="h-4 w-4" />
                    </Button>
                  )}
                  {item.status === 'published' && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleUnpublish(item.id)}
                    >
                      <XCircleIcon className="h-4 w-4" />
                    </Button>
                  )}
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDeleteContent(item.id)}
                  >
                    <TrashIcon className="h-4 w-4 text-red-600" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {filteredContent.length === 0 && (
          <Card>
            <CardContent className="p-12">
              <div className="text-center">
                <DocumentTextIcon className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                <h3 className="text-xl font-bold text-gray-900 mb-2">
                  No se encontró contenido
                </h3>
                <p className="text-gray-600 mb-6">
                  Intenta ajustar los filtros de búsqueda
                </p>
                <Button
                  variant="primary"
                  leftIcon={<PlusIcon className="h-5 w-5" />}
                  onClick={() => toast.info('Función próximamente disponible')}
                >
                  Crear Nuevo Contenido
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Pagination */}
        {filteredContent.length > 0 && (
          <div className="mt-6 flex items-center justify-between">
            <p className="text-sm text-gray-600">
              Mostrando {filteredContent.length} de {content.length} elementos
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
