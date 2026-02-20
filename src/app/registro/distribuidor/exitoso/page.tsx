'use client';

import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { Button } from '@/components/ui/Button';
import { Card, CardContent } from '@/components/ui/Card';
import {
  CheckCircleIcon,
  ClipboardDocumentIcon,
  EnvelopeIcon,
  CreditCardIcon,
  UserGroupIcon,
} from '@heroicons/react/24/outline';
import { toast } from 'sonner';

function RegistroExitosoContent() {
  const searchParams = useSearchParams();
  const referralCode = searchParams.get('referralCode') || '';
  const sponsorName = searchParams.get('sponsor') || '';

  const copyReferralCode = () => {
    navigator.clipboard.writeText(referralCode);
    toast.success('Código copiado al portapapeles');
  };

  const steps = [
    {
      icon: CreditCardIcon,
      title: 'Realiza el pago de tu kit',
      description: 'Recibirás instrucciones de pago en tu correo electrónico.',
    },
    {
      icon: CheckCircleIcon,
      title: 'Confirmación de pago',
      description: 'Una vez confirmado tu pago, activaremos tu cuenta de distribuidor.',
    },
    {
      icon: UserGroupIcon,
      title: 'Comienza a construir tu red',
      description: 'Comparte tu código de referido y empieza a ganar comisiones.',
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-gray-100 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-2xl mx-auto">
        {/* Logo */}
        <div className="text-center mb-8">
          <Link href="/">
            <Image
              src="/images/logo.png"
              alt="Tonic Life"
              width={200}
              height={80}
              className="h-12 w-auto mx-auto mb-6"
            />
          </Link>
        </div>

        {/* Success Card */}
        <Card className="mb-6 overflow-hidden">
          <div className="bg-gradient-to-r from-[#7AB82E] to-[#5fa31f] p-6 text-white text-center">
            <div className="w-20 h-20 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircleIcon className="h-12 w-12 text-white" />
            </div>
            <h1 className="text-2xl font-bold mb-2">
              ¡Registro Exitoso!
            </h1>
            <p className="text-white/90">
              Tu solicitud de distribuidor ha sido recibida
            </p>
          </div>

          <CardContent className="p-6">
            {/* Referral Code */}
            {referralCode && (
              <div className="bg-gray-50 rounded-lg p-4 mb-6">
                <p className="text-sm text-gray-600 mb-2">Tu código de referido:</p>
                <div className="flex items-center justify-between bg-white border rounded-lg p-3">
                  <span className="text-2xl font-bold text-[#003B7A] tracking-wider">
                    {referralCode}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={copyReferralCode}
                    className="flex items-center gap-1"
                  >
                    <ClipboardDocumentIcon className="h-4 w-4" />
                    Copiar
                  </Button>
                </div>
                <p className="text-xs text-gray-500 mt-2">
                  Comparte este código con tus amigos para que se unan a tu red
                </p>
              </div>
            )}

            {/* Sponsor Info */}
            {sponsorName && (
              <div className="mb-6 p-4 border border-gray-200 rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-[#003B7A]/10 rounded-full flex items-center justify-center">
                    <UserGroupIcon className="h-5 w-5 text-[#003B7A]" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Tu patrocinador</p>
                    <p className="font-medium text-gray-900">{sponsorName}</p>
                  </div>
                </div>
              </div>
            )}

            {/* Next Steps */}
            <div className="mb-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">
                Próximos pasos
              </h2>
              <div className="space-y-4">
                {steps.map((step, index) => (
                  <div key={index} className="flex gap-4">
                    <div className="flex-shrink-0">
                      <div className="w-8 h-8 bg-[#003B7A]/10 rounded-full flex items-center justify-center">
                        <step.icon className="h-4 w-4 text-[#003B7A]" />
                      </div>
                    </div>
                    <div>
                      <h3 className="font-medium text-gray-900">{step.title}</h3>
                      <p className="text-sm text-gray-500">{step.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Email Notice */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
              <div className="flex gap-3">
                <EnvelopeIcon className="h-5 w-5 text-blue-500 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm text-blue-700">
                    <strong>Revisa tu correo electrónico.</strong> Te hemos enviado las instrucciones para completar el pago de tu kit y activar tu cuenta.
                  </p>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-3">
              <Link href="/login" className="flex-1">
                <Button variant="primary" size="lg" className="w-full">
                  Ir a Iniciar Sesión
                </Button>
              </Link>
              <Link href="/" className="flex-1">
                <Button variant="outline" size="lg" className="w-full">
                  Volver al Inicio
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>

        {/* Help Card */}
        <Card className="bg-gray-50">
          <CardContent className="p-4">
            <p className="text-sm text-gray-600 text-center">
              ¿Tienes preguntas? Contacta a tu patrocinador o escríbenos a{' '}
              <a href="mailto:soporte@toniclife.com" className="text-[#003B7A] hover:underline">
                soporte@toniclife.com
              </a>
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default function RegistroExitosoPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-gray-100 py-12 px-4 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#7AB82E] mx-auto"></div>
          <p className="mt-4 text-gray-600">Cargando...</p>
        </div>
      </div>
    }>
      <RegistroExitosoContent />
    </Suspense>
  );
}
