'use client';

import React from 'react';

interface CosmicPlanetarySystemProps {
  isDark?: boolean;
}

export default function CosmicPlanetarySystem({ isDark = true }: CosmicPlanetarySystemProps) {
  return (
    <div className="overflow-hidden fixed inset-0 z-0 w-full h-full pointer-events-none select-none">
      {isDark ? (
        <div className="absolute inset-0 w-full h-full">
          {/* User-supplied High-Fidelity Cosmic Planetary Wallpaper */}
          <img
            src="/cosmic-bg.jpg"
            alt="Cosmic Planetary System"
            className="object-cover object-center absolute inset-0 w-full h-full transition-opacity duration-700"
          />

          {/* Deep space radial vignette for overall contrast and depth */}
          <div
            className="absolute inset-0 w-full h-full pointer-events-none"
            style={{
              background:
                'radial-gradient(circle at 30% 50%, rgba(8, 7, 18, 0.45) 0%, rgba(8, 7, 18, 0.15) 55%, rgba(8, 7, 18, 0.55) 100%)',
            }}
          />

          {/* Local atmospheric shadow behind the left authentication card */}
          <div
            className="absolute top-[20%] left-[4%] w-[620px] max-w-[92vw] h-[600px] rounded-full blur-[85px] pointer-events-none opacity-80"
            style={{
              background:
                'radial-gradient(ellipse at 50% 50%, rgba(8, 7, 18, 0.90) 0%, rgba(8, 7, 18, 0.50) 60%, transparent 85%)',
            }}
          />

          {/* Subtle atmospheric violet glow bloom accentuating the planetary crescent */}
          <div
            className="absolute -top-[10%] -right-[5%] w-[850px] h-[850px] rounded-full blur-[120px] opacity-35 pointer-events-none"
            style={{
              background:
                'radial-gradient(circle, rgba(189, 117, 233, 0.40) 0%, rgba(129, 85, 217, 0.25) 45%, transparent 75%)',
            }}
          />
        </div>
      ) : (
        <div className="absolute inset-0 w-full h-full bg-[#F8F7FC] transition-colors duration-700">
          {/* User-supplied High-Fidelity Lunar White Landscape Artwork */}
          <img
            src="/lunar-bg.jpg"
            alt="Lunar White — Pastel Cosmic Landscape"
            className="object-cover object-[75%_35%] sm:object-[70%_40%] absolute inset-0 w-full h-full transition-opacity duration-700"
          />

          {/* Subtle localized soft white translucent shadow/overlay behind the left authentication card only */}
          <div
            className="absolute top-[16%] left-[2%] w-[580px] max-w-[94vw] h-[640px] rounded-[36px] blur-[60px] pointer-events-none opacity-65"
            style={{
              background:
                'radial-gradient(ellipse at 50% 50%, rgba(255, 255, 255, 0.85) 0%, rgba(248, 247, 252, 0.45) 55%, transparent 80%)',
            }}
          />
        </div>
      )}
    </div>
  );
}
