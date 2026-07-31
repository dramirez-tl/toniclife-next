/**
 * Arma las opciones de los selectores jerárquicos del módulo de activos
 * (categorías y ubicaciones).
 *
 * Por qué existe: categorías y ubicaciones son árboles y hay dos pantallas que
 * los pintan (alta/edición y asignación). Cuando cada una armaba sus opciones
 * por su cuenta se desincronizaban; aquí la regla se escribe una vez.
 *
 * La regla: cada raíz se vuelve un encabezado y sus descendientes cuelgan
 * debajo. Antes el padre se repetía en cada renglón, así que "Corporativo
 * Irapuato" aparecía 16 veces y la lista se leía plana, sin que se notara que
 * eran departamentos de un mismo sitio.
 */

import type { SearchableSelectOption } from '@/components/ui/SearchableSelect';

/** Lo mínimo que necesita un nodo para armarse en árbol. */
export interface TreeLike {
  id: string;
  name: string;
  parentId: string | null;
  parentName: string | null;
}

/**
 * Aplana el árbol en el orden raíz → hijas → nietas, marcando cada bloque con
 * el encabezado de su raíz.
 *
 * Se respeta el orden en que vienen los nodos: la API ya los manda por
 * `sort_order`, y reordenar aquí rompería ese criterio.
 */
export function groupByRoot<T extends TreeLike>(
  nodes: T[],
  headingFor: (root: T) => string,
): SearchableSelectOption[] {
  const byId = new Map(nodes.map((n) => [n.id, n]));

  // Un nodo cuyo padre no vino en la lista cuenta como raíz: si no, al filtrar
  // (por ejemplo las ubicaciones de una sola sucursal) sus hijas desaparecen.
  const isRoot = (n: T) => !n.parentId || !byId.has(n.parentId);

  const childrenOf = new Map<string, T[]>();
  for (const n of nodes) {
    if (isRoot(n)) continue;
    const siblings = childrenOf.get(n.parentId!);
    if (siblings) siblings.push(n);
    else childrenOf.set(n.parentId!, [n]);
  }

  const out: SearchableSelectOption[] = [];
  const emitted = new Set<string>();

  const emit = (node: T, heading: string, depth: number) => {
    // Corta ciclos: un padre mal capturado no debe colgar el navegador.
    if (emitted.has(node.id)) return;
    emitted.add(node.id);
    out.push({
      value: node.id,
      label: node.name,
      group: heading,
      // Del tercer nivel en adelante el encabezado ya no dice quién es el
      // padre inmediato, así que ese dato baja a la segunda línea. Con los
      // árboles de dos niveles que hay hoy esto no se activa.
      hint: depth >= 2 ? (node.parentName ?? undefined) : undefined,
    });
    for (const child of childrenOf.get(node.id) ?? []) {
      emit(child, heading, depth + 1);
    }
  };

  for (const node of nodes) {
    if (isRoot(node)) emit(node, headingFor(node), 0);
  }

  // Red de seguridad: nada se pierde por un ciclo en los datos.
  for (const node of nodes) {
    if (emitted.has(node.id)) continue;
    out.push({
      value: node.id,
      label: node.name,
      hint: node.parentName ?? undefined,
    });
  }

  return out;
}
