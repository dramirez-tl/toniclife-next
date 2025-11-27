'use client';

import { useState } from 'react';
import { CogIcon, CheckCircleIcon, XCircleIcon } from '@heroicons/react/24/outline';
import { toast } from 'sonner';

export default function CookiesPage() {
  const [cookiePreferences, setCookiePreferences] = useState({
    essential: true,
    performance: true,
    functional: true,
    marketing: false
  });

  const handleSavePreferences = () => {
    toast.success('Preferencias de cookies guardadas');
    // In a real app, save to localStorage or backend
  };

  const handleAcceptAll = () => {
    setCookiePreferences({
      essential: true,
      performance: true,
      functional: true,
      marketing: true
    });
    toast.success('Todas las cookies aceptadas');
  };

  const handleRejectAll = () => {
    setCookiePreferences({
      essential: true,
      performance: false,
      functional: false,
      marketing: false
    });
    toast.success('Cookies opcionales rechazadas');
  };

  const cookieTypes = [
    {
      id: 'essential',
      title: 'Cookies Esenciales',
      description: 'Estas cookies son necesarias para el funcionamiento básico del sitio web y no pueden ser desactivadas.',
      required: true,
      examples: [
        'Gestión de sesión de usuario',
        'Autenticación y seguridad',
        'Carrito de compras',
        'Preferencias de idioma',
        'Cookies de consentimiento'
      ],
      duration: 'Sesión o hasta 1 año'
    },
    {
      id: 'performance',
      title: 'Cookies de Rendimiento',
      description: 'Estas cookies nos ayudan a entender cómo los visitantes interactúan con nuestro sitio web.',
      required: false,
      examples: [
        'Google Analytics',
        'Análisis de comportamiento del usuario',
        'Medición de velocidad de carga',
        'Identificación de errores técnicos',
        'Métricas de uso del sitio'
      ],
      duration: 'Hasta 2 años'
    },
    {
      id: 'functional',
      title: 'Cookies de Funcionalidad',
      description: 'Estas cookies permiten que el sitio web recuerde sus elecciones y proporcione funciones mejoradas.',
      required: false,
      examples: [
        'Recordar productos favoritos',
        'Personalización de contenido',
        'Configuración de visualización',
        'Historial de navegación',
        'Preferencias guardadas'
      ],
      duration: 'Hasta 1 año'
    },
    {
      id: 'marketing',
      title: 'Cookies de Marketing',
      description: 'Estas cookies se utilizan para mostrar anuncios relevantes y medir la efectividad de nuestras campañas.',
      required: false,
      examples: [
        'Facebook Pixel',
        'Google Ads',
        'Remarketing',
        'Seguimiento de conversiones',
        'Anuncios personalizados'
      ],
      duration: 'Hasta 2 años'
    }
  ];

  const sections = [
    {
      title: '¿Qué son las Cookies?',
      content: `Las cookies son pequeños archivos de texto que se almacenan en su dispositivo (computadora, tableta o teléfono móvil) cuando visita un sitio web. Las cookies permiten que el sitio web recuerde sus acciones y preferencias durante un período de tiempo, por lo que no tiene que volver a configurarlas cada vez que regresa al sitio o navega de una página a otra.`
    },
    {
      title: '¿Cómo Utilizamos las Cookies?',
      content: `Utilizamos cookies para varios propósitos:

• **Operación del Sitio:** Para que nuestro sitio web funcione correctamente
• **Seguridad:** Para proteger su cuenta y detectar actividad fraudulenta
• **Personalización:** Para recordar sus preferencias y personalizar su experiencia
• **Análisis:** Para entender cómo se utiliza nuestro sitio y mejorarlo
• **Marketing:** Para mostrarle contenido y anuncios relevantes

Algunas cookies son esenciales para el funcionamiento del sitio, mientras que otras son opcionales y requieren su consentimiento.`
    },
    {
      title: 'Cookies de Terceros',
      content: `Además de nuestras propias cookies, también utilizamos cookies de terceros confiables:

• **Google Analytics:** Para análisis de tráfico y comportamiento
• **Facebook Pixel:** Para remarketing y análisis de campañas
• **Stripe/PayPal:** Para procesamiento seguro de pagos
• **Hotjar:** Para mapas de calor y análisis de usabilidad
• **Intercom:** Para chat en vivo y soporte al cliente

Estas empresas pueden usar sus propias cookies de acuerdo con sus políticas de privacidad.`
    },
    {
      title: 'Gestión de Cookies',
      content: `Usted tiene control sobre las cookies que acepta. Puede:

• **Aceptar todas las cookies:** Para una experiencia completa del sitio
• **Rechazar cookies opcionales:** Solo cookies esenciales
• **Personalizar preferencias:** Elegir qué tipos de cookies acepta
• **Cambiar en cualquier momento:** A través de esta página

También puede gestionar cookies directamente desde su navegador:
• Chrome: Configuración > Privacidad y seguridad > Cookies
• Firefox: Opciones > Privacidad y seguridad
• Safari: Preferencias > Privacidad
• Edge: Configuración > Privacidad y servicios

Tenga en cuenta que bloquear ciertas cookies puede afectar la funcionalidad del sitio.`
    },
    {
      title: 'Duración de las Cookies',
      content: `Las cookies que utilizamos tienen diferentes períodos de duración:

• **Cookies de Sesión:** Se eliminan cuando cierra su navegador
• **Cookies Persistentes:** Permanecen en su dispositivo por un período específico (desde días hasta años)

La duración específica de cada cookie se indica en la sección de gestión de preferencias.`
    }
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Hero */}
      <div className="bg-gradient-to-r from-[#003B7A] to-[#7AB82E] text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <div className="text-center">
            <CogIcon className="h-16 w-16 mx-auto mb-6" />
            <h1 className="text-5xl font-bold mb-6">Política de Cookies</h1>
            <p className="text-xl text-blue-100 max-w-3xl mx-auto">
              Última actualización: Enero 2024
            </p>
          </div>
        </div>
      </div>

      {/* Cookie Preferences Panel */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 -mt-8 relative z-10 mb-12">
        <div className="bg-white rounded-lg shadow-xl p-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">Gestionar Preferencias de Cookies</h2>

          <div className="space-y-6">
            {cookieTypes.map((type) => (
              <div key={type.id} className="border border-gray-200 rounded-lg p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-lg font-bold text-gray-900">{type.title}</h3>
                      {type.required && (
                        <span className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded">
                          Siempre activas
                        </span>
                      )}
                    </div>
                    <p className="text-gray-600 mb-3">{type.description}</p>
                    <div className="mb-3">
                      <p className="text-sm font-medium text-gray-700 mb-1">Ejemplos:</p>
                      <ul className="text-sm text-gray-600 space-y-1">
                        {type.examples.map((example, idx) => (
                          <li key={idx}>• {example}</li>
                        ))}
                      </ul>
                    </div>
                    <p className="text-xs text-gray-500">Duración: {type.duration}</p>
                  </div>
                  <div className="ml-4">
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={cookiePreferences[type.id as keyof typeof cookiePreferences]}
                        onChange={(e) => {
                          if (!type.required) {
                            setCookiePreferences({
                              ...cookiePreferences,
                              [type.id]: e.target.checked
                            });
                          }
                        }}
                        disabled={type.required}
                        className="sr-only peer"
                      />
                      <div className="w-14 h-7 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:start-[4px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-6 after:w-6 after:transition-all peer-checked:bg-[#7AB82E]"></div>
                    </label>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-8 flex flex-col sm:flex-row gap-4 justify-center">
            <button
              onClick={handleAcceptAll}
              className="px-8 py-3 bg-[#7AB82E] text-white font-bold rounded-lg hover:bg-[#6ba625] transition-colors"
            >
              Aceptar Todas
            </button>
            <button
              onClick={handleSavePreferences}
              className="px-8 py-3 bg-[#003B7A] text-white font-bold rounded-lg hover:bg-[#002855] transition-colors"
            >
              Guardar Preferencias
            </button>
            <button
              onClick={handleRejectAll}
              className="px-8 py-3 bg-gray-600 text-white font-bold rounded-lg hover:bg-gray-700 transition-colors"
            >
              Rechazar Opcionales
            </button>
          </div>
        </div>
      </div>

      {/* Information Content */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="bg-white rounded-lg shadow-lg p-8 md:p-12">
          <div className="prose prose-lg max-w-none">
            <div className="space-y-8">
              {sections.map((section, index) => (
                <div key={index} className="border-l-4 border-[#7AB82E] pl-6">
                  <h2 className="text-2xl font-bold text-gray-900 mb-4">{section.title}</h2>
                  <div className="text-gray-700 whitespace-pre-line leading-relaxed">
                    {section.content}
                  </div>
                </div>
              ))}

              <div className="border-l-4 border-[#7AB82E] pl-6">
                <h2 className="text-2xl font-bold text-gray-900 mb-4">Contacto</h2>
                <p className="text-gray-700">
                  Si tiene preguntas sobre nuestra Política de Cookies, puede contactarnos en:
                </p>
                <div className="mt-4 space-y-1 text-gray-700">
                  <p><strong>Email:</strong> privacidad@toniclife.com</p>
                  <p><strong>Teléfono:</strong> +52 55 1234 5678</p>
                  <p><strong>Dirección:</strong> Av. Insurgentes Sur 1602, Crédito Constructor, Benito Juárez, 03940 CDMX, México</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Related Links */}
        <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-4">
          <a
            href="/terminos"
            className="block p-6 bg-white rounded-lg shadow hover:shadow-lg transition-shadow text-center"
          >
            <h3 className="font-bold text-gray-900 mb-2">Términos y Condiciones</h3>
            <p className="text-gray-600 text-sm">Reglas de uso del sitio</p>
          </a>
          <a
            href="/privacidad"
            className="block p-6 bg-white rounded-lg shadow hover:shadow-lg transition-shadow text-center"
          >
            <h3 className="font-bold text-gray-900 mb-2">Política de Privacidad</h3>
            <p className="text-gray-600 text-sm">Cómo protegemos tus datos</p>
          </a>
        </div>
      </div>
    </div>
  );
}
