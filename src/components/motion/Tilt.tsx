'use client';

import { useEffect, useRef } from 'react';
import gsap from 'gsap';

type TiltProps = {
  children: React.ReactNode;
  /** max rotation in degrees */
  max?: number;
  className?: string;
};

/**
 * Perspective tilt that follows the mouse — the same 3D treatment as the
 * landing page preview card. Inert on touch devices and reduced motion.
 */
export function Tilt({ children, max = 7, className }: TiltProps) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (window.matchMedia('(pointer: coarse)').matches) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    gsap.set(el, { transformPerspective: 600 });
    const rx = gsap.quickTo(el, 'rotationX', { duration: 0.5, ease: 'power3' });
    const ry = gsap.quickTo(el, 'rotationY', { duration: 0.5, ease: 'power3' });

    const move = (e: MouseEvent) => {
      const r = el.getBoundingClientRect();
      ry(gsap.utils.clamp(-max, max, ((e.clientX - r.left) / r.width - 0.5) * 2 * max));
      rx(gsap.utils.clamp(-max, max, -((e.clientY - r.top) / r.height - 0.5) * 2 * max));
    };
    const leave = () => {
      rx(0);
      ry(0);
    };

    el.addEventListener('mousemove', move);
    el.addEventListener('mouseleave', leave);
    return () => {
      el.removeEventListener('mousemove', move);
      el.removeEventListener('mouseleave', leave);
    };
  }, [max]);

  return (
    <div ref={ref} className={className}>
      {children}
    </div>
  );
}
