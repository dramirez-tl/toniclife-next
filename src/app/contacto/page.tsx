'use client';

import { useState } from 'react';
import {
  EnvelopeIcon,
  PhoneIcon,
  MapPinIcon,
  ClockIcon,
  ChatBubbleLeftRightIcon,
  QuestionMarkCircleIcon,
  ShoppingBagIcon,
  UserGroupIcon,
} from '@heroicons/react/24/outline';
import { toast } from 'sonner';

export default function ContactoPage() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    reason: '',
    message: ''
  });

  const contactReasons = [
    { value: '', label: 'Selecciona un motivo' },
    { value: 'ventas', label: 'Consulta de Ventas', icon: ShoppingBagIcon },
    { value: 'soporte', label: 'Soporte Técnico', icon: QuestionMarkCircleIcon },
    { value: 'distribuidor', label: 'Información sobre Distribuidores', icon: UserGroupIcon },
    { value: 'producto', label: 'Consulta de Productos', icon: ChatBubbleLeftRightIcon },
    { value: 'otro', label: 'Otro', icon: EnvelopeIcon }
  ];

  const offices = [
    {
      country: 'México',
      city: 'Ciudad de México',
      address: 'Av. Insurgentes Sur 1602, Crédito Constructor, Benito Juárez, 03940 CDMX',
      phone: '+52 55 1234 5678',
      email: 'mexico@toniclife.com',
      hours: 'Lun - Vie: 9:00 AM - 6:00 PM'
    },
    {
      country: 'Colombia',
      city: 'Bogotá',
      address: 'Cra. 7 #71-21, Torre B, Piso 10, Chapinero, Bogotá',
      phone: '+57 1 234 5678',
      email: 'colombia@toniclife.com',
      hours: 'Lun - Vie: 8:00 AM - 5:00 PM'
    },
    {
      country: 'Argentina',
      city: 'Buenos Aires',
      address: 'Av. Corrientes 1234, Piso 5, C1043 CABA',
      phone: '+54 11 2345 6789',
      email: 'argentina@toniclife.com',
      hours: 'Lun - Vie: 9:00 AM - 6:00 PM'
    },
    {
      country: 'Estados Unidos',
      city: 'Miami',
      address: '1200 Brickell Ave, Suite 1950, Miami, FL 33131',
      phone: '+1 305 123 4567',
      email: 'usa@toniclife.com',
      hours: 'Mon - Fri: 9:00 AM - 5:00 PM EST'
    }
  ];

  const socialLinks = [
    { name: 'Facebook', url: 'https://facebook.com/toniclife', icon: '📘' },
    { name: 'Instagram', url: 'https://instagram.com/toniclife', icon: '📷' },
    { name: 'Twitter', url: 'https://twitter.com/toniclife', icon: '🐦' },
    { name: 'LinkedIn', url: 'https://linkedin.com/company/toniclife', icon: '💼' },
    { name: 'YouTube', url: 'https://youtube.com/toniclife', icon: '📺' },
    { name: 'TikTok', url: 'https://tiktok.com/@toniclife', icon: '🎵' }
  ];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    toast.success('¡Mensaje enviado! Te contactaremos pronto.');
    setFormData({ name: '', email: '', phone: '', reason: '', message: '' });
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Hero */}
      <div className="bg-gradient-to-r from-[#003B7A] to-[#7AB82E] text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <div className="text-center">
            <EnvelopeIcon className="h-16 w-16 mx-auto mb-6" />
            <h1 className="text-5xl font-bold mb-6">Contáctanos</h1>
            <p className="text-xl text-blue-100 max-w-3xl mx-auto">
              Estamos aquí para ayudarte. Envíanos un mensaje y te responderemos lo antes posible.
            </p>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Contact Form */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-lg shadow-lg p-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-6">Envíanos un Mensaje</h2>

              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-2">
                      Nombre Completo *
                    </label>
                    <input
                      type="text"
                      id="name"
                      name="name"
                      required
                      value={formData.name}
                      onChange={handleChange}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#003B7A]"
                      placeholder="Tu nombre"
                    />
                  </div>

                  <div>
                    <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                      Email *
                    </label>
                    <input
                      type="email"
                      id="email"
                      name="email"
                      required
                      value={formData.email}
                      onChange={handleChange}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#003B7A]"
                      placeholder="tu@email.com"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-2">
                      Teléfono
                    </label>
                    <input
                      type="tel"
                      id="phone"
                      name="phone"
                      value={formData.phone}
                      onChange={handleChange}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#003B7A]"
                      placeholder="+52 55 1234 5678"
                    />
                  </div>

                  <div>
                    <label htmlFor="reason" className="block text-sm font-medium text-gray-700 mb-2">
                      Motivo de Contacto *
                    </label>
                    <select
                      id="reason"
                      name="reason"
                      required
                      value={formData.reason}
                      onChange={handleChange}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#003B7A]"
                    >
                      {contactReasons.map((reason) => (
                        <option key={reason.value} value={reason.value}>
                          {reason.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label htmlFor="message" className="block text-sm font-medium text-gray-700 mb-2">
                    Mensaje *
                  </label>
                  <textarea
                    id="message"
                    name="message"
                    required
                    rows={6}
                    value={formData.message}
                    onChange={handleChange}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#003B7A] resize-none"
                    placeholder="Cuéntanos cómo podemos ayudarte..."
                  />
                </div>

                <button
                  type="submit"
                  className="w-full px-8 py-4 bg-[#003B7A] text-white font-bold rounded-lg hover:bg-[#002855] transition-colors"
                >
                  Enviar Mensaje
                </button>
              </form>
            </div>
          </div>

          {/* Contact Info Sidebar */}
          <div className="space-y-6">
            {/* Quick Contact */}
            <div className="bg-white rounded-lg shadow-lg p-6">
              <h3 className="text-xl font-bold text-gray-900 mb-4">Contacto Rápido</h3>

              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <PhoneIcon className="h-6 w-6 text-[#7AB82E] flex-shrink-0 mt-1" />
                  <div>
                    <p className="font-medium text-gray-900">Teléfono</p>
                    <p className="text-gray-600">+52 55 1234 5678</p>
                    <p className="text-sm text-gray-500">Lun - Vie: 9AM - 6PM</p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <EnvelopeIcon className="h-6 w-6 text-[#7AB82E] flex-shrink-0 mt-1" />
                  <div>
                    <p className="font-medium text-gray-900">Email</p>
                    <p className="text-gray-600">soporte@toniclife.com</p>
                    <p className="text-sm text-gray-500">Respuesta en 24 hrs</p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <ChatBubbleLeftRightIcon className="h-6 w-6 text-[#7AB82E] flex-shrink-0 mt-1" />
                  <div>
                    <p className="font-medium text-gray-900">Chat en Vivo</p>
                    <p className="text-gray-600">Disponible ahora</p>
                    <button className="text-sm text-[#003B7A] font-medium hover:underline">
                      Iniciar chat →
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Social Media */}
            <div className="bg-white rounded-lg shadow-lg p-6">
              <h3 className="text-xl font-bold text-gray-900 mb-4">Síguenos</h3>
              <div className="grid grid-cols-3 gap-3">
                {socialLinks.map((social) => (
                  <a
                    key={social.name}
                    href={social.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex flex-col items-center p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                  >
                    <span className="text-2xl mb-1">{social.icon}</span>
                    <span className="text-xs text-gray-600">{social.name}</span>
                  </a>
                ))}
              </div>
            </div>

            {/* FAQ Link */}
            <div className="bg-gradient-to-br from-[#003B7A] to-[#7AB82E] rounded-lg p-6 text-white">
              <QuestionMarkCircleIcon className="h-10 w-10 mb-3" />
              <h3 className="text-lg font-bold mb-2">¿Tienes una pregunta?</h3>
              <p className="text-blue-100 text-sm mb-4">
                Visita nuestra sección de preguntas frecuentes
              </p>
              <a
                href="/faq"
                className="inline-block px-4 py-2 bg-white text-[#003B7A] font-medium rounded-lg hover:bg-blue-50 transition-colors text-sm"
              >
                Ver FAQ
              </a>
            </div>
          </div>
        </div>

        {/* Offices */}
        <div className="mt-12">
          <h2 className="text-3xl font-bold text-gray-900 text-center mb-8">Nuestras Oficinas</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {offices.map((office, index) => (
              <div key={index} className="bg-white rounded-lg shadow-lg p-6 hover:shadow-xl transition-shadow">
                <h3 className="text-xl font-bold text-[#003B7A] mb-4">{office.country}</h3>
                <div className="space-y-3 text-sm">
                  <div className="flex items-start gap-2">
                    <MapPinIcon className="h-5 w-5 text-[#7AB82E] flex-shrink-0 mt-0.5" />
                    <p className="text-gray-600">{office.address}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <PhoneIcon className="h-5 w-5 text-[#7AB82E] flex-shrink-0" />
                    <p className="text-gray-900 font-medium">{office.phone}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <EnvelopeIcon className="h-5 w-5 text-[#7AB82E] flex-shrink-0" />
                    <p className="text-gray-900">{office.email}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <ClockIcon className="h-5 w-5 text-[#7AB82E] flex-shrink-0" />
                    <p className="text-gray-600">{office.hours}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
