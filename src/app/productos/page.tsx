'use client';

import { useState, useMemo, useEffect } from 'react';
import { Header, Footer } from '@/components/layout';
import { ProductGrid } from '@/components/products/ProductGrid';
import { ProductFilters } from '@/components/products/ProductFilters';
import { FunnelIcon, Squares2X2Icon, ListBulletIcon } from '@heroicons/react/24/outline';
import { SearchableSelect } from '@/components/ui/SearchableSelect';
import { useProducts, useCategories } from '@/hooks/useProducts';
import { ECOMMERCE_BRANCH_ID } from '@/services/products.service';
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
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [sortBy, setSortBy] = useState<SortOption>('featured');
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [showFilters, setShowFilters] = useState(false);
  const [priceRange, setPriceRange] = useState<[number, number]>([0, 10000]);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const limit = 20;

  // Obtener datos del API
  const {
    data: productsData,
    isLoading: productsLoading,
    error: productsError,
  } = useProducts({
    categoryId: selectedCategory !== 'all' ? selectedCategory : undefined,
    isActive: true,
    isVisibleEcommerce: true,
    branchId: ECOMMERCE_BRANCH_ID,
    inStock: true,
    search: searchTerm || undefined,
    page: currentPage,
    limit,
    sortBy: sortBy === 'newest' ? 'createdAt' : sortBy === 'price-asc' || sortBy === 'price-desc' ? 'basePrice' : sortBy === 'name' ? 'name' : 'sortOrder',
    sortDir: sortBy === 'price-desc' ? 'desc' : sortBy === 'newest' ? 'desc' : 'asc',
  });

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
        <section className="relative w-full overflow-hidden bg-[#C8DDF2]">
          {/* Tira de productos a la derecha (fallback: azul claro de marca) */}
          <div
            className="pointer-events-none absolute inset-y-0 right-0 left-1/2 hidden bg-contain bg-right bg-no-repeat sm:block lg:left-1/3"
            style={{ backgroundImage: "url('/images/productos/banner-productos.png')" }}
          />
          <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="flex min-h-[180px] items-center lg:min-h-[220px]">
              <h1 className="max-w-[12rem] text-3xl font-bold leading-tight text-[#3E667D] sm:max-w-xs sm:text-4xl lg:text-5xl">
                Nuestros productos
              </h1>
            </div>
          </div>
        </section>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8">
          {/* Search Bar */}
          <div className="mb-6">
            <div className="relative max-w-xl mx-auto">
              <input
                type="text"
                placeholder="Buscar productos..."
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
                  Todos ({totalProducts})
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
                Filtros
              </button>

              {/* Right side controls */}
              <div className="flex items-center gap-4">
                {/* Sort */}
                <SearchableSelect
                  options={[
                    { value: 'featured', label: 'Destacados' },
                    { value: 'newest', label: 'Más Recientes' },
                    { value: 'price-asc', label: 'Precio: Menor a Mayor' },
                    { value: 'price-desc', label: 'Precio: Mayor a Menor' },
                    { value: 'name', label: 'Nombre A-Z' },
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
                  {products.length} productos
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
                  <p className="mt-4 text-gray-500">Cargando productos...</p>
                </div>
              )}

              {/* Error State */}
              {productsError && (
                <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
                  <p className="text-sm text-red-700">
                    Error al cargar los productos. Por favor, verifica tu conexión e intenta de nuevo.
                  </p>
                </div>
              )}

              {/* Products */}
              {!productsLoading && products.length > 0 && (
                <>
                  <ProductGrid products={products} viewMode={viewMode} />

                  {/* Pagination */}
                  {totalPages > 1 && (
                    <div className="mt-8 flex justify-center items-center gap-2">
                      <button
                        onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                        disabled={currentPage === 1}
                        className="px-4 py-2 rounded-lg border border-gray-200 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                      >
                        Anterior
                      </button>
                      <span className="px-4 py-2 text-sm text-gray-600">
                        Página {currentPage} de {totalPages}
                      </span>
                      <button
                        onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                        disabled={currentPage === totalPages}
                        className="px-4 py-2 rounded-lg border border-gray-200 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                      >
                        Siguiente
                      </button>
                    </div>
                  )}
                </>
              )}

              {/* Empty State */}
              {!productsLoading && products.length === 0 && (
                <div className="text-center py-16">
                  <p className="text-gray-500 text-lg">
                    No se encontraron productos con los filtros seleccionados.
                  </p>
                  <button
                    onClick={() => {
                      setSelectedCategory('all');
                      setPriceRange([0, 10000]);
                      setSearchTerm('');
                    }}
                    className="mt-4 text-[#3E667D] hover:underline"
                  >
                    Limpiar filtros
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
