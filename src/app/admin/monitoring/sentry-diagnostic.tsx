'use client';

import { useState } from 'react';
import { RadioTower } from 'lucide-react';
import styles from '../admin-operations.module.css';

export function SentryDiagnostic({ configured }: { configured: boolean }) {
  const [state, setState] = useState<'idle' | 'sending' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState('');

  async function send() {
    setState('sending');
    setMessage('');
    try {
      const response = await fetch('/api/admin/monitoring/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ note: 'GradeAI owner console diagnostic' }),
      });
      const payload = await response.json() as { success: boolean; error?: string; data?: { eventId: string } };
      if (!response.ok || !payload.success) throw new Error(payload.error || 'Diagnostic failed');
      setState('success');
      setMessage(`Event ${payload.data?.eventId || 'created'} flushed to Sentry.`);
    } catch (error) {
      setState('error');
      setMessage(error instanceof Error ? error.message : 'Diagnostic failed');
    }
  }

  return (
    <div className={styles.inlineActions}>
      <button className={styles.button} type="button" onClick={send} disabled={!configured || state === 'sending'}>
        <RadioTower size={14} /> {state === 'sending' ? 'Sending...' : 'Send diagnostic event'}
      </button>
      {message && <span className={styles.feedback} role="status">{message}</span>}
    </div>
  );
}
