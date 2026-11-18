// transfer-ticket-layout.ts — Medidas de la LISTA de productos del PDF de traspaso (lógica PURA).
//
// Pedido de Almacén (17-nov-2026): la lista se imprimía a 7.5 puntos y al surtir el traspaso
// no se alcanzaba a leer. La lista es lo que se lee de pie, con la hoja en la mano o sobre la
// mesa: ahora va a 11 puntos (la cantidad a 13, en negritas), con renglones más altos, el
// nombre completo del producto (ya no se corta ni se achica el segundo renglón) y las columnas
// repartidas según lo que trae cada traspaso: si ningún producto lleva lote ni caducidad, esas
// columnas no se imprimen y el espacio es para el nombre.
//
// Aquí solo hay números (mm y puntos) para poder probarlos sin generar un PDF; quien dibuja es
// generate-transfer-ticket.ts. La preferencia de tamaño de letra del admin (`scale`, 1 a 1.3)
// multiplica todo: letras, altos de renglón y anchos medidos.

/** Tamaños de letra de la lista, en puntos (antes todo a 7.5; lote y caducidad a 7). */
export const TRANSFER_LIST_FONT = {
  /** Clave y nombre del producto. */
  row: 11,
  /** Cantidad, en negritas: es lo que más se consulta al surtir. */
  quantity: 13,
  /** Encabezado de columnas. */
  head: 9,
  /** Número de renglón. */
  index: 9,
  /** Lote y caducidad. */
  extra: 9.5,
  /** Renglón de totales. */
  total: 11,
} as const;

const MM_PER_PT = 0.3528;

/** Puntos → milímetros. */
export function ptToMm(pt: number): number {
  return pt * MM_PER_PT;
}

const safeScale = (scale: number | undefined): number =>
  typeof scale === 'number' && Number.isFinite(scale) && scale > 0 ? scale : 1;

/** Alto de un renglón de texto del nombre (interlineado), en mm. */
export function transferNameLineHeight(scale?: number): number {
  return ptToMm(TRANSFER_LIST_FONT.row * safeScale(scale)) * 1.25;
}

/**
 * Alto del renglón de un producto, en mm: lo que pide la cantidad (la letra más grande) o, si
 * el nombre ocupa varios renglones, lo que pidan esos renglones.
 */
export function transferRowHeight(nameLines: number, scale?: number): number {
  const k = safeScale(scale);
  const lines = Math.max(1, Math.floor(nameLines) || 1);
  const single = ptToMm(TRANSFER_LIST_FONT.quantity * k) * 1.7;
  const wrapped = lines * transferNameLineHeight(k) + ptToMm(TRANSFER_LIST_FONT.row * k) * 0.75;
  return Math.max(single, wrapped);
}

/** Distancia del borde superior del renglón a la línea base de su primer texto, en mm. */
export function transferRowBaseline(scale?: number): number {
  return ptToMm(TRANSFER_LIST_FONT.quantity * safeScale(scale)) * 1.15;
}

/** Alto de la franja del encabezado de columnas, en mm. */
export function transferHeadHeight(scale?: number): number {
  return ptToMm(TRANSFER_LIST_FONT.head * safeScale(scale)) * 2.3;
}

export type TransferListFont = 'body' | 'mono';
export type TransferListStyle = 'normal' | 'bold';

/** Ancho en mm de un texto con esa letra y tamaño (en puntos, SIN escalar: la escala la pone quien mide). */
export type TransferListMeasure = (
  text: string,
  font: TransferListFont,
  style: TransferListStyle,
  sizePt: number,
) => number;

export interface TransferListItem {
  productCode?: string | null;
  productName?: string | null;
  quantity: number;
  lotNumber?: string | null;
  expirationDate?: string | null;
}

export interface TransferListColumns {
  /** x del número de renglón. */
  indexX: number;
  /** x de la clave. */
  codeX: number;
  /** x del nombre del producto y ancho disponible para envolverlo. */
  nameX: number;
  nameWidth: number;
  /** Borde derecho de la cantidad (va alineada a la derecha, como números). */
  qtyRight: number;
  /** ¿Algún producto trae lote o caducidad? Si no, esas columnas no se imprimen. */
  showLots: boolean;
  lotX: number | null;
  expirationX: number | null;
}

/** Guion de "sin dato" (igual que en el PDF). */
export const TRANSFER_EMPTY = '—';

const GAP = 4;
/** El nombre nunca queda con menos de esto, aunque las claves o los lotes sean muy largos. */
const MIN_NAME_WIDTH = 45;

/**
 * Reparte el ancho de la tabla según lo que trae el traspaso. Las columnas van de izquierda a
 * derecha y cada una mide lo que su texto más ancho (o su encabezado). La del nombre mide lo
 * que el nombre más largo, hasta donde alcance la hoja (lo que no quepa se envuelve): así la
 * cantidad queda PEGADA a los nombres y no al otro extremo de la hoja, que es donde el ojo se
 * pierde de renglón al surtir.
 */
export function transferListColumns(
  items: readonly TransferListItem[],
  measure: TransferListMeasure,
  bounds: { left: number; right: number },
): TransferListColumns {
  const { left, right } = bounds;
  const F = TRANSFER_LIST_FONT;
  const widest = (texts: string[], font: TransferListFont, style: TransferListStyle, size: number) =>
    texts.reduce((max, t) => Math.max(max, measure(t, font, style, size)), 0);
  const head = (label: string) => measure(label, 'body', 'bold', F.head);

  const indexX = left + 1.5;
  const indexW = Math.max(measure(String(Math.max(items.length, 1)), 'mono', 'normal', F.index), head('#'));
  const codeX = indexX + indexW + 3;
  const codeW = Math.max(
    widest(
      items.map((i) => i.productCode || TRANSFER_EMPTY),
      'mono',
      'normal',
      F.row,
    ),
    head('CÓDIGO'),
  );
  const nameX = codeX + codeW + GAP;

  const qtyW = Math.max(
    widest(
      items.map((i) => String(i.quantity)),
      'mono',
      'bold',
      F.quantity,
    ),
    head('CANT.'),
  );
  const showLots = items.some((i) => !!i.lotNumber || !!i.expirationDate);
  const lotW = showLots
    ? Math.max(
        widest(
          items.map((i) => i.lotNumber || TRANSFER_EMPTY),
          'mono',
          'normal',
          F.extra,
        ),
        head('LOTE'),
      )
    : 0;
  const expW = showLots
    ? Math.max(
        widest(
          items.map((i) => i.expirationDate || TRANSFER_EMPTY),
          'mono',
          'normal',
          F.extra,
        ),
        head('CAD'),
      )
    : 0;
  // Lo que ocupa todo lo que va a la derecha del nombre.
  const afterName = GAP + qtyW + (showLots ? GAP + 1 + lotW + GAP + expW : 0) + 2;
  const available = right - afterName - nameX;
  const widestName = Math.max(
    widest(
      items.map((i) => i.productName || TRANSFER_EMPTY),
      'body',
      'normal',
      F.row,
    ),
    head('PRODUCTO'),
  );
  // Si las claves o los lotes son tan largos que casi no dejan lugar, el nombre conserva un
  // mínimo (se envuelve en más renglones).
  const nameWidth = Math.max(MIN_NAME_WIDTH, Math.min(available, widestName));
  const qtyRight = nameX + nameWidth + GAP + qtyW;
  const lotX = showLots ? qtyRight + GAP + 1 : null;
  const expirationX = lotX !== null ? lotX + lotW + GAP : null;
  return { indexX, codeX, nameX, nameWidth, qtyRight, showLots, lotX, expirationX };
}

export interface TransferListRowPlan {
  /** Página (0 = la que ya traía el documento). */
  page: number;
  /** Borde superior del renglón en esa página, en mm. */
  top: number;
  height: number;
}

/**
 * Acomoda los renglones en páginas: ninguno se parte, y en cada página nueva la tabla vuelve a
 * empezar con su encabezado de columnas (`headHeight`).
 */
export function planTransferListRows(
  rowHeights: readonly number[],
  page: { firstTop: number; nextTop: number; bottom: number; headHeight: number },
): { rows: TransferListRowPlan[]; endPage: number; endY: number } {
  const rows: TransferListRowPlan[] = [];
  let current = 0;
  let y = page.firstTop;
  for (const height of rowHeights) {
    if (y + height > page.bottom && y > (current === 0 ? page.firstTop : page.nextTop + page.headHeight)) {
      current += 1;
      y = page.nextTop + page.headHeight;
    }
    rows.push({ page: current, top: y, height });
    y += height;
  }
  return { rows, endPage: current, endY: y };
}
