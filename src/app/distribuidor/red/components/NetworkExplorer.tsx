'use client';

// NetworkExplorer — Pestaña "Explorar" (contrato /distribuidor/red §5.4, V6):
// hijos del nodo actual por GET network/children (50 por página, ordenados por
// número), cada uno con puntos del periodo, semáforo, riesgo, rango del periodo,
// directos y tamaño de su red (matview diaria). Abrir un nodo carga sus hijos
// (lazy) con sangría; máximo 4 niveles visibles y después "Abrir esta línea"
// (re-enraíza con migas y `bajo=`); tope 500 nodos abiertos.
//
// Sin setState dentro de efectos: la raíz llega por useNetworkChildren y las
// líneas abiertas se guardan como "entradas" (padre, página, filas) que se
// cargan en manejadores (queryClient.fetchQuery, misma clave que el hook) y se
// PLIEGAN en render con las funciones puras de lib/network/explorer-tree.ts.
// La página monta este componente con key={raíz}: cambiar de raíz limpia todo.

import { useMemo, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useLocale, useTranslations } from 'next-intl';
import { toast } from 'sonner';
import {
  ArrowPathIcon,
  ArrowRightCircleIcon,
  ChevronDownIcon,
  ChevronRightIcon,
  EllipsisHorizontalIcon,
  UserPlusIcon,
} from '@heroicons/react/24/outline';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Skeleton } from '@/components/ui/skeleton';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { useIsMobile } from '@/hooks/useIsMobile';
import { networkKeys, useNetworkChildren } from '@/hooks/useNetwork';
import { networkApi } from '@/services/networkApi';
import {
  MAX_VISIBLE_DEPTH,
  ROOT_ME,
  breadcrumb as breadcrumbOf,
  canExpand,
  createExplorer,
  insertChildren,
  remainingOf,
  visibleRows,
  withRootInfo,
  type ExplorerRow,
  type ExplorerState,
} from '@/lib/network/explorer-tree';
import { fmtDate, fmtInt, fmtPoints } from '@/lib/network/format';
import { networkErrorKey } from '@/lib/network/network-error';
import type { NetworkChild, NetworkChildrenQuery } from '@/types/network';
import type { MemberSheetContext } from './MemberSheet';
import { ActivityBadge, Avatar, RankChip } from './NetworkBadges';

const PAGE = 50;
const FIVE_MIN = 5 * 60 * 1000;

interface NetworkExplorerProps {
  /** 'me' o memberId de la línea abierta (`bajo=`). */
  rootMemberId: string;
  /** Periodo del encabezado; undefined = actual. */
  periodId?: string;
  registerMemberEnabled: boolean;
  gateMessage: string;
  onEnroll: () => void;
  /** Re-enraíza (null = volver a mí). */
  onOpenLine: (memberId: string | null) => void;
  onSeeList: (memberId: string) => void;
  /** Solo para mis directos (nivel 1). */
  onSeeVolume: (memberId: string) => void;
  onOpenMember: (customerId: string, context: MemberSheetContext) => void;
}

interface Entry {
  parentId: string;
  page: number;
  rows: NetworkChild[];
  total: number;
}

/** Ids de todo lo cargado bajo `parentId` (para cerrar una rama). */
function descendantIds(state: ExplorerState, parentId: string): string[] {
  const out: string[] = [];
  const stack = [...(state.childrenOf[parentId] ?? [])];
  while (stack.length) {
    const id = stack.pop() as string;
    out.push(id);
    stack.push(...(state.childrenOf[id] ?? []));
  }
  return out;
}

export function NetworkExplorer({
  rootMemberId,
  periodId,
  registerMemberEnabled,
  gateMessage,
  onEnroll,
  onOpenLine,
  onSeeList,
  onSeeVolume,
  onOpenMember,
}: NetworkExplorerProps) {
  const t = useTranslations('distributor.network');
  const locale = useLocale();
  const isMobile = useIsMobile();
  const queryClient = useQueryClient();

  const rootQuery: NetworkChildrenQuery = { parent: rootMemberId, periodId, page: 1, limit: PAGE };
  const { data: rootData, isLoading, isError, error, refetch } = useNetworkChildren(rootQuery);

  const [entries, setEntries] = useState<Entry[]>([]);
  const [pending, setPending] = useState<Record<string, true>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Estado del explorador PLEGADO en render: raíz (query) + entradas abiertas.
  const { state, limited } = useMemo(() => {
    let next = createExplorer({ memberId: rootMemberId });
    let wasLimited = false;
    if (rootData) {
      const inserted = insertChildren(next, rootMemberId, rootData.data, rootData.total, 'replace');
      next = withRootInfo(inserted.state, rootData.parent, rootData.breadcrumb);
      wasLimited = inserted.limited;
    }
    for (const entry of entries) {
      const inserted = insertChildren(next, entry.parentId, entry.rows, entry.total, 'append');
      next = inserted.state;
      wasLimited = wasLimited || inserted.limited;
    }
    return { state: next, limited: wasLimited };
  }, [rootMemberId, rootData, entries]);

  const rows = visibleRows(state);
  const crumbs = breadcrumbOf(state);
  const rootRemaining = rootData ? remainingOf(state, rootMemberId) : 0;
  const rootLoadedPages = 1 + entries.filter((e) => e.parentId === rootMemberId).length;

  const loadPage = (parentId: string, page: number) => {
    const query: NetworkChildrenQuery = { parent: parentId, periodId, page, limit: PAGE };
    setPending((prev) => ({ ...prev, [parentId]: true }));
    setErrors((prev) => {
      const { [parentId]: omit, ...rest } = prev;
      void omit;
      return rest;
    });
    queryClient
      .fetchQuery({ queryKey: networkKeys.children(query), queryFn: () => networkApi.getChildren(query), staleTime: FIVE_MIN })
      .then((data) => {
        setEntries((prev) => [
          ...prev.filter((e) => !(e.parentId === parentId && e.page === page)),
          { parentId, page, rows: data.data, total: data.total },
        ]);
      })
      .catch((err: unknown) => {
        setErrors((prev) => ({ ...prev, [parentId]: networkErrorKey(err) }));
      })
      .finally(() => {
        setPending((prev) => {
          const { [parentId]: omit, ...rest } = prev;
          void omit;
          return rest;
        });
      });
  };

  const expand = (row: ExplorerRow) => {
    const id = row.node.memberId;
    if (row.expanded) {
      const gone = new Set([id, ...descendantIds(state, id)]);
      setEntries((prev) => prev.filter((e) => !gone.has(e.parentId)));
      return;
    }
    const check = canExpand(state, id);
    if (!check.ok) {
      if (check.reason === 'limit') toast.info(t('explorer.limitNotice'));
      return;
    }
    loadPage(id, 1);
  };

  const contextOf = (node: NetworkChild, placedUnderName: string | null): MemberSheetContext => ({
    memberId: node.memberId,
    fullName: node.fullName,
    customerNumber: node.customerNumber,
    level: node.level,
    personalPoints: node.personalPoints,
    groupPoints: node.groupPoints,
    rankName: node.rankName,
    rankNumber: node.rankNumber,
    placedUnderName,
  });

  const parentNameOf = (row: ExplorerRow): string | null => {
    const parentId = state.parentOf[row.node.memberId];
    if (!parentId || parentId === state.root.memberId) return state.root.memberId === ROOT_ME ? null : state.root.fullName;
    return state.nodes[parentId]?.fullName ?? null;
  };

  const statsAsOf = rootData?.statsAsOf ? fmtDate(rootData.statsAsOf, locale, 'dateTime') : null;
  const indent = isMobile ? 8 : 16;
  const isMe = rootMemberId === ROOT_ME;
  const emptyRoot = Boolean(rootData) && rootData?.total === 0;
  const needsOpenLine = rows.some((r) => r.mustOpenLine);

  return (
    <Card data-tour="d-red-explorer">
      <CardContent className="p-4 lg:p-6">
        <div className="mb-3">
          <h3 className="text-lg font-bold text-gray-900">{t('explorer.title')}</h3>
          <p className="text-sm text-gray-500">{t('explorer.subtitle')}</p>
        </div>

        {/* Migas: Tú › nombre › nombre */}
        <nav className="mb-3 overflow-x-auto">
          <ol className="flex items-center gap-1 whitespace-nowrap text-sm">
            <li>
              {isMe ? (
                <span aria-current="page" className="font-semibold text-gray-900">
                  {t('explorer.breadcrumbRoot')}
                </span>
              ) : (
                <button type="button" onClick={() => onOpenLine(null)} className="font-medium text-[#3E667D] hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#3E667D]">
                  {t('explorer.breadcrumbRoot')}
                </button>
              )}
            </li>
            {crumbs.map((crumb, index) => {
              const last = index === crumbs.length - 1;
              return (
                <li key={crumb.memberId} className="flex items-center gap-1">
                  <ChevronRightIcon className="h-3.5 w-3.5 text-gray-400" aria-hidden="true" />
                  {last ? (
                    <span aria-current="page" className="font-semibold text-gray-900">
                      {crumb.fullName}
                    </span>
                  ) : (
                    <button type="button" onClick={() => onOpenLine(crumb.memberId)} className="font-medium text-[#3E667D] hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#3E667D]">
                      {crumb.fullName}
                    </button>
                  )}
                </li>
              );
            })}
          </ol>
        </nav>

        {isLoading ? (
          <div className="space-y-2" aria-busy="true">
            {[0, 1, 2].map((i) => (
              <div key={i} className="flex items-center gap-3 rounded-xl border border-gray-100 p-3">
                <Skeleton className="h-9 w-9 rounded-full bg-gray-100" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-1/3 bg-gray-100" />
                  <Skeleton className="h-3 w-1/2 bg-gray-100" />
                </div>
              </div>
            ))}
          </div>
        ) : isError ? (
          <div role="alert" className="flex flex-col items-center gap-2 rounded-xl border border-dashed border-red-200 bg-red-50/40 py-8 text-center">
            <p className="text-sm text-red-700">
              {t('explorer.error')} {t(networkErrorKey(error))}
            </p>
            <Button variant="outline" size="sm" onClick={() => void refetch()}>
              <ArrowPathIcon className="h-4 w-4" aria-hidden="true" />
              {t('overview.retry')}
            </Button>
          </div>
        ) : emptyRoot ? (
          <div className="rounded-xl border border-dashed border-gray-200 py-10 text-center">
            <p className="text-sm text-gray-500">{isMe ? t('explorer.emptyRoot') : t('explorer.noChildren')}</p>
            {isMe && (
              <Button
                variant="outline"
                size="sm"
                className={`mt-3 ${registerMemberEnabled ? '' : 'opacity-60'}`}
                onClick={onEnroll}
                title={registerMemberEnabled ? undefined : gateMessage}
              >
                <UserPlusIcon className="h-4 w-4" aria-hidden="true" />
                {t('explorer.emptyRootCta')}
              </Button>
            )}
          </div>
        ) : (
          <ul className="space-y-1.5" aria-label={t('explorer.title')}>
            {rows.map((row) => {
              const node = row.node;
              const isPending = Boolean(pending[node.memberId]);
              const branchError = errors[node.memberId];
              const remaining = row.total - row.loadedCount;
              return (
                <li key={node.memberId} data-depth={row.depth} style={{ paddingLeft: (row.depth - 1) * indent }}>
                  <div className="rounded-xl border border-gray-100 p-3 transition-colors hover:bg-gray-50/70">
                    <div className="flex items-start gap-2 sm:items-center sm:gap-3">
                      {/* Chevrón / abrir línea */}
                      <div className="flex w-8 shrink-0 justify-center">
                        {row.canExpand ? (
                          <button
                            type="button"
                            onClick={() => expand(row)}
                            aria-label={row.expanded ? t('explorer.collapse') : t('explorer.expand')}
                            aria-expanded={row.expanded}
                            disabled={isPending}
                            className="rounded-lg p-1 text-gray-500 hover:bg-[#C8DDF2]/30 hover:text-[#3E667D] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#3E667D] disabled:opacity-50"
                          >
                            {isPending ? (
                              <ArrowPathIcon className="h-5 w-5 animate-spin" aria-hidden="true" />
                            ) : row.expanded ? (
                              <ChevronDownIcon className="h-5 w-5" aria-hidden="true" />
                            ) : (
                              <ChevronRightIcon className="h-5 w-5" aria-hidden="true" />
                            )}
                          </button>
                        ) : (
                          <span className="block h-7 w-7" aria-hidden="true" />
                        )}
                      </div>

                      <Avatar name={node.fullName} className="hidden sm:flex" />

                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                          <button
                            type="button"
                            onClick={() => onOpenMember(node.customerId, contextOf(node, parentNameOf(row)))}
                            className="truncate text-left font-semibold text-gray-900 hover:text-[#3E667D] hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#3E667D]"
                          >
                            {node.fullName}
                          </button>
                          {node.customerNumber && <span className="text-xs text-gray-400">#{node.customerNumber}</span>}
                          <RankChip rankName={node.rankName} rankNumber={node.rankNumber} />
                        </div>
                        <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-gray-500">
                          <ActivityBadge activity={node.activity} atRisk={node.atRisk} isNew={node.isNew} />
                          <span className="tabular-nums">{t('list.points', { points: fmtPoints(node.personalPoints, locale) })}</span>
                          <span className="tabular-nums">{t('explorer.directs', { count: node.childrenCount })}</span>
                          {node.subtreeCount != null && (
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <span tabIndex={0} className="cursor-help tabular-nums underline decoration-dotted underline-offset-2">
                                  {t('explorer.subtree', { count: fmtInt(node.subtreeCount, locale) })}
                                </span>
                              </TooltipTrigger>
                              {statsAsOf && <TooltipContent>{t('explorer.subtreeAsOf', { time: statsAsOf })}</TooltipContent>}
                            </Tooltip>
                          )}
                        </div>
                        {branchError && (
                          <p role="alert" className="mt-1 flex flex-wrap items-center gap-2 text-xs text-red-600">
                            {t('explorer.error')} {t(branchError)}
                            <button type="button" onClick={() => loadPage(node.memberId, 1)} className="font-medium underline">
                              {t('overview.retry')}
                            </button>
                          </p>
                        )}
                      </div>

                      <div className="flex shrink-0 items-center gap-1">
                        {row.mustOpenLine && (
                          <Button variant="outline" size="sm" onClick={() => onOpenLine(node.memberId)} className="hidden sm:inline-flex">
                            <ArrowRightCircleIcon className="h-4 w-4" aria-hidden="true" />
                            {t('explorer.openLine')}
                          </Button>
                        )}
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <button
                              type="button"
                              aria-label={t('explorer.detail')}
                              className="rounded-lg p-1.5 text-gray-500 hover:bg-gray-100 hover:text-gray-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#3E667D]"
                            >
                              <EllipsisHorizontalIcon className="h-5 w-5" aria-hidden="true" />
                            </button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onSelect={() => onOpenMember(node.customerId, contextOf(node, parentNameOf(row)))}>
                              {t('explorer.detail')}
                            </DropdownMenuItem>
                            {(row.mustOpenLine || node.childrenCount > 0) && (
                              <DropdownMenuItem onSelect={() => onOpenLine(node.memberId)}>{t('explorer.openLine')}</DropdownMenuItem>
                            )}
                            <DropdownMenuItem onSelect={() => onSeeList(node.memberId)}>{t('explorer.seeList')}</DropdownMenuItem>
                            {node.level === 1 && (
                              <DropdownMenuItem onSelect={() => onSeeVolume(node.memberId)}>{t('explorer.seeVolume')}</DropdownMenuItem>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </div>

                    {/* Hijos: sin hijos cargados aún / mostrar más */}
                    {row.expanded && row.loaded && row.loadedCount === 0 && (
                      <p className="mt-2 pl-8 text-xs text-gray-400">{t('explorer.noChildren')}</p>
                    )}
                  </div>
                  {row.expanded && remaining > 0 && (
                    <div className="py-1" style={{ paddingLeft: indent }}>
                      <Button
                        variant="ghost"
                        size="sm"
                        disabled={isPending}
                        onClick={() => loadPage(node.memberId, Math.floor(row.loadedCount / PAGE) + 1)}
                        className="text-[#3E667D]"
                      >
                        {t('explorer.showMore', { count: fmtInt(Math.min(remaining, PAGE), locale) })}
                      </Button>
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        )}

        {rootData && rootRemaining > 0 && (
          <div className="mt-2">
            <Button
              variant="outline"
              size="sm"
              disabled={Boolean(pending[rootMemberId])}
              onClick={() => loadPage(rootMemberId, rootLoadedPages + 1)}
            >
              {t('explorer.showMore', { count: fmtInt(Math.min(rootRemaining, PAGE), locale) })}
            </Button>
            {errors[rootMemberId] && (
              <p role="alert" className="mt-1 text-xs text-red-600">
                {t('explorer.error')} {t(errors[rootMemberId])}
              </p>
            )}
          </div>
        )}

        {(needsOpenLine || limited) && (
          <p className="mt-3 text-xs text-gray-500">
            {limited ? t('explorer.limitNotice') : t('explorer.depthNotice', { level: state.root.level + MAX_VISIBLE_DEPTH })}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
