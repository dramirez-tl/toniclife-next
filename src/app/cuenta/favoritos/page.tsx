'use client';

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Button } from '@/components/ui/Button';
import { Card, CardContent } from '@/components/ui/Card';
import {
  HeartIcon,
  ShoppingCartIcon,
  TrashIcon,
  ShareIcon,
  FunnelIcon,
  MagnifyingGlassIcon,
} from '@heroicons/react/24/outline';
import { HeartIcon as HeartSolidIcon, StarIcon } from '@heroicons/react/24/solid';
import { toast } from 'sonner';

// Mock wishlist data
const mockWishlistItems = [
  {
    id: '1',
    name: 'Vitamina D3 + K2',
    category: 'Inmunidad',
    price: 449,
    originalPrice: 599,
    image: '/products/vitamin-d.jpg',
    rating: 4.8,
    reviews: 234,
    stock: 15,
    badge: 'En oferta',
    addedDate: '2025-01-15',
  },
  {
    id: '2',
    name: 'Omega 3 Premium',
    category: 'Salud Cardiovascular',
    price: 599,
    originalPrice: null,
    image: '/products/omega-3.jpg',
    rating: 4.9,
    reviews: 456,
    stock: 8,
    badge: null,
    addedDate: '2025-01-10',
  },
  {
    id: '3',
    name: 'Magnesio Bisglicinato',
    category: 'Relajación',
    price: 399,
    originalPrice: 499,
    image: '/products/magnesium.jpg',
    rating: 4.7,
    reviews: 189,
    stock: 0,
    badge: 'Agotado',
    addedDate: '2025-01-05',
  },
  {
    id: '4',
    name: 'Complejo B Activo',
    category: 'Energía',
    price: 349,
    originalPrice: null,
    image: '/products/vitamin-b.jpg',
    rating: 4.6,
    reviews: 167,
    stock: 25,
    badge: 'Nuevo',
    addedDate: '2024-12-28',
  },
  {
    id: '5',
    name: 'Colágeno Hidrolizado',
    category: 'Belleza & Piel',
    price: 699,
    originalPrice: 899,
    image: '/products/collagen.jpg',
    rating: 4.9,
    reviews: 523,
    stock: 12,
    badge: 'Bestseller',
    addedDate: '2024-12-20',
  },
  {
    id: '6',
    name: 'Probióticos Advanced',
    category: 'Digestión',
    price: 549,
    originalPrice: null,
    image: '/products/probiotics.jpg',
    rating: 4.8,
    reviews: 312,
    stock: 18,
    badge: null,
    addedDate: '2024-12-15',
  },
];

const categories = ['Todas', 'Inmunidad', 'Energía', 'Digestión', 'Belleza & Piel', 'Relajación', 'Salud Cardiovascular'];

const sortOptions = [
  { value: 'recent', label: 'Agregados recientemente' },
  { value: 'name', label: 'Nombre (A-Z)' },
  { value: 'price_low', label: 'Precio: Menor a Mayor' },
  { value: 'price_high', label: 'Precio: Mayor a Menor' },
  { value: 'rating', label: 'Mejor Calificados' },
];

export default function FavoritosPage() {
  const [wishlistItems, setWishlistItems] = useState(mockWishlistItems);
  const [selectedCategory, setSelectedCategory] = useState('Todas');
  const [sortBy, setSortBy] = useState('recent');
  const [searchQuery, setSearchQuery] = useState('');
  const [showShareModal, setShowShareModal] = useState(false);
  const [shareLink, setShareLink] = useState('');

  const handleRemoveFromWishlist = (productId: string, productName: string) => {
    setWishlistItems(wishlistItems.filter(item => item.id !== productId));
    toast.success(`${productName} eliminado de favoritos`);
  };

  const handleAddToCart = (productName: string, stock: number) => {
    if (stock === 0) {
      toast.error('Producto agotado');
      return;
    }
    toast.success(`${productName} agregado al carrito`);
  };

  const handleAddAllToCart = () => {
    const availableItems = wishlistItems.filter(item => item.stock > 0);
    toast.success(`${availableItems.length} productos agregados al carrito`);
  };

  const handleShare = () => {
    // Generate a unique share link
    const uniqueId = Math.random().toString(36).substring(7);
    const link = `${window.location.origin}/wishlist/${uniqueId}`;
    setShareLink(link);
    setShowShareModal(true);
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(shareLink);
    toast.success('¡Link copiado al portapapeles!');
  };

  const handleShareViaEmail = () => {
    const subject = encodeURIComponent('Te comparto mi lista de favoritos de Tonic Life');
    const body = encodeURIComponent(`Mira los productos que me interesan:\n\n${shareLink}`);
    window.location.href = `mailto:?subject=${subject}&body=${body}`;
  };

  const handleShareViaWhatsApp = () => {
    const text = encodeURIComponent(`Mira mi lista de favoritos de Tonic Life: ${shareLink}`);
    window.open(`https://wa.me/?text=${text}`, '_blank');
  };

  const handleClearWishlist = () => {
    if (confirm('¿Estás seguro de que quieres eliminar todos los productos de tu lista de favoritos?')) {
      setWishlistItems([]);
      toast.success('Lista de favoritos vaciada');
    }
  };

  const filteredItems = wishlistItems
    .filter(item => selectedCategory === 'Todas' || item.category === selectedCategory)
    .filter(item => item.name.toLowerCase().includes(searchQuery.toLowerCase()));

  const totalValue = filteredItems.reduce((sum, item) => sum + item.price, 0);
  const totalSavings = filteredItems.reduce((sum, item) => {
    if (item.originalPrice) {
      return sum + (item.originalPrice - item.price);
    }
    return sum;
  }, 0);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-gradient-to-r from-[#003B7A] to-[#003B7A]/90 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <HeartSolidIcon className="h-10 w-10 text-red-400" />
                <h1 className="text-4xl font-bold">Mi Lista de Favoritos</h1>
              </div>
              <p className="text-white/80 text-lg">
                {filteredItems.length} {filteredItems.length === 1 ? 'producto guardado' : 'productos guardados'}
              </p>
            </div>
            <Link href="/cuenta">
              <Button variant="secondary">
                Volver a Mi Cuenta
              </Button>
            </Link>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {wishlistItems.length === 0 ? (
          // Empty State
          <Card>
            <CardContent className="p-16 text-center">
              <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <HeartIcon className="h-12 w-12 text-gray-400" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">
                Tu lista de favoritos está vacía
              </h2>
              <p className="text-gray-600 mb-8 max-w-md mx-auto">
                Guarda los productos que te interesan para comprarlos después o seguir su disponibilidad
              </p>
              <div className="flex gap-4 justify-center">
                <Link href="/tienda">
                  <Button variant="primary" size="lg">
                    Explorar Productos
                  </Button>
                </Link>
                <Link href="/quiz">
                  <Button variant="outline" size="lg">
                    Hacer Health Quiz
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        ) : (
          <>
            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-600 mb-1">Productos guardados</p>
                      <p className="text-3xl font-bold text-gray-900">{filteredItems.length}</p>
                    </div>
                    <HeartSolidIcon className="h-12 w-12 text-red-400" />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-600 mb-1">Valor total</p>
                      <p className="text-3xl font-bold text-gray-900">
                        ${totalValue.toLocaleString('es-MX')}
                      </p>
                    </div>
                    <ShoppingCartIcon className="h-12 w-12 text-blue-400" />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-600 mb-1">Ahorro potencial</p>
                      <p className="text-3xl font-bold text-[#7AB82E]">
                        ${totalSavings.toLocaleString('es-MX')}
                      </p>
                    </div>
                    <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                      <span className="text-2xl">💰</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Filters & Actions */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
              <div className="flex flex-col lg:flex-row gap-4 items-start lg:items-center justify-between">
                {/* Search */}
                <div className="relative flex-1 max-w-md">
                  <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Buscar en favoritos..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#7AB82E] focus:border-transparent"
                  />
                </div>

                {/* Sort */}
                <div className="flex items-center gap-2">
                  <FunnelIcon className="h-5 w-5 text-gray-400" />
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
                </div>

                {/* Actions */}
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    leftIcon={<ShareIcon className="h-4 w-4" />}
                    onClick={handleShare}
                  >
                    Compartir
                  </Button>
                  <Button
                    variant="primary"
                    size="sm"
                    leftIcon={<ShoppingCartIcon className="h-4 w-4" />}
                    onClick={handleAddAllToCart}
                  >
                    Agregar Todo al Carrito
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    leftIcon={<TrashIcon className="h-4 w-4" />}
                    onClick={handleClearWishlist}
                    className="text-red-600 hover:text-red-700 hover:bg-red-50"
                  >
                    Vaciar Lista
                  </Button>
                </div>
              </div>

              {/* Category Filter */}
              <div className="flex gap-2 mt-4 overflow-x-auto pb-2">
                {categories.map(category => (
                  <button
                    key={category}
                    onClick={() => setSelectedCategory(category)}
                    className={`px-4 py-2 rounded-lg font-medium whitespace-nowrap transition-colors ${
                      selectedCategory === category
                        ? 'bg-[#003B7A] text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    {category}
                  </button>
                ))}
              </div>
            </div>

            {/* Products Grid */}
            {filteredItems.length === 0 ? (
              <Card>
                <CardContent className="p-12 text-center">
                  <p className="text-gray-600 text-lg">
                    No se encontraron productos con los filtros seleccionados
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredItems.map((product) => (
                  <Card key={product.id} className="hover:shadow-lg transition-shadow">
                    <CardContent className="p-6">
                      {/* Product Image */}
                      <div className="relative mb-4">
                        <div className="aspect-square bg-gray-100 rounded-lg overflow-hidden flex items-center justify-center">
                          <div className="text-gray-400 text-center">
                            <div className="text-6xl mb-2">📦</div>
                            <p className="text-sm">{product.name}</p>
                          </div>
                        </div>

                        {/* Badge */}
                        {product.badge && (
                          <div className={`absolute top-2 left-2 px-3 py-1 rounded-full text-xs font-semibold ${
                            product.badge === 'Agotado' ? 'bg-red-100 text-red-800' :
                            product.badge === 'En oferta' ? 'bg-orange-100 text-orange-800' :
                            product.badge === 'Nuevo' ? 'bg-blue-100 text-blue-800' :
                            'bg-purple-100 text-purple-800'
                          }`}>
                            {product.badge}
                          </div>
                        )}

                        {/* Remove Button */}
                        <button
                          onClick={() => handleRemoveFromWishlist(product.id, product.name)}
                          className="absolute top-2 right-2 w-10 h-10 bg-white rounded-full shadow-lg flex items-center justify-center hover:bg-red-50 transition-colors group"
                        >
                          <HeartSolidIcon className="h-5 w-5 text-red-500 group-hover:text-red-600" />
                        </button>
                      </div>

                      {/* Product Info */}
                      <div className="mb-4">
                        <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">
                          {product.category}
                        </p>
                        <h3 className="font-bold text-gray-900 mb-2 line-clamp-2">
                          {product.name}
                        </h3>

                        {/* Rating */}
                        <div className="flex items-center gap-2 mb-3">
                          <div className="flex items-center">
                            <StarIcon className="h-4 w-4 text-yellow-400" />
                            <span className="text-sm font-medium text-gray-700 ml-1">
                              {product.rating}
                            </span>
                          </div>
                          <span className="text-xs text-gray-500">
                            ({product.reviews} reseñas)
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
                        <p className={`text-sm ${
                          product.stock === 0 ? 'text-red-600' :
                          product.stock < 10 ? 'text-orange-600' :
                          'text-green-600'
                        }`}>
                          {product.stock === 0 ? '❌ Agotado' :
                           product.stock < 10 ? `⚠️ Últimas ${product.stock} unidades` :
                           '✅ Disponible'}
                        </p>
                      </div>

                      {/* Actions */}
                      <div className="space-y-2">
                        <Button
                          variant="primary"
                          size="sm"
                          className="w-full"
                          leftIcon={<ShoppingCartIcon className="h-4 w-4" />}
                          onClick={() => handleAddToCart(product.name, product.stock)}
                          disabled={product.stock === 0}
                        >
                          {product.stock === 0 ? 'Agotado' : 'Agregar al Carrito'}
                        </Button>
                        <Link href={`/producto/${product.id}`}>
                          <Button variant="outline" size="sm" className="w-full">
                            Ver Detalles
                          </Button>
                        </Link>
                      </div>

                      {/* Added Date */}
                      <p className="text-xs text-gray-500 mt-3 text-center">
                        Agregado el {new Date(product.addedDate).toLocaleDateString('es-MX')}
                      </p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </>
        )}
      </div>

      {/* Share Modal */}
      {showShareModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold text-gray-900">Compartir Lista de Favoritos</h3>
              <button
                onClick={() => setShowShareModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <p className="text-gray-600 mb-4">
              Comparte tu lista de favoritos con amigos y familia
            </p>

            {/* Share Link */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Link para compartir
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={shareLink}
                  readOnly
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-sm"
                />
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleCopyLink}
                >
                  Copiar
                </Button>
              </div>
            </div>

            {/* Share Options */}
            <div className="space-y-2">
              <button
                onClick={handleShareViaWhatsApp}
                className="w-full flex items-center justify-center gap-3 px-4 py-3 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors"
              >
                <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.890-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                </svg>
                Compartir por WhatsApp
              </button>

              <button
                onClick={handleShareViaEmail}
                className="w-full flex items-center justify-center gap-3 px-4 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
              >
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
                Compartir por Email
              </button>
            </div>

            <button
              onClick={() => setShowShareModal(false)}
              className="w-full mt-4 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
            >
              Cerrar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
