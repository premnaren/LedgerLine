'use client';

export type Theme = 'light' | 'dark';

export function getTheme(): Theme {
  if (typeof window === 'undefined') return 'light';
  try {
    const saved = localStorage.getItem('ledgerline_theme') as Theme | null;
    if (saved === 'light' || saved === 'dark') return saved;
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  } catch {
    return 'light';
  }
}

export function setTheme(theme: Theme) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem('ledgerline_theme', theme);
  } catch {}

  const root = document.documentElement;
  if (theme === 'dark') {
    root.classList.add('dark');
    root.setAttribute('data-theme', 'dark');
  } else {
    root.classList.remove('dark');
    root.setAttribute('data-theme', 'light');
  }

  window.dispatchEvent(new CustomEvent('ledgerline-theme-change', { detail: theme }));
}

export function subscribeTheme(callback: (theme: Theme) => void) {
  if (typeof window === 'undefined') return () => {};

  const handleCustom = (e: Event) => {
    const detail = (e as CustomEvent<Theme>).detail;
    callback(detail || getTheme());
  };

  const handleStorage = (e: StorageEvent) => {
    if (e.key === 'ledgerline_theme') {
      callback(getTheme());
    }
  };

  window.addEventListener('ledgerline-theme-change', handleCustom);
  window.addEventListener('storage', handleStorage);

  return () => {
    window.removeEventListener('ledgerline-theme-change', handleCustom);
    window.removeEventListener('storage', handleStorage);
  };
}

