'use client';

import { useState } from 'react';
import Image from 'next/image';
import {
  MagnifyingGlassIcon,
  ArrowDownTrayIcon,
  DocumentTextIcon,
  ChartBarIcon,
  CalendarIcon,
  SparklesIcon,
  HeartIcon,
  BeakerIcon,
  AcademicCapIcon,
  ClipboardDocumentListIcon,
  PhotoIcon,
} from '@heroicons/react/24/outline';
import { toast } from 'sonner';

interface Resource {
  id: string;
  title: string;
  description: string;
  type: 'pdf' | 'planner' | 'tracker' | 'infographic' | 'wallpaper';
  category: 'wellness' | 'nutrition' | 'fitness' | 'productivity' | 'motivation';
  thumbnail: string;
  fileSize: string;
  downloads: number;
  date: string;
  tags: string[];
  featured: boolean;
  downloadUrl: string;
}

export default function RecursosPage() {
  const [selectedType, setSelectedType] = useState<string>('all');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const types = [
    { value: 'all', label: 'Todos', icon: SparklesIcon },
    { value: 'pdf', label: 'PDFs', icon: DocumentTextIcon },
    { value: 'planner', label: 'Planificadores', icon: CalendarIcon },
    { value: 'tracker', label: 'Trackers', icon: ChartBarIcon },
    { value: 'infographic', label: 'Infografías', icon: ClipboardDocumentListIcon },
    { value: 'wallpaper', label: 'Wallpapers', icon: PhotoIcon }
  ];

  const categories = [
    { value: 'all', label: 'Todas', color: 'bg-purple-100 text-purple-800' },
    { value: 'wellness', label: 'Bienestar', color: 'bg-pink-100 text-pink-800' },
    { value: 'nutrition', label: 'Nutrición', color: 'bg-green-100 text-green-800' },
    { value: 'fitness', label: 'Fitness', color: 'bg-blue-100 text-blue-800' },
    { value: 'productivity', label: 'Productividad', color: 'bg-yellow-100 text-yellow-800' },
    { value: 'motivation', label: 'Motivación', color: 'bg-red-100 text-red-800' }
  ];

  const resources: Resource[] = [
    {
      id: '1',
      title: 'Guía Completa de Suplementación',
      description: 'PDF de 25 páginas con todo lo que necesitas saber sobre suplementos: cuándo tomarlos, dosis, combinaciones y más.',
      type: 'pdf',
      category: 'nutrition',
      thumbnail: '/placeholder-resource-1.jpg',
      fileSize: '4.2 MB',
      downloads: 8520,
      date: '2024-01-25',
      tags: ['Suplementos', 'Guía', 'Nutrición'],
      featured: true,
      downloadUrl: '/downloads/guia-suplementacion.pdf'
    },
    {
      id: '2',
      title: 'Planificador de Comidas Semanal',
      description: 'Organiza tus comidas de la semana con este planificador descargable e imprimible. Incluye lista de compras.',
      type: 'planner',
      category: 'nutrition',
      thumbnail: '/placeholder-resource-2.jpg',
      fileSize: '1.8 MB',
      downloads: 12340,
      date: '2024-01-22',
      tags: ['Comidas', 'Planificación', 'Organización'],
      featured: true,
      downloadUrl: '/downloads/planificador-comidas.pdf'
    },
    {
      id: '3',
      title: 'Tracker de Hábitos Diarios',
      description: 'Seguimiento de tus hábitos saludables durante 30 días. Perfecto para construir nuevas rutinas.',
      type: 'tracker',
      category: 'wellness',
      thumbnail: '/placeholder-resource-3.jpg',
      fileSize: '850 KB',
      downloads: 15670,
      date: '2024-01-20',
      tags: ['Hábitos', 'Rutinas', 'Seguimiento'],
      featured: true,
      downloadUrl: '/downloads/tracker-habitos.pdf'
    },
    {
      id: '4',
      title: 'Infografía: Macronutrientes Explicados',
      description: 'Guía visual colorida que explica proteínas, carbohidratos y grasas de forma simple y entendible.',
      type: 'infographic',
      category: 'nutrition',
      thumbnail: '/placeholder-resource-4.jpg',
      fileSize: '2.1 MB',
      downloads: 9430,
      date: '2024-01-18',
      tags: ['Macros', 'Nutrición', 'Visual'],
      featured: false,
      downloadUrl: '/downloads/infografia-macros.pdf'
    },
    {
      id: '5',
      title: 'Wallpaper: Tu Meta, Tu Motivación',
      description: 'Fondo de pantalla motivacional en alta resolución para tu computadora o celular.',
      type: 'wallpaper',
      category: 'motivation',
      thumbnail: '/placeholder-resource-5.jpg',
      fileSize: '3.5 MB',
      downloads: 6780,
      date: '2024-01-15',
      tags: ['Motivación', 'Wallpaper', 'Inspiración'],
      featured: false,
      downloadUrl: '/downloads/wallpaper-motivacion.jpg'
    },
    {
      id: '6',
      title: 'Tracker de Agua e Hidratación',
      description: 'Registra tu consumo de agua diario y asegúrate de mantenerte hidratado. Meta de 8 vasos al día.',
      type: 'tracker',
      category: 'wellness',
      thumbnail: '/placeholder-resource-6.jpg',
      fileSize: '650 KB',
      downloads: 11230,
      date: '2024-01-12',
      tags: ['Hidratación', 'Agua', 'Salud'],
      featured: false,
      downloadUrl: '/downloads/tracker-agua.pdf'
    },
    {
      id: '7',
      title: 'Planificador de Objetivos 90 Días',
      description: 'Establece y alcanza tus metas de salud y fitness en 90 días con este planificador detallado.',
      type: 'planner',
      category: 'fitness',
      thumbnail: '/placeholder-resource-7.jpg',
      fileSize: '2.3 MB',
      downloads: 8940,
      date: '2024-01-10',
      tags: ['Objetivos', 'Metas', '90 Días'],
      featured: true,
      downloadUrl: '/downloads/planificador-90dias.pdf'
    },
    {
      id: '8',
      title: 'Guía de Vitaminas y Minerales',
      description: 'Referencia rápida de todas las vitaminas y minerales esenciales, sus funciones y fuentes alimenticias.',
      type: 'pdf',
      category: 'nutrition',
      thumbnail: '/placeholder-resource-8.jpg',
      fileSize: '3.1 MB',
      downloads: 7650,
      date: '2024-01-08',
      tags: ['Vitaminas', 'Minerales', 'Nutrición'],
      featured: false,
      downloadUrl: '/downloads/guia-vitaminas.pdf'
    },
    {
      id: '9',
      title: 'Tracker de Entrenamiento',
      description: 'Registra tus sesiones de ejercicio, peso levantado, repeticiones y progreso semanal.',
      type: 'tracker',
      category: 'fitness',
      thumbnail: '/placeholder-resource-9.jpg',
      fileSize: '1.2 MB',
      downloads: 13450,
      date: '2024-01-05',
      tags: ['Ejercicio', 'Gym', 'Progreso'],
      featured: false,
      downloadUrl: '/downloads/tracker-entrenamiento.pdf'
    },
    {
      id: '10',
      title: 'Infografía: Beneficios de los Probióticos',
      description: 'Visualización completa de cómo los probióticos mejoran tu salud digestiva e inmunidad.',
      type: 'infographic',
      category: 'wellness',
      thumbnail: '/placeholder-resource-10.jpg',
      fileSize: '1.9 MB',
      downloads: 5890,
      date: '2024-01-02',
      tags: ['Probióticos', 'Digestión', 'Inmunidad'],
      featured: false,
      downloadUrl: '/downloads/infografia-probioticos.pdf'
    },
    {
      id: '11',
      title: 'Planificador Semanal Productivo',
      description: 'Organiza tu semana con enfoque en productividad, bienestar y balance vida-trabajo.',
      type: 'planner',
      category: 'productivity',
      thumbnail: '/placeholder-resource-11.jpg',
      fileSize: '1.5 MB',
      downloads: 10230,
      date: '2023-12-28',
      tags: ['Productividad', 'Semana', 'Organización'],
      featured: false,
      downloadUrl: '/downloads/planificador-semanal.pdf'
    },
    {
      id: '12',
      title: 'Wallpaper: Fuerza y Determinación',
      description: 'Imagen inspiradora de alta calidad para recordarte tu fuerza interior cada día.',
      type: 'wallpaper',
      category: 'motivation',
      thumbnail: '/placeholder-resource-12.jpg',
      fileSize: '4.0 MB',
      downloads: 7120,
      date: '2023-12-25',
      tags: ['Motivación', 'Fuerza', 'Inspiración'],
      featured: false,
      downloadUrl: '/downloads/wallpaper-fuerza.jpg'
    }
  ];

  const filteredResources = resources.filter(resource => {
    const matchesType = selectedType === 'all' || resource.type === selectedType;
    const matchesCategory = selectedCategory === 'all' || resource.category === selectedCategory;
    const matchesSearch = resource.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         resource.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         resource.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesType && matchesCategory && matchesSearch;
  });

  const featuredResources = filteredResources.filter(r => r.featured);
  const regularResources = filteredResources.filter(r => !r.featured);

  const handleDownload = (resource: Resource) => {
    toast.success(`Descargando ${resource.title}...`);
    // In a real app, trigger actual download here
  };

  const getCategoryColor = (category: string) => {
    const cat = categories.find(c => c.value === category);
    return cat?.color || 'bg-gray-100 text-gray-800';
  };

  const getTypeIcon = (type: string) => {
    const typeObj = types.find(t => t.value === type);
    return typeObj?.icon || DocumentTextIcon;
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-gradient-to-r from-[#003B7A] to-[#7AB82E] text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="text-center">
            <div className="flex justify-center mb-4">
              <ArrowDownTrayIcon className="h-16 w-16" />
            </div>
            <h1 className="text-4xl font-bold mb-4">Recursos Descargables</h1>
            <p className="text-xl text-blue-100 max-w-3xl mx-auto">
              PDFs, planificadores, trackers e infografías para complementar tu camino al bienestar
            </p>
          </div>

          {/* Search Bar */}
          <div className="mt-8 max-w-2xl mx-auto">
            <div className="relative">
              <MagnifyingGlassIcon className="absolute left-4 top-1/2 -translate-y-1/2 h-6 w-6 text-gray-400" />
              <input
                type="text"
                placeholder="Buscar recursos..."
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
        {/* Filters */}
        <div className="mb-8 bg-white rounded-lg shadow p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Type Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">
                Tipo de Recurso
              </label>
              <div className="flex flex-wrap gap-2">
                {types.map((type) => {
                  const Icon = type.icon;
                  return (
                    <button
                      key={type.value}
                      onClick={() => setSelectedType(type.value)}
                      className={`flex items-center gap-2 px-3 py-2 rounded-lg border transition-colors text-sm ${
                        selectedType === type.value
                          ? 'bg-[#003B7A] text-white border-[#003B7A]'
                          : 'bg-white text-gray-700 border-gray-300 hover:border-[#003B7A]'
                      }`}
                    >
                      <Icon className="h-4 w-4" />
                      <span>{type.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Category Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">
                Categoría
              </label>
              <div className="flex flex-wrap gap-2">
                {categories.map((category) => (
                  <button
                    key={category.value}
                    onClick={() => setSelectedCategory(category.value)}
                    className={`px-3 py-2 rounded-lg border transition-colors text-sm ${
                      selectedCategory === category.value
                        ? 'bg-[#7AB82E] text-white border-[#7AB82E]'
                        : 'bg-white text-gray-700 border-gray-300 hover:border-[#7AB82E]'
                    }`}
                  >
                    {category.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Featured Resources */}
        {featuredResources.length > 0 && (
          <div className="mb-12">
            <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center gap-2">
              <SparklesIcon className="h-7 w-7 text-yellow-500" />
              Recursos Destacados
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {featuredResources.map((resource) => {
                const TypeIcon = getTypeIcon(resource.type);
                return (
                  <div key={resource.id} className="bg-white rounded-lg shadow-lg overflow-hidden hover:shadow-xl transition-shadow">
                    <div className="relative h-48 bg-gradient-to-br from-[#003B7A] to-[#7AB82E]">
                      <Image
                        src={resource.thumbnail}
                        alt={resource.title}
                        fill
                        className="object-cover opacity-80"
                      />
                      <div className="absolute top-4 left-4">
                        <span className={`px-3 py-1 rounded-full text-sm font-medium ${getCategoryColor(resource.category)}`}>
                          {categories.find(c => c.value === resource.category)?.label}
                        </span>
                      </div>
                      <div className="absolute bottom-4 right-4 bg-white/90 backdrop-blur-sm rounded-lg px-3 py-2">
                        <p className="text-sm font-medium text-gray-900">{resource.fileSize}</p>
                      </div>
                    </div>
                    <div className="p-6">
                      <div className="flex items-center gap-2 mb-3">
                        <TypeIcon className="h-5 w-5 text-[#003B7A]" />
                        <span className="text-sm font-medium text-gray-600">
                          {types.find(t => t.value === resource.type)?.label}
                        </span>
                      </div>
                      <h3 className="text-lg font-bold text-gray-900 mb-2">{resource.title}</h3>
                      <p className="text-sm text-gray-600 mb-4 line-clamp-2">{resource.description}</p>
                      <div className="flex items-center justify-between text-sm text-gray-600 mb-4">
                        <span>{resource.downloads.toLocaleString()} descargas</span>
                        <span>{new Date(resource.date).toLocaleDateString('es-ES', { month: 'short', year: 'numeric' })}</span>
                      </div>
                      <button
                        onClick={() => handleDownload(resource)}
                        className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-[#003B7A] text-white rounded-lg hover:bg-[#002855] transition-colors font-medium"
                      >
                        <ArrowDownTrayIcon className="h-5 w-5" />
                        <span>Descargar Gratis</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Regular Resources */}
        {regularResources.length > 0 && (
          <div>
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Todos los Recursos</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {regularResources.map((resource) => {
                const TypeIcon = getTypeIcon(resource.type);
                return (
                  <div key={resource.id} className="bg-white rounded-lg shadow hover:shadow-lg transition-shadow overflow-hidden">
                    <div className="relative h-40 bg-gray-200">
                      <Image
                        src={resource.thumbnail}
                        alt={resource.title}
                        fill
                        className="object-cover"
                      />
                      <div className="absolute top-2 left-2">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getCategoryColor(resource.category)}`}>
                          {categories.find(c => c.value === resource.category)?.label}
                        </span>
                      </div>
                    </div>
                    <div className="p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <TypeIcon className="h-4 w-4 text-[#003B7A]" />
                        <span className="text-xs font-medium text-gray-600">
                          {types.find(t => t.value === resource.type)?.label}
                        </span>
                      </div>
                      <h3 className="font-bold text-gray-900 mb-2 line-clamp-2">{resource.title}</h3>
                      <p className="text-xs text-gray-600 mb-3 line-clamp-2">{resource.description}</p>
                      <div className="flex items-center justify-between text-xs text-gray-600 mb-3">
                        <span>{resource.fileSize}</span>
                        <span>{(resource.downloads / 1000).toFixed(1)}K descargas</span>
                      </div>
                      <button
                        onClick={() => handleDownload(resource)}
                        className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-[#7AB82E] text-white rounded-lg hover:bg-[#6ba625] transition-colors text-sm font-medium"
                      >
                        <ArrowDownTrayIcon className="h-4 w-4" />
                        <span>Descargar</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {filteredResources.length === 0 && (
          <div className="text-center py-12">
            <DocumentTextIcon className="h-16 w-16 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600 text-lg">No se encontraron recursos con estos filtros</p>
            <button
              onClick={() => {
                setSelectedType('all');
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
