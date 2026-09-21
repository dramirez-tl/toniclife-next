'use client';

// Buscador del catálogo: `role="search"`, etiqueta solo para lector, debounce de
// 300 ms hacia la URL (la cuadrícula NO se re-renderiza por tecla) y sugerencias
// con Command + Popover (flechas / Enter / Esc). La primera opción es siempre
// "Ver todos los resultados", así que Enter busca lo escrito.

import { useEffect, useRef, useState } from 'react';
import { useTranslations } from 'next-intl';
import { Command as CommandPrimitive } from 'cmdk';
import { MagnifyingGlassIcon, XMarkIcon } from '@heroicons/react/24/outline';
import { Command, CommandGroup, CommandItem, CommandList } from '@/components/ui/command';
import { Popover, PopoverAnchor, PopoverContent } from '@/components/ui/popover';
import { useRouter } from '@/i18n/routing';
import { useStorefrontSuggest } from '@/hooks/useStorefront';
import { formatProductName } from '@/lib/storefront/content-format';
import { formatStorePrice } from '@/lib/storefront/price';
import { productPath } from '@/lib/storefront/slug';
import { cn } from '@/lib/utils';
import type { StorefrontContext } from '@/types/storefront';
import { ProductImage } from './ProductImage';

const DEBOUNCE_MS = 300;
const MIN_CHARS = 2;

/** Lo que el texto del campo significa como `q` de la URL (menos de 2 caracteres = sin búsqueda). */
function appliedQuery(text: string): string {
  const normalized = text.trim().replace(/\s+/g, ' ');
  return normalized.length >= MIN_CHARS ? normalized : '';
}

interface SearchBoxProps {
  ctx: StorefrontContext;
  /** `q` vigente en la URL. */
  value: string;
  /** Aplica la búsqueda a la URL ('' = quitarla). */
  onSearch: (q: string) => void;
  onSelectCategory: (slug: string) => void;
  className?: string;
}

export function SearchBox({ ctx, value, onSearch, onSelectCategory, className }: SearchBoxProps) {
  const t = useTranslations('storefront.catalog.search');
  const router = useRouter();
  const wrapperRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [text, setText] = useState(value);
  const [debounced, setDebounced] = useState(value);
  const [syncedValue, setSyncedValue] = useState(value);
  const [open, setOpen] = useState(false);

  // La URL cambió por fuera (chip "quitar", atrás/adelante): el campo la sigue.
  // Si el cambio es el eco de lo que se está escribiendo, NO se pisa el campo
  // (se comería el espacio final mientras se teclea "crema ").
  if (value !== syncedValue) {
    setSyncedValue(value);
    if (value !== appliedQuery(text)) {
      setText(value);
      setDebounced(value);
    }
  }

  const onSearchRef = useRef(onSearch);
  useEffect(() => {
    onSearchRef.current = onSearch;
  }, [onSearch]);

  useEffect(() => {
    const timer = setTimeout(() => {
      const applied = appliedQuery(text);
      setDebounced(applied);
      if (applied !== value) onSearchRef.current(applied);
    }, DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [text, value]);

  const canSuggest = open && debounced.length >= MIN_CHARS;
  const { data: suggestions } = useStorefrontSuggest(ctx, debounced, canSuggest);
  const products = suggestions?.products ?? [];
  const categories = suggestions?.categories ?? [];
  const showPopover = canSuggest && text.trim().length >= MIN_CHARS;

  const submitAll = () => {
    setOpen(false);
    onSearch(appliedQuery(text));
    inputRef.current?.blur();
  };

  const clear = () => {
    setText('');
    setDebounced('');
    setOpen(false);
    onSearch('');
    inputRef.current?.focus();
  };

  return (
    <form
      role="search"
      aria-label={t('label')}
      className={cn('relative', className)}
      onSubmit={(event) => {
        event.preventDefault();
        submitAll();
      }}
    >
      <Command shouldFilter={false} loop label={t('label')} className="h-auto overflow-visible rounded-none bg-transparent">
        <Popover open={showPopover} onOpenChange={setOpen}>
          <PopoverAnchor asChild>
            <div
              ref={wrapperRef}
              className="flex h-11 items-center gap-2 rounded-full border border-gray-300 bg-white pl-4 pr-1 transition-shadow focus-within:border-[#3E667D] focus-within:ring-2 focus-within:ring-[#a7c1e2]"
            >
              <MagnifyingGlassIcon aria-hidden="true" className="size-5 shrink-0 text-gray-600" />
              <CommandPrimitive.Input
                ref={inputRef}
                value={text}
                onValueChange={(next) => {
                  setText(next.slice(0, 80));
                  setOpen(true);
                }}
                onFocus={() => setOpen(true)}
                onKeyDown={(event) => {
                  if (event.key === 'Escape' && showPopover) {
                    event.preventDefault();
                    setOpen(false);
                  }
                  // Sin lista abierta, Enter envía el formulario (busca lo escrito).
                  if (event.key === 'Enter' && !showPopover) {
                    event.preventDefault();
                    submitAll();
                  }
                }}
                placeholder={t('placeholder')}
                inputMode="search"
                enterKeyHint="search"
                maxLength={80}
                className="h-full min-w-0 flex-1 bg-transparent text-base text-gray-900 outline-none placeholder:text-gray-600 sm:text-sm"
              />
              {text.length > 0 && (
                <button
                  type="button"
                  onClick={clear}
                  aria-label={t('clear')}
                  className="flex size-9 shrink-0 cursor-pointer items-center justify-center rounded-full text-gray-700 hover:bg-gray-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#3E667D]"
                >
                  <XMarkIcon aria-hidden="true" className="size-5" />
                </button>
              )}
            </div>
          </PopoverAnchor>
          <PopoverContent
            align="start"
            sideOffset={6}
            onOpenAutoFocus={(event) => event.preventDefault()}
            onInteractOutside={(event) => {
              if (wrapperRef.current?.contains(event.target as Node)) event.preventDefault();
            }}
            className="w-[var(--radix-popover-trigger-width)] min-w-[280px] max-w-[92vw] p-0"
          >
            <CommandList className="max-h-[60vh]">
              <CommandGroup>
                <CommandItem value="__all__" onSelect={submitAll} className="min-h-11 cursor-pointer gap-3">
                  <MagnifyingGlassIcon aria-hidden="true" className="size-4" />
                  <span className="truncate">{t('viewAll', { q: text.trim() })}</span>
                </CommandItem>
              </CommandGroup>
              {products.length > 0 && (
                <CommandGroup heading={t('products')}>
                  {products.map((product) => {
                    const name = formatProductName(product.name);
                    return (
                      <CommandItem
                        key={product.slug}
                        value={`p:${product.slug}`}
                        onSelect={() => {
                          setOpen(false);
                          router.push(productPath(product.slug));
                        }}
                        className="min-h-12 cursor-pointer gap-3"
                      >
                        <span className="relative size-10 shrink-0 overflow-hidden rounded-md bg-gray-50">
                          <ProductImage
                            src={product.imageUrl}
                            alt=""
                            name={name}
                            sizes="40px"
                            monogramClassName="text-xs"
                          />
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="line-clamp-1 text-sm font-medium text-gray-900">{name}</span>
                          {product.price !== null && (
                            <span className="block text-xs text-gray-700">
                              {formatStorePrice(product.price, product.currencyCode, ctx.lang)}
                            </span>
                          )}
                        </span>
                      </CommandItem>
                    );
                  })}
                </CommandGroup>
              )}
              {categories.length > 0 && (
                <CommandGroup heading={t('categories')}>
                  {categories.map((category) => (
                    <CommandItem
                      key={category.slug}
                      value={`c:${category.slug}`}
                      onSelect={() => {
                        setOpen(false);
                        setText('');
                        setDebounced('');
                        onSelectCategory(category.slug);
                      }}
                      className="min-h-11 cursor-pointer"
                    >
                      {category.name}
                    </CommandItem>
                  ))}
                </CommandGroup>
              )}
            </CommandList>
          </PopoverContent>
        </Popover>
      </Command>
    </form>
  );
}
