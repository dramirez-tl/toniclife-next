'use client';

import { useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';

const POLL_INTERVAL = 60_000;   // revisar cada 60 s
const INACTIVITY_MS = 30_000;   // recarga silenciosa si inactivo 30 s

export function useVersionCheck() {
  const currentVersion = useRef(process.env.NEXT_PUBLIC_BUILD_ID || 'dev');
  const lastActivity = useRef(Date.now());
  const [toastShown, setToastShown] = useState(false);
  const toastShownRef = useRef(false);

  // Rastrear actividad del usuario
  useEffect(() => {
    if (process.env.NODE_ENV === 'development') return;

    const update = () => { lastActivity.current = Date.now(); };
    window.addEventListener('click', update);
    window.addEventListener('keypress', update);
    window.addEventListener('mousemove', update);
    return () => {
      window.removeEventListener('click', update);
      window.removeEventListener('keypress', update);
      window.removeEventListener('mousemove', update);
    };
  }, []);

  // Polling de versión
  useEffect(() => {
    if (process.env.NODE_ENV === 'development') return;

    const check = async () => {
      try {
        const res = await fetch('/api/version', {
          cache: 'no-store',
          headers: { 'Cache-Control': 'no-cache' },
        });
        if (!res.ok) return;
        const data: { version: string } = await res.json();

        const isNewVersion =
          data.version !== currentVersion.current && data.version !== 'dev';

        if (!isNewVersion) return;

        const inactive = Date.now() - lastActivity.current > INACTIVITY_MS;

        if (inactive) {
          // Usuario inactivo — recarga silenciosa
          window.location.reload();
        } else if (!toastShownRef.current) {
          // Usuario activo — mostrar banner persistente
          toastShownRef.current = true;
          setToastShown(true);
          toast('Nueva versión disponible', {
            description: 'Hay una actualización lista para ti.',
            duration: Infinity,
            action: {
              label: 'Actualizar',
              onClick: () => window.location.reload(),
            },
          });
        }
      } catch {
        // Silenciar errores de red
      }
    };

    const interval = setInterval(check, POLL_INTERVAL);
    return () => clearInterval(interval);
  }, []);

  return { toastShown };
}
