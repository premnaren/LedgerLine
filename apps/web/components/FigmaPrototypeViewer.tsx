'use client';

import React, { useState, useId } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import {
  Layers,
  Play,
  Grid,
  SlidersHorizontal,
  ZoomIn,
  ZoomOut,
  Maximize2,
  ExternalLink,
  ChevronRight,
  Shield,
  ShieldCheck,
  CheckCircle2,
  X,
  Sparkles,
  MousePointer,
  HelpCircle,
  Copy,
  Check,
} from 'lucide-react';

export interface Hotspot {
  label: string;
  top: string;
  left: string;
  width: string;
  height: string;
  target: string;
  tooltip: string;
}

export interface ScreenData {
  id: string;
  title: string;
  category: string;
  url: string;
  img: string;
  badge: string;
  hotspots: Hotspot[];
}

export const PROTO_SCREENS: Record<string, ScreenData> = {
  '01_login_screen': {
    id: '01_login_screen',
    title: '01 · Sign In Card',
    category: '1. Authentication',
    url: 'https://ledgerline.dev/login',
    img: '/screenshots/01_login_screen.png',
    badge: 'Auth · 420px',
    hotspots: [
      {
        label: 'Create Account Tab',
        top: '39.8%',
        left: '50.1%',
        width: '12%',
        height: '3.5%',
        target: '01b_signup_screen',
        tooltip: 'Switch to Self-Service Registration',
      },
      {
        label: 'Sign In CTA Button',
        top: '55.2%',
        left: '38%',
        width: '24%',
        height: '4%',
        target: '02_admin_dashboard',
        tooltip: 'Submit Sign In & Open Admin Dashboard',
      },
      {
        label: 'Demo Holder Preset',
        top: '63.8%',
        left: '46.3%',
        width: '7.4%',
        height: '5%',
        target: '08_holder_dashboard',
        tooltip: '1-Click Quick Demo -> Holder Dashboard',
      },
    ],
  },
  '01b_signup_screen': {
    id: '01b_signup_screen',
    title: '01b · Create Account',
    category: '1. Authentication',
    url: 'https://ledgerline.dev/login?mode=signup',
    img: '/screenshots/01b_signup_screen.png',
    badge: 'Auth · 420px',
    hotspots: [
      {
        label: 'Sign In Tab',
        top: '36.8%',
        left: '38%',
        width: '12%',
        height: '3.5%',
        target: '01_login_screen',
        tooltip: 'Switch back to Sign In Tab',
      },
      {
        label: 'Create Account CTA',
        top: '68%',
        left: '38%',
        width: '24%',
        height: '4%',
        target: '08_holder_dashboard',
        tooltip: 'Register & Land on Holder Dashboard',
      },
    ],
  },
  '02_admin_dashboard': {
    id: '02_admin_dashboard',
    title: '02 · Admin Dashboard',
    category: '2. Dashboards',
    url: 'https://ledgerline.dev/dashboard',
    img: '/screenshots/02_admin_dashboard.png',
    badge: 'Admin · 1440px',
    hotspots: [
      {
        label: 'Audit Ledger Link',
        top: '1.8%',
        left: '26%',
        width: '7.5%',
        height: '3.5%',
        target: '03_audit_ledger',
        tooltip: 'Open Cryptographic Audit Ledger',
      },
      {
        label: 'Stress Lab Link',
        top: '1.8%',
        left: '34.5%',
        width: '7.5%',
        height: '3.5%',
        target: '04_stress_lab',
        tooltip: 'Open Stress Test Workbench',
      },
      {
        label: 'Operating Statement',
        top: '47.5%',
        left: '60%',
        width: '6.5%',
        height: '2.5%',
        target: '05_account_statement',
        tooltip: 'Open Corporate Account Statement & Interactive Polyline',
      },
      {
        label: 'Sign Out',
        top: '1.8%',
        left: '94%',
        width: '4%',
        height: '3.5%',
        target: '01_login_screen',
        tooltip: 'Sign Out & Return to Login',
      },
    ],
  },
  '03_audit_ledger': {
    id: '03_audit_ledger',
    title: '03 · Cryptographic Ledger',
    category: '3. Audit & Security',
    url: 'https://ledgerline.dev/admin/audit',
    img: '/screenshots/03_audit_ledger.png',
    badge: 'Audit · 1440px',
    hotspots: [
      {
        label: 'Dashboard Link',
        top: '1.8%',
        left: '18%',
        width: '7%',
        height: '3.5%',
        target: '02_admin_dashboard',
        tooltip: 'Return to Admin Dashboard',
      },
      {
        label: 'Stress Lab Link',
        top: '1.8%',
        left: '34.5%',
        width: '7.5%',
        height: '3.5%',
        target: '04_stress_lab',
        tooltip: 'Open Stress Test Workbench',
      },
    ],
  },
  '04_stress_lab': {
    id: '04_stress_lab',
    title: '04 · Concurrency Stress Lab',
    category: '3. Audit & Security',
    url: 'https://ledgerline.dev/admin/stress-lab',
    img: '/screenshots/04_stress_lab.png',
    badge: 'Workbench · 1440px',
    hotspots: [
      {
        label: 'Dashboard Link',
        top: '1.8%',
        left: '18%',
        width: '7%',
        height: '3.5%',
        target: '02_admin_dashboard',
        tooltip: 'Return to Admin Dashboard',
      },
      {
        label: 'Audit Link',
        top: '1.8%',
        left: '26%',
        width: '7.5%',
        height: '3.5%',
        target: '03_audit_ledger',
        tooltip: 'Open Audit Ledger',
      },
    ],
  },
  '05_account_statement': {
    id: '05_account_statement',
    title: '05 · Statement & SVG Scrub',
    category: '4. Accounts & Operations',
    url: 'https://ledgerline.dev/accounts/acc_operating_chk_01',
    img: '/screenshots/05_account_statement.png',
    badge: 'Statement · 1440px',
    hotspots: [
      {
        label: 'Back to Dashboard',
        top: '7%',
        left: '11.5%',
        width: '2.5%',
        height: '3.5%',
        target: '02_admin_dashboard',
        tooltip: 'Back to Dashboard',
      },
      {
        label: 'First Transaction Row',
        top: '49%',
        left: '11.5%',
        width: '77%',
        height: '4%',
        target: '06_transaction_drawer',
        tooltip: 'Inspect Transaction & Hash Merkle Diagram',
      },
      {
        label: 'Transfer CTA',
        top: '7.2%',
        left: '81%',
        width: '7.5%',
        height: '3.5%',
        target: '07_transfer_screen',
        tooltip: 'Initiate Double-Entry Transfer',
      },
    ],
  },
  '06_transaction_drawer': {
    id: '06_transaction_drawer',
    title: '06 · Merkle Block Drawer',
    category: '4. Accounts & Operations',
    url: 'https://ledgerline.dev/accounts/acc_operating_chk_01#inspect',
    img: '/screenshots/06_transaction_drawer.png',
    badge: 'Drawer · 500px',
    hotspots: [
      {
        label: 'Close Drawer Backdrop',
        top: '0%',
        left: '0%',
        width: '65%',
        height: '100%',
        target: '05_account_statement',
        tooltip: 'Close Drawer & Return to Statement',
      },
      {
        label: 'Close Button (X)',
        top: '2%',
        left: '96%',
        width: '3%',
        height: '4%',
        target: '05_account_statement',
        tooltip: 'Close Drawer',
      },
    ],
  },
  '07_transfer_screen': {
    id: '07_transfer_screen',
    title: '07 · Transfer Form (Navy CTA)',
    category: '4. Accounts & Operations',
    url: 'https://ledgerline.dev/accounts/acc_operating_chk_01/transfer',
    img: '/screenshots/07_transfer_screen.png',
    badge: 'Form · 1440px',
    hotspots: [
      {
        label: 'Back to Statement',
        top: '7%',
        left: '11.5%',
        width: '2.5%',
        height: '3.5%',
        target: '05_account_statement',
        tooltip: 'Cancel & Return to Statement',
      },
      {
        label: 'Confirm Transfer CTA',
        top: '82%',
        left: '11.5%',
        width: '77%',
        height: '4.5%',
        target: '05_account_statement',
        tooltip: 'Post Entry & View Updated Statement',
      },
    ],
  },
  '08_holder_dashboard': {
    id: '08_holder_dashboard',
    title: '08 · Holder Dashboard',
    category: '2. Dashboards',
    url: 'https://ledgerline.dev/dashboard',
    img: '/screenshots/08_holder_dashboard.png',
    badge: 'Holder · 1440px',
    hotspots: [
      {
        label: 'Statement View',
        top: '55%',
        left: '42%',
        width: '6%',
        height: '2.5%',
        target: '05_account_statement',
        tooltip: 'View Corporate Account Statement',
      },
      {
        label: 'Sign Out',
        top: '1.8%',
        left: '94%',
        width: '4%',
        height: '3.5%',
        target: '01_login_screen',
        tooltip: 'Sign Out & Return to Login',
      },
    ],
  },
};

export default function FigmaPrototypeViewer({
  initialScreen = '01_login_screen',
}: {
  initialScreen?: string;
}) {
  const [activeScreenId, setActiveScreenId] = useState<string>(initialScreen);
  const [viewMode, setViewMode] = useState<'play' | 'grid'>('play');
  const [showHotspots, setShowHotspots] = useState<boolean>(true);
  const [showInspector, setShowInspector] = useState<boolean>(false);
  const [zoomLevel, setZoomLevel] = useState<number>(1.0);
  const [copiedToken, setCopiedToken] = useState<string | null>(null);

  const shouldReduceMotion = useReducedMotion();
  const screen = PROTO_SCREENS[activeScreenId] || PROTO_SCREENS['01_login_screen'];

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedToken(text);
    setTimeout(() => setCopiedToken(null), 1600);
  };

  const handleZoom = (delta: number) => {
    setZoomLevel((prev) => Math.max(0.5, Math.min(1.4, Math.round((prev + delta) * 10) / 10)));
  };

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-[#1E1E1E] text-[#E0E0E0] select-none font-sans">
      {/* 1. TOP FIGMA TOOLBAR */}
      <header className="h-12 bg-[#2C2C2C] border-b border-[#383838] px-4 flex items-center justify-between shrink-0 z-30">
        <div className="flex items-center space-x-3">
          <div className="w-6 h-6 flex items-center justify-center text-white font-bold bg-[#0D99FF] rounded text-xs shadow-sm">
            ❖
          </div>
          <div className="flex items-center space-x-2">
            <span className="font-semibold text-sm text-white tracking-tight">LedgerLine</span>
            <span className="text-xs text-[#8A8A8A]">/</span>
            <span className="text-xs text-[#CCCCCC] font-medium hidden sm:inline">
              Design System & Core Flow Prototype
            </span>
            <span className="bg-[#383838] text-[11px] text-[#A0A0A0] px-1.5 py-0.5 rounded mono">
              v2.4 Redesign
            </span>
          </div>
        </div>

        {/* Center Mode Switcher Tabs */}
        <div className="flex items-center bg-[#1E1E1E] p-1 rounded-lg border border-[#383838]">
          <button
            type="button"
            onClick={() => setViewMode('play')}
            className={`flex items-center space-x-1.5 px-3 py-1 rounded text-xs font-medium transition ${
              viewMode === 'play'
                ? 'bg-[#2C2C2C] text-white shadow-sm'
                : 'text-[#A0A0A0] hover:text-white'
            }`}
          >
            <Play className="w-3.5 h-3.5 text-[#0D99FF]" />
            <span>Prototype (Play)</span>
          </button>
          <button
            type="button"
            onClick={() => setViewMode('grid')}
            className={`flex items-center space-x-1.5 px-3 py-1 rounded text-xs font-medium transition ${
              viewMode === 'grid'
                ? 'bg-[#2C2C2C] text-white shadow-sm'
                : 'text-[#A0A0A0] hover:text-white'
            }`}
          >
            <Grid className="w-3.5 h-3.5" />
            <span>Canvas Grid</span>
          </button>
          <button
            type="button"
            onClick={() => setShowInspector(!showInspector)}
            className={`flex items-center space-x-1.5 px-3 py-1 rounded text-xs font-medium transition ${
              showInspector
                ? 'bg-[#2C2C2C] text-[#0D99FF]'
                : 'text-[#A0A0A0] hover:text-white'
            }`}
          >
            <SlidersHorizontal className="w-3.5 h-3.5" />
            <span>Specs & Tokens</span>
          </button>
        </div>

        {/* Right Controls */}
        <div className="flex items-center space-x-2.5 text-xs">
          {viewMode === 'play' && (
            <div className="flex items-center space-x-1 bg-[#1E1E1E] px-2 py-1 rounded border border-[#383838]">
              <button
                type="button"
                onClick={() => handleZoom(-0.1)}
                className="text-[#A0A0A0] hover:text-white px-1.5 font-bold"
                title="Zoom Out"
              >
                −
              </button>
              <span className="text-xs text-white mono px-1 min-w-[42px] text-center">
                {Math.round(zoomLevel * 100)}%
              </span>
              <button
                type="button"
                onClick={() => handleZoom(0.1)}
                className="text-[#A0A0A0] hover:text-white px-1.5 font-bold"
                title="Zoom In"
              >
                +
              </button>
              <button
                type="button"
                onClick={() => setZoomLevel(1.0)}
                className="text-[11px] text-[#0D99FF] hover:underline pl-1 border-l border-[#383838] ml-1"
              >
                Fit
              </button>
            </div>
          )}

          <button
            type="button"
            onClick={() => setShowHotspots(!showHotspots)}
            className="bg-[#383838] hover:bg-[#444444] text-white px-2.5 py-1 rounded text-xs transition flex items-center space-x-1.5"
            title="Toggle interactive hotspot highlights"
          >
            <span
              className={`w-2 h-2 rounded-full transition-colors ${
                showHotspots ? 'bg-[#0D99FF]' : 'bg-[#666]'
              }`}
            />
            <span>Hotspots: {showHotspots ? 'ON' : 'OFF'}</span>
          </button>

          <a
            href="https://ledgerline-tan-beta.vercel.app"
            target="_blank"
            rel="noopener noreferrer"
            className="bg-[#0D99FF] hover:bg-[#008AE6] text-white px-3 py-1 rounded text-xs font-medium transition flex items-center space-x-1"
          >
            <span>Live App</span>
            <ExternalLink className="w-3 h-3" />
          </a>
        </div>
      </header>

      {/* 2. MAIN WORKSPACE */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* LEFT SIDEBAR: ARTBOARD HIERARCHY */}
        <aside className="w-64 bg-[#252525] border-r border-[#383838] flex flex-col shrink-0 text-xs z-20">
          <div className="p-3 border-b border-[#383838] flex justify-between items-center text-[#8A8A8A] font-medium">
            <span>PAGES & SCREENS</span>
            <span className="text-[11px] bg-[#1E1E1E] px-1.5 py-0.5 rounded mono">
              9 Artboards
            </span>
          </div>

          <div className="flex-1 overflow-y-auto p-2 space-y-4">
            {['1. Authentication', '2. Dashboards', '3. Audit & Security', '4. Accounts & Operations'].map(
              (category) => {
                const screenList = Object.values(PROTO_SCREENS).filter(
                  (s) => s.category === category
                );
                return (
                  <div key={category}>
                    <span className="text-[10px] font-semibold text-[#8A8A8A] uppercase tracking-wider px-2 block mb-1">
                      {category}
                    </span>
                    <div className="space-y-0.5">
                      {screenList.map((s) => {
                        const isActive = s.id === activeScreenId;
                        return (
                          <button
                            key={s.id}
                            type="button"
                            onClick={() => {
                              setActiveScreenId(s.id);
                              if (viewMode === 'grid') setViewMode('play');
                            }}
                            className={`w-full text-left px-2.5 py-1.5 rounded flex items-center justify-between transition ${
                              isActive
                                ? 'bg-[#383838] text-white font-medium shadow-xs'
                                : 'text-[#B0B0B0] hover:bg-[#2C2C2C] hover:text-white'
                            }`}
                          >
                            <span className="truncate">{s.title}</span>
                            <span className="text-[10px] text-[#777] mono">{s.badge}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              }
            )}
          </div>

          {/* Quick Flow Walkthrough Helper */}
          <div className="p-3 bg-[#1E1E1E] border-t border-[#383838]">
            <div className="text-[11px] text-[#8A8A8A] font-semibold mb-1 flex items-center space-x-1.5">
              <MousePointer className="w-3 h-3 text-[#0D99FF]" />
              <span>FIGMA PROTOCOL</span>
            </div>
            <p className="text-[11px] text-[#A0A0A0] leading-relaxed">
              Click glowing blue pulse targets inside the device canvas to walk through active prototype flows.
            </p>
          </div>
        </aside>

        {/* CENTER STAGE CANVAS */}
        <main
          className="flex-1 bg-[#141414] overflow-auto flex items-center justify-center p-6 sm:p-10 relative"
          id="canvas-stage"
        >
          {/* PLAY PROTOTYPE MODE */}
          {viewMode === 'play' && (
            <motion.div
              style={{
                scale: zoomLevel,
                transformOrigin: 'center center',
              }}
              transition={
                shouldReduceMotion
                  ? { duration: 0 }
                  : { type: 'spring', damping: 24, stiffness: 260 }
              }
              className="max-w-[1240px] w-full"
            >
              {/* Device Window Chrome */}
              <div className="bg-[#2C2C2C] rounded-lg shadow-2xl border border-[#383838] overflow-hidden flex flex-col">
                {/* Window Header */}
                <div className="h-9 bg-[#252525] border-b border-[#383838] px-3 flex items-center justify-between shrink-0">
                  <div className="flex items-center space-x-2">
                    <span className="w-3 h-3 rounded-full bg-[#FF5F56] inline-block" />
                    <span className="w-3 h-3 rounded-full bg-[#FFBD2E] inline-block" />
                    <span className="w-3 h-3 rounded-full bg-[#27C93F] inline-block" />
                  </div>

                  {/* Browser Address Bar */}
                  <div className="flex items-center bg-[#1A1A1A] border border-[#333333] px-3 py-1 rounded text-[11px] text-[#999999] space-x-1.5 max-w-md w-full justify-center mono">
                    <span className="text-[#27C93F] text-[10px]">🔒</span>
                    <span className="text-white truncate">{screen.url}</span>
                  </div>

                  <div className="flex items-center space-x-2 text-xs">
                    <span className="bg-[#383838] text-white px-2 py-0.5 rounded text-[10px] uppercase font-bold tracking-wider mono">
                      {screen.badge}
                    </span>
                  </div>
                </div>

                {/* Active Screen Stage */}
                <div className="relative bg-[#FAFAF8] overflow-hidden select-none">
                  <AnimatePresence mode="wait">
                    <motion.div
                      key={screen.id}
                      initial={shouldReduceMotion ? { opacity: 1 } : { opacity: 0, scale: 0.995 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, scale: 1.005 }}
                      transition={{ duration: 0.18, ease: 'easeOut' }}
                      className="relative w-full"
                    >
                      <img
                        src={screen.img}
                        alt={screen.title}
                        className="w-full h-auto block select-none pointer-events-none"
                      />

                      {/* Hotspots Overlay */}
                      {showHotspots && (
                        <div className="absolute inset-0 pointer-events-auto">
                          {screen.hotspots.map((spot, idx) => (
                            <motion.button
                              key={idx}
                              type="button"
                              onClick={() => setActiveScreenId(spot.target)}
                              whileTap={shouldReduceMotion ? {} : { scale: 0.97 }}
                              className="absolute cursor-pointer border border-[#0D99FF]/80 bg-[#0D99FF]/20 hover:bg-[#0D99FF]/40 rounded transition-all flex items-center justify-center group focus:outline-none"
                              style={{
                                top: spot.top,
                                left: spot.left,
                                width: spot.width,
                                height: spot.height,
                              }}
                              title={spot.tooltip}
                            >
                              {/* Hover Tooltip Pill */}
                              <div className="hidden group-hover:flex absolute -top-8 px-2 py-1 bg-[#1E1E1E] text-white text-[11px] rounded shadow-lg border border-[#383838] whitespace-nowrap z-30 mono items-center space-x-1">
                                <span className="text-[#0D99FF]">↳</span>
                                <span>{spot.label}</span>
                              </div>

                              {/* Pulsing Dot */}
                              <motion.span
                                animate={
                                  shouldReduceMotion
                                    ? {}
                                    : {
                                        scale: [0.9, 1.25, 0.9],
                                        opacity: [0.8, 0.35, 0.8],
                                      }
                                }
                                transition={{
                                  repeat: Infinity,
                                  duration: 2.2,
                                  ease: 'easeInOut',
                                }}
                                className="w-2.5 h-2.5 rounded-full bg-[#0D99FF] shadow-sm pointer-events-none"
                              />
                            </motion.button>
                          ))}
                        </div>
                      )}
                    </motion.div>
                  </AnimatePresence>
                </div>
              </div>
            </motion.div>
          )}

          {/* GRID OVERVIEW CANVAS MODE */}
          {viewMode === 'grid' && (
            <div className="w-full max-w-7xl mx-auto py-6">
              <div className="mb-6 flex justify-between items-center border-b border-[#333] pb-3">
                <div>
                  <h2 className="text-lg font-bold text-white">Full Canvas Artboards</h2>
                  <p className="text-xs text-[#8A8A8A]">
                    All 9 production responsive views rendered at 1440x960 2x Retina
                  </p>
                </div>
                <span className="bg-[#2C2C2C] border border-[#383838] text-xs px-3 py-1 rounded text-[#CCC]">
                  Click any screen to open in Prototype Play mode
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {Object.values(PROTO_SCREENS).map((item) => (
                  <motion.div
                    key={item.id}
                    whileHover={shouldReduceMotion ? {} : { y: -4 }}
                    transition={{ duration: 0.15 }}
                    onClick={() => {
                      setActiveScreenId(item.id);
                      setViewMode('play');
                    }}
                    className="bg-[#252525] border border-[#383838] hover:border-[#0D99FF] rounded-lg overflow-hidden transition cursor-pointer group flex flex-col"
                  >
                    <div className="p-2.5 bg-[#2C2C2C] border-b border-[#383838] flex items-center justify-between text-xs">
                      <span className="font-semibold text-white truncate">{item.title}</span>
                      <span className="text-[10px] mono text-[#888]">{item.badge}</span>
                    </div>
                    <div className="relative bg-[#FAFAF8] overflow-hidden aspect-[16/10]">
                      <img
                        src={item.img}
                        alt={item.title}
                        className="w-full h-full object-cover object-top group-hover:scale-[1.02] transition duration-200"
                      />
                      <div className="absolute inset-0 bg-[#0D99FF]/0 group-hover:bg-[#0D99FF]/10 transition flex items-center justify-center">
                        <span className="hidden group-hover:inline-block bg-[#1E1E1E]/95 text-white text-xs px-3 py-1.5 rounded-full border border-white/20 shadow-md">
                          Open in Play Mode ▶
                        </span>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>
          )}
        </main>

        {/* RIGHT SIDEBAR: FIGMA SPECS & DESIGN SYSTEM INSPECTOR */}
        <AnimatePresence>
          {showInspector && (
            <motion.aside
              initial={shouldReduceMotion ? { opacity: 0 } : { x: '100%', opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={shouldReduceMotion ? { opacity: 0 } : { x: '100%', opacity: 0 }}
              transition={{ type: 'spring', damping: 28, stiffness: 300 }}
              className="w-80 bg-[#252525] border-l border-[#383838] flex flex-col shrink-0 text-xs z-20 overflow-y-auto"
            >
              <div className="p-3 border-b border-[#383838] flex justify-between items-center">
                <span className="font-semibold text-white flex items-center space-x-1.5">
                  <SlidersHorizontal className="w-3.5 h-3.5 text-[#0D99FF]" />
                  <span>DESIGN SYSTEM INSPECTOR</span>
                </span>
                <button
                  type="button"
                  onClick={() => setShowInspector(false)}
                  className="text-[#777] hover:text-white p-1"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="p-3 space-y-6">
                {/* 1. Design Tokens */}
                <div>
                  <span className="text-[10px] font-semibold text-[#8A8A8A] uppercase tracking-wider block mb-2">
                    Design Tokens (:root)
                  </span>
                  <div className="space-y-1.5 font-mono text-[11px]">
                    {[
                      { name: '--ink', val: '#14181F', desc: 'Text & Icons' },
                      { name: '--ink-muted', val: '#6B6D72', desc: 'Secondary Labels' },
                      { name: '--paper', val: '#FAFAF8', desc: 'Background Canvas' },
                      { name: '--rule', val: '#E2E0DB', desc: '1px Flat Borders' },
                      { name: '--accent', val: '#2C4A7C', desc: 'Primary CTA Navy' },
                      { name: '--ledger-green', val: '#1A6B4F', desc: 'Credits & Invariant' },
                      { name: '--ledger-red', val: '#A23B2E', desc: 'Debits & Refusals' },
                    ].map((tok) => (
                      <div
                        key={tok.name}
                        onClick={() => handleCopy(tok.val)}
                        className="flex items-center justify-between p-1.5 bg-[#1E1E1E] rounded border border-[#333] hover:border-[#0D99FF] cursor-pointer transition"
                        title="Click to copy hex code"
                      >
                        <div className="flex items-center space-x-2">
                          <span
                            className="w-3.5 h-3.5 rounded border border-white/20 shrink-0"
                            style={{ background: tok.val }}
                          />
                          <span className="text-white font-medium">{tok.name}</span>
                        </div>
                        <div className="flex items-center space-x-1.5 text-[#888]">
                          <span>{tok.val}</span>
                          {copiedToken === tok.val ? (
                            <Check className="w-3 h-3 text-[#27C93F]" />
                          ) : (
                            <Copy className="w-3 h-3 opacity-0 group-hover:opacity-100" />
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* 2. Role Badges Specs */}
                <div>
                  <span className="text-[10px] font-semibold text-[#8A8A8A] uppercase tracking-wider block mb-2">
                    Role Indicators (6px Dot)
                  </span>
                  <div className="p-2.5 bg-[#1E1E1E] rounded border border-[#333] space-y-2">
                    {[
                      { role: 'ADMIN', color: '#6B47A8', note: 'Superuser' },
                      { role: 'HOLDER', color: '#2C4A7C', note: 'Account Owner' },
                      { role: 'AUDITOR', color: '#B8863B', note: 'Read-only' },
                    ].map((r) => (
                      <div key={r.role} className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <span
                            className="w-1.5 h-1.5 rounded-full"
                            style={{ background: r.color }}
                          />
                          <span className="text-white font-medium">{r.role}</span>
                        </div>
                        <span className="text-[#888] mono text-[11px]">{r.color}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* 3. Typography Specs */}
                <div>
                  <span className="text-[10px] font-semibold text-[#8A8A8A] uppercase tracking-wider block mb-2">
                    Typography & Rules
                  </span>
                  <div className="p-2.5 bg-[#1E1E1E] rounded border border-[#333] space-y-2 text-[#CCC] leading-relaxed">
                    <div>
                      <span className="text-white font-medium block">Inter (400, 500, 600, 700)</span>
                      <span className="text-[11px] text-[#888]">
                        All UI text, headings, buttons, and navigation.
                      </span>
                    </div>
                    <div>
                      <span className="text-white font-medium block mono">
                        JetBrains Mono (Tabular)
                      </span>
                      <span className="text-[11px] text-[#888]">
                        All monetary balances, hash seals, account IDs.
                      </span>
                    </div>
                    <div className="pt-2 border-t border-[#333] text-[11px] text-[#A0A0A0]">
                      <span className="text-white font-medium block mb-1">Strict Rules:</span>
                      <ul className="list-disc list-inside space-y-0.5 text-[10px]">
                        <li>Zero drop shadows (shadow-none)</li>
                        <li>Max 4px radius (rounded)</li>
                        <li>Flat 1px boundary (border border-rule)</li>
                        <li>No text transforms (sentence case only)</li>
                      </ul>
                    </div>
                  </div>
                </div>

                {/* 4. Review Checklist */}
                <div>
                  <span className="text-[10px] font-semibold text-[#8A8A8A] uppercase tracking-wider block mb-2">
                    Review Status
                  </span>
                  <div className="p-2.5 bg-[#1E1E1E] rounded border border-[#333] space-y-1.5 text-[11px]">
                    {[
                      'Session Persistence on Refresh',
                      'Self-Service User Sign Up',
                      'Compact Centered Login Card',
                      'Solid Navy CTA on Transfer Form',
                      'SVG Balance Polyline Scrubbing',
                      'Cryptographic Hash Merkle Diagram',
                    ].map((item) => (
                      <div key={item} className="flex items-center text-[#27C93F] space-x-1.5">
                        <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                        <span>{item}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </motion.aside>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
