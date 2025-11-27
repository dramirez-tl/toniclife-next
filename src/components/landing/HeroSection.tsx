'use client';

import Link from 'next/link';
import { Button } from '@/components/ui';
import { SparklesIcon, ArrowRightIcon } from '@heroicons/react/24/outline';

export function HeroSection() {
  return (
    <section className="relative min-h-screen flex items-center overflow-hidden bg-gradient-to-br from-gray-50 via-white to-[#7AB82E]/5">
      {/* Background decorative elements */}
      <div className="absolute inset-0 overflow-hidden">
        {/* Large gradient circle */}
        <div className="absolute -top-40 -right-40 w-[600px] h-[600px] bg-[#7AB82E]/10 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-[500px] h-[500px] bg-[#003B7A]/5 rounded-full blur-3xl" />

        {/* Floating elements */}
        <div className="absolute top-1/4 left-10 w-20 h-20 bg-[#7AB82E]/20 rounded-full animate-pulse" />
        <div className="absolute bottom-1/4 right-20 w-16 h-16 bg-[#003B7A]/10 rounded-full animate-pulse delay-1000" />
        <div className="absolute top-1/3 right-1/4 w-12 h-12 bg-[#7AB82E]/15 rounded-full animate-bounce" />

        {/* Leaf patterns */}
        <svg
          className="absolute top-20 right-10 w-32 h-32 text-[#7AB82E]/10 animate-float"
          viewBox="0 0 100 100"
          fill="currentColor"
        >
          <path d="M50 0C50 50 0 50 0 100C50 100 50 50 100 50C100 50 50 50 50 0Z" />
        </svg>
        <svg
          className="absolute bottom-40 left-20 w-24 h-24 text-[#003B7A]/10 rotate-180 animate-float delay-500"
          viewBox="0 0 100 100"
          fill="currentColor"
        >
          <path d="M50 0C50 50 0 50 0 100C50 100 50 50 100 50C100 50 50 50 50 0Z" />
        </svg>
      </div>

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 pt-32 lg:pt-40">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
          {/* Content */}
          <div className="text-center lg:text-left">
            {/* Badge */}
            <div className="inline-flex items-center gap-2 bg-[#7AB82E]/10 text-[#7AB82E] px-4 py-2 rounded-full text-sm font-medium mb-6">
              <SparklesIcon className="h-4 w-4" />
              Bienestar natural desde 1996
            </div>

            {/* Main Heading */}
            <h1 className="text-4xl sm:text-5xl lg:text-6xl xl:text-7xl font-bold leading-tight">
              <span className="text-[#003B7A]">Wellness</span>
              <br />
              <span className="text-[#003B7A]">Made</span>{' '}
              <span className="text-[#7AB82E] font-serif italic">Simple</span>
            </h1>

            {/* Subtitle */}
            <p className="mt-6 text-lg sm:text-xl text-gray-600 max-w-xl mx-auto lg:mx-0">
              Descubre tu fórmula ideal de bienestar con nuestro{' '}
              <span className="font-semibold text-[#003B7A]">Health Quiz personalizado</span>.
              Productos naturales diseñados para transformar tu vida.
            </p>

            {/* CTA Buttons */}
            <div className="mt-8 flex flex-col sm:flex-row gap-4 justify-center lg:justify-start">
              <Button size="xl" rightIcon={<ArrowRightIcon className="h-5 w-5" />}>
                <Link href="/quiz">Hacer el Health Quiz</Link>
              </Button>
              <Button variant="outline" size="xl">
                <Link href="/productos">Ver Productos</Link>
              </Button>
            </div>

            {/* Trust badges */}
            <div className="mt-10 flex flex-wrap items-center justify-center lg:justify-start gap-6">
              <div className="flex items-center gap-2 text-gray-500">
                <svg className="h-5 w-5 text-[#7AB82E]" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                <span className="text-sm">100% Natural</span>
              </div>
              <div className="flex items-center gap-2 text-gray-500">
                <svg className="h-5 w-5 text-[#7AB82E]" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                <span className="text-sm">Envío Gratis +$99</span>
              </div>
              <div className="flex items-center gap-2 text-gray-500">
                <svg className="h-5 w-5 text-[#7AB82E]" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                <span className="text-sm">+1M Clientes Felices</span>
              </div>
            </div>
          </div>

          {/* Hero Image/Visual */}
          <div className="relative">
            {/* Main product showcase container */}
            <div className="relative bg-gradient-to-br from-[#003B7A]/5 to-[#7AB82E]/10 rounded-[3rem] p-8 lg:p-12">
              {/* Central product image placeholder */}
              <div className="aspect-square bg-white rounded-[2rem] shadow-2xl flex items-center justify-center overflow-hidden">
                <div className="text-center p-8">
                  {/* Placeholder for product collage */}
                  <div className="grid grid-cols-2 gap-4">
                    {/* Product placeholders */}
                    <div className="aspect-square bg-gradient-to-br from-[#7AB82E]/20 to-[#7AB82E]/5 rounded-2xl flex items-center justify-center">
                      <div className="text-[#7AB82E] text-4xl font-bold">TL</div>
                    </div>
                    <div className="aspect-square bg-gradient-to-br from-[#003B7A]/20 to-[#003B7A]/5 rounded-2xl flex items-center justify-center">
                      <div className="text-[#003B7A] text-4xl font-bold">EG</div>
                    </div>
                    <div className="aspect-square bg-gradient-to-br from-[#003B7A]/20 to-[#003B7A]/5 rounded-2xl flex items-center justify-center">
                      <div className="text-[#003B7A] text-4xl font-bold">OX</div>
                    </div>
                    <div className="aspect-square bg-gradient-to-br from-[#7AB82E]/20 to-[#7AB82E]/5 rounded-2xl flex items-center justify-center">
                      <div className="text-[#7AB82E] text-4xl font-bold">CL</div>
                    </div>
                  </div>
                  <p className="mt-4 text-gray-500 text-sm">
                    Productos Premium de Bienestar
                  </p>
                </div>
              </div>

              {/* Floating cards */}
              <div className="absolute -top-4 -right-4 bg-white rounded-2xl shadow-lg p-4 animate-float">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-[#7AB82E]/10 rounded-xl flex items-center justify-center">
                    <SparklesIcon className="h-6 w-6 text-[#7AB82E]" />
                  </div>
                  <div>
                    <p className="font-bold text-[#003B7A]">+50,000</p>
                    <p className="text-xs text-gray-500">Quiz completados</p>
                  </div>
                </div>
              </div>

              <div className="absolute -bottom-4 -left-4 bg-white rounded-2xl shadow-lg p-4 animate-float delay-300">
                <div className="flex items-center gap-3">
                  <div className="flex -space-x-2">
                    <div className="w-8 h-8 bg-[#003B7A] rounded-full border-2 border-white flex items-center justify-center text-white text-xs font-bold">M</div>
                    <div className="w-8 h-8 bg-[#7AB82E] rounded-full border-2 border-white flex items-center justify-center text-white text-xs font-bold">C</div>
                    <div className="w-8 h-8 bg-[#003B7A] rounded-full border-2 border-white flex items-center justify-center text-white text-xs font-bold">A</div>
                  </div>
                  <div>
                    <div className="flex items-center gap-1">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <svg key={star} className="h-4 w-4 text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
                          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                        </svg>
                      ))}
                    </div>
                    <p className="text-xs text-gray-500">4.9/5 (2,847 reseñas)</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom wave */}
      <div className="absolute bottom-0 left-0 right-0">
        <svg viewBox="0 0 1440 120" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path
            d="M0 120L60 105C120 90 240 60 360 45C480 30 600 30 720 37.5C840 45 960 60 1080 67.5C1200 75 1320 75 1380 75L1440 75V120H1380C1320 120 1200 120 1080 120C960 120 840 120 720 120C600 120 480 120 360 120C240 120 120 120 60 120H0Z"
            fill="white"
          />
        </svg>
      </div>

      {/* Custom animation styles */}
      <style jsx>{`
        @keyframes float {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-10px); }
        }
        .animate-float {
          animation: float 3s ease-in-out infinite;
        }
        .delay-300 {
          animation-delay: 300ms;
        }
        .delay-500 {
          animation-delay: 500ms;
        }
        .delay-1000 {
          animation-delay: 1000ms;
        }
      `}</style>
    </section>
  );
}
