'use client';

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Button } from '@/components/ui/Button';
import { Card, CardContent } from '@/components/ui/Card';
import {
  UserGroupIcon,
  HeartIcon,
  ChatBubbleLeftIcon,
  ShareIcon,
  TrophyIcon,
  CalendarIcon,
  MegaphoneIcon,
  FireIcon,
  SparklesIcon,
} from '@heroicons/react/24/outline';
import { HeartIcon as HeartSolidIcon } from '@heroicons/react/24/solid';
import { toast } from 'sonner';

interface Post {
  id: string;
  type: 'transformation' | 'achievement' | 'event' | 'announcement' | 'milestone';
  author: {
    name: string;
    avatar: string;
    role: string;
    level?: string;
  };
  content: string;
  image?: string;
  likes: number;
  comments: number;
  shares: number;
  timestamp: string;
  isLiked: boolean;
  tags?: string[];
}

const mockPosts: Post[] = [
  {
    id: '1',
    type: 'transformation',
    author: {
      name: 'María Rodríguez',
      avatar: 'https://ui-avatars.com/api/?name=Maria+Rodriguez&background=003B7A&color=fff',
      role: 'Cliente',
    },
    content: '¡3 meses de transformación! 🎉 Bajé 12 kilos, mi energía está por las nubes y me siento increíble. Gracias al combo de Colágeno + Omega 3 + seguir el plan de alimentación. ¡Totalmente recomendado!',
    image: 'https://images.unsplash.com/photo-1571019614242-c5c5dee9f50b?w=800&h=600&fit=crop',
    likes: 234,
    comments: 45,
    shares: 23,
    timestamp: '2025-01-25T14:30:00',
    isLiked: false,
    tags: ['Transformación', 'Pérdida de peso', 'Energía'],
  },
  {
    id: '2',
    type: 'achievement',
    author: {
      name: 'Laura Mendoza',
      avatar: 'https://ui-avatars.com/api/?name=Laura+Mendoza&background=7AB82E&color=fff',
      role: 'Distribuidor',
      level: 'Diamond Elite',
    },
    content: '¡Alcancé el rango Diamond Elite! 💎 Después de 2 años de trabajo constante, apoyo a mi equipo y enfoque en ayudar a transformar vidas. Gracias a mis 45 distribuidores por confiar en esta oportunidad. ¡Vamos por más!',
    image: 'https://images.unsplash.com/photo-1492684223066-81342ee5ff30?w=800&h=600&fit=crop',
    likes: 567,
    comments: 123,
    shares: 89,
    timestamp: '2025-01-25T10:15:00',
    isLiked: true,
    tags: ['Logro', 'Diamond Elite', 'Liderazgo'],
  },
  {
    id: '3',
    type: 'event',
    author: {
      name: 'Tonic Life México',
      avatar: 'https://ui-avatars.com/api/?name=TL&background=003B7A&color=fff',
      role: 'Oficial',
    },
    content: '📅 ¡Convención Internacional 2025! Del 15-17 de Marzo en Cancún. Confirma tu asistencia ahora y recibe 20% de descuento en hospedaje. Habrá capacitaciones, reconocimientos y muchas sorpresas. ¡No te lo pierdas!',
    image: 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=800&h=600&fit=crop',
    likes: 892,
    comments: 234,
    shares: 445,
    timestamp: '2025-01-24T16:00:00',
    isLiked: false,
    tags: ['Evento', 'Convención', 'Cancún'],
  },
  {
    id: '4',
    type: 'milestone',
    author: {
      name: 'Carlos Ramírez',
      avatar: 'https://ui-avatars.com/api/?name=Carlos+Ramirez&background=003B7A&color=fff',
      role: 'Cliente',
    },
    content: '¡100 días de racha completados! 🔥 Tomando mis suplementos diariamente sin falta. Mis niveles de energía han mejorado un 200%, duermo mejor y mi rendimiento en el gym es impresionante. La consistencia es la clave.',
    likes: 156,
    comments: 34,
    shares: 12,
    timestamp: '2025-01-24T09:20:00',
    isLiked: true,
    tags: ['Racha', 'Consistencia', 'Energía'],
  },
  {
    id: '5',
    type: 'announcement',
    author: {
      name: 'Tonic Life México',
      avatar: 'https://ui-avatars.com/api/?name=TL&background=003B7A&color=fff',
      role: 'Oficial',
    },
    content: '🎊 ¡NUEVO LANZAMIENTO! Presentamos nuestra línea Premium de Proteína Vegetal con 5 sabores increíbles. Pre-ordena ahora con 15% de descuento. Disponible desde el 1 de Febrero.',
    image: 'https://images.unsplash.com/photo-1593095948071-474c5cc2989d?w=800&h=600&fit=crop',
    likes: 1234,
    comments: 345,
    shares: 567,
    timestamp: '2025-01-23T12:00:00',
    isLiked: false,
    tags: ['Nuevo Producto', 'Proteína', 'Vegano'],
  },
  {
    id: '6',
    type: 'transformation',
    author: {
      name: 'Diana Flores',
      avatar: 'https://ui-avatars.com/api/?name=Diana+Flores&background=7AB82E&color=fff',
      role: 'Distribuidor',
      level: 'Gold',
    },
    content: 'Antes vs Ahora 💪 6 meses usando Colágeno Hidrolizado diariamente. La diferencia en mi piel, cabello y uñas es notable. Mis clientas también están viendo resultados increíbles. ¡El poder de la constancia!',
    image: 'https://images.unsplash.com/photo-1594381898411-846e7d193883?w=800&h=600&fit=crop',
    likes: 423,
    comments: 78,
    shares: 45,
    timestamp: '2025-01-23T08:45:00',
    isLiked: false,
    tags: ['Colágeno', 'Piel', 'Antes y Después'],
  },
];

const trendingTopics = [
  { name: 'Transformación90Días', count: 1234 },
  { name: 'ConvenciónCancún2025', count: 892 },
  { name: 'DetoxChallenge', count: 567 },
  { name: 'DiamondElite', count: 445 },
  { name: 'EnergíaNatural', count: 334 },
];

export default function ComunidadPage() {
  const [posts, setPosts] = useState(mockPosts);
  const [filter, setFilter] = useState<'all' | 'transformation' | 'achievement' | 'event' | 'announcement' | 'milestone'>('all');

  const filteredPosts = filter === 'all' ? posts : posts.filter(p => p.type === filter);

  const handleLike = (postId: string) => {
    setPosts(posts.map(post =>
      post.id === postId
        ? { ...post, isLiked: !post.isLiked, likes: post.isLiked ? post.likes - 1 : post.likes + 1 }
        : post
    ));
  };

  const handleComment = (postId: string) => {
    toast.info('Función de comentarios próximamente disponible');
  };

  const handleShare = (postId: string) => {
    toast.success('Enlace copiado al portapapeles');
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'transformation':
        return <SparklesIcon className="h-5 w-5 text-purple-600" />;
      case 'achievement':
        return <TrophyIcon className="h-5 w-5 text-yellow-600" />;
      case 'event':
        return <CalendarIcon className="h-5 w-5 text-blue-600" />;
      case 'announcement':
        return <MegaphoneIcon className="h-5 w-5 text-red-600" />;
      case 'milestone':
        return <FireIcon className="h-5 w-5 text-orange-600" />;
      default:
        return null;
    }
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'transformation':
        return 'Transformación';
      case 'achievement':
        return 'Logro';
      case 'event':
        return 'Evento';
      case 'announcement':
        return 'Anuncio';
      case 'milestone':
        return 'Hito';
      default:
        return type;
    }
  };

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffHours / 24);

    if (diffHours < 1) return 'Hace unos minutos';
    if (diffHours < 24) return `Hace ${diffHours}h`;
    if (diffDays === 1) return 'Ayer';
    if (diffDays < 7) return `Hace ${diffDays} días`;
    return date.toLocaleDateString('es-MX', { month: 'short', day: 'numeric' });
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-gradient-to-r from-[#003B7A] to-[#003B7A]/90 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <div className="text-center">
            <div className="flex justify-center mb-4">
              <UserGroupIcon className="h-16 w-16" />
            </div>
            <h1 className="text-5xl font-bold mb-4">Comunidad Tonic Life</h1>
            <p className="text-xl text-white/90 mb-8 max-w-2xl mx-auto">
              Historias de transformación, logros increíbles y una comunidad que se apoya mutuamente
            </p>
            <div className="flex justify-center gap-4">
              <Link href="/testimonios">
                <Button variant="secondary" size="lg">
                  Ver Testimonios
                </Button>
              </Link>
              <Link href="/historias">
                <Button variant="primary" size="lg">
                  Historias de Éxito
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid lg:grid-cols-3 gap-8">
          {/* Sidebar */}
          <div className="lg:col-span-1 space-y-6">
            {/* Filters */}
            <Card>
              <CardContent className="p-6">
                <h3 className="font-bold text-gray-900 mb-4">Filtrar Publicaciones</h3>
                <div className="space-y-2">
                  {[
                    { id: 'all' as const, label: 'Todas', icon: UserGroupIcon },
                    { id: 'transformation' as const, label: 'Transformaciones', icon: SparklesIcon },
                    { id: 'achievement' as const, label: 'Logros', icon: TrophyIcon },
                    { id: 'event' as const, label: 'Eventos', icon: CalendarIcon },
                    { id: 'announcement' as const, label: 'Anuncios', icon: MegaphoneIcon },
                    { id: 'milestone' as const, label: 'Hitos', icon: FireIcon },
                  ].map((item) => {
                    const IconComponent = item.icon;
                    return (
                      <button
                        key={item.id}
                        onClick={() => setFilter(item.id)}
                        className={`w-full flex items-center gap-3 px-4 py-2 rounded-lg transition-colors ${
                          filter === item.id
                            ? 'bg-[#003B7A] text-white'
                            : 'hover:bg-gray-100 text-gray-700'
                        }`}
                      >
                        <IconComponent className="h-5 w-5" />
                        <span className="text-sm font-medium">{item.label}</span>
                      </button>
                    );
                  })}
                </div>
              </CardContent>
            </Card>

            {/* Trending Topics */}
            <Card>
              <CardContent className="p-6">
                <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
                  <FireIcon className="h-5 w-5 text-orange-600" />
                  Temas Trending
                </h3>
                <div className="space-y-3">
                  {trendingTopics.map((topic) => (
                    <div key={topic.name} className="flex items-center justify-between">
                      <span className="text-sm text-[#003B7A] font-medium hover:underline cursor-pointer">
                        #{topic.name}
                      </span>
                      <span className="text-xs text-gray-500">{topic.count} posts</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* CTA Card */}
            <Card className="bg-gradient-to-br from-[#003B7A] to-[#003B7A]/90 text-white">
              <CardContent className="p-6">
                <h3 className="font-bold text-lg mb-2">¿Tienes una historia que contar?</h3>
                <p className="text-white/90 text-sm mb-4">
                  Comparte tu transformación y ayuda a inspirar a otros
                </p>
                <Button variant="secondary" className="w-full">
                  Compartir Mi Historia
                </Button>
              </CardContent>
            </Card>
          </div>

          {/* Feed */}
          <div className="lg:col-span-2 space-y-6">
            {filteredPosts.map((post) => (
              <Card key={post.id}>
                <CardContent className="p-6">
                  {/* Author Info */}
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <Image
                        src={post.author.avatar}
                        alt={post.author.name}
                        width={48}
                        height={48}
                        className="rounded-full"
                      />
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="font-bold text-gray-900">{post.author.name}</h4>
                          {post.author.level && (
                            <span className="inline-flex items-center px-2 py-0.5 bg-purple-100 text-purple-700 rounded-full text-xs font-medium">
                              {post.author.level}
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-gray-600">{post.author.role}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-gray-500">
                      {getTypeIcon(post.type)}
                      <span>{formatTimestamp(post.timestamp)}</span>
                    </div>
                  </div>

                  {/* Type Badge */}
                  <div className="mb-3">
                    <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium ${
                      post.type === 'transformation' ? 'bg-purple-100 text-purple-700' :
                      post.type === 'achievement' ? 'bg-yellow-100 text-yellow-700' :
                      post.type === 'event' ? 'bg-blue-100 text-blue-700' :
                      post.type === 'announcement' ? 'bg-red-100 text-red-700' :
                      'bg-orange-100 text-orange-700'
                    }`}>
                      {getTypeIcon(post.type)}
                      {getTypeLabel(post.type)}
                    </span>
                  </div>

                  {/* Content */}
                  <p className="text-gray-800 mb-4 text-lg leading-relaxed">{post.content}</p>

                  {/* Image */}
                  {post.image && (
                    <div className="mb-4 rounded-lg overflow-hidden">
                      <Image
                        src={post.image}
                        alt="Post image"
                        width={800}
                        height={600}
                        className="w-full object-cover"
                      />
                    </div>
                  )}

                  {/* Tags */}
                  {post.tags && (
                    <div className="flex flex-wrap gap-2 mb-4">
                      {post.tags.map((tag) => (
                        <span
                          key={tag}
                          className="text-xs text-[#003B7A] bg-blue-50 px-2 py-1 rounded-full hover:bg-blue-100 cursor-pointer"
                        >
                          #{tag}
                        </span>
                      ))}
                    </div>
                  )}

                  {/* Interaction Bar */}
                  <div className="border-t pt-4 flex items-center justify-between">
                    <div className="flex items-center gap-6">
                      <button
                        onClick={() => handleLike(post.id)}
                        className="flex items-center gap-2 text-gray-600 hover:text-red-600 transition-colors"
                      >
                        {post.isLiked ? (
                          <HeartSolidIcon className="h-6 w-6 text-red-600" />
                        ) : (
                          <HeartIcon className="h-6 w-6" />
                        )}
                        <span className="text-sm font-medium">{post.likes}</span>
                      </button>
                      <button
                        onClick={() => handleComment(post.id)}
                        className="flex items-center gap-2 text-gray-600 hover:text-[#003B7A] transition-colors"
                      >
                        <ChatBubbleLeftIcon className="h-6 w-6" />
                        <span className="text-sm font-medium">{post.comments}</span>
                      </button>
                      <button
                        onClick={() => handleShare(post.id)}
                        className="flex items-center gap-2 text-gray-600 hover:text-[#7AB82E] transition-colors"
                      >
                        <ShareIcon className="h-6 w-6" />
                        <span className="text-sm font-medium">{post.shares}</span>
                      </button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}

            {filteredPosts.length === 0 && (
              <Card>
                <CardContent className="p-12">
                  <div className="text-center">
                    <UserGroupIcon className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-xl font-bold text-gray-900 mb-2">
                      No hay publicaciones
                    </h3>
                    <p className="text-gray-600">
                      Intenta con otro filtro para ver más contenido
                    </p>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Load More */}
            {filteredPosts.length > 0 && (
              <div className="text-center">
                <Button variant="outline" onClick={() => toast.info('Cargando más publicaciones...')}>
                  Cargar Más
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
