'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';

function getCookie(name: string): string | null {
  const match = document.cookie.match(new RegExp(`(?:^|; )${name}=([^;]*)`));
  return match ? decodeURIComponent(match[1]) : null;
}

function setCookie(name: string, value: string, days: number) {
  const expires = new Date(Date.now() + days * 864e5).toUTCString();
  document.cookie = `${name}=${encodeURIComponent(value)}; expires=${expires}; path=/`;
}

function deleteCookie(name: string) {
  document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/`;
}

export default function ConfigSistemasPage() {
  const [bypassed, setBypassed] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const saved = getCookie('bypass_countdown') === '1';
    setBypassed(saved);
  }, []);

  function handleToggle() {
    const newValue = !bypassed;
    setBypassed(newValue);

    if (newValue) {
      setCookie('bypass_countdown', '1', 7);
      localStorage.setItem('bypass_countdown', '1');
    } else {
      deleteCookie('bypass_countdown');
      localStorage.removeItem('bypass_countdown');
    }
  }

  if (!mounted) return null;

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-[#3E667D] via-[#2d4f5e] to-[#001a33] px-6">
      <div className="bg-white/10 backdrop-blur-md rounded-2xl border border-white/20 p-8 max-w-md w-full text-center">
        <div className="mb-6">
          <Image
            src="/images/logo/svg/logo-text-dark-r.svg"
            alt="Tonic Life"
            width={160}
            height={50}
            priority
            className="mx-auto drop-shadow-lg"
          />
        </div>

        <h1 className="text-xl font-bold text-white mb-2">
          Configuración de Sistemas
        </h1>
        <p className="text-white/60 text-sm mb-8">
          Panel de control temporal para el equipo de desarrollo
        </p>

        <div className="bg-white/5 rounded-xl p-6 border border-white/10">
          <div className="flex items-center justify-between mb-3">
            <div className="text-left">
              <p className="text-white font-medium">Página de Contador</p>
              <p className="text-white/50 text-xs mt-1">
                {bypassed
                  ? 'Desactivado — ves el sitio normal'
                  : 'Activado — ves el countdown'}
              </p>
            </div>

            <button
              onClick={handleToggle}
              className={`relative inline-flex h-7 w-12 items-center rounded-full transition-colors duration-200 focus:outline-none ${
                bypassed ? 'bg-[#C8DDF2]' : 'bg-white/20'
              }`}
            >
              <span
                className={`inline-block h-5 w-5 rounded-full bg-white shadow-sm transform transition-transform duration-200 ${
                  bypassed ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>

          <div
            className={`mt-4 rounded-lg px-4 py-3 text-sm ${
              bypassed
                ? 'bg-[#C8DDF2]/20 text-[#3E667D]'
                : 'bg-blue-500/20 text-blue-300'
            }`}
          >
            {bypassed
              ? 'Bypass activo. Puedes navegar el sitio normalmente.'
              : 'Mostrando countdown a visitantes. Activa el bypass para ver el sitio.'}
          </div>
        </div>

        <a
          href="/"
          className="inline-block mt-6 text-white/50 hover:text-white text-sm transition-colors"
        >
          Ir al sitio &rarr;
        </a>
      </div>
    </div>
  );
}
