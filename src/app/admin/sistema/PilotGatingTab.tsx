'use client';

// PilotGatingTab - Liberación GRADUAL del piloto del panel de distribuidor.
//
// Lo informativo del panel es base (no se gatea). Aquí el Super Admin libera
// manualmente, POR DISTRIBUIDOR: compartir carrito (generar link), registro
// público con su código de referido, y alta de socios/preferentes. Además el
// switch GLOBAL de compras del checkout (aplica a cualquier comprador).
//
// Requiere la mig 110 en el API; sin ella todo se comporta bloqueado y
// liberar devuelve el error claro del backend.

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Skeleton } from '@/components/ui/skeleton';
import {
  MagnifyingGlassIcon,
  ShoppingCartIcon,
  UserGroupIcon,
  LockClosedIcon,
  LockOpenIcon,
} from '@heroicons/react/24/outline';
import { toast } from 'sonner';
import {
  usePilotDistributors,
  usePilotCheckout,
  useSetPilotCheckout,
  useSetPilotFeature,
} from '@/hooks/usePilot';
import {
  pilotService,
  type PilotDistributorRow,
  type PilotFeature,
} from '@/services/pilot.service';

const apiError = (err: unknown, fallback: string) => {
  const msg = (err as { response?: { data?: { message?: string | string[] } } })
    ?.response?.data?.message;
  return Array.isArray(msg) ? msg[0] : msg || fallback;
};

const FEATURE_META: Array<{
  key: PilotFeature;
  flag: keyof PilotDistributorRow['features'];
  label: string;
  hint: string;
}> = [
  {
    key: 'share_cart',
    flag: 'shareCart',
    label: 'Compartir carrito',
    hint: 'Puede generar links de carrito compartido',
  },
  {
    key: 'public_registration',
    flag: 'publicRegistration',
    label: 'Registro con su link',
    hint: 'Su código de referido funciona en /registro/distribuidor',
  },
  {
    key: 'register_member',
    flag: 'registerMember',
    label: 'Alta de socios',
    hint: 'Puede dar de alta socios distribuidores y clientes preferentes',
  },
];

export function PilotGatingTab() {
  return (
    <div className="space-y-6">
      <p className="text-sm text-muted-foreground">
        Liberación gradual del panel de distribuidor para la prueba piloto. Lo{' '}
        <strong>informativo</strong> (dashboard, red, comisiones, ventas) está
        disponible para todos; lo <strong>transaccional</strong> se libera aquí,
        distribuidor por distribuidor. Las compras del checkout son un
        interruptor global aparte.
      </p>
      <CheckoutGateCard />
      <DistributorSearchCard />
      <ReleasedDistributorsList />
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Switch GLOBAL: compras en checkout
// ─────────────────────────────────────────────────────────────────────────────

function CheckoutGateCard() {
  const { data, isLoading, refetch } = usePilotCheckout();
  const setCheckout = useSetPilotCheckout();
  const enabled = data?.checkoutEnabled ?? false;

  if (isLoading) return <Skeleton className="h-24 w-full" />;

  return (
    <Card>
      <CardContent className="flex flex-wrap items-center justify-between gap-4 p-6">
        <div className="flex items-center gap-3">
          <span
            className={`flex h-11 w-11 items-center justify-center rounded-full ${
              enabled
                ? 'bg-emerald-100 text-emerald-600'
                : 'bg-amber-100 text-amber-600'
            }`}
          >
            <ShoppingCartIcon className="h-6 w-6" />
          </span>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-semibold text-gray-900">
                Compras en el checkout (tienda)
              </h3>
              <Badge
                variant="outline"
                className={
                  enabled
                    ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                    : 'border-amber-200 bg-amber-50 text-amber-700'
                }
              >
                {enabled ? 'Habilitadas' : 'Bloqueadas'}
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground">
              Global: aplica a cualquier comprador (distribuidor o sin cuenta),
              incluye el checkout del carrito compartido. El pago de kits de
              inscripción NO se bloquea aquí.
            </p>
          </div>
        </div>
        <Button
          variant={enabled ? 'outline' : 'default'}
          onClick={() =>
            setCheckout.mutate(!enabled, {
              onSuccess: (r) => {
                toast.success(
                  r.checkoutEnabled
                    ? 'Compras del checkout HABILITADAS'
                    : 'Compras del checkout bloqueadas',
                );
                void refetch();
              },
              onError: (e) =>
                toast.error(apiError(e, 'No se pudo cambiar el estado')),
            })
          }
          disabled={setCheckout.isPending}
        >
          {enabled ? (
            <>
              <LockClosedIcon className="h-4 w-4" /> Bloquear compras
            </>
          ) : (
            <>
              <LockOpenIcon className="h-4 w-4" /> Habilitar compras
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Buscar distribuidor por número y liberar
// ─────────────────────────────────────────────────────────────────────────────

function DistributorSearchCard() {
  const [number, setNumber] = useState('');
  const [result, setResult] = useState<PilotDistributorRow | null>(null);
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSearch() {
    if (searching) return;
    const num = number.trim();
    if (!num) return;
    setSearching(true);
    setError(null);
    setResult(null);
    try {
      const found = await pilotService.searchDistributor(num);
      if (found.customerType && found.customerType !== 'distributor') {
        setError(
          `#${found.customerNumber} (${found.name}) no es un distribuidor.`,
        );
        return;
      }
      setResult(found);
    } catch (e) {
      setError(apiError(e, 'No se encontró el distribuidor'));
    } finally {
      setSearching(false);
    }
  }

  return (
    <Card>
      <CardContent className="space-y-4 p-6">
        <div>
          <h3 className="font-semibold text-gray-900">
            Liberar a un distribuidor
          </h3>
          <p className="text-sm text-muted-foreground">
            Busca por número EXACTO de distribuidor y prende las funciones que
            quieras liberarle.
          </p>
        </div>
        <div className="flex max-w-md gap-2">
          <div className="relative flex-1">
            <MagnifyingGlassIcon className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <Input
              value={number}
              onChange={(e) => {
                setNumber(e.target.value);
                setError(null);
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !searching) {
                  e.preventDefault();
                  void handleSearch();
                }
              }}
              placeholder="No. de distribuidor (ej. 88197)"
              className="pl-9 font-mono"
            />
          </div>
          <Button onClick={() => void handleSearch()} disabled={searching || !number.trim()}>
            {searching ? 'Buscando…' : 'Buscar'}
          </Button>
        </div>
        {error && <p className="text-sm text-destructive">{error}</p>}
        {result && (
          <DistributorFeatureRow
            row={result}
            onChanged={(features) => setResult({ ...result, features })}
            highlight
          />
        )}
      </CardContent>
    </Card>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Lista de distribuidores ya tocados por el piloto
// ─────────────────────────────────────────────────────────────────────────────

function ReleasedDistributorsList() {
  const { data, isLoading, isError, refetch } = usePilotDistributors();

  return (
    <Card>
      <CardContent className="space-y-4 p-6">
        <div className="flex items-center gap-2">
          <UserGroupIcon className="h-5 w-5 text-[#3E667D]" />
          <h3 className="font-semibold text-gray-900">
            Distribuidores en el piloto
          </h3>
          {data && (
            <Badge variant="outline" className="border-gray-200 bg-gray-50">
              {data.length}
            </Badge>
          )}
        </div>
        {isLoading ? (
          <Skeleton className="h-24 w-full" />
        ) : isError ? (
          <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
            No se pudo cargar la lista.{' '}
            <button className="underline" onClick={() => void refetch()}>
              Reintentar
            </button>
          </div>
        ) : !data || data.length === 0 ? (
          <p className="rounded-lg border-2 border-dashed p-6 text-center text-sm text-muted-foreground">
            Aún no has liberado funciones a ningún distribuidor. Busca uno
            arriba para empezar.
          </p>
        ) : (
          <div className="divide-y rounded-lg border">
            {data.map((row) => (
              <div key={row.customerId} className="px-4">
                <DistributorFeatureRow row={row} />
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Fila de un distribuidor con sus 3 switches
// ─────────────────────────────────────────────────────────────────────────────

function DistributorFeatureRow({
  row,
  onChanged,
  highlight = false,
}: {
  row: PilotDistributorRow;
  onChanged?: (features: PilotDistributorRow['features']) => void;
  highlight?: boolean;
}) {
  const setFeature = useSetPilotFeature();

  const toggle = (feature: PilotFeature, flag: boolean) => {
    setFeature.mutate(
      { customerId: row.customerId, feature, enabled: !flag },
      {
        onSuccess: (r) => {
          toast.success(
            `${row.name}: ${
              FEATURE_META.find((f) => f.key === feature)?.label
            } ${!flag ? 'LIBERADA' : 'bloqueada'}`,
          );
          onChanged?.(r.features);
        },
        onError: (e) => toast.error(apiError(e, 'No se pudo actualizar')),
      },
    );
  };

  return (
    <div
      className={`flex flex-col gap-3 py-4 lg:flex-row lg:items-center lg:justify-between ${
        highlight ? 'rounded-lg border border-[#a7c1e2] bg-[#C8DDF2]/15 px-4' : ''
      }`}
    >
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-medium text-gray-900">{row.name}</span>
          <span className="rounded bg-gray-100 px-2 py-0.5 font-mono text-xs text-gray-700">
            #{row.customerNumber}
          </span>
          {row.status !== 'active' && (
            <Badge
              variant="outline"
              className="border-amber-200 bg-amber-50 text-amber-700"
            >
              {row.status}
            </Badge>
          )}
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
        {FEATURE_META.map((meta) => {
          const flag = row.features[meta.flag];
          return (
            <label
              key={meta.key}
              className="flex cursor-pointer items-center gap-2"
              title={meta.hint}
            >
              <Switch
                checked={flag}
                // Fila completa bloqueada mientras hay un toggle en vuelo:
                // dos mutaciones concurrentes de la misma fila se pisan.
                disabled={setFeature.isPending}
                onCheckedChange={() => toggle(meta.key, flag)}
                aria-label={`${meta.label} para ${row.name}`}
              />
              <span
                className={`text-sm ${flag ? 'font-medium text-gray-900' : 'text-gray-500'}`}
              >
                {meta.label}
              </span>
            </label>
          );
        })}
      </div>
    </div>
  );
}
