'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import Link from 'next/link';
import Image from 'next/image';
import { Button, Card, Badge } from '@/components/ui';
import { formatCurrency } from '@/lib/currency';
import { useStoreCountry } from '@/hooks/useStoreCountry';
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
  EnvelopeIcon,
} from '@heroicons/react/24/outline';
import type { QuizResult, ProductRecommendation } from '@/types/quiz';
import { useAddCartItem } from '@/hooks/useCart';
import { useTrackCartAdd } from '@/hooks/useQuiz';
import { CartIncentiveBar } from '@/components/cart/CartIncentiveBar';
import { toast } from 'sonner';

interface QuizResultsProps {
  result: QuizResult;
  onRestart: () => void;
  onSaveEmail?: (email: string, name?: string, phone?: string) => void;
}

const goalLabels: Record<string, { title: string; description: string; icon: React.ReactNode }> = {
  detox: {
    title: 'Detox & Ligereza',
    description: 'Tu cuerpo necesita una limpieza profunda para recuperar su equilibrio natural.',
    icon: <SparklesIcon className="h-8 w-8" />,
  },
  energia: {
    title: 'Energía & Concentración',
    description: 'Tu prioridad es aumentar tus niveles de energía y mejorar tu enfoque mental.',
    icon: <BoltIcon className="h-8 w-8" />,
  },
  energy: {
    title: 'Energía & Vitalidad',
    description: 'Tu prioridad es recuperar y mantener altos niveles de energía.',
    icon: <BoltIcon className="h-8 w-8" />,
  },
  belleza: {
    title: 'Piel & Belleza',
    description: 'Tu piel necesita nutrientes esenciales para brillar desde adentro.',
    icon: <SparklesIcon className="h-8 w-8" />,
  },
  beauty: {
    title: 'Belleza Interior',
    description: 'Nutrientes esenciales para una piel radiante y saludable.',
    icon: <SparklesIcon className="h-8 w-8" />,
  },
  estres: {
    title: 'Estrés & Sueño',
    description: 'Reducir el estrés y mejorar tu descanso es clave para tu bienestar.',
    icon: <MoonIcon className="h-8 w-8" />,
  },
  stress: {
    title: 'Manejo del Estrés',
    description: 'Tu bienestar emocional y descanso son prioridad.',
    icon: <MoonIcon className="h-8 w-8" />,
  },
  hormonal: {
    title: 'Balance Hormonal',
    description: 'Tu cuerpo necesita apoyo para equilibrar sus procesos hormonales.',
    icon: <HeartIcon className="h-8 w-8" />,
  },
  masculino: {
    title: 'Salud Masculina',
    description: 'Tu vitalidad y energía masculina pueden mejorar significativamente.',
    icon: <ShieldCheckIcon className="h-8 w-8" />,
  },
  weight_loss: {
    title: 'Control de Peso',
    description: 'Alcanza tu peso ideal con el apoyo nutricional adecuado.',
    icon: <SparklesIcon className="h-8 w-8" />,
  },
  immune: {
    title: 'Sistema Inmune',
    description: 'Fortalece tus defensas naturales.',
    icon: <ShieldCheckIcon className="h-8 w-8" />,
  },
  digestion: {
    title: 'Salud Digestiva',
    description: 'Mejora tu digestión y bienestar intestinal.',
    icon: <SparklesIcon className="h-8 w-8" />,
  },
};

export function QuizResults({ result, onRestart, onSaveEmail }: QuizResultsProps) {
  const t = useTranslations('quiz.results');
  const { lang } = useStoreCountry();
  const [showEmailForm, setShowEmailForm] = useState(false);
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');

  const addToCart = useAddCartItem();
  const trackCartAdd = useTrackCartAdd();

  // Moneda del país de la sesión (todas las recomendaciones comparten país).
  const currency = result.recommendations[0]?.currencyCode || 'MXN';
  const fmt = (amount: number) => formatCurrency(amount, currency, lang);

  // Determine primary goal from summary or first category
  const primaryGoal = result.summary?.mainGoals?.[0] ||
    result.summary?.healthCategories?.[0] ||
    'energy';

  const goalInfo = goalLabels[primaryGoal] || goalLabels.energy;

  const handleShare = async () => {
    const shareUrl = window.location.origin + '/quiz';
    const shareText = t('shareText', { goal: goalInfo.title });

    if (navigator.share) {
      try {
        await navigator.share({
          title: t('shareTitle'),
          text: shareText,
          url: shareUrl,
        });
      } catch (error: any) {
        // User cancelled the share dialog - not an error
        if (error?.name !== 'AbortError') {
          console.log('Error sharing:', error);
        }
      }
    } else {
      // Fallback: copy to clipboard
      try {
        await navigator.clipboard.writeText(`${shareText}\n${shareUrl}`);
        toast.success(t('linkCopied'));
      } catch {
        toast.error(t('copyError'));
      }
    }
  };

  const handleAddToCart = async (product: ProductRecommendation) => {
    try {
      await addToCart.mutateAsync({
        productId: product.productId,
        quantity: 1,
      });

      // Track cart add for analytics
      if (result.sessionToken) {
        trackCartAdd.mutate({
          sessionToken: result.sessionToken,
          productId: product.productId,
        });
      }

      toast.success(t('addedToCart', { name: product.productName }));
    } catch (error) {
      toast.error(t('addError'));
    }
  };

  const handleAddAllToCart = async () => {
    try {
      for (const product of result.recommendations.slice(0, 3)) {
        await addToCart.mutateAsync({
          productId: product.productId,
          quantity: 1,
        });

        if (result.sessionToken) {
          trackCartAdd.mutate({
            sessionToken: result.sessionToken,
            productId: product.productId,
          });
        }
      }
      toast.success(t('bundleAdded'));
    } catch (error) {
      toast.error(t('bundleAddError'));
    }
  };

  const handleSaveEmail = () => {
    if (!email) {
      toast.error(t('emailRequired'));
      return;
    }
    onSaveEmail?.(email, name);
    toast.success(t('emailSaved'));
    setShowEmailForm(false);
  };

  // Calculate total price for top 3 recommendations
  const topRecommendations = result.recommendations.slice(0, 3);
  const totalOriginalPrice = topRecommendations.reduce(
    (sum, p) => sum + (p.originalPrice || p.price),
    0
  );
  const totalBundlePrice = topRecommendations.reduce((sum, p) => sum + p.price, 0);
  const discount = Math.round(((totalOriginalPrice - totalBundlePrice) / totalOriginalPrice) * 100);

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Success Header */}
      <div className="text-center mb-10">
        <div className="inline-flex items-center justify-center w-20 h-20 bg-[#C8DDF2]/40 ring-4 ring-[#C8DDF2]/30 rounded-full mb-6">
          <CheckCircleIcon className="h-10 w-10 text-[#3E667D]" />
        </div>
        <h1 className="text-3xl sm:text-4xl font-bold text-[#3E667D]">
          {t('completedTitle')}
        </h1>
        <p className="mt-3 text-lg text-gray-600">
          {t('completedSubtitle')}
        </p>
      </div>

      {/* Two-column layout: content + incentive sidebar */}
      <div className="lg:flex lg:gap-8">
        {/* Main content */}
        <div className="lg:flex-1 min-w-0">
          {/* Primary Goal Card */}
          <Card className="mb-8 overflow-hidden p-0 rounded-2xl border-gray-100 shadow-sm">
            <div className="bg-gradient-to-br from-[#3E667D] to-[#2f5165] text-white p-8">
              <div className="flex items-start gap-6">
                <div className="p-4 bg-white/15 ring-1 ring-white/20 rounded-2xl text-white">
                  {goalInfo.icon}
                </div>
                <div>
                  <Badge variant="outline" className="mb-2 border-white/30 bg-white/15 text-white">
                    {t('mainGoalBadge')}
                  </Badge>
                  <h2 className="text-2xl sm:text-3xl font-bold">{goalInfo.title}</h2>
                  {/* Resumen IA del perfil de salud si existe; si no, el texto por reglas. */}
                  <p className="mt-2 text-white/80">
                    {result.aiSummary || goalInfo.description}
                  </p>
                </div>
              </div>
            </div>

            {/* Health Categories — se filtran valores "ninguna/none" (no son
                áreas de enfoque) y los códigos sin etiqueta se prettifican */}
            {(() => {
              const junk = new Set(['none', 'ninguna', 'ninguno', 'no', 'n/a', 'na', 'nada']);
              const areas = (result.summary?.healthCategories || []).filter(
                (c) => c && !junk.has(c.trim().toLowerCase()),
              );
              if (areas.length === 0) return null;
              const pretty = (c: string) =>
                goalLabels[c]?.title ||
                c.replace(/[-_]/g, ' ').replace(/^\w/, (m) => m.toUpperCase());
              return (
                <div className="p-6 bg-gray-50">
                  <h3 className="text-sm font-semibold text-gray-600 mb-4">
                    {t('focusAreas')}
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {areas.map((category, index) => (
                      <span
                        key={index}
                        className="px-3 py-1 bg-white border border-gray-200 rounded-full text-sm text-gray-700"
                      >
                        {pretty(category)}
                      </span>
                    ))}
                  </div>
                </div>
              );
            })()}
          </Card>

          {/* Recommended Products Bundle */}
          <Card className="mb-8 rounded-2xl border-gray-100 shadow-sm">
            <div className="flex items-center justify-between mb-6">
              <div>
                <Badge variant="outline" className="mb-2 border-[#a7c1e2] bg-[#C8DDF2]/40 text-[#3E667D]">
                  {t('bundleBadge')}
                </Badge>
                <h2 className="text-2xl font-bold text-[#3E667D]">
                  {t('topProducts', { count: topRecommendations.length })}
                </h2>
              </div>
              {discount > 0 && (
                <div className="text-right">
                  <div className="text-sm text-gray-500 line-through">
                    {fmt(totalOriginalPrice)}
                  </div>
                  <div className="text-3xl font-bold text-[#3E667D]">
                    {fmt(totalBundlePrice)}
                  </div>
                  <Badge variant="outline" className="border-red-200 bg-red-100 text-red-700">
                    {t('save', { discount })}
                  </Badge>
                </div>
              )}
            </div>

            {/* Products List */}
            <div className="space-y-4 mb-8">
              {topRecommendations.map((product, index) => (
                <ProductRecommendationCard
                  key={product.productId}
                  product={product}
                  rank={index + 1}
                  onAddToCart={() => handleAddToCart(product)}
                  isLoading={addToCart.isPending}
                  formatPrice={fmt}
                  compatibilityLabel={t('compatibility', { score: Math.round(Number(product.score)) })}
                />
              ))}
            </div>

            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row gap-4">
              <Button
                size="lg"
                className="w-full"
                onClick={handleAddAllToCart}
                disabled={addToCart.isPending}
              >
                <ShoppingCartIcon className="h-5 w-5" />
                {t('addAll')}
              </Button>
              <Button
                variant="outline"
                size="lg"
                className="w-full"
                onClick={handleShare}
              >
                <ShareIcon className="h-5 w-5" />
                {t('share')}
              </Button>
            </div>
          </Card>

          {/* More Recommendations */}
          {result.recommendations.length > 3 && (
            <Card className="mb-8 rounded-2xl border-gray-100 shadow-sm">
              <h3 className="text-xl font-bold text-[#3E667D] mb-4">
                {t('alsoInterest')}
              </h3>
              <div className="grid sm:grid-cols-2 gap-4">
                {result.recommendations.slice(3, 9).map((product) => (
                  <div
                    key={product.productId}
                    className="rounded-2xl border border-gray-100 bg-white p-4 text-center transition-all hover:-translate-y-0.5 hover:shadow-md"
                  >
                    <div className="w-16 h-16 mx-auto bg-white rounded-xl shadow-sm flex items-center justify-center mb-3 overflow-hidden">
                      <QuizProductImage src={product.productImage} name={product.productName} width={64} height={64} size="sm" />
                    </div>
                    <h4 className="font-semibold text-[#3E667D] line-clamp-1">
                      {product.productName}
                    </h4>
                    <p className="text-sm text-gray-500 mt-1">
                      {fmt(product.price)}
                    </p>
                    <div className="flex items-center justify-center gap-1 mt-2">
                      <span className="text-xs text-[#3E667D] font-medium">
                        {t('compatibility', { score: Math.round(Number(product.score)) })}
                      </span>
                    </div>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="mt-2"
                      onClick={() => handleAddToCart(product)}
                    >
                      {t('add')}
                    </Button>
                  </div>
                ))}
              </div>
            </Card>
          )}

          {/* Save Email Form */}
          {onSaveEmail && !showEmailForm && (
            <Card className="mb-8 rounded-2xl border-gray-100 shadow-sm">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-[#C8DDF2]/40 rounded-full">
                  <EnvelopeIcon className="h-6 w-6 text-[#3E667D]" />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-[#3E667D]">
                    {t('saveResultsTitle')}
                  </h3>
                  <p className="text-sm text-gray-500">
                    {t('saveResultsSubtitle')}
                  </p>
                </div>
                <Button variant="outline" size="sm" onClick={() => setShowEmailForm(true)}>
                  {t('saveBtn')}
                </Button>
              </div>
            </Card>
          )}

          {showEmailForm && (
            <Card className="mb-8 rounded-2xl border-gray-100 shadow-sm">
              <h3 className="font-semibold text-[#3E667D] mb-4">
                {t('emailFormTitle')}
              </h3>
              <div className="space-y-4">
                <input
                  type="text"
                  placeholder={t('namePlaceholder')}
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#a7c1e2]/50"
                />
                <input
                  type="email"
                  placeholder={t('emailPlaceholder')}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#a7c1e2]/50"
                />
                <div className="flex gap-2">
                  <Button onClick={handleSaveEmail} className="w-full">
                    {t('sendResults')}
                  </Button>
                  <Button variant="ghost" onClick={() => setShowEmailForm(false)}>
                    {t('cancel')}
                  </Button>
                </div>
              </div>
            </Card>
          )}

          {/* Restart or Continue */}
          <div className="text-center space-y-4 pb-20 lg:pb-0">
            <button
              onClick={onRestart}
              className="inline-flex items-center gap-2 text-gray-500 hover:text-[#3E667D] transition-colors"
            >
              <ArrowPathIcon className="h-5 w-5" />
              {t('restart')}
            </button>

            <div className="pt-4">
              <Link
                href="/productos"
                className="text-[#3E667D] hover:underline font-medium"
              >
                {t('exploreProducts')}
              </Link>
            </div>
          </div>
        </div>

        {/* Desktop sticky sidebar — incentive bar */}
        <div className="hidden lg:block lg:w-72 xl:w-80 lg:flex-shrink-0">
          <div className="sticky top-28">
            <CartIncentiveBar variant="inline" />
          </div>
        </div>
      </div>

      {/* Mobile floating bar */}
      <CartIncentiveBar variant="floating" className="lg:hidden" />
    </div>
  );
}

function getProductInitials(name: string): string {
  const words = name.split(/\s+/).filter(w => w.length > 0);
  if (words.length >= 2) {
    return (words[0][0] + words[1][0]).toUpperCase();
  }
  return name.substring(0, 2).toUpperCase();
}

function ProductImageFallback({ name, size = 'md' }: { name: string; size?: 'sm' | 'md' }) {
  const textSize = size === 'sm' ? 'text-lg' : 'text-2xl';
  return (
    <div className="w-full h-full bg-gradient-to-br from-[#C8DDF2]/30 to-[#3E667D]/20 flex items-center justify-center">
      <span className={`${textSize} font-bold text-[#3E667D]/70`}>{getProductInitials(name)}</span>
    </div>
  );
}

function QuizProductImage({ src, name, width, height, size = 'md' }: {
  src?: string; name: string; width: number; height: number; size?: 'sm' | 'md';
}) {
  const [error, setError] = useState(false);
  if (src && !error) {
    return (
      <Image
        src={src}
        alt={name}
        width={width}
        height={height}
        className="object-cover"
        onError={() => setError(true)}
      />
    );
  }
  return <ProductImageFallback name={name} size={size} />;
}

// Product Recommendation Card Component
function ProductRecommendationCard({
  product,
  rank,
  onAddToCart,
  isLoading,
  formatPrice,
  compatibilityLabel,
}: {
  product: ProductRecommendation;
  rank: number;
  onAddToCart: () => void;
  isLoading: boolean;
  formatPrice: (amount: number) => string;
  compatibilityLabel: string;
}) {
  return (
    <div className="flex items-center gap-4 p-4 rounded-2xl border border-gray-100 bg-white transition-all hover:-translate-y-0.5 hover:shadow-md">
      {/* Rank Badge */}
      <div className="w-10 h-10 flex-shrink-0 bg-gradient-to-br from-[#3E667D] to-[#2f5165] text-white rounded-full flex items-center justify-center font-bold shadow-sm">
        #{rank}
      </div>

      {/* Product Image */}
      <div className="w-20 h-20 bg-gray-50 rounded-xl ring-1 ring-gray-100 flex-shrink-0 flex items-center justify-center overflow-hidden">
        <QuizProductImage src={product.productImage} name={product.productName} width={80} height={80} />
      </div>

      {/* Product Info */}
      <div className="flex-grow min-w-0">
        <h4 className="font-bold text-[#3E667D] line-clamp-1">{product.productName}</h4>
        <p className="text-sm text-gray-500 line-clamp-2">{product.reason}</p>

        {/* Score and Category */}
        <div className="flex flex-wrap items-center gap-2 mt-2">
          <span className="text-xs bg-[#C8DDF2]/40 text-[#3E667D] px-2 py-0.5 rounded-full font-medium">
            {compatibilityLabel}
          </span>
          {product.categoryName && (
            <span className="text-xs bg-gray-200 text-gray-600 px-2 py-0.5 rounded-full">
              {product.categoryName}
            </span>
          )}
        </div>
      </div>

      {/* Price and Actions */}
      <div className="text-right flex-shrink-0">
        {product.originalPrice && product.originalPrice > product.price && (
          <div className="text-sm text-gray-400 line-through">
            {formatPrice(product.originalPrice)}
          </div>
        )}
        <div className="font-bold text-[#3E667D] text-lg">
          {formatPrice(product.price)}
        </div>
        <Button
          size="sm"
          variant="outline"
          className="mt-2 border-[#a7c1e2] text-[#3E667D] hover:bg-[#C8DDF2]/20"
          onClick={onAddToCart}
          disabled={isLoading}
          aria-label="Agregar al carrito"
        >
          <ShoppingCartIcon className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
