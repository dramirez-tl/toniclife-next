'use client';

import Image from 'next/image';
import Link from 'next/link';
import {
  ClipboardDocumentCheckIcon,
  SparklesIcon,
  ShoppingCartIcon,
  TruckIcon,
  CheckCircleIcon,
  ArrowRightIcon,
  ChatBubbleLeftRightIcon,
  BeakerIcon,
  UserGroupIcon,
  ChartBarIcon,
} from '@heroicons/react/24/outline';

export default function ComoFuncionaPage() {
  const steps = [
    {
      number: '01',
      title: 'Realiza el Quiz de Bienestar',
      description: 'Nuestro quiz personalizado analiza tu estilo de vida, objetivos de salud y necesidades específicas.',
      icon: ClipboardDocumentCheckIcon,
      color: 'from-blue-500 to-blue-600',
      details: [
        '10 preguntas personalizadas',
        'Análisis de tu estilo de vida actual',
        'Identificación de objetivos de salud',
        'Evaluación de necesidades nutricionales'
      ]
    },
    {
      number: '02',
      title: 'Recibe Recomendaciones Personalizadas',
      description: 'Obtén un plan de productos diseñado específicamente para ti, basado en ciencia y tus respuestas.',
      icon: SparklesIcon,
      color: 'from-purple-500 to-purple-600',
      details: [
        'Productos seleccionados para tus objetivos',
        'Dosis y horarios recomendados',
        'Plan de suplementación completo',
        'Bundles optimizados con descuento'
      ]
    },
    {
      number: '03',
      title: 'Realiza tu Pedido',
      description: 'Proceso de compra simple y seguro con múltiples opciones de pago y envío.',
      icon: ShoppingCartIcon,
      color: 'from-green-500 to-green-600',
      details: [
        'Checkout en 3 pasos simples',
        'Pago seguro con encriptación',
        'Múltiples métodos de pago',
        'Opción de suscripción con descuento'
      ]
    },
    {
      number: '04',
      title: 'Seguimiento de Envío',
      description: 'Rastrea tu pedido en tiempo real desde nuestro almacén hasta tu puerta.',
      icon: TruckIcon,
      color: 'from-orange-500 to-orange-600',
      details: [
        'Tracking en tiempo real',
        'Notificaciones por email y SMS',
        'Entrega garantizada',
        'Envío gratis en pedidos mayores'
      ]
    },
    {
      number: '05',
      title: 'Comienza tu Transformación',
      description: 'Sigue tu plan personalizado y monitorea tu progreso con nuestras herramientas digitales.',
      icon: CheckCircleIcon,
      color: 'from-teal-500 to-teal-600',
      details: [
        'Guías de uso detalladas',
        'Tracker de hábitos diarios',
        'Soporte de la comunidad',
        'Seguimiento de resultados'
      ]
    }
  ];

  const features = [
    {
      icon: BeakerIcon,
      title: 'Ciencia Respaldada',
      description: 'Todos nuestros productos están formulados con ingredientes científicamente probados y en las dosis correctas.'
    },
    {
      icon: UserGroupIcon,
      title: 'Apoyo Comunitario',
      description: 'Accede a una comunidad global de personas con objetivos similares y aprende de su experiencia.'
    },
    {
      icon: ChartBarIcon,
      title: 'Seguimiento de Progreso',
      description: 'Herramientas digitales para rastrear tu progreso y ajustar tu plan según tus resultados.'
    },
    {
      icon: ChatBubbleLeftRightIcon,
      title: 'Asesoría Personalizada',
      description: 'Soporte de nuestros expertos en bienestar y la opción de trabajar con un distribuidor personal.'
    }
  ];

  return (
    <div className="min-h-screen bg-white">
      {/* Hero Section */}
      <div className="bg-gradient-to-r from-[#003B7A] to-[#7AB82E] text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <div className="text-center">
            <h1 className="text-5xl font-bold mb-6">¿Cómo Funciona Tonic Life?</h1>
            <p className="text-xl text-blue-100 max-w-3xl mx-auto">
              Un sistema simple y personalizado para ayudarte a alcanzar tus objetivos de salud y bienestar
            </p>
          </div>
        </div>
      </div>

      {/* Steps Section */}
      <div className="py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="space-y-16">
            {steps.map((step, index) => {
              const Icon = step.icon;
              const isEven = index % 2 === 0;

              return (
                <div key={index} className={`flex flex-col ${isEven ? 'lg:flex-row' : 'lg:flex-row-reverse'} items-center gap-12`}>
                  {/* Visual */}
                  <div className="w-full lg:w-1/2">
                    <div className={`relative bg-gradient-to-br ${step.color} rounded-2xl p-12 text-white`}>
                      <div className="flex items-center justify-center mb-6">
                        <Icon className="h-24 w-24" />
                      </div>
                      <div className="text-6xl font-bold text-center opacity-20 absolute top-4 right-4">
                        {step.number}
                      </div>
                    </div>
                  </div>

                  {/* Content */}
                  <div className="w-full lg:w-1/2">
                    <div className="inline-block px-4 py-2 bg-[#7AB82E] text-white rounded-full text-sm font-medium mb-4">
                      Paso {step.number}
                    </div>
                    <h2 className="text-3xl font-bold text-gray-900 mb-4">{step.title}</h2>
                    <p className="text-lg text-gray-600 mb-6">{step.description}</p>

                    <ul className="space-y-3">
                      {step.details.map((detail, idx) => (
                        <li key={idx} className="flex items-start gap-3">
                          <CheckCircleIcon className="h-6 w-6 text-[#7AB82E] flex-shrink-0 mt-0.5" />
                          <span className="text-gray-700">{detail}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* CTA Section */}
      <div className="py-16 bg-gradient-to-r from-[#003B7A] to-[#7AB82E]">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center text-white">
          <h2 className="text-4xl font-bold mb-6">
            ¿Listo para Comenzar tu Transformación?
          </h2>
          <p className="text-xl text-blue-100 mb-8">
            Completa nuestro quiz de bienestar en menos de 2 minutos y recibe tu plan personalizado.
          </p>
          <Link
            href="/quiz"
            className="inline-flex items-center gap-2 px-8 py-4 bg-white text-[#003B7A] font-bold rounded-lg hover:bg-blue-50 transition-colors"
          >
            <span>Comenzar el Quiz</span>
            <ArrowRightIcon className="h-5 w-5" />
          </Link>
        </div>
      </div>

      {/* Features Section */}
      <div className="py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">Por Qué Tonic Life es Diferente</h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              No solo vendemos productos, creamos experiencias personalizadas de bienestar
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {features.map((feature, index) => {
              const Icon = feature.icon;
              return (
                <div key={index} className="bg-white rounded-lg shadow-lg p-6 hover:shadow-xl transition-shadow">
                  <div className="flex justify-center mb-4">
                    <div className="p-3 bg-[#003B7A] rounded-full">
                      <Icon className="h-8 w-8 text-white" />
                    </div>
                  </div>
                  <h3 className="text-xl font-bold text-gray-900 text-center mb-3">
                    {feature.title}
                  </h3>
                  <p className="text-gray-600 text-center">
                    {feature.description}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Process Flow Diagram */}
      <div className="py-16 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">El Proceso Completo</h2>
            <p className="text-xl text-gray-600">Desde el quiz hasta tus resultados</p>
          </div>

          <div className="bg-white rounded-2xl shadow-xl p-8 md:p-12">
            <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
              {['Quiz', 'Análisis', 'Recomendaciones', 'Compra', 'Resultados'].map((label, index) => (
                <div key={index} className="flex flex-col items-center">
                  <div className="w-16 h-16 rounded-full bg-gradient-to-br from-[#003B7A] to-[#7AB82E] text-white flex items-center justify-center text-2xl font-bold mb-3">
                    {index + 1}
                  </div>
                  <p className="text-sm font-medium text-gray-900 text-center">{label}</p>
                  {index < 4 && (
                    <ArrowRightIcon className="h-6 w-6 text-[#7AB82E] mt-3 hidden md:block absolute right-0 translate-x-1/2" />
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Bottom CTA */}
      <div className="py-16">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-4xl font-bold text-gray-900 mb-6">
            Millones de Personas Confían en Tonic Life
          </h2>
          <p className="text-xl text-gray-600 mb-8">
            Únete a nuestra comunidad global y comienza tu transformación hoy
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/quiz"
              className="px-8 py-4 bg-[#003B7A] text-white font-bold rounded-lg hover:bg-[#002855] transition-colors"
            >
              Comenzar Ahora
            </Link>
            <Link
              href="/productos"
              className="px-8 py-4 bg-transparent border-2 border-[#003B7A] text-[#003B7A] font-bold rounded-lg hover:bg-[#003B7A] hover:text-white transition-colors"
            >
              Ver Productos
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
