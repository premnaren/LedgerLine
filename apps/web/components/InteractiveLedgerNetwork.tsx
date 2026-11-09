'use client';

import React, {
  useEffect,
  useRef,
  useState,
  useCallback,
  forwardRef,
  useImperativeHandle,
} from 'react';
import {
  STAR_CATALOGUE,
  CONSTELLATION_PRESETS,
  ConstellationPreset,
  StarRecord,
  STAR_BY_ID,
  getNextConstellationPreset,
} from '@/lib/starCatalogue';

export interface InteractiveLedgerNetworkHandle {
  addStar: () => void;
  regenerate: () => void;
  reset: () => void;
  nextConstellation: () => void;
  getCurrentConstellation: () => ConstellationPreset;
}

interface RuntimeStarNode {
  id: string; // Real star ID (e.g. "orion-betelgeuse")
  star: StarRecord;
  x: number;
  y: number;
  vx: number;
  vy: number;
  baseX: number;
  baseY: number;
  targetX: number;
  targetY: number;
  startX: number;
  startY: number;
  radius: number;
  baseRadius: number;
  alpha: number;
  targetAlpha: number;
  startAlpha: number;
  importance: 'major' | 'secondary' | 'supporting';
  highlight: number;
  creaseAngle: number;
  creaseDist: number;
}

interface RuntimeEdge {
  fromId: string;
  toId: string;
  isSecondary: boolean;
  alpha: number;
  targetAlpha: number;
  startAlpha: number;
}

interface WaterRipple {
  x: number;
  y: number;
  radius: number;
  maxRadius: number;
  alpha: number;
}

interface StarDust {
  x: number;
  y: number;
  size: number;
  alpha: number;
  baseAlpha: number;
  twinkleSpeed: number;
  phase: number;
}

interface StardustParticle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  alpha: number;
  decay: number;
}

interface CelestialComet {
  active: boolean;
  startX: number;
  startY: number;
  currentX: number;
  currentY: number;
  angle: number;
  totalDist: number;
  traveledDist: number;
  speed: number;
  tailLength: number;
  alpha: number;
}

type InteractionMode = 'IDLE' | 'CRUMPLED' | 'POURING';

interface NetworkState {
  width: number;
  height: number;
  dpr: number;
  nodes: RuntimeStarNode[];
  edges: RuntimeEdge[];
  stars: StarDust[];
  particles: StardustParticle[];
  comet: CelestialComet | null;
  time: number;
  mouseX: number | null;
  mouseY: number | null;
  hoveredId: string | null;
  draggedId: string | null;
  selectedId: string | null;
  mode: InteractionMode;
  crumpleCenter: { x: number; y: number } | null;
  crumpleProgress: number;
  ripples: WaterRipple[];
  isHolding: boolean;
  holdStartTime: number;
  downPos: { x: number; y: number } | null;
  currentPresetIndex: number;
  isTransitioning: boolean;
  transitionStartTime: number;
  transitionDuration: number;
}

// Cubic ease-in-out for celestial transitions
function cubicEaseInOut(t: number): number {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

// Calculate visual radius and halo based on astronomical magnitude
function calcStarRadius(mag: number, importance: string): { radius: number; haloRadius: number } {
  let r = 5.2 - mag * 0.65;
  if (importance === 'major') r = Math.max(r, 5.6);
  r = Math.max(3.2, Math.min(7.2, r));
  const halo = r * (importance === 'major' ? 2.4 : 1.8);
  return { radius: r, haloRadius: halo };
}

// Project constellation coordinates onto canvas viewing window
function projectPresetCoordinates(
  preset: ConstellationPreset,
  width: number,
  height: number
): Map<string, { x: number; y: number }> {
  let minX = Infinity;
  let maxX = -Infinity;
  let minY = Infinity;
  let maxY = -Infinity;

  for (const s of preset.stars) {
    if (s.position.x < minX) minX = s.position.x;
    if (s.position.x > maxX) maxX = s.position.x;
    if (s.position.y < minY) minY = s.position.y;
    if (s.position.y > maxY) maxY = s.position.y;
  }

  const spanX = Math.max(0.12, maxX - minX);
  const spanY = Math.max(0.12, maxY - minY);

  // Desktop: Anchor in left celestial field (x ~ 0.28) framing the central card
  // Tablet/Mobile: Center across available viewport with comfortable margins
  const isDesktop = width >= 1024;
  const centerX = isDesktop ? width * 0.28 : width * 0.50;
  const centerY = isDesktop ? height * 0.50 : height * 0.44;

  const targetW = isDesktop ? Math.min(width * 0.40, 560) : Math.min(width * 0.76, 440);
  const targetH = isDesktop ? Math.min(height * 0.65, 600) : Math.min(height * 0.52, 460);
  const scale = Math.min(targetW / spanX, targetH / spanY);

  const starPositions = new Map<string, { x: number; y: number }>();
  const midX = (minX + maxX) / 2;
  const midY = (minY + maxY) / 2;

  for (const s of preset.stars) {
    const x = centerX + (s.position.x - midX) * scale;
    const y = centerY + (s.position.y - midY) * scale;
    starPositions.set(s.id, { x, y });
  }

  return starPositions;
}

const InteractiveLedgerNetwork = forwardRef<
  InteractiveLedgerNetworkHandle,
  { isDark?: boolean }
>(({ isDark = true }, ref) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  const stateRef = useRef<NetworkState>({
    width: 0,
    height: 0,
    dpr: 1,
    nodes: [],
    edges: [],
    stars: [],
    particles: [],
    comet: null,
    time: 0,
    mouseX: null,
    mouseY: null,
    hoveredId: null,
    draggedId: null,
    selectedId: null,
    mode: 'IDLE',
    crumpleCenter: null,
    crumpleProgress: 0,
    ripples: [],
    isHolding: false,
    holdStartTime: 0,
    downPos: null,
    currentPresetIndex: 0,
    isTransitioning: false,
    transitionStartTime: 0,
    transitionDuration: 1100,
  });

  const holdTimerRef = useRef<NodeJS.Timeout | null>(null);
  const cometTimerRef = useRef<NodeJS.Timeout | null>(null);
  const triggerWakeRef = useRef<(() => void) | null>(null);

  // Background micro-stardust field
  const generateStars = (width: number, height: number, count = 72): StarDust[] => {
    const stars: StarDust[] = [];
    for (let i = 0; i < count; i++) {
      stars.push({
        x: Math.random() * width,
        y: Math.random() * height,
        size: 0.6 + Math.random() * 1.6,
        alpha: 0.15 + Math.random() * 0.40,
        baseAlpha: 0.15 + Math.random() * 0.40,
        twinkleSpeed: 0.015 + Math.random() * 0.025,
        phase: Math.random() * Math.PI * 2,
      });
    }
    return stars;
  };

  // Build runtime state from a constellation preset
  const buildPresetNodesAndEdges = (
    preset: ConstellationPreset,
    width: number,
    height: number
  ) => {
    const posMap = projectPresetCoordinates(preset, width, height);
    const newNodes: RuntimeStarNode[] = [];

    preset.stars.forEach((star, idx) => {
      const pos = posMap.get(star.id) || { x: width * 0.5, y: height * 0.5 };
      const { radius } = calcStarRadius(star.magnitude, star.importance);

      const creaseAngle = (idx / preset.stars.length) * Math.PI * 2 + ((idx * 3) % 7) * 0.35;
      const creaseDist = 12 + (idx % 5) * 6 + ((idx * 3) % 9);

      newNodes.push({
        id: star.id,
        star,
        x: pos.x,
        y: pos.y,
        vx: 0,
        vy: 0,
        baseX: pos.x,
        baseY: pos.y,
        targetX: pos.x,
        targetY: pos.y,
        startX: pos.x,
        startY: pos.y,
        radius,
        baseRadius: radius,
        alpha: 1.0,
        targetAlpha: 1.0,
        startAlpha: 1.0,
        importance: star.importance,
        highlight: 0,
        creaseAngle,
        creaseDist,
      });
    });

    const newEdges: RuntimeEdge[] = [];
    preset.primaryEdges.forEach(([fromId, toId]) => {
      newEdges.push({
        fromId,
        toId,
        isSecondary: false,
        alpha: 0.85,
        targetAlpha: 0.85,
        startAlpha: 0.85,
      });
    });

    preset.secondaryEdges.forEach(([fromId, toId]) => {
      newEdges.push({
        fromId,
        toId,
        isSecondary: true,
        alpha: 0.45,
        targetAlpha: 0.45,
        startAlpha: 0.45,
      });
    });

    return { nodes: newNodes, edges: newEdges };
  };

  // Launch a cinematic comet that travels across the entire page
  const launchComet = useCallback((width: number, height: number) => {
    if (width <= 0 || height <= 0) return;

    // Natural diagonal angle towards bottom-right (~32-37 degrees)
    const angle = Math.PI * 0.19 + (Math.random() - 0.5) * 0.08;
    const startX = -140;
    const startY = Math.random() * (height * 0.32) - 60;

    // Calculate complete travel distance to clear beyond the opposite edge
    const reqDistX = (width + 240) - startX;
    const reqDistY = (height + 240) - startY;
    const totalDist = Math.max(reqDistX / Math.cos(angle), reqDistY / Math.sin(angle));

    stateRef.current.comet = {
      active: true,
      startX,
      startY,
      currentX: startX,
      currentY: startY,
      angle,
      totalDist,
      traveledDist: 0,
      speed: 16 + Math.random() * 4,
      tailLength: 150 + Math.random() * 45,
      alpha: 0,
    };

    triggerWakeRef.current?.();
  }, []);

  // Initiate a smooth celestial transition to a target constellation preset
  const transitionToPreset = useCallback(
    (targetPresetIndex: number) => {
      const state = stateRef.current;
      const { width, height } = state;
      if (width <= 0 || height <= 0) return;

      const targetPreset = CONSTELLATION_PRESETS[targetPresetIndex];
      const targetPosMap = projectPresetCoordinates(targetPreset, width, height);
      const now = performance.now();

      state.isTransitioning = true;
      state.transitionStartTime = now;
      state.currentPresetIndex = targetPresetIndex;

      // Existing nodes mapping
      const currentNodes = state.nodes;
      const targetStars = targetPreset.stars;

      const updatedNodes: RuntimeStarNode[] = [];
      const usedTargetIds = new Set<string>();

      // 1. Re-use existing nodes
      for (let i = 0; i < currentNodes.length; i++) {
        const node = currentNodes[i];
        if (i < targetStars.length) {
          const targetStar = targetStars[i];
          usedTargetIds.add(targetStar.id);
          const targetPos = targetPosMap.get(targetStar.id) || {
            x: width * 0.5,
            y: height * 0.5,
          };
          const { radius } = calcStarRadius(targetStar.magnitude, targetStar.importance);

          node.id = targetStar.id;
          node.star = targetStar;
          node.startX = node.x;
          node.startY = node.y;
          node.targetX = targetPos.x;
          node.targetY = targetPos.y;
          node.baseX = targetPos.x;
          node.baseY = targetPos.y;
          node.baseRadius = radius;
          node.startAlpha = node.alpha;
          node.targetAlpha = 1.0;
          node.importance = targetStar.importance;
          updatedNodes.push(node);
        } else {
          // Surplus node: fade out and dissolve
          node.startX = node.x;
          node.startY = node.y;
          node.startAlpha = node.alpha;
          node.targetAlpha = 0;
          updatedNodes.push(node);
        }
      }

      // 2. Introduce new nodes if target has more stars
      for (let j = currentNodes.length; j < targetStars.length; j++) {
        const targetStar = targetStars[j];
        const targetPos = targetPosMap.get(targetStar.id) || {
          x: width * 0.5,
          y: height * 0.5,
        };
        const { radius } = calcStarRadius(targetStar.magnitude, targetStar.importance);

        const spawnX = targetPos.x + (Math.random() - 0.5) * 60;
        const spawnY = targetPos.y + (Math.random() - 0.5) * 60;

        const creaseAngle = (j / targetStars.length) * Math.PI * 2;
        const creaseDist = 14 + (j % 5) * 6;

        updatedNodes.push({
          id: targetStar.id,
          star: targetStar,
          x: spawnX,
          y: spawnY,
          vx: 0,
          vy: 0,
          baseX: targetPos.x,
          baseY: targetPos.y,
          targetX: targetPos.x,
          targetY: targetPos.y,
          startX: spawnX,
          startY: spawnY,
          radius,
          baseRadius: radius,
          alpha: 0,
          targetAlpha: 1.0,
          startAlpha: 0,
          importance: targetStar.importance,
          highlight: 0,
          creaseAngle,
          creaseDist,
        });
      }

      state.nodes = updatedNodes;

      // 3. Morph edges: old edges fade out, new edges fade in
      const newEdges: RuntimeEdge[] = [];

      // Fade out current edges
      state.edges.forEach((edge) => {
        edge.startAlpha = edge.alpha;
        edge.targetAlpha = 0;
        newEdges.push(edge);
      });

      // Add target primary edges
      targetPreset.primaryEdges.forEach(([fromId, toId]) => {
        newEdges.push({
          fromId,
          toId,
          isSecondary: false,
          alpha: 0,
          startAlpha: 0,
          targetAlpha: 0.85,
        });
      });

      // Add target secondary edges
      targetPreset.secondaryEdges.forEach(([fromId, toId]) => {
        newEdges.push({
          fromId,
          toId,
          isSecondary: true,
          alpha: 0,
          startAlpha: 0,
          targetAlpha: 0.45,
        });
      });

      state.edges = newEdges;
      triggerWakeRef.current?.();
    },
    []
  );

  // Transition to next preset
  const handleNextConstellation = useCallback(() => {
    const { nextIndex } = getNextConstellationPreset(stateRef.current.currentPresetIndex);
    transitionToPreset(nextIndex);
  }, [transitionToPreset]);

  // Reset current constellation to original positions
  const handleReset = useCallback(() => {
    const state = stateRef.current;
    const currentPreset = CONSTELLATION_PRESETS[state.currentPresetIndex];
    const posMap = projectPresetCoordinates(currentPreset, state.width, state.height);

    state.nodes.forEach((node) => {
      const pos = posMap.get(node.id);
      if (pos) {
        node.targetX = pos.x;
        node.targetY = pos.y;
        node.baseX = pos.x;
        node.baseY = pos.y;
        node.vx = 0;
        node.vy = 0;
      }
    });

    triggerWakeRef.current?.();
  }, []);

  useImperativeHandle(
    ref,
    () => ({
      addStar: () => {
        // Create an ethereal supporting star near mouse or left field
        const state = stateRef.current;
        const x = state.mouseX ?? state.width * 0.28;
        const y = state.mouseY ?? state.height * 0.45;
        state.ripples.push({
          x,
          y,
          radius: 4,
          maxRadius: 65,
          alpha: 0.9,
        });
        triggerWakeRef.current?.();
      },
      regenerate: handleNextConstellation,
      reset: handleReset,
      nextConstellation: handleNextConstellation,
      getCurrentConstellation: () => CONSTELLATION_PRESETS[stateRef.current.currentPresetIndex],
    }),
    [handleNextConstellation, handleReset]
  );

  // Canvas main rendering and interaction loop
  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const ctx = canvas.getContext('2d', { alpha: true });
    if (!ctx) return;

    let animFrameId: number | null = null;
    const prefersReducedMotion =
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    const handleResize = () => {
      const width = container.clientWidth || window.innerWidth;
      const height = container.clientHeight || window.innerHeight;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);

      canvas.width = width * dpr;
      canvas.height = height * dpr;
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;

      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      const state = stateRef.current;
      state.width = width;
      state.height = height;
      state.dpr = dpr;

      if (state.stars.length === 0) {
        state.stars = generateStars(width, height, 72);
      }

      // Initialize with Orion if uninitialized
      if (state.nodes.length === 0) {
        const initial = buildPresetNodesAndEdges(
          CONSTELLATION_PRESETS[0],
          width,
          height
        );
        state.nodes = initial.nodes;
        state.edges = initial.edges;
      } else {
        // Reposition current nodes to match updated dimensions
        const preset = CONSTELLATION_PRESETS[state.currentPresetIndex];
        const posMap = projectPresetCoordinates(preset, width, height);
        state.nodes.forEach((n) => {
          const p = posMap.get(n.id);
          if (p) {
            n.baseX = p.x;
            n.baseY = p.y;
            n.targetX = p.x;
            n.targetY = p.y;
          }
        });
      }

      triggerWake();
    };

    // Physics & transition updates
    const updatePhysics = (): boolean => {
      const state = stateRef.current;
      const { width, height, mode, crumpleCenter } = state;
      let isSettled = true;

      state.time += 1;

      // 1. Constellation transition progress
      if (state.isTransitioning) {
        const now = performance.now();
        const elapsed = now - state.transitionStartTime;
        const progress = Math.min(1.0, elapsed / state.transitionDuration);
        const ease = cubicEaseInOut(progress);

        state.nodes.forEach((node) => {
          node.x = node.startX + (node.targetX - node.startX) * ease;
          node.y = node.startY + (node.targetY - node.startY) * ease;
          node.alpha = node.startAlpha + (node.targetAlpha - node.startAlpha) * ease;
        });

        state.edges.forEach((edge) => {
          edge.alpha = edge.startAlpha + (edge.targetAlpha - edge.startAlpha) * ease;
        });

        if (progress >= 1.0) {
          state.isTransitioning = false;
          // Clean up dissolved nodes and edges
          state.nodes = state.nodes.filter((n) => n.targetAlpha > 0);
          state.edges = state.edges.filter((e) => e.targetAlpha > 0);
        } else {
          isSettled = false;
        }
      }

      // 2. Comet movement across entire page
      if (state.comet && state.comet.active) {
        const c = state.comet;
        c.traveledDist += c.speed;
        const progress = c.traveledDist / c.totalDist;

        c.currentX = c.startX + Math.cos(c.angle) * c.traveledDist;
        c.currentY = c.startY + Math.sin(c.angle) * c.traveledDist;

        // Opacity profile: stays brilliant across whole journey, fades at extreme ends
        if (progress < 0.08) {
          c.alpha = (progress / 0.08) * 0.92;
        } else if (progress <= 0.88) {
          c.alpha = 0.92;
        } else {
          c.alpha = Math.max(0, ((1.0 - progress) / 0.12) * 0.92);
        }

        // Shed trailing stardust wake
        if (state.time % 3 === 0 && c.alpha > 0.2) {
          state.particles.push({
            x: c.currentX - Math.cos(c.angle) * 18 + (Math.random() - 0.5) * 6,
            y: c.currentY - Math.sin(c.angle) * 18 + (Math.random() - 0.5) * 6,
            vx: (Math.random() - 0.5) * 0.8,
            vy: (Math.random() - 0.5) * 0.8,
            radius: 0.8 + Math.random() * 1.2,
            alpha: c.alpha * 0.65,
            decay: 0.035,
          });
        }

        if (c.traveledDist >= c.totalDist) {
          c.active = false;
          state.comet = null;
        } else {
          isSettled = false;
        }
      }

      // 3. Stardust particles update
      for (let p = state.particles.length - 1; p >= 0; p--) {
        const pt = state.particles[p];
        pt.x += pt.vx;
        pt.y += pt.vy;
        pt.vx *= 0.92;
        pt.vy *= 0.92;
        pt.alpha -= pt.decay;
        if (pt.alpha <= 0.015) {
          state.particles.splice(p, 1);
        } else {
          isSettled = false;
        }
      }

      // 4. Water splash ripples update
      for (let r = state.ripples.length - 1; r >= 0; r--) {
        const rip = state.ripples[r];
        rip.radius += 4.5;
        rip.alpha *= 0.93;
        if (rip.alpha < 0.015 || rip.radius > rip.maxRadius) {
          state.ripples.splice(r, 1);
        } else {
          isSettled = false;
        }
      }

      // 5. Origami crumple mode
      if (mode === 'CRUMPLED') {
        if (state.crumpleProgress < 1) {
          state.crumpleProgress = Math.min(1, state.crumpleProgress + 0.08);
          isSettled = false;
        }

        if (crumpleCenter) {
          const cx = crumpleCenter.x;
          const cy = crumpleCenter.y;
          for (let i = 0; i < state.nodes.length; i++) {
            const node = state.nodes[i];
            const foldTargetX = cx + Math.cos(node.creaseAngle) * node.creaseDist;
            const foldTargetY = cy + Math.sin(node.creaseAngle) * node.creaseDist;
            node.x += (foldTargetX - node.x) * 0.22;
            node.y += (foldTargetY - node.y) * 0.22;
          }
        }
      } else if (!state.isTransitioning) {
        // Standard spring physics towards target
        for (let i = 0; i < state.nodes.length; i++) {
          const node = state.nodes[i];
          if (node.id === state.draggedId) continue;

          const dx = node.targetX - node.x;
          const dy = node.targetY - node.y;
          node.vx = (node.vx + dx * 0.08) * 0.78;
          node.vy = (node.vy + dy * 0.08) * 0.78;
          node.x += node.vx;
          node.y += node.vy;

          if (Math.abs(node.vx) > 0.05 || Math.abs(node.vy) > 0.05) {
            isSettled = false;
          }

          // Gentle hover highlight
          const targetHighlight = node.id === state.hoveredId || node.id === state.selectedId ? 1 : 0;
          node.highlight += (targetHighlight - node.highlight) * 0.18;
          if (Math.abs(node.highlight - targetHighlight) > 0.01) {
            isSettled = false;
          }
        }
      }

      return isSettled;
    };

    // Canvas drawing procedure
    const draw = () => {
      const {
        width,
        height,
        nodes,
        edges,
        hoveredId,
        draggedId,
        selectedId,
        mode,
        ripples,
        stars,
        particles,
        comet,
        time,
        isHolding,
        crumpleCenter,
      } = stateRef.current;

      ctx.clearRect(0, 0, width, height);

      // 1. Draw background micro-stardust (Dark theme)
      if (isDark) {
        stars.forEach((s) => {
          const twinkle = Math.sin(time * s.twinkleSpeed + s.phase) * 0.35;
          const a = Math.max(0.08, Math.min(0.85, s.baseAlpha + twinkle));
          ctx.beginPath();
          ctx.arc(s.x, s.y, s.size, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(235, 230, 255, ${a.toFixed(3)})`;
          ctx.fill();
        });
      }

      // 2. Draw cinematic comet across entire visible page
      if (comet && comet.active && comet.alpha > 0.02) {
        const { currentX, currentY, angle, tailLength, alpha } = comet;
        const tailX = currentX - Math.cos(angle) * tailLength;
        const tailY = currentY - Math.sin(angle) * tailLength;

        // Tapered luminous tail gradient
        const grad = ctx.createLinearGradient(tailX, tailY, currentX, currentY);
        grad.addColorStop(0, 'rgba(129, 85, 217, 0)');
        grad.addColorStop(0.35, `rgba(189, 117, 233, ${(alpha * 0.32).toFixed(3)})`);
        grad.addColorStop(0.70, `rgba(100, 142, 255, ${(alpha * 0.65).toFixed(3)})`);
        grad.addColorStop(0.92, `rgba(220, 240, 255, ${(alpha * 0.90).toFixed(3)})`);
        grad.addColorStop(1.0, `rgba(255, 255, 255, ${alpha.toFixed(3)})`);

        // Outer soft glow line
        ctx.beginPath();
        ctx.moveTo(tailX, tailY);
        ctx.lineTo(currentX, currentY);
        ctx.strokeStyle = `rgba(189, 117, 233, ${(alpha * 0.28).toFixed(3)})`;
        ctx.lineWidth = 5.5;
        ctx.stroke();

        // Core bright comet line
        ctx.beginPath();
        ctx.moveTo(tailX, tailY);
        ctx.lineTo(currentX, currentY);
        ctx.strokeStyle = grad;
        ctx.lineWidth = 2.2;
        ctx.stroke();

        // Nucleus Head Bloom
        const headBloom = ctx.createRadialGradient(
          currentX,
          currentY,
          0,
          currentX,
          currentY,
          16
        );
        headBloom.addColorStop(0, `rgba(255, 255, 255, ${alpha.toFixed(3)})`);
        headBloom.addColorStop(0.25, `rgba(100, 142, 255, ${(alpha * 0.70).toFixed(3)})`);
        headBloom.addColorStop(0.65, `rgba(189, 117, 233, ${(alpha * 0.25).toFixed(3)})`);
        headBloom.addColorStop(1.0, 'rgba(189, 117, 233, 0)');

        ctx.beginPath();
        ctx.arc(currentX, currentY, 16, 0, Math.PI * 2);
        ctx.fillStyle = headBloom;
        ctx.fill();

        // Intense center star point
        ctx.beginPath();
        ctx.arc(currentX, currentY, 2.6, 0, Math.PI * 2);
        ctx.fillStyle = '#FFFFFF';
        ctx.fill();
      }

      // 3. Draw stardust particles
      particles.forEach((pt) => {
        ctx.beginPath();
        ctx.arc(pt.x, pt.y, pt.radius, 0, Math.PI * 2);
        ctx.fillStyle = isDark
          ? `rgba(189, 117, 233, ${pt.alpha.toFixed(3)})`
          : `rgba(41, 75, 122, ${pt.alpha.toFixed(3)})`;
        ctx.fill();
      });

      // 4. Draw water splash ripples
      ripples.forEach((rip) => {
        ctx.beginPath();
        ctx.arc(rip.x, rip.y, rip.radius, 0, Math.PI * 2);
        ctx.strokeStyle = isDark
          ? `rgba(189, 117, 233, ${rip.alpha.toFixed(3)})`
          : `rgba(41, 75, 122, ${rip.alpha.toFixed(3)})`;
        ctx.lineWidth = 1.6;
        ctx.stroke();
      });

      // Node lookup map for fast edge rendering
      const nodeMap = new Map<string, RuntimeStarNode>();
      nodes.forEach((n) => nodeMap.set(n.id, n));

      // 5. Draw curated constellation edges
      for (let e = 0; e < edges.length; e++) {
        const edge = edges[e];
        if (edge.alpha <= 0.02) continue;

        const a = nodeMap.get(edge.fromId);
        const b = nodeMap.get(edge.toId);
        if (!a || !b) continue;

        const isHoveredEdge = a.id === hoveredId || b.id === hoveredId;
        const isSelectedEdge = a.id === selectedId || b.id === selectedId;

        const baseAlpha = edge.isSecondary ? 0.35 : 0.65;
        const effAlpha = edge.alpha * (isHoveredEdge || isSelectedEdge ? 0.95 : baseAlpha);
        const lineWidth = edge.isSecondary ? 1.0 : isSelectedEdge ? 2.2 : isHoveredEdge ? 2.0 : 1.4;

        // Shadow contrast pass over bright regions
        if (isDark && (isHoveredEdge || isSelectedEdge)) {
          ctx.beginPath();
          ctx.strokeStyle = 'rgba(8, 7, 18, 0.75)';
          ctx.lineWidth = lineWidth + 1.6;
          if (edge.isSecondary && mode !== 'CRUMPLED') {
            ctx.setLineDash([4, 4]);
          } else {
            ctx.setLineDash([]);
          }
          ctx.moveTo(a.x, a.y);
          ctx.lineTo(b.x, b.y);
          ctx.stroke();
        }

        // Primary luminous constellation edge
        ctx.beginPath();
        ctx.strokeStyle = isSelectedEdge
          ? isDark
            ? `rgba(189, 117, 233, ${effAlpha.toFixed(3)})`
            : `rgba(41, 75, 122, ${effAlpha.toFixed(3)})`
          : isHoveredEdge
          ? isDark
            ? `rgba(100, 142, 255, ${effAlpha.toFixed(3)})`
            : `rgba(32, 61, 101, ${effAlpha.toFixed(3)})`
          : isDark
          ? `rgba(142, 105, 230, ${effAlpha.toFixed(3)})`
          : `rgba(41, 75, 122, ${effAlpha.toFixed(3)})`;

        ctx.lineWidth = lineWidth;
        if (edge.isSecondary && mode !== 'CRUMPLED') {
          ctx.setLineDash([4, 4]);
        } else {
          ctx.setLineDash([]);
        }

        ctx.moveTo(a.x, a.y);
        ctx.lineTo(b.x, b.y);
        ctx.stroke();
      }

      ctx.setLineDash([]);

      // 6. Draw real astronomical stars
      for (let i = 0; i < nodes.length; i++) {
        const node = nodes[i];
        if (node.alpha <= 0.02) continue;

        const { x, y, radius, importance, highlight } = node;
        const isHovered = hoveredId === node.id;
        const isSelected = selectedId === node.id;
        const isDragged = draggedId === node.id;

        const starPulse = Math.sin(time * 0.04 + i) * 0.5 + 0.5;

        // Selected star concentric orbital rings
        if (isSelected) {
          ctx.beginPath();
          ctx.arc(x, y, radius + 7, 0, Math.PI * 2);
          ctx.strokeStyle = isDark ? 'rgba(100, 142, 255, 0.85)' : 'rgba(41, 75, 122, 0.80)';
          ctx.lineWidth = 1.6;
          ctx.stroke();

          ctx.beginPath();
          ctx.arc(x, y, radius + 13, 0, Math.PI * 2);
          ctx.strokeStyle = isDark ? 'rgba(189, 117, 233, 0.80)' : 'rgba(124, 58, 237, 0.50)';
          ctx.lineWidth = 1.4;
          ctx.stroke();

          ctx.beginPath();
          ctx.setLineDash([3, 4]);
          ctx.arc(x, y, radius + 19, 0, Math.PI * 2);
          ctx.strokeStyle = isDark ? 'rgba(117, 200, 240, 0.55)' : 'rgba(41, 75, 122, 0.35)';
          ctx.lineWidth = 1.2;
          ctx.stroke();
          ctx.setLineDash([]);
        }

        // Outer halo bloom for major stars or active state
        if (importance === 'major' || isHovered || isDragged || highlight > 0.05) {
          const haloR = radius + (isDragged ? 8 : isHovered ? 6 : 4 + (importance === 'major' ? 3 * starPulse : 0));
          ctx.beginPath();
          ctx.arc(x, y, haloR, 0, Math.PI * 2);
          ctx.strokeStyle = isDark
            ? `rgba(189, 117, 233, ${(0.35 + 0.20 * starPulse).toFixed(3)})`
            : `rgba(41, 75, 122, ${(0.25 + 0.15 * starPulse).toFixed(3)})`;
          ctx.lineWidth = isDragged ? 2 : isHovered ? 1.6 : 1;
          ctx.stroke();
        }

        // Dark contrast stroke behind star
        if (isDark) {
          ctx.beginPath();
          ctx.arc(x, y, radius + 1.2, 0, Math.PI * 2);
          ctx.strokeStyle = 'rgba(8, 7, 18, 0.85)';
          ctx.lineWidth = 1.4;
          ctx.stroke();
        }

        // Main star body
        ctx.beginPath();
        const curRadius = radius + (isDragged ? 2.5 : isHovered ? 2 : isSelected ? 1.5 : highlight);
        ctx.arc(x, y, curRadius, 0, Math.PI * 2);

        // Color coding: red supergiant warmth vs electric blue/white
        const isWarmSupergiant =
          node.id === 'orion-betelgeuse' ||
          node.id === 'sco-antares' ||
          node.id === 'tau-aldebaran';

        if (isWarmSupergiant) {
          ctx.fillStyle = isSelected
            ? '#FF7A59'
            : isHovered
            ? '#FFA07A'
            : isDark
            ? '#F48C42'
            : '#D9531E';
        } else {
          ctx.fillStyle = isSelected
            ? '#BD75E9'
            : isHovered
            ? '#FFFFFF'
            : importance === 'major'
            ? '#9DC4FF'
            : isDark
            ? '#648EFF'
            : '#294B7A';
        }
        ctx.fill();

        ctx.strokeStyle = isSelected ? '#FFFFFF' : isDark ? '#EBE6FF' : '#17142B';
        ctx.lineWidth = isSelected ? 1.8 : 1.2;
        ctx.stroke();
      }

      // 7. Contextual astronomical identity tooltip for hovered or selected star
      const activeId = hoveredId || selectedId;
      if (activeId && nodeMap.has(activeId) && mode === 'IDLE') {
        const activeNode = nodeMap.get(activeId)!;
        const star = activeNode.star;

        ctx.save();
        ctx.font = 'bold 12px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
        const titleWidth = ctx.measureText(star.name).width;

        ctx.font = '10px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
        const magSign = star.magnitude >= 0 ? '+' : '';
        const subtitle = `${star.constellationName} · ${star.designation} (mag ${magSign}${star.magnitude.toFixed(2)})`;
        const subWidth = ctx.measureText(subtitle).width;

        const padX = 10;
        const boxW = Math.max(titleWidth, subWidth) + padX * 2;
        const boxH = 38;
        const boxX = Math.min(Math.max(activeNode.x - boxW / 2, 14), width - boxW - 14);
        const boxY = activeNode.y - activeNode.radius - 46 < 14
          ? activeNode.y + activeNode.radius + 14
          : activeNode.y - activeNode.radius - 46;

        // Frosted glass card backing
        ctx.beginPath();
        if (typeof ctx.roundRect === 'function') {
          ctx.roundRect(boxX, boxY, boxW, boxH, 8);
        } else {
          ctx.rect(boxX, boxY, boxW, boxH);
        }
        ctx.fillStyle = isDark ? 'rgba(25, 23, 43, 0.94)' : 'rgba(255, 255, 255, 0.96)';
        ctx.fill();
        ctx.strokeStyle = isDark ? 'rgba(189, 117, 233, 0.55)' : 'rgba(41, 75, 122, 0.35)';
        ctx.lineWidth = 1;
        ctx.stroke();

        // Title: Real star name
        ctx.font = 'bold 12px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
        ctx.fillStyle = isDark ? '#F7F4FF' : '#17142B';
        ctx.textAlign = 'left';
        ctx.fillText(star.name, boxX + padX, boxY + 16);

        // Subtitle: Constellation & Designation
        ctx.font = '10px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
        ctx.fillStyle = isDark ? '#BD75E9' : '#294B7A';
        ctx.fillText(subtitle, boxX + padX, boxY + 30);

        ctx.restore();
      }

      // 8. Hint while holding empty network space to crumple & transition
      if (isHolding && crumpleCenter) {
        ctx.save();
        ctx.font = '11px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
        const label = 'Holding: Compressing celestial core... release to transition';
        const textWidth = ctx.measureText(label).width;
        const padX = 12;
        const boxW = textWidth + padX * 2;
        const boxH = 26;
        const boxX = Math.min(Math.max(crumpleCenter.x - boxW / 2, 12), width - boxW - 12);
        const boxY = Math.max(crumpleCenter.y - 48, 16);

        ctx.beginPath();
        if (typeof ctx.roundRect === 'function') {
          ctx.roundRect(boxX, boxY, boxW, boxH, 13);
        } else {
          ctx.rect(boxX, boxY, boxW, boxH);
        }
        ctx.fillStyle = isDark ? 'rgba(189, 117, 233, 0.95)' : 'rgba(41, 75, 122, 0.92)';
        ctx.fill();
        ctx.fillStyle = '#FFFFFF';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(label, boxX + boxW / 2, boxY + boxH / 2);
        ctx.restore();
      }
    };

    const loop = () => {
      const isSettled = updatePhysics();
      draw();

      if (
        !isSettled ||
        stateRef.current.mode !== 'IDLE' ||
        stateRef.current.mouseX !== null ||
        stateRef.current.comet?.active ||
        stateRef.current.isTransitioning ||
        (isDark && !prefersReducedMotion)
      ) {
        animFrameId = requestAnimationFrame(loop);
      } else {
        animFrameId = null;
      }
    };

    const triggerWake = () => {
      if (animFrameId === null && !prefersReducedMotion) {
        animFrameId = requestAnimationFrame(loop);
      }
    };

    triggerWakeRef.current = triggerWake;

    const findNodeIdAt = (px: number, py: number): string | null => {
      const { nodes } = stateRef.current;
      for (let i = nodes.length - 1; i >= 0; i--) {
        const node = nodes[i];
        const d = Math.hypot(node.x - px, node.y - py);
        if (d <= node.radius + 15) {
          return node.id;
        }
      }
      return null;
    };

    // Pointer event listeners
    const handlePointerDown = (px: number, py: number) => {
      const state = stateRef.current;
      state.downPos = { x: px, y: py };
      const hitId = findNodeIdAt(px, py);

      if (hitId) {
        state.draggedId = hitId;
        state.selectedId = hitId;
        state.isHolding = false;
      } else {
        // Pressing on empty space starts hold-to-crumple timer
        state.isHolding = true;
        state.holdStartTime = performance.now();
        state.crumpleCenter = { x: px, y: py };

        if (holdTimerRef.current) clearTimeout(holdTimerRef.current);
        holdTimerRef.current = setTimeout(() => {
          if (state.isHolding) {
            state.mode = 'CRUMPLED';
            state.crumpleProgress = 0;
            triggerWake();
          }
        }, 340);
      }
      triggerWake();
    };

    const handlePointerMove = (px: number, py: number) => {
      const state = stateRef.current;
      state.mouseX = px;
      state.mouseY = py;

      // Cancel hold if dragged significantly
      if (state.isHolding && state.downPos) {
        const moveDist = Math.hypot(px - state.downPos.x, py - state.downPos.y);
        if (moveDist > 12) {
          state.isHolding = false;
          if (holdTimerRef.current) clearTimeout(holdTimerRef.current);
        }
      }

      if (state.draggedId) {
        const draggedNode = state.nodes.find((n) => n.id === state.draggedId);
        if (draggedNode) {
          draggedNode.x = px;
          draggedNode.y = py;
          draggedNode.targetX = px;
          draggedNode.targetY = py;
          draggedNode.vx = 0;
          draggedNode.vy = 0;
        }
        triggerWake();
      } else {
        const hitId = findNodeIdAt(px, py);
        if (hitId !== state.hoveredId) {
          state.hoveredId = hitId;
          triggerWake();
        }
      }
    };

    const handlePointerUp = (px: number, py: number) => {
      const state = stateRef.current;
      if (holdTimerRef.current) clearTimeout(holdTimerRef.current);

      if (state.mode === 'CRUMPLED') {
        // Holding empty network space and releasing triggers transition into next preset!
        state.mode = 'IDLE';
        state.isHolding = false;

        const cx = state.crumpleCenter?.x ?? px;
        const cy = state.crumpleCenter?.y ?? py;

        state.ripples.push({
          x: cx,
          y: cy,
          radius: 10,
          maxRadius: 180,
          alpha: 0.95,
        });

        // Trigger transition to next preset
        handleNextConstellation();
      } else {
        state.isHolding = false;
        state.draggedId = null;
      }

      triggerWake();
    };

    const onMouseDown = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      handlePointerDown(e.clientX - rect.left, e.clientY - rect.top);
    };

    const onMouseMove = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      handlePointerMove(e.clientX - rect.left, e.clientY - rect.top);
    };

    const onMouseUp = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      handlePointerUp(e.clientX - rect.left, e.clientY - rect.top);
    };

    const onMouseLeave = () => {
      const state = stateRef.current;
      state.mouseX = null;
      state.mouseY = null;
      state.hoveredId = null;
      state.draggedId = null;
      state.isHolding = false;
      if (holdTimerRef.current) clearTimeout(holdTimerRef.current);
      triggerWake();
    };

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }
      if (e.key === 'r' || e.key === 'R') {
        e.preventDefault();
        handleNextConstellation();
      } else if (e.key === 'Escape') {
        e.preventDefault();
        handleReset();
      }
    };

    const onTouchStart = (e: TouchEvent) => {
      if (e.touches.length > 0) {
        const rect = canvas.getBoundingClientRect();
        handlePointerDown(e.touches[0].clientX - rect.left, e.touches[0].clientY - rect.top);
      }
    };

    const onTouchMove = (e: TouchEvent) => {
      if (e.touches.length > 0) {
        const rect = canvas.getBoundingClientRect();
        handlePointerMove(e.touches[0].clientX - rect.left, e.touches[0].clientY - rect.top);
      }
    };

    const onTouchEnd = (e: TouchEvent) => {
      const state = stateRef.current;
      const rect = canvas.getBoundingClientRect();
      const touch = e.changedTouches?.[0] || e.touches?.[0];
      const x = touch ? touch.clientX - rect.left : (state.mouseX ?? state.width / 2);
      const y = touch ? touch.clientY - rect.top : (state.mouseY ?? state.height / 2);
      handlePointerUp(x, y);
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    canvas.addEventListener('mousedown', onMouseDown);
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
    canvas.addEventListener('mouseleave', onMouseLeave);
    window.addEventListener('keydown', onKeyDown);

    canvas.addEventListener('touchstart', onTouchStart, { passive: true });
    window.addEventListener('touchmove', onTouchMove, { passive: true });
    window.addEventListener('touchend', onTouchEnd, { passive: true });

    // Periodic comet scheduler (first comet at 3.5s, recurring every 24s)
    const scheduleNextComet = (delayMs: number) => {
      cometTimerRef.current = setTimeout(() => {
        launchComet(stateRef.current.width, stateRef.current.height);
        scheduleNextComet(22000 + Math.random() * 8000);
      }, delayMs);
    };

    scheduleNextComet(3500);

    return () => {
      if (animFrameId !== null) cancelAnimationFrame(animFrameId);
      if (holdTimerRef.current) clearTimeout(holdTimerRef.current);
      if (cometTimerRef.current) clearTimeout(cometTimerRef.current);
      window.removeEventListener('resize', handleResize);
      canvas.removeEventListener('mousedown', onMouseDown);
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
      canvas.removeEventListener('mouseleave', onMouseLeave);
      window.removeEventListener('keydown', onKeyDown);

      canvas.removeEventListener('touchstart', onTouchStart);
      window.removeEventListener('touchmove', onTouchMove);
      window.removeEventListener('touchend', onTouchEnd);
    };
  }, [isDark, handleNextConstellation, handleReset, launchComet]);

  return (
    <div
      ref={containerRef}
      tabIndex={0}
      className="fixed inset-0 w-full h-full overflow-hidden select-none pointer-events-auto z-10 focus:outline-none"
      aria-label="Interactive LedgerLine constellation graph. Features 72 real stars across 15 astronomical constellations. Drag to reposition, hold to crumple and transition."
    >
      <canvas
        ref={canvasRef}
        className="absolute inset-0 w-full h-full pointer-events-auto cursor-grab active:cursor-grabbing"
      />
    </div>
  );
});

InteractiveLedgerNetwork.displayName = 'InteractiveLedgerNetwork';

export default InteractiveLedgerNetwork;
