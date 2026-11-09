'use client';

import React from 'react';

interface CosmicPlanetarySystemProps {
  isDark?: boolean;
}

export default function CosmicPlanetarySystem({ isDark = true }: CosmicPlanetarySystemProps) {
  return (
    <div className="absolute inset-0 w-full h-full overflow-hidden pointer-events-none select-none z-0">
      {/* ============================================================ */}
      {/* LAYER 1: Ambient Nebula Atmosphere & Diffuse Spatial Glow     */}
      {/* ============================================================ */}
      {isDark ? (
        <>
          {/* Deep celestial nebula aura behind main planet */}
          <div
            className="absolute -top-[15%] -right-[10%] w-[1000px] h-[1000px] lg:w-[1200px] lg:h-[1200px] rounded-full blur-[140px] opacity-70 transition-all duration-700 pointer-events-none"
            style={{
              background:
                'radial-gradient(circle, rgba(129, 85, 217, 0.45) 0%, rgba(84, 42, 145, 0.35) 30%, rgba(189, 117, 233, 0.20) 55%, transparent 75%)',
            }}
          />

          {/* Secondary lower-left soft cyan & magenta spatial bloom */}
          <div
            className="absolute -bottom-[20%] -left-[10%] w-[800px] h-[800px] rounded-full blur-[160px] opacity-40 transition-all duration-700 pointer-events-none"
            style={{
              background:
                'radial-gradient(circle, rgba(100, 142, 255, 0.25) 0%, rgba(117, 200, 240, 0.15) 35%, rgba(189, 117, 233, 0.12) 60%, transparent 75%)',
            }}
          />

          {/* Central subtle violet spatial vignette */}
          <div
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[900px] h-[900px] rounded-full blur-[180px] opacity-25 pointer-events-none"
            style={{
              background: 'radial-gradient(circle, rgba(84, 42, 145, 0.35) 0%, transparent 70%)',
            }}
          />
        </>
      ) : (
        <>
          {/* Light Cosmic: Ethereal lavender & celestial peach nebula aura */}
          <div
            className="absolute -top-[15%] -right-[10%] w-[1000px] h-[1000px] lg:w-[1200px] lg:h-[1200px] rounded-full blur-[140px] opacity-75 transition-all duration-700 pointer-events-none"
            style={{
              background:
                'radial-gradient(circle, rgba(214, 194, 244, 0.55) 0%, rgba(240, 199, 229, 0.40) 35%, rgba(196, 221, 249, 0.25) 60%, transparent 75%)',
            }}
          />

          {/* Light Cosmic: Lower-left celestial peach & aurora blue bloom */}
          <div
            className="absolute -bottom-[20%] -left-[10%] w-[800px] h-[800px] rounded-full blur-[160px] opacity-50 transition-all duration-700 pointer-events-none"
            style={{
              background:
                'radial-gradient(circle, rgba(246, 217, 206, 0.45) 0%, rgba(196, 221, 249, 0.30) 40%, transparent 75%)',
            }}
          />
        </>
      )}

      {/* ============================================================ */}
      {/* LAYER 2: Massive Cinematic Planetary Body (Upper-Right)      */}
      {/* ============================================================ */}
      <div className="absolute -top-[120px] -right-[140px] sm:-top-[160px] sm:-right-[180px] md:-top-[200px] md:-right-[220px] lg:-top-[260px] lg:-right-[260px] xl:-top-[300px] xl:-right-[300px] w-[640px] h-[640px] sm:w-[780px] sm:h-[780px] md:w-[920px] md:h-[920px] lg:w-[1080px] lg:h-[1080px] xl:w-[1200px] xl:h-[1200px] transition-transform duration-1000">
        <svg
          viewBox="0 0 1000 1000"
          className="w-full h-full filter drop-shadow-2xl"
          xmlns="http://www.w3.org/2000/svg"
        >
          <defs>
            {/* Filter: Intense atmospheric corona bloom */}
            <filter id="coronaBloom" x="-40%" y="-40%" width="180%" height="180%">
              <feGaussianBlur in="SourceGraphic" stdDeviation="32" result="blur1" />
              <feGaussianBlur in="SourceGraphic" stdDeviation="14" result="blur2" />
              <feMerge>
                <feMergeNode in="blur1" />
                <feMergeNode in="blur2" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>

            {/* Filter: Hot rim edge glow */}
            <filter id="rimGlow" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur in="SourceGraphic" stdDeviation="8" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>

            {/* DARK COSMIC GRADIENTS */}
            {/* Crescent rim gradient (Incandescent white -> Magenta glow -> Electric violet -> Deep space) */}
            <linearGradient id="darkCrescentGrad" x1="0%" y1="100%" x2="50%" y2="0%">
              <stop offset="0%" stopColor="#75C8F0" stopOpacity="0.7" />
              <stop offset="25%" stopColor="#648EFF" stopOpacity="0.95" />
              <stop offset="55%" stopColor="#BD75E9" stopOpacity="1" />
              <stop offset="78%" stopColor="#FFFFFF" stopOpacity="1" />
              <stop offset="90%" stopColor="#E8B4FF" stopOpacity="0.9" />
              <stop offset="100%" stopColor="#8155D9" stopOpacity="0.4" />
            </linearGradient>

            {/* Dark planetary shadow spherical falloff */}
            <radialGradient id="darkPlanetShadow" cx="22%" cy="68%" r="75%">
              <stop offset="0%" stopColor="#8155D9" stopOpacity="0.25" />
              <stop offset="18%" stopColor="#542A91" stopOpacity="0.20" />
              <stop offset="42%" stopColor="#17112D" stopOpacity="0.92" />
              <stop offset="68%" stopColor="#100D20" stopOpacity="0.98" />
              <stop offset="100%" stopColor="#080712" stopOpacity="1" />
            </radialGradient>

            {/* Outer corona gradient */}
            <linearGradient id="darkCoronaGrad" x1="0%" y1="100%" x2="45%" y2="0%">
              <stop offset="0%" stopColor="rgba(100, 142, 255, 0.45)" />
              <stop offset="40%" stopColor="rgba(189, 117, 233, 0.65)" />
              <stop offset="70%" stopColor="rgba(255, 255, 255, 0.85)" />
              <stop offset="100%" stopColor="rgba(129, 85, 217, 0.25)" />
            </linearGradient>

            {/* LIGHT COSMIC GRADIENTS */}
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

          {/* 1. Deep Celestial Base Sphere */}
          <circle
            cx="500"
            cy="500"
            r="470"
            fill={isDark ? 'url(#darkPlanetShadow)' : 'url(#lightPlanetShadow)'}
          />

          {/* 2. Outer Atmospheric Corona Blur along illuminated rim */}
          <path
            d="M 500 970 A 470 470 0 0 1 82 320"
            fill="none"
            stroke={isDark ? 'url(#darkCoronaGrad)' : 'url(#lightCoronaGrad)'}
            strokeWidth="56"
            strokeLinecap="round"
            filter="url(#coronaBloom)"
            opacity={isDark ? 0.75 : 0.65}
          />

          {/* 3. Mid-layer Glowing Rim (Magenta / Violet / Pink) */}
          <path
            d="M 500 970 A 470 470 0 0 1 82 320"
            fill="none"
            stroke={isDark ? 'url(#darkCrescentGrad)' : 'url(#lightCrescentGrad)'}
            strokeWidth="20"
            strokeLinecap="round"
            filter="url(#rimGlow)"
            opacity="0.95"
          />

          {/* 4. Razor-sharp Incandescent Rim Crest (White-hot core) */}
          <path
            d="M 460 966 A 470 470 0 0 1 95 350"
            fill="none"
            stroke="#FFFFFF"
            strokeWidth="3.5"
            strokeLinecap="round"
            opacity="0.98"
          />

          {/* 5. Subtle atmospheric internal haze line */}
          <path
            d="M 440 950 A 450 450 0 0 1 125 380"
            fill="none"
            stroke={isDark ? '#BD75E9' : '#F0C7E5'}
            strokeWidth="8"
            strokeLinecap="round"
            opacity="0.30"
            filter="url(#rimGlow)"
          />
        </svg>
      </div>

      {/* ============================================================ */}
      {/* LAYER 3: Distant Celestial Moon / Orb (Upper-Left)           */}
      {/* ============================================================ */}
      <div className="absolute top-[12%] left-[8%] sm:top-[14%] sm:left-[11%] w-14 h-14 sm:w-20 sm:h-20 md:w-24 md:h-24 transition-transform duration-1000">
        <svg viewBox="0 0 100 100" className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <radialGradient id="moonShadowDark" cx="30%" cy="70%" r="70%">
              <stop offset="0%" stopColor="#BD75E9" stopOpacity="0.3" />
              <stop offset="35%" stopColor="#17112D" stopOpacity="0.95" />
              <stop offset="100%" stopColor="#080712" stopOpacity="1" />
            </radialGradient>
            <radialGradient id="moonShadowLight" cx="30%" cy="70%" r="70%">
              <stop offset="0%" stopColor="#F0C7E5" stopOpacity="0.4" />
              <stop offset="40%" stopColor="#EEE8FA" stopOpacity="0.95" />
              <stop offset="100%" stopColor="#FAF9FF" stopOpacity="1" />
            </radialGradient>
            <linearGradient id="moonRimDark" x1="0%" y1="100%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#75C8F0" />
              <stop offset="60%" stopColor="#BD75E9" />
              <stop offset="100%" stopColor="#FFFFFF" />
            </linearGradient>
            <linearGradient id="moonRimLight" x1="0%" y1="100%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#C9E9ED" />
              <stop offset="60%" stopColor="#F0C7E5" />
              <stop offset="100%" stopColor="#FFFFFF" />
            </linearGradient>
          </defs>

          {/* Moon base */}
          <circle
            cx="50"
            cy="50"
            r="44"
            fill={isDark ? 'url(#moonShadowDark)' : 'url(#moonShadowLight)'}
          />
          {/* Moon illuminated crescent */}
          <path
            d="M 50 94 A 44 44 0 0 1 12 32"
            fill="none"
            stroke={isDark ? 'url(#moonRimDark)' : 'url(#moonRimLight)'}
            strokeWidth="3.5"
            strokeLinecap="round"
            opacity="0.9"
          />
        </svg>
      </div>
    </div>
  );
}

