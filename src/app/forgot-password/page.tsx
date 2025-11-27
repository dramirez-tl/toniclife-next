'use client';

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Button } from '@/components/ui/Button';
import { Card, CardContent } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { EnvelopeIcon, ArrowLeftIcon, CheckCircleIcon } from '@heroicons/react/24/outline';
import { toast } from 'sonner';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [emailSent, setEmailSent] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validación
    if (!email) {
      setError('El email es requerido');
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError('Email inválido');
      return;
    }

    setIsLoading(true);
    setError('');

    // Simulación de envío de email (reemplazar con API call)
    setTimeout(() => {
      setIsLoading(false);
      setEmailSent(true);
      toast.success('Email de recuperación enviado');
    }, 1500);
  };

  if (emailSent) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full">
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

          <Card>
            <CardContent className="p-8 text-center">
              <div className="w-16 h-16 bg-[#7AB82E]/10 rounded-full flex items-center justify-center mx-auto mb-6">
                <CheckCircleIcon className="h-10 w-10 text-[#7AB82E]" />
              </div>

              <h2 className="text-2xl font-bold text-gray-900 mb-2">
                ¡Revisa tu email!
              </h2>

              <p className="text-gray-600 mb-6">
                Te enviamos un enlace de recuperación a
              </p>

              <div className="bg-gray-50 rounded-lg p-4 mb-6">
                <p className="font-medium text-[#003B7A]">{email}</p>
              </div>

              <div className="text-sm text-gray-600 mb-6 space-y-2">
                <p>📧 Revisa tu bandeja de entrada</p>
                <p>📁 Verifica la carpeta de spam</p>
                <p>⏱️ El enlace expira en 1 hora</p>
              </div>

              <div className="space-y-3">
                <Link href="/login">
                  <Button variant="primary" className="w-full">
                    Volver al login
                  </Button>
                </Link>

                <button
                  onClick={() => {
                    setEmailSent(false);
                    setEmail('');
                  }}
                  className="w-full text-sm text-[#003B7A] hover:text-[#7AB82E] transition-colors"
                >
                  ¿No recibiste el email? Reenviar
                </button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full">
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
          <h2 className="text-3xl font-bold text-gray-900">
            ¿Olvidaste tu contraseña?
          </h2>
          <p className="mt-2 text-sm text-gray-600">
            No te preocupes, te ayudamos a recuperarla
          </p>
        </div>

        <Card>
          <CardContent className="p-8">
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <p className="text-sm text-blue-800">
                  Ingresa tu correo electrónico y te enviaremos un enlace para restablecer tu contraseña.
                </p>
              </div>

              <Input
                label="Correo electrónico"
                type="email"
                placeholder="tu@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                error={error}
                leftIcon={<EnvelopeIcon className="h-5 w-5" />}
                autoComplete="email"
                autoFocus
              />

              <Button
                type="submit"
                variant="primary"
                size="lg"
                className="w-full"
                disabled={isLoading}
              >
                {isLoading ? 'Enviando...' : 'Enviar enlace de recuperación'}
              </Button>

              <Link href="/login">
                <Button
                  type="button"
                  variant="outline"
                  size="lg"
                  className="w-full"
                  leftIcon={<ArrowLeftIcon className="h-5 w-5" />}
                >
                  Volver al login
                </Button>
              </Link>
            </form>
          </CardContent>
        </Card>

        <div className="mt-6 text-center">
          <p className="text-sm text-gray-600">
            ¿Necesitas ayuda?{' '}
            <Link href="/contacto" className="font-medium text-[#003B7A] hover:text-[#7AB82E] transition-colors">
              Contacta a soporte
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
