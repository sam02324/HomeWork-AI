'use client';

import { useRef } from 'react';
import gsap from 'gsap';
import { useGSAP } from '@gsap/react';

gsap.registerPlugin(useGSAP);

type RevealProps = {
  children: React.ReactNode;
  /** seconds between each [data-reveal] child */
  stagger?: number;
  delay?: number;
  className?: string;
};

/**
 * Staggered entrance for dashboard content. Animates every [data-reveal]
 * descendant present at mount; respects prefers-reduced-motion. Elements
 * rendered later (async data) should use the CSS .stagger-children utility
 * from globals.css instead.
 */
export function Reveal({ children, stagger = 0.07, delay = 0, className }: RevealProps) {
  const ref = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      const targets = ref.current?.querySelectorAll('[data-reveal]');
      if (!targets || targets.length === 0) return;
      const mm = gsap.matchMedia();
      mm.add('(prefers-reduced-motion: no-preference)', () => {
        gsap.from(targets, {
          y: 22,
          autoAlpha: 0,
          duration: 0.7,
          delay,
          stagger,
          ease: 'power3.out',
          clearProps: 'all',
        });
      });
    },
    { scope: ref }
  );

  return (
    <div ref={ref} className={className}>
      {children}
    </div>
  );
}

/** GSAP count-up for a numeric stat; falls back to static text. */
export function CountUp({ value, suffix = '' }: { value: number; suffix?: string }) {
  const ref = useRef<HTMLSpanElement>(null);

  useGSAP(() => {
    const el = ref.current;
    if (!el) return;
    const mm = gsap.matchMedia();
    mm.add('(prefers-reduced-motion: no-preference)', () => {
      const obj = { n: 0 };
      gsap.to(obj, {
        n: value,
        duration: 1.2,
        ease: 'power2.out',
        onUpdate: () => {
          el.textContent = Math.round(obj.n).toLocaleString('en-IN') + suffix;
        },
      });
    });
  }, [value]);

  return <span ref={ref}>{value.toLocaleString('en-IN')}{suffix}</span>;
}
