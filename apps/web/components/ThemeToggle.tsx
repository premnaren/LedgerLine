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
}: ThemeToggleProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={!isDark}
      onClick={() => onToggle(!isDark)}
      className={`group relative inline-flex items-center w-[52px] h-[28px] rounded-full p-[2.5px] transition-colors duration-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#8B7CFF]/50 cursor-pointer select-none shrink-0 ${
        isDark
          ? 'bg-[#100E22]/90 border border-white/15 shadow-[0_2px_8px_rgba(0,0,0,0.35)]'
          : 'bg-[#F0EDF9] border-[1.5px] border-[#A99BD8]/45 shadow-[0_2px_8px_rgba(120,100,203,0.12)]'
      } ${className}`}
      title={isDark ? 'Switch to Light Mode (Lunar White)' : 'Switch to Dark Mode (Cosmic Dark)'}
      aria-label={isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
    >
      {/* Sliding Thumb with Single Dedicated Theme Icon */}
      <span
        className={`relative flex items-center justify-center w-[21px] h-[21px] rounded-full transition-transform duration-300 ease-out ${
          isDark
            ? 'translate-x-[24px] bg-[#1E1B33] border border-white/20 text-[#BD75E9] shadow-[0_1px_4px_rgba(0,0,0,0.5)]'
            : 'translate-x-0 bg-white border border-[#D5CEE8] text-[#E6A23C] shadow-[0_2px_6px_rgba(120,100,203,0.22)]'
        }`}
      >
        {isDark ? (
          <Moon className="w-3.5 h-3.5" />
        ) : (
          <Sun className="w-3.5 h-3.5" />
        )}
      </span>
    </button>
  );
}
