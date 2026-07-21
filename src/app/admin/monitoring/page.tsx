import type { Metadata } from 'next';
import Link from 'next/link';
import { AlertCircle, Bug, CheckCircle2, ExternalLink, FileCode2, Fingerprint, ShieldCheck } from 'lucide-react';
import { requireAdminPage } from '@/lib/admin/auth';
import { getAdminMonitoringOverview } from '@/lib/admin/monitoring';
import { SentryDiagnostic } from './sentry-diagnostic';
import styles from '../admin-operations.module.css';

export const metadata: Metadata = { title: 'Sentry Monitoring | GradeAI Owner Console' };
export const dynamic = 'force-dynamic';

export default async function AdminMonitoringPage() {
  await requireAdminPage();
  const monitoring = await getAdminMonitoringOverview();
  const config = monitoring.configuration;

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div>
          <span className={styles.kicker}>Stage 7 - Observability</span>
          <h1>Sentry monitoring</h1>
          <p>Server, edge, client and React render errors with release tags, source maps and privacy-safe payloads.</p>
        </div>
        {config.dashboardUrl && <Link className={styles.buttonGhost} href={config.dashboardUrl} target="_blank" rel="noreferrer">Open Sentry <ExternalLink size={13} /></Link>}
      </header>

      {!config.dsnConfigured && <div className={styles.warningNote}><AlertCircle size={14} /> Integration code is active but event delivery is disabled until SENTRY_DSN or NEXT_PUBLIC_SENTRY_DSN is added to Railway.</div>}
      <div className={styles.privacyNote}><ShieldCheck size={14} /> {config.privacyMode}. This is intentional because GradeAI processes student work.</div>

      <section className={styles.summaryGrid}>
        <article className={styles.summaryCard}><span>SDK delivery</span><strong>{config.dsnConfigured ? 'Ready' : 'Disabled'}</strong><span>{config.dsnConfigured ? <CheckCircle2 size={12} /> : <AlertCircle size={12} />} DSN status only; value is never returned</span></article>
        <article className={styles.summaryCard}><span>Source maps</span><strong>{config.sourceMapsConfigured ? 'Ready' : 'Missing CI config'}</strong><span><FileCode2 size={12} /> org, project and auth token</span></article>
        <article className={styles.summaryCard}><span>Errors in 24h</span><strong>{monitoring.last24Hours.errors}</strong><span><Bug size={12} /> local sanitized event ledger</span></article>
        <article className={styles.summaryCard}><span>Release</span><strong className={styles.mono}>{config.release?.slice(0, 12) || 'Not tagged'}</strong><span><Fingerprint size={12} /> {config.environment}</span></article>
      </section>

      <section className={styles.panel}>
        <header className={styles.panelHeader}><div><h2>Delivery diagnostic</h2><p>Admin-only, rate-limited to three events per minute and added to the audit log.</p></div></header>
        <div className={styles.panelBody}><SentryDiagnostic configured={config.dsnConfigured} /></div>
      </section>

      <section className={styles.panel}>
        <header className={styles.panelHeader}><div><h2>Recent captured application errors</h2><p>Local context complements Sentry without depending on its API credentials.</p></div></header>
        {monitoring.recentErrors.length ? (
          <div className={styles.tableScroll}><table>
            <thead><tr><th>Time</th><th>Category</th><th>Code</th><th>Message</th><th>Entity</th></tr></thead>
            <tbody>{monitoring.recentErrors.map((event) => (
              <tr key={event.id}><td>{new Date(event.createdAt).toLocaleString('en-IN')}</td><td><span className={styles.statusDown}>{event.category}</span></td><td className={styles.mono}>{event.code}</td><td>{event.message}</td><td className={styles.mono}>{event.entityType ? `${event.entityType}:${event.entityId?.slice(0, 8) || '-'}` : '-'}</td></tr>
            ))}</tbody>
          </table></div>
        ) : <div className={styles.empty}><CheckCircle2 size={24} /><h2>No local error events</h2><p>Operational error history is clear.</p></div>}
      </section>
    </div>
  );
}
