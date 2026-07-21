'use client';

import { useState, type FormEvent } from 'react';
import { Flag, X } from 'lucide-react';
import styles from './page.module.css';
import { Select } from '@/components/ui/Select';

export function ReportContent({ submissionId }: { submissionId: string }) {
  const [open, setOpen] = useState(false);
  const [category, setCategory] = useState('privacy');
  const [reason, setReason] = useState('');
  const [status, setStatus] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle');
  const [message, setMessage] = useState('');

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus('sending');
    setMessage('');
    try {
      const response = await fetch('/api/reports', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ submissionId, category, reason }),
      });
      const payload = await response.json() as { success: boolean; error?: string };
      if (!response.ok || !payload.success) throw new Error(payload.error || 'Report failed');
      setStatus('sent');
      setMessage('Report sent to the GradeAI owner.');
      setReason('');
    } catch (error) {
      setStatus('error');
      setMessage(error instanceof Error ? error.message : 'Report failed');
    }
  }

  return (
    <div className={styles.reportWrap}>
      <button className={styles.reportToggle} type="button" onClick={() => setOpen((value) => !value)}>
        <Flag size={13} /> Report content
      </button>
      {open && (
        <form className={styles.reportPanel} onSubmit={submit}>
          <button className={styles.reportClose} type="button" onClick={() => setOpen(false)} aria-label="Close report form"><X size={14} /></button>
          <strong>Send for private owner review</strong>
          <p>Use this for privacy, inappropriate content, copyright, or corrupted/incorrect submission data.</p>
          <Select
            value={category}
            onValueChange={setCategory}
            ariaLabel="Report category"
            options={[
              { value: 'privacy', label: 'Student privacy' },
              { value: 'incorrect_content', label: 'Incorrect or corrupted content' },
              { value: 'inappropriate', label: 'Inappropriate content' },
              { value: 'copyright', label: 'Copyright concern' },
              { value: 'other', label: 'Other' },
            ]}
          />
          <textarea value={reason} onChange={(event) => setReason(event.target.value)} minLength={10} maxLength={1000} required placeholder="Explain what the owner should review" />
          <button className={styles.reportSubmit} type="submit" disabled={status === 'sending' || status === 'sent'}>{status === 'sending' ? 'Sending...' : status === 'sent' ? 'Reported' : 'Submit report'}</button>
          {message && <span className={status === 'error' ? styles.reportError : styles.reportSuccess}>{message}</span>}
        </form>
      )}
    </div>
  );
}
