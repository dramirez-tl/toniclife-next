'use client';

import Link from 'next/link';
import { Card, Badge, Button } from '@/components/ui';
import { ShoppingCartIcon, CheckIcon } from '@heroicons/react/24/outline';
import { StarIcon } from '@heroicons/react/24/solid';
import { useAddCartItem } from '@/hooks/useCart';
import { useState } from 'react';
import type { Product } from '@/types';
import { formatCurrency } from '@/lib/currency';
import type { LanguageCode } from '@/i18n/config';

/** Returns 2-letter initials from a product name (first letter of first two words) */
function getProductInitials(name: string): string {
  const words = name.split(/\s+/).filter(w => w.length > 0);
  if (words.length >= 2) {
    return (words[0][0] + words[1][0]).toUpperCase();
  }
  return name.substring(0, 2).toUpperCase();
}

/** Fallback placeholder shown when a product image is missing or broken */
function ProductImageFallback({ name, size = 'md' }: { name: string; size?: 'sm' | 'md' }) {
  const dims = size === 'sm' ? 'w-24 h-24' : 'w-28 h-28';
  const textSize = size === 'sm' ? 'text-2xl' : 'text-3xl';
  return (
    <div className={`${dims} bg-gradient-to-br from-[#C8DDF2]/30 to-[#3E667D]/20 rounded-2xl flex items-center justify-center`}>
      <span className={`${textSize} font-bold text-[#3E667D]/70`}>
        {getProductInitials(name)}
      </span>
    </div>
  );
}

interface ProductGridProps {
  products: Product[];
  viewMode?: 'grid' | 'list';
  /** Idioma para el formato de moneda (separadores). El símbolo lo da currencyCode. */
  lang?: LanguageCode;
}

export function ProductGrid({ products, viewMode = 'grid', lang = 'es' }: ProductGridProps) {
  if (viewMode === 'list') {
    return (
      <div className="space-y-4">
        {products.map((product) => (
          <ProductListItem key={product.id} product={product} lang={lang} />
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
      {products.map((product) => (
        <ProductCard key={product.id} product={product} lang={lang} />
      ))}
    </div>
  );
}

// Grid Card Component
function ProductCard({ product, lang = 'es' }: { product: Product; lang?: LanguageCode }) {
  const addToCart = useAddCartItem();
  const [added, setAdded] = useState(false);
  const [imgError, setImgError] = useState(false);

  const handleAddToCart = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    addToCart.mutate(
      { productId: product.id, quantity: 1 },
      {
        onSuccess: () => {
          setAdded(true);
          setTimeout(() => setAdded(false), 2000);
        },
      }
    );
  };

  return (
    <Link href={`/productos/${product.slug}`} className="block h-full">
      <Card
        className="group relative overflow-hidden cursor-pointer h-full flex flex-col p-0 transition-shadow hover:shadow-md"
      >
        {/* Badges */}
        <div className="absolute top-4 left-4 z-10 flex flex-col gap-2">
          {product.compareAtPrice && (
            <Badge variant="outline" className="border-red-200 bg-red-100 text-red-700">
              -{Math.round((1 - product.price / product.compareAtPrice) * 100)}%
            </Badge>
          )}
          {product.featured && (
            <Badge variant="outline" className="border-green-200 bg-green-100 text-green-700">Destacado</Badge>
          )}
        </div>

        {/* Product Image */}
        <div className="aspect-square bg-gradient-to-br from-gray-100 to-gray-50 flex items-center justify-center overflow-hidden">
          <div className="relative w-full h-full flex items-center justify-center group-hover:scale-105 transition-transform duration-300">
            {product.image && !imgError ? (
              <img
                src={product.image}
                alt={product.name}
                className="w-full h-full object-contain p-4"
                loading="lazy"
                onError={() => setImgError(true)}
              />
            ) : (
              <ProductImageFallback name={product.name} />
            )}
          </div>
        </div>

        {/* Product Info */}
        <div className="p-5 flex flex-col flex-grow">
          {/* Category */}
          <span className="text-xs font-medium text-[#3E667D] uppercase tracking-wide">
            {product.category}
          </span>

          {/* Name */}
          <h3 className="font-bold text-lg text-[#3E667D] mt-1 line-clamp-2">
            {product.name}
          </h3>
          {product.code && (
            <Badge variant="outline" className="mt-1 w-fit font-mono text-[11px] text-gray-500">
              {product.code}
            </Badge>
          )}

          {/* Rating */}
          <div className="flex items-center gap-1 mt-2">
            {[1, 2, 3, 4, 5].map((star) => (
              <StarIcon key={star} className="h-4 w-4 text-yellow-400" />
            ))}
            <span className="text-xs text-gray-500 ml-1">(24)</span>
          </div>

          {/* Price & Add to Cart — pushed to bottom */}
          <div className="flex items-center justify-between mt-auto pt-4 border-t border-gray-100">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xl font-bold text-[#3E667D]">
                  {formatCurrency(product.price, product.currencyCode || 'MXN', lang)}
                </span>
                {product.compareAtPrice && (
                  <span className="text-sm text-gray-400 line-through">
                    ${product.compareAtPrice.toFixed(2)}
                  </span>
                )}
              </div>
            </div>
            <Button
              size="sm"
              onClick={handleAddToCart}
              disabled={addToCart.isPending}
              variant={added ? 'success' : 'default'}
              className="cursor-pointer"
            >
              {added ? <CheckIcon className="h-4 w-4" /> : <ShoppingCartIcon className="h-4 w-4" />}
              {addToCart.isPending ? 'Agregando...' : added ? 'Agregado' : 'Agregar'}
            </Button>
          </div>
        </div>
      </Card>
    </Link>
  );
}

// List Item Component
function ProductListItem({ product, lang = 'es' }: { product: Product; lang?: LanguageCode }) {
  const addToCart = useAddCartItem();
  const [added, setAdded] = useState(false);
  const [imgError, setImgError] = useState(false);

  const handleAddToCart = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    addToCart.mutate(
      { productId: product.id, quantity: 1 },
      {
        onSuccess: () => {
          setAdded(true);
          setTimeout(() => setAdded(false), 2000);
        },
      }
    );
  };

  return (
    <Link href={`/productos/${product.slug}`} className="block">
      <Card className="overflow-hidden cursor-pointer p-0 transition-shadow hover:shadow-md">
        <div className="flex flex-col sm:flex-row">
          {/* Product Image */}
          <div className="sm:w-48 aspect-square sm:aspect-auto bg-gradient-to-br from-gray-100 to-gray-50 flex items-center justify-center flex-shrink-0">
            {product.image && !imgError ? (
              <img
                src={product.image}
                alt={product.name}
                className="w-full h-full object-contain p-4"
                loading="lazy"
                onError={() => setImgError(true)}
              />
            ) : (
              <ProductImageFallback name={product.name} size="sm" />
            )}
          </div>

          {/* Product Info */}
          <div className="flex-grow p-5">
            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
              <div className="flex-grow">
                {/* Badges */}
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-xs font-medium text-[#3E667D] uppercase tracking-wide">
                    {product.category}
                  </span>
                  {product.featured && (
                    <Badge variant="outline" className="border-green-200 bg-green-100 text-green-700 px-1.5 py-0 text-[10px]">Destacado</Badge>
                  )}
                  {product.compareAtPrice && (
                    <Badge variant="outline" className="border-red-200 bg-red-100 text-red-700 px-1.5 py-0 text-[10px]">
                      -{Math.round((1 - product.price / product.compareAtPrice) * 100)}%
                    </Badge>
                  )}
                </div>

                {/* Name */}
                <h3 className="font-bold text-lg text-[#3E667D] transition-colors">
                  {product.name}
                </h3>
                {product.code && (
                  <Badge variant="outline" className="mt-1 w-fit font-mono text-[11px] text-gray-500">
                    {product.code}
                  </Badge>
                )}

                {/* Description */}
                <p className="text-sm text-gray-500 mt-1 line-clamp-2">
                  {product.shortDescription}
                </p>

                {/* Benefits */}
                <div className="flex flex-wrap gap-1 mt-3">
                  {product.benefits.slice(0, 3).map((benefit, index) => (
                    <span
                      key={index}
                      className="text-xs bg-[#3E667D]/5 text-[#3E667D] px-2 py-1 rounded-full"
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
                  <div className="flex items-center gap-2 justify-end">
                    <span className="text-2xl font-bold text-[#3E667D]">
                      {formatCurrency(product.price, product.currencyCode || 'MXN', lang)}
                    </span>
                  </div>
                </div>
                <Button
                  onClick={handleAddToCart}
                  disabled={addToCart.isPending}
                  variant={added ? 'success' : 'default'}
                  className="cursor-pointer"
                >
                  {added ? <CheckIcon className="h-4 w-4" /> : <ShoppingCartIcon className="h-4 w-4" />}
                  {addToCart.isPending ? 'Agregando...' : added ? 'Agregado' : 'Agregar al Carrito'}
                </Button>
              </div>
            </div>
          </div>
        </div>
      </Card>
    </Link>
  );
}
