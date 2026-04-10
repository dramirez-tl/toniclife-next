'use client';

import { useState, useEffect, useRef, Suspense } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import { Card, CardContent } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import {
  CheckCircleIcon,
  ExclamationTriangleIcon,
  EnvelopeIcon,
} from '@heroicons/react/24/outline';
import { toast } from 'sonner';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import {
  verifyEmailAsync,
  resendVerificationAsync,
  selectIsLoading,
  selectAuthError,
  clearError,
} from '@/store/slices/authSlice';

function VerifyEmailContent() {
  const searchParams = useSearchParams();
  const dispatch = useAppDispatch();

  const isLoading = useAppSelector(selectIsLoading);
  const authError = useAppSelector(selectAuthError);

  const token = searchParams.get('token');
  const hasVerified = useRef(false);

  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [resendEmail, setResendEmail] = useState('');
  const [resendError, setResendError] = useState('');
  const [resendSent, setResendSent] = useState(false);

  // Auto-trigger verification on mount
  useEffect(() => {
    if (!token) {
      setStatus('error');
      return;
    }

    if (hasVerified.current) return;
    hasVerified.current = true;

    const verify = async () => {
      try {
        await dispatch(verifyEmailAsync(token)).unwrap();
        setStatus('success');
        toast.success('¡Email verificado exitosamente!');
      } catch {
        setStatus('error');
      }
    };

    verify();
  }, [token, dispatch]);

  // Show auth error as toast
  useEffect(() => {
    if (authError) {
      toast.error(authError);
      dispatch(clearError());
    }
  }, [authError, dispatch]);

  const handleResend = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!resendEmail) {
      setResendError('El email es requerido');
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(resendEmail)) {
      setResendError('Email inválido');
      return;
    }

    setResendError('');

    try {
      await dispatch(resendVerificationAsync(resendEmail)).unwrap();
      setResendSent(true);
      toast.success('Se ha reenviado el email de verificación');
    } catch {
      // Error is handled via authError state
    }
  };

  // Loading state
  if (status === 'loading') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full">
          <div className="text-center mb-8">
            <Link href="/">
              <Image
                src="/images/logo/svg/logo-text-blue-r.svg"
                alt="Tonic Life"
                width={200}
                height={80}
                className="h-12 w-auto mx-auto mb-6"
              />
            </Link>
          </div>

          <Card>
            <CardContent className="p-8 text-center">
              <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-[#a7c1e2] mx-auto mb-6"></div>

              <h2 className="text-2xl font-bold text-gray-900 mb-2">
                Verificando tu email...
              </h2>

              <p className="text-gray-600">
                Espera un momento mientras verificamos tu dirección de correo electrónico.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // Success state
  if (status === 'success') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full">
          <div className="text-center mb-8">
            <Link href="/">
              <Image
                src="/images/logo/svg/logo-text-blue-r.svg"
                alt="Tonic Life"
                width={200}
                height={80}
                className="h-12 w-auto mx-auto mb-6"
              />
            </Link>
          </div>

          <Card>
            <CardContent className="p-8 text-center">
              <div className="w-16 h-16 bg-[#C8DDF2]/10 rounded-full flex items-center justify-center mx-auto mb-6">
                <CheckCircleIcon className="h-10 w-10 text-[#3E667D]" />
              </div>

              <h2 className="text-2xl font-bold text-gray-900 mb-2">
                ¡Email verificado!
              </h2>

              <p className="text-gray-600 mb-6">
                Tu dirección de correo electrónico ha sido verificada exitosamente.
                Ya puedes iniciar sesión en tu cuenta.
              </p>

              <Link href="/login">
                <Button variant="primary" size="lg" className="w-full">
                  Iniciar sesión
                </Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // Error state
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full">
        <div className="text-center mb-8">
          <Link href="/">
            <Image
              src="/images/logo/svg/logo-text-blue-r.svg"
              alt="Tonic Life"
              width={200}
              height={80}
              className="h-12 w-auto mx-auto mb-6"
            />
          </Link>
        </div>

        <Card>
          <CardContent className="p-8 text-center">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <ExclamationTriangleIcon className="h-10 w-10 text-red-500" />
            </div>

            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              Verificación fallida
            </h2>

            <p className="text-gray-600 mb-6">
              {!token
                ? 'No se encontró un token de verificación en el enlace.'
                : 'El enlace de verificación es inválido o ha expirado.'}
            </p>

            {/* Resend verification form */}
            {!resendSent ? (
              <div className="border-t border-gray-200 pt-6">
                <p className="text-sm text-gray-600 mb-4">
                  Ingresa tu email para recibir un nuevo enlace de verificación:
                </p>
                <form onSubmit={handleResend} className="space-y-4">
                  <Input
                    type="email"
                    placeholder="tu@email.com"
                    value={resendEmail}
                    onChange={(e) => setResendEmail(e.target.value)}
                    error={resendError}
                    leftIcon={<EnvelopeIcon className="h-5 w-5" />}
                    autoComplete="email"
                    disabled={isLoading}
                  />
                  <Button
                    type="submit"
                    variant="primary"
                    className="w-full"
                    isLoading={isLoading}
                    disabled={isLoading}
                  >
                    {isLoading ? 'Enviando...' : 'Reenviar verificación'}
                  </Button>
                </form>
              </div>
            ) : (
              <div className="border-t border-gray-200 pt-6">
                <div className="bg-[#C8DDF2]/10 rounded-lg p-4 mb-4">
                  <p className="text-sm text-[#3E667D] font-medium">
                    Se ha enviado un nuevo enlace de verificación a tu email.
                  </p>
                </div>
              </div>
            )}

            <div className="mt-4">
              <Link href="/login">
                <Button variant="outline" className="w-full">
                  Volver al login
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#a7c1e2] mx-auto mb-4"></div>
            <p className="text-gray-600">Cargando...</p>
          </div>
        </div>
      }
    >
      <VerifyEmailContent />
    </Suspense>
  );
}
