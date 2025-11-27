'use client';

import { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import {
  MagnifyingGlassIcon,
  ClockIcon,
  FireIcon,
  HeartIcon,
  SparklesIcon,
  SunIcon,
  MoonIcon,
  CakeIcon,
  UserGroupIcon,
  ChartBarIcon,
} from '@heroicons/react/24/outline';
import {
  HeartIcon as HeartSolidIcon,
  StarIcon as StarSolidIcon,
} from '@heroicons/react/24/solid';

interface Recipe {
  id: string;
  slug: string;
  title: string;
  description: string;
  image: string;
  mealType: 'breakfast' | 'lunch' | 'dinner' | 'snack';
  goal: 'energy' | 'detox' | 'muscle' | 'weight-loss' | 'immunity';
  prepTime: number;
  cookTime: number;
  servings: number;
  difficulty: 'easy' | 'medium' | 'hard';
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  rating: number;
  reviews: number;
  isFavorite: boolean;
  tonicProducts?: string[];
  tags: string[];
}

export default function RecetasPage() {
  const [selectedMealType, setSelectedMealType] = useState<string>('all');
  const [selectedGoal, setSelectedGoal] = useState<string>('all');
  const [selectedDifficulty, setSelectedDifficulty] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const mealTypes = [
    { value: 'all', label: 'Todas', icon: SparklesIcon, color: 'bg-purple-100 text-purple-800' },
    { value: 'breakfast', label: 'Desayuno', icon: SunIcon, color: 'bg-yellow-100 text-yellow-800' },
    { value: 'lunch', label: 'Comida', icon: FireIcon, color: 'bg-orange-100 text-orange-800' },
    { value: 'dinner', label: 'Cena', icon: MoonIcon, color: 'bg-indigo-100 text-indigo-800' },
    { value: 'snack', label: 'Snacks', icon: CakeIcon, color: 'bg-pink-100 text-pink-800' }
  ];

  const goals = [
    { value: 'all', label: 'Todos' },
    { value: 'energy', label: 'Energía' },
    { value: 'detox', label: 'Detox' },
    { value: 'muscle', label: 'Masa Muscular' },
    { value: 'weight-loss', label: 'Pérdida de Peso' },
    { value: 'immunity', label: 'Inmunidad' }
  ];

  const difficulties = [
    { value: 'all', label: 'Todas' },
    { value: 'easy', label: 'Fácil' },
    { value: 'medium', label: 'Intermedio' },
    { value: 'hard', label: 'Avanzado' }
  ];

  const recipes: Recipe[] = [
    {
      id: '1',
      slug: 'smoothie-bowl-energizante',
      title: 'Smoothie Bowl Energizante con Proteína',
      description: 'El desayuno perfecto para comenzar el día con energía. Rico en proteínas, antioxidantes y grasas saludables.',
      image: '/placeholder-recipe-1.jpg',
      mealType: 'breakfast',
      goal: 'energy',
      prepTime: 10,
      cookTime: 0,
      servings: 2,
      difficulty: 'easy',
      calories: 320,
      protein: 25,
      carbs: 38,
      fat: 12,
      rating: 4.8,
      reviews: 156,
      isFavorite: true,
      tonicProducts: ['Proteína Vegana', 'Greens Powder'],
      tags: ['Sin Cocción', 'Alto en Proteína', 'Vegano']
    },
    {
      id: '2',
      slug: 'ensalada-quinoa-detox',
      title: 'Ensalada de Quinoa Detox con Vegetales',
      description: 'Comida ligera y nutritiva perfecta para desintoxicar tu cuerpo. Llena de fibra, vitaminas y minerales.',
      image: '/placeholder-recipe-2.jpg',
      mealType: 'lunch',
      goal: 'detox',
      prepTime: 15,
      cookTime: 20,
      servings: 4,
      difficulty: 'easy',
      calories: 280,
      protein: 12,
      carbs: 42,
      fat: 8,
      rating: 4.6,
      reviews: 98,
      isFavorite: false,
      tonicProducts: ['Digestive Support'],
      tags: ['Vegano', 'Sin Gluten', 'Alto en Fibra']
    },
    {
      id: '3',
      slug: 'salmon-teriyaki-vegetales',
      title: 'Salmón Teriyaki con Vegetales al Vapor',
      description: 'Cena alta en Omega-3 y proteína de calidad. Perfecta para recuperación muscular y salud cardiovascular.',
      image: '/placeholder-recipe-3.jpg',
      mealType: 'dinner',
      goal: 'muscle',
      prepTime: 10,
      cookTime: 25,
      servings: 2,
      difficulty: 'medium',
      calories: 420,
      protein: 38,
      carbs: 28,
      fat: 18,
      rating: 4.9,
      reviews: 203,
      isFavorite: true,
      tonicProducts: ['Omega-3 Fish Oil'],
      tags: ['Alto en Proteína', 'Rico en Omega-3', 'Sin Gluten']
    },
    {
      id: '4',
      slug: 'energy-balls-cacao',
      title: 'Energy Balls de Cacao y Almendras',
      description: 'Snack saludable perfecto para antes o después del entrenamiento. Sin azúcar refinada y lleno de energía natural.',
      image: '/placeholder-recipe-4.jpg',
      mealType: 'snack',
      goal: 'energy',
      prepTime: 15,
      cookTime: 0,
      servings: 12,
      difficulty: 'easy',
      calories: 145,
      protein: 5,
      carbs: 18,
      fat: 7,
      rating: 4.7,
      reviews: 127,
      isFavorite: false,
      tonicProducts: ['Collagen Peptides'],
      tags: ['Sin Cocción', 'Vegano', 'Sin Azúcar Refinada']
    },
    {
      id: '5',
      slug: 'pollo-curry-coco',
      title: 'Pollo al Curry con Leche de Coco',
      description: 'Plato reconfortante y nutritivo, rico en proteínas y especias antiinflamatorias. Perfecto para la cena.',
      image: '/placeholder-recipe-5.jpg',
      mealType: 'dinner',
      goal: 'immunity',
      prepTime: 15,
      cookTime: 30,
      servings: 4,
      difficulty: 'medium',
      calories: 385,
      protein: 32,
      carbs: 22,
      fat: 20,
      rating: 4.8,
      reviews: 174,
      isFavorite: true,
      tonicProducts: ['Immune Boost', 'Turmeric Curcumin'],
      tags: ['Sin Gluten', 'Alto en Proteína', 'Antiinflamatorio']
    },
    {
      id: '6',
      slug: 'overnight-oats-proteina',
      title: 'Overnight Oats con Proteína y Frutos Rojos',
      description: 'Desayuno preparado la noche anterior. Rico en fibra, proteína y antioxidantes.',
      image: '/placeholder-recipe-6.jpg',
      mealType: 'breakfast',
      goal: 'weight-loss',
      prepTime: 5,
      cookTime: 0,
      servings: 1,
      difficulty: 'easy',
      calories: 295,
      protein: 22,
      carbs: 40,
      fat: 6,
      rating: 4.5,
      reviews: 89,
      isFavorite: false,
      tonicProducts: ['Proteína Vainilla', 'Fiber Blend'],
      tags: ['Sin Cocción', 'Alto en Fibra', 'Preparación Nocturna']
    },
    {
      id: '7',
      slug: 'wrap-pavo-aguacate',
      title: 'Wrap de Pavo con Aguacate y Vegetales',
      description: 'Comida rápida, saludable y balanceada. Perfecta para llevar al trabajo o después del gym.',
      image: '/placeholder-recipe-7.jpg',
      mealType: 'lunch',
      goal: 'muscle',
      prepTime: 10,
      cookTime: 0,
      servings: 1,
      difficulty: 'easy',
      calories: 340,
      protein: 28,
      carbs: 35,
      fat: 12,
      rating: 4.6,
      reviews: 112,
      isFavorite: false,
      tags: ['Sin Cocción', 'Alto en Proteína', 'Portátil']
    },
    {
      id: '8',
      slug: 'sopa-lentejas-vegetales',
      title: 'Sopa de Lentejas con Vegetales',
      description: 'Cena caliente y reconfortante, alta en proteína vegetal y fibra. Ideal para días fríos.',
      image: '/placeholder-recipe-8.jpg',
      mealType: 'dinner',
      goal: 'weight-loss',
      prepTime: 10,
      cookTime: 35,
      servings: 6,
      difficulty: 'easy',
      calories: 220,
      protein: 14,
      carbs: 38,
      fat: 3,
      rating: 4.7,
      reviews: 145,
      isFavorite: true,
      tonicProducts: ['Greens Powder'],
      tags: ['Vegano', 'Alto en Fibra', 'Bajo en Grasa']
    },
    {
      id: '9',
      slug: 'tazon-acai-granola',
      title: 'Tazón de Açaí con Granola Casera',
      description: 'Desayuno tropical lleno de antioxidantes y grasas saludables. Delicioso y nutritivo.',
      image: '/placeholder-recipe-9.jpg',
      mealType: 'breakfast',
      goal: 'energy',
      prepTime: 10,
      cookTime: 20,
      servings: 2,
      difficulty: 'medium',
      calories: 380,
      protein: 12,
      carbs: 52,
      fat: 16,
      rating: 4.9,
      reviews: 198,
      isFavorite: true,
      tonicProducts: ['Antioxidant Blend'],
      tags: ['Rico en Antioxidantes', 'Vegano', 'Sin Gluten']
    }
  ];

  const filteredRecipes = recipes.filter(recipe => {
    const matchesMealType = selectedMealType === 'all' || recipe.mealType === selectedMealType;
    const matchesGoal = selectedGoal === 'all' || recipe.goal === selectedGoal;
    const matchesDifficulty = selectedDifficulty === 'all' || recipe.difficulty === selectedDifficulty;
    const matchesSearch = recipe.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         recipe.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         recipe.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesMealType && matchesGoal && matchesDifficulty && matchesSearch;
  });

  const getMealTypeColor = (mealType: string) => {
    const type = mealTypes.find(t => t.value === mealType);
    return type?.color || 'bg-gray-100 text-gray-800';
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'easy':
        return 'bg-green-100 text-green-800';
      case 'medium':
        return 'bg-yellow-100 text-yellow-800';
      case 'hard':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const renderStars = (rating: number) => {
    return (
      <div className="flex items-center gap-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <StarSolidIcon
            key={star}
            className={`h-4 w-4 ${star <= Math.round(rating) ? 'text-yellow-400' : 'text-gray-300'}`}
          />
        ))}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-gradient-to-r from-[#003B7A] to-[#7AB82E] text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="text-center">
            <h1 className="text-4xl font-bold mb-4">Recetas Saludables</h1>
            <p className="text-xl text-blue-100 max-w-3xl mx-auto">
              Descubre recetas deliciosas y nutritivas para cada momento del día
            </p>
          </div>

          {/* Search Bar */}
          <div className="mt-8 max-w-2xl mx-auto">
            <div className="relative">
              <MagnifyingGlassIcon className="absolute left-4 top-1/2 -translate-y-1/2 h-6 w-6 text-gray-400" />
              <input
                type="text"
                placeholder="Buscar recetas, ingredientes, objetivos..."
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
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Meal Type Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">
                Tipo de Comida
              </label>
              <div className="flex flex-wrap gap-2">
                {mealTypes.map((type) => {
                  const Icon = type.icon;
                  return (
                    <button
                      key={type.value}
                      onClick={() => setSelectedMealType(type.value)}
                      className={`flex items-center gap-2 px-3 py-2 rounded-lg border transition-colors text-sm ${
                        selectedMealType === type.value
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

            {/* Goal Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">
                Objetivo
              </label>
              <div className="flex flex-wrap gap-2">
                {goals.map((goal) => (
                  <button
                    key={goal.value}
                    onClick={() => setSelectedGoal(goal.value)}
                    className={`px-3 py-2 rounded-lg border transition-colors text-sm ${
                      selectedGoal === goal.value
                        ? 'bg-[#7AB82E] text-white border-[#7AB82E]'
                        : 'bg-white text-gray-700 border-gray-300 hover:border-[#7AB82E]'
                    }`}
                  >
                    {goal.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Difficulty Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">
                Dificultad
              </label>
              <div className="flex flex-wrap gap-2">
                {difficulties.map((diff) => (
                  <button
                    key={diff.value}
                    onClick={() => setSelectedDifficulty(diff.value)}
                    className={`px-3 py-2 rounded-lg border transition-colors text-sm ${
                      selectedDifficulty === diff.value
                        ? 'bg-gray-900 text-white border-gray-900'
                        : 'bg-white text-gray-700 border-gray-300 hover:border-gray-900'
                    }`}
                  >
                    {diff.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Recipes Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredRecipes.map((recipe) => (
            <Link key={recipe.id} href={`/recetas/${recipe.slug}`}>
              <div className="bg-white rounded-lg shadow hover:shadow-xl transition-shadow cursor-pointer group">
                <div className="relative h-56">
                  <Image
                    src={recipe.image}
                    alt={recipe.title}
                    fill
                    className="object-cover rounded-t-lg group-hover:scale-105 transition-transform duration-300"
                  />
                  <div className="absolute top-4 left-4 right-4 flex justify-between items-start">
                    <span className={`px-3 py-1 rounded-full text-sm font-medium ${getMealTypeColor(recipe.mealType)}`}>
                      {mealTypes.find(t => t.value === recipe.mealType)?.label}
                    </span>
                    {recipe.isFavorite && (
                      <div className="bg-white/90 backdrop-blur-sm rounded-full p-2">
                        <HeartSolidIcon className="h-5 w-5 text-red-500" />
                      </div>
                    )}
                  </div>
                  <div className="absolute bottom-4 right-4">
                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${getDifficultyColor(recipe.difficulty)}`}>
                      {recipe.difficulty === 'easy' ? 'Fácil' : recipe.difficulty === 'medium' ? 'Intermedio' : 'Avanzado'}
                    </span>
                  </div>
                </div>

                <div className="p-6">
                  <h3 className="text-lg font-bold text-gray-900 mb-2 group-hover:text-[#003B7A] transition-colors line-clamp-2">
                    {recipe.title}
                  </h3>
                  <p className="text-sm text-gray-600 mb-4 line-clamp-2">{recipe.description}</p>

                  {/* Recipe Info */}
                  <div className="grid grid-cols-3 gap-2 mb-4">
                    <div className="text-center">
                      <div className="flex items-center justify-center gap-1 text-gray-600 mb-1">
                        <ClockIcon className="h-4 w-4" />
                      </div>
                      <p className="text-xs text-gray-600">Tiempo Total</p>
                      <p className="text-sm font-bold text-gray-900">{recipe.prepTime + recipe.cookTime} min</p>
                    </div>
                    <div className="text-center">
                      <div className="flex items-center justify-center gap-1 text-gray-600 mb-1">
                        <UserGroupIcon className="h-4 w-4" />
                      </div>
                      <p className="text-xs text-gray-600">Porciones</p>
                      <p className="text-sm font-bold text-gray-900">{recipe.servings}</p>
                    </div>
                    <div className="text-center">
                      <div className="flex items-center justify-center gap-1 text-gray-600 mb-1">
                        <FireIcon className="h-4 w-4" />
                      </div>
                      <p className="text-xs text-gray-600">Calorías</p>
                      <p className="text-sm font-bold text-gray-900">{recipe.calories}</p>
                    </div>
                  </div>

                  {/* Macros */}
                  <div className="grid grid-cols-3 gap-2 mb-4 p-3 bg-gray-50 rounded-lg">
                    <div className="text-center">
                      <p className="text-xs text-gray-600">Proteína</p>
                      <p className="text-sm font-bold text-[#003B7A]">{recipe.protein}g</p>
                    </div>
                    <div className="text-center">
                      <p className="text-xs text-gray-600">Carbos</p>
                      <p className="text-sm font-bold text-[#7AB82E]">{recipe.carbs}g</p>
                    </div>
                    <div className="text-center">
                      <p className="text-xs text-gray-600">Grasas</p>
                      <p className="text-sm font-bold text-yellow-600">{recipe.fat}g</p>
                    </div>
                  </div>

                  {/* Rating */}
                  <div className="flex items-center justify-between mb-4">
                    {renderStars(recipe.rating)}
                    <span className="text-sm text-gray-600">
                      {recipe.rating} ({recipe.reviews})
                    </span>
                  </div>

                  {/* Tonic Products */}
                  {recipe.tonicProducts && recipe.tonicProducts.length > 0 && (
                    <div className="bg-gradient-to-r from-blue-50 to-green-50 rounded-lg p-3">
                      <p className="text-xs font-medium text-gray-700 mb-1">Complementa con:</p>
                      <p className="text-xs text-gray-600 line-clamp-1">
                        {recipe.tonicProducts.join(', ')}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </Link>
          ))}
        </div>

        {filteredRecipes.length === 0 && (
          <div className="text-center py-12">
            <MagnifyingGlassIcon className="h-16 w-16 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600 text-lg">No se encontraron recetas con estos filtros</p>
            <button
              onClick={() => {
                setSelectedMealType('all');
                setSelectedGoal('all');
                setSelectedDifficulty('all');
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
