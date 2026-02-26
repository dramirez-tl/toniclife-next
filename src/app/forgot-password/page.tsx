'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Button } from '@/components/ui/Button';
import { Card, CardContent } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { EnvelopeIcon, ArrowLeftIcon, CheckCircleIcon } from '@heroicons/react/24/outline';
import { toast } from 'sonner';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import {
  forgotPasswordAsync,
  selectIsLoading,
  selectAuthError,
  clearError,
} from '@/store/slices/authSlice';

export default function ForgotPasswordPage() {
  const dispatch = useAppDispatch();

  const isLoading = useAppSelector(selectIsLoading);
  const authError = useAppSelector(selectAuthError);

  const [email, setEmail] = useState('');
  const [emailSent, setEmailSent] = useState(false);
  const [error, setError] = useState('');

  // Show auth error as toast
  useEffect(() => {
    if (authError) {
      toast.error(authError);
      dispatch(clearError());
    }
  }, [authError, dispatch]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validation
    if (!email) {
      setError('El email es requerido');
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError('Email inválido');
      return;
    }

    setError('');

    try {
      await dispatch(forgotPasswordAsync({ email })).unwrap();
      setEmailSent(true);
      toast.success('Se ha enviado un enlace de recuperación a tu email');
    } catch {
      // Error is handled via authError state
    }
  };

  if (emailSent) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-[#3E667D]/5 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full">
          <div className="text-center mb-8">
            <Link href="/">
              <Image
                src="/images/logo/logo-text-dark.png"
                alt="Tonic Life"
                width={200}
                height={80}
                className="h-12 w-auto mx-auto mb-6"
              />
            </Link>
          </div>

          <Card className="rounded-3xl border-gray-100 shadow-xl shadow-gray-100/70">
            <CardContent className="p-8 text-center">
              <div className="w-16 h-16 bg-[#C8DDF2]/10 rounded-full flex items-center justify-center mx-auto mb-6">
                <CheckCircleIcon className="h-10 w-10 text-[#3E667D]" />
              </div>

              <h2 className="text-2xl font-bold text-gray-900 mb-2">
                ¡Revisa tu email!
              </h2>

              <p className="text-gray-600 mb-6">
                Se ha enviado un enlace de recuperación a
              </p>

              <div className="bg-gray-50 rounded-lg p-4 mb-6">
                <p className="font-medium text-[#3E667D]">{email}</p>
              </div>

              <div className="text-sm text-gray-600 mb-6 space-y-2">
                <p>• Revisa tu bandeja de entrada</p>
                <p>• Verifica la carpeta de spam</p>
                <p>• El enlace expira en 1 hora</p>
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
                  className="w-full rounded-lg px-3 py-2 text-sm text-[#3E667D] hover:bg-[#3E667D]/5 hover:text-[#3E667D] transition-colors"
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
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-[#3E667D]/5 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full">
        <div className="text-center mb-8">
          <Link href="/">
            <Image
              src="/images/logo/logo-text-dark.png"
              alt="Tonic Life"
              width={200}
              height={80}
              className="h-12 w-auto mx-auto mb-6"
            />
          </Link>
          <div className="inline-flex items-center gap-2 rounded-full bg-[#3E667D]/8 px-3 py-1 text-xs font-medium text-[#3E667D] mb-3">
            <EnvelopeIcon className="h-3.5 w-3.5" />
            Recuperación segura
          </div>
          <h2 className="text-3xl font-bold tracking-tight text-gray-900">
            ¿Olvidaste tu contraseña?
          </h2>
          <p className="mt-2 text-sm text-gray-600">
            No te preocupes, te ayudamos a recuperarla
          </p>
        </div>

        <Card className="rounded-3xl border-gray-100 shadow-xl shadow-gray-100/70">
          <CardContent className="p-8">
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="rounded-xl border border-[#3E667D]/15 bg-[#3E667D]/5 p-4">
                <p className="text-sm text-[#3E667D]/90">
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
                disabled={isLoading}
              />

              <Button
                type="submit"
                variant="primary"
                size="lg"
                className="w-full h-12"
                isLoading={isLoading}
                disabled={isLoading}
              >
                {isLoading ? 'Enviando...' : 'Enviar enlace de recuperación'}
              </Button>

              <Link href="/login">
                <Button
                  type="button"
                  variant="outline"
                  size="lg"
                  className="w-full h-12"
                  leftIcon={<ArrowLeftIcon className="h-5 w-5" />}
                  disabled={isLoading}
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
            <Link href="/contacto" className="font-medium text-[#3E667D] hover:text-[#3E667D] transition-colors">
              Contacta a soporte
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
