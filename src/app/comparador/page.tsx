'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/Button';
import { Card, CardContent } from '@/components/ui/Card';
import {
  XMarkIcon,
  ShoppingCartIcon,
  HeartIcon,
  CheckIcon,
  XMarkIcon as XIcon,
  StarIcon,
  ScaleIcon,
  PlusIcon,
} from '@heroicons/react/24/outline';
import { StarIcon as StarSolid, HeartIcon as HeartSolid } from '@heroicons/react/24/solid';
import { toast } from 'sonner';

// Mock products for comparison
const mockProducts = [
  {
    id: '1',
    name: 'Vitamina D3 + K2',
    category: 'Inmunidad',
    price: 449,
    originalPrice: 599,
    rating: 4.8,
    reviews: 234,
    image: '/products/vitamin-d.jpg',
    badge: 'Bestseller',
    stock: 25,
    features: {
      'Dosis diaria': '5000 IU D3 + 100mcg K2',
      'Formato': 'Cápsulas blandas',
      'Cantidad': '60 cápsulas',
      'Duración': '2 meses',
      'Ingredientes principales': 'Vitamina D3, Vitamina K2 MK-7',
      'Beneficios principales': 'Salud ósea, Sistema inmune',
      'Vegano': false,
      'Sin gluten': true,
      'Sin lactosa': true,
      'Certificación': 'GMP, FDA',
    },
  },
  {
    id: '2',
    name: 'Omega 3 Premium',
    category: 'Salud Cardiovascular',
    price: 599,
    originalPrice: null,
    rating: 4.9,
    reviews: 456,
    image: '/products/omega-3.jpg',
    badge: null,
    stock: 18,
    features: {
      'Dosis diaria': '2000mg EPA/DHA',
      'Formato': 'Cápsulas blandas',
      'Cantidad': '90 cápsulas',
      'Duración': '3 meses',
      'Ingredientes principales': 'Aceite de pescado purificado',
      'Beneficios principales': 'Salud cardiovascular, Función cerebral',
      'Vegano': false,
      'Sin gluten': true,
      'Sin lactosa': true,
      'Certificación': 'IFOS 5-Star, GMP',
    },
  },
  {
    id: '3',
    name: 'Magnesio Bisglicinato',
    category: 'Relajación',
    price: 399,
    originalPrice: 499,
    rating: 4.7,
    reviews: 189,
    image: '/products/magnesium.jpg',
    badge: 'En oferta',
    stock: 32,
    features: {
      'Dosis diaria': '400mg',
      'Formato': 'Cápsulas vegetales',
      'Cantidad': '120 cápsulas',
      'Duración': '4 meses',
      'Ingredientes principales': 'Magnesio bisglicinato quelado',
      'Beneficios principales': 'Relajación muscular, Sueño',
      'Vegano': true,
      'Sin gluten': true,
      'Sin lactosa': true,
      'Certificación': 'GMP, Vegan Certified',
    },
  },
  {
    id: '4',
    name: 'Complejo B Activo',
    category: 'Energía',
    price: 349,
    originalPrice: null,
    rating: 4.6,
    reviews: 167,
    image: '/products/vitamin-b.jpg',
    badge: 'Nuevo',
    stock: 40,
    features: {
      'Dosis diaria': 'Complejo B completo',
      'Formato': 'Tabletas sublinguales',
      'Cantidad': '90 tabletas',
      'Duración': '3 meses',
      'Ingredientes principales': 'B1, B2, B3, B5, B6, B7, B9, B12',
      'Beneficios principales': 'Energía, Metabolismo',
      'Vegano': true,
      'Sin gluten': true,
      'Sin lactosa': true,
      'Certificación': 'GMP, Non-GMO',
    },
  },
];

const availableProducts = [
  { id: '5', name: 'Colágeno Hidrolizado', category: 'Belleza & Piel' },
  { id: '6', name: 'Probióticos Advanced', category: 'Digestión' },
  { id: '7', name: 'Ashwagandha Premium', category: 'Estrés' },
  { id: '8', name: 'Vitamina C 1000mg', category: 'Inmunidad' },
  { id: '9', name: 'Zinc + Cobre', category: 'Inmunidad' },
  { id: '10', name: 'Curcuma + Pimienta Negra', category: 'Antiinflamatorio' },
];

export default function ComparadorPage() {
  const [selectedProducts, setSelectedProducts] = useState(mockProducts.slice(0, 3));
  const [showAddProduct, setShowAddProduct] = useState(false);

  const handleRemoveProduct = (productId: string) => {
    setSelectedProducts(selectedProducts.filter(p => p.id !== productId));
    toast.success('Producto eliminado de la comparación');
  };

  const handleAddToCart = (productName: string) => {
    toast.success(`${productName} agregado al carrito`);
  };

  const handleAddToWishlist = (productName: string) => {
    toast.success(`${productName} agregado a favoritos`);
  };

  const handleAddProduct = (productId: string) => {
    const product = mockProducts.find(p => p.id === productId);
    if (product && selectedProducts.length < 4) {
      setSelectedProducts([...selectedProducts, product]);
      setShowAddProduct(false);
      toast.success('Producto agregado a la comparación');
    }
  };

  const handleClearAll = () => {
    if (confirm('¿Estás seguro de que quieres limpiar toda la comparación?')) {
      setSelectedProducts([]);
      toast.success('Comparación limpiada');
    }
  };

  // Get all unique feature keys
  const allFeatures = selectedProducts.length > 0
    ? Object.keys(selectedProducts[0].features)
    : [];

  const renderFeatureValue = (value: any) => {
    if (typeof value === 'boolean') {
      return value ? (
        <CheckIcon className="h-6 w-6 text-[#7AB82E] mx-auto" />
      ) : (
        <XIcon className="h-6 w-6 text-red-500 mx-auto" />
      );
    }
    return <span className="text-sm text-gray-900">{value}</span>;
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-gradient-to-r from-[#003B7A] to-[#003B7A]/90 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <ScaleIcon className="h-10 w-10" />
                <h1 className="text-4xl font-bold">Comparador de Productos</h1>
              </div>
              <p className="text-white/80 text-lg">
                Compara hasta 4 productos lado a lado
              </p>
            </div>
            <Link href="/tienda">
              <Button variant="secondary">
                Volver a la Tienda
              </Button>
            </Link>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {selectedProducts.length === 0 ? (
          // Empty State
          <Card>
            <CardContent className="p-16 text-center">
              <ScaleIcon className="h-20 w-20 text-gray-400 mx-auto mb-6" />
              <h2 className="text-3xl font-bold text-gray-900 mb-3">
                No hay productos para comparar
              </h2>
              <p className="text-gray-600 mb-8 max-w-md mx-auto">
                Agrega productos desde la tienda para compararlos lado a lado y encontrar la mejor opción para ti
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
            {/* Actions Bar */}
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <p className="text-gray-600">
                  Comparando <span className="font-bold text-gray-900">{selectedProducts.length}</span> productos
                </p>
                {selectedProducts.length < 4 && (
                  <Button
                    variant="outline"
                    size="sm"
                    leftIcon={<PlusIcon className="h-4 w-4" />}
                    onClick={() => setShowAddProduct(!showAddProduct)}
                  >
                    Agregar Producto
                  </Button>
                )}
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleClearAll}
                className="text-red-600 hover:text-red-700 hover:bg-red-50"
              >
                Limpiar Todo
              </Button>
            </div>

            {/* Add Product Panel */}
            {showAddProduct && (
              <Card className="mb-6">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-bold text-gray-900">Agregar producto a la comparación</h3>
                    <button
                      onClick={() => setShowAddProduct(false)}
                      className="text-gray-400 hover:text-gray-600"
                    >
                      <XMarkIcon className="h-5 w-5" />
                    </button>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                    {mockProducts
                      .filter(p => !selectedProducts.find(sp => sp.id === p.id))
                      .map(product => (
                        <button
                          key={product.id}
                          onClick={() => handleAddProduct(product.id)}
                          className="p-3 border border-gray-200 rounded-lg hover:border-[#7AB82E] hover:bg-[#7AB82E]/5 transition-colors text-left"
                        >
                          <p className="font-medium text-sm text-gray-900">{product.name}</p>
                          <p className="text-xs text-gray-500">{product.category}</p>
                        </button>
                      ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Comparison Table */}
            <div className="overflow-x-auto">
              <Card>
                <CardContent className="p-0">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b">
                        <th className="p-4 text-left bg-gray-50 w-48 sticky left-0 z-10">
                          <span className="font-bold text-gray-900">Característica</span>
                        </th>
                        {selectedProducts.map((product) => (
                          <th key={product.id} className="p-4 bg-white min-w-[280px]">
                            <div className="relative">
                              {/* Remove Button */}
                              <button
                                onClick={() => handleRemoveProduct(product.id)}
                                className="absolute -top-2 -right-2 w-8 h-8 bg-red-500 text-white rounded-full flex items-center justify-center hover:bg-red-600 transition-colors z-10"
                              >
                                <XMarkIcon className="h-5 w-5" />
                              </button>

                              {/* Product Image */}
                              <div className="w-full h-32 bg-gray-100 rounded-lg mb-3 flex items-center justify-center">
                                <span className="text-5xl">📦</span>
                              </div>

                              {/* Badge */}
                              {product.badge && (
                                <div className={`inline-flex px-3 py-1 rounded-full text-xs font-semibold mb-2 ${
                                  product.badge === 'Bestseller' ? 'bg-purple-100 text-purple-800' :
                                  product.badge === 'En oferta' ? 'bg-orange-100 text-orange-800' :
                                  'bg-blue-100 text-blue-800'
                                }`}>
                                  {product.badge}
                                </div>
                              )}

                              {/* Product Info */}
                              <h3 className="font-bold text-gray-900 mb-1">
                                {product.name}
                              </h3>
                              <p className="text-xs text-gray-500 mb-2">
                                {product.category}
                              </p>

                              {/* Rating */}
                              <div className="flex items-center justify-center gap-1 mb-3">
                                <StarSolid className="h-4 w-4 text-yellow-400" />
                                <span className="font-medium text-sm">{product.rating}</span>
                                <span className="text-xs text-gray-500">
                                  ({product.reviews})
                                </span>
                              </div>

                              {/* Price */}
                              <div className="mb-4">
                                <div className="flex items-baseline justify-center gap-2">
                                  <span className="text-2xl font-bold text-gray-900">
                                    ${product.price}
                                  </span>
                                  {product.originalPrice && (
                                    <span className="text-sm text-gray-500 line-through">
                                      ${product.originalPrice}
                                    </span>
                                  )}
                                </div>
                                {product.originalPrice && (
                                  <p className="text-xs text-[#7AB82E] font-medium mt-1">
                                    Ahorra ${product.originalPrice - product.price}
                                  </p>
                                )}
                              </div>

                              {/* Stock */}
                              <p className={`text-xs mb-4 ${
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
                                  onClick={() => handleAddToCart(product.name)}
                                  disabled={product.stock === 0}
                                >
                                  {product.stock === 0 ? 'Agotado' : 'Agregar al Carrito'}
                                </Button>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="w-full"
                                  leftIcon={<HeartIcon className="h-4 w-4" />}
                                  onClick={() => handleAddToWishlist(product.name)}
                                >
                                  Favoritos
                                </Button>
                              </div>
                            </div>
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {allFeatures.map((feature, index) => (
                        <tr key={feature} className={index % 2 === 0 ? 'bg-gray-50' : 'bg-white'}>
                          <td className="p-4 font-medium text-gray-900 bg-gray-50 sticky left-0 z-10">
                            {feature}
                          </td>
                          {selectedProducts.map((product) => (
                            <td key={product.id} className="p-4 text-center">
                              {renderFeatureValue(product.features[feature as keyof typeof product.features])}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </CardContent>
              </Card>
            </div>

            {/* Bottom CTA */}
            <Card className="mt-8 bg-gradient-to-r from-[#7AB82E] to-[#7AB82E]/90 text-white">
              <CardContent className="p-8">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-2xl font-bold mb-2">
                      ¿No estás seguro cuál elegir?
                    </h3>
                    <p className="text-white/90">
                      Haz nuestro Health Quiz y recibe recomendaciones personalizadas
                    </p>
                  </div>
                  <Link href="/quiz">
                    <Button variant="secondary" size="lg">
                      Hacer Health Quiz
                    </Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </div>
  );
}
