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
    <button
      type="button"
      role="switch"
      aria-checked={!isDark}
      onClick={() => onToggle(!isDark)}
      className={`group relative inline-flex items-center w-[54px] h-[28px] rounded-full p-[2px] transition-all duration-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#8B7CFF]/50 cursor-pointer select-none ${
        isDark
          ? 'bg-[#141226]/90 border border-white/15 shadow-[0_2px_8px_rgba(0,0,0,0.35)]'
          : 'bg-[#F8F7FC] border-[1.5px] border-[#A99BD8]/45 shadow-[0_2px_8px_rgba(120,100,203,0.12)]'
      } ${className}`}
      title={isDark ? 'Switch to Light Mode (Lunar White)' : 'Switch to Dark Mode (Cosmic Dark)'}
      aria-label={isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
    >
      {/* Background Icons */}
      <span className="absolute inset-0 flex items-center justify-between px-1.5 pointer-events-none">
        {/* Moon Icon (Visible in Dark Mode) */}
        <Moon
          className={`w-3.5 h-3.5 transition-all duration-300 ${
            isDark ? 'text-[#C4C9D1] opacity-90 scale-100' : 'text-[#A99BD8] opacity-0 scale-75'
          }`}
        />
        {/* Sun Icon (Visible in Light Mode) */}
        <Sun
          className={`w-3.5 h-3.5 transition-all duration-300 ${
            !isDark ? 'text-[#7864CB] opacity-100 scale-100' : 'text-[#ECCA2F] opacity-0 scale-75'
          }`}
        />
      </span>

      {/* Sliding Thumb */}
      <span
        className={`relative flex items-center justify-center w-[22px] h-[22px] rounded-full transition-transform duration-300 ease-out z-10 ${
          isDark
            ? 'translate-x-[26px] bg-[#221F38] border border-white/20 shadow-[0_1px_4px_rgba(0,0,0,0.5)]'
            : 'translate-x-0 bg-white border border-[#DDD7EA] shadow-[0_2px_6px_rgba(120,100,203,0.22)]'
        }`}
      >
        {isDark ? (
          <Moon className="w-2.5 h-2.5 text-[#BD75E9]" />
        ) : (
          <Sun className="w-2.5 h-2.5 text-[#E6A23C]" />
        )}
      </span>
    </button>
  );
}


