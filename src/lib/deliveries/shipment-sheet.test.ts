// Envíos de Call Center (API mig 211, 17-nov-2026): reglas de la bandeja de Almacén para un
// envío en captura, el reparto por distribuidor de la orden de surtido y lo que se imprime
// (hoja con dos secciones, avisos y los tickets de todas las ventas).

import { describe, expect, it } from 'vitest';
import type { Delivery, ShipmentDeliverySummary, ShipmentItem } from '@/types/deliveries';
import { buildPickingSheetHtml, buildTicketHtml, buildTicketsHtml } from '@/lib/delivery-print';
import {
  SHIPMENT_IN_CAPTURE_LABEL,
  availableDeliveryActions,
  canFinishShipmentCapture,
  isShipmentInCapture,
  shipmentChangedAfterClose,
  shipmentTitle,
} from './actions';
import {
  isMultiSaleShipment,
  liveShipmentSales,
  shipmentSaleCustomerLabel,
  shipmentSalesBreakdown,
} from './shipment-sheet';

const sale = (over: Partial<ShipmentDeliverySummary>): ShipmentDeliverySummary => ({
  id: 'd-1',
  saleId: 's-1',
  saleNumber: '164-20261117-0031',
  status: 'pending',
  statusLabel: 'Pendiente de surtir',
  customerNumber: '2020562',
  customerName: 'LAURA MENDEZ',
  saleTotal: 500,
  itemsCount: 2,
  itemsUnits: 5,
  ...over,
});

const SALES: ShipmentDeliverySummary[] = [
  sale({}),
  sale({
    id: 'd-2',
    saleId: 's-2',
    saleNumber: '164-20261117-0032',
    customerNumber: '2020595',
    customerName: 'PEDRO SALAS',
    saleTotal: 400,
    itemsCount: 1,
    itemsUnits: 4,
  }),
  sale({
    id: 'd-3',
    saleId: 's-3',
    saleNumber: '164-20261117-0033',
    status: 'cancelled',
    statusLabel: 'Cancelado',
    customerNumber: '2020601',
    customerName: 'MARTA LUNA',
    saleTotal: 100,
    itemsCount: 1,
    itemsUnits: 1,
  }),
];

// Lo que manda el API: productos de las ventas VIVAS, por producto, con su reparto por venta.
const ITEMS: ShipmentItem[] = [
  {
    productId: 'p-cafe',
    productSku: '9019',
    productName: 'JIMMY COFFEE',
    productType: 'finished_good',
    quantity: 8,
    perSale: [
      { saleNumber: '164-20261117-0031', customerNumber: '2020562', quantity: 3 },
      // La misma venta trae el producto en dos renglones (la pieza de regalo a $0).
      { saleNumber: '164-20261117-0031', customerNumber: '2020562', quantity: 1 },
      { saleNumber: '164-20261117-0032', customerNumber: '2020595', quantity: 4 },
    ],
  },
  {
    productId: 'p-te',
    productSku: '6227',
    productName: 'TE VERDE',
    productType: 'finished_good',
    quantity: 1,
    perSale: [{ saleNumber: '164-20261117-0031', customerNumber: '2020562', quantity: 1 }],
  },
];

const delivery = (over: Partial<Delivery> = {}): Delivery =>
  ({
    id: 'd-1',
    status: 'pending',
    statusLabel: 'Pendiente de surtir',
    kind: 'pos_sale',
    deliveryMode: 'shipping',
    saleId: 's-1',
    orderId: null,
    orderNumber: null,
    saleNumber: '164-20261117-0031',
    saleStatus: 'completed',
    saleCreatedAt: '2026-11-17T16:00:00.000Z',
    saleTotal: 500,
    currencyCode: 'MXN',
    paymentMethod: 'cash',
    saleBranchId: 'b-164',
    saleBranchName: 'Irapuato Call Center',
    customerId: 'c-1',
    customerNumber: '2020562',
    customerName: 'LAURA MENDEZ',
    recipientName: 'Marta Luna',
    recipientPhone: '4612223344',
    addressId: null,
    street: 'Av. Juárez',
    extNumber: '12',
    intNumber: null,
    neighborhood: 'Centro',
    city: 'Celaya',
    state: 'Guanajuato',
    zipCode: '38000',
    countryId: 'mx',
    countryName: 'México',
    reference: null,
    addressText: 'Av. Juárez #12, Col. Centro, 38000 Celaya, Guanajuato, México',
    notes: 'Entregar por la tarde',
    warehouseNotes: null,
    fulfillBranchId: 'b-164',
    fulfillBranchCode: '164',
    fulfillBranchName: 'Irapuato Call Center',
    carrier: null,
    trackingNumber: null,
    requestedById: 'u-1',
    requestedByName: 'Karla Ruiz',
    requestedAt: '2026-11-17T16:00:00.000Z',
    readyAt: null,
    readyByName: null,
    shippedAt: null,
    shippedByName: null,
    deliveredAt: null,
    deliveredByName: null,
    cancelledAt: null,
    cancelledByName: null,
    cancelReason: null,
    itemsCount: 2,
    itemsUnits: 5,
    shipmentKey: 'key-1',
    shipmentSize: 3,
    shipmentId: 'ship-1',
    shipmentFolio: 'ENV-2026-000123',
    shipmentStatus: 'closed',
    shipmentNoTicket: false,
    shipmentChangedAfterCloseAt: null,
    items: [
      {
        id: 'i-1',
        productId: 'p-cafe',
        productSku: '9019',
        productName: 'JIMMY COFFEE',
        productType: 'finished_good',
        quantity: 4,
        unitPrice: 100,
        total: 400,
      },
      {
        id: 'i-2',
        productId: 'p-te',
        productSku: '6227',
        productName: 'TE VERDE',
        productType: 'finished_good',
        quantity: 1,
        unitPrice: 100,
        total: 100,
      },
    ],
    shipmentDeliveries: SALES,
    shipmentItems: ITEMS,
    ...over,
  }) as Delivery;

describe('envío en captura · qué puede hacer Almacén', () => {
  it('solo cuenta para ventas del POS con el envío abierto', () => {
    expect(isShipmentInCapture({ kind: 'pos_sale', shipmentStatus: 'open' })).toBe(true);
    expect(isShipmentInCapture({ shipmentStatus: 'open' })).toBe(true);
    expect(isShipmentInCapture({ kind: 'pos_sale', shipmentStatus: 'closed' })).toBe(false);
    expect(isShipmentInCapture({ kind: 'pos_sale', shipmentStatus: null })).toBe(false);
    expect(isShipmentInCapture({ kind: 'pos_sale' })).toBe(false);
    expect(isShipmentInCapture({ kind: 'order', shipmentStatus: 'open' })).toBe(false);
    expect(SHIPMENT_IN_CAPTURE_LABEL).toBe('En captura');
  });

  it('en captura no se marca listo ni enviado: solo se puede cancelar la entrega de una venta', () => {
    const inCapture = (saleStatus: string) =>
      availableDeliveryActions({ status: 'pending', saleStatus, shipmentStatus: 'open' }, true);
    expect(inCapture('completed')).toEqual(['cancelled']);
    expect(inCapture('pending')).toEqual(['cancelled']);
    expect(
      availableDeliveryActions({ status: 'pending', saleStatus: 'completed', shipmentStatus: 'open' }, false),
    ).toEqual([]);
  });

  it('terminada la captura (o sin envío con folio) vuelven las acciones de siempre', () => {
    for (const shipmentStatus of ['closed', null, undefined] as const) {
      expect(
        availableDeliveryActions({ status: 'pending', saleStatus: 'completed', shipmentStatus }, true),
      ).toEqual(['ready', 'shipped', 'cancelled']);
    }
    expect(
      availableDeliveryActions({ status: 'ready', saleStatus: 'completed', shipmentStatus: 'closed' }, true),
    ).toEqual(['shipped', 'unready', 'cancelled']);
  });

  it('Almacén puede terminar la captura si tiene permiso y el envío tiene folio', () => {
    expect(canFinishShipmentCapture({ shipmentStatus: 'open', shipmentId: 'ship-1' }, true)).toBe(true);
    expect(canFinishShipmentCapture({ shipmentStatus: 'open', shipmentId: 'ship-1' }, false)).toBe(false);
    expect(canFinishShipmentCapture({ shipmentStatus: 'closed', shipmentId: 'ship-1' }, true)).toBe(false);
    expect(canFinishShipmentCapture({ shipmentStatus: 'open', shipmentId: null }, true)).toBe(false);
  });

  it('"cambió después de terminarse" solo en un envío terminado con la marca', () => {
    const at = '2026-11-17T18:00:00.000Z';
    expect(shipmentChangedAfterClose({ shipmentStatus: 'closed', shipmentChangedAfterCloseAt: at })).toBe(true);
    expect(shipmentChangedAfterClose({ shipmentStatus: 'closed', shipmentChangedAfterCloseAt: null })).toBe(false);
    expect(shipmentChangedAfterClose({ shipmentStatus: 'open', shipmentChangedAfterCloseAt: at })).toBe(false);
    expect(shipmentChangedAfterClose({})).toBe(false);
  });

  it('título del envío: con folio, y "consolidado" para los anteriores sin folio', () => {
    expect(shipmentTitle({ shipmentFolio: 'ENV-2026-000123' }, 3)).toBe('Envío ENV-2026-000123 · 3 ventas');
    expect(shipmentTitle({ shipmentFolio: 'ENV-2026-000123' }, 1)).toBe('Envío ENV-2026-000123 · 1 venta');
    expect(shipmentTitle({ shipmentFolio: null }, 2)).toBe('Envío consolidado · 2 ventas');
    expect(shipmentTitle({}, 2)).toBe('Envío consolidado · 2 ventas');
  });
});

describe('orden de surtido · qué lleva cada distribuidor', () => {
  it('reparte los productos entre las ventas vivas, sumando renglones repetidos', () => {
    const d = delivery();
    expect(isMultiSaleShipment(d)).toBe(true);
    expect(liveShipmentSales(d).map((s) => s.saleNumber)).toEqual(['164-20261117-0031', '164-20261117-0032']);
    expect(shipmentSalesBreakdown(d)).toEqual([
      {
        deliveryId: 'd-1',
        saleNumber: '164-20261117-0031',
        customerNumber: '2020562',
        customerName: 'LAURA MENDEZ',
        units: 5,
        saleTotal: 500,
        lines: [
          { productId: 'p-cafe', productSku: '9019', productName: 'JIMMY COFFEE', quantity: 4 },
          { productId: 'p-te', productSku: '6227', productName: 'TE VERDE', quantity: 1 },
        ],
      },
      {
        deliveryId: 'd-2',
        saleNumber: '164-20261117-0032',
        customerNumber: '2020595',
        customerName: 'PEDRO SALAS',
        units: 4,
        saleTotal: 400,
        lines: [{ productId: 'p-cafe', productSku: '9019', productName: 'JIMMY COFFEE', quantity: 4 }],
      },
    ]);
  });

  it('lo repartido suma lo mismo que el total por producto', () => {
    const d = delivery();
    const byProduct = new Map<string, number>();
    for (const s of shipmentSalesBreakdown(d)) {
      for (const l of s.lines) byProduct.set(l.productId, (byProduct.get(l.productId) ?? 0) + l.quantity);
    }
    for (const it of ITEMS) expect(byProduct.get(it.productId)).toBe(it.quantity);
  });

  it('una sola venta o sin detalle del envío: no hay segunda sección', () => {
    const single = delivery({ shipmentDeliveries: undefined, shipmentItems: undefined, shipmentSize: 1 });
    expect(isMultiSaleShipment(single)).toBe(false);
    expect(shipmentSalesBreakdown(single)).toEqual([]);
    expect(liveShipmentSales(single)).toEqual([]);
  });

  it('una venta sin renglones todavía usa el conteo del API', () => {
    const d = delivery({ shipmentItems: [] });
    expect(shipmentSalesBreakdown(d).map((s) => [s.units, s.lines.length])).toEqual([
      [5, 0],
      [4, 0],
    ]);
  });

  it('etiqueta del distribuidor', () => {
    expect(shipmentSaleCustomerLabel({ customerNumber: '2020562', customerName: 'LAURA MENDEZ' })).toBe(
      '#2020562 LAURA MENDEZ',
    );
    expect(shipmentSaleCustomerLabel({ customerNumber: null, customerName: 'LAURA MENDEZ' })).toBe('LAURA MENDEZ');
    expect(shipmentSaleCustomerLabel({ customerNumber: '2020562', customerName: null })).toBe('#2020562');
    expect(shipmentSaleCustomerLabel({ customerNumber: null, customerName: null })).toBe('Sin distribuidor');
  });
});

describe('lo que se imprime', () => {
  it('envío de varias ventas: folio, las dos secciones y solo las ventas vivas', () => {
    const html = buildPickingSheetHtml(delivery(), 'America/Mexico_City');
    expect(html).toContain('Hoja de surtido · Envío ENV-2026-000123 · 2 ventas');
    expect(html).toContain('1. Total por producto');
    expect(html).toContain('2. Por distribuidor (2 ventas en el paquete)');
    expect(html).toContain('164-20261117-0031 · #2020562 LAURA MENDEZ');
    expect(html).toContain('164-20261117-0032 · #2020595 PEDRO SALAS');
    // La cancelada no va en el paquete.
    expect(html).not.toContain('164-20261117-0033');
    expect(html).not.toContain('MARTA LUNA');
    expect(html).toContain('Marta Luna'); // quien recibe
    // Sin avisos cuando no aplican.
    expect(html).not.toContain('SIN TICKET');
    expect(html).not.toContain('EN CAPTURA');
    expect(html).not.toContain('cambió después de terminarse');
  });

  it('avisa en grande: sin ticket, en captura y cambió después de terminarse', () => {
    expect(buildPickingSheetHtml(delivery({ shipmentNoTicket: true }))).toContain(
      'SIN TICKET Y SIN NOTA: no metas ticket ni nota de venta en el paquete.',
    );
    const inCapture = buildPickingSheetHtml(delivery({ shipmentStatus: 'open' }));
    expect(inCapture).toContain('EN CAPTURA');
    // El renglón del encabezado tampoco dice "Pendiente de surtir" mientras no se termine.
    expect(inCapture).toContain('Envío a domicilio · En captura · Surte: 164 Irapuato Call Center');
    expect(buildPickingSheetHtml(delivery())).toContain('Envío a domicilio · Pendiente de surtir · Surte:');
    const changed = buildPickingSheetHtml(
      delivery({ shipmentChangedAfterCloseAt: '2026-11-17T18:30:00.000Z' }),
      'America/Mexico_City',
    );
    expect(changed).toContain('Este envío cambió después de terminarse (17/11/2026, 12:30');
    expect(changed).toContain('descarta la impresión anterior');
  });

  it('envío de una sola venta: la hoja de siempre (con precios) y el folio en el título', () => {
    const html = buildPickingSheetHtml(
      delivery({ shipmentDeliveries: undefined, shipmentItems: undefined, shipmentSize: 1 }),
    );
    expect(html).toContain('Hoja de surtido · Envío ENV-2026-000123 · Venta 164-20261117-0031');
    expect(html).toContain('P. unit.');
    expect(html).not.toContain('Por distribuidor');
    expect(html).not.toContain('1. Total por producto');
  });

  it('una entrega sin envío con folio se imprime igual que antes', () => {
    const html = buildPickingSheetHtml(
      delivery({
        shipmentDeliveries: undefined,
        shipmentItems: undefined,
        shipmentSize: 1,
        shipmentId: null,
        shipmentFolio: null,
        shipmentStatus: null,
      }),
    );
    expect(html).toContain('Hoja de surtido · Venta 164-20261117-0031');
    expect(html).not.toContain('Envío ENV');
  });

  it('tickets: uno por venta en la misma impresión, con el folio del envío', () => {
    const second = delivery({
      id: 'd-2',
      saleNumber: '164-20261117-0032',
      customerNumber: '2020595',
      customerName: 'PEDRO SALAS',
      saleTotal: 400,
    });
    const html = buildTicketsHtml([delivery(), second], 'America/Mexico_City');
    expect(html.match(/class="ticket"/g)).toHaveLength(2);
    expect(html).toContain('<title>Tickets 164-20261117-0031, 164-20261117-0032</title>');
    expect(html).toContain('Folio: 164-20261117-0031');
    expect(html).toContain('Folio: 164-20261117-0032');
    expect(html.match(/Envío: ENV-2026-000123/g)).toHaveLength(2);
    expect(html).toContain('Cliente: 2020595 PEDRO SALAS');
    expect(html).not.toContain('NO INCLUIR EN EL PAQUETE');
  });

  it('ticket de un envío sin ticket: sale marcado para que no se meta al paquete', () => {
    const html = buildTicketHtml(delivery({ shipmentNoTicket: true }));
    expect(html.match(/class="ticket"/g)).toHaveLength(1);
    expect(html).toContain('<title>Ticket 164-20261117-0031</title>');
    expect(html).toContain('ENVÍO SIN TICKET Y SIN NOTA');
    expect(html).toContain('NO INCLUIR EN EL PAQUETE');
  });
});
