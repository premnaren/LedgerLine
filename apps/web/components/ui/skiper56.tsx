'use client';

import React, {
  useCallback,
  useEffect,
  useRef,
  useState,
  useImperativeHandle,
  forwardRef,
} from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Mail } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface Skiper56InputHandle {
  typeText: (targetText: string, onComplete?: () => void) => void;
  triggerVanish: (onComplete?: () => void) => void;
  focus: () => void;
}

interface Skiper56InputProps {
  id?: string;
  name?: string;
  value: string;
  onChange: (value: string) => void;
  onSubmit?: () => void;
  placeholders?: string[];
  disabled?: boolean;
  required?: boolean;
  className?: string;
  autoComplete?: string;
}

interface Particle {
  x: number;
  y: number;
  r: number;
  vx: number;
  vy: number;
  color: string;
  alpha: number;
}

export const Skiper56Input = forwardRef<Skiper56InputHandle, Skiper56InputProps>(
  (
    {
      id = 'email',
      name = 'email',
      value,
      onChange,
      onSubmit,
      placeholders = [
        'admin@ledgerline.dev',
        'holder@ledgerline.dev',
        'auditor@ledgerline.dev',
      ],
      disabled = false,
      required = false,
      className,
      autoComplete = 'email',
    },
    ref
  ) => {
    const inputRef = useRef<HTMLInputElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [isFocused, setIsFocused] = useState(false);
    const [animatingVanish, setAnimatingVanish] = useState(false);
    const particlesRef = useRef<Particle[]>([]);
    const animationFrameRef = useRef<number | null>(null);

    // --- Typewriter & Backspacing Animation for Placeholder ---
    const [displayedPlaceholder, setDisplayedPlaceholder] = useState('');
    const [placeholderIndex, setPlaceholderIndex] = useState(0);
    const [isDeleting, setIsDeleting] = useState(false);
    const [isPaused, setIsPaused] = useState(false);

    useEffect(() => {
      // If user typed a value or input is focused, pause the typewriter loop
      if (value || isFocused) {
        return;
      }

      const currentWord = placeholders[placeholderIndex % placeholders.length];
      const typingSpeed = isDeleting ? 38 : 65; // typing is natural, backspacing is fast
      const pauseDuration = 2000; // pause at full word

      if (isPaused) {
        const pauseTimeout = setTimeout(() => {
          setIsPaused(false);
          setIsDeleting(true);
        }, pauseDuration);
        return () => clearTimeout(pauseTimeout);
      }

      const timeout = setTimeout(() => {
        if (!isDeleting) {
          // Typing forward
          const nextText = currentWord.substring(0, displayedPlaceholder.length + 1);
          setDisplayedPlaceholder(nextText);

          if (nextText === currentWord) {
            setIsPaused(true);
          }
        } else {
          // Backspacing backward
          const nextText = currentWord.substring(0, displayedPlaceholder.length - 1);
          setDisplayedPlaceholder(nextText);

          if (nextText === '') {
            setIsDeleting(false);
            setPlaceholderIndex((prev) => (prev + 1) % placeholders.length);
          }
        }
      }, typingSpeed);

      return () => clearTimeout(timeout);
    }, [
      value,
      isFocused,
      displayedPlaceholder,
      isDeleting,
      isPaused,
      placeholderIndex,
      placeholders,
    ]);

    // --- Programmatic Typewriter for Quick-Login Buttons ---
    const isProgrammaticTypingRef = useRef(false);

    const typeText = useCallback(
      (targetText: string, onComplete?: () => void) => {
        isProgrammaticTypingRef.current = true;
        let currentText = inputRef.current?.value || '';

        // Step 1: If existing text is different prefix, backspace it out first
        const stepBackspace = () => {
          if (currentText.length > 0 && !targetText.startsWith(currentText)) {
            currentText = currentText.slice(0, -1);
            onChange(currentText);
            setTimeout(stepBackspace, 12);
          } else {
            stepType();
          }
        };

        // Step 2: Type forward into target text
        const stepType = () => {
          if (currentText.length < targetText.length) {
            currentText = targetText.slice(0, currentText.length + 1);
            onChange(currentText);
            setTimeout(stepType, 12);
          } else {
            isProgrammaticTypingRef.current = false;
            if (onComplete) onComplete();
          }
        };

        stepBackspace();
      },
      [onChange]
    );

    // --- Canvas Particle Vanish / Disintegration Animation (Skiper56 / Aceternity) ---
    const drawAndSample = useCallback(
      (textToVanish: string) => {
        const canvas = canvasRef.current;
        const input = inputRef.current;
        if (!canvas || !input) return;

        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const rect = input.getBoundingClientRect();
        const dpr = window.devicePixelRatio || 1;
        canvas.width = rect.width * dpr;
        canvas.height = rect.height * dpr;
        ctx.scale(dpr, dpr);

        ctx.clearRect(0, 0, rect.width, rect.height);
        const computed = window.getComputedStyle(input);
        const fontSize = parseFloat(computed.fontSize) || 14;
        const fontFamily = computed.fontFamily || 'sans-serif';
        ctx.font = `500 ${fontSize}px ${fontFamily}`;
        ctx.fillStyle = computed.color || '#0f172a';
        ctx.textBaseline = 'middle';

        // Match input padding-left (accounting for the mail icon: ~40px)
        const textX = 40;
        const textY = rect.height / 2;
        ctx.fillText(textToVanish, textX, textY);

        const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const data = imgData.data;
        const sampledParticles: Particle[] = [];
        const step = 2 * dpr; // sample every 2 physical pixels for optimal performance

        for (let y = 0; y < canvas.height; y += step) {
          for (let x = 0; x < canvas.width; x += step) {
            const index = (y * canvas.width + x) * 4;
            const alpha = data[index + 3];
            if (alpha > 40) {
              const r = data[index];
              const g = data[index + 1];
              const b = data[index + 2];
              sampledParticles.push({
                x: x / dpr,
                y: y / dpr,
                r: Math.random() * 1.5 + 0.6,
                vx: (Math.random() - 0.3) * 3.5, // drift rightward/dispersed
                vy: (Math.random() - 0.7) * 2.8, // drift slightly upward
                color: `rgb(${r}, ${g}, ${b})`,
                alpha: 1,
              });
            }
          }
        }

        particlesRef.current = sampledParticles;
        ctx.clearRect(0, 0, rect.width, rect.height);
      },
      []
    );

    const triggerVanish = useCallback(
      (onComplete?: () => void) => {
        if (!value || animatingVanish) return;
        setAnimatingVanish(true);
        drawAndSample(value);

        const canvas = canvasRef.current;
        const input = inputRef.current;
        if (!canvas || !input) {
          setAnimatingVanish(false);
          if (onComplete) onComplete();
          return;
        }

        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        const rect = input.getBoundingClientRect();

        let startTime: number | null = null;
        const duration = 650; // duration in ms

        const animateLoop = (timestamp: number) => {
          if (!startTime) startTime = timestamp;
          const progress = (timestamp - startTime) / duration;

          ctx.clearRect(0, 0, rect.width, rect.height);

          let aliveCount = 0;
          for (let i = 0; i < particlesRef.current.length; i++) {
            const p = particlesRef.current[i];
            p.x += p.vx;
            p.y += p.vy;
            p.alpha = Math.max(0, 1 - progress * 1.3);
            p.r = Math.max(0.2, p.r * 0.98);

            if (p.alpha > 0.05) {
              aliveCount++;
              ctx.save();
              ctx.globalAlpha = p.alpha;
              ctx.fillStyle = p.color;
              ctx.beginPath();
              ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
              ctx.fill();
              ctx.restore();
            }
          }

          if (progress < 1 && aliveCount > 0) {
            animationFrameRef.current = requestAnimationFrame(animateLoop);
          } else {
            ctx.clearRect(0, 0, rect.width, rect.height);
            particlesRef.current = [];
            setAnimatingVanish(false);
            if (onComplete) onComplete();
          }
        };

        animationFrameRef.current = requestAnimationFrame(animateLoop);
      },
      [value, animatingVanish, drawAndSample]
    );

    useEffect(() => {
      return () => {
        if (animationFrameRef.current) {
          cancelAnimationFrame(animationFrameRef.current);
        }
      };
    }, []);

    useImperativeHandle(ref, () => ({
      typeText,
      triggerVanish,
      focus: () => inputRef.current?.focus(),
    }));

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Enter') {
        if (onSubmit) {
          e.preventDefault();
          onSubmit();
        }
      }
    };

    return (
      <div className={cn('relative rounded-xl shadow-2xs group', className)}>
        {/* Left Mail Icon */}
        <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500 z-20">
          <Mail className="h-4 w-4 transition-colors group-focus-within:text-sky-600" />
        </div>

        {/* Real Interactive Input */}
        <input
          ref={inputRef}
          id={id}
          name={name}
          type="email"
          required={required}
          autoComplete={autoComplete}
          disabled={disabled || animatingVanish}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          onKeyDown={handleKeyDown}
          className={cn(
            'h-11 w-full pl-10 pr-3.5 rounded-xl border border-slate-300 bg-white text-sm text-slate-900',
            'placeholder:text-transparent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 focus-visible:border-sky-500 transition',
            animatingVanish && 'text-transparent selection:bg-transparent'
          )}
          placeholder={displayedPlaceholder || 'admin@ledgerline.dev'}
        />

        {/* Animated Typewriter Placeholder with Backspacing effect when input is empty */}
        {!value && (
          <div
            className="absolute inset-y-0 left-10 right-3 flex items-center pointer-events-none select-none overflow-hidden z-10"
            aria-hidden="true"
          >
            <span className="text-sm text-slate-400 font-normal">
              {displayedPlaceholder}
            </span>
            {/* Blinking Typewriter Cursor */}
            <span
              className={cn(
                'inline-block w-0.5 h-4 ml-0.5 bg-sky-500 transition-opacity',
                isFocused ? 'opacity-0' : 'animate-pulse'
              )}
            />
          </div>
        )}

        {/* Canvas overlay for particle vanish disintegration (Skiper56 effect) */}
        <canvas
          ref={canvasRef}
          className={cn(
            'absolute inset-0 pointer-events-none z-30 transition-opacity duration-150',
            animatingVanish ? 'opacity-100' : 'opacity-0'
          )}
        />
      </div>
    );
  }
);

Skiper56Input.displayName = 'Skiper56Input';
