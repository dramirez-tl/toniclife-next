'use client';

import { useState, Suspense } from 'react';
import Link from 'next/link';
import { useQueryFilters } from '@/hooks/useQueryFilters';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  ChatBubbleLeftRightIcon,
  PaperAirplaneIcon,
  UserGroupIcon,
  BellIcon,
  MagnifyingGlassIcon,
  PlusIcon,
  PhoneIcon,
  VideoCameraIcon,
  PaperClipIcon,
  FaceSmileIcon,
  EllipsisVerticalIcon,
} from '@heroicons/react/24/outline';
import { CheckIcon } from '@heroicons/react/24/solid';
import { toast } from 'sonner';

const mockConversations = [
  {
    id: '1',
    type: 'direct',
    name: 'Laura Mendoza',
    avatar: 'LM',
    lastMessage: 'Perfecto, nos vemos mañana en la reunión',
    timestamp: '2025-01-25T14:30:00',
    unread: 0,
    online: true,
    role: 'Patrocinador',
  },
  {
    id: '2',
    type: 'group',
    name: 'Equipo CDMX',
    avatar: '👥',
    lastMessage: 'Ana: ¿Alguien tiene el catálogo actualizado?',
    timestamp: '2025-01-25T13:15:00',
    unread: 5,
    members: 12,
  },
  {
    id: '3',
    type: 'direct',
    name: 'Carlos Ruiz',
    avatar: 'CR',
    lastMessage: 'Gracias por el tip del script!',
    timestamp: '2025-01-25T11:20:00',
    unread: 2,
    online: true,
    role: 'Mi Red',
  },
  {
    id: '4',
    type: 'group',
    name: 'Líderes del Mes Enero',
    avatar: '🏆',
    lastMessage: 'Roberto: ¡Felicidades a todos por las metas!',
    timestamp: '2025-01-24T18:45:00',
    unread: 0,
    members: 8,
  },
  {
    id: '5',
    type: 'direct',
    name: 'Diana Flores',
    avatar: 'DF',
    lastMessage: '¿Ya viste los nuevos materiales de marketing?',
    timestamp: '2025-01-24T16:30:00',
    unread: 1,
    online: false,
    role: 'Colega',
  },
  {
    id: '6',
    type: 'group',
    name: 'Nuevos Distribuidores',
    avatar: '⭐',
    lastMessage: 'Tú: Bienvenid@s! Les comparto el video de inducción',
    timestamp: '2025-01-24T10:00:00',
    unread: 0,
    members: 15,
  },
];

const mockMessages = [
  {
    id: '1',
    sender: 'Laura Mendoza',
    content: 'Hola! ¿Cómo va todo con tu equipo?',
    timestamp: '2025-01-25T14:15:00',
    isMe: false,
    avatar: 'LM',
  },
  {
    id: '2',
    sender: 'Tú',
    content: 'Todo muy bien! Este mes vamos súper motivados. Cerramos 3 nuevos distribuidores 🎉',
    timestamp: '2025-01-25T14:18:00',
    isMe: true,
  },
  {
    id: '3',
    sender: 'Laura Mendoza',
    content: 'Excelente! Me da mucho gusto. Recuerda que mañana tenemos la reunión regional a las 10am',
    timestamp: '2025-01-25T14:22:00',
    isMe: false,
    avatar: 'LM',
  },
  {
    id: '4',
    sender: 'Tú',
    content: 'Perfecto, ahí estaré. ¿Necesitas que lleve algo?',
    timestamp: '2025-01-25T14:25:00',
    isMe: true,
  },
  {
    id: '5',
    sender: 'Laura Mendoza',
    content: 'Perfecto, nos vemos mañana en la reunión',
    timestamp: '2025-01-25T14:30:00',
    isMe: false,
    avatar: 'LM',
    read: true,
  },
];

const quickReplies = [
  '👍 Perfecto',
  '🎉 Excelente',
  '📅 ¿Cuándo?',
  '✅ Entendido',
  '💪 ¡Vamos!',
  '🤝 De acuerdo',
];

export default function ComunicacionPage() {
  return <Suspense><ComunicacionContent /></Suspense>;
}

function ComunicacionContent() {
  const [selectedConversation, setSelectedConversation] = useState(mockConversations[0]);
  const [messageInput, setMessageInput] = useState('');
  const { get, setParams } = useQueryFilters({});
  const searchQuery = get('search');

  const filteredConversations = mockConversations.filter(conv =>
    conv.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    conv.lastMessage.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleSendMessage = () => {
    if (!messageInput.trim()) return;

    toast.success('Mensaje enviado');
    setMessageInput('');
  };

  const handleQuickReply = (reply: string) => {
    setMessageInput(reply);
  };

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return 'Ahora';
    if (diffMins < 60) return `${diffMins}m`;
    if (diffHours < 24) return `${diffHours}h`;
    if (diffDays < 7) return `${diffDays}d`;
    return date.toLocaleDateString('es-MX', { month: 'short', day: 'numeric' });
  };

  const totalUnread = mockConversations.reduce((sum, conv) => sum + conv.unread, 0);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-gradient-to-r from-[#3E667D] to-[#3E667D]/90 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <ChatBubbleLeftRightIcon className="h-10 w-10" />
                <h1 className="text-4xl font-bold">Comunicación de Equipo</h1>
              </div>
              <p className="text-white/80 text-lg">
                Mantente conectado con tu red
              </p>
            </div>
            <Link href="/distribuidor">
              <Button variant="secondary">
                Volver al Panel Principal
              </Button>
            </Link>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid lg:grid-cols-12 gap-6 h-[calc(100vh-280px)]">
          {/* Conversations List */}
          <div className="lg:col-span-4">
            <Card className="h-full flex flex-col">
              <CardContent className="p-4 flex flex-col h-full">
                {/* Search & New Chat */}
                <div className="flex gap-2 mb-4">
                  <div className="relative flex-1">
                    <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                    <input
                      type="text"
                      placeholder="Buscar conversaciones..."
                      value={searchQuery}
                      onChange={(e) => setParams({ search: e.target.value })}
                      className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#a7c1e2] focus:border-transparent text-sm"
                    />
                  </div>
                  <Button
                    variant="default"
                    size="sm"
                    onClick={() => toast.info('Función próximamente disponible')}
                  >
                    <PlusIcon className="h-5 w-5" />
                    Nuevo
                  </Button>
                </div>

                {/* Unread Badge */}
                {totalUnread > 0 && (
                  <div className="mb-3 p-2 bg-blue-50 border border-blue-200 rounded-lg flex items-center justify-between">
                    <span className="text-sm text-blue-800 font-medium">
                      {totalUnread} mensajes sin leer
                    </span>
                    <Button variant="ghost" size="sm" onClick={() => toast.info('Marcando todos como leídos')}>
                      Marcar todos
                    </Button>
                  </div>
                )}

                {/* Conversations */}
                <div className="flex-1 overflow-y-auto space-y-1">
                  {filteredConversations.map((conv) => (
                    <button
                      key={conv.id}
                      onClick={() => setSelectedConversation(conv)}
                      className={`w-full flex items-center gap-3 p-3 rounded-lg transition-colors text-left ${
                        selectedConversation.id === conv.id
                          ? 'bg-[#3E667D] text-white'
                          : 'hover:bg-gray-50'
                      }`}
                    >
                      {/* Avatar */}
                      <div className="relative flex-shrink-0">
                        <div className={`w-12 h-12 rounded-full flex items-center justify-center font-bold text-white ${
                          conv.type === 'group'
                            ? 'bg-gradient-to-br from-purple-400 to-purple-600 text-2xl'
                            : 'bg-gradient-to-br from-[#3E667D] to-[#C8DDF2]'
                        }`}>
                          {conv.avatar}
                        </div>
                        {conv.type === 'direct' && conv.online && (
                          <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-white rounded-full" />
                        )}
                        {conv.unread > 0 && (
                          <div className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 rounded-full flex items-center justify-center text-xs text-white font-bold">
                            {conv.unread}
                          </div>
                        )}
                      </div>

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-1">
                          <h3 className={`font-semibold truncate ${
                            selectedConversation.id === conv.id ? 'text-white' : 'text-gray-900'
                          }`}>
                            {conv.name}
                          </h3>
                          <span className={`text-xs ${
                            selectedConversation.id === conv.id ? 'text-white/70' : 'text-gray-500'
                          }`}>
                            {formatTime(conv.timestamp)}
                          </span>
                        </div>
                        <div className="flex items-center justify-between">
                          <p className={`text-sm truncate ${
                            selectedConversation.id === conv.id ? 'text-white/80' : 'text-gray-600'
                          }`}>
                            {conv.lastMessage}
                          </p>
                          {conv.type === 'group' && (
                            <span className={`text-xs ml-2 ${
                              selectedConversation.id === conv.id ? 'text-white/70' : 'text-gray-500'
                            }`}>
                              {conv.members}
                            </span>
                          )}
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Chat Area */}
          <div className="lg:col-span-8">
            <Card className="h-full flex flex-col">
              {/* Chat Header */}
              <div className="border-b p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`w-12 h-12 rounded-full flex items-center justify-center font-bold text-white ${
                      selectedConversation.type === 'group'
                        ? 'bg-gradient-to-br from-purple-400 to-purple-600 text-2xl'
                        : 'bg-gradient-to-br from-[#3E667D] to-[#C8DDF2]'
                    }`}>
                      {selectedConversation.avatar}
                    </div>
                    <div>
                      <h2 className="font-bold text-gray-900">{selectedConversation.name}</h2>
                      <p className="text-sm text-gray-600">
                        {selectedConversation.type === 'direct' && selectedConversation.online && 'En línea'}
                        {selectedConversation.type === 'direct' && !selectedConversation.online && 'Desconectado'}
                        {selectedConversation.type === 'group' && `${selectedConversation.members} miembros`}
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => toast.info('Iniciando llamada')}
                    >
                      <PhoneIcon className="h-5 w-5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => toast.info('Iniciando videollamada')}
                    >
                      <VideoCameraIcon className="h-5 w-5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => toast.info('Abriendo opciones')}
                    >
                      <EllipsisVerticalIcon className="h-5 w-5" />
                    </Button>
                  </div>
                </div>
              </div>

              {/* Messages */}
              <div className="flex-1 overflow-y-auto p-6 space-y-4">
                {mockMessages.map((message) => (
                  <div
                    key={message.id}
                    className={`flex gap-3 ${message.isMe ? 'flex-row-reverse' : ''}`}
                  >
                    {!message.isMe && (
                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#3E667D] to-[#C8DDF2] flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                        {message.avatar}
                      </div>
                    )}
                    <div className={`flex flex-col ${message.isMe ? 'items-end' : 'items-start'} max-w-[70%]`}>
                      {!message.isMe && (
                        <span className="text-xs text-gray-600 mb-1">{message.sender}</span>
                      )}
                      <div className={`rounded-lg px-4 py-2 ${
                        message.isMe
                          ? 'bg-[#3E667D] text-white'
                          : 'bg-gray-100 text-gray-900'
                      }`}>
                        <p className="text-sm whitespace-pre-line">{message.content}</p>
                      </div>
                      <div className="flex items-center gap-1 mt-1">
                        <span className="text-xs text-gray-500">
                          {new Date(message.timestamp).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })}
                        </span>
                        {message.isMe && message.read && (
                          <CheckIcon className="h-3 w-3 text-blue-500" />
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Quick Replies */}
              <div className="border-t px-6 py-2">
                <div className="flex gap-2 overflow-x-auto">
                  {quickReplies.map((reply, index) => (
                    <button
                      key={index}
                      onClick={() => handleQuickReply(reply)}
                      className="px-3 py-1 bg-gray-100 hover:bg-gray-200 rounded-full text-sm whitespace-nowrap transition-colors"
                    >
                      {reply}
                    </button>
                  ))}
                </div>
              </div>

              {/* Message Input */}
              <div className="border-t p-4">
                <div className="flex gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => toast.info('Función próximamente disponible')}
                  >
                    <PaperClipIcon className="h-5 w-5" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => toast.info('Selector de emojis próximamente')}
                  >
                    <FaceSmileIcon className="h-5 w-5" />
                  </Button>
                  <input
                    type="text"
                    placeholder="Escribe un mensaje..."
                    value={messageInput}
                    onChange={(e) => setMessageInput(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                    className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#a7c1e2] focus:border-transparent"
                  />
                  <Button
                    variant="default"
                    onClick={handleSendMessage}
                  >
                    <PaperAirplaneIcon className="h-5 w-5" />
                    Enviar
                  </Button>
                </div>
              </div>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
