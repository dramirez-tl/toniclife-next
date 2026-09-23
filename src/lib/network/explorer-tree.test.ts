import { describe, expect, it } from 'vitest';
import type { NetworkChild } from '@/types/network';
import {
  MAX_OPEN_NODES,
  MAX_PARENTS,
  MAX_VISIBLE_DEPTH,
  ROOT_ME,
  breadcrumb,
  canExpand,
  collapse,
  createExplorer,
  depthOf,
  insertChildren,
  openCount,
  parentsOfLevel,
  remainingOf,
  reroot,
  visibleRows,
  withRootInfo,
} from './explorer-tree';

const child = (memberId: string, parentMemberId: string, level: number, childrenCount = 0): NetworkChild => ({
  memberId,
  parentMemberId,
  customerId: `c-${memberId}`,
  customerNumber: memberId.replace(/\D/g, '') || null,
  fullName: `Socio ${memberId}`,
  countryCode: 'MX',
  status: 'active',
  rankName: null,
  rankNumber: null,
  personalPoints: 0,
  groupPoints: 0,
  isQualified: false,
  activity: 'none',
  atRisk: false,
  toQualify: false,
  isNew: false,
  joinDate: null,
  childrenCount,
  subtreeCount: null,
  level,
});

const many = (prefix: string, n: number, parent: string, level: number, childrenCount = 0) =>
  Array.from({ length: n }, (_, i) => child(`${prefix}${i + 1}`, parent, level, childrenCount));

describe('createExplorer / withRootInfo', () => {
  it('raíz por defecto = yo, sin nodos', () => {
    const s = createExplorer();
    expect(s.root).toEqual({ memberId: ROOT_ME, level: 0, fullName: null, breadcrumb: [] });
    expect(openCount(s)).toBe(0);
    expect(visibleRows(s)).toEqual([]);
    expect(breadcrumb(s)).toEqual([]);
  });

  it('withRootInfo toma nombre, nivel y migas del servidor', () => {
    const s = withRootInfo(createExplorer({ memberId: 'b' }), { memberId: 'b', fullName: 'Beatriz', level: 2 }, [
      { memberId: 'a', fullName: 'Ana', level: 1 },
      { memberId: 'b', fullName: 'Beatriz', level: 2 },
    ]);
    expect(s.root.fullName).toBe('Beatriz');
    expect(s.root.level).toBe(2);
    expect(breadcrumb(s)).toHaveLength(2);
    // Con raíz 'me' el servidor manda mi propio nodo: también se acepta.
    const me = withRootInfo(createExplorer(), { memberId: 'me-uuid', fullName: 'Yo', level: 0 }, []);
    expect(me.root.fullName).toBe('Yo');
    // Un parent ajeno a la raíz actual se ignora.
    const other = withRootInfo(s, { memberId: 'z', fullName: 'Otro', level: 9 }, []);
    expect(other).toBe(s);
  });
});

describe('insertChildren', () => {
  it('inserta bajo la raíz en el orden del servidor y despliega', () => {
    const r = insertChildren(createExplorer(), ROOT_ME, many('a', 3, 'me-uuid', 1, 1), 3);
    expect(r).toMatchObject({ inserted: 3, limited: false, blocked: null });
    expect(r.state.childrenOf[ROOT_ME]).toEqual(['a1', 'a2', 'a3']);
    expect(r.state.expanded[ROOT_ME]).toBe(true);
    expect(r.state.totalOf[ROOT_ME]).toBe(3);
    expect(visibleRows(r.state).map((row) => [row.node.memberId, row.depth])).toEqual([
      ['a1', 1],
      ['a2', 1],
      ['a3', 1],
    ]);
  });

  it('append suma páginas sin duplicar; replace descarta lo anterior', () => {
    let s = insertChildren(createExplorer(), ROOT_ME, many('a', 2, 'me', 1), 4).state;
    s = insertChildren(s, ROOT_ME, [child('a2', 'me', 1), child('a3', 'me', 1), child('a4', 'me', 1)], 4).state;
    expect(s.childrenOf[ROOT_ME]).toEqual(['a1', 'a2', 'a3', 'a4']);
    expect(openCount(s)).toBe(4);
    expect(remainingOf(s, ROOT_ME)).toBe(0);
    const replaced = insertChildren(s, ROOT_ME, [child('z1', 'me', 1)], 1, 'replace').state;
    expect(replaced.childrenOf[ROOT_ME]).toEqual(['z1']);
    expect(openCount(replaced)).toBe(1);
  });

  it('padre desconocido ⇒ blocked unknownParent', () => {
    const r = insertChildren(createExplorer(), 'nadie', many('x', 2, 'nadie', 1), 2);
    expect(r.blocked).toBe('unknownParent');
    expect(r.inserted).toBe(0);
  });

  it('tope de 500 nodos abiertos respetado (limited) y canExpand avisa limit', () => {
    const r = insertChildren(createExplorer(), ROOT_ME, many('n', 600, 'me', 1, 3), 600);
    expect(r.inserted).toBe(MAX_OPEN_NODES);
    expect(r.limited).toBe(true);
    expect(openCount(r.state)).toBe(500);
    expect(remainingOf(r.state, ROOT_ME)).toBe(100);
    // Ya no cabe nada más bajo ningún nodo.
    const more = insertChildren(r.state, 'n1', many('m', 2, 'n1', 2), 2);
    expect(more.inserted).toBe(0);
    expect(more.limited).toBe(true);
    expect(canExpand(r.state, 'n1')).toEqual({ ok: false, reason: 'limit' });
    // Colapsar libera cupo.
    const freed = collapse(r.state, ROOT_ME);
    expect(openCount(freed)).toBe(0);
  });
});

describe('profundidad máxima visible', () => {
  const chain = () => {
    let s = createExplorer();
    let parent = ROOT_ME;
    for (let depth = 1; depth <= MAX_VISIBLE_DEPTH; depth += 1) {
      const id = `d${depth}`;
      s = insertChildren(s, parent, [child(id, parent, depth, 1)], 1).state;
      parent = id;
    }
    return s;
  };

  it('4 niveles abren; el 5.º pide "Abrir esta línea"', () => {
    const s = chain();
    expect(depthOf(s, 'd4')).toBe(4);
    const rows = visibleRows(s);
    expect(rows.map((r) => r.depth)).toEqual([1, 2, 3, 4]);
    const last = rows[3];
    expect(last.canExpand).toBe(false);
    expect(last.mustOpenLine).toBe(true);
    expect(rows[2].canExpand).toBe(true);
    expect(canExpand(s, 'd4')).toEqual({ ok: false, reason: 'depth' });
    const blocked = insertChildren(s, 'd4', [child('d5', 'd4', 5)], 1);
    expect(blocked.blocked).toBe('depth');
    expect(blocked.state).toBe(s);
  });

  it('reroot limpia y conserva migas por profundidad', () => {
    const s = chain();
    expect(breadcrumb(s, 'd3').map((b) => [b.memberId, b.level])).toEqual([
      ['d1', 1],
      ['d2', 2],
      ['d3', 3],
    ]);
    const r = reroot(s, 'd4');
    expect(openCount(r)).toBe(0);
    expect(r.root.memberId).toBe('d4');
    expect(r.root.level).toBe(4);
    expect(r.root.fullName).toBe('Socio d4');
    expect(r.root.breadcrumb.map((b) => b.memberId)).toEqual(['d1', 'd2', 'd3', 'd4']);
    // Las migas de la nueva raíz se anteponen a lo que se cargue después.
    const deeper = insertChildren(r, 'd4', [child('e1', 'd4', 5, 0)], 1).state;
    expect(breadcrumb(deeper, 'e1').map((b) => b.memberId)).toEqual(['d1', 'd2', 'd3', 'd4', 'e1']);
    expect(depthOf(deeper, 'e1')).toBe(1);
    // Volver a mí.
    expect(reroot(deeper, ROOT_ME).root).toEqual(createExplorer().root);
    // Raíz completa dada por quien llama (deep-link bajo=).
    const given = reroot(deeper, { memberId: 'q', level: 7, fullName: 'Q', breadcrumb: [] });
    expect(given.root.memberId).toBe('q');
    expect(reroot(deeper, 'desconocido').root.memberId).toBe('desconocido');
  });
});

describe('collapse', () => {
  it('quita descendientes y deja hermanos y al propio padre', () => {
    let s = insertChildren(createExplorer(), ROOT_ME, many('a', 2, 'me', 1, 2), 2).state;
    s = insertChildren(s, 'a1', many('b', 2, 'a1', 2, 1), 2).state;
    s = insertChildren(s, 'b1', many('c', 1, 'b1', 3), 1).state;
    expect(openCount(s)).toBe(5);
    const c = collapse(s, 'a1');
    expect(openCount(c)).toBe(2);
    expect(c.nodes.a1).toBeDefined();
    expect(c.nodes.a2).toBeDefined();
    expect(c.childrenOf.a1).toBeUndefined();
    expect(c.expanded.a1).toBeUndefined();
    expect(c.totalOf.a1).toBeUndefined();
    expect(visibleRows(c).map((r) => r.node.memberId)).toEqual(['a1', 'a2']);
    // Colapsar algo sin hijos cargados no rompe.
    expect(openCount(collapse(c, 'a2'))).toBe(2);
  });

  it('cerrar un padre oculta a sus hijos aunque sigan cargados (expanded)', () => {
    let s = insertChildren(createExplorer(), ROOT_ME, many('a', 1, 'me', 1, 1), 1).state;
    s = insertChildren(s, 'a1', many('b', 1, 'a1', 2), 1).state;
    const hidden = { ...s, expanded: { ...s.expanded } };
    delete hidden.expanded.a1;
    expect(visibleRows(hidden).map((r) => r.node.memberId)).toEqual(['a1']);
    expect(visibleRows(hidden)[0]).toMatchObject({ loaded: true, loadedCount: 1, total: 1, expanded: false });
  });
});

describe('parentsOfLevel', () => {
  it('solo padres visibles con hijos, sin cargar, ≤ 50', () => {
    let s = insertChildren(createExplorer(), ROOT_ME, many('a', 80, 'me', 1, 1), 80).state;
    // a1 ya cargado, a2 es hoja.
    s = insertChildren(s, 'a1', many('b', 1, 'a1', 2), 1).state;
    s = { ...s, nodes: { ...s.nodes, a2: child('a2', 'me', 1, 0) } };
    const parents = parentsOfLevel(s, 1);
    expect(parents).toHaveLength(MAX_PARENTS);
    expect(parents).not.toContain('a1');
    expect(parents).not.toContain('a2');
    expect(parents[0]).toBe('a3');
    expect(parentsOfLevel(s, 2)).toEqual([]);
    expect(parentsOfLevel(s, 9)).toEqual([]);
  });

  it('en el último nivel visible no hay padres que abrir', () => {
    let s = createExplorer();
    let parent = ROOT_ME;
    for (let depth = 1; depth <= MAX_VISIBLE_DEPTH; depth += 1) {
      s = insertChildren(s, parent, many(`l${depth}-`, 2, parent, depth, 2), 2).state;
      parent = `l${depth}-1`;
    }
    expect(parentsOfLevel(s, MAX_VISIBLE_DEPTH)).toEqual([]);
    expect(parentsOfLevel(s, 3)).toEqual(['l3-2']);
  });
});

describe('canExpand', () => {
  it('desconocido, hoja y ok', () => {
    const s = insertChildren(createExplorer(), ROOT_ME, [child('a1', 'me', 1, 0), child('a2', 'me', 1, 5)], 2).state;
    expect(canExpand(s, 'x')).toEqual({ ok: false, reason: 'unknown' });
    expect(canExpand(s, 'a1')).toEqual({ ok: false, reason: 'leaf' });
    expect(canExpand(s, 'a2')).toEqual({ ok: true, reason: null });
    expect(remainingOf(s, 'a2')).toBe(5);
  });
});
