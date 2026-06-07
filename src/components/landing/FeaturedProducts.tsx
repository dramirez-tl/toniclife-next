'use client';

import Link from 'next/link';
import { useState } from 'react';
import { Button, Card, Badge } from '@/components/ui';
import { useFeaturedProducts, useCategories } from '@/hooks/useProducts';
import { useAddCartItem } from '@/hooks/useCart';
import {
  ShoppingCartIcon,
  ArrowRightIcon,
  BoltIcon,
  SparklesIcon,
  HeartIcon,
  MoonIcon,
  ShieldCheckIcon,
  ScaleIcon,
  CheckIcon
} from '@heroicons/react/24/outline';

const categoryIcons: Record<string, React.ReactNode> = {
  'sistema-digestivo': <SparklesIcon className="h-6 w-6" />,
  'sistema-inmunologico': <ShieldCheckIcon className="h-6 w-6" />,
  'sistema-nervioso': <MoonIcon className="h-6 w-6" />,
  'sistema-cardiovascular': <HeartIcon className="h-6 w-6" />,
  'control-de-peso': <ScaleIcon className="h-6 w-6" />,
  'energia-vitalidad': <BoltIcon className="h-6 w-6" />,
  'belleza-cuidado': <SparklesIcon className="h-6 w-6" />,
  'nutricion-deportiva': <BoltIcon className="h-6 w-6" />,
  'salud-osea-articular': <HeartIcon className="h-6 w-6" />,
  'kits-inicio': <ShieldCheckIcon className="h-6 w-6" />
};

// Product Card Component with cart functionality
interface ProductCardProps {
  product: {
    id: string;
    name: string;
    slug?: string;
    code: string;
    shortName?: string;
    description?: string;
    pointsValue: string;
    isFeatured: boolean;
    healthBenefits?: string[];
    imageUrl?: string;
    price?: string;
  };
}

function FeaturedProductCard({ product }: ProductCardProps) {
  const addToCart = useAddCartItem();
  const [added, setAdded] = useState(false);
  const [imgError, setImgError] = useState(false);
  const productHref = product.slug ? `/productos/${product.slug}` : '/productos';

  const handleAddToCart = () => {
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
    <Card
      className="group relative overflow-hidden p-0 transition-shadow hover:shadow-md"
    >
      {/* Discount Badge */}
      {product.isFeatured && (
        <div className="absolute top-4 left-4 z-10">
          <Badge variant="outline" className="border-transparent bg-[#abc9ba] text-white">
            Más Vendido
          </Badge>
        </div>
      )}

      {/* Product Image */}
      <Link href={productHref}>
        <div className="aspect-square bg-gradient-to-br from-gray-100 to-gray-50 flex items-center justify-center overflow-hidden cursor-pointer">
          <div className="relative w-full h-full flex items-center justify-center group-hover:scale-105 transition-transform duration-300">
            {product.imageUrl && !imgError ? (
              <img
                src={product.imageUrl}
                alt={product.name}
                className="w-full h-full object-contain p-4"
                loading="lazy"
                onError={() => setImgError(true)}
              />
            ) : (
              <div className="w-32 h-32 bg-gradient-to-br from-[#C8DDF2]/30 to-[#3E667D]/20 rounded-2xl flex items-center justify-center">
                <span className="text-4xl font-bold text-[#3E667D]/70">
                  {product.name.split(/\s+/).filter(w => w.length > 0).length >= 2
                    ? (product.name.split(/\s+/)[0][0] + product.name.split(/\s+/)[1][0]).toUpperCase()
                    : product.name.substring(0, 2).toUpperCase()}
                </span>
              </div>
            )}
          </div>
        </div>
      </Link>

      {/* Product Info */}
      <div className="p-5">
        {/* Category */}
        <div className="flex items-center gap-2 text-[#3E667D] mb-2">
          {categoryIcons[(product.slug || '').split('-')[0]] || <SparklesIcon className="h-6 w-6" />}
          <span className="text-sm font-medium">{product.code}</span>
        </div>

        {/* Name */}
        <h3 className="font-bold text-lg text-[#3E667D] group-hover:text-[#3E667D] transition-colors">
          <Link href={productHref}>
            {product.name}
          </Link>
        </h3>

        {/* Short Description */}
        <p className="text-sm text-gray-500 mt-1 line-clamp-2">
          {product.shortName || product.description?.substring(0, 100)}
        </p>

        {/* Health Benefits */}
        {product.healthBenefits && product.healthBenefits.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-3">
            {product.healthBenefits.slice(0, 2).map((benefit, index) => (
              <span
                key={index}
                className="text-xs bg-[#3E667D]/5 text-[#3E667D] px-2 py-1 rounded-full"
              >
                {benefit}
              </span>
            ))}
          </div>
        )}

        {/* Price & Add to Cart */}
        <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-100">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xl font-bold text-[#3E667D]">
                ${parseFloat(product.price || product.pointsValue || '0').toFixed(2)}
              </span>
            </div>
            {parseFloat(product.pointsValue || '0') > 0 && (
              <span className="text-xs text-gray-500">
                {product.pointsValue} pts
              </span>
            )}
          </div>
          <Button
            size="sm"
            onClick={handleAddToCart}
            disabled={addToCart.isPending}
            variant={added ? 'success' : 'default'}
            aria-label={`Agregar ${product.name} al carrito`}
          >
            {added ? <CheckIcon className="h-4 w-4" /> : <ShoppingCartIcon className="h-4 w-4" />}
            {addToCart.isPending ? '...' : added ? 'Listo' : 'Agregar'}
          </Button>
        </div>
      </div>
    </Card>
  );
}

export function FeaturedProducts() {
  const { data: featuredResponse, isLoading: loadingProducts } = useFeaturedProducts(8);
  const { data: categories, isLoading: loadingCategories } = useCategories();

  const featuredProducts = featuredResponse?.data || [];

  if (loadingProducts) {
    return (
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <div className="h-8 bg-gray-200 rounded w-32 mx-auto mb-4 animate-pulse" />
            <div className="h-12 bg-gray-200 rounded w-64 mx-auto mb-4 animate-pulse" />
            <div className="h-6 bg-gray-200 rounded w-96 mx-auto animate-pulse" />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="bg-gray-100 rounded-lg h-96 animate-pulse" />
            ))}
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="py-20 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="text-center mb-16">
          <Badge variant="outline" className="mb-4 border-transparent bg-[#abc9ba] px-3 py-1 text-sm text-white">
            Más Vendidos
          </Badge>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-[#3E667D]">
            Productos Destacados
          </h2>
          <p className="mt-4 text-lg text-gray-600 max-w-2xl mx-auto">
            Descubre nuestros productos más populares, seleccionados por miles de clientes
            que han transformado su bienestar.
          </p>
        </div>

        {/* Categories Pills */}
        <div className="flex flex-wrap justify-center gap-3 mb-12">
          <Button className="px-5 py-2.5 rounded-full">
            Todos
          </Button>
          {!loadingCategories && categories?.slice(0, 5).map((category) => (
            <Link
              key={category.id}
              href={`/productos?categoria=${category.slug}`}
              className="px-5 py-2.5 rounded-full bg-gray-100 text-gray-700 font-medium hover:bg-[#C8DDF2]/10 hover:text-[#3E667D] transition-all"
            >
              {category.name}
            </Link>
          ))}
        </div>

        {/* Products Grid */}
        {featuredProducts.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-gray-200 bg-gray-50/70 p-10 text-center">
            <SparklesIcon className="mx-auto mb-3 h-8 w-8 text-gray-400" />
            <p className="text-base font-medium text-gray-700">No hay productos destacados por ahora</p>
            <p className="mt-1 text-sm text-gray-500">Explora el catalogo completo para descubrir recomendaciones.</p>
            <div className="mt-5">
              <Link href="/productos">
                <Button variant="outline">Ver catalogo</Button>
              </Link>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {featuredProducts.map((product) => (
              <FeaturedProductCard key={product.id} product={product} />
            ))}
          </div>
        )}

        {/* View All Button */}
        <div className="text-center mt-12">
          <Link href="/productos">
            <Button
              variant="outline"
              size="lg"
            >
              Ver Todos los Productos
              <ArrowRightIcon className="h-5 w-5" />
            </Button>
          </Link>
        </div>
      </div>
    </section>
  );
}
