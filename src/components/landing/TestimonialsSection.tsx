'use client';

import { useState } from 'react';
import { Card, Badge } from '@/components/ui';
import { testimonials } from '@/lib/mock-data';
import {
  ChevronLeftIcon,
  ChevronRightIcon,
  StarIcon
} from '@heroicons/react/24/solid';

export function TestimonialsSection() {
  const [activeIndex, setActiveIndex] = useState(0);

  const nextTestimonial = () => {
    setActiveIndex((prev) => (prev + 1) % testimonials.length);
  };

  const prevTestimonial = () => {
    setActiveIndex((prev) => (prev - 1 + testimonials.length) % testimonials.length);
  };

  return (
    <section className="py-20 bg-gradient-to-b from-white to-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="text-center mb-16">
          <Badge variant="info" size="lg" className="mb-4">
            Historias de Transformación
          </Badge>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-[#003B7A]">
            Lo que dicen nuestros clientes
          </h2>
          <p className="mt-4 text-lg text-gray-600 max-w-2xl mx-auto">
            Miles de personas han transformado su bienestar con nuestros productos.
            Conoce sus historias.
          </p>
        </div>

        {/* Featured Testimonial */}
        <div className="max-w-4xl mx-auto mb-16">
          <Card className="relative overflow-hidden bg-white" padding="lg">
            {/* Quote Icon */}
            <div className="absolute top-6 right-6 text-[#7AB82E]/20">
              <svg className="h-24 w-24" viewBox="0 0 24 24" fill="currentColor">
                <path d="M14.017 21v-7.391c0-5.704 3.731-9.57 8.983-10.609l.995 2.151c-2.432.917-3.995 3.638-3.995 5.849h4v10h-9.983zm-14.017 0v-7.391c0-5.704 3.748-9.57 9-10.609l.996 2.151c-2.433.917-3.996 3.638-3.996 5.849h3.983v10h-9.983z" />
              </svg>
            </div>

            <div className="relative">
              {/* Stars */}
              <div className="flex items-center gap-1 mb-4">
                {[...Array(testimonials[activeIndex].rating)].map((_, i) => (
                  <StarIcon key={i} className="h-6 w-6 text-yellow-400" />
                ))}
              </div>

              {/* Quote */}
              <blockquote className="text-xl sm:text-2xl text-gray-700 font-medium leading-relaxed">
                "{testimonials[activeIndex].quote}"
              </blockquote>

              {/* Author */}
              <div className="mt-8 flex items-center justify-between">
                <div className="flex items-center gap-4">
                  {/* Avatar Placeholder */}
                  <div className="w-14 h-14 bg-gradient-to-br from-[#7AB82E] to-[#003B7A] rounded-full flex items-center justify-center text-white font-bold text-xl">
                    {testimonials[activeIndex].name.charAt(0)}
                  </div>
                  <div>
                    <p className="font-bold text-[#003B7A]">
                      {testimonials[activeIndex].name}
                    </p>
                    <p className="text-gray-500">
                      {testimonials[activeIndex].location}
                    </p>
                  </div>
                </div>

                {/* Products Used */}
                <div className="hidden sm:flex items-center gap-2">
                  <span className="text-sm text-gray-500">Productos usados:</span>
                  {testimonials[activeIndex].products.slice(0, 2).map((productId) => (
                    <Badge key={productId} variant="outline" size="sm">
                      {productId.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                    </Badge>
                  ))}
                </div>
              </div>
            </div>
          </Card>

          {/* Navigation */}
          <div className="flex items-center justify-center gap-4 mt-6">
            <button
              onClick={prevTestimonial}
              className="p-3 rounded-full bg-white shadow-md hover:bg-[#7AB82E] hover:text-white transition-colors"
            >
              <ChevronLeftIcon className="h-5 w-5" />
            </button>

            {/* Dots */}
            <div className="flex items-center gap-2">
              {testimonials.map((_, index) => (
                <button
                  key={index}
                  onClick={() => setActiveIndex(index)}
                  className={`w-2.5 h-2.5 rounded-full transition-all ${
                    index === activeIndex
                      ? 'bg-[#7AB82E] w-8'
                      : 'bg-gray-300 hover:bg-gray-400'
                  }`}
                />
              ))}
            </div>

            <button
              onClick={nextTestimonial}
              className="p-3 rounded-full bg-white shadow-md hover:bg-[#7AB82E] hover:text-white transition-colors"
            >
              <ChevronRightIcon className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Testimonials Grid */}
        <div className="grid md:grid-cols-3 gap-6">
          {testimonials.slice(0, 3).map((testimonial, index) => (
            <Card
              key={testimonial.id}
              hover
              className={`${index === activeIndex ? 'ring-2 ring-[#7AB82E]' : ''}`}
            >
              {/* Stars */}
              <div className="flex items-center gap-1 mb-3">
                {[...Array(testimonial.rating)].map((_, i) => (
                  <StarIcon key={i} className="h-4 w-4 text-yellow-400" />
                ))}
              </div>

              {/* Quote */}
              <p className="text-gray-600 line-clamp-3">
                "{testimonial.quote}"
              </p>

              {/* Author */}
              <div className="mt-4 pt-4 border-t border-gray-100 flex items-center gap-3">
                <div className="w-10 h-10 bg-gradient-to-br from-[#7AB82E] to-[#003B7A] rounded-full flex items-center justify-center text-white font-bold">
                  {testimonial.name.charAt(0)}
                </div>
                <div>
                  <p className="font-semibold text-[#003B7A] text-sm">
                    {testimonial.name}
                  </p>
                  <p className="text-xs text-gray-500">{testimonial.location}</p>
                </div>
              </div>
            </Card>
          ))}
        </div>

        {/* Stats */}
        <div className="mt-16 grid grid-cols-2 md:grid-cols-4 gap-8">
          {[
            { value: '+1M', label: 'Clientes Felices' },
            { value: '4.9/5', label: 'Calificación Promedio' },
            { value: '25+', label: 'Años de Experiencia' },
            { value: '50+', label: 'Productos Naturales' }
          ].map((stat, index) => (
            <div key={index} className="text-center">
              <p className="text-3xl sm:text-4xl font-bold text-[#7AB82E]">
                {stat.value}
              </p>
              <p className="text-gray-600 mt-1">{stat.label}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
