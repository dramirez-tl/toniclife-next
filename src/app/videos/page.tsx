'use client';

import { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import {
  MagnifyingGlassIcon,
  PlayCircleIcon,
  ClockIcon,
  EyeIcon,
  HeartIcon,
  SparklesIcon,
  BeakerIcon,
  AcademicCapIcon,
  LightBulbIcon,
  UserGroupIcon,
} from '@heroicons/react/24/outline';
import {
  PlayCircleIcon as PlayCircleSolidIcon,
} from '@heroicons/react/24/solid';

interface Video {
  id: string;
  title: string;
  description: string;
  thumbnail: string;
  duration: string;
  views: number;
  likes: number;
  category: 'mini-labs' | 'tutorials' | 'wellness-tips' | 'testimonials' | 'science';
  tags: string[];
  date: string;
  featured: boolean;
  videoUrl: string;
}

export default function VideosPage() {
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const categories = [
    { value: 'all', label: 'Todos', icon: SparklesIcon, color: 'bg-purple-100 text-purple-800' },
    { value: 'mini-labs', label: 'TL Mini Labs', icon: BeakerIcon, color: 'bg-blue-100 text-blue-800' },
    { value: 'tutorials', label: 'Tutoriales', icon: AcademicCapIcon, color: 'bg-green-100 text-green-800' },
    { value: 'wellness-tips', label: 'Tips de Bienestar', icon: LightBulbIcon, color: 'bg-yellow-100 text-yellow-800' },
    { value: 'testimonials', label: 'Testimonios', icon: UserGroupIcon, color: 'bg-pink-100 text-pink-800' },
    { value: 'science', label: 'Ciencia', icon: BeakerIcon, color: 'bg-indigo-100 text-indigo-800' }
  ];

  const videos: Video[] = [
    {
      id: '1',
      title: 'Cómo Funciona la Proteína en tu Cuerpo',
      description: 'Descubre el proceso de absorción y utilización de la proteína a nivel celular. Perfecto para entender por qué es tan importante.',
      thumbnail: '/placeholder-video-1.jpg',
      duration: '0:28',
      views: 45230,
      likes: 3420,
      category: 'mini-labs',
      tags: ['Proteína', 'Ciencia', 'Nutrición'],
      date: '2024-01-25',
      featured: true,
      videoUrl: 'https://example.com/video1'
    },
    {
      id: '2',
      title: 'Cómo Tomar tus Suplementos Correctamente',
      description: 'Guía paso a paso sobre el mejor momento y forma de tomar tus suplementos para maximizar su absorción.',
      thumbnail: '/placeholder-video-2.jpg',
      duration: '5:42',
      views: 38950,
      likes: 2890,
      category: 'tutorials',
      tags: ['Suplementos', 'Tutorial', 'Guía'],
      date: '2024-01-22',
      featured: true,
      videoUrl: 'https://example.com/video2'
    },
    {
      id: '3',
      title: '5 Hábitos Matutinos para Más Energía',
      description: 'Tips prácticos que puedes implementar mañana mismo para transformar tus mañanas y aumentar tu energía.',
      thumbnail: '/placeholder-video-3.jpg',
      duration: '3:15',
      views: 52100,
      likes: 4210,
      category: 'wellness-tips',
      tags: ['Energía', 'Hábitos', 'Mañana'],
      date: '2024-01-20',
      featured: true,
      videoUrl: 'https://example.com/video3'
    },
    {
      id: '4',
      title: 'Transformación de 90 Días - María González',
      description: 'María comparte su increíble transformación física y mental después de 90 días con productos Tonic Life.',
      thumbnail: '/placeholder-video-4.jpg',
      duration: '4:28',
      views: 67800,
      likes: 5920,
      category: 'testimonials',
      tags: ['Transformación', 'Testimonio', 'Inspiración'],
      date: '2024-01-18',
      featured: false,
      videoUrl: 'https://example.com/video4'
    },
    {
      id: '5',
      title: 'El Poder de los Probióticos',
      description: 'Aprende cómo los probióticos benefician tu salud digestiva, inmunidad y bienestar general.',
      thumbnail: '/placeholder-video-5.jpg',
      duration: '0:25',
      views: 29340,
      likes: 2140,
      category: 'mini-labs',
      tags: ['Probióticos', 'Digestión', 'Ciencia'],
      date: '2024-01-15',
      featured: false,
      videoUrl: 'https://example.com/video5'
    },
    {
      id: '6',
      title: 'La Ciencia Detrás del Omega-3',
      description: 'Explicación científica detallada sobre los beneficios cardiovasculares y cerebrales del Omega-3.',
      thumbnail: '/placeholder-video-6.jpg',
      duration: '6:12',
      views: 34670,
      likes: 2780,
      category: 'science',
      tags: ['Omega-3', 'Corazón', 'Ciencia'],
      date: '2024-01-12',
      featured: false,
      videoUrl: 'https://example.com/video6'
    },
    {
      id: '7',
      title: 'Cómo Preparar un Smoothie Bowl Perfecto',
      description: 'Tutorial completo para crear smoothie bowls deliciosos y nutritivos en casa.',
      thumbnail: '/placeholder-video-7.jpg',
      duration: '4:55',
      views: 41230,
      likes: 3560,
      category: 'tutorials',
      tags: ['Recetas', 'Smoothie', 'Desayuno'],
      date: '2024-01-10',
      featured: false,
      videoUrl: 'https://example.com/video7'
    },
    {
      id: '8',
      title: 'Meditación Guiada de 5 Minutos',
      description: 'Sesión rápida de meditación perfecta para comenzar tu día o tomar un descanso en el trabajo.',
      thumbnail: '/placeholder-video-8.jpg',
      duration: '5:00',
      views: 58900,
      likes: 4890,
      category: 'wellness-tips',
      tags: ['Meditación', 'Mindfulness', 'Relajación'],
      date: '2024-01-08',
      featured: false,
      videoUrl: 'https://example.com/video8'
    },
    {
      id: '9',
      title: 'Antioxidantes: Tu Defensa Natural',
      description: 'Descubre cómo los antioxidantes protegen tus células del daño y el envejecimiento.',
      thumbnail: '/placeholder-video-9.jpg',
      duration: '0:30',
      views: 25670,
      likes: 1890,
      category: 'mini-labs',
      tags: ['Antioxidantes', 'Células', 'Juventud'],
      date: '2024-01-05',
      featured: false,
      videoUrl: 'https://example.com/video9'
    },
    {
      id: '10',
      title: 'De Sobrepeso a Fitness - Carlos Ramírez',
      description: 'Carlos perdió 30kg y ganó músculo. Su historia completa de transformación y los productos que usó.',
      thumbnail: '/placeholder-video-10.jpg',
      duration: '7:15',
      views: 89450,
      likes: 7620,
      category: 'testimonials',
      tags: ['Pérdida de Peso', 'Fitness', 'Motivación'],
      date: '2024-01-02',
      featured: true,
      videoUrl: 'https://example.com/video10'
    },
    {
      id: '11',
      title: 'Rutina de Ejercicio Post-Suplementación',
      description: 'La mejor rutina de ejercicios para hacer después de tomar tu pre-workout.',
      thumbnail: '/placeholder-video-11.jpg',
      duration: '8:30',
      views: 62340,
      likes: 5120,
      category: 'tutorials',
      tags: ['Ejercicio', 'Pre-Workout', 'Rutina'],
      date: '2023-12-28',
      featured: false,
      videoUrl: 'https://example.com/video11'
    },
    {
      id: '12',
      title: 'Respiración Consciente para Reducir Estrés',
      description: 'Técnicas de respiración que puedes usar en cualquier momento para calmar tu mente.',
      thumbnail: '/placeholder-video-12.jpg',
      duration: '3:45',
      views: 47890,
      likes: 3980,
      category: 'wellness-tips',
      tags: ['Respiración', 'Estrés', 'Ansiedad'],
      date: '2023-12-25',
      featured: false,
      videoUrl: 'https://example.com/video12'
    }
  ];

  const filteredVideos = videos.filter(video => {
    const matchesCategory = selectedCategory === 'all' || video.category === selectedCategory;
    const matchesSearch = video.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         video.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         video.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesCategory && matchesSearch;
  });

  const featuredVideos = filteredVideos.filter(v => v.featured);
  const regularVideos = filteredVideos.filter(v => !v.featured);

  const formatViews = (views: number) => {
    if (views >= 1000000) {
      return `${(views / 1000000).toFixed(1)}M`;
    } else if (views >= 1000) {
      return `${(views / 1000).toFixed(1)}K`;
    }
    return views.toString();
  };

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
            <div className="flex justify-center mb-4">
              <PlayCircleSolidIcon className="h-16 w-16" />
            </div>
            <h1 className="text-4xl font-bold mb-4">Videos Educativos</h1>
            <p className="text-xl text-blue-100 max-w-3xl mx-auto">
              Aprende sobre nutrición, bienestar y ciencia con nuestro contenido audiovisual
            </p>
          </div>

          {/* Search Bar */}
          <div className="mt-8 max-w-2xl mx-auto">
            <div className="relative">
              <MagnifyingGlassIcon className="absolute left-4 top-1/2 -translate-y-1/2 h-6 w-6 text-gray-400" />
              <input
                type="text"
                placeholder="Buscar videos, temas, categorías..."
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

        {/* Featured Videos */}
        {featuredVideos.length > 0 && (
          <div className="mb-12">
            <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center gap-2">
              <SparklesIcon className="h-7 w-7 text-yellow-500" />
              Videos Destacados
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {featuredVideos.map((video) => (
                <div key={video.id} className="bg-white rounded-lg shadow-lg overflow-hidden hover:shadow-xl transition-shadow group cursor-pointer">
                  <div className="relative aspect-video bg-gray-900">
                    <Image
                      src={video.thumbnail}
                      alt={video.title}
                      fill
                      className="object-cover group-hover:opacity-80 transition-opacity"
                    />
                    <div className="absolute inset-0 flex items-center justify-center">
                      <PlayCircleSolidIcon className="h-20 w-20 text-white opacity-90 group-hover:scale-110 transition-transform" />
                    </div>
                    <div className="absolute bottom-4 right-4">
                      <span className="px-2 py-1 bg-black/80 text-white text-sm rounded">
                        {video.duration}
                      </span>
                    </div>
                    <div className="absolute top-4 left-4">
                      <span className={`px-3 py-1 rounded-full text-sm font-medium ${getCategoryColor(video.category)}`}>
                        {categories.find(c => c.value === video.category)?.label}
                      </span>
                    </div>
                  </div>
                  <div className="p-6">
                    <h3 className="text-xl font-bold text-gray-900 mb-2 group-hover:text-[#003B7A] transition-colors">
                      {video.title}
                    </h3>
                    <p className="text-gray-600 mb-4 line-clamp-2">{video.description}</p>
                    <div className="flex items-center justify-between text-sm text-gray-600">
                      <div className="flex items-center gap-4">
                        <div className="flex items-center gap-1">
                          <EyeIcon className="h-4 w-4" />
                          <span>{formatViews(video.views)}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <HeartIcon className="h-4 w-4" />
                          <span>{formatViews(video.likes)}</span>
                        </div>
                      </div>
                      <span>{new Date(video.date).toLocaleDateString('es-ES', { month: 'short', day: 'numeric' })}</span>
                    </div>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {video.tags.slice(0, 3).map((tag, idx) => (
                        <span key={idx} className="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded">
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Regular Videos */}
        {regularVideos.length > 0 && (
          <div>
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Todos los Videos</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {regularVideos.map((video) => (
                <div key={video.id} className="bg-white rounded-lg shadow hover:shadow-lg transition-shadow group cursor-pointer">
                  <div className="relative aspect-video bg-gray-900">
                    <Image
                      src={video.thumbnail}
                      alt={video.title}
                      fill
                      className="object-cover group-hover:opacity-80 transition-opacity rounded-t-lg"
                    />
                    <div className="absolute inset-0 flex items-center justify-center">
                      <PlayCircleSolidIcon className="h-16 w-16 text-white opacity-90 group-hover:scale-110 transition-transform" />
                    </div>
                    <div className="absolute bottom-2 right-2">
                      <span className="px-2 py-1 bg-black/80 text-white text-xs rounded">
                        {video.duration}
                      </span>
                    </div>
                    <div className="absolute top-2 left-2">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${getCategoryColor(video.category)}`}>
                        {categories.find(c => c.value === video.category)?.label}
                      </span>
                    </div>
                  </div>
                  <div className="p-4">
                    <h3 className="font-bold text-gray-900 mb-2 group-hover:text-[#003B7A] transition-colors line-clamp-2">
                      {video.title}
                    </h3>
                    <p className="text-sm text-gray-600 mb-3 line-clamp-2">{video.description}</p>
                    <div className="flex items-center justify-between text-xs text-gray-600 mb-2">
                      <div className="flex items-center gap-3">
                        <div className="flex items-center gap-1">
                          <EyeIcon className="h-3 w-3" />
                          <span>{formatViews(video.views)}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <HeartIcon className="h-3 w-3" />
                          <span>{formatViews(video.likes)}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {filteredVideos.length === 0 && (
          <div className="text-center py-12">
            <PlayCircleIcon className="h-16 w-16 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600 text-lg">No se encontraron videos con estos filtros</p>
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
