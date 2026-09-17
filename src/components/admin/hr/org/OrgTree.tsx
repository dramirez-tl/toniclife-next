'use client';

// OrgTree - El árbol de arriba hacia abajo, con conectores de CSS puro.
//
// No se usa ninguna librería de diagramas: cada rama es una columna centrada
// (`.org-branch`) y la fila de hijos (`.org-kids`) dibuja los conectores con
// pseudo-elementos de 1px. El primero y el último hijo recortan la línea
// horizontal a la mitad para que el trazo nazca y muera en el centro de las
// tarjetas de los extremos.
//
// En pantallas chicas (< md) el árbol NO se encoge: se convierte en una lista
// indentada con los mismos nodos colapsables, que es lo único legible con el
// pulgar.

import { OrgNodeCard } from './OrgNodeCard';
import { flattenOrgTree, type OrgNode } from './org-utils';

export interface OrgTreeProps {
  roots: OrgNode[];
  /** Nodos cerrados a mano. */
  collapsed: Set<string>;
  /** Ancestros de una coincidencia: se abren aunque estén colapsados. */
  forcedOpen: Set<string>;
  highlighted: Set<string>;
  selectedId: string | null;
  /** 0.5 – 1.5 (la barra lo limita). */
  zoom: number;
  /** 'tree' = diagrama; 'list' = lista indentada (móvil). */
  variant: 'tree' | 'list';
  onToggle: (nodeId: string) => void;
  onSelect: (node: OrgNode) => void;
  onOpenEmployee: (employeeId: string) => void;
}

export function OrgTree({
  roots,
  collapsed,
  forcedOpen,
  highlighted,
  selectedId,
  zoom,
  variant,
  onToggle,
  onSelect,
  onOpenEmployee,
}: OrgTreeProps) {
  const isOpen = (node: OrgNode) => !collapsed.has(node.id) || forcedOpen.has(node.id);

  const cardProps = (node: OrgNode) => {
    const employeeId = node.employee?.id;
    return {
      node,
      selected: selectedId === node.id,
      highlighted: highlighted.has(node.id),
      collapsed: !isOpen(node),
      onSelect: () => onSelect(node),
      onToggle: () => onToggle(node.id),
      onOpen: employeeId ? () => onOpenEmployee(employeeId) : undefined,
    };
  };

  if (variant === 'list') {
    const flat = flattenOrgTree(roots, isOpen);
    return (
      <div className="space-y-2 rounded-xl border border-gray-200 bg-white p-3">
        {flat.map(({ node, depth }) => (
          <div
            key={node.id}
            style={{ marginLeft: depth * 14 }}
            className={depth > 0 ? 'border-l border-gray-200 pl-3' : ''}
          >
            <OrgNodeCard {...cardProps(node)} compact />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="org-scroll overflow-auto rounded-xl border border-gray-200 bg-[#FAFCFE] p-6">
      <style>{`
        .org-branch { display: inline-flex; flex-direction: column; align-items: center; }
        .org-kids { display: flex; justify-content: center; align-items: flex-start; }
        .org-kids > .org-branch { position: relative; padding: 26px 8px 0; }
        .org-kids > .org-branch::before {
          content: ''; position: absolute; top: 0; left: 50%;
          width: 1px; height: 26px; background: #cbd5e1;
        }
        .org-kids > .org-branch::after {
          content: ''; position: absolute; top: 0; left: 0; right: 0;
          height: 1px; background: #cbd5e1;
        }
        .org-kids > .org-branch:first-child::after { left: 50%; }
        .org-kids > .org-branch:last-child::after { right: 50%; }
        .org-kids > .org-branch:only-child::after { content: none; }
      `}</style>

      <div
        className="org-zoom"
        style={{
          transform: `scale(${zoom})`,
          transformOrigin: 'top left',
          // Se compensa el ancho para que la barra de desplazamiento siga el
          // tamaño REAL del árbol al alejar/acercar.
          width: `${100 / zoom}%`,
        }}
      >
        <div className="flex flex-wrap items-start gap-10">
          {roots.map((root) => (
            <TreeBranch
              key={root.id}
              node={root}
              isOpen={isOpen}
              cardProps={cardProps}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

interface TreeBranchProps {
  node: OrgNode;
  isOpen: (node: OrgNode) => boolean;
  cardProps: (node: OrgNode) => React.ComponentProps<typeof OrgNodeCard>;
}

function TreeBranch({ node, isOpen, cardProps }: TreeBranchProps) {
  const open = isOpen(node);
  return (
    <div className="org-branch">
      <OrgNodeCard {...cardProps(node)} />
      {open && node.children.length > 0 && (
        <div className="org-kids">
          {node.children.map((child) => (
            <TreeBranch key={child.id} node={child} isOpen={isOpen} cardProps={cardProps} />
          ))}
        </div>
      )}
    </div>
  );
}
