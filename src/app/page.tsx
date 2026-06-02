import { Header, Footer } from '@/components/layout';
import {
  HeroBanner,
  ProductCategoriesBento,
  EvaluationBanner,
} from '@/components/landing';

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
