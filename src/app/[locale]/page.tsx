import type { Metadata } from 'next';
import { Header, Footer } from '@/components/layout';
import {
  HeroBanner,
  ProductCategoriesBento,
  EvaluationBanner,
} from '@/components/landing';
import { routing } from '@/i18n/routing';
import { buildHomeMetadata } from '@/lib/storefront/metadata';

// Canonical + hreflang del home (solo países con tienda abierta; x-default = es-mx).
export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  if (!routing.locales.includes(locale)) return {};
  return buildHomeMetadata(locale);
}

export default function HomePage() {
  return (
    <>
      <Header />
      {/* Espaciador para el header fijo (barra superior + nav) */}
      <div className="h-28 lg:h-32" />
      <main>
        <HeroBanner />
        <ProductCategoriesBento />
        <EvaluationBanner />
      </main>
      <Footer />
    </>
  );
}
