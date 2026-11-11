'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Wallet,
  ArrowLeftRight,
  ShieldCheck,
  Search,
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
  radius: number; // visual radius (4.0 to 5.5px)
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
    radius: 5.0,
    rayLength: 8.0,
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
    radius: 5.6,
    rayLength: 9.0,
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
    radius: 4.4,
    rayLength: 7.2,
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
    radius: 5.2,
    rayLength: 8.4,
  },
];

export default function LunarOrbitalSystem() {
  const [dimensions, setDimensions] = useState<{ width: number; height: number }>({
    width: 1440,
    height: 900,
  });

  const [angle, setAngle] = useState(0);
  const [hoveredStarId, setHoveredStarId] = useState<string | null>(null);
  const [isReducedMotion, setIsReducedMotion] = useState(false);

  const angleRef = useRef(0);
  const lastTimeRef = useRef<number | null>(null);
  const hoveredRef = useRef<string | null>(null);
  const reducedMotionRef = useRef(false);

  hoveredRef.current = hoveredStarId;
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

  // 3. Exact Shared Coordinate Anchor: follow background image scaling and cropping
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

    // Bigger orbit size generously matching the majestic moon and its natural rings
    const rx = moonR * 1.65;
    const ry = moonR * 0.46;
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

  // 4. Continuous Smooth Orbital Animation (75 seconds per revolution)
  useEffect(() => {
    let animId: number;

    const animate = (time: number) => {
      if (lastTimeRef.current !== null) {
        const deltaSec = (time - lastTimeRef.current) / 1000;

        // Base velocity: full revolution every 75 seconds (0.0837 rad/sec)
        const baseVelocity = (2 * Math.PI) / 75;

        if (reducedMotionRef.current) {
          // Stationary when reduced motion is preferred
        } else if (hoveredRef.current) {
          // Subtle slow-down to 40% on hover
          angleRef.current = (angleRef.current + baseVelocity * 0.40 * deltaSec) % (2 * Math.PI);
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

  // 5. Calculate Star Coordinates with 3D Depth & Planetary Occlusion
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
    <div className="overflow-hidden fixed inset-0 z-10 pointer-events-none select-none">
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
              strokeWidth={2.6}
            />
            {/* Inner silver shimmer line */}
            <path
              d={backD}
              fill="none"
              stroke="#FFFFFF"
              strokeWidth={1.1}
              strokeOpacity={0.85}
            />
            {/* Rotating starlight dash stream */}
            <path
              d={backD}
              fill="none"
              stroke="#FFFFFF"
              strokeWidth={2.0}
              strokeDasharray="24 48"
              strokeDashoffset={streamDashOffset}
              strokeOpacity={0.9}
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
            strokeWidth={8}
            filter="url(#ringGlow)"
          />
          {/* Core solid vibrant luminous ring */}
          <path
            d={frontD}
            fill="none"
            stroke="url(#frontRingGrad)"
            strokeWidth={3.0}
          />
          {/* Brilliant inner pearl-white core beam */}
          <path
            d={frontD}
            fill="none"
            stroke="#FFFFFF"
            strokeWidth={1.4}
            strokeOpacity={0.95}
          />
          {/* Rotating animated starlight dash stream */}
          <path
            d={frontD}
            fill="none"
            stroke="#FFFFFF"
            strokeWidth={2.6}
            strokeDasharray="28 50"
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
          const r = star.radius * scale;
          const rayL = star.rayLength * scale * (isHovered ? 1.35 : 1.0);

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
                zIndex: isHovered ? 35 : isFront ? 30 : 10,
              }}
            >
              {/* Accessible Star Element (Hoverable, No Dialog Popup) */}
              <div
                role="img"
                aria-label={`Celestial star: ${star.title}`}
                onMouseEnter={() => !isOccluded && setHoveredStarId(star.id)}
                onMouseLeave={() => setHoveredStarId(null)}
                className="flex relative justify-center items-center w-10 h-10 rounded-full cursor-pointer select-none group"
              >
                {/* Subtle Lavender Halo on Hover */}
                <span
                  className={`absolute rounded-full transition-all duration-300 pointer-events-none ${
                    isHovered
                      ? 'w-7 h-7 bg-[#DDD3F4]/25 border border-[#A99BD8]/40 shadow-[0_0_10px_rgba(169,155,216,0.35)]'
                      : 'w-4 h-4 bg-transparent'
                  }`}
                />

                {/* Real Celestial Four-Point Sparkle Star */}
                <svg
                  width={rayL * 2 + 6}
                  height={rayL * 2 + 6}
                  viewBox={`-${rayL + 3} -${rayL + 3} ${(rayL + 3) * 2} ${(rayL + 3) * 2}`}
                  className={`pointer-events-none transition-transform duration-300 ${
                    isHovered ? 'scale-125' : 'scale-100'
                  }`}
                >
                  {/* Four-Point Delicate Star Spikes */}
                  <path
                    d={`M 0 -${rayL} Q 0 0 ${rayL} 0 Q 0 0 0 ${rayL} Q 0 0 -${rayL} 0 Q 0 0 0 -${rayL} Z`}
                    fill={isHovered ? '#FFFFFF' : '#DDD3F4'}
                    opacity={isHovered ? 0.98 : 0.75}
                  />

                  {/* Brilliant Pearl-White Star Core */}
                  <circle
                    cx="0"
                    cy="0"
                    r={isHovered ? r * 1.15 : r}
                    fill={isHovered ? '#FFFFFF' : star.color}
                    stroke="#D8D7E0"
                    strokeWidth={0.8}
                  />
                </svg>
              </div>

              {/* Minimal Floating Feature Label on Hover */}
              {isHovered && !isOccluded && (
                <div
                  className="absolute bottom-full mb-2.5 left-1/2 -translate-x-1/2 px-2.5 py-1 rounded-md bg-white/95 backdrop-blur-md border border-[#A99BD8]/40 shadow-[0_2px_8px_rgba(63,48,100,0.12)] text-[11px] font-semibold text-[#242039] whitespace-nowrap pointer-events-none transition-all duration-150"
                  style={{ animation: 'fadeInView 0.15s ease-out' }}
                >
                  <span>{star.title}</span>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
