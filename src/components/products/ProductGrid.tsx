'use client';

import Link from 'next/link';
import { Card, Badge, Button } from '@/components/ui';
import { ShoppingCartIcon, HeartIcon, EyeIcon } from '@heroicons/react/24/outline';
import { StarIcon } from '@heroicons/react/24/solid';
import type { Product } from '@/types';

interface ProductGridProps {
  products: Product[];
  viewMode?: 'grid' | 'list';
}

export function ProductGrid({ products, viewMode = 'grid' }: ProductGridProps) {
  if (viewMode === 'list') {
    return (
      <div className="space-y-4">
        {products.map((product) => (
          <ProductListItem key={product.id} product={product} />
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
      {products.map((product) => (
        <ProductCard key={product.id} product={product} />
      ))}
    </div>
  );
}

// Grid Card Component
function ProductCard({ product }: { product: Product }) {
  return (
    <Card
      hover
      className="group relative overflow-hidden"
      padding="none"
    >
      {/* Badges */}
      <div className="absolute top-4 left-4 z-10 flex flex-col gap-2">
        {product.compareAtPrice && (
          <Badge variant="error">
            -{Math.round((1 - product.price / product.compareAtPrice) * 100)}%
          </Badge>
        )}
        {product.featured && (
          <Badge variant="success">Destacado</Badge>
        )}
      </div>

      {/* Wishlist Button */}
      <button className="absolute top-4 right-4 z-10 p-2 bg-white/80 rounded-full opacity-0 group-hover:opacity-100 transition-opacity hover:bg-white hover:text-red-500">
        <HeartIcon className="h-5 w-5" />
      </button>

      {/* Product Image */}
      <Link href={`/productos/${product.slug}`}>
        <div className="aspect-square bg-gradient-to-br from-gray-100 to-gray-50 flex items-center justify-center overflow-hidden">
          <div className="relative w-full h-full flex items-center justify-center group-hover:scale-105 transition-transform duration-300">
            <div className="w-28 h-28 bg-gradient-to-br from-[#7AB82E]/20 to-[#003B7A]/20 rounded-2xl flex items-center justify-center">
              <span className="text-3xl font-bold text-[#003B7A]">
                {product.name.substring(0, 2).toUpperCase()}
              </span>
            </div>
          </div>

          {/* Quick View Overlay */}
          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors flex items-center justify-center">
            <div className="flex gap-2 opacity-0 group-hover:opacity-100 transform translate-y-4 group-hover:translate-y-0 transition-all">
              <button className="p-3 bg-white rounded-full shadow-lg hover:bg-[#7AB82E] hover:text-white transition-colors">
                <EyeIcon className="h-5 w-5" />
              </button>
              <button className="p-3 bg-white rounded-full shadow-lg hover:bg-[#7AB82E] hover:text-white transition-colors">
                <ShoppingCartIcon className="h-5 w-5" />
              </button>
            </div>
          </div>
        </div>
      </Link>

      {/* Product Info */}
      <div className="p-5">
        {/* Category */}
        <span className="text-xs font-medium text-[#7AB82E] uppercase tracking-wide">
          {product.category}
        </span>

        {/* Name */}
        <h3 className="font-bold text-lg text-[#003B7A] mt-1 group-hover:text-[#7AB82E] transition-colors">
          <Link href={`/productos/${product.slug}`}>
            {product.name}
          </Link>
        </h3>

        {/* Short Description */}
        <p className="text-sm text-gray-500 mt-1 line-clamp-2">
          {product.shortDescription}
        </p>

        {/* Rating */}
        <div className="flex items-center gap-1 mt-2">
          {[1, 2, 3, 4, 5].map((star) => (
            <StarIcon key={star} className="h-4 w-4 text-yellow-400" />
          ))}
          <span className="text-xs text-gray-500 ml-1">(24)</span>
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
          <Button size="sm" leftIcon={<ShoppingCartIcon className="h-4 w-4" />}>
            Agregar
          </Button>
        </div>
      </div>
    </Card>
  );
}

// List Item Component
function ProductListItem({ product }: { product: Product }) {
  return (
    <Card hover className="overflow-hidden" padding="none">
      <div className="flex flex-col sm:flex-row">
        {/* Product Image */}
        <Link
          href={`/productos/${product.slug}`}
          className="sm:w-48 aspect-square sm:aspect-auto bg-gradient-to-br from-gray-100 to-gray-50 flex items-center justify-center flex-shrink-0"
        >
          <div className="w-24 h-24 bg-gradient-to-br from-[#7AB82E]/20 to-[#003B7A]/20 rounded-2xl flex items-center justify-center">
            <span className="text-2xl font-bold text-[#003B7A]">
              {product.name.substring(0, 2).toUpperCase()}
            </span>
          </div>
        </Link>

        {/* Product Info */}
        <div className="flex-grow p-5">
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
            <div className="flex-grow">
              {/* Badges */}
              <div className="flex items-center gap-2 mb-2">
                <span className="text-xs font-medium text-[#7AB82E] uppercase tracking-wide">
                  {product.category}
                </span>
                {product.featured && (
                  <Badge variant="success" size="sm">Destacado</Badge>
                )}
                {product.compareAtPrice && (
                  <Badge variant="error" size="sm">
                    -{Math.round((1 - product.price / product.compareAtPrice) * 100)}%
                  </Badge>
                )}
              </div>

              {/* Name */}
              <h3 className="font-bold text-lg text-[#003B7A] hover:text-[#7AB82E] transition-colors">
                <Link href={`/productos/${product.slug}`}>
                  {product.name}
                </Link>
              </h3>

              {/* Description */}
              <p className="text-sm text-gray-500 mt-1 line-clamp-2">
                {product.shortDescription}
              </p>

              {/* Benefits */}
              <div className="flex flex-wrap gap-1 mt-3">
                {product.benefits.slice(0, 3).map((benefit, index) => (
                  <span
                    key={index}
                    className="text-xs bg-[#003B7A]/5 text-[#003B7A] px-2 py-1 rounded-full"
                  >
                    {benefit}
                  </span>
                ))}
              </div>

              {/* Rating */}
              <div className="flex items-center gap-1 mt-3">
                {[1, 2, 3, 4, 5].map((star) => (
                  <StarIcon key={star} className="h-4 w-4 text-yellow-400" />
                ))}
                <span className="text-xs text-gray-500 ml-1">(24 reseñas)</span>
              </div>
            </div>

            {/* Price & Actions */}
            <div className="flex sm:flex-col items-center sm:items-end gap-4 sm:gap-2">
              <div className="text-right">
                {product.compareAtPrice && (
                  <span className="text-sm text-gray-400 line-through block">
                    ${product.compareAtPrice.toFixed(2)}
                  </span>
                )}
                <span className="text-2xl font-bold text-[#003B7A]">
                  ${product.price.toFixed(2)}
                </span>
              </div>
              <Button leftIcon={<ShoppingCartIcon className="h-4 w-4" />}>
                Agregar al Carrito
              </Button>
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
}
