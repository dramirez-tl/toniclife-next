import { Header, Footer } from '@/components/layout';
import {
  HeroSection,
  FeaturedProducts,
  CategoriesSection,
  RecognitionHallSection,
} from '@/components/landing';

export default function HomePage() {
  return (
    <>
      <Header />
      <main>
        <HeroSection />
        <FeaturedProducts />
        <CategoriesSection />
        <RecognitionHallSection />
      </main>
      <Footer />
    </>
  );
}
