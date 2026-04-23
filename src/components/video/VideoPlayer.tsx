'use client';

import { useEffect, useRef } from 'react';
import * as PlyrNS from 'plyr';
import 'plyr/dist/plyr.css';

const Plyr: typeof PlyrNS.default = (PlyrNS as any).default || (PlyrNS as any);
type PlyrInstance = PlyrNS.default;

interface VideoPlayerProps {
  src: string;
  mimeType?: string;
  poster?: string;
  startAt?: number;
  onTimeUpdate?: (seconds: number, duration: number) => void;
  onEnded?: () => void;
  onReady?: (player: PlyrInstance) => void;
}

/**
 * Reproductor con Plyr. Carga progresiva desde signed URL de GCS (range requests).
 * onTimeUpdate emite con throttle manual (cada ~5s de reproducción).
 */
export function VideoPlayer({
  src,
  mimeType = 'video/mp4',
  poster,
  startAt,
  onTimeUpdate,
  onEnded,
  onReady,
}: VideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const playerRef = useRef<PlyrInstance | null>(null);
  const lastReportedRef = useRef<number>(0);

  useEffect(() => {
    if (!videoRef.current) return;

    const player = new Plyr(videoRef.current, {
      controls: [
        'play-large',
        'restart',
        'rewind',
        'play',
        'fast-forward',
        'progress',
        'current-time',
        'duration',
        'mute',
        'volume',
        'settings',
        'pip',
        'fullscreen',
      ],
      settings: ['speed'],
      speed: { selected: 1, options: [0.5, 0.75, 1, 1.25, 1.5, 1.75, 2] },
      keyboard: { focused: true, global: false },
      tooltips: { controls: true, seek: true },
      invertTime: false,
    });

    playerRef.current = player;

    player.on('ready', () => {
      if (startAt && startAt > 0 && videoRef.current) {
        videoRef.current.currentTime = startAt;
      }
      onReady?.(player);
    });

    player.on('timeupdate', () => {
      if (!videoRef.current) return;
      const current = videoRef.current.currentTime;
      const duration = videoRef.current.duration || 0;
      if (
        Math.abs(current - lastReportedRef.current) >= 5 ||
        current < lastReportedRef.current
      ) {
        lastReportedRef.current = current;
        onTimeUpdate?.(current, duration);
      }
    });

    player.on('pause', () => {
      if (!videoRef.current) return;
      onTimeUpdate?.(videoRef.current.currentTime, videoRef.current.duration || 0);
    });

    player.on('ended', () => {
      onEnded?.();
    });

    return () => {
      player.destroy();
      playerRef.current = null;
    };
    // Re-inicializa si cambia el src/lección
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [src]);

  return (
    <div className="w-full aspect-video bg-black rounded-xl overflow-hidden shadow-lg">
      <video
        ref={videoRef}
        playsInline
        controls
        poster={poster}
        preload="metadata"
        className="w-full h-full"
      >
        <source src={src} type={mimeType} />
        Tu navegador no soporta la reproducción de video HTML5.
      </video>
    </div>
  );
}
