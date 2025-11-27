'use client';

import { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import {
  MagnifyingGlassIcon,
  CalendarIcon,
  ClockIcon,
  UserIcon,
  TagIcon,
  ArrowRightIcon,
  HeartIcon,
  SparklesIcon,
  BeakerIcon,
  AcademicCapIcon,
} from '@heroicons/react/24/outline';
import {
  HeartIcon as HeartSolidIcon,
} from '@heroicons/react/24/solid';

interface BlogPost {
  id: string;
  slug: string;
  title: string;
  excerpt: string;
  category: string;
  author: {
    name: string;
    avatar: string;
    role: string;
  };
  image: string;
  date: string;
  readTime: number;
  tags: string[];
  featured: boolean;
  views: number;
  likes: number;
}

export default function BlogPage() {
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [showNewsletter, setShowNewsletter] = useState(true);

  const categories = [
    { value: 'all', label: 'Todos', icon: SparklesIcon, color: 'bg-purple-100 text-purple-800' },
    { value: 'nutrition', label: 'Nutrición', icon: HeartIcon, color: 'bg-red-100 text-red-800' },
    { value: 'exercise', label: 'Ejercicio', icon: SparklesIcon, color: 'bg-orange-100 text-orange-800' },
    { value: 'wellness', label: 'Bienestar Mental', icon: HeartIcon, color: 'bg-pink-100 text-pink-800' },
    { value: 'science', label: 'Ciencia', icon: BeakerIcon, color: 'bg-blue-100 text-blue-800' },
    { value: 'lifestyle', label: 'Estilo de Vida', icon: SparklesIcon, color: 'bg-green-100 text-green-800' },
    { value: 'education', label: 'Educación', icon: AcademicCapIcon, color: 'bg-indigo-100 text-indigo-800' }
  ];

  const blogPosts: BlogPost[] = [
    {
      id: '1',
      slug: '10-habitos-matutinos-para-comenzar-el-dia',
      title: '10 Hábitos Matutinos que Transformarán tu Día',
      excerpt: 'Descubre cómo una rutina matutina efectiva puede aumentar tu energía, productividad y bienestar general. Incluye tips prácticos y científicamente respaldados.',
      category: 'lifestyle',
      author: {
        name: 'Dra. María Sánchez',
        avatar: '/placeholder-author-1.jpg',
        role: 'Nutricionista Certificada'
      },
      image: '/placeholder-blog-1.jpg',
      date: '2024-01-28',
      readTime: 8,
      tags: ['Rutinas', 'Productividad', 'Energía'],
      featured: true,
      views: 12450,
      likes: 892
    },
    {
      id: '2',
      slug: 'guia-completa-suplementacion-deportiva',
      title: 'Guía Completa de Suplementación para Deportistas',
      excerpt: 'Todo lo que necesitas saber sobre suplementos deportivos: cuándo tomarlos, dosis recomendadas y cómo maximizar tus resultados en el gimnasio.',
      category: 'exercise',
      author: {
        name: 'Carlos Rodríguez',
        avatar: '/placeholder-author-2.jpg',
        role: 'Entrenador Personal'
      },
      image: '/placeholder-blog-2.jpg',
      date: '2024-01-25',
      readTime: 12,
      tags: ['Suplementos', 'Fitness', 'Rendimiento'],
      featured: true,
      views: 10320,
      likes: 756
    },
    {
      id: '3',
      slug: 'beneficios-probioticos-salud-digestiva',
      title: 'Los Probióticos y su Impacto en la Salud Digestiva',
      excerpt: 'Explora la ciencia detrás de los probióticos y cómo pueden mejorar tu digestión, fortalecer tu sistema inmune y promover el bienestar general.',
      category: 'science',
      author: {
        name: 'Dr. Roberto Martínez',
        avatar: '/placeholder-author-3.jpg',
        role: 'Gastroenterólogo'
      },
      image: '/placeholder-blog-3.jpg',
      date: '2024-01-22',
      readTime: 10,
      tags: ['Probióticos', 'Digestión', 'Salud Intestinal'],
      featured: true,
      views: 8940,
      likes: 623
    },
    {
      id: '4',
      slug: 'meditacion-para-principiantes',
      title: 'Meditación para Principiantes: Guía Paso a Paso',
      excerpt: 'Aprende técnicas de meditación sencillas para reducir el estrés, mejorar el enfoque y encontrar paz mental en tu día a día.',
      category: 'wellness',
      author: {
        name: 'Laura Gómez',
        avatar: '/placeholder-author-4.jpg',
        role: 'Coach de Bienestar'
      },
      image: '/placeholder-blog-4.jpg',
      date: '2024-01-20',
      readTime: 6,
      tags: ['Meditación', 'Estrés', 'Mindfulness'],
      featured: false,
      views: 7250,
      likes: 534
    },
    {
      id: '5',
      slug: 'alimentos-ricos-antioxidantes',
      title: '15 Alimentos Ricos en Antioxidantes que Debes Consumir',
      excerpt: 'Conoce los alimentos con mayor poder antioxidante y cómo incorporarlos en tu dieta diaria para combatir el envejecimiento y las enfermedades.',
      category: 'nutrition',
      author: {
        name: 'Dra. María Sánchez',
        avatar: '/placeholder-author-1.jpg',
        role: 'Nutricionista Certificada'
      },
      image: '/placeholder-blog-5.jpg',
      date: '2024-01-18',
      readTime: 9,
      tags: ['Antioxidantes', 'Nutrición', 'Alimentación'],
      featured: false,
      views: 9450,
      likes: 712
    },
    {
      id: '6',
      slug: 'importancia-vitamina-d',
      title: 'La Vitamina D: El Nutriente que Todos Necesitamos',
      excerpt: 'Descubre por qué la vitamina D es crucial para tu salud, cómo obtenerla naturalmente y cuándo considerar la suplementación.',
      category: 'science',
      author: {
        name: 'Dr. Roberto Martínez',
        avatar: '/placeholder-author-3.jpg',
        role: 'Gastroenterólogo'
      },
      image: '/placeholder-blog-6.jpg',
      date: '2024-01-15',
      readTime: 7,
      tags: ['Vitaminas', 'Inmunidad', 'Salud'],
      featured: false,
      views: 6890,
      likes: 478
    },
    {
      id: '7',
      slug: 'rutina-ejercicio-casa',
      title: 'Rutina de Ejercicio en Casa: 20 Minutos al Día',
      excerpt: 'No necesitas un gimnasio para estar en forma. Descubre esta rutina efectiva que puedes hacer desde la comodidad de tu hogar.',
      category: 'exercise',
      author: {
        name: 'Carlos Rodríguez',
        avatar: '/placeholder-author-2.jpg',
        role: 'Entrenador Personal'
      },
      image: '/placeholder-blog-7.jpg',
      date: '2024-01-12',
      readTime: 5,
      tags: ['Ejercicio', 'Fitness', 'Casa'],
      featured: false,
      views: 11200,
      likes: 845
    },
    {
      id: '8',
      slug: 'como-mejorar-calidad-sueno',
      title: 'Cómo Mejorar la Calidad de tu Sueño Naturalmente',
      excerpt: 'Tips científicamente probados para dormir mejor, desde la higiene del sueño hasta suplementos naturales que pueden ayudarte.',
      category: 'wellness',
      author: {
        name: 'Laura Gómez',
        avatar: '/placeholder-author-4.jpg',
        role: 'Coach de Bienestar'
      },
      image: '/placeholder-blog-8.jpg',
      date: '2024-01-10',
      readTime: 8,
      tags: ['Sueño', 'Descanso', 'Bienestar'],
      featured: false,
      views: 8120,
      likes: 591
    },
    {
      id: '9',
      slug: 'omega-3-beneficios-corazon',
      title: 'Omega-3: El Aliado de tu Corazón',
      excerpt: 'Conoce los increíbles beneficios del omega-3 para la salud cardiovascular y cómo asegurarte de obtener suficiente en tu dieta.',
      category: 'nutrition',
      author: {
        name: 'Dra. María Sánchez',
        avatar: '/placeholder-author-1.jpg',
        role: 'Nutricionista Certificada'
      },
      image: '/placeholder-blog-9.jpg',
      date: '2024-01-08',
      readTime: 10,
      tags: ['Omega-3', 'Corazón', 'Salud Cardiovascular'],
      featured: false,
      views: 7840,
      likes: 567
    }
  ];

  const filteredPosts = blogPosts.filter(post => {
    const matchesCategory = selectedCategory === 'all' || post.category === selectedCategory;
    const matchesSearch = post.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         post.excerpt.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         post.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesCategory && matchesSearch;
  });

  const featuredPosts = filteredPosts.filter(p => p.featured);
  const regularPosts = filteredPosts.filter(p => !p.featured);

  const getCategoryColor = (category: string) => {
    const cat = categories.find(c => c.value === category);
    return cat?.color || 'bg-gray-100 text-gray-800';
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-gradient-to-r from-[#003B7A] to-[#7AB82E] text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="text-center">
            <h1 className="text-4xl font-bold mb-4">Blog de Tonic Life</h1>
            <p className="text-xl text-blue-100 max-w-3xl mx-auto">
              Descubre artículos sobre nutrición, ejercicio, bienestar y ciencia para transformar tu vida
            </p>
          </div>

          {/* Search Bar */}
          <div className="mt-8 max-w-2xl mx-auto">
            <div className="relative">
              <MagnifyingGlassIcon className="absolute left-4 top-1/2 -translate-y-1/2 h-6 w-6 text-gray-400" />
              <input
                type="text"
                placeholder="Buscar artículos, temas, ingredientes..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-12 pr-4 py-4 rounded-lg text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-white"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Categories */}
        <div className="mb-8 bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-bold text-gray-900 mb-4">Categorías</h2>
          <div className="flex flex-wrap gap-2">
            {categories.map((category) => {
              const Icon = category.icon;
              return (
                <button
                  key={category.value}
                  onClick={() => setSelectedCategory(category.value)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg border transition-colors ${
                    selectedCategory === category.value
                      ? 'bg-[#003B7A] text-white border-[#003B7A]'
                      : 'bg-white text-gray-700 border-gray-300 hover:border-[#003B7A]'
                  }`}
                >
                  <Icon className="h-5 w-5" />
                  <span>{category.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Newsletter Signup */}
        {showNewsletter && (
          <div className="mb-8 bg-gradient-to-r from-[#003B7A] to-[#7AB82E] rounded-lg shadow-lg p-8 text-white relative">
            <button
              onClick={() => setShowNewsletter(false)}
              className="absolute top-4 right-4 text-white/80 hover:text-white"
            >
              ✕
            </button>
            <div className="max-w-3xl mx-auto text-center">
              <h2 className="text-2xl font-bold mb-2">Suscríbete a Nuestro Newsletter</h2>
              <p className="text-blue-100 mb-6">
                Recibe artículos exclusivos, tips de bienestar y ofertas especiales directamente en tu inbox
              </p>
              <div className="flex gap-3 max-w-md mx-auto">
                <input
                  type="email"
                  placeholder="Tu correo electrónico"
                  className="flex-1 px-4 py-3 rounded-lg text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-white"
                />
                <button className="px-6 py-3 bg-white text-[#003B7A] font-medium rounded-lg hover:bg-blue-50 transition-colors">
                  Suscribirse
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Featured Posts */}
        {featuredPosts.length > 0 && (
          <div className="mb-12">
            <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center gap-2">
              <SparklesIcon className="h-7 w-7 text-yellow-500" />
              Artículos Destacados
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {featuredPosts.map((post) => (
                <Link key={post.id} href={`/blog/${post.slug}`}>
                  <div className="bg-white rounded-lg shadow-lg overflow-hidden hover:shadow-xl transition-shadow cursor-pointer group">
                    <div className="relative h-48">
                      <Image
                        src={post.image}
                        alt={post.title}
                        fill
                        className="object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                      <div className="absolute top-4 left-4">
                        <span className={`px-3 py-1 rounded-full text-sm font-medium ${getCategoryColor(post.category)}`}>
                          {categories.find(c => c.value === post.category)?.label}
                        </span>
                      </div>
                    </div>
                    <div className="p-6">
                      <h3 className="text-xl font-bold text-gray-900 mb-2 group-hover:text-[#003B7A] transition-colors">
                        {post.title}
                      </h3>
                      <p className="text-gray-600 mb-4 line-clamp-2">{post.excerpt}</p>

                      {/* Author Info */}
                      <div className="flex items-center gap-3 mb-4">
                        <div className="w-10 h-10 rounded-full overflow-hidden">
                          <Image
                            src={post.author.avatar}
                            alt={post.author.name}
                            width={40}
                            height={40}
                            className="object-cover"
                          />
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-900">{post.author.name}</p>
                          <p className="text-xs text-gray-600">{post.author.role}</p>
                        </div>
                      </div>

                      {/* Meta Info */}
                      <div className="flex items-center justify-between text-sm text-gray-600 mb-4">
                        <div className="flex items-center gap-4">
                          <div className="flex items-center gap-1">
                            <CalendarIcon className="h-4 w-4" />
                            <span>{new Date(post.date).toLocaleDateString('es-ES', { month: 'short', day: 'numeric' })}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <ClockIcon className="h-4 w-4" />
                            <span>{post.readTime} min</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-1">
                          <HeartSolidIcon className="h-4 w-4 text-red-500" />
                          <span>{post.likes}</span>
                        </div>
                      </div>

                      {/* Tags */}
                      <div className="flex flex-wrap gap-2">
                        {post.tags.slice(0, 3).map((tag, idx) => (
                          <span key={idx} className="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded">
                            {tag}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* Regular Posts */}
        {regularPosts.length > 0 && (
          <div>
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Todos los Artículos</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {regularPosts.map((post) => (
                <Link key={post.id} href={`/blog/${post.slug}`}>
                  <div className="bg-white rounded-lg shadow hover:shadow-lg transition-shadow cursor-pointer group">
                    <div className="relative h-48">
                      <Image
                        src={post.image}
                        alt={post.title}
                        fill
                        className="object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                      <div className="absolute top-4 left-4">
                        <span className={`px-3 py-1 rounded-full text-sm font-medium ${getCategoryColor(post.category)}`}>
                          {categories.find(c => c.value === post.category)?.label}
                        </span>
                      </div>
                    </div>
                    <div className="p-6">
                      <h3 className="text-lg font-bold text-gray-900 mb-2 group-hover:text-[#003B7A] transition-colors line-clamp-2">
                        {post.title}
                      </h3>
                      <p className="text-gray-600 text-sm mb-4 line-clamp-2">{post.excerpt}</p>

                      {/* Author Info */}
                      <div className="flex items-center gap-2 mb-3">
                        <div className="w-8 h-8 rounded-full overflow-hidden">
                          <Image
                            src={post.author.avatar}
                            alt={post.author.name}
                            width={32}
                            height={32}
                            className="object-cover"
                          />
                        </div>
                        <div>
                          <p className="text-xs font-medium text-gray-900">{post.author.name}</p>
                        </div>
                      </div>

                      {/* Meta Info */}
                      <div className="flex items-center justify-between text-xs text-gray-600">
                        <div className="flex items-center gap-3">
                          <div className="flex items-center gap-1">
                            <CalendarIcon className="h-3 w-3" />
                            <span>{new Date(post.date).toLocaleDateString('es-ES', { month: 'short', day: 'numeric' })}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <ClockIcon className="h-3 w-3" />
                            <span>{post.readTime} min</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-1">
                          <HeartSolidIcon className="h-3 w-3 text-red-500" />
                          <span>{post.likes}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}

        {filteredPosts.length === 0 && (
          <div className="text-center py-12">
            <MagnifyingGlassIcon className="h-16 w-16 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600 text-lg">No se encontraron artículos con estos filtros</p>
            <button
              onClick={() => {
                setSelectedCategory('all');
                setSearchQuery('');
              }}
              className="mt-4 text-[#003B7A] hover:text-[#002855] font-medium"
            >
              Limpiar filtros
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
