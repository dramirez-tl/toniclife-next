'use client';

import { useState, Suspense } from 'react';
import { useTranslations } from 'next-intl';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
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
  LightBulbIcon,
} from '@heroicons/react/24/outline';
import { PlayIcon } from '@heroicons/react/24/solid';
import { SearchableSelect } from '@/components/ui/SearchableSelect';
import { useQueryFilters } from '@/hooks/useQueryFilters';
import { useMyMaterials } from '@/hooks/useMaterials';
import { materialsService } from '@/services/materials.service';
import type { MarketingMaterial, MaterialType, MaterialCategory } from '@/types/material';
import { toast } from 'sonner';

const API_BASE = process.env.NEXT_PUBLIC_API_URL?.replace('/api/v1', '') || 'http://localhost:3001';
function resolveUrl(url: string | null): string | null {
  if (!url) return null;
  if (url.startsWith('http')) return url;
  return `${API_BASE}${url}`;
}

const CATEGORY_KEYS: MaterialCategory[] = [
  'catalogos',
  'redes_sociales',
  'testimonios',
  'presentaciones',
  'guias',
  'branding',
  'capacitacion',
  'otros',
];

const TYPE_KEYS: MaterialType[] = ['pdf', 'image', 'video', 'document', 'presentation'];

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
  const t = useTranslations('distributor.materials');
  const [searchQuery, setSearchQuery] = useState('');
  const { get, setParams } = useQueryFilters({
    category: 'all',
    type: 'all',
    sortBy: 'default',
  });

  const filterCategory = get('category');
  const filterType = get('type');
  const sortBy = get('sortBy');

  const { data: materials = [], isLoading } = useMyMaterials({
    category: filterCategory !== 'all' ? filterCategory : undefined,
    type: filterType !== 'all' ? filterType : undefined,
    search: searchQuery || undefined,
  });

  // El backend ya devuelve la lista en el orden definido por el admin
  // (sort_order ASC, created_at DESC). Solo aplicamos sort client-side
  // cuando el usuario elige explícitamente otro criterio.
  const sorted =
    sortBy === 'default'
      ? materials
      : [...materials].sort((a, b) => {
          if (sortBy === 'popular') return b.downloadCount - a.downloadCount;
          if (sortBy === 'name') return a.title.localeCompare(b.title);
          if (sortBy === 'recent')
            return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
          return 0;
        });

  const stats = {
    totalMaterials: materials.length,
    totalDownloads: materials.reduce((sum, m) => sum + m.downloadCount, 0),
    categories: new Set(materials.map((m) => m.category)).size,
  };

  const handleDownload = async (material: MarketingMaterial) => {
    if (!material.hasFile) {
      toast.error(t('toast.noFileDownload'));
      return;
    }
    try {
      const { url } = await materialsService.getDownloadUrl(material.id);
      // Abrir en nueva pestaña para respetar Content-Disposition attachment
      window.open(url, '_blank', 'noopener');
      toast.success(t('toast.downloading', { title: material.title }));
    } catch {
      toast.error(t('toast.downloadError'));
    }
  };

  const handlePreview = async (material: MarketingMaterial) => {
    if (!material.hasFile) {
      toast.error(t('toast.noFilePreview'));
      return;
    }
    try {
      const { url } = await materialsService.getPreviewUrl(material.id);
      window.open(url, '_blank', 'noopener');
    } catch {
      toast.error(t('toast.previewError'));
    }
  };

  const handleShare = async (material: MarketingMaterial) => {
    try {
      const { url } = await materialsService.getPreviewUrl(material.id);
      await navigator.clipboard.writeText(url);
      toast.success(t('toast.linkCopied', { title: material.title }));
    } catch {
      toast.error(t('toast.shareError'));
    }
  };

  const categoryOptions = CATEGORY_KEYS.map((value) => ({
    value,
    label: t(`categories.${value}`),
  }));
  const typeOptions = TYPE_KEYS.map((value) => ({ value, label: t(`types.${value}`) }));

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-gradient-to-r from-[#3E667D] to-[#3E667D]/90 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <ArrowDownTrayIcon className="h-10 w-10" />
                <h1 className="text-4xl font-bold">{t('title')}</h1>
              </div>
              <p className="text-white/80 text-lg">
                {t('subtitle')}
              </p>
            </div>
            <Link href="/distribuidor">
              <Button variant="secondary">{t('backToPanel')}</Button>
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
                  <p className="text-sm text-gray-600 mb-1">{t('stats.totalMaterials')}</p>
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
                  <p className="text-sm text-gray-600 mb-1">{t('stats.totalDownloads')}</p>
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
                  <p className="text-sm text-gray-600 mb-1">{t('stats.categories')}</p>
                  <p className="text-3xl font-bold text-gray-900">{stats.categories}</p>
                </div>
                <FunnelIcon className="h-12 w-12 text-purple-400" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card className="mb-6">
          <CardContent className="p-4 sm:p-6">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
              <div className="relative flex-1">
                <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                <input
                  type="text"
                  placeholder={t('searchPlaceholder')}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#a7c1e2] focus:border-transparent"
                />
              </div>
              <SearchableSelect
                options={categoryOptions}
                value={filterCategory}
                onChange={(val) => setParams({ category: val })}
                allLabel={t('allCategories')}
                allValue="all"
                className="lg:w-48"
              />
              <SearchableSelect
                options={typeOptions}
                value={filterType}
                onChange={(val) => setParams({ type: val })}
                allLabel={t('allTypes')}
                allValue="all"
                className="lg:w-40"
              />
              <SearchableSelect
                options={[
                  { value: 'default', label: t('sort.default') },
                  { value: 'recent', label: t('sort.recent') },
                  { value: 'popular', label: t('sort.popular') },
                  { value: 'name', label: t('sort.name') },
                ]}
                value={sortBy}
                onChange={(val) => setParams({ sortBy: val })}
                showAllOption={false}
                className="lg:w-52"
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
                {t('empty.title')}
              </h3>
              <p className="text-gray-600">
                {searchQuery || filterCategory !== 'all' || filterType !== 'all'
                  ? t('empty.filtered')
                  : t('empty.default')}
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
                          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-white/90">
                            <PlayIcon className="ml-0.5 h-6 w-6 text-[#3E667D]" />
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
                        {t(`types.${material.type}`)}
                      </span>
                      <span className="text-xs text-gray-500">{t(`categories.${material.category}`)}</span>
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
                      <span>{t('downloads', { count: material.downloadCount })}</span>
                    </div>

                    {/* Actions */}
                    <div className="space-y-2">
                      <Button
                        variant="default"
                        size="sm"
                        className="w-full"
                        onClick={() => handleDownload(material)}
                      >
                        <ArrowDownTrayIcon className="h-4 w-4" />
                        {t('actions.download')}
                      </Button>
                      <div className="grid grid-cols-2 gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handlePreview(material)}
                        >
                          <EyeIcon className="h-4 w-4" />
                          {t('actions.preview')}
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleShare(material)}
                        >
                          <ShareIcon className="h-4 w-4" />
                          {t('actions.share')}
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}

        {/* Tips */}
        <Card className="mt-6">
          <CardContent className="p-8">
            <h3 className="mb-4 flex items-center gap-2 text-xl font-bold text-gray-900">
              <LightBulbIcon className="h-6 w-6 text-amber-500" />
              {t('tips.title')}
            </h3>
            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <h4 className="font-semibold text-gray-900 mb-2">{t('tips.social.title')}</h4>
                <ul className="text-sm text-gray-600 space-y-1">
                  <li>• {t('tips.social.item1')}</li>
                  <li>• {t('tips.social.item2')}</li>
                  <li>• {t('tips.social.item3')}</li>
                  <li>• {t('tips.social.item4')}</li>
                </ul>
              </div>
              <div>
                <h4 className="font-semibold text-gray-900 mb-2">{t('tips.presentations.title')}</h4>
                <ul className="text-sm text-gray-600 space-y-1">
                  <li>• {t('tips.presentations.item1')}</li>
                  <li>• {t('tips.presentations.item2')}</li>
                  <li>• {t('tips.presentations.item3')}</li>
                  <li>• {t('tips.presentations.item4')}</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
