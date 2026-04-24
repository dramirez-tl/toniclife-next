'use client';

import { useState, Suspense } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/Button';
import { Card, CardContent } from '@/components/ui/Card';
import {
  ArrowDownTrayIcon,
  DocumentTextIcon,
  PhotoIcon,
  VideoCameraIcon,
  PresentationChartLineIcon,
  DocumentIcon,
  ShareIcon,
  MagnifyingGlassIcon,
  FunnelIcon,
  EyeIcon,
} from '@heroicons/react/24/outline';
import { SearchableSelect } from '@/components/ui/SearchableSelect';
import { useQueryFilters } from '@/hooks/useQueryFilters';
import { usePublishedMaterials } from '@/hooks/useMaterials';
import { materialsService } from '@/services/materials.service';
import type { MarketingMaterial, MaterialType, MaterialCategory } from '@/types/material';
import { toast } from 'sonner';

const API_BASE = process.env.NEXT_PUBLIC_API_URL?.replace('/api/v1', '') || 'http://localhost:3001';
function resolveUrl(url: string | null): string | null {
  if (!url) return null;
  if (url.startsWith('http')) return url;
  return `${API_BASE}${url}`;
}

const categoryLabels: Record<MaterialCategory, string> = {
  catalogos: 'Catálogos',
  redes_sociales: 'Redes Sociales',
  testimonios: 'Testimonios',
  presentaciones: 'Presentaciones',
  guias: 'Guías',
  branding: 'Branding',
  capacitacion: 'Capacitación',
  otros: 'Otros',
};

const typeLabels: Record<MaterialType, string> = {
  pdf: 'PDF',
  image: 'Imagen',
  video: 'Video',
  document: 'Documento',
  presentation: 'Presentación',
};

const typeIcons: Record<MaterialType, typeof DocumentTextIcon> = {
  pdf: DocumentTextIcon,
  image: PhotoIcon,
  video: VideoCameraIcon,
  document: DocumentIcon,
  presentation: PresentationChartLineIcon,
};

const typeBadgeColors: Record<MaterialType, string> = {
  pdf: 'bg-red-100 text-red-800',
  image: 'bg-blue-100 text-blue-800',
  video: 'bg-purple-100 text-purple-800',
  document: 'bg-gray-100 text-gray-800',
  presentation: 'bg-orange-100 text-orange-800',
};

function formatBytes(bytes: number | null): string {
  if (!bytes) return '—';
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}

export default function MaterialesPage() {
  return (
    <Suspense>
      <MaterialesContent />
    </Suspense>
  );
}

function MaterialesContent() {
  const [searchQuery, setSearchQuery] = useState('');
  const { get, setParams } = useQueryFilters({
    category: 'all',
    type: 'all',
    sortBy: 'recent',
  });

  const filterCategory = get('category');
  const filterType = get('type');
  const sortBy = get('sortBy');

  const { data: materials = [], isLoading } = usePublishedMaterials({
    category: filterCategory !== 'all' ? filterCategory : undefined,
    type: filterType !== 'all' ? filterType : undefined,
    search: searchQuery || undefined,
  });

  const sorted = [...materials].sort((a, b) => {
    if (sortBy === 'popular') return b.downloadCount - a.downloadCount;
    if (sortBy === 'name') return a.title.localeCompare(b.title);
    // recent (default): createdAt desc
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });

  const stats = {
    totalMaterials: materials.length,
    totalDownloads: materials.reduce((sum, m) => sum + m.downloadCount, 0),
    categories: new Set(materials.map((m) => m.category)).size,
  };

  const handleDownload = async (material: MarketingMaterial) => {
    if (!material.hasFile) {
      toast.error('Este material aún no tiene archivo disponible');
      return;
    }
    try {
      const { url } = await materialsService.getDownloadUrl(material.id);
      // Abrir en nueva pestaña para respetar Content-Disposition attachment
      window.open(url, '_blank', 'noopener');
      toast.success(`Descargando: ${material.title}`);
    } catch {
      toast.error('No se pudo iniciar la descarga');
    }
  };

  const handlePreview = async (material: MarketingMaterial) => {
    if (!material.hasFile) {
      toast.error('No hay archivo para mostrar');
      return;
    }
    try {
      const { url } = await materialsService.getPreviewUrl(material.id);
      window.open(url, '_blank', 'noopener');
    } catch {
      toast.error('No se pudo abrir la vista previa');
    }
  };

  const handleShare = async (material: MarketingMaterial) => {
    try {
      const { url } = await materialsService.getPreviewUrl(material.id);
      await navigator.clipboard.writeText(url);
      toast.success(`Enlace de ${material.title} copiado (válido 1 hora)`);
    } catch {
      toast.error('No se pudo copiar el enlace');
    }
  };

  const categoryOptions = Object.entries(categoryLabels).map(([value, label]) => ({ value, label }));
  const typeOptions = Object.entries(typeLabels).map(([value, label]) => ({ value, label }));

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-gradient-to-r from-[#3E667D] to-[#3E667D]/90 text-white">
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
              <Button variant="secondary">Volver al Panel Principal</Button>
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
              <div className="flex-1 relative">
                <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Buscar materiales..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#a7c1e2] focus:border-transparent"
                />
              </div>
              <SearchableSelect
                options={categoryOptions}
                value={filterCategory}
                onChange={(val) => setParams({ category: val })}
                allLabel="Todas"
                allValue="all"
              />
              <SearchableSelect
                options={typeOptions}
                value={filterType}
                onChange={(val) => setParams({ type: val })}
                allLabel="Todos"
                allValue="all"
              />
              <SearchableSelect
                options={[
                  { value: 'recent', label: 'Más Recientes' },
                  { value: 'popular', label: 'Más Descargados' },
                  { value: 'name', label: 'Nombre A-Z' },
                ]}
                value={sortBy}
                onChange={(val) => setParams({ sortBy: val })}
                showAllOption={false}
              />
            </div>
          </CardContent>
        </Card>

        {/* Materials Grid */}
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[0, 1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="animate-pulse rounded-xl bg-white h-72 border border-gray-200" />
            ))}
          </div>
        ) : sorted.length === 0 ? (
          <Card>
            <CardContent className="p-16 text-center">
              <DocumentTextIcon className="h-16 w-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-xl font-bold text-gray-900 mb-2">
                No hay materiales disponibles
              </h3>
              <p className="text-gray-600">
                {searchQuery || filterCategory !== 'all' || filterType !== 'all'
                  ? 'Intenta ajustar los filtros de búsqueda'
                  : 'Los materiales de marketing aparecerán aquí cuando el administrador los publique.'}
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {sorted.map((material) => {
              const IconComponent = typeIcons[material.type] || DocumentIcon;
              return (
                <Card key={material.id} className="hover:shadow-lg transition-shadow">
                  <CardContent className="p-6">
                    {/* Preview */}
                    <div className="aspect-video bg-gray-100 rounded-lg mb-4 flex items-center justify-center relative overflow-hidden">
                      {material.thumbnailUrl ? (
                        <img
                          src={resolveUrl(material.thumbnailUrl)!}
                          alt={material.title}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="absolute inset-0 bg-gradient-to-br from-[#3E667D]/20 to-[#C8DDF2]/20 flex items-center justify-center">
                          <IconComponent className="h-16 w-16 text-gray-400" />
                        </div>
                      )}
                      {material.type === 'video' && (
                        <div className="absolute inset-0 flex items-center justify-center">
                          <div className="w-12 h-12 bg-white/90 rounded-full flex items-center justify-center">
                            <div className="w-0 h-0 border-t-6 border-t-transparent border-l-10 border-l-[#3E667D] border-b-6 border-b-transparent ml-1" />
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Type + Category */}
                    <div className="flex items-center gap-2 mb-2">
                      <span
                        className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium ${typeBadgeColors[material.type]}`}
                      >
                        <IconComponent className="h-3 w-3 mr-1" />
                        {typeLabels[material.type]}
                      </span>
                      <span className="text-xs text-gray-500">{categoryLabels[material.category]}</span>
                    </div>

                    {/* Title + Description */}
                    <h3 className="font-bold text-gray-900 mb-2 line-clamp-2">{material.title}</h3>
                    {material.description && (
                      <p className="text-sm text-gray-600 mb-4 line-clamp-2">
                        {material.description}
                      </p>
                    )}

                    {/* Meta */}
                    <div className="flex items-center justify-between text-xs text-gray-500 mb-4">
                      <span>{formatBytes(material.fileSize)}</span>
                      <span>{material.downloadCount} descargas</span>
                    </div>

                    {/* Actions */}
                    <div className="space-y-2">
                      <Button
                        variant="primary"
                        size="sm"
                        className="w-full"
                        leftIcon={<ArrowDownTrayIcon className="h-4 w-4" />}
                        onClick={() => handleDownload(material)}
                      >
                        Descargar
                      </Button>
                      <div className="grid grid-cols-2 gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          leftIcon={<EyeIcon className="h-4 w-4" />}
                          onClick={() => handlePreview(material)}
                        >
                          Vista Previa
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          leftIcon={<ShareIcon className="h-4 w-4" />}
                          onClick={() => handleShare(material)}
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
        <Card className="mt-8 bg-gradient-to-r from-[#C8DDF2] to-[#C8DDF2]/90 text-white">
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

        {/* Tips */}
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
