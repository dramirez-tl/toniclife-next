'use client';

import { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter, useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2 } from 'lucide-react';
import {
  LockClosedIcon,
  EyeIcon,
  EyeSlashIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
} from '@heroicons/react/24/outline';
import { toast } from 'sonner';
import {
  authService,
  isEmailLinkRequired,
  type InvitationStatus,
} from '@/services/auth.service';
import { resolvePortal } from '@/lib/auth-roles';

// Portal tras el auto-login: por CATEGORÍA del rol vía el clasificador único
// (lib/auth-roles.ts) — sin listas locales de códigos de rol. Un set-password
// de distribuidor (el caso normal de esta página) va a /distribuidor.
function homeForUser(user?: { roleCategory?: string; roles?: string[] }): string {
  const portal = resolvePortal(user?.roleCategory, user?.roles?.[0]);
  return portal === 'admin' ? '/admin' : '/distribuidor';
}

// Reglas de contraseña (mismas que reset-password / backend)
const passwordRules = [
  { label: 'Al menos 8 caracteres', test: (p: string) => p.length >= 8 },
  { label: 'Una letra mayúscula', test: (p: string) => /[A-Z]/.test(p) },
  { label: 'Una letra minúscula', test: (p: string) => /[a-z]/.test(p) },
  { label: 'Un número', test: (p: string) => /[0-9]/.test(p) },
  {
    label: 'Un carácter especial (!@#$%^&*)',
    test: (p: string) => /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(p),
  },
];

// Envoltura común (logo + card centrada).
function Shell({ children }: { children: React.ReactNode }) {
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
        {children}
      </div>
    </div>
  );
}

// Pantalla informativa (estados que NO muestran el formulario).
function InfoScreen({
  tone,
  title,
  message,
  ctaHref = '/login',
  ctaLabel = 'Ir a iniciar sesión',
}: {
  tone: 'success' | 'warning' | 'error';
  title: string;
  message: string;
  ctaHref?: string;
  ctaLabel?: string;
}) {
  const toneStyles = {
    success: { bg: 'bg-emerald-100', fg: 'text-emerald-600', Icon: CheckCircleIcon },
    warning: { bg: 'bg-amber-100', fg: 'text-amber-600', Icon: ExclamationTriangleIcon },
    error: { bg: 'bg-red-100', fg: 'text-red-500', Icon: ExclamationTriangleIcon },
  }[tone];
  const { Icon } = toneStyles;

  return (
    <Shell>
      <Card>
        <CardContent className="p-8 text-center">
          <div
            className={`w-16 h-16 ${toneStyles.bg} rounded-full flex items-center justify-center mx-auto mb-6`}
          >
            <Icon className={`h-10 w-10 ${toneStyles.fg}`} />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">{title}</h2>
          <p className="text-gray-600 mb-6">{message}</p>
          <Link href={ctaHref}>
            <Button variant={tone === 'success' ? 'default' : 'outline'} className="w-full">
              {ctaLabel}
            </Button>
          </Link>
        </CardContent>
      </Card>
    </Shell>
  );
}

function SetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const token = searchParams.get('token');

  // Estado de la invitación (se consulta al cargar, sin consumir el token).
  const [status, setStatus] = useState<'checking' | InvitationStatus>(
    token ? 'checking' : 'invalid',
  );

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    newPassword: '',
    confirmPassword: '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!token) return;
    let cancelled = false;
    authService
      .getInvitationStatus(token)
      .then((res) => {
        if (!cancelled) setStatus(res.status);
      })
      .catch(() => {
        // Error de red: no bloqueamos al usuario; el submit revalida en backend.
        if (!cancelled) setStatus('valid');
      });
    return () => {
      cancelled = true;
    };
  }, [token]);

  const validatePassword = (password: string): boolean =>
    passwordRules.every((rule) => rule.test(password));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;

    const newErrors: Record<string, string> = {};
    if (!formData.newPassword) {
      newErrors.newPassword = 'La contraseña es requerida';
    } else if (!validatePassword(formData.newPassword)) {
      newErrors.newPassword = 'La contraseña no cumple los requisitos';
    }
    if (!formData.confirmPassword) {
      newErrors.confirmPassword = 'Confirma tu contraseña';
    } else if (formData.newPassword !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Las contraseñas no coinciden';
    }
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }
    setErrors({});

    setIsLoading(true);
    try {
      // 1) Definir contraseña (activa la cuenta) y obtener el email del miembro.
      const { email } = await authService.acceptInvitation({
        token,
        newPassword: formData.newPassword,
      });

      // 2) Auto-login: iniciamos sesión con la contraseña recién creada usando el
      //    flujo estándar (tokens + cookies de routing), sin exponer PII en el GET
      //    de invitation-status ni emitir tokens en el servicio de invitación.
      try {
        const loginResult = await authService.login({
          identifier: email,
          password: formData.newPassword,
          remember: false,
        });

        if (isEmailLinkRequired(loginResult)) {
          // Caso borde: la cuenta exige vincular correo. Mandamos al login.
          toast.success('¡Cuenta activada! Inicia sesión para continuar.');
          setStatus('accepted');
          router.replace('/login');
          return;
        }

        // Recarga completa: re-ejecuta el middleware (rutas por rol) y re-hidrata
        // el estado de auth desde storage. El gating del panel decide si el
        // distribuidor debe ir a inscripción (comprar kit) o al panel.
        toast.success('¡Cuenta activada! Bienvenid@ a Tonic Life.');
        window.location.href = homeForUser(loginResult.user);
        return;
      } catch {
        // El auto-login falló (red/credenciales): la cuenta SÍ quedó activa,
        // así que mandamos al login para que entre manualmente.
        toast.success('¡Cuenta activada! Inicia sesión con tu nueva contraseña.');
        setStatus('accepted');
        router.replace('/login');
        return;
      }
    } catch (error: any) {
      toast.error(
        error?.response?.data?.message || 'Invitación inválida o expirada',
      );
      // Refleja el estado real (p.ej. ya aceptada/expirada) para no dejar el form.
      try {
        const res = await authService.getInvitationStatus(token);
        if (res.status !== 'valid') setStatus(res.status);
      } catch {
        /* sin red: deja el form */
      }
      setIsLoading(false);
    }
  };

  // ---- Estados que NO muestran el formulario ----
  if (status === 'checking') {
    return (
      <Shell>
        <Card>
          <CardContent className="p-10 text-center">
            <Loader2 className="mx-auto mb-4 h-10 w-10 animate-spin text-[#a7c1e2]" />
            <p className="text-gray-600">Verificando tu invitación...</p>
          </CardContent>
        </Card>
      </Shell>
    );
  }

  if (status === 'accepted') {
    return (
      <InfoScreen
        tone="success"
        title="¡Tu cuenta ya está activada!"
        message="Este paso ya fue completado. Inicia sesión con tu correo y la contraseña que definiste."
        ctaLabel="Ir a iniciar sesión"
      />
    );
  }

  if (status === 'expired') {
    return (
      <InfoScreen
        tone="warning"
        title="El enlace expiró"
        message="Tu invitación ya venció. Pide al administrador que te reenvíe una nueva invitación."
        ctaLabel="Volver al login"
      />
    );
  }

  if (status === 'revoked') {
    return (
      <InfoScreen
        tone="warning"
        title="Invitación cancelada"
        message="Esta invitación fue cancelada o reemplazada por una más reciente. Revisa tu correo o pide una nueva al administrador."
        ctaLabel="Volver al login"
      />
    );
  }

  if (status === 'invalid') {
    return (
      <InfoScreen
        tone="error"
        title="Enlace inválido"
        message="El enlace de invitación es inválido. Pide al administrador que te reenvíe la invitación."
        ctaLabel="Volver al login"
      />
    );
  }

  // status === 'valid' → formulario
  return (
    <Shell>
      <div className="text-center mb-8 -mt-2">
        <h2 className="text-3xl font-bold text-gray-900">Activa tu cuenta</h2>
        <p className="mt-2 text-sm text-gray-600">
          Define tu contraseña para acceder a tu cuenta de Tonic Life
        </p>
      </div>

      <Card>
        <CardContent className="p-8">
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Nueva contraseña */}
            <div className="space-y-1.5">
              <Label>Contraseña</Label>
              <div className="relative">
                <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground [&_svg]:size-4">
                  <LockClosedIcon className="h-5 w-5" />
                </span>
                <Input
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  value={formData.newPassword}
                  onChange={(e) =>
                    setFormData({ ...formData, newPassword: e.target.value })
                  }
                  autoComplete="new-password"
                  disabled={isLoading}
                  className="pl-9 pr-10"
                  aria-invalid={errors.newPassword ? true : undefined}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  disabled={isLoading}
                >
                  {showPassword ? (
                    <EyeSlashIcon className="h-5 w-5" />
                  ) : (
                    <EyeIcon className="h-5 w-5" />
                  )}
                </button>
              </div>
              {errors.newPassword && (
                <p className="text-sm text-destructive">{errors.newPassword}</p>
              )}
            </div>

            {/* Requisitos */}
            {formData.newPassword && (
              <div className="bg-gray-50 rounded-lg p-4 space-y-2">
                <p className="text-sm font-medium text-gray-700">
                  Requisitos de contraseña:
                </p>
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                  {passwordRules.map((rule, index) => {
                    const passes = rule.test(formData.newPassword);
                    return (
                      <div key={index} className="flex items-center gap-2">
                        <CheckCircleIcon
                          className={`h-4 w-4 ${
                            passes ? 'text-[#3E667D]' : 'text-gray-400'
                          }`}
                        />
                        <span
                          className={`text-xs ${
                            passes ? 'text-gray-700' : 'text-gray-400'
                          }`}
                        >
                          {rule.label}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Confirmar */}
            <div className="space-y-1.5">
              <Label>Confirmar contraseña</Label>
              <div className="relative">
                <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground [&_svg]:size-4">
                  <LockClosedIcon className="h-5 w-5" />
                </span>
                <Input
                  type={showConfirmPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  value={formData.confirmPassword}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      confirmPassword: e.target.value,
                    })
                  }
                  autoComplete="new-password"
                  disabled={isLoading}
                  className="pl-9 pr-10"
                  aria-invalid={errors.confirmPassword ? true : undefined}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  disabled={isLoading}
                >
                  {showConfirmPassword ? (
                    <EyeSlashIcon className="h-5 w-5" />
                  ) : (
                    <EyeIcon className="h-5 w-5" />
                  )}
                </button>
              </div>
              {errors.confirmPassword && (
                <p className="text-sm text-destructive">
                  {errors.confirmPassword}
                </p>
              )}
            </div>

            <Button
              type="submit"
              variant="default"
              size="lg"
              className="w-full"
              disabled={isLoading}
            >
              {isLoading && <Loader2 className="mr-2 size-4 animate-spin" />}
              {isLoading ? 'Activando...' : 'Activar cuenta'}
            </Button>
          </form>
        </CardContent>
      </Card>

      <div className="mt-6 text-center">
        <p className="text-sm text-gray-600">
          ¿Ya tienes acceso?{' '}
          {isLoading ? (
            <span
              aria-disabled
              className="font-medium text-gray-400"
            >
              Inicia sesión
            </span>
          ) : (
            <Link
              href="/login"
              className="font-medium text-[#3E667D] hover:text-[#3E667D] transition-colors"
            >
              Inicia sesión
            </Link>
          )}
        </p>
      </div>
    </Shell>
  );
}

export default function SetPasswordPage() {
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
      <SetPasswordForm />
    </Suspense>
  );
}
