'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/Button';
import { Card, CardContent } from '@/components/ui/Card';
import {
  MagnifyingGlassIcon,
  FunnelIcon,
  XMarkIcon,
  AdjustmentsHorizontalIcon,
  StarIcon as StarOutline,
  ShoppingCartIcon,
  HeartIcon,
} from '@heroicons/react/24/outline';
import { StarIcon as StarSolid } from '@heroicons/react/24/solid';
import { toast } from 'sonner';

// Mock search results
const mockSearchResults = [
  {
    id: '1',
    name: 'Vitamina D3 + K2',
    category: 'Inmunidad',
    price: 449,
    originalPrice: 599,
    rating: 4.8,
    reviews: 234,
    stock: 25,
    badge: 'Bestseller',
    benefits: ['Salud ósea', 'Sistema inmune', 'Absorción de calcio'],
    format: 'Cápsulas',
  },
  {
    id: '2',
    name: 'Omega 3 Premium',
    category: 'Salud Cardiovascular',
    price: 599,
    originalPrice: null,
    rating: 4.9,
    reviews: 456,
    stock: 18,
    badge: null,
    benefits: ['Salud cardiovascular', 'Función cerebral', 'Antiinflamatorio'],
    format: 'Cápsulas',
  },
  {
    id: '3',
    name: 'Magnesio Bisglicinato',
    category: 'Relajación',
    price: 399,
    originalPrice: 499,
    rating: 4.7,
    reviews: 189,
    stock: 32,
    badge: 'En oferta',
    benefits: ['Relajación muscular', 'Mejor sueño', 'Reduce estrés'],
    format: 'Cápsulas',
  },
  {
    id: '4',
    name: 'Colágeno Hidrolizado',
    category: 'Belleza & Piel',
    price: 699,
    originalPrice: 899,
    rating: 4.9,
    reviews: 523,
    stock: 12,
    badge: 'Bestseller',
    benefits: ['Elasticidad de la piel', 'Salud articular', 'Cabello y uñas'],
    format: 'Polvo',
  },
  {
    id: '5',
    name: 'Probióticos Advanced',
    category: 'Digestión',
    price: 549,
    originalPrice: null,
    rating: 4.8,
    reviews: 312,
    stock: 28,
    badge: null,
    benefits: ['Salud digestiva', 'Flora intestinal', 'Sistema inmune'],
    format: 'Cápsulas',
  },
  {
    id: '6',
    name: 'Complejo B Activo',
    category: 'Energía',
    price: 349,
    originalPrice: null,
    rating: 4.6,
    reviews: 167,
    stock: 40,
    badge: 'Nuevo',
    benefits: ['Aumento de energía', 'Metabolismo', 'Función cerebral'],
    format: 'Tabletas',
  },
];

const categories = [
  'Todas',
  'Inmunidad',
  'Energía',
  'Digestión',
  'Belleza & Piel',
  'Relajación',
  'Salud Cardiovascular',
  'Huesos & Articulaciones',
];

const priceRanges = [
  { label: 'Todos los precios', min: 0, max: Infinity },
  { label: 'Menos de $300', min: 0, max: 300 },
  { label: '$300 - $500', min: 300, max: 500 },
  { label: '$500 - $700', min: 500, max: 700 },
  { label: 'Más de $700', min: 700, max: Infinity },
];

const formats = ['Todos', 'Cápsulas', 'Tabletas', 'Polvo', 'Líquido', 'Gomitas'];
const benefits = [
  'Salud ósea',
  'Sistema inmune',
  'Energía',
  'Digestión',
  'Piel',
  'Sueño',
  'Concentración',
  'Cardiovascular',
];

const sortOptions = [
  { value: 'relevance', label: 'Más relevantes' },
  { value: 'price_low', label: 'Precio: Menor a Mayor' },
  { value: 'price_high', label: 'Precio: Mayor a Menor' },
  { value: 'rating', label: 'Mejor Calificados' },
  { value: 'newest', label: 'Más Recientes' },
  { value: 'popular', label: 'Más Populares' },
];

export default function BuscarPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('Todas');
  const [selectedPriceRange, setSelectedPriceRange] = useState(priceRanges[0]);
  const [selectedFormat, setSelectedFormat] = useState('Todos');
  const [selectedBenefits, setSelectedBenefits] = useState<string[]>([]);
  const [minRating, setMinRating] = useState(0);
  const [sortBy, setSortBy] = useState('relevance');
  const [showFilters, setShowFilters] = useState(true);
  const [inStock, setInStock] = useState(false);
  const [onSale, setOnSale] = useState(false);

  const handleToggleBenefit = (benefit: string) => {
    if (selectedBenefits.includes(benefit)) {
      setSelectedBenefits(selectedBenefits.filter(b => b !== benefit));
    } else {
      setSelectedBenefits([...selectedBenefits, benefit]);
    }
  };

  const handleClearFilters = () => {
    setSelectedCategory('Todas');
    setSelectedPriceRange(priceRanges[0]);
    setSelectedFormat('Todos');
    setSelectedBenefits([]);
    setMinRating(0);
    setInStock(false);
    setOnSale(false);
    toast.success('Filtros limpiados');
  };

  const filteredResults = mockSearchResults
    .filter(product => {
      if (searchQuery && !product.name.toLowerCase().includes(searchQuery.toLowerCase())) {
        return false;
      }
      if (selectedCategory !== 'Todas' && product.category !== selectedCategory) {
        return false;
      }
      if (product.price < selectedPriceRange.min || product.price > selectedPriceRange.max) {
        return false;
      }
      if (selectedFormat !== 'Todos' && product.format !== selectedFormat) {
        return false;
      }
      if (selectedBenefits.length > 0 && !selectedBenefits.some(b => product.benefits.includes(b))) {
        return false;
      }
      if (product.rating < minRating) {
        return false;
      }
      if (inStock && product.stock === 0) {
        return false;
      }
      if (onSale && !product.originalPrice) {
        return false;
      }
      return true;
    });

  const activeFiltersCount =
    (selectedCategory !== 'Todas' ? 1 : 0) +
    (selectedPriceRange.label !== 'Todos los precios' ? 1 : 0) +
    (selectedFormat !== 'Todos' ? 1 : 0) +
    selectedBenefits.length +
    (minRating > 0 ? 1 : 0) +
    (inStock ? 1 : 0) +
    (onSale ? 1 : 0);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-gradient-to-r from-[#003B7A] to-[#003B7A]/90 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <h1 className="text-4xl font-bold mb-6">Búsqueda Avanzada de Productos</h1>

          {/* Search Bar */}
          <div className="relative">
            <MagnifyingGlassIcon className="absolute left-4 top-1/2 -translate-y-1/2 h-6 w-6 text-gray-400" />
            <input
              type="text"
              placeholder="Busca por nombre, beneficio, ingrediente..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-14 pr-4 py-4 rounded-xl text-gray-900 text-lg focus:ring-2 focus:ring-[#7AB82E] focus:outline-none"
            />
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <p className="text-gray-600">
              {filteredResults.length} {filteredResults.length === 1 ? 'producto encontrado' : 'productos encontrados'}
            </p>
            {activeFiltersCount > 0 && (
              <p className="text-sm text-gray-500 mt-1">
                {activeFiltersCount} {activeFiltersCount === 1 ? 'filtro activo' : 'filtros activos'}
              </p>
            )}
          </div>

          <div className="flex items-center gap-3">
            {/* Sort */}
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#7AB82E] focus:border-transparent"
            >
              {sortOptions.map(option => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>

            {/* Toggle Filters */}
            <Button
              variant="outline"
              size="sm"
              leftIcon={<AdjustmentsHorizontalIcon className="h-5 w-5" />}
              onClick={() => setShowFilters(!showFilters)}
            >
              {showFilters ? 'Ocultar' : 'Mostrar'} Filtros
              {activeFiltersCount > 0 && (
                <span className="ml-2 bg-[#7AB82E] text-white rounded-full px-2 py-0.5 text-xs">
                  {activeFiltersCount}
                </span>
              )}
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Filters Sidebar */}
          {showFilters && (
            <div className="lg:col-span-1">
              <Card className="sticky top-4">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between mb-6">
                    <h3 className="font-bold text-lg flex items-center gap-2">
                      <FunnelIcon className="h-5 w-5" />
                      Filtros
                    </h3>
                    {activeFiltersCount > 0 && (
                      <button
                        onClick={handleClearFilters}
                        className="text-sm text-red-600 hover:text-red-700"
                      >
                        Limpiar
                      </button>
                    )}
                  </div>

                  <div className="space-y-6">
                    {/* Category */}
                    <div>
                      <h4 className="font-semibold text-gray-900 mb-3">Categoría</h4>
                      <div className="space-y-2">
                        {categories.map(cat => (
                          <label key={cat} className="flex items-center cursor-pointer">
                            <input
                              type="radio"
                              checked={selectedCategory === cat}
                              onChange={() => setSelectedCategory(cat)}
                              className="h-4 w-4 text-[#003B7A] focus:ring-[#7AB82E]"
                            />
                            <span className="ml-2 text-sm text-gray-700">{cat}</span>
                          </label>
                        ))}
                      </div>
                    </div>

                    {/* Price Range */}
                    <div className="border-t pt-6">
                      <h4 className="font-semibold text-gray-900 mb-3">Rango de Precio</h4>
                      <div className="space-y-2">
                        {priceRanges.map((range, idx) => (
                          <label key={idx} className="flex items-center cursor-pointer">
                            <input
                              type="radio"
                              checked={selectedPriceRange.label === range.label}
                              onChange={() => setSelectedPriceRange(range)}
                              className="h-4 w-4 text-[#003B7A] focus:ring-[#7AB82E]"
                            />
                            <span className="ml-2 text-sm text-gray-700">{range.label}</span>
                          </label>
                        ))}
                      </div>
                    </div>

                    {/* Format */}
                    <div className="border-t pt-6">
                      <h4 className="font-semibold text-gray-900 mb-3">Formato</h4>
                      <div className="space-y-2">
                        {formats.map(format => (
                          <label key={format} className="flex items-center cursor-pointer">
                            <input
                              type="radio"
                              checked={selectedFormat === format}
                              onChange={() => setSelectedFormat(format)}
                              className="h-4 w-4 text-[#003B7A] focus:ring-[#7AB82E]"
                            />
                            <span className="ml-2 text-sm text-gray-700">{format}</span>
                          </label>
                        ))}
                      </div>
                    </div>

                    {/* Benefits */}
                    <div className="border-t pt-6">
                      <h4 className="font-semibold text-gray-900 mb-3">Beneficios</h4>
                      <div className="space-y-2">
                        {benefits.map(benefit => (
                          <label key={benefit} className="flex items-center cursor-pointer">
                            <input
                              type="checkbox"
                              checked={selectedBenefits.includes(benefit)}
                              onChange={() => handleToggleBenefit(benefit)}
                              className="h-4 w-4 text-[#003B7A] rounded focus:ring-[#7AB82E]"
                            />
                            <span className="ml-2 text-sm text-gray-700">{benefit}</span>
                          </label>
                        ))}
                      </div>
                    </div>

                    {/* Rating */}
                    <div className="border-t pt-6">
                      <h4 className="font-semibold text-gray-900 mb-3">Calificación Mínima</h4>
                      <div className="space-y-2">
                        {[4, 3, 2, 1, 0].map(rating => (
                          <label key={rating} className="flex items-center cursor-pointer">
                            <input
                              type="radio"
                              checked={minRating === rating}
                              onChange={() => setMinRating(rating)}
                              className="h-4 w-4 text-[#003B7A] focus:ring-[#7AB82E]"
                            />
                            <span className="ml-2 flex items-center gap-1">
                              {rating > 0 ? (
                                <>
                                  <StarSolid className="h-4 w-4 text-yellow-400" />
                                  <span className="text-sm text-gray-700">{rating}+</span>
                                </>
                              ) : (
                                <span className="text-sm text-gray-700">Todas</span>
                              )}
                            </span>
                          </label>
                        ))}
                      </div>
                    </div>

                    {/* Additional Filters */}
                    <div className="border-t pt-6">
                      <h4 className="font-semibold text-gray-900 mb-3">Opciones</h4>
                      <div className="space-y-2">
                        <label className="flex items-center cursor-pointer">
                          <input
                            type="checkbox"
                            checked={inStock}
                            onChange={(e) => setInStock(e.target.checked)}
                            className="h-4 w-4 text-[#003B7A] rounded focus:ring-[#7AB82E]"
                          />
                          <span className="ml-2 text-sm text-gray-700">Solo en stock</span>
                        </label>
                        <label className="flex items-center cursor-pointer">
                          <input
                            type="checkbox"
                            checked={onSale}
                            onChange={(e) => setOnSale(e.target.checked)}
                            className="h-4 w-4 text-[#003B7A] rounded focus:ring-[#7AB82E]"
                          />
                          <span className="ml-2 text-sm text-gray-700">En oferta</span>
                        </label>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Results */}
          <div className={showFilters ? 'lg:col-span-3' : 'lg:col-span-4'}>
            {filteredResults.length === 0 ? (
              <Card>
                <CardContent className="p-16 text-center">
                  <MagnifyingGlassIcon className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-2xl font-bold text-gray-900 mb-2">
                    No se encontraron productos
                  </h3>
                  <p className="text-gray-600 mb-6">
                    Intenta ajustar los filtros o realizar una búsqueda diferente
                  </p>
                  <Button variant="primary" onClick={handleClearFilters}>
                    Limpiar Filtros
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredResults.map((product) => (
                  <Card key={product.id} className="hover:shadow-lg transition-shadow">
                    <CardContent className="p-6">
                      {/* Product Image */}
                      <div className="relative mb-4">
                        <div className="aspect-square bg-gray-100 rounded-lg overflow-hidden flex items-center justify-center">
                          <span className="text-6xl">📦</span>
                        </div>
                        {product.badge && (
                          <div className={`absolute top-2 left-2 px-3 py-1 rounded-full text-xs font-semibold ${
                            product.badge === 'Bestseller' ? 'bg-purple-100 text-purple-800' :
                            product.badge === 'En oferta' ? 'bg-orange-100 text-orange-800' :
                            'bg-blue-100 text-blue-800'
                          }`}>
                            {product.badge}
                          </div>
                        )}
                      </div>

                      {/* Product Info */}
                      <p className="text-xs text-gray-500 uppercase mb-1">{product.category}</p>
                      <h3 className="font-bold text-gray-900 mb-2 line-clamp-2">
                        {product.name}
                      </h3>

                      {/* Rating */}
                      <div className="flex items-center gap-2 mb-3">
                        <div className="flex items-center">
                          <StarSolid className="h-4 w-4 text-yellow-400" />
                          <span className="text-sm font-medium text-gray-700 ml-1">
                            {product.rating}
                          </span>
                        </div>
                        <span className="text-xs text-gray-500">
                          ({product.reviews})
                        </span>
                      </div>

                      {/* Price */}
                      <div className="flex items-baseline gap-2 mb-3">
                        <span className="text-2xl font-bold text-gray-900">
                          ${product.price}
                        </span>
                        {product.originalPrice && (
                          <span className="text-sm text-gray-500 line-through">
                            ${product.originalPrice}
                          </span>
                        )}
                      </div>

                      {/* Stock */}
                      <p className={`text-sm mb-4 ${
                        product.stock === 0 ? 'text-red-600' :
                        product.stock < 10 ? 'text-orange-600' :
                        'text-green-600'
                      }`}>
                        {product.stock === 0 ? '❌ Agotado' :
                         product.stock < 10 ? `⚠️ Últimas ${product.stock} unidades` :
                         '✅ Disponible'}
                      </p>

                      {/* Actions */}
                      <div className="space-y-2">
                        <Button
                          variant="primary"
                          size="sm"
                          className="w-full"
                          leftIcon={<ShoppingCartIcon className="h-4 w-4" />}
                          onClick={() => toast.success(`${product.name} agregado al carrito`)}
                          disabled={product.stock === 0}
                        >
                          Agregar al Carrito
                        </Button>
                        <div className="grid grid-cols-2 gap-2">
                          <Link href={`/producto/${product.id}`}>
                            <Button variant="outline" size="sm" className="w-full">
                              Ver Detalles
                            </Button>
                          </Link>
                          <Button
                            variant="ghost"
                            size="sm"
                            leftIcon={<HeartIcon className="h-4 w-4" />}
                            onClick={() => toast.success('Agregado a favoritos')}
                          >

                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
