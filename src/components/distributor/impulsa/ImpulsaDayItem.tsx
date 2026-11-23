'use client';

// Un día de la Victoria: su mensaje (el aprobado, con el nombre, el ID y el Patrocinador ya puestos)
// y su microvideo. El video es una lección de RISE Academy: se pide su liga firmada al abrirlo y se
// registra lo que la persona vio, igual que en cualquier curso.

import { useCallback, useState } from 'react';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';
import { ChevronDownIcon, DocumentTextIcon, PlayIcon, VideoCameraSlashIcon } from '@heroicons/react/24/outline';
import { Button } from '@/components/ui/button';
import { VideoPlayer } from '@/components/video/VideoPlayer';
import { useUpdateLessonProgress } from '@/hooks/useCourses';
import { coursesService } from '@/services/courses.service';
import { cn } from '@/lib/utils';
import type { ImpulsaDay } from '@/types/impulsa';

interface ImpulsaDayItemProps {
  day: ImpulsaDay;
  open: boolean;
  onToggle: () => void;
  /** Lleva a la sección de guías de la Victoria. */
  onOpenGuides: () => void;
}

export function ImpulsaDayItem({ day, open, onToggle, onOpenGuides }: ImpulsaDayItemProps) {
  const t = useTranslations('distributor.impulsa.victoryPage');
  const [streamUrl, setStreamUrl] = useState<string | null>(null);
  const [loadingVideo, setLoadingVideo] = useState(false);
  const video = day.video;
  const hasVideo = !!video?.hasVideo;
  const updateProgress = useUpdateLessonProgress(video?.courseId ?? '');

  const toggleVideo = async () => {
    if (!video || !hasVideo) return;
    if (streamUrl) {
      setStreamUrl(null);
      return;
    }
    try {
      setLoadingVideo(true);
      const { url } = await coursesService.getLessonStreamUrl(video.courseId, video.lessonId);
      setStreamUrl(url);
    } catch {
      toast.error(t('videoError'));
    } finally {
      setLoadingVideo(false);
    }
  };

  const handleTimeUpdate = useCallback(
    (seconds: number, duration: number) => {
      if (!video || !duration) return;
      updateProgress.mutate({
        lessonId: video.lessonId,
        secondsWatched: seconds,
        percent: Math.min(100, (seconds / duration) * 100),
      });
    },
    [video, updateProgress],
  );
  const handleEnded = useCallback(() => {
    if (!video) return;
    updateProgress.mutate({ lessonId: video.lessonId, secondsWatched: 0, percent: 100 });
  }, [video, updateProgress]);

  const today = day.moment === 'today';
  const panelId = `impulsa-day-${day.day}`;

  return (
    <div
      className={cn(
        'overflow-hidden rounded-xl border bg-card',
        today ? 'border-primary shadow-sm' : 'border-border',
      )}
    >
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        aria-controls={panelId}
        className="flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
      >
        <span
          className={cn(
            'grid size-10 shrink-0 place-content-center rounded-full text-sm font-bold',
            today && 'bg-primary text-primary-foreground',
            day.moment === 'past' && 'bg-emerald-100 text-emerald-800',
            day.moment === 'upcoming' && 'bg-muted text-muted-foreground',
          )}
        >
          {day.day}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-sm font-semibold text-foreground">{day.title}</span>
          <span className={cn('block text-xs', today ? 'font-semibold text-primary' : 'text-muted-foreground')}>
            {t(`moment.${day.moment}`)}
            {hasVideo ? ` · ${t('watchVideo')}` : ''}
          </span>
        </span>
        <ChevronDownIcon className={cn('h-5 w-5 shrink-0 text-muted-foreground transition-transform', open && 'rotate-180')} />
      </button>

      {open && (
        <div id={panelId} className="space-y-4 border-t border-border px-4 py-4">
          <p className="text-sm leading-relaxed text-foreground">
            {day.messageParts.map((part, index) => {
              if (part.type === 'text') return <span key={index}>{part.text}</span>;
              if (part.field === 'enlace del video') {
                return (
                  <button
                    key={index}
                    type="button"
                    disabled={!hasVideo || loadingVideo}
                    onClick={() => void toggleVideo()}
                    className={cn(
                      'mx-1 inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold align-baseline',
                      hasVideo
                        ? 'bg-primary text-primary-foreground hover:bg-primary/90'
                        : 'cursor-default bg-muted text-muted-foreground',
                    )}
                  >
                    {hasVideo ? t('watchVideo') : t('videoSoon')}
                  </button>
                );
              }
              if (part.field === 'enlace de la guía') {
                return (
                  <button
                    key={index}
                    type="button"
                    onClick={onOpenGuides}
                    className="mx-1 inline-flex items-center gap-1 rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-semibold text-amber-900 hover:bg-amber-200 align-baseline"
                  >
                    <DocumentTextIcon className="h-3.5 w-3.5" />
                    {t('openGuides')}
                  </button>
                );
              }
              return <span key={index}>[{part.field}]</span>;
            })}
          </p>

          {hasVideo ? (
            <div>
              <Button type="button" variant={streamUrl ? 'outline' : 'default'} size="sm" disabled={loadingVideo} onClick={() => void toggleVideo()}>
                <PlayIcon className="h-4 w-4" />
                {loadingVideo ? t('videoLoading') : streamUrl ? t('hideVideo') : t('watchVideo')}
              </Button>
              {streamUrl && (
                <div className="mt-3 overflow-hidden rounded-lg bg-black">
                  <VideoPlayer src={streamUrl} onTimeUpdate={handleTimeUpdate} onEnded={handleEnded} />
                </div>
              )}
            </div>
          ) : (
            <p className="flex items-center gap-2 rounded-lg bg-muted/50 px-3 py-2 text-xs text-muted-foreground">
              <VideoCameraSlashIcon className="h-4 w-4" aria-hidden />
              {t('videoSoon')}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
