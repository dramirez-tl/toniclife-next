'use client';

import Link from 'next/link';
import { Button, Card, Badge } from '@/components/ui';
import {
  CheckCircleIcon,
  ShoppingCartIcon,
  ShareIcon,
  ArrowPathIcon,
  SparklesIcon,
  BoltIcon,
  HeartIcon,
  MoonIcon,
  ShieldCheckIcon,
  ScaleIcon
} from '@heroicons/react/24/outline';
import { StarIcon } from '@heroicons/react/24/solid';
import type { QuizResult, Product, HealthProfile } from '@/types';

interface QuizResultsProps {
  result: QuizResult;
  onRestart: () => void;
}

const goalLabels: Record<string, { title: string; description: string; icon: React.ReactNode }> = {
  detox: {
    title: 'Detox & Ligereza',
    description: 'Tu cuerpo necesita una limpieza profunda para recuperar su equilibrio natural.',
    icon: <SparklesIcon className="h-8 w-8" />
  },
  energia: {
    title: 'Energía & Concentración',
    description: 'Tu prioridad es aumentar tus niveles de energía y mejorar tu enfoque mental.',
    icon: <BoltIcon className="h-8 w-8" />
  },
  belleza: {
    title: 'Piel & Belleza',
    description: 'Tu piel necesita nutrientes esenciales para brillar desde adentro.',
    icon: <SparklesIcon className="h-8 w-8" />
  },
  estres: {
    title: 'Estrés & Sueño',
    description: 'Reducir el estrés y mejorar tu descanso es clave para tu bienestar.',
    icon: <MoonIcon className="h-8 w-8" />
  },
  hormonal: {
    title: 'Balance Hormonal',
    description: 'Tu cuerpo necesita apoyo para equilibrar sus procesos hormonales.',
    icon: <HeartIcon className="h-8 w-8" />
  },
  masculino: {
    title: 'Salud Masculina',
    description: 'Tu vitalidad y energía masculina pueden mejorar significativamente.',
    icon: <ShieldCheckIcon className="h-8 w-8" />
  }
};

const healthLabels: Record<keyof HealthProfile, { label: string; icon: string }> = {
  energy: { label: 'Energía', icon: '⚡' },
  digestion: { label: 'Digestión', icon: '🍃' },
  stress: { label: 'Estrés', icon: '😌' },
  skin: { label: 'Piel', icon: '✨' },
  immune: { label: 'Inmunidad', icon: '🛡️' },
  circulation: { label: 'Circulación', icon: '🩸' },
  hormonal: { label: 'Hormonal', icon: '💗' }
};

export function QuizResults({ result, onRestart }: QuizResultsProps) {
  const goalInfo = goalLabels[result.primaryGoal] || goalLabels.energia;
  const bundle = result.recommendedBundle;

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Mi Resultado del Health Quiz - My Wellness Hub',
          text: `Descubrí mi fórmula ideal de bienestar: ${goalInfo.title}. ¡Haz tu quiz!`,
          url: window.location.origin + '/quiz'
        });
      } catch (error) {
        console.log('Error sharing:', error);
      }
    }
  };

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Success Header */}
      <div className="text-center mb-10">
        <div className="inline-flex items-center justify-center w-20 h-20 bg-[#7AB82E]/10 rounded-full mb-6">
          <CheckCircleIcon className="h-10 w-10 text-[#7AB82E]" />
        </div>
        <h1 className="text-3xl sm:text-4xl font-bold text-[#003B7A]">
          ¡Gracias por completar el cuestionario!
        </h1>
        <p className="mt-3 text-lg text-gray-600">
          Hola <span className="font-semibold">{result.userInfo.name}</span>, aquí está tu recomendación personalizada
        </p>
      </div>

      {/* Primary Goal Card */}
      <Card className="mb-8 overflow-hidden" padding="none">
        <div className="bg-gradient-to-r from-[#003B7A] to-[#003B7A]/90 text-white p-8">
          <div className="flex items-start gap-6">
            <div className="p-4 bg-[#7AB82E]/20 rounded-2xl text-[#7AB82E]">
              {goalInfo.icon}
            </div>
            <div>
              <Badge variant="success" className="mb-2">Tu Meta Principal</Badge>
              <h2 className="text-2xl sm:text-3xl font-bold">{goalInfo.title}</h2>
              <p className="mt-2 text-white/80">{goalInfo.description}</p>
            </div>
          </div>
        </div>

        {/* Health Profile */}
        <div className="p-6 bg-gray-50">
          <h3 className="text-sm font-semibold text-gray-600 mb-4">Tu Perfil de Bienestar</h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {Object.entries(result.healthProfile).map(([key, value]) => {
              const info = healthLabels[key as keyof HealthProfile];
              return (
                <div key={key} className="text-center">
                  <div className="text-2xl mb-1">{info.icon}</div>
                  <div className="text-xs text-gray-500 mb-1">{info.label}</div>
                  <div className="relative h-2 bg-gray-200 rounded-full overflow-hidden">
                    <div
                      className={`absolute inset-y-0 left-0 rounded-full transition-all ${
                        value >= 70 ? 'bg-[#7AB82E]' : value >= 40 ? 'bg-amber-400' : 'bg-red-400'
                      }`}
                      style={{ width: `${value}%` }}
                    />
                  </div>
                  <div className="text-xs font-semibold mt-1">
                    {value >= 70 ? 'Bien' : value >= 40 ? 'Mejorable' : 'Atención'}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </Card>

      {/* Recommended Bundle */}
      <Card className="mb-8" padding="lg">
        <div className="flex items-center justify-between mb-6">
          <div>
            <Badge variant="info" className="mb-2">Tu Combo Recomendado</Badge>
            <h2 className="text-2xl font-bold text-[#003B7A]">{bundle.name}</h2>
          </div>
          <div className="text-right">
            <div className="text-sm text-gray-500 line-through">${bundle.originalPrice.toFixed(2)}</div>
            <div className="text-3xl font-bold text-[#7AB82E]">${bundle.bundlePrice.toFixed(2)}</div>
            <Badge variant="error" size="sm">Ahorras {bundle.discount}%</Badge>
          </div>
        </div>

        <p className="text-gray-600 mb-6">{bundle.description}</p>

        {/* Products in Bundle */}
        <div className="space-y-4 mb-8">
          {bundle.products.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>

        {/* CTA Buttons */}
        <div className="flex flex-col sm:flex-row gap-4">
          <Button size="lg" fullWidth leftIcon={<ShoppingCartIcon className="h-5 w-5" />}>
            Agregar Combo al Carrito
          </Button>
          <Button
            variant="outline"
            size="lg"
            fullWidth
            onClick={handleShare}
            leftIcon={<ShareIcon className="h-5 w-5" />}
          >
            Compartir Resultados
          </Button>
        </div>
      </Card>

      {/* Individual Products */}
      <Card className="mb-8" padding="lg">
        <h3 className="text-xl font-bold text-[#003B7A] mb-4">
          También te recomendamos individualmente
        </h3>
        <div className="grid sm:grid-cols-3 gap-4">
          {bundle.products.map((product) => (
            <div key={product.id} className="bg-gray-50 rounded-xl p-4 text-center">
              <div className="w-16 h-16 mx-auto bg-white rounded-xl shadow-sm flex items-center justify-center mb-3">
                <span className="text-2xl font-bold text-[#003B7A]">
                  {product.name.substring(0, 2).toUpperCase()}
                </span>
              </div>
              <h4 className="font-semibold text-[#003B7A]">{product.name}</h4>
              <p className="text-sm text-gray-500 mt-1">${product.price.toFixed(2)}</p>
              <Button size="sm" variant="ghost" className="mt-2">
                Ver producto
              </Button>
            </div>
          ))}
        </div>
      </Card>

      {/* Restart or Continue */}
      <div className="text-center space-y-4">
        <button
          onClick={onRestart}
          className="inline-flex items-center gap-2 text-gray-500 hover:text-[#003B7A] transition-colors"
        >
          <ArrowPathIcon className="h-5 w-5" />
          Volver a hacer el quiz
        </button>

        <div className="pt-4">
          <Link href="/productos" className="text-[#7AB82E] hover:underline font-medium">
            Explorar todos los productos →
          </Link>
        </div>
      </div>
    </div>
  );
}

// Product Card Component
function ProductCard({ product }: { product: Product }) {
  return (
    <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-xl">
      {/* Product Image Placeholder */}
      <div className="w-20 h-20 bg-white rounded-xl shadow-sm flex-shrink-0 flex items-center justify-center">
        <span className="text-2xl font-bold text-[#003B7A]">
          {product.name.substring(0, 2).toUpperCase()}
        </span>
      </div>

      {/* Product Info */}
      <div className="flex-grow">
        <h4 className="font-bold text-[#003B7A]">{product.name}</h4>
        <p className="text-sm text-gray-500 line-clamp-1">{product.shortDescription}</p>

        {/* Benefits */}
        <div className="flex flex-wrap gap-1 mt-2">
          {product.benefits.slice(0, 2).map((benefit, index) => (
            <span
              key={index}
              className="text-xs bg-[#7AB82E]/10 text-[#7AB82E] px-2 py-0.5 rounded-full"
            >
              {benefit}
            </span>
          ))}
        </div>
      </div>

      {/* Price */}
      <div className="text-right flex-shrink-0">
        <div className="font-bold text-[#003B7A]">${product.price.toFixed(2)}</div>
        <div className="flex items-center gap-0.5 mt-1">
          {[1, 2, 3, 4, 5].map((star) => (
            <StarIcon key={star} className="h-3 w-3 text-yellow-400" />
          ))}
        </div>
      </div>
    </div>
  );
}
