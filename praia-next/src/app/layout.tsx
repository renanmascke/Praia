import type { Metadata } from 'next';
import { Outfit } from 'next/font/google';
import { SpeedInsights } from '@vercel/speed-insights/next';
import { Analytics } from '@vercel/analytics/react';
import './globals.css';

const outfit = Outfit({
  subsets: ['latin'],
  variable: '--font-outfit',
});

export const metadata: Metadata = {
  title: 'inDica Praia',
  description: 'Boletim em tempo real das melhores e mais seguras praias no litoral.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt-BR" className={`${outfit.variable} font-sans`}>
      <body className="antialiased min-h-screen text-sm bg-slate-50 text-slate-800">
        {children}
        <SpeedInsights />
        <Analytics />
      </body>
    </html>
  );
}
