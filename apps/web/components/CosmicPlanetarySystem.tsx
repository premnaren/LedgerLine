'use client';

import React from 'react';

interface CosmicPlanetarySystemProps {
  isDark?: boolean;
}

export default function CosmicPlanetarySystem({ isDark = true }: CosmicPlanetarySystemProps) {
  return (
    <div className="absolute inset-0 w-full h-full overflow-hidden pointer-events-none select-none z-0">
      {isDark ? (
        <div className="absolute inset-0 w-full h-full">
          {/* User-supplied High-Fidelity Cosmic Planetary Wallpaper */}
          <img
            src="/cosmic-bg.jpg"
            alt="Cosmic Planetary System"
            className="absolute inset-0 w-full h-full object-cover object-center transition-opacity duration-700"
          />

          {/* Deep space radial vignette to ensure maximum authentication card legibility and depth */}
          <div
            className="absolute inset-0 w-full h-full pointer-events-none"
            style={{
              background:
                'radial-gradient(circle at 50% 50%, rgba(8, 7, 18, 0.40) 0%, rgba(8, 7, 18, 0.10) 60%, rgba(8, 7, 18, 0.55) 100%)',
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
        <div className="absolute inset-0 w-full h-full bg-[#F4F1FA] transition-colors duration-700">
          {/* Light Cosmic Theme: Ethereal lavender & celestial peach nebula aura */}
          <div
            className="absolute -top-[15%] -right-[10%] w-[1000px] h-[1000px] lg:w-[1200px] lg:h-[1200px] rounded-full blur-[140px] opacity-75 transition-all duration-700 pointer-events-none"
            style={{
              background:
                'radial-gradient(circle, rgba(214, 194, 244, 0.60) 0%, rgba(240, 199, 229, 0.45) 35%, rgba(196, 221, 249, 0.25) 60%, transparent 75%)',
            }}
          />

          {/* Light Cosmic: Lower-left celestial peach & aurora blue bloom */}
          <div
            className="absolute -bottom-[20%] -left-[10%] w-[800px] h-[800px] rounded-full blur-[160px] opacity-50 transition-all duration-700 pointer-events-none"
            style={{
              background:
                'radial-gradient(circle, rgba(246, 217, 206, 0.50) 0%, rgba(196, 221, 249, 0.30) 40%, transparent 75%)',
            }}
          />

          {/* Luminous pearl planetary body for light mode */}
          <div className="absolute -top-[120px] -right-[140px] sm:-top-[160px] sm:-right-[180px] md:-top-[200px] md:-right-[220px] lg:-top-[260px] lg:-right-[260px] xl:-top-[300px] xl:-right-[300px] w-[640px] h-[640px] sm:w-[780px] sm:h-[780px] md:w-[920px] md:h-[920px] lg:w-[1080px] lg:h-[1080px] xl:w-[1200px] xl:h-[1200px] transition-transform duration-1000">
            <svg
              viewBox="0 0 1000 1000"
              className="w-full h-full filter drop-shadow-2xl"
              xmlns="http://www.w3.org/2000/svg"
            >
              <defs>
                <filter id="coronaBloomLight" x="-40%" y="-40%" width="180%" height="180%">
                  <feGaussianBlur in="SourceGraphic" stdDeviation="32" result="blur1" />
                  <feGaussianBlur in="SourceGraphic" stdDeviation="14" result="blur2" />
                  <feMerge>
                    <feMergeNode in="blur1" />
                    <feMergeNode in="blur2" />
                    <feMergeNode in="SourceGraphic" />
                  </feMerge>
                </filter>
                <filter id="rimGlowLight" x="-20%" y="-20%" width="140%" height="140%">
                  <feGaussianBlur in="SourceGraphic" stdDeviation="8" result="blur" />
                  <feMerge>
                    <feMergeNode in="blur" />
                    <feMergeNode in="SourceGraphic" />
                  </feMerge>
                </filter>
                <linearGradient id="lightCrescentGrad" x1="0%" y1="100%" x2="50%" y2="0%">
                  <stop offset="0%" stopColor="#C9E9ED" stopOpacity="0.8" />
                  <stop offset="30%" stopColor="#C4DDF9" stopOpacity="0.9" />
                  <stop offset="60%" stopColor="#F0C7E5" stopOpacity="1" />
                  <stop offset="82%" stopColor="#FFFFFF" stopOpacity="1" />
                  <stop offset="92%" stopColor="#F6D9CE" stopOpacity="0.85" />
                  <stop offset="100%" stopColor="#D6C2F4" stopOpacity="0.4" />
                </linearGradient>
                <radialGradient id="lightPlanetShadow" cx="22%" cy="68%" r="75%">
                  <stop offset="0%" stopColor="#F0C7E5" stopOpacity="0.4" />
                  <stop offset="25%" stopColor="#D6C2F4" stopOpacity="0.35" />
                  <stop offset="50%" stopColor="#EEE8FA" stopOpacity="0.95" />
                  <stop offset="80%" stopColor="#F4F1FA" stopOpacity="0.98" />
                  <stop offset="100%" stopColor="#FAF9FF" stopOpacity="1" />
                </radialGradient>
                <linearGradient id="lightCoronaGrad" x1="0%" y1="100%" x2="45%" y2="0%">
                  <stop offset="0%" stopColor="rgba(196, 221, 249, 0.5)" />
                  <stop offset="50%" stopColor="rgba(240, 199, 229, 0.65)" />
                  <stop offset="80%" stopColor="rgba(255, 255, 255, 0.9)" />
                  <stop offset="100%" stopColor="rgba(214, 194, 244, 0.3)" />
                </linearGradient>
              </defs>

              <circle cx="500" cy="500" r="470" fill="url(#lightPlanetShadow)" />
              <path
                d="M 500 970 A 470 470 0 0 1 82 320"
                fill="none"
                stroke="url(#lightCoronaGrad)"
                strokeWidth="56"
                strokeLinecap="round"
                filter="url(#coronaBloomLight)"
                opacity="0.65"
              />
              <path
                d="M 500 970 A 470 470 0 0 1 82 320"
                fill="none"
                stroke="url(#lightCrescentGrad)"
                strokeWidth="20"
                strokeLinecap="round"
                filter="url(#rimGlowLight)"
                opacity="0.95"
              />
              <path
                d="M 460 966 A 470 470 0 0 1 95 350"
                fill="none"
                stroke="#FFFFFF"
                strokeWidth="3.5"
                strokeLinecap="round"
                opacity="0.98"
              />
            </svg>
          </div>

          {/* Light celestial moon */}
          <div className="absolute top-[12%] left-[8%] sm:top-[14%] sm:left-[11%] w-14 h-14 sm:w-20 sm:h-20 md:w-24 md:h-24 transition-transform duration-1000">
            <svg viewBox="0 0 100 100" className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
              <defs>
                <radialGradient id="moonShadowLight" cx="30%" cy="70%" r="70%">
                  <stop offset="0%" stopColor="#F0C7E5" stopOpacity="0.4" />
                  <stop offset="40%" stopColor="#EEE8FA" stopOpacity="0.95" />
                  <stop offset="100%" stopColor="#FAF9FF" stopOpacity="1" />
                </radialGradient>
                <linearGradient id="moonRimLight" x1="0%" y1="100%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#C9E9ED" />
                  <stop offset="60%" stopColor="#F0C7E5" />
                  <stop offset="100%" stopColor="#FFFFFF" />
                </linearGradient>
              </defs>
              <circle cx="50" cy="50" r="44" fill="url(#moonShadowLight)" />
              <path
                d="M 50 94 A 44 44 0 0 1 12 32"
                fill="none"
                stroke="url(#moonRimLight)"
                strokeWidth="3.5"
                strokeLinecap="round"
                opacity="0.9"
              />
            </svg>
          </div>
        </div>
      )}
    </div>
  );
}
