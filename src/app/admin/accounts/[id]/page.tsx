import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowLeft, BookOpenCheck, School, ShieldCheck, UsersRound } from 'lucide-react';
import { notFound } from 'next/navigation';
import { requireAdminPage } from '@/lib/admin/auth';
import { AdminAccountError, getAdminAccountDetails } from '@/lib/admin/accounts';
import { AccountActions } from './account-actions';
import styles from '../../admin-operations.module.css';

export const metadata: Metadata = { title: 'Account Support | GradeAI Owner Console' };
type Params = { params: Promise<{ id: string }> };

export default async function AdminAccountDetailPage({ params }: Params) {
  await requireAdminPage();
  const { id } = await params;
  let details: Awaited<ReturnType<typeof getAdminAccountDetails>>;
  try {
    details = await getAdminAccountDetails(id);
  } catch (error) {
    if (error instanceof AdminAccountError && error.status === 404) notFound();
    throw error;
  }

  const user = details.user;
  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div>
          <Link className={styles.buttonGhost} href="/admin/accounts"><ArrowLeft size={13} /> Accounts</Link>
          <span className={styles.kicker}>Read-only support view</span>
          <h1>{user.name}</h1>
          <p>{user.email} - local status and live Clerk state shown together.</p>
        </div>
        <span className={user.accountStatus === 'active' ? styles.statusHealthy : styles.statusDown}>{user.accountStatus}</span>
      </header>

      <section className={styles.summaryGrid}>
        <article className={styles.summaryCard}><span>Plan</span><strong>{user.accountPlan.replaceAll('_', ' ')}</strong><span>Explicit billing mode</span></article>
        <article className={styles.summaryCard}><span>Credits</span><strong>{user.submissionCredits}</strong><span>Manual balance</span></article>
        <article className={styles.summaryCard}><span>Monthly quota</span><strong>{user.monthlySubmissionQuota ?? '-'}</strong><span>{user.monthlySubmissionQuota === null ? 'Not configured' : 'Submission allowance'}</span></article>
        <article className={styles.summaryCard}><span>Clerk state</span><strong>{user.clerkBanned ? 'Banned' : user.clerkLocked ? 'Locked' : 'Active'}</strong><span><ShieldCheck size={12} /> live Backend API check</span></article>
      </section>

      <section className={styles.panel}>
        <header className={styles.panelHeader}><div><h2>Manual action</h2><p>Every mutation requires a reason and creates an immutable audit event.</p></div></header>
        <AccountActions userId={user.id} status={user.accountStatus} plan={user.accountPlan} credits={user.submissionCredits} quota={user.monthlySubmissionQuota} />
      </section>

      <div className={styles.twoColumn}>
        <section className={styles.panel}>
          <header className={styles.panelHeader}><div><h2><School size={15} /> Classrooms</h2><p>Read-only support metadata.</p></div></header>
          {details.classrooms.length ? <div className={styles.tableScroll}><table><thead><tr><th>Classroom</th><th>Grade</th><th>Students</th><th>Assignments</th></tr></thead><tbody>{details.classrooms.map((room) => <tr key={room.id}><td><strong>{room.name}</strong><div>{room.subject}</div></td><td>{room.grade}</td><td><UsersRound size={12} /> {room.students}</td><td>{room.assignments}</td></tr>)}</tbody></table></div> : <div className={styles.empty}><p>No classrooms.</p></div>}
        </section>
        <section className={styles.panel}>
          <header className={styles.panelHeader}><div><h2><BookOpenCheck size={15} /> Assignments</h2><p>Up to 100 newest records.</p></div></header>
          {details.assignments.length ? <div className={styles.tableScroll}><table><thead><tr><th>Assignment</th><th>Status</th><th>Submissions</th><th>Graded</th></tr></thead><tbody>{details.assignments.map((assignment) => <tr key={assignment.id}><td><strong>{assignment.title}</strong><div>{assignment.classroomName}</div></td><td><span className={styles.badge}>{assignment.status}</span></td><td>{assignment.submissions}</td><td>{assignment.graded}</td></tr>)}</tbody></table></div> : <div className={styles.empty}><p>No assignments.</p></div>}
        </section>
      </div>

      <section className={styles.panel}>
        <header className={styles.panelHeader}><div><h2>Audit log</h2><p>Newest owner actions first; before/after snapshots exclude content.</p></div></header>
        {details.auditLog.length ? <div className={styles.tableScroll}><table><thead><tr><th>Time</th><th>Action</th><th>Actor</th><th>Reason</th><th>After</th></tr></thead><tbody>{details.auditLog.map((event) => <tr key={event.id}><td>{new Date(event.createdAt).toLocaleString('en-IN')}</td><td><span className={styles.badge}>{event.action.replaceAll('_', ' ')}</span></td><td className={styles.mono}>{event.actorUserId.slice(0, 16)}</td><td>{event.reason}</td><td className={styles.mono}>{JSON.stringify(event.afterState)}</td></tr>)}</tbody></table></div> : <div className={styles.empty}><p>No owner actions recorded.</p></div>}
      </section>
    </div>
  );
}
