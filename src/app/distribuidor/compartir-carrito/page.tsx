'use client';

import { Suspense, useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Loader2 } from 'lucide-react';
import {
  ShoppingCartIcon,
  MagnifyingGlassIcon,
  PlusIcon,
  MinusIcon,
  TrashIcon,
  ClipboardDocumentIcon,
  ShareIcon,
  LinkIcon,
  XMarkIcon,
  CubeIcon,
} from '@heroicons/react/24/outline';
import { toast } from 'sonner';
import { useProducts, useCategories } from '@/hooks/useProducts';
import { ECOMMERCE_BRANCH_ID } from '@/services/products.service';
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

// Miniatura de producto con fallback a iniciales
function ProductThumb({ src, name }: { src?: string; name: string }) {
  const [error, setError] = useState(false);
  if (src && !error) {
    // eslint-disable-next-line @next/next/no-img-element
    return (
      <img
        src={src}
        alt={name}
        className="h-full w-full object-contain p-2"
        onError={() => setError(true)}
      />
    );
  }
  return (
    <div className="flex h-full w-full items-center justify-center text-gray-300">
      <CubeIcon className="h-8 w-8" />
    </div>
  );
}

function CompartirCarritoContent() {
  const [lines, setLines] = useState<Line[]>([]);
  const [note, setNote] = useState('');
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [createdToken, setCreatedToken] = useState<string | null>(null);

  const { data: productsData, isLoading: productsLoading } = useProducts({
    categoryId: selectedCategory !== 'all' ? selectedCategory : undefined,
    isActive: true,
    isVisibleEcommerce: true,
    branchId: ECOMMERCE_BRANCH_ID,
    search: search.trim() || undefined,
    limit: 60,
    sortBy: 'sortOrder',
    sortDir: 'asc',
  });
  const { data: categoriesData = [] } = useCategories({ isActive: true });

  const createMutation = useCreateSharedCart();
  const cancelMutation = useCancelSharedCart();
  const { data: sharedCarts = [], isLoading: cartsLoading } = useSharedCarts();

  const products = productsData?.data ?? [];
  const qtyOf = (productId: string) =>
    lines.find((l) => l.productId === productId)?.quantity ?? 0;

  const addLine = (p: { id: string; name: string; code: string }) => {
    setLines((prev) => {
      const ex = prev.find((l) => l.productId === p.id);
      if (ex) {
        return prev.map((l) =>
          l.productId === p.id ? { ...l, quantity: l.quantity + 1 } : l,
        );
      }
      return [...prev, { productId: p.id, name: p.name, code: p.code, quantity: 1 }];
    });
  };

  const setQty = (productId: string, qty: number) =>
    setLines((prev) =>
      qty <= 0
        ? prev.filter((l) => l.productId !== productId)
        : prev.map((l) =>
            l.productId === productId ? { ...l, quantity: qty } : l,
          ),
    );

  const removeLine = (productId: string) =>
    setLines((prev) => prev.filter((l) => l.productId !== productId));

  const totalUnits = lines.reduce((s, l) => s + l.quantity, 0);

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
        items: lines.map((l) => ({ productId: l.productId, quantity: l.quantity })),
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
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 lg:py-10">
          <div className="flex items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-3 mb-1">
                <ShoppingCartIcon className="h-8 w-8" />
                <h1 className="text-2xl lg:text-3xl font-bold">Compartir carrito</h1>
              </div>
              <p className="text-white/80 text-sm lg:text-base">
                Elige productos del catálogo y comparte el carrito. Tu cliente paga
                directo a precio público; la venta cuenta para ti.
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

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 lg:py-8 space-y-6">
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

        <div className="grid gap-6 lg:grid-cols-3">
          {/* Catálogo */}
          <Card className="lg:col-span-2">
            <CardContent className="p-4 lg:p-6">
              {/* Encabezado fijo: la búsqueda y las categorías quedan sticky;
                  solo los productos scrollean debajo. */}
              <div className="sticky top-0 z-10 -mx-4 -mt-4 rounded-t-xl border-b border-gray-100 bg-white px-4 pt-4 pb-3 lg:-mx-6 lg:-mt-6 lg:px-6 lg:pt-6">
              <h2 className="text-lg font-bold text-gray-900 mb-4">
                Elige productos
              </h2>

              {/* Búsqueda */}
              <div className="relative mb-3">
                <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Buscar por nombre o código..."
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-[#a7c1e2] focus:border-transparent"
                />
              </div>

              {/* Filtros de categoría */}
              <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
                <button
                  onClick={() => setSelectedCategory('all')}
                  className={`shrink-0 rounded-full px-3 py-1.5 text-sm font-medium transition-colors ${
                    selectedCategory === 'all'
                      ? 'bg-[#3E667D] text-white'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  Todos
                </button>
                {categoriesData.map((cat) => (
                  <button
                    key={cat.id}
                    onClick={() => setSelectedCategory(cat.id)}
                    className={`shrink-0 rounded-full px-3 py-1.5 text-sm font-medium transition-colors ${
                      selectedCategory === cat.id
                        ? 'bg-[#3E667D] text-white'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    {cat.name}
                  </button>
                ))}
              </div>
              </div>{/* /encabezado fijo */}

              {/* Grid de productos */}
              {productsLoading ? (
                <div className="flex items-center justify-center py-16 text-gray-400">
                  <Loader2 className="h-6 w-6 animate-spin" />
                </div>
              ) : products.length === 0 ? (
                <div className="rounded-xl border border-dashed border-gray-200 py-12 text-center text-sm text-gray-500">
                  No se encontraron productos con estos filtros.
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                  {products.map((p) => {
                    const q = qtyOf(p.id);
                    return (
                      <div
                        key={p.id}
                        className={`flex flex-col overflow-hidden rounded-xl border transition-all ${
                          q > 0
                            ? 'border-[#3E667D] ring-1 ring-[#3E667D]/30'
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        <div className="relative h-28 bg-gray-50">
                          <ProductThumb src={p.imageUrl} name={p.name} />
                          {q > 0 && (
                            <span className="absolute right-1.5 top-1.5 rounded-full bg-[#3E667D] px-1.5 text-[11px] font-bold text-white">
                              {q}
                            </span>
                          )}
                        </div>
                        <div className="flex flex-1 flex-col p-2.5">
                          <p className="line-clamp-2 text-xs font-medium text-gray-900">
                            {p.name}
                          </p>
                          <p className="mt-0.5 text-[11px] text-gray-400">{p.code}</p>
                          <div className="mt-auto pt-2">
                            {q > 0 ? (
                              <div className="flex items-center justify-between rounded-lg border border-gray-200">
                                <button
                                  onClick={() => setQty(p.id, q - 1)}
                                  className="p-1.5 text-gray-600 hover:bg-gray-100"
                                  aria-label="Quitar uno"
                                >
                                  <MinusIcon className="h-4 w-4" />
                                </button>
                                <span className="text-sm font-semibold text-gray-900">
                                  {q}
                                </span>
                                <button
                                  onClick={() => setQty(p.id, q + 1)}
                                  className="p-1.5 text-gray-600 hover:bg-gray-100"
                                  aria-label="Agregar uno"
                                >
                                  <PlusIcon className="h-4 w-4" />
                                </button>
                              </div>
                            ) : (
                              <Button
                                size="sm"
                                variant="outline"
                                className="w-full"
                                onClick={() =>
                                  addLine({ id: p.id, name: p.name, code: p.code })
                                }
                              >
                                <PlusIcon className="h-4 w-4" />
                                Agregar
                              </Button>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Carrito a compartir */}
          <Card className="lg:sticky lg:top-6 h-fit">
            <CardContent className="p-4 lg:p-6">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-lg font-bold text-gray-900">Tu carrito</h2>
                {totalUnits > 0 && (
                  <span className="rounded-full bg-[#C8DDF2]/40 px-2.5 py-0.5 text-xs font-semibold text-[#3E667D]">
                    {totalUnits} {totalUnits === 1 ? 'unidad' : 'unidades'}
                  </span>
                )}
              </div>

              {lines.length === 0 ? (
                <div className="rounded-xl border border-dashed border-gray-200 py-8 text-center text-sm text-gray-500">
                  Agrega productos del catálogo para armar el carrito que vas a
                  compartir.
                </div>
              ) : (
                <ul className="divide-y divide-gray-100">
                  {lines.map((l) => (
                    <li key={l.productId} className="flex items-center gap-2 py-2.5">
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-gray-900">
                          {l.name}
                        </p>
                        <p className="text-[11px] text-gray-400">{l.code}</p>
                      </div>
                      <div className="flex items-center rounded-lg border border-gray-200">
                        <button
                          onClick={() => setQty(l.productId, l.quantity - 1)}
                          className="p-1 text-gray-600 hover:bg-gray-100"
                          aria-label="Quitar uno"
                        >
                          <MinusIcon className="h-3.5 w-3.5" />
                        </button>
                        <span className="w-7 text-center text-sm font-semibold text-gray-900">
                          {l.quantity}
                        </span>
                        <button
                          onClick={() => setQty(l.productId, l.quantity + 1)}
                          className="p-1 text-gray-600 hover:bg-gray-100"
                          aria-label="Agregar uno"
                        >
                          <PlusIcon className="h-3.5 w-3.5" />
                        </button>
                      </div>
                      <button
                        onClick={() => removeLine(l.productId)}
                        className="rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-red-500"
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

              <Button
                onClick={handleCreate}
                disabled={!lines.length || createMutation.isPending}
                className="mt-4 w-full"
              >
                {createMutation.isPending && (
                  <Loader2 className="mr-2 size-4 animate-spin" />
                )}
                <LinkIcon className="h-4 w-4" />
                Crear link para compartir
              </Button>
              <p className="mt-2 text-center text-[11px] text-gray-400">
                El cliente verá los precios al público y elegirá envío o sucursal.
              </p>
            </CardContent>
          </Card>
        </div>

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
                              {(c.status === 'open' || c.status === 'ordered') && (
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
