import type { Metadata } from 'next';
import { Outfit } from 'next/font/google';
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
      <body className="antialiased min-h-screen pb-12 text-sm bg-slate-50 text-slate-800">
        {children}
      </body>
    </html>
  );
}
