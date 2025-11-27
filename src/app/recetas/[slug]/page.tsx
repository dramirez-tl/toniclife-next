'use client';

import { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import {
  ClockIcon,
  FireIcon,
  UserGroupIcon,
  HeartIcon,
  ShareIcon,
  BookmarkIcon,
  PrinterIcon,
  ArrowLeftIcon,
  CheckCircleIcon,
  ChartBarIcon,
} from '@heroicons/react/24/outline';
import {
  HeartIcon as HeartSolidIcon,
  BookmarkIcon as BookmarkSolidIcon,
  StarIcon as StarSolidIcon,
} from '@heroicons/react/24/solid';
import { toast } from 'sonner';

interface Ingredient {
  item: string;
  amount: string;
}

interface NutritionInfo {
  label: string;
  value: string;
  dailyValue?: string;
}

export default function RecetaDetailPage({ params }: { params: { slug: string } }) {
  const [servings, setServings] = useState(2);
  const [isFavorite, setIsFavorite] = useState(false);
  const [completedSteps, setCompletedSteps] = useState<number[]>([]);

  // Mock recipe data
  const recipe = {
    id: '1',
    slug: params.slug,
    title: 'Smoothie Bowl Energizante con Proteína',
    description: 'El desayuno perfecto para comenzar el día con energía. Rico en proteínas, antioxidantes y grasas saludables.',
    image: '/placeholder-recipe-hero.jpg',
    mealType: 'Desayuno',
    goal: 'Energía',
    prepTime: 10,
    cookTime: 0,
    totalTime: 10,
    servings: 2,
    difficulty: 'Fácil',
    rating: 4.8,
    reviews: 156,
    calories: 320,
    protein: 25,
    carbs: 38,
    fat: 12,
    tonicProducts: [
      { name: 'Proteína Vegana Chocolate', link: '/productos/proteina-vegana-chocolate' },
      { name: 'Greens Powder', link: '/productos/greens-powder' }
    ],
    ingredients: [
      { item: 'Plátano congelado', amount: '2 unidades' },
      { item: 'Frutos rojos congelados', amount: '1 taza' },
      { item: 'Proteína Vegana Tonic Life', amount: '2 scoops (40g)' },
      { item: 'Leche de almendras', amount: '1/2 taza' },
      { item: 'Espinacas frescas', amount: '1 taza' },
      { item: 'Mantequilla de almendras', amount: '2 cdas' },
      { item: 'Semillas de chía', amount: '1 cda' },
      { item: 'Miel o dátiles', amount: '1 cda (opcional)' }
    ],
    toppings: [
      { item: 'Granola sin azúcar', amount: '1/4 taza' },
      { item: 'Frutos rojos frescos', amount: 'Al gusto' },
      { item: 'Coco rallado', amount: '1 cda' },
      { item: 'Semillas de hemp', amount: '1 cda' },
      { item: 'Rodajas de plátano', amount: 'Al gusto' }
    ],
    instructions: [
      'En una licuadora de alta potencia, agrega el plátano congelado, frutos rojos, espinacas y leche de almendras.',
      'Añade los 2 scoops de Proteína Vegana Tonic Life y la mantequilla de almendras.',
      'Licúa a velocidad alta hasta obtener una consistencia cremosa y espesa. Si está muy líquido, agrega más fruta congelada. Si está muy espeso, añade un poco más de leche.',
      'Vierte la mezcla en dos bowls.',
      'Decora con los toppings de tu elección: granola, frutos rojos frescos, coco rallado, semillas de hemp y rodajas de plátano.',
      'Espolvorea las semillas de chía por encima.',
      '¡Sirve inmediatamente y disfruta!'
    ],
    tips: [
      'Para una textura más espesa tipo helado, usa menos líquido y más fruta congelada.',
      'Prepara las frutas congeladas la noche anterior para ahorrar tiempo en la mañana.',
      'Puedes sustituir la proteína vegana por proteína whey si no eres vegano.',
      'Añade 1 scoop de Greens Powder para un boost extra de vegetales y antioxidantes.',
      'Las semillas de chía agregarán omega-3 y fibra adicional.'
    ],
    nutrition: [
      { label: 'Calorías', value: '320 kcal', dailyValue: '16%' },
      { label: 'Proteína', value: '25g', dailyValue: '50%' },
      { label: 'Carbohidratos', value: '38g', dailyValue: '13%' },
      { label: 'Grasas', value: '12g', dailyValue: '18%' },
      { label: 'Fibra', value: '8g', dailyValue: '32%' },
      { label: 'Azúcar', value: '18g', dailyValue: '-' },
      { label: 'Sodio', value: '150mg', dailyValue: '7%' },
      { label: 'Calcio', value: '200mg', dailyValue: '20%' },
      { label: 'Hierro', value: '3mg', dailyValue: '17%' },
      { label: 'Vitamina C', value: '45mg', dailyValue: '75%' }
    ],
    tags: ['Sin Cocción', 'Alto en Proteína', 'Vegano', 'Sin Gluten', 'Post-Workout']
  };

  const toggleStep = (index: number) => {
    if (completedSteps.includes(index)) {
      setCompletedSteps(completedSteps.filter(i => i !== index));
    } else {
      setCompletedSteps([...completedSteps, index]);
    }
  };

  const handleFavorite = () => {
    setIsFavorite(!isFavorite);
    toast.success(isFavorite ? 'Removido de favoritos' : 'Añadido a favoritos');
  };

  const handleShare = () => {
    toast.success('Enlace copiado al portapapeles');
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Back Button */}
      <div className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <Link
            href="/recetas"
            className="inline-flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors"
          >
            <ArrowLeftIcon className="h-5 w-5" />
            <span>Volver a Recetas</span>
          </Link>
        </div>
      </div>

      {/* Hero Section */}
      <div className="relative h-96 bg-gray-900">
        <Image
          src={recipe.image}
          alt={recipe.title}
          fill
          className="object-cover opacity-80"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
        <div className="absolute bottom-0 left-0 right-0 p-8">
          <div className="max-w-7xl mx-auto">
            <div className="flex flex-wrap gap-2 mb-4">
              <span className="px-3 py-1 bg-yellow-500 text-white rounded-full text-sm font-medium">
                {recipe.mealType}
              </span>
              <span className="px-3 py-1 bg-green-500 text-white rounded-full text-sm font-medium">
                {recipe.goal}
              </span>
              <span className="px-3 py-1 bg-blue-500 text-white rounded-full text-sm font-medium">
                {recipe.difficulty}
              </span>
            </div>
            <h1 className="text-4xl md:text-5xl font-bold text-white mb-4">
              {recipe.title}
            </h1>
            <p className="text-xl text-gray-200 max-w-3xl">{recipe.description}</p>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Recipe Content */}
          <div className="lg:col-span-2">
            {/* Recipe Meta */}
            <div className="bg-white rounded-lg shadow p-6 mb-8">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-2">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <StarSolidIcon
                      key={star}
                      className={`h-6 w-6 ${star <= Math.round(recipe.rating) ? 'text-yellow-400' : 'text-gray-300'}`}
                    />
                  ))}
                  <span className="ml-2 text-gray-600">
                    {recipe.rating} ({recipe.reviews} reseñas)
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleFavorite}
                    className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
                  >
                    {isFavorite ? (
                      <HeartSolidIcon className="h-6 w-6 text-red-500" />
                    ) : (
                      <HeartIcon className="h-6 w-6 text-gray-600" />
                    )}
                  </button>
                  <button
                    onClick={handleShare}
                    className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
                  >
                    <ShareIcon className="h-6 w-6 text-gray-600" />
                  </button>
                  <button
                    onClick={handlePrint}
                    className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
                  >
                    <PrinterIcon className="h-6 w-6 text-gray-600" />
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-4 gap-4">
                <div className="text-center p-4 bg-gray-50 rounded-lg">
                  <ClockIcon className="h-6 w-6 text-gray-600 mx-auto mb-2" />
                  <p className="text-sm text-gray-600">Prep</p>
                  <p className="text-lg font-bold text-gray-900">{recipe.prepTime} min</p>
                </div>
                <div className="text-center p-4 bg-gray-50 rounded-lg">
                  <ClockIcon className="h-6 w-6 text-gray-600 mx-auto mb-2" />
                  <p className="text-sm text-gray-600">Total</p>
                  <p className="text-lg font-bold text-gray-900">{recipe.totalTime} min</p>
                </div>
                <div className="text-center p-4 bg-gray-50 rounded-lg">
                  <UserGroupIcon className="h-6 w-6 text-gray-600 mx-auto mb-2" />
                  <p className="text-sm text-gray-600">Porciones</p>
                  <p className="text-lg font-bold text-gray-900">{servings}</p>
                </div>
                <div className="text-center p-4 bg-gray-50 rounded-lg">
                  <FireIcon className="h-6 w-6 text-gray-600 mx-auto mb-2" />
                  <p className="text-sm text-gray-600">Calorías</p>
                  <p className="text-lg font-bold text-gray-900">{recipe.calories}</p>
                </div>
              </div>
            </div>

            {/* Macros */}
            <div className="bg-white rounded-lg shadow p-6 mb-8">
              <h2 className="text-xl font-bold text-gray-900 mb-4">Macronutrientes</h2>
              <div className="grid grid-cols-3 gap-4">
                <div className="text-center p-4 bg-blue-50 rounded-lg">
                  <p className="text-sm text-gray-600 mb-1">Proteína</p>
                  <p className="text-3xl font-bold text-[#003B7A]">{recipe.protein}g</p>
                </div>
                <div className="text-center p-4 bg-green-50 rounded-lg">
                  <p className="text-sm text-gray-600 mb-1">Carbohidratos</p>
                  <p className="text-3xl font-bold text-[#7AB82E]">{recipe.carbs}g</p>
                </div>
                <div className="text-center p-4 bg-yellow-50 rounded-lg">
                  <p className="text-sm text-gray-600 mb-1">Grasas</p>
                  <p className="text-3xl font-bold text-yellow-600">{recipe.fat}g</p>
                </div>
              </div>
            </div>

            {/* Ingredients */}
            <div className="bg-white rounded-lg shadow p-6 mb-8">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold text-gray-900">Ingredientes</h2>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setServings(Math.max(1, servings - 1))}
                    className="px-3 py-1 bg-gray-200 rounded hover:bg-gray-300"
                  >
                    -
                  </button>
                  <span className="px-4">{servings} porciones</span>
                  <button
                    onClick={() => setServings(servings + 1)}
                    className="px-3 py-1 bg-gray-200 rounded hover:bg-gray-300"
                  >
                    +
                  </button>
                </div>
              </div>
              <div className="space-y-2">
                {recipe.ingredients.map((ingredient, index) => (
                  <div key={index} className="flex items-start gap-3 p-2 hover:bg-gray-50 rounded">
                    <CheckCircleIcon className="h-5 w-5 text-[#7AB82E] mt-0.5 flex-shrink-0" />
                    <div>
                      <span className="font-medium">{ingredient.amount}</span>
                      <span className="text-gray-700"> {ingredient.item}</span>
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-6 pt-6 border-t">
                <h3 className="font-bold text-gray-900 mb-3">Toppings</h3>
                <div className="space-y-2">
                  {recipe.toppings.map((topping, index) => (
                    <div key={index} className="flex items-start gap-3 p-2 hover:bg-gray-50 rounded">
                      <CheckCircleIcon className="h-5 w-5 text-[#7AB82E] mt-0.5 flex-shrink-0" />
                      <div>
                        <span className="font-medium">{topping.amount}</span>
                        <span className="text-gray-700"> {topping.item}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Instructions */}
            <div className="bg-white rounded-lg shadow p-6 mb-8">
              <h2 className="text-xl font-bold text-gray-900 mb-4">Instrucciones</h2>
              <div className="space-y-4">
                {recipe.instructions.map((instruction, index) => (
                  <div key={index} className="flex gap-4">
                    <div className="flex-shrink-0">
                      <button
                        onClick={() => toggleStep(index)}
                        className={`w-8 h-8 rounded-full flex items-center justify-center font-bold transition-colors ${
                          completedSteps.includes(index)
                            ? 'bg-[#7AB82E] text-white'
                            : 'bg-gray-200 text-gray-700'
                        }`}
                      >
                        {index + 1}
                      </button>
                    </div>
                    <p className={`flex-1 pt-1 ${completedSteps.includes(index) ? 'line-through text-gray-500' : 'text-gray-700'}`}>
                      {instruction}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            {/* Tips */}
            <div className="bg-gradient-to-r from-blue-50 to-green-50 rounded-lg p-6 mb-8">
              <h2 className="text-xl font-bold text-gray-900 mb-4">Tips del Chef</h2>
              <ul className="space-y-2">
                {recipe.tips.map((tip, index) => (
                  <li key={index} className="flex gap-3">
                    <span className="text-[#7AB82E] font-bold">•</span>
                    <span className="text-gray-700">{tip}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Tags */}
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="font-bold text-gray-900 mb-3">Tags</h3>
              <div className="flex flex-wrap gap-2">
                {recipe.tags.map((tag, index) => (
                  <span
                    key={index}
                    className="px-3 py-1 bg-gray-100 text-gray-700 rounded-lg text-sm"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="lg:col-span-1">
            {/* Tonic Products */}
            {recipe.tonicProducts && recipe.tonicProducts.length > 0 && (
              <div className="bg-gradient-to-br from-[#003B7A] to-[#7AB82E] rounded-lg shadow-lg p-6 text-white mb-6 sticky top-4">
                <h3 className="text-xl font-bold mb-3">Complementa con Tonic Life</h3>
                <p className="text-blue-100 mb-4 text-sm">
                  Productos recomendados para esta receta
                </p>
                <div className="space-y-3">
                  {recipe.tonicProducts.map((product, index) => (
                    <Link
                      key={index}
                      href={product.link}
                      className="block p-3 bg-white/10 backdrop-blur-sm rounded-lg hover:bg-white/20 transition-colors"
                    >
                      <p className="font-medium">{product.name}</p>
                      <span className="text-xs text-blue-100">Ver producto →</span>
                    </Link>
                  ))}
                </div>
                <Link
                  href="/productos"
                  className="mt-4 block w-full py-3 bg-white text-[#003B7A] font-medium rounded-lg text-center hover:bg-blue-50 transition-colors"
                >
                  Ver Todos los Productos
                </Link>
              </div>
            )}

            {/* Nutrition Facts */}
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-xl font-bold text-gray-900 mb-4 pb-2 border-b-4 border-black">
                Información Nutricional
              </h3>
              <p className="text-sm text-gray-600 mb-3">Por porción</p>
              <div className="space-y-2">
                {recipe.nutrition.map((item, index) => (
                  <div key={index} className={`flex justify-between py-2 ${index === 0 ? 'border-b-2 border-gray-900' : 'border-b border-gray-200'}`}>
                    <span className={index === 0 ? 'font-bold text-gray-900' : 'text-gray-700'}>
                      {item.label}
                    </span>
                    <div className="text-right">
                      <span className={index === 0 ? 'font-bold text-gray-900' : 'text-gray-900'}>
                        {item.value}
                      </span>
                      {item.dailyValue && (
                        <span className="text-sm text-gray-600 ml-2">
                          {item.dailyValue}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
              <p className="text-xs text-gray-500 mt-4">
                * Los valores diarios están basados en una dieta de 2000 calorías
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
