import type { Metadata } from 'next';
import Link from 'next/link';
import { CheckCircle2, FileWarning, Flag, ShieldCheck } from 'lucide-react';
import { redirect } from 'next/navigation';
import { requireAdminPage } from '@/lib/admin/auth';
import { getAdminModerationOverview } from '@/lib/admin/moderation';
import { adminModerationQuerySchema } from '@/lib/validations';
import { ModerationActions } from './moderation-actions';
import styles from '../admin-operations.module.css';

export const metadata: Metadata = { title: 'Content Moderation | GradeAI Owner Console' };
type SearchParams = Promise<Record<string, string | string[] | undefined>>;

function first(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}
function reportStatusClass(status: 'open' | 'resolved' | 'dismissed') {
  if (status === 'open') return styles.statusOpen;
  if (status === 'resolved') return styles.statusResolved;
  return styles.statusDismissed;
}

export default async function AdminModerationPage({ searchParams }: { searchParams: SearchParams }) {
  await requireAdminPage();
  const raw = await searchParams;
  const parsed = adminModerationQuerySchema.safeParse(
    Object.fromEntries(Object.entries(raw)
      .map(([key, value]) => [key, first(value)])
      .filter((entry): entry is [string, string] => typeof entry[1] === 'string'))
  );
  if (!parsed.success) redirect('/admin/moderation');
  const result = await getAdminModerationOverview(parsed.data);

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div>
          <span className={styles.kicker}>Stage 6 - Privacy operations</span>
          <h1>Moderation</h1>
          <p>Teacher-reported submission content, restricted to the owner role with soft removal and full audit history.</p>
        </div>
        <nav className={styles.rangeLinks} aria-label="Report status">
          {(['open', 'resolved', 'dismissed', 'all'] as const).map((status) => (
            <Link key={status} href={`/admin/moderation?status=${status}`} className={result.filters.status === status ? styles.rangeActive : undefined}>{status}</Link>
          ))}
        </nav>
      </header>

      <div className={styles.privacyNote}><ShieldCheck size={14} /> Reports show only an 800-character sanitized preview. Student content is never copied into system events, audit events, Sentry, or console telemetry.</div>

      <section className={styles.summaryGrid}>
        <article className={styles.summaryCard}><span>Open reports</span><strong>{result.summary.open}</strong><span>Awaiting owner decision</span></article>
        <article className={styles.summaryCard}><span>Resolved</span><strong>{result.summary.resolved}</strong><span>Action taken or reviewed</span></article>
        <article className={styles.summaryCard}><span>Dismissed</span><strong>{result.summary.dismissed}</strong><span>No removal required</span></article>
        <article className={styles.summaryCard}><span>Total reports</span><strong>{result.summary.total}</strong><span>Immutable report history</span></article>
      </section>

      {result.reports.length ? (
        <section className={styles.contentList}>
          {result.reports.map((report) => (
            <article className={styles.contentCard} key={report.id}>
              <div className={styles.contentMeta}>
                <div><span className={styles.kicker}>{report.category.replaceAll('_', ' ')}</span><h2>{report.assignmentTitle || 'Deleted assignment'} - {report.studentName || 'Deleted student'}</h2></div>
                <span className={reportStatusClass(report.status)}>{report.status}</span>
              </div>
              <p><strong>Reported by:</strong> {report.reporterName || 'Deleted user'} ({report.reporterEmail || 'email unavailable'})</p>
              <p><strong>Teacher reason:</strong> {report.reason}</p>
              <p><strong>Submission:</strong> {report.submissionId || 'deleted'} - {report.fileType || 'text / unknown'} - {new Date(report.createdAt).toLocaleString('en-IN')}</p>
              {report.removedAt && <p className={styles.anomaly}><FileWarning size={13} /> Soft removed {new Date(report.removedAt).toLocaleString('en-IN')}</p>}
              <pre className={styles.preview}>{report.textPreview || 'No extracted text preview. Review the file metadata and teacher report.'}</pre>
              {report.status === 'open' ? <ModerationActions reportId={report.id} removed={Boolean(report.removedAt)} /> : (
                <p className={styles.feedback}><CheckCircle2 size={13} /> {report.resolutionNote || 'Reviewed'} {report.reviewedAt ? `on ${new Date(report.reviewedAt).toLocaleString('en-IN')}` : ''}</p>
              )}
            </article>
          ))}
        </section>
      ) : (
        <section className={styles.panel}><div className={styles.empty}><Flag size={26} /><h2>No reports in this view</h2><p>Teacher reports will appear here without exposing them to other accounts.</p></div></section>
      )}
    </div>
  );
}
