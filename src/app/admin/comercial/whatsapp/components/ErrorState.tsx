'use client';

// ErrorState - Estados de error compartidos por la página Comercial → WhatsApp
// (campañas, recorridos e impacto del periodo). 403 → tarjeta "Acceso
// denegado"; 503 → "aún no habilitado" solo si el API lo dice
// (`habilitado: false`, PRD_MIGRATION_PENDING o "migración" en el mensaje),
// si no "servicio no disponible" (balanceador, despliegue); 404 → "no
// disponible todavía". Con `onRetry` muestra "Reintentar"; con `staleAt`
// avisa que las cifras de abajo son las de esa hora.

import { ExclamationTriangleIcon } from '@heroicons/react/24/outline';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { apiErrorInfo, type ApiErrorMessages } from '@/lib/api-error';

export const CAMPAIGN_ERROR_MESSAGES: ApiErrorMessages = {
  forbidden:
    'Tu rol no tiene acceso a las campañas de WhatsApp. Pide a Sistemas que habilite el permiso Comercial.',
  unavailable: 'Las campañas de WhatsApp aún no están habilitadas (pendiente de Sistemas).',
  notFound: 'El API todavía no expone las campañas de WhatsApp (despliegue pendiente).',
};

export function AccessDenied({ message }: { message: string }) {
  return (
    <Card>
      <CardContent className="flex items-start gap-3 p-6 text-sm">
        <ExclamationTriangleIcon className="mt-0.5 h-5 w-5 shrink-0 text-destructive" />
        <div className="space-y-1">
          <p className="font-semibold text-foreground">Acceso denegado</p>
          <p className="text-muted-foreground">{message}</p>
        </div>
      </CardContent>
    </Card>
  );
}

export function ErrorState({
  error,
  fallback,
  onRetry,
  retrying,
  staleAt,
  messages = CAMPAIGN_ERROR_MESSAGES,
  unavailableTitle = 'Campañas aún no habilitadas',
}: {
  error: unknown;
  fallback: string;
  onRetry?: () => void;
  retrying?: boolean;
  staleAt?: string | null;
  /** Textos de 403/503/404 de la sección. */
  messages?: ApiErrorMessages;
  /** Título del 503 "función apagada / migración pendiente". */
  unavailableTitle?: string;
}) {
  const info = apiErrorInfo(error, fallback, messages);
  if (info.status === 403) return <AccessDenied message={info.message} />;
  // El API manda `habilitado: false` (campañas) o PRD_MIGRATION_PENDING
  // (recorridos) en el 503 de la migración pendiente; la regex sobre el texto
  // queda de respaldo.
  const faltaMigracion =
    info.status === 503 &&
    (info.habilitado === false || /migraci[oó]n|PRD_MIGRATION_PENDING/i.test(info.message));
  const title = staleAt
    ? 'No se pudo actualizar'
    : faltaMigracion
      ? unavailableTitle
      : info.status === 503
        ? 'Servicio no disponible'
        : info.status === 404
          ? 'No disponible todavía'
          : 'No se pudo cargar';
  const message = staleAt
    ? `Se muestran las cifras de ${staleAt}. ${info.message}`
    : info.status === 503 && !faltaMigracion
      ? 'El servidor no responde en este momento (reinicio o despliegue). Intenta en un momento.'
      : faltaMigracion
        ? (messages.unavailable ?? info.message)
        : info.message;
  return (
    <Alert
      variant={
        staleAt || info.status === 503 || info.status === 404 ? 'default' : 'destructive'
      }
    >
      <ExclamationTriangleIcon className="h-4 w-4" />
      <AlertTitle>{title}</AlertTitle>
      <AlertDescription>
        <p>{message}</p>
        {onRetry && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="mt-2"
            onClick={onRetry}
            disabled={retrying}
          >
            {retrying ? 'Reintentando…' : 'Reintentar'}
          </Button>
        )}
      </AlertDescription>
    </Alert>
  );
}
