import type { Metadata } from 'next';
import Link from 'next/link';
import { AlertTriangle, BarChart3, Coins, Cpu, Timer, Zap } from 'lucide-react';
import { redirect } from 'next/navigation';
import { requireAdminPage } from '@/lib/admin/auth';
import { getAdminUsageOverview } from '@/lib/admin/usage';
import { adminUsageQuerySchema } from '@/lib/validations';
import styles from '../admin-operations.module.css';

export const metadata: Metadata = { title: 'Usage & Costs | GradeAI Owner Console' };

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

const number = new Intl.NumberFormat('en-IN');
const currency = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' });
const usd = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 4 });

function first(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}
export default async function AdminUsagePage({ searchParams }: { searchParams: SearchParams }) {
  await requireAdminPage();
  const raw = await searchParams;
  const parsed = adminUsageQuerySchema.safeParse(
    Object.fromEntries(
      Object.entries(raw)
        .map(([key, value]) => [key, first(value)])
        .filter((entry): entry is [string, string] => typeof entry[1] === 'string')
    )
  );
  if (!parsed.success) redirect('/admin/usage');

  const result = await getAdminUsageOverview(parsed.data.days);
  const successRate = result.summary.calls
    ? Math.round((result.summary.successfulCalls / result.summary.calls) * 1000) / 10
    : 100;
  const maxCalls = Math.max(1, ...result.daily.map((row) => row.calls));

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div>
          <span className={styles.kicker}>Stage 3 - Margin control</span>
          <h1>Usage & costs</h1>
          <p>Every grading call keeps its own token, latency, model-price and USD/INR snapshot.</p>
        </div>
        <nav className={styles.rangeLinks} aria-label="Usage period">
          {[7, 30, 90].map((days) => (
            <Link
              key={days}
              href={`/admin/usage?days=${days}`}
              className={result.days === days ? styles.rangeActive : undefined}
            >
              {days} days
            </Link>
          ))}
        </nav>
      </header>

      <section className={styles.summaryGrid} aria-label="Usage summary">
        <article className={styles.summaryCard}>
          <span>AI grading calls</span><strong>{number.format(result.summary.calls)}</strong>
          <span><Zap size={12} /> {result.summary.last7DayCalls} in the last 7 days</span>
        </article>
        <article className={styles.summaryCard}>
          <span>Estimated API cost</span><strong>{currency.format(result.summary.costInrPaise / 100)}</strong>
          <span>{usd.format(result.summary.costUsdMicros / 1_000_000)} from call snapshots</span>
        </article>
        <article className={styles.summaryCard}>
          <span>Tokens processed</span><strong>{number.format(result.summary.tokens)}</strong>
          <span><Cpu size={12} /> input plus output</span>
        </article>
        <article className={styles.summaryCard}>
          <span>Success rate</span><strong>{successRate}%</strong>
          <span><Timer size={12} /> {number.format(result.summary.averageLatencyMs)} ms average</span>
        </article>
      </section>

      <section className={styles.panel}>
        <header className={styles.panelHeader}>
          <div><h2>Daily calls</h2><p>India Standard Time; cost uses each call&apos;s saved exchange rate.</p></div>
          <BarChart3 size={18} />
        </header>
        {result.daily.length ? (
          <div className={styles.chart}>
            {result.daily.map((row) => (
              <div className={styles.barRow} key={row.date}>
                <time dateTime={row.date}>{row.date.slice(5)}</time>
                <div className={styles.barTrack}>
                  <div className={styles.barFill} style={{ width: `${Math.max(2, (row.calls / maxCalls) * 100)}%` }} />
                </div>
                <strong>{row.calls} calls</strong>
                <span>{currency.format(row.costInrPaise / 100)}</span>
              </div>
            ))}
          </div>
        ) : (
          <div className={styles.empty}><Coins size={24} /><h2>No usage events yet</h2><p>The next AI grading run starts the ledger.</p></div>
        )}
      </section>

      <div className={styles.twoColumn}>
        <section className={styles.panel}>
          <header className={styles.panelHeader}><div><h2>Seven-day user usage</h2><p>Flagged at 3x median and at least 20 calls.</p></div></header>
          {result.users.length ? (
            <div className={styles.tableScroll}>
              <table>
                <thead><tr><th>User</th><th>Calls</th><th>Failures</th><th>Cost</th><th>Signal</th></tr></thead>
                <tbody>
                  {result.users.map((user) => (
                    <tr key={user.userId}>
                      <td className={styles.identity}><strong>{user.name}</strong><small>{user.email}</small></td>
                      <td>{user.calls}</td><td>{user.failures}</td><td>{currency.format(user.costInrPaise / 100)}</td>
                      <td>{user.anomaly ? <span className={styles.anomaly}><AlertTriangle size={12} /> Review</span> : 'Normal'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : <div className={styles.empty}><p>No calls in the last seven days.</p></div>}
        </section>

        <section className={styles.panel}>
          <header className={styles.panelHeader}><div><h2>Model mix</h2><p>Historical pricing never changes when defaults change.</p></div></header>
          {result.models.length ? (
            <div className={styles.tableScroll}>
              <table>
                <thead><tr><th>Model</th><th>Calls</th><th>Tokens</th><th>Cost</th></tr></thead>
                <tbody>{result.models.map((model) => (
                  <tr key={model.model}><td className={styles.mono}>{model.model}</td><td>{model.calls}</td><td>{number.format(model.tokens)}</td><td>{currency.format(model.costInrPaise / 100)}</td></tr>
                ))}</tbody>
              </table>
            </div>
          ) : <div className={styles.empty}><p>No model usage recorded.</p></div>}
        </section>
      </div>
    </div>
  );
}
