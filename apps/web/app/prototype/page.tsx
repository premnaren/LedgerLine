import React from 'react';
import FigmaPrototypeViewer from '@/components/FigmaPrototypeViewer';

export const metadata = {
  title: 'LedgerLine — Figma Prototype Reviewer',
  description: 'Interactive design system and core double-entry flow prototype review suite.',
};

export default function PrototypePage() {
  return <FigmaPrototypeViewer initialScreen="01_login_screen" />;
}
