'use client';

import React, { useEffect, useRef } from 'react';

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
  // Relative origami crease parameters when crumpled
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

type InteractionMode = 'IDLE' | 'CRUMPLED' | 'POURING';

interface NetworkState {
  width: number;
  height: number;
  dpr: number;
  nodes: RuntimeNode[];
  edges: [number, number, boolean?][];
  mouseX: number | null;
  mouseY: number | null;
  hoveredIndex: number | null;
  draggedIndex: number | null;
  mode: InteractionMode;
  crumpleCenter: { x: number; y: number } | null;
  crumpleProgress: number; // 0 to 1
  ripples: WaterRipple[];
  isHolding: boolean;
  holdStartTime: number;
  downPos: { x: number; y: number } | null;
}

export default function InteractiveLedgerNetwork({ isDark = false }: { isDark?: boolean }) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const stateRef = useRef<NetworkState>({
    width: 0,
    height: 0,
    dpr: 1,
    nodes: [],
    edges: [],
    mouseX: null,
    mouseY: null,
    hoveredIndex: null,
    draggedIndex: null,
    mode: 'IDLE',
    crumpleCenter: null,
    crumpleProgress: 0,
    ripples: [],
    isHolding: false,
    holdStartTime: 0,
    downPos: null,
  });

  const holdTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Helper: check if a normalized point is inside protected zones
  // 1. Top-left logo zone: rx < 0.38 && ry < 0.22
  // 2. Bottom-left headline zone: rx < 0.58 && ry > 0.70
  const isProtectedZone = (rx: number, ry: number) => {
    if (rx < 0.38 && ry < 0.22) return true; // Logo & LedgerLine
    if (rx < 0.58 && ry > 0.70) return true; // Headline
    return false;
  };

  // Helper: generate completely randomized, non-overlapping nodes avoiding protected zones
  const generateRandomizedLayout = (width: number, height: number, count = 22) => {
    const newNodes: RuntimeNode[] = [];
    const minPixelDist = Math.min(width, height) * 0.12;

    for (let i = 0; i < count; i++) {
      let x = 0;
      let y = 0;
      let valid = false;
      let attempts = 0;

      while (!valid && attempts < 100) {
        attempts++;
        const rx = 0.12 + Math.random() * 0.82;
        const ry = 0.12 + Math.random() * 0.82;

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

      const isHub = i === 1 || i === 6 || i === 12;
      const isBalanced = i === 9;
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
          dist: i === j ? Infinity : Math.hypot(n.targetX - newNodes[i].targetX, n.targetY - newNodes[i].targetY),
        }))
        .sort((a, b) => a.dist - b.dist);

      const connectCount = 2 + Math.floor(Math.random() * 2);
      for (let c = 0; c < Math.min(connectCount, dists.length); c++) {
        const j = dists[c].idx;
        const key = i < j ? `${i}-${j}` : `${j}-${i}`;
        if (!edgeSet.has(key)) {
          edgeSet.add(key);
          const isDashed = Math.random() < 0.12;
          edges.push([i, j, isDashed]);
        }
      }
    }

    return { nodes: newNodes, edges };
  };

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

      if (stateRef.current.nodes.length === 0) {
        const { nodes, edges } = generateRandomizedLayout(w, h, 22);
        stateRef.current.nodes = nodes;
        stateRef.current.edges = edges;
      }
      draw();
    };

    // Transition: Crumple paper mode
    const startCrumple = (originX: number, originY: number) => {
      const state = stateRef.current;
      state.mode = 'CRUMPLED';
      state.crumpleCenter = { x: originX, y: originY };
      state.crumpleProgress = 0;
      canvas.style.cursor = 'grabbing';

      // Pull every node inward with high spring tension and fractal crease jitter
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

    // Transition: Pour like water on floor
    const startWaterPour = (releaseX: number, releaseY: number) => {
      const state = stateRef.current;
      const { width, height } = state;
      state.mode = 'POURING';
      canvas.style.cursor = 'grab';

      // 1. Trigger expanding water ripples
      state.ripples.push(
        { x: releaseX, y: releaseY, radius: 10, maxRadius: 320, alpha: 0.75 },
        { x: releaseX, y: releaseY, radius: 25, maxRadius: 240, alpha: 0.55 },
        { x: releaseX, y: releaseY, radius: 45, maxRadius: 180, alpha: 0.40 }
      );

      // 2. Generate brand new completely randomized destinations across open canvas
      const { nodes: newLayout, edges: newEdges } = generateRandomizedLayout(width, height, state.nodes.length);
      state.edges = newEdges;

      // 3. Fluid outward splash velocities (like water splashing onto the floor)
      state.nodes.forEach((node, i) => {
        const target = newLayout[i];
        node.baseX = target.targetX;
        node.baseY = target.targetY;
        node.targetX = target.targetX;
        node.targetY = target.targetY;
        node.radius = target.radius;
        node.isHub = target.isHub;
        node.isBalanced = target.isBalanced;

        // Outward radial splash vector from pour origin towards target with fluid turbulence
        const angle = Math.atan2(target.targetY - releaseY, target.targetX - releaseX) + (Math.random() - 0.5) * 0.4;
        const splashSpeed = 16 + Math.random() * 22; // Initial energetic splash

        node.vx = Math.cos(angle) * splashSpeed;
        node.vy = Math.sin(angle) * splashSpeed;
        node.highlight = 1;
      });

      wakeLoop();
    };

    const updatePhysics = () => {
      const state = stateRef.current;
      const { nodes, mouseX, mouseY, mode, crumpleCenter, width, height } = state;
      let isSettled = true;

      // Update water splash ripples
      for (let r = state.ripples.length - 1; r >= 0; r--) {
        const rip = state.ripples[r];
        rip.radius += 5.5;
        rip.alpha *= 0.94;
        if (rip.alpha < 0.02 || rip.radius > rip.maxRadius) {
          state.ripples.splice(r, 1);
        } else {
          isSettled = false;
        }
      }

      if (mode === 'CRUMPLED') {
        isSettled = false;
        state.crumpleProgress = Math.min(1, state.crumpleProgress + 0.08);

        // Entire crumpled paper ball tracks cursor smoothly
        const cx = mouseX !== null ? mouseX : crumpleCenter?.x || width / 2;
        const cy = mouseY !== null ? mouseY : crumpleCenter?.y || height / 2;

        nodes.forEach((node) => {
          // Origami crease folded target
          const tx = cx + Math.cos(node.creaseAngle) * node.creaseDist;
          const ty = cy + Math.sin(node.creaseAngle) * node.creaseDist;

          node.vx += (tx - node.x) * 0.28;
          node.vy += (ty - node.y) * 0.28;
          node.vx *= 0.65; // High paper crease damping
          node.vy *= 0.65;

          node.x += node.vx;
          node.y += node.vy;
          node.highlight = 1;
        });
      } else if (mode === 'POURING') {
        let maxSpeed = 0;
        let maxDist = 0;

        nodes.forEach((node) => {
          // Viscous laminar fluid spreading: decelerate smoothly
          node.x += node.vx;
          node.y += node.vy;

          // Liquid viscosity damping (pours smoothly like water)
          node.vx *= 0.88;
          node.vy *= 0.88;

          // Surface tension pull towards settled target
          const dx = node.targetX - node.x;
          const dy = node.targetY - node.y;
          node.vx += dx * 0.052;
          node.vy += dy * 0.052;

          // Keep within canvas bounds
          node.x = Math.max(20, Math.min(width - 20, node.x));
          node.y = Math.max(20, Math.min(height - 20, node.y));

          node.highlight *= 0.96;

          const speed = Math.hypot(node.vx, node.vy);
          const dist = Math.hypot(dx, dy);
          if (speed > maxSpeed) maxSpeed = speed;
          if (dist > maxDist) maxDist = dist;
        });

        if (maxSpeed < 0.15 && maxDist < 1.2 && state.ripples.length === 0) {
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
      const { width, height, nodes, edges, hoveredIndex, mode, ripples } = stateRef.current;
      ctx.clearRect(0, 0, width, height);

      // Institutional Blue color tokens
      const primaryLine = isDark ? 'rgba(120, 166, 246,' : 'rgba(41, 75, 122,';
      const nodeFill = isDark ? '#78A6F6' : '#294B7A';
      const nodeBorder = isDark ? '#E8EEF7' : '#FFFFFF';
      const greenAnchor = isDark ? '#36C995' : '#13835D';

      // 1. Draw expanding water ripples (pour & node creation)
      ripples.forEach((rip) => {
        ctx.beginPath();
        ctx.arc(rip.x, rip.y, rip.radius, 0, Math.PI * 2);
        ctx.strokeStyle = isDark
          ? `rgba(120, 166, 246, ${rip.alpha.toFixed(3)})`
          : `rgba(41, 75, 122, ${rip.alpha.toFixed(3)})`;
        ctx.lineWidth = Math.max(1, 2.2 * rip.alpha);
        ctx.stroke();

        if (rip.alpha > 0.35) {
          ctx.beginPath();
          ctx.arc(rip.x, rip.y, rip.radius, 0, Math.PI * 2);
          ctx.fillStyle = isDark
            ? `rgba(120, 166, 246, ${(rip.alpha * 0.05).toFixed(3)})`
            : `rgba(41, 75, 122, ${(rip.alpha * 0.05).toFixed(3)})`;
          ctx.fill();
        }
      });

      // 2. Draw crumpled paper origami crease facets
      if (mode === 'CRUMPLED' && nodes.length > 3) {
        ctx.beginPath();
        for (let i = 0; i < Math.min(12, nodes.length - 2); i += 2) {
          ctx.moveTo(nodes[i].x, nodes[i].y);
          ctx.lineTo(nodes[i + 1].x, nodes[i + 1].y);
          ctx.lineTo(nodes[i + 2].x, nodes[i + 2].y);
          ctx.closePath();
        }
        ctx.fillStyle = isDark ? 'rgba(120, 166, 246, 0.08)' : 'rgba(41, 75, 122, 0.08)';
        ctx.fill();
        ctx.strokeStyle = isDark ? 'rgba(145, 183, 255, 0.35)' : 'rgba(32, 61, 101, 0.30)';
        ctx.lineWidth = 1;
        ctx.stroke();
      }

      // 3. Draw connection lines
      for (let i = 0; i < edges.length; i++) {
        const [aIdx, bIdx, isDashed] = edges[i];
        const a = nodes[aIdx];
        const b = nodes[bIdx];
        if (!a || !b) continue;

        const isHovered = hoveredIndex === aIdx || hoveredIndex === bIdx;
        const maxHighlight = Math.max(a.highlight, b.highlight);

        const alpha =
          mode === 'CRUMPLED'
            ? 0.55
            : isHovered
            ? 0.85
            : isDark
            ? 0.28 + maxHighlight * 0.45
            : 0.32 + maxHighlight * 0.45;

        ctx.beginPath();
        ctx.strokeStyle = isHovered
          ? isDark
            ? 'rgba(145, 183, 255, 0.90)'
            : 'rgba(32, 61, 101, 0.85)'
          : `${primaryLine} ${alpha.toFixed(3)})`;

        ctx.lineWidth = isDashed ? 1 : isHovered ? 2 : 1.35 + maxHighlight * 0.5;

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

      // 4. Draw nodes
      for (let i = 0; i < nodes.length; i++) {
        const node = nodes[i];
        const { x, y, radius, isHub, isBalanced, highlight } = node;
        const isHovered = hoveredIndex === i;

        // Outer concentric halo for hubs or active nodes
        if (isHub || isHovered || highlight > 0.05 || mode === 'CRUMPLED') {
          const haloRadius = radius + (isHovered ? 6 : 4 + highlight * 3);
          ctx.beginPath();
          ctx.arc(x, y, haloRadius, 0, Math.PI * 2);
          ctx.strokeStyle = isBalanced
            ? isDark
              ? 'rgba(54, 201, 149, 0.45)'
              : 'rgba(19, 131, 93, 0.35)'
            : isDark
            ? 'rgba(120, 166, 246, 0.30)'
            : 'rgba(41, 75, 122, 0.25)';
          ctx.lineWidth = isHovered ? 1.5 : 1;
          ctx.stroke();
        }

        // Main node dot
        ctx.beginPath();
        ctx.arc(x, y, radius + (isHovered ? 2 : highlight * 1.2), 0, Math.PI * 2);

        if (isBalanced) {
          ctx.fillStyle = greenAnchor;
          ctx.fill();
          ctx.strokeStyle = '#ffffff';
          ctx.lineWidth = 2;
          ctx.stroke();
        } else if (isHub) {
          ctx.fillStyle = isDark ? '#111C2E' : '#FFFFFF';
          ctx.fill();
          ctx.strokeStyle = isHovered
            ? isDark
              ? '#91B7FF'
              : '#203D65'
            : isDark
            ? '#78A6F6'
            : '#294B7A';
          ctx.lineWidth = 2.2;
          ctx.stroke();

          // Inner solid core
          ctx.beginPath();
          ctx.arc(x, y, radius * 0.45, 0, Math.PI * 2);
          ctx.fillStyle = isDark ? '#78A6F6' : '#294B7A';
          ctx.fill();
        } else {
          ctx.fillStyle = isHovered ? (isDark ? '#FFFFFF' : '#0B1220') : nodeFill;
          ctx.fill();
          ctx.strokeStyle = nodeBorder;
          ctx.lineWidth = 1.2;
          ctx.stroke();
        }
      }
    };

    const loop = () => {
      const isSettled = updatePhysics();
      draw();

      if (!isSettled || stateRef.current.mode !== 'IDLE' || stateRef.current.mouseX !== null) {
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

      // Start hold timer for paper crumple (190ms)
      if (holdTimerRef.current) clearTimeout(holdTimerRef.current);
      holdTimerRef.current = setTimeout(() => {
        if (stateRef.current.isHolding) {
          startCrumple(px, py);
        }
      }, 190);

      if (hitIdx !== null) {
        state.draggedIndex = hitIdx;
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
      } else if (state.isHolding && state.downPos) {
        const dist = Math.hypot(px - state.downPos.x, py - state.downPos.y);
        // If moved significantly before hold timer fired, cancel crumple timer and drag single node
        if (dist > 10 && state.draggedIndex !== null && state.mode === 'IDLE') {
          if (holdTimerRef.current) clearTimeout(holdTimerRef.current);
          canvas.style.cursor = 'grabbing';
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
        // Release the crumpled ball: water pour splash!
        startWaterPour(px, py);
      } else if (state.isHolding && state.downPos && state.mode === 'IDLE') {
        const dist = Math.hypot(px - state.downPos.x, py - state.downPos.y);
        const elapsed = Date.now() - state.holdStartTime;

        // Quick click on empty canvas: spawn new point
        if (dist < 6 && elapsed < 200 && state.draggedIndex === null) {
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

            // Trigger expanding water ripples like water droplet on pond
            state.ripples.push(
              { x: px, y: py, radius: 8, maxRadius: 240, alpha: 0.8 },
              { x: px, y: py, radius: 24, maxRadius: 180, alpha: 0.6 },
              { x: px, y: py, radius: 42, maxRadius: 120, alpha: 0.4 }
            );

            // Connect to 2 closest nodes
            const sorted = state.nodes
              .slice(0, -1)
              .map((n, idx) => ({ idx, dist: Math.hypot(n.x - px, n.y - py) }))
              .sort((a, b) => a.dist - b.dist);

            if (sorted.length > 0) {
              state.edges.push([sorted[0].idx, newId]);
              // Gentle water ripple impulse to connected node
              const n1 = state.nodes[sorted[0].idx];
              const angle1 = Math.atan2(n1.y - py, n1.x - px);
              n1.vx += Math.cos(angle1) * 2.8;
              n1.vy += Math.sin(angle1) * 2.8;
              n1.highlight = 0.8;
            }
            if (sorted.length > 1) {
              state.edges.push([sorted[1].idx, newId]);
              // Gentle water ripple impulse to second connected node
              const n2 = state.nodes[sorted[1].idx];
              const angle2 = Math.atan2(n2.y - py, n2.x - px);
              n2.vx += Math.cos(angle2) * 2.2;
              n2.vy += Math.sin(angle2) * 2.2;
              n2.highlight = 0.6;
            }
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

    // Touch support
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

      canvas.removeEventListener('touchstart', onTouchStart);
      window.removeEventListener('touchmove', onTouchMove);
      window.removeEventListener('touchend', onTouchEnd);
    };
  }, [isDark]);

  return (
    <div className="overflow-hidden absolute inset-0 w-full h-full pointer-events-auto select-none">
      <canvas
        ref={canvasRef}
        className="absolute inset-0 w-full h-full pointer-events-auto cursor-grab active:cursor-grabbing"
        aria-label="Playful interactive double-entry network. Click and hold to crumple the paper pattern, drag it around, and release to pour like water on the floor."
      />
    </div>
  );
}
