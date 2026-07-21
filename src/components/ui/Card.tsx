'use client';

import { motion, type HTMLMotionProps } from 'framer-motion';
import styles from './Card.module.css';

interface CardProps extends Omit<HTMLMotionProps<'div'>, 'ref' | 'children'> {
  /** Adds whileHover lift + shadow. Default true. */
  hover?: boolean;
  /** Glassmorphism background. Default true. */
  glass?: boolean;
  children?: React.ReactNode;
}

/** Reusable surface card with optional hover lift, using the glass design tokens. */
export function Card({ hover = true, glass = true, className, children, ...props }: CardProps) {
  return (
    <motion.div
      whileHover={hover ? { y: -2, boxShadow: 'var(--shadow-md)' } : undefined}
      transition={{ type: 'spring', stiffness: 300, damping: 25 }}
      className={`${styles.card} ${glass ? styles.glass : ''} ${className ?? ''}`}
      {...props}
    >
      {children}
    </motion.div>
  );
}
