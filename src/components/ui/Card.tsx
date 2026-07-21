'use client';

import { motion, useReducedMotion, type HTMLMotionProps } from 'framer-motion';
import styles from './Card.module.css';

interface CardProps extends Omit<HTMLMotionProps<'div'>, 'ref' | 'children'> {
  /** Adds whileHover lift + shadow. Default true. */
  hover?: boolean;
  /** Glassmorphism background. Default true. */
  glass?: boolean;
  children?: React.ReactNode;
}

/** Reusable surface card with optional hover lift, using the glass design tokens. */
export function Card({ hover = true, glass = true, className, children, style, ...props }: CardProps) {
  const reduceMotion = useReducedMotion();

  return (
    <motion.div
      whileHover={hover && !reduceMotion ? { y: -5, rotateX: 1.2, rotateY: -1.2, boxShadow: 'var(--surface-shadow-hover)' } : undefined}
      whileTap={hover && !reduceMotion ? { scale: 0.992 } : undefined}
      transition={{ type: 'spring', stiffness: 320, damping: 24 }}
      className={`${styles.card} ${glass ? styles.glass : ''} ${className ?? ''}`}
      {...props}
      style={{ transformPerspective: 900, ...style }}
    >
      {children}
    </motion.div>
  );
}
