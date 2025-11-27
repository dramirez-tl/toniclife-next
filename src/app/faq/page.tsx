'use client';

import { useState } from 'react';
import {
  MagnifyingGlassIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  QuestionMarkCircleIcon,
  ShoppingCartIcon,
  TruckIcon,
  CreditCardIcon,
  UserCircleIcon,
  SparklesIcon,
} from '@heroicons/react/24/outline';

interface FAQItem {
  question: string;
  answer: string;
  category: string;
}

export default function FAQPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [openItems, setOpenItems] = useState<number[]>([]);

  const categories = [
    { value: 'all', label: 'Todas', icon: QuestionMarkCircleIcon },
    { value: 'productos', label: 'Productos', icon: SparklesIcon },
    { value: 'pedidos', label: 'Pedidos', icon: ShoppingCartIcon },
    { value: 'envios', label: 'Envíos', icon: TruckIcon },
    { value: 'pagos', label: 'Pagos', icon: CreditCardIcon },
    { value: 'cuenta', label: 'Cuenta', icon: UserCircleIcon }
  ];

  const faqs: FAQItem[] = [
    {
      question: '¿Qué son los productos Tonic Life?',
      answer: 'Tonic Life ofrece una línea completa de suplementos nutricionales y productos de bienestar formulados con ingredientes naturales de la más alta calidad. Cada producto está diseñado para apoyar objetivos específicos de salud como energía, inmunidad, digestión, pérdida de peso y más.',
      category: 'productos'
    },
    {
      question: '¿Los productos tienen efectos secundarios?',
      answer: 'Nuestros productos están formulados con ingredientes naturales y son seguros para la mayoría de las personas. Sin embargo, recomendamos consultar con un profesional de la salud antes de comenzar cualquier suplementación, especialmente si estás embarazada, amamantando o tomando medicamentos.',
      category: 'productos'
    },
    {
      question: '¿Cuánto tiempo tarda en verse resultados?',
      answer: 'Los resultados varían según la persona y el producto. Generalmente, puedes esperar comenzar a notar cambios entre 2-4 semanas de uso consistente. Para resultados óptimos, recomendamos un compromiso de al menos 90 días junto con una dieta equilibrada y ejercicio regular.',
      category: 'productos'
    },
    {
      question: '¿Puedo tomar varios productos al mismo tiempo?',
      answer: 'Sí, muchos de nuestros productos están diseñados para trabajar en sinergia. El quiz de bienestar te ayudará a identificar la mejor combinación para tus objetivos. También puedes consultar las guías de cada producto o hablar con tu distribuidor personal.',
      category: 'productos'
    },
    {
      question: '¿Cómo hago un pedido?',
      answer: 'Puedes hacer un pedido directamente en nuestro sitio web agregando productos al carrito y completando el proceso de checkout. También puedes ordenar a través de tu distribuidor personal si tienes uno asignado.',
      category: 'pedidos'
    },
    {
      question: '¿Puedo modificar o cancelar mi pedido?',
      answer: 'Puedes modificar o cancelar tu pedido dentro de las primeras 24 horas después de realizarlo. Contacta a nuestro equipo de soporte lo antes posible. Una vez que el pedido ha sido enviado, no puede ser modificado pero puedes iniciar una devolución.',
      category: 'pedidos'
    },
    {
      question: '¿Ofrecen garantía de devolución?',
      answer: 'Sí, ofrecemos una garantía de satisfacción de 30 días. Si no estás completamente satisfecho con tu compra, puedes devolver el producto sin usar para un reembolso completo. Los productos usados pueden ser devueltos con un reembolso parcial.',
      category: 'pedidos'
    },
    {
      question: '¿Cuáles son los tiempos de envío?',
      answer: 'Los pedidos generalmente se procesan en 1-2 días hábiles. El tiempo de envío depende de tu ubicación: 3-5 días hábiles para envío estándar nacional, 7-10 días para envío internacional. Ofrecemos envío express con entrega en 1-2 días hábiles por un costo adicional.',
      category: 'envios'
    },
    {
      question: '¿Cuánto cuesta el envío?',
      answer: 'El costo de envío varía según tu ubicación y el peso del paquete. Ofrecemos ENVÍO GRATIS en pedidos superiores a $50 USD. Puedes ver el costo exacto de envío al momento del checkout antes de completar tu compra.',
      category: 'envios'
    },
    {
      question: '¿Cómo puedo rastrear mi pedido?',
      answer: 'Una vez que tu pedido sea enviado, recibirás un email con el número de seguimiento y un enlace para rastrear tu paquete en tiempo real. También puedes ver el estado de tu pedido en tu cuenta en la sección "Mis Pedidos".',
      category: 'envios'
    },
    {
      question: '¿Qué métodos de pago aceptan?',
      answer: 'Aceptamos tarjetas de crédito y débito (Visa, Mastercard, American Express), PayPal, transferencias bancarias y pagos en efectivo a través de OXXO (solo México). Todos los pagos son procesados de forma segura con encriptación SSL.',
      category: 'pagos'
    },
    {
      question: '¿Es seguro pagar en línea?',
      answer: 'Absolutamente. Utilizamos tecnología de encriptación SSL de última generación para proteger tu información. Nunca almacenamos los datos completos de tu tarjeta en nuestros servidores. Además, cumplimos con los estándares PCI DSS de seguridad de pagos.',
      category: 'pagos'
    },
    {
      question: '¿Puedo pagar en cuotas?',
      answer: 'Sí, ofrecemos planes de pago en mensualidades a través de servicios como Klarna y Afterpay para compras mayores a $100 USD. Puedes dividir tu pago en 3, 6 o 12 mensualidades sin intereses (sujeto a aprobación de crédito).',
      category: 'pagos'
    },
    {
      question: '¿Cómo creo una cuenta?',
      answer: 'Haz clic en "Registro" en la parte superior de la página. Completa el formulario con tu información básica (nombre, email, contraseña). Recibirás un email de confirmación para activar tu cuenta. También puedes registrarte usando tu cuenta de Google o Facebook.',
      category: 'cuenta'
    },
    {
      question: '¿Olvidé mi contraseña, qué hago?',
      answer: 'Haz clic en "Olvidé mi contraseña" en la página de inicio de sesión. Ingresa tu email y te enviaremos un enlace para restablecer tu contraseña. El enlace es válido por 24 horas por seguridad.',
      category: 'cuenta'
    },
    {
      question: '¿Cómo actualizo mi información personal?',
      answer: 'Inicia sesión en tu cuenta y ve a "Mi Cuenta" > "Perfil". Ahí puedes actualizar tu nombre, email, dirección, teléfono y preferencias de comunicación. Los cambios se guardan automáticamente.',
      category: 'cuenta'
    }
  ];

  const filteredFAQs = faqs.filter(faq => {
    const matchesCategory = selectedCategory === 'all' || faq.category === selectedCategory;
    const matchesSearch = faq.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         faq.answer.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const toggleItem = (index: number) => {
    setOpenItems(prev =>
      prev.includes(index) ? prev.filter(i => i !== index) : [...prev, index]
    );
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Hero */}
      <div className="bg-gradient-to-r from-[#003B7A] to-[#7AB82E] text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <div className="text-center">
            <QuestionMarkCircleIcon className="h-16 w-16 mx-auto mb-6" />
            <h1 className="text-5xl font-bold mb-6">Preguntas Frecuentes</h1>
            <p className="text-xl text-blue-100 max-w-3xl mx-auto mb-8">
              Encuentra respuestas rápidas a las preguntas más comunes
            </p>

            {/* Search */}
            <div className="max-w-2xl mx-auto">
              <div className="relative">
                <MagnifyingGlassIcon className="absolute left-4 top-1/2 -translate-y-1/2 h-6 w-6 text-gray-400" />
                <input
                  type="text"
                  placeholder="Buscar en preguntas frecuentes..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-12 pr-4 py-4 rounded-lg text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-white"
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Categories */}
        <div className="mb-8">
          <div className="flex flex-wrap gap-3 justify-center">
            {categories.map((cat) => {
              const Icon = cat.icon;
              return (
                <button
                  key={cat.value}
                  onClick={() => setSelectedCategory(cat.value)}
                  className={`flex items-center gap-2 px-6 py-3 rounded-lg font-medium transition-colors ${
                    selectedCategory === cat.value
                      ? 'bg-[#003B7A] text-white'
                      : 'bg-white text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  <Icon className="h-5 w-5" />
                  <span>{cat.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* FAQs */}
        <div className="max-w-4xl mx-auto">
          {filteredFAQs.length > 0 ? (
            <div className="space-y-4">
              {filteredFAQs.map((faq, index) => (
                <div key={index} className="bg-white rounded-lg shadow">
                  <button
                    onClick={() => toggleItem(index)}
                    className="w-full px-6 py-4 flex items-center justify-between text-left hover:bg-gray-50 transition-colors"
                  >
                    <span className="font-medium text-gray-900 pr-8">{faq.question}</span>
                    {openItems.includes(index) ? (
                      <ChevronUpIcon className="h-5 w-5 text-[#7AB82E] flex-shrink-0" />
                    ) : (
                      <ChevronDownIcon className="h-5 w-5 text-gray-400 flex-shrink-0" />
                    )}
                  </button>
                  {openItems.includes(index) && (
                    <div className="px-6 pb-4">
                      <p className="text-gray-600 leading-relaxed">{faq.answer}</p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12 bg-white rounded-lg">
              <QuestionMarkCircleIcon className="h-16 w-16 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600 text-lg">No se encontraron preguntas con estos criterios</p>
            </div>
          )}
        </div>

        {/* Contact CTA */}
        <div className="mt-16 bg-gradient-to-r from-[#003B7A] to-[#7AB82E] rounded-2xl p-8 text-center text-white">
          <h2 className="text-2xl font-bold mb-4">¿No encontraste tu respuesta?</h2>
          <p className="text-blue-100 mb-6">
            Nuestro equipo de soporte está listo para ayudarte
          </p>
          <a
            href="/contacto"
            className="inline-block px-8 py-3 bg-white text-[#003B7A] font-bold rounded-lg hover:bg-blue-50 transition-colors"
          >
            Contactar Soporte
          </a>
        </div>
      </div>
    </div>
  );
}
