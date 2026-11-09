'use client';

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { RefreshCw, Network, Disc, GitFork, Sparkles, Plus } from 'lucide-react';

interface NodeDef {
  rx: number;
  ry: number;
  radius: number;
  isHub?: boolean;
  isBalanced?: boolean;
}

type PatternType = 'mesh' | 'hub' | 'chain' | 'constellation';

// Preset 1: Distributed Mesh Pattern
const PRESET_MESH: { nodes: NodeDef[]; edges: [number, number, boolean?][] } = {
  nodes: [
    { rx: 0.18, ry: 0.12, radius: 4.5 },
    { rx: 0.44, ry: 0.10, radius: 5.5 },
    { rx: 0.72, ry: 0.13, radius: 8, isHub: true },
    { rx: 0.90, ry: 0.15, radius: 4 },
    { rx: 0.14, ry: 0.28, radius: 5 },
    { rx: 0.36, ry: 0.25, radius: 8.5, isHub: true },
    { rx: 0.60, ry: 0.29, radius: 5.5 },
    { rx: 0.84, ry: 0.28, radius: 6.5 },
    { rx: 0.20, ry: 0.44, radius: 5.5 },
    { rx: 0.48, ry: 0.42, radius: 9.5, isHub: true },
    { rx: 0.72, ry: 0.44, radius: 6 },
    { rx: 0.92, ry: 0.43, radius: 4.5 },
    { rx: 0.22, ry: 0.60, radius: 5 },
    { rx: 0.50, ry: 0.58, radius: 6.5 },
    { rx: 0.74, ry: 0.59, radius: 8.5, isHub: true, isBalanced: true },
    { rx: 0.92, ry: 0.60, radius: 5 },
    { rx: 0.66, ry: 0.74, radius: 5.5 },
    { rx: 0.88, ry: 0.76, radius: 7.5, isHub: true },
    { rx: 0.78, ry: 0.88, radius: 5 },
    { rx: 0.94, ry: 0.90, radius: 4.5 },
  ],
  edges: [
    [0, 1], [1, 2], [2, 3], [0, 4], [1, 5], [2, 6], [3, 7], [2, 7],
    [4, 5], [5, 6], [6, 7], [4, 8], [5, 9], [6, 9], [6, 10], [7, 10], [7, 11],
    [8, 9], [9, 10], [10, 11], [8, 12], [9, 12], [9, 13], [9, 14], [10, 14], [11, 15],
    [12, 13], [13, 14], [14, 15], [13, 16], [14, 16], [14, 17], [15, 17],
    [16, 17], [16, 18], [17, 18], [17, 19], [18, 19],
    [1, 9, true], [5, 14, true], [9, 16, true],
  ],
};

// Preset 2: Central Reserve Clearing Hub
const PRESET_HUB: { nodes: NodeDef[]; edges: [number, number, boolean?][] } = {
  nodes: [
    // Central Hub
    { rx: 0.55, ry: 0.42, radius: 11, isHub: true },
    // Inner Ring
    { rx: 0.38, ry: 0.32, radius: 6 },
    { rx: 0.55, ry: 0.22, radius: 6 },
    { rx: 0.72, ry: 0.32, radius: 6 },
    { rx: 0.72, ry: 0.52, radius: 6, isBalanced: true },
    { rx: 0.55, ry: 0.62, radius: 6 },
    { rx: 0.38, ry: 0.52, radius: 6 },
    // Outer Ring
    { rx: 0.22, ry: 0.20, radius: 4.5 },
    { rx: 0.55, ry: 0.08, radius: 5 },
    { rx: 0.88, ry: 0.20, radius: 4.5 },
    { rx: 0.90, ry: 0.42, radius: 5 },
    { rx: 0.88, ry: 0.65, radius: 4.5 },
    { rx: 0.72, ry: 0.78, radius: 5.5, isHub: true },
    { rx: 0.88, ry: 0.85, radius: 4.5 },
    { rx: 0.22, ry: 0.65, radius: 4.5 },
    { rx: 0.20, ry: 0.42, radius: 4.5 },
  ],
  edges: [
    // Radial spokes to center
    [0, 1], [0, 2], [0, 3], [0, 4], [0, 5], [0, 6],
    // Inner ring connections
    [1, 2], [2, 3], [3, 4], [4, 5], [5, 6], [6, 1],
    // Outer spokes
    [1, 7], [2, 8], [3, 9], [3, 10], [4, 11], [5, 12], [12, 13], [6, 14], [1, 15],
    // Outer perimeter
    [7, 8], [8, 9], [9, 10], [10, 11], [11, 12], [12, 13], [14, 15], [15, 7],
    // Cross verification
    [7, 2, true], [9, 4, true], [11, 5, true],
  ],
};

// Preset 3: Cryptographic Hash-Chain
const PRESET_CHAIN: { nodes: NodeDef[]; edges: [number, number, boolean?][] } = {
  nodes: [
    // Main sequential backbone blocks
    { rx: 0.20, ry: 0.14, radius: 8, isHub: true },
    { rx: 0.50, ry: 0.12, radius: 7 },
    { rx: 0.80, ry: 0.16, radius: 8.5, isHub: true },
    { rx: 0.74, ry: 0.32, radius: 7 },
    { rx: 0.42, ry: 0.34, radius: 8, isHub: true },
    { rx: 0.18, ry: 0.38, radius: 7 },
    { rx: 0.26, ry: 0.54, radius: 8, isHub: true },
    { rx: 0.58, ry: 0.52, radius: 7.5, isBalanced: true },
    { rx: 0.86, ry: 0.54, radius: 8, isHub: true },
    { rx: 0.82, ry: 0.72, radius: 7 },
    { rx: 0.58, ry: 0.76, radius: 8, isHub: true },
    { rx: 0.78, ry: 0.90, radius: 7 },
    // Satellite proof anchors
    { rx: 0.35, ry: 0.08, radius: 4 },
    { rx: 0.92, ry: 0.24, radius: 4.5 },
    { rx: 0.56, ry: 0.26, radius: 4 },
    { rx: 0.08, ry: 0.44, radius: 4.5 },
    { rx: 0.40, ry: 0.62, radius: 4.5 },
    { rx: 0.94, ry: 0.64, radius: 4 },
    { rx: 0.92, ry: 0.82, radius: 4.5 },
  ],
  edges: [
    // Linear hash chain
    [0, 1], [1, 2], [2, 3], [3, 4], [4, 5], [5, 6], [6, 7], [7, 8], [8, 9], [9, 10], [10, 11],
    // Proof anchors
    [0, 12], [1, 12], [2, 13], [3, 14], [4, 14], [5, 15], [6, 16], [7, 16], [8, 17], [9, 18], [10, 18],
    // Cryptographic cross-links (parent to child verification)
    [0, 4, true], [2, 6, true], [4, 8, true], [6, 10, true],
  ],
};

// Preset 4: Constellation Multi-Tier Banking
const PRESET_CONSTELLATION: { nodes: NodeDef[]; edges: [number, number, boolean?][] } = {
  nodes: [
    // Cluster A: Treasury Reserve (Top-Right)
    { rx: 0.70, ry: 0.18, radius: 9, isHub: true },
    { rx: 0.54, ry: 0.12, radius: 5 },
    { rx: 0.85, ry: 0.10, radius: 4.5 },
    { rx: 0.88, ry: 0.24, radius: 5 },
    { rx: 0.68, ry: 0.28, radius: 4.5 },

    // Cluster B: Commercial Clearing (Center)
    { rx: 0.40, ry: 0.44, radius: 9.5, isHub: true },
    { rx: 0.22, ry: 0.36, radius: 5 },
    { rx: 0.24, ry: 0.52, radius: 4.5 },
    { rx: 0.42, ry: 0.60, radius: 5 },
    { rx: 0.58, ry: 0.46, radius: 5.5, isBalanced: true },

    // Cluster C: Operating Settlement (Lower-Right)
    { rx: 0.78, ry: 0.66, radius: 9, isHub: true },
    { rx: 0.64, ry: 0.58, radius: 5 },
    { rx: 0.92, ry: 0.56, radius: 4.5 },
    { rx: 0.90, ry: 0.76, radius: 5 },
    { rx: 0.72, ry: 0.82, radius: 5 },
    { rx: 0.84, ry: 0.90, radius: 4.5 },
  ],
  edges: [
    // Cluster A internal
    [0, 1], [0, 2], [0, 3], [0, 4], [1, 2], [2, 3], [3, 4],
    // Cluster B internal
    [5, 6], [5, 7], [5, 8], [5, 9], [6, 7], [7, 8], [8, 9],
    // Cluster C internal
    [10, 11], [10, 12], [10, 13], [10, 14], [10, 15], [11, 12], [12, 13], [13, 14], [14, 15],
    // Inter-cluster trunk lines (RTGS settlement)
    [0, 5], [0, 9], [5, 10], [9, 10], [4, 11],
    // Cross verification
    [1, 6, true], [9, 11, true], [4, 10, true],
  ],
};

interface InteractiveLedgerNetworkProps {
  isDark?: boolean;
}

export default function InteractiveLedgerNetwork({ isDark = false }: InteractiveLedgerNetworkProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [activePattern, setActivePattern] = useState<PatternType>('mesh');
  const [nodeCount, setNodeCount] = useState(20);

  // Runtime node structure
  interface RuntimeNode {
    id: number;
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

  // Ref storing the active nodes and edges across renders
  const stateRef = useRef<{
    nodes: RuntimeNode[];
    edges: [number, number, boolean?][];
    width: number;
    height: number;
    dpr: number;
    draggedIndex: number | null;
    isDragging: boolean;
    hasDragged: boolean;
    mouseX: number | null;
    mouseY: number | null;
    hoveredIndex: number | null;
  }>({
    nodes: [],
    edges: [],
    width: 0,
    height: 0,
    dpr: 1,
    draggedIndex: null,
    isDragging: false,
    hasDragged: false,
    mouseX: null,
    mouseY: null,
    hoveredIndex: null,
  });

  // Apply a pattern definition to the runtime nodes
  const applyPreset = useCallback(
    (preset: { nodes: NodeDef[]; edges: [number, number, boolean?][] }) => {
      const { width, height } = stateRef.current;
      if (width === 0 || height === 0) return;

      const newNodes: RuntimeNode[] = preset.nodes.map((def, idx) => {
        const bx = def.rx * width;
        const by = def.ry * height;
        const existing = stateRef.current.nodes[idx];

        return {
          id: idx,
          baseX: bx,
          baseY: by,
          x: existing ? existing.x : bx,
          y: existing ? existing.y : by,
          targetX: bx,
          targetY: by,
          radius: def.radius,
          isHub: !!def.isHub,
          isBalanced: !!def.isBalanced,
          highlight: 0,
        };
      });

      stateRef.current.nodes = newNodes;
      stateRef.current.edges = [...preset.edges];
      setNodeCount(newNodes.length);
    },
    []
  );

  // Generate an organic new procedural pattern
  const generateNewPattern = useCallback(() => {
    const { width, height } = stateRef.current;
    if (width === 0 || height === 0) return;

    const count = 18;
    const generatedDefs: NodeDef[] = [];

    // Distribute nodes across canvas avoiding bottom-left headline zone (rx: 0..0.55, ry: 0.75..1.0)
    for (let i = 0; i < count; i++) {
      let rx: number, ry: number;
      let valid = false;
      let attempts = 0;

      while (!valid && attempts < 50) {
        attempts++;
        rx = 0.12 + Math.random() * 0.82;
        ry = 0.10 + Math.random() * 0.82;

        // Keep bottom-left clear
        if (rx < 0.58 && ry > 0.72) continue;

        // Keep away from other nodes
        const tooClose = generatedDefs.some(
          (d) => Math.hypot(d.rx - rx, d.ry - ry) < 0.12
        );
        if (!tooClose) valid = true;
      }

      const isHub = i === 2 || i === 7 || i === 13;
      const isBalanced = i === 11;
      const radius = isHub ? 8.5 : isBalanced ? 7 : 4 + Math.random() * 3;

      generatedDefs.push({ rx: rx!, ry: ry!, radius, isHub, isBalanced });
    }

    // Connect to 2-3 closest nodes
    const generatedEdges: [number, number, boolean?][] = [];
    const edgeSet = new Set<string>();

    for (let i = 0; i < generatedDefs.length; i++) {
      const dists = generatedDefs
        .map((d, j) => ({
          idx: j,
          dist: i === j ? Infinity : Math.hypot(d.rx - generatedDefs[i].rx, d.ry - generatedDefs[i].ry),
        }))
        .sort((a, b) => a.dist - b.dist);

      const connectCount = 2 + Math.floor(Math.random() * 2);
      for (let c = 0; c < Math.min(connectCount, dists.length); c++) {
        const j = dists[c].idx;
        const key = i < j ? `${i}-${j}` : `${j}-${i}`;
        if (!edgeSet.has(key)) {
          edgeSet.add(key);
          const isDashed = Math.random() < 0.12;
          generatedEdges.push([i, j, isDashed]);
        }
      }
    }

    applyPreset({ nodes: generatedDefs, edges: generatedEdges });
  }, [applyPreset]);

  // Main canvas animation and interaction loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const prefersReducedMotion = window.matchMedia(
      '(prefers-reduced-motion: reduce)'
    ).matches;

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
        applyPreset(PRESET_MESH);
      } else {
        // Rescale existing nodes to fit new dimensions
        stateRef.current.nodes.forEach((node) => {
          node.x = (node.x / (stateRef.current.width || 1)) * w;
          node.y = (node.y / (stateRef.current.height || 1)) * h;
          node.targetX = (node.targetX / (stateRef.current.width || 1)) * w;
          node.targetY = (node.targetY / (stateRef.current.height || 1)) * h;
          node.baseX = node.targetX;
          node.baseY = node.targetY;
        });
      }
      draw();
    };

    const INFLUENCE_RADIUS = 160;
    const MAX_DISPLACEMENT = 14;

    const updatePhysics = () => {
      const { nodes, mouseX, mouseY, isDragging, draggedIndex } = stateRef.current;
      let isSettled = true;

      for (let i = 0; i < nodes.length; i++) {
        const node = nodes[i];

        if (isDragging && draggedIndex === i) {
          // Dragged node follows cursor directly
          node.x = mouseX!;
          node.y = mouseY!;
          node.targetX = mouseX!;
          node.targetY = mouseY!;
          node.baseX = mouseX!;
          node.baseY = mouseY!;
          node.highlight = 1;
          isSettled = false;
          continue;
        }

        let targetX = node.baseX;
        let targetY = node.baseY;
        let targetHighlight = 0;

        if (!prefersReducedMotion && mouseX !== null && mouseY !== null && !isDragging) {
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

        // Fluid linear damping interpolation
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
      const { width, height, nodes, edges, hoveredIndex, draggedIndex } = stateRef.current;
      ctx.clearRect(0, 0, width, height);

      // Color palette based on isDark prop
      const baseLineColor = isDark
        ? 'rgba(56, 189, 248, 0.32)' // Cyan in dark mode
        : 'rgba(30, 58, 138, 0.35)'; // Deep Navy in light mode
      const highlightLineColor = isDark
        ? 'rgba(56, 189, 248, 0.90)'
        : 'rgba(30, 58, 138, 0.85)';
      const nodeFill = isDark ? '#38BDF8' : '#1E3A8A';
      const nodeBorder = isDark ? '#E0F2FE' : '#FFFFFF';
      const hubCore = isDark ? '#0F172A' : '#1E3A8A';
      const haloColor = isDark
        ? 'rgba(56, 189, 248, 0.28)'
        : 'rgba(30, 58, 138, 0.22)';
      const greenAnchor = isDark ? '#22C55E' : '#146B46';

      // 1. Draw connection lines
      for (let i = 0; i < edges.length; i++) {
        const [aIdx, bIdx, isDashed] = edges[i];
        const a = nodes[aIdx];
        const b = nodes[bIdx];
        if (!a || !b) continue;

        const isHoveredEdge =
          hoveredIndex === aIdx ||
          hoveredIndex === bIdx ||
          draggedIndex === aIdx ||
          draggedIndex === bIdx;

        const maxHighlight = Math.max(a.highlight, b.highlight);
        const alpha = isHoveredEdge
          ? 0.85
          : isDark
          ? 0.30 + maxHighlight * 0.55
          : 0.34 + maxHighlight * 0.50;

        ctx.beginPath();
        ctx.strokeStyle = isHoveredEdge
          ? highlightLineColor
          : isDark
          ? `rgba(56, 189, 248, ${alpha.toFixed(3)})`
          : `rgba(30, 58, 138, ${alpha.toFixed(3)})`;
        ctx.lineWidth = isDashed ? 1 : isHoveredEdge ? 2 : 1.35 + maxHighlight * 0.6;

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
        const isHovered = hoveredIndex === i || draggedIndex === i;

        // Outer concentric halo for hubs or active nodes
        if (isHub || isHovered || highlight > 0.05) {
          const haloRadius = isHub
            ? radius + 6 + (isHovered ? 4 : highlight * 4)
            : radius + (isHovered ? 6 : highlight * 5);

          ctx.beginPath();
          ctx.arc(x, y, haloRadius, 0, Math.PI * 2);
          ctx.strokeStyle = isBalanced
            ? isDark
              ? 'rgba(34, 197, 94, 0.45)'
              : 'rgba(20, 107, 70, 0.35)'
            : haloColor;
          ctx.lineWidth = isHovered ? 1.5 : 1;
          ctx.stroke();
        }

        // Main node circle
        ctx.beginPath();
        ctx.arc(x, y, radius + (isHovered ? 2.5 : highlight * 1.5), 0, Math.PI * 2);

        if (isBalanced) {
          // Green proof anchor
          ctx.fillStyle = greenAnchor;
          ctx.fill();
          ctx.strokeStyle = '#ffffff';
          ctx.lineWidth = 2;
          ctx.stroke();
        } else if (isHub) {
          // Key Ledger Hub: outer ring with inner core
          ctx.fillStyle = isDark ? '#1E293B' : '#FFFFFF';
          ctx.fill();
          ctx.strokeStyle = isHovered
            ? isDark
              ? '#38BDF8'
              : '#1E3A8A'
            : isDark
            ? 'rgba(56, 189, 248, 0.90)'
            : 'rgba(30, 58, 138, 0.88)';
          ctx.lineWidth = 2.5;
          ctx.stroke();

          // Inner solid core
          ctx.beginPath();
          ctx.arc(x, y, radius * 0.45, 0, Math.PI * 2);
          ctx.fillStyle = isHovered ? (isDark ? '#38BDF8' : '#1E3A8A') : hubCore;
          ctx.fill();
        } else {
          // Standard satellite node: solid dot with crisp border
          ctx.fillStyle = isHovered ? (isDark ? '#FFFFFF' : '#0F172A') : nodeFill;
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

      if (!isSettled || stateRef.current.isDragging || stateRef.current.mouseX !== null) {
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

    // Find node near cursor
    const findNodeIndexAt = (px: number, py: number): number | null => {
      const { nodes } = stateRef.current;
      for (let i = nodes.length - 1; i >= 0; i--) {
        const d = Math.hypot(nodes[i].x - px, nodes[i].y - py);
        if (d <= nodes[i].radius + 12) {
          return i;
        }
      }
      return null;
    };

    // Mouse handlers
    const onMouseDown = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      const px = e.clientX - rect.left;
      const py = e.clientY - rect.top;

      const idx = findNodeIndexAt(px, py);
      if (idx !== null) {
        stateRef.current.isDragging = true;
        stateRef.current.draggedIndex = idx;
        stateRef.current.hasDragged = false;
        canvas.style.cursor = 'grabbing';
      } else {
        stateRef.current.isDragging = false;
        stateRef.current.draggedIndex = null;
      }
      wakeLoop();
    };

    const onMouseMove = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      const px = e.clientX - rect.left;
      const py = e.clientY - rect.top;

      stateRef.current.mouseX = px;
      stateRef.current.mouseY = py;

      if (stateRef.current.isDragging) {
        stateRef.current.hasDragged = true;
        canvas.style.cursor = 'grabbing';
      } else {
        const hovered = findNodeIndexAt(px, py);
        stateRef.current.hoveredIndex = hovered;
        canvas.style.cursor = hovered !== null ? 'grab' : 'crosshair';
      }
      wakeLoop();
    };

    const onMouseUp = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      const px = e.clientX - rect.left;
      const py = e.clientY - rect.top;

      // Clicked on empty canvas without dragging: spawn a new point!
      if (!stateRef.current.hasDragged && stateRef.current.draggedIndex === null) {
        // Prevent adding inside the headline protection zone (bottom-left)
        const rx = px / stateRef.current.width;
        const ry = py / stateRef.current.height;

        if (!(rx < 0.58 && ry > 0.72)) {
          const { nodes, edges } = stateRef.current;
          const newId = nodes.length;

          const newNode: RuntimeNode = {
            id: newId,
            baseX: px,
            baseY: py,
            x: px,
            y: py,
            targetX: px,
            targetY: py,
            radius: 5.5,
            isHub: false,
            isBalanced: false,
            highlight: 1,
          };

          nodes.push(newNode);

          // Connect to the 2 closest nodes
          const sorted = nodes
            .slice(0, -1)
            .map((n, idx) => ({ idx, dist: Math.hypot(n.x - px, n.y - py) }))
            .sort((a, b) => a.dist - b.dist);

          if (sorted.length > 0) edges.push([sorted[0].idx, newId]);
          if (sorted.length > 1) edges.push([sorted[1].idx, newId]);

          setNodeCount(nodes.length);
        }
      }

      stateRef.current.isDragging = false;
      stateRef.current.draggedIndex = null;
      stateRef.current.hasDragged = false;
      canvas.style.cursor = findNodeIndexAt(px, py) !== null ? 'grab' : 'crosshair';
      wakeLoop();
    };

    const onMouseLeave = () => {
      stateRef.current.mouseX = null;
      stateRef.current.mouseY = null;
      stateRef.current.hoveredIndex = null;
      stateRef.current.isDragging = false;
      stateRef.current.draggedIndex = null;
      canvas.style.cursor = 'default';
      wakeLoop();
    };

    // Touch handlers
    const onTouchStart = (e: TouchEvent) => {
      if (e.touches.length > 0) {
        const rect = canvas.getBoundingClientRect();
        const px = e.touches[0].clientX - rect.left;
        const py = e.touches[0].clientY - rect.top;

        const idx = findNodeIndexAt(px, py);
        if (idx !== null) {
          stateRef.current.isDragging = true;
          stateRef.current.draggedIndex = idx;
          stateRef.current.hasDragged = false;
        }
        stateRef.current.mouseX = px;
        stateRef.current.mouseY = py;
        wakeLoop();
      }
    };

    const onTouchMove = (e: TouchEvent) => {
      if (e.touches.length > 0) {
        const rect = canvas.getBoundingClientRect();
        const px = e.touches[0].clientX - rect.left;
        const py = e.touches[0].clientY - rect.top;

        stateRef.current.mouseX = px;
        stateRef.current.mouseY = py;
        stateRef.current.hasDragged = true;
        wakeLoop();
      }
    };

    const onTouchEnd = () => {
      stateRef.current.isDragging = false;
      stateRef.current.draggedIndex = null;
      stateRef.current.hasDragged = false;
      stateRef.current.mouseX = null;
      stateRef.current.mouseY = null;
      wakeLoop();
    };

    handleResize();

    const resizeObserver = new ResizeObserver(() => {
      handleResize();
    });
    resizeObserver.observe(canvas);

    canvas.addEventListener('mousedown', onMouseDown);
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
    canvas.addEventListener('mouseleave', onMouseLeave);

    canvas.addEventListener('touchstart', onTouchStart, { passive: true });
    window.addEventListener('touchmove', onTouchMove, { passive: true });
    window.addEventListener('touchend', onTouchEnd, { passive: true });

    return () => {
      resizeObserver.disconnect();
      if (animFrameId !== null) {
        cancelAnimationFrame(animFrameId);
      }
      canvas.removeEventListener('mousedown', onMouseDown);
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
      canvas.removeEventListener('mouseleave', onMouseLeave);

      canvas.removeEventListener('touchstart', onTouchStart);
      window.removeEventListener('touchmove', onTouchMove);
      window.removeEventListener('touchend', onTouchEnd);
    };
  }, [applyPreset, isDark]);

  // Handle Preset selection
  const handleSelectPattern = (pattern: PatternType) => {
    setActivePattern(pattern);
    if (pattern === 'mesh') applyPreset(PRESET_MESH);
    if (pattern === 'hub') applyPreset(PRESET_HUB);
    if (pattern === 'chain') applyPreset(PRESET_CHAIN);
    if (pattern === 'constellation') applyPreset(PRESET_CONSTELLATION);
  };

  return (
    <div className="absolute inset-0 w-full h-full">
      {/* Interactive HTML5 Canvas */}
      <canvas
        ref={canvasRef}
        className="absolute inset-0 w-full h-full pointer-events-auto"
        aria-label="Interactive double-entry ledger network canvas. Drag nodes or click empty space to add accounts."
      />

      {/* Pattern Controls Toolbar (Top-Right of Left Panel) */}
      <div className="absolute top-10 right-8 z-20 flex flex-col items-end space-y-2 pointer-events-auto select-none">
        <div
          className={`flex items-center space-x-1 p-1 rounded-full border text-xs shadow-sm transition ${
            isDark
              ? 'bg-[#131926]/90 border-[#1E293B] text-slate-300'
              : 'bg-white/90 border-[#DDD9D2] text-[#484B52]'
          } backdrop-blur-xs`}
        >
          <button
            type="button"
            onClick={() => handleSelectPattern('mesh')}
            className={`px-2.5 py-1 rounded-full text-xs font-semibold transition flex items-center space-x-1 ${
              activePattern === 'mesh'
                ? isDark
                  ? 'bg-[#38BDF8] text-[#0F172A]'
                  : 'bg-[#1E3A8A] text-white'
                : 'hover:opacity-80'
            }`}
            title="Distributed Mesh topology"
          >
            <Network className="w-3 h-3" />
            <span className="hidden sm:inline">Mesh</span>
          </button>

          <button
            type="button"
            onClick={() => handleSelectPattern('hub')}
            className={`px-2.5 py-1 rounded-full text-xs font-semibold transition flex items-center space-x-1 ${
              activePattern === 'hub'
                ? isDark
                  ? 'bg-[#38BDF8] text-[#0F172A]'
                  : 'bg-[#1E3A8A] text-white'
                : 'hover:opacity-80'
            }`}
            title="Central Reserve Hub topology"
          >
            <Disc className="w-3 h-3" />
            <span className="hidden sm:inline">Hub</span>
          </button>

          <button
            type="button"
            onClick={() => handleSelectPattern('chain')}
            className={`px-2.5 py-1 rounded-full text-xs font-semibold transition flex items-center space-x-1 ${
              activePattern === 'chain'
                ? isDark
                  ? 'bg-[#38BDF8] text-[#0F172A]'
                : 'bg-[#1E3A8A] text-white'
              : 'hover:opacity-80'
            }`}
            title="Cryptographic Hash-Chain topology"
          >
            <GitFork className="w-3 h-3" />
            <span className="hidden sm:inline">Chain</span>
          </button>

          <button
            type="button"
            onClick={() => handleSelectPattern('constellation')}
            className={`px-2.5 py-1 rounded-full text-xs font-semibold transition flex items-center space-x-1 ${
              activePattern === 'constellation'
                ? isDark
                  ? 'bg-[#38BDF8] text-[#0F172A]'
                  : 'bg-[#1E3A8A] text-white'
                : 'hover:opacity-80'
            }`}
            title="Multi-tier Banking Constellation"
          >
            <Sparkles className="w-3 h-3" />
            <span className="hidden sm:inline">Constellation</span>
          </button>

          <div className="w-[1px] h-4 bg-gray-300 dark:bg-gray-700 mx-0.5" />

          {/* New Random Pattern Button */}
          <button
            type="button"
            onClick={() => {
              setActivePattern('mesh');
              generateNewPattern();
            }}
            className={`px-2.5 py-1 rounded-full text-xs font-semibold transition flex items-center space-x-1 ${
              isDark
                ? 'hover:bg-slate-800 text-[#38BDF8]'
                : 'hover:bg-slate-100 text-[#1E3A8A]'
            }`}
            title="Generate procedural new pattern"
          >
            <RefreshCw className="w-3 h-3" />
            <span className="hidden xl:inline">New Pattern</span>
          </button>
        </div>

        {/* Minimal Interactive Instruction Pill */}
        <div
          className={`inline-flex items-center space-x-1.5 px-2.5 py-0.5 rounded text-[11px] font-mono transition ${
            isDark
              ? 'text-slate-400 bg-[#0B0F17]/80 border border-[#1E293B]'
              : 'text-slate-600 bg-white/70 border border-[#DDD9D2]'
          } backdrop-blur-xs`}
        >
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
          <span>Drag nodes · Click to add ({nodeCount} points)</span>
        </div>
      </div>
    </div>
  );
}
