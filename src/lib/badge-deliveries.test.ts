import { describe, expect, it } from 'vitest';
import type { BadgeDelivery } from '@/types/hr';
import {
  BADGE_STATE_LABELS,
  badgeDeliveryNotes,
  badgeDeliveryStatus,
  badgeReceiverLabel,
  formatBadgeDateTime,
  sortBadgeDeliveries,
  timesLabel,
} from './badge-deliveries';

let seq = 0;
function delivery(over: Partial<BadgeDelivery>): BadgeDelivery {
  seq += 1;
  return {
    id: `d-${seq}`,
    employeeId: 'emp-1',
    employeeNumber: 'NOI-001',
    stage: 'hr',
    deliveredAt: '2026-11-10T16:44:00.000Z',
    deliveredById: 'user-1',
    deliveredByName: 'Persona de Sistemas',
    receivedByName: null,
    source: 'app',
    isReplacement: false,
    notes: null,
    voidedAt: null,
    voidReason: null,
    ...over,
  };
}

describe('badgeDeliveryStatus', () => {
  it('sin registros: no hay entregas', () => {
    const s = badgeDeliveryStatus([]);
    expect(s.state).toBe('none');
    expect(s.handoff).toBeNull();
    expect(s.delivery).toBeNull();
    expect(BADGE_STATE_LABELS[s.state]).toBe('Sin entregas registradas');
  });

  it('solo entregada a RRHH: sigue en RRHH', () => {
    const s = badgeDeliveryStatus([delivery({ stage: 'hr', receivedByName: 'Persona de RRHH' })]);
    expect(s.state).toBe('in_hr');
    expect(s.handedCount).toBe(1);
    expect(s.deliveredCount).toBe(0);
  });

  it('las dos etapas (caso normal del 10-nov): entregada al colaborador', () => {
    const handoff = delivery({ stage: 'hr', deliveredAt: '2026-11-10T16:44:00.000Z' });
    const given = delivery({ stage: 'employee', deliveredAt: '2026-11-10T18:41:00.000Z' });
    // El API manda lo más reciente primero; el resultado no depende del orden.
    for (const rows of [
      [given, handoff],
      [handoff, given],
    ]) {
      const s = badgeDeliveryStatus(rows);
      expect(s.state).toBe('delivered');
      expect(s.handoff?.id).toBe(handoff.id);
      expect(s.delivery?.id).toBe(given.id);
    }
  });

  it('entregada al colaborador sin pasar por RRHH (registro previo a las dos etapas) cuenta como entregada', () => {
    expect(badgeDeliveryStatus([delivery({ stage: 'employee' })]).state).toBe('delivered');
  });

  it('una reposición que llegó a RRHH después de la última entrega vuelve a quedar pendiente', () => {
    const s = badgeDeliveryStatus([
      delivery({ stage: 'hr', deliveredAt: '2026-11-10T16:00:00.000Z' }),
      delivery({ stage: 'employee', deliveredAt: '2026-11-10T18:00:00.000Z' }),
      delivery({ stage: 'hr', deliveredAt: '2026-12-01T16:00:00.000Z', isReplacement: true }),
    ]);
    expect(s.state).toBe('in_hr');
    expect(s.handedCount).toBe(2);
    expect(s.deliveredCount).toBe(1);
    expect(s.handoff?.isReplacement).toBe(true);
  });

  it('las anuladas no cuentan para el estado, pero se informan', () => {
    const s = badgeDeliveryStatus([
      delivery({ stage: 'hr', deliveredAt: '2026-11-10T16:00:00.000Z' }),
      delivery({
        stage: 'employee',
        deliveredAt: '2026-11-10T18:00:00.000Z',
        voidedAt: '2026-11-10T19:00:00.000Z',
        voidReason: 'Se escaneó la de otra persona',
      }),
    ]);
    expect(s.state).toBe('in_hr');
    expect(s.delivery).toBeNull();
    expect(s.deliveredCount).toBe(0);
    expect(s.voidedCount).toBe(1);
  });

  it('con varias entregas vigentes toma la más reciente de cada etapa', () => {
    const first = delivery({ stage: 'employee', deliveredAt: '2026-11-10T18:00:00.000Z' });
    const second = delivery({
      stage: 'employee',
      deliveredAt: '2026-12-02T18:00:00.000Z',
      isReplacement: true,
    });
    const s = badgeDeliveryStatus([first, second]);
    expect(s.delivery?.id).toBe(second.id);
    expect(s.deliveredCount).toBe(2);
  });
});

describe('sortBadgeDeliveries', () => {
  it('lo más reciente arriba, sin tocar el arreglo original', () => {
    const a = delivery({ deliveredAt: '2026-11-09T21:00:00.000Z' });
    const b = delivery({ deliveredAt: '2026-11-10T18:00:00.000Z' });
    const rows = [a, b];
    expect(sortBadgeDeliveries(rows).map((r) => r.id)).toEqual([b.id, a.id]);
    expect(rows.map((r) => r.id)).toEqual([a.id, b.id]);
  });
});

describe('badgeReceiverLabel', () => {
  it('muestra el nombre capturado en la app', () => {
    expect(badgeReceiverLabel({ stage: 'hr', receivedByName: '  Persona de RRHH ' })).toBe(
      'Persona de RRHH',
    );
  });

  it('al colaborador no se captura nombre: recibe él mismo', () => {
    expect(badgeReceiverLabel({ stage: 'employee', receivedByName: null })).toBe('El colaborador');
    expect(badgeReceiverLabel({ stage: 'hr', receivedByName: '' })).toBe('—');
  });
});

describe('badgeDeliveryNotes', () => {
  it('sin notas ni anulación no hay nada que decir', () => {
    expect(badgeDeliveryNotes({ notes: '  ', voidedAt: null, voidReason: null })).toBeNull();
  });

  it('junta la nota con la anulación y su motivo', () => {
    const text = badgeDeliveryNotes({
      notes: 'Reposición por extravío',
      voidedAt: '2026-11-10T19:00:00.000Z',
      voidReason: 'Se escaneó la de otra persona',
    });
    expect(text).toContain('Reposición por extravío · Anulada el ');
    expect(text).toContain(': Se escaneó la de otra persona');
  });
});

describe('formatBadgeDateTime', () => {
  it('usa la hora Centro, no la UTC del registro', () => {
    // 03:30 UTC del 11-nov = 21:30 del 10-nov en hora Centro.
    const text = formatBadgeDateTime('2026-11-11T03:30:00.000Z');
    expect(text).toContain('10');
    expect(text).toContain('nov');
    expect(text).toContain('2026');
    expect(text).toContain('09:30');
    expect(text).not.toContain('11 nov');
  });

  it('sin fecha o con basura pinta un guion', () => {
    expect(formatBadgeDateTime(null)).toBe('—');
    expect(formatBadgeDateTime('no-es-fecha')).toBe('—');
  });
});

describe('timesLabel', () => {
  it('singular y plural', () => {
    expect(timesLabel(1)).toBe('1 vez');
    expect(timesLabel(3)).toBe('3 veces');
    expect(timesLabel(0)).toBe('0 veces');
    expect(timesLabel(null)).toBe('0 veces');
  });
});
