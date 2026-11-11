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
  radius: number; // visual radius (3.5 to 5.5px)
  rayLength: number; // 4-point sparkle ray length
}

const CELESTIAL_STARS: CelestialFeature[] = [
  {
    id: 'accounts',
    title: 'Accounts',
    badge: 'Dual-Leg Ledger',
    description: 'Organized financial accounts, balances and account management.',
    principle: 'Every account balance is bound by strict row-level serializable database locks.',
    icon: Wallet,
    color: '#FFFFFF', // Pearl White
    glowColor: 'rgba(221, 211, 244, 0.75)', // Pastel Lavender
    radius: 4.8,
    rayLength: 7.5,
  },
  {
    id: 'transactions',
    title: 'Transactions',
    badge: 'Atomic Movement',
    description: 'Traceable movement of money across financial accounts.',
    principle: 'Idempotent, atomic debit-and-credit transfers with zero intermediate exposure.',
    icon: ArrowLeftRight,
    color: '#D8D7E0', // Moon Silver
    glowColor: 'rgba(201, 185, 237, 0.75)', // Celestial Lilac
    radius: 5.4,
    rayLength: 8.5,
  },
  {
    id: 'integrity',
    title: 'Integrity',
    badge: 'Zero-Deficit Guarantee',
    description: 'Financial record consistency and ledger verification.',
    principle: 'Database-level CHECK constraints guarantee overdraft invariants on every balance mutation.',
    icon: ShieldCheck,
    color: '#DDD3F4', // Pastel Lavender
    glowColor: 'rgba(139, 124, 255, 0.70)', // Soft Nebula
    radius: 4.2,
    rayLength: 6.8,
  },
  {
    id: 'audit',
    title: 'Audit',
    badge: 'Cryptographic Ledger',
    description: 'Financial transparency, investigation and accountability.',
    principle: 'Append-only database triggers reject and record unauthorized tampering attempts.',
    icon: Search,
    color: '#C9B9ED', // Celestial Lilac
    glowColor: 'rgba(169, 155, 216, 0.75)', // Soft Nebula
    radius: 5.0,
    rayLength: 8.0,
  },
];

export default function LunarOrbitalSystem() {
  const [dimensions, setDimensions] = useState<{ width: number; height: number }>({
    width: 1440,
    height: 900,
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

  // 4. Exact Shared Coordinate Anchor: follow background image scaling and cropping
  const getRenderedMoon = useCallback(() => {
    const { width: W, height: H } = dimensions;

    const natW = 1024;
    const natH = 576;
    // Exact geometric center of the celestial moon in lunar-bg.jpg (from pixel perimeter fit)
    const natMoonX = 724.5;
    const natMoonY = 185.6;
    const natMoonR = 150.4;

    const objectPosX = W >= 640 ? 0.70 : 0.75;
    const objectPosY = W >= 640 ? 0.40 : 0.35;

    const S = Math.max(W / natW, H / natH);
    const renderedW = natW * S;
    const renderedH = natH * S;

    const offsetX = (W - renderedW) * objectPosX;
    const offsetY = (H - renderedH) * objectPosY;

    const cx = offsetX + (natMoonX / natW) * renderedW;
    const cy = offsetY + (natMoonY / natH) * renderedH;
    const moonR = (natMoonR / natH) * renderedH;

    // Tightly encircle the moon body, complementing the background rings
    const rx = moonR * 1.28;
    const ry = moonR * 0.68;
    const tilt = -17; // matches planetary ring inclination angle

    return { cx, cy, rx, ry, tilt, moonR };
  }, [dimensions]);

  const { cx, cy, rx, ry, tilt } = getRenderedMoon();
  const tiltRad = (tilt * Math.PI) / 180;

  // 5. Continuous Smooth Orbital Animation (60–90 seconds per revolution)
  useEffect(() => {
    let animId: number;

    const animate = (time: number) => {
      if (lastTimeRef.current !== null) {
        const deltaSec = (time - lastTimeRef.current) / 1000;

        // Base velocity: full revolution every 75 seconds (0.0837 rad/sec)
        const baseVelocity = (2 * Math.PI) / 75;

        if (reducedMotionRef.current) {
          // Stationary when reduced motion is preferred
        } else if (selectedRef.current) {
          // Slow to 5% when star panel is active
          angleRef.current = (angleRef.current + baseVelocity * 0.05 * deltaSec) % (2 * Math.PI);
          setAngle(angleRef.current);
        } else if (hoveredRef.current) {
          // Subtle slow-down to 35% on hover
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

  // 6. Calculate Star Coordinates along Tilted Ellipse
  const starPositions = CELESTIAL_STARS.map((star, idx) => {
    // 4 stars distributed along orbit: 0, PI/2, PI, 3PI/2
    const starAngle = angle + idx * (Math.PI / 2);

    const cosT = Math.cos(starAngle);
    const sinT = Math.sin(starAngle);
    const xUnrotated = rx * cosT;
    const yUnrotated = ry * sinT;

    const cosA = Math.cos(tiltRad);
    const sinA = Math.sin(tiltRad);
    const x = cx + xUnrotated * cosA - yUnrotated * sinA;
    const y = cy + xUnrotated * sinA + yUnrotated * cosA;

    // Depth factor: sinT < 0 is back arc, sinT > 0 is front arc
    const depth = sinT;
    const scale = 0.88 + 0.18 * ((depth + 1) / 2); // 0.88 to 1.06
    const opacity = 0.75 + 0.25 * ((depth + 1) / 2); // 0.75 to 1.0

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
      {/* 1. SINGLE SUBTLE ORBITAL TRAJECTORY LAYER                    */}
      {/* ============================================================ */}
      <svg
        className="absolute inset-0 w-full h-full pointer-events-none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <linearGradient id="orbitTraceGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#DDD3F4" stopOpacity="0.45" />
            <stop offset="50%" stopColor="#B6A9D9" stopOpacity="0.20" />
            <stop offset="100%" stopColor="#C9B9ED" stopOpacity="0.45" />
          </linearGradient>
        </defs>

        <g transform={`rotate(${tilt}, ${cx}, ${cy})`}>
          {/* Subtle soft blur backing for atmospheric integration */}
          <ellipse
            cx={cx}
            cy={cy}
            rx={rx}
            ry={ry}
            fill="none"
            stroke="rgba(221, 211, 244, 0.16)"
            strokeWidth={3}
          />

          {/* Delicate silver-lavender orbital trajectory line */}
          <ellipse
            cx={cx}
            cy={cy}
            rx={rx}
            ry={ry}
            fill="none"
            stroke="url(#orbitTraceGrad)"
            strokeWidth={1.2}
            strokeDasharray="4 6"
          />
        </g>
      </svg>

      {/* ============================================================ */}
      {/* 2. REAL CELESTIAL ORBITING STARS (NO PERMANENT ICONS)        */}
      {/* ============================================================ */}
      <div className="absolute inset-0 w-full h-full pointer-events-none">
        {starPositions.map(({ star, x, y, scale, opacity }) => {
          const isHovered = hoveredStarId === star.id;
          const isSelected = selectedStar?.id === star.id;
          const r = star.radius * scale;
          const rayL = star.rayLength * scale * (isHovered ? 1.3 : 1.0);

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
              {/* Accessible Touch / Keyboard Activation Target */}
              <button
                type="button"
                role="button"
                tabIndex={0}
                aria-label={`Celestial star: ${star.title}. ${star.description}`}
                onClick={() => setSelectedStar(isSelected ? null : star)}
                onMouseEnter={() => setHoveredStarId(star.id)}
                onMouseLeave={() => setHoveredStarId(null)}
                onFocus={() => setHoveredStarId(star.id)}
                onBlur={() => setHoveredStarId(null)}
                className="group relative flex items-center justify-center w-9 h-9 rounded-full cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-[#8B7CFF]/50"
              >
                {/* Active Selection Concentric Ring */}
                {isSelected && (
                  <span
                    className="absolute w-8 h-8 rounded-full border border-[#8B7CFF]/60 animate-ping opacity-40"
                    style={{ animationDuration: '2.5s' }}
                  />
                )}

                {/* Subtle Lavender Halo on Hover / Select */}
                <span
                  className={`absolute rounded-full transition-all duration-300 pointer-events-none ${
                    isSelected
                      ? 'w-7 h-7 bg-[#DDD3F4]/30 border border-[#8B7CFF]/40 shadow-[0_0_12px_rgba(139,124,255,0.40)]'
                      : isHovered
                      ? 'w-6 h-6 bg-[#DDD3F4]/20 border border-[#A99BD8]/35 shadow-[0_0_8px_rgba(169,155,216,0.30)]'
                      : 'w-4 h-4 bg-transparent'
                  }`}
                />

                {/* Real Celestial Four-Point Sparkle Star */}
                <svg
                  width={rayL * 2 + 4}
                  height={rayL * 2 + 4}
                  viewBox={`-${rayL + 2} -${rayL + 2} ${(rayL + 2) * 2} ${(rayL + 2) * 2}`}
                  className={`pointer-events-none transition-transform duration-300 ${
                    isHovered || isSelected ? 'scale-125' : 'scale-100'
                  }`}
                  style={{ opacity }}
                >
                  {/* Four-Point Delicate Star Spikes */}
                  <path
                    d={`M 0 -${rayL} Q 0 0 ${rayL} 0 Q 0 0 0 ${rayL} Q 0 0 -${rayL} 0 Q 0 0 0 -${rayL} Z`}
                    fill={isHovered || isSelected ? '#FFFFFF' : '#DDD3F4'}
                    opacity={isHovered || isSelected ? 0.95 : 0.75}
                  />

                  {/* Brilliant Pearl-White Star Core */}
                  <circle
                    cx="0"
                    cy="0"
                    r={isHovered ? r * 1.15 : r}
                    fill={isHovered || isSelected ? '#FFFFFF' : star.color}
                    stroke="#D8D7E0"
                    strokeWidth={0.8}
                  />
                </svg>
              </button>

              {/* Minimal Floating Feature Label on Hover */}
              {isHovered && !selectedStar && (
                <div
                  className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 px-2.5 py-0.8 rounded-md bg-white/95 backdrop-blur-md border border-[#A99BD8]/40 shadow-[0_2px_8px_rgba(63,48,100,0.10)] text-[11px] font-semibold text-[#242039] whitespace-nowrap pointer-events-none transition-all duration-150"
                  style={{ animation: 'fadeInView 0.15s ease-out' }}
                >
                  <span>{star.title}</span>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* ============================================================ */}
      {/* 3. COMPACT FROSTED-GLASS INFORMATION PANEL (ON CLICK)        */}
      {/* ============================================================ */}
      {selectedStar && (
        <div
          className="fixed inset-0 z-40 pointer-events-auto flex items-start justify-end px-6 sm:px-10 lg:px-16 pt-24 sm:pt-28"
          onClick={() => setSelectedStar(null)}
        >
          {/* Frosted Panel — Anchored to Right (Never Obstructing Login Form) */}
          <div
            className="w-full max-w-[320px] rounded-2xl p-5 border shadow-[0_16px_36px_rgba(63,48,100,0.12),0_2px_6px_rgba(63,48,100,0.04)] transition-all duration-300"
            style={{
              background: 'rgba(255, 255, 255, 0.92)',
              backdropFilter: 'blur(18px)',
              WebkitBackdropFilter: 'blur(18px)',
              borderColor: 'rgba(169, 155, 216, 0.40)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header: Relevant Capability Icon, Title & Dismiss */}
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

            {/* Description & Principle */}
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

            {/* Subtle Footer Prompt */}
            <div className="mt-4 pt-2 flex items-center justify-between text-[10px] text-[#716B86] border-t border-[#DDD7EA]/60">
              <span>Celestial orbital system</span>
              <button
                type="button"
                onClick={() => setSelectedStar(null)}
                className="text-[#7864CB] hover:text-[#6651B9] font-semibold"
              >
                Resume orbit &times;
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
