'use client';

import React from 'react';
import { Sun, Moon } from 'lucide-react';

interface ThemeToggleProps {
  className?: string;
  isDark: boolean;
  onToggle: (nextDark: boolean) => void;
  compact?: boolean;
}

export default function ThemeToggle({
  className = '',
  isDark,
  onToggle,
  compact = false,
}: ThemeToggleProps) {
  if (compact) {
    return (
      <button
        type="button"
        onClick={() => onToggle(!isDark)}
        className={`relative inline-flex items-center justify-center w-8 h-8 rounded-lg border border-rule/70 bg-surface/60 hover:bg-surface-secondary text-ink-muted hover:text-ink transition-all duration-200 pressable shadow-xs focus:outline-none focus:ring-1 focus:ring-primary/40 ${className}`}
        title={isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
        aria-label={isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
      >
        {isDark ? (
          <Sun className="w-4 h-4 text-[#F0B85A] transition-transform duration-200 rotate-0 hover:rotate-45" />
        ) : (
          <Moon className="w-4 h-4 text-primary transition-transform duration-200 -rotate-12 hover:rotate-0" />
        )}
      </button>
    );
  }

  return (
    <div className={`theme-switch-wrapper ${className}`}>
      <label
        className="theme-switch"
        htmlFor="theme-toggle-switch"
        title={isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
      >
        <input
          id="theme-toggle-switch"
          type="checkbox"
          className="circle"
          checked={!isDark}
          onChange={(e) => onToggle(!e.target.checked)}
          aria-label={isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
        />
        <svg viewBox="0 0 384 512" xmlns="http://www.w3.org/2000/svg" className="moon svg">
          {/* Font Awesome Free 6.5.1 by @fontawesome */}
          <path d="M223.5 32C100 32 0 132.3 0 256S100 480 223.5 480c60.6 0 115.5-24.2 155.8-63.4c5-4.9 6.3-12.5 3.1-18.7s-10.1-9.7-17-8.5c-9.8 1.7-19.8 2.6-30.1 2.6c-96.9 0-175.5-78.8-175.5-176c0-65.8 36-123.1 89.3-153.3c6.1-3.5 9.2-10.5 7.7-17.3s-7.3-11.9-14.3-12.5c-6.3-.5-12.6-.8-19-.8z" />
        </svg>
        <div className="sun svg">
          <span className="dot" />
        </div>
      </label>
    </div>
  );
}

