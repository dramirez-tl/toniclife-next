'use client';

// Formulario público "Taller de Inducción" (pedido de Marketing, sep-2026).
// Se sirve en induccion.<dominio> (rewrite por host en middleware.ts) y en
// /induccion del dominio principal. SIN autenticación. Lo renderiza
// app/induccion/page.tsx (server component que lee ?p= y fija el viewport).
//
// MOBILE FIRST: la invitación llega por WhatsApp y casi todos la abren en el
// celular. Por eso: una sola columna, inputs de 16px (evita el zoom de iOS),
// botones de 48px de alto y ancho completo, botón principal siempre visible
// (sticky abajo + safe-area) y foco automático al siguiente paso.
//
// Flujo de DOS pasos:
//   Paso 1: aceptar Términos y Condiciones + número de PATROCINADOR
//           (?p=NUMERO lo prellena y se verifica solo al aceptar términos)
//           -> POST /marketing/verify-sponsor (público, throttle, honeypot).
//   Paso 2: las 4 preguntas -> POST /marketing/leads {formSlug:'induccion'}
//           -> si hay enlace configurado (admin Comercial > Formularios >
//              Inducción) se le manda al taller (Zoom u otro).

import { useEffect, useRef, useState } from 'react';
import type { FormEvent, KeyboardEvent } from 'react';
import {
  ArrowRight,
  CheckCircle2,
  Loader2,
  Pencil,
  UserCheck,
  Video,
} from 'lucide-react';

const API_BASE =
  process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1';

/** Error con mensaje YA redactado para el usuario (respuestas HTTP conocidas:
 *  400/429/503). Lo que no sea FormError viene del navegador (TypeError de
 *  fetch sin red/DNS/CORS, SyntaxError de JSON) y se muestra como "sin
 *  conexión" en vez del texto crudo ("Failed to fetch", "Load failed"). */
class FormError extends Error {}

const NETWORK_ERROR_MESSAGE =
  'Sin conexión. Revisa tu internet e intenta de nuevo.';

type QuestionKey = 'fullName' | 'cityCountry' | 'phone' | 'invitedBy';

type Question = {
  key: QuestionKey;
  number: number;
  label: string;
  helper: string;
  required: boolean;
  type: 'text' | 'tel';
  inputMode: 'text' | 'tel';
  autoComplete: string;
  maxLength: number;
};

/** Las mismas 4 preguntas del formulario Oportunidad (pedido: "las mismas"). */
const QUESTIONS: readonly Question[] = [
  {
    key: 'fullName',
    number: 1,
    label: 'Cual es tu nombre Completo:',
    helper: '(Para saludarte adecuadamente durante la sesión)',
    required: true,
    type: 'text',
    inputMode: 'text',
    autoComplete: 'name',
    maxLength: 200,
  },
  {
    key: 'cityCountry',
    number: 2,
    label: '¿De qué ciudad y país nos acompañas?',
    helper: '(Para conocer el alcance de nuestra red global)',
    required: false,
    type: 'text',
    inputMode: 'text',
    autoComplete: 'on',
    maxLength: 200,
  },
  {
    key: 'phone',
    number: 3,
    label: 'Teléfono de contacto/WhatsApp:',
    helper:
      '(Para enviarte material exclusivo de bienvenida y resolver cualquier duda después de la transmisión)',
    required: false,
    type: 'tel',
    inputMode: 'tel',
    autoComplete: 'tel',
    maxLength: 60,
  },
  {
    key: 'invitedBy',
    number: 4,
    label: '¿Quién te invitó a esta sesión?',
    helper:
      '(Escribe el nombre de tu patrocinador o pon "Redes Sociales Oficiales" si llegaste por nuestra página)',
    required: false,
    type: 'text',
    inputMode: 'text',
    autoComplete: 'off',
    maxLength: 200,
  },
];

type Answers = Record<QuestionKey, string>;
type Step = 1 | 2;
type FocusTarget = 'terms' | 'sponsor' | 'fullName';

const SPONSOR_RE = /^\d{1,20}$/;

// Inputs de 16px (text-base) y 48px de alto: sin zoom de iOS y fáciles de
// tocar con el pulgar. Con aria-invalid se marcan en rojo (el error de texto
// solo no basta cuando el foco salta a otro lado).
const INPUT_CLASS =
  'mt-3 block min-h-12 w-full rounded-xl border border-[#c8ddf2] bg-white px-4 text-base text-[#274b63] placeholder:text-[#9db8cd] focus:border-[#3E667D] focus:outline-none focus:ring-2 focus:ring-[#c8ddf2] aria-invalid:border-red-400 aria-invalid:ring-2 aria-invalid:ring-red-200 disabled:bg-white/60 disabled:text-[#9db8cd]';

// Botón principal: ancho completo en móvil, 48px de alto, foco visible.
const PRIMARY_BUTTON_CLASS =
  'inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#33566d] px-6 py-3 text-base font-bold uppercase tracking-wide text-white shadow-lg transition-colors hover:bg-[#274b63] active:bg-[#274b63] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#c8ddf2] focus-visible:ring-offset-2 disabled:opacity-60 sm:w-auto sm:min-w-[280px]';

// Barra del botón principal: pegada al fondo de la pantalla en móvil (sticky,
// respeta la safe-area del iPhone) y en flujo normal en pantallas grandes.
// El mensaje de error se renderiza DENTRO de la barra, arriba del botón: en
// el flujo normal, en un celular chico quedaba debajo del pliegue (tapado por
// la propia barra) justo cuando el foco salta hacia arriba, y no se leía.
const STICKY_BAR_CLASS =
  'sticky bottom-0 z-10 -mx-4 mt-6 border-t border-white/70 bg-sky-50/90 px-4 pt-3 pb-[calc(env(safe-area-inset-bottom)_+_0.75rem)] backdrop-blur-md sm:static sm:mx-0 sm:flex sm:flex-col sm:items-center sm:border-0 sm:bg-transparent sm:px-0 sm:pb-0 sm:pt-0 sm:backdrop-blur-none';

const ALERT_CLASS =
  'mb-3 w-full rounded-xl bg-red-50 px-4 py-3 text-center text-[15px] font-medium text-red-700';

/** Mensaje legible de un error de Nest (message: string | string[]). */
function extractApiMessage(body: unknown): string {
  if (!body || typeof body !== 'object') return '';
  const msg = (body as { message?: unknown }).message;
  if (typeof msg === 'string') return msg;
  if (Array.isArray(msg)) {
    return msg.filter((m): m is string => typeof m === 'string').join(' ');
  }
  return '';
}

function StepIndicator({ step }: { step: Step }) {
  return (
    <div className="mt-4 w-full max-w-xs" role="group" aria-label={`Paso ${step} de 2`}>
      <p className="text-center text-xs font-bold uppercase tracking-widest text-[#3E667D]">
        Paso {step} de 2
      </p>
      <div className="mt-2 flex gap-2" aria-hidden>
        <span className="h-1.5 flex-1 rounded-full bg-[#3E667D]" />
        <span
          className={`h-1.5 flex-1 rounded-full ${
            step === 2 ? 'bg-[#3E667D]' : 'bg-white/80'
          }`}
        />
      </div>
    </div>
  );
}

type InduccionFormProps = {
  /** Número de patrocinador que viene en la invitación (?p=NUMERO), ya
   *  saneado (solo dígitos, máx 20). Vacío si no vino. */
  initialSponsorNumber?: string;
};

export function InduccionForm({ initialSponsorNumber = '' }: InduccionFormProps) {
  const prefilled = SPONSOR_RE.test(initialSponsorNumber);

  // ── Paso 1: términos + patrocinador ──
  const [step, setStep] = useState<Step>(1);
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [sponsorNumber, setSponsorNumber] = useState(
    prefilled ? initialSponsorNumber : '',
  );
  // Nombre de mínima divulgación que regresa la API ("María G.").
  const [sponsorName, setSponsorName] = useState<string | null>(null);
  const [verifying, setVerifying] = useState(false);
  const [verifyError, setVerifyError] = useState<string | null>(null);

  // ── Paso 2: las 4 preguntas ──
  const [answers, setAnswers] = useState<Answers>({
    fullName: '',
    cityCountry: '',
    phone: '',
    invitedBy: '',
  });
  // Honeypot anti-bots: invisible para humanos; si trae algo, el backend
  // descarta la respuesta en silencio.
  const [website, setWebsite] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Marca visual (aria-invalid) del nombre cuando falla la validación local.
  const [fullNameInvalid, setFullNameInvalid] = useState(false);
  // Respuesta del envío: meetingUrl null = enlace aún no configurado.
  const [result, setResult] = useState<{ meetingUrl: string | null } | null>(
    null,
  );
  // Texto para la región aria-live (carga/éxito), solo lectores de pantalla.
  const [liveMessage, setLiveMessage] = useState('');

  const autoVerifiedRef = useRef(false);
  const verifyingRef = useRef(false);
  const pendingFocusRef = useRef<FocusTarget | null>(null);
  const termsRef = useRef<HTMLInputElement>(null);
  const sponsorInputRef = useRef<HTMLInputElement>(null);
  const fullNameRef = useRef<HTMLInputElement>(null);
  const stepsRef = useRef<HTMLDivElement>(null);

  // Foco automático al siguiente paso. Se pide con pendingFocusRef ANTES del
  // setState y se aplica aquí, ya con el DOM del nuevo paso renderizado.
  useEffect(() => {
    const target = pendingFocusRef.current;
    if (!target) return;
    pendingFocusRef.current = null;
    if (target === 'fullName') {
      // Muestra "Paso 2 de 2" + patrocinador y deja el cursor en el nombre.
      stepsRef.current?.scrollIntoView({ block: 'start' });
      fullNameRef.current?.focus({ preventScroll: true });
      return;
    }
    const el = target === 'terms' ? termsRef.current : sponsorInputRef.current;
    el?.focus();
  });

  // Redirección al taller: pantalla breve y luego al enlace configurado. El
  // botón "Entrar al taller" queda como respaldo si el navegador la bloquea.
  useEffect(() => {
    const url = result?.meetingUrl;
    if (!url) return;
    const timer = window.setTimeout(() => window.location.assign(url), 1500);
    return () => window.clearTimeout(timer);
  }, [result]);

  const setAnswer = (key: QuestionKey, value: string) => {
    if (key === 'fullName') setFullNameInvalid(false);
    setAnswers((a) => ({ ...a, [key]: value }));
  };

  async function runVerification(num: string) {
    if (verifyingRef.current) return;
    verifyingRef.current = true;
    setVerifying(true);
    setVerifyError(null);
    setLiveMessage('Verificando el número de patrocinador.');
    try {
      const res = await fetch(`${API_BASE}/marketing/verify-sponsor`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sponsorNumber: num,
          website: website || undefined,
        }),
      });
      if (!res.ok) {
        throw new FormError(
          res.status === 429
            ? 'Demasiados intentos seguidos. Espera un minuto e intenta de nuevo.'
            : 'No se pudo verificar. Intenta de nuevo en un momento.',
        );
      }
      const data = (await res.json()) as {
        valid: boolean;
        sponsorName: string | null;
      };
      if (!data.valid) {
        setLiveMessage('');
        setVerifyError(
          'No encontramos ese número de patrocinador. Verifícalo con quien te invitó e intenta de nuevo.',
        );
        pendingFocusRef.current = 'sponsor';
        return;
      }
      setSponsorName(data.sponsorName);
      setLiveMessage(
        `Patrocinador verificado${data.sponsorName ? `: ${data.sponsorName}` : ''}. Paso 2 de 2.`,
      );
      pendingFocusRef.current = 'fullName';
      setStep(2);
    } catch (err) {
      setLiveMessage('');
      setVerifyError(
        err instanceof FormError ? err.message : NETWORK_ERROR_MESSAGE,
      );
      pendingFocusRef.current = 'sponsor';
    } finally {
      verifyingRef.current = false;
      setVerifying(false);
    }
  }

  function handleTermsChange(checked: boolean) {
    setAcceptedTerms(checked);
    setVerifyError(null);
    if (!checked) return;
    // Si el número vino en la invitación (?p=), se verifica solo UNA vez al
    // aceptar términos (sin obligar a reescribirlo); si falla, el usuario lo
    // corrige a mano y toca Continuar.
    if (
      prefilled &&
      !autoVerifiedRef.current &&
      SPONSOR_RE.test(sponsorNumber)
    ) {
      autoVerifiedRef.current = true;
      void runVerification(sponsorNumber);
      return;
    }
    pendingFocusRef.current = 'sponsor';
  }

  function handleVerify(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!acceptedTerms) {
      setVerifyError('Para continuar debes aceptar los Términos y Condiciones.');
      termsRef.current?.focus();
      return;
    }
    const num = sponsorNumber.trim();
    if (!SPONSOR_RE.test(num)) {
      setVerifyError('Escribe el número de tu patrocinador (solo dígitos).');
      sponsorInputRef.current?.focus();
      return;
    }
    void runVerification(num);
  }

  function handleChangeSponsor() {
    autoVerifiedRef.current = true;
    setSponsorName(null);
    setVerifyError(null);
    setError(null);
    pendingFocusRef.current = 'sponsor';
    setStep(1);
  }

  // Enter en una pregunta pasa a la siguiente (en la última, envía).
  function handleQuestionKeyDown(e: KeyboardEvent<HTMLInputElement>, idx: number) {
    if (e.key !== 'Enter' || idx >= QUESTIONS.length - 1) return;
    e.preventDefault();
    document.getElementById(`q-${QUESTIONS[idx + 1].key}`)?.focus();
  }

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (sending || result) return;
    if (answers.fullName.trim().length < 2) {
      setFullNameInvalid(true);
      setError('Por favor escribe tu nombre completo.');
      fullNameRef.current?.focus();
      return;
    }
    setFullNameInvalid(false);
    setError(null);
    setSending(true);
    setLiveMessage('Enviando tus datos.');
    try {
      const res = await fetch(`${API_BASE}/marketing/leads`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          formSlug: 'induccion',
          sponsorNumber,
          fullName: answers.fullName.trim(),
          cityCountry: answers.cityCountry.trim() || undefined,
          phone: answers.phone.trim() || undefined,
          invitedBy: answers.invitedBy.trim() || undefined,
          website: website || undefined,
        }),
      });
      if (res.status === 400) {
        const message = extractApiMessage(await res.json().catch(() => null));
        if (/patrocinador/i.test(message)) {
          // El número dejó de ser válido entre la verificación y el envío:
          // regresa al paso 1 con el mensaje, conservando lo ya capturado.
          setLiveMessage('');
          setSponsorName(null);
          setVerifyError(message);
          pendingFocusRef.current = 'sponsor';
          setStep(1);
          return;
        }
        throw new FormError(message || 'Revisa tus datos e intenta de nuevo.');
      }
      if (!res.ok) {
        // 503 = el API avisa que el taller aún no está habilitado (migración
        // 128 pendiente): se muestra su mensaje tal cual.
        const apiMessage =
          res.status === 503
            ? extractApiMessage(await res.json().catch(() => null))
            : '';
        throw new FormError(
          res.status === 429
            ? 'Demasiados envíos seguidos. Espera un momento e intenta de nuevo.'
            : apiMessage || 'No se pudo enviar. Intenta de nuevo en un momento.',
        );
      }
      const data = (await res.json()) as {
        ok: true;
        meetingUrl?: string | null;
      };
      const meetingUrl = data.meetingUrl || null;
      setLiveMessage(
        meetingUrl ? 'Listo, te llevamos al taller.' : 'Recibimos tus datos.',
      );
      setResult({ meetingUrl });
    } catch (err) {
      setLiveMessage('');
      setError(err instanceof FormError ? err.message : NETWORK_ERROR_MESSAGE);
    } finally {
      setSending(false);
    }
  }

  const firstName = answers.fullName.trim().split(/\s+/)[0] || '';

  return (
    // La raíz NO recorta (overflow visible): un ancestro con overflow distinto
    // de visible anula el sticky del botón principal, y overflow-clip no existe
    // en iOS Safari < 16 ni en WebViews viejos de Android (ahí caía a visible y
    // las hojas provocaban scroll horizontal). Las hojas van en su propio
    // envoltorio con overflow-hidden, que no contiene la barra sticky.
    <div className="relative min-h-screen bg-gradient-to-b from-sky-100 via-sky-50 to-sky-100">
      {/* Hojas SOLO en las esquinas, sutiles y difuminadas (como /formulario) */}
      <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
        <div
          className="absolute -right-16 -top-16 h-64 w-72 bg-cover bg-center opacity-45 blur-[3px] sm:-right-24 sm:-top-24 sm:h-[420px] sm:w-[520px]"
          style={{ backgroundImage: "url('/images/form/leaves-form-background.png')" }}
        />
        <div
          className="absolute -bottom-16 -left-16 h-64 w-72 rotate-180 bg-cover bg-center opacity-45 blur-[3px] sm:-bottom-24 sm:-left-24 sm:h-[420px] sm:w-[520px]"
          style={{ backgroundImage: "url('/images/form/leaves-form-background.png')" }}
        />
      </div>

      {/* Región viva (solo lectores de pantalla): carga, verificación, éxito */}
      <p aria-live="polite" className="sr-only">
        {liveMessage}
      </p>

      <div className="relative mx-auto flex min-h-screen w-full max-w-2xl flex-col items-center px-4 pb-8 pt-8 sm:py-14">
        {/* Encabezado: mismo logo que /formulario y la página principal */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/images/logo/svg/logo-text-blue.svg"
          alt="Tonic Life"
          className="h-auto w-[150px] sm:w-[180px] lg:w-[200px]"
        />
        <h1 className="mt-4 text-center text-3xl font-extrabold leading-tight text-[#274b63] sm:text-5xl">
          Taller de Inducción
        </h1>

        {result ? (
          result.meetingUrl ? (
            /* ── Éxito: pantalla breve y redirección al taller ── */
            <div className="mt-8 w-full rounded-2xl bg-white/85 p-6 text-center shadow-lg backdrop-blur-sm sm:p-8">
              <CheckCircle2 className="mx-auto size-14 text-emerald-500" aria-hidden />
              <h2 className="mt-4 text-2xl font-bold text-[#274b63]">
                Listo, te llevamos al taller
              </h2>
              <p className="mt-2 text-base leading-relaxed text-[#3E667D]">
                {firstName ? `¡Gracias, ${firstName}! ` : ''}
                En unos segundos se abrirá el enlace del Taller de Inducción.
                Si no se abre solo, toca el botón.
              </p>
              <div className="mt-6 flex justify-center">
                <a
                  href={result.meetingUrl}
                  rel="noopener"
                  className={PRIMARY_BUTTON_CLASS}
                >
                  <Video className="size-5" aria-hidden />
                  Entrar al taller
                </a>
              </div>
            </div>
          ) : (
            /* ── Éxito sin enlace configurado todavía ── */
            <div className="mt-8 w-full rounded-2xl bg-white/85 p-6 text-center shadow-lg backdrop-blur-sm sm:p-8">
              <CheckCircle2 className="mx-auto size-14 text-emerald-500" aria-hidden />
              <h2 className="mt-4 text-2xl font-bold text-[#274b63]">
                ¡Gracias{firstName ? `, ${firstName}` : ''}!
              </h2>
              <p className="mt-2 text-base leading-relaxed text-[#3E667D]">
                Recibimos tus datos; el enlace del taller se publicará aquí muy
                pronto.
              </p>
              <p className="mt-6 text-sm font-bold uppercase tracking-widest text-[#3E667D]">
                Ganas más ayudando a tu gente
              </p>
            </div>
          )
        ) : (
          <div ref={stepsRef} className="flex w-full scroll-mt-4 flex-col items-center">
            <StepIndicator step={step} />

            {step === 1 ? (
              /* ── Paso 1: términos + número de patrocinador ── */
              <form onSubmit={handleVerify} noValidate className="mt-5 w-full">
                <p className="mx-auto max-w-xl text-center text-base leading-relaxed text-[#3E667D]">
                  <span className="font-bold text-[#274b63]">
                    ¡Nos da muchísimo gusto recibirte!
                  </span>{' '}
                  Para brindarte acceso a nuestra transmisión en vivo y
                  asegurarnos de que recibas la mejor atención y material
                  exclusivo, por favor completa este breve registro de dos
                  pasos. ¡Comenzamos!
                </p>

                {/* Términos y condiciones (obligatorio para avanzar) */}
                <div className="mt-6 w-full rounded-2xl bg-white/85 p-5 shadow-md backdrop-blur-sm">
                  <label htmlFor="terms" className="flex cursor-pointer items-start gap-3">
                    <input
                      ref={termsRef}
                      id="terms"
                      type="checkbox"
                      checked={acceptedTerms}
                      onChange={(e) => handleTermsChange(e.target.checked)}
                      aria-describedby="terms-hint"
                      className="mt-0.5 size-6 shrink-0 cursor-pointer rounded border-[#c8ddf2] accent-[#3E667D]"
                    />
                    <span className="text-[15px] leading-relaxed text-[#3E667D]">
                      He leído y acepto los{' '}
                      <a
                        href="/terminos"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="font-bold text-[#274b63] underline underline-offset-2"
                      >
                        Términos y Condiciones
                      </a>{' '}
                      y el{' '}
                      <a
                        href="/privacidad"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="font-bold text-[#274b63] underline underline-offset-2"
                      >
                        Aviso de Privacidad
                      </a>{' '}
                      de Tonic Life, y autorizo el uso de mis datos para darme
                      acceso y seguimiento a esta presentación.
                    </span>
                  </label>
                  {!acceptedTerms && (
                    <p
                      id="terms-hint"
                      className="mt-2 pl-9 text-sm font-medium text-[#3E667D]"
                    >
                      Palomea esta casilla para poder continuar con tu registro.
                    </p>
                  )}
                </div>

                {/* Número de patrocinador */}
                <div
                  className={`mt-4 w-full rounded-2xl bg-white/85 p-5 shadow-md backdrop-blur-sm transition-opacity ${
                    acceptedTerms ? '' : 'opacity-50'
                  }`}
                  aria-disabled={!acceptedTerms}
                >
                  <label
                    htmlFor="sponsor-number"
                    className="block text-lg font-bold leading-snug text-[#274b63]"
                  >
                    Número de tu patrocinador
                  </label>
                  <p id="sponsor-hint" className="mt-0.5 text-sm text-[#3E667D]">
                    {prefilled
                      ? '(Lo tomamos de tu invitación; solo confirma que sea correcto)'
                      : '(Es el número de ID de la persona que te invitó al taller)'}
                  </p>
                  <input
                    ref={sponsorInputRef}
                    id="sponsor-number"
                    type="text"
                    inputMode="numeric"
                    autoComplete="off"
                    enterKeyHint="go"
                    value={sponsorNumber}
                    onChange={(e) => {
                      setSponsorNumber(e.target.value.replace(/\D/g, '').slice(0, 20));
                      setVerifyError(null);
                    }}
                    maxLength={20}
                    disabled={!acceptedTerms}
                    placeholder="Ej. 1234567"
                    aria-describedby="sponsor-hint"
                    aria-invalid={verifyError && acceptedTerms ? true : undefined}
                    className={`${INPUT_CLASS} tracking-wider`}
                  />
                </div>

                {/* Botón principal (y el error, para que siempre se lea):
                    siempre visible en móvil */}
                <div className={STICKY_BAR_CLASS}>
                  {verifyError && (
                    <p role="alert" className={ALERT_CLASS}>
                      {verifyError}
                    </p>
                  )}
                  <button
                    type="submit"
                    disabled={verifying}
                    className={PRIMARY_BUTTON_CLASS}
                  >
                    {verifying ? (
                      <Loader2 className="size-5 animate-spin" aria-hidden />
                    ) : null}
                    {verifying ? 'Verificando…' : 'Continuar'}
                    {!verifying && <ArrowRight className="size-5" aria-hidden />}
                  </button>
                </div>
              </form>
            ) : (
              /* ── Paso 2: las 4 preguntas ── */
              <form onSubmit={handleSubmit} noValidate className="mt-5 w-full">
                {/* Patrocinador verificado (mínima divulgación: "María G.") */}
                <div className="flex items-center gap-3 rounded-2xl border-2 border-[#3E667D]/30 bg-white/85 p-4 shadow-md backdrop-blur-sm">
                  <span className="flex size-11 shrink-0 items-center justify-center rounded-full bg-[#c8ddf2] text-[#274b63]">
                    <UserCheck className="size-5" aria-hidden />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-bold uppercase tracking-widest text-[#3E667D]">
                      Patrocinador
                    </p>
                    <p className="truncate text-lg font-bold leading-snug text-[#274b63]">
                      {sponsorName ?? 'Verificado'}
                    </p>
                    <p className="text-sm text-[#3E667D]">No. {sponsorNumber}</p>
                  </div>
                  <button
                    type="button"
                    onClick={handleChangeSponsor}
                    className="inline-flex min-h-12 shrink-0 items-center gap-1.5 rounded-xl border border-[#c8ddf2] bg-white px-3.5 text-sm font-bold text-[#274b63] transition-colors hover:bg-[#c8ddf2]/40 active:bg-[#c8ddf2]/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#c8ddf2]"
                  >
                    <Pencil className="size-4" aria-hidden />
                    Cambiar
                  </button>
                </div>

                <p className="mx-auto mt-5 max-w-xl text-center text-base leading-relaxed text-[#3E667D]">
                  Para brindarte la mejor experiencia en tu taller de inducción
                  y asegurarnos de que recibas toda la información y atención
                  personalizada que mereces, por favor compártenos los
                  siguientes datos breves:
                </p>

                {/* Preguntas */}
                <div className="mt-6 space-y-4">
                  {QUESTIONS.map((q, idx) => (
                    <div
                      key={q.key}
                      className="rounded-2xl bg-white/85 p-5 shadow-md backdrop-blur-sm"
                    >
                      <div className="flex items-start gap-3">
                        <span
                          className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-full bg-[#c8ddf2] text-lg font-bold text-[#274b63]"
                          aria-hidden
                        >
                          {q.number}
                        </span>
                        <div className="min-w-0 flex-1">
                          <label
                            htmlFor={`q-${q.key}`}
                            className="block text-lg font-bold leading-snug text-[#274b63]"
                          >
                            {q.label}
                            {q.required && <span className="sr-only"> (obligatorio)</span>}
                          </label>
                          <p id={`q-${q.key}-hint`} className="mt-0.5 text-sm text-[#3E667D]">
                            {q.helper}
                          </p>
                          <input
                            ref={q.key === 'fullName' ? fullNameRef : undefined}
                            id={`q-${q.key}`}
                            type={q.type}
                            inputMode={q.inputMode}
                            autoComplete={q.autoComplete}
                            enterKeyHint={idx === QUESTIONS.length - 1 ? 'send' : 'next'}
                            value={answers[q.key]}
                            onChange={(e) => setAnswer(q.key, e.target.value)}
                            onKeyDown={(e) => handleQuestionKeyDown(e, idx)}
                            required={q.required}
                            maxLength={q.maxLength}
                            placeholder="(Escribe aquí tu respuesta.)"
                            aria-describedby={`q-${q.key}-hint`}
                            aria-invalid={
                              q.key === 'fullName' && fullNameInvalid ? true : undefined
                            }
                            className={INPUT_CLASS}
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Botón principal (y el error, para que siempre se lea):
                    siempre visible en móvil */}
                <div className={STICKY_BAR_CLASS}>
                  {error && (
                    <p role="alert" className={ALERT_CLASS}>
                      {error}
                    </p>
                  )}
                  <button
                    type="submit"
                    disabled={sending}
                    className={PRIMARY_BUTTON_CLASS}
                  >
                    {sending ? (
                      <Loader2 className="size-5 animate-spin" aria-hidden />
                    ) : (
                      <Video className="size-5" aria-hidden />
                    )}
                    {sending ? 'Enviando…' : 'Enviar y entrar al taller'}
                  </button>
                </div>
                <p className="mt-4 text-center text-sm font-bold uppercase tracking-widest text-[#3E667D]">
                  Ganas más ayudando a tu gente
                </p>
              </form>
            )}

            {/* Honeypot (oculto para humanos), compartido por ambos pasos */}
            <div className="absolute left-[-9999px] top-[-9999px]" aria-hidden>
              <label htmlFor="website">No llenar</label>
              <input
                id="website"
                type="text"
                tabIndex={-1}
                autoComplete="off"
                value={website}
                onChange={(e) => setWebsite(e.target.value)}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
