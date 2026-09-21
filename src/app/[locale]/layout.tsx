import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { NextIntlClientProvider } from 'next-intl';
import { getMessages, setRequestLocale } from 'next-intl/server';
import { routing } from '@/i18n/routing';
import { CartCountryDialog } from '@/components/cart/CartCountryDialog';
import { buildLocaleMetadata } from '@/lib/storefront/metadata';

// Layout de las páginas públicas localizadas (/[locale]/...). El <html> y los
// providers globales viven en el layout raíz; aquí solo se añade el provider de
// next-intl. admin/ y distribuidor/ NO pasan por aquí (no se localizan).
// `CartCountryDialog` (C2) vive aquí y no en el Header porque el checkout no lo monta.

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

// Metadata base por locale: textos en el idioma de la URL, og:locale y noindex en
// países sin tienda (CO/GT). Canonical y hreflang los pone cada PÁGINA (si vivieran
// aquí, carrito/checkout/detalle heredarían una canónica ajena).
export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  if (!routing.locales.includes(locale)) return {};
  return buildLocaleMetadata(locale);
}

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!routing.locales.includes(locale)) {
    notFound();
  }
  setRequestLocale(locale);
  const messages = await getMessages();

  return (
    <NextIntlClientProvider locale={locale} messages={messages}>
      {children}
      <CartCountryDialog />
    </NextIntlClientProvider>
  );
}
