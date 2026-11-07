'use client';

import React from 'react';
import { usePathname } from 'next/navigation';

export default function MainWrapper({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  // On login screen, render full-viewport edge-to-edge container for the split-screen layout
  if (pathname === '/login') {
    return <main className="min-h-screen w-full overflow-x-hidden">{children}</main>;
  }

  // On standard application dashboard screens, maintain existing container padding
  return (
    <main className="max-w-7xl mx-auto px-4 py-6 sm:px-6 lg:px-8 sm:py-8">
      {children}
    </main>
  );
}

