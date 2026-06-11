'use client';

import styles from './Skeleton.module.css';

interface SkeletonProps {
  width?: string | number;
  height?: string | number;
  radius?: string;
  className?: string;
}

/** Shimmer skeleton block. Compose multiples for card/list loading states. */
export function Skeleton({ width = '100%', height = 16, radius = 'var(--radius-sm)', className }: SkeletonProps) {
  return (
    <span
      className={`${styles.skeleton} ${className ?? ''}`}
      style={{ width, height, borderRadius: radius }}
    />
  );
}

/** A ready-made skeleton card matching the app's list-card layout. */
export function SkeletonCard() {
  return (
    <div className={styles.card}>
      <Skeleton width={44} height={44} radius="var(--radius-md)" />
      <div className={styles.lines}>
        <Skeleton width="60%" height={14} />
        <Skeleton width="40%" height={12} />
      </div>
    </div>
  );
}

/** A list of skeleton cards. */
export function SkeletonList({ count = 4 }: { count?: number }) {
  return (
    <div className={styles.list}>
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonCard key={i} />
      ))}
    </div>
  );
}
