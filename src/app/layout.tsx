import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { Providers } from '@/components/Providers';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
});

export const metadata: Metadata = {
  title: 'ArgenCash - Sistema de Gestión de Divisas',
  description: 'Plataforma SaaS para gestión de compra/venta de divisas en Argentina',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" className="dark">
      <body className={`${inter.variable} font-sans antialiased bg-slate-900 text-white`}>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
