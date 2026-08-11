'use client';

// Formulario público "Oportunidad de Negocio Tonic Life".
// Se sirve en formulario.<dominio> (rewrite por host en middleware.ts) y
// también en /formulario del dominio principal. SIN autenticación: postea a
// POST /marketing/leads (endpoint público con throttle + honeypot) y las
// respuestas se analizan en /admin/comercial/formularios.

import { useState } from 'react';
import { ArrowRight, CheckCircle2, Loader2 } from 'lucide-react';

const API_BASE =
  process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1';

const QUESTIONS = [
  {
    key: 'fullName' as const,
    number: 1,
    label: 'Cual es tu nombre Completo:',
    helper: '(Para saludarte adecuadamente durante la sesión)',
    required: true,
  },
  {
    key: 'cityCountry' as const,
    number: 2,
    label: '¿De qué ciudad y país nos acompañas?',
    helper: '(Para conocer el alcance de nuestra red global)',
    required: false,
  },
  {
    key: 'phone' as const,
    number: 3,
    maxLength: 60,
    label: 'Teléfono de contacto/WhatsApp:',
    helper:
      '(Para enviarte material exclusivo de bienvenida y resolver cualquier duda después de la transmisión)',
    required: false,
  },
  {
    key: 'invitedBy' as const,
    number: 4,
    label: '¿Quién te hizo el favor de invitarte a esta sesión?',
    helper:
      '(Escribe el nombre de tu patrocinador o pon "Redes Sociales Oficiales" si llegaste por nuestra página)',
    required: false,
  },
];

type Answers = { fullName: string; cityCountry: string; phone: string; invitedBy: string };

export default function FormularioOportunidadPage() {
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
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const setAnswer = (key: keyof Answers, value: string) =>
    setAnswers((a) => ({ ...a, [key]: value }));

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (sending || sent) return;
    if (answers.fullName.trim().length < 2) {
      setError('Por favor escribe tu nombre completo.');
      return;
    }
    setError(null);
    setSending(true);
    try {
      const res = await fetch(`${API_BASE}/marketing/leads`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          formSlug: 'oportunidad',
          fullName: answers.fullName.trim(),
          cityCountry: answers.cityCountry.trim() || undefined,
          phone: answers.phone.trim() || undefined,
          invitedBy: answers.invitedBy.trim() || undefined,
          website: website || undefined,
        }),
      });
      if (!res.ok) {
        throw new Error(
          res.status === 429
            ? 'Demasiados envíos seguidos. Espera un momento e intenta de nuevo.'
            : 'No se pudo enviar. Revisa tu conexión e intenta de nuevo.',
        );
      }
      setSent(true);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'No se pudo enviar. Intenta de nuevo.',
      );
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="relative min-h-screen overflow-hidden bg-gradient-to-b from-sky-100 via-sky-50 to-sky-100">
      {/* Hojas SOLO en las esquinas: superior derecha + inferior izquierda
          (girada 180°) — sutiles (opacidad baja) y difuminadas (blur). */}
      <div
        aria-hidden
        className="pointer-events-none absolute -right-16 -top-16 h-64 w-72 bg-cover bg-center opacity-45 blur-[3px] sm:-right-24 sm:-top-24 sm:h-[420px] sm:w-[520px]"
        style={{ backgroundImage: "url('/images/form/leaves-form-background.png')" }}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -bottom-16 -left-16 h-64 w-72 rotate-180 bg-cover bg-center opacity-45 blur-[3px] sm:-bottom-24 sm:-left-24 sm:h-[420px] sm:w-[520px]"
        style={{ backgroundImage: "url('/images/form/leaves-form-background.png')" }}
      />

      <div className="relative mx-auto flex min-h-screen w-full max-w-2xl flex-col items-center px-4 py-10 sm:py-14">
        {/* Encabezado — mismo logo y tamaño que el navbar de la página
            principal (logo-text-blue.svg, 160/200/220px por breakpoint). */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/images/logo/svg/logo-text-blue.svg"
          alt="Tonic Life"
          className="h-auto w-[160px] lg:w-[200px] xl:w-[220px]"
        />
        <h1 className="mt-4 text-center text-4xl font-extrabold leading-tight text-[#274b63] sm:text-5xl">
          Oportunidad de Negocio
        </h1>
        <p className="text-center text-3xl font-semibold text-[#8fb3d9] sm:text-4xl">
          Tonic Life
        </p>

        {sent ? (
          /* ── Estado de éxito ── */
          <div className="mt-10 w-full rounded-2xl bg-white/85 p-8 text-center shadow-lg backdrop-blur-sm">
            <CheckCircle2 className="mx-auto size-14 text-emerald-500" />
            <h2 className="mt-4 text-2xl font-bold text-[#274b63]">
              ¡Gracias, {answers.fullName.split(' ')[0] || 'bienvenido'}!
            </h2>
            <p className="mt-2 text-[#3E667D]">
              Recibimos tus datos. Disfruta la Presentación de Oportunidad — muy
              pronto te haremos llegar tu material exclusivo de bienvenida.
            </p>
            <p className="mt-6 text-sm font-bold uppercase tracking-widest text-[#3E667D]">
              Ganas más ayudando a tu gente
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="mt-6 w-full">
            <p className="text-center font-bold text-[#274b63]">
              ¡Nos da muchísimo gusto saludarte!
            </p>
            <p className="mx-auto mt-1 max-w-xl text-center text-[15px] leading-relaxed text-[#3E667D]">
              Para brindarte la mejor experiencia en nuestra Presentación de
              Oportunidad y asegurarnos de que recibas toda la información y
              atención personalizada que mereces, por favor compártenos los
              siguientes datos breves:
            </p>

            {/* Preguntas */}
            <div className="mt-6 space-y-4">
              {QUESTIONS.map((q) => (
                <div
                  key={q.key}
                  className="rounded-2xl bg-white/85 p-5 shadow-md backdrop-blur-sm"
                >
                  <div className="flex items-start gap-3">
                    <span className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-full bg-[#c8ddf2] text-lg font-bold text-[#274b63]">
                      {q.number}
                    </span>
                    <div className="min-w-0 flex-1">
                      <label
                        htmlFor={`q-${q.key}`}
                        className="block text-lg font-bold leading-snug text-[#274b63]"
                      >
                        {q.label}
                      </label>
                      <p className="mt-0.5 text-sm text-[#3E667D]/80">
                        {q.helper}
                      </p>
                      <input
                        id={`q-${q.key}`}
                        type={q.key === 'phone' ? 'tel' : 'text'}
                        value={answers[q.key]}
                        onChange={(e) => setAnswer(q.key, e.target.value)}
                        required={q.required}
                        maxLength={('maxLength' in q ? q.maxLength : undefined) ?? 200}
                        placeholder="Texto de respuesta breve"
                        className="mt-3 w-full rounded-lg border border-[#c8ddf2] bg-white px-3.5 py-2.5 text-[15px] text-[#274b63] placeholder:text-[#9db8cd] focus:border-[#3E667D] focus:outline-none focus:ring-2 focus:ring-[#c8ddf2]"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Honeypot (oculto para humanos) */}
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

            {error && (
              <p className="mt-4 rounded-lg bg-red-50 px-4 py-2 text-center text-sm font-medium text-red-700">
                {error}
              </p>
            )}

            {/* Enviar */}
            <div className="mt-7 flex flex-col items-center gap-4">
              <button
                type="submit"
                disabled={sending}
                className="inline-flex items-center gap-2 rounded-xl bg-[#33566d] px-8 py-3.5 text-base font-bold uppercase tracking-wide text-white shadow-lg transition-colors hover:bg-[#274b63] disabled:opacity-60"
              >
                {sending ? (
                  <Loader2 className="size-5 animate-spin" />
                ) : null}
                {sending ? 'Enviando…' : 'Enviar respuestas'}
                {!sending && <ArrowRight className="size-5" />}
              </button>
              <p className="text-sm font-bold uppercase tracking-widest text-[#3E667D]">
                Ganas más ayudando&nbsp; a tu gente
              </p>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
