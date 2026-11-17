// shipment-sheet.ts — Orden de surtido de un ENVÍO con varias ventas (lógica PURA, 17-nov-2026).
//
// Un envío de Call Center lleva una venta por distribuidor y viaja como UN paquete. La orden
// de surtido se imprime con dos secciones:
//   1) el total por producto (lo que se saca del almacén), que ya arma el API en `shipmentItems`;
//   2) lo que lleva cada distribuidor, que sale de aquí: se reparte `shipmentItems[].perSale`
//      entre las ventas vivas del envío (`shipmentDeliveries`).
// Así Almacén empaca todo junto y, si lo necesita, sabe qué es de quién.

import type { Delivery, ShipmentDeliverySummary } from '@/types/deliveries';

export interface ShipmentSaleLine {
  productId: string;
  productSku: string;
  productName: string;
  quantity: number;
}

export interface ShipmentSaleBreakdown {
  deliveryId: string;
  saleNumber: string;
  customerNumber: string | null;
  customerName: string | null;
  /** Piezas de la venta (suma de sus renglones). */
  units: number;
  saleTotal: number;
  lines: ShipmentSaleLine[];
}

type ShipmentDetail = Pick<Delivery, 'shipmentItems' | 'shipmentDeliveries'>;

/** ¿El detalle trae un envío de varias ventas (un paquete, varios distribuidores)? */
export function isMultiSaleShipment(d: ShipmentDetail): boolean {
  return !!d.shipmentItems && !!d.shipmentDeliveries && d.shipmentDeliveries.length > 1;
}

/** Ventas vivas del envío, en el orden en que se capturaron (sin las canceladas). */
export function liveShipmentSales(d: ShipmentDetail): ShipmentDeliverySummary[] {
  return (d.shipmentDeliveries ?? []).filter((s) => s.status !== 'cancelled');
}

/**
 * Qué lleva cada distribuidor: por cada venta viva, sus productos con las piezas que le
 * tocan. Los productos conservan el orden de la sección por producto; si una venta trae el
 * mismo producto en dos renglones (la pieza pagada y la de regalo) se suman.
 */
export function shipmentSalesBreakdown(d: ShipmentDetail): ShipmentSaleBreakdown[] {
  const items = d.shipmentItems ?? [];
  return liveShipmentSales(d).map((sale) => {
    const lines: ShipmentSaleLine[] = [];
    for (const it of items) {
      const quantity = it.perSale
        .filter((p) => p.saleNumber === sale.saleNumber)
        .reduce((sum, p) => sum + Number(p.quantity || 0), 0);
      if (quantity > 0) {
        lines.push({
          productId: it.productId,
          productSku: it.productSku,
          productName: it.productName,
          quantity,
        });
      }
    }
    const units = lines.reduce((sum, l) => sum + l.quantity, 0);
    return {
      deliveryId: sale.id,
      saleNumber: sale.saleNumber,
      customerNumber: sale.customerNumber,
      customerName: sale.customerName,
      // Sin renglones (un API anterior, o la venta aún no se refleja) se usa el conteo del API.
      units: lines.length > 0 ? units : sale.itemsUnits,
      saleTotal: sale.saleTotal,
      lines,
    };
  });
}

/** "#2020562 LAURA MENDEZ" | "LAURA MENDEZ" | "#2020562" | "Sin distribuidor". */
export function shipmentSaleCustomerLabel(
  s: Pick<ShipmentSaleBreakdown, 'customerNumber' | 'customerName'>,
): string {
  const parts = [s.customerNumber ? `#${s.customerNumber}` : '', s.customerName ?? ''].filter(Boolean);
  return parts.length > 0 ? parts.join(' ') : 'Sin distribuidor';
}
