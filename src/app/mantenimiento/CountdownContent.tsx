'use client';

// Contenido de /mantenimiento: el mensaje "Estamos trabajando para ti" de la
// rama main (fondo #d5e2ee, marca de agua y botones al sitio anterior) más el
// contador al lanzamiento. Cuando el contador llega a cero recarga el inicio;
// si el candado del middleware sigue activo (reloj del visitante adelantado)
// vuelve a mostrar esta página y reintenta cada 20 s.

import { useEffect, useState } from 'react';
import { ShoppingCartIcon, UserCircleIcon } from '@heroicons/react/24/outline';
import { formatLaunchLabel, getTimeLeft, type TimeLeft } from '@/lib/launch-countdown';

const LEGACY_STORE_URL = 'https://tonic-life.net/login/empresariosindependientes';

function CountdownUnit({ value, label }: { value: number; label: string }) {
  return (
    <div className="flex flex-col items-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-2xl border border-[#3E667D]/25 bg-white/70 shadow-sm backdrop-blur-sm sm:h-20 sm:w-20">
        <span className="text-2xl font-bold tabular-nums text-[#2d4f5e] sm:text-3xl">{String(value).padStart(2, '0')}</span>
      </div>
      <span className="mt-2 text-[11px] font-semibold uppercase tracking-widest text-[#3E667D]/70 sm:text-xs">{label}</span>
    </div>
  );
}

export function CountdownContent({ launchAt }: { launchAt: string }) {
  const [timeLeft, setTimeLeft] = useState<TimeLeft | null>(null);

  useEffect(() => {
    let retry: ReturnType<typeof setTimeout> | null = null;
    const tick = () => {
      const tl = getTimeLeft(launchAt);
      setTimeLeft(tl);
      if (tl.done) {
        clearInterval(timer);
        // El middleware decide: si ya se lanzó, / muestra el sitio nuevo.
        window.location.replace('/');
        retry = setTimeout(() => window.location.reload(), 20_000);
      }
    };
    const timer = setInterval(tick, 1000);
    tick();
    return () => {
      clearInterval(timer);
      if (retry) clearTimeout(retry);
    };
  }, [launchAt]);

  const label = formatLaunchLabel(launchAt);

  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-[#d5e2ee]">
      {/* Marca de agua */}
      <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/images/logo/svg/logo-icon-blue-solid.svg" alt="" className="h-[600px] w-[600px] opacity-[0.08]" />
      </div>

      <div className="relative z-10 mx-auto flex max-w-2xl flex-col items-center px-6 text-center">
        <div className="mb-10">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/images/logo/svg/logo-icon-green-solid.svg" alt="Tonic Life" className="h-16 w-16" />
        </div>

        <h1 className="mb-2 text-4xl font-bold leading-tight tracking-tight text-[#2d4f5e] sm:text-5xl md:text-6xl">
          Estamos trabajando
        </h1>
        <p className="mb-8 text-4xl font-light italic text-[#3E667D] sm:text-5xl md:text-6xl">para ti</p>

        <p className="mb-8 max-w-md text-lg font-medium leading-relaxed text-[#3E667D]/80 sm:text-xl">
          Muy pronto tendrás
          <br />
          una mejor experiencia
        </p>

        {/* Contador al lanzamiento */}
        <div className="mb-10" aria-live="polite">
          <div className="flex items-start gap-2 sm:gap-4">
            <CountdownUnit value={timeLeft?.days ?? 0} label="Días" />
            <span className="mt-4 text-2xl font-light text-[#3E667D]/40 sm:mt-5">:</span>
            <CountdownUnit value={timeLeft?.hours ?? 0} label="Horas" />
            <span className="mt-4 text-2xl font-light text-[#3E667D]/40 sm:mt-5">:</span>
            <CountdownUnit value={timeLeft?.minutes ?? 0} label="Min" />
            <span className="mt-4 text-2xl font-light text-[#3E667D]/40 sm:mt-5">:</span>
            <CountdownUnit value={timeLeft?.seconds ?? 0} label="Seg" />
          </div>
          {label && (
            <p className="mt-4 text-sm font-medium text-[#3E667D]/70">
              Nuevo sitio disponible el <span className="font-semibold text-[#2d4f5e]">{label}</span>
            </p>
          )}
        </div>

        {/* Botones al sitio anterior (mientras tanto) */}
        <div className="flex w-full max-w-lg flex-col gap-4 sm:flex-row sm:gap-6">
          <a
            href={LEGACY_STORE_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="flex flex-1 items-center justify-center gap-3 rounded-full border-2 border-[#3E667D]/40 px-8 py-4 text-base font-semibold text-[#2d4f5e] transition-colors hover:bg-[#3E667D]/10"
          >
            <ShoppingCartIcon className="h-7 w-7" aria-hidden />
            Comprar ahora
          </a>
          <a
            href={LEGACY_STORE_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="flex flex-1 items-center justify-center gap-3 rounded-full border-2 border-[#3E667D]/40 px-8 py-4 text-base font-semibold text-[#2d4f5e] transition-colors hover:bg-[#3E667D]/10"
          >
            <UserCircleIcon className="h-7 w-7" aria-hidden />
            Ir a mi oficina virtual
          </a>
        </div>
      </div>
    </div>
  );
}
