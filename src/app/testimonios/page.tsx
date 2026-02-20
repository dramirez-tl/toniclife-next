'use client';

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Button } from '@/components/ui/Button';
import { Card, CardContent } from '@/components/ui/Card';
import {
  StarIcon,
  MagnifyingGlassIcon,
  FunnelIcon,
  CheckBadgeIcon,
  HandThumbUpIcon,
  PlayIcon,
  PhotoIcon,
} from '@heroicons/react/24/outline';
import { StarIcon as StarSolidIcon } from '@heroicons/react/24/solid';
import { toast } from 'sonner';

interface Testimonial {
  id: string;
  name: string;
  avatar: string;
  location: string;
  category: string;
  rating: number;
  title: string;
  content: string;
  beforeImage?: string;
  afterImage?: string;
  videoUrl?: string;
  product: string;
  verified: boolean;
  helpful: number;
  date: string;
  tags: string[];
}

const mockTestimonials: Testimonial[] = [
  {
    id: '1',
    name: 'María Rodríguez',
    avatar: 'https://ui-avatars.com/api/?name=Maria+Rodriguez&background=7AB82E&color=fff',
    location: 'Ciudad de México',
    category: 'Pérdida de Peso',
    rating: 5,
    title: '¡Bajé 15 kilos en 4 meses!',
    content: 'Empecé con el combo de Colágeno + Omega 3 y los resultados superaron mis expectativas. No solo bajé de peso, sino que mi piel se ve increíble, tengo más energía y duermo mejor. Mi familia también está usando los productos ahora.',
    beforeImage: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=400&h=500&fit=crop',
    afterImage: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=400&h=500&fit=crop',
    product: 'Colágeno Hidrolizado + Omega 3',
    verified: true,
    helpful: 234,
    date: '2025-01-15',
    tags: ['Pérdida de peso', 'Energía', 'Piel'],
  },
  {
    id: '2',
    name: 'Carlos Ramírez',
    avatar: 'https://ui-avatars.com/api/?name=Carlos+Ramirez&background=003B7A&color=fff',
    location: 'Guadalajara, JAL',
    category: 'Energía y Rendimiento',
    rating: 5,
    title: 'Mi energía se duplicó',
    content: 'Como ejecutivo, necesitaba algo que me ayudara con el cansancio crónico. Desde que tomo la Vitamina D3 + K2, mi productividad aumentó increíblemente. Ya no necesito 3 cafés al día y mi concentración es mucho mejor.',
    product: 'Vitamina D3 + K2',
    verified: true,
    helpful: 189,
    date: '2025-01-10',
    tags: ['Energía', 'Concentración', 'Productividad'],
  },
  {
    id: '3',
    name: 'Ana Martínez',
    avatar: 'https://ui-avatars.com/api/?name=Ana+Martinez&background=7AB82E&color=fff',
    location: 'Monterrey, NL',
    category: 'Salud Digestiva',
    rating: 5,
    title: 'Mis problemas digestivos desaparecieron',
    content: 'Sufría de problemas digestivos desde hace años. Los Probióticos Avanzados cambiaron mi vida. En solo 3 semanas noté una diferencia enorme. Ahora mi digestión es perfecta y me siento mucho más ligera.',
    beforeImage: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=400&h=500&fit=crop',
    afterImage: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400&h=500&fit=crop',
    product: 'Probióticos Avanzados',
    verified: true,
    helpful: 156,
    date: '2025-01-05',
    tags: ['Digestión', 'Bienestar', 'Salud intestinal'],
  },
  {
    id: '4',
    name: 'Laura Mendoza',
    avatar: 'https://ui-avatars.com/api/?name=Laura+Mendoza&background=003B7A&color=fff',
    location: 'Querétaro, QRO',
    category: 'Belleza y Piel',
    rating: 5,
    title: 'Mi piel nunca había lucido tan bien',
    content: 'A mis 45 años, mi piel lucía cansada y sin vida. Después de 6 meses tomando Colágeno Hidrolizado, las arrugas se redujeron notablemente, mi piel está más firme y radiante. Mis amigas me preguntan qué tratamiento me hice.',
    videoUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
    product: 'Colágeno Hidrolizado',
    verified: true,
    helpful: 312,
    date: '2024-12-28',
    tags: ['Piel', 'Anti-edad', 'Belleza'],
  },
  {
    id: '5',
    name: 'Roberto Sánchez',
    avatar: 'https://ui-avatars.com/api/?name=Roberto+Sanchez&background=7AB82E&color=fff',
    location: 'Puebla, PUE',
    category: 'Recuperación Deportiva',
    rating: 5,
    title: 'Mejor recuperación post-entrenamiento',
    content: 'Como atleta amateur, la recuperación es clave. La Proteína Vegetal me ayuda a recuperarme más rápido después de entrenamientos intensos. Además, el sabor es delicioso y no me causa problemas digestivos.',
    product: 'Proteína Vegetal',
    verified: true,
    helpful: 145,
    date: '2024-12-20',
    tags: ['Deporte', 'Recuperación', 'Proteína'],
  },
  {
    id: '6',
    name: 'Patricia González',
    avatar: 'https://ui-avatars.com/api/?name=Patricia+Gonzalez&background=003B7A&color=fff',
    location: 'León, GTO',
    category: 'Sueño y Descanso',
    rating: 5,
    title: 'Por fin duermo bien',
    content: 'Sufría de insomnio desde hace años. La Melatonina 5mg me cambió la vida. Ahora me duermo rápido, duermo profundo y me levanto descansada. Ya no dependo de medicamentos fuertes.',
    product: 'Melatonina 5mg',
    verified: true,
    helpful: 198,
    date: '2024-12-15',
    tags: ['Sueño', 'Descanso', 'Insomnio'],
  },
  {
    id: '7',
    name: 'Diana Flores',
    avatar: 'https://ui-avatars.com/api/?name=Diana+Flores&background=7AB82E&color=fff',
    location: 'Mérida, YUC',
    category: 'Sistema Inmune',
    rating: 5,
    title: 'Mi familia dejó de enfermarse',
    content: 'Desde que toda mi familia toma Vitamina C 1000mg, las gripas y resfriados prácticamente desaparecieron. Mis hijos faltan menos a la escuela y yo ya no me pierdo días de trabajo.',
    beforeImage: 'https://images.unsplash.com/photo-1487412720507-e7ab37603c6f?w=400&h=500&fit=crop',
    afterImage: 'https://images.unsplash.com/photo-1531123897727-8f129e1688ce?w=400&h=500&fit=crop',
    product: 'Vitamina C 1000mg',
    verified: true,
    helpful: 267,
    date: '2024-12-10',
    tags: ['Inmunidad', 'Familia', 'Prevención'],
  },
  {
    id: '8',
    name: 'Fernando García',
    avatar: 'https://ui-avatars.com/api/?name=Fernando+Garcia&background=003B7A&color=fff',
    location: 'Tijuana, BC',
    category: 'Reducción de Estrés',
    rating: 5,
    title: 'Menos estrés, más calma',
    content: 'El trabajo me tenía al límite del estrés. Ashwagandha Extract me ayudó a manejar mejor las situaciones estresantes. Me siento más tranquilo y equilibrado emocionalmente.',
    product: 'Ashwagandha Extract',
    verified: true,
    helpful: 134,
    date: '2024-12-05',
    tags: ['Estrés', 'Ansiedad', 'Calma'],
  },
];

const categories = [
  'Todas las Categorías',
  'Pérdida de Peso',
  'Energía y Rendimiento',
  'Salud Digestiva',
  'Belleza y Piel',
  'Recuperación Deportiva',
  'Sueño y Descanso',
  'Sistema Inmune',
  'Reducción de Estrés',
];

export default function TestimoniosPage() {
  const [testimonials, setTestimonials] = useState(mockTestimonials);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterCategory, setFilterCategory] = useState('Todas las Categorías');
  const [filterRating, setFilterRating] = useState('all');
  const [sortBy, setSortBy] = useState<'recent' | 'helpful' | 'rating'>('recent');

  const filteredTestimonials = testimonials
    .filter(t => {
      const matchesSearch = t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                           t.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                           t.content.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesCategory = filterCategory === 'Todas las Categorías' || t.category === filterCategory;
      const matchesRating = filterRating === 'all' || t.rating === parseInt(filterRating);
      return matchesSearch && matchesCategory && matchesRating;
    })
    .sort((a, b) => {
      if (sortBy === 'recent') return new Date(b.date).getTime() - new Date(a.date).getTime();
      if (sortBy === 'helpful') return b.helpful - a.helpful;
      if (sortBy === 'rating') return b.rating - a.rating;
      return 0;
    });

  const handleMarkHelpful = (testimonialId: string) => {
    setTestimonials(testimonials.map(t =>
      t.id === testimonialId ? { ...t, helpful: t.helpful + 1 } : t
    ));
    toast.success('¡Gracias por tu feedback!');
  };

  const renderStars = (rating: number) => {
    return (
      <div className="flex items-center gap-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <StarSolidIcon
            key={star}
            className={`h-5 w-5 ${star <= rating ? 'text-yellow-400' : 'text-gray-300'}`}
          />
        ))}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-gradient-to-r from-[#003B7A] to-[#003B7A]/90 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <div className="text-center">
            <div className="flex justify-center mb-4">
              <CheckBadgeIcon className="h-16 w-16" />
            </div>
            <h1 className="text-5xl font-bold mb-4">Testimonios Verificados</h1>
            <p className="text-xl text-white/90 mb-8 max-w-3xl mx-auto">
              Historias reales de personas que transformaron su vida con Tonic Life
            </p>
            <div className="flex flex-wrap justify-center gap-3">
              <div className="bg-white/20 backdrop-blur-sm px-6 py-3 rounded-full">
                <p className="text-sm font-medium">⭐ 4.9/5 Calificación Promedio</p>
              </div>
              <div className="bg-white/20 backdrop-blur-sm px-6 py-3 rounded-full">
                <p className="text-sm font-medium">✓ {mockTestimonials.length} Testimonios Verificados</p>
              </div>
              <div className="bg-white/20 backdrop-blur-sm px-6 py-3 rounded-full">
                <p className="text-sm font-medium">💚 95% Recomendarían</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Filters and Search */}
        <Card className="mb-8">
          <CardContent className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Search */}
              <div className="lg:col-span-2">
                <div className="relative">
                  <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Buscar testimonios..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#003B7A] focus:border-transparent"
                  />
                </div>
              </div>

              {/* Category Filter */}
              <div className="flex items-center gap-2">
                <FunnelIcon className="h-5 w-5 text-gray-400" />
                <select
                  value={filterCategory}
                  onChange={(e) => setFilterCategory(e.target.value)}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#003B7A] focus:border-transparent"
                >
                  {categories.map((cat) => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>

              {/* Sort */}
              <div>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as 'recent' | 'helpful' | 'rating')}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#003B7A] focus:border-transparent"
                >
                  <option value="recent">Más Recientes</option>
                  <option value="helpful">Más Útiles</option>
                  <option value="rating">Mejor Valorados</option>
                </select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Testimonials Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          {filteredTestimonials.map((testimonial) => (
            <Card key={testimonial.id} className="hover:shadow-lg transition-shadow">
              <CardContent className="p-6">
                {/* Header */}
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <Image
                      src={testimonial.avatar}
                      alt={testimonial.name}
                      width={56}
                      height={56}
                      className="rounded-full"
                    />
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-bold text-gray-900">{testimonial.name}</h3>
                        {testimonial.verified && (
                          <CheckBadgeIcon className="h-5 w-5 text-blue-600" title="Verificado" />
                        )}
                      </div>
                      <p className="text-sm text-gray-600">{testimonial.location}</p>
                      <p className="text-xs text-gray-500">{testimonial.category}</p>
                    </div>
                  </div>
                  {renderStars(testimonial.rating)}
                </div>

                {/* Title */}
                <h4 className="text-xl font-bold text-gray-900 mb-3">{testimonial.title}</h4>

                {/* Content */}
                <p className="text-gray-700 mb-4 leading-relaxed">{testimonial.content}</p>

                {/* Before/After Images */}
                {testimonial.beforeImage && testimonial.afterImage && (
                  <div className="grid grid-cols-2 gap-3 mb-4">
                    <div className="relative">
                      <Image
                        src={testimonial.beforeImage}
                        alt="Antes"
                        width={400}
                        height={500}
                        className="rounded-lg object-cover w-full h-48"
                      />
                      <div className="absolute top-2 left-2 bg-black/70 text-white px-2 py-1 rounded text-xs font-medium">
                        Antes
                      </div>
                    </div>
                    <div className="relative">
                      <Image
                        src={testimonial.afterImage}
                        alt="Después"
                        width={400}
                        height={500}
                        className="rounded-lg object-cover w-full h-48"
                      />
                      <div className="absolute top-2 left-2 bg-[#7AB82E] text-white px-2 py-1 rounded text-xs font-medium">
                        Después
                      </div>
                    </div>
                  </div>
                )}

                {/* Video */}
                {testimonial.videoUrl && (
                  <div className="relative mb-4 bg-gray-200 rounded-lg h-48 flex items-center justify-center">
                    <PlayIcon className="h-16 w-16 text-white bg-black/50 rounded-full p-3 cursor-pointer hover:bg-black/70 transition-colors" />
                    <div className="absolute top-2 right-2 bg-red-600 text-white px-2 py-1 rounded text-xs font-medium">
                      VIDEO
                    </div>
                  </div>
                )}

                {/* Product */}
                <div className="mb-4">
                  <span className="inline-flex items-center px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm font-medium">
                    {testimonial.product}
                  </span>
                </div>

                {/* Tags */}
                <div className="flex flex-wrap gap-2 mb-4">
                  {testimonial.tags.map((tag) => (
                    <span
                      key={tag}
                      className="text-xs text-gray-600 bg-gray-100 px-2 py-1 rounded"
                    >
                      {tag}
                    </span>
                  ))}
                </div>

                {/* Footer */}
                <div className="border-t pt-4 flex items-center justify-between">
                  <p className="text-sm text-gray-500">
                    {new Date(testimonial.date).toLocaleDateString('es-MX', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                    })}
                  </p>
                  <button
                    onClick={() => handleMarkHelpful(testimonial.id)}
                    className="flex items-center gap-2 text-sm text-gray-600 hover:text-[#7AB82E] transition-colors"
                  >
                    <HandThumbUpIcon className="h-5 w-5" />
                    <span>Útil ({testimonial.helpful})</span>
                  </button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {filteredTestimonials.length === 0 && (
          <Card>
            <CardContent className="p-12">
              <div className="text-center">
                <PhotoIcon className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                <h3 className="text-xl font-bold text-gray-900 mb-2">
                  No se encontraron testimonios
                </h3>
                <p className="text-gray-600">
                  Intenta ajustar los filtros de búsqueda
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* CTA Section */}
        <Card className="bg-gradient-to-br from-[#003B7A] to-[#003B7A]/90 text-white">
          <CardContent className="p-12">
            <div className="text-center max-w-3xl mx-auto">
              <h2 className="text-3xl font-bold mb-4">¿Tienes una historia que compartir?</h2>
              <p className="text-white/90 text-lg mb-8">
                Tu experiencia puede inspirar a miles de personas. Comparte tu testimonio y ayuda a otros a comenzar su transformación.
              </p>
              <div className="flex flex-wrap justify-center gap-4">
                <Button variant="secondary" size="lg">
                  Compartir Mi Testimonio
                </Button>
                <Link href="/productos">
                  <Button variant="primary" size="lg">
                    Ver Productos
                  </Button>
                </Link>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Load More */}
        {filteredTestimonials.length > 0 && (
          <div className="text-center mt-8">
            <Button variant="outline" onClick={() => toast.info('Cargando más testimonios...')}>
              Cargar Más Testimonios
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
