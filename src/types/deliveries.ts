// deliveries.ts - Entregas a domicilio de ventas POS (API: pos/deliveries, mig 161).
// Call Center las captura al cobrar en el POS; Almacén las surte desde el admin.

export type DeliveryStatus = 'pending' | 'ready' | 'shipped' | 'delivered' | 'cancelled';

export const DELIVERY_STATUS_LABELS: Record<DeliveryStatus, string> = {
  pending: 'Pendiente de surtir',
  ready: 'Listo para envío',
  shipped: 'Enviado',
  delivered: 'Entregado',
  cancelled: 'Cancelado',
};

export interface DeliveryQuery {
  branchId?: string;
  /** Lista separada por comas (pending,ready,…). */
  status?: string;
  fromDate?: string;
  toDate?: string;
  mine?: boolean;
  includeUnpaid?: boolean;
  customerId?: string;
  search?: string;
  page?: number;
  limit?: number;
}

/** Pieza que compone un kit / paquete / promoción (lo que Almacén debe meter). */
export interface DeliveryItemComponent {
  productId: string;
  sku: string | null;
  name: string;
  quantityPerUnit: number;
  quantityTotal: number;
}

export interface DeliveryItem {
  id: string;
  productId: string;
  productSku: string;
  productName: string;
  productType: string | null;
  quantity: number;
  unitPrice: number;
  total: number;
  /** Contenido resuelto para el país de la sucursal que surte (solo kits, paquetes y promos). */
  components?: DeliveryItemComponent[];
}

export interface Delivery {
  id: string;
  status: DeliveryStatus;
  statusLabel: string;
  saleId: string;
  saleNumber: string;
  saleStatus: string;
  saleCreatedAt: string;
  saleTotal: number;
  currencyCode: string;
  paymentMethod: string;
  saleBranchId: string;
  saleBranchName: string;
  customerId: string | null;
  customerNumber: string | null;
  customerName: string | null;
  recipientName: string;
  recipientPhone: string | null;
  addressId: string | null;
  street: string | null;
  extNumber: string | null;
  intNumber: string | null;
  neighborhood: string | null;
  city: string | null;
  state: string | null;
  zipCode: string | null;
  countryId: string | null;
  countryName: string | null;
  reference: string | null;
  addressText: string;
  notes: string | null;
  warehouseNotes: string | null;
  fulfillBranchId: string;
  fulfillBranchCode: string;
  fulfillBranchName: string;
  carrier: string | null;
  trackingNumber: string | null;
  requestedById: string;
  requestedByName: string;
  requestedAt: string;
  readyAt: string | null;
  readyByName: string | null;
  shippedAt: string | null;
  shippedByName: string | null;
  deliveredAt: string | null;
  deliveredByName: string | null;
  cancelledAt: string | null;
  cancelledByName: string | null;
  cancelReason: string | null;
  itemsCount: number;
  itemsUnits: number;
  /** Clave del envío: varias entregas con la misma clave = un solo paquete (envío consolidado). */
  shipmentKey: string;
  /** Entregas (ventas) que comparten el envío; 1 = sencillo. */
  shipmentSize: number;
  /** Solo en el detalle. */
  items?: DeliveryItem[];
  /** Solo en el detalle de un envío consolidado: todas las ventas del paquete. */
  shipmentDeliveries?: ShipmentDeliverySummary[];
  /** Solo en el detalle de un envío consolidado: productos de todas las ventas, por producto. */
  shipmentItems?: ShipmentItem[];
}

export interface ShipmentDeliverySummary {
  id: string;
  saleId: string;
  saleNumber: string;
  status: DeliveryStatus;
  statusLabel: string;
  customerNumber: string | null;
  customerName: string | null;
  saleTotal: number;
  itemsCount: number;
  itemsUnits: number;
}

export interface ShipmentItem {
  productId: string;
  productSku: string;
  productName: string;
  productType: string | null;
  quantity: number;
  perSale: { saleNumber: string; customerNumber: string | null; quantity: number }[];
  components?: DeliveryItemComponent[];
}

export interface DeliveryStatusCounts {
  pending: number;
  ready: number;
  shipped: number;
  delivered: number;
  cancelled: number;
}

export interface DeliveryListResponse {
  data: Delivery[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  counts: DeliveryStatusCounts;
}

export interface UpdateDeliveryStatusPayload {
  status: DeliveryStatus;
  carrier?: string;
  trackingNumber?: string;
  warehouseNotes?: string;
  reason?: string;
}

export interface UpdateDeliveryPayload {
  carrier?: string;
  trackingNumber?: string;
  warehouseNotes?: string;
  recipientPhone?: string;
}
