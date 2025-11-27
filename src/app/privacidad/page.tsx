'use client';

import { ShieldCheckIcon } from '@heroicons/react/24/outline';

export default function PrivacidadPage() {
  const sections = [
    {
      title: '1. Información que Recopilamos',
      content: `Recopilamos varios tipos de información en relación con su uso de nuestros servicios:

**Información Personal que Usted Proporciona:**
• Nombre completo, dirección de email, número de teléfono
• Dirección de envío y facturación
• Información de pago (procesada de forma segura por terceros)
• Fecha de nacimiento y género (opcional)
• Preferencias de productos y objetivos de salud

**Información Recopilada Automáticamente:**
• Dirección IP y tipo de navegador
• Páginas visitadas y tiempo de permanencia
• Información del dispositivo y sistema operativo
• Cookies y tecnologías similares
• Datos de ubicación geográfica aproximada`
    },
    {
      title: '2. Cómo Utilizamos su Información',
      content: `Utilizamos la información recopilada para:

**Operaciones Comerciales:**
• Procesar y cumplir con sus pedidos
• Gestionar su cuenta y preferencias
• Comunicarnos sobre sus pedidos y cuenta
• Proporcionar servicio al cliente y soporte técnico

**Mejora de Servicios:**
• Personalizar su experiencia en el sitio
• Analizar el uso del sitio y mejorar funcionalidades
• Desarrollar nuevos productos y servicios
• Realizar investigación de mercado

**Marketing y Comunicaciones:**
• Enviar newsletters y ofertas promocionales
• Informar sobre nuevos productos y eventos
• Enviar contenido educativo relevante
• Realizar encuestas de satisfacción

**Legal y Seguridad:**
• Cumplir con obligaciones legales
• Proteger contra fraude y actividades ilegales
• Resolver disputas y hacer cumplir nuestros acuerdos`
    },
    {
      title: '3. Compartir Información con Terceros',
      content: `Podemos compartir su información con terceros en las siguientes circunstancias:

**Proveedores de Servicios:**
• Procesadores de pago (Stripe, PayPal)
• Servicios de envío y logística
• Plataformas de email marketing
• Servicios de análisis (Google Analytics)
• Proveedores de hosting y almacenamiento en la nube

**Requisitos Legales:**
• Cuando sea requerido por ley o proceso legal
• Para proteger nuestros derechos y propiedad
• En caso de investigación de fraude o seguridad
• Para cumplir con solicitudes gubernamentales

**Transacciones Comerciales:**
• En caso de fusión, adquisición o venta de activos
• Durante procesos de due diligence

NO vendemos, alquilamos ni compartimos su información personal con terceros para sus propios fines de marketing sin su consentimiento explícito.`
    },
    {
      title: '4. Cookies y Tecnologías de Rastreo',
      content: `Utilizamos cookies y tecnologías similares para:

**Cookies Esenciales:**
• Mantener su sesión activa
• Recordar artículos en su carrito
• Habilitar funciones de seguridad

**Cookies de Rendimiento:**
• Analizar cómo se utiliza el sitio
• Mejorar la velocidad y funcionalidad
• Identificar y solucionar errores

**Cookies de Funcionalidad:**
• Recordar sus preferencias
• Personalizar contenido y recomendaciones
• Proporcionar características sociales

**Cookies de Marketing:**
• Mostrar anuncios relevantes
• Medir efectividad de campañas
• Remarketing en otras plataformas

Puede gestionar sus preferencias de cookies a través de la configuración de su navegador. Tenga en cuenta que deshabilitar ciertas cookies puede afectar la funcionalidad del sitio.`
    },
    {
      title: '5. Seguridad de Datos',
      content: `Implementamos medidas de seguridad técnicas y organizativas para proteger su información:

**Medidas Técnicas:**
• Encriptación SSL/TLS para transmisión de datos
• Almacenamiento seguro de contraseñas con hashing
• Firewalls y sistemas de detección de intrusiones
• Copias de seguridad regulares de datos
• Actualizaciones de seguridad periódicas

**Medidas Organizativas:**
• Acceso limitado a información personal
• Capacitación en seguridad para empleados
• Acuerdos de confidencialidad con terceros
• Auditorías de seguridad regulares
• Políticas de retención de datos

Sin embargo, ningún método de transmisión por Internet es 100% seguro. Le recomendamos mantener segura su contraseña y notificarnos inmediatamente de cualquier uso no autorizado de su cuenta.`
    },
    {
      title: '6. Sus Derechos de Privacidad',
      content: `Usted tiene los siguientes derechos respecto a su información personal:

**Derecho de Acceso:**
• Solicitar una copia de sus datos personales
• Conocer cómo procesamos su información

**Derecho de Rectificación:**
• Corregir información inexacta o incompleta
• Actualizar sus datos en cualquier momento

**Derecho de Eliminación:**
• Solicitar la eliminación de sus datos
• "Derecho al olvido" bajo ciertas circunstancias

**Derecho de Portabilidad:**
• Recibir sus datos en formato estructurado
• Transferir datos a otro proveedor

**Derecho de Objeción:**
• Oponerse al procesamiento de sus datos
• Optar por no recibir marketing directo

**Derecho de Restricción:**
• Limitar cómo usamos sus datos
• Solicitar procesamiento restringido

Para ejercer estos derechos, contáctenos en privacidad@toniclife.com.`
    },
    {
      title: '7. Retención de Datos',
      content: `Retenemos su información personal solo durante el tiempo necesario para:

• Cumplir con los propósitos descritos en esta política
• Satisfacer requisitos legales, contables o de informes
• Resolver disputas y hacer cumplir nuestros acuerdos
• Proteger nuestros intereses legítimos

Los períodos de retención varían según el tipo de datos:
• Información de cuenta: Mientras su cuenta esté activa
• Datos de transacciones: 7 años (requisitos fiscales)
• Datos de marketing: Hasta que retire su consentimiento
• Cookies: Según configuración específica (máx. 2 años)

Después de estos períodos, eliminamos o anonimizamos la información de forma segura.`
    },
    {
      title: '8. Privacidad de Menores',
      content: `Nuestros servicios no están dirigidos a menores de 18 años. No recopilamos intencionalmente información personal de menores de 18 años. Si descubrimos que hemos recopilado información de un menor, tomaremos medidas para eliminarla inmediatamente.

Si usted es padre o tutor y cree que su hijo nos ha proporcionado información personal, contáctenos para que podamos tomar las medidas apropiadas.`
    },
    {
      title: '9. Transferencias Internacionales',
      content: `Su información puede ser transferida y procesada en países fuera de su país de residencia, incluyendo Estados Unidos y otros países donde operamos o donde se encuentran nuestros proveedores de servicios.

Estos países pueden tener leyes de protección de datos diferentes a las de su jurisdicción. Cuando transferimos información internacionalmente, implementamos salvaguardas apropiadas, incluyendo:

• Cláusulas contractuales estándar aprobadas
• Certificaciones de Privacy Shield cuando sea aplicable
• Mecanismos de transferencia aprobados por autoridades relevantes`
    },
    {
      title: '10. Cambios a esta Política',
      content: `Podemos actualizar esta Política de Privacidad periódicamente para reflejar cambios en nuestras prácticas o por razones legales, operativas o regulatorias.

Le notificaremos sobre cambios materiales:
• Publicando la nueva política en nuestro sitio web
• Enviando un aviso por email a usuarios registrados
• Mostrando un aviso prominente en nuestro sitio

La fecha de "Última actualización" al comienzo de esta política indica cuándo se realizó la última revisión. Su uso continuado del sitio después de cambios constituye su aceptación de la política actualizada.`
    },
    {
      title: '11. Contacto',
      content: `Si tiene preguntas, inquietudes o solicitudes sobre esta Política de Privacidad o nuestras prácticas de datos, puede contactarnos en:

**Email:** privacidad@toniclife.com
**Teléfono:** +52 55 1234 5678
**Dirección:**
Tonic Life - Departamento de Privacidad
Av. Insurgentes Sur 1602
Crédito Constructor, Benito Juárez
03940 Ciudad de México, México

**Horario de atención:**
Lunes a Viernes: 9:00 AM - 6:00 PM (Hora de México)

Responderemos a su solicitud dentro de 30 días hábiles.`
    }
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Hero */}
      <div className="bg-gradient-to-r from-[#003B7A] to-[#7AB82E] text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <div className="text-center">
            <ShieldCheckIcon className="h-16 w-16 mx-auto mb-6" />
            <h1 className="text-5xl font-bold mb-6">Política de Privacidad</h1>
            <p className="text-xl text-blue-100 max-w-3xl mx-auto">
              Última actualización: Enero 2024
            </p>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="bg-white rounded-lg shadow-lg p-8 md:p-12">
          <div className="prose prose-lg max-w-none">
            <p className="text-lg text-gray-700 mb-8">
              En Tonic Life, nos comprometemos a proteger su privacidad y manejar su información personal de manera responsable. Esta Política de Privacidad describe cómo recopilamos, usamos, compartimos y protegemos su información cuando utiliza nuestro sitio web y servicios.
            </p>

            <div className="space-y-8">
              {sections.map((section, index) => (
                <div key={index} className="border-l-4 border-[#7AB82E] pl-6">
                  <h2 className="text-2xl font-bold text-gray-900 mb-4">{section.title}</h2>
                  <div className="text-gray-700 whitespace-pre-line leading-relaxed">
                    {section.content}
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-12 p-6 bg-green-50 border-2 border-green-200 rounded-lg">
              <p className="text-gray-700 font-medium">
                Al utilizar nuestros servicios, usted reconoce que ha leído y comprende esta Política de Privacidad y consiente el procesamiento de su información personal según lo descrito aquí.
              </p>
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
            href="/cookies"
            className="block p-6 bg-white rounded-lg shadow hover:shadow-lg transition-shadow text-center"
          >
            <h3 className="font-bold text-gray-900 mb-2">Política de Cookies</h3>
            <p className="text-gray-600 text-sm">Gestiona tus preferencias</p>
          </a>
        </div>
      </div>
    </div>
  );
}
