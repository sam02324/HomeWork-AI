'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Check, EyeOff, RotateCcw, X } from 'lucide-react';
import styles from '../admin-operations.module.css';

export function ModerationActions({ reportId, removed }: { reportId: string; removed: boolean }) {
  const router = useRouter();
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState<string | null>(null);
  const [message, setMessage] = useState('');

  async function act(action: 'remove' | 'restore' | 'resolve' | 'dismiss') {
    setBusy(action);
    setMessage('');
    try {
      const response = await fetch(`/api/admin/moderation/${reportId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, reason }),
      });
      const payload = await response.json() as { success: boolean; error?: string };
      if (!response.ok || !payload.success) throw new Error(payload.error || 'Moderation action failed');
      setMessage('Action committed and audited.');
      setReason('');
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Moderation action failed');
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className={styles.actionForm}>
      <div className={styles.field}>
        <label htmlFor={`moderation-reason-${reportId}`}>Resolution reason</label>
        <input id={`moderation-reason-${reportId}`} value={reason} onChange={(event) => setReason(event.target.value)} minLength={5} maxLength={1000} placeholder="Required for the immutable audit log" />
      </div>
      <div className={styles.inlineActions}>
        {removed ? (
          <button className={styles.buttonGhost} type="button" disabled={reason.length < 5 || busy !== null} onClick={() => act('restore')}><RotateCcw size={13} /> {busy === 'restore' ? 'Restoring...' : 'Restore'}</button>
        ) : (
          <button className={styles.buttonDanger} type="button" disabled={reason.length < 5 || busy !== null} onClick={() => act('remove')}><EyeOff size={13} /> {busy === 'remove' ? 'Removing...' : 'Soft remove'}</button>
        )}
        <button className={styles.button} type="button" disabled={reason.length < 5 || busy !== null} onClick={() => act('resolve')}><Check size={13} /> Resolve</button>
        <button className={styles.buttonGhost} type="button" disabled={reason.length < 5 || busy !== null} onClick={() => act('dismiss')}><X size={13} /> Dismiss</button>
      </div>
      {message && <p className={styles.feedback} role="status">{message}</p>}
    </div>
  );
}
