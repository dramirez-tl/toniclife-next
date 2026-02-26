'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';

const LAUNCH_DATE = process.env.NEXT_PUBLIC_LAUNCH_DATE || '2026-02-27T11:00:00-06:00';

interface TimeLeft {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
}

function getTimeLeft(): TimeLeft {
  const now = new Date().getTime();
  const target = new Date(LAUNCH_DATE).getTime();
  const diff = target - now;

  if (diff <= 0) {
    return { days: 0, hours: 0, minutes: 0, seconds: 0 };
  }

  return {
    days: Math.floor(diff / (1000 * 60 * 60 * 24)),
    hours: Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)),
    minutes: Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60)),
    seconds: Math.floor((diff % (1000 * 60)) / 1000),
  };
}

function CountdownUnit({ value, label }: { value: number; label: string }) {
  return (
    <div className="flex flex-col items-center">
      <div className="bg-white/10 backdrop-blur-sm rounded-2xl w-20 h-20 sm:w-28 sm:h-28 flex items-center justify-center border border-white/20">
        <span className="text-3xl sm:text-5xl font-bold text-white tabular-nums">
          {String(value).padStart(2, '0')}
        </span>
      </div>
      <span className="mt-2 text-sm sm:text-base text-white/70 uppercase tracking-wider">
        {label}
      </span>
    </div>
  );
}

export default function ComingSoonPage() {
  const [timeLeft, setTimeLeft] = useState<TimeLeft>(getTimeLeft());
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const timer = setInterval(() => {
      const tl = getTimeLeft();
      setTimeLeft(tl);

      // Auto-reload when countdown reaches zero
      if (tl.days === 0 && tl.hours === 0 && tl.minutes === 0 && tl.seconds === 0) {
        clearInterval(timer);
        window.location.href = '/';
      }
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center relative overflow-hidden bg-gradient-to-br from-[#003B7A] via-[#00264d] to-[#001a33]">
      {/* Background decoration */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-96 h-96 rounded-full bg-[#7AB82E]/10 blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-96 h-96 rounded-full bg-[#7AB82E]/5 blur-3xl" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full bg-white/[0.02] blur-3xl" />
      </div>

      <div className="relative z-10 flex flex-col items-center px-6 text-center max-w-2xl mx-auto">
        {/* Logo */}
        <div className="mb-8">
          <Image
            src="/images/logo-white.png"
            alt="Tonic Life"
            width={220}
            height={70}
            priority
            className="drop-shadow-lg"
          />
        </div>

        {/* Heading */}
        <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold text-white mb-4">
          Algo increíble está por llegar
        </h1>
        <p className="text-lg sm:text-xl text-white/70 mb-12 max-w-lg">
          Estamos preparando una experiencia completamente nueva para ti.
          ¡Muy pronto!
        </p>

        {/* Countdown */}
        {mounted && (
          <div className="flex gap-3 sm:gap-6 mb-12">
            <CountdownUnit value={timeLeft.days} label="Días" />
            <CountdownUnit value={timeLeft.hours} label="Horas" />
            <CountdownUnit value={timeLeft.minutes} label="Min" />
            <CountdownUnit value={timeLeft.seconds} label="Seg" />
          </div>
        )}

        {/* Launch date info */}
        <p className="text-white/50 text-sm">
          Fecha de lanzamiento: 27 de febrero de 2026 a las 11:00 AM (hora de Ciudad de México)
        </p>
      </div>

      {/* Footer */}
      <div className="absolute bottom-6 text-center text-white/30 text-xs">
        &copy; {new Date().getFullYear()} Tonic Life. Todos los derechos reservados.
      </div>
    </div>
  );
}
