import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Analytics } from "@vercel/analytics/next";
import { Toaster } from "sonner";
import { ReduxProvider } from "@/store/provider";
import { QueryProvider } from "@/providers/QueryProvider";
import { ReferralCodeCapture } from "@/components/ReferralCodeCapture";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'),
  title: "Tonic Life | Tu Centro de Bienestar Natural",
  description: "Descubre tu fórmula ideal de bienestar con productos naturales de alta calidad. Evaluación de Salud personalizada, recomendaciones únicas y envío gratis en pedidos +$99.",
  keywords: "suplementos naturales, bienestar, salud, tonic life, evaluación de salud, productos naturales",
  icons: {
    icon: '/favicon.ico',
    shortcut: '/favicon.ico',
    apple: '/images/logo-icon.png',
  },
  openGraph: {
    title: "Tonic Life | Tu Centro de Bienestar Natural",
    description: "Bienestar Natural, Vida Plena - Descubre tu fórmula ideal de bienestar",
    type: "website",
    images: [
      {
        url: '/images/logo.png',
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
    images: ['/images/logo.png'],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-white`}
      >
        <QueryProvider>
          <ReduxProvider>
            <ReferralCodeCapture />
            {children}
          </ReduxProvider>
        </QueryProvider>
        <Toaster richColors position="top-right" />
        <Analytics />
      </body>
    </html>
  );
}
