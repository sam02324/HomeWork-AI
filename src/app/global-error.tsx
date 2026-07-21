'use client';

import { useEffect } from 'react';
import * as Sentry from '@sentry/nextjs';

export default function GlobalError({
  error,
  unstable_retry,
}: {
  error: Error & { digest?: string };
  unstable_retry: () => void;
}) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <html lang="en">
      <body style={{ margin: 0, background: '#090909', color: '#f5f5f5', fontFamily: 'Inter, sans-serif' }}>
        <main style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', padding: 24 }}>
          <section style={{ width: 'min(520px, 100%)', textAlign: 'center' }}>
            <title>Something went wrong | GradeAI</title>
            <p style={{ color: '#ef466f', letterSpacing: '0.16em', textTransform: 'uppercase', fontSize: 12 }}>
              Error captured
            </p>
            <h1 style={{ fontSize: 36, margin: '16px 0 12px' }}>GradeAI hit an unexpected error.</h1>
            <p style={{ color: '#aaa', lineHeight: 1.6 }}>
              Retry the page. The owner can inspect the sanitized event in system monitoring.
            </p>
            <button
              type="button"
              onClick={unstable_retry}
              style={{ marginTop: 24, border: 0, borderRadius: 999, padding: '12px 22px', color: '#fff', background: '#e82f58', cursor: 'pointer' }}
            >
              Try again
            </button>
          </section>
        </main>
      </body>
    </html>
  );
}
