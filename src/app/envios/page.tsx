'use client';

import {
  TruckIcon,
  ClockIcon,
  MapPinIcon,
  CurrencyDollarIcon,
  ShieldCheckIcon,
  ArrowPathIcon,
  CheckCircleIcon,
  XCircleIcon,
  InformationCircleIcon,
} from '@heroicons/react/24/outline';

export default function EnviosPage() {
  const shippingZones = [
    {
      zone: 'Nacional (México)',
      standard: '3-5 días hábiles',
      express: '1-2 días hábiles',
      cost: 'Gratis en pedidos >$50 USD',
      expressCoast: '$15 USD'
    },
    {
      zone: 'Centroamérica',
      standard: '7-10 días hábiles',
      express: '3-5 días hábiles',
      cost: '$12 USD',
      expressCoast: '$35 USD'
    },
    {
      zone: 'Sudamérica',
      standard: '10-15 días hábiles',
      express: '5-7 días hábiles',
      cost: '$18 USD',
      expressCoast: '$45 USD'
    },
    {
      zone: 'Estados Unidos',
      standard: '5-7 días hábiles',
      express: '2-3 días hábiles',
      cost: '$10 USD',
      expressCoast: '$25 USD'
    }
  ];

  const returnSteps = [
    {
      step: '1',
      title: 'Contacta a Soporte',
      description: 'Envía un email a devoluciones@toniclife.com con tu número de pedido y motivo de devolución.'
    },
    {
      step: '2',
      title: 'Recibe Autorización',
      description: 'Obtendrás un número de RMA y las instrucciones de envío dentro de 24 horas.'
    },
    {
      step: '3',
      title: 'Empaca el Producto',
      description: 'Empaca el producto en su empaque original con todos los accesorios incluidos.'
    },
    {
      step: '4',
      title: 'Envía el Paquete',
      description: 'Envía el paquete a la dirección proporcionada. Guarda el comprobante de envío.'
    },
    {
      step: '5',
      title: 'Recibe tu Reembolso',
      description: 'Una vez recibido y verificado, procesaremos tu reembolso en 5-7 días hábiles.'
    }
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Hero */}
      <div className="bg-gradient-to-r from-[#003B7A] to-[#7AB82E] text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <div className="text-center">
            <TruckIcon className="h-16 w-16 mx-auto mb-6" />
            <h1 className="text-5xl font-bold mb-6">Envíos y Devoluciones</h1>
            <p className="text-xl text-blue-100 max-w-3xl mx-auto">
              Información completa sobre nuestras políticas de envío y devolución
            </p>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Shipping Policy */}
        <div className="mb-16">
          <div className="text-center mb-12">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">Política de Envíos</h2>
            <p className="text-xl text-gray-600">
              Entrega rápida y segura a todo América Latina
            </p>
          </div>

          {/* Shipping Zones */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
            {shippingZones.map((zone, index) => (
              <div key={index} className="bg-white rounded-lg shadow-lg p-6">
                <div className="flex items-center gap-2 mb-4">
                  <MapPinIcon className="h-6 w-6 text-[#7AB82E]" />
                  <h3 className="font-bold text-gray-900">{zone.zone}</h3>
                </div>
                <div className="space-y-3 text-sm">
                  <div>
                    <p className="text-gray-600">Estándar</p>
                    <p className="font-medium text-gray-900">{zone.standard}</p>
                    <p className="text-[#7AB82E] font-medium">{zone.cost}</p>
                  </div>
                  <div className="pt-3 border-t">
                    <p className="text-gray-600">Express</p>
                    <p className="font-medium text-gray-900">{zone.express}</p>
                    <p className="text-[#003B7A] font-medium">{zone.expressCoast}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Shipping Features */}
          <div className="bg-white rounded-lg shadow-lg p-8">
            <h3 className="text-2xl font-bold text-gray-900 mb-6">Características de Nuestro Servicio</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="flex gap-4">
                <ShieldCheckIcon className="h-8 w-8 text-[#7AB82E] flex-shrink-0" />
                <div>
                  <h4 className="font-bold text-gray-900 mb-2">Envío Asegurado</h4>
                  <p className="text-gray-600">Todos nuestros envíos están asegurados contra pérdida o daño durante el transporte.</p>
                </div>
              </div>
              <div className="flex gap-4">
                <ClockIcon className="h-8 w-8 text-[#7AB82E] flex-shrink-0" />
                <div>
                  <h4 className="font-bold text-gray-900 mb-2">Procesamiento Rápido</h4>
                  <p className="text-gray-600">Los pedidos se procesan y envían dentro de 1-2 días hábiles.</p>
                </div>
              </div>
              <div className="flex gap-4">
                <MapPinIcon className="h-8 w-8 text-[#7AB82E] flex-shrink-0" />
                <div>
                  <h4 className="font-bold text-gray-900 mb-2">Rastreo en Tiempo Real</h4>
                  <p className="text-gray-600">Recibe un número de seguimiento para rastrear tu pedido en todo momento.</p>
                </div>
              </div>
              <div className="flex gap-4">
                <CurrencyDollarIcon className="h-8 w-8 text-[#7AB82E] flex-shrink-0" />
                <div>
                  <h4 className="font-bold text-gray-900 mb-2">Envío Gratis</h4>
                  <p className="text-gray-600">En pedidos mayores a $50 USD dentro de México.</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Return Policy */}
        <div className="mb-16">
          <div className="text-center mb-12">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">Política de Devoluciones</h2>
            <p className="text-xl text-gray-600">
              Garantía de satisfacción de 30 días
            </p>
          </div>

          {/* Return Process */}
          <div className="bg-white rounded-lg shadow-lg p-8 mb-8">
            <h3 className="text-2xl font-bold text-gray-900 mb-6">Proceso de Devolución</h3>
            <div className="space-y-6">
              {returnSteps.map((item, index) => (
                <div key={index} className="flex gap-4">
                  <div className="flex-shrink-0">
                    <div className="w-12 h-12 rounded-full bg-[#7AB82E] text-white flex items-center justify-center font-bold text-lg">
                      {item.step}
                    </div>
                  </div>
                  <div>
                    <h4 className="font-bold text-gray-900 mb-2">{item.title}</h4>
                    <p className="text-gray-600">{item.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Return Conditions */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-green-50 border-2 border-green-200 rounded-lg p-6">
              <div className="flex items-center gap-2 mb-4">
                <CheckCircleIcon className="h-6 w-6 text-green-600" />
                <h3 className="font-bold text-gray-900">Aceptamos Devoluciones Si:</h3>
              </div>
              <ul className="space-y-2 text-gray-700">
                <li className="flex items-start gap-2">
                  <span className="text-green-600 mt-1">✓</span>
                  <span>El producto está sin usar y en su empaque original</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-green-600 mt-1">✓</span>
                  <span>Han pasado menos de 30 días desde la compra</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-green-600 mt-1">✓</span>
                  <span>Incluye todos los accesorios y documentación</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-green-600 mt-1">✓</span>
                  <span>Tienes el comprobante de compra original</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-green-600 mt-1">✓</span>
                  <span>Obtuviste un número de RMA antes de enviar</span>
                </li>
              </ul>
            </div>

            <div className="bg-red-50 border-2 border-red-200 rounded-lg p-6">
              <div className="flex items-center gap-2 mb-4">
                <XCircleIcon className="h-6 w-6 text-red-600" />
                <h3 className="font-bold text-gray-900">NO Aceptamos Devoluciones Si:</h3>
              </div>
              <ul className="space-y-2 text-gray-700">
                <li className="flex items-start gap-2">
                  <span className="text-red-600 mt-1">✗</span>
                  <span>El producto ha sido usado o abierto</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-red-600 mt-1">✗</span>
                  <span>Han pasado más de 30 días desde la compra</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-red-600 mt-1">✗</span>
                  <span>El empaque original está dañado o faltante</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-red-600 mt-1">✗</span>
                  <span>Es un producto personalizado o en promoción especial</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-red-600 mt-1">✗</span>
                  <span>No se solicitó número de RMA antes del envío</span>
                </li>
              </ul>
            </div>
          </div>
        </div>

        {/* Refunds */}
        <div className="mb-16">
          <div className="bg-white rounded-lg shadow-lg p-8">
            <h3 className="text-2xl font-bold text-gray-900 mb-6">Reembolsos</h3>
            <div className="space-y-4 text-gray-700">
              <div className="flex gap-3">
                <InformationCircleIcon className="h-6 w-6 text-[#003B7A] flex-shrink-0 mt-1" />
                <div>
                  <p className="font-medium text-gray-900 mb-1">Tiempo de Procesamiento</p>
                  <p>Una vez que recibamos y verifiquemos tu devolución, procesaremos tu reembolso en 5-7 días hábiles.</p>
                </div>
              </div>
              <div className="flex gap-3">
                <InformationCircleIcon className="h-6 w-6 text-[#003B7A] flex-shrink-0 mt-1" />
                <div>
                  <p className="font-medium text-gray-900 mb-1">Método de Reembolso</p>
                  <p>El reembolso se aplicará al método de pago original utilizado para la compra.</p>
                </div>
              </div>
              <div className="flex gap-3">
                <InformationCircleIcon className="h-6 w-6 text-[#003B7A] flex-shrink-0 mt-1" />
                <div>
                  <p className="font-medium text-gray-900 mb-1">Costos de Envío</p>
                  <p>Los costos de envío original no son reembolsables. El cliente es responsable de los costos de envío de devolución, excepto en casos de productos defectuosos.</p>
                </div>
              </div>
              <div className="flex gap-3">
                <InformationCircleIcon className="h-6 w-6 text-[#003B7A] flex-shrink-0 mt-1" />
                <div>
                  <p className="font-medium text-gray-900 mb-1">Productos Defectuosos</p>
                  <p>Si recibes un producto defectuoso o dañado, cubriremos todos los costos de envío y procesaremos un reembolso completo o reemplazo inmediato.</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* FAQ */}
        <div className="bg-gradient-to-r from-[#003B7A] to-[#7AB82E] rounded-2xl p-8 text-white text-center">
          <h3 className="text-2xl font-bold mb-4">¿Tienes Más Preguntas?</h3>
          <p className="text-blue-100 mb-6">
            Consulta nuestra sección de preguntas frecuentes o contacta a nuestro equipo de soporte
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <a
              href="/faq"
              className="px-6 py-3 bg-white text-[#003B7A] font-bold rounded-lg hover:bg-blue-50 transition-colors"
            >
              Ver FAQ
            </a>
            <a
              href="/contacto"
              className="px-6 py-3 bg-transparent border-2 border-white text-white font-bold rounded-lg hover:bg-white/10 transition-colors"
            >
              Contactar Soporte
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
