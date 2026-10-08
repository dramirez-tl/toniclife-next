'use client';

// /distribuidor/red — "Mi red" para redes grandes (contrato /distribuidor/red
// §5, V13). El cuerpo (periodo, resumen, búsqueda, Explorar · Lista · Volumen,
// descarga y ficha del socio) vive en components/network/NetworkWorkspace,
// compartido con la ficha del admin (/admin/distribuidores/[id]/red). Aquí
// quedan lo propio del distribuidor: el gate del piloto (registerMember,
// fail-closed), el deep-link ?alta=socio|preferente, el enlace de invitación y
// los paneles MemberEnrollmentPanel/PreferredEnrollmentPanel (V16).

import { Suspense, useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';
import { useQueryFilters } from '@/hooks/useQueryFilters';
import { useMyPilotFeatures } from '@/hooks/usePilot';
import { useDistributorDashboard } from '@/hooks/useDistributor';
import { NetworkWorkspace } from '@/components/network/NetworkWorkspace';
import { MemberEnrollmentPanel } from './MemberEnrollmentPanel';
import { PreferredEnrollmentPanel } from './PreferredEnrollmentPanel';
import { InvitePanel } from './components/InvitePanel';
import { PreferredCustomersSection } from './components/PreferredCustomersSection';

/** Estable a propósito: useQueryFilters recrea get/setParams si `defaults` cambia de identidad. */
const QUERY_DEFAULTS: Record<string, string> = {};

/** Código de referido del perfil: referralCode, o el `ref` de personalLink, o el número. */
function referralCodeOf(profile: { referralCode?: string; personalLink?: string; code?: string } | null | undefined): string | null {
  if (profile?.referralCode) return profile.referralCode;
  if (profile?.personalLink) {
    try {
      const ref = new URL(profile.personalLink).searchParams.get('ref');
      if (ref) return ref;
    } catch {
      // enlace mal formado: se cae al código
    }
  }
  return profile?.code ?? null;
}

export default function RedPage() {
  return (
    <Suspense>
      <RedContent />
    </Suspense>
  );
}

function RedContent() {
  const tGate = useTranslations('distributor.pilotGate');
  const { searchParams, setParams } = useQueryFilters(QUERY_DEFAULTS);

  // ---------------------------------------------------------------------------
  // Piloto: el alta de socios/preferentes se libera POR DISTRIBUIDOR desde el
  // admin (fail-closed). Sin liberar, los botones avisan y no abren el panel.
  // ---------------------------------------------------------------------------
  const { data: pilotFeatures, isPlaceholderData: pilotLoading } = useMyPilotFeatures();
  const registerMemberEnabled = pilotFeatures?.registerMember ?? false;
  const gateMessage = tGate('registerMember');
  const [isEnrollOpen, setIsEnrollOpen] = useState(false);
  const [isPreferredOpen, setIsPreferredOpen] = useState(false);
  const [isInviteOpen, setIsInviteOpen] = useState(false);

  // Deep-link /distribuidor/red?alta=socio|preferente (desde el home): se lee
  // UNA vez al montar, se limpia de la URL y queda pendiente hasta conocer las
  // features del piloto (gate). La resolución corre en un callback (setTimeout)
  // para no encadenar renders dentro del efecto.
  const [pendingAlta, setPendingAlta] = useState<'socio' | 'preferente' | null>(() => {
    const alta = searchParams.get('alta');
    return alta === 'socio' || alta === 'preferente' ? alta : null;
  });
  useEffect(() => {
    if (pendingAlta) setParams({ alta: null });
  }, [pendingAlta, setParams]);
  useEffect(() => {
    if (!pendingAlta || pilotLoading) return;
    const id = window.setTimeout(() => {
      if (!registerMemberEnabled) toast.error(gateMessage);
      else if (pendingAlta === 'socio') setIsEnrollOpen(true);
      else setIsPreferredOpen(true);
      setPendingAlta(null);
    }, 0);
    return () => window.clearTimeout(id);
  }, [pendingAlta, pilotLoading, registerMemberEnabled, gateMessage]);

  const openEnroll = () => {
    if (!registerMemberEnabled) {
      toast.error(gateMessage);
      return;
    }
    setIsEnrollOpen(true);
  };
  const openPreferred = () => {
    if (!registerMemberEnabled) {
      toast.error(gateMessage);
      return;
    }
    setIsPreferredOpen(true);
  };

  // ---------------------------------------------------------------------------
  // Enlace de invitación (mismo cálculo de siempre)
  // ---------------------------------------------------------------------------
  const { profile: distributorProfile } = useDistributorDashboard();
  const referralCode = referralCodeOf(distributorProfile);
  // Solo se usa dentro del panel (portal cerrado en SSR): sin desajuste de hidratación.
  const inviteLink = typeof window !== 'undefined' && referralCode ? `${window.location.origin}/registro/distribuidor?ref=${referralCode}` : '';

  return (
    <>
      <NetworkWorkspace
        registerMemberEnabled={registerMemberEnabled}
        gateMessage={gateMessage}
        onEnroll={openEnroll}
        onPreferred={openPreferred}
        onInvite={() => setIsInviteOpen(true)}
        withExport
        footer={<PreferredCustomersSection onAdd={openPreferred} />}
      />

      <InvitePanel open={isInviteOpen} onClose={() => setIsInviteOpen(false)} link={inviteLink} />

      {/* Panel de alta estructurada (colocación + kit + modo de pago): sin cambios */}
      <MemberEnrollmentPanel isOpen={isEnrollOpen} onClose={() => setIsEnrollOpen(false)} />

      {/* Panel de alta de cliente preferente (sin kit): sin cambios */}
      <PreferredEnrollmentPanel isOpen={isPreferredOpen} onClose={() => setIsPreferredOpen(false)} />
    </>
  );
}
