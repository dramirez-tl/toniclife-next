'use client';

// DistributorDetailTabs — pestañas de la ficha del distribuidor (contrato §5.7):
// "Perfil" (contenido existente), "Datos de pago" (PaymentReadinessReview
// compartido con la bandeja de Validación de datos; sustituye la copia
// PaymentReadinessSection que vivía aquí) y "Red" (lleva a
// /admin/distribuidores/[id]/red, la red tal como la ve el distribuidor en su
// panel; página aparte porque sus filtros viven en la URL con su propio `tab`).
// La pestaña vive en la URL (`?tab=datos-pago`) para enlazar desde la bandeja
// y el índice de Tesorería.

import { Suspense, type ReactNode } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ShieldCheckIcon, UserIcon, UsersIcon } from '@heroicons/react/24/outline';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useQueryFilters } from '@/hooks/useQueryFilters';
import { PaymentReadinessReview } from '@/components/admin/treasury/readiness';

const TABS = ['perfil', 'datos-pago'] as const;
/** Pestaña que navega a la página de la red (no es contenido de esta ficha). */
const NETWORK_TAB = 'red';
type DetailTab = (typeof TABS)[number];

interface DistributorDetailTabsProps {
  customerId: string;
  /** Solo los distribuidores tienen datos para pago de comisiones. */
  isDistributor: boolean;
  profile: ReactNode;
}

export function DistributorDetailTabs(props: DistributorDetailTabsProps) {
  if (!props.isDistributor) return <>{props.profile}</>;
  return (
    <Suspense fallback={<>{props.profile}</>}>
      <DistributorDetailTabsInner {...props} />
    </Suspense>
  );
}

function DistributorDetailTabsInner({ customerId, profile }: DistributorDetailTabsProps) {
  const router = useRouter();
  const { get, setParams } = useQueryFilters({ tab: 'perfil' });
  const raw = get('tab');
  const active: DetailTab = (TABS as readonly string[]).includes(raw) ? (raw as DetailTab) : 'perfil';
  const onTabChange = (v: string) => {
    if (v === NETWORK_TAB) {
      router.push(`/admin/distribuidores/${encodeURIComponent(customerId)}/red`);
      return;
    }
    setParams({ tab: v });
  };

  return (
    <Tabs value={active} onValueChange={onTabChange}>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <TabsList aria-label="Secciones de la ficha">
          <TabsTrigger value="perfil">
            <UserIcon className="mr-1.5 h-4 w-4" aria-hidden />
            Perfil
          </TabsTrigger>
          <TabsTrigger value="datos-pago">
            <ShieldCheckIcon className="mr-1.5 h-4 w-4" aria-hidden />
            Datos de pago
          </TabsTrigger>
          <TabsTrigger value={NETWORK_TAB} title="La red tal como la ve el distribuidor en su panel">
            <UsersIcon className="mr-1.5 h-4 w-4" aria-hidden />
            Red
          </TabsTrigger>
        </TabsList>
        {active === 'datos-pago' && (
          <Button variant="outline" size="sm" asChild>
            <Link href={`/admin/tesoreria/validacion-datos?review=${encodeURIComponent(customerId)}`}>
              Abrir en la bandeja de validación
            </Link>
          </Button>
        )}
      </div>
      <TabsContent value="perfil">{profile}</TabsContent>
      <TabsContent value="datos-pago">
        {active === 'datos-pago' && (
          <PaymentReadinessReview key={customerId} customerId={customerId} hideProfileLink />
        )}
      </TabsContent>
    </Tabs>
  );
}
