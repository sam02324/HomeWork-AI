import type { Metadata } from 'next';
import Link from 'next/link';
import { Activity, AlertCircle, CheckCircle2, Clock3, DatabaseZap, RefreshCw } from 'lucide-react';
import { requireAdminPage } from '@/lib/admin/auth';
import { getAdminHealthOverview } from '@/lib/admin/health';
import styles from '../admin-operations.module.css';

export const metadata: Metadata = { title: 'System Health | GradeAI Owner Console' };
export const dynamic = 'force-dynamic';

function statusClass(status: 'healthy' | 'degraded' | 'down') {
  if (status === 'healthy') return styles.statusHealthy;
  if (status === 'degraded') return styles.statusDegraded;
  return styles.statusDown;
}

export default async function AdminHealthPage() {
  await requireAdminPage();
  const health = await getAdminHealthOverview();

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div>
          <span className={styles.kicker}>Stage 4 - Operations</span>
          <h1>System health</h1>
          <p>Live provider probes, grading backlog and sanitized application failures.</p>
        </div>
        <div className={styles.headerActions}>
          <span className={statusClass(health.status)}>{health.status}</span>
          <Link className={styles.buttonGhost} href="/admin/health"><RefreshCw size={14} /> Refresh</Link>
        </div>
      </header>

      <section className={styles.serviceGrid} aria-label="Service checks">
        {health.services.map((service) => (
          <article className={styles.serviceCard} key={service.name}>
            <header>
              <h2>{service.name}</h2>
              <span className={statusClass(service.status)}>
                {service.status === 'healthy' ? <CheckCircle2 size={12} /> : <AlertCircle size={12} />}
                {service.status}
              </span>
            </header>
            <p>{service.detail}</p>
            <span className={styles.mono}>{service.latencyMs === null ? 'configuration check' : `${service.latencyMs} ms probe`}</span>
          </article>
        ))}
      </section>

      <section className={styles.summaryGrid} aria-label="Grading backlog">
        <article className={styles.summaryCard}><span>Pending submissions</span><strong>{health.backlog.pending}</strong><span>Waiting for an owner-triggered grade run</span></article>
        <article className={styles.summaryCard}><span>Currently grading</span><strong>{health.backlog.grading}</strong><span>In-request processing, not a separate queue</span></article>
        <article className={styles.summaryCard}><span>Failed submissions</span><strong>{health.backlog.failed}</strong><span>Available for teacher retry</span></article>
        <article className={styles.summaryCard}><span>Assignments grading</span><strong>{health.backlog.assignmentsGrading}</strong><span>Transient grading locks</span></article>
      </section>

      <div className={styles.twoColumn}>
        <section className={styles.panel}>
          <header className={styles.panelHeader}><div><h2>Recent operational events</h2><p>Sanitized messages only; no student content or secrets.</p></div><Activity size={18} /></header>
          {health.recentEvents.length ? (
            <div className={styles.tableScroll}><table>
              <thead><tr><th>Time</th><th>Area</th><th>Code</th><th>Message</th></tr></thead>
              <tbody>{health.recentEvents.map((event) => (
                <tr key={event.id}>
                  <td><time dateTime={event.createdAt}>{new Date(event.createdAt).toLocaleString('en-IN')}</time></td>
                  <td><span className={event.severity === 'error' ? styles.statusDown : styles.statusDegraded}>{event.category}</span></td>
                  <td className={styles.mono}>{event.code}</td><td>{event.message}</td>
                </tr>
              ))}</tbody>
            </table></div>
          ) : <div className={styles.empty}><CheckCircle2 size={24} /><h2>No warning or error events</h2><p>The operations ledger is clear.</p></div>}
        </section>

        <section className={styles.panel}>
          <header className={styles.panelHeader}><div><h2>Failed grading jobs</h2><p>Newest failed submissions, ready for support triage.</p></div><DatabaseZap size={18} /></header>
          {health.failedSubmissions.length ? (
            <div className={styles.tableScroll}><table>
              <thead><tr><th>Submission</th><th>Student</th><th>Submitted</th></tr></thead>
              <tbody>{health.failedSubmissions.map((submission) => (
                <tr key={submission.id}>
                  <td><Link href={`/admin/accounts/${submission.teacherId}`}>{submission.assignmentTitle}</Link><div className={styles.mono}>{submission.id.slice(0, 8)}</div></td>
                  <td>{submission.studentName}</td><td><Clock3 size={12} /> {new Date(submission.submittedAt).toLocaleString('en-IN')}</td>
                </tr>
              ))}</tbody>
            </table></div>
          ) : <div className={styles.empty}><CheckCircle2 size={24} /><h2>No failed grading jobs</h2><p>Nothing requires retry triage.</p></div>}
        </section>
      </div>
    </div>
  );
}
