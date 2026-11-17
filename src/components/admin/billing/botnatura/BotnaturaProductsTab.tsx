'use client';

// BotnaturaProductsTab - Catálogo de productos de Botnatura (GET billing/botnatura/products):
// buscar, ver cuáles no tienen precio, corregir nombre o precios, dar de baja y agregar.
// Es un catálogo aparte: nada de aquí toca los productos ni los precios de Tonic Life.

import { useEffect, useState } from 'react';
import { MagnifyingGlassIcon, PencilSquareIcon, PlusIcon } from '@heroicons/react/24/outline';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { useBotnaturaProducts } from '@/hooks/useBotnatura';
import { billingErrorMessage } from '@/lib/billing-error';
import { moneyMx as money } from '@/lib/billing/manual-free';
import type { BotnaturaProduct, BotnaturaProductsQuery } from '@/types/botnatura';
import { BotnaturaProductDialog } from './BotnaturaProductDialog';

const TH = 'px-3 py-2 text-left text-[11px] font-semibold uppercase tracking-wider text-gray-500 whitespace-nowrap';
const TD = 'px-3 py-2.5 text-sm align-middle';
const LIMIT = 50;
type Status = NonNullable<BotnaturaProductsQuery['status']>;

export function BotnaturaProductsTab() {
  const [search, setSearch] = useState('');
  const [term, setTerm] = useState('');
  const [status, setStatus] = useState<Status>('active');
  const [withoutPrice, setWithoutPrice] = useState(false);
  const [page, setPage] = useState(1);
  // undefined = cerrado; null = alta; producto = edición.
  const [editing, setEditing] = useState<BotnaturaProduct | null | undefined>(undefined);

  useEffect(() => {
    const t = setTimeout(() => {
      setTerm(search.trim());
      setPage(1);
    }, 300);
    return () => clearTimeout(t);
  }, [search]);

  const products = useBotnaturaProducts({
    ...(term ? { search: term } : {}),
    status,
    ...(withoutPrice ? { withoutPrice: 'true' as const } : {}),
    page,
    limit: LIMIT,
  });
  const rows = products.data?.data ?? [];
  const total = products.data?.total ?? 0;
  const stats = products.data?.stats;
  const pages = Math.max(1, Math.ceil(total / LIMIT));

  if (products.isError) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800" role="alert">
        {billingErrorMessage(products.error, 'No se pudo leer el catálogo de Botnatura')}
      </div>
    );
  }

  return (
    <Card>
      <CardContent className="p-0">
        <div className="space-y-3 border-b border-gray-100 p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm text-gray-600">
              {stats
                ? `${stats.total} productos · ${stats.withPrice} con precio · ${stats.total - stats.withPrice} sin precio`
                : 'Cargando…'}
            </p>
            <Button type="button" size="sm" className="gap-2" onClick={() => setEditing(null)}>
              <PlusIcon className="h-4 w-4" />
              Agregar producto
            </Button>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative min-w-[260px] flex-1">
              <MagnifyingGlassIcon className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar por clave o nombre…"
                className="bg-gray-50 pl-9"
                aria-label="Buscar en el catálogo de Botnatura"
              />
            </div>
            <select
              value={status}
              onChange={(e) => {
                setStatus(e.target.value as Status);
                setPage(1);
              }}
              className="h-9 rounded-md border border-gray-300 bg-white px-2 text-sm"
              aria-label="Estado"
            >
              <option value="active">Activos</option>
              <option value="inactive">Inactivos</option>
              <option value="all">Todos</option>
            </select>
            <label className="flex items-center gap-2 text-sm text-gray-700">
              <input
                type="checkbox"
                checked={withoutPrice}
                onChange={(e) => {
                  setWithoutPrice(e.target.checked);
                  setPage(1);
                }}
                className="h-4 w-4 rounded border-gray-300"
              />
              Solo sin precio
            </label>
          </div>
        </div>
        <ProductsTable loading={products.isLoading} rows={rows} onEdit={setEditing} />
        {pages > 1 && (
          <div className="flex items-center justify-between border-t border-gray-100 p-3 text-sm text-gray-600">
            <span>
              Página {page} de {pages} · {total} productos
            </span>
            <div className="flex gap-2">
              <Button type="button" variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(page - 1)}>
                Anterior
              </Button>
              <Button type="button" variant="outline" size="sm" disabled={page >= pages} onClick={() => setPage(page + 1)}>
                Siguiente
              </Button>
            </div>
          </div>
        )}
      </CardContent>
      {editing !== undefined && (
        <BotnaturaProductDialog key={editing?.id ?? 'new'} product={editing} onClose={() => setEditing(undefined)} />
      )}
    </Card>
  );
}

function ProductsTable({
  loading,
  rows,
  onEdit,
}: {
  loading: boolean;
  rows: BotnaturaProduct[];
  onEdit: (product: BotnaturaProduct) => void;
}) {
  if (!loading && rows.length === 0) {
    return <p className="p-10 text-center text-sm text-gray-500">Ningún producto con ese filtro.</p>;
  }
  const price = (value: number | null) =>
    value !== null ? money(value) : <span className="text-amber-600">Sin precio</span>;
  return (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            <th className={TH}>Clave</th>
            <th className={TH}>Nombre</th>
            <th className={`${TH} text-right`}>Precio venta</th>
            <th className={`${TH} text-right`}>Precio</th>
            <th className={TH}>IVA</th>
            <th className={TH}>Estado</th>
            <th className={TH} />
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100 bg-white">
          {rows.map((p) => (
            <tr key={p.id} className="hover:bg-gray-50">
              <td className={`${TD} whitespace-nowrap font-mono text-xs text-gray-600`}>{p.code}</td>
              <td className={`${TD} text-gray-900`}>{p.name}</td>
              <td className={`${TD} whitespace-nowrap text-right tabular-nums`}>{price(p.salePrice)}</td>
              <td className={`${TD} whitespace-nowrap text-right tabular-nums`}>{price(p.listPrice)}</td>
              <td className={`${TD} whitespace-nowrap text-gray-600`}>{p.taxLabel}</td>
              <td className={`${TD} whitespace-nowrap`}>
                <span
                  className={`rounded-full px-2 py-0.5 text-xs font-medium ${p.isActive ? 'bg-emerald-50 text-emerald-700' : 'bg-gray-100 text-gray-600'}`}
                >
                  {p.isActive ? 'Activo' : 'Inactivo'}
                </span>
              </td>
              <td className={`${TD} text-right`}>
                <Button type="button" variant="ghost" size="sm" className="h-8 gap-1 px-2" onClick={() => onEdit(p)}>
                  <PencilSquareIcon className="h-4 w-4" />
                  Editar
                </Button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
