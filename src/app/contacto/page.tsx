'use client';

import Link from 'next/link';
import {
  EnvelopeIcon,
  ClockIcon,
  ChatBubbleLeftRightIcon,
  QuestionMarkCircleIcon,
} from '@heroicons/react/24/outline';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

// Canales REALES de atención (los mismos que usa el Footer y el flujo de
// registro). La versión anterior tenía un formulario que fingía enviar
// mensajes (solo mostraba un toast) y oficinas/teléfonos inventados; se
// retiró para no tirar solicitudes de soporte a la basura (auditoría
// jun-2026). Si algún día se quiere formulario, debe existir primero un
// endpoint real que entregue el mensaje (p. ej. vía Resend).
const WHATSAPP_URL =
  'https://api.whatsapp.com/send?phone=5214623356500&text=Hola%20me%20podr%C3%ADan%20ayudar';
const SUPPORT_EMAIL = 'soporte@toniclife.com';
const INFO_EMAIL = 'Informes@toniclife.com';

const channels = [
  {
    icon: ChatBubbleLeftRightIcon,
    title: 'WhatsApp',
    description: 'La vía más rápida para dudas de pedidos, productos y soporte.',
    actionLabel: 'Abrir WhatsApp',
    href: WHATSAPP_URL,
    external: true,
  },
  {
    icon: EnvelopeIcon,
    title: 'Soporte',
    description: `Problemas con tu cuenta, tu pedido o la plataforma: ${SUPPORT_EMAIL}`,
    actionLabel: 'Escribir a soporte',
    href: `mailto:${SUPPORT_EMAIL}`,
    external: false,
  },
  {
    icon: EnvelopeIcon,
    title: 'Informes',
    description: `Ventas, distribución y temas generales: ${INFO_EMAIL}`,
    actionLabel: 'Escribir a informes',
    href: `mailto:${INFO_EMAIL}`,
    external: false,
  },
];

export default function ContactoPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Hero */}
      <div className="bg-gradient-to-r from-[#3E667D] to-[#C8DDF2] text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <div className="text-center">
            <EnvelopeIcon className="h-16 w-16 mx-auto mb-6" />
            <h1 className="text-5xl font-bold mb-6">Contáctanos</h1>
            <p className="text-xl text-blue-100 max-w-3xl mx-auto">
              Estamos aquí para ayudarte. Elige el canal que prefieras y te
              respondemos lo antes posible.
            </p>
          </div>
        </div>
      </div>

      {/* Canales */}
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {channels.map((channel) => (
            <Card key={channel.title}>
              <CardContent className="flex h-full flex-col items-start gap-3 p-6">
                <channel.icon className="h-8 w-8 text-[#3E667D]" />
                <h2 className="text-lg font-bold text-gray-900">
                  {channel.title}
                </h2>
                <p className="flex-1 text-sm text-gray-600">
                  {channel.description}
                </p>
                <Button asChild className="w-full">
                  <a
                    href={channel.href}
                    {...(channel.external
                      ? { target: '_blank', rel: 'noopener noreferrer' }
                      : {})}
                  >
                    {channel.actionLabel}
                  </a>
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Horario + FAQ */}
        <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card>
            <CardContent className="flex items-start gap-4 p-6">
              <ClockIcon className="h-8 w-8 flex-shrink-0 text-[#3E667D]" />
              <div>
                <h2 className="text-lg font-bold text-gray-900">
                  Horario de atención
                </h2>
                <p className="text-sm text-gray-600">
                  Lunes a viernes, 9:00 a 18:00 (hora del centro de México).
                  Los mensajes fuera de horario se responden el siguiente día
                  hábil.
                </p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="flex items-start gap-4 p-6">
              <QuestionMarkCircleIcon className="h-8 w-8 flex-shrink-0 text-[#3E667D]" />
              <div>
                <h2 className="text-lg font-bold text-gray-900">
                  Preguntas frecuentes
                </h2>
                <p className="text-sm text-gray-600">
                  Muchas dudas de envíos, pagos y devoluciones ya están
                  resueltas ahí.
                </p>
                <Button variant="link" size="sm" asChild className="px-0">
                  <Link href="/faq">Ver preguntas frecuentes</Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
