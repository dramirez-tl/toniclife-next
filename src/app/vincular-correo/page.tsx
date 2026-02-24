'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Button } from '@/components/ui/Button';
import { Card, CardContent } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import {
  EnvelopeIcon,
  ShieldCheckIcon,
  ArrowLeftIcon,
  CheckCircleIcon,
} from '@heroicons/react/24/outline';
import { toast } from 'sonner';
import { useAppSelector, useAppDispatch } from '@/store/hooks';
import {
  selectEmailLinkRequired,
  clearEmailLinkRequired,
  setUser,
} from '@/store/slices/authSlice';
import { authService } from '@/services/auth.service';

export default function VincularCorreoPage() {
  const dispatch = useAppDispatch();
  const reduxData = useAppSelector(selectEmailLinkRequired);

  // Hydrate from sessionStorage when Redux state is lost (full-page navigation)
  const [sessionData, setSessionData] = useState<typeof reduxData>(null);
  const [hydrated, setHydrated] = useState(false);
  useEffect(() => {
    if (!reduxData) {
      try {
        const stored = sessionStorage.getItem('emailLinkRequired');
        if (stored) {
          setSessionData(JSON.parse(stored));
        }
      } catch { /* ignore */ }
    }
    setHydrated(true);
  }, [reduxData]);

  const emailLinkData = reduxData || sessionData;

  const [step, setStep] = useState<1 | 2>(1);
  const [email, setEmail] = useState('');
  const [code, setCode] = useState(['', '', '', '', '', '']);
  const [emailError, setEmailError] = useState('');
  const [codeError, setCodeError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Redirect to login if no emailLinkData (wait for hydration first)
  useEffect(() => {
    if (hydrated && !emailLinkData) {
      window.location.href = '/login';
    }
  }, [hydrated, emailLinkData]);

  if (!emailLinkData) {
    return null;
  }

  const handleSendCode = async (e: React.FormEvent) => {
    e.preventDefault();

    const trimmedEmail = email.trim().toLowerCase();
    if (!trimmedEmail) {
      setEmailError('El correo electrónico es requerido');
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
      setEmailError('Ingresa un correo electrónico válido');
      return;
    }

    setEmailError('');
    setIsLoading(true);

    try {
      await authService.linkEmail({
        linkToken: emailLinkData.linkToken,
        email: trimmedEmail,
      });
      toast.success('Código enviado a tu correo electrónico');
      setStep(2);
      // Focus first code input
      setTimeout(() => inputRefs.current[0]?.focus(), 100);
    } catch (error: any) {
      const msg = error?.response?.data?.message || 'Error al enviar el código';
      toast.error(msg);
      setEmailError(msg);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCodeChange = (index: number, value: string) => {
    // Only allow digits
    const digit = value.replace(/\D/g, '').slice(-1);
    const newCode = [...code];
    newCode[index] = digit;
    setCode(newCode);
    setCodeError('');

    // Auto-focus next input
    if (digit && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleCodeKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && !code[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handleCodePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (pasted.length === 6) {
      const newCode = pasted.split('');
      setCode(newCode);
      inputRefs.current[5]?.focus();
    }
  };

  const handleVerifyCode = async (e: React.FormEvent) => {
    e.preventDefault();

    const fullCode = code.join('');
    if (fullCode.length !== 6) {
      setCodeError('Ingresa el código completo de 6 dígitos');
      return;
    }

    setCodeError('');
    setIsLoading(true);

    try {
      const response = await authService.verifyLinkEmail({
        linkToken: emailLinkData.linkToken,
        code: fullCode,
      });

      toast.success('Correo vinculado exitosamente');

      // Set user in Redux state
      dispatch(setUser(response.user));
      dispatch(clearEmailLinkRequired());

      // Redirect based on role
      const role = response.user.roles?.[0];
      const adminRoles = ['super_admin', 'administrador', 'subadmin', 'almacen', 'ventas_mostrador', 'rh', 'contabilidad', 'auditor', 'viewer'];

      if (role && adminRoles.includes(role)) {
        window.location.href = '/admin';
      } else {
        window.location.href = '/distribuidor';
      }
    } catch (error: any) {
      const msg = error?.response?.data?.message || 'Código incorrecto o expirado';
      toast.error(msg);
      setCodeError(msg);
    } finally {
      setIsLoading(false);
    }
  };

  const handleBackToEmail = () => {
    setStep(1);
    setCode(['', '', '', '', '', '']);
    setCodeError('');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-[#003B7A]/10 px-4 py-10 sm:px-6 lg:px-8 lg:py-14">
      <div className="mx-auto flex w-full max-w-5xl items-center justify-center">
        <div className="w-full max-w-md space-y-6">
          <div className="text-center">
            <Link href="/">
              <Image
                src="/images/logo.png"
                alt="Tonic Life"
                width={180}
                height={64}
                className="mx-auto mb-4 h-10 w-auto"
              />
            </Link>
            <div className="inline-flex items-center gap-2 rounded-full bg-[#003B7A]/8 px-3 py-1 text-xs font-medium text-[#003B7A]">
              <ShieldCheckIcon className="h-3.5 w-3.5" />
              Vinculación de correo
            </div>
            <h2 className="mt-3 text-2xl font-bold tracking-tight text-gray-900 sm:text-3xl">
              Vincular correo electrónico
            </h2>
            <p className="mt-2 text-sm text-gray-600">
              Hola <span className="font-semibold text-[#003B7A]">{emailLinkData.distributorName}</span>,
              vincula un correo electrónico a tu cuenta de distribuidor
              <span className="font-mono font-semibold text-[#7AB82E]"> #{emailLinkData.legacyId}</span>.
            </p>
          </div>

          <Card className="rounded-3xl border border-gray-100 bg-white/95 shadow-2xl shadow-gray-200/70 backdrop-blur">
            <CardContent className="p-7 sm:p-8 lg:p-9">
              {/* Step indicators */}
              <div className="mb-6 flex items-center justify-center gap-3">
                <div className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-bold ${
                  step === 1
                    ? 'bg-[#003B7A] text-white'
                    : 'bg-[#7AB82E] text-white'
                }`}>
                  {step > 1 ? <CheckCircleIcon className="h-5 w-5" /> : '1'}
                </div>
                <div className={`h-0.5 w-12 ${step > 1 ? 'bg-[#7AB82E]' : 'bg-gray-200'}`} />
                <div className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-bold ${
                  step === 2
                    ? 'bg-[#003B7A] text-white'
                    : 'bg-gray-200 text-gray-500'
                }`}>
                  2
                </div>
              </div>

              {step === 1 ? (
                /* Step 1: Enter email */
                <form onSubmit={handleSendCode} className="space-y-6">
                  <div className="rounded-2xl border border-blue-100 bg-blue-50/50 p-4">
                    <p className="text-sm text-gray-700">
                      Para completar la migración de tu cuenta, necesitamos vincular
                      un correo electrónico real. Este será tu nuevo método de inicio de sesión.
                    </p>
                  </div>

                  <Input
                    label="Correo electrónico"
                    type="email"
                    placeholder="tu@email.com"
                    value={email}
                    onChange={(e) => { setEmail(e.target.value); setEmailError(''); }}
                    error={emailError}
                    leftIcon={<EnvelopeIcon className="h-5 w-5" />}
                    autoComplete="email"
                    disabled={isLoading}
                    autoFocus
                  />

                  <Button
                    type="submit"
                    variant="primary"
                    size="lg"
                    className="w-full h-12 text-base font-semibold"
                    disabled={isLoading}
                  >
                    {isLoading ? 'Enviando código...' : 'Enviar código de verificación'}
                  </Button>

                  <div className="text-center">
                    <Link
                      href="/login"
                      className="inline-flex items-center gap-1 text-sm font-medium text-gray-500 transition-colors hover:text-[#003B7A]"
                      onClick={() => dispatch(clearEmailLinkRequired())}
                    >
                      <ArrowLeftIcon className="h-4 w-4" />
                      Volver al inicio de sesión
                    </Link>
                  </div>
                </form>
              ) : (
                /* Step 2: Enter verification code */
                <form onSubmit={handleVerifyCode} className="space-y-6">
                  <div className="rounded-2xl border border-green-100 bg-green-50/50 p-4">
                    <p className="text-sm text-gray-700">
                      Enviamos un código de 6 dígitos a{' '}
                      <span className="font-semibold text-[#003B7A]">{email}</span>.
                      Revisa tu bandeja de entrada y spam.
                    </p>
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-medium text-gray-700">
                      Código de verificación
                    </label>
                    <div className="flex justify-center gap-2" onPaste={handleCodePaste}>
                      {code.map((digit, index) => (
                        <input
                          key={index}
                          ref={(el) => { inputRefs.current[index] = el; }}
                          type="text"
                          inputMode="numeric"
                          maxLength={1}
                          value={digit}
                          onChange={(e) => handleCodeChange(index, e.target.value)}
                          onKeyDown={(e) => handleCodeKeyDown(index, e)}
                          className={`h-14 w-12 rounded-xl border-2 text-center text-2xl font-bold transition-colors focus:border-[#003B7A] focus:outline-none focus:ring-2 focus:ring-[#003B7A]/20 ${
                            codeError ? 'border-red-300 bg-red-50' : 'border-gray-200 bg-gray-50'
                          }`}
                          disabled={isLoading}
                        />
                      ))}
                    </div>
                    {codeError && (
                      <p className="mt-2 text-center text-sm text-red-600">{codeError}</p>
                    )}
                  </div>

                  <Button
                    type="submit"
                    variant="primary"
                    size="lg"
                    className="w-full h-12 text-base font-semibold"
                    disabled={isLoading || code.join('').length !== 6}
                  >
                    {isLoading ? 'Verificando...' : 'Verificar y continuar'}
                  </Button>

                  <div className="text-center">
                    <button
                      type="button"
                      onClick={handleBackToEmail}
                      className="inline-flex items-center gap-1 text-sm font-medium text-gray-500 transition-colors hover:text-[#003B7A]"
                      disabled={isLoading}
                    >
                      <ArrowLeftIcon className="h-4 w-4" />
                      Cambiar correo o reenviar código
                    </button>
                  </div>
                </form>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
