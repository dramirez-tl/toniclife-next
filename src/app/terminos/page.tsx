'use client';

import { DocumentTextIcon } from '@heroicons/react/24/outline';

export default function TerminosPage() {
  const sections = [
    {
      title: '1. Aceptación de los Términos',
      content: `Al acceder y utilizar el sitio web de Tonic Life ("el Sitio"), usted acepta estar sujeto a estos Términos y Condiciones ("Términos"), todas las leyes y regulaciones aplicables, y acepta que es responsable del cumplimiento de todas las leyes locales aplicables. Si no está de acuerdo con alguno de estos términos, tiene prohibido usar o acceder a este sitio.`
    },
    {
      title: '2. Uso del Sitio',
      content: `Usted se compromete a utilizar el Sitio únicamente para fines legales y de una manera que no infrinja los derechos de terceros ni restrinja o inhiba el uso y disfrute del Sitio por parte de terceros. Está prohibido:

• Usar el Sitio de cualquier manera que pueda dañar, deshabilitar, sobrecargar o deteriorar el Sitio
• Intentar obtener acceso no autorizado al Sitio, cuentas de usuarios o sistemas informáticos
• Usar robots, scrapers u otros medios automatizados para acceder al Sitio
• Transmitir virus, malware o cualquier código de naturaleza destructiva
• Suplantar la identidad de otra persona o entidad`
    },
    {
      title: '3. Cuentas de Usuario',
      content: `Para acceder a ciertas funciones del Sitio, puede ser necesario crear una cuenta. Usted es responsable de:

• Mantener la confidencialidad de su contraseña y cuenta
• Todas las actividades que ocurran bajo su cuenta
• Notificarnos inmediatamente de cualquier uso no autorizado de su cuenta
• Proporcionar información veraz, precisa y completa durante el registro

Nos reservamos el derecho de suspender o cancelar cuentas que violen estos Términos.`
    },
    {
      title: '4. Productos y Servicios',
      content: `Los productos y servicios ofrecidos en el Sitio están sujetos a disponibilidad. Nos reservamos el derecho de:

• Modificar o discontinuar productos sin previo aviso
• Limitar las cantidades de productos disponibles para compra
• Rechazar o cancelar pedidos por cualquier motivo
• Corregir errores de precios o descripciones de productos

Los precios están sujetos a cambios sin previo aviso. Todos los precios están en dólares estadounidenses (USD) a menos que se indique lo contrario.`
    },
    {
      title: '5. Compras y Pagos',
      content: `Al realizar una compra, usted declara que:

• Tiene la capacidad legal para celebrar contratos vinculantes
• La información de pago proporcionada es verdadera y precisa
• Los cargos realizados en su método de pago son autorizados por usted

Aceptamos varios métodos de pago procesados a través de procesadores de pago de terceros seguros. No almacenamos información completa de tarjetas de crédito en nuestros servidores.`
    },
    {
      title: '6. Envíos y Entregas',
      content: `Los tiempos de envío son estimaciones y pueden variar. No somos responsables por retrasos causados por:

• Condiciones climáticas adversas
• Huelgas o problemas laborales
• Aduanas o inspecciones gubernamentales
• Direcciones de envío incorrectas proporcionadas por el cliente

El riesgo de pérdida y título de los productos pasa al cliente al momento de la entrega al transportista.`
    },
    {
      title: '7. Devoluciones y Reembolsos',
      content: `Ofrecemos una garantía de satisfacción de 30 días para productos sin usar. Las devoluciones están sujetas a nuestra Política de Devoluciones completa disponible en /envios. Los reembolsos se procesarán dentro de 5-7 días hábiles después de recibir y verificar la devolución.`
    },
    {
      title: '8. Propiedad Intelectual',
      content: `Todo el contenido del Sitio, incluyendo pero no limitado a texto, gráficos, logos, íconos, imágenes, clips de audio, descargas digitales y compilaciones de datos, es propiedad de Tonic Life o sus proveedores de contenido y está protegido por leyes de derechos de autor internacionales.

Usted no puede:
• Reproducir, duplicar, copiar o vender ninguna parte del Sitio
• Usar nuestras marcas comerciales sin autorización escrita
• Modificar o crear obras derivadas del contenido del Sitio`
    },
    {
      title: '9. Programa de Distribuidores',
      content: `El programa de distribuidores de Tonic Life está sujeto a términos y condiciones adicionales específicos que se proporcionan durante el proceso de registro como distribuidor. Los distribuidores deben:

• Cumplir con todas las leyes y regulaciones aplicables
• Representar los productos de manera honesta y ética
• No hacer afirmaciones médicas no autorizadas
• Mantener la confidencialidad de información propietaria
• Seguir nuestras pautas de marketing y comunicación`
    },
    {
      title: '10. Descargo de Responsabilidad',
      content: `Los productos de Tonic Life son suplementos dietéticos y no están destinados a diagnosticar, tratar, curar o prevenir ninguna enfermedad. Las declaraciones sobre productos no han sido evaluadas por la FDA.

EL SITIO Y LOS PRODUCTOS SE PROPORCIONAN "TAL CUAL" SIN GARANTÍAS DE NINGÚN TIPO. NO GARANTIZAMOS QUE EL SITIO ESTÉ LIBRE DE ERRORES O INTERRUPCIONES.`
    },
    {
      title: '11. Limitación de Responsabilidad',
      content: `En ningún caso Tonic Life será responsable por daños indirectos, incidentales, especiales, consecuenciales o punitivos, incluyendo pero no limitado a pérdida de beneficios, datos o uso, incurridos por usted o cualquier tercero, ya sea en una acción contractual, negligencia u otra acción de agravio.

Nuestra responsabilidad total no excederá el monto pagado por usted por el producto o servicio específico.`
    },
    {
      title: '12. Indemnización',
      content: `Usted acepta indemnizar, defender y eximir de responsabilidad a Tonic Life, sus funcionarios, directores, empleados y agentes de cualquier reclamo, daño, obligación, pérdida, responsabilidad, costo o deuda, y gastos (incluyendo honorarios de abogados) que surjan de:

• Su uso del Sitio
• Su violación de estos Términos
• Su violación de derechos de terceros
• Cualquier contenido que envíe o publique en el Sitio`
    },
    {
      title: '13. Modificaciones',
      content: `Nos reservamos el derecho de modificar estos Términos en cualquier momento. Las modificaciones entrarán en vigor inmediatamente después de su publicación en el Sitio. Su uso continuado del Sitio después de cualquier modificación constituye su aceptación de los nuevos Términos.

Le recomendamos revisar estos Términos periódicamente para estar informado de cualquier cambio.`
    },
    {
      title: '14. Ley Aplicable',
      content: `Estos Términos se regirán e interpretarán de acuerdo con las leyes de México, sin dar efecto a ningún principio de conflictos de leyes. Cualquier disputa que surja de o en relación con estos Términos se resolverá exclusivamente en los tribunales ubicados en Ciudad de México.`
    },
    {
      title: '15. Contacto',
      content: `Si tiene preguntas sobre estos Términos y Condiciones, puede contactarnos en:

Email: legal@toniclife.com
Teléfono: +52 55 1234 5678
Dirección: Av. Insurgentes Sur 1602, Crédito Constructor, Benito Juárez, 03940 CDMX, México`
    }
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Hero */}
      <div className="bg-gradient-to-r from-[#003B7A] to-[#7AB82E] text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <div className="text-center">
            <DocumentTextIcon className="h-16 w-16 mx-auto mb-6" />
            <h1 className="text-5xl font-bold mb-6">Términos y Condiciones</h1>
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
              Bienvenido a Tonic Life. Al utilizar nuestro sitio web y servicios, usted acepta cumplir y estar sujeto a los siguientes términos y condiciones de uso. Por favor, léalos cuidadosamente.
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

            <div className="mt-12 p-6 bg-blue-50 border-2 border-blue-200 rounded-lg">
              <p className="text-gray-700 font-medium">
                Al utilizar el sitio web de Tonic Life, usted reconoce que ha leído, entendido y acepta estar sujeto a estos Términos y Condiciones.
              </p>
            </div>
          </div>
        </div>

        {/* Related Links */}
        <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-4">
          <a
            href="/privacidad"
            className="block p-6 bg-white rounded-lg shadow hover:shadow-lg transition-shadow text-center"
          >
            <h3 className="font-bold text-gray-900 mb-2">Política de Privacidad</h3>
            <p className="text-gray-600 text-sm">Cómo protegemos tu información</p>
          </a>
          <a
            href="/cookies"
            className="block p-6 bg-white rounded-lg shadow hover:shadow-lg transition-shadow text-center"
          >
            <h3 className="font-bold text-gray-900 mb-2">Política de Cookies</h3>
            <p className="text-gray-600 text-sm">Cómo utilizamos las cookies</p>
          </a>
        </div>
      </div>
    </div>
  );
}
