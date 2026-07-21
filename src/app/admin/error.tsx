'use client';

import { useEffect } from 'react';
import * as Sentry from '@sentry/nextjs';
import styles from './admin-operations.module.css';

export default function AdminError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <div className={styles.statePanel}>
      <h1>Owner console request failed</h1>
      <p>The Clerk role boundary remains active. Retry the provider or database request.</p>
      <button className={styles.button} type="button" onClick={reset}>Retry</button>
    </div>
  );
}
