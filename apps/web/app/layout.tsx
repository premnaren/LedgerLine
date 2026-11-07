import type { Metadata } from 'next';
import './globals.css';
import Navbar from '@/components/Navbar';
import MainWrapper from '@/components/MainWrapper';

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
      <body className="antialiased bg-[#F5F8FC] text-[#172B45] min-h-screen">
        <Navbar />
        <MainWrapper>{children}</MainWrapper>
      </body>
    </html>
  );
}

