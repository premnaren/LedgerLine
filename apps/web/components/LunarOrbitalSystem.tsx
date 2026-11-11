'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Wallet,
  ArrowLeftRight,
  ShieldCheck,
  Search,
  X,
  Sparkles,
} from 'lucide-react';

interface CelestialFeature {
  id: string;
  title: string;
  badge: string;
  description: string;
  principle: string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
  glowColor: string;
  baseRadius: number; // visual size hierarchy
}

const CELESTIAL_STARS: CelestialFeature[] = [
  {
    id: 'accounts',
    title: 'Accounts',
    badge: 'Dual-Leg Ledger',
    description: 'Organized financial accounts, balances and account management.',
    principle: 'Every account balance is bound by strict row-level serializable locks.',
    icon: Wallet,
    color: '#F8F7FC', // Pearl White
    glowColor: 'rgba(221, 211, 244, 0.70)', // Pastel Lavender
    baseRadius: 8.5,
  },
  {
    id: 'transactions',
    title: 'Transactions',
    badge: 'Atomic Movement',
    description: 'Traceable movement of money across financial accounts.',
    principle: 'Idempotent, atomic debit-and-credit transfers with zero intermediate exposure.',
    icon: ArrowLeftRight,
    color: '#D8D7E0', // Moon Silver
    glowColor: 'rgba(201, 185, 237, 0.70)', // Celestial Lilac
    baseRadius: 9.5,
  },
  {
    id: 'integrity',
    title: 'Integrity',
    badge: 'Zero-Deficit Guarantee',
    description: 'Financial record consistency and ledger verification.',
    principle: 'Database-level CHECK constraints guarantee overdraft invariants on every balance mutation.',
    icon: ShieldCheck,
    color: '#DDD3F4', // Pastel Lavender
    glowColor: 'rgba(139, 124, 255, 0.65)', // Soft Nebula / Lavender
    baseRadius: 8.0,
  },
  {
    id: 'audit',
    title: 'Audit',
    badge: 'Cryptographic Ledger',
    description: 'Financial transparency, investigation and accountability.',
    principle: 'Append-only database triggers reject and record unauthorized tampering attempts.',
    icon: Search,
    color: '#C9B9ED', // Celestial Lilac
    glowColor: 'rgba(169, 155, 216, 0.70)', // Soft Nebula
    baseRadius: 9.0,
  },
];

interface OrbitParams {
  cx: number;
  cy: number;
  rx: number;
  ry: number;
  tilt: number; // degrees
}

export default function LunarOrbitalSystem() {
  const [dimensions, setDimensions] = useState<{ width: number; height: number }>({
    width: 1200,
    height: 800,
  });

  const [angle, setAngle] = useState(0);
  const [hoveredStarId, setHoveredStarId] = useState<string | null>(null);
  const [selectedStar, setSelectedStar] = useState<CelestialFeature | null>(null);
  const [isReducedMotion, setIsReducedMotion] = useState(false);

  const angleRef = useRef(0);
  const lastTimeRef = useRef<number | null>(null);
  const hoveredRef = useRef<string | null>(null);
  const selectedRef = useRef<CelestialFeature | null>(null);
  const reducedMotionRef = useRef(false);

  hoveredRef.current = hoveredStarId;
  selectedRef.current = selectedStar;
  reducedMotionRef.current = isReducedMotion;

  // 1. Detect Window Size & Responsive Dimensions
  useEffect(() => {
    const handleResize = () => {
      setDimensions({
        width: window.innerWidth,
        height: window.innerHeight,
      });
    };

    handleResize();
    window.addEventListener('resize', handleResize, { passive: true });
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // 2. Detect prefers-reduced-motion
  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    setIsReducedMotion(mediaQuery.matches);

    const handleChange = (e: MediaQueryListEvent) => {
      setIsReducedMotion(e.matches);
    };

    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);

  // 3. Escape key listener to close details panel
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && selectedStar) {
        setSelectedStar(null);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedStar]);

  // 4. Calculate responsive orbit parameters aligned with moon in lunar-bg.jpg
  const getOrbitParams = useCallback((): OrbitParams => {
    const { width: w, height: h } = dimensions;

    if (w >= 1024) {
      // Desktop: Moon centered at ~68.5% X, ~44% Y
      return {
        cx: w * 0.685,
        cy: h * 0.44,
        rx: Math.min(w * 0.22, 330),
        ry: Math.min(h * 0.20, 160),
        tilt: -18,
      };
    } else if (w >= 768) {
      // Tablet: Moon centered at ~72% X, ~47% Y
      return {
        cx: w * 0.72,
        cy: h * 0.47,
        rx: Math.min(w * 0.25, 250),
        ry: Math.min(h * 0.18, 125),
        tilt: -18,
      };
    } else if (w >= 640) {
      // Small Tablet: Moon centered at ~76% X, ~46% Y
      return {
        cx: w * 0.76,
        cy: h * 0.46,
        rx: Math.min(w * 0.28, 200),
        ry: Math.min(h * 0.17, 105),
        tilt: -18,
      };
    } else {
      // Mobile: Moon centered in upper right ~78% X, ~32% Y
      return {
        cx: w * 0.78,
        cy: h * 0.32,
        rx: Math.min(w * 0.34, 150),
        ry: Math.min(h * 0.16, 80),
        tilt: -18,
      };
    }
  }, [dimensions]);

  const { cx, cy, rx, ry, tilt } = getOrbitParams();
  const tiltRad = (tilt * Math.PI) / 180;

  // 5. Continuous Smooth Orbital Animation Loop (60–90 seconds per revolution)
  useEffect(() => {
    let animId: number;

    const animate = (time: number) => {
      if (lastTimeRef.current !== null) {
        const deltaSec = (time - lastTimeRef.current) / 1000;

        // Base velocity: full revolution every 75 seconds (0.0837 rad/sec)
        const baseVelocity = (2 * Math.PI) / 75;

        // If reduced motion is requested, pause rotation
        if (reducedMotionRef.current) {
          // Stationary
        } else if (selectedRef.current) {
          // Temporarily paused when feature panel is opened
          angleRef.current = (angleRef.current + baseVelocity * 0.05 * deltaSec) % (2 * Math.PI);
          setAngle(angleRef.current);
        } else if (hoveredRef.current) {
          // Smooth slow-down to 35% on hover
          angleRef.current = (angleRef.current + baseVelocity * 0.35 * deltaSec) % (2 * Math.PI);
          setAngle(angleRef.current);
        } else {
          // Normal continuous smooth orbital movement
          angleRef.current = (angleRef.current + baseVelocity * deltaSec) % (2 * Math.PI);
          setAngle(angleRef.current);
        }
      }

      lastTimeRef.current = time;
      animId = requestAnimationFrame(animate);
    };

    animId = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animId);
  }, []);

  // 6. Calculate Star Positions on the Tilted Ellipse
  const starPositions = CELESTIAL_STARS.map((star, idx) => {
    // 4 stars equally spaced: 0, PI/2, PI, 3PI/2
    const starAngle = angle + idx * (Math.PI / 2);

    // Parametric coordinates on untilted ellipse
    const cosT = Math.cos(starAngle);
    const sinT = Math.sin(starAngle);
    const xUnrotated = rx * cosT;
    const yUnrotated = ry * sinT;

    // Apply ellipse tilt rotation
    const cosA = Math.cos(tiltRad);
    const sinA = Math.sin(tiltRad);
    const x = cx + xUnrotated * cosA - yUnrotated * sinA;
    const y = cy + xUnrotated * sinA + yUnrotated * cosA;

    // Celestial depth factor (-1 far back to +1 near front)
    const depth = sinT;
    const scale = 0.90 + 0.15 * ((depth + 1) / 2); // 0.90 to 1.05
    const opacity = 0.78 + 0.22 * ((depth + 1) / 2); // 0.78 to 1.0

    return {
      star,
      x,
      y,
      depth,
      scale,
      opacity,
      idx,
    };
  });

  return (
    <div className="fixed inset-0 z-10 pointer-events-none select-none overflow-hidden">
      {/* ============================================================ */}
      {/* 1. SVG ORBITAL TRAJECTORY LAYER                              */}
      {/* ============================================================ */}
      <svg
        className="absolute inset-0 w-full h-full pointer-events-none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          {/* Subtle celestial trajectory gradient */}
          <linearGradient id="orbitalGlowGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#DDD3F4" stopOpacity="0.55" />
            <stop offset="50%" stopColor="#B6A9D9" stopOpacity="0.30" />
            <stop offset="100%" stopColor="#C9B9ED" stopOpacity="0.55" />
          </linearGradient>

          {/* Star soft halo filter */}
          <filter id="softGlow" x="-30%" y="-30%" width="160%" height="160%">
            <feGaussianBlur stdDeviation="3.5" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>
        </defs>

        <g transform={`rotate(${tilt}, ${cx}, ${cy})`}>
          {/* Soft atmospheric halo along orbital trajectory */}
          <ellipse
            cx={cx}
            cy={cy}
            rx={rx}
            ry={ry}
            fill="none"
            stroke="rgba(221, 211, 244, 0.22)"
            strokeWidth={4.5}
            strokeDasharray="none"
          />

          {/* Secondary delicate orbital trace */}
          <ellipse
            cx={cx}
            cy={cy}
            rx={rx + 10}
            ry={ry + 6}
            fill="none"
            stroke="rgba(182, 169, 217, 0.16)"
            strokeWidth={1}
            strokeDasharray="3 6"
          />

          {/* Primary thin silver-lavender orbital trajectory */}
          <ellipse
            cx={cx}
            cy={cy}
            rx={rx}
            ry={ry}
            fill="none"
            stroke="url(#orbitalGlowGrad)"
            strokeWidth={1.3}
            strokeDasharray="6 4"
          />
        </g>
      </svg>

      {/* ============================================================ */}
      {/* 2. INTERACTIVE ORBITING STARS                                */}
      {/* ============================================================ */}
      <div className="absolute inset-0 w-full h-full pointer-events-none">
        {starPositions.map(({ star, x, y, scale, opacity }) => {
          const isHovered = hoveredStarId === star.id;
          const isSelected = selectedStar?.id === star.id;
          const Icon = star.icon;

          return (
            <div
              key={star.id}
              className="absolute pointer-events-auto"
              style={{
                left: `${x}px`,
                top: `${y}px`,
                transform: 'translate(-50%, -50%)',
                zIndex: isSelected ? 35 : isHovered ? 30 : 20,
              }}
            >
              {/* Keyboard accessible interactive target */}
              <button
                type="button"
                role="button"
                tabIndex={0}
                aria-label={`Explore ${star.title}: ${star.description}`}
                onClick={() => setSelectedStar(isSelected ? null : star)}
                onMouseEnter={() => setHoveredStarId(star.id)}
                onMouseLeave={() => setHoveredStarId(null)}
                onFocus={() => setHoveredStarId(star.id)}
                onBlur={() => setHoveredStarId(null)}
                className="group relative flex items-center justify-center w-11 h-11 rounded-full cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-[#8B7CFF]/60"
              >
                {/* Expanding pulse ring when selected */}
                {isSelected && (
                  <span
                    className="absolute inset-0 rounded-full border-[1.5px] border-[#8B7CFF] animate-ping opacity-35"
                    style={{ animationDuration: '2.5s' }}
                  />
                )}

                {/* Outer Concentric Orbital Indicator on Hover/Select */}
                <span
                  className={`absolute rounded-full transition-all duration-300 pointer-events-none ${
                    isSelected
                      ? 'w-10 h-10 border border-[#8B7CFF]/60 bg-[#DDD3F4]/25 shadow-[0_0_16px_rgba(139,124,255,0.30)]'
                      : isHovered
                      ? 'w-9 h-9 border border-[#A99BD8]/50 bg-[#DDD3F4]/15 shadow-[0_0_12px_rgba(169,155,216,0.25)]'
                      : 'w-7 h-7 border border-[#DDD3F4]/30 bg-transparent'
                  }`}
                />

                {/* Star Core Body */}
                <span
                  className={`relative flex items-center justify-center rounded-full transition-all duration-300 shadow-sm ${
                    isSelected
                      ? 'bg-[#7864CB] text-white border-2 border-white shadow-[0_0_14px_rgba(120,100,203,0.50)] scale-110'
                      : isHovered
                      ? 'bg-white text-[#7864CB] border border-[#7864CB] shadow-[0_2px_10px_rgba(120,100,203,0.25)] scale-110'
                      : 'bg-white/95 text-[#55516D] border border-[#DDD7EA] shadow-[0_1px_6px_rgba(63,48,100,0.12)]'
                  }`}
                  style={{
                    width: `${star.baseRadius * 2.2 * scale}px`,
                    height: `${star.baseRadius * 2.2 * scale}px`,
                    opacity,
                  }}
                >
                  <Icon
                    className={`transition-all duration-200 ${
                      isSelected || isHovered ? 'w-3.5 h-3.5' : 'w-3 h-3'
                    }`}
                  />
                </span>
              </button>

              {/* Compact Feature Tooltip on Hover */}
              {isHovered && !selectedStar && (
                <div
                  className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 px-2.5 py-1 rounded-lg bg-white/95 backdrop-blur-md border border-[#A99BD8]/40 shadow-[0_4px_12px_rgba(63,48,100,0.10)] text-[11px] font-semibold text-[#242039] whitespace-nowrap pointer-events-none transition-all duration-200"
                  style={{ animation: 'fadeInView 0.2s ease-out' }}
                >
                  <div className="flex items-center space-x-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#7864CB]" />
                    <span>{star.title}</span>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* ============================================================ */}
      {/* 3. FROSTED-GLASS FEATURE INFORMATION PANEL                   */}
      {/* ============================================================ */}
      {selectedStar && (
        <div
          className="fixed inset-0 z-40 pointer-events-auto flex items-start justify-end px-6 sm:px-10 lg:px-16 pt-24 sm:pt-28"
          onClick={() => setSelectedStar(null)}
        >
          {/* Modal Container — Positioned on the Right (Never covering Login Form) */}
          <div
            className="w-full max-w-[340px] rounded-2xl p-5 border shadow-[0_16px_40px_rgba(63,48,100,0.12),0_2px_6px_rgba(63,48,100,0.04)] transition-all duration-300"
            style={{
              background: 'rgba(255, 255, 255, 0.92)',
              backdropFilter: 'blur(18px)',
              WebkitBackdropFilter: 'blur(18px)',
              borderColor: 'rgba(169, 155, 216, 0.40)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header: Icon, Title, Badge & Dismiss Button */}
            <div className="flex items-start justify-between pb-3 border-b border-[#DDD7EA]">
              <div className="flex items-center space-x-3">
                <div className="w-9 h-9 rounded-xl bg-[#7864CB]/12 border border-[#7864CB]/30 flex items-center justify-center text-[#7864CB]">
                  <selectedStar.icon className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-[#242039] tracking-tight">
                    {selectedStar.title}
                  </h3>
                  <span className="inline-flex items-center text-[10px] font-medium text-[#7864CB] bg-[#DDD3F4]/30 px-2 py-0.5 rounded-md mt-0.5">
                    {selectedStar.badge}
                  </span>
                </div>
              </div>

              {/* Close Button */}
              <button
                type="button"
                onClick={() => setSelectedStar(null)}
                className="p-1 rounded-lg text-[#716B86] hover:text-[#242039] hover:bg-[#F8F7FC] transition-colors"
                aria-label="Close feature details"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Body: Product Description & Architectural Principle */}
            <div className="pt-3 space-y-2.5">
              <p className="text-xs text-[#242039] font-medium leading-relaxed">
                {selectedStar.description}
              </p>

              <div className="p-2.5 rounded-xl bg-[#F8F7FC] border border-[#DDD7EA]/70 text-[11px] text-[#55516D] leading-relaxed">
                <div className="flex items-center space-x-1.5 text-[#7864CB] font-semibold text-[10.5px] mb-1">
                  <Sparkles className="w-3 h-3" />
                  <span>LedgerLine Core Guarantee</span>
                </div>
                {selectedStar.principle}
              </div>
            </div>

            {/* Footer Prompt */}
            <div className="mt-4 pt-2.5 flex items-center justify-between text-[10.5px] text-[#716B86] border-t border-[#DDD7EA]/60">
              <span>Continuous celestial orbit</span>
              <button
                type="button"
                onClick={() => setSelectedStar(null)}
                className="text-[#7864CB] hover:text-[#6651B9] font-semibold"
              >
                Resume &times;
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
