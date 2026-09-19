'use client';

// Tarjetas de estado de facturación: conectividad real del PAC (ambiente,
// emisor enmascarado, saldo de timbres) y el aviso cuando los flujos de v2
// están cerrados (`GET /billing/status`.v2FlowsEnabled = false).

import { ExclamationTriangleIcon } from '@heroicons/react/24/outline';
import { Card, CardContent } from '@/components/ui/card';
import type { BillingStatus } from '@/types/billing';

/** `GET /billing/status`.schemaReady = false: la BD todavía no tiene la migración 141. */
export function SchemaPendingBanner({ status }: { status: BillingStatus | undefined }) {
  if (!status || status.schemaReady !== false) return null;
  return (
    <Card className="mb-6 border-red-200 bg-red-50" role="alert">
      <CardContent className="flex items-start gap-3 p-4">
        <ExclamationTriangleIcon className="h-6 w-6 flex-shrink-0 text-red-600" aria-hidden />
        <div className="text-sm text-red-900">
          <p className="font-semibold">Falta aplicar la migración 141</p>
          <p className="mt-1 text-xs">
            La base de datos todavía no tiene las tablas y columnas de la facturación de v2. Hasta que
            Sistemas aplique la migración 141, las facturas, la factura global, el complemento de pago y
            las ventas por facturar responden &quot;no disponible&quot;. No es un error de tu captura.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

export function V2FlowsBanner({ status }: { status: BillingStatus | undefined }) {
  return (
    <>
      <SchemaPendingBanner status={status} />
      <FlowsClosedBanner status={status} />
    </>
  );
}

function FlowsClosedBanner({ status }: { status: BillingStatus | undefined }) {
  if (!status || status.v2FlowsEnabled !== false) return null;
  return (
    <Card className="mb-6 border-amber-200 bg-amber-50" role="status">
      <CardContent className="flex items-start gap-3 p-4">
        <ExclamationTriangleIcon className="h-6 w-6 flex-shrink-0 text-amber-600" aria-hidden />
        <div className="text-sm text-amber-900">
          <p className="font-semibold">Los flujos de v2 están cerrados; el sistema anterior sigue facturando.</p>
          <p className="mt-1 text-xs">
            Pedido web, factura global, complemento de pago y facturación desde este panel responden
            &quot;cerrado&quot; hasta que Sistemas encienda <code>billing.v2_flows_enabled</code>. El POS
            conserva su interruptor por terminal.
            {typeof status.branchesStarted === 'number' && (
              <> Sucursales con fecha de arranque en v2: {status.branchesStarted}.</>
            )}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

export function PacStatusCard({ status }: { status: BillingStatus | undefined }) {
  if (!status) return null;
  const issuerRfc = status.issuerRfc ?? status.issuerRfcMasked ?? null;
  const balance =
    status.stampBalance ??
    status.balance ??
    (typeof status.Balance === 'number' && status.Balance >= 0 ? status.Balance : null);
  const reachable = status.facturamaReachable ?? balance !== null;
  const environmentLabel =
    status.environment === 'production'
      ? 'Producción'
      : status.environment === 'sandbox'
        ? 'Pruebas (sandbox)'
        : 'Ambiente no informado';

  return (
    <Card className="mb-6">
      <CardContent className="p-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <div
              className={`mt-1.5 h-3 w-3 shrink-0 rounded-full ${
                !status.configured ? 'bg-red-500' : reachable ? 'bg-green-500' : 'bg-amber-500'
              }`}
              aria-hidden
            />
            <div>
              <p className="text-sm font-medium">
                Facturama: {!status.configured ? 'No configurado' : reachable ? 'Conectado' : 'Sin respuesta'}
              </p>
              <p className="text-xs text-gray-500">
                {environmentLabel}
                {issuerRfc ? ` · Emisor ${issuerRfc}` : ''}
                {status.storageProvider ? ` · Archivos: ${status.storageProvider}` : ''}
                {status.emailConfigured === false ? ' · Correo sin configurar' : ''}
              </p>
            </div>
          </div>
          <div className="text-sm sm:text-right">
            {balance !== null ? (
              <>
                <span className="text-gray-600">Timbres disponibles: </span>
                <span className={`font-bold ${balance < 100 ? 'text-red-600' : 'text-[#3E667D]'}`}>
                  {balance.toLocaleString('es-MX')}
                </span>
              </>
            ) : (
              <span className="text-amber-700">{status.error || 'Saldo de timbres no disponible'}</span>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
