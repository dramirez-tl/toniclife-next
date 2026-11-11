'use client';

// /admin/viaticos/[id]/comprobacion - Pantalla de comprobación de una solicitud
// de viáticos aprobada: el solicitante sube los recibos y facturas de cada gasto
// y captura lo gastado (caja chica: autorizado − gastado = sobrante);
// Contabilidad la revisa gasto por gasto y la valida o la regresa.
// El permiso lo pone el layout del módulo; el API decide quién ve cada solicitud.

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { ArrowLeftIcon } from '@heroicons/react/24/outline';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { EmployeeAvatar } from '@/components/admin/hr/EmployeeAvatar';
import { ViaticoProofWorkspace } from '@/components/admin/viaticos/ViaticoProofWorkspace';
import { useViatico, useViaticoSummary } from '@/hooks/useViaticos';
import { rangeLabel } from '@/lib/viaticos-week';
import { VIATICO_STATUS_LABELS, VIATICO_STATUS_VARIANTS, type ViaticoStatus } from '@/types/viaticos';

/** Estatus en los que hay comprobación (aprobada y sus pasos siguientes). */
const WITH_PROOF: ViaticoStatus[] = ['approved', 'proof_submitted', 'verified'];

function BackLink() {
  return (
    <Button asChild variant="ghost" size="sm" className="-ml-2">
      <Link href="/admin/viaticos">
        <ArrowLeftIcon className="mr-1.5 h-4 w-4" />
        Viáticos
      </Link>
    </Button>
  );
}

export default function ViaticoComprobacionPage() {
  const { id } = useParams<{ id: string }>();
  const detail = useViatico(id);
  const summary = useViaticoSummary();
  const v = detail.data;

  if (detail.isLoading) {
    return (
      <div className="mx-auto max-w-6xl space-y-4 p-4 sm:p-6">
        <Skeleton className="h-8 w-40" />
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  if (!v) {
    return (
      <div className="mx-auto max-w-6xl space-y-4 p-4 sm:p-6">
        <BackLink />
        <Card>
          <CardContent className="py-10 text-center text-sm text-muted-foreground">
            No se pudo abrir la solicitud: no existe o no tienes permiso para verla.
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl space-y-4 p-4 sm:p-6">
      <BackLink />

      <Card>
        <CardContent className="flex flex-wrap items-start gap-3 py-4">
          <EmployeeAvatar photoUrl={v.requesterAvatarUrl} name={v.requesterName} size={48} />
          <div className="min-w-0 flex-1">
            <h1 className="flex flex-wrap items-center gap-2 text-lg font-semibold text-foreground">
              Comprobación <span className="font-mono">{v.folio}</span>
              <Badge variant={VIATICO_STATUS_VARIANTS[v.status]}>{VIATICO_STATUS_LABELS[v.status]}</Badge>
            </h1>
            <p className="text-sm text-muted-foreground">
              {v.requesterName}
              {v.departmentName ? ` · ${v.departmentName}` : ''} · semana {rangeLabel(v.tripStart, v.tripEnd)}
              {v.destination || v.branchName ? ` · ${v.destination || v.branchName}` : ''}
            </p>
            <p className="mt-1 line-clamp-2 text-sm text-foreground">{v.purpose}</p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="py-5">
          {WITH_PROOF.includes(v.status) ? (
            // `key`: el estado local (lo tecleado) arranca limpio por solicitud.
            <ViaticoProofWorkspace key={v.id} viatico={v} canApprove={summary.data?.canApprove ?? false} />
          ) : (
            <p className="py-6 text-center text-sm text-muted-foreground">
              Esta solicitud está {VIATICO_STATUS_LABELS[v.status].toLowerCase()}: la comprobación aplica solo a las
              aprobadas.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
