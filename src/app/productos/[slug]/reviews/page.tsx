'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
  StarIcon as StarOutline,
  HandThumbUpIcon,
  HandThumbDownIcon,
  FunnelIcon,
  CheckCircleIcon,
  PhotoIcon,
  PencilIcon,
} from '@heroicons/react/24/outline';
import { StarIcon as StarSolid } from '@heroicons/react/24/solid';
import { toast } from 'sonner';

// Mock reviews data
const reviews = [
  {
    id: 'R1',
    userId: 'U1',
    userName: 'María González',
    userImage: null,
    verified: true,
    rating: 5,
    title: '¡Excelente producto! Noté resultados en 2 semanas',
    content: 'Llevo usando este producto por 3 meses y la diferencia es notable. Mi energía ha mejorado significativamente y me siento mucho mejor en general. La calidad es excelente y el sabor es agradable. Definitivamente lo recomiendo.',
    date: '2024-01-20',
    helpful: 45,
    notHelpful: 2,
    images: [],
    response: null
  },
  {
    id: 'R2',
    userId: 'U2',
    userName: 'Carlos Ramírez',
    userImage: null,
    verified: true,
    rating: 4,
    title: 'Muy bueno, cumple lo prometido',
    content: 'El producto es de buena calidad y sí he notado mejoras. Le doy 4 estrellas porque el precio me parece un poco elevado comparado con otras opciones del mercado. Aún así, la calidad justifica el costo.',
    date: '2024-01-18',
    helpful: 32,
    notHelpful: 5,
    images: [],
    response: {
      author: 'Tonic Life',
      date: '2024-01-19',
      content: 'Gracias Carlos por tu reseña. Nuestros productos utilizan ingredientes premium de la más alta calidad, lo que se refleja en los resultados. ¡Nos alegra que estés viendo mejoras!'
    }
  },
  {
    id: 'R3',
    userId: 'U3',
    userName: 'Ana Martínez',
    userImage: null,
    verified: false,
    rating: 5,
    title: 'El mejor suplemento que he probado',
    content: 'Increíble. He probado muchas marcas y esta es por mucho la mejor. Los resultados son consistentes y la calidad es superior. El envío fue rápido y el empaque llegó perfecto.',
    date: '2024-01-15',
    helpful: 28,
    notHelpful: 1,
    images: ['/reviews/img1.jpg', '/reviews/img2.jpg'],
    response: null
  },
  {
    id: 'R4',
    userId: 'U4',
    userName: 'Roberto Silva',
    userImage: null,
    verified: true,
    rating: 3,
    title: 'Está bien, pero esperaba más',
    content: 'El producto es correcto pero no he visto los resultados dramáticos que promete. Llevo 1 mes usándolo. Quizás necesite más tiempo, pero por ahora es solo OK.',
    date: '2024-01-12',
    helpful: 15,
    notHelpful: 8,
    images: [],
    response: {
      author: 'Tonic Life',
      date: '2024-01-13',
      content: 'Hola Roberto, los resultados pueden variar según cada persona. Te recomendamos continuar el uso por al menos 2-3 meses para obtener los mejores resultados. Si tienes dudas, nuestro equipo está disponible para ayudarte.'
    }
  },
  {
    id: 'R5',
    userId: 'U5',
    userName: 'Laura Pérez',
    userImage: null,
    verified: true,
    rating: 5,
    title: 'Cambió mi vida completamente',
    content: 'No exagero cuando digo que este producto cambió mi vida. Sufría de fatiga crónica y después de 2 meses de uso constante, mi energía está en niveles que no había experimentado en años. Lo recomiendo 100%.',
    date: '2024-01-10',
    helpful: 52,
    notHelpful: 0,
    images: [],
    response: null
  },
  {
    id: 'R6',
    userId: 'U6',
    userName: 'Diego Torres',
    userImage: null,
    verified: true,
    rating: 4,
    title: 'Buena calidad pero el precio podría mejorar',
    content: 'El producto en sí es excelente. Ingredientes de calidad y buenos resultados. Mi única queja es el precio. Si bajara un poco sería perfecto. Aún así vale la pena.',
    date: '2024-01-08',
    helpful: 19,
    notHelpful: 4,
    images: [],
    response: null
  },
  {
    id: 'R7',
    userId: 'U7',
    userName: 'Patricia Gómez',
    userImage: null,
    verified: false,
    rating: 2,
    title: 'No vi resultados',
    content: 'Usé el producto durante 6 semanas siguiendo las indicaciones pero no noté ninguna diferencia. Quizás funciona para algunas personas pero no fue mi caso.',
    date: '2024-01-05',
    helpful: 8,
    notHelpful: 22,
    images: [],
    response: {
      author: 'Tonic Life',
      date: '2024-01-06',
      content: 'Lamentamos que no hayas visto los resultados esperados. Cada organismo es diferente. Te invitamos a contactar a nuestro equipo de soporte para una consulta personalizada.'
    }
  },
  {
    id: 'R8',
    userId: 'U8',
    userName: 'Miguel Hernández',
    userImage: null,
    verified: true,
    rating: 5,
    title: 'Superó mis expectativas',
    content: 'Compré este producto por recomendación de mi nutricionista y ha sido una de las mejores decisiones. La calidad es notable, se nota que usan buenos ingredientes. Mi recuperación post-entrenamiento ha mejorado muchísimo.',
    date: '2024-01-03',
    helpful: 38,
    notHelpful: 1,
    images: ['/reviews/img3.jpg'],
    response: null
  }
];

const ratingDistribution = {
  5: 5,
  4: 2,
  3: 1,
  2: 1,
  1: 0
};

export default function ProductReviewsPage() {
  const [filterRating, setFilterRating] = useState('all');
  const [sortBy, setSortBy] = useState('helpful');
  const [showWriteReview, setShowWriteReview] = useState(false);
  const [newReview, setNewReview] = useState({
    rating: 5,
    title: '',
    content: ''
  });

  const totalReviews = reviews.length;
  const averageRating = reviews.reduce((sum, r) => sum + r.rating, 0) / totalReviews;
  const verifiedPercentage = (reviews.filter(r => r.verified).length / totalReviews) * 100;

  const filteredReviews = reviews
    .filter(review => filterRating === 'all' || review.rating === parseInt(filterRating))
    .sort((a, b) => {
      switch (sortBy) {
        case 'helpful':
          return b.helpful - a.helpful;
        case 'recent':
          return new Date(b.date).getTime() - new Date(a.date).getTime();
        case 'rating_high':
          return b.rating - a.rating;
        case 'rating_low':
          return a.rating - b.rating;
        default:
          return 0;
      }
    });

  const handleVoteHelpful = (reviewId: string, isHelpful: boolean) => {
    toast.success(isHelpful ? 'Marcado como útil' : 'Marcado como no útil');
  };

  const handleSubmitReview = (e: React.FormEvent) => {
    e.preventDefault();
    toast.success('¡Reseña enviada! Se publicará después de ser verificada.');
    setShowWriteReview(false);
    setNewReview({ rating: 5, title: '', content: '' });
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <Link href="/productos/proteina-vegana" className="text-[#003B7A] hover:underline mb-2 inline-block">
            ← Volver al Producto
          </Link>
          <h1 className="text-3xl font-bold text-gray-900">Reseñas de Clientes</h1>
          <p className="text-gray-600">Proteína Vegana Chocolate</p>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Summary Sidebar */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg shadow p-6 sticky top-4">
              {/* Overall Rating */}
              <div className="text-center pb-6 border-b">
                <div className="text-5xl font-bold text-gray-900 mb-2">
                  {averageRating.toFixed(1)}
                </div>
                <div className="flex justify-center mb-2">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <StarSolid
                      key={star}
                      className={`h-6 w-6 ${
                        star <= Math.round(averageRating) ? 'text-yellow-400' : 'text-gray-300'
                      }`}
                    />
                  ))}
                </div>
                <p className="text-gray-600">
                  Basado en {totalReviews} reseñas
                </p>
                <p className="text-sm text-[#7AB82E] mt-1">
                  {verifiedPercentage.toFixed(0)}% compras verificadas
                </p>
              </div>

              {/* Rating Distribution */}
              <div className="py-6 border-b">
                <h3 className="font-bold text-gray-900 mb-4">Distribución de Calificaciones</h3>
                <div className="space-y-2">
                  {[5, 4, 3, 2, 1].map((rating) => {
                    const count = ratingDistribution[rating as keyof typeof ratingDistribution];
                    const percentage = (count / totalReviews) * 100;
                    return (
                      <button
                        key={rating}
                        onClick={() => setFilterRating(rating.toString())}
                        className="w-full flex items-center gap-2 hover:bg-gray-50 p-1 rounded transition-colors"
                      >
                        <span className="text-sm text-gray-700 w-12">{rating} ★</span>
                        <div className="flex-1 bg-gray-200 rounded-full h-2">
                          <div
                            className="bg-yellow-400 h-2 rounded-full"
                            style={{ width: `${percentage}%` }}
                          />
                        </div>
                        <span className="text-sm text-gray-600 w-8">{count}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Write Review Button */}
              <div className="pt-6">
                <button
                  onClick={() => setShowWriteReview(!showWriteReview)}
                  className="w-full px-4 py-3 bg-[#003B7A] text-white rounded-lg hover:bg-[#002855] transition-colors font-medium flex items-center justify-center gap-2"
                >
                  <PencilIcon className="h-5 w-5" />
                  Escribir Reseña
                </button>
              </div>
            </div>
          </div>

          {/* Reviews List */}
          <div className="lg:col-span-2 space-y-6">
            {/* Write Review Form */}
            {showWriteReview && (
              <div className="bg-white rounded-lg shadow p-6">
                <h3 className="text-xl font-bold text-gray-900 mb-4">Escribe tu Reseña</h3>
                <form onSubmit={handleSubmitReview} className="space-y-4">
                  {/* Rating */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Calificación *
                    </label>
                    <div className="flex gap-2">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <button
                          key={star}
                          type="button"
                          onClick={() => setNewReview({ ...newReview, rating: star })}
                          className="focus:outline-none"
                        >
                          <StarSolid
                            className={`h-8 w-8 ${
                              star <= newReview.rating ? 'text-yellow-400' : 'text-gray-300'
                            }`}
                          />
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Title */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Título de tu reseña *
                    </label>
                    <input
                      type="text"
                      required
                      value={newReview.title}
                      onChange={(e) => setNewReview({ ...newReview, title: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#003B7A]"
                      placeholder="Resume tu experiencia"
                    />
                  </div>

                  {/* Content */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Tu reseña *
                    </label>
                    <textarea
                      required
                      rows={6}
                      value={newReview.content}
                      onChange={(e) => setNewReview({ ...newReview, content: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#003B7A] resize-none"
                      placeholder="Cuéntanos sobre tu experiencia con el producto..."
                    />
                  </div>

                  {/* Actions */}
                  <div className="flex gap-3">
                    <button
                      type="submit"
                      className="flex-1 px-4 py-2 bg-[#003B7A] text-white rounded-lg hover:bg-[#002855] transition-colors"
                    >
                      Publicar Reseña
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowWriteReview(false)}
                      className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                    >
                      Cancelar
                    </button>
                  </div>
                </form>
              </div>
            )}

            {/* Filters & Sort */}
            <div className="bg-white rounded-lg shadow p-4">
              <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
                <div className="flex items-center gap-2">
                  <FunnelIcon className="h-5 w-5 text-gray-600" />
                  <select
                    value={filterRating}
                    onChange={(e) => setFilterRating(e.target.value)}
                    className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#003B7A]"
                  >
                    <option value="all">Todas las calificaciones</option>
                    <option value="5">5 estrellas</option>
                    <option value="4">4 estrellas</option>
                    <option value="3">3 estrellas</option>
                    <option value="2">2 estrellas</option>
                    <option value="1">1 estrella</option>
                  </select>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-600">Ordenar por:</span>
                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value)}
                    className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#003B7A]"
                  >
                    <option value="helpful">Más útiles</option>
                    <option value="recent">Más recientes</option>
                    <option value="rating_high">Calificación alta</option>
                    <option value="rating_low">Calificación baja</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Reviews */}
            {filteredReviews.map((review) => (
              <div key={review.id} className="bg-white rounded-lg shadow p-6">
                {/* Review Header */}
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-start gap-3">
                    <div className="w-12 h-12 bg-gradient-to-br from-[#003B7A] to-[#7AB82E] rounded-full flex items-center justify-center text-white font-bold">
                      {review.userName.charAt(0)}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-gray-900">{review.userName}</span>
                        {review.verified && (
                          <CheckCircleIcon className="h-5 w-5 text-[#7AB82E]" title="Compra verificada" />
                        )}
                      </div>
                      <div className="flex items-center gap-2 mt-1">
                        <div className="flex">
                          {[1, 2, 3, 4, 5].map((star) => (
                            <StarSolid
                              key={star}
                              className={`h-4 w-4 ${
                                star <= review.rating ? 'text-yellow-400' : 'text-gray-300'
                              }`}
                            />
                          ))}
                        </div>
                        <span className="text-sm text-gray-500">{review.date}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Review Content */}
                <h4 className="font-bold text-gray-900 mb-2">{review.title}</h4>
                <p className="text-gray-700 mb-4">{review.content}</p>

                {/* Images */}
                {review.images.length > 0 && (
                  <div className="flex gap-2 mb-4">
                    {review.images.map((img, idx) => (
                      <div key={idx} className="w-20 h-20 bg-gray-100 rounded-lg flex items-center justify-center">
                        <PhotoIcon className="h-8 w-8 text-gray-400" />
                      </div>
                    ))}
                  </div>
                )}

                {/* Helpful Votes */}
                <div className="flex items-center gap-4 pt-4 border-t">
                  <span className="text-sm text-gray-600">¿Te resultó útil?</span>
                  <button
                    onClick={() => handleVoteHelpful(review.id, true)}
                    className="flex items-center gap-1 px-3 py-1 text-sm border border-gray-300 rounded-lg hover:bg-gray-50"
                  >
                    <HandThumbUpIcon className="h-4 w-4" />
                    Sí ({review.helpful})
                  </button>
                  <button
                    onClick={() => handleVoteHelpful(review.id, false)}
                    className="flex items-center gap-1 px-3 py-1 text-sm border border-gray-300 rounded-lg hover:bg-gray-50"
                  >
                    <HandThumbDownIcon className="h-4 w-4" />
                    No ({review.notHelpful})
                  </button>
                </div>

                {/* Response from Company */}
                {review.response && (
                  <div className="mt-4 ml-12 bg-blue-50 border-l-4 border-[#003B7A] p-4 rounded">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="font-medium text-[#003B7A]">{review.response.author}</span>
                      <span className="text-sm text-gray-600">{review.response.date}</span>
                    </div>
                    <p className="text-gray-700">{review.response.content}</p>
                  </div>
                )}
              </div>
            ))}

            {filteredReviews.length === 0 && (
              <div className="bg-white rounded-lg shadow p-12 text-center">
                <StarOutline className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600">No hay reseñas con este filtro</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
