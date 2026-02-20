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
  };
}

function FeaturedProductCard({ product }: ProductCardProps) {
  const addToCart = useAddCartItem();
  const [added, setAdded] = useState(false);

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
      hover
      className="group relative overflow-hidden"
      padding="none"
    >
      {/* Discount Badge */}
      {product.isFeatured && (
        <div className="absolute top-4 left-4 z-10">
          <Badge variant="success">
            Más Vendido
          </Badge>
        </div>
      )}

      {/* Product Image */}
      <Link href={`/productos/${product.slug}`}>
        <div className="aspect-square bg-gradient-to-br from-gray-100 to-gray-50 flex items-center justify-center overflow-hidden cursor-pointer">
          <div className="relative w-full h-full flex items-center justify-center group-hover:scale-105 transition-transform duration-300">
            {/* Placeholder product image */}
            <div className="w-32 h-32 bg-gradient-to-br from-[#7AB82E]/20 to-[#003B7A]/20 rounded-2xl flex items-center justify-center">
              <span className="text-4xl font-bold text-[#003B7A]">
                {product.name.substring(0, 2).toUpperCase()}
              </span>
            </div>
          </div>
        </div>
      </Link>

      {/* Product Info */}
      <div className="p-5">
        {/* Category */}
        <div className="flex items-center gap-2 text-[#7AB82E] mb-2">
          {categoryIcons[(product.slug || '').split('-')[0]] || <SparklesIcon className="h-6 w-6" />}
          <span className="text-sm font-medium">{product.code}</span>
        </div>

        {/* Name */}
        <h3 className="font-bold text-lg text-[#003B7A] group-hover:text-[#7AB82E] transition-colors">
          <Link href={`/productos/${product.slug}`}>
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
                className="text-xs bg-[#003B7A]/5 text-[#003B7A] px-2 py-1 rounded-full"
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
              <span className="text-xl font-bold text-[#003B7A]">
                ${parseFloat(product.pointsValue || '0').toFixed(2)}
              </span>
            </div>
            <span className="text-xs text-gray-500">
              {product.pointsValue} pts
            </span>
          </div>
          <Button
            size="sm"
            onClick={handleAddToCart}
            disabled={addToCart.isPending}
            variant={added ? 'success' : 'primary'}
            leftIcon={added ? <CheckIcon className="h-4 w-4" /> : <ShoppingCartIcon className="h-4 w-4" />}
          >
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
          {!loadingCategories && categories?.slice(0, 5).map((category) => (
            <Link
              key={category.id}
              href={`/productos?categoria=${category.slug}`}
              className="px-5 py-2.5 rounded-full bg-gray-100 text-gray-700 font-medium hover:bg-[#7AB82E]/10 hover:text-[#7AB82E] transition-all"
            >
              {category.name}
            </Link>
          ))}
        </div>

        {/* Products Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {featuredProducts.map((product) => (
            <FeaturedProductCard key={product.id} product={product} />
          ))}
        </div>

        {/* View All Button */}
        <div className="text-center mt-12">
          <Link href="/productos">
            <Button
              variant="outline"
              size="lg"
              rightIcon={<ArrowRightIcon className="h-5 w-5" />}
            >
              Ver Todos los Productos
            </Button>
          </Link>
        </div>
      </div>
    </section>
  );
}
