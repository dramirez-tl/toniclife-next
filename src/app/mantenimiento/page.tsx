'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';

const LAUNCH_DATE = process.env.NEXT_PUBLIC_LAUNCH_DATE || '2026-03-01T08:00:00-06:00';

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
      <div className="relative group">
        <div className="absolute inset-0 rounded-2xl bg-white/20 blur-sm group-hover:bg-white/25 transition-all" />
        <div className="relative bg-white/10 backdrop-blur-md rounded-2xl w-18 h-18 sm:w-24 sm:h-24 flex items-center justify-center border border-white/20 shadow-lg">
          <span className="text-2xl sm:text-4xl font-bold text-white tabular-nums drop-shadow-lg">
            {String(value).padStart(2, '0')}
          </span>
        </div>
      </div>
      <span className="mt-2 text-xs sm:text-sm text-white/60 uppercase tracking-widest font-medium">
        {label}
      </span>
    </div>
  );
}

const improvements = [
  'Optimizando el rendimiento general',
  'Mejorando la experiencia de usuario',
  'Actualizando los sistemas de seguridad',
  'Preparando nuevas funcionalidades',
];

export default function ComingSoonPage() {
  const [timeLeft, setTimeLeft] = useState<TimeLeft>(getTimeLeft());
  const [mounted, setMounted] = useState(false);
  const [activeDot, setActiveDot] = useState(0);

  useEffect(() => {
    setMounted(true);
    const timer = setInterval(() => {
      const tl = getTimeLeft();
      setTimeLeft(tl);

      if (tl.days === 0 && tl.hours === 0 && tl.minutes === 0 && tl.seconds === 0) {
        clearInterval(timer);
        window.location.href = '/';
      }
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  // Animated dots for the progress indicator
  useEffect(() => {
    const dotTimer = setInterval(() => {
      setActiveDot((prev) => (prev + 1) % 4);
    }, 2000);
    return () => clearInterval(dotTimer);
  }, []);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center relative overflow-hidden bg-gradient-to-br from-[#1a3a4a] via-[#2d4f5e] to-[#0f2b3d]">
      {/* Animated background elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-[500px] h-[500px] rounded-full bg-[#C8DDF2]/8 blur-3xl animate-pulse" />
        <div className="absolute -bottom-40 -left-40 w-[500px] h-[500px] rounded-full bg-[#3E667D]/15 blur-3xl animate-pulse" style={{ animationDelay: '2s' }} />
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-[800px] h-[400px] rounded-full bg-white/[0.02] blur-3xl" />

        {/* Subtle grid pattern */}
        <div
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage: 'radial-gradient(circle, white 1px, transparent 1px)',
            backgroundSize: '40px 40px',
          }}
        />
      </div>

      <div className="relative z-10 flex flex-col items-center px-6 text-center max-w-2xl mx-auto">
        {/* Logo with glow */}
        <div className="mb-10 relative">
          <div className="absolute inset-0 rounded-full bg-[#C8DDF2]/20 blur-2xl scale-125" />
          <div className="relative rounded-full bg-white h-32 w-32 sm:h-40 sm:w-40 shadow-2xl shadow-black/30 flex items-center justify-center overflow-hidden ring-2 ring-white/20">
            <Image
              src="/images/logo/svg/logo-icon-blue-solid.svg"
              alt="Tonic Life"
              width={320}
              height={320}
              priority
              className="h-44 w-44 sm:h-56 sm:w-56 object-contain"
            />
          </div>
        </div>

        {/* Maintenance badge */}
        <div className="mb-6 inline-flex items-center gap-2 px-4 py-2 rounded-full bg-amber-500/15 border border-amber-400/30 backdrop-blur-sm">
          <span className="relative flex h-2.5 w-2.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-amber-400" />
          </span>
          <span className="text-sm font-medium text-amber-200/90 tracking-wide">
            Mantenimiento programado
          </span>
        </div>

        {/* Heading */}
        <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold text-white mb-4 leading-tight">
          Estamos mejorando<br />
          <span className="text-[#C8DDF2]">tu experiencia</span>
        </h1>

        <p className="text-base sm:text-lg text-white/60 mb-10 max-w-md leading-relaxed">
          Estamos realizando algunas actualizaciones y mejoras para ofrecerte
          un mejor servicio. Volveremos muy pronto.
        </p>

        {/* Countdown */}
        {mounted && (
          <div className="mb-10">
            <p className="text-white/40 text-xs uppercase tracking-widest mb-4 font-medium">
              Tiempo estimado de regreso
            </p>
            <div className="flex gap-3 sm:gap-5">
              <CountdownUnit value={timeLeft.days} label="Dias" />
              <div className="flex items-center pt-0 sm:pt-0 text-white/30 text-2xl font-light self-start mt-4 sm:mt-5">:</div>
              <CountdownUnit value={timeLeft.hours} label="Horas" />
              <div className="flex items-center pt-0 sm:pt-0 text-white/30 text-2xl font-light self-start mt-4 sm:mt-5">:</div>
              <CountdownUnit value={timeLeft.minutes} label="Min" />
              <div className="flex items-center pt-0 sm:pt-0 text-white/30 text-2xl font-light self-start mt-4 sm:mt-5">:</div>
              <CountdownUnit value={timeLeft.seconds} label="Seg" />
            </div>
          </div>
        )}

        {/* What we're doing - animated list */}
        <div className="w-full max-w-sm">
          <div className="bg-white/5 backdrop-blur-sm rounded-2xl border border-white/10 p-5">
            <p className="text-white/50 text-xs uppercase tracking-widest mb-4 font-medium">
              En que estamos trabajando
            </p>
            <div className="space-y-3">
              {improvements.map((item, i) => (
                <div
                  key={item}
                  className={`flex items-center gap-3 transition-all duration-700 ${
                    i === activeDot ? 'opacity-100' : 'opacity-40'
                  }`}
                >
                  <div className={`flex-shrink-0 w-2 h-2 rounded-full transition-all duration-700 ${
                    i === activeDot ? 'bg-[#C8DDF2] shadow-[0_0_8px_rgba(200,221,242,0.5)]' : 'bg-white/30'
                  }`} />
                  <span className={`text-sm transition-all duration-700 ${
                    i === activeDot ? 'text-white/90' : 'text-white/40'
                  }`}>
                    {item}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

    </div>
  );
}
