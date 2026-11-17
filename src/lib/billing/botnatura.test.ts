import { describe, expect, it } from 'vitest';
import {
  catalogPrice,
  draftBlockers,
  draftTotal,
  lineProblem,
  lineTotal,
  lineUnitPrice,
  parseAmount,
  priceModeLabel,
  receiverProblems,
  splitIvaIncluded,
  toInvoiceRequest,
  type BotnaturaDraft,
  type BotnaturaLineDraft,
} from './botnatura';

const ajo = { id: 'p-ajo', code: '1303', name: 'AJO 150 CAPS', listPrice: 116, salePrice: 58 };
const zinc = { id: 'p-zinc', code: '1631', name: 'ZINC 60 TABS', listPrice: null, salePrice: null };
const line = (over: Partial<BotnaturaLineDraft> = {}): BotnaturaLineDraft => ({
  product: ajo,
  quantity: '10',
  priceMode: null,
  customPrice: '',
  ...over,
});
const draft = (over: Partial<BotnaturaDraft> = {}): BotnaturaDraft => ({
  settingsReady: true,
  missing: [],
  branchId: 'b-1',
  invoiceMode: 'sale',
  paymentMethod: 'PPD',
  paymentForm: '',
  lines: [line()],
  ...over,
});

describe('precios de Botnatura', () => {
  it('lee importes tecleados y rechaza lo que no es un número', () => {
    expect(parseAmount('1,234.50')).toBe(1234.5);
    expect(parseAmount('$ 58')).toBe(58);
    expect(parseAmount('58.')).toBe(58);
    expect(parseAmount('')).toBeNull();
    expect(parseAmount('abc')).toBeNull();
    expect(parseAmount('-5')).toBeNull();
    expect(parseAmount('1.2.3')).toBeNull();
  });

  it('toma del catálogo el precio elegido y nunca inventa uno', () => {
    expect(catalogPrice(ajo, 'list')).toBe(116);
    expect(catalogPrice(ajo, 'sale')).toBe(58);
    expect(catalogPrice(zinc, 'sale')).toBeNull();
    expect(catalogPrice({ listPrice: 0, salePrice: 0 }, 'list')).toBeNull();
  });

  it('el concepto usa el precio general, salvo que traiga el suyo', () => {
    expect(lineUnitPrice(line(), 'sale')).toBe(58);
    expect(lineUnitPrice(line(), 'list')).toBe(116);
    expect(lineUnitPrice(line({ priceMode: 'list' }), 'sale')).toBe(116);
    expect(lineUnitPrice(line({ priceMode: 'custom', customPrice: '70.5' }), 'sale')).toBe(70.5);
    expect(lineTotal(line({ quantity: '3' }), 'sale')).toBe(174);
    expect(draftTotal([line(), line({ priceMode: 'list', quantity: '1' })], 'sale')).toBe(696);
  });

  it('separa base e IVA de un importe que ya lo incluye', () => {
    expect(splitIvaIncluded(580)).toEqual({ base: 500, tax: 80 });
    expect(splitIvaIncluded(113)).toEqual({ base: 97.41, tax: 15.59 });
  });

  it('nombra el precio con el que salió la factura', () => {
    expect(priceModeLabel('sale')).toBe('Precio venta');
    expect(priceModeLabel('list')).toBe('Precio');
    expect(priceModeLabel('mixed')).toBe('Varios precios');
  });
});

describe('lo que falta para timbrar', () => {
  it('con todo capturado no falta nada', () => {
    expect(draftBlockers(draft())).toEqual([]);
  });

  it('avisa del producto sin precio en el catálogo y de la cantidad vacía', () => {
    expect(lineProblem(line({ product: zinc }), 'sale')).toBe(
      'No tiene "Precio venta" en el catálogo: elige otro precio o captúralo',
    );
    expect(lineProblem(line({ product: zinc, priceMode: 'custom' }), 'sale')).toBe('Captura el precio');
    expect(lineProblem(line({ product: zinc, priceMode: 'custom', customPrice: '45' }), 'sale')).toBeNull();
    expect(lineProblem(line({ quantity: '0' }), 'sale')).toBe('Captura la cantidad');
    expect(draftTotal([line({ product: zinc })], 'sale')).toBeNull();
  });

  it('lista en orden: datos fiscales, sucursal, productos y forma de pago', () => {
    expect(
      draftBlockers(
        draft({
          settingsReady: false,
          missing: ['RFC', 'Código postal fiscal'],
          branchId: '',
          lines: [],
          paymentMethod: 'PUE',
        }),
      ),
    ).toEqual([
      'Completa los datos fiscales de Botnatura: RFC, Código postal fiscal',
      'Elige la sucursal que expide',
      'Agrega al menos un producto',
      'Elige la forma de pago',
    ]);
    expect(draftBlockers(draft({ invoiceMode: null }))).toEqual(['Elige con qué precio se factura: Precio o Precio venta']);
    expect(draftTotal([line()], null)).toBeNull();
    expect(draftTotal([line({ priceMode: 'list' })], null)).toBe(1160);
    expect(draftBlockers(draft({ lines: [line({ product: zinc })] }))).toEqual([
      '1631 ZINC 60 TABS: No tiene "Precio venta" en el catálogo: elige otro precio o captúralo',
    ]);
  });
});

describe('lo que viaja al servidor', () => {
  it('solo manda el precio del concepto cuando difiere del general', () => {
    const request = toInvoiceRequest(
      draft({
        lines: [
          line(),
          line({ priceMode: 'sale', quantity: '2' }),
          line({ priceMode: 'list', quantity: '1' }),
          line({ product: zinc, priceMode: 'custom', customPrice: '45.50', quantity: '4' }),
        ],
      }),
      { sendEmail: false, notes: '  Pedido de noviembre ' },
    );
    expect(request).toEqual({
      branchId: 'b-1',
      priceMode: 'sale',
      paymentMethod: 'PPD',
      lines: [
        { productId: 'p-ajo', quantity: 10 },
        { productId: 'p-ajo', quantity: 2 },
        { productId: 'p-ajo', quantity: 1, priceMode: 'list' },
        { productId: 'p-zinc', quantity: 4, priceMode: 'custom', unitPrice: 45.5 },
      ],
      sendEmail: false,
      notes: 'Pedido de noviembre',
    });
  });

  it('con PUE manda la forma de pago; con PPD no (el servidor pone 99)', () => {
    const pue = toInvoiceRequest(draft({ paymentMethod: 'PUE', paymentForm: '03' }), { sendEmail: true, notes: '' });
    expect(pue.paymentForm).toBe('03');
    expect(pue.notes).toBeUndefined();
    expect(toInvoiceRequest(draft(), { sendEmail: true, notes: '' }).paymentForm).toBeUndefined();
  });
});

describe('datos fiscales de Botnatura', () => {
  const ok = { rfc: 'bot200101ab3', name: 'Botnatura SA de CV', taxRegimeCode: '601', cfdiUseCode: 'g01', zipCode: '37000' };
  it('acepta datos completos y dice cuál está mal', () => {
    expect(receiverProblems(ok)).toEqual([]);
    expect(receiverProblems({ ...ok, rfc: 'MAL', zipCode: '370', email: 'sin-arroba' })).toEqual([
      'RFC',
      'Código postal fiscal',
      'Correo',
    ]);
    expect(receiverProblems({ rfc: '', name: ' ', taxRegimeCode: '', cfdiUseCode: '', zipCode: '' })).toEqual([
      'RFC',
      'Razón social',
      'Régimen fiscal',
      'Uso del CFDI',
      'Código postal fiscal',
    ]);
  });
});
