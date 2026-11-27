import { describe, expect, it } from 'vitest';
import {
  addBatch,
  chunkIds,
  emptyProgress,
  progressPercent,
  resultSummary,
  seatsLabel,
  seatsLeft,
  sendSummary,
  sendableChannels,
  ticketIsOff,
  ticketState,
  ticketStateLabel,
} from './invitations';
import type { InvitationPreview, InvitationSendResult } from '@/types/event-invitations';

const preview = (over: Partial<InvitationPreview> = {}): InvitationPreview => ({
  canSend: true,
  reason: null,
  guests: 514,
  email: { available: true, reason: null, toSend: 358, skipped: [] },
  whatsapp: { available: true, reason: null, toSend: 362, skipped: [] },
  whatsappTemplate: { name: 'evento_invitacion', status: 'APPROVED', category: 'UTILITY' },
  guestIds: ['a', 'b'],
  ...over,
});

const batch = (over: Partial<InvitationSendResult> = {}): InvitationSendResult => ({
  results: [
    { guestId: 'a', email: null, whatsapp: null },
    { guestId: 'b', email: null, whatsapp: null },
  ],
  emailSent: 2,
  emailFailed: 0,
  whatsappSent: 1,
  whatsappFailed: 1,
  ...over,
});

describe('tandas', () => {
  it('parte la lista sin perder ni repetir a nadie', () => {
    const ids = Array.from({ length: 45 }, (_, i) => `g${i}`);
    const chunks = chunkIds(ids, 20);
    expect(chunks.map((c) => c.length)).toEqual([20, 20, 5]);
    expect(chunks.flat()).toEqual(ids);
  });

  it('una lista vacía no genera tandas y un tamaño inválido no cuelga', () => {
    expect(chunkIds([], 20)).toEqual([]);
    expect(chunkIds(['a', 'b'], 0)).toEqual([['a'], ['b']]);
  });
});

describe('avance del envío', () => {
  it('acumula cada tanda', () => {
    let p = emptyProgress(4);
    p = addBatch(p, batch());
    expect(p).toMatchObject({ done: 2, emailSent: 2, whatsappSent: 1, whatsappFailed: 1 });
    expect(progressPercent(p)).toBe(50);
    p = addBatch(p, batch({ emailSent: 1, emailFailed: 1, whatsappSent: 2, whatsappFailed: 0 }));
    expect(p).toMatchObject({ done: 4, emailSent: 3, emailFailed: 1, whatsappSent: 3, whatsappFailed: 1 });
    expect(progressPercent(p)).toBe(100);
  });

  it('nunca pasa del total ni divide entre cero', () => {
    expect(addBatch(emptyProgress(1), batch()).done).toBe(1);
    expect(progressPercent(emptyProgress(0))).toBe(0);
  });

  it('resume el resultado en una frase', () => {
    expect(resultSummary({ ...emptyProgress(3), emailSent: 2, whatsappSent: 3 })).toBe('Salieron 2 correos y 3 WhatsApp');
    expect(resultSummary({ ...emptyProgress(3), emailSent: 1, emailFailed: 2 })).toBe('Salieron 1 correo; 2 fallaron');
    expect(resultSummary(emptyProgress(3))).toBe('No salió ninguna invitación');
  });
});

describe('qué se puede mandar', () => {
  it('solo cuentan los canales disponibles y con alguien a quien mandarle', () => {
    expect(sendableChannels(preview(), ['email', 'whatsapp'])).toEqual(['email', 'whatsapp']);
    const noWa = preview({ whatsapp: { available: false, reason: 'Falta la plantilla', toSend: 362, skipped: [] } });
    expect(sendableChannels(noWa, ['email', 'whatsapp'])).toEqual(['email']);
    const nobody = preview({ email: { available: true, reason: null, toSend: 0, skipped: [] } });
    expect(sendableChannels(nobody, ['email'])).toEqual([]);
  });

  it('con el evento en borrador no se puede mandar por ningún canal', () => {
    expect(sendableChannels(preview({ canSend: false, reason: 'En borrador' }), ['email', 'whatsapp'])).toEqual([]);
    expect(sendableChannels(null, ['email'])).toEqual([]);
  });

  it('dice cuánto se va a mandar', () => {
    expect(sendSummary(preview(), ['email', 'whatsapp'])).toBe('Se mandarán 358 correos y 362 WhatsApp');
    expect(sendSummary(preview(), ['email'])).toBe('Se mandarán 358 correos');
    expect(
      sendSummary(preview({ email: { available: true, reason: null, toSend: 1, skipped: [] } }), ['email']),
    ).toBe('Se mandará 1 correo');
    expect(sendSummary(preview({ canSend: false }), ['email'])).toBe('');
  });
});

describe('boleto', () => {
  it('lugares en singular y plural', () => {
    expect(seatsLabel(1)).toBe('1 lugar');
    expect(seatsLabel(2)).toBe('2 lugares');
  });

  it('lugares que faltan por entrar', () => {
    expect(seatsLeft({ seats: 2, checkedInSeats: 1 })).toBe(1);
    expect(seatsLeft({ seats: 1, checkedInSeats: 3 })).toBe(0);
  });

  it('estado del boleto', () => {
    const t = { valid: true, seats: 2, checkedInSeats: 0 };
    expect(ticketState(t, 'active')).toBe('ok');
    expect(ticketState({ ...t, checkedInSeats: 1 }, 'active')).toBe('partial');
    expect(ticketState({ ...t, checkedInSeats: 2 }, 'active')).toBe('used');
    expect(ticketState({ ...t, valid: false }, 'active')).toBe('void');
    expect(ticketState(t, 'cancelled')).toBe('cancelled');
    expect(ticketIsOff('void')).toBe(true);
    expect(ticketIsOff('cancelled')).toBe(true);
    expect(ticketIsOff('partial')).toBe(false);
  });

  it('texto del estado', () => {
    const t = { seats: 2, checkedInSeats: 1 };
    expect(ticketStateLabel('ok', t)).toBe('Vigente');
    expect(ticketStateLabel('partial', t)).toBe('Ingresaron 1 de 2');
    expect(ticketStateLabel('used', t)).toBe('Ya ingresó');
    expect(ticketStateLabel('void', t)).toBe('Ya no vigente');
    expect(ticketStateLabel('cancelled', t)).toBe('Evento cancelado');
  });
});
