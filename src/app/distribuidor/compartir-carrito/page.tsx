'use client';

import { Suspense, useMemo, useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Loader2 } from 'lucide-react';
import {
  ShoppingCartIcon,
  MagnifyingGlassIcon,
  PlusIcon,
  TrashIcon,
  ClipboardDocumentIcon,
  ShareIcon,
  LinkIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline';
import { toast } from 'sonner';
import { useProductSearch } from '@/hooks/useProducts';
import {
  useSharedCarts,
  useCreateSharedCart,
  useCancelSharedCart,
} from '@/hooks/useSharedCart';

interface Line {
  productId: string;
  name: string;
  code: string;
  quantity: number;
}

export default function CompartirCarritoPage() {
  return (
    <Suspense>
      <CompartirCarritoContent />
    </Suspense>
  );
}

function CompartirCarritoContent() {
  const [lines, setLines] = useState<Line[]>([]);
  const [note, setNote] = useState('');
  const [search, setSearch] = useState('');
  const [createdToken, setCreatedToken] = useState<string | null>(null);

  const { data: searchResults, isFetching } = useProductSearch(search, {
    limit: 8,
  });
  const createMutation = useCreateSharedCart();
  const cancelMutation = useCancelSharedCart();
  const { data: sharedCarts = [], isLoading: cartsLoading } = useSharedCarts();

  const results = useMemo(() => {
    const arr = Array.isArray(searchResults)
      ? searchResults
      : (searchResults as any)?.data ?? [];
    return arr as { id: string; name: string; code: string }[];
  }, [searchResults]);

  const addLine = (p: { id: string; name: string; code: string }) => {
    setLines((prev) => {
      const ex = prev.find((l) => l.productId === p.id);
      if (ex) {
        return prev.map((l) =>
          l.productId === p.id ? { ...l, quantity: l.quantity + 1 } : l,
        );
      }
      return [
        ...prev,
        { productId: p.id, name: p.name, code: p.code, quantity: 1 },
      ];
    });
    setSearch('');
  };

  const setQty = (productId: string, qty: number) =>
    setLines((prev) =>
      prev.map((l) =>
        l.productId === productId ? { ...l, quantity: Math.max(1, qty) } : l,
      ),
    );

  const removeLine = (productId: string) =>
    setLines((prev) => prev.filter((l) => l.productId !== productId));

  const shareUrl = createdToken
    ? `${typeof window !== 'undefined' ? window.location.origin : ''}/carrito-compartido/${createdToken}`
    : '';

  const handleCreate = async () => {
    if (!lines.length) {
      toast.error('Agrega al menos un producto');
      return;
    }
    try {
      const res = await createMutation.mutateAsync({
        items: lines.map((l) => ({
          productId: l.productId,
          quantity: l.quantity,
        })),
        note: note.trim() || undefined,
      });
      setCreatedToken(res.token);
      setLines([]);
      setNote('');
      toast.success('Link de carrito creado');
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data
          ?.message || 'No se pudo crear el carrito';
      toast.error(Array.isArray(msg) ? msg.join(', ') : msg);
    }
  };

  const copyLink = async (url: string) => {
    try {
      await navigator.clipboard.writeText(url);
      toast.success('Link copiado');
    } catch {
      toast.error('No se pudo copiar');
    }
  };

  const shareWhatsApp = (url: string) => {
    const text = encodeURIComponent(
      `Te comparto un carrito de Tonic Life para que lo pagues directo: ${url}`,
    );
    window.open(`https://wa.me/?text=${text}`, '_blank', 'noopener');
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-gradient-to-r from-[#3E667D] to-[#3E667D]/90 text-white">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 lg:py-10">
          <div className="flex items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-3 mb-1">
                <ShoppingCartIcon className="h-8 w-8" />
                <h1 className="text-2xl lg:text-3xl font-bold">
                  Compartir carrito
                </h1>
              </div>
              <p className="text-white/80 text-sm lg:text-base">
                Arma un carrito y compártelo. Tu cliente paga directo a precio
                público; la venta cuenta para ti.
              </p>
            </div>
            <Link href="/distribuidor/ventas">
              <Button variant="secondary" size="sm">
                Volver
              </Button>
            </Link>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-6 lg:py-8 space-y-6">
        {/* Link recién creado */}
        {createdToken && (
          <Card className="border-green-200 bg-green-50">
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <LinkIcon className="h-5 w-5 text-green-600 shrink-0 mt-0.5" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-green-800">
                    ¡Listo! Comparte este link con tu cliente
                  </p>
                  <p className="mt-1 break-all font-mono text-xs text-green-700">
                    {shareUrl}
                  </p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <Button size="sm" onClick={() => copyLink(shareUrl)}>
                      <ClipboardDocumentIcon className="h-4 w-4" />
                      Copiar
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => shareWhatsApp(shareUrl)}
                    >
                      <ShareIcon className="h-4 w-4" />
                      WhatsApp
                    </Button>
                  </div>
                </div>
                <button
                  onClick={() => setCreatedToken(null)}
                  className="rounded p-1 text-green-700 hover:bg-green-100"
                  aria-label="Cerrar"
                >
                  <XMarkIcon className="h-4 w-4" />
                </button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Armar carrito */}
        <Card>
          <CardContent className="p-4 lg:p-6">
            <h2 className="text-lg font-bold text-gray-900 mb-4">
              Arma el carrito
            </h2>

            {/* Buscador */}
            <div className="relative">
              <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar producto por nombre o código..."
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-[#a7c1e2] focus:border-transparent"
              />
              {search.length >= 2 && (
                <div className="absolute z-10 mt-1 w-full rounded-lg border border-gray-200 bg-white shadow-lg max-h-72 overflow-y-auto">
                  {isFetching ? (
                    <div className="flex items-center justify-center py-4 text-gray-400">
                      <Loader2 className="h-4 w-4 animate-spin" />
                    </div>
                  ) : results.length === 0 ? (
                    <p className="px-4 py-3 text-sm text-gray-500">
                      Sin resultados
                    </p>
                  ) : (
                    results.map((p) => (
                      <button
                        key={p.id}
                        onClick={() => addLine(p)}
                        className="flex w-full items-center justify-between gap-2 px-4 py-2.5 text-left text-sm hover:bg-gray-50"
                      >
                        <span className="min-w-0">
                          <span className="block truncate font-medium text-gray-900">
                            {p.name}
                          </span>
                          <span className="block text-xs text-gray-400">
                            {p.code}
                          </span>
                        </span>
                        <PlusIcon className="h-4 w-4 shrink-0 text-[#3E667D]" />
                      </button>
                    ))
                  )}
                </div>
              )}
            </div>

            {/* Renglones */}
            {lines.length === 0 ? (
              <div className="mt-4 rounded-xl border border-dashed border-gray-200 py-8 text-center text-sm text-gray-500">
                Busca y agrega productos al carrito.
              </div>
            ) : (
              <ul className="mt-4 divide-y divide-gray-100">
                {lines.map((l) => (
                  <li
                    key={l.productId}
                    className="flex items-center gap-3 py-3"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-gray-900">
                        {l.name}
                      </p>
                      <p className="text-xs text-gray-400">{l.code}</p>
                    </div>
                    <input
                      type="number"
                      min={1}
                      value={l.quantity}
                      onChange={(e) =>
                        setQty(l.productId, parseInt(e.target.value) || 1)
                      }
                      className="w-16 rounded-lg border border-gray-300 px-2 py-1 text-sm text-center focus:ring-2 focus:ring-[#a7c1e2]"
                    />
                    <button
                      onClick={() => removeLine(l.productId)}
                      className="rounded p-1.5 text-gray-400 hover:bg-gray-100 hover:text-red-500"
                      aria-label="Quitar"
                    >
                      <TrashIcon className="h-4 w-4" />
                    </button>
                  </li>
                ))}
              </ul>
            )}

            {/* Nota */}
            <div className="mt-4">
              <label className="mb-1 block text-sm font-medium text-gray-700">
                Mensaje para el cliente (opcional)
              </label>
              <textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                rows={2}
                maxLength={500}
                placeholder="Ej. Aquí está tu pedido, cualquier duda me avisas."
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-[#a7c1e2] focus:border-transparent"
              />
            </div>

            <div className="mt-4">
              <Button
                onClick={handleCreate}
                disabled={!lines.length || createMutation.isPending}
                className="w-full sm:w-auto"
              >
                {createMutation.isPending && (
                  <Loader2 className="mr-2 size-4 animate-spin" />
                )}
                <LinkIcon className="h-4 w-4" />
                Crear link para compartir
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Mis carritos compartidos */}
        <Card>
          <CardContent className="p-4 lg:p-6">
            <h2 className="text-lg font-bold text-gray-900 mb-4">
              Mis carritos compartidos
            </h2>
            {cartsLoading ? (
              <div className="flex items-center justify-center py-8 text-gray-400">
                <Loader2 className="h-5 w-5 animate-spin" />
              </div>
            ) : sharedCarts.length === 0 ? (
              <p className="py-6 text-center text-sm text-gray-500">
                Aún no has compartido carritos.
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-100 text-left text-xs uppercase tracking-wide text-gray-400">
                      <th className="py-2 pr-4 font-medium">Productos</th>
                      <th className="py-2 pr-4 font-medium">Total</th>
                      <th className="py-2 pr-4 font-medium">Estado</th>
                      <th className="py-2 pr-4 font-medium">Creado</th>
                      <th className="py-2 pr-4 font-medium">Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sharedCarts.map((c) => {
                      const url = `${typeof window !== 'undefined' ? window.location.origin : ''}/carrito-compartido/${c.token}`;
                      return (
                        <tr
                          key={c.token}
                          className="border-b border-gray-50 last:border-0"
                        >
                          <td className="py-2.5 pr-4 text-gray-700">
                            {c.itemCount} producto{c.itemCount === 1 ? '' : 's'}
                          </td>
                          <td className="py-2.5 pr-4 font-medium text-gray-900">
                            {c.subtotal.toLocaleString('es-MX', {
                              style: 'currency',
                              currency: c.currencyCode || 'MXN',
                              maximumFractionDigits: 0,
                            })}{' '}
                            <span className="text-[10px] text-gray-400">
                              {c.currencyCode}
                            </span>
                          </td>
                          <td className="py-2.5 pr-4">
                            <StatusBadge
                              status={c.status}
                              orderStatus={c.orderStatus}
                            />
                          </td>
                          <td className="py-2.5 pr-4 text-gray-500">
                            {new Date(c.createdAt).toLocaleDateString('es-MX')}
                          </td>
                          <td className="py-2.5 pr-4">
                            <div className="flex items-center gap-1">
                              <button
                                onClick={() => copyLink(url)}
                                className="rounded p-1.5 text-gray-500 hover:bg-gray-100"
                                title="Copiar link"
                              >
                                <ClipboardDocumentIcon className="h-4 w-4" />
                              </button>
                              {(c.status === 'open' ||
                                c.status === 'ordered') && (
                                <button
                                  onClick={() =>
                                    cancelMutation.mutate(c.token, {
                                      onSuccess: () =>
                                        toast.success('Carrito cancelado'),
                                      onError: () =>
                                        toast.error('No se pudo cancelar'),
                                    })
                                  }
                                  className="rounded p-1.5 text-gray-400 hover:bg-gray-100 hover:text-red-500"
                                  title="Cancelar"
                                >
                                  <TrashIcon className="h-4 w-4" />
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function StatusBadge({
  status,
  orderStatus,
}: {
  status: string;
  orderStatus?: string | null;
}) {
  const paid = status === 'paid' || orderStatus === 'confirmed';
  const map: Record<string, { label: string; cls: string }> = {
    open: { label: 'Por pagar', cls: 'bg-blue-50 text-blue-600' },
    ordered: { label: 'En proceso', cls: 'bg-amber-50 text-amber-600' },
    paid: { label: 'Pagado', cls: 'bg-green-50 text-green-600' },
    cancelled: { label: 'Cancelado', cls: 'bg-gray-100 text-gray-500' },
    expired: { label: 'Expirado', cls: 'bg-gray-100 text-gray-500' },
  };
  const cfg = paid ? map.paid : map[status] || map.open;
  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${cfg.cls}`}
    >
      {cfg.label}
    </span>
  );
}
