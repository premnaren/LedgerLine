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
    // Exact geometric center and radius of the celestial moon in lunar-bg.jpg
    const natMoonX = 701.2;
    const natMoonY = 202.0;
    const natMoonR = 140.2;

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

    // Ring radii: rx extends beyond moon limbs, ry establishes planetary inclination
    const rx = moonR * 1.30;
    const ry = moonR * 0.36;
    const tilt = 6; // matches planetary ring inclination angle

    return { cx, cy, rx, ry, tilt, moonR };
  }, [dimensions]);

  const { cx, cy, rx, ry, tilt, moonR } = getRenderedMoon();
  const tiltRad = (tilt * Math.PI) / 180;

  // Front & Back arc path definitions in unrotated space
  const frontD = `M ${cx - rx} ${cy} A ${rx} ${ry} 0 0 0 ${cx + rx} ${cy}`;
  const backD = `M ${cx + rx} ${cy} A ${rx} ${ry} 0 0 0 ${cx - rx} ${cy}`;
  const rotTransform = `rotate(${tilt}, ${cx}, ${cy})`;

  // Ellipse circumference approximation for continuous dash streaming
  const ellipseCircumference =
    Math.PI * (3 * (rx + ry) - Math.sqrt((3 * rx + ry) * (rx + 3 * ry)));
  const streamDashOffset = -angle * (ellipseCircumference / (2 * Math.PI));

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

  // 6. Calculate Star Coordinates with 3D Depth & Planetary Occlusion
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

    // 3D Depth: yUnrotated > 0 is front arc (in front of moon), yUnrotated <= 0 is back arc (behind moon)
    const isFront = yUnrotated > 0;
    const distFromCenter = Math.sqrt(xUnrotated * xUnrotated + yUnrotated * yUnrotated);

    let opacity = 1.0;
    let isOccluded = false;

    if (!isFront) {
      if (distFromCenter < moonR * 0.98) {
        // Completely occluded behind the solid lunar planet body
        opacity = 0.0;
        isOccluded = true;
      } else if (distFromCenter < moonR * 1.05) {
        // Smooth fade as it slips behind the lunar limb
        const fade = (distFromCenter - moonR * 0.98) / (moonR * 0.07);
        opacity = Math.max(0, Math.min(1, fade)) * 0.85;
      } else {
        // In background space outside the moon disk
        opacity = 0.85;
      }
    }

    const scale = isFront ? 1.05 : 0.85;

    return {
      star,
      x,
      y,
      isFront,
      isOccluded,
      scale,
      opacity,
      idx,
    };
  });

  return (
    <div className="fixed inset-0 z-10 pointer-events-none select-none overflow-hidden">
      {/* ============================================================ */}
      {/* 1. 3D CELESTIAL ORBITAL RING LAYER (BACK & FRONT ARCS)       */}
      {/* ============================================================ */}
      <svg
        className="absolute inset-0 w-full h-full pointer-events-none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <filter id="ringGlow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur in="SourceGraphic" stdDeviation="3.5" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>

          {/* Front luminous ring gradient: vibrant lilac, pearl white and silver */}
          <linearGradient id="frontRingGrad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#C5B4F0" stopOpacity="0.95" />
            <stop offset="30%" stopColor="#FFFFFF" stopOpacity="1.0" />
            <stop offset="60%" stopColor="#8C70E0" stopOpacity="0.95" />
            <stop offset="100%" stopColor="#D7CAFA" stopOpacity="0.95" />
          </linearGradient>

          {/* Back ring gradient: slightly deeper lavender for atmospheric depth */}
          <linearGradient id="backRingGrad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#A590DF" stopOpacity="0.85" />
            <stop offset="50%" stopColor="#7B61D1" stopOpacity="0.75" />
            <stop offset="100%" stopColor="#A590DF" stopOpacity="0.85" />
          </linearGradient>

          {/* Moon Occlusion Mask for Back Arc: black circle over the moon hides the rear section! */}
          <mask id="moonOccludeMask">
            <rect x="-500%" y="-500%" width="1000%" height="1000%" fill="white" />
            <circle cx={cx} cy={cy} r={moonR * 0.99} fill="black" />
          </mask>
        </defs>

        {/* 1A. BACK ARC (MASKED: passes BEHIND the moon body!) */}
        <g mask="url(#moonOccludeMask)">
          <g transform={rotTransform}>
            {/* Atmospheric outer glow */}
            <path
              d={backD}
              fill="none"
              stroke="rgba(140, 112, 224, 0.40)"
              strokeWidth={6}
              filter="url(#ringGlow)"
            />
            {/* Core solid ring */}
            <path
              d={backD}
              fill="none"
              stroke="url(#backRingGrad)"
              strokeWidth={2.4}
            />
            {/* Inner silver shimmer line */}
            <path
              d={backD}
              fill="none"
              stroke="#FFFFFF"
              strokeWidth={1.0}
              strokeOpacity={0.8}
            />
            {/* Rotating starlight dash stream */}
            <path
              d={backD}
              fill="none"
              stroke="#FFFFFF"
              strokeWidth={1.8}
              strokeDasharray="18 36"
              strokeDashoffset={streamDashOffset}
              strokeOpacity={0.85}
            />
          </g>
        </g>

        {/* 1B. FRONT ARC (UNMASKED: sweeps IN FRONT of the moon face!) */}
        <g transform={rotTransform}>
          {/* Atmospheric outer glow */}
          <path
            d={frontD}
            fill="none"
            stroke="rgba(140, 112, 224, 0.55)"
            strokeWidth={7.5}
            filter="url(#ringGlow)"
          />
          {/* Core solid vibrant luminous ring */}
          <path
            d={frontD}
            fill="none"
            stroke="url(#frontRingGrad)"
            strokeWidth={2.8}
          />
          {/* Brilliant inner pearl-white core beam */}
          <path
            d={frontD}
            fill="none"
            stroke="#FFFFFF"
            strokeWidth={1.3}
            strokeOpacity={0.95}
          />
          {/* Rotating animated starlight dash stream */}
          <path
            d={frontD}
            fill="none"
            stroke="#FFFFFF"
            strokeWidth={2.4}
            strokeDasharray="24 42"
            strokeDashoffset={streamDashOffset}
            strokeOpacity={0.95}
          />
        </g>
      </svg>

      {/* ============================================================ */}
      {/* 2. REAL CELESTIAL ORBITING STARS (3D DEPTH & OCCLUSION)      */}
      {/* ============================================================ */}
      <div className="absolute inset-0 w-full h-full pointer-events-none">
        {starPositions.map(({ star, x, y, scale, opacity, isFront, isOccluded }) => {
          const isHovered = hoveredStarId === star.id;
          const isSelected = selectedStar?.id === star.id;
          const r = star.radius * scale;
          const rayL = star.rayLength * scale * (isHovered ? 1.3 : 1.0);

          return (
            <div
              key={star.id}
              className={`absolute transition-opacity duration-200 ${
                isOccluded ? 'pointer-events-none' : 'pointer-events-auto'
              }`}
              style={{
                left: `${x}px`,
                top: `${y}px`,
                transform: 'translate(-50%, -50%)',
                opacity,
                zIndex: isSelected ? 40 : isHovered ? 35 : isFront ? 30 : 10,
              }}
            >
              {/* Accessible Touch / Keyboard Activation Target */}
              <button
                type="button"
                role="button"
                tabIndex={isOccluded ? -1 : 0}
                aria-label={`Celestial star: ${star.title}. ${star.description}`}
                onClick={() => {
                  if (!isOccluded) {
                    setSelectedStar(isSelected ? null : star);
                  }
                }}
                onMouseEnter={() => !isOccluded && setHoveredStarId(star.id)}
                onMouseLeave={() => setHoveredStarId(null)}
                onFocus={() => !isOccluded && setHoveredStarId(star.id)}
                onBlur={() => setHoveredStarId(null)}
                disabled={isOccluded}
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
                  width={rayL * 2 + 6}
                  height={rayL * 2 + 6}
                  viewBox={`-${rayL + 3} -${rayL + 3} ${(rayL + 3) * 2} ${(rayL + 3) * 2}`}
                  className={`pointer-events-none transition-transform duration-300 ${
                    isHovered || isSelected ? 'scale-125' : 'scale-100'
                  }`}
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
              {isHovered && !selectedStar && !isOccluded && (
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
