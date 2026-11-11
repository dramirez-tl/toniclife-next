'use client';

// CheckoutSignInGate — Lo que ve en el checkout quien todavía no inicia sesión.
//
// El pedido se paga sobre una cuenta, así que antes de los pasos del checkout se pide
// entrar. La forma más corta va primero: "Continuar con Google". Según lo que responda
// el API (ver `useGoogleAccess`):
//   · la cuenta de Google ya tiene cuenta → entra y sigue con su compra;
//   · es nueva → confirma sus datos aquí mismo (`GoogleSignupConfirm`) y sigue;
//   · ese correo ya tiene una cuenta sin Google → se le manda a iniciar sesión (ahí se
//     vincula con su número de distribuidor y su contraseña) y vuelve al checkout.
// Debajo siguen "Iniciar sesión" y "Crear cuenta" con correo, como siempre.
//
// Al entrar NO se navega: con la sesión en el store el checkout deja de pintar esta
// puerta, y `CartMergeOnLogin` (layout raíz) pasa el carrito de invitado a la cuenta en
// esta misma página. No toca el pedido, el pago ni la dirección.

import Link from 'next/link';
import { LockClosedIcon } from '@heroicons/react/24/outline';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';
import { GoogleSignInButton } from '@/components/auth/GoogleSignInButton';
import { GoogleSignupConfirm, SignupAccountNotice } from '@/components/auth/GoogleSignupConfirm';
import { useGoogleAccess } from '@/components/auth/useGoogleAccess';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { useStorefrontAccess } from '@/hooks/useStorefrontAccess';
import { localeLanguage } from '@/i18n/config';
import { googleLinkStep } from '@/lib/public-signup';
import type { UserResponse } from '@/services/auth.service';
import { useAppDispatch } from '@/store/hooks';
import { setUser } from '@/store/slices/authSlice';

interface CheckoutSignInGateProps {
  /** Locale de la tienda (`es-mx`, `en-us`…): a ese checkout se regresa después de entrar. */
  locale: string;
  /** País de la tienda: el de la cuenta que se cree aquí. */
  countryCode: string;
}

export function CheckoutSignInGate({ locale, countryCode }: CheckoutSignInGateProps) {
  const t = useTranslations('checkout');
  const tAuth = useTranslations('auth');
  const dispatch = useAppDispatch();
  const { membersOnly } = useStorefrontAccess();

  // Con la tienda en el redirect, quien entra por /login o /registro vuelve a ESTE
  // checkout (y la cuenta nueva nace con el país de esta tienda).
  const checkoutPath = `/${locale}/checkout`;
  const loginHref = `/login?redirect=${encodeURIComponent(checkoutPath)}`;
  const registerHref = `/registro?redirect=${encodeURIComponent(checkoutPath)}`;

  const enter = (user: UserResponse, created: boolean) => {
    dispatch(setUser(user));
    toast.success(created ? tAuth('signup.created') : tAuth('toast.welcome'));
  };

  const google = useGoogleAccess({ onSignedIn: (user) => enter(user, false) });
  const step = google.pending ? googleLinkStep(google.pending) : null;

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4 py-12">
      <Card className="w-full max-w-md">
        <CardContent className="p-8">
          {google.pending && step === 'new_account' ? (
            <GoogleSignupConfirm
              link={google.pending}
              countryCode={countryCode}
              loginHref={loginHref}
              onSignedIn={(user) => enter(user, true)}
              onCancel={google.reset}
            />
          ) : google.pending ? (
            <SignupAccountNotice
              kind={membersOnly ? 'closed' : 'exists'}
              email={google.pending.email}
              loginHref={loginHref}
              onCancel={google.reset}
            />
          ) : (
            <div className="text-center">
              <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-[#C8DDF2]/40">
                <LockClosedIcon className="h-8 w-8 text-[#3E667D]" />
              </div>
              <h1 className="text-xl font-bold text-gray-900">{t('authTitle')}</h1>
              <p className="mt-2 text-sm text-gray-500">{t('authBody')}</p>
              <div className="mt-6 space-y-3">
                {/* Solo aparece si el servidor tiene Google encendido; el separador va con él. */}
                <GoogleSignInButton
                  text="continue_with"
                  onCredential={google.handleCredential}
                  disabled={google.busy}
                  locale={localeLanguage(locale)}
                  dividerLabel={tAuth('google.or')}
                  dividerPosition="below"
                />
                <Link href={loginHref} className="block">
                  <Button size="lg" className="w-full">
                    {t('signIn')}
                  </Button>
                </Link>
                <Link href={registerHref} className="block">
                  <Button variant="outline" size="lg" className="w-full">
                    {t('createAccount')}
                  </Button>
                </Link>
                <Link
                  href="/carrito"
                  className="inline-block pt-1 text-sm text-gray-500 transition-colors hover:text-[#3E667D]"
                >
                  {t('backToCart')}
                </Link>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
