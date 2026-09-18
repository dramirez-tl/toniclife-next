'use client';

// Cabecera de Preparación fiscal: semáforo general (bloqueadores en rojo),
// lista de bloqueadores del API y tarjetas por bloque con conteos y botón a su
// pestaña. Todo sale de GET /billing/readiness.

import {
  ArrowPathIcon,
  BuildingOfficeIcon,
  BuildingStorefrontIcon,
  CheckCircleIcon,
  CloudIcon,
  CreditCardIcon,
  CubeIcon,
  ExclamationTriangleIcon,
  UsersIcon,
} from '@heroicons/react/24/outline';
import { Loader2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { billingErrorMessage } from '@/lib/billing-error';
import type { BillingReadiness } from '@/types/billing';
import type { ReadinessTab } from './tabs';

const nf = new Intl.NumberFormat('es-MX');

interface ReadinessHeaderProps {
  data: BillingReadiness | undefined;
  isLoading: boolean;
  isFetching: boolean;
  error: unknown;
  onRefresh: () => void;
  onGoTo: (tab: ReadinessTab) => void;
}

export function ReadinessHeader({
  data,
  isLoading,
  isFetching,
  error,
  onRefresh,
  onGoTo,
}: ReadinessHeaderProps) {
  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-24 w-full" />
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {[...Array(6)].map((_, i) => (
            <Skeleton key={i} className="h-40 w-full" />
          ))}
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <Card className="border-destructive/40">
        <CardContent className="flex flex-wrap items-center justify-between gap-3 p-4 text-sm">
          <span className="text-destructive">
            {billingErrorMessage(error, 'No se pudo cargar el estado de preparación fiscal')}
          </span>
          <Button variant="outline" size="sm" onClick={onRefresh}>
            <ArrowPathIcon className="mr-2 h-4 w-4" />
            Reintentar
          </Button>
        </CardContent>
      </Card>
    );
  }

  const blockers = data.blockers ?? [];
  const ready = blockers.length === 0;
  const generated = data.generatedAt ? new Date(data.generatedAt) : null;

  const { products, customers, paymentMethods, branches, emitter, facturama } = data;
  const productsPending =
    products.missingSatProductCode + products.missingSatUnitCode + products.missingTaxRule;
  const customersPending =
    customers.invalidRfc +
    customers.duplicateRfc +
    customers.missingRegime +
    customers.missingZip +
    customers.missingLegalName +
    customers.incompatibleUse;
  const paymentsPending = paymentMethods.missingSatForm + paymentMethods.missingSatMethod;
  const branchesPending = branches.missingZip + branches.missingTaxRule;

  return (
    <div className="space-y-4">
      {/* Semáforo */}
      <Card
        className={
          ready
            ? 'border-emerald-200 bg-emerald-50/60'
            : 'border-red-200 bg-red-50/60'
        }
      >
        <CardContent className="p-4 sm:p-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="flex items-start gap-3">
              {ready ? (
                <CheckCircleIcon className="mt-0.5 h-7 w-7 shrink-0 text-emerald-600" aria-hidden />
              ) : (
                <ExclamationTriangleIcon className="mt-0.5 h-7 w-7 shrink-0 text-red-600" aria-hidden />
              )}
              <div>
                <p className={`text-lg font-semibold ${ready ? 'text-emerald-800' : 'text-red-800'}`}>
                  {ready
                    ? 'Sin bloqueadores: los datos maestros están listos para facturar'
                    : `${blockers.length} bloqueador${blockers.length === 1 ? '' : 'es'} para facturar`}
                </p>
                <p className="text-sm text-muted-foreground">
                  Lo que Contabilidad debe completar antes de encender la facturación en v2. Cada
                  tarjeta lleva a su pestaña.
                  {generated && (
                    <>
                      {' '}
                      Calculado el {generated.toLocaleString('es-MX', { dateStyle: 'medium', timeStyle: 'short' })}.
                    </>
                  )}
                </p>
              </div>
            </div>
            <Button variant="outline" size="sm" onClick={onRefresh} disabled={isFetching}>
              {isFetching ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <ArrowPathIcon className="mr-2 h-4 w-4" />
              )}
              Recalcular
            </Button>
          </div>
          {!ready && (
            <ul className="mt-3 list-disc space-y-1 pl-9 text-sm text-red-900">
              {blockers.map((b) => (
                <li key={b}>{b}</li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      {/* Tarjetas */}
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        <ReadinessCard
          title="Emisor"
          icon={BuildingOfficeIcon}
          ok={
            emitter.configured &&
            emitter.envRfcMatches !== false &&
            emitter.pacRfcMatches !== false
          }
          statusLabel={
            !emitter.configured
              ? 'Sin configurar'
              : emitter.envRfcMatches === false
                ? 'RFC distinto al entorno'
                : emitter.pacRfcMatches === false
                  ? 'RFC distinto al del PAC'
                  : emitter.source === 'env'
                    ? 'Tomado del entorno'
                    : 'Configurado'
          }
          lines={[
            ['Razón social', emitter.legalName ?? '—'],
            ['RFC', emitter.rfcMasked ?? '—'],
            ['Régimen', emitter.taxRegimeCode ?? '—'],
            ['CP de expedición', emitter.expeditionZip ?? '—'],
          ]}
          onGoTo={() => onGoTo('emisor')}
        />

        <ReadinessCard
          title="Productos"
          icon={CubeIcon}
          ok={productsPending === 0}
          statusLabel={
            productsPending === 0
              ? `${nf.format(products.ready)} listos`
              : `${nf.format(products.ready)} de ${nf.format(products.active)} listos`
          }
          lines={[
            ['Activos', nf.format(products.active)],
            ['Sin clave SAT', nf.format(products.missingSatProductCode), products.missingSatProductCode > 0],
            ['Sin unidad SAT', nf.format(products.missingSatUnitCode), products.missingSatUnitCode > 0],
            ['Sin regla IVA', nf.format(products.missingTaxRule), products.missingTaxRule > 0],
          ]}
          onGoTo={() => onGoTo('productos')}
        />

        <ReadinessCard
          title="Clientes"
          icon={UsersIcon}
          ok={customersPending === 0}
          statusLabel={`${nf.format(customers.ready)} de ${nf.format(customers.withRfc)} con RFC listos`}
          lines={[
            ['RFC inválidos', nf.format(customers.invalidRfc), customers.invalidRfc > 0],
            ['RFC repetidos', nf.format(customers.duplicateRfc), customers.duplicateRfc > 0],
            ['Sin régimen', nf.format(customers.missingRegime), customers.missingRegime > 0],
            ['Sin CP fiscal', nf.format(customers.missingZip), customers.missingZip > 0],
            ['Sin razón social', nf.format(customers.missingLegalName), customers.missingLegalName > 0],
            ['Sin correo fiscal', nf.format(customers.missingEmail)],
            ['Uso incompatible', nf.format(customers.incompatibleUse), customers.incompatibleUse > 0],
          ]}
          onGoTo={() => onGoTo('clientes')}
        />

        <ReadinessCard
          title="Formas de pago"
          icon={CreditCardIcon}
          ok={paymentsPending === 0}
          statusLabel={paymentsPending === 0 ? 'Completas' : `${nf.format(paymentsPending)} faltantes`}
          lines={[
            ['Activas', nf.format(paymentMethods.active)],
            ['Sin forma SAT (c_FormaPago)', nf.format(paymentMethods.missingSatForm), paymentMethods.missingSatForm > 0],
            ['Sin método (PUE/PPD)', nf.format(paymentMethods.missingSatMethod), paymentMethods.missingSatMethod > 0],
          ]}
          onGoTo={() => onGoTo('formas-pago')}
        />

        <ReadinessCard
          title="Sucursales"
          icon={BuildingStorefrontIcon}
          ok={branchesPending === 0}
          statusLabel={branchesPending === 0 ? 'Completas' : `${nf.format(branchesPending)} faltantes`}
          lines={[
            ['Activas en México', nf.format(branches.activeMx)],
            ['Sin CP', nf.format(branches.missingZip), branches.missingZip > 0],
            ['Sin regla IVA', nf.format(branches.missingTaxRule), branches.missingTaxRule > 0],
            [
              'Frontera con 16%',
              branches.borderWith16.length > 0 ? branches.borderWith16.join(', ') : 'Ninguna',
              false,
              branches.borderWith16.length > 0,
            ],
          ]}
          onGoTo={() => onGoTo('sucursales')}
        />

        <ReadinessCard
          title="Facturama (PAC)"
          icon={CloudIcon}
          ok={facturama.configured && facturama.reachable}
          statusLabel={
            !facturama.configured
              ? 'Sin credenciales'
              : !facturama.reachable
                ? 'No responde'
                : 'Conectado'
          }
          lines={[
            ['Credenciales', facturama.configured ? 'Cargadas' : 'Faltan en el entorno'],
            [
              'Entorno',
              facturama.environment === 'production'
                ? 'Producción'
                : facturama.environment === 'sandbox'
                  ? 'Pruebas (sandbox)'
                  : '—',
              false,
              facturama.environment === 'sandbox',
            ],
            ['Conexión', facturama.reachable ? 'Responde' : 'Sin respuesta', !facturama.reachable],
          ]}
          footnote="Solo lectura: en esta fase nada timbra. El estado real del PAC está en Facturas."
        />
      </div>
    </div>
  );
}

/** [etiqueta, valor, esProblema?, esAviso?] */
type CardLine = [string, string, boolean?, boolean?];

function ReadinessCard({
  title,
  icon: Icon,
  ok,
  statusLabel,
  lines,
  onGoTo,
  footnote,
}: {
  title: string;
  icon: React.ComponentType<React.SVGProps<SVGSVGElement>>;
  ok: boolean;
  statusLabel: string;
  lines: CardLine[];
  onGoTo?: () => void;
  footnote?: string;
}) {
  return (
    <Card className="flex flex-col">
      <CardContent className="flex flex-1 flex-col gap-3 p-4">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Icon className="h-5 w-5 text-[#3E667D]" aria-hidden />
            <h3 className="font-semibold text-gray-900">{title}</h3>
          </div>
          <Badge variant={ok ? 'success' : 'destructive'}>{statusLabel}</Badge>
        </div>
        <dl className="flex-1 space-y-1 text-sm">
          {lines.map(([label, value, bad, warn]) => (
            <div key={label} className="flex items-baseline justify-between gap-3">
              <dt className="text-muted-foreground">{label}</dt>
              <dd
                className={`text-right font-medium ${
                  bad ? 'text-red-700' : warn ? 'text-amber-700' : 'text-gray-900'
                }`}
              >
                {value}
              </dd>
            </div>
          ))}
        </dl>
        {footnote && <p className="text-xs text-muted-foreground">{footnote}</p>}
        {onGoTo && (
          <Button variant="outline" size="sm" onClick={onGoTo} className="mt-auto w-full">
            Ir a {title}
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
