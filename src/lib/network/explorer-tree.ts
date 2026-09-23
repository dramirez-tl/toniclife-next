// explorer-tree.ts — Estado PURO del explorador por líneas de "Mi red"
// (contrato /distribuidor/red §3.2 y §5.4). Los hijos llegan por
// GET network/children (lazy, 50 por página); aquí solo se decide qué está
// abierto, en qué orden se pinta y cuándo se topa el explorador:
// - Máximo MAX_VISIBLE_DEPTH (4) niveles bajo la raíz del explorador; después
//   la fila ofrece "Abrir esta línea" (reroot).
// - Tope MAX_OPEN_NODES (500) nodos cargados a la vez (`explorer.limitNotice`).
// - "Abrir todo este nivel" pide `parents=` con ≤ MAX_PARENTS (50) padres.
// Sin React ni fetch: cada función devuelve un estado NUEVO (inmutable).

import type { NetworkBreadcrumbItem, NetworkChild } from '@/types/network';

export const MAX_OPEN_NODES = 500;
export const MAX_VISIBLE_DEPTH = 4;
export const MAX_PARENTS = 50;
/** Raíz = mi propio nodo (valor de `parent=` del API). */
export const ROOT_ME = 'me';

export interface ExplorerRoot {
  /** 'me' o memberId del socio raíz ("Abrir esta línea"). */
  memberId: string;
  /** Nivel relativo a mí (0 = yo). */
  level: number;
  fullName: string | null;
  /** Migas de mi nodo (excluido) hasta la raíz (incluida), como las da el servidor. */
  breadcrumb: NetworkBreadcrumbItem[];
}

export interface ExplorerState {
  root: ExplorerRoot;
  /** memberId → nodo cargado. */
  nodes: Record<string, NetworkChild>;
  /** memberId del hijo → clave del padre bajo la que se insertó ('me' o memberId). */
  parentOf: Record<string, string>;
  /** Padre ('me' o memberId) → hijos cargados, en el orden del servidor (por número). */
  childrenOf: Record<string, string[]>;
  /** Padre → total de hijos según el servidor (children_count). */
  totalOf: Record<string, number>;
  /** Padres desplegados. */
  expanded: Record<string, true>;
}

export interface ExplorerRow {
  node: NetworkChild;
  /** Profundidad bajo la raíz del explorador (1 = hijo directo de la raíz). */
  depth: number;
  expanded: boolean;
  /** Ya se pidieron sus hijos al menos una vez. */
  loaded: boolean;
  loadedCount: number;
  /** Total de hijos (children_count del nodo, o el total del servidor si ya se cargó). */
  total: number;
  /** Tiene hijos y aún cabe un nivel más (no rebasa MAX_VISIBLE_DEPTH). */
  canExpand: boolean;
  /** Tiene hijos pero está en el último nivel visible: ofrecer "Abrir esta línea". */
  mustOpenLine: boolean;
}

export type ExpandBlock = 'unknown' | 'leaf' | 'depth' | 'limit';

export interface InsertResult {
  state: ExplorerState;
  /** Nodos nuevos que sí entraron. */
  inserted: number;
  /** Se alcanzó MAX_OPEN_NODES y quedaron filas fuera. */
  limited: boolean;
  /** Motivo por el que no se insertó nada (null = ok). */
  blocked: 'depth' | 'unknownParent' | null;
}

export function createExplorer(root: Partial<ExplorerRoot> = {}): ExplorerState {
  return {
    root: {
      memberId: root.memberId ?? ROOT_ME,
      level: root.level ?? 0,
      fullName: root.fullName ?? null,
      breadcrumb: root.breadcrumb ?? [],
    },
    nodes: {},
    parentOf: {},
    childrenOf: {},
    totalOf: {},
    expanded: {},
  };
}

export function isRoot(state: ExplorerState, id: string): boolean {
  return id === state.root.memberId;
}

export function openCount(state: ExplorerState): number {
  return Object.keys(state.nodes).length;
}

/** Profundidad bajo la raíz: 0 = raíz, 1 = hijo directo…; -1 si no está cargado. */
export function depthOf(state: ExplorerState, id: string): number {
  if (isRoot(state, id)) return 0;
  let depth = 0;
  let current: string | undefined = id;
  const seen = new Set<string>();
  while (current !== undefined && !isRoot(state, current)) {
    if (!state.nodes[current] || seen.has(current)) return -1;
    seen.add(current);
    depth += 1;
    current = state.parentOf[current];
  }
  return current === undefined ? -1 : depth;
}

/** Actualiza la raíz con lo que devuelve el servidor (`parent` y `breadcrumb` de network/children). */
export function withRootInfo(
  state: ExplorerState,
  parent: { memberId: string; fullName: string; level: number },
  breadcrumb: NetworkBreadcrumbItem[],
): ExplorerState {
  if (!isRoot(state, ROOT_ME) && parent.memberId !== state.root.memberId) return state;
  return {
    ...state,
    root: { ...state.root, level: parent.level, fullName: parent.fullName, breadcrumb: [...breadcrumb] },
  };
}

function descendantsOf(state: ExplorerState, parentId: string): string[] {
  const out: string[] = [];
  const stack = [...(state.childrenOf[parentId] ?? [])];
  while (stack.length) {
    const id = stack.pop() as string;
    out.push(id);
    const kids = state.childrenOf[id];
    if (kids) stack.push(...kids);
  }
  return out;
}

function removeDescendants(state: ExplorerState, parentId: string): ExplorerState {
  const gone = descendantsOf(state, parentId);
  if (!gone.length) return state;
  const nodes = { ...state.nodes };
  const parentOf = { ...state.parentOf };
  const childrenOf = { ...state.childrenOf };
  const totalOf = { ...state.totalOf };
  const expanded = { ...state.expanded };
  for (const id of gone) {
    delete nodes[id];
    delete parentOf[id];
    delete childrenOf[id];
    delete totalOf[id];
    delete expanded[id];
  }
  delete childrenOf[parentId];
  return { ...state, nodes, parentOf, childrenOf, totalOf, expanded };
}

/**
 * Inserta (o reemplaza) los hijos de `parentId`. `append` agrega una página más
 * ("Mostrar N más"); `replace` descarta lo que hubiera bajo ese padre. Respeta
 * MAX_OPEN_NODES: las filas que no caben se dejan fuera (`limited`).
 */
export function insertChildren(
  state: ExplorerState,
  parentId: string,
  rows: NetworkChild[],
  total: number,
  mode: 'append' | 'replace' = 'append',
): InsertResult {
  if (!isRoot(state, parentId) && !state.nodes[parentId]) {
    return { state, inserted: 0, limited: false, blocked: 'unknownParent' };
  }
  const parentDepth = depthOf(state, parentId);
  if (parentDepth < 0 || parentDepth >= MAX_VISIBLE_DEPTH) {
    return { state, inserted: 0, limited: false, blocked: 'depth' };
  }

  const base = mode === 'replace' ? removeDescendants(state, parentId) : state;
  const nodes = { ...base.nodes };
  const parentOf = { ...base.parentOf };
  const existing = base.childrenOf[parentId] ?? [];
  const order = [...existing];
  const present = new Set(existing);
  let room = MAX_OPEN_NODES - openCount(base);
  let inserted = 0;
  let limited = false;

  for (const row of rows) {
    if (present.has(row.memberId)) {
      nodes[row.memberId] = row; // refresco en sitio, no cuenta contra el tope
      continue;
    }
    if (nodes[row.memberId]) continue; // ya cargado bajo otro padre (no debería pasar)
    if (room <= 0) {
      limited = true;
      break;
    }
    nodes[row.memberId] = row;
    parentOf[row.memberId] = parentId;
    order.push(row.memberId);
    present.add(row.memberId);
    room -= 1;
    inserted += 1;
  }

  return {
    state: {
      ...base,
      nodes,
      parentOf,
      childrenOf: { ...base.childrenOf, [parentId]: order },
      totalOf: { ...base.totalOf, [parentId]: Math.max(0, Math.floor(total)) },
      expanded: { ...base.expanded, [parentId]: true },
    },
    inserted,
    limited,
    blocked: null,
  };
}

/** Cierra un padre y descarta todo lo cargado debajo (libera cupo del tope). */
export function collapse(state: ExplorerState, parentId: string): ExplorerState {
  const cleared = removeDescendants(state, parentId);
  const expanded = { ...cleared.expanded };
  delete expanded[parentId];
  const totalOf = { ...cleared.totalOf };
  delete totalOf[parentId];
  return { ...cleared, expanded, totalOf };
}

/** Migas: las del servidor hasta la raíz + la cadena cargada desde la raíz hasta `id` (incluido). */
export function breadcrumb(state: ExplorerState, id?: string): NetworkBreadcrumbItem[] {
  const base = [...state.root.breadcrumb];
  if (!id || isRoot(state, id) || depthOf(state, id) < 0) return base;
  const chain: NetworkBreadcrumbItem[] = [];
  let current: string | undefined = id;
  while (current !== undefined && !isRoot(state, current)) {
    const node: NetworkChild = state.nodes[current];
    chain.unshift({ memberId: node.memberId, fullName: node.fullName, level: node.level });
    current = state.parentOf[current];
  }
  return [...base, ...chain];
}

/**
 * Re-enraíza el explorador ("Abrir esta línea"): estado limpio con la nueva
 * raíz. Si `target` es un memberId cargado, sus migas se arman desde el estado
 * actual (el servidor las confirmará con withRootInfo); si no, se pasa la raíz completa.
 */
export function reroot(state: ExplorerState, target: string | ExplorerRoot): ExplorerState {
  if (typeof target !== 'string') return createExplorer(target);
  if (target === ROOT_ME) return createExplorer();
  const node = state.nodes[target];
  if (!node) return createExplorer({ memberId: target });
  return createExplorer({
    memberId: target,
    level: node.level,
    fullName: node.fullName,
    breadcrumb: breadcrumb(state, target),
  });
}

/** ¿Se puede desplegar `id` aquí mismo? */
export function canExpand(state: ExplorerState, id: string): { ok: boolean; reason: ExpandBlock | null } {
  const node = state.nodes[id];
  if (!node) return { ok: false, reason: 'unknown' };
  if (node.childrenCount <= 0) return { ok: false, reason: 'leaf' };
  if (depthOf(state, id) >= MAX_VISIBLE_DEPTH) return { ok: false, reason: 'depth' };
  if (state.childrenOf[id] === undefined && openCount(state) >= MAX_OPEN_NODES) return { ok: false, reason: 'limit' };
  return { ok: true, reason: null };
}

/** Filas visibles en orden de pintado (DFS: cada padre seguido de sus hijos desplegados). */
export function visibleRows(state: ExplorerState): ExplorerRow[] {
  const rows: ExplorerRow[] = [];
  const walk = (parentId: string, depth: number) => {
    for (const id of state.childrenOf[parentId] ?? []) {
      const node = state.nodes[id];
      if (!node) continue;
      const loaded = state.childrenOf[id] !== undefined;
      const hasChildren = node.childrenCount > 0;
      const atLimit = depth >= MAX_VISIBLE_DEPTH;
      const expanded = Boolean(state.expanded[id]);
      rows.push({
        node,
        depth,
        expanded,
        loaded,
        loadedCount: state.childrenOf[id]?.length ?? 0,
        total: loaded ? (state.totalOf[id] ?? node.childrenCount) : node.childrenCount,
        canExpand: hasChildren && !atLimit,
        mustOpenLine: hasChildren && atLimit,
      });
      if (expanded && !atLimit) walk(id, depth + 1);
    }
  };
  walk(state.root.memberId, 1);
  return rows;
}

/**
 * Padres para "Abrir todo este nivel": nodos visibles a `depth` con hijos, aún
 * sin cargar y que todavía pueden desplegarse; ≤ MAX_PARENTS (el API rechaza más).
 */
export function parentsOfLevel(state: ExplorerState, depth: number): string[] {
  return visibleRows(state)
    .filter((row) => row.depth === depth && row.canExpand && !row.loaded)
    .map((row) => row.node.memberId)
    .slice(0, MAX_PARENTS);
}

/** Hijos que faltan por cargar bajo un padre ("Mostrar N más"). */
export function remainingOf(state: ExplorerState, parentId: string): number {
  const total = state.totalOf[parentId] ?? state.nodes[parentId]?.childrenCount ?? 0;
  return Math.max(0, total - (state.childrenOf[parentId]?.length ?? 0));
}
