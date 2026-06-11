'use client';

import { motion } from 'framer-motion';
import styles from './Badge.module.css';

type Tone = 'neutral' | 'success' | 'warning' | 'error' | 'info' | 'accent';

interface BadgeProps {
  tone?: Tone;
  /** Pulse animation — use for in-progress states like 'grading'. */
  pulse?: boolean;
  children: React.ReactNode;
  className?: string;
}

/** Status/score badge. Maps common statuses to tones via `statusTone`. */
export function Badge({ tone = 'neutral', pulse = false, children, className }: BadgeProps) {
  return (
    <span className={`${styles.badge} ${styles[tone]} ${className ?? ''}`}>
      {pulse && (
        <motion.span
          className={styles.dot}
          animate={{ opacity: [1, 0.3, 1], scale: [1, 0.8, 1] }}
          transition={{ duration: 1.4, repeat: Infinity, ease: 'easeInOut' }}
        />
      )}
      {children}
    </span>
  );
}

/** Map an assignment/submission status string to a badge tone. */
export function statusTone(status: string): Tone {
  switch (status) {
    case 'graded':
    case 'published':
      return 'success';
    case 'grading':
      return 'info';
    case 'error':
      return 'error';
    case 'draft':
    case 'pending':
    default:
      return 'neutral';
  }
}
