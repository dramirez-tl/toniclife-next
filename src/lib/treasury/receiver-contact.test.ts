import { describe, expect, it } from 'vitest';
import { hasContact, receiverContactLinks } from './receiver-contact';

// Teléfonos y correos inventados para la prueba (no son de nadie).
describe('enlaces para contactar al distribuidor', () => {
  it('México: 10 dígitos sin lada ⇒ se marca y se escribe con +52', () => {
    expect(receiverContactLinks({ phone: ' 5550000001 ', email: ' juana@example.test ' }, 'MX')).toEqual({
      phone: '5550000001',
      phoneHref: 'tel:+525550000001',
      whatsappHref: 'https://wa.me/525550000001',
      email: 'juana@example.test',
      emailHref: 'mailto:juana@example.test',
    });
  });

  it('Frontera usa la lada de México; EE. UU., Colombia y Guatemala la suya', () => {
    expect(receiverContactLinks({ phone: '6560000001', email: null }, 'FN').whatsappHref).toBe('https://wa.me/526560000001');
    expect(receiverContactLinks({ phone: '(956) 000-0001', email: null }, 'us').whatsappHref).toBe('https://wa.me/19560000001');
    expect(receiverContactLinks({ phone: '3000000001', email: null }, 'CO').whatsappHref).toBe('https://wa.me/573000000001');
    expect(receiverContactLinks({ phone: '50000001', email: null }, 'GT').whatsappHref).toBe('https://wa.me/50250000001');
  });

  it('si ya trae la lada no la duplica', () => {
    const links = receiverContactLinks({ phone: '+52 555 000 0001', email: null }, 'MX');
    expect(links.phoneHref).toBe('tel:+525550000001');
    expect(links.whatsappHref).toBe('https://wa.me/525550000001');
  });

  it('con un largo que no cuadra no adivina: se puede marcar, pero no ofrece WhatsApp', () => {
    const links = receiverContactLinks({ phone: '55500000', email: null }, 'MX');
    expect(links.phoneHref).toBe('tel:55500000');
    expect(links.whatsappHref).toBeNull();
  });

  it('país desconocido: sin lada inventada', () => {
    const links = receiverContactLinks({ phone: '5550000001', email: null }, null);
    expect(links.phoneHref).toBe('tel:5550000001');
    expect(links.whatsappHref).toBeNull();
  });

  it('sin teléfono ni correo no hay enlaces', () => {
    const links = receiverContactLinks({ phone: '  ', email: '' }, 'MX');
    expect(links).toEqual({ phone: null, phoneHref: null, whatsappHref: null, email: null, emailHref: null });
    expect(hasContact(links)).toBe(false);
    expect(hasContact(receiverContactLinks(undefined, 'MX'))).toBe(false);
  });

  it('un teléfono demasiado corto se enseña, pero no se marca', () => {
    const links = receiverContactLinks({ phone: '12345', email: null }, 'MX');
    expect(links.phone).toBe('12345');
    expect(links.phoneHref).toBeNull();
    expect(hasContact(links)).toBe(true);
  });

  it('un correo mal escrito se enseña, pero sin enlace', () => {
    const links = receiverContactLinks({ phone: null, email: 'sin arroba' }, 'MX');
    expect(links.email).toBe('sin arroba');
    expect(links.emailHref).toBeNull();
  });
});
