// readiness.ts — "¿Lista para vender?": lo que la tienda en línea de un país necesita
// para vender, punto por punto (lógica PURA).
//
// Cada renglón dice en una frase cómo está ese punto y, si no está bien, dónde se
// arregla. Los datos llegan de cinco consultas distintas que pueden tardar o fallar
// por separado: `undefined` = todavía se consulta; `null` = no se pudo consultar.
// Nunca se inventa un "listo": lo que no se sabe se dice que no se sabe.

import type { CountryShippingStatus } from '@/lib/fulfillment/route-draft';
import { paymentPlan, storeCountries, type StoreCountryInfo, type StripeAccountsState } from './countries';
import type { ShippingCostsOrigin } from './shipping-costs';

export type ReadinessState = 'ok' | 'attention' | 'missing' | 'unknown';

export type ReadinessKey = 'store' | 'warehouse' | 'payments' | 'shipping' | 'carriers' | 'purchases';

export interface ReadinessItem {
  /** Único en la lista (`warehouse:FN` cuando el renglón es de una zona). */
  id: string;
  key: ReadinessKey;
  title: string;
  /** Cómo se nombra dentro de una frase: "el cobro en línea". */
  short: string;
  state: ReadinessState;
  /** true = todavía se está consultando (el estado es `unknown` mientras tanto). */
  pending: boolean;
  /** Palabra del estado cuando la genérica ("Listo", "Revisar"…) dice menos: "Apagadas". */
  label?: string;
  detail: string;
  /** Dónde se arregla o se revisa. */
  action?: { label: string; href: string };
}

/** `undefined` = cargando; `null` = no se pudo consultar. */
export type Loadable<T> = T | null | undefined;

/** Almacén que surte a un país o zona de la tienda (de `GET /fulfillment/routes`). */
export interface WarehouseReadiness {
  code: string;
  name: string;
  /** Zona sin tienda propia (Frontera): compra en la tienda del país. */
  isZone: boolean;
  status: CountryShippingStatus;
  /** "164 · Irapuato Almacén General": el almacén que surtiría hoy; null si ninguno. */
  warehouse: string | null;
}

export type CarriersReadiness =
  /** El servidor todavía no tiene el catálogo (API anterior). */
  | { kind: 'unavailable' }
  /** Falta aplicar la migración 200. */
  | { kind: 'pending_migration' }
  | { kind: 'catalog'; active: number; defaultName: string | null };

export interface ShippingReadiness {
  origin: ShippingCostsOrigin;
  /** "$150.00 MXN": costo del envío estándar ya con su moneda; null si no se pudo leer. */
  standardCost: string | null;
}

export interface ReadinessInput {
  country: StoreCountryInfo;
  warehouses: Loadable<WarehouseReadiness[]>;
  stripe: Loadable<StripeAccountsState>;
  shipping: Loadable<ShippingReadiness>;
  carriers: Loadable<CarriersReadiness>;
  purchasesEnabled: Loadable<boolean>;
}

/** Rutas a las que mandan los renglones. Los que empiezan con `#` son secciones de la misma pantalla. */
export const READINESS_LINKS = {
  routes: '/admin/configuracion/rutas-envio',
  purchases: '/admin/sistema?tab=liberaciones',
  shipping: '#costos-envio',
  carriers: '#paqueterias',
} as const;

const PENDING_DETAIL = 'Consultando…';

type Draft = Pick<ReadinessItem, 'state' | 'detail' | 'label' | 'action'>;

/** Arma el renglón; sin `draft` todavía se está consultando. */
function item(base: Pick<ReadinessItem, 'id' | 'key' | 'title' | 'short'>, draft: Draft | undefined): ReadinessItem {
  if (draft === undefined) return { ...base, state: 'unknown', pending: true, detail: PENDING_DETAIL };
  return { ...base, pending: false, ...draft };
}

const ROUTES_ACTION = { label: 'Abrir Almacenes y envíos', href: READINESS_LINKS.routes };

function warehouseDraft(w: WarehouseReadiness, countryName: string): Draft {
  switch (w.status) {
    case 'ready':
      return {
        state: 'ok',
        detail: w.warehouse ? `Los pedidos salen de ${w.warehouse}.` : 'Tiene almacén asignado.',
      };
    case 'no_warehouse':
      // Una zona sin tienda propia (Frontera) compra en la tienda del país: el pedido nace
      // con el país de la TIENDA y sale de su almacén (checkout del API), así que NO le
      // falta nada para vender. Lo único que cambia sin almacén propio es que su carrito no
      // revisa existencias (el API las deja como "desconocidas"). Mismo dicho que la
      // pantalla de rutas (`noOwnStoreText`).
      return w.isZone
        ? {
            state: 'attention',
            detail: `${w.name} compra en la tienda de ${countryName} y sus pedidos salen del almacén de ${countryName}. Como no tiene almacén asignado, su carrito no revisa las existencias: un producto agotado se le avisa hasta el momento de pagar. Para que lo vea antes, en Almacenes y envíos elige «Usar los mismos almacenes que ${countryName}».`,
            action: ROUTES_ACTION,
          }
        : {
            state: 'missing',
            detail: 'No tiene almacén asignado: no se pueden enviar pedidos a domicilio.',
            action: ROUTES_ACTION,
          };
    case 'paused':
      return {
        state: 'missing',
        detail: 'Su almacén está en pausa: mientras siga así no se envían pedidos a domicilio.',
        action: ROUTES_ACTION,
      };
    case 'branch_inactive':
      return {
        state: 'missing',
        detail: 'La sucursal de su almacén está desactivada: no se envían pedidos a domicilio.',
        action: ROUTES_ACTION,
      };
    case 'cross_pending':
    default:
      return {
        state: 'missing',
        detail: 'Solo tiene almacenes de otro país, y los envíos entre países todavía no están habilitados.',
        action: ROUTES_ACTION,
      };
  }
}

function paymentsDraft(country: StoreCountryInfo, stripe: Loadable<StripeAccountsState>): Draft | undefined {
  const plan = paymentPlan(country.code);
  if (plan.kind === 'planned') {
    return {
      state: 'missing',
      detail: `Todavía no hay forma de cobrar en línea en ${country.name}. Se usará ${plan.gatewayName} cuando se conecte.`,
    };
  }
  if (plan.kind === 'none') {
    return {
      state: 'missing',
      detail: `Todavía no hay forma de cobrar en línea en ${country.name}: falta elegir y conectar un servicio de cobro.`,
    };
  }
  if (stripe === undefined) return undefined;
  if (stripe === null) return { state: 'unknown', detail: 'No se pudo consultar si la cuenta de Stripe está conectada.' };
  return stripe[plan.account]
    ? { state: 'ok', detail: `Se cobra con tarjeta por Stripe, en la cuenta de ${plan.accountName}.` }
    : {
        state: 'missing',
        detail: `La cuenta de Stripe de ${plan.accountName} no tiene sus llaves en el servidor: hoy no se puede cobrar. Las configura Sistemas.`,
      };
}

const SHIPPING_ACTION = { label: 'Ir a costos de envío', href: READINESS_LINKS.shipping };

function shippingDraft(shipping: ShippingReadiness): Draft {
  const amount = shipping.standardCost;
  switch (shipping.origin.kind) {
    case 'own':
      return {
        state: 'ok',
        detail: amount ? `Tiene sus costos capturados: el envío estándar cuesta ${amount}.` : 'Tiene sus costos de envío capturados.',
      };
    case 'inherited': {
      const from = shipping.origin.from;
      const parent = storeCountries().find((c) => c.code === from)?.name ?? from;
      return { state: 'ok', detail: `Usa los costos de envío de ${parent}.` };
    }
    case 'defaults':
      return shipping.origin.mexicoAmounts
        ? {
            state: 'missing',
            detail: `No tiene costos propios: cobraría los montos de México en su moneda${amount ? ` (${amount} de envío estándar)` : ''}. Hay que capturarlos antes de abrir.`,
            action: SHIPPING_ACTION,
          }
        : {
            state: 'attention',
            detail: `Usa los montos iniciales del sistema${amount ? ` (envío estándar de ${amount})` : ''}. Revísalos y guárdalos para dejarlos confirmados.`,
            action: SHIPPING_ACTION,
          };
    case 'unknown':
    default:
      return {
        state: 'unknown',
        detail: amount
          ? `El envío estándar cuesta ${amount}, pero no se pudo confirmar si son costos propios de este país.`
          : 'No se pudo confirmar si tiene costos de envío propios.',
        action: SHIPPING_ACTION,
      };
  }
}

const CARRIERS_ACTION = { label: 'Ir a paqueterías', href: READINESS_LINKS.carriers };
const BY_HAND = 'Mientras tanto, la paquetería se escribe a mano en cada envío.';

function carriersDraft(carriers: CarriersReadiness): Draft {
  if (carriers.kind === 'unavailable') {
    return {
      state: 'attention',
      detail: `El catálogo de paqueterías todavía no está disponible en el servidor. ${BY_HAND}`,
    };
  }
  if (carriers.kind === 'pending_migration') {
    return {
      state: 'attention',
      detail: `Falta aplicar la migración 200 para guardar paqueterías. ${BY_HAND}`,
      action: CARRIERS_ACTION,
    };
  }
  if (carriers.active === 0) {
    return {
      state: 'attention',
      detail: 'No hay paqueterías registradas: Almacén escribe la paquetería a mano en cada envío.',
      action: CARRIERS_ACTION,
    };
  }
  if (!carriers.defaultName) {
    return {
      state: 'attention',
      detail: `Hay ${carriers.active === 1 ? '1 paquetería activa' : `${carriers.active} paqueterías activas`}, pero ninguna predeterminada: Almacén la elige en cada envío.`,
      action: CARRIERS_ACTION,
    };
  }
  return {
    state: 'ok',
    detail: `${carriers.defaultName} es la predeterminada${carriers.active > 1 ? ` (${carriers.active} activas)` : ''}.`,
  };
}

/** Los renglones de "¿Lista para vender?" de un país, en el orden en que se revisan. */
export function buildReadiness(input: ReadinessInput): ReadinessItem[] {
  const { country } = input;
  const items: ReadinessItem[] = [];

  items.push(
    item(
      { id: 'store', key: 'store', title: 'Tienda publicada', short: 'la publicación de la tienda' },
      country.published
        ? { state: 'ok', detail: `La tienda de ${country.name} está publicada: se puede entrar y ver el catálogo.` }
        : {
            state: 'missing',
            detail: `La tienda de ${country.name} todavía aparece como «próximamente» en el selector de país. La publica Sistemas cuando lo demás esté listo.`,
          },
    ),
  );

  const withZones = country.zones.length > 0;
  if (!input.warehouses) {
    const places = [{ code: country.code, name: country.name }, ...country.zones];
    for (const place of places) {
      items.push(
        item(
          {
            id: place.code === country.code ? 'warehouse' : `warehouse:${place.code}`,
            key: 'warehouse',
            title: withZones ? `Almacén que surte a ${place.name}` : 'Almacén que surte',
            short: withZones ? `el almacén de ${place.name}` : 'el almacén que surte',
          },
          input.warehouses === undefined ? undefined : { state: 'unknown', detail: 'No se pudieron consultar los almacenes.', action: ROUTES_ACTION },
        ),
      );
    }
  } else {
    for (const w of input.warehouses) {
      items.push(
        item(
          {
            id: w.isZone ? `warehouse:${w.code}` : 'warehouse',
            key: 'warehouse',
            title: withZones ? `Almacén que surte a ${w.name}` : 'Almacén que surte',
            short: withZones ? `el almacén de ${w.name}` : 'el almacén que surte',
          },
          warehouseDraft(w, country.name),
        ),
      );
    }
  }

  items.push(
    item(
      { id: 'payments', key: 'payments', title: 'Cobro en línea', short: 'el cobro en línea' },
      paymentsDraft(country, input.stripe),
    ),
  );

  items.push(
    item(
      { id: 'shipping', key: 'shipping', title: 'Costos de envío', short: 'los costos de envío' },
      input.shipping === undefined
        ? undefined
        : input.shipping === null
          ? { state: 'unknown', detail: 'No se pudieron consultar los costos de envío de este país.', action: SHIPPING_ACTION }
          : shippingDraft(input.shipping),
    ),
  );

  items.push(
    item(
      { id: 'carriers', key: 'carriers', title: 'Paquetería', short: 'la paquetería' },
      input.carriers === undefined
        ? undefined
        : input.carriers === null
          ? { state: 'unknown', detail: 'No se pudo consultar el catálogo de paqueterías.', action: CARRIERS_ACTION }
          : carriersDraft(input.carriers),
    ),
  );

  items.push(
    item(
      { id: 'purchases', key: 'purchases', title: 'Compras en línea', short: 'las compras en línea' },
      input.purchasesEnabled === undefined
        ? undefined
        : input.purchasesEnabled === null
          ? { state: 'unknown', detail: 'No se pudo consultar si las compras en línea están encendidas.' }
          : input.purchasesEnabled
            ? { state: 'ok', label: 'Encendidas', detail: 'Las compras en línea están encendidas.' }
            : {
                state: 'attention',
                label: 'Apagadas',
                detail:
                  'Las compras en línea están apagadas para todos los países: nadie puede pagar todavía. Se encienden en Sistema › Piloto Distribuidores.',
                action: { label: 'Abrir Sistema › Piloto Distribuidores', href: READINESS_LINKS.purchases },
              },
    ),
  );

  return items;
}

// ===== veredicto =====

export interface ReadinessVerdict {
  state: ReadinessState;
  /** true = todavía se consulta algo: el veredicto puede cambiar. */
  pending: boolean;
  title: string;
  detail: string;
}

/** "a", "a y b", "a, b y c". */
export function joinList(parts: readonly string[]): string {
  if (parts.length <= 1) return parts[0] ?? '';
  return `${parts.slice(0, -1).join(', ')} y ${parts[parts.length - 1]}`;
}

/**
 * La respuesta corta a "¿lista para vender?". Lo que FALTA manda sobre todo lo demás;
 * las compras apagadas se dicen aparte, porque no son algo que le falte al país sino
 * un interruptor general.
 */
export function readinessVerdict(items: readonly ReadinessItem[], countryName: string): ReadinessVerdict {
  const pending = items.some((i) => i.pending);
  const missing = items.filter((i) => i.state === 'missing');
  const purchasesOff = items.some((i) => i.key === 'purchases' && i.state === 'attention');
  const review = items.filter((i) => i.state === 'attention' && i.key !== 'purchases');
  const unknown = items.filter((i) => i.state === 'unknown' && !i.pending);
  const offNote = 'Además, las compras en línea están apagadas para todos los países.';

  if (missing.length > 0) {
    return {
      state: 'missing',
      pending,
      title: 'Todavía no está lista para vender',
      detail: `Falta resolver ${joinList(missing.map((i) => i.short))}.${purchasesOff ? ` ${offNote}` : ''}`,
    };
  }
  if (pending) {
    return { state: 'unknown', pending, title: 'Revisando…', detail: `Consultando lo que necesita la tienda de ${countryName}.` };
  }
  if (unknown.length > 0) {
    return {
      state: 'unknown',
      pending,
      title: 'No se pudo revisar todo',
      detail: `No se pudo consultar ${joinList(unknown.map((i) => i.short))}. Recarga la página; si sigue igual, avisa a Sistemas.`,
    };
  }
  if (purchasesOff) {
    return {
      state: 'attention',
      pending,
      title: 'Lista, pero con las compras apagadas',
      detail:
        review.length > 0
          ? `Nadie puede comprar todavía porque las compras en línea están apagadas para todos los países. Antes de encenderlas conviene revisar ${joinList(review.map((i) => i.short))}.`
          : `A ${countryName} no le falta nada. Nadie puede comprar todavía porque las compras en línea están apagadas para todos los países.`,
    };
  }
  if (review.length > 0) {
    return {
      state: 'attention',
      pending,
      title: 'Puede vender, con puntos por revisar',
      detail: `Conviene revisar ${joinList(review.map((i) => i.short))}.`,
    };
  }
  return {
    state: 'ok',
    pending,
    title: 'Lista para vender',
    detail: `La tienda de ${countryName} tiene todo lo necesario y las compras en línea están encendidas.`,
  };
}
