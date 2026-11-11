'use client';

// Botón oficial "Iniciar sesión con Google" (Google Identity Services).
// Solo se dibuja cuando el API dice que Google Sign-In está habilitado
// (GET /auth/google/status → webClientId); así no hace falta configurar el
// client ID en Vercel y el botón desaparece solo si Sistemas lo apaga.
// Entrega el ID token al padre; el API lo valida (ver auth README del API).

import { useEffect, useRef, useState } from 'react';
import Script from 'next/script';
import { authService } from '@/services/auth.service';

interface GsiCredentialResponse {
  credential: string;
}

interface GsiButtonOptions {
  type?: 'standard' | 'icon';
  theme?: 'outline' | 'filled_blue' | 'filled_black';
  size?: 'large' | 'medium' | 'small';
  text?: 'signin_with' | 'signup_with' | 'continue_with' | 'signin';
  shape?: 'rectangular' | 'pill' | 'circle' | 'square';
  logo_alignment?: 'left' | 'center';
  width?: number;
  locale?: string;
}

declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (config: {
            client_id: string;
            callback: (response: GsiCredentialResponse) => void;
            ux_mode?: 'popup' | 'redirect';
            auto_select?: boolean;
            cancel_on_tap_outside?: boolean;
            itp_support?: boolean;
          }) => void;
          renderButton: (parent: HTMLElement, options: GsiButtonOptions) => void;
        };
      };
    };
  }
}

const GSI_SCRIPT = 'https://accounts.google.com/gsi/client';

interface GoogleSignInButtonProps {
  /** Recibe el ID token de Google; el padre lo manda al API. */
  onCredential: (idToken: string) => void | Promise<void>;
  disabled?: boolean;
  /**
   * Texto del botón (lo traduce Google con `locale`): "Iniciar sesión con Google",
   * "Continuar con Google" o "Registrarse con Google".
   */
  text?: 'signin_with' | 'continue_with' | 'signup_with';
  /** Idioma del botón: 'es' | 'en'. */
  locale?: string;
  /** Separador ("o") que se dibuja solo si el botón existe. */
  dividerLabel?: string;
  dividerPosition?: 'above' | 'below';
  className?: string;
}

export function GoogleSignInButton({
  onCredential,
  disabled = false,
  text = 'signin_with',
  locale = 'es',
  dividerLabel,
  dividerPosition = 'above',
  className,
}: GoogleSignInButtonProps) {
  const host = useRef<HTMLDivElement>(null);
  const callback = useRef(onCredential);
  useEffect(() => {
    callback.current = onCredential;
  }, [onCredential]);

  const [clientId, setClientId] = useState<string | null>(null);
  // Si Google Identity Services ya está en la página (otra pantalla lo cargó antes) no
  // hay que esperar al script; si no, `onReady` de <Script> lo marca al terminar de cargar.
  const [scriptReady, setScriptReady] = useState(
    () => typeof window !== 'undefined' && !!window.google?.accounts?.id,
  );

  useEffect(() => {
    let alive = true;
    authService
      .googleStatus()
      .then((status) => {
        if (alive && status.enabled && status.webClientId) {
          setClientId(status.webClientId);
        }
      })
      .catch(() => {
        /* API sin respuesta: se queda sin botón de Google */
      });
    return () => {
      alive = false;
    };
  }, []);

  useEffect(() => {
    const parent = host.current;
    const gsi = typeof window !== 'undefined' ? window.google?.accounts?.id : undefined;
    if (!clientId || !scriptReady || !parent || !gsi) return;
    gsi.initialize({
      client_id: clientId,
      callback: (response) => {
        void callback.current(response.credential);
      },
      ux_mode: 'popup',
      itp_support: true,
    });
    parent.innerHTML = '';
    gsi.renderButton(parent, {
      type: 'standard',
      theme: 'outline',
      size: 'large',
      text,
      shape: 'pill',
      logo_alignment: 'left',
      // Google exige px (máximo 400): el ancho del contenedor o 320.
      width: Math.min(400, parent.offsetWidth || 320),
      locale,
    });
  }, [clientId, scriptReady, text, locale]);

  if (!clientId) return null;

  const divider = dividerLabel ? (
    <div className="flex items-center gap-3" aria-hidden="true">
      <div className="h-px flex-1 bg-gray-200" />
      <span className="text-xs uppercase tracking-wide text-gray-400">{dividerLabel}</span>
      <div className="h-px flex-1 bg-gray-200" />
    </div>
  ) : null;

  return (
    <div className={className}>
      {/* onReady corre al cargar y en cada montaje si ya estaba cargado. */}
      <Script src={GSI_SCRIPT} strategy="afterInteractive" onReady={() => setScriptReady(true)} />
      {dividerPosition === 'above' && divider}
      <div
        ref={host}
        className={`flex justify-center ${dividerLabel && dividerPosition === 'above' ? 'mt-4' : ''} ${
          disabled ? 'pointer-events-none opacity-50' : ''
        }`}
        aria-disabled={disabled}
        data-testid="google-signin-button"
      />
      {dividerPosition === 'below' && <div className="mt-4">{divider}</div>}
    </div>
  );
}

export default GoogleSignInButton;
