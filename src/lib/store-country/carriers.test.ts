import { describe, expect, it } from 'vitest';
import type { Carrier } from '@/types/fulfillment';
import {
  CARRIER_NAME_MAX,
  CARRIER_NOTES_MAX,
  CARRIER_TRACKING_MAX,
  EMPTY_CARRIER_FORM,
  buildCreateCarrierPayload,
  buildUpdateCarrierPayload,
  carrierFormValues,
  carrierKey,
  carriersOfCountry,
  carriersSummary,
  hasCarrierFormErrors,
  isEmptyCarrierPayload,
  normalizeCarriersResponse,
  normalizeTrackingTemplate,
  sortCarriers,
  trackingUrlExample,
  validateCarrierForm,
} from './carriers';

const carrier = (over: Partial<Carrier> = {}): Carrier => ({
  id: 'c-fedex',
  countryCode: 'MX',
  name: 'FedEx',
  trackingUrlTemplate: 'https://www.fedex.com/fedextrack/?trknbr={guia}',
  integration: 'fedex',
  isDefault: true,
  isActive: true,
  sortOrder: 1,
  notes: null,
  updatedAt: '2026-11-10T18:00:00.000Z',
  ...over,
});

const estafeta = carrier({
  id: 'c-estafeta',
  name: 'Estafeta',
  trackingUrlTemplate: 'https://rastreo.estafeta.com/?wayBill={guia}',
  integration: 'none',
  isDefault: false,
  sortOrder: 2,
});

describe('store-country/carriers · respuesta del API', () => {
  it('lee la lista y deja pasar solo lo que es una paquetería', () => {
    const out = normalizeCarriersResponse({
      schemaReady: true,
      carriers: [
        carrier(),
        { id: 'x', name: '  ' },
        null,
        'FedEx',
        { id: 'c-dhl', countryCode: 'us', name: ' DHL ', integration: 'ups', sortOrder: '3', notes: '  ', isActive: false },
        carrier(), // repetida
      ],
    });
    expect(out.schemaReady).toBe(true);
    expect(out.carriers.map((c) => c.id)).toEqual(['c-fedex', 'c-dhl']);
    expect(out.carriers[1]).toEqual({
      id: 'c-dhl',
      countryCode: 'US',
      name: 'DHL',
      trackingUrlTemplate: null,
      integration: 'none',
      isDefault: false,
      isActive: false,
      sortOrder: 3,
      notes: null,
      updatedAt: null,
    });
  });

  it('migración 200 sin aplicar: schemaReady false y lista vacía', () => {
    expect(normalizeCarriersResponse({ schemaReady: false, carriers: [] })).toEqual({ schemaReady: false, carriers: [] });
  });

  it('solo un false expreso dice que falta la migración; tolera la lista suelta y la basura', () => {
    expect(normalizeCarriersResponse({ carriers: [carrier()] }).schemaReady).toBe(true);
    expect(normalizeCarriersResponse([carrier()]).carriers).toHaveLength(1);
    expect(normalizeCarriersResponse(null)).toEqual({ schemaReady: true, carriers: [] });
    expect(normalizeCarriersResponse('x')).toEqual({ schemaReady: true, carriers: [] });
  });
});

describe('store-country/carriers · lista', () => {
  it('ordena: activas primero, la predeterminada arriba, luego el orden del catálogo y el nombre', () => {
    const list = [
      carrier({ id: 'z', name: 'Zeta', isDefault: false, sortOrder: 5 }),
      carrier({ id: 'off', name: 'Antigua', isDefault: false, isActive: false, sortOrder: 0 }),
      estafeta,
      carrier({ id: 'a', name: 'ábaco', isDefault: false, sortOrder: 5 }),
      carrier(),
    ];
    expect(sortCarriers(list).map((c) => c.id)).toEqual(['c-fedex', 'c-estafeta', 'a', 'z', 'off']);
    // No toca la lista original.
    expect(list[0].id).toBe('z');
  });

  it('filtra por país de la tienda y resume', () => {
    const list = [carrier(), estafeta, carrier({ id: 'us', countryCode: 'US', isDefault: true }), carrier({ id: 'off', isActive: false, isDefault: false })];
    expect(carriersOfCountry(list, 'mx').map((c) => c.id)).toEqual(['c-fedex', 'c-estafeta', 'off']);
    expect(carriersSummary(carriersOfCountry(list, 'MX'))).toEqual({ active: 2, inactive: 1, defaultName: 'FedEx' });
    expect(carriersSummary([estafeta])).toEqual({ active: 1, inactive: 0, defaultName: null });
    expect(carriersSummary([])).toEqual({ active: 0, inactive: 0, defaultName: null });
  });

  it('compara nombres como los escribe la gente (igual que el API)', () => {
    expect(carrierKey('Fed Ex')).toBe('fedex');
    expect(carrierKey('FEDEX')).toBe('fedex');
    expect(carrierKey(' Paquetería-Exprés 1 ')).toBe('paqueteriaexpres1');
    expect(carrierKey(null)).toBe('');
  });
});

describe('store-country/carriers · enlace de rastreo', () => {
  it('acepta {GUIA} o { guía } y lo deja como {guia}', () => {
    expect(normalizeTrackingTemplate('  https://x.com/?t={GUIA} ')).toBe('https://x.com/?t={guia}');
    expect(normalizeTrackingTemplate('https://x.com/{ guía }/ver')).toBe('https://x.com/{guia}/ver');
  });

  it('muestra cómo queda el enlace con una guía', () => {
    expect(trackingUrlExample('https://www.fedex.com/fedextrack/?trknbr={guia}')).toBe(
      'https://www.fedex.com/fedextrack/?trknbr=123456789012',
    );
    expect(trackingUrlExample('https://x.com/{guia}?again={guia}', ' AB 12 ')).toBe('https://x.com/AB%2012?again=AB%2012');
    expect(trackingUrlExample('https://x.com/sin-marcador')).toBeNull();
    expect(trackingUrlExample('')).toBeNull();
    expect(trackingUrlExample(null)).toBeNull();
  });
});

describe('store-country/carriers · formulario', () => {
  const valid = { ...EMPTY_CARRIER_FORM, name: 'DHL' };

  it('una paquetería nueva solo necesita nombre', () => {
    expect(validateCarrierForm(valid, [carrier(), estafeta])).toEqual({});
    expect(hasCarrierFormErrors({})).toBe(false);
    expect(validateCarrierForm(EMPTY_CARRIER_FORM, [])).toEqual({ name: 'Escribe el nombre de la paquetería.' });
    expect(validateCarrierForm({ ...valid, name: '   ' }, []).name).toBeDefined();
    expect(validateCarrierForm({ ...valid, name: '---' }, []).name).toBe('El nombre debe llevar letras o números.');
    expect(validateCarrierForm({ ...valid, name: 'x'.repeat(CARRIER_NAME_MAX + 1) }, []).name).toContain(String(CARRIER_NAME_MAX));
  });

  it('no deja repetir el nombre de una ACTIVA del país, se escriba como se escriba', () => {
    const others = [carrier(), estafeta];
    expect(validateCarrierForm({ ...valid, name: 'fed ex' }, others).name).toBe(
      'Ya hay una paquetería activa con ese nombre en este país.',
    );
    // Una inactiva con ese nombre no estorba.
    expect(validateCarrierForm({ ...valid, name: 'FedEx' }, [carrier({ isActive: false, isDefault: false })])).toEqual({});
    // Al editarla, su propio nombre no choca consigo misma…
    expect(validateCarrierForm(carrierFormValues(carrier()), others, carrier())).toEqual({});
    // …pero sí con el de otra.
    expect(validateCarrierForm({ ...carrierFormValues(estafeta), name: 'FEDEX' }, others, estafeta).name).toBeDefined();
    // Al editar una INACTIVA no se revisa: lo dirá el API si se reactiva.
    const inactive = carrier({ id: 'old', name: 'FedEx', isActive: false, isDefault: false });
    expect(validateCarrierForm(carrierFormValues(inactive), others, inactive)).toEqual({});
  });

  it('el enlace es opcional; si viene, es http(s), sin espacios y con {guia}', () => {
    const withLink = (trackingUrlTemplate: string) => validateCarrierForm({ ...valid, trackingUrlTemplate }, []);
    expect(withLink('')).toEqual({});
    expect(withLink('https://dhl.com/rastreo/{guia}')).toEqual({});
    expect(withLink('http://dhl.com/?n={GUIA}')).toEqual({});
    expect(withLink('dhl.com/{guia}').trackingUrlTemplate).toContain('https://');
    expect(withLink('https://dhl.com/mi guia/{guia}').trackingUrlTemplate).toContain('espacios');
    expect(withLink('https://dhl.com/rastreo').trackingUrlTemplate).toContain('{guia}');
    expect(withLink(`https://dhl.com/{guia}?x=${'a'.repeat(CARRIER_TRACKING_MAX)}`).trackingUrlTemplate).toContain(
      String(CARRIER_TRACKING_MAX),
    );
  });

  it('las notas tienen tope', () => {
    expect(validateCarrierForm({ ...valid, notes: 'n'.repeat(CARRIER_NOTES_MAX) }, [])).toEqual({});
    expect(validateCarrierForm({ ...valid, notes: 'n'.repeat(CARRIER_NOTES_MAX + 1) }, []).notes).toContain(String(CARRIER_NOTES_MAX));
  });
});

describe('store-country/carriers · cuerpos de guardado', () => {
  it('alta: nombre limpio y solo lo que se capturó', () => {
    expect(buildCreateCarrierPayload('mx', { ...EMPTY_CARRIER_FORM, name: '  Paquete   Express ' })).toEqual({
      countryCode: 'MX',
      name: 'Paquete Express',
    });
    expect(
      buildCreateCarrierPayload('US', {
        name: 'UPS',
        trackingUrlTemplate: ' https://ups.com/track?n={Guía} ',
        isDefault: true,
        notes: ' Recolecta a las 4 ',
      }),
    ).toEqual({
      countryCode: 'US',
      name: 'UPS',
      trackingUrlTemplate: 'https://ups.com/track?n={guia}',
      isDefault: true,
      notes: 'Recolecta a las 4',
    });
  });

  it('edición: solo viaja lo que cambió', () => {
    const original = carrier({ notes: 'Recolecta diario' });
    expect(buildUpdateCarrierPayload(original, carrierFormValues(original))).toEqual({});
    expect(isEmptyCarrierPayload(buildUpdateCarrierPayload(original, carrierFormValues(original)))).toBe(true);

    expect(buildUpdateCarrierPayload(original, { ...carrierFormValues(original), name: 'FedEx México' })).toEqual({
      name: 'FedEx México',
    });
    // Quitar el enlace o la nota los manda en null.
    expect(buildUpdateCarrierPayload(original, { ...carrierFormValues(original), trackingUrlTemplate: ' ', notes: '' })).toEqual({
      trackingUrlTemplate: null,
      notes: null,
    });
    expect(buildUpdateCarrierPayload(estafeta, { ...carrierFormValues(estafeta), isDefault: true })).toEqual({ isDefault: true });
    expect(buildUpdateCarrierPayload(original, { ...carrierFormValues(original), isDefault: false })).toEqual({ isDefault: false });
  });
});
