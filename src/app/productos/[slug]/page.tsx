'use client';

import { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { ShoppingCartIcon, HeartIcon, StarIcon, CheckCircleIcon, TruckIcon, ShieldCheckIcon } from '@heroicons/react/24/outline';
import { HeartIcon as HeartSolidIcon } from '@heroicons/react/24/solid';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Card, CardContent } from '@/components/ui/Card';
import { products } from '@/lib/mock-data';
import { toast } from 'sonner';

export default function ProductDetailPage({ params }: { params: { slug: string } }) {
  const product = products.find(p => p.slug === params.slug);
  const [selectedImage, setSelectedImage] = useState(0);
  const [quantity, setQuantity] = useState(1);
  const [isFavorite, setIsFavorite] = useState(false);
  const [activeTab, setActiveTab] = useState<'description' | 'benefits' | 'usage' | 'ingredients'>('description');

  if (!product) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Producto no encontrado</h1>
          <Link href="/productos">
            <Button>Ver todos los productos</Button>
          </Link>
        </div>
      </div>
    );
  }

  const relatedProducts = products
    .filter(p => p.id !== product.id && p.category === product.category)
    .slice(0, 4);

  const handleAddToCart = () => {
    toast.success(`${quantity}x ${product.name} agregado al carrito`);
  };

  const handleToggleFavorite = () => {
    setIsFavorite(!isFavorite);
    toast.success(isFavorite ? 'Removido de favoritos' : 'Agregado a favoritos');
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Breadcrumbs */}
      <div className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <nav className="flex items-center space-x-2 text-sm">
            <Link href="/" className="text-gray-500 hover:text-[#003B7A]">Inicio</Link>
            <span className="text-gray-400">/</span>
            <Link href="/productos" className="text-gray-500 hover:text-[#003B7A]">Productos</Link>
            <span className="text-gray-400">/</span>
            <span className="text-gray-900 font-medium">{product.name}</span>
          </nav>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12 mb-12">
          {/* Product Images */}
          <div>
            <div className="bg-white rounded-2xl p-6 mb-4 relative">
              {product.badge && (
                <Badge variant={product.badge === 'Nuevo' ? 'success' : 'warning'} className="absolute top-4 left-4 z-10">
                  {product.badge}
                </Badge>
              )}
              <div className="aspect-square relative mb-4">
                <Image
                  src={product.image}
                  alt={product.name}
                  fill
                  className="object-contain"
                />
              </div>
            </div>

            {/* Trust Badges */}
            <div className="grid grid-cols-3 gap-4">
              <Card>
                <CardContent className="p-4 text-center">
                  <TruckIcon className="h-8 w-8 text-[#7AB82E] mx-auto mb-2" />
                  <p className="text-xs font-medium text-gray-900">Envío Gratis</p>
                  <p className="text-xs text-gray-500">En pedidos +$999</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4 text-center">
                  <ShieldCheckIcon className="h-8 w-8 text-[#7AB82E] mx-auto mb-2" />
                  <p className="text-xs font-medium text-gray-900">100% Seguro</p>
                  <p className="text-xs text-gray-500">Pago protegido</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4 text-center">
                  <CheckCircleIcon className="h-8 w-8 text-[#7AB82E] mx-auto mb-2" />
                  <p className="text-xs font-medium text-gray-900">Garantía</p>
                  <p className="text-xs text-gray-500">30 días</p>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Product Info */}
          <div>
            <div className="mb-6">
              <h1 className="text-3xl lg:text-4xl font-bold text-gray-900 mb-3">
                {product.name}
              </h1>
              <p className="text-lg text-gray-600 mb-4">{product.description}</p>

              {/* Rating */}
              {product.rating && product.reviews && (
                <div className="flex items-center gap-2 mb-4">
                  <div className="flex items-center">
                    {[...Array(5)].map((_, i) => (
                      <StarIcon
                        key={i}
                        className={`h-5 w-5 ${
                          i < Math.floor(product.rating!)
                            ? 'text-yellow-400 fill-yellow-400'
                            : 'text-gray-300'
                        }`}
                      />
                    ))}
                  </div>
                  <span className="text-sm text-gray-600">
                    {product.rating} ({product.reviews} reseñas)
                  </span>
                </div>
              )}

              {/* Price */}
              <div className="flex items-baseline gap-3 mb-6">
                <span className="text-4xl font-bold text-[#003B7A]">
                  ${product.price.toFixed(2)}
                </span>
                {product.originalPrice && (
                  <>
                    <span className="text-2xl text-gray-400 line-through">
                      ${product.originalPrice.toFixed(2)}
                    </span>
                    <Badge variant="error">
                      -{Math.round(((product.originalPrice - product.price) / product.originalPrice) * 100)}%
                    </Badge>
                  </>
                )}
              </div>

              {/* Benefits Pills */}
              <div className="flex flex-wrap gap-2 mb-6">
                {product.benefits.map((benefit, index) => (
                  <Badge key={index} variant="outline">
                    {benefit}
                  </Badge>
                ))}
              </div>
            </div>

            {/* Quantity Selector */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Cantidad
              </label>
              <div className="flex items-center gap-3">
                <div className="flex items-center border border-gray-300 rounded-lg">
                  <button
                    onClick={() => setQuantity(Math.max(1, quantity - 1))}
                    className="px-4 py-2 text-gray-600 hover:bg-gray-50"
                  >
                    -
                  </button>
                  <span className="px-6 py-2 font-medium text-gray-900 border-x border-gray-300">
                    {quantity}
                  </span>
                  <button
                    onClick={() => setQuantity(quantity + 1)}
                    className="px-4 py-2 text-gray-600 hover:bg-gray-50"
                  >
                    +
                  </button>
                </div>
                <span className="text-sm text-gray-500">
                  {product.stock && product.stock > 10 ? 'En stock' : product.stock ? `Solo ${product.stock} disponibles` : 'En stock'}
                </span>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3 mb-6">
              <Button
                variant="primary"
                size="lg"
                className="flex-1"
                onClick={handleAddToCart}
              >
                <ShoppingCartIcon className="h-5 w-5 mr-2" />
                Agregar al carrito
              </Button>
              <Button
                variant="outline"
                size="lg"
                onClick={handleToggleFavorite}
              >
                {isFavorite ? (
                  <HeartSolidIcon className="h-6 w-6 text-red-500" />
                ) : (
                  <HeartIcon className="h-6 w-6" />
                )}
              </Button>
            </div>

            <Link href="/carrito">
              <Button variant="secondary" size="lg" className="w-full">
                Comprar ahora
              </Button>
            </Link>
          </div>
        </div>

        {/* Product Details Tabs */}
        <Card className="mb-12">
          <CardContent className="p-0">
            <div className="border-b border-gray-200">
              <nav className="flex -mb-px">
                <button
                  onClick={() => setActiveTab('description')}
                  className={`px-6 py-4 text-sm font-medium border-b-2 ${
                    activeTab === 'description'
                      ? 'border-[#003B7A] text-[#003B7A]'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  Descripción
                </button>
                <button
                  onClick={() => setActiveTab('benefits')}
                  className={`px-6 py-4 text-sm font-medium border-b-2 ${
                    activeTab === 'benefits'
                      ? 'border-[#003B7A] text-[#003B7A]'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  Beneficios
                </button>
                <button
                  onClick={() => setActiveTab('usage')}
                  className={`px-6 py-4 text-sm font-medium border-b-2 ${
                    activeTab === 'usage'
                      ? 'border-[#003B7A] text-[#003B7A]'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  Modo de uso
                </button>
                <button
                  onClick={() => setActiveTab('ingredients')}
                  className={`px-6 py-4 text-sm font-medium border-b-2 ${
                    activeTab === 'ingredients'
                      ? 'border-[#003B7A] text-[#003B7A]'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  Ingredientes
                </button>
              </nav>
            </div>

            <div className="p-6">
              {activeTab === 'description' && (
                <div className="prose max-w-none">
                  <p className="text-gray-700 leading-relaxed">
                    {product.fullDescription || product.description}
                  </p>
                </div>
              )}

              {activeTab === 'benefits' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {product.benefits.map((benefit, index) => (
                    <div key={index} className="flex items-start gap-3">
                      <CheckCircleIcon className="h-6 w-6 text-[#7AB82E] flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="font-medium text-gray-900">{benefit}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {activeTab === 'usage' && (
                <div className="space-y-4">
                  {product.dosage && (
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                      <h4 className="font-semibold text-[#003B7A] mb-2">Dosis recomendada</h4>
                      <p className="text-gray-700">{product.dosage}</p>
                    </div>
                  )}
                  <div>
                    <h4 className="font-semibold text-gray-900 mb-2">Instrucciones</h4>
                    <p className="text-gray-700 mb-2">{product.usage.ideal}</p>
                    {product.usage.regular && (
                      <p className="text-gray-700 mb-2">{product.usage.regular}</p>
                    )}
                    {product.usage.notes && (
                      <p className="text-sm text-gray-600 italic">{product.usage.notes}</p>
                    )}
                  </div>
                </div>
              )}

              {activeTab === 'ingredients' && (
                <div>
                  <h4 className="font-semibold text-gray-900 mb-4">Ingredientes activos</h4>
                  {product.ingredients && product.ingredients.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {product.ingredients.map((ingredient, index) => (
                        <div key={index} className="bg-gray-50 rounded-lg p-3">
                          <p className="text-gray-900 font-medium">{ingredient}</p>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-gray-600">Información de ingredientes disponible próximamente.</p>
                  )}
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Related Products */}
        {relatedProducts.length > 0 && (
          <div>
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Productos relacionados</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {relatedProducts.map((relatedProduct) => (
                <Link key={relatedProduct.id} href={`/productos/${relatedProduct.slug}`}>
                  <Card className="group hover:shadow-xl transition-all duration-300 cursor-pointer h-full">
                    <CardContent className="p-4">
                      <div className="aspect-square relative mb-4 bg-gray-50 rounded-lg overflow-hidden">
                        {relatedProduct.badge && (
                          <Badge variant={relatedProduct.badge === 'Nuevo' ? 'success' : 'warning'} className="absolute top-2 left-2 z-10">
                            {relatedProduct.badge}
                          </Badge>
                        )}
                        <Image
                          src={relatedProduct.image}
                          alt={relatedProduct.name}
                          fill
                          className="object-contain group-hover:scale-105 transition-transform duration-300"
                        />
                      </div>
                      <h3 className="font-semibold text-gray-900 mb-2 group-hover:text-[#003B7A] transition-colors">
                        {relatedProduct.name}
                      </h3>
                      <div className="flex items-baseline gap-2 mb-3">
                        <span className="text-xl font-bold text-[#003B7A]">
                          ${relatedProduct.price.toFixed(2)}
                        </span>
                        {relatedProduct.originalPrice && (
                          <span className="text-sm text-gray-400 line-through">
                            ${relatedProduct.originalPrice.toFixed(2)}
                          </span>
                        )}
                      </div>
                      <Button variant="outline" size="sm" className="w-full">
                        Ver detalles
                      </Button>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
