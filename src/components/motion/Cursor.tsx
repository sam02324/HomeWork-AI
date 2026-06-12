'use client';

import { useEffect, useRef } from 'react';
import gsap from 'gsap';
import { useMediaQuery } from '@/lib/hooks/useMediaQuery';

/**
 * Custom cursor (accent dot + trailing ring), shared by the landing page and
 * dashboard. Renders only for fine pointers without reduced-motion; hides the
 * native cursor via a body class (see globals.css).
 */
export function Cursor() {
  const dotRef = useRef<HTMLDivElement>(null);
  const ringRef = useRef<HTMLDivElement>(null);
  const finePointer = useMediaQuery('(pointer: fine)');
  const reducedMotion = useMediaQuery('(prefers-reduced-motion: reduce)');
  const enabled = finePointer && !reducedMotion;

  useEffect(() => {
    if (!enabled) return;
    document.body.classList.add('cursor-none');
    return () => document.body.classList.remove('cursor-none');
  }, [enabled]);

  useEffect(() => {
    if (!enabled) return;
    const dot = dotRef.current;
    const ring = ringRef.current;
    if (!dot || !ring) return;

    gsap.set([dot, ring], { xPercent: -50, yPercent: -50, autoAlpha: 0 });
    const dotX = gsap.quickTo(dot, 'x', { duration: 0.08, ease: 'power2' });
    const dotY = gsap.quickTo(dot, 'y', { duration: 0.08, ease: 'power2' });
    const ringX = gsap.quickTo(ring, 'x', { duration: 0.45, ease: 'power3' });
    const ringY = gsap.quickTo(ring, 'y', { duration: 0.45, ease: 'power3' });

    let shown = false;
    const move = (e: MouseEvent) => {
      if (!shown) {
        gsap.to([dot, ring], { autoAlpha: 1, duration: 0.3 });
        shown = true;
      }
      dotX(e.clientX);
      dotY(e.clientY);
      ringX(e.clientX);
      ringY(e.clientY);
    };
    const over = (e: MouseEvent) => {
      const interactive = (e.target as HTMLElement).closest('a, button, [data-cursor]');
      gsap.to(ring, { scale: interactive ? 2.4 : 1, opacity: interactive ? 0.45 : 1, duration: 0.35, ease: 'power3' });
    };
    const out = () => {
      gsap.to([dot, ring], { autoAlpha: 0, duration: 0.3 });
      shown = false;
    };

    window.addEventListener('mousemove', move, { passive: true });
    window.addEventListener('mouseover', over, { passive: true });
    document.documentElement.addEventListener('mouseleave', out);
    return () => {
      window.removeEventListener('mousemove', move);
      window.removeEventListener('mouseover', over);
      document.documentElement.removeEventListener('mouseleave', out);
    };
  }, [enabled]);

  if (!enabled) return null;
  return (
    <>
      <div ref={ringRef} className="cursor-ring" aria-hidden="true" />
      <div ref={dotRef} className="cursor-dot" aria-hidden="true" />
    </>
  );
}
