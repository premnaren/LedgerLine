import type { Metadata } from 'next';
import './globals.css';
import Navbar from '@/components/Navbar';

export const metadata: Metadata = {
  title: 'LedgerLine — Double-Entry Core Banking Engine',
  description: 'Enterprise append-only double-entry ledger with serializable ACID guarantees',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="antialiased bg-slate-50 text-slate-900 min-h-screen">
        <Navbar />
        <main className="max-w-7xl mx-auto px-4 py-6 sm:px-6 lg:px-8 sm:py-8">
          {children}
        </main>
      </body>
    </html>
  );
}

