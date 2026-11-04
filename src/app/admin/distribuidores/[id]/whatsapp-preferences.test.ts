// Pruebas de la lógica pura del bloque "WhatsApp" de la ficha del distribuidor.
// `npx vitest run "src/app/admin/distribuidores/[id]"`

import { describe, expect, it } from 'vitest';
import {
  WHATSAPP_PREFERENCE_OPTIONS,
  WHATSAPP_SOURCE_LABELS,
  currentPreference,
  derivePreference,
  formatCdmx,
  isCappedNow,
  isWhatsAppPreference,
  preferenceLabel,
  sourceLabel,
  whatsappConsentView,
} from './whatsapp-preferences';

// 3-nov-2026 23:30 UTC = 17:30 hora Centro.
const NOW = Date.parse('2026-11-03T23:30:00Z');

describe('derivePreference (lectura derivada del contrato del API)', () => {
  it('sin ningún dato → unknown (nunca respondió)', () => {
    expect(derivePreference({})).toBe('unknown');
    expect(derivePreference({ whatsappMarketingOptIn: null, whatsappOptOut: false })).toBe('unknown');
  });

  it('opt_in true → all', () => {
    expect(derivePreference({ whatsappMarketingOptIn: true })).toBe('all');
  });

  it('marketing_opt_out_at → account aunque opt_in venga null', () => {
    expect(
      derivePreference({ whatsappMarketingOptIn: null, whatsappMarketingOptOutAt: '2026-11-02T10:00:00Z' }),
    ).toBe('account');
  });

  it('opt_in false sin fecha → account (tolerante)', () => {
    expect(derivePreference({ whatsappMarketingOptIn: false })).toBe('account');
  });

  it('la baja total manda sobre cualquier opt-in', () => {
    expect(
      derivePreference({
        whatsappOptOut: true,
        whatsappMarketingOptIn: true,
        whatsappMarketingOptInAt: '2026-11-01T16:00:00Z',
      }),
    ).toBe('none');
  });
});

describe('currentPreference (whatsappMarketing del API manda sobre la derivación)', () => {
  it('usa whatsappMarketing cuando viene con un valor válido', () => {
    expect(currentPreference({ whatsappMarketing: 'account', whatsappMarketingOptIn: true })).toBe('account');
    expect(currentPreference({ whatsappMarketing: 'unknown', whatsappOptOut: true })).toBe('unknown');
  });

  it('sin whatsappMarketing (API viejo) o con un valor raro, deriva de las columnas', () => {
    expect(currentPreference({ whatsappMarketingOptIn: true })).toBe('all');
    expect(currentPreference({ whatsappMarketing: null, whatsappOptOut: true })).toBe('none');
    expect(currentPreference({ whatsappMarketing: 'raro' as never, whatsappMarketingOptIn: false })).toBe('account');
    expect(isWhatsAppPreference('all')).toBe(true);
    expect(isWhatsAppPreference('todos')).toBe(false);
  });

  it('la vista toma la preferencia del API y el código de Meta del "sin WhatsApp"', () => {
    const v = whatsappConsentView(
      {
        whatsappMarketing: 'account',
        whatsappMarketingOptIn: true,
        whatsappMarketingOptOutAt: '2026-11-02T10:00:00Z',
        whatsappMarketingOptInSource: 'panel',
        whatsappUnreachableAt: '2026-11-03T10:00:00Z',
        whatsappUnreachableCode: '131026',
      },
      NOW,
    );
    expect(v.preference).toBe('account');
    expect(v.statusLabel).toBe('Sin WhatsApp (131026)');
    expect(v.at).toBe('2026-11-02T10:00:00Z');
    expect(v.dataMissing).toBe(false);
    expect(whatsappConsentView({ whatsappMarketing: 'unknown' }, NOW).dataMissing).toBe(false);
  });
});

describe('whatsappConsentView', () => {
  it('todos: estado, fuente y fecha del opt-in', () => {
    const v = whatsappConsentView(
      {
        whatsappMarketingOptIn: true,
        whatsappMarketingOptInAt: '2026-11-01T16:00:00Z',
        whatsappMarketingOptInSource: 'boton',
        whatsappMarketingOptOutAt: null,
        whatsappUnreachableAt: null,
        whatsappMarketingCappedUntil: null,
      },
      NOW,
    );
    expect(v.preference).toBe('all');
    expect(v.statusLabel).toBe('Todos');
    expect(v.statusTone).toBe('success');
    expect(v.sourceLabel).toBe('Botón en WhatsApp');
    expect(v.at).toBe('2026-11-01T16:00:00Z');
    expect(v.dataMissing).toBe(false);
  });

  it('solo cuenta: fecha = marketing_opt_out_at y la fuente del rechazo', () => {
    const v = whatsappConsentView(
      {
        whatsappMarketingOptIn: false,
        whatsappMarketingOptInAt: null,
        whatsappMarketingOptInSource: 'panel',
        whatsappMarketingOptOutAt: '2026-11-02T10:00:00Z',
      },
      NOW,
    );
    expect(v.preference).toBe('account');
    expect(v.statusLabel).toBe('Solo cuenta');
    expect(v.statusTone).toBe('info');
    expect(v.sourceLabel).toBe('Panel del distribuidor');
    expect(v.at).toBe('2026-11-02T10:00:00Z');
  });

  it('131026 se muestra como estado, pero la preferencia sigue siendo la derivada', () => {
    const v = whatsappConsentView(
      {
        whatsappMarketingOptIn: true,
        whatsappMarketingOptInAt: '2026-11-01T16:00:00Z',
        whatsappMarketingOptInSource: 'keyword',
        whatsappUnreachableAt: '2026-11-02T10:00:00Z',
      },
      NOW,
    );
    expect(v.preference).toBe('all');
    expect(v.statusLabel).toBe('Sin WhatsApp (131026)');
    expect(v.statusTone).toBe('warning');
    expect(v.unreachableAt).toBe('2026-11-02T10:00:00Z');
    expect(v.sourceLabel).toBe('Palabra clave por WhatsApp (ALTA/BAJA)');
  });

  it('la baja total gana al 131026 y no lleva fuente', () => {
    const v = whatsappConsentView(
      {
        whatsappOptOut: true,
        whatsappOptOutAt: '2026-11-01T17:32:00Z',
        whatsappMarketingOptIn: null,
        whatsappMarketingOptInSource: 'boton',
        whatsappUnreachableAt: '2026-10-28T01:30:00Z',
      },
      NOW,
    );
    expect(v.preference).toBe('none');
    expect(v.statusLabel).toBe('Baja total');
    expect(v.statusTone).toBe('destructive');
    expect(v.sourceLabel).toBeNull();
    expect(v.at).toBe('2026-11-01T17:32:00Z');
  });

  it('sin respuesta: sin fuente ni fecha', () => {
    const v = whatsappConsentView({ whatsappMarketingOptIn: null, whatsappOptOut: false }, NOW);
    expect(v.preference).toBe('unknown');
    expect(v.statusLabel).toBe('Sin respuesta');
    expect(v.statusTone).toBe('outline');
    expect(v.sourceLabel).toBeNull();
    expect(v.at).toBeNull();
  });

  it('tope de Meta (131049): solo si sigue vigente', () => {
    const vigente = whatsappConsentView(
      { whatsappMarketingOptIn: true, whatsappMarketingCappedUntil: '2026-11-04T10:00:00Z' },
      NOW,
    );
    expect(vigente.cappedUntil).toBe('2026-11-04T10:00:00Z');
    const vencido = whatsappConsentView(
      { whatsappMarketingOptIn: true, whatsappMarketingCappedUntil: '2026-11-01T10:00:00Z' },
      NOW,
    );
    expect(vencido.cappedUntil).toBeNull();
    expect(isCappedNow(undefined, NOW)).toBe(false);
    expect(isCappedNow('basura', NOW)).toBe(false);
  });

  it('API sin los campos nuevos → dataMissing (despliegue pendiente), pero la baja total sí se lee', () => {
    const v = whatsappConsentView({ whatsappOptOut: true }, NOW);
    expect(v.dataMissing).toBe(true);
    expect(v.preference).toBe('none');
    expect(whatsappConsentView({ whatsappMarketingOptIn: null }, NOW).dataMissing).toBe(false);
  });
});

describe('opciones, fuentes y formato', () => {
  it('el Select ofrece los 4 valores del contrato en orden', () => {
    expect(WHATSAPP_PREFERENCE_OPTIONS.map((o) => o.value)).toEqual(['all', 'account', 'none', 'unknown']);
    expect(preferenceLabel('none')).toBe('No enviar nada (baja total)');
  });

  it('las 6 fuentes de la mig 175 tienen etiqueta; una desconocida se muestra tal cual', () => {
    for (const src of ['boton', 'keyword', 'pos', 'panel', 'formulario', 'admin']) {
      expect(WHATSAPP_SOURCE_LABELS[src]).toBeTruthy();
    }
    expect(sourceLabel('zapier')).toBe('zapier');
    expect(sourceLabel(null)).toBeNull();
    expect(sourceLabel('')).toBeNull();
  });

  it('formatCdmx muestra la hora Centro (23:30 UTC = 17:30) con año', () => {
    const s = formatCdmx('2026-11-03T23:30:00Z');
    expect(s).toContain('17:30');
    expect(s).toContain('2026');
  });

  it('formatCdmx devuelve null con fechas inválidas o vacías', () => {
    expect(formatCdmx('no-es-fecha')).toBeNull();
    expect(formatCdmx(null)).toBeNull();
    expect(formatCdmx(undefined)).toBeNull();
  });
});
