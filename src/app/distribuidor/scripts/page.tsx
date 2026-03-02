'use client';

import { useState, Suspense } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/Button';
import { Card, CardContent } from '@/components/ui/Card';
import {
  ClipboardDocumentListIcon,
  PhoneIcon,
  ChatBubbleLeftIcon,
  EnvelopeIcon,
  MagnifyingGlassIcon,
  StarIcon,
  ClockIcon,
  CheckCircleIcon,
  PlusIcon,
  PencilIcon,
  TrashIcon,
  ShareIcon,
} from '@heroicons/react/24/outline';
import { StarIcon as StarSolidIcon } from '@heroicons/react/24/solid';
import { SearchableSelect } from '@/components/ui/SearchableSelect';
import { useQueryFilters } from '@/hooks/useQueryFilters';
import { toast } from 'sonner';

const mockScripts = [
  {
    id: '1',
    title: 'Llamada de Prospección Inicial',
    type: 'Llamada',
    category: 'Prospección',
    content: `¡Hola [Nombre]! Soy [Tu Nombre] de Tonic Life.

Vi que estabas interesado/a en mejorar tu salud y bienestar, y quería compartir contigo algo que está transformando la vida de muchas personas.

¿Tienes 5 minutos para que te cuente?

[Esperar respuesta]

Genial. Trabajo con productos de suplementación de altísima calidad que están ayudando a personas a:
• Fortalecer su sistema inmunológico
• Tener más energía durante el día
• Mejorar su descanso nocturno

Lo mejor es que son 100% naturales y respaldados por estudios científicos.

¿Cuál de estos beneficios te interesaría más para ti?`,
    tags: ['Prospección', 'Primera llamada', 'Productos'],
    isFavorite: true,
    lastUsed: '2025-01-24',
    useCount: 47,
    rating: 4.8,
  },
  {
    id: '2',
    title: 'Mensaje WhatsApp - Seguimiento',
    type: 'WhatsApp',
    category: 'Seguimiento',
    content: `Hola [Nombre] 👋

¿Cómo estás? Espero que muy bien.

Te escribo porque hace unos días platicamos sobre [Producto/Tema] y quería saber si ya tuviste oportunidad de revisar la información que te compartí.

¿Tienes alguna duda que pueda resolver? 😊

Me encantaría ayudarte a dar ese primer paso hacia [Beneficio Principal].

¿Cuándo te vendría bien una videollamada de 15 minutos?`,
    tags: ['Seguimiento', 'WhatsApp', 'Recordatorio'],
    isFavorite: true,
    lastUsed: '2025-01-23',
    useCount: 63,
    rating: 4.9,
  },
  {
    id: '3',
    title: 'Correo - Presentación del Negocio',
    type: 'Correo',
    category: 'Oportunidad de Negocio',
    content: `Asunto: Una oportunidad que está cambiando vidas

Estimado/a [Nombre],

Me gustaría compartir contigo una oportunidad que está transformando la vida de miles de personas en toda Latinoamérica.

Tonic Life es más que una empresa de productos de bienestar, es una comunidad de emprendedores que están:

✓ Generando ingresos adicionales desde casa
✓ Ayudando a otros a mejorar su salud
✓ Construyendo un negocio propio con bajo riesgo

Nuestro plan de compensación te permite ganar hasta 25% en comisiones directas, más bonos adicionales por el crecimiento de tu equipo.

¿Te gustaría conocer más? Preparé una breve presentación que te mostrará cómo funciona.

¿Cuándo podríamos agendar una videollamada de 20 minutos?

Saludos cordiales,
[Tu Nombre]
[Tu Contacto]`,
    tags: ['Negocio', 'Correo', 'Reclutamiento'],
    isFavorite: false,
    lastUsed: '2025-01-20',
    useCount: 29,
    rating: 4.6,
  },
  {
    id: '4',
    title: 'Manejo de Objeciones - Precio',
    type: 'Script',
    category: 'Objeciones',
    content: `OBJECIÓN: "Está muy caro"

RESPUESTA:

Entiendo completamente tu preocupación sobre el precio, [Nombre]. Es una reacción muy válida.

Déjame preguntarte algo: ¿cuánto valoras tu salud?

[Esperar respuesta]

Exacto. Mira, si dividimos el precio entre 30 días, estamos hablando de [cantidad] pesos al día. Menos que un café.

Pero la diferencia es que este café no solo te da energía momentánea, sino que:
• Fortalece tu sistema inmunológico
• Mejora tu calidad de vida a largo plazo
• Puede prevenir gastos médicos futuros

Además, piensa en todo el dinero que gastas cuando te enfermas: medicinas, consultas, días sin trabajar...

¿No crees que invertir [cantidad] pesos al día en tu salud es más inteligente que gastarlo después en remediar problemas?`,
    tags: ['Objeciones', 'Precio', 'Cierre'],
    isFavorite: true,
    lastUsed: '2025-01-25',
    useCount: 85,
    rating: 4.9,
  },
  {
    id: '5',
    title: 'WhatsApp - Cliente Feliz Referidos',
    type: 'WhatsApp',
    category: 'Referidos',
    content: `Hola [Nombre] 👋

¡Me da mucho gusto saber que estás feliz con los resultados de [Producto]! 🎉

Tengo una pregunta: ¿Conoces a alguien que también quisiera sentirse tan bien como tú?

Podría ser algún familiar, amigo/a o compañero/a de trabajo que esté buscando [Beneficio del producto].

Si me recomiendas con 3 personas y ellos compran, tú recibes [Beneficio/Descuento] en tu próxima compra 😊

¿En quién estás pensando?`,
    tags: ['Referidos', 'Cliente actual', 'Incentivos'],
    isFavorite: false,
    lastUsed: '2025-01-22',
    useCount: 41,
    rating: 4.7,
  },
  {
    id: '6',
    title: 'Llamada - Cierre de Venta',
    type: 'Llamada',
    category: 'Cierre',
    content: `[Nombre], basado en todo lo que platicamos, creo que [Producto] es perfecto para ti porque:

1. [Beneficio específico para su situación]
2. [Segundo beneficio]
3. [Tercer beneficio]

Ahora mismo tenemos una promoción especial donde si ordenas hoy, recibes [Beneficio promocional].

La pregunta no es si te va a funcionar, porque ya viste todos los testimonios. La pregunta es: ¿quieres empezar este lunes o prefieres esperar al siguiente mes?

[PAUSA - Esperar respuesta]

CIERRE ALTERNATIVO:
Perfecto, entonces voy a apartar tu pedido. ¿Prefieres que te llegue a tu casa o a tu oficina?`,
    tags: ['Cierre', 'Venta', 'Urgencia'],
    isFavorite: true,
    lastUsed: '2025-01-24',
    useCount: 52,
    rating: 4.8,
  },
  {
    id: '7',
    title: 'Manejo de Objeciones - Tiempo',
    type: 'Script',
    category: 'Objeciones',
    content: `OBJECIÓN: "No tengo tiempo para un negocio"

RESPUESTA:

Te entiendo perfectamente, [Nombre]. Todos estamos ocupados hoy en día.

Pero déjame compartir algo: precisamente por eso creé este negocio.

Este no es un trabajo tradicional donde necesitas estar 8 horas. Es totalmente flexible:
• Puedes trabajar desde tu celular
• Decides tus propios horarios
• Inviertes el tiempo que TÚ quieras

La mayoría de mis distribuidores exitosos empezaron con solo 1-2 horas al día mientras mantenían su trabajo.

La pregunta real es: ¿puedes darte el lujo de NO tener un ingreso adicional?

¿Qué tal si empezamos poco a poco? Dedica 30 minutos al día durante una semana y vemos qué pasa. ¿Qué dices?`,
    tags: ['Objeciones', 'Tiempo', 'Negocio'],
    isFavorite: false,
    lastUsed: '2025-01-19',
    useCount: 38,
    rating: 4.5,
  },
  {
    id: '8',
    title: 'Correo - Reactivación Cliente Inactivo',
    type: 'Correo',
    category: 'Reactivación',
    content: `Asunto: Te extrañamos, [Nombre] 💚

Hola [Nombre],

¡Espero que estés muy bien!

Noté que hace tiempo que no hacemos un pedido juntos y quería saber cómo estás.

¿Los productos te funcionaron bien? ¿Ya se te acabaron? ¿O hay algo en lo que pueda ayudarte?

Este mes tenemos una promoción especial para clientes como tú:
[Detalle de la promoción]

Además, acabamos de lanzar [Nuevo producto] que estoy seguro/a te va a encantar porque [Beneficio].

¿Te gustaría que agendemos una llamada rápida para ponernos al día?

Quedo atento/a,
[Tu Nombre]`,
    tags: ['Reactivación', 'Correo', 'Promoción'],
    isFavorite: false,
    lastUsed: '2025-01-18',
    useCount: 23,
    rating: 4.4,
  },
];

const scriptTypes = ['Todos', 'Llamada', 'WhatsApp', 'Correo', 'Script'];
const categories = ['Todas', 'Prospección', 'Seguimiento', 'Oportunidad de Negocio', 'Objeciones', 'Cierre', 'Referidos', 'Reactivación'];

export default function ScriptsPage() {
  return <Suspense><ScriptsContent /></Suspense>;
}

function ScriptsContent() {
  const [scripts, setScripts] = useState(mockScripts);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedScript, setSelectedScript] = useState<typeof mockScripts[0] | null>(null);

  const { get, setParams } = useQueryFilters({
    type: 'all',
    category: 'all',
    sortBy: 'popular',
  });

  const filterType = get('type');
  const filterCategory = get('category');
  const sortBy = get('sortBy');

  const filteredScripts = scripts.filter(script => {
    if (searchQuery && !script.title.toLowerCase().includes(searchQuery.toLowerCase()) &&
        !script.content.toLowerCase().includes(searchQuery.toLowerCase()) &&
        !script.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()))) {
      return false;
    }
    if (filterType !== 'all' && script.type !== filterType) return false;
    if (filterCategory !== 'all' && script.category !== filterCategory) return false;
    return true;
  });

  const sortedScripts = [...filteredScripts].sort((a, b) => {
    if (sortBy === 'popular') return b.useCount - a.useCount;
    if (sortBy === 'recent') return new Date(b.lastUsed).getTime() - new Date(a.lastUsed).getTime();
    if (sortBy === 'rating') return b.rating - a.rating;
    if (sortBy === 'alphabetical') return a.title.localeCompare(b.title);
    return 0;
  });

  const handleCopyScript = (script: typeof mockScripts[0]) => {
    navigator.clipboard.writeText(script.content);
    toast.success('Script copiado al portapapeles', {
      description: script.title,
    });
  };

  const handleToggleFavorite = (scriptId: string) => {
    setScripts(scripts.map(s =>
      s.id === scriptId ? { ...s, isFavorite: !s.isFavorite } : s
    ));
    const script = scripts.find(s => s.id === scriptId);
    toast.success(script?.isFavorite ? 'Removido de favoritos' : 'Agregado a favoritos');
  };

  const handleShareScript = (script: typeof mockScripts[0]) => {
    toast.success('Enlace de compartir copiado');
  };

  const stats = {
    total: scripts.length,
    favorites: scripts.filter(s => s.isFavorite).length,
    mostUsed: scripts.sort((a, b) => b.useCount - a.useCount)[0],
    totalUses: scripts.reduce((sum, s) => sum + s.useCount, 0),
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-gradient-to-r from-[#3E667D] to-[#3E667D]/90 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <ClipboardDocumentListIcon className="h-10 w-10" />
                <h1 className="text-4xl font-bold">Biblioteca de Scripts</h1>
              </div>
              <p className="text-white/80 text-lg">
                Plantillas probadas para cada situación de venta
              </p>
            </div>
            <div className="flex gap-3">
              <Link href="/distribuidor">
                <Button variant="secondary">
                  Volver al Panel Principal
                </Button>
              </Link>
              <Button
                variant="primary"
                leftIcon={<PlusIcon className="h-5 w-5" />}
                onClick={() => toast.info('Función próximamente disponible')}
              >
                Crear Script
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 mb-1">Total Scripts</p>
                  <p className="text-3xl font-bold text-gray-900">{stats.total}</p>
                </div>
                <ClipboardDocumentListIcon className="h-12 w-12 text-blue-400" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 mb-1">Favoritos</p>
                  <p className="text-3xl font-bold text-gray-900">{stats.favorites}</p>
                </div>
                <StarSolidIcon className="h-12 w-12 text-yellow-400" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 mb-1">Total Usos</p>
                  <p className="text-3xl font-bold text-gray-900">{stats.totalUses}</p>
                </div>
                <CheckCircleIcon className="h-12 w-12 text-green-400" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-[#C8DDF2] to-[#C8DDF2]/90 text-white">
            <CardContent className="p-6">
              <div>
                <p className="text-sm text-white/80 mb-1">Más Usado</p>
                <p className="text-lg font-bold line-clamp-2">{stats.mostUsed?.title}</p>
                <p className="text-sm text-white/80 mt-1">{stats.mostUsed?.useCount} usos</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card className="mb-6">
          <CardContent className="p-6">
            <div className="space-y-4">
              {/* Search */}
              <div className="relative">
                <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Buscar scripts..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#a7c1e2] focus:border-transparent"
                />
              </div>

              {/* Filters Row */}
              <div className="grid md:grid-cols-4 gap-4">
                <SearchableSelect
                  options={scriptTypes.filter(t => t !== 'Todos').map(type => ({ value: type, label: type }))}
                  value={filterType}
                  onChange={(val) => setParams({ type: val })}
                  allLabel="Todos"
                  allValue="all"
                />

                <SearchableSelect
                  options={categories.filter(c => c !== 'Todas').map(cat => ({ value: cat, label: cat }))}
                  value={filterCategory}
                  onChange={(val) => setParams({ category: val })}
                  allLabel="Todas"
                  allValue="all"
                />

                <SearchableSelect
                  options={[
                    { value: 'popular', label: 'Más Populares' },
                    { value: 'recent', label: 'Más Recientes' },
                    { value: 'rating', label: 'Mejor Calificados' },
                    { value: 'alphabetical', label: 'Alfabético' },
                  ]}
                  value={sortBy}
                  onChange={(val) => setParams({ sortBy: val })}
                  showAllOption={false}
                />

                <Button
                  variant="outline"
                  onClick={() => {
                    setSearchQuery('');
                    setParams({ type: null, category: null, sortBy: null });
                  }}
                >
                  Limpiar Filtros
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Scripts Grid */}
        <div className="grid lg:grid-cols-2 gap-6">
          {sortedScripts.map((script) => {
            const typeIcon =
              script.type === 'Llamada' ? PhoneIcon :
              script.type === 'WhatsApp' ? ChatBubbleLeftIcon :
              script.type === 'Correo' ? EnvelopeIcon :
              ClipboardDocumentListIcon;
            const TypeIcon = typeIcon;

            return (
              <Card key={script.id} className="hover:shadow-lg transition-shadow">
                <CardContent className="p-6">
                  {/* Header */}
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-start gap-3 flex-1">
                      <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                        script.type === 'Llamada' ? 'bg-blue-100' :
                        script.type === 'WhatsApp' ? 'bg-green-100' :
                        script.type === 'Correo' ? 'bg-purple-100' :
                        'bg-gray-100'
                      }`}>
                        <TypeIcon className={`h-5 w-5 ${
                          script.type === 'Llamada' ? 'text-blue-600' :
                          script.type === 'WhatsApp' ? 'text-green-600' :
                          script.type === 'Correo' ? 'text-purple-600' :
                          'text-gray-600'
                        }`} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-bold text-gray-900 mb-1">{script.title}</h3>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                            script.type === 'Llamada' ? 'bg-blue-100 text-blue-800' :
                            script.type === 'WhatsApp' ? 'bg-green-100 text-green-800' :
                            script.type === 'Correo' ? 'bg-purple-100 text-purple-800' :
                            'bg-gray-100 text-gray-800'
                          }`}>
                            {script.type}
                          </span>
                          <span className="text-xs text-gray-600">{script.category}</span>
                        </div>
                      </div>
                    </div>
                    <button
                      onClick={() => handleToggleFavorite(script.id)}
                      className="flex-shrink-0"
                    >
                      {script.isFavorite ? (
                        <StarSolidIcon className="h-6 w-6 text-yellow-400" />
                      ) : (
                        <StarIcon className="h-6 w-6 text-gray-400 hover:text-yellow-400" />
                      )}
                    </button>
                  </div>

                  {/* Content Preview */}
                  <div className="bg-gray-50 rounded-lg p-4 mb-4 max-h-48 overflow-hidden relative">
                    <p className="text-sm text-gray-700 whitespace-pre-line line-clamp-6">
                      {script.content}
                    </p>
                    {script.content.length > 300 && (
                      <div className="absolute bottom-0 left-0 right-0 h-12 bg-gradient-to-t from-gray-50 to-transparent" />
                    )}
                  </div>

                  {/* Tags */}
                  <div className="flex flex-wrap gap-1 mb-4">
                    {script.tags.map(tag => (
                      <span key={tag} className="inline-flex items-center px-2 py-0.5 rounded text-xs bg-white text-gray-700 border border-gray-300">
                        #{tag}
                      </span>
                    ))}
                  </div>

                  {/* Stats */}
                  <div className="flex items-center gap-4 text-xs text-gray-500 mb-4 pb-4 border-b">
                    <span className="flex items-center gap-1">
                      <CheckCircleIcon className="h-4 w-4" />
                      {script.useCount} usos
                    </span>
                    <span className="flex items-center gap-1">
                      <StarSolidIcon className="h-4 w-4 text-yellow-400" />
                      {script.rating}
                    </span>
                    <span className="flex items-center gap-1">
                      <ClockIcon className="h-4 w-4" />
                      {new Date(script.lastUsed).toLocaleDateString('es-MX')}
                    </span>
                  </div>

                  {/* Actions */}
                  <div className="grid grid-cols-2 gap-2">
                    <Button
                      variant="primary"
                      size="sm"
                      leftIcon={<ClipboardDocumentListIcon className="h-4 w-4" />}
                      onClick={() => handleCopyScript(script)}
                    >
                      Copiar Script
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setSelectedScript(script)}
                    >
                      Ver Completo
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      leftIcon={<ShareIcon className="h-4 w-4" />}
                      onClick={() => handleShareScript(script)}
                    >
                      Compartir
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      leftIcon={<PencilIcon className="h-4 w-4" />}
                      onClick={() => toast.info('Función próximamente disponible')}
                    >
                      Editar
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Script Detail Modal */}
        {selectedScript && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <Card className="max-w-3xl w-full max-h-[90vh] overflow-auto">
              <CardContent className="p-6">
                <div className="flex items-start justify-between mb-6">
                  <div className="flex-1">
                    <h2 className="text-2xl font-bold text-gray-900 mb-2">{selectedScript.title}</h2>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium ${
                        selectedScript.type === 'Llamada' ? 'bg-blue-100 text-blue-800' :
                        selectedScript.type === 'WhatsApp' ? 'bg-green-100 text-green-800' :
                        selectedScript.type === 'Correo' ? 'bg-purple-100 text-purple-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {selectedScript.type}
                      </span>
                      <span className="text-sm text-gray-600">{selectedScript.category}</span>
                      <span className="flex items-center gap-1 text-sm text-gray-600">
                        <StarSolidIcon className="h-4 w-4 text-yellow-400" />
                        {selectedScript.rating}
                      </span>
                    </div>
                  </div>
                  <button
                    onClick={() => setSelectedScript(null)}
                    className="text-gray-400 hover:text-gray-600 ml-4"
                  >
                    <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>

                <div className="bg-gray-50 rounded-lg p-6 mb-6">
                  <p className="text-gray-700 whitespace-pre-line">
                    {selectedScript.content}
                  </p>
                </div>

                <div className="flex flex-wrap gap-2 mb-6">
                  {selectedScript.tags.map(tag => (
                    <span key={tag} className="inline-flex items-center px-2 py-1 rounded text-xs bg-white text-gray-700 border border-gray-300">
                      #{tag}
                    </span>
                  ))}
                </div>

                <div className="flex gap-3">
                  <Button
                    variant="primary"
                    className="flex-1"
                    leftIcon={<ClipboardDocumentListIcon className="h-5 w-5" />}
                    onClick={() => {
                      handleCopyScript(selectedScript);
                      setSelectedScript(null);
                    }}
                  >
                    Copiar Script
                  </Button>
                  <Button
                    variant="outline"
                    leftIcon={<ShareIcon className="h-5 w-5" />}
                    onClick={() => handleShareScript(selectedScript)}
                  >
                    Compartir
                  </Button>
                  <Button
                    variant="ghost"
                    onClick={() => handleToggleFavorite(selectedScript.id)}
                  >
                    {selectedScript.isFavorite ? (
                      <StarSolidIcon className="h-5 w-5 text-yellow-400" />
                    ) : (
                      <StarIcon className="h-5 w-5 text-gray-400" />
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}
