'use client';

// ProductHeader — encabezado pegajoso de la ficha: miniatura, nombre, clave,
// estado por canal, chip "Ficha {score}%" con faltantes clicables, "Ver en
// tienda" por país (o el porqué no aparece), Duplicar y Desactivar/Reactivar.

import Image from 'next/image';
import { ArrowLeft, ChevronDown, Copy, ExternalLink, Package, Power } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import type { AdminProduct, CatalogAdminRow, StorefrontStatusEntry } from '@/services/products-admin.service';
import {
  SCORE_TONE_CLASS,
  countryName,
  healthIssueLabel,
  healthIssueMeta,
  productTypeLabel,
  scoreTone,
  type ProductSectionId,
} from '../lib/labels';
import { storefrontSentence } from './StorefrontStatusPanel';

interface ProductHeaderProps {
  mode: 'create' | 'edit';
  product: AdminProduct | null;
  rowHealth: CatalogAdminRow | null | undefined;
  storefront: StorefrontStatusEntry[] | undefined;
  storefrontLoading: boolean;
  canCreate: boolean;
  canUpdate: boolean;
  canDelete: boolean;
  isCreating: boolean;
  onBack: () => void;
  onCreate: () => void;
  onDuplicate: () => void;
  onToggleActive: () => void;
  onGoToSection: (id: ProductSectionId) => void;
}

export function ProductHeader({
  mode,
  product,
  rowHealth,
  storefront,
  storefrontLoading,
  canCreate,
  canUpdate,
  canDelete,
  isCreating,
  onBack,
  onCreate,
  onDuplicate,
  onToggleActive,
  onGoToSection,
}: ProductHeaderProps) {
  const score = rowHealth?.health.score ?? null;
  const issues = rowHealth?.health.issues ?? [];
  const readyStorefront = (storefront ?? []).filter((e) => !e.reasons.includes('country_not_ready'));
  const canToggleActive = product ? (product.isActive ? canDelete : canUpdate) : false;

  return (
    <header
      className="sticky z-20 border-b bg-white shadow-sm"
      style={{ top: 'env(safe-area-inset-top, 0px)' }}
    >
      <div className="mx-auto max-w-7xl px-4 py-4 sm:px-6 lg:px-8">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex min-w-0 items-center gap-3">
            <Button type="button" variant="ghost" size="icon" onClick={onBack} aria-label="Regresar al listado de productos">
              <ArrowLeft className="h-5 w-5" aria-hidden />
            </Button>
            {mode === 'edit' ? (
              <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-lg border border-gray-200 bg-gray-50">
                {product?.imageUrl ? (
                  <Image src={product.imageUrl} alt="" fill sizes="56px" className="object-contain" />
                ) : (
                  <Package className="absolute inset-0 m-auto h-6 w-6 text-gray-500" aria-hidden />
                )}
              </div>
            ) : null}
            <div className="min-w-0">
              <h1 className="truncate text-xl font-bold text-gray-900 sm:text-2xl">
                {mode === 'create' ? 'Nuevo producto' : (product?.name ?? 'Producto')}
              </h1>
              {mode === 'edit' && product ? (
                <div className="mt-1 flex flex-wrap items-center gap-1.5">
                  <span className="font-mono text-sm text-gray-700">Clave {product.code}</span>
                  <Badge variant="outline">{productTypeLabel(product.productType)}</Badge>
                  <Badge variant={product.isActive ? 'success' : 'secondary'}>
                    {product.isActive ? 'Activo' : 'Inactivo'}
                  </Badge>
                  {readyStorefront.map((entry) => (
                    <Badge key={entry.countryCode} variant={entry.sellable ? 'info' : 'warning'}>
                      {entry.sellable ? `En tienda ${entry.countryCode}` : `Fuera de tienda ${entry.countryCode}`}
                    </Badge>
                  ))}
                  <Badge variant={product.availableInPos ? 'info' : 'secondary'}>
                    {product.availableInPos ? 'POS' : 'Sin POS'}
                  </Badge>

                  {score !== null ? (
                    <Popover>
                      <PopoverTrigger asChild>
                        <button
                          type="button"
                          className={`inline-flex min-h-6 items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#3E667D] ${SCORE_TONE_CLASS[scoreTone(score)]}`}
                          aria-label={`Ficha completa al ${Math.round(score)} por ciento. Ver pendientes`}
                        >
                          Ficha {Math.round(score)}%
                          <ChevronDown className="h-3 w-3" aria-hidden />
                        </button>
                      </PopoverTrigger>
                      <PopoverContent align="start" className="w-80">
                        <p className="mb-2 text-sm font-semibold text-gray-900">
                          {issues.length === 0 ? 'Ficha completa' : `Le falta (${issues.length})`}
                        </p>
                        {issues.length === 0 ? (
                          <p className="text-sm text-gray-700">No hay pendientes de captura.</p>
                        ) : (
                          <ul className="space-y-1">
                            {issues.map((code) => (
                              <li key={code}>
                                <button
                                  type="button"
                                  onClick={() => onGoToSection(healthIssueMeta(code).section)}
                                  className="flex min-h-9 w-full items-center justify-between rounded px-2 text-left text-sm text-[#2f5165] hover:bg-gray-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#3E667D]"
                                >
                                  {healthIssueLabel(code)}
                                  <span className="text-xs text-gray-600">Corregir</span>
                                </button>
                              </li>
                            ))}
                          </ul>
                        )}
                      </PopoverContent>
                    </Popover>
                  ) : null}
                </div>
              ) : (
                <p className="mt-1 text-sm text-gray-700">
                  Captura lo esencial; después de crear podrás cargar precios, imágenes, contenido y SEO.
                </p>
              )}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {mode === 'create' ? (
              canCreate ? (
                <Button type="button" onClick={onCreate} disabled={isCreating} aria-busy={isCreating}>
                  {isCreating ? 'Creando…' : 'Crear producto'}
                </Button>
              ) : null
            ) : (
              <>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button type="button" variant="outline" disabled={storefrontLoading}>
                      <ExternalLink className="mr-2 h-4 w-4" aria-hidden />
                      Ver en tienda
                      <ChevronDown className="ml-1 h-4 w-4" aria-hidden />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-80">
                    <DropdownMenuLabel>Vista previa por país</DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    {(storefront ?? []).length === 0 ? (
                      <p className="px-2 py-1.5 text-sm text-gray-700">
                        No se pudo consultar el estado del producto en la tienda.
                      </p>
                    ) : (
                      (storefront ?? []).map((entry) =>
                        entry.sellable && entry.url ? (
                          <DropdownMenuItem key={entry.countryCode} asChild>
                            <a href={entry.url} target="_blank" rel="noopener noreferrer" className="cursor-pointer">
                              <ExternalLink className="h-4 w-4" aria-hidden />
                              {countryName(entry.countryCode)}
                              {entry.locale ? <span className="text-xs text-gray-600">({entry.locale})</span> : null}
                            </a>
                          </DropdownMenuItem>
                        ) : (
                          <div key={entry.countryCode} className="px-2 py-1.5 text-sm text-gray-700">
                            {storefrontSentence(entry)}
                          </div>
                        ),
                      )
                    )}
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onSelect={() => onGoToSection('tienda')}>Ver detalle y cómo corregirlo</DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>

                {canCreate && product && !product.isEnrollmentKit ? (
                  <Button type="button" variant="outline" onClick={onDuplicate}>
                    <Copy className="mr-2 h-4 w-4" aria-hidden />
                    Duplicar
                  </Button>
                ) : null}

                {canToggleActive && product ? (
                  <Button
                    type="button"
                    variant="outline"
                    className={product.isActive ? 'text-red-700 hover:text-red-800' : undefined}
                    onClick={onToggleActive}
                  >
                    <Power className="mr-2 h-4 w-4" aria-hidden />
                    {product.isActive ? 'Desactivar' : 'Reactivar'}
                  </Button>
                ) : null}
              </>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
