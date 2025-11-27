'use client';

import { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import {
  CalendarIcon,
  ClockIcon,
  UserIcon,
  TagIcon,
  ShareIcon,
  HeartIcon,
  BookmarkIcon,
  ChatBubbleLeftIcon,
  ArrowLeftIcon,
  CheckIcon,
} from '@heroicons/react/24/outline';
import {
  HeartIcon as HeartSolidIcon,
  BookmarkIcon as BookmarkSolidIcon,
} from '@heroicons/react/24/solid';
import { toast } from 'sonner';

interface RelatedPost {
  id: string;
  slug: string;
  title: string;
  image: string;
  category: string;
  readTime: number;
}

interface Comment {
  id: string;
  author: {
    name: string;
    avatar: string;
  };
  content: string;
  date: string;
  likes: number;
}

export default function BlogArticlePage({ params }: { params: { slug: string } }) {
  const [isLiked, setIsLiked] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const [likes, setLikes] = useState(892);
  const [showComments, setShowComments] = useState(false);

  // Mock article data (in real app, fetch based on params.slug)
  const article = {
    id: '1',
    slug: params.slug,
    title: '10 Hábitos Matutinos que Transformarán tu Día',
    subtitle: 'Descubre cómo una rutina matutina efectiva puede cambiar tu vida',
    category: 'Estilo de Vida',
    author: {
      name: 'Dra. María Sánchez',
      avatar: '/placeholder-author-1.jpg',
      role: 'Nutricionista Certificada',
      bio: 'Especialista en nutrición deportiva con más de 10 años de experiencia ayudando a personas a alcanzar sus metas de salud y bienestar.'
    },
    image: '/placeholder-blog-hero.jpg',
    date: '2024-01-28',
    readTime: 8,
    views: 12450,
    tags: ['Rutinas', 'Productividad', 'Energía', 'Hábitos Saludables'],
    content: `
      <p class="lead">Los primeros momentos del día pueden establecer el tono para todo lo que sigue. Una rutina matutina bien estructurada no solo aumenta tu energía y productividad, sino que también mejora tu bienestar general.</p>

      <h2>1. Despierta a la Misma Hora Todos los Días</h2>
      <p>La consistencia es clave para regular tu reloj biológico. Intenta despertar a la misma hora incluso los fines de semana. Esto ayuda a tu cuerpo a establecer un ritmo circadiano saludable, lo que resulta en mejor calidad de sueño y más energía durante el día.</p>

      <h2>2. Hidratación Inmediata</h2>
      <p>Después de 7-8 horas de sueño, tu cuerpo está naturalmente deshidratado. Beber un vaso grande de agua (idealmente con limón) al despertar:</p>
      <ul>
        <li>Activa tu metabolismo</li>
        <li>Ayuda a eliminar toxinas</li>
        <li>Mejora la función cerebral</li>
        <li>Aumenta tus niveles de energía</li>
      </ul>

      <h2>3. Movimiento y Estiramiento</h2>
      <p>No necesitas una sesión completa de ejercicio. Simplemente 5-10 minutos de estiramiento o yoga pueden:</p>
      <ul>
        <li>Aumentar el flujo sanguíneo</li>
        <li>Despertar tus músculos</li>
        <li>Reducir el dolor y la rigidez</li>
        <li>Mejorar tu flexibilidad</li>
      </ul>

      <h2>4. Meditación o Mindfulness</h2>
      <p>Dedicar solo 5 minutos a la meditación matutina puede transformar tu día. Los beneficios incluyen:</p>
      <ul>
        <li>Reducción del estrés y la ansiedad</li>
        <li>Mayor claridad mental</li>
        <li>Mejor enfoque y concentración</li>
        <li>Aumento de la autoconciencia</li>
      </ul>

      <h2>5. Desayuno Nutritivo</h2>
      <p>Tu primer comida del día debe incluir:</p>
      <ul>
        <li>Proteínas de calidad (huevos, yogurt griego, proteína en polvo)</li>
        <li>Grasas saludables (aguacate, nueces, semillas)</li>
        <li>Carbohidratos complejos (avena, frutas, pan integral)</li>
        <li>Suplementos esenciales como <strong>multivitamínicos</strong> y <strong>omega-3</strong></li>
      </ul>

      <h2>6. Evita el Teléfono Durante la Primera Hora</h2>
      <p>Resistir la tentación de revisar tu teléfono inmediatamente te permite:</p>
      <ul>
        <li>Comenzar el día sin estrés</li>
        <li>Evitar la sobrecarga de información</li>
        <li>Mantener el enfoque en ti mismo</li>
        <li>Establecer intenciones para el día</li>
      </ul>

      <h2>7. Planificación del Día</h2>
      <p>Dedica 10 minutos a revisar tu agenda y establecer tus 3 prioridades principales del día. Esto te ayuda a:</p>
      <ul>
        <li>Sentirte más organizado y en control</li>
        <li>Reducir el estrés por tareas pendientes</li>
        <li>Aumentar tu productividad</li>
        <li>Lograr más en menos tiempo</li>
      </ul>

      <h2>8. Luz Natural</h2>
      <p>Exponerte a la luz natural temprano en la mañana:</p>
      <ul>
        <li>Regula tu ritmo circadiano</li>
        <li>Mejora tu estado de ánimo</li>
        <li>Aumenta la producción de vitamina D</li>
        <li>Te ayuda a despertar naturalmente</li>
      </ul>

      <h2>9. Afirmaciones Positivas</h2>
      <p>Repetir afirmaciones positivas puede reprogramar tu mentalidad. Algunas ideas:</p>
      <ul>
        <li>"Hoy es un gran día lleno de posibilidades"</li>
        <li>"Tengo la energía y el enfoque para lograr mis metas"</li>
        <li>"Mi cuerpo está sano y fuerte"</li>
        <li>"Atraigo abundancia y éxito"</li>
      </ul>

      <h2>10. Gratitud</h2>
      <p>Termina tu rutina matutina anotando 3 cosas por las que estás agradecido. Esta simple práctica:</p>
      <ul>
        <li>Mejora tu perspectiva general</li>
        <li>Aumenta la felicidad</li>
        <li>Reduce la depresión</li>
        <li>Fortalece las relaciones</li>
      </ul>

      <h2>Conclusión</h2>
      <p>Implementar estos 10 hábitos matutinos no tiene que ser abrumador. Comienza con 2-3 de ellos y gradualmente incorpora más a medida que se conviertan en parte natural de tu rutina. Recuerda, la consistencia es más importante que la perfección.</p>

      <p>Complementa tu rutina matutina con los <strong>suplementos adecuados</strong> de Tonic Life para maximizar tu energía, enfoque y bienestar general. Nuestra línea de productos está diseñada específicamente para apoyar un estilo de vida saludable y activo.</p>
    `
  };

  const relatedPosts: RelatedPost[] = [
    {
      id: '2',
      slug: 'como-mejorar-calidad-sueno',
      title: 'Cómo Mejorar la Calidad de tu Sueño Naturalmente',
      image: '/placeholder-blog-related-1.jpg',
      category: 'Bienestar',
      readTime: 7
    },
    {
      id: '3',
      slug: 'alimentos-energia-natural',
      title: '15 Alimentos que Te Dan Energía Natural',
      image: '/placeholder-blog-related-2.jpg',
      category: 'Nutrición',
      readTime: 6
    },
    {
      id: '4',
      slug: 'meditacion-para-principiantes',
      title: 'Meditación para Principiantes: Guía Paso a Paso',
      image: '/placeholder-blog-related-3.jpg',
      category: 'Bienestar Mental',
      readTime: 5
    }
  ];

  const comments: Comment[] = [
    {
      id: '1',
      author: {
        name: 'Laura Martínez',
        avatar: '/placeholder-commenter-1.jpg'
      },
      content: 'Excelente artículo! Llevo 2 semanas siguiendo estos hábitos y ya noto la diferencia en mi energía y productividad. Especialmente el de evitar el teléfono en la primera hora ha sido transformador.',
      date: '2024-01-29',
      likes: 24
    },
    {
      id: '2',
      author: {
        name: 'Carlos Ruiz',
        avatar: '/placeholder-commenter-2.jpg'
      },
      content: 'Me encanta la idea de la gratitud matutina. Es algo tan simple pero tan poderoso. Gracias por compartir estos consejos prácticos.',
      date: '2024-01-29',
      likes: 18
    },
    {
      id: '3',
      author: {
        name: 'Ana Silva',
        avatar: '/placeholder-commenter-3.jpg'
      },
      content: '¿Cuánto tiempo recomiendas dedicar a toda la rutina? Tengo poco tiempo en las mañanas pero quiero implementar estos hábitos.',
      date: '2024-01-28',
      likes: 12
    }
  ];

  const handleLike = () => {
    setIsLiked(!isLiked);
    setLikes(isLiked ? likes - 1 : likes + 1);
    toast.success(isLiked ? 'Like removido' : '¡Gracias por tu like!');
  };

  const handleSave = () => {
    setIsSaved(!isSaved);
    toast.success(isSaved ? 'Artículo removido de guardados' : 'Artículo guardado');
  };

  const handleShare = () => {
    toast.success('Enlace copiado al portapapeles');
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Back Button */}
      <div className="bg-white border-b">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <Link
            href="/blog"
            className="inline-flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors"
          >
            <ArrowLeftIcon className="h-5 w-5" />
            <span>Volver al Blog</span>
          </Link>
        </div>
      </div>

      {/* Hero Image */}
      <div className="relative h-96 bg-gray-900">
        <Image
          src={article.image}
          alt={article.title}
          fill
          className="object-cover opacity-80"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
        <div className="absolute bottom-0 left-0 right-0 p-8">
          <div className="max-w-4xl mx-auto">
            <span className="inline-block px-3 py-1 bg-[#7AB82E] text-white rounded-full text-sm font-medium mb-4">
              {article.category}
            </span>
            <h1 className="text-4xl md:text-5xl font-bold text-white mb-4">
              {article.title}
            </h1>
            {article.subtitle && (
              <p className="text-xl text-gray-200">{article.subtitle}</p>
            )}
          </div>
        </div>
      </div>

      {/* Article Content */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2">
            {/* Article Meta */}
            <div className="bg-white rounded-lg shadow p-6 mb-8">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 rounded-full overflow-hidden">
                    <Image
                      src={article.author.avatar}
                      alt={article.author.name}
                      width={64}
                      height={64}
                      className="object-cover"
                    />
                  </div>
                  <div>
                    <p className="font-bold text-gray-900">{article.author.name}</p>
                    <p className="text-sm text-gray-600">{article.author.role}</p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <button
                    onClick={handleLike}
                    className="flex items-center gap-2 px-4 py-2 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    {isLiked ? (
                      <HeartSolidIcon className="h-6 w-6 text-red-500" />
                    ) : (
                      <HeartIcon className="h-6 w-6 text-gray-600" />
                    )}
                    <span className="font-medium text-gray-900">{likes}</span>
                  </button>
                  <button
                    onClick={handleSave}
                    className="p-2 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    {isSaved ? (
                      <BookmarkSolidIcon className="h-6 w-6 text-[#003B7A]" />
                    ) : (
                      <BookmarkIcon className="h-6 w-6 text-gray-600" />
                    )}
                  </button>
                  <button
                    onClick={handleShare}
                    className="p-2 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    <ShareIcon className="h-6 w-6 text-gray-600" />
                  </button>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-4 text-sm text-gray-600">
                <div className="flex items-center gap-1">
                  <CalendarIcon className="h-4 w-4" />
                  <span>{new Date(article.date).toLocaleDateString('es-ES', { year: 'numeric', month: 'long', day: 'numeric' })}</span>
                </div>
                <div className="flex items-center gap-1">
                  <ClockIcon className="h-4 w-4" />
                  <span>{article.readTime} min de lectura</span>
                </div>
                <div className="flex items-center gap-1">
                  <UserIcon className="h-4 w-4" />
                  <span>{article.views.toLocaleString()} vistas</span>
                </div>
              </div>
            </div>

            {/* Article Body */}
            <div className="bg-white rounded-lg shadow p-8 mb-8">
              <div
                className="prose prose-lg max-w-none"
                dangerouslySetInnerHTML={{ __html: article.content }}
                style={{
                  fontSize: '1.125rem',
                  lineHeight: '1.75',
                  color: '#374151'
                }}
              />
            </div>

            {/* Tags */}
            <div className="bg-white rounded-lg shadow p-6 mb-8">
              <div className="flex items-center gap-2 mb-3">
                <TagIcon className="h-5 w-5 text-gray-600" />
                <span className="font-medium text-gray-900">Tags</span>
              </div>
              <div className="flex flex-wrap gap-2">
                {article.tags.map((tag, index) => (
                  <Link
                    key={index}
                    href={`/blog?tag=${tag}`}
                    className="px-3 py-1 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
                  >
                    {tag}
                  </Link>
                ))}
              </div>
            </div>

            {/* Author Bio */}
            <div className="bg-gradient-to-r from-blue-50 to-green-50 rounded-lg p-6 mb-8">
              <div className="flex items-start gap-4">
                <div className="w-20 h-20 rounded-full overflow-hidden flex-shrink-0">
                  <Image
                    src={article.author.avatar}
                    alt={article.author.name}
                    width={80}
                    height={80}
                    className="object-cover"
                  />
                </div>
                <div>
                  <p className="font-bold text-gray-900 mb-1">Sobre el Autor</p>
                  <p className="text-lg font-bold text-[#003B7A] mb-2">{article.author.name}</p>
                  <p className="text-gray-700">{article.author.bio}</p>
                </div>
              </div>
            </div>

            {/* Comments Section */}
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-bold text-gray-900">
                  Comentarios ({comments.length})
                </h3>
                <button
                  onClick={() => setShowComments(!showComments)}
                  className="text-[#003B7A] hover:text-[#002855] font-medium"
                >
                  {showComments ? 'Ocultar' : 'Mostrar'}
                </button>
              </div>

              {showComments && (
                <>
                  {/* Comment Form */}
                  <div className="mb-6 pb-6 border-b">
                    <textarea
                      placeholder="Escribe tu comentario..."
                      rows={4}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#003B7A] resize-none"
                    />
                    <div className="flex justify-end mt-3">
                      <button className="px-6 py-2 bg-[#003B7A] text-white rounded-lg hover:bg-[#002855] transition-colors">
                        Publicar Comentario
                      </button>
                    </div>
                  </div>

                  {/* Comments List */}
                  <div className="space-y-6">
                    {comments.map((comment) => (
                      <div key={comment.id} className="flex gap-4">
                        <div className="w-12 h-12 rounded-full overflow-hidden flex-shrink-0">
                          <Image
                            src={comment.author.avatar}
                            alt={comment.author.name}
                            width={48}
                            height={48}
                            className="object-cover"
                          />
                        </div>
                        <div className="flex-1">
                          <div className="bg-gray-50 rounded-lg p-4">
                            <p className="font-bold text-gray-900 mb-1">{comment.author.name}</p>
                            <p className="text-gray-700 mb-2">{comment.content}</p>
                            <div className="flex items-center gap-4 text-sm text-gray-600">
                              <span>{new Date(comment.date).toLocaleDateString('es-ES', { month: 'short', day: 'numeric' })}</span>
                              <button className="flex items-center gap-1 hover:text-red-600 transition-colors">
                                <HeartIcon className="h-4 w-4" />
                                <span>{comment.likes}</span>
                              </button>
                              <button className="hover:text-[#003B7A] transition-colors">
                                Responder
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Sidebar */}
          <div className="lg:col-span-1">
            {/* Table of Contents */}
            <div className="bg-white rounded-lg shadow p-6 mb-6 sticky top-4">
              <h3 className="font-bold text-gray-900 mb-4">En Este Artículo</h3>
              <nav className="space-y-2">
                {[
                  'Despierta a la Misma Hora',
                  'Hidratación Inmediata',
                  'Movimiento y Estiramiento',
                  'Meditación o Mindfulness',
                  'Desayuno Nutritivo',
                  'Evita el Teléfono',
                  'Planificación del Día',
                  'Luz Natural',
                  'Afirmaciones Positivas',
                  'Gratitud'
                ].map((item, index) => (
                  <a
                    key={index}
                    href={`#${item.toLowerCase().replace(/\s+/g, '-')}`}
                    className="block text-sm text-gray-600 hover:text-[#003B7A] transition-colors"
                  >
                    {index + 1}. {item}
                  </a>
                ))}
              </nav>
            </div>

            {/* CTA Card */}
            <div className="bg-gradient-to-br from-[#003B7A] to-[#7AB82E] rounded-lg shadow-lg p-6 text-white mb-6">
              <h3 className="text-xl font-bold mb-2">Productos Recomendados</h3>
              <p className="text-blue-100 mb-4">
                Complementa tu rutina matutina con nuestros suplementos premium
              </p>
              <Link
                href="/productos"
                className="block w-full py-3 bg-white text-[#003B7A] font-medium rounded-lg text-center hover:bg-blue-50 transition-colors"
              >
                Ver Productos
              </Link>
            </div>
          </div>
        </div>

        {/* Related Posts */}
        <div className="mt-12">
          <h3 className="text-2xl font-bold text-gray-900 mb-6">Artículos Relacionados</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {relatedPosts.map((post) => (
              <Link key={post.id} href={`/blog/${post.slug}`}>
                <div className="bg-white rounded-lg shadow hover:shadow-lg transition-shadow cursor-pointer group">
                  <div className="relative h-48">
                    <Image
                      src={post.image}
                      alt={post.title}
                      fill
                      className="object-cover rounded-t-lg group-hover:scale-105 transition-transform duration-300"
                    />
                  </div>
                  <div className="p-4">
                    <span className="text-xs font-medium text-[#7AB82E] mb-2 block">
                      {post.category}
                    </span>
                    <h4 className="font-bold text-gray-900 mb-2 group-hover:text-[#003B7A] transition-colors line-clamp-2">
                      {post.title}
                    </h4>
                    <div className="flex items-center gap-1 text-sm text-gray-600">
                      <ClockIcon className="h-4 w-4" />
                      <span>{post.readTime} min</span>
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </div>

      {/* Custom Styles for Article Content */}
      <style jsx global>{`
        .prose h2 {
          font-size: 1.75rem;
          font-weight: bold;
          color: #003B7A;
          margin-top: 2rem;
          margin-bottom: 1rem;
        }
        .prose p {
          margin-bottom: 1.5rem;
        }
        .prose ul {
          margin-bottom: 1.5rem;
          padding-left: 1.5rem;
        }
        .prose li {
          margin-bottom: 0.5rem;
          position: relative;
        }
        .prose li::marker {
          color: #7AB82E;
        }
        .prose strong {
          color: #003B7A;
          font-weight: 600;
        }
        .prose .lead {
          font-size: 1.25rem;
          color: #4B5563;
          margin-bottom: 2rem;
          font-weight: 500;
        }
      `}</style>
    </div>
  );
}
