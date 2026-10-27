// whatsappChannel.ts - Contrato de GET /whatsapp/account-status (salud del
// canal) y POST /whatsapp/marketing-pause. Espejo del AccountStatusDto del
// API (integrations/whatsapp/whatsapp-account.service.ts).

export type SemaforoColor = 'verde' | 'amarillo' | 'rojo' | 'gris';
export type EventSeverity = 'info' | 'warning' | 'critical';
export type ChecklistStatus = 'ok' | 'pendiente' | 'falla' | 'desconocido';

export interface MarketingPauseState {
  paused: boolean;
  reason: string | null;
  at: string | null;
  by: string | null;
}

export interface ChannelEvent {
  id: string;
  field: string;
  event: string | null;
  severity: EventSeverity;
  summary: string;
  templateName: string | null;
  pausedMarketing: boolean;
  createdAt: string;
}

export interface ChannelTemplate {
  name: string;
  status: string;
  category: string;
  language: string;
  quality: string;
}

export interface ObaChecklistItem {
  key: string;
  label: string;
  status: ChecklistStatus;
  detail: string;
}

export interface ChannelStatus {
  configured: boolean;
  readAt: string;
  errors: string[];
  semaforo: { color: SemaforoColor; reasons: string[] };
  marketingPause: MarketingPauseState;
  phone: {
    displayPhoneNumber: string | null;
    verifiedName: string | null;
    qualityRating: string | null;
    qualityLabel: string;
    messagingLimitTier: string | null;
    messagingLimitLabel: string | null;
    nameStatus: string | null;
    codeVerificationStatus: string | null;
    isOfficialBusinessAccount: boolean | null;
    accountMode: string | null;
  };
  account: {
    name: string | null;
    reviewStatus: string | null;
    ownershipType: string | null;
    canSendMessage: string | null;
    healthErrors: string[];
    healthEntities: {
      type: string;
      id: string | null;
      canSendMessage: string | null;
      errors: string[];
    }[];
  };
  business: {
    id: string | null;
    name: string | null;
    verificationStatus: string | null;
    note: string | null;
  };
  templates: {
    total: number;
    approved: number;
    pending: number;
    rejected: number;
    blocked: number;
    byQuality: Record<string, number>;
    items: ChannelTemplate[];
  };
  oba: ObaChecklistItem[];
  firstMessageAt: string | null;
  recentEvents: ChannelEvent[];
}
