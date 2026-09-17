// org-utils.ts - Construcción del árbol del organigrama, búsqueda y CSV.
//
// El API (GET /hr/org/chart) devuelve las piezas planas: países con su
// Director General, departamentos con jefe/subjefe, sucursales y el padrón.
// Aquí se arma la jerarquía, que sale de TRES columnas distintas de la base:
//
//   countries.director_general_user_id  → un usuario por país
//   departments.head_user_id / subhead  → usuarios (no expedientes)
//   employees.supervisor_id             → otro EXPEDIENTE
//
// Como hoy faltan datos (departamentos sin país ni jefe, expedientes sin
// supervisor ni puesto), el árbol NUNCA esconde a nadie: lo que no encaja
// cuelga de un grupo con nombre propio ("Sin país asignado", "Sin
// departamento", "Sin jefe directo") para que se vea el hueco y se llene.
//
// Todo lo de este archivo es puro (sin React): recibe datos, devuelve datos.

import { csvSafe } from '@/app/admin/rrhh/hr-utils';
import { csvDateStamp, exportToCsv } from '@/lib/csv-export';
import {
  EMPLOYEE_STATUS_LABELS,
  EMPLOYMENT_TYPE_LABELS,
  type OrgChart,
  type OrgChartBranch,
  type OrgChartCountry,
  type OrgChartDepartment,
  type OrgChartEmployee,
} from '@/types/hr';

// ---------------------------------------------------------------------------
// Filtros
// ---------------------------------------------------------------------------

/** Valores especiales de los filtros: "los que NO tienen" país/departamento. */
export const NO_COUNTRY = '__sin-pais__';
export const NO_DEPARTMENT = '__sin-departamento__';

export interface OrgFilters {
  /** '' = todos; NO_COUNTRY = solo lo que no tiene país. */
  countryId: string;
  /** '' = todos; NO_DEPARTMENT = solo personas sin departamento. */
  departmentId: string;
  branchId: string;
  employmentType: string;
  /** Búsqueda libre: resalta y expande, NO recorta el árbol. */
  search: string;
}

export const EMPTY_ORG_FILTERS: OrgFilters = {
  countryId: '',
  departmentId: '',
  branchId: '',
  employmentType: '',
  search: '',
};

export function hasActiveFilters(f: OrgFilters): boolean {
  return !!(f.countryId || f.departmentId || f.branchId || f.employmentType || f.search);
}

// ---------------------------------------------------------------------------
// Nodos del árbol
// ---------------------------------------------------------------------------

export type OrgNodeKind = 'country' | 'department' | 'group' | 'employee';

export interface OrgNode {
  /** Único en el árbol: 'country:<id>', 'dept:<id>', 'emp:<id>', 'group:…'. */
  id: string;
  kind: OrgNodeKind;
  title: string;
  subtitle: string | null;
  country: OrgChartCountry | null;
  department: OrgChartDepartment | null;
  employee: OrgChartEmployee | null;
  /** Foto firmada del nodo (persona o director del país); null = iniciales. */
  photoUrl: string | null;
  /** Texto YA normalizado contra el que corre la búsqueda. */
  haystack: string;
  children: OrgNode[];
  /** Cuántos nodos cuelgan debajo (contador que se ve al colapsar). */
  descendants: number;
}

export const NO_COUNTRY_NODE_ID = `group:${NO_COUNTRY}`;
export const NO_DEPARTMENT_NODE_ID = `group:${NO_DEPARTMENT}`;

/** Quita acentos y mayúsculas: "MARÍA" y "maria" deben encontrarse igual. */
export function normalizeText(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

function countDescendants(children: OrgNode[]): number {
  return children.reduce((acc, child) => acc + 1 + child.descendants, 0);
}

function makeNode(node: Omit<OrgNode, 'descendants'>): OrgNode {
  return { ...node, descendants: countDescendants(node.children) };
}

function byName(a: OrgChartEmployee, b: OrgChartEmployee): number {
  return a.fullName.localeCompare(b.fullName, 'es');
}

// ---------------------------------------------------------------------------
// Personas: bosque por jefe directo
// ---------------------------------------------------------------------------

function personNode(
  employee: OrgChartEmployee,
  childrenBy: Map<string, OrgChartEmployee[]>,
  seen: Set<string>,
): OrgNode {
  seen.add(employee.id);
  const children = (childrenBy.get(employee.id) ?? [])
    // El guard de `seen` corta ciclos de supervisores (A jefe de B, B de A):
    // sin él la recursión no termina.
    .filter((child) => !seen.has(child.id))
    .map((child) => personNode(child, childrenBy, seen));

  return makeNode({
    id: `emp:${employee.id}`,
    kind: 'employee',
    title: employee.fullName,
    subtitle: employee.jobPositionName,
    country: null,
    department: null,
    employee,
    photoUrl: employee.photoUrl,
    haystack: normalizeText(
      [
        employee.fullName,
        employee.employeeNumber,
        employee.jobPositionName ?? '',
        employee.branchName ?? '',
      ].join(' '),
    ),
    children,
  });
}

/**
 * Arma el bosque de un conjunto de personas: cada quien cuelga de su
 * `supervisorId` si ese supervisor está en el MISMO conjunto; si no, es raíz.
 */
function buildPeopleForest(people: OrgChartEmployee[]): OrgNode[] {
  const sorted = [...people].sort(byName);
  const ids = new Set(sorted.map((e) => e.id));
  const childrenBy = new Map<string, OrgChartEmployee[]>();
  const rootsRaw: OrgChartEmployee[] = [];

  for (const employee of sorted) {
    const supervisorId = employee.supervisorId;
    if (supervisorId && supervisorId !== employee.id && ids.has(supervisorId)) {
      const list = childrenBy.get(supervisorId) ?? [];
      list.push(employee);
      childrenBy.set(supervisorId, list);
    } else {
      rootsRaw.push(employee);
    }
  }

  const seen = new Set<string>();
  const roots = rootsRaw.map((employee) => personNode(employee, childrenBy, seen));

  // Un ciclo cerrado (A→B→A) deja gente sin raíz: se promueve para que nadie
  // desaparezca del organigrama.
  for (const employee of sorted) {
    if (!seen.has(employee.id)) roots.push(personNode(employee, childrenBy, seen));
  }

  return roots;
}

// ---------------------------------------------------------------------------
// Árbol completo
// ---------------------------------------------------------------------------

function groupNode(
  id: string,
  title: string,
  subtitle: string | null,
  children: OrgNode[],
): OrgNode {
  return makeNode({
    id,
    kind: 'group',
    title,
    subtitle,
    country: null,
    department: null,
    employee: null,
    photoUrl: null,
    haystack: normalizeText(title),
    children,
  });
}

function departmentNode(
  department: OrgChartDepartment,
  people: OrgChartEmployee[],
): OrgNode {
  const forest = buildPeopleForest(people);
  const hasHead = !!department.headUserId;

  // El jefe del departamento cuelga DIRECTO del departamento; los demás sin
  // jefe directo van a un subgrupo, pero solo si hay jefe de quien colgar.
  const direct: OrgNode[] = [];
  const orphans: OrgNode[] = [];
  for (const node of forest) {
    const isHead =
      !!department.headEmployeeId && node.employee?.id === department.headEmployeeId;
    if (isHead || !hasHead) direct.push(node);
    else orphans.push(node);
  }

  const children = [...direct];
  if (orphans.length > 0) {
    children.push(
      groupNode(
        `group:dept:${department.id}:sin-jefe`,
        'Sin jefe directo',
        `${orphans.length} persona${orphans.length === 1 ? '' : 's'} sin supervisor`,
        orphans,
      ),
    );
  }

  return makeNode({
    id: `dept:${department.id}`,
    kind: 'department',
    title: department.name,
    subtitle: department.headName ?? 'Sin jefe',
    country: null,
    department,
    employee: null,
    photoUrl: null,
    haystack: normalizeText(
      [
        department.name,
        department.code,
        department.headName ?? '',
        department.subheadName ?? '',
      ].join(' '),
    ),
    children,
  });
}

/** Foto firmada de un expediente (el director del país tiene la suya). */
function photoByEmployee(chart: OrgChart, employeeId: string | null): string | null {
  if (!employeeId) return null;
  return chart.employees.find((e) => e.id === employeeId)?.photoUrl ?? null;
}

function countryNode(
  country: OrgChartCountry,
  children: OrgNode[],
  directorPhotoUrl: string | null = null,
): OrgNode {
  return makeNode({
    id: `country:${country.id}`,
    kind: 'country',
    title: country.directorName ?? 'Sin Director General',
    subtitle: country.name,
    country,
    department: null,
    employee: null,
    photoUrl: directorPhotoUrl,
    haystack: normalizeText([country.name, country.code, country.directorName ?? ''].join(' ')),
    children,
  });
}

/** Departamentos que sobreviven a los filtros de país/departamento. */
export function filterDepartments(
  departments: OrgChartDepartment[],
  filters: OrgFilters,
): OrgChartDepartment[] {
  return departments.filter((d) => {
    if (filters.departmentId === NO_DEPARTMENT) return false;
    if (filters.departmentId && d.id !== filters.departmentId) return false;
    if (filters.countryId === NO_COUNTRY) return !d.countryId;
    if (filters.countryId && d.countryId !== filters.countryId) return false;
    return true;
  });
}

/** Aplica los filtros duros (los que SÍ recortan) al padrón. */
export function filterEmployees(
  employees: OrgChartEmployee[],
  filters: OrgFilters,
  departments: OrgChartDepartment[],
): OrgChartEmployee[] {
  const countryByDepartment = new Map(departments.map((d) => [d.id, d.countryId]));
  return employees.filter((e) => {
    if (filters.branchId && e.branchId !== filters.branchId) return false;
    if (filters.employmentType && e.employmentType !== filters.employmentType) return false;
    if (filters.departmentId === NO_DEPARTMENT) return !e.departmentId;
    if (filters.departmentId && e.departmentId !== filters.departmentId) return false;
    if (filters.countryId) {
      const countryId = e.departmentId
        ? (countryByDepartment.get(e.departmentId) ?? null)
        : null;
      if (filters.countryId === NO_COUNTRY) return !countryId;
      if (countryId !== filters.countryId) return false;
    }
    return true;
  });
}

/**
 * Construye el árbol: una raíz por país (la tarjeta es su Director General),
 * los departamentos debajo y el equipo de cada departamento organizado por
 * jefe directo. Los departamentos sin país y la gente sin departamento van a
 * grupos propios AL FINAL.
 */
export function buildOrgTree(chart: OrgChart, filters: OrgFilters): OrgNode[] {
  const departments = filterDepartments(chart.departments, filters);

  const employees = filterEmployees(chart.employees, filters, chart.departments);

  // Con filtro de sucursal o de tipo se podan los departamentos que quedan sin
  // nadie: si no, la pantalla se llena de tarjetas vacías que no responden al
  // filtro. Sin esos filtros SÍ se muestran vacíos (son huecos por llenar).
  const prune = !!filters.branchId || !!filters.employmentType;

  const knownDepartments = new Set(chart.departments.map((d) => d.id));
  const peopleByDepartment = new Map<string, OrgChartEmployee[]>();
  for (const employee of employees) {
    // Un departamento desconocido (inactivo o borrado) cuenta como "sin
    // departamento": la persona no se pierde.
    const key =
      employee.departmentId && knownDepartments.has(employee.departmentId)
        ? employee.departmentId
        : NO_DEPARTMENT;
    const list = peopleByDepartment.get(key) ?? [];
    list.push(employee);
    peopleByDepartment.set(key, list);
  }

  const departmentsByCountry = new Map<string, OrgChartDepartment[]>();
  const orphanDepartments: OrgChartDepartment[] = [];
  for (const department of departments) {
    if (!department.countryId) {
      orphanDepartments.push(department);
      continue;
    }
    const list = departmentsByCountry.get(department.countryId) ?? [];
    list.push(department);
    departmentsByCountry.set(department.countryId, list);
  }

  const toDepartmentNodes = (list: OrgChartDepartment[]): OrgNode[] =>
    list
      .map((d) => departmentNode(d, peopleByDepartment.get(d.id) ?? []))
      .filter((node) => !prune || node.descendants > 0)
      .sort((a, b) => a.title.localeCompare(b.title, 'es'));

  const roots: OrgNode[] = [];

  if (filters.countryId !== NO_COUNTRY && filters.departmentId !== NO_DEPARTMENT) {
    for (const country of chart.countries) {
      if (filters.countryId && country.id !== filters.countryId) continue;
      const children = toDepartmentNodes(departmentsByCountry.get(country.id) ?? []);
      if (prune && children.length === 0) continue;
      roots.push(countryNode(country, children, photoByEmployee(chart, country.directorEmployeeId)));
    }
  }

  if (orphanDepartments.length > 0) {
    const children = toDepartmentNodes(orphanDepartments);
    if (children.length > 0) {
      roots.push(
        groupNode(
          NO_COUNTRY_NODE_ID,
          'Sin país asignado',
          `${children.length} departamento${children.length === 1 ? '' : 's'} sin país`,
          children,
        ),
      );
    }
  }

  // Gente sin departamento: solo tiene sentido mostrarla cuando el filtro de
  // país/departamento no la excluye (no cuelga de ningún país).
  const loose = peopleByDepartment.get(NO_DEPARTMENT) ?? [];
  const countryFilterHidesLoose = !!filters.countryId && filters.countryId !== NO_COUNTRY;
  const departmentFilterHidesLoose =
    !!filters.departmentId && filters.departmentId !== NO_DEPARTMENT;
  if (loose.length > 0 && !countryFilterHidesLoose && !departmentFilterHidesLoose) {
    roots.push(
      groupNode(
        NO_DEPARTMENT_NODE_ID,
        'Sin departamento',
        `${loose.length} persona${loose.length === 1 ? '' : 's'} por ubicar`,
        buildPeopleForest(loose),
      ),
    );
  }

  return roots;
}

// ---------------------------------------------------------------------------
// Búsqueda y resaltado
// ---------------------------------------------------------------------------

export interface OrgMatches {
  /** Nodos que coinciden (se pintan en ámbar). */
  matched: Set<string>;
  /** Ancestros de los que coinciden: hay que abrirlos para que se vean. */
  expand: Set<string>;
  count: number;
}

export const EMPTY_MATCHES: OrgMatches = {
  matched: new Set<string>(),
  expand: new Set<string>(),
  count: 0,
};

/** Recorre el árbol y marca los nodos que cumplen `predicate` + sus ancestros. */
export function collectMatches(
  roots: OrgNode[],
  predicate: (node: OrgNode) => boolean,
): OrgMatches {
  const matched = new Set<string>();
  const expand = new Set<string>();

  const walk = (node: OrgNode, ancestors: string[]): void => {
    if (predicate(node)) {
      matched.add(node.id);
      for (const id of ancestors) expand.add(id);
    }
    const next = [...ancestors, node.id];
    for (const child of node.children) walk(child, next);
  };

  for (const root of roots) walk(root, []);
  return { matched, expand, count: matched.size };
}

/** Coincidencias de la caja de búsqueda (nombre, número, puesto, sucursal…). */
export function searchOrgTree(roots: OrgNode[], term: string): OrgMatches {
  const needle = normalizeText(term);
  if (!needle) return EMPTY_MATCHES;
  return collectMatches(roots, (node) => node.haystack.includes(needle));
}

/** Tarjeta de resumen seleccionada: resalta los nodos con ese hueco. */
export type OrgHighlight =
  | null
  | 'sin-jefe-directo'
  | 'sin-puesto'
  | 'sin-acceso'
  | 'departamento-sin-jefe';

export function highlightMatches(roots: OrgNode[], highlight: OrgHighlight): OrgMatches {
  if (!highlight) return EMPTY_MATCHES;
  return collectMatches(roots, (node) => {
    if (highlight === 'departamento-sin-jefe') {
      return node.kind === 'department' && !node.department?.headUserId;
    }
    if (node.kind !== 'employee' || !node.employee) return false;
    if (highlight === 'sin-jefe-directo') return !node.employee.supervisorId;
    if (highlight === 'sin-puesto') return !node.employee.jobPositionId;
    return !node.employee.hasSystemAccess;
  });
}

/** Ids de todos los nodos que tienen hijos (para "Contraer todo"). */
export function collectCollapsibleIds(roots: OrgNode[]): string[] {
  const ids: string[] = [];
  const walk = (node: OrgNode): void => {
    if (node.children.length > 0) ids.push(node.id);
    for (const child of node.children) walk(child);
  };
  for (const root of roots) walk(root);
  return ids;
}

/** Busca un nodo por id dentro del árbol ya construido. */
export function findOrgNode(roots: OrgNode[], nodeId: string): OrgNode | null {
  for (const root of roots) {
    if (root.id === nodeId) return root;
    const found = findOrgNode(root.children, nodeId);
    if (found) return found;
  }
  return null;
}

/**
 * Nodo suelto (sin hijos) para la ficha cuando la selección quedó FUERA del
 * árbol visible: se selecciona a alguien desde Sucursales, o un filtro esconde
 * la rama. La ficha debe seguir mostrándose.
 */
export function standaloneOrgNode(chart: OrgChart, nodeId: string): OrgNode | null {
  const [kind, id] = [nodeId.slice(0, nodeId.indexOf(':')), nodeId.slice(nodeId.indexOf(':') + 1)];

  if (kind === 'emp') {
    const employee = chart.employees.find((e) => e.id === id);
    if (!employee) return null;
    return personNode(employee, new Map(), new Set());
  }
  if (kind === 'dept') {
    const department = chart.departments.find((d) => d.id === id);
    return department ? departmentNode(department, []) : null;
  }
  if (kind === 'country') {
    const country = chart.countries.find((c) => c.id === id);
    return country
      ? countryNode(country, [], photoByEmployee(chart, country.directorEmployeeId))
      : null;
  }
  return null;
}

export interface OrgFlatNode {
  node: OrgNode;
  depth: number;
}

/** Aplana el árbol en el orden en que se ve (lista indentada de móvil). */
export function flattenOrgTree(
  roots: OrgNode[],
  isOpen: (node: OrgNode) => boolean,
): OrgFlatNode[] {
  const out: OrgFlatNode[] = [];
  const walk = (node: OrgNode, depth: number): void => {
    out.push({ node, depth });
    if (!isOpen(node)) return;
    for (const child of node.children) walk(child, depth + 1);
  };
  for (const root of roots) walk(root, 0);
  return out;
}

// ---------------------------------------------------------------------------
// Contexto de una persona (panel de detalle)
// ---------------------------------------------------------------------------

export interface OrgChainLink {
  /** 'Jefe directo', 'Jefe de departamento', 'Director General · México'… */
  role: string;
  name: string | null;
  employeeId: string | null;
}

export interface OrgPersonContext {
  department: OrgChartDepartment | null;
  country: OrgChartCountry | null;
  supervisor: OrgChartEmployee | null;
  /** Cadena de mando completa, con los huecos incluidos (name = null). */
  chain: OrgChainLink[];
  reports: OrgChartEmployee[];
  isDepartmentHead: boolean;
  isDepartmentSubhead: boolean;
  isCountryDirector: boolean;
}

/** Todos los expedientes que cuelgan (directa o indirectamente) de `id`. */
export function descendantEmployeeIds(chart: OrgChart, id: string): Set<string> {
  const childrenBy = new Map<string, string[]>();
  for (const employee of chart.employees) {
    if (!employee.supervisorId) continue;
    const list = childrenBy.get(employee.supervisorId) ?? [];
    list.push(employee.id);
    childrenBy.set(employee.supervisorId, list);
  }

  const out = new Set<string>();
  const queue = [...(childrenBy.get(id) ?? [])];
  while (queue.length > 0) {
    const current = queue.shift() as string;
    if (out.has(current)) continue; // corta ciclos
    out.add(current);
    queue.push(...(childrenBy.get(current) ?? []));
  }
  return out;
}

export function buildPersonContext(
  chart: OrgChart,
  employee: OrgChartEmployee,
): OrgPersonContext {
  const byId = new Map(chart.employees.map((e) => [e.id, e]));
  const department = employee.departmentId
    ? (chart.departments.find((d) => d.id === employee.departmentId) ?? null)
    : null;
  const country = department?.countryId
    ? (chart.countries.find((c) => c.id === department.countryId) ?? null)
    : null;
  const supervisor = employee.supervisorId ? (byId.get(employee.supervisorId) ?? null) : null;

  // Cadena hacia arriba por supervisor, con tope y guard de ciclos.
  const chain: OrgChainLink[] = [];
  const seen = new Set<string>([employee.id]);
  let current = supervisor;
  let level = 0;
  while (current && !seen.has(current.id) && level < 10) {
    seen.add(current.id);
    chain.push({
      role: level === 0 ? 'Jefe directo' : 'Superior',
      name: current.fullName,
      employeeId: current.id,
    });
    current = current.supervisorId ? (byId.get(current.supervisorId) ?? null) : null;
    level += 1;
  }
  if (!supervisor) {
    // El hueco se MUESTRA (name = null) para invitar a llenarlo.
    chain.push({ role: 'Jefe directo', name: null, employeeId: null });
  }

  const isDepartmentHead =
    !!department &&
    ((!!department.headEmployeeId && department.headEmployeeId === employee.id) ||
      (!!employee.userId && department.headUserId === employee.userId));
  const isDepartmentSubhead =
    !!department &&
    ((!!department.subheadEmployeeId && department.subheadEmployeeId === employee.id) ||
      (!!employee.userId && department.subheadUserId === employee.userId));
  const isCountryDirector =
    !!country && !!employee.userId && country.directorUserId === employee.userId;

  if (department && !isDepartmentHead) {
    const alreadyInChain =
      !!department.headEmployeeId &&
      chain.some((link) => link.employeeId === department.headEmployeeId);
    if (!alreadyInChain) {
      chain.push({
        role: 'Jefe de departamento',
        name: department.headName,
        employeeId: department.headEmployeeId,
      });
    }
  }

  if (country && !isCountryDirector) {
    chain.push({
      role: `Director General · ${country.name}`,
      name: country.directorName,
      employeeId: country.directorEmployeeId,
    });
  }

  const reports = chart.employees.filter((e) => e.supervisorId === employee.id).sort(byName);

  return {
    department,
    country,
    supervisor,
    chain,
    reports,
    isDepartmentHead,
    isDepartmentSubhead,
    isCountryDirector,
  };
}

// ---------------------------------------------------------------------------
// Vistas auxiliares (departamentos y sucursales)
// ---------------------------------------------------------------------------

export interface OrgBranchGroup {
  branch: OrgChartBranch;
  people: OrgChartEmployee[];
}

export interface OrgBranchCountryGroup {
  countryName: string;
  branches: OrgBranchGroup[];
}

/** Sucursales CON personal, agrupadas por país (las vacías no aportan). */
export function groupByBranch(
  chart: OrgChart,
  employees: OrgChartEmployee[],
): OrgBranchCountryGroup[] {
  const peopleByBranch = new Map<string, OrgChartEmployee[]>();
  for (const employee of employees) {
    if (!employee.branchId) continue;
    const list = peopleByBranch.get(employee.branchId) ?? [];
    list.push(employee);
    peopleByBranch.set(employee.branchId, list);
  }

  const countryNames = new Map(chart.countries.map((c) => [c.id, c.name]));
  const groups = new Map<string, OrgBranchGroup[]>();
  for (const branch of chart.branches) {
    const people = peopleByBranch.get(branch.id);
    if (!people || people.length === 0) continue;
    const key = (branch.countryId && countryNames.get(branch.countryId)) || 'Sin país';
    const list = groups.get(key) ?? [];
    list.push({ branch, people: [...people].sort(byName) });
    groups.set(key, list);
  }

  return [...groups.entries()]
    .map(([countryName, branches]) => ({
      countryName,
      branches: branches.sort((a, b) => a.branch.name.localeCompare(b.branch.name, 'es')),
    }))
    .sort((a, b) => a.countryName.localeCompare(b.countryName, 'es'));
}

export interface OrgPositionGroup {
  position: string;
  people: OrgChartEmployee[];
}

/** Plantilla de un departamento agrupada por puesto (vista Departamentos). */
export function groupByJobPosition(people: OrgChartEmployee[]): OrgPositionGroup[] {
  const groups = new Map<string, OrgChartEmployee[]>();
  for (const employee of people) {
    const key = employee.jobPositionName ?? 'Sin puesto';
    const list = groups.get(key) ?? [];
    list.push(employee);
    groups.set(key, list);
  }
  return [...groups.entries()]
    .map(([position, list]) => ({ position, people: [...list].sort(byName) }))
    .sort((a, b) => {
      // "Sin puesto" siempre hasta abajo: es el hueco, no una jerarquía.
      if (a.position === 'Sin puesto') return 1;
      if (b.position === 'Sin puesto') return -1;
      return a.position.localeCompare(b.position, 'es');
    });
}

// ---------------------------------------------------------------------------
// CSV
// ---------------------------------------------------------------------------

export const ORG_CSV_HEADERS = [
  'Número',
  'Nombre',
  'Puesto',
  'Departamento',
  'Jefe directo',
  'Jefe de departamento',
  'Director del país',
  'Sucursal',
  'Tipo',
  'Acceso',
  'Estado',
];

/** Renglones del CSV (aparte de la descarga para poder inspeccionarlos). */
export function buildOrgCsvRows(
  chart: OrgChart,
  employees: OrgChartEmployee[],
): string[][] {
  const byId = new Map(chart.employees.map((e) => [e.id, e]));
  const departmentById = new Map(chart.departments.map((d) => [d.id, d]));
  const countryById = new Map(chart.countries.map((c) => [c.id, c]));

  return [...employees].sort(byName).map((employee) => {
    const department = employee.departmentId
      ? departmentById.get(employee.departmentId)
      : undefined;
    const country = department?.countryId ? countryById.get(department.countryId) : undefined;
    const supervisor = employee.supervisorId ? byId.get(employee.supervisorId) : undefined;

    return [
      csvSafe(employee.employeeNumber),
      csvSafe(employee.fullName),
      csvSafe(employee.jobPositionName ?? 'Sin puesto'),
      csvSafe(department?.name ?? 'Sin departamento'),
      csvSafe(supervisor?.fullName ?? 'Sin jefe directo'),
      csvSafe(department?.headName ?? 'Sin jefe'),
      csvSafe(country?.directorName ?? 'Sin director'),
      csvSafe(employee.branchName ?? 'Sin sucursal'),
      csvSafe(EMPLOYMENT_TYPE_LABELS[employee.employmentType] ?? employee.employmentType),
      employee.hasSystemAccess ? 'Con acceso' : 'Sin acceso',
      csvSafe(EMPLOYEE_STATUS_LABELS[employee.status] ?? employee.status),
    ];
  });
}

/** Descarga el organigrama tal como se ve (con los filtros aplicados). */
export function exportOrgChartCsv(chart: OrgChart, employees: OrgChartEmployee[]): void {
  exportToCsv(
    `organigrama-${csvDateStamp()}.csv`,
    ORG_CSV_HEADERS,
    buildOrgCsvRows(chart, employees),
  );
}
