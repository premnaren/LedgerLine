'use client';

import React, {
  useEffect,
  useRef,
  useState,
  useCallback,
  forwardRef,
  useImperativeHandle,
} from 'react';

export interface InteractiveLedgerNetworkHandle {
  addStar: () => void;
  regenerate: () => void;
  reset: () => void;
}

interface RuntimeNode {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  baseX: number;
  baseY: number;
  targetX: number;
  targetY: number;
  radius: number;
  isHub: boolean;
  isBalanced: boolean;
  highlight: number;
  creaseAngle: number;
  creaseDist: number;
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

interface ShootingStar {
  x: number;
  y: number;
  len: number;
  speed: number;
  angle: number;
  alpha: number;
  active: boolean;
}

type InteractionMode = 'IDLE' | 'CRUMPLED' | 'POURING';

interface NetworkState {
  width: number;
  height: number;
  dpr: number;
  nodes: RuntimeNode[];
  edges: [number, number, boolean?][];
  stars: StarDust[];
  particles: StardustParticle[];
  shootingStar: ShootingStar | null;
  time: number;
  mouseX: number | null;
  mouseY: number | null;
  hoveredIndex: number | null;
  draggedIndex: number | null;
  selectedIndex: number | null;
  mode: InteractionMode;
  crumpleCenter: { x: number; y: number } | null;
  crumpleProgress: number;
  ripples: WaterRipple[];
  isHolding: boolean;
  holdStartTime: number;
  downPos: { x: number; y: number } | null;
}

const InteractiveLedgerNetwork = forwardRef<
  InteractiveLedgerNetworkHandle,
  { isDark?: boolean; showInternalControls?: boolean }
>(({ isDark = true, showInternalControls = false }, ref) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [, setNodeCount] = useState<number>(28);

  const stateRef = useRef<NetworkState>({
    width: 0,
    height: 0,
    dpr: 1,
    nodes: [],
    edges: [],
    stars: [],
    particles: [],
    shootingStar: null,
    time: 0,
    mouseX: null,
    mouseY: null,
    hoveredIndex: null,
    draggedIndex: null,
    selectedIndex: null,
    mode: 'IDLE',
    crumpleCenter: null,
    crumpleProgress: 0,
    ripples: [],
    isHolding: false,
    holdStartTime: 0,
    downPos: null,
  });

  const holdTimerRef = useRef<NodeJS.Timeout | null>(null);
  const triggerWakeRef = useRef<(() => void) | null>(null);

  // Helper: check if a normalized point is inside protected zones
  // 1. Top-left logo zone: rx < 0.28 && ry < 0.16
  // 2. Top-right controls zone: rx > 0.74 && ry < 0.16
  // 3. Center Auth Card: rx > 0.33 && rx < 0.67 && ry > 0.16 && ry < 0.84
  const isProtectedZone = (rx: number, ry: number) => {
    if (rx < 0.28 && ry < 0.16) return true; // Brand badge
    if (rx > 0.74 && ry < 0.16) return true; // Top controls
    if (rx > 0.33 && rx < 0.67 && ry > 0.16 && ry < 0.84) return true; // Centered Auth Card
    return false;
  };

  // Helper: generate celestial micro-star dust in background
  const generateStars = (width: number, height: number, count = 64): StarDust[] => {
    const stars: StarDust[] = [];
    for (let i = 0; i < count; i++) {
      stars.push({
        x: Math.random() * width,
        y: Math.random() * height,
        size: 0.6 + Math.random() * 1.5,
        alpha: 0.15 + Math.random() * 0.40,
        baseAlpha: 0.15 + Math.random() * 0.40,
        twinkleSpeed: 0.015 + Math.random() * 0.025,
        phase: Math.random() * Math.PI * 2,
      });
    }
    return stars;
  };

  // Helper: generate completely randomized, non-overlapping nodes avoiding protected zones
  const generateRandomizedLayout = (width: number, height: number, count = 28) => {
    const newNodes: RuntimeNode[] = [];
    const minPixelDist = Math.min(width, height) * 0.09;

    for (let i = 0; i < count; i++) {
      let x = 0;
      let y = 0;
      let valid = false;
      let attempts = 0;

      while (!valid && attempts < 100) {
        attempts++;
        const rx = 0.06 + Math.random() * 0.88;
        const ry = 0.08 + Math.random() * 0.84;

        if (isProtectedZone(rx, ry)) continue;

        const candidateX = rx * width;
        const candidateY = ry * height;

        const tooClose = newNodes.some(
          (n) => Math.hypot(n.targetX - candidateX, n.targetY - candidateY) < minPixelDist
        );

        if (!tooClose || attempts > 70) {
          x = candidateX;
          y = candidateY;
          valid = true;
        }
      }

      const isHub = i === 1 || i === 7 || i === 14 || i === 21;
      const isBalanced = i === 11;
      const radius = isHub ? 8.5 : isBalanced ? 7 : 4.5 + (i % 3) * 1.2;

      // Unique crumple paper origami crease offset
      const creaseAngle = (i / count) * Math.PI * 2 + ((i * 3) % 7) * 0.35;
      const creaseDist = 12 + (i % 5) * 6 + ((i * 3) % 9);

      newNodes.push({
        id: i,
        x,
        y,
        vx: 0,
        vy: 0,
        baseX: x,
        baseY: y,
        targetX: x,
        targetY: y,
        radius,
        isHub,
        isBalanced,
        highlight: 0,
        creaseAngle,
        creaseDist,
      });
    }

    // Connect to 2-3 closest nodes
    const edges: [number, number, boolean?][] = [];
    const edgeSet = new Set<string>();

    for (let i = 0; i < newNodes.length; i++) {
      const dists = newNodes
        .map((n, j) => ({
          idx: j,
          dist:
            i === j ? Infinity : Math.hypot(n.targetX - newNodes[i].targetX, n.targetY - newNodes[i].targetY),
        }))
        .sort((a, b) => a.dist - b.dist);

      const connectCount = 2 + Math.floor(Math.random() * 2);
      for (let c = 0; c < Math.min(connectCount, dists.length); c++) {
        const j = dists[c].idx;
        const key = i < j ? `${i}-${j}` : `${j}-${i}`;
        if (!edgeSet.has(key)) {
          edgeSet.add(key);
          const isDashed = Math.random() < 0.14;
          edges.push([i, j, isDashed]);
        }
      }
    }

    return { nodes: newNodes, edges };
  };

  // Trigger: Add node programmatically from control group or hotkey
  const handleAddNode = useCallback(() => {
    const state = stateRef.current;
    if (state.width === 0 || state.height === 0) return;

    // Find a valid open position around the periphery
    let px = state.width * 0.22;
    let py = state.height * 0.45;
    let attempts = 0;

    while (attempts < 60) {
      attempts++;
      const rx = 0.08 + Math.random() * 0.84;
      const ry = 0.10 + Math.random() * 0.80;
      if (!isProtectedZone(rx, ry)) {
        px = rx * state.width;
        py = ry * state.height;
        break;
      }
    }

    const newId = state.nodes.length;
    state.nodes.push({
      id: newId,
      x: px,
      y: py,
      vx: 0,
      vy: 0,
      baseX: px,
      baseY: py,
      targetX: px,
      targetY: py,
      radius: 6,
      isHub: false,
      isBalanced: false,
      highlight: 1,
      creaseAngle: Math.random() * Math.PI * 2,
      creaseDist: 18 + Math.random() * 12,
    });

    // Expanding ripples
    state.ripples.push(
      { x: px, y: py, radius: 10, maxRadius: 260, alpha: 0.85 },
      { x: px, y: py, radius: 28, maxRadius: 190, alpha: 0.65 }
    );

    // Stardust burst
    for (let p = 0; p < 12; p++) {
      const pAngle = Math.random() * Math.PI * 2;
      const pSpeed = 4 + Math.random() * 7;
      state.particles.push({
        x: px,
        y: py,
        vx: Math.cos(pAngle) * pSpeed,
        vy: Math.sin(pAngle) * pSpeed,
        radius: 1 + Math.random() * 2,
        alpha: 0.9,
        decay: 0.03 + Math.random() * 0.02,
      });
    }

    // Connect to 2 closest nodes
    const sorted = state.nodes
      .slice(0, -1)
      .map((n, idx) => ({ idx, dist: Math.hypot(n.x - px, n.y - py) }))
      .sort((a, b) => a.dist - b.dist);

    if (sorted.length > 0) {
      state.edges.push([sorted[0].idx, newId]);
      state.nodes[sorted[0].idx].highlight = 0.8;
    }
    if (sorted.length > 1) {
      state.edges.push([sorted[1].idx, newId]);
      state.nodes[sorted[1].idx].highlight = 0.6;
    }

    state.selectedIndex = newId;
    setNodeCount(state.nodes.length);
    if (triggerWakeRef.current) triggerWakeRef.current();
  }, []);

  // Trigger: Regenerate network layout
  const handleRegenerate = useCallback(() => {
    const state = stateRef.current;
    if (state.width === 0 || state.height === 0) return;
    state.selectedIndex = null;
    const cx = state.width * 0.5;
    const cy = state.height * 0.5;

    // Start water pour animation with new random constellation
    const { nodes: newLayout, edges: newEdges } = generateRandomizedLayout(
      state.width,
      state.height,
      state.nodes.length
    );
    state.edges = newEdges;

    // Fluid splash ripples
    state.ripples.push(
      { x: cx, y: cy, radius: 15, maxRadius: 380, alpha: 0.85 },
      { x: cx, y: cy, radius: 35, maxRadius: 300, alpha: 0.60 }
    );

    // Stardust burst
    for (let p = 0; p < 32; p++) {
      const pAngle = Math.random() * Math.PI * 2;
      const pSpeed = 7 + Math.random() * 20;
      state.particles.push({
        x: cx,
        y: cy,
        vx: Math.cos(pAngle) * pSpeed,
        vy: Math.sin(pAngle) * pSpeed,
        radius: 1 + Math.random() * 2.5,
        alpha: 0.95,
        decay: 0.02 + Math.random() * 0.02,
      });
    }

    state.nodes.forEach((node, i) => {
      const target = newLayout[i];
      node.baseX = target.targetX;
      node.baseY = target.targetY;
      node.targetX = target.targetX;
      node.targetY = target.targetY;
      node.radius = target.radius;
      node.isHub = target.isHub;
      node.isBalanced = target.isBalanced;

      const angle = Math.atan2(target.targetY - cy, target.targetX - cx) + (Math.random() - 0.5) * 0.4;
      const splashSpeed = 16 + Math.random() * 24;
      node.vx = Math.cos(angle) * splashSpeed;
      node.vy = Math.sin(angle) * splashSpeed;
      node.highlight = 1;
    });

    state.mode = 'POURING';
    if (triggerWakeRef.current) triggerWakeRef.current();
  }, []);

  // Trigger: Reset to canonical 28-node layout
  const handleReset = useCallback(() => {
    const state = stateRef.current;
    if (state.width === 0 || state.height === 0) return;
    state.selectedIndex = null;

    const { nodes: newNodes, edges: newEdges } = generateRandomizedLayout(state.width, state.height, 28);
    state.nodes = newNodes;
    state.edges = newEdges;
    setNodeCount(28);

    state.ripples.push({
      x: state.width * 0.5,
      y: state.height * 0.5,
      radius: 15,
      maxRadius: 300,
      alpha: 0.75,
    });

    if (triggerWakeRef.current) triggerWakeRef.current();
  }, []);

  useImperativeHandle(ref, () => ({
    addStar: handleAddNode,
    regenerate: handleRegenerate,
    reset: handleReset,
  }));

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    let animFrameId: number | null = null;

    const handleResize = () => {
      const rect = canvas.getBoundingClientRect();
      const w = rect.width;
      const h = rect.height;
      const d = Math.min(window.devicePixelRatio || 1, 2);

      stateRef.current.width = w;
      stateRef.current.height = h;
      stateRef.current.dpr = d;

      canvas.width = Math.floor(w * d);
      canvas.height = Math.floor(h * d);
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.scale(d, d);

      // Preserve existing nodes during theme switches or resize
      if (stateRef.current.nodes.length === 0) {
        const { nodes, edges } = generateRandomizedLayout(w, h, 28);
        stateRef.current.nodes = nodes;
        stateRef.current.edges = edges;
      }

      stateRef.current.stars = generateStars(w, h, 64);
      draw();
    };

    // Transition: Crumple paper mode
    const startCrumple = (originX: number, originY: number) => {
      const state = stateRef.current;
      state.mode = 'CRUMPLED';
      state.crumpleCenter = { x: originX, y: originY };
      state.crumpleProgress = 0;
      canvas.style.cursor = 'grabbing';

      state.nodes.forEach((node) => {
        const tx = originX + Math.cos(node.creaseAngle) * node.creaseDist;
        const ty = originY + Math.sin(node.creaseAngle) * node.creaseDist;
        node.targetX = tx;
        node.targetY = ty;
        node.vx = (tx - node.x) * 0.22 + (Math.random() - 0.5) * 8;
        node.vy = (ty - node.y) * 0.22 + (Math.random() - 0.5) * 8;
        node.highlight = 1;
      });

      wakeLoop();
    };

    // Transition: Pour like water on floor / supernova splash
    const startWaterPour = (releaseX: number, releaseY: number) => {
      const state = stateRef.current;
      const { width, height } = state;
      state.mode = 'POURING';
      canvas.style.cursor = 'grab';

      // Expanding ripples
      state.ripples.push(
        { x: releaseX, y: releaseY, radius: 10, maxRadius: 360, alpha: 0.75 },
        { x: releaseX, y: releaseY, radius: 25, maxRadius: 260, alpha: 0.55 },
        { x: releaseX, y: releaseY, radius: 45, maxRadius: 200, alpha: 0.40 }
      );

      // Stardust particle burst
      for (let p = 0; p < 28; p++) {
        const pAngle = Math.random() * Math.PI * 2;
        const pSpeed = 6 + Math.random() * 18;
        state.particles.push({
          x: releaseX,
          y: releaseY,
          vx: Math.cos(pAngle) * pSpeed,
          vy: Math.sin(pAngle) * pSpeed,
          radius: 1 + Math.random() * 2,
          alpha: 0.95,
          decay: 0.02 + Math.random() * 0.02,
        });
      }

      // Generate brand new completely randomized destinations across open space
      const { nodes: newLayout, edges: newEdges } = generateRandomizedLayout(
        width,
        height,
        state.nodes.length
      );
      state.edges = newEdges;

      // Fluid outward splash velocities
      state.nodes.forEach((node, i) => {
        const target = newLayout[i];
        node.baseX = target.targetX;
        node.baseY = target.targetY;
        node.targetX = target.targetX;
        node.targetY = target.targetY;
        node.radius = target.radius;
        node.isHub = target.isHub;
        node.isBalanced = target.isBalanced;

        const angle = Math.atan2(target.targetY - releaseY, target.targetX - releaseX) + (Math.random() - 0.5) * 0.4;
        const splashSpeed = 16 + Math.random() * 22;

        node.vx = Math.cos(angle) * splashSpeed;
        node.vy = Math.sin(angle) * splashSpeed;
        node.highlight = 1;
      });

      wakeLoop();
    };

    const updatePhysics = () => {
      const state = stateRef.current;
      const { nodes, mouseX, mouseY, mode, crumpleCenter, width, height, stars } = state;
      let isSettled = true;

      state.time += 1;

      // Update cosmic micro-star twinkle in dark mode
      if (isDark) {
        stars.forEach((star) => {
          star.phase += star.twinkleSpeed;
          star.alpha = star.baseAlpha * (0.65 + 0.35 * Math.sin(star.phase));
        });
      }

      // Update stardust particles
      for (let p = state.particles.length - 1; p >= 0; p--) {
        const pt = state.particles[p];
        pt.x += pt.vx;
        pt.y += pt.vy;
        pt.vx *= 0.90;
        pt.vy *= 0.90;
        pt.alpha -= pt.decay;
        if (pt.alpha <= 0.02) {
          state.particles.splice(p, 1);
        } else {
          isSettled = false;
        }
      }

      // Update shooting star streak
      if (state.shootingStar && state.shootingStar.active) {
        const ss = state.shootingStar;
        ss.x += Math.cos(ss.angle) * ss.speed;
        ss.y += Math.sin(ss.angle) * ss.speed;
        ss.alpha *= 0.96;
        if (ss.alpha < 0.02 || ss.x > width + 50 || ss.y > height + 50) {
          ss.active = false;
          state.shootingStar = null;
        } else {
          isSettled = false;
        }
      } else if (isDark && !prefersReducedMotion && Math.random() < 0.0015) {
        state.shootingStar = {
          x: Math.random() * (width * 0.6),
          y: Math.random() * (height * 0.35),
          len: 65 + Math.random() * 45,
          speed: 13 + Math.random() * 7,
          angle: Math.PI / 6 + (Math.random() - 0.5) * 0.2,
          alpha: 0.55,
          active: true,
        };
        isSettled = false;
      }

      // Update water splash ripples
      for (let r = state.ripples.length - 1; r >= 0; r--) {
        const rip = state.ripples[r];
        rip.radius += 4.5;
        rip.alpha *= 0.94;
        if (rip.alpha < 0.015 || rip.radius > rip.maxRadius) {
          state.ripples.splice(r, 1);
        } else {
          isSettled = false;
        }
      }

      if (mode === 'CRUMPLED') {
        isSettled = false;
        state.crumpleProgress = Math.min(1, state.crumpleProgress + 0.08);

        const cx = mouseX !== null ? mouseX : crumpleCenter?.x || width / 2;
        const cy = mouseY !== null ? mouseY : crumpleCenter?.y || height / 2;

        nodes.forEach((node) => {
          const tx = cx + Math.cos(node.creaseAngle) * node.creaseDist;
          const ty = cy + Math.sin(node.creaseAngle) * node.creaseDist;

          node.vx += (tx - node.x) * 0.28;
          node.vy += (ty - node.y) * 0.28;
          node.vx *= 0.65;
          node.vy *= 0.65;

          node.x += node.vx;
          node.y += node.vy;
          node.highlight = 1;
        });
      } else if (mode === 'POURING') {
        let maxSpeed = 0;
        let maxDist = 0;

        nodes.forEach((node) => {
          node.x += node.vx;
          node.y += node.vy;

          node.vx *= 0.88;
          node.vy *= 0.88;

          const dx = node.targetX - node.x;
          const dy = node.targetY - node.y;
          node.vx += dx * 0.052;
          node.vy += dy * 0.052;

          node.x = Math.max(20, Math.min(width - 20, node.x));
          node.y = Math.max(20, Math.min(height - 20, node.y));

          node.highlight *= 0.96;

          const speed = Math.hypot(node.vx, node.vy);
          const dist = Math.hypot(dx, dy);
          if (speed > maxSpeed) maxSpeed = speed;
          if (dist > maxDist) maxDist = dist;
        });

        if (
          maxSpeed < 0.15 &&
          maxDist < 1.2 &&
          state.ripples.length === 0 &&
          state.particles.length === 0
        ) {
          state.mode = 'IDLE';
          nodes.forEach((n) => {
            n.x = n.targetX;
            n.y = n.targetY;
            n.baseX = n.targetX;
            n.baseY = n.targetY;
            n.vx = 0;
            n.vy = 0;
            n.highlight = 0;
          });
        } else {
          isSettled = false;
        }
      } else {
        // IDLE MODE: ambient cursor response & single-node dragging
        const INFLUENCE_RADIUS = 150;
        const MAX_DISPLACEMENT = 12;

        for (let i = 0; i < nodes.length; i++) {
          const node = nodes[i];

          if (state.draggedIndex === i && mouseX !== null && mouseY !== null) {
            node.x = mouseX;
            node.y = mouseY;
            node.targetX = mouseX;
            node.targetY = mouseY;
            node.baseX = mouseX;
            node.baseY = mouseY;
            node.highlight = 1;
            isSettled = false;
            continue;
          }

          let targetX = node.baseX;
          let targetY = node.baseY;
          let targetHighlight = 0;

          if (!prefersReducedMotion && mouseX !== null && mouseY !== null && state.draggedIndex === null) {
            const dx = node.x - mouseX;
            const dy = node.y - mouseY;
            const dist = Math.hypot(dx, dy);

            if (dist < INFLUENCE_RADIUS && dist > 0) {
              const force = Math.pow(1 - dist / INFLUENCE_RADIUS, 1.6);
              targetX = node.baseX + (dx / dist) * force * MAX_DISPLACEMENT;
              targetY = node.baseY + (dy / dist) * force * MAX_DISPLACEMENT;
              targetHighlight = force;
            }
          }

          node.x += (targetX - node.x) * 0.08;
          node.y += (targetY - node.y) * 0.08;
          node.highlight += (targetHighlight - node.highlight) * 0.12;

          if (
            Math.abs(node.x - targetX) > 0.05 ||
            Math.abs(node.y - targetY) > 0.05 ||
            Math.abs(node.highlight - targetHighlight) > 0.01
          ) {
            isSettled = false;
          }
        }
      }

      return isSettled;
    };

    const draw = () => {
      const {
        width,
        height,
        nodes,
        edges,
        hoveredIndex,
        draggedIndex,
        selectedIndex,
        mode,
        ripples,
        stars,
        particles,
        shootingStar,
        time,
      } = stateRef.current;
      ctx.clearRect(0, 0, width, height);

      // Cosmic Design System color tokens (Dark Cosmic & Light Cosmic)
      const primaryLine = isDark ? 'rgba(129, 85, 217,' : 'rgba(41, 75, 122,';
      const nodeFill = isDark ? '#648EFF' : '#294B7A';
      const nodeBorder = isDark ? '#F7F4FF' : '#FFFFFF';
      const greenAnchor = isDark ? '#42D6B0' : '#13835D'; // Verified status

      // 1. Draw celestial background micro-star dust (Dark mode)
      if (isDark) {
        stars.forEach((star) => {
          ctx.beginPath();
          ctx.arc(star.x, star.y, star.size, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(247, 244, 255, ${star.alpha.toFixed(3)})`;
          ctx.fill();
        });
      }

      // 2. Draw shooting star streak
      if (shootingStar && shootingStar.active) {
        const tailX = shootingStar.x - Math.cos(shootingStar.angle) * shootingStar.len;
        const tailY = shootingStar.y - Math.sin(shootingStar.angle) * shootingStar.len;
        const grad = ctx.createLinearGradient(tailX, tailY, shootingStar.x, shootingStar.y);
        grad.addColorStop(0, 'rgba(189, 117, 233, 0)');
        grad.addColorStop(1, `rgba(255, 255, 255, ${shootingStar.alpha.toFixed(3)})`);
        ctx.beginPath();
        ctx.moveTo(tailX, tailY);
        ctx.lineTo(shootingStar.x, shootingStar.y);
        ctx.strokeStyle = grad;
        ctx.lineWidth = 1.4;
        ctx.stroke();
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

      // 4. Draw expanding water ripples (pour & node creation)
      ripples.forEach((rip) => {
        ctx.beginPath();
        ctx.arc(rip.x, rip.y, rip.radius, 0, Math.PI * 2);
        ctx.strokeStyle = isDark
          ? `rgba(129, 85, 217, ${rip.alpha.toFixed(3)})`
          : `rgba(41, 75, 122, ${rip.alpha.toFixed(3)})`;
        ctx.lineWidth = Math.max(1, 2.2 * rip.alpha);
        ctx.stroke();

        if (rip.alpha > 0.35) {
          ctx.beginPath();
          ctx.arc(rip.x, rip.y, rip.radius, 0, Math.PI * 2);
          ctx.fillStyle = isDark
            ? `rgba(189, 117, 233, ${(rip.alpha * 0.05).toFixed(3)})`
            : `rgba(41, 75, 122, ${(rip.alpha * 0.05).toFixed(3)})`;
          ctx.fill();
        }
      });

      // 5. Draw crumpled paper origami crease facets
      if (mode === 'CRUMPLED' && nodes.length > 3) {
        ctx.beginPath();
        for (let i = 0; i < Math.min(12, nodes.length - 2); i += 2) {
          ctx.moveTo(nodes[i].x, nodes[i].y);
          ctx.lineTo(nodes[i + 1].x, nodes[i + 1].y);
          ctx.lineTo(nodes[i + 2].x, nodes[i + 2].y);
          ctx.closePath();
        }
        ctx.fillStyle = isDark ? 'rgba(129, 85, 217, 0.08)' : 'rgba(41, 75, 122, 0.08)';
        ctx.fill();
        ctx.strokeStyle = isDark ? 'rgba(189, 117, 233, 0.35)' : 'rgba(32, 61, 101, 0.30)';
        ctx.lineWidth = 1;
        ctx.stroke();
      }

      // 6. Draw connection lines with adaptive high-contrast outlines
      for (let i = 0; i < edges.length; i++) {
        const [aIdx, bIdx, isDashed] = edges[i];
        const a = nodes[aIdx];
        const b = nodes[bIdx];
        if (!a || !b) continue;

        const isHovered = hoveredIndex === aIdx || hoveredIndex === bIdx;
        const isSelectedEdge = selectedIndex === aIdx || selectedIndex === bIdx;
        const maxHighlight = Math.max(a.highlight, b.highlight);

        // Check if edge is in the upper-right planetary horizon
        const isNearPlanet = (a.x > width * 0.48 && a.y < height * 0.58) || (b.x > width * 0.48 && b.y < height * 0.58);

        const baseAlpha = isNearPlanet ? 0.45 : 0.28;
        const alpha =
          mode === 'CRUMPLED'
            ? 0.60
            : isSelectedEdge
            ? 0.95
            : isHovered
            ? 0.90
            : isDark
            ? baseAlpha + maxHighlight * 0.45
            : 0.32 + maxHighlight * 0.45;

        const lineWidth = isDashed ? 1 : isSelectedEdge ? 2.4 : isHovered ? 2.2 : 1.4 + maxHighlight * 0.55;

        // Pass 1: Subtle shadow contrast pass for lines near the bright planet rim
        if (isDark && (isNearPlanet || isHovered || isSelectedEdge)) {
          ctx.beginPath();
          ctx.strokeStyle = 'rgba(8, 7, 18, 0.70)';
          ctx.lineWidth = lineWidth + 1.4;
          if (isDashed && mode !== 'CRUMPLED') {
            ctx.setLineDash([4, 4]);
          } else {
            ctx.setLineDash([]);
          }
          ctx.moveTo(a.x, a.y);
          ctx.lineTo(b.x, b.y);
          ctx.stroke();
        }

        // Pass 2: Primary luminous line
        ctx.beginPath();
        ctx.strokeStyle = isSelectedEdge
          ? isDark
            ? 'rgba(189, 117, 233, 0.98)'
            : 'rgba(41, 75, 122, 0.90)'
          : isHovered
          ? isDark
            ? 'rgba(100, 142, 255, 0.95)'
            : 'rgba(32, 61, 101, 0.85)'
          : isNearPlanet && isDark
          ? `rgba(189, 117, 233, ${alpha.toFixed(3)})`
          : `${primaryLine} ${alpha.toFixed(3)})`;

        ctx.lineWidth = lineWidth;

        if (isDashed && mode !== 'CRUMPLED') {
          ctx.setLineDash([4, 4]);
        } else {
          ctx.setLineDash([]);
        }

        ctx.moveTo(a.x, a.y);
        ctx.lineTo(b.x, b.y);
        ctx.stroke();
      }

      ctx.setLineDash([]);

      // 7. Draw nodes (constellation stars)
      for (let i = 0; i < nodes.length; i++) {
        const node = nodes[i];
        const { x, y, radius, isHub, isBalanced, highlight } = node;
        const isHovered = hoveredIndex === i;
        const isSelected = selectedIndex === i;
        const isDragged = draggedIndex === i;

        // Gentle breathing pulse for celestial hub stars
        const starPulse = Math.sin(time * 0.035 + node.id) * 0.5 + 0.5;

        // Distinctive celestial orbital rings for selected node
        if (isSelected) {
          // Inner orbital ring
          ctx.beginPath();
          ctx.arc(x, y, radius + 7, 0, Math.PI * 2);
          ctx.strokeStyle = isDark ? 'rgba(100, 142, 255, 0.85)' : 'rgba(41, 75, 122, 0.80)';
          ctx.lineWidth = 1.6;
          ctx.stroke();

          // Middle orbital ring (Magenta Glow)
          ctx.beginPath();
          ctx.arc(x, y, radius + 13, 0, Math.PI * 2);
          ctx.strokeStyle = isDark ? 'rgba(189, 117, 233, 0.80)' : 'rgba(124, 58, 237, 0.50)';
          ctx.lineWidth = 1.4;
          ctx.stroke();

          // Outer subtle orbital ring (Soft Cyan dashed)
          ctx.beginPath();
          ctx.setLineDash([3, 4]);
          ctx.arc(x, y, radius + 19, 0, Math.PI * 2);
          ctx.strokeStyle = isDark ? 'rgba(117, 200, 240, 0.55)' : 'rgba(41, 75, 122, 0.35)';
          ctx.lineWidth = 1.2;
          ctx.stroke();
          ctx.setLineDash([]);
        }

        // Outer concentric halo for hubs or active nodes
        if (isHub || isHovered || isDragged || highlight > 0.05 || mode === 'CRUMPLED') {
          const haloRadius = radius + (isDragged ? 8 : isHovered ? 6 : 4 + highlight * 3 + (isHub ? 2.5 * starPulse : 0));
          ctx.beginPath();
          ctx.arc(x, y, haloRadius, 0, Math.PI * 2);
          ctx.strokeStyle = isBalanced
            ? isDark
              ? 'rgba(66, 214, 176, 0.55)'
              : 'rgba(19, 131, 93, 0.40)'
            : isDark
            ? `rgba(189, 117, 233, ${(0.35 + 0.20 * starPulse + (isDragged ? 0.3 : 0)).toFixed(3)})`
            : `rgba(41, 75, 122, ${(0.25 + 0.15 * starPulse).toFixed(3)})`;
          ctx.lineWidth = isDragged ? 2 : isHovered ? 1.5 : 1;
          ctx.stroke();
        }

        // Soft atmospheric star aura for major hubs
        if (isHub && !isHovered && !isSelected && mode !== 'CRUMPLED') {
          ctx.beginPath();
          ctx.arc(x, y, radius + 9 + 3 * starPulse, 0, Math.PI * 2);
          ctx.strokeStyle = isDark
            ? `rgba(129, 85, 217, ${(0.16 + 0.12 * starPulse).toFixed(3)})`
            : `rgba(41, 75, 122, ${(0.08 + 0.08 * starPulse).toFixed(3)})`;
          ctx.lineWidth = 1;
          ctx.stroke();
        }

        // Main node dot with crisp contrast backing
        const currentRadius = radius + (isDragged ? 2.5 : isHovered ? 2 : isSelected ? 1.5 : highlight * 1.2);
        
        // Subtle dark contrast stroke behind node
        if (isDark) {
          ctx.beginPath();
          ctx.arc(x, y, currentRadius + 1, 0, Math.PI * 2);
          ctx.strokeStyle = 'rgba(8, 7, 18, 0.70)';
          ctx.lineWidth = 1.2;
          ctx.stroke();
        }

        ctx.beginPath();
        ctx.arc(x, y, currentRadius, 0, Math.PI * 2);

        if (isBalanced) {
          ctx.fillStyle = greenAnchor;
          ctx.fill();
          ctx.strokeStyle = '#FFFFFF';
          ctx.lineWidth = 2;
          ctx.stroke();
        } else if (isHub) {
          ctx.fillStyle = isDark ? '#100D20' : '#FFFFFF';
          ctx.fill();
          ctx.strokeStyle = isHovered || isSelected ? (isDark ? '#BD75E9' : '#203D65') : isDark ? '#8155D9' : '#294B7A';
          ctx.lineWidth = 2.2;
          ctx.stroke();

          // Inner solid core
          ctx.beginPath();
          ctx.arc(x, y, radius * 0.45, 0, Math.PI * 2);
          ctx.fillStyle = isDark ? '#648EFF' : '#294B7A';
          ctx.fill();
        } else {
          ctx.fillStyle = isSelected
            ? isDark
              ? '#BD75E9'
              : '#203D65'
            : isHovered
            ? isDark
              ? '#FFFFFF'
              : '#0B1220'
            : nodeFill;
          ctx.fill();
          ctx.strokeStyle = isSelected ? '#FFFFFF' : nodeBorder;
          ctx.lineWidth = isSelected ? 1.8 : 1.2;
          ctx.stroke();
        }
      }
    };

    const loop = () => {
      const isSettled = updatePhysics();
      draw();

      if (
        !isSettled ||
        stateRef.current.mode !== 'IDLE' ||
        stateRef.current.mouseX !== null ||
        (isDark && !prefersReducedMotion)
      ) {
        animFrameId = requestAnimationFrame(loop);
      } else {
        animFrameId = null;
      }
    };

    const wakeLoop = () => {
      if (animFrameId === null && !prefersReducedMotion) {
        animFrameId = requestAnimationFrame(loop);
      }
    };

    triggerWakeRef.current = wakeLoop;

    const findNodeIndexAt = (px: number, py: number): number | null => {
      const { nodes } = stateRef.current;
      for (let i = nodes.length - 1; i >= 0; i--) {
        const d = Math.hypot(nodes[i].x - px, nodes[i].y - py);
        if (d <= nodes[i].radius + 14) {
          return i;
        }
      }
      return null;
    };

    // Mouse & Touch events
    const handlePointerDown = (px: number, py: number) => {
      const state = stateRef.current;
      state.downPos = { x: px, y: py };
      state.isHolding = true;
      state.holdStartTime = Date.now();

      const hitIdx = findNodeIndexAt(px, py);

      if (hitIdx !== null) {
        state.draggedIndex = hitIdx;
        state.selectedIndex = hitIdx;
        canvas.style.cursor = 'grabbing';
        if (holdTimerRef.current) clearTimeout(holdTimerRef.current);
      } else {
        state.draggedIndex = null;
        if (holdTimerRef.current) clearTimeout(holdTimerRef.current);
        holdTimerRef.current = setTimeout(() => {
          if (
            stateRef.current.isHolding &&
            stateRef.current.draggedIndex === null &&
            stateRef.current.mode === 'IDLE'
          ) {
            startCrumple(px, py);
          }
        }, 350);
      }
      wakeLoop();
    };

    const handlePointerMove = (px: number, py: number) => {
      const state = stateRef.current;
      state.mouseX = px;
      state.mouseY = py;

      if (state.mode === 'CRUMPLED') {
        state.crumpleCenter = { x: px, y: py };
        canvas.style.cursor = 'grabbing';
      } else if (state.draggedIndex !== null) {
        const node = state.nodes[state.draggedIndex];
        if (node) {
          node.x = px;
          node.y = py;
          node.baseX = px;
          node.baseY = py;
          node.targetX = px;
          node.targetY = py;
          node.vx = 0;
          node.vy = 0;
          node.highlight = 1;
        }
        canvas.style.cursor = 'grabbing';
      } else if (state.isHolding && state.downPos) {
        const dist = Math.hypot(px - state.downPos.x, py - state.downPos.y);
        if (dist > 14) {
          if (holdTimerRef.current) clearTimeout(holdTimerRef.current);
        }
      } else {
        const hovered = findNodeIndexAt(px, py);
        state.hoveredIndex = hovered;
        canvas.style.cursor = hovered !== null ? 'grab' : 'crosshair';
      }
      wakeLoop();
    };

    const handlePointerUp = (px: number, py: number) => {
      const state = stateRef.current;
      if (holdTimerRef.current) clearTimeout(holdTimerRef.current);

      if (state.mode === 'CRUMPLED') {
        startWaterPour(px, py);
      } else if (state.draggedIndex !== null) {
        const node = state.nodes[state.draggedIndex];
        if (node) {
          node.x = px;
          node.y = py;
          node.baseX = px;
          node.baseY = py;
          node.targetX = px;
          node.targetY = py;
          node.vx = 0;
          node.vy = 0;
          node.highlight = 0.4;
        }
        canvas.style.cursor = 'grab';
      } else if (state.isHolding && state.downPos && state.mode === 'IDLE') {
        const dist = Math.hypot(px - state.downPos.x, py - state.downPos.y);

        if (dist < 14 && state.draggedIndex === null) {
          const rx = px / state.width;
          const ry = py / state.height;

          if (!isProtectedZone(rx, ry)) {
            const newId = state.nodes.length;
            state.nodes.push({
              id: newId,
              x: px,
              y: py,
              vx: 0,
              vy: 0,
              baseX: px,
              baseY: py,
              targetX: px,
              targetY: py,
              radius: 5.5,
              isHub: false,
              isBalanced: false,
              highlight: 1,
              creaseAngle: Math.random() * Math.PI * 2,
              creaseDist: 16 + Math.random() * 12,
            });

            state.ripples.push(
              { x: px, y: py, radius: 8, maxRadius: 240, alpha: 0.8 },
              { x: px, y: py, radius: 24, maxRadius: 180, alpha: 0.6 },
              { x: px, y: py, radius: 42, maxRadius: 120, alpha: 0.4 }
            );

            for (let p = 0; p < 8; p++) {
              const pAngle = Math.random() * Math.PI * 2;
              const pSpeed = 3 + Math.random() * 6;
              state.particles.push({
                x: px,
                y: py,
                vx: Math.cos(pAngle) * pSpeed,
                vy: Math.sin(pAngle) * pSpeed,
                radius: 1 + Math.random() * 1.5,
                alpha: 0.85,
                decay: 0.03 + Math.random() * 0.02,
              });
            }

            const sorted = state.nodes
              .slice(0, -1)
              .map((n, idx) => ({ idx, dist: Math.hypot(n.x - px, n.y - py) }))
              .sort((a, b) => a.dist - b.dist);

            if (sorted.length > 0) {
              state.edges.push([sorted[0].idx, newId]);
              const n1 = state.nodes[sorted[0].idx];
              const angle1 = Math.atan2(n1.y - py, n1.x - px);
              n1.vx += Math.cos(angle1) * 2.8;
              n1.vy += Math.sin(angle1) * 2.8;
              n1.highlight = 0.8;
            }
            if (sorted.length > 1) {
              state.edges.push([sorted[1].idx, newId]);
              const n2 = state.nodes[sorted[1].idx];
              const angle2 = Math.atan2(n2.y - py, n2.x - px);
              n2.vx += Math.cos(angle2) * 2.2;
              n2.vy += Math.sin(angle2) * 2.2;
              n2.highlight = 0.6;
            }

            state.selectedIndex = newId;
            setNodeCount(state.nodes.length);
          } else {
            state.selectedIndex = null;
          }
        }
      }

      state.isHolding = false;
      state.draggedIndex = null;
      state.downPos = null;
      wakeLoop();
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
      if (holdTimerRef.current) clearTimeout(holdTimerRef.current);
      if (state.mode === 'CRUMPLED' && state.crumpleCenter) {
        startWaterPour(state.crumpleCenter.x, state.crumpleCenter.y);
      }
      state.mouseX = null;
      state.mouseY = null;
      state.hoveredIndex = null;
      state.draggedIndex = null;
      state.isHolding = false;
      wakeLoop();
    };

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.target !== canvas && e.target !== containerRef.current) return;
      if (e.key === 'a' || e.key === 'A') {
        handleAddNode();
      } else if (e.key === 'r' || e.key === 'R') {
        handleRegenerate();
      } else if (e.key === 'Escape') {
        stateRef.current.selectedIndex = null;
        wakeLoop();
      } else if (e.key === ' ' || e.key === 'c' || e.key === 'C') {
        e.preventDefault();
        const state = stateRef.current;
        if (state.mode === 'IDLE') {
          startCrumple(state.width * 0.5, state.height * 0.5);
          setTimeout(() => {
            startWaterPour(state.width * 0.5, state.height * 0.5);
          }, 450);
        }
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

    return () => {
      if (animFrameId !== null) cancelAnimationFrame(animFrameId);
      if (holdTimerRef.current) clearTimeout(holdTimerRef.current);
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
  }, [isDark, handleAddNode, handleRegenerate]);

  return (
    <div
      ref={containerRef}
      tabIndex={0}
      className="absolute inset-0 w-full h-full overflow-hidden select-none pointer-events-auto z-10 focus:outline-none"
      aria-label="Interactive LedgerLine constellation graph. Click to create star, drag to reposition, hold to flow, or press A to add and R to regenerate."
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
