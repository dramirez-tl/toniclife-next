import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Toaster } from "sonner";
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
  title: "My Wellness Hub by Tonic Life | Wellness Made Simple",
  description: "Descubre tu fórmula ideal de bienestar con productos naturales de alta calidad. Health Quiz personalizado, recomendaciones únicas y envío gratis en pedidos +$99.",
  keywords: "suplementos naturales, bienestar, salud, tonic life, health quiz, productos naturales",
  icons: {
    icon: '/favicon.ico',
    shortcut: '/favicon.ico',
    apple: '/images/logo-icon.png',
  },
  openGraph: {
    title: "My Wellness Hub by Tonic Life",
    description: "Wellness Made Simple - Descubre tu fórmula ideal de bienestar",
    type: "website",
    images: [
      {
        url: '/images/logo.png',
        width: 1200,
        height: 630,
        alt: 'Tonic Life - My Wellness Hub',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: "My Wellness Hub by Tonic Life",
    description: "Wellness Made Simple - Descubre tu fórmula ideal de bienestar",
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
        {children}
        <Toaster richColors position="top-right" />
      </body>
    </html>
  );
}
