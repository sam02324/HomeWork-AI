'use client';

import { useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { Save, ShieldOff } from 'lucide-react';
import styles from '../../admin-operations.module.css';
import { Select } from '@/components/ui/Select';

type AccountStatus = 'active' | 'suspended';

interface Props {
  userId: string;
  status: AccountStatus;
  plan: 'unassigned' | 'subscription' | 'pay_per_submission';
  credits: number;
  quota: number | null;
}
type ActionName = 'suspend' | 'reinstate' | 'adjust_credits' | 'set_quota' | 'set_plan';

export function AccountActions({ userId, status, plan, credits, quota }: Props) {
  const router = useRouter();
  const [action, setAction] = useState<ActionName>(status === 'active' ? 'adjust_credits' : 'reinstate');
  const [reason, setReason] = useState('');
  const [value, setValue] = useState('');
  const [state, setState] = useState<'idle' | 'saving' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState('');

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setState('saving');
    setMessage('');

    let body: Record<string, unknown> = { action, reason };
    if (action === 'adjust_credits') body = { ...body, delta: Number(value) };
    if (action === 'set_quota') body = { ...body, monthlyQuota: value === '' ? null : Number(value) };
    if (action === 'set_plan') body = { ...body, plan: value || plan };

    try {
      const response = await fetch(`/api/admin/accounts/${userId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const payload = await response.json() as { success: boolean; error?: string };
      if (!response.ok || !payload.success) throw new Error(payload.error || 'Account action failed');
      setState('success');
      setMessage('Action committed and added to the audit log.');
      setReason('');
      setValue('');
      router.refresh();
    } catch (error) {
      setState('error');
      setMessage(error instanceof Error ? error.message : 'Account action failed');
    }
  }

  const destructive = action === 'suspend';
  return (
    <form className={styles.actionForm} onSubmit={submit}>
      <div className={styles.field}>
        <label htmlFor="owner-action">Action</label>
        <Select
          id="owner-action"
          value={action}
          onValueChange={(nextAction) => {
            setAction(nextAction as ActionName);
            setValue('');
          }}
          options={[
            { value: 'adjust_credits', label: `Adjust credits (current ${credits})` },
            { value: 'set_quota', label: `Set monthly quota (${quota ?? 'unset'})` },
            { value: 'set_plan', label: 'Set account plan' },
            status === 'active'
              ? { value: 'suspend', label: 'Suspend account' }
              : { value: 'reinstate', label: 'Reinstate account' },
          ]}
        />
      </div>

      {(action === 'adjust_credits' || action === 'set_quota') && (
        <div className={styles.field}><label htmlFor="owner-value">{action === 'adjust_credits' ? 'Credit delta' : 'Quota (blank unsets)'}</label><input id="owner-value" type="number" value={value} onChange={(event) => setValue(event.target.value)} required={action === 'adjust_credits'} /></div>
      )}
      {action === 'set_plan' && (
        <div className={styles.field}>
          <label htmlFor="owner-plan">Plan</label>
          <Select
            id="owner-plan"
            value={value || plan}
            onValueChange={setValue}
            options={[
              { value: 'unassigned', label: 'Unassigned' },
              { value: 'subscription', label: 'Subscription' },
              { value: 'pay_per_submission', label: 'Pay per submission' },
            ]}
          />
        </div>
      )}
      <div className={styles.field}><label htmlFor="owner-reason">Reason (audit log)</label><input id="owner-reason" value={reason} onChange={(event) => setReason(event.target.value)} minLength={5} maxLength={500} required placeholder="Support case or business reason" /></div>
      <button className={destructive ? styles.buttonDanger : styles.button} type="submit" disabled={state === 'saving'}>
        {destructive ? <ShieldOff size={14} /> : <Save size={14} />} {state === 'saving' ? 'Committing...' : 'Commit action'}
      </button>
      {message && <p className={styles.feedback} role="status">{message}</p>}
    </form>
  );
}
