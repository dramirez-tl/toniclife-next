'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { Card } from '@/components/ui';
import { Sparkles } from 'lucide-react';

/**
 * Pantalla de espera mientras la IA analiza las respuestas y arma las
 * recomendaciones (la llamada tarda varios segundos). Entretiene con un
 * icono animado y mensajes rotativos de "qué está pasando".
 */
const MESSAGE_KEYS = ['m1', 'm2', 'm3', 'm4', 'm5'] as const;
const ROTATE_MS = 2400;

export function QuizAnalyzing() {
  const t = useTranslations('quiz.analyzing');
  const [msgIndex, setMsgIndex] = useState(0);

  useEffect(() => {
    const id = setInterval(
      () => setMsgIndex((i) => (i + 1) % MESSAGE_KEYS.length),
      ROTATE_MS,
    );
    return () => clearInterval(id);
  }, []);

  return (
    <div className="animate-in fade-in duration-300">
      <Card className="max-w-xl mx-auto overflow-hidden p-0 rounded-2xl border-gray-100 shadow-md">
        <div className="flex flex-col items-center px-6 py-12 sm:px-10 sm:py-14 text-center">
          {/* Icono con anillos pulsantes */}
          <div className="relative flex h-28 w-28 items-center justify-center">
            <span className="absolute inset-0 rounded-full bg-[#C8DDF2]/40 animate-ping [animation-duration:2.2s]" />
            <span className="absolute inset-3 rounded-full bg-[#C8DDF2]/60 animate-ping [animation-duration:2.2s] [animation-delay:400ms]" />
            <span className="relative flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-[#3E667D] to-[#2f5165] shadow-lg">
              <Sparkles className="h-8 w-8 text-white animate-pulse" strokeWidth={2} />
            </span>
          </div>

          {/* Título */}
          <h2 className="mt-6 text-2xl font-bold text-[#3E667D]">{t('title')}</h2>

          {/* Mensaje rotativo (altura fija para que no brinque el layout) */}
          <div className="mt-3 flex h-6 items-center justify-center" aria-live="polite">
            <p
              key={msgIndex}
              className="text-gray-600 animate-in fade-in slide-in-from-bottom-1 duration-500"
            >
              {t(MESSAGE_KEYS[msgIndex])}
            </p>
          </div>

          {/* Puntos de actividad */}
          <div className="mt-5 flex items-center gap-1.5" aria-hidden="true">
            <span className="h-2 w-2 rounded-full bg-[#3E667D] animate-bounce" />
            <span className="h-2 w-2 rounded-full bg-[#3E667D]/70 animate-bounce [animation-delay:150ms]" />
            <span className="h-2 w-2 rounded-full bg-[#3E667D]/40 animate-bounce [animation-delay:300ms]" />
          </div>

          {/* Nota de expectativa */}
          <p className="mt-6 max-w-sm text-sm text-gray-400">{t('subtitle')}</p>
        </div>
      </Card>
    </div>
  );
}
