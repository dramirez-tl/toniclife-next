'use client';

import { useState, useMemo, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { Header, Footer } from '@/components/layout';
import { ProductGrid } from '@/components/products/ProductGrid';
import { ProductFilters } from '@/components/products/ProductFilters';
import { FunnelIcon, Squares2X2Icon, ListBulletIcon } from '@heroicons/react/24/outline';
import { SearchableSelect } from '@/components/ui/SearchableSelect';
import { useProducts, useCategories } from '@/hooks/useProducts';
import { useStoreCountry } from '@/hooks/useStoreCountry';
import { useAppSelector } from '@/store/hooks';
import { selectUserRoles } from '@/store/slices/authSlice';
import { SparklesIcon } from '@heroicons/react/24/solid';
import type { Product as APIProduct, Category } from '@/types/product';
import type { Product as MockProduct } from '@/types';

type SortOption = 'featured' | 'price-asc' | 'price-desc' | 'name' | 'newest';
type ViewMode = 'grid' | 'list';

// Adapter para convertir productos del API al formato del componente ProductGrid
function adaptAPIProductToMock(apiProduct: APIProduct): MockProduct {
  return {
    id: apiProduct.id,
    name: apiProduct.name,
    slug: apiProduct.slug || '',
    code: apiProduct.code,
    description: apiProduct.description || '',
    shortDescription: apiProduct.shortName || '',
    fullDescription: apiProduct.description,
    benefits: apiProduct.healthBenefits || [],
    usage: {
      ideal: apiProduct.usageInstructions || '',
      regular: apiProduct.usageFormat,
    },
    dosage: apiProduct.usageFormat,
    ingredients: apiProduct.ingredients?.split(',').map((i) => i.trim()),
    // Use categoryName from API directly, fallback to 'General' if not present
    category: (apiProduct.categoryName || 'General') as MockProduct['category'],
    tags: [],
    price: parseFloat(apiProduct.price || apiProduct.pointsValue || '0'),
    compareAtPrice: undefined,
    currencyCode: apiProduct.priceCurrency || 'MXN',
    image: apiProduct.imageUrl || '',
    images: apiProduct.galleryUrls,
    inStock: apiProduct.isActive,
    stock: 100,
    rating: 5,
    reviews: 0,
    badge: apiProduct.isFeatured ? 'Destacado' : undefined,
    featured: apiProduct.isFeatured,
  };
}

// Adapter para convertir categorías del API al formato mock
function adaptAPICategory(apiCategory: Category) {
  return {
    id: apiCategory.id, // Usar UUID para filtrar en el API
    name: apiCategory.name,
    slug: apiCategory.slug,
    icon: '🌿',
    count: apiCategory.productCount || 0,
  };
}

export default function ProductsPage() {
  const t = useTranslations('products');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [sortBy, setSortBy] = useState<SortOption>('featured');
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [showFilters, setShowFilters] = useState(false);
  const [priceRange, setPriceRange] = useState<[number, number]>([0, 10000]);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const limit = 20;

  // ¿El visitante es distribuidor? La API ya resuelve el precio (distribuidor si
  // su cuenta está activa con kit; público si no), aquí solo mostramos el aviso.
  const roles = useAppSelector(selectUserRoles);
  const isDistributor = roles.includes('distributor');

  // País de la tienda (del locale): el API filtra stock por el almacén del país
  // y devuelve el precio en su moneda. Gateamos hasta tener el countryId.
  const { countryId, lang } = useStoreCountry();

  // Obtener datos del API
  const {
    data: productsData,
    isLoading: rawProductsLoading,
    error: productsError,
  } = useProducts(
    {
      categoryId: selectedCategory !== 'all' ? selectedCategory : undefined,
      isActive: true,
      isVisibleEcommerce: true,
      countryId,
      inStock: true,
      search: searchTerm || undefined,
      page: currentPage,
      limit,
      sortBy: sortBy === 'newest' ? 'createdAt' : sortBy === 'price-asc' || sortBy === 'price-desc' ? 'basePrice' : sortBy === 'name' ? 'name' : 'sortOrder',
      sortDir: sortBy === 'price-desc' ? 'desc' : sortBy === 'newest' ? 'desc' : 'asc',
    },
    { enabled: !!countryId },
  );
  // Mientras se resuelve el país (catálogo) tratamos como "cargando".
  const productsLoading = rawProductsLoading || !countryId;

  const {
    data: categoriesData,
    isLoading: categoriesLoading,
    error: categoriesError,
  } = useCategories({ isActive: true });

  // Productos adaptados del API
  const products = useMemo(() => {
    if (productsData?.data) {
      return productsData.data.map(adaptAPIProductToMock);
    }
    return [];
  }, [productsData]);

  // Categorías adaptadas del API
  const categories = useMemo(() => {
    if (categoriesData) {
      return categoriesData.map(adaptAPICategory);
    }
    return [];
  }, [categoriesData]);

  // Pagination info
  const totalProducts = productsData?.total || 0;
  const totalPages = productsData?.totalPages || 1;

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [selectedCategory, searchTerm, sortBy]);

  return (
    <>
      <Header />
      <main className="min-h-screen pb-20 bg-gray-50">
        {/* Offset del header fijo */}
        <div className="h-28 lg:h-32" />

        {/* Hero banner - propuesta 2026 */}
        <section className="relative w-full overflow-hidden bg-gradient-to-r from-[#C8DDF2] via-[#dbe8f6] to-white">
          {/* Blobs decorativos suaves para dar profundidad */}
          <div className="pointer-events-none absolute -top-24 -left-20 h-72 w-72 rounded-full bg-white/50 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-24 left-1/3 h-64 w-64 rounded-full bg-[#3E667D]/10 blur-3xl" />

          {/* Tira de productos, anclada abajo-derecha (funde con el blanco de la banda) */}
          <div
            className="pointer-events-none absolute inset-y-0 right-[4%] left-1/2 hidden bg-contain bg-right-bottom bg-no-repeat sm:block lg:left-[44%] lg:right-[19%]"
            style={{ backgroundImage: "url('/images/productos/banner-productos.webp')" }}
          />

          <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="flex min-h-[240px] flex-col justify-center py-10 lg:min-h-[340px]">
              <span className="mb-4 inline-flex w-fit items-center gap-1.5 rounded-full bg-white/70 px-3 py-1 text-xs font-semibold text-[#3E667D] shadow-sm backdrop-blur">
                <SparklesIcon className="h-3.5 w-3.5" />
                {t('heroBadge')}
              </span>
              <h1 className="max-w-md text-4xl font-bold leading-[1.05] text-[#3E667D] sm:text-5xl lg:text-6xl">
                {t('heroTitlePrefix')}{' '}
                <span className="font-serif italic">{t('heroTitleHighlight')}</span>
              </h1>
              <p className="mt-4 max-w-sm text-base text-[#3E667D]/80 sm:text-lg">
                {t('heroSubtitle')}
              </p>
            </div>
          </div>
        </section>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8">
          {/* Aviso de precios de distribuidor */}
          {isDistributor && (
            <div className="mb-6 flex items-center gap-3 rounded-xl border border-[#a7c1e2]/40 bg-[#C8DDF2]/20 px-4 py-3">
              <SparklesIcon className="h-5 w-5 flex-shrink-0 text-[#3E667D]" />
              <p className="text-sm text-[#3E667D]">
                <span className="font-semibold">{t('distributorPriceTitle')}</span>{' '}
                {t('distributorPriceBody')}
              </p>
            </div>
          )}

          {/* Search Bar */}
          <div className="mb-6">
            <div className="relative max-w-xl mx-auto">
              <input
                type="text"
                placeholder={t('searchPlaceholder')}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full px-4 py-3 pl-12 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#a7c1e2] focus:border-transparent"
              />
              <svg
                className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                />
              </svg>
            </div>
          </div>

          {/* Toolbar */}
          <div className="bg-white rounded-xl shadow-sm p-4 mb-8">
            <div className="flex flex-wrap items-center justify-between gap-4">
              {/* Categories Pills - Desktop */}
              <div className="hidden lg:flex items-center gap-2 overflow-x-auto">
                <button
                  onClick={() => setSelectedCategory('all')}
                  className={`px-4 py-2 rounded-full font-medium transition-all whitespace-nowrap ${
                    selectedCategory === 'all'
                      ? 'bg-[#3E667D] text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-[#C8DDF2]/10 hover:text-[#3E667D]'
                  }`}
                >
                  {t('allCategory', { count: totalProducts })}
                </button>
                {categories.slice(0, 6).map((category) => (
                  <button
                    key={category.id}
                    onClick={() => setSelectedCategory(category.id)}
                    className={`px-4 py-2 rounded-full font-medium transition-all whitespace-nowrap ${
                      selectedCategory === category.id
                        ? 'bg-[#3E667D] text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-[#C8DDF2]/10 hover:text-[#3E667D]'
                    }`}
                  >
                    {category.name}
                  </button>
                ))}
              </div>

              {/* Mobile Filter Button */}
              <button
                onClick={() => setShowFilters(!showFilters)}
                className="lg:hidden flex items-center gap-2 px-4 py-2 bg-gray-100 rounded-full"
              >
                <FunnelIcon className="h-5 w-5" />
                {t('filtersButton')}
              </button>

              {/* Right side controls */}
              <div className="flex items-center gap-4">
                {/* Sort */}
                <SearchableSelect
                  options={[
                    { value: 'featured', label: t('sort.featured') },
                    { value: 'newest', label: t('sort.newest') },
                    { value: 'price-asc', label: t('sort.priceAsc') },
                    { value: 'price-desc', label: t('sort.priceDesc') },
                    { value: 'name', label: t('sort.name') },
                  ]}
                  value={sortBy}
                  onChange={(val) => setSortBy(val as SortOption)}
                  showAllOption={false}
                />

                {/* View Toggle */}
                <div className="hidden sm:flex items-center bg-gray-100 rounded-lg p-1">
                  <button
                    onClick={() => setViewMode('grid')}
                    className={`p-2 rounded-lg transition-colors ${
                      viewMode === 'grid' ? 'bg-white shadow-sm' : 'hover:bg-gray-200'
                    }`}
                  >
                    <Squares2X2Icon className="h-5 w-5" />
                  </button>
                  <button
                    onClick={() => setViewMode('list')}
                    className={`p-2 rounded-lg transition-colors ${
                      viewMode === 'list' ? 'bg-white shadow-sm' : 'hover:bg-gray-200'
                    }`}
                  >
                    <ListBulletIcon className="h-5 w-5" />
                  </button>
                </div>

                {/* Results count */}
                <span className="text-sm text-gray-500">
                  {t('resultsCount', { count: products.length })}
                </span>
              </div>
            </div>

            {/* Mobile Filters Panel */}
            {showFilters && (
              <div className="lg:hidden mt-4 pt-4 border-t border-gray-100">
                <ProductFilters
                  categories={categories}
                  selectedCategory={selectedCategory}
                  onCategoryChange={setSelectedCategory}
                  priceRange={priceRange}
                  onPriceRangeChange={setPriceRange}
                />
              </div>
            )}
          </div>

          {/* Main Content */}
          <div className="flex gap-8">
            {/* Sidebar Filters - Desktop */}
            <aside className="hidden lg:block w-64 flex-shrink-0">
              <div className="bg-white rounded-xl shadow-sm p-6 sticky top-32">
                <ProductFilters
                  categories={categories}
                  selectedCategory={selectedCategory}
                  onCategoryChange={setSelectedCategory}
                  priceRange={priceRange}
                  onPriceRangeChange={setPriceRange}
                />
              </div>
            </aside>

            {/* Products Grid */}
            <div className="flex-grow">
              {/* Loading State */}
              {productsLoading && (
                <div className="text-center py-16">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#a7c1e2] mx-auto"></div>
                  <p className="mt-4 text-gray-500">{t('loading')}</p>
                </div>
              )}

              {/* Error State */}
              {productsError && (
                <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
                  <p className="text-sm text-red-700">
                    {t('loadError')}
                  </p>
                </div>
              )}

              {/* Products */}
              {!productsLoading && products.length > 0 && (
                <>
                  <ProductGrid products={products} viewMode={viewMode} lang={lang} />

                  {/* Pagination */}
                  {totalPages > 1 && (
                    <div className="mt-8 flex justify-center items-center gap-2">
                      <button
                        onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                        disabled={currentPage === 1}
                        className="px-4 py-2 rounded-lg border border-gray-200 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                      >
                        {t('prev')}
                      </button>
                      <span className="px-4 py-2 text-sm text-gray-600">
                        {t('pageOf', { current: currentPage, total: totalPages })}
                      </span>
                      <button
                        onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                        disabled={currentPage === totalPages}
                        className="px-4 py-2 rounded-lg border border-gray-200 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                      >
                        {t('next')}
                      </button>
                    </div>
                  )}
                </>
              )}

              {/* Empty State */}
              {!productsLoading && products.length === 0 && (
                <div className="text-center py-16">
                  <p className="text-gray-500 text-lg">
                    {t('empty')}
                  </p>
                  <button
                    onClick={() => {
                      setSelectedCategory('all');
                      setPriceRange([0, 10000]);
                      setSearchTerm('');
                    }}
                    className="mt-4 text-[#3E667D] hover:underline"
                  >
                    {t('clearFilters')}
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
