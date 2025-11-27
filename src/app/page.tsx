import { Header, Footer } from '@/components/layout';
import {
  HeroSection,
  FeaturedProducts,
  QuizCTA,
  TestimonialsSection,
  CategoriesSection
} from '@/components/landing';

export default function HomePage() {
  return (
    <>
      <Header />
      <main>
        <HeroSection />
        <FeaturedProducts />
        <CategoriesSection />
        <QuizCTA />
        <TestimonialsSection />
      </main>
      <Footer />
    </>
  );
}
