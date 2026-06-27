import type { Metadata } from "next";
import { Geist_Mono } from "next/font/google";
import localFont from "next/font/local";
import { cookies } from "next/headers";
import { NextIntlClientProvider } from "next-intl";
import { Analytics } from "@vercel/analytics/next";
import { Toaster } from "sonner";
import { ReduxProvider } from "@/store/provider";
import { QueryProvider } from "@/providers/QueryProvider";
import { ReferralCodeCapture } from "@/components/ReferralCodeCapture";
import { VersionChecker } from "@/components/VersionChecker";
import { DEFAULT_LOCALE, isSupportedLocale, localeLanguage } from "@/i18n/config";
import esMessages from "@/messages/es.json";
import enMessages from "@/messages/en.json";
import "./globals.css";

// Tipografía de marca (fuentes entregadas por diseño, self-hosted):
//   - Satoshi: sans principal de TODO el proyecto (variable, pesos 300-900).
//   - Ibarra Real Nova: serif para títulos/acentos de marca (clase font-serif).
//   - Geist Mono se conserva para monoespaciado (folios, números, código).
const satoshi = localFont({
  src: [
    {
      path: "../fonts/Satoshi-Variable.woff2",
      weight: "300 900",
      style: "normal",
    },
    {
      path: "../fonts/Satoshi-VariableItalic.woff2",
      weight: "300 900",
      style: "italic",
    },
  ],
  variable: "--font-satoshi",
  display: "swap",
});

const ibarra = localFont({
  src: [
    { path: "../fonts/IbarraRealNova-Regular.ttf", weight: "400", style: "normal" },
    { path: "../fonts/IbarraRealNova-Italic.ttf", weight: "400", style: "italic" },
    { path: "../fonts/IbarraRealNova-Medium.ttf", weight: "500", style: "normal" },
    { path: "../fonts/IbarraRealNova-SemiBold.ttf", weight: "600", style: "normal" },
    { path: "../fonts/IbarraRealNova-Bold.ttf", weight: "700", style: "normal" },
  ],
  variable: "--font-ibarra",
  display: "swap",
  // Solo se usa en títulos puntuales: sin preload para no cargar 5 TTF
  // en cada página (el swap la trae al primer uso).
  preload: false,
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'),
  title: "Tonic Life | Tu Centro de Bienestar Natural",
  description: "Descubre tu fórmula ideal de bienestar con productos naturales de alta calidad. Evaluación de Salud personalizada y recomendaciones únicas.",
  keywords: "suplementos naturales, bienestar, salud, tonic life, evaluación de salud, productos naturales",
  icons: {
    icon: '/favicon.ico',
    shortcut: '/favicon.ico',
    apple: '/images/logo/svg/logo-icon-blue-solid.svg',
  },
  openGraph: {
    title: "Tonic Life | Tu Centro de Bienestar Natural",
    description: "Bienestar Natural, Vida Plena - Descubre tu fórmula ideal de bienestar",
    type: "website",
    images: [
      {
        url: '/images/logo/svg/logo-text-blue-r.svg',
        width: 1200,
        height: 630,
        alt: 'Tonic Life - Tu Centro de Bienestar Natural',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: "Tonic Life | Tu Centro de Bienestar Natural",
    description: "Bienestar Natural, Vida Plena - Descubre tu fórmula ideal de bienestar",
    images: ['/images/logo/svg/logo-text-blue-r.svg'],
  },
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // Idioma global desde la cookie NEXT_LOCALE (la escribe el selector). Da
  // contexto de i18n a TODAS las páginas (incl. las no localizadas como /faq,
  // /carrito) para que el Header/Footer compartidos puedan traducir. En las
  // páginas /[locale]/... el provider anidado de ese layout (locale de la URL)
  // tiene prioridad.
  const cookieStore = await cookies();
  const cookieLocale = cookieStore.get('NEXT_LOCALE')?.value;
  const locale =
    cookieLocale && isSupportedLocale(cookieLocale) ? cookieLocale : DEFAULT_LOCALE;
  const lang = localeLanguage(locale);
  const messages = lang === 'en' ? enMessages : esMessages;

  return (
    <html lang={lang}>
      <body
        className={`${satoshi.variable} ${ibarra.variable} ${geistMono.variable} antialiased bg-white`}
      >
        <NextIntlClientProvider locale={locale} messages={messages}>
          <QueryProvider>
            <ReduxProvider>
              <ReferralCodeCapture />
              <VersionChecker />
              {children}
            </ReduxProvider>
          </QueryProvider>
        </NextIntlClientProvider>
        <Toaster richColors position="top-right" />
        <Analytics />
      </body>
    </html>
  );
}
