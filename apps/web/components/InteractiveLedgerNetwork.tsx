'use client';

import React, { useEffect, useRef } from 'react';

interface NodeDef {
  // Relative coordinates in [0, 1]
  rx: number;
  ry: number;
  radius: number;
  isHub?: boolean;
  isBalanced?: boolean;
}

// Fixed architectural network layout across the canvas
// Left-bottom area (rx: 0..0.60, ry: 0.75..1.0) is kept clear for the headline
const NETWORK_NODES: NodeDef[] = [
  // Upper tier (Settlement & Ingress)
  { rx: 0.18, ry: 0.12, radius: 4 },
  { rx: 0.44, ry: 0.10, radius: 5 },
  { rx: 0.72, ry: 0.13, radius: 7.5, isHub: true },
  { rx: 0.90, ry: 0.15, radius: 4 },

  // Upper-mid tier (Accounts & Clearing)
  { rx: 0.14, ry: 0.28, radius: 4.5 },
  { rx: 0.36, ry: 0.25, radius: 8, isHub: true },
  { rx: 0.60, ry: 0.29, radius: 5 },
  { rx: 0.84, ry: 0.28, radius: 6 },

  // Center tier (Core double-entry router)
  { rx: 0.20, ry: 0.44, radius: 5 },
  { rx: 0.46, ry: 0.42, radius: 9, isHub: true },
  { rx: 0.70, ry: 0.44, radius: 5.5 },
  { rx: 0.92, ry: 0.43, radius: 4 },

  // Lower-mid tier (Verification & Reserves)
  { rx: 0.22, ry: 0.60, radius: 4.5 },
  { rx: 0.48, ry: 0.58, radius: 6 },
  { rx: 0.74, ry: 0.59, radius: 8, isHub: true, isBalanced: true },
  { rx: 0.92, ry: 0.60, radius: 4.5 },

  // Lower-right tier (Append-only storage & Seal anchors)
  // Kept to the right to preserve ample negative space for the headline on the left
  { rx: 0.66, ry: 0.74, radius: 5 },
  { rx: 0.88, ry: 0.76, radius: 7, isHub: true },
  { rx: 0.78, ry: 0.88, radius: 5 },
  { rx: 0.94, ry: 0.90, radius: 4 },
];

// Architectural ledger connection edges between node indices
const EDGES: [number, number, boolean?][] = [
  // Upper tier connections
  [0, 1],
  [1, 2],
  [2, 3],
  [0, 4],
  [1, 5],
  [2, 6],
  [3, 7],
  [2, 7],

  // Cross tier & core clearing
  [4, 5],
  [5, 6],
  [6, 7],
  [4, 8],
  [5, 9],
  [6, 9],
  [6, 10],
  [7, 10],
  [7, 11],

  // Center double-entry routing
  [8, 9],
  [9, 10],
  [10, 11],
  [8, 12],
  [9, 12],
  [9, 13],
  [9, 14],
  [10, 14],
  [11, 15],

  // Lower tier verification
  [12, 13],
  [13, 14],
  [14, 15],
  [13, 16],
  [14, 16],
  [14, 17],
  [15, 17],

  // Lower-right anchors
  [16, 17],
  [16, 18],
  [17, 18],
  [17, 19],
  [18, 19],

  // Subtle dashed verification cross-links
  [1, 9, true],
  [5, 14, true],
  [9, 16, true],
];

export default function InteractiveLedgerNetwork() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Detect user reduced motion preference
    const prefersReducedMotion = window.matchMedia(
      '(prefers-reduced-motion: reduce)'
    ).matches;

    // Track dimensions
    let width = 0;
    let height = 0;
    let dpr = 1;

    // Runtime node state
    interface RuntimeNode {
      baseX: number;
      baseY: number;
      x: number;
      y: number;
      targetX: number;
      targetY: number;
      radius: number;
      isHub: boolean;
      isBalanced: boolean;
      highlight: number;
    }

    let nodes: RuntimeNode[] = [];

    const initNodes = () => {
      nodes = NETWORK_NODES.map((def) => {
        const bx = def.rx * width;
        const by = def.ry * height;
        return {
          baseX: bx,
          baseY: by,
          x: bx,
          y: by,
          targetX: bx,
          targetY: by,
          radius: def.radius,
          isHub: !!def.isHub,
          isBalanced: !!def.isBalanced,
          highlight: 0,
        };
      });
    };

    const handleResize = () => {
      const rect = canvas.getBoundingClientRect();
      width = rect.width;
      height = rect.height;
      dpr = Math.min(window.devicePixelRatio || 1, 2);

      canvas.width = Math.floor(width * dpr);
      canvas.height = Math.floor(height * dpr);
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.scale(dpr, dpr);

      initNodes();
      draw();
    };

    // Cursor tracking
    let mouseX: number | null = null;
    let mouseY: number | null = null;
    let isInteracting = false;
    let animFrameId: number | null = null;

    const INFLUENCE_RADIUS = 180;
    const MAX_DISPLACEMENT = 16;

    const updatePhysics = () => {
      let isSettled = true;

      for (let i = 0; i < nodes.length; i++) {
        const node = nodes[i];
        let targetX = node.baseX;
        let targetY = node.baseY;
        let targetHighlight = 0;

        if (!prefersReducedMotion && mouseX !== null && mouseY !== null) {
          const dx = node.x - mouseX;
          const dy = node.y - mouseY;
          const dist = Math.hypot(dx, dy);

          if (dist < INFLUENCE_RADIUS && dist > 0) {
            // Smooth falloff curve
            const force = Math.pow(1 - dist / INFLUENCE_RADIUS, 1.6);
            targetX = node.baseX + (dx / dist) * force * MAX_DISPLACEMENT;
            targetY = node.baseY + (dy / dist) * force * MAX_DISPLACEMENT;
            targetHighlight = force;
          }
        }

        // Smooth fluid interpolation with zero overshoot
        node.x += (targetX - node.x) * 0.08;
        node.y += (targetY - node.y) * 0.08;
        node.highlight += (targetHighlight - node.highlight) * 0.12;

        if (
          Math.abs(node.x - targetX) > 0.04 ||
          Math.abs(node.y - targetY) > 0.04 ||
          Math.abs(node.highlight - targetHighlight) > 0.01
        ) {
          isSettled = false;
        }
      }

      return isSettled;
    };

    const draw = () => {
      ctx.clearRect(0, 0, width, height);

      // 1. Draw connection lines
      for (let i = 0; i < EDGES.length; i++) {
        const [aIdx, bIdx, isDashed] = EDGES[i];
        const a = nodes[aIdx];
        const b = nodes[bIdx];
        if (!a || !b) continue;

        const maxHighlight = Math.max(a.highlight, b.highlight);
        // Base line alpha = 0.32 (visible, refined blue), softly brightens to 0.75 on hover
        const lineAlpha = 0.32 + maxHighlight * 0.43;

        ctx.beginPath();
        ctx.strokeStyle = `rgba(44, 74, 124, ${lineAlpha.toFixed(3)})`;
        ctx.lineWidth = isDashed ? 1 : 1.35 + maxHighlight * 0.5;

        if (isDashed) {
          ctx.setLineDash([4, 4]);
        } else {
          ctx.setLineDash([]);
        }

        ctx.moveTo(a.x, a.y);
        ctx.lineTo(b.x, b.y);
        ctx.stroke();
      }

      ctx.setLineDash([]);

      // 2. Draw nodes
      for (let i = 0; i < nodes.length; i++) {
        const node = nodes[i];
        const { x, y, radius, isHub, isBalanced, highlight } = node;

        // Outer concentric halo for hub nodes or hovered nodes
        if (isHub || highlight > 0.05) {
          const haloRadius = isHub ? radius + 5 + highlight * 4 : radius + highlight * 5;
          ctx.beginPath();
          ctx.arc(x, y, haloRadius, 0, Math.PI * 2);
          ctx.strokeStyle = isBalanced
            ? `rgba(22, 101, 52, ${(0.22 + highlight * 0.35).toFixed(3)})`
            : `rgba(44, 74, 124, ${(0.20 + highlight * 0.40).toFixed(3)})`;
          ctx.lineWidth = 1;
          ctx.stroke();
        }

        // Main node circle
        ctx.beginPath();
        ctx.arc(x, y, radius + highlight * 1.5, 0, Math.PI * 2);

        if (isBalanced) {
          // Green balance anchor
          ctx.fillStyle = '#166534';
          ctx.fill();
          ctx.strokeStyle = '#ffffff';
          ctx.lineWidth = 1.5;
          ctx.stroke();
        } else if (isHub) {
          // Key Ledger Hub: Navy border with white paper center and navy core
          ctx.fillStyle = '#ffffff';
          ctx.fill();
          ctx.strokeStyle = `rgba(44, 74, 124, ${(0.88 + highlight * 0.12).toFixed(3)})`;
          ctx.lineWidth = 2;
          ctx.stroke();

          // Inner solid core
          ctx.beginPath();
          ctx.arc(x, y, radius * 0.45, 0, Math.PI * 2);
          ctx.fillStyle = '#2C4A7C';
          ctx.fill();
        } else {
          // Standard satellite node: solid navy dot with subtle highlight
          const nodeAlpha = 0.72 + highlight * 0.28;
          ctx.fillStyle = `rgba(44, 74, 124, ${nodeAlpha.toFixed(3)})`;
          ctx.fill();
        }
      }
    };

    const loop = () => {
      const isSettled = updatePhysics();
      draw();

      if (!isSettled || isInteracting) {
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

    // Mouse event handlers
    const onMouseMove = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      mouseX = e.clientX - rect.left;
      mouseY = e.clientY - rect.top;
      isInteracting = true;
      wakeLoop();
    };

    const onMouseLeave = () => {
      mouseX = null;
      mouseY = null;
      isInteracting = false;
      wakeLoop();
    };

    // Touch event handlers (calm, low-intensity response)
    const onTouchMove = (e: TouchEvent) => {
      if (e.touches.length > 0) {
        const rect = canvas.getBoundingClientRect();
        mouseX = e.touches[0].clientX - rect.left;
        mouseY = e.touches[0].clientY - rect.top;
        isInteracting = true;
        wakeLoop();
      }
    };

    const onTouchEnd = () => {
      mouseX = null;
      mouseY = null;
      isInteracting = false;
      wakeLoop();
    };

    // Attach listeners
    handleResize();

    const resizeObserver = new ResizeObserver(() => {
      handleResize();
    });
    resizeObserver.observe(canvas);

    if (!prefersReducedMotion) {
      canvas.addEventListener('mousemove', onMouseMove);
      canvas.addEventListener('mouseleave', onMouseLeave);
      canvas.addEventListener('touchmove', onTouchMove, { passive: true });
      canvas.addEventListener('touchend', onTouchEnd, { passive: true });
      canvas.addEventListener('touchcancel', onTouchEnd, { passive: true });
    }

    return () => {
      resizeObserver.disconnect();
      if (animFrameId !== null) {
        cancelAnimationFrame(animFrameId);
      }
      canvas.removeEventListener('mousemove', onMouseMove);
      canvas.removeEventListener('mouseleave', onMouseLeave);
      canvas.removeEventListener('touchmove', onTouchMove);
      canvas.removeEventListener('touchend', onTouchEnd);
      canvas.removeEventListener('touchcancel', onTouchEnd);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 w-full h-full pointer-events-auto cursor-default"
      aria-hidden="true"
    />
  );
}
