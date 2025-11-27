'use client';

import Link from 'next/link';
import { Button, Card, Badge } from '@/components/ui';
import { getFeaturedProducts, productCategories } from '@/lib/mock-data';
import {
  ShoppingCartIcon,
  ArrowRightIcon,
  BoltIcon,
  SparklesIcon,
  HeartIcon,
  MoonIcon,
  ShieldCheckIcon,
  ScaleIcon
} from '@heroicons/react/24/outline';

const categoryIcons: Record<string, React.ReactNode> = {
  energia: <BoltIcon className="h-6 w-6" />,
  detox: <SparklesIcon className="h-6 w-6" />,
  belleza: <SparklesIcon className="h-6 w-6" />,
  estres: <MoonIcon className="h-6 w-6" />,
  hormonal: <HeartIcon className="h-6 w-6" />,
  masculino: <ShieldCheckIcon className="h-6 w-6" />,
  inmune: <ShieldCheckIcon className="h-6 w-6" />,
  circulacion: <HeartIcon className="h-6 w-6" />,
  peso: <ScaleIcon className="h-6 w-6" />
};

export function FeaturedProducts() {
  const featuredProducts = getFeaturedProducts();

  return (
    <section className="py-20 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="text-center mb-16">
          <Badge variant="success" size="lg" className="mb-4">
            Más Vendidos
          </Badge>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-[#003B7A]">
            Productos Destacados
          </h2>
          <p className="mt-4 text-lg text-gray-600 max-w-2xl mx-auto">
            Descubre nuestros productos más populares, seleccionados por miles de clientes
            que han transformado su bienestar.
          </p>
        </div>

        {/* Categories Pills */}
        <div className="flex flex-wrap justify-center gap-3 mb-12">
          <button className="px-5 py-2.5 rounded-full bg-[#003B7A] text-white font-medium transition-all">
            Todos
          </button>
          {productCategories.slice(0, 5).map((category) => (
            <button
              key={category.id}
              className="px-5 py-2.5 rounded-full bg-gray-100 text-gray-700 font-medium hover:bg-[#7AB82E]/10 hover:text-[#7AB82E] transition-all"
            >
              {category.name}
            </button>
          ))}
        </div>

        {/* Products Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {featuredProducts.map((product) => (
            <Card
              key={product.id}
              hover
              className="group relative overflow-hidden"
              padding="none"
            >
              {/* Discount Badge */}
              {product.compareAtPrice && (
                <div className="absolute top-4 left-4 z-10">
                  <Badge variant="error">
                    -{Math.round((1 - product.price / product.compareAtPrice) * 100)}%
                  </Badge>
                </div>
              )}

              {/* Product Image */}
              <div className="aspect-square bg-gradient-to-br from-gray-100 to-gray-50 flex items-center justify-center overflow-hidden">
                <div className="relative w-full h-full flex items-center justify-center group-hover:scale-105 transition-transform duration-300">
                  {/* Placeholder product image */}
                  <div className="w-32 h-32 bg-gradient-to-br from-[#7AB82E]/20 to-[#003B7A]/20 rounded-2xl flex items-center justify-center">
                    <span className="text-4xl font-bold text-[#003B7A]">
                      {product.name.substring(0, 2).toUpperCase()}
                    </span>
                  </div>
                </div>

                {/* Quick Actions */}
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100">
                  <div className="flex gap-2">
                    <button className="p-3 bg-white rounded-full shadow-lg hover:bg-[#7AB82E] hover:text-white transition-colors">
                      <ShoppingCartIcon className="h-5 w-5" />
                    </button>
                  </div>
                </div>
              </div>

              {/* Product Info */}
              <div className="p-5">
                {/* Category */}
                <div className="flex items-center gap-2 text-[#7AB82E] mb-2">
                  {categoryIcons[product.category]}
                  <span className="text-sm font-medium capitalize">{product.category}</span>
                </div>

                {/* Name */}
                <h3 className="font-bold text-lg text-[#003B7A] group-hover:text-[#7AB82E] transition-colors">
                  <Link href={`/productos/${product.slug}`}>
                    {product.name}
                  </Link>
                </h3>

                {/* Short Description */}
                <p className="text-sm text-gray-500 mt-1 line-clamp-2">
                  {product.shortDescription}
                </p>

                {/* Benefits */}
                <div className="flex flex-wrap gap-1 mt-3">
                  {product.benefits.slice(0, 2).map((benefit, index) => (
                    <span
                      key={index}
                      className="text-xs bg-[#003B7A]/5 text-[#003B7A] px-2 py-1 rounded-full"
                    >
                      {benefit}
                    </span>
                  ))}
                </div>

                {/* Price & Add to Cart */}
                <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-100">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xl font-bold text-[#003B7A]">
                        ${product.price.toFixed(2)}
                      </span>
                      {product.compareAtPrice && (
                        <span className="text-sm text-gray-400 line-through">
                          ${product.compareAtPrice.toFixed(2)}
                        </span>
                      )}
                    </div>
                  </div>
                  <Button size="sm">
                    Agregar
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>

        {/* View All Button */}
        <div className="text-center mt-12">
          <Button
            variant="outline"
            size="lg"
            rightIcon={<ArrowRightIcon className="h-5 w-5" />}
          >
            <Link href="/productos">Ver Todos los Productos</Link>
          </Button>
        </div>
      </div>
    </section>
  );
}
